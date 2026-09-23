/**
 * What the worker says when it cannot do the work at all.
 *
 * Its own file because the data loader retries a failed read, and these need
 * every read to fail for the whole run.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { FAILED_REPLY } from "../src/shared/messages.js";

const listeners = [];

/** @type {any} */ (globalThis).chrome = {
  runtime: { getURL: (path) => path, onMessage: { addListener: (l) => listeners.push(l) } },
  tabs: { query: async () => [] },
  scripting: { executeScript: async () => {} },
};

/** @type {any} */ (globalThis).fetch = async () => {
  throw new Error("data files unreadable");
};

await import("../src/background/service-worker.js");

/** Resolves with the reply, or with "NO ANSWER" if none arrives. */
function send(message) {
  return new Promise((resolve) => {
    let answered = false;
    listeners[0](message, {}, (reply) => {
      answered = true;
      resolve(reply);
    });
    setTimeout(() => answered || resolve("NO ANSWER"), 300);
  });
}

test("says so instead of going quiet when its data will not load", async () => {
  // Regression: the read rejected inside the listener, so sendResponse was
  // never called. The popup waited on a channel that later closed and then
  // read .message off undefined, and the worker took an unhandled rejection
  // on the way past.
  const reply = await send({ action: "startReplacing", text: "BOO", imageUrl: "" });

  assert.notEqual(reply, "NO ANSWER");
  assert.match(reply.message, new RegExp(`^${FAILED_REPLY}`));
  assert.match(reply.message, /data files unreadable/);
});

test("answers a stop it cannot carry out", async () => {
  const reply = await send({ action: "stopReplacing" });

  assert.notEqual(reply, "NO ANSWER");
  assert.match(reply.message, new RegExp(`^${FAILED_REPLY}`));
});
