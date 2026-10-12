# PhraseTab — Product & Engineering Plan

## 1. Product Summary

**Name:** PhraseTab  
**Tagline:** Learn a new English phrase with every new tab.

> **Revision, 2026-10-12 (owner decision):** PhraseTab shows phrases only (no
> single words) and shows a new phrase on every new tab by default. The
> Words / Phrases / Mixed setting has been removed. Repeating each item before
> it rotates is still available as an opt-in setting. Where sections below
> say otherwise, this note takes precedence.

PhraseTab is a Chrome extension that replaces the browser's New Tab page with a lightweight English-learning card.

The product should teach both:
- single vocabulary words, and
- useful real-world English expressions.

Examples:
- pessimistic
- phenomenal
- reluctant
- inevitable
- double down
- benefit of the doubt
- take for granted
- figure out
- fair enough
- give someone a heads-up

The goal is not to behave like a full dictionary. The goal is to help users gradually learn useful English through frequent, very short exposures.

---

## 2. MVP Audience

Primary:
- English learners
- international students
- professionals improving everyday English
- users preparing for academic/professional communication

The interface should remain useful even for advanced learners.

---

## 3. MVP Content Types

Support these item types:

1. `word`
2. `phrasal_verb`
3. `idiom`
4. `expression`
5. `collocation`

~~The default content mode should be **Mixed**.~~ Superseded: phrases only,
and `word` has been removed as a kind (see the revision note at the top).

---

## 4. Difficulty System

For MVP, use PhraseTab's own simple levels rather than claiming official CEFR certification unless the dataset is appropriately licensed.

Levels:
- Beginner
- Intermediate
- Advanced

Internally these may later map to CEFR-style levels, but do not label them official A1–C2 unless the source/license permits it.

Suggested initial content target:

| Content | Target |
|---|---:|
| Single words | 2,500–3,000 |
| Phrasal verbs / idioms / expressions / collocations | 750–1,500 |
| Total eventual V1 library | ~3,250–4,500 |

For the first working prototype, use a manually reviewed seed dataset of about 50–100 items.

Do not block development waiting for thousands of entries.

---

## 5. Vocabulary Sources & Licensing

### Word selection
Potential foundation:
- New General Service List (NGSL) for high-value general English vocabulary.
- Later, consider appropriately licensed academic/spoken/business lists.

Before importing any third-party dataset:
- verify its current license,
- preserve required attribution,
- document source and license in `THIRD_PARTY_NOTICES.md`.

### Lexical relationships
WordNet may be useful for:
- synonyms,
- antonyms,
- part-of-speech relationships,
subject to its license and attribution requirements.

### Definitions and examples
Do **not** copy definitions/examples from proprietary dictionary sites such as Oxford, Cambridge, Merriam-Webster, etc. unless explicit licensing permits it.

For PhraseTab:
- create original simplified definitions, or use appropriately licensed source material;
- create original example sentences;
- manually review seed content for correctness and natural English.

### Translations
For MVP:
- store reviewed optional translations directly in the local dataset.
- Start with Bangla (`bn`) and Chinese Simplified (`zh-CN`).
- Architect the schema so more language packs can be added later.

Possible future languages:
- Spanish
- Arabic
- Hindi
- Turkish
- French
- German
- Japanese
- Korean

Translations should support understanding but the main learning card should remain English-first.

---

## 6. Vocabulary Data Model

Use a versioned local data format.

Example:

```ts
export type VocabularyKind =
  | "word"
  | "phrasal_verb"
  | "idiom"
  | "expression"
  | "collocation";

export type Difficulty = "beginner" | "intermediate" | "advanced";

export interface VocabularyItem {
  id: string;
  term: string;
  normalizedTerm: string;
  kind: VocabularyKind;
  partOfSpeech?: string;
  difficulty: Difficulty;

  definition: string;
  example: string;

  synonyms?: string[];
  antonyms?: string[];

  pronunciation?: {
    ipa?: string;
  };

  translations?: {
    bn?: string;
    "zh-CN"?: string;
  };

  tags?: string[];
  source?: string;
}
```

