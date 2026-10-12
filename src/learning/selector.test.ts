import { beforeEach, describe, expect, it } from 'vitest';
import {
  applyItemAction,
  eligibleItems,
  itemWeight,
  matchesFilters,
  pickNextItem,
  resolveCurrentItem,
  SAVED_WEIGHT_BONUS,
  STATUS_WEIGHTS,
  weightedPick,
  type Rng,
} from './selector';
import {
  DEFAULT_PROGRESS,
  DEFAULT_SETTINGS,
  type Progress,
  type Settings,
} from '@/storage/types';
import type { Difficulty, VocabularyItem, VocabularyKind } from '@/types/vocabulary';

function makeItem(
  id: string,
  kind: VocabularyKind,
  difficulty: Difficulty,
): VocabularyItem {
  return {
    id,
    term: id,
    normalizedTerm: id,
    kind,
    difficulty,
    definition: `definition of ${id}`,
    example: `example of ${id}`,
  };
}

const ITEMS: VocabularyItem[] = [
  makeItem('w-beg', 'idiom', 'beginner'),
  makeItem('w-int', 'phrasal_verb', 'intermediate'),
  makeItem('w-adv', 'collocation', 'advanced'),
  makeItem('p-beg', 'phrasal_verb', 'beginner'),
  makeItem('p-int', 'idiom', 'intermediate'),
  makeItem('p-adv', 'expression', 'advanced'),
  makeItem('c-int', 'collocation', 'intermediate'),
];

const ALL_DIFFICULTIES: Difficulty[] = ['beginner', 'intermediate', 'advanced'];

function settings(patch: Partial<Settings> = {}): Settings {
  return { ...DEFAULT_SETTINGS, ...patch };
}

function progress(patch: Partial<Progress> = {}): Progress {
  return { ...DEFAULT_PROGRESS, items: {}, ...patch };
}

/** An rng that walks a fixed script, then repeats the last value. */
function scriptedRng(values: number[]): Rng {
  let index = 0;
  return () => values[Math.min(index++, values.length - 1)] ?? 0;
}

describe('matchesFilters', () => {
  it('accepts everything when all difficulties are on', () => {
    const filters = { difficulties: ALL_DIFFICULTIES };
    for (const item of ITEMS) {
      expect(matchesFilters(item, filters)).toBe(true);
    }
  });

  it('respects difficulty filters', () => {
    const filters = { difficulties: ['advanced' as const] };
    const kept = eligibleItems(ITEMS, filters);
    expect(kept.map((item) => item.id)).toEqual(['w-adv', 'p-adv']);
  });
});

describe('itemWeight', () => {
  it('prioritizes learning items over unseen ones', () => {
    const state = progress({
      items: { 'w-int': { status: 'learning', exposures: 2, lastShownAt: 1, saved: false } },
    });
    expect(itemWeight(ITEMS[1]!, state)).toBe(STATUS_WEIGHTS.learning);
    expect(itemWeight(ITEMS[0]!, state)).toBe(STATUS_WEIGHTS.unseen);
    expect(itemWeight(ITEMS[1]!, state)).toBeGreaterThan(itemWeight(ITEMS[0]!, state));
  });

  it('deprioritizes known items far below unseen ones', () => {
    const state = progress({
      items: { 'w-int': { status: 'known', exposures: 5, lastShownAt: 1, saved: false } },
    });
    expect(itemWeight(ITEMS[1]!, state)).toBe(STATUS_WEIGHTS.known);
    expect(itemWeight(ITEMS[1]!, state)).toBeLessThan(itemWeight(ITEMS[0]!, state));
  });

  it('never drops a known item to zero weight, so review is still possible', () => {
    const state = progress({
      items: { 'w-int': { status: 'known', exposures: 5, lastShownAt: 1, saved: false } },
    });
    expect(itemWeight(ITEMS[1]!, state)).toBeGreaterThan(0);
  });

  it('gives saved items a bonus', () => {
    const state = progress({
      items: { 'w-int': { status: 'known', exposures: 5, lastShownAt: 1, saved: true } },
    });
    expect(itemWeight(ITEMS[1]!, state)).toBe(STATUS_WEIGHTS.known + SAVED_WEIGHT_BONUS);
  });
});

