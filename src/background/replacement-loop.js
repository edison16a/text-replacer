/**
 * The repeating rewrite, with its state and its timer in one place.
 *
 * This is a factory rather than module-level variables because that is what
 * makes it testable: the old background page reached straight for
 * chrome.tabs, chrome.tabs.executeScript and setInterval, so there was no way
 * to exercise the start/stop logic without a browser. Here the three things it
 * touches are arguments, and a test can pass fakes.
 *
 * The loop re-queries the tab list on every tick rather than capturing it at
 * start. That is deliberate and matches the original: a tab opened after you
 * press Start gets rewritten on the next tick.
 */

/**
 * @typedef {object} ReplacementLoopOptions
 * @property {number} intervalMs How often to rewrite every open tab.
 * @property {() => Promise<Array<{id: number}>>} listTabs Yields the tabs to act on.
 * @property {(tabId: number, text: string, imageUrl: string) => Promise<unknown>} applyToTab
 *   Rewrites one tab. May reject; the loop treats that as normal.
 * @property {typeof setInterval} [schedule]
 * @property {typeof clearInterval} [cancel]
 */

/**
 * @param {ReplacementLoopOptions} options
 */
export function createReplacementLoop({
  intervalMs,
  listTabs,
  applyToTab,
  schedule = setInterval,
  cancel = clearInterval,
}) {
  let intervalId = null;
  let replacementText = "";
  let imageUrl = "";

  /**
   * Rewrites every open tab once.
   *
   * Failures are swallowed per tab on purpose. Injection is rejected on
   * chrome:// pages, the Web Store and the PDF viewer, and that is an ordinary
   * fact of life, not an error worth stopping for. The old version ignored the
   * same failures by never reading chrome.runtime.lastError; here they would
   * otherwise surface as unhandled promise rejections and fill the service
   * worker log with noise.
   */
  async function tick() {
    const tabs = await listTabs();
    await Promise.all(
      tabs.map(async (tab) => {
        try {
          await applyToTab(tab.id, replacementText, imageUrl);
        } catch {
          // Tab we are not allowed to touch. Try again next tick.
        }
      }),
    );
  }

  return {
    /** True while the timer is running. */
    get isReplacing() {
      return intervalId !== null;
    },

    /**
     * Starts rewriting. A second call while already running is ignored, which
     * is what stops the timer from being replaced and leaked.
     */
    start(text, url) {
      if (intervalId !== null) return;
      replacementText = text;
      imageUrl = url;
      intervalId = schedule(tick, intervalMs);
    },

    /** Stops rewriting and forgets what it was replacing with. */
    stop() {
      if (intervalId === null) return;
      cancel(intervalId);
      intervalId = null;
      replacementText = "";
      imageUrl = "";
    },

    /** Runs one pass immediately. Exposed so tests do not need a real clock. */
    tick,
  };
}