Example item:

```json
{
  "id": "phrase-benefit-of-the-doubt",
  "term": "benefit of the doubt",
  "normalizedTerm": "benefit of the doubt",
  "kind": "idiom",
  "difficulty": "intermediate",
  "definition": "To choose to believe someone when you are not completely sure what happened.",
  "example": "I'll give her the benefit of the doubt because she has always been reliable.",
  "translations": {
    "bn": "সন্দেহ থাকা সত্ত্বেও কাউকে বিশ্বাস করার সুযোগ দেওয়া",
    "zh-CN": "在有疑问时暂且相信某人"
  },
  "tags": ["conversation", "trust"]
}
```

Another example:

```json
{
  "id": "word-pessimistic",
  "term": "pessimistic",
  "normalizedTerm": "pessimistic",
  "kind": "word",
  "partOfSpeech": "adjective",
  "difficulty": "intermediate",
  "definition": "Expecting that something bad or unfavorable will happen.",
  "example": "She was pessimistic about her chances of winning.",
  "synonyms": ["negative", "doubtful"],
  "antonyms": ["optimistic"],
  "translations": {
    "bn": "হতাশাবাদী",
    "zh-CN": "悲观的"
  }
}
```

---

## 7. Core New Tab UI

The main screen should be visually calm and minimal.

Suggested hierarchy:

```text
PhraseTab                                  ⚙

                 PESSIMISTIC
                 adjective
              Intermediate

     Expecting that something bad or
     unfavorable will happen.

     "She was pessimistic about her
      chances of winning."

     Synonyms: negative, doubtful
     Antonym: optimistic

     বাংলা: হতাশাবাদী
     中文: 悲观的

         🔊 Listen

   [ Learning ] [ I know this ]
       [ ☆ Save ] [ Next → ]

          42 words learned
```

Do not overcrowd the screen.

---

## 8. User Actions

Each item should support:

### I know this
- mark as known
- increase learned count
- reduce future frequency

### Learning
- mark as learning
- increase future repetition

### Save
- bookmark/favorite item
- allow viewing saved items later

### Next
- immediately choose another appropriate item

### Listen
Use browser speech synthesis for MVP where available:
- no external audio API required initially
- pronounce the English term/phrase

Optional later:
- native recorded pronunciation/audio source
- accent choice

---

## 9. Repetition / Learning Logic

~~Do not select a fully random new item every time a tab opens.~~ Superseded:
a new (weighted) item is picked on every tab by default; the exposure-count
model below applies only when the user turns repetition on.

Problem:
A user may open dozens of tabs per day and cannot meaningfully learn dozens of new items.

MVP repetition strategy:

Each item has learning state:
- unseen
- learning
- known
- saved

Track:
- exposure count
- last shown time
- known/learning status

Simple initial algorithm:

1. Keep a `currentItemId`.
2. Show current item for a configurable number of natural exposures, e.g. 3.
3. After enough exposures, choose another item.
4. `Next` skips immediately.
5. `Learning` items get a higher probability of returning.
6. `Known` items get a much lower probability.
7. Avoid showing the immediately previous item.
8. Never enter an infinite loop if filters leave only one item.

Later replace with a true spaced repetition model if useful.

Potential future scheduling:
- 1 day
- 3 days
- 7 days
- 14 days
- 30 days

But MVP should remain simple and deterministic enough to test.

---

## 10. Settings

Create a Settings panel/page.

MVP settings:

### Content
- ~~Mixed / Words / Phrases~~ — removed; phrases only

### Difficulty
Checkboxes/toggles:
- Beginner
- Intermediate
- Advanced

Default:
- all enabled, or ask during onboarding

### Translations
- Off by default or choose during onboarding
- Bangla
- Chinese (Simplified)

Allow multiple translation languages simultaneously.

### Learning
- "Show a new phrase on every tab": default **on**
- Exposures before automatic next item (when the above is off): default 3

