#!/usr/bin/env node
/**
 * Extracts every colour in the original popup stylesheet into data/theme.json.
 *
 * Why a script and not a hand-written file: the original popup.html carried 17
 * colour-bearing declarations inline, several of them near-identical greys and
 * blues (#1e1e1e vs #2e2e2e, #007bff vs #0056b3). Retyping those by hand is how
 * you end up shipping a one-digit-off colour that nobody notices for a year.
 * The values here are read out of the committed original and never typed.
 *
 * The source is pinned to the git revision below rather than the working tree,
 * so this stays runnable after the old monolith is deleted.
 *
 * Output shape is two layers on purpose:
 *   palette - every distinct colour, defined exactly once
 *   roles   - what each UI part uses, pointing at a palette entry
 * That way changing "the blue" is one edit, not six.
 *
 * Usage: node tools/extract-theme.mjs [--check]
 *   --check exits non-zero if data/theme.json is stale instead of rewriting it.
 */

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

/** Last revision that contains the pre-refactor popup.html, byte for byte. */
const SOURCE_REV = "aea34c3";
const SOURCE_FILE = "popup.html";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT = join(ROOT, "data", "theme.json");

/**
 * Maps a raw colour literal to its palette name.
 *
 * The CSS keyword `white` is folded into #ffffff. They are the same colour by
 * spec, so rendering is untouched, and folding them means the palette has one
 * white instead of two spellings of it.
 */
const PALETTE_NAMES = new Map([
  ["#1e1e1e", "charcoal"],
  ["#2e2e2e", "graphite"],
  ["#dcdcdc", "silver"],
  ["#ffffff", "white"],
  ["white", "white"],
  ["#007bff", "blue"],
  ["#0056b3", "blueDark"],
  ["rgba(0, 145, 255, 0.764)", "blueGlow"],
  ["rgb(48, 159, 232)", "skyBlue"],
  ["#28a745", "green"],
  ["#19692c", "greenDark"],
  ["#dc3545", "red"],
  ["#96242f", "redDark"],
]);

/** Canonical literal written into the palette for each palette name. */
const PALETTE_VALUES = new Map([
  ["charcoal", "#1e1e1e"],
  ["graphite", "#2e2e2e"],
  ["silver", "#dcdcdc"],
  ["white", "#ffffff"],
  ["blue", "#007bff"],
  ["blueDark", "#0056b3"],
  ["blueGlow", "rgba(0, 145, 255, 0.764)"],
  ["skyBlue", "rgb(48, 159, 232)"],
  ["green", "#28a745"],
  ["greenDark", "#19692c"],
  ["red", "#dc3545"],
  ["redDark", "#96242f"],
]);

/**
 * Maps "<selector>|<property>" to a role name. Curated because a machine cannot
 * guess that .startButton's background is "the start button colour"; the values
 * are still read from the file, so a typo here fails loudly rather than
 * silently shipping the wrong shade.
 */
const ROLE_NAMES = new Map([
  ['body|background-color', "surface"],
  ['body|color', "text"],
  ['body|border', "surfaceBorder"],
  ['h1|color', "heading"],
  ['h1|text-shadow', "headingGlow"],
  ['input[type="text"]|background-color', "inputSurface"],
  ['input[type="text"]|color', "inputText"],
  ['.custom-file-upload|background-color', "uploadButton"],
  ['.custom-file-upload|color', "uploadButtonText"],
  ['.custom-file-upload:hover|background-color', "uploadButtonHover"],
  ['button|color', "buttonText"],
  ['.startButton|background-color', "startButton"],
  ['.startButton:hover|background-color', "startButtonHover"],
  ['.stopButton|background-color', "stopButton"],
  ['.stopButton:hover|background-color', "stopButtonHover"],
  ['.uploaded-image-label|color', "imageLabel"],
  ['.uploaded-image|border', "imagePreviewBorder"],
]);

