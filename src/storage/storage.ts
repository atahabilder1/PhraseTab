/**
 * A thin wrapper over `chrome.storage.local`.
 *
 * Two goals:
 *  1. Never let a storage problem break the New Tab page — every read falls
 *     back to defaults and every write swallows quota/context errors.
 *  2. Stay usable outside the extension (tests, `npm run dev` in a plain tab)
 *     by falling back to a localStorage-backed area when `chrome.storage` is
 *     absent.
 */

import {
  DEFAULT_PROGRESS,
  DEFAULT_SETTINGS,
  STORAGE_KEYS,
  THEME_MIRROR_KEY,
  normalizeProgress,
  normalizeSettings,
  type Progress,
  type Settings,
} from './types';

type StorageArea = {
  get(keys: string[]): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
};

type ChangeListener = (changes: { settings?: Settings; progress?: Progress }) => void;

/**
 * Stand-in used when `chrome.storage` is absent — in tests, and when the pages
 * are served by `npm run dev` outside the extension.
 *
 * It writes through to `localStorage` where that works, so a dev session keeps
 * its settings and progress across reloads instead of restarting onboarding on
 * every save. Under jsdom and in blocked-storage contexts it degrades to a
 * plain in-memory Map.
 */
function createFallbackArea(): StorageArea {
  const store = new Map<string, unknown>();

  const persistent = (() => {
    try {
      const probe = '__wordtab_probe__';
      localStorage.setItem(probe, '1');
      localStorage.removeItem(probe);
      return true;
    } catch {
      return false;
    }
  })();

  return {
    async get(keys) {
      const result: Record<string, unknown> = {};
      for (const key of keys) {
        if (store.has(key)) {
          result[key] = store.get(key);
          continue;
        }
        if (!persistent) continue;
        const raw = localStorage.getItem(key);
        if (raw === null) continue;
        try {
          result[key] = JSON.parse(raw);
        } catch {
          // A corrupt entry is indistinguishable from an absent one here; the
          // normalizers upstream will hand back defaults either way.
        }
      }
      return result;
    },
    async set(items) {
      for (const [key, value] of Object.entries(items)) {
        store.set(key, value);
        if (!persistent) continue;
        try {
          localStorage.setItem(key, JSON.stringify(value));
        } catch {
          // Quota or private mode: the in-memory copy still serves this session.
        }
      }
    },
  };
}

let fallbackArea: StorageArea | null = null;

function chromeLocal(): chrome.storage.LocalStorageArea | undefined {
  // `chrome` exists but `chrome.storage` does not on regular web pages, and
  // the whole namespace is missing under jsdom.
  return typeof chrome !== 'undefined' ? chrome.storage?.local : undefined;
}

function area(): StorageArea {
  const local = chromeLocal();
  if (local) {
    return {
      get: (keys) => local.get(keys) as Promise<Record<string, unknown>>,
      set: (items) => local.set(items),
    };
  }
  fallbackArea ??= createFallbackArea();
  return fallbackArea;
}

/** Test seam: drop the fallback area so each test starts from empty storage. */
export function resetMemoryStorage(): void {
  fallbackArea = null;
}

async function readKey(key: string): Promise<unknown> {
  try {
    const result = await area().get([key]);
    return result[key];
  } catch (error) {
    console.warn(`[WordTab] Could not read "${key}" from storage.`, error);
    return undefined;
  }
}

async function writeKey(key: string, value: unknown): Promise<boolean> {
  try {
    await area().set({ [key]: value });
    return true;
  } catch (error) {
    // Most likely a quota error or an invalidated extension context after a
    // reload. Neither should take the page down.
    console.warn(`[WordTab] Could not write "${key}" to storage.`, error);
    return false;
  }
}

export async function loadSettings(): Promise<Settings> {
  return normalizeSettings(await readKey(STORAGE_KEYS.settings));
}

export async function saveSettings(settings: Settings): Promise<Settings> {
  const normalized = normalizeSettings(settings);
  await writeKey(STORAGE_KEYS.settings, normalized);
  mirrorTheme(normalized.theme);
  return normalized;
}

/**
 * Apply a partial update on top of whatever is currently stored.
 *
 * Reading first means a settings write never resurrects a stale copy of fields
 * another page changed in the meantime.
 */
export async function updateSettings(patch: Partial<Settings>): Promise<Settings> {
  const current = await loadSettings();
  return saveSettings({ ...current, ...patch });
}

export async function loadProgress(): Promise<Progress> {
  return normalizeProgress(await readKey(STORAGE_KEYS.progress));
}

export async function saveProgress(progress: Progress): Promise<Progress> {
  const normalized = normalizeProgress(progress);
  await writeKey(STORAGE_KEYS.progress, normalized);
  return normalized;
}

/**
 * Read-modify-write progress atomically enough for our purposes.
 *
 * Multiple new tabs can open at once, so the updater always runs against a
 * fresh read rather than a value captured in a React render.
 */
export async function updateProgress(
  updater: (current: Progress) => Progress,
): Promise<Progress> {
  const current = await loadProgress();
  return saveProgress(updater(current));
}

export async function resetProgress(): Promise<Progress> {
  return saveProgress({ ...DEFAULT_PROGRESS, items: {} });
}

export async function resetSettings(): Promise<Settings> {
  return saveSettings({ ...DEFAULT_SETTINGS });
}

/**
 * Keep the synchronous theme mirror in `localStorage` up to date so
 * `public/theme-init.js` can paint the right background before React mounts.
 */
export function mirrorTheme(theme: Settings['theme']): void {
  try {
    localStorage.setItem(THEME_MIRROR_KEY, theme);
  } catch {
    // Private mode or blocked storage: the page still renders, it may just
    // flash the wrong theme for a frame.
  }
}

/**
 * Subscribe to changes made by *other* extension pages (e.g. Settings updating
 * while a New Tab is open). Returns an unsubscribe function.
 */
export function onStorageChanged(listener: ChangeListener): () => void {
  const storage = typeof chrome !== 'undefined' ? chrome.storage : undefined;
  if (!storage?.onChanged) return () => {};

  const handler = (
    changes: Record<string, chrome.storage.StorageChange>,
    areaName: string,
  ): void => {
    if (areaName !== 'local') return;
    const payload: { settings?: Settings; progress?: Progress } = {};
    const settingsChange = changes[STORAGE_KEYS.settings];
    const progressChange = changes[STORAGE_KEYS.progress];
    if (settingsChange) payload.settings = normalizeSettings(settingsChange.newValue);
    if (progressChange) payload.progress = normalizeProgress(progressChange.newValue);
    if (payload.settings || payload.progress) listener(payload);
  };

  storage.onChanged.addListener(handler);
  return () => storage.onChanged.removeListener(handler);
}