### Appearance
- System
- Light
- Dark

---

## 11. Onboarding

First-run onboarding should take only a few seconds.

Step 1:
"Welcome to PhraseTab"

Step 2:
"What would you like to learn?"
- Words
- Phrases
- Both

Step 3:
"Difficulty"
- Beginner
- Intermediate
- Advanced

Step 4:
"Need translation help?"
- None
- Bangla
- Chinese

Then:
"Start learning"

Do not require an account.

---

## 12. Saved / Learned Views

MVP or near-MVP:

### Saved
List saved vocabulary.

Allow:
- search
- unsave
- filter by type

### Learned
Optional simple history:
- Known items
- Learning items

Do not build a complex dashboard initially.

---

## 13. Architecture

Recommended:

- Chrome Extension Manifest V3
- TypeScript
- React
- Vite
- CSS Modules, plain CSS, or a minimal styling approach
- No backend
- No database server
- No authentication

Potential structure:

```text
wordtab/
├── CLAUDE.md
├── PLAN.md
├── README.md
├── THIRD_PARTY_NOTICES.md
├── package.json
├── tsconfig.json
├── vite.config.ts
├── public/
│   ├── manifest.json
│   └── icons/
├── src/
│   ├── newtab/
│   │   ├── NewTab.tsx
│   │   └── newtab.css
│   ├── settings/
│   │   └── Settings.tsx
│   ├── components/
│   │   ├── VocabularyCard.tsx
│   │   ├── TranslationBlock.tsx
│   │   └── ActionBar.tsx
│   ├── data/
│   │   ├── vocabulary.json
│   │   └── schema.ts
│   ├── learning/
│   │   ├── selector.ts
│   │   └── selector.test.ts
│   ├── storage/
│   │   ├── storage.ts
│   │   └── types.ts
│   ├── speech/
│   │   └── speech.ts
│   ├── types/
│   └── main.tsx
└── tests/
```

Adapt structure if the chosen Vite extension setup requires a cleaner layout.

---

## 14. Chrome Extension Requirements

Use Manifest V3.

Use a New Tab override through the extension manifest.

Conceptually:

```json
{
  "manifest_version": 3,
  "name": "PhraseTab",
  "version": "0.1.0",
  "description": "Learn a useful English word or phrase with every new tab.",
  "permissions": ["storage"],
  "chrome_url_overrides": {
    "newtab": "newtab.html"
  }
}
```

Exact generated paths must match the final Vite build.

Use Chrome's extension storage API for:
- settings
- progress
- current item
- saved items

Prefer:
- `chrome.storage.local` for learning/progress data
- `chrome.storage.sync` only for small preferences if beneficial and quota-safe

Avoid permissions not required by the MVP.

---

## 15. Performance

The New Tab page must feel instant.

Requirements:
- Avoid network requests during normal new-tab rendering.
- Load vocabulary locally.
- Avoid large frameworks/packages that do not provide real value.
- Avoid synchronous heavy processing.
- Cache/index data appropriately.
- Measure build size.
- Lazy-load secondary/settings views when practical.

Do not make opening a new tab depend on:
- API availability
- authentication
- cloud database
- translation API
- AI API

---

## 16. Privacy

V1 should be privacy-friendly.

Default policy:
- no tracking
- no browsing-history collection
- no reading page contents
- no user account
- no ads
- no telemetry unless explicitly introduced later with transparent consent

The New Tab extension should not request broad host permissions.

Document this clearly in README and eventual store listing.

---

## 17. Accessibility

Include:
- semantic HTML
- keyboard-operable controls
- visible focus states
- sufficient text contrast
- labels/tooltips for icon-only buttons
- `aria` attributes where appropriate
- reduced-motion respect
- text should remain usable at browser zoom levels

---

## 18. Design Direction

Desired feeling:
- calm
- modern
- academic but friendly
- minimal
- not childish
- not cluttered

Main focus must remain the vocabulary term.

