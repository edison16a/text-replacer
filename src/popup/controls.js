/**
 * The popup's three pieces of visual state.
 *
 * Pulled out of the click and change handlers so that what the UI looks like
 * is separable from when it changes, and so it can be tested against a DOM
 * without a browser or a background worker.
 *
 * Every caption comes in from data/strings.json; none is written here.
 */

/**
 * Swaps the main button between its start and stop appearance.
 *
 * @param {HTMLElement} button
 * @param {boolean} isReplacing
 * @param {Record<string, string>} strings
 */
export function setReplaceButtonState(button, isReplacing, strings) {
  button.textContent = isReplacing ? strings.stopButton : strings.startButton;
  button.classList.toggle("stopButton", isReplacing);
  button.classList.toggle("startButton", !isReplacing);
}

/**
 * Switches the upload prompt once an image is in hand.
 *
 * @param {HTMLElement} promptElement The span inside the upload label.
 * @param {boolean} hasImage
 * @param {Record<string, string>} strings
 */
export function setUploadPrompt(promptElement, hasImage, strings) {
  promptElement.textContent = hasImage ? strings.uploadPromptAfterUpload : strings.uploadPrompt;
}

/**
 * Points the preview at an image and reveals its container.
 *
 * @param {HTMLElement} container
 * @param {HTMLImageElement} preview
 * @param {string} imageUrl
 */
export function showImagePreview(container, preview, imageUrl) {
  preview.src = imageUrl;
  container.style.display = "block";
}
