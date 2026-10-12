/**
 * Persisted state shapes and their defaults.
 *
 * Everything here lives in `chrome.storage.local`. Two top-level keys are used
 * so a settings write can never clobber learning progress and vice versa.
 */

import {
  DIFFICULTIES,
  TRANSLATION_LANGUAGE_CODES,
  type Difficulty,
  type TranslationLanguage,
} from '@/types/vocabulary';

export const STORAGE_KEYS = {
  settings: 'wordtab.settings',
  progress: 'wordtab.progress',
} as const;

/**
 * Synchronous mirror of the theme preference. `chrome.storage` is async, so the
 * New Tab page cannot read it before first paint; `public/theme-init.js` reads
 * this key instead to avoid a flash of the wrong theme. Keep the two in sync.
 */
export const THEME_MIRROR_KEY = 'wordtab.theme';

export type ThemePreference = 'system' | 'light' | 'dark';

export const THEME_PREFERENCES: readonly ThemePreference[] = ['system', 'light', 'dark'];

export const MIN_EXPOSURES = 1;
export const MAX_EXPOSURES = 10;

export interface Settings {
  /** Schema version, so future shape changes can migrate rather than reset. */
  version: number;
  difficulties: Difficulty[];
  /** Translation languages to display under the card. Empty means none. */
  translations: TranslationLanguage[];
  /** How many times an item is shown before the selector rotates. */
  exposuresPerItem: number;
  /**
   * When true (the default), every new tab picks a fresh item. When false, an
   * item repeats for `exposuresPerItem` views before rotating.
   */
  alwaysNewItem: boolean;
  theme: ThemePreference;
  /** False until onboarding is completed or skipped. */
  onboardingComplete: boolean;
}

/**
 * 2: dropped `contentMode` (phrases only) and made `alwaysNewItem` the default.
 * Settings stored by version 1 are migrated to a new item on every tab.
 */
export const SETTINGS_VERSION = 2;

export const DEFAULT_SETTINGS: Settings = {
  version: SETTINGS_VERSION,
  difficulties: [...DIFFICULTIES],
  translations: [],
  exposuresPerItem: 3,
  alwaysNewItem: true,
  theme: 'system',
  onboardingComplete: false,
};

export type LearningStatus = 'unseen' | 'learning' | 'known';

/** Per-item learning state. Only items the user has actually seen get a record. */
export interface ItemProgress {
  status: LearningStatus;
  /** How many times the card has been shown. */
  exposures: number;
  /** `Date.now()` of the most recent view, or 0 if never shown. */
  lastShownAt: number;
  saved: boolean;
}

export const DEFAULT_ITEM_PROGRESS: ItemProgress = {
  status: 'unseen',
  exposures: 0,
  lastShownAt: 0,
  saved: false,
};

export interface Progress {
  version: number;
  /** The item currently pinned to the New Tab page. */
  currentItemId: string | null;
  /** Exposures accumulated for `currentItemId` in the current rotation. */
  currentExposures: number;
  /** Previous item, so the selector can avoid an immediate repeat. */
  previousItemId: string | null;
  /** Keyed by `VocabularyItem.id`. */
  items: Record<string, ItemProgress>;
}

export const PROGRESS_VERSION = 1;

export const DEFAULT_PROGRESS: Progress = {
  version: PROGRESS_VERSION,
  currentItemId: null,
  currentExposures: 0,
  previousItemId: null,
  items: {},
};

const THEME_SET = new Set<string>(THEME_PREFERENCES);
const STATUS_SET = new Set<string>(['unseen', 'learning', 'known']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function clampInteger(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.round(value)));
}

/**
 * Coerce anything read from storage into valid `Settings`.
 *
 * This is the migration path: unknown or corrupt fields fall back to their
 * default rather than throwing, so a bad write can never brick the New Tab
 * page. Fields the user *did* set correctly are always preserved.
 */
