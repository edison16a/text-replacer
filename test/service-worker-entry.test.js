/**
 * Boots the real service worker with chrome and fetch stubbed, then drives it
 * through a start and a stop.
 *
 * This is the only test that loads the worker's whole import graph and the
 * real data files together, so a bad relative path or a config key that no
 * longer exists fails here instead of in the browser.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { STARTED_REPLY, STOPPED_REPLY } from "../src/shared/messages.js";

const repoFile = (relative) => readFileSync(new URL(`../${relative}`, import.meta.url), "utf8");

const listeners = [];
const injections = [];

globalThis.chrome = {
  runtime: {
    getURL: (path) => path,
    onMessage: { addListener: (listener) => listeners.push(listener) },
  },
  tabs: { query: async () => [{ id: 7 }, { id: 8 }] },
  scripting: {
    executeScript: async (details) => {
      injections.push(details);
    },
  },
};

globalThis.fetch = async (path) => ({ ok: true, json: async () => JSON.parse(repoFile(path)) });

await import("../src/background/service-worker.js");

/** Delivers a message the way chrome would and resolves with the reply. */
function send(message) {
  return new Promise((resolve) => {
    const kept = listeners[0](message, {}, resolve);
    assert.equal(kept, true, "the listener must hold the channel open");
  });
}

test("registers exactly one message listener", () => {
  assert.equal(listeners.length, 1);
});

test("registers the listener before anything is awaited", () => {
  // A service worker is restarted by the event it is meant to handle, so a
  // top-level await ahead of the registration means missing that event. This
  // has to be checked in the source: by the time an import resolves, any
  // top-level await has already settled, so a runtime check cannot see the
  // difference.
  const source = repoFile("src/background/service-worker.js");
  const registration = source.indexOf("chrome.runtime.onMessage.addListener");
  assert.ok(registration > 0, "no listener registration found");

  const topLevelAwaits = source
    .slice(0, registration)
    .split("\n")
    .filter((line) => /^await\s/.test(line));

  assert.deepEqual(topLevelAwaits, [], "something is awaited before the listener is registered");
});

test("answers start, then stop", async () => {
  assert.deepEqual(await send({ action: "startReplacing", text: "BOO", imageUrl: "" }), {
    message: STARTED_REPLY,
  });
  assert.deepEqual(await send({ action: "stopReplacing" }), { message: STOPPED_REPLY });
});

test("injects a function and arguments, never a source string", async () => {
  // The whole reason the injection hole is closed. If this ever grows a
  // `code` property the hole is back.
  const selectors = JSON.parse(repoFile("data/selectors.json"));
  await send({ action: "startReplacing", text: "BOO", imageUrl: "u.png" });

  // Reach the loop's pass directly rather than waiting a real second.
  await new Promise((resolve) => setTimeout(resolve, 1100));
  await send({ action: "stopReplacing" });

  assert.ok(injections.length > 0, "nothing was injected");
  for (const injection of injections) {
    assert.equal(typeof injection.func, "function");
    assert.equal(injection.code, undefined);
    assert.deepEqual(injection.args, [selectors.text.join(", "), "img", "BOO", "u.png"]);
  }
  assert.deepEqual(
    injections.map((injection) => injection.target.tabId),
    [7, 8],
  );
});
