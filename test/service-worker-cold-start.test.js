/**
 * The worker's cold start, where two messages can arrive before its data has
 * finished loading.
 *
 * Its own file because the worker builds its loop once per module instance and
 * node runs each test file in its own process. There is no second cold start
 * to be had inside one file.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const repoFile = (relative) => readFileSync(new URL(`../${relative}`, import.meta.url), "utf8");

const listeners = [];
const injections = [];

/** Held open so both messages land while the first data read is in flight. */
let releaseData;
const dataGate = new Promise((resolve) => (releaseData = resolve));

/** @type {any} */ (globalThis).chrome = {
  runtime: { getURL: (path) => path, onMessage: { addListener: (l) => listeners.push(l) } },
  tabs: { query: async () => [{ id: 1 }] },
  scripting: { executeScript: async (details) => injections.push(details) },
};

/** @type {any} */ (globalThis).fetch = async (path) => {
  await dataGate;
  return { ok: true, json: async () => JSON.parse(repoFile(path)) };
};

await import("../src/background/service-worker.js");

const send = (message) => new Promise((resolve) => listeners[0](message, {}, resolve));

test("a Stop arriving during the first data read still stops it", async () => {
  // Regression. The worker used to cache the loop it had built rather than the
  // work of building one, so both of these messages built their own. The Start
  // started a timer on the first loop, the Stop stopped the second, and the
  // first kept injecting into every tab every second with nothing holding a
  // reference to it. Replacement could not be stopped after that.
  const start = send({ action: "startReplacing", text: "BOO", imageUrl: "" });
  const stop = send({ action: "stopReplacing" });

  releaseData();
  await Promise.all([start, stop]);

  // Longer than the one second tick, so an orphaned timer would have fired.
  await new Promise((resolve) => setTimeout(resolve, 1200));

  assert.deepEqual(injections, [], "something is still replacing after Stop");
});
