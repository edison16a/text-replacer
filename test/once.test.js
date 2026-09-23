/**
 * once() is small, and both bugs it was written for came from getting exactly
 * these edges wrong, so it is worth pinning all of them.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { once } from "../src/shared/once.js";

test("runs the work once however many times it is called", async () => {
  let runs = 0;
  const get = once(async () => {
    runs += 1;
    return runs;
  });

  assert.deepEqual(await Promise.all([get(), get(), get()]), [1, 1, 1]);
  assert.equal(runs, 1);
});

test("callers arriving mid-flight wait for the first one", async () => {
  // This is the half the worker got wrong: it cached the result, so a second
  // caller arriving before the first finished started its own copy of the
  // work and the two results diverged.
  let release;
  const gate = new Promise((resolve) => (release = resolve));
  let runs = 0;

  const get = once(async () => {
    runs += 1;
    await gate;
    return { built: runs };
  });

  const [first, second] = [get(), get()];
  release();

  // Compared after awaiting, not before: once() starts the factory in a
  // microtask, so nothing has run yet at the point both calls return.
  const [a, b] = [await first, await second];
  assert.equal(runs, 1);
  assert.equal(a, b, "both callers must get the same object");
});

test("forgets a failure so the next call tries again", async () => {
  // And this is the half the data loader got wrong: a cached rejection meant
  // one bad read broke that file for the life of the context.
  let attempts = 0;
  const get = once(async () => {
    attempts += 1;
    if (attempts === 1) throw new Error("transient");
    return "worked";
  });

  await assert.rejects(get, /transient/);
  assert.equal(await get(), "worked");
  assert.equal(attempts, 2);
});

test("a factory that throws straight away rejects rather than escaping", () => {
  // Without this the throw would travel out of the caller's own call stack and
  // the cache would be left holding nothing, so the next call would throw too.
  const get = once(() => {
    throw new Error("sync boom");
  });

  assert.doesNotThrow(get);
  return assert.rejects(get, /sync boom/);
});
