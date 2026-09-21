/**
 * Fills the markup with copy from data/strings.json.
 *
 * The markup marks its slots with data-string attributes and holds no words of
 * its own, so the copy has exactly one home. An attribute naming a key that
 * does not exist throws rather than leaving a blank element on screen, because
 * a silently empty button is much harder to notice than a stack trace.
 */

/** Attribute to the property it fills. */
const SLOTS = [
  ["data-string", (element, value) => (element.textContent = value)],
  ["data-string-placeholder", (element, value) => (element.placeholder = value)],
  ["data-string-alt", (element, value) => (element.alt = value)],
];

/**
 * @param {ParentNode} root Document or subtree to fill.
 * @param {Record<string, string>} strings Contents of data/strings.json.
 */
export function applyStrings(root, strings) {
  for (const [attribute, assign] of SLOTS) {
    for (const element of root.querySelectorAll(`[${attribute}]`)) {
      const key = element.getAttribute(attribute);
      const value = strings[key];
      if (value === undefined) {
        throw new Error(`${attribute}="${key}" has no entry in data/strings.json`);
      }
      assign(element, value);
    }
  }
}
