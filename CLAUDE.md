# PhraseTab — Claude Code Project Instructions

## Project
PhraseTab is a Chrome browser extension that replaces the New Tab page with a small English-learning experience.

Read and follow `PLAN.md` before making architectural or product decisions.

## Primary Goal
Build a polished, fast, privacy-friendly MVP of PhraseTab that teaches useful English vocabulary and common expressions whenever the user opens a new tab.

## Working Rules
- Use Chrome Extension Manifest V3.
- Build the simplest maintainable implementation first.
- Prefer TypeScript.
- Prefer React + Vite if it does not add unnecessary complexity.
- The New Tab page must load very quickly.
- Do not require a backend for the MVP.
- Do not require an AI API for the MVP.
- Keep the initial vocabulary dataset bundled locally with the extension.
- Use `chrome.storage` for settings and progress.
- Request the minimum Chrome permissions necessary.
- Do not add analytics, tracking, authentication, payments, or cloud sync in V1 unless explicitly requested.
- Do not copy proprietary dictionary definitions or example sentences.
- Keep vocabulary data and UI code cleanly separated.
- Make accessibility and keyboard navigation first-class considerations.
- Keep components small and reusable.
- Add tests for selection/repetition logic and data validation.

## Development Workflow
1. Read `PLAN.md`.
2. Inspect the repository before changing anything.
3. If starting from an empty repository, scaffold the project.
4. Implement one milestone at a time.
5. Run lint/typecheck/tests after meaningful changes.
6. Keep `README.md` updated with setup, development, testing, and Chrome installation instructions.
7. Keep `PLAN.md` checkboxes/status updated as work progresses.
8. Do not silently remove requested features; if something is deferred, document it.

## MVP Definition of Done
The extension is ready for MVP when:
- It installs as an unpacked Chrome extension.
- Opening a new tab shows a vocabulary word or phrase.
- The card shows type, simple definition, example, and difficulty.
- The user can hear pronunciation when browser speech synthesis is available.
- The user can mark an item as Known, Learning, Save, or Next.
- The extension remembers progress and preferences.
- The user can select Words / Phrases / Mixed.
- Optional Bangla and Chinese translations can be turned on/off.
- The app works offline after installation.
- The interface is responsive, clean, and fast.
- There are no unnecessary permissions.
- README contains exact build and install instructions.

## Product Principle
PhraseTab should not bombard users with a new random item on every tab. Repetition is part of learning. Prefer a simple spaced/repeated exposure model that shows the current item multiple times before rotating, while still allowing the user to press Next.
