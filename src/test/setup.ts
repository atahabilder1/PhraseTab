import '@testing-library/jest-dom/vitest';

// Node 25+ ships its own `localStorage` global, which is undefined unless Node
// is started with `--localstorage-file`, and it shadows jsdom's. Restore
// jsdom's storage so tests behave the same on every Node version.
const dom = (globalThis as { jsdom?: { window: Window } }).jsdom;
if (dom && typeof globalThis.localStorage === 'undefined') {
  for (const key of ['localStorage', 'sessionStorage'] as const) {
    Object.defineProperty(globalThis, key, {
      value: dom.window[key],
      configurable: true,
      writable: true,
    });
  }
}
