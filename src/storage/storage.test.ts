import { beforeEach, describe, expect, it } from 'vitest';
import {
  loadProgress,
  loadSettings,
  resetMemoryStorage,
  resetProgress,
  saveProgress,
  updateProgress,
  updateSettings,
} from './storage';
import {
  DEFAULT_PROGRESS,
  DEFAULT_SETTINGS,
  countKnown,
  countLearning,
  getItemProgress,
  normalizeProgress,
  normalizeSettings,
  savedItemIds,
  MAX_EXPOSURES,
  MIN_EXPOSURES,
  SETTINGS_VERSION,
} from './types';

// These tests exercise the in-memory fallback: `chrome.storage` does not exist
// under jsdom, which is exactly the path `npm run dev` uses too.
beforeEach(() => {
  resetMemoryStorage();
});

describe('defaults on empty storage', () => {
  it('returns default settings', async () => {
    await expect(loadSettings()).resolves.toEqual(DEFAULT_SETTINGS);
  });

  it('returns default progress', async () => {
    await expect(loadProgress()).resolves.toEqual({ ...DEFAULT_PROGRESS, items: {} });
  });

  it('defaults to mixed content, all difficulties, and no translations', async () => {
    const settings = await loadSettings();
    expect(settings.contentMode).toBe('mixed');
    expect(settings.difficulties).toEqual(['beginner', 'intermediate', 'advanced']);
    expect(settings.translations).toEqual([]);
    expect(settings.exposuresPerItem).toBe(3);
    expect(settings.onboardingComplete).toBe(false);
  });
});

describe('round-tripping', () => {
  it('persists a settings update', async () => {
    await updateSettings({ contentMode: 'phrases', translations: ['bn'] });
    const reloaded = await loadSettings();
    expect(reloaded.contentMode).toBe('phrases');
    expect(reloaded.translations).toEqual(['bn']);
  });

  it('leaves untouched settings fields alone', async () => {
    await updateSettings({ exposuresPerItem: 5 });
    await updateSettings({ theme: 'dark' });
    const reloaded = await loadSettings();
    expect(reloaded.exposuresPerItem).toBe(5);
    expect(reloaded.theme).toBe('dark');
  });

  it('persists progress', async () => {
    await saveProgress({
      ...DEFAULT_PROGRESS,
      currentItemId: 'word-concise',
      currentExposures: 2,
      items: {
        'word-concise': { status: 'learning', exposures: 2, lastShownAt: 500, saved: true },
      },
    });
    const reloaded = await loadProgress();
    expect(reloaded.currentItemId).toBe('word-concise');
    expect(reloaded.items['word-concise']?.saved).toBe(true);
  });

  it('updateProgress does not destroy other items', async () => {
    await saveProgress({
      ...DEFAULT_PROGRESS,
      items: {
        a: { status: 'known', exposures: 3, lastShownAt: 1, saved: false },
        b: { status: 'learning', exposures: 1, lastShownAt: 2, saved: true },
      },
    });
    await updateProgress((current) => ({
      ...current,
      items: {
        ...current.items,
        a: { ...getItemProgress(current, 'a'), exposures: 4 },
      },
    }));
    const reloaded = await loadProgress();
    expect(reloaded.items['a']?.exposures).toBe(4);
    expect(reloaded.items['b']).toEqual({
      status: 'learning',
      exposures: 1,
      lastShownAt: 2,
      saved: true,
    });
  });

  it('resetProgress clears learning data', async () => {
    await saveProgress({
      ...DEFAULT_PROGRESS,
      currentItemId: 'x',
      items: { x: { status: 'known', exposures: 1, lastShownAt: 1, saved: true } },
    });
    await resetProgress();
    const reloaded = await loadProgress();
    expect(reloaded.currentItemId).toBeNull();
    expect(reloaded.items).toEqual({});
  });

  it('a progress write leaves settings intact', async () => {
    await updateSettings({ theme: 'dark', contentMode: 'words' });
    await saveProgress({ ...DEFAULT_PROGRESS, currentItemId: 'y' });
    const settings = await loadSettings();
    expect(settings.theme).toBe('dark');
    expect(settings.contentMode).toBe('words');
  });
});