describe('weightedPick', () => {
  it('returns undefined for an empty list', () => {
    expect(weightedPick([], progress(), () => 0)).toBeUndefined();
  });

  it('returns the only candidate without consulting the rng', () => {
    const rng = () => {
      throw new Error('rng should not be called for a single candidate');
    };
    expect(weightedPick([ITEMS[0]!], progress(), rng)?.id).toBe('w-beg');
  });

  it('selects proportionally to weight', () => {
    // Two unseen items, weight 3 each: total 6. rng 0.1 -> 0.6 lands in the
    // first bucket, rng 0.9 -> 5.4 lands in the second.
    const pair = [ITEMS[0]!, ITEMS[1]!];
    expect(weightedPick(pair, progress(), () => 0.1)?.id).toBe('w-beg');
    expect(weightedPick(pair, progress(), () => 0.9)?.id).toBe('w-int');
  });

  it('statistically favours learning items over known ones', () => {
    const state = progress({
      items: {
        'w-beg': { status: 'known', exposures: 3, lastShownAt: 1, saved: false },
        'w-int': { status: 'learning', exposures: 3, lastShownAt: 1, saved: false },
      },
    });
    const pair = [ITEMS[0]!, ITEMS[1]!];
    let learningPicks = 0;
    for (let i = 0; i < 1000; i += 1) {
      // A deterministic sweep across [0, 1) is a fair sample of the range.
      const value = i / 1000;
      if (weightedPick(pair, state, () => value)?.id === 'w-int') learningPicks += 1;
    }
    // learning 6 vs known 0.25 -> the learning item should dominate.
    expect(learningPicks).toBeGreaterThan(900);
  });
});

describe('pickNextItem', () => {
  const filters = { difficulties: ALL_DIFFICULTIES };

  it('returns an eligible item', () => {
    const picked = pickNextItem(ITEMS, filters, progress(), { rng: () => 0.5 });
    expect(picked).toBeDefined();
    expect(matchesFilters(picked!, filters)).toBe(true);
  });

  it('returns undefined when nothing matches the filters', () => {
    const narrow = { difficulties: [] as Difficulty[] };
    expect(pickNextItem(ITEMS, narrow, progress())).toBeUndefined();
  });

  it('avoids the excluded item when alternatives exist', () => {
    for (let i = 0; i < 50; i += 1) {
      const picked = pickNextItem(ITEMS, filters, progress(), {
        excludeId: 'w-int',
        rng: () => i / 50,
      });
      expect(picked?.id).not.toBe('w-int');
    }
  });

  it('skips recently shown items while unseen ones remain', () => {
    // 7 items -> window of 3. The three most recently shown must sit out.
    const state = progress({
      items: {
        'w-beg': { status: 'unseen', exposures: 1, lastShownAt: 30, saved: false },
        'w-int': { status: 'unseen', exposures: 1, lastShownAt: 20, saved: false },
        'w-adv': { status: 'unseen', exposures: 1, lastShownAt: 10, saved: false },
      },
    });
    for (let i = 0; i < 50; i += 1) {
      const picked = pickNextItem(ITEMS, filters, state, { rng: () => i / 50 });
      expect(['w-beg', 'w-int', 'w-adv']).not.toContain(picked?.id);
    }
  });

  it('does not repeat a phrase within a short run of new tabs', () => {
    let state = progress();
    const seen: string[] = [];
    let tick = 0;
    for (let i = 0; i < 3; i += 1) {
      const result = resolveCurrentItem(ITEMS, settings(), state, {
        rng: () => 0.5,
        now: () => (tick += 1),
      });
      seen.push(result.item!.id);
      state = result.progress;
    }
    expect(new Set(seen).size).toBe(3);
  });

  it('returns the only eligible item even when it is excluded', () => {
    // One eligible item and it is the one we would rather avoid: showing it
    // again beats showing nothing, and must not loop.
    const single = { difficulties: ['beginner' as const] };
    const picked = pickNextItem(ITEMS.slice(0, 1), single, progress(), { excludeId: 'w-beg' });
    expect(picked?.id).toBe('w-beg');
  });
});

