/**
 * Popup entry point: find the elements, wire the events, delegate the rest.
 *
 * This file used to be all of the popup, 96 lines of storage keys, captions,
 * class juggling and messaging in one closure. What is left here is only the
 * wiring; what each piece does lives in theme.js, strings.js, controls.js and
 * storage.js.
 *
 * Behaviour is deliberately identical to the pre-refactor popup, including the
 * order things happen in when the button is clicked.
 */

import { loadStrings, loadTheme } from "../shared/data.js";
import { START_REPLACING, STOP_REPLACING } from "../shared/messages.js";
import { setReplaceButtonState, setUploadPrompt, showImagePreview } from "./controls.js";
import { findElements } from "./elements.js";
import { readState, saveImage, saveReplacementState } from "./storage.js";
import { applyStrings } from "./strings.js";
import { applyTheme } from "./theme.js";

async function main() {
  // Colours and copy both arrive from data files, so there is one await before
  // the popup has its final look. These are packaged files read from disk, so
  // it resolves in well under a frame.
  const [strings, theme] = await Promise.all([loadStrings(), loadTheme()]);
  applyTheme(theme, document.documentElement);
  applyStrings(document, strings);
  document.title = strings.documentTitle;

  const {
    replaceButton,
    replaceText: replaceTextElement,
    uploadImage: uploadImageElement,
    uploadPrompt: uploadPromptElement,
    imageContainer: uploadedImageContainer,
    imagePreview: uploadedImagePreview,
  } = findElements(document);

  let isReplacing = false;
  let uploadedImageUrl = "";

  const stored = await readState();
  if (stored.replacementText) {
    replaceTextElement.value = stored.replacementText;
  }
  if (stored.isReplacing) {
    isReplacing = stored.isReplacing;
    setReplaceButtonState(replaceButton, isReplacing, strings);
  }
  if (stored.uploadedImageUrl) {
    uploadedImageUrl = stored.uploadedImageUrl;
    setUploadPrompt(uploadPromptElement, true, strings);
    showImagePreview(uploadedImageContainer, uploadedImagePreview, uploadedImageUrl);
  }

  replaceButton.addEventListener("click", () => {
    const replaceText = replaceTextElement.value;

    if (!isReplacing) {
      chrome.runtime.sendMessage(
        { action: START_REPLACING, text: replaceText, imageUrl: uploadedImageUrl },
        (response) => {
          console.log(response.message);
        },
      );
      isReplacing = true;
    } else {
      chrome.runtime.sendMessage({ action: STOP_REPLACING }, (response) => {
        console.log(response.message);
      });
      isReplacing = false;

      // Stopping leaves the rewritten page on screen, so the tab you are
      // looking at is reloaded to bring the real content back.
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.reload(tabs[0].id);
      });
    }

    saveReplacementState(replaceText, isReplacing);
    setReplaceButtonState(replaceButton, isReplacing, strings);
  });

  uploadImageElement.addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Read as a data URL rather than an object URL: the result is stored and
    // injected into other pages, and a blob: URL is scoped to this popup and
    // dies when it closes.
    const reader = new FileReader();
    reader.onload = (loaded) => {
      uploadedImageUrl = loaded.target.result;
      saveImage(uploadedImageUrl);
      setUploadPrompt(uploadPromptElement, true, strings);
      showImagePreview(uploadedImageContainer, uploadedImagePreview, uploadedImageUrl);
    };
    reader.readAsDataURL(file);
  });
}

// Module scripts are deferred, so the document is already parsed when this
// runs. The old DOMContentLoaded wrapper is no longer doing anything.
main();
