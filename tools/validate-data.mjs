#!/usr/bin/env node
/**
 * Checks the data files against each other and against the source.
 *
 * Moving content out of code buys one problem back: a data file can now go
 * wrong on its own. A renamed colour role, a string key nothing uses, a
 * selector with a stray comma, none of those are syntax errors and all of them
 * show up as something quietly missing in the popup. This catches them before
 * the browser does.
 *
 * It deliberately does not compare the data against the pre-refactor source.
 * The extractors in this directory do that, and they are migration tools: they
 * prove where the data came from, once. Running them as a gate would mean
 * every reworded caption and every recoloured button failed validation, which
 * is the opposite of what moving the content out of the code was for.
 *
 * Usage: node tools/validate-data.mjs
 */

import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const problems = [];
const checks = [];

const fail = (message) => problems.push(message);
const pass = (message) => checks.push(message);

const read = (relative) => readFileSync(join(ROOT, relative), "utf8");
const readJson = (relative) => JSON.parse(read(relative));

/** Every file under src/, so usage checks cannot miss a module. */
function sourceFiles(directory = "src") {
  const entries = [];
  for (const name of readdirSync(join(ROOT, directory))) {
    const relative = `${directory}/${name}`;
    if (statSync(join(ROOT, relative)).isDirectory()) entries.push(...sourceFiles(relative));
    else entries.push(relative);
  }
  return entries;
}

const SOURCE = sourceFiles().map((path) => [path, read(path)]);
const ALL_SOURCE = SOURCE.map(([, text]) => text).join("\n");

// --- config ---------------------------------------------------------------

const config = readJson("data/config.json");
if (!Number.isFinite(config.replacementIntervalMs) || config.replacementIntervalMs <= 0) {
  fail("config.replacementIntervalMs must be a positive number");
} else {
  pass(`config.replacementIntervalMs = ${config.replacementIntervalMs}ms`);
}

// --- selectors ------------------------------------------------------------

const selectors = readJson("data/selectors.json");
for (const group of ["text", "image"]) {
  const list = selectors[group];
  if (!Array.isArray(list) || list.length === 0) {
    fail(`selectors.${group} must be a non-empty array`);
    continue;
  }
  const bad = list.filter((entry) => typeof entry !== "string" || entry.trim() !== entry || !entry);
  if (bad.length) fail(`selectors.${group} has untrimmed or empty entries: ${bad.join(", ")}`);

  const duplicates = list.filter((entry, index) => list.indexOf(entry) !== index);
  if (duplicates.length) fail(`selectors.${group} repeats: ${duplicates.join(", ")}`);

  // A comma inside an entry means someone pasted a selector list into a slot
  // meant for one selector. It still works, but the array stops being editable.
  const commas = list.filter((entry) => entry.includes(","));
  if (commas.length) fail(`selectors.${group} entries must be single selectors: ${commas.join(" | ")}`);

  if (!bad.length && !duplicates.length && !commas.length) {
    pass(`selectors.${group}: ${list.length} valid ${list.length === 1 ? "entry" : "entries"}`);
  }
}

// --- strings --------------------------------------------------------------

const { _comment: _stringsComment, ...strings } = readJson("data/strings.json");

const empty = Object.entries(strings).filter(([, value]) => typeof value !== "string" || !value.trim());
if (empty.length) fail(`strings with no text: ${empty.map(([key]) => key).join(", ")}`);

/** Keys the markup asks for. */
const markupKeys = [...read("src/popup/popup.html").matchAll(/data-string[a-z-]*="([^"]+)"/g)].map(
  (match) => match[1],
);
const missingInData = markupKeys.filter((key) => !(key in strings));
if (missingInData.length) fail(`markup asks for strings that do not exist: ${missingInData.join(", ")}`);

const unusedStrings = Object.keys(strings).filter(
  (key) => !markupKeys.includes(key) && !ALL_SOURCE.includes(`strings.${key}`),
);
if (unusedStrings.length) fail(`strings nothing uses: ${unusedStrings.join(", ")}`);

if (!empty.length && !missingInData.length && !unusedStrings.length) {
  pass(`strings: ${Object.keys(strings).length} keys, all defined and all used`);
}

// --- theme ----------------------------------------------------------------

const theme = readJson("data/theme.json");

const brokenRoles = Object.entries(theme.roles).filter(([, name]) => !(name in theme.palette));
if (brokenRoles.length) {
  fail(`theme roles pointing at missing palette entries: ${brokenRoles.map(([r]) => r).join(", ")}`);
}

const usedPalette = new Set(Object.values(theme.roles));
const unusedPalette = Object.keys(theme.palette).filter((name) => !usedPalette.has(name));
if (unusedPalette.length) fail(`palette entries no role uses: ${unusedPalette.join(", ")}`);

const css = read("src/popup/popup.css");
const cssRoles = new Set([...css.matchAll(/var\(--color-([A-Za-z]+)\)/g)].map((match) => match[1]));

const undefinedInTheme = [...cssRoles].filter((role) => !(role in theme.roles));
if (undefinedInTheme.length) fail(`popup.css uses undefined roles: ${undefinedInTheme.join(", ")}`);

const unusedRoles = Object.keys(theme.roles).filter((role) => !cssRoles.has(role));
if (unusedRoles.length) fail(`theme roles the stylesheet never uses: ${unusedRoles.join(", ")}`);

// No colour literal should have survived in the stylesheet.
const strayColours = css.replace(/\/\*[\s\S]*?\*\//g, "").match(/#[0-9a-fA-F]{3,8}|rgba?\([^)]*\)/g);
if (strayColours) fail(`colour literals left in popup.css: ${strayColours.join(", ")}`);

if (
  !brokenRoles.length &&
  !unusedPalette.length &&
  !undefinedInTheme.length &&
  !unusedRoles.length &&
  !strayColours
) {
  pass(
    `theme: ${Object.keys(theme.palette).length} colours, ${Object.keys(theme.roles).length} roles, all used by the stylesheet, no literals left behind`,
  );
}

// --- report ---------------------------------------------------------------

for (const check of checks) console.log(`  ok    ${check}`);
for (const problem of problems) console.error(`  FAIL  ${problem}`);

console.log(`\n${checks.length} checks passed, ${problems.length} failed`);
process.exit(problems.length ? 1 : 0);
