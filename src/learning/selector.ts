/**
 * Item selection and the repeated-exposure model.
 *
 * The product principle (CLAUDE.md) is that WordTab must *not* throw a new
 * random item at the user on every tab. An item stays pinned for
 * `settings.exposuresPerItem` views, then rotates. `Next` forces a rotation.
 *
 * All functions here are pure: they take state in and return state out, with
 * randomness injected via a `rng` parameter so tests are deterministic.
 */

import {
  isPhraseKind,
  type Difficulty,
  type VocabularyItem,
} from '@/types/vocabulary';
import {
  getItemProgress,
  MAX_EXPOSURES,
  type ContentMode,
  type Progress,
  type Settings,
} from '@/storage/types';

/** A source of randomness in [0, 1). Injectable so tests can be deterministic. */
export type Rng = () => number;

export const defaultRng: Rng = () => Math.random();

/**
 * Relative selection weights by learning status.
 *
 * Learning items come back often (that is the point of marking them), unseen
 * items are the normal case, and known items are heavily deprioritized but
 * never fully excluded — occasional review is the cheapest way to keep them.
 */
export const STATUS_WEIGHTS = {
  learning: 6,
  unseen: 3,
  known: 0.25,
} as const;

/** Extra weight for saved items: the user asked to see these again. */
export const SAVED_WEIGHT_BONUS = 1.5;

export interface SelectionFilters {
  contentMode: ContentMode;
  difficulties: readonly Difficulty[];
}

/** Does an item pass the user's content-type and difficulty filters? */
export function matchesFilters(item: VocabularyItem, filters: SelectionFilters): boolean {
  if (!filters.difficulties.includes(item.difficulty)) return false;
  switch (filters.contentMode) {
    case 'words':
      return item.kind === 'word';
    case 'phrases':
      return isPhraseKind(item.kind);
    case 'mixed':
      return true;
  }
}

/** Every item the user's current settings allow. May be empty. */
export function eligibleItems(
  items: readonly VocabularyItem[],
  filters: SelectionFilters,
): VocabularyItem[] {
  return items.filter((item) => matchesFilters(item, filters));
}

/** Selection weight for one item, given what the user has done with it. */
export function itemWeight(item: VocabularyItem, progress: Progress): number {
  const state = getItemProgress(progress, item.id);
  const base = STATUS_WEIGHTS[state.status];
  return state.saved ? base + SAVED_WEIGHT_BONUS : base;
}

/**
 * Weighted random pick. Returns `undefined` only for an empty candidate list.
 *
 * Weights are guaranteed positive by `STATUS_WEIGHTS`, so the total is never
 * zero for a non-empty list and the loop always terminates on a real item.
 */
export function weightedPick(
  candidates: readonly VocabularyItem[],
  progress: Progress,
  rng: Rng,
): VocabularyItem | undefined {
  if (candidates.length === 0) return undefined;
  if (candidates.length === 1) return candidates[0];

  const weights = candidates.map((item) => itemWeight(item, progress));
  const total = weights.reduce((sum, weight) => sum + weight, 0);

  let threshold = rng() * total;
  for (let i = 0; i < candidates.length; i += 1) {
    threshold -= weights[i] ?? 0;
    if (threshold <= 0) return candidates[i];
  }
  // Only reachable through floating-point drift at the very end of the range.
  return candidates[candidates.length - 1];
}

/**
 * Choose the next item to show.
 *
 * Avoids `excludeId` (normally the item being rotated away from) whenever an
 * alternative exists, so the user never sees the same card twice in a row. If
 * the filters leave exactly one eligible item, that item is returned rather
 * than nothing — the New Tab page must always have something to render.
 */
export function pickNextItem(
  items: readonly VocabularyItem[],
  filters: SelectionFilters,
  progress: Progress,
  options: { excludeId?: string | null; rng?: Rng } = {},
): VocabularyItem | undefined {
  const { excludeId = null, rng = defaultRng } = options;

  const eligible = eligibleItems(items, filters);
  if (eligible.length === 0) return undefined;

  const withoutExcluded =
    excludeId == null ? eligible : eligible.filter((item) => item.id !== excludeId);

  // Falling back to the full list is what keeps a single-item filter from
  // returning nothing (or looping forever looking for an alternative).
  const candidates = withoutExcluded.length > 0 ? withoutExcluded : eligible;
  return weightedPick(candidates, progress, rng);
}

