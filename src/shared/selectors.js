/**
 * Turns a selector list from data/selectors.json into one query string.
 *
 * The list is stored as an array because a JSON array is the obvious place to
 * add a tag name, while the DOM wants a single comma-separated string. Joining
 * with ", " reproduces the exact selector the pre-refactor extension used.
 *
 * @param {string[]} list Standalone CSS selectors.
 * @returns {string} One selector suitable for querySelectorAll.
 */
export function buildSelector(list) {
  if (!Array.isArray(list) || list.length === 0) {
    throw new Error("selector list must be a non-empty array");
  }
  return list.join(", ");
}
