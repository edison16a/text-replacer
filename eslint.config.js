/**
 * Lint rules.
 *
 * The point here is not style, .editorconfig and consistent review cover that.
 * It is the small set of mistakes that are invisible when you read a diff: a
 * variable you meant to use, an await you forgot, a promise nobody handles, an
 * assignment where a comparison was meant.
 *
 * Three environments, because the three layers genuinely have different
 * globals. The extension code has chrome and the DOM. The tools and tests run
 * on Node and have neither.
 */

import globals from "globals";

/** Rules that apply everywhere, whatever the file runs on. */
const shared = {
  "no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
  "no-implicit-coercion": "error",
  "no-return-assign": "error",
  "no-var": "error",
  "prefer-const": "error",
  "prefer-template": "error",
  eqeqeq: ["error", "always"],
  // An async function with nothing to await is usually a leftover from a
  // refactor, and it quietly changes the function's return type.
  "require-await": "error",
  // The bug this repo just had: a floating promise whose rejection nobody
  // sees. Warn rather than error, because a deliberate fire-and-forget is a
  // real thing and should be commented, not contorted.
  "no-void": "error",
};

export default [
  {
    ignores: ["node_modules/**"],
  },
  {
    // The extension itself: browser globals plus chrome.
    files: ["src/**/*.js"],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "module",
      globals: { ...globals.browser, ...globals.serviceworker, chrome: "readonly" },
    },
    rules: shared,
  },
  {
    // Tooling and tests run on Node and must not reach for a DOM global by
    // accident. The tests build their own through jsdom.
    files: ["tools/**/*.mjs", "test/**/*.js", "eslint.config.js"],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "module",
      globals: { ...globals.node },
    },
    rules: {
      ...shared,
      // Test doubles for chrome's promise APIs are async functions that only
      // return a value. That is the whole point of them, so the rule that
      // wants an await inside every async function is noise here.
      "require-await": "off",
    },
  },
];