describe('normalizeSettings migration and repair', () => {
  it('falls back to defaults for a non-object value', () => {
    expect(normalizeSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(normalizeSettings('nonsense')).toEqual(DEFAULT_SETTINGS);
    expect(normalizeSettings(42)).toEqual(DEFAULT_SETTINGS);
  });

  it('keeps valid fields and repairs invalid ones', () => {
    const result = normalizeSettings({
      contentMode: 'words',
      difficulties: ['beginner', 'not-a-level'],
      translations: ['bn', 'kl'],
      exposuresPerItem: 'three',
      theme: 'neon',
      onboardingComplete: true,
    });
    expect(result.contentMode).toBe('words');
    expect(result.difficulties).toEqual(['beginner']);
    expect(result.translations).toEqual(['bn']);
    expect(result.exposuresPerItem).toBe(DEFAULT_SETTINGS.exposuresPerItem);
    expect(result.theme).toBe('system');
    expect(result.onboardingComplete).toBe(true);
  });

  it('never leaves the difficulty list empty', () => {
    // An empty list would filter every item out and leave a blank New Tab.
    expect(normalizeSettings({ difficulties: [] }).difficulties).toEqual([
      'beginner',
      'intermediate',
      'advanced',
    ]);
  });

  it('clamps the exposure count into a usable range', () => {
    expect(normalizeSettings({ exposuresPerItem: 0 }).exposuresPerItem).toBe(MIN_EXPOSURES);
    expect(normalizeSettings({ exposuresPerItem: -5 }).exposuresPerItem).toBe(MIN_EXPOSURES);
    expect(normalizeSettings({ exposuresPerItem: 999 }).exposuresPerItem).toBe(MAX_EXPOSURES);
    expect(normalizeSettings({ exposuresPerItem: 2.6 }).exposuresPerItem).toBe(3);
  });

  it('stamps the current schema version onto older records', () => {
    expect(normalizeSettings({ version: 0, theme: 'dark' })).toMatchObject({
      version: SETTINGS_VERSION,
      theme: 'dark',
    });
  });

  it('normalizes difficulties into a stable order', () => {
    expect(normalizeSettings({ difficulties: ['advanced', 'beginner'] }).difficulties).toEqual([
      'beginner',
      'advanced',
    ]);
  });
});

describe('normalizeProgress repair', () => {
  it('falls back to defaults for a non-object value', () => {
    expect(normalizeProgress(undefined)).toEqual({ ...DEFAULT_PROGRESS, items: {} });
  });

  it('repairs malformed item records without dropping good ones', () => {
    const result = normalizeProgress({
      currentItemId: 'a',
      currentExposures: -3,
      previousItemId: 12,
      items: {
        a: { status: 'learning', exposures: 2, lastShownAt: 10, saved: true },
        b: 'corrupt',
        c: { status: 'invented', exposures: 'x', lastShownAt: null, saved: 'yes' },
      },
    });
    expect(result.currentExposures).toBe(0);
    expect(result.previousItemId).toBeNull();
    expect(result.items['a']).toEqual({
      status: 'learning',
      exposures: 2,
      lastShownAt: 10,
      saved: true,
    });
    expect(result.items['b']).toEqual({
      status: 'unseen',
      exposures: 0,
      lastShownAt: 0,
      saved: false,
    });
    expect(result.items['c']?.status).toBe('unseen');
    expect(result.items['c']?.saved).toBe(false);
  });
});

describe('progress summaries', () => {
  const state = normalizeProgress({
    items: {
      a: { status: 'known', exposures: 4, lastShownAt: 300, saved: false },
      b: { status: 'known', exposures: 2, lastShownAt: 100, saved: true },
      c: { status: 'learning', exposures: 1, lastShownAt: 200, saved: true },
      d: { status: 'unseen', exposures: 1, lastShownAt: 50, saved: false },
    },
  });

  it('counts known items', () => {
    expect(countKnown(state)).toBe(2);
  });

  it('counts learning items', () => {
    expect(countLearning(state)).toBe(1);
  });

  it('lists saved ids, most recently shown first', () => {
    expect(savedItemIds(state)).toEqual(['c', 'b']);
  });

  it('returns a safe default for an unknown item', () => {
    expect(getItemProgress(state, 'never-seen')).toEqual({
      status: 'unseen',
      exposures: 0,
      lastShownAt: 0,
      saved: false,
    });
  });
});