describe('resolveCurrentItem', () => {
  it('picks an item on a clean install and records the first exposure', () => {
    const result = resolveCurrentItem(ITEMS, settings(), progress(), {
      rng: () => 0.5,
      now: () => 1000,
    });
    expect(result.item).not.toBeNull();
    expect(result.progress.currentItemId).toBe(result.item!.id);
    expect(result.progress.currentExposures).toBe(1);
    expect(result.progress.items[result.item!.id]).toEqual({
      status: 'unseen',
      exposures: 1,
      lastShownAt: 1000,
      saved: false,
    });
  });

  it('shows a new item on every open by default', () => {
    const first = resolveCurrentItem(ITEMS, settings(), progress(), {
      rng: () => 0.5,
      now: () => 1,
    });
    const second = resolveCurrentItem(ITEMS, settings(), first.progress, {
      rng: () => 0.5,
      now: () => 2,
    });
    expect(second.item!.id).not.toBe(first.item!.id);
    expect(second.rotated).toBe(true);
  });

  it('keeps the same item until the exposure budget is spent when repetition is on', () => {
    let state = progress();
    const config = settings({ alwaysNewItem: false, exposuresPerItem: 3 });

    const first = resolveCurrentItem(ITEMS, config, state, { rng: () => 0.5, now: () => 1 });
    const pinned = first.item!.id;
    state = first.progress;

    for (let view = 2; view <= 3; view += 1) {
      const next = resolveCurrentItem(ITEMS, config, state, { rng: () => 0.5, now: () => view });
      expect(next.item!.id, `view ${view}`).toBe(pinned);
      expect(next.rotated).toBe(false);
      expect(next.progress.currentExposures).toBe(view);
      state = next.progress;
    }

    // Fourth open: budget spent, so rotate to something else.
    const fourth = resolveCurrentItem(ITEMS, config, state, { rng: () => 0.5, now: () => 4 });
    expect(fourth.item!.id).not.toBe(pinned);
    expect(fourth.rotated).toBe(true);
    expect(fourth.progress.currentExposures).toBe(1);
    expect(fourth.progress.previousItemId).toBe(pinned);
  });

  it('rotates immediately when forceNew is set (the Next button)', () => {
    const first = resolveCurrentItem(ITEMS, settings(), progress(), {
      rng: () => 0.5,
      now: () => 1,
    });
    const next = resolveCurrentItem(ITEMS, settings(), first.progress, {
      forceNew: true,
      rng: () => 0.2,
      now: () => 2,
    });
    expect(next.item!.id).not.toBe(first.item!.id);
    expect(next.rotated).toBe(true);
  });

  it('rotates on every open when alwaysNewItem is on', () => {
    const config = settings({ alwaysNewItem: true, exposuresPerItem: 5 });
    const first = resolveCurrentItem(ITEMS, config, progress(), { rng: () => 0.5, now: () => 1 });
    const second = resolveCurrentItem(ITEMS, config, first.progress, {
      rng: () => 0.3,
      now: () => 2,
    });
    expect(second.item!.id).not.toBe(first.item!.id);
    expect(second.rotated).toBe(true);
  });

  it('accumulates lifetime exposures across rotations', () => {
    const config = settings({ alwaysNewItem: false, exposuresPerItem: 1 });
    // With one exposure per item the selector rotates every open; the pinned
    // item's lifetime count must still keep climbing when it comes back.
    let state = progress();
    const counts: Record<string, number> = {};
    const rng = scriptedRng([0.1, 0.4, 0.7, 0.2, 0.9]);
    for (let i = 0; i < 5; i += 1) {
      const result = resolveCurrentItem(ITEMS, config, state, { rng, now: () => i });
      counts[result.item!.id] = (counts[result.item!.id] ?? 0) + 1;
      state = result.progress;
    }
    for (const [id, seen] of Object.entries(counts)) {
      expect(state.items[id]?.exposures).toBe(seen);
    }
  });

  it('drops a pinned item that no longer passes the filters', () => {
    const state = progress({ currentItemId: 'p-int', currentExposures: 1 });
    const config = settings({ alwaysNewItem: false, difficulties: ['advanced'] });
    const result = resolveCurrentItem(ITEMS, config, state, {
      rng: () => 0.5,
      now: () => 1,
    });
    expect(result.item!.difficulty).toBe('advanced');
    expect(result.rotated).toBe(true);
  });

  it('drops a pinned id that is no longer in the dataset', () => {
    const state = progress({ currentItemId: 'removed-in-a-later-release', currentExposures: 1 });
    const result = resolveCurrentItem(ITEMS, settings(), state, { rng: () => 0.5, now: () => 1 });
    expect(result.item).not.toBeNull();
    expect(ITEMS.some((item) => item.id === result.item!.id)).toBe(true);
  });

  it('returns null without touching progress when no item is eligible', () => {
    const state = progress({ currentItemId: 'w-int', currentExposures: 2 });
    const result = resolveCurrentItem(ITEMS, settings({ difficulties: [] }), state, {
      rng: () => 0.5,
    });
    // An empty difficulty list is normally impossible via the UI, but progress
    // must survive it intact.
    expect(result.item).toBeNull();
    expect(result.progress).toBe(state);
  });

  it('keeps showing the only eligible item without looping', () => {
    const only = ITEMS.slice(0, 1);
    let state = progress();
    for (let i = 0; i < 10; i += 1) {
      const result = resolveCurrentItem(only, settings(), state, { rng: () => 0.5, now: () => i });
      expect(result.item!.id).toBe('w-beg');
      state = result.progress;
    }
    expect(state.items['w-beg']?.exposures).toBe(10);
  });
});

