/**
 * Background entry point: owns the loop and answers the popup.
 *
 * Two things about service workers shape this file.
 *
 * The worker is torn down when idle and restarted on the next event, so the
 * message listener is registered synchronously at the top level. Awaiting the
 * data files first would mean events arriving during that await are missed.
 * The data is loaded lazily inside the handler instead.
 *
 * While replacement is running, the interval injects into every tab once a
 * second, and that activity is what keeps the worker alive. The moment you
 * press Stop the worker is free to be collected, which is the behaviour we
 * want.
 */

import { loadConfig, loadSelectors } from "../shared/data.js";
import { buildSelector } from "../shared/selectors.js";
import { replacePage } from "../content/replace-page.js";
import { once } from "../shared/once.js";
import { createReplacementLoop } from "./replacement-loop.js";
import { routeMessage } from "./route-message.js";

/**
 * The loop, built once per worker lifetime.
 *
 * once() rather than a plain `if (loop) return loop`, because that pattern
 * caches the result and not the work. Two messages arriving before the first
 * data read finished both found nothing cached and both built a loop. The
 * Start built and started one, the Stop then overwrote the handle with a
 * second loop and stopped that one instead, leaving a timer running every
 * second that nothing held a reference to. Replacement carried on and the
 * Stop button could not stop it.
 */
const getLoop = once(async () => {
  const [config, selectors] = await Promise.all([loadConfig(), loadSelectors()]);
  const textSelector = buildSelector(selectors.text);
  const imageSelector = buildSelector(selectors.image);

  return createReplacementLoop({
    intervalMs: config.replacementIntervalMs,
    listTabs: () => chrome.tabs.query({}),
    applyToTab: (tabId, text, imageUrl) => {
      // Chrome returns some tabs with no id, such as devtools windows. There
      // is nothing to inject into. Passing the missing id through would make
      // executeScript throw and the loop swallow it, which is the same
      // outcome by a longer route.
      if (tabId === undefined) return Promise.resolve();

      return chrome.scripting.executeScript({
        target: { tabId },
        // A function plus arguments, never a source string. The values cross
        // as data, so nothing the user types can be parsed as code.
        func: replacePage,
        args: [textSelector, imageSelector, text, imageUrl],
      });
    },
  });
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  (async () => {
    sendResponse(routeMessage(message, await getLoop()));
  })();

  // Keep the message channel open: the reply happens after an await.
  return true;
});
