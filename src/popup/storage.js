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

const KEYS = {
  replacementText: "replacementText",
  isReplacing: "isReplacing",
  uploadedImageUrl: "uploadedImageUrl",
};

/** @returns {Promise<{replacementText?: string, isReplacing?: boolean, uploadedImageUrl?: string}>} */
export function readState() {
  return chrome.storage.local.get(Object.values(KEYS));
}

/** Records what we are replacing with and whether we are running. */
export function saveReplacementState(replacementText, isReplacing) {
  return chrome.storage.local.set({
    [KEYS.replacementText]: replacementText,
    [KEYS.isReplacing]: isReplacing,
  });
}

/** Records the uploaded image, held as a data URL. */
export function saveImage(uploadedImageUrl) {
  return chrome.storage.local.set({ [KEYS.uploadedImageUrl]: uploadedImageUrl });
}
