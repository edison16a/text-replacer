/**
 * Fills the markup with copy from data/strings.json.
 *
 * The markup marks its slots with data-string attributes and holds no words of
 * its own, so the copy has exactly one home. An attribute naming a key that
 * does not exist throws rather than leaving a blank element on screen, because
 * a silently empty button is much harder to notice than a stack trace.
 */

/**
 * One kind of slot: the attribute that marks it, and how to fill it.
 *
 * @typedef {object} Slot
 * @property {string} attribute The marker attribute, naming a key in the data.
 * @property {(element: Element, value: string) => void} assign Puts the copy in.
 */

/** @type {Slot[]} */
const SLOTS = [
  {
    attribute: "data-string",
    assign: (element, value) => {
      element.textContent = value;
    },
  },
  {
    attribute: "data-string-placeholder",
    assign: (element, value) => {
      /** @type {HTMLInputElement} */ (element).placeholder = value;
    },
  },
  {
    attribute: "data-string-alt",
    assign: (element, value) => {
      /** @type {HTMLImageElement} */ (element).alt = value;
    },
  },
];

/**
 * @param {ParentNode} root Document or subtree to fill.
 * @param {Record<string, string>} strings Contents of data/strings.json.
 */
export function applyStrings(root, strings) {
  for (const { attribute, assign } of SLOTS) {
    for (const element of root.querySelectorAll(`[${attribute}]`)) {
      // Non-null by construction: we selected these elements on the attribute.
      const key = /** @type {string} */ (element.getAttribute(attribute));
      const value = strings[key];
      if (value === undefined) {
        throw new Error(`${attribute}="${key}" has no entry in data/strings.json`);
      }
      assign(element, value);
    }
  }
}
