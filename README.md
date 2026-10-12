# PhraseTab

**Learn a new English phrase with every new tab.**

PhraseTab is a Chrome extension that replaces the New Tab page with a single
English phrase — a phrasal verb, an idiom, an expression or a collocation —
set as a dictionary entry rather than a dashboard widget. It shows phrases only,
never single words.

Every new tab shows a different phrase. Phrases you mark as Learning come back
more often, and phrases you mark as Known rarely come back. If you would rather
see each phrase a few times before it changes, turn off **Show a new phrase on
every tab** in Settings.

Everything runs locally. No account, no backend, no analytics, no network
requests — the extension asks for exactly one Chrome permission, `storage`, and
works fully offline the moment it is installed.

---

## Screenshots

| New Tab — light | New Tab — dark |
|---|---|
| ![The PhraseTab New Tab page in light theme](docs/screenshot-newtab-light.png) | ![The PhraseTab New Tab page in dark theme](docs/screenshot-newtab-dark.png) |

| Settings | Saved |
|---|---|
| ![The PhraseTab settings page](docs/screenshot-settings.png) | ![The PhraseTab saved items page](docs/screenshot-saved.png) |

---

## Technology

- **Chrome Extension Manifest V3**, New Tab override
- **TypeScript** (strict, with `noUncheckedIndexedAccess` and
  `exactOptionalPropertyTypes`)
- **React 18** + **Vite 6** — three static HTML entry points, no router
- **Plain CSS** with custom-property theme tokens; no CSS framework
- **Vitest** for unit tests
- **No backend, no database, no runtime AI, no third-party requests**

The New Tab entry chunk is ~12 KB and the whole packaged extension is ~500 KB,
most of which is the bundled typefaces.

---

## Prerequisites

- **Node.js 20.19+** (or 22.12+) and npm 10+
- **Google Chrome 108+**

---

## Getting started

```bash
npm install
npm run build
```

`dist/` is now a complete unpacked extension.

### Install it in Chrome

1. Open `chrome://extensions` in Chrome.
2. Turn on **Developer mode** (toggle, top right).
3. Click **Load unpacked**.
4. Select the **`dist`** folder inside this repository — not the repository
   root, and not `public/`.
5. Open a new tab. PhraseTab takes over the New Tab page and runs onboarding once.

Chrome may show a "An extension has changed your New Tab page" prompt the first
time. Choose **Keep it** to let PhraseTab through.

After changing code, run `npm run build` again and press the **reload** icon on
the PhraseTab card in `chrome://extensions`.

> Loading an unpacked extension from the command line (`--load-extension`) is
> blocked in Google Chrome 137 and later. Use the `chrome://extensions` flow
> above, or a Chromium build, for automation.

---

## Development

```bash
npm run dev        # Vite dev server — open the printed URL + /newtab.html
npm run build      # typecheck, then build dist/
npm run build:debug# same, with sourcemaps (roughly doubles the bundle)
npm run preview    # serve the production build
```

In `npm run dev` the pages run outside the extension, so `chrome.storage` does
not exist. The storage layer falls back to `localStorage`, which means settings
and progress still persist across reloads — clear your site data (or run
`localStorage.clear()`) to replay onboarding.

Useful dev URLs: `/newtab.html`, `/settings.html`, `/saved.html`.

---

## Testing

```bash
npm test           # unit tests (Vitest)
npm run test:watch # watch mode
npm run typecheck  # tsc --noEmit
npm run lint       # ESLint
npm run verify     # check dist/ is a valid, offline, minimal-permission MV3 build
npm run check      # lint + typecheck + test + build + verify
```

`npm run verify` is the one worth knowing about. It reads `dist/` and fails the
build if PhraseTab's core promises are broken: an extra Chrome permission, a
`host_permissions` entry, an inline `<script>` that Manifest V3's CSP would
block, or any reference that would hit the network. Those are all easy to
introduce by accident and invisible in a screenshot.

### What the tests cover

**Selector and rotation logic** (`src/learning/selector.test.ts`) — a new item
on every tab by default, skipping recently shown items, difficulty filters,
holding an item for its exposure budget when repetition is turned on, `Next`
forcing rotation, learning items being favoured, known items being
deprioritised without being excluded, and the single-eligible-item case
terminating instead of looping.

**Storage** (`src/storage/storage.test.ts`) — defaults on empty storage,
round-tripping, settings surviving a progress write and vice versa, and
migration: version 1 settings move to a new phrase on every tab, and any
corrupt or unknown field is repaired to a default rather than throwing, so a
bad write can never brick the New Tab page.

**Dataset** (`src/data/dataset.test.ts`) — every entry satisfies the schema, IDs
and normalised terms are unique, every item carries both translations, every
entry is a multi-word phrase (no single words), every phrase kind is present,
and each difficulty level has at least one phrase, so no combination of filters
can empty the library.

**Validator** (`src/data/schema.test.ts`) — the validator itself, against
deliberately malformed input.

