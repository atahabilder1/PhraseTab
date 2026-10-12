/*
 * Paints the correct theme before the page renders.
 *
 * This must be a separate file loaded synchronously in <head>: Manifest V3's
 * default extension_pages CSP is `script-src 'self'`, which blocks inline
 * scripts outright.
 *
 * Settings live in chrome.storage, which is async and therefore useless before
 * first paint, so storage.ts keeps a synchronous copy of just the theme in
 * localStorage. Reading it here is what stops a new tab flashing white in dark
 * mode. Keep the key in sync with THEME_MIRROR_KEY in src/storage/types.ts.
 */
(function () {
  var theme = 'system';
  try {
    var stored = localStorage.getItem('wordtab.theme');
    if (stored === 'light' || stored === 'dark' || stored === 'system') theme = stored;
  } catch (error) {
    /* Storage blocked; fall back to following the OS. */
  }

  var dark =
    theme === 'dark' ||
    (theme === 'system' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);

  var root = document.documentElement;
  root.dataset.theme = dark ? 'dark' : 'light';
  // Remembered separately so the React app knows whether "system" is in play
  // without re-reading storage.
  root.dataset.themePreference = theme;
})();