export interface ResolveOptions {
  /** Force a rotation regardless of exposure count (the `Next` button). */
  forceNew?: boolean;
  rng?: Rng;
  /** Injectable clock so tests can assert on `lastShownAt`. */
  now?: () => number;
}

export interface ResolveResult {
  /** The item to render, or `null` when no item matches the filters. */
  item: VocabularyItem | null;
  /** Progress with the exposure recorded. Persist this. */
  progress: Progress;
  /** True when this call rotated to a different item than the stored one. */
  rotated: boolean;
}

/**
 * The single entry point the New Tab page calls on load and on `Next`.
 *
 * Decides whether to keep the pinned item or rotate, records the exposure, and
 * returns both the item to render and the progress to persist.
 */
export function resolveCurrentItem(
  items: readonly VocabularyItem[],
  settings: Settings,
  progress: Progress,
  options: ResolveOptions = {},
): ResolveResult {
  const { forceNew = false, rng = defaultRng, now = Date.now } = options;

  const filters: SelectionFilters = {
    contentMode: settings.contentMode,
    difficulties: settings.difficulties,
  };

  const stored = progress.currentItemId
    ? items.find((item) => item.id === progress.currentItemId)
    : undefined;

  // A pinned item stops being valid if the user narrowed their filters, or if
  // the dataset changed and the id no longer exists.
  const storedIsUsable = stored !== undefined && matchesFilters(stored, filters);

  const exposuresReached = progress.currentExposures >= settings.exposuresPerItem;
  const mustRotate =
    forceNew || settings.alwaysNewItem || !storedIsUsable || exposuresReached;

  let item: VocabularyItem | undefined;
  let rotated = false;

  if (mustRotate) {
    item = pickNextItem(items, filters, progress, {
      excludeId: storedIsUsable ? (stored?.id ?? null) : null,
      rng,
    });
    rotated = item !== undefined && item.id !== progress.currentItemId;
  } else {
    item = stored;
  }

  if (!item) {
    // No item matches the filters. Leave progress untouched so nothing is lost
    // when the user widens their settings again.
    return { item: null, progress, rotated: false };
  }

  return {
    item,
    progress: recordExposure(progress, item, { rotated, now: now() }),
    rotated,
  };
}

/**
 * Record that `item` was just shown: bump its lifetime exposure count, advance
 * the rotation counter, and remember the item we rotated away from.
 */
function recordExposure(
  progress: Progress,
  item: VocabularyItem,
  context: { rotated: boolean; now: number },
): Progress {
  const existing = getItemProgress(progress, item.id);

  return {
    ...progress,
    currentItemId: item.id,
    currentExposures: context.rotated ? 1 : progress.currentExposures + 1,
    previousItemId: context.rotated ? progress.currentItemId : progress.previousItemId,
    items: {
      ...progress.items,
      [item.id]: {
        ...existing,
        // "unseen" only describes items the user has never been shown.
        status: existing.status === 'unseen' ? 'unseen' : existing.status,
        exposures: existing.exposures + 1,
        lastShownAt: context.now,
      },
    },
  };
}

/**
 * Apply a user action to one item.
 *
 * `known` and `learning` also end the current rotation, because the user has
 * told us what they think of this item and repeating it immediately would be
 * noise. `save` is orthogonal and leaves the rotation alone.
 */
export function applyItemAction(
  progress: Progress,
  itemId: string,
  action: 'known' | 'learning' | 'toggleSave',
): Progress {
  const existing = getItemProgress(progress, itemId);

  const next: Progress = {
    ...progress,
    items: {
      ...progress.items,
      [itemId]: {
        ...existing,
        ...(action === 'known' ? { status: 'known' as const } : {}),
        ...(action === 'learning' ? { status: 'learning' as const } : {}),
        ...(action === 'toggleSave' ? { saved: !existing.saved } : {}),
      },
    },
  };

  if (action !== 'toggleSave' && progress.currentItemId === itemId) {
    // The user has told us what they think of this item, so end its rotation:
    // the next resolve should move on rather than repeat it. MAX_EXPOSURES is
    // the ceiling `exposuresPerItem` can hold, so this always counts as done.
    next.currentExposures = MAX_EXPOSURES;
  }

  return next;
}
