/**
 * Routing decides what each popup message does and, just as importantly, that
 * every one of them gets an answer.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { routeMessage } from "../src/background/route-message.js";
import {
  START_REPLACING,
  STARTED_REPLY,
  STOP_REPLACING,
  STOPPED_REPLY,
  UNKNOWN_ACTION_REPLY,
} from "../src/shared/messages.js";

/** Records what routing asked the loop to do. */
function fakeReplacer() {
  const calls = [];
  return {
    calls,
    start: (text, imageUrl) => calls.push({ call: "start", text, imageUrl }),
    stop: () => calls.push({ call: "stop" }),
  };
}

test("start passes the text and image through and confirms", () => {
  const replacer = fakeReplacer();

  const reply = routeMessage(
    { action: START_REPLACING, text: "BOO", imageUrl: "data:image/png;base64,AAAA" },
    replacer,
  );

  assert.deepEqual(replacer.calls, [
    { call: "start", text: "BOO", imageUrl: "data:image/png;base64,AAAA" },
  ]);
  assert.deepEqual(reply, { message: STARTED_REPLY });
});

test("stop stops and confirms", () => {
  const replacer = fakeReplacer();

  const reply = routeMessage({ action: STOP_REPLACING }, replacer);

  assert.deepEqual(replacer.calls, [{ call: "stop" }]);
  assert.deepEqual(reply, { message: STOPPED_REPLY });
});

test("a repeated start still gets an answer", () => {
  // Regression: the old handler only replied when the action changed
  // something, so pressing Start twice left the popup's callback reading
  // .message off undefined.
  const replacer = fakeReplacer();

  routeMessage({ action: START_REPLACING, text: "BOO", imageUrl: "" }, replacer);
  const second = routeMessage({ action: START_REPLACING, text: "BOO", imageUrl: "" }, replacer);

  assert.deepEqual(second, { message: STARTED_REPLY });
});

test("a stop with nothing running still gets an answer", () => {
  assert.deepEqual(routeMessage({ action: STOP_REPLACING }, fakeReplacer()), {
    message: STOPPED_REPLY,
  });
});

test("an action nobody recognises still gets an answer", () => {
  const replacer = fakeReplacer();

  const reply = routeMessage({ action: "tickleTheCat" }, replacer);

  assert.deepEqual(replacer.calls, []);
  assert.deepEqual(reply, { message: UNKNOWN_ACTION_REPLY });
});

test("a message that is not an object still gets an answer", () => {
  // Regression: reaching for .action on a string or on null threw out of the
  // listener, so the sender was left waiting on a channel nobody answered.
  const replacer = fakeReplacer();

  for (const message of ["hello", null, undefined, 42, []]) {
    assert.deepEqual(routeMessage(message, replacer), { message: UNKNOWN_ACTION_REPLY });
  }
  assert.deepEqual(replacer.calls, []);
});
