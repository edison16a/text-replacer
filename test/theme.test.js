/**
 * The theme is a two-layer lookup (role to palette name to colour), so the
 * interesting failures are dangling references, and the interesting guarantee
 * is that the stylesheet and the data file still agree.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { applyTheme, themeToCustomProperties } from "../src/popup/theme.js";
import { dataFile, page, sourceFile } from "./helpers.js";

test("resolves every role through the palette", () => {
  const properties = themeToCustomProperties({
    palette: { blue: "#007bff", night: "#1e1e1e" },
    roles: { surface: "night", button: "blue" },
  });

  assert.deepEqual(properties, {
    "--color-surface": "#1e1e1e",
    "--color-button": "#007bff",
  });
});

test("refuses a role pointing at a colour that does not exist", () => {
  // Left to itself this renders an element with no colour at all, which is
  // easy to miss. Throwing names the role and the missing entry.
  assert.throws(
    () => themeToCustomProperties({ palette: { blue: "#007bff" }, roles: { surface: "nite" } }),
    /role "surface" points at unknown palette entry "nite"/,
  );
});

test("writes the colours onto an element", () => {
  const doc = page("");

  applyTheme({ palette: { night: "#1e1e1e" }, roles: { surface: "night" } }, doc.documentElement);

  assert.equal(doc.documentElement.style.getPropertyValue("--color-surface"), "#1e1e1e");
});

test("the shipped theme defines every colour the stylesheet asks for", () => {
  const properties = themeToCustomProperties(dataFile("theme.json"));
  const used = new Set(
    [...sourceFile("popup/popup.css").matchAll(/var\((--color-[A-Za-z]+)\)/g)].map((m) => m[1]),
  );

  assert.ok(used.size > 0, "found no custom properties in the stylesheet");
  for (const property of used) {
    assert.ok(property in properties, `${property} is used in CSS but not defined in theme.json`);
  }
});

test("the shipped theme defines nothing the stylesheet ignores", () => {
  const properties = themeToCustomProperties(dataFile("theme.json"));
  const css = sourceFile("popup/popup.css");

  for (const property of Object.keys(properties)) {
    assert.ok(css.includes(`var(${property})`), `${property} is defined but never used`);
  }
});