/** CSS named colours we accept. Kept tiny so a stray word cannot pass as one. */
const NAMED_COLOURS = ["white", "black", "transparent"];

const COLOUR_PATTERN = new RegExp(
  ["#[0-9a-fA-F]{3,8}", "rgba?\\([^)]*\\)", `\\b(?:${NAMED_COLOURS.join("|")})\\b`].join("|"),
  "g",
);

/** Reads the pinned original out of git so the tool outlives the file. */
function readOriginal() {
  return execFileSync("git", ["show", `${SOURCE_REV}:${SOURCE_FILE}`], {
    cwd: ROOT,
    encoding: "utf8",
  });
}

/**
 * Flattens the <style> block into declarations.
 *
 * Deliberately a dumb splitter, not a CSS parser: the input is one known file
 * with flat rules and no at-rules or nesting. A dependency would be more code
 * to audit than the 20 lines it replaces.
 */
function parseDeclarations(html) {
  const style = html.match(/<style>([\s\S]*?)<\/style>/);
  if (!style) throw new Error("no <style> block found in the original popup");

  const css = style[1].replace(/\/\*[\s\S]*?\*\//g, "");
  const declarations = [];

  for (const block of css.split("}")) {
    const open = block.indexOf("{");
    if (open === -1) continue;
    const selector = block.slice(0, open).trim();
    for (const raw of block.slice(open + 1).split(";")) {
      const colon = raw.indexOf(":");
      if (colon === -1) continue;
      declarations.push({
        selector,
        property: raw.slice(0, colon).trim(),
        value: raw.slice(colon + 1).trim(),
      });
    }
  }
  return declarations;
}

function build() {
  const declarations = parseDeclarations(readOriginal());
  const roles = {};
  const usedPalette = new Set();
  const seen = new Set();

  for (const { selector, property, value } of declarations) {
    const colours = value.match(COLOUR_PATTERN);
    if (!colours) continue;
    if (colours.length > 1) {
      throw new Error(`${selector} { ${property} } has ${colours.length} colours, expected 1`);
    }

    const key = `${selector}|${property}`;
    if (seen.has(key)) throw new Error(`duplicate colour declaration for ${key}`);
    seen.add(key);

    const role = ROLE_NAMES.get(key);
    if (!role) throw new Error(`no role name mapped for ${key}`);

    const paletteName = PALETTE_NAMES.get(colours[0]);
    if (!paletteName) throw new Error(`unmapped colour literal ${colours[0]} in ${key}`);

    roles[role] = paletteName;
    usedPalette.add(paletteName);
  }

  const missingRoles = [...ROLE_NAMES.values()].filter((role) => !(role in roles));
  if (missingRoles.length) {
    throw new Error(`roles declared but not found in the source: ${missingRoles.join(", ")}`);
  }

  const unusedPalette = [...PALETTE_VALUES.keys()].filter((name) => !usedPalette.has(name));
  if (unusedPalette.length) {
    throw new Error(`palette entries nothing uses: ${unusedPalette.join(", ")}`);
  }

  const palette = {};
  for (const name of [...usedPalette].sort()) palette[name] = PALETTE_VALUES.get(name);

  const sortedRoles = {};
  for (const role of Object.keys(roles).sort()) sortedRoles[role] = roles[role];

  return {
    _comment: `Generated by tools/extract-theme.mjs from ${SOURCE_FILE} at ${SOURCE_REV}. Every role resolves to a palette entry; the popup turns these into CSS custom properties at load.`,
    palette,
    roles: sortedRoles,
  };
}

const json = `${JSON.stringify(build(), null, 2)}\n`;

if (process.argv.includes("--check")) {
  const current = readFileSync(OUTPUT, "utf8");
  if (current !== json) {
    console.error("data/theme.json is stale, re-run: node tools/extract-theme.mjs");
    process.exit(1);
  }
  console.log("data/theme.json matches the extracted source");
} else {
  writeFileSync(OUTPUT, json);
  console.log(`wrote ${OUTPUT}`);
}
