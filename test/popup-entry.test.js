/**
 * Boots the real popup entry point against the real markup and the real data
 * files, with chrome and fetch stubbed.
 *
 * Nothing else covers the wiring: every other test exercises a module on its
 * own, so an import that does not resolve, or an element id that no longer
 * matches the markup, would pass all of them and fail only in a browser.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";

const repoFile = (relative) => readFileSync(new URL(`../${relative}`, import.meta.url), "utf8");
const strings = JSON.parse(repoFile("data/strings.json"));

const dom = new JSDOM(repoFile("src/popup/popup.html"));
globalThis.document = dom.window.document;
globalThis.FileReader = dom.window.FileReader;

const sentMessages = [];
globalThis.chrome = {
  runtime: {
    getURL: (path) => path,
    sendMessage: async (message) => {
      sentMessages.push(message);
      return { message: "stubbed reply" };
    },
  },
  storage: { local: { get: async () => ({}), set: async () => {} } },
  tabs: { query: async () => [{ id: 1 }], reload: () => {} },
};

globalThis.fetch = async (path) => ({
  ok: true,
  json: async () => JSON.parse(repoFile(path)),
});

/** Waits for the popup's first paint, which happens after two awaits. */
async function booted() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (document.getElementById("replaceButton").textContent) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error("the popup never finished loading");
}

await import("../src/popup/popup.js");
await booted();

test("fills the panel with the shipped copy", () => {
  assert.equal(document.querySelector("h1").textContent, strings.appTitle);
  assert.equal(document.getElementById("replaceButton").textContent, strings.startButton);
  assert.equal(document.querySelector("#uploadLabel span").textContent, strings.uploadPrompt);
  assert.equal(document.getElementById("replaceText").placeholder, strings.replacementTextPlaceholder);
  assert.equal(document.title, strings.documentTitle);
});

test("applies the shipped theme as custom properties", () => {
  const theme = JSON.parse(repoFile("data/theme.json"));
  const root = document.documentElement;

  assert.equal(root.style.getPropertyValue("--color-surface"), theme.palette[theme.roles.surface]);
  assert.equal(
    root.style.getPropertyValue("--color-startButton"),
    theme.palette[theme.roles.startButton],
  );
});

test("the button starts and then stops", () => {
  const button = document.getElementById("replaceButton");
  document.getElementById("replaceText").value = "BOO";

  button.click();
  assert.deepEqual(sentMessages.at(-1), {
    action: "startReplacing",
    text: "BOO",
    imageUrl: "",
  });
  assert.equal(button.textContent, strings.stopButton);
  assert.ok(button.classList.contains("stopButton"));

  button.click();
  assert.deepEqual(sentMessages.at(-1), { action: "stopReplacing" });
  assert.equal(button.textContent, strings.startButton);
  assert.ok(button.classList.contains("startButton"));
});
