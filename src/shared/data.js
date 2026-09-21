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

const cache = new Map();

/**
 * Reads one packaged JSON file.
 *
 * @param {string} path Path relative to the extension root, e.g. "data/config.json".
 * @returns {Promise<object>} The parsed file.
 */
export function loadJson(path) {
  if (!cache.has(path)) {
    cache.set(
      path,
      fetch(chrome.runtime.getURL(path)).then((response) => {
        if (!response.ok) {
          // A packaged file that will not load means a broken build, not a
          // runtime condition worth recovering from. Fail loudly.
          throw new Error(`cannot read ${path}: ${response.status}`);
        }
        return response.json();
      }),
    );
  }
  return cache.get(path);
}

/** Runtime tuning values, currently just the replacement interval. */
export const loadConfig = () => loadJson("data/config.json");

/** Which elements get their text and their images overwritten. */
export const loadSelectors = () => loadJson("data/selectors.json");

/** Every visible word in the popup. */
export const loadStrings = () => loadJson("data/strings.json");

/** The popup palette and the roles that use it. */
export const loadTheme = () => loadJson("data/theme.json");
