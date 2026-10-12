/**
 * Applying the theme preference to the document.
 *
 * `public/theme-init.js` does the first paint before React mounts; this module
 * keeps `data-theme` correct afterwards, including when the OS switches while
 * a tab is open.
 */

import { mirrorTheme } from '@/storage/storage';
import type { ThemePreference } from '@/storage/types';

const DARK_QUERY = '(prefers-color-scheme: dark)';

export function prefersDark(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia(DARK_QUERY).matches
    : false;
}

/** Turn a preference into the concrete theme to paint. */
export function resolveTheme(preference: ThemePreference): 'light' | 'dark' {
  if (preference === 'system') return prefersDark() ? 'dark' : 'light';
  return preference;
}

/**
 * Write the preference to the document and to the synchronous mirror the
 * pre-paint script reads on the next tab.
 */
export function applyTheme(preference: ThemePreference): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.dataset.theme = resolveTheme(preference);
  root.dataset.themePreference = preference;
  mirrorTheme(preference);
}

/**
 * Re-apply the theme when the OS preference changes. Only meaningful while the
 * user is on "system"; returns a no-op unsubscribe otherwise.
 */
export function watchSystemTheme(
  preference: ThemePreference,
  onChange: () => void,
): () => void {
  if (
    preference !== 'system' ||
    typeof window === 'undefined' ||
    typeof window.matchMedia !== 'function'
  ) {
    return () => {};
  }
  const query = window.matchMedia(DARK_QUERY);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}
