/**
 * The page rewrite is the only thing this extension does to a page, so these
 * run it against a real DOM with the real selector list rather than a stub.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { replacePage } from "../src/content/replace-page.js";
import { buildSelector } from "../src/shared/selectors.js";
import { dataFile, page } from "./helpers.js";

const selectors = dataFile("selectors.json");
const TEXT = buildSelector(selectors.text);
const IMAGES = buildSelector(selectors.image);

test("rewrites the elements it targets and leaves the rest alone", () => {
  const doc = page(`
    <h1>headline</h1>
    <p>paragraph</p>
    <ul><li>item</li></ul>
    <div>untargeted div</div>
    <span>untargeted span</span>
    <a href="#">untargeted link</a>
  `);

  replacePage(TEXT, IMAGES, "BOO", "", doc);

  assert.equal(doc.querySelector("h1").textContent, "BOO");
  assert.equal(doc.querySelector("p").textContent, "BOO");
  assert.equal(doc.querySelector("li").textContent, "BOO");
  assert.equal(doc.querySelector("div").textContent, "untargeted div");
  assert.equal(doc.querySelector("span").textContent, "untargeted span");
  assert.equal(doc.querySelector("a").textContent, "untargeted link");
});

/**
 * Wraps a tag in whatever parent the HTML parser insists on. td and th outside
 * a table are silently dropped by the parser, so a naive fixture would test
 * nothing and look like it passed.
 */
function sample(tag) {
  const element = `<${tag}>original</${tag}>`;
  if (tag === "td" || tag === "th") return `<table><tbody><tr>${element}</tr></tbody></table>`;
  if (tag === "li") return `<ul>${element}</ul>`;
  return element;
}

test("every selector listed in the data file is actually rewritten", () => {
  // Guards against the data file and the code drifting apart: add a tag to
  // selectors.json and this proves it reaches the page.
  const doc = page(selectors.text.map(sample).join(""));

  replacePage(TEXT, IMAGES, "REPLACED", "", doc);

  for (const tag of selectors.text) {
    assert.equal(doc.querySelector(tag).textContent, "REPLACED", `${tag} was not rewritten`);
  }
});

test("points every image at the uploaded one", () => {
  const doc = page(`<img src="a.png"><img src="b.png">`);

  replacePage(TEXT, IMAGES, "x", "data:image/png;base64,AAAA", doc);

  for (const image of doc.querySelectorAll("img")) {
    assert.equal(image.getAttribute("src"), "data:image/png;base64,AAAA");
  }
});

test("leaves images untouched when nothing was uploaded", () => {
  // Regression: an empty src resolves to the page's own URL rather than
  // clearing the image, so text-only replacement used to break every picture.
  const doc = page(`<img src="a.png"><img src="b.png">`);

  replacePage(TEXT, IMAGES, "x", "", doc);

  assert.deepEqual(
    [...doc.querySelectorAll("img")].map((image) => image.getAttribute("src")),
    ["a.png", "b.png"],
  );
});

test("treats the replacement as text, never as code", () => {
  // Regression: the rewrite used to be a source string with the user's text
  // interpolated into it, so quotes broke it and a crafted value ran.
  const hostile = `"; alert(1); const x = "\\ and a newline:\n<script>bad()</script>`;
  const doc = page(`<p>original</p>`);

  replacePage(TEXT, IMAGES, hostile, "", doc);

  assert.equal(doc.querySelector("p").textContent, hostile);
  assert.equal(doc.querySelectorAll("script").length, 0);
});

test("does nothing at all on a page with no matches", () => {
  const doc = page(`<div><section>nothing to see</section></div>`);

  replacePage(TEXT, IMAGES, "BOO", "u.png", doc);

  assert.equal(doc.body.textContent.trim(), "nothing to see");
});

test("still replaces every tag the extension shipped with", () => {
  // The selector list is data now, so adding a tag is expected and fine.
  // Losing one is not, and would be invisible to the test above, which walks
  // whatever the data file happens to contain.
  const shipped = [
    "h1", "h2", "h3", "h4", "h5", "h6", "p", "li", "td", "th",
    "strong", "em", "b", "i", "u", "blockquote", "q",
  ];

  for (const tag of shipped) {
    assert.ok(selectors.text.includes(tag), `${tag} was dropped from selectors.json`);
  }
  assert.deepEqual(selectors.image, ["img"]);
});