**New Tab, end to end** (`src/newtab/NewTab.test.tsx`) — onboarding gating the
card and recording no exposure while it is up, each action reaching the selector
and persisting, `Save` *not* rotating the card away, the keyboard shortcuts, and
modifier combinations like Ctrl+N being left alone for the browser.

**Saved page** (`src/saved/Saved.test.tsx`) — ordering, search over terms and
definitions, the phrase-kind filter, both empty states, and unsaving an item without
erasing what was learned about it.

109 tests across 6 files.

### Manual checks before release

- [ ] Loads unpacked with no errors on the `chrome://extensions` card
- [ ] New Tab override works; opening a tab shows an entry
- [ ] Each new tab shows a different phrase, with no quick repeats
- [ ] With "Show a new phrase on every tab" off, a phrase repeats for the set number of views
- [ ] `Next` rotates immediately
- [ ] Learning / I know this / Save persist after a browser restart
- [ ] Keyboard: `L`, `K`, `S`, `N` / `→`, `P` all work
- [ ] Light, dark and system themes; no flash of the wrong theme on a new tab
- [ ] `Listen` speaks the term (and the button is absent where speech is not available)
- [ ] Bangla and Chinese toggles show and hide translations
- [ ] Turning off two difficulty levels still shows entries from the third
- [ ] Saved page: search, type filter, remove, and the empty state
- [ ] No console errors on any of the three pages
- [ ] Works with the network disconnected

---

## Project structure

```text
PhraseTab/
├── CLAUDE.md                  Project instructions
├── PLAN.md                    Product and engineering plan, milestone status
├── README.md
├── PRIVACY.md                 Privacy policy (linked from the Web Store listing)
├── THIRD_PARTY_NOTICES.md     Font licences; dataset provenance
├── newtab.html                Entry points. Vite builds these into dist/
├── settings.html
├── saved.html
├── public/                    Copied verbatim into dist/
│   ├── manifest.json          Manifest V3
│   ├── theme-init.js          Pre-paint theme script (external: MV3 CSP blocks inline)
│   ├── fonts.css              Generated @font-face rules
│   ├── fonts/                 Bundled woff2 (latin subset)
│   └── icons/                 Generated PNG icons
├── docs/                      README screenshots
├── store/
│   ├── listing.md             Chrome Web Store listing copy, ready to paste
│   ├── description.txt        Store description, plain text
│   └── images/                Store icon, screenshots, promo tile (size in name)
├── scripts/
│   ├── fetch-fonts.mjs        Downloads and self-hosts the typefaces
│   ├── generate-icons.py      Renders the extension icons
│   ├── verify-build.mjs       Asserts dist/ stays offline and minimal
│   └── package.mjs            Zips dist/ into release/ for the Web Store
└── src/
    ├── newtab/                New Tab page, state hook, its stylesheet
    ├── settings/              Settings page
    ├── saved/                 Saved items page
    ├── onboarding/            First-run flow
    ├── components/            VocabularyCard, ActionBar, TranslationBlock, …
    ├── data/                  vocabulary.json, validator, dataset tests
    ├── learning/              Selection and rotation engine
    ├── storage/               chrome.storage wrapper, persisted shapes
    ├── speech/                Speech synthesis
    ├── theme/                 Theme resolution
    ├── styles/                Design tokens and shared primitives
    └── types/                 Vocabulary types
```

---

## Data, sources and licensing

The bundled dataset is **220 phrases** (62 phrasal verbs, 118 idioms,
26 expressions, 14 collocations) spread across Beginner, Intermediate and
Advanced. Single words are not allowed: `word` is not a valid kind, and a
dataset test rejects any term without a space.

Every definition, example sentence and translation is original work written for
PhraseTab. Nothing is copied from any dictionary, and no third-party lexical
dataset is bundled. See `THIRD_PARTY_NOTICES.md`.

Difficulty uses PhraseTab's own three levels rather than claiming CEFR alignment,
since no appropriately licensed CEFR mapping is bundled.

### How to add a vocabulary item

Add an object to `items` in `src/data/vocabulary.json`:

```json
{
  "id": "expression-keep-me-posted",
  "term": "keep me posted",
  "normalizedTerm": "keep me posted",
  "kind": "expression",
  "difficulty": "beginner",
  "definition": "Please tell me about any news or changes as they happen.",
  "example": "I'm not sure the flight is on time, so keep me posted.",
  "synonyms": ["keep me updated"],
  "translations": { "bn": "আমাকে খবর জানাতে থেকো", "zh-CN": "随时告诉我最新情况" },
  "tags": ["work"],
  "source": "wordtab-original"
}
```

Rules the validator enforces (`npm test` will tell you if you break one):

- `id` is unique and kebab-case; by convention it is prefixed by kind
  (`phrasal_verb-`, `idiom-`, `expression-`, `collocation-`)
- `normalizedTerm` equals the term lowercased with whitespace collapsed
- `kind` is one of `phrasal_verb`, `idiom`, `expression`, `collocation`
  (single words are not allowed, and the term must contain a space)