Avoid:
- excessive gradients
- too many cards
- noisy dashboards
- gamification overload

Potential subtle features:
- current time
- small learning streak
- progress count

But these must not compete with vocabulary.

---

## 19. Theme

Support:
- System
- Light
- Dark

Use CSS variables for theme tokens.

Possible tokens:
- background
- foreground
- muted
- border
- accent
- success
- warning

Do not hard-code the entire UI around one theme.

---

## 20. Search / Translation Add-ons — Future

Future architecture should make it possible to add language packs without rewriting the app.

Possible package concept:

```text
core English dataset
        |
        ├── bn language pack
        ├── zh-CN language pack
        ├── es language pack
        └── ar language pack
```

Do not build a marketplace for V1.

---

## 21. Future Features — Not MVP

Do not implement unless requested:

- account/login
- cloud sync backend
- subscriptions/payments
- AI-generated definitions at runtime
- website text scanning
- content scripts on arbitrary websites
- contextual vocabulary extraction
- Chrome history access
- leaderboards
- social features
- notifications
- mobile app
- Firefox/Safari support
- full spaced-repetition engine
- remote dictionary APIs
- advertisements

Keep interfaces extensible enough that these can be added later.

---

## 22. Validation

Create a script/test that validates every vocabulary entry.

Validation rules:
- unique `id`
- non-empty `term`
- valid `kind`
- valid `difficulty`
- non-empty definition
- non-empty example
- no duplicate normalized terms unless deliberately representing different senses
- translations must be strings
- no malformed optional arrays

Consider using Zod or a lightweight custom validator.

---

## 23. Testing

Minimum automated tests:

### Vocabulary selector
- returns an eligible item
- respects content type filters
- respects difficulty filters
- avoids immediate repetition when alternatives exist
- handles only one eligible item
- learning items can be prioritized
- known items are deprioritized

### Storage
- defaults work when storage is empty
- settings migrate safely
- progress updates do not destroy other data

### Dataset
- all entries satisfy schema
- IDs unique

Manual extension tests:
- extension loads unpacked
- new tab override works
- settings persist after browser restart
- dark mode works
- Listen works where supported
- no console errors
- keyboard navigation works
- disabling one difficulty level works
- Bangla/Chinese toggle works

---

## 24. README Requirements

Claude should create/update `README.md` with:

1. PhraseTab description
2. screenshots placeholder
3. technology
4. prerequisites
5. install dependencies
6. development command
7. build command
8. exact instructions for loading unpacked extension:
   - open `chrome://extensions`
   - enable Developer mode
   - choose Load unpacked
   - choose the generated extension directory
9. project structure
10. data source/licensing notes
11. privacy statement
12. how to add a vocabulary item
13. how to add a translation language
14. testing commands

---

## 25. Milestones

Status as of the MVP build. Every box below is implemented and covered by
`npm run check` (lint + typecheck + tests + build + build verification) unless
the note says otherwise.

### Milestone 0 — Repository Setup
- [x] Scaffold TypeScript project — Vite 6 + React 18, strict TS
- [x] Add Manifest V3 — `public/manifest.json`, `storage` permission only
- [x] Add lint/typecheck/test tooling — ESLint 9, `tsc --noEmit`, Vitest
- [x] Verify extension loads in Chrome — see note below
- [x] Verify New Tab override — `chrome_url_overrides.newtab` → `newtab.html`

> **Note on the last two.** Google Chrome 137+ refuses `--load-extension` from
> the command line, so loading unpacked cannot be automated here.
> `npm run verify` checks the build statically instead: valid MV3, the New Tab
> override resolving to a file that exists, `storage` as the only permission, no
> host permissions or content scripts, no inline `<script>` (which the MV3 CSP
> would block), and no reference that would hit the network. The
> `chrome://extensions` → Load unpacked path in README.md remains a manual step.

