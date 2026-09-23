/**
 * The data loader, with fetch stubbed. Its job is to read each packaged file
 * once, and the interesting part is what it does when a read fails.
 */

import test from "node:test";
import assert from "node:assert/strict";

/** @type {Map<string, number>} */
const reads = new Map();
/** @type {Set<string>} */
const failOnce = new Set();

/** @type {any} */ (globalThis).chrome = { runtime: { getURL: (path) => path } };
/** @type {any} */ (globalThis).fetch = async (path) => {
  reads.set(path, (reads.get(path) ?? 0) + 1);
  if (failOnce.has(path)) {
    failOnce.delete(path);
    throw new Error("transient read failure");
  }
  return { ok: true, json: async () => ({ path }) };
};

const { loadJson } = await import("../src/shared/data.js");

test("reads each file once, however many callers ask", async () => {
  const results = await Promise.all([
    loadJson("data/a.json"),
    loadJson("data/a.json"),
    loadJson("data/a.json"),
  ]);

  assert.equal(reads.get("data/a.json"), 1);
  assert.deepEqual(results, [{ path: "data/a.json" }, { path: "data/a.json" }, { path: "data/a.json" }]);
});

test("a failed read is not remembered", async () => {
  // Regression: the rejected promise used to stay in the cache, so one bad
  // read left that file broken for the life of the popup or the worker, and
  // every later call got the same stale error without retrying.
  failOnce.add("data/b.json");

  await assert.rejects(() => loadJson("data/b.json"), /transient read failure/);
  assert.deepEqual(await loadJson("data/b.json"), { path: "data/b.json" });
  assert.equal(reads.get("data/b.json"), 2);
});

test("a file that will not load at all reports its status", async () => {
  /** @type {any} */ (globalThis).fetch = async () => ({ ok: false, status: 404 });

  await assert.rejects(() => loadJson("data/missing.json"), /cannot read data\/missing.json: 404/);
});
