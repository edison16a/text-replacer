/**
 * The popup's visual state. Small, but it is the part a user actually sees,
 * and it was tangled into the click handler before.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { setReplaceButtonState, setUploadPrompt, showImagePreview } from "../src/popup/controls.js";
import { dataFile, page, sourceFile } from "./helpers.js";

const strings = dataFile("strings.json");

test("the button swaps caption and class in both directions", () => {
  const doc = page(`<button id="b" class="startButton"></button>`);
  const button = doc.getElementById("b");

  setReplaceButtonState(button, true, strings);
  assert.equal(button.textContent, strings.stopButton);
  assert.ok(button.classList.contains("stopButton"));
  assert.ok(!button.classList.contains("startButton"));

  setReplaceButtonState(button, false, strings);
  assert.equal(button.textContent, strings.startButton);
  assert.ok(button.classList.contains("startButton"));
  assert.ok(!button.classList.contains("stopButton"));
});

test("the upload prompt changes once an image is in hand", () => {
  const doc = page(`<span id="p"></span>`);
  const prompt = doc.getElementById("p");

  setUploadPrompt(prompt, false, strings);
  assert.equal(prompt.textContent, strings.uploadPrompt);

  setUploadPrompt(prompt, true, strings);
  assert.equal(prompt.textContent, strings.uploadPromptAfterUpload);
});

test("showing the preview points the image and reveals its container", () => {
  const doc = page(`<div id="c"><img id="i"></div>`);
  const container = doc.getElementById("c");
  const preview = doc.getElementById("i");

  showImagePreview(container, preview, "data:image/png;base64,AAAA");

  assert.equal(preview.getAttribute("src"), "data:image/png;base64,AAAA");
  assert.equal(container.style.display, "block");
});

test("the preview container is hidden until the script reveals it", () => {
  // Regression: it was only ever revealed, never hidden, so the popup opened
  // showing an empty broken image labelled as your upload.
  const rule = sourceFile("popup/popup.css").match(
    /\.uploaded-image-container\s*\{([^}]*)\}/,
  );

  assert.ok(rule, "no .uploaded-image-container rule in the stylesheet");
  assert.match(rule[1], /display:\s*none/);
});