export function normalizeSettings(raw: unknown): Settings {
  if (!isRecord(raw)) return { ...DEFAULT_SETTINGS };

  const difficulties = Array.isArray(raw.difficulties)
    ? DIFFICULTIES.filter((level) => (raw.difficulties as unknown[]).includes(level))
    : [];

  const translations = Array.isArray(raw.translations)
    ? TRANSLATION_LANGUAGE_CODES.filter((code) => (raw.translations as unknown[]).includes(code))
    : [];

  // Version 1 defaulted to repeating each item; version 2 shows a new item on
  // every tab, so older stored choices are reset to the new default.
  const isLegacy = typeof raw.version !== 'number' || raw.version < 2;

  return {
    version: SETTINGS_VERSION,
    // An empty difficulty list would leave nothing to show, so fall back to all.
    difficulties: difficulties.length > 0 ? difficulties : [...DIFFICULTIES],
    translations,
    exposuresPerItem: clampInteger(
      raw.exposuresPerItem,
      MIN_EXPOSURES,
      MAX_EXPOSURES,
      DEFAULT_SETTINGS.exposuresPerItem,
    ),
    alwaysNewItem:
      !isLegacy && typeof raw.alwaysNewItem === 'boolean'
        ? raw.alwaysNewItem
        : DEFAULT_SETTINGS.alwaysNewItem,
    theme:
      typeof raw.theme === 'string' && THEME_SET.has(raw.theme)
        ? (raw.theme as ThemePreference)
        : DEFAULT_SETTINGS.theme,
    onboardingComplete:
      typeof raw.onboardingComplete === 'boolean'
        ? raw.onboardingComplete
        : DEFAULT_SETTINGS.onboardingComplete,
  };
}

function normalizeItemProgress(raw: unknown): ItemProgress {
  if (!isRecord(raw)) return { ...DEFAULT_ITEM_PROGRESS };
  return {
    status:
      typeof raw.status === 'string' && STATUS_SET.has(raw.status)
        ? (raw.status as LearningStatus)
        : DEFAULT_ITEM_PROGRESS.status,
    exposures: clampInteger(raw.exposures, 0, Number.MAX_SAFE_INTEGER, 0),
    lastShownAt: clampInteger(raw.lastShownAt, 0, Number.MAX_SAFE_INTEGER, 0),
    saved: raw.saved === true,
  };
}

/** Coerce anything read from storage into valid `Progress`. See `normalizeSettings`. */
export function normalizeProgress(raw: unknown): Progress {
  if (!isRecord(raw)) return { ...DEFAULT_PROGRESS, items: {} };

  const items: Record<string, ItemProgress> = {};
  if (isRecord(raw.items)) {
    for (const [id, value] of Object.entries(raw.items)) {
      if (id.length > 0) items[id] = normalizeItemProgress(value);
    }
  }

  return {
    version: PROGRESS_VERSION,
    currentItemId: typeof raw.currentItemId === 'string' ? raw.currentItemId : null,
    currentExposures: clampInteger(raw.currentExposures, 0, Number.MAX_SAFE_INTEGER, 0),
    previousItemId: typeof raw.previousItemId === 'string' ? raw.previousItemId : null,
    items,
  };
}

/** Read one item's progress, falling back to the "never seen" default. */
export function getItemProgress(progress: Progress, id: string): ItemProgress {
  return progress.items[id] ?? { ...DEFAULT_ITEM_PROGRESS };
}

/** Number of items the user has marked as known. */
export function countKnown(progress: Progress): number {
  return Object.values(progress.items).filter((item) => item.status === 'known').length;
}

/** Number of items the user is actively learning. */
export function countLearning(progress: Progress): number {
  return Object.values(progress.items).filter((item) => item.status === 'learning').length;
}

/** Ids of saved items, most recently shown first. */
export function savedItemIds(progress: Progress): string[] {
  return Object.entries(progress.items)
    .filter(([, item]) => item.saved)
    .sort(([, a], [, b]) => b.lastShownAt - a.lastShownAt)
    .map(([id]) => id);
}
