/**
 * State for the New Tab page.
 *
 * The whole flow is: load settings + progress, resolve which item to show,
 * render, persist. Storage reads are async, so the page renders a neutral
 * holding state for the few milliseconds before they land — never a spinner,
 * which would be more distracting than blank space on a page opened this often.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { VOCABULARY } from '@/data/vocabulary';
import { applyItemAction, resolveCurrentItem } from '@/learning/selector';
import {
  loadProgress,
  loadSettings,
  onStorageChanged,
  saveProgress,
  updateSettings,
} from '@/storage/storage';
import {
  DEFAULT_PROGRESS,
  DEFAULT_SETTINGS,
  countKnown,
  countLearning,
  getItemProgress,
  type LearningStatus,
  type Progress,
  type Settings,
} from '@/storage/types';
import { applyTheme, watchSystemTheme } from '@/theme/theme';
import { primeVoices } from '@/speech/speech';
import type { VocabularyItem } from '@/types/vocabulary';

export interface PhraseTabState {
  ready: boolean;
  settings: Settings;
  progress: Progress;
  item: VocabularyItem | null;
  /** Views spent on the current item and the budget before rotation. */
  exposure: { current: number; total: number };
  knownCount: number;
  learningCount: number;
  /** Learning status of the item on screen, for the action bar's toggles. */
  itemStatus: LearningStatus;
  itemSaved: boolean;
  markLearning: () => void;
  markKnown: () => void;
  toggleSave: () => void;
  next: () => void;
  completeOnboarding: (patch: Partial<Settings>) => void;
}

export type WordTabState = PhraseTabState;

export function usePhraseTab(): PhraseTabState {
  const [ready, setReady] = useState(false);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [progress, setProgress] = useState<Progress>(() => ({ ...DEFAULT_PROGRESS, items: {} }));
  const [item, setItem] = useState<VocabularyItem | null>(null);

  // Exposure shown in the tally. Held separately from `progress` because the
  // resolve that produced it is not re-run on every render.
  const [exposureCount, setExposureCount] = useState(0);

  // Guards the initial resolve against React 18 StrictMode's double effect,
  // which would otherwise count one tab open as two exposures.
  const resolved = useRef(false);

  useEffect(() => {
    return primeVoices();
  }, []);

  /** Resolve, render, and persist in one step. */
  const advance = useCallback(
    (current: Settings, base: Progress, forceNew: boolean) => {
      const result = resolveCurrentItem(VOCABULARY, current, base, { forceNew });
      setItem(result.item);
      setProgress(result.progress);
      setExposureCount(result.progress.currentExposures);
      if (result.item) void saveProgress(result.progress);
      return result.progress;
    },
    [],
  );

  // First load: read storage, then decide what to show.
  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const [loadedSettings, loadedProgress] = await Promise.all([
        loadSettings(),
        loadProgress(),
      ]);
      if (cancelled) return;

      applyTheme(loadedSettings.theme);
      setSettings(loadedSettings);

      if (!loadedSettings.onboardingComplete) {
        // Do not burn an exposure on a card the user has not chosen settings
        // for yet; onboarding renders instead.
        setProgress(loadedProgress);
        setReady(true);
        return;
      }

      if (!resolved.current) {
        resolved.current = true;
        advance(loadedSettings, loadedProgress, false);
      }
      setReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [advance]);

  // Follow the OS when the user is on "system".
  useEffect(() => {
    return watchSystemTheme(settings.theme, () => applyTheme(settings.theme));
  }, [settings.theme]);

  // The Settings page runs in its own tab. Pick up its changes live rather than
  // making the user reload every open tab.
  useEffect(() => {
    return onStorageChanged((changes) => {
      if (changes.settings) {
        applyTheme(changes.settings.theme);
        setSettings(changes.settings);
      }
      if (changes.progress) setProgress(changes.progress);
    });
  }, []);

  // Re-resolve when filters change: the pinned item may no longer qualify.
  const filterKey = settings.difficulties.join(',');
  const lastFilterKey = useRef<string | null>(null);
  useEffect(() => {
    if (!ready || !settings.onboardingComplete) return;
    if (lastFilterKey.current === null) {
      lastFilterKey.current = filterKey;
      return;
    }
    if (lastFilterKey.current === filterKey) return;
    lastFilterKey.current = filterKey;

    void (async () => {
      const fresh = await loadProgress();
      advance(settings, fresh, false);
    })();
  }, [filterKey, ready, settings, advance]);

  const act = useCallback(
    (action: 'known' | 'learning' | 'toggleSave') => {
      if (!item) return;
      const updated = applyItemAction(progress, item.id, action);
      setProgress(updated);
      void saveProgress(updated);

      // Known and Learning end the rotation, so move on immediately rather
      // than leaving a card the user has just judged sitting on screen.
      if (action !== 'toggleSave') advance(settings, updated, true);
    },
    [item, progress, settings, advance],
  );

  const markKnown = useCallback(() => act('known'), [act]);
  const markLearning = useCallback(() => act('learning'), [act]);
  const toggleSave = useCallback(() => act('toggleSave'), [act]);

  const next = useCallback(() => {
    advance(settings, progress, true);
  }, [settings, progress, advance]);

  const completeOnboarding = useCallback(
    (patch: Partial<Settings>) => {
      void (async () => {
        const saved = await updateSettings({ ...patch, onboardingComplete: true });
        applyTheme(saved.theme);
        setSettings(saved);
        resolved.current = true;
        const fresh = await loadProgress();
        advance(saved, fresh, false);
      })();
    },
    [advance],
  );

  const knownCount = useMemo(() => countKnown(progress), [progress]);
  const learningCount = useMemo(() => countLearning(progress), [progress]);

  const itemState = item ? getItemProgress(progress, item.id) : null;

  return {
    ready,
    settings,
    progress,
    item,
    exposure: {
      current: exposureCount,
      total: settings.alwaysNewItem ? 1 : settings.exposuresPerItem,
    },
    knownCount,
    learningCount,
    itemStatus: itemState?.status ?? 'unseen',
    itemSaved: itemState?.saved ?? false,
    markLearning,
    markKnown,
    toggleSave,
    next,
    completeOnboarding,
  };
}

export const useWordTab = usePhraseTab;