describe('applyItemAction', () => {
  let state: Progress;
  // Repetition on, so "ends its rotation" is observable.
  const repeating = settings({ alwaysNewItem: false });

  beforeEach(() => {
    state = resolveCurrentItem(ITEMS, repeating, progress(), {
      rng: () => 0.5,
      now: () => 100,
    }).progress;
  });

  it('marks an item known and ends its rotation', () => {
    const id = state.currentItemId!;
    const next = applyItemAction(state, id, 'known');
    expect(next.items[id]?.status).toBe('known');

    const after = resolveCurrentItem(ITEMS, repeating, next, { rng: () => 0.5, now: () => 101 });
    expect(after.item!.id).not.toBe(id);
  });

  it('marks an item as learning and ends its rotation', () => {
    const id = state.currentItemId!;
    const next = applyItemAction(state, id, 'learning');
    expect(next.items[id]?.status).toBe('learning');

    const after = resolveCurrentItem(ITEMS, repeating, next, { rng: () => 0.5, now: () => 101 });
    expect(after.item!.id).not.toBe(id);
  });

  it('toggles save without disturbing the rotation or the status', () => {
    const id = state.currentItemId!;
    const exposures = state.currentExposures;

    const saved = applyItemAction(state, id, 'toggleSave');
    expect(saved.items[id]?.saved).toBe(true);
    expect(saved.items[id]?.status).toBe('unseen');
    expect(saved.currentExposures).toBe(exposures);

    const unsaved = applyItemAction(saved, id, 'toggleSave');
    expect(unsaved.items[id]?.saved).toBe(false);
  });

  it('does not destroy progress recorded for other items', () => {
    const id = state.currentItemId!;
    const withOther = {
      ...state,
      items: {
        ...state.items,
        'w-adv': { status: 'known' as const, exposures: 7, lastShownAt: 42, saved: true },
      },
    };
    const next = applyItemAction(withOther, id, 'learning');
    expect(next.items['w-adv']).toEqual({
      status: 'known',
      exposures: 7,
      lastShownAt: 42,
      saved: true,
    });
  });

  it('can act on an item that has no progress record yet', () => {
    const next = applyItemAction(state, 'p-adv', 'toggleSave');
    expect(next.items['p-adv']).toEqual({
      status: 'unseen',
      exposures: 0,
      lastShownAt: 0,
      saved: true,
    });
  });
});
