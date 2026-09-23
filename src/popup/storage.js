/**
 * The popup's persisted state.
 *
 * The three storage keys were repeated as bare strings across the read and the
 * two writes, where a typo would have produced a key that saves fine and never
 * loads. They are named once here and the rest of the popup never sees them.
 *
 * This is chrome.storage.local, so it survives the popup closing, which is
 * what lets the popup come back up showing the text you last typed.
 */

/**
 * What the popup remembers between openings.
 *
 * Every field is optional because nothing is written until you use the popup,
 * so a first run reads an empty object.
 *
 * @typedef {object} PopupState
 * @property {string} [replacementText] What everything becomes.
 * @property {boolean} [isReplacing] Whether Start was pressed.
 * @property {string} [uploadedImageUrl] The uploaded image, as a data URL.
 */

/**
 * The storage keys, as literal types rather than plain strings, so a key that
 * is not part of PopupState is a compile error instead of a read that always
 * returns nothing.
 *
 * @type {ReadonlyArray<keyof PopupState>}
 */
const KEYS = ["replacementText", "isReplacing", "uploadedImageUrl"];

/** @returns {Promise<PopupState>} */
export function readState() {
  return chrome.storage.local.get([...KEYS]);
}

/**
 * Records what we are replacing with and whether we are running.
 *
 * @param {string} replacementText
 * @param {boolean} isReplacing
 */
export function saveReplacementState(replacementText, isReplacing) {
  return chrome.storage.local.set(
    /** @type {PopupState} */ ({ replacementText, isReplacing }),
  );
}

/**
 * Records the uploaded image, held as a data URL.
 *
 * @param {string} uploadedImageUrl
 */
export function saveImage(uploadedImageUrl) {
  return chrome.storage.local.set(/** @type {PopupState} */ ({ uploadedImageUrl }));
}
