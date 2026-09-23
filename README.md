# Text and Image Replacer Extension

A Chrome extension that replaces the text and images on a webpage with your own.
Type what you want everything to say, upload the picture you want everywhere,
and press Start. Personalize a page, swap out content for a laugh, or mock up
how your own words look on a live site.

## Features

**Replace text.** Every heading, paragraph, list item and table cell on the page
becomes the text you typed.

**Replace images.** Upload one image and it takes the place of every picture on
the page.

**Customizable.** You choose the text and you choose the image, so you decide
exactly what the page turns into.

**User friendly.** One small panel with a text box, an upload button and a
start button. There is nothing to learn.

**Fun and practical.** Good for creative projects, and good for replacing
distracting content with something you would rather look at.

**Lightweight and fast.** No dependencies, no build step, no tracking.

## How to Use

1. Install the extension from the Chrome Web Store.
2. Click the extension icon in your toolbar to open the panel.
3. Type the text you want to use for replacing existing text.
4. Upload an image if you want to replace pictures too. This is optional.
5. Click "Start Replacing Text + Images".
6. Click "Stop Replacing Text + Images" to put the real page back.

Stopping reloads the tab you are looking at. Other tabs go back to normal when
you reload them.

## Ideal For

**Designers and developers.** See how different text and images sit in a real
layout without changing anything permanently.

**Educators and students.** Build customized examples for a lesson.

**Content creators.** Mock up how your content will appear on a live site.

**Entertainment.** Turn a page into something ridiculous.

## Reviews

⭐️⭐️⭐️⭐️⭐️ - 5.0 Rating from 8+ users

Join our community of satisfied users who have found innovative and entertaining
ways to use the Text and Image Replacer Extension. Download now and transform
your web browsing experience today!

## Chrome Web Store Link

https://chromewebstore.google.com/detail/text-and-image-replacer-e/glamceigjodgbnfondkfloeoiikmlfno?authuser=2

## Images

<img width="1280" height="800" alt="5" src="https://github.com/user-attachments/assets/46b3fd26-0dea-41d3-b0dc-8132be9b0e4e" />
<img width="1280" height="800" alt="6" src="https://github.com/user-attachments/assets/ce4123cc-9099-451a-a45a-db5bc8431c84" />

## How It Works

Three pieces, talking over the extension message bus.

The **popup** is the panel you see. It saves what you typed and the image you
uploaded to `chrome.storage.local`, so it looks the same the next time you open
it, and it tells the background worker to start or stop.

The **background service worker** owns a timer. While replacing is on, it wakes
up once a second, asks Chrome for every open tab, and injects the rewrite into
each one. Re-asking every second is why a tab you open after pressing Start also
gets replaced. Tabs that refuse injection, like `chrome://` pages and the Web
Store, are skipped and tried again next second.

The **content function** is the only code that touches a page. It is injected as
a function with its arguments, never as a string of source, so your replacement
text can contain quotes, backslashes and angle brackets and it stays text.

```
manifest.json           Manifest V3
src/
  background/           the timer, and what to do with a popup message
  content/              the page rewrite
  popup/                markup, styles, and the panel's behaviour
  shared/               data loading, selector building, message names
data/                   everything the code used to hard-code
assets/                 icons
tools/                  data validation, and the one-off extractors
test/                   the test suite
```

## Data Files

No lists, captions, colours or timings are written into the source. They live in
`data/` and are read at runtime.

| File | What it holds |
| --- | --- |
| `data/selectors.json` | Which elements get replaced |
| `data/config.json` | How often the page is rewritten |
| `data/strings.json` | Every word in the popup |
| `data/theme.json` | Every colour in the popup |

`data/README.md` describes each file in full.

### Changing It Without Writing Code

**Replace a new kind of element.** Add the tag to the `text` array in
`data/selectors.json`. Adding `"caption"` makes it replace figure captions too.

**Reword the popup.** Edit the value in `data/strings.json`. The markup holds no
words of its own, so this is the only place to change one.

**Recolour the popup.** `data/theme.json` has two parts. `palette` defines each
colour once, and `roles` says which part of the UI uses which colour. Change a
palette value to recolour everything that uses it, or point a role at a
different palette entry to change one thing.

**Change how often it rewrites.** Edit `replacementIntervalMs` in
`data/config.json`.

After any of these, run `npm run validate`. It checks the files against each
other and against the markup and stylesheet that read them, so a typo in a key
name fails there rather than showing up as a blank button later.

`tools/extract-theme.mjs` and `tools/extract-strings.mjs` are the one-off
migration scripts that pulled these values out of the original source. They are
kept for provenance. You do not need to run them to change anything.

## Running From Source

Load it unpacked:

1. Open `chrome://extensions`.
2. Turn on Developer mode.
3. Click "Load unpacked" and choose this folder.

Work on it:

```sh
npm install         # dev tools only. The extension itself has no dependencies.
npm test            # the test suite
npm run lint        # ESLint
npm run typecheck   # tsc in checkJs mode, using chrome's own API types
npm run validate    # check the data files against the code that reads them
npm run package     # build the store zip into dist/
```

CI runs all of it on every push and pull request.

Nothing is compiled. The extension ships the source in this repo exactly as
written, and `npm run package` just zips it. The type checking is checking
only: the JSDoc comments are the types, there is no TypeScript to build.
