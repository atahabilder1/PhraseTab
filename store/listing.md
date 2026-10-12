# Chrome Web Store listing — PhraseTab 1.0.0

Copy each section into the matching field of the Chrome Web Store Developer
Dashboard.

## Package
Upload `release/phrasetab-1.0.0.zip` (build it with `npm run package`).

## Store listing tab

**Name** (from the manifest): PhraseTab

**Summary** (from the manifest, 132 characters max):
Learn a new English phrase with every new tab: idioms, phrasal verbs and expressions. Offline, private, no account.

**Category:** Education

**Language:** English

**Description:**

PhraseTab turns every new tab into a quick English lesson. Each time you open a
tab, you see a different English phrase, laid out like a dictionary entry:

• The phrase, its type (idiom, phrasal verb, expression or collocation) and level
• A clear, simple definition
• A natural example sentence
• Pronunciation at the click of a button
• Optional Bangla and Chinese (Simplified) translations

220 hand-written phrases, from everyday ones like "piece of cake" and "call off"
to professional ones like "bring someone up to speed" and "take it with a grain
of salt".

Learn at your own pace:
• Mark phrases as Learning to see them more often, or Known to see them rarely
• Save phrases to a personal list you can search later
• Choose Beginner, Intermediate and Advanced levels
• Prefer repetition? Set each phrase to stay for a few tabs before it changes
• Full keyboard shortcuts: N next, L learning, K known, S save, P pronounce
• Light and dark themes, in a clean black-and-white design

Private by design:
• No account, no ads, no analytics, no tracking
• Works completely offline. Nothing you do ever leaves your computer
• Uses one permission, storage, to remember your settings and progress on your device

**Screenshots** (1280×800): `store/images/screenshot-*-1280x800.png` — upload in numbered order.

**Store icon** (128×128): `store/images/store-icon-128x128.png`

**Small promo tile** (440×280): `store/images/small-promo-tile-440x280.png`

## Privacy practices tab

**Single purpose:**
PhraseTab replaces the Chrome New Tab page with a single English phrase (with
definition, example and optional translations) so the user learns a new phrase
each time they open a tab.

**Permission justification — `storage`:**
Used to save the user's settings (difficulty levels, translation languages,
theme, rotation preference) and learning progress (phrases marked Known,
Learning or Saved) locally on the user's device. Nothing is transmitted.

**Remote code:** No, I am not using remote code. All code is bundled in the
package.

**Data usage:** Check none of the data-collection boxes. PhraseTab does not
collect or transmit user data. Then tick all three certifications (no selling,
no unrelated use, no creditworthiness use).

**Privacy policy URL:**
https://github.com/atahabilder1/PhraseTab/blob/main/PRIVACY.md
(live once `PRIVACY.md` is pushed to the `main` branch)

## Distribution tab
- Visibility: Public (or Unlisted to test with a private link first)
- Regions: All regions
- Price: Free
