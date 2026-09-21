/**
 * The loop owns the timer and the start/stop state, which is where the old
 * background page was hardest to reason about. Everything it touches is
 * injected, so these run with no browser and no real clock.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { createReplacementLoop } from "../src/background/replacement-loop.js";

/** Builds a loop with fake tabs, fake injection and a fake timer. */
function harness({ tabs = [{ id: 1 }, { id: 2 }], applyToTab } = {}) {
  const applied = [];
  const scheduled = [];
  const cancelled = [];

  const loop = createReplacementLoop({
    intervalMs: 1000,
    listTabs: async () => tabs,
    applyToTab:
      applyToTab ??
      (async (tabId, text, imageUrl) => {
        applied.push({ tabId, text, imageUrl });
      }),
    schedule: (callback, ms) => {
      scheduled.push({ callback, ms });
      return scheduled.length; // stand-in timer handle
    },
    cancel: (handle) => cancelled.push(handle),
  });

  return { loop, applied, scheduled, cancelled };
}

test("starts idle", () => {
  assert.equal(harness().loop.isReplacing, false);
});

test("start schedules one pass at the configured interval", () => {
  const { loop, scheduled } = harness();

  loop.start("BOO", "");

  assert.equal(loop.isReplacing, true);
  assert.equal(scheduled.length, 1);
  assert.equal(scheduled[0].ms, 1000);
});

test("starting twice does not leave a second timer running", () => {
  // The old code guarded this in the message handler. Guarding it here means a
  // stray second start cannot orphan a timer that nothing holds a handle to.
  const { loop, scheduled } = harness();

  loop.start("first", "");
  loop.start("second", "");

  assert.equal(scheduled.length, 1);
});

test("stop cancels the timer it started", () => {
  const { loop, scheduled, cancelled } = harness();

  loop.start("BOO", "");
  loop.stop();

  assert.equal(loop.isReplacing, false);
  assert.deepEqual(cancelled, [scheduled.length]);
});

test("stop while idle does nothing", () => {
  const { loop, cancelled } = harness();

  loop.stop();

  assert.equal(cancelled.length, 0);
});

test("a pass rewrites every open tab with the current values", async () => {
  const { loop, applied } = harness();

  loop.start("BOO", "data:image/png;base64,AAAA");
  await loop.tick();

  assert.deepEqual(applied, [
    { tabId: 1, text: "BOO", imageUrl: "data:image/png;base64,AAAA" },
    { tabId: 2, text: "BOO", imageUrl: "data:image/png;base64,AAAA" },
  ]);
});

test("re-reads the tab list on every pass", async () => {
  // A tab opened after Start must still get rewritten.
  const tabs = [{ id: 1 }];
  const { loop, applied } = harness({ tabs });

  loop.start("BOO", "");
  await loop.tick();
  tabs.push({ id: 2 });
  await loop.tick();

  assert.deepEqual(
    applied.map((call) => call.tabId),
    [1, 1, 2],
  );
});

test("a tab that refuses injection does not stop the others", async () => {
  // chrome:// pages, the Web Store and the PDF viewer all reject. That is
  // normal, not a reason to abandon the pass.
  const applied = [];
  const { loop } = harness({
    applyToTab: async (tabId) => {
      if (tabId === 1) throw new Error("Cannot access contents of the page");
      applied.push(tabId);
    },
  });

  loop.start("BOO", "");
  await assert.doesNotReject(() => loop.tick());

  assert.deepEqual(applied, [2]);
});

test("stop forgets what it was replacing with", async () => {
  const { loop, applied } = harness();

  loop.start("BOO", "data:image/png;base64,AAAA");
  loop.stop();
  await loop.tick();

  assert.deepEqual(applied, [
    { tabId: 1, text: "", imageUrl: "" },
    { tabId: 2, text: "", imageUrl: "" },
  ]);
});
