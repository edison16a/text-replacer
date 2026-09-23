/**
 * Loads the JSON data files that ship with the extension.
 *
 * Everything that used to be hard-coded (the element list, the tick interval,
 * the copy, the colours) lives in data/*.json and is read through here, so
 * changing any of it is a data edit rather than a code edit.
 *
 * Results are memoised per extension context. The background worker asks for
 * the selectors on every tick, and re-fetching a file that cannot change while
 * the extension is loaded would be wasted work. The cache dies with the
 * context, which is exactly the lifetime of the data.
 */

import { once } from "./once.js";

/**
 * Runtime tuning values.
 *
 * @typedef {object} Config
 * @property {number} replacementIntervalMs How often every open tab is rewritten.
 */

/**
 * What gets replaced. Each entry is one standalone CSS selector.
 *
 * @typedef {object} Selectors
 * @property {string[]} text Elements whose text is overwritten.
 * @property {string[]} image Elements whose source is repointed.
 */

/**
 * The popup's copy, keyed by the name the markup asks for.
 *
 * @typedef {Record<string, string>} Strings
 */

/**
 * The popup's colours, in two layers so each colour is defined once.
 *
 * @typedef {object} Theme
 * @property {Record<string, string>} palette Every distinct colour, by name.
 * @property {Record<string, string>} roles Which UI part uses which palette entry.
 */

/** @type {Map<string, () => Promise<any>>} */
const loaders = new Map();

/**
 * Reads one packaged JSON file.
 *
 * Generic because the caller knows the shape and this function cannot: the
 * four typed loaders below name it, so the rest of the codebase never handles
 * an untyped blob.
 *
 * @template T
 * @param {string} path Path relative to the extension root, e.g. "data/config.json".
 * @returns {Promise<T>} The parsed file.
 */
export function loadJson(path) {
  let load = loaders.get(path);

  if (!load) {
    // once() rather than caching the promise directly. Caching the promise
    // means a rejected one is cached too, so a single failed read used to
    // break that file for as long as the popup or the worker lived, with
    // every later call handed the same old error and no retry ever attempted.
    load = once(async () => {
      const response = await fetch(chrome.runtime.getURL(path));
      if (!response.ok) {
        throw new Error(`cannot read ${path}: ${response.status}`);
      }
      return response.json();
    });
    loaders.set(path, load);
  }

  return load();
}

/** @type {() => Promise<Config>} Runtime tuning values. */
export const loadConfig = () => loadJson("data/config.json");

/** @type {() => Promise<Selectors>} Which elements get replaced. */
export const loadSelectors = () => loadJson("data/selectors.json");

/** @type {() => Promise<Strings>} Every visible word in the popup. */
export const loadStrings = () => loadJson("data/strings.json");

/** @type {() => Promise<Theme>} The popup palette and the roles that use it. */
export const loadTheme = () => loadJson("data/theme.json");