- `difficulty` is `beginner`, `intermediate` or `advanced`
- `definition` and `example` are non-empty, original, and the example actually
  uses the term
- optional arrays contain only non-empty strings
- translations are non-empty strings under a known language code

To record a second sense of an existing term, add `"duplicate-sense"` to its
`tags`; the uniqueness check will let it through.

Write definitions in plain English a learner can read without a second lookup,
and make the example a sentence someone would really say.

### How to add a translation language

The schema is built for this — four small edits, no code restructuring:

1. **`src/types/vocabulary.ts`** — add the code to
   `TRANSLATION_LANGUAGE_CODES`, and an entry to `TRANSLATION_LANGUAGES` with
   its native label, English label and BCP-47 tag:

   ```ts
   export const TRANSLATION_LANGUAGE_CODES = ['bn', 'zh-CN', 'es'] as const;

   { code: 'es', nativeLabel: 'Español', englishLabel: 'Spanish', bcp47: 'es' },
   ```

2. **`src/data/vocabulary.json`** — add the translation to each item's
   `translations` object.

3. **Run `npm test`.** The dataset test requires every supported language on
   every item, so it will list exactly what is missing.

4. Nothing else. Settings, onboarding, the card and the Saved page all render
   from `TRANSLATION_LANGUAGES`, and existing users' settings migrate safely
   because unknown codes are dropped on read.

Consider whether the script needs a bundled font. Latin-script languages use the
fonts already shipped; other scripts fall back to the system, which is the
current behaviour for Bangla and Chinese.

---

## Privacy

PhraseTab collects nothing.

- **One permission:** `storage`. Nothing else.
- **No host permissions and no content scripts.** PhraseTab cannot read any page
  you visit, and never runs outside its own tabs.
- **No network requests.** Vocabulary, fonts and icons are all bundled. The
  extension works with the network disconnected, and nothing is sent anywhere.
- **No account, no telemetry, no analytics, no ads, no cloud sync.**
- **No browsing history access.**

Your settings and learning progress live in `chrome.storage.local` on your own
machine. Removing the extension removes them.

`npm run verify` enforces the permission and no-network claims mechanically, so
they cannot regress unnoticed.

---

## Accessibility

- Semantic HTML with real `<fieldset>`/`<legend>`, `<dl>`, `<blockquote>`
- Every control is keyboard-operable, with visible `:focus-visible` outlines
- Keyboard shortcuts on the New Tab page: `L` learning, `K` known, `S` save,
  `N` or `→` next, `P` pronounce
- Icon-only buttons carry `aria-label`; toggles carry `aria-pressed`
- `prefers-reduced-motion` disables the entrance animation
- Translations are marked with `lang` so screen readers switch voice correctly
- Layout uses relative units and reflows down to narrow widths and high zoom

---

## Design

The New Tab page is a dictionary entry set at poster scale. There is no card —
no box, shadow or border around the word — because a card reads as a dashboard
widget, and this should read as a page you happened to open. The column is
centred but the type inside is left-aligned, so a one-word headword and a
five-word phrase never shunt the layout sideways.

One structural device carries the page: a hairline under the headword. When
repetition is turned on in Settings, a tally at the end of that line shows how
many more times the current phrase will appear.

Three typefaces, each with one job: **Newsreader** for the headword and example,
**IBM Plex Sans** for prose and controls, **IBM Plex Mono** for metadata.

---

## Publishing to the Chrome Web Store

```bash
npm run package    # lint, typecheck, test, build, verify, then zip
```

This writes `release/phrasetab-<version>.zip` with `manifest.json` at its root,
which is the file to upload. The version comes from `public/manifest.json` and
must match `package.json`; bump both for every update.

Everything else the listing needs is in `store/`:

- `store/listing.md` — summary, description, category, single-purpose
  statement, `storage` permission justification, data-use answers and the
  privacy policy URL, ready to paste into the Developer Dashboard
- `store/images/` — every image the listing asks for, with its size in the
  file name: the 128×128 store icon, four 1280×800 screenshots and the
  440×280 small promo tile

The privacy policy is `PRIVACY.md`; its public URL is
<https://github.com/atahabilder1/PhraseTab/blob/main/PRIVACY.md>.

Steps in the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole):
register as a developer (one-time fee), choose **New item**, upload the zip,
fill in the **Store listing**, **Privacy** and **Distribution** tabs from
`store/listing.md`, then **Submit for review**. To ship an update, bump the
version, run `npm run package` again, and upload the new zip on the item's
**Package** tab.

---

## Status

Version 1.0.0. MVP milestones 0–9 are implemented. See `PLAN.md` for the
milestone checklist and for the features deliberately deferred past V1.

---

## Author

**Anik Tahabilder**
PhD student, Computer Science, Wayne State University

Issues and suggestions: <https://github.com/atahabilder1/PhraseTab/issues>
