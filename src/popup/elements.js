/**
 * Finds the popup's elements, once, in one place.
 *
 * Every id and selector the script depends on is listed here, so the coupling
 * between the markup and the code is one object rather than six lookups spread
 * through the entry point. Renaming an id in popup.html now has exactly one
 * place to follow it to, and a test can check the markup still carries all of
 * them without booting the popup.
 *
 * A missing element throws immediately and says which one. The alternative is
 * a null that travels until something calls addEventListener on it, by which
 * point the error names neither the element nor the markup.
 */

/** Element name to the selector that finds it in popup.html. */
export const HANDLES = {
  replaceButton: "#replaceButton",
  replaceText: "#replaceText",
  uploadImage: "#uploadImage",
  uploadPrompt: "#uploadLabel span",
  imageContainer: "#uploadedImageContainer",
  imagePreview: "#uploadedImagePreview",
};

/**
 * @param {ParentNode} root The popup document.
 * @returns {Record<keyof typeof HANDLES, Element>} Every element, by name.
 */
export function findElements(root) {
  const elements = /** @type {Record<string, Element>} */ ({});

  for (const [name, selector] of Object.entries(HANDLES)) {
    const element = root.querySelector(selector);
    if (!element) {
      throw new Error(`popup markup has no ${name}: nothing matches ${selector}`);
    }
    elements[name] = element;
  }

  return elements;
}
