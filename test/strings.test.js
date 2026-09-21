/**
 * Copy lives in data/strings.json and the markup only marks the slots, so the
 * failure worth catching is a slot that names a key nobody wrote.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { applyStrings } from "../src/popup/strings.js";
import { dataFile, page, popupDocument } from "./helpers.js";

test("fills text, placeholders and alt text", () => {
  const doc = page(`
    <h1 data-string="title"></h1>
    <input data-string-placeholder="hint">
    <img data-string-alt="caption">
  `);

  applyStrings(doc, { title: "Hello", hint: "Type here", caption: "A picture" });

  assert.equal(doc.querySelector("h1").textContent, "Hello");
  assert.equal(doc.querySelector("input").placeholder, "Type here");
  assert.equal(doc.querySelector("img").alt, "A picture");
});

test("refuses a slot with no matching key", () => {
  // Silently leaving the element blank is much harder to spot than a throw.
  const doc = page(`<h1 data-string="titel"></h1>`);

  assert.throws(() => applyStrings(doc, { title: "Hello" }), /data-string="titel"/);
});

test("the shipped markup and copy fill every slot", () => {
  const doc = popupDocument();
  const strings = dataFile("strings.json");

  applyStrings(doc, strings);

  const slots = doc.querySelectorAll("[data-string]");
  assert.ok(slots.length > 0, "found no copy slots in the popup markup");
  for (const element of slots) {
    assert.notEqual(element.textContent.trim(), "", `${element.tagName} was left empty`);
  }
  assert.notEqual(doc.getElementById("replaceText").placeholder.trim(), "");
});

test("the markup carries no copy of its own", () => {
  // If a caption creeps back into the HTML it stops being editable from the
  // data file, and the two can then disagree.
  const doc = popupDocument();

  for (const element of doc.querySelectorAll("[data-string]")) {
    assert.equal(element.textContent, "", `${element.tagName} has hard-coded text`);
  }
});
