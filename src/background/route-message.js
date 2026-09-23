/**
 * Decides what a popup message does and what it is answered with.
 *
 * Kept apart from the worker so that this, the part with the actual decisions
 * in it, can be tested without a browser. The worker around it does nothing
 * but hand the message over and pass the answer back.
 *
 * Every message gets an answer, including one this does not understand. The
 * caller is waiting on a reply, and a silent non-answer leaves it hanging on a
 * channel that later closes, which is a far worse thing to debug than being
 * told the action was not recognised.
 */

import {
  START_REPLACING,
  STARTED_REPLY,
  STOP_REPLACING,
  STOPPED_REPLY,
  UNKNOWN_ACTION_REPLY,
} from "../shared/messages.js";

/**
 * @param {{action: string, text?: string, imageUrl?: string}} message
 * @param {{start: Function, stop: Function}} replacer The loop to act on.
 * @returns {{message: string}} The reply to send back.
 */
export function routeMessage(message, replacer) {
  // Anything that is not an object has no action, and reaching for .action on
  // it would throw out of the listener and leave the sender unanswered, which
  // is the one thing this function exists to prevent.
  if (!message || typeof message !== "object") {
    return { message: UNKNOWN_ACTION_REPLY };
  }

  if (message.action === START_REPLACING) {
    replacer.start(message.text, message.imageUrl);
    return { message: STARTED_REPLY };
  }

  if (message.action === STOP_REPLACING) {
    replacer.stop();
    return { message: STOPPED_REPLY };
  }

  return { message: UNKNOWN_ACTION_REPLY };
}
