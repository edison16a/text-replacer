/**
 * Runs the data validator as part of the suite, so a data file that has
 * drifted from the source fails the tests rather than waiting to be noticed
 * in the browser.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const validator = fileURLToPath(new URL("../tools/validate-data.mjs", import.meta.url));

test("the data files validate against the source that consumes them", () => {
  assert.doesNotThrow(() => execFileSync("node", [validator], { stdio: "pipe" }));
});