### Milestone 1 — Static Vocabulary Card
- [x] Create polished New Tab layout
- [x] Load a seed vocabulary JSON — bundled, no fetch at runtime
- [x] Show term
- [x] Show type / part of speech
- [x] Show difficulty
- [x] Show simple definition
- [x] Show example sentence
- [x] Show synonyms/antonyms when present

### Milestone 2 — Learning State
- [x] Implement storage wrapper — `src/storage/storage.ts`
- [x] Current item persistence
- [x] Exposure count — per-rotation and lifetime
- [x] Learning
- [x] Known
- [x] Save
- [x] Next
- [x] learned count — hidden at zero rather than greeting a new user with "0 known"

### Milestone 3 — Selection Logic
- [x] content type filtering
- [x] difficulty filtering
- [x] repeated exposure logic
- [x] learning-item boost — weight 6 vs 3 unseen
- [x] known-item reduction — weight 0.25, never zero, so review stays possible
- [x] tests — 31 cases in `src/learning/selector.test.ts`

### Milestone 4 — Translation
- [x] Bangla toggle
- [x] Chinese toggle
- [x] display multiple selected translations
- [x] graceful fallback when translation unavailable — the row is omitted

### Milestone 5 — Pronunciation
- [x] Web Speech API / speech synthesis
- [x] accessible Listen button
- [x] failure-safe behavior — the button is not rendered where speech is
      unavailable, rather than sitting there doing nothing

### Milestone 6 — Settings
- [x] content mode
- [x] difficulties — the last enabled level cannot be turned off
- [x] translations
- [x] appearance
- [x] exposure count — plus "show a new item on every tab"
- [x] settings persistence — writes immediately; open tabs update live via
      `chrome.storage.onChanged`

### Milestone 7 — Onboarding
- [x] first-run detection — `settings.onboardingComplete`
- [x] short onboarding — four steps, everything pre-selected, skippable
- [x] save preferences
- [x] enter New Tab experience

### Milestone 8 — Saved Items
- [x] saved vocabulary view
- [x] search — matches terms and definitions
- [x] remove saved item
- [x] empty state — separate copy for "nothing saved" and "nothing matches"

### Milestone 9 — Polish
- [x] responsive layout
- [x] light/dark/system — CSS variable tokens, pre-paint script prevents a flash
- [x] keyboard accessibility — L / K / S / N / → / P, visible focus rings
- [x] reduced motion
- [x] error boundaries/fallbacks — crash screen with reload and reset actions
- [x] data validation — `src/data/schema.ts`, enforced by tests
- [x] README
- [x] third-party notices
- [x] Chrome Web Store preparation checklist — see §29

## 26. Seed Dataset

Create 50–100 original sample entries for development.

Ensure the seed includes a balanced mix such as:

### Words
- pessimistic
- optimistic
- phenomenal
- reluctant
- inevitable
- skeptical
- ambiguous
- compelling
- resilient
- concise
- spontaneous
- plausible
- meticulous
- substantial
- reluctant
- trivial
- coherent
- persistent
- feasible
- obsolete

### Phrasal verbs
- figure out
- carry on
- give up
- point out
- bring up
- come across
- rule out
- follow up
- back down
- work out
- turn down
- break down
- look into
- end up
- set up

### Idioms / expressions
- benefit of the doubt
- take for granted
- double down
- fair enough
- under the weather
- on the same page
- in the long run
- out of the blue
- a rule of thumb
- easier said than done
- give someone a heads-up
- get the hang of it
- go the extra mile
- miss the point
- make up your mind

Deduplicate terms before committing the dataset.

Do not assume the listed difficulty of a term without review.

---

## 27. Product Decisions for MVP

These decisions are intentionally fixed so development can proceed without unnecessary questions:

- Product name: PhraseTab
- Platform: Google Chrome first
- Extension type: New Tab replacement
- Manifest: V3
- Main language: English
- Translation add-ons initially: Bangla + Chinese Simplified
- Content: phrases only (revised 2026-10-12)
- New phrase on every tab by default (revised 2026-10-12)
- Difficulty labels: Beginner / Intermediate / Advanced
- Account required: No
- Backend: No
- Runtime AI API: No
- Local/offline content: Yes
- Progress persistence: Yes
- Pronunciation: browser speech synthesis
- Analytics: No
- Ads: No
- Payments: No

