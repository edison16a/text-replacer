/** Shared test scaffolding: a real DOM and the real data files. */

import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";

/** Reads a data file exactly as the extension would receive it. */
export function dataFile(name) {
  return JSON.parse(readFileSync(new URL(`../data/${name}`, import.meta.url), "utf8"));
}

/** Reads a source file as text, for the checks that inspect markup or CSS. */
export function sourceFile(relative) {
  return readFileSync(new URL(`../src/${relative}`, import.meta.url), "utf8");
}

/** A document containing the given body markup. */
export function page(body) {
  return new JSDOM(`<!DOCTYPE html><html><body>${body}</body></html>`).window.document;
}

/** The real popup markup, parsed. */
export function popupDocument() {
  return new JSDOM(sourceFile("popup/popup.html")).window.document;
}
