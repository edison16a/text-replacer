/**
 * The page rewrite, and the only code that touches a visited page.
 *
 * Two constraints shape this file.
 *
 * It is injected with chrome.scripting.executeScript({ func }), which
 * serialises the function with toString() and re-creates it inside the page.
 * So it must close over nothing: no imports, no module-level constants, no
 * helper calls. Everything it needs arrives as an argument. Adding a tidy
 * little helper above and calling it from here would throw a ReferenceError in
 * the page, not at build time.
 *
 * It also replaces what the old extension replaced, in the same order, with
 * the same effects. The old version built this as a string and interpolated
 * the user's text straight into it, so a replacement containing a double quote
 * produced a syntax error and one containing `";alert(1);"` ran as code.
 * Passing values as arguments removes that entirely: they are data crossing
 * the boundary, never source.
 *
 * @param {string} textSelector Comma-separated selector for elements to retext.
 * @param {string} imageSelector Selector for images to repoint.
 * @param {string} replacementText Text every matched element is set to.
 * @param {string} imageUrl URL or data URL every matched image is set to. An
 *   empty string means no image was uploaded and images are left alone.
 * @param {Document} [doc] The document to act on. Defaults to the page's own,
 *   which is what happens when injected; tests pass one in.
 */
export function replacePage(textSelector, imageSelector, replacementText, imageUrl, doc = document) {
  for (const element of doc.querySelectorAll(textSelector)) {
    element.textContent = replacementText;
  }
  // Only touch images when there is something to point them at. Setting src
  // to "" does not clear an image, it resolves to the page's own URL, so
  // replacing text alone used to break every picture on every page you had
  // open. Uploading an image is optional, so this has to be too.
  if (imageUrl) {
    for (const image of doc.querySelectorAll(imageSelector)) {
      // The selector decides what comes back, so this asserts rather than
      // checks. A JSDoc cast is a comment, which matters here: this function is
      // serialised with toString() and rebuilt inside the page.
      /** @type {HTMLImageElement} */ (image).src = imageUrl;
    }
  }
}