---

## 28. First Implementation Task for Claude

When starting from an empty repository:

1. Inspect `CLAUDE.md` and this file.
2. Scaffold the extension using TypeScript + React + Vite.
3. Configure Manifest V3 with a New Tab override.
4. Add `chrome.storage` permission only.
5. Create a small seed dataset (10–20 entries initially).
6. Implement the static New Tab vocabulary card.
7. Implement Next, Learning, Known, Save, and Listen.
8. Persist state with `chrome.storage.local`.
9. Add basic settings for:
   - Words / Phrases / Mixed
   - Beginner / Intermediate / Advanced
   - Bangla toggle
   - Chinese toggle
10. Add unit tests for selection logic.
11. Run build, typecheck, lint, and tests.
12. Fix any failures.
13. Update README with exact Chrome unpacked installation steps.
14. Report what is complete and which milestone should be implemented next.

Do not implement future features unless they are needed to create a clean extensible architecture.

---

## 29. Chrome Web Store Preparation Checklist

Status of what a listing needs. Unchecked items require a human decision, an
account, or artwork that cannot be generated from the code.

### Ready
- [x] Manifest V3 with a valid name, version and description (≤132 characters)
- [x] Icons at 16, 32, 48 and 128 px
- [x] Minimum permissions — `storage` only; no host permissions, no content
      scripts. `npm run verify` fails the build if this regresses.
- [x] New Tab override declared and resolving to a bundled file
- [x] Works fully offline; no remote code, which Web Store policy prohibits
- [x] No analytics, ads, payments, accounts or telemetry
- [x] Third-party notices for the bundled OFL fonts
- [x] Original vocabulary content — no dictionary text to license or clear

### Outstanding
- [ ] Developer account and the one-time registration fee
- [x] Privacy policy at a public URL — `PRIVACY.md` on GitHub
- [x] Store listing copy: short description, full description, category (`store/listing.md`)
- [x] Screenshots at 1280×800 or 640×400 — four in `store/images/`
- [ ] Optional promotional tile artwork
- [x] Single purpose statement — "replace the New Tab page with an English
      phrase to learn" — plus the justification for the `storage` permission
      (both in `store/listing.md`)
- [ ] Data-use disclosures in the Developer Dashboard: declare that no user data
      is collected or transmitted
- [x] Decide a public version number (1.0.0)
- [x] Zip `dist/` (not the repository root) for upload — `npm run package`

### Notes
- Chrome shows users a "an extension changed your New Tab page" prompt on
  install. That is expected for this extension type and cannot be suppressed.
- Web Store review scrutinises New Tab overrides more closely than most
  extension types. The single-purpose statement and the empty permission list
  are the strongest things PhraseTab has going for it here.

---

## 30. Deferred Past MVP

Deliberately not built, per §21. Recorded here so nothing looks accidentally
missing:

- Full spaced-repetition scheduling (1/3/7/14/30 day intervals). The MVP model
  is exposure-count rotation with status weighting, which is simple enough to
  test deterministically. `ItemProgress.lastShownAt` is already stored, so a
  real scheduler can be added without a data migration.
- Dataset growth to the §4 target of ~3,250–4,500 entries. The seed is 100
  reviewed items; the schema, validator and selector are all size-independent.
- A "Learned" history view. The Saved page covers the bookmark case, and
  Settings shows known/learning counts. A browsable history was listed as
  "optional simple history" in §12.
- Accent choice and recorded audio for pronunciation.
- Language packs beyond Bangla and Chinese, and the packaging concept in §20.
  Adding a language is currently a four-step edit documented in README.
- Everything in §21: accounts, cloud sync, payments, runtime AI, content
  scripts, history access, notifications, other browsers.
