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
import {
  START_REPLACING,
  STOP_REPLACING,
  STARTED_REPLY,
  STOPPED_REPLY,
} from "../shared/messages.js";
import { createReplacementLoop } from "./replacement-loop.js";

/** Memoised so the data files are read once per worker lifetime, not per message. */
let loop = null;

async function getLoop() {
  if (loop) return loop;

  const [config, selectors] = await Promise.all([loadConfig(), loadSelectors()]);
  const textSelector = buildSelector(selectors.text);
  const imageSelector = buildSelector(selectors.image);

  loop = createReplacementLoop({
    intervalMs: config.replacementIntervalMs,
    listTabs: () => chrome.tabs.query({}),
    applyToTab: (tabId, text, imageUrl) =>
      chrome.scripting.executeScript({
        target: { tabId },
        // A function plus arguments, never a source string. The values cross
        // as data, so nothing the user types can be parsed as code.
        func: replacePage,
        args: [textSelector, imageSelector, text, imageUrl],
      }),
  });
  return loop;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    const replacer = await getLoop();

    if (message.action === START_REPLACING && !replacer.isReplacing) {
      replacer.start(message.text, message.imageUrl);
      sendResponse({ message: STARTED_REPLY });
    } else if (message.action === STOP_REPLACING && replacer.isReplacing) {
      replacer.stop();
      sendResponse({ message: STOPPED_REPLY });
    }
  })();

  // Keep the message channel open: every reply above happens after an await.
  return true;
});
