import test from "node:test";
import assert from "node:assert/strict";

import { buildSelector } from "../src/shared/selectors.js";
import { dataFile, page } from "./helpers.js";

test("joins a list into one query string", () => {
  assert.equal(buildSelector(["h1", "p", "li"]), "h1, p, li");
});

test("rejects a list with nothing in it", () => {
  // An empty selector string matches nothing and querySelectorAll throws on
  // it, so failing here gives a message that names the actual problem.
  assert.throws(() => buildSelector([]), /non-empty array/);
  assert.throws(() => buildSelector(undefined), /non-empty array/);
});

test("the shipped selector lists are valid CSS", () => {
  const selectors = dataFile("selectors.json");
  const doc = page("");

  for (const group of ["text", "image"]) {
    assert.doesNotThrow(
      () => doc.querySelectorAll(buildSelector(selectors[group])),
      `selectors.${group} is not a usable selector`,
    );
  }
});
