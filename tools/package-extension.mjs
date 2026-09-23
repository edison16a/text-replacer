#!/usr/bin/env node
/**
 * Builds the zip you upload to the Chrome Web Store.
 *
 * A packaged zip used to be committed to the repo, which is how it ended up
 * holding a .DS_Store, a vim swap file and a copy of the extension that did
 * not match any source here. A zip is output, so it is produced on demand and
 * gitignored.
 *
 * What goes in is derived from the manifest rather than listed here, so a file
 * the extension references is packaged because it is referenced, and a file
 * nobody references stays out. Nothing is compiled: the contents are the
 * source in this repo, byte for byte, which is the whole point of an extension
 * with no build step.
 *
 * Usage: node tools/package-extension.mjs
 */

import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = join(ROOT, "dist");

const manifest = JSON.parse(readFileSync(join(ROOT, "manifest.json"), "utf8"));

/**
 * Everything the extension needs at runtime.
 *
 * The whole of src/ and data/ go in because the modules import each other and
 * the popup fetches the data by path. The icons come from the manifest so a
 * renamed icon cannot be silently left out, which is exactly the mistake that
 * shipped a broken toolbar icon here once already.
 */
function contents() {
  const icons = [
    ...Object.values(manifest.icons ?? {}),
    ...Object.values(manifest.action?.default_icon ?? {}),
  ];

  return [...new Set(["manifest.json", "src", "data", ...icons])].sort();
}

const name = `${manifest.name.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-")}-${manifest.version}.zip`;
const target = join(OUT_DIR, name);

rmSync(target, { force: true });
mkdirSync(OUT_DIR, { recursive: true });

// -r for directories, -X to leave out the extra file attributes that put
// macOS resource forks in the last zip somebody committed here. Markdown is
// documentation for people reading the repo, not something users install.
execFileSync("zip", ["-rXq", target, ...contents(), "-x", "*.md"], {
  cwd: ROOT,
  stdio: "inherit",
});

const packaged = new Set(
  execFileSync("zip", ["-sf", target], { encoding: "utf8" })
    .split("\n")
    .filter((line) => line.startsWith("  "))
    .map((line) => line.trim()),
);

// Check the zip against the manifest before calling it done. A store upload
// that is missing a file fails after review has already started, and the
// broken icon path this project once shipped is exactly this mistake.
const required = [
  manifest.background.service_worker,
  manifest.action.default_popup,
  ...Object.values(manifest.icons ?? {}),
  ...Object.values(manifest.action?.default_icon ?? {}),
];

const missing = [...new Set(required)].filter((path) => !packaged.has(path));
if (missing.length) {
  console.error(`the package is missing files the manifest needs: ${missing.join(", ")}`);
  process.exit(1);
}

console.log(`wrote dist/${name} (${packaged.size} files, ${required.length} manifest paths checked)`);
