/**
 * The popup/background message protocol.
 *
 * These action names were bare string literals typed out in both the popup and
 * the background page. A typo in either one produced no error at all: the
 * listener simply never matched and the button appeared to do nothing. Naming
 * them here makes a typo a reference error instead of silence.
 */

/** Sent by the popup to begin replacing. Carries `text` and `imageUrl`. */
export const START_REPLACING = "startReplacing";

/** Sent by the popup to stop replacing and clear the loop. */
export const STOP_REPLACING = "stopReplacing";

/**
 * Replies the background sends back. The popup only logs these, but they are
 * part of the protocol, so they stay next to the actions they answer.
 */
export const STARTED_REPLY = "Text and image replacement started.";
export const STOPPED_REPLY = "Text and image replacement stopped.";
