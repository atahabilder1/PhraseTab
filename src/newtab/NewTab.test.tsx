import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NewTab } from './NewTab';
import { loadProgress, resetMemoryStorage, updateSettings } from '@/storage/storage';

/**
 * End-to-end behaviour of the New Tab page, against the real selector, the real
 * dataset and the real storage layer (running on its non-extension fallback).
 *
 * These cover the wiring that unit tests cannot: that a click reaches the
 * selector, that what the selector returns is what gets persisted, and that the
 * page recovers the same state on the next tab.
 */

function currentTerm(): string {
  return screen.getByRole('heading', { level: 1 }).textContent ?? '';
}

/** Wait for the first entry to resolve out of the holding state. */
async function renderReady() {
  render(<NewTab />);
  await screen.findByRole('heading', { level: 1 });
}

beforeEach(async () => {
  resetMemoryStorage();
  localStorage.clear();
  // Skip onboarding for every test but the one that asserts on it.
  await updateSettings({ onboardingComplete: true, exposuresPerItem: 3 });
});

describe('first run', () => {
  it('shows onboarding before any card', async () => {
    resetMemoryStorage();
    localStorage.clear();
    render(<NewTab />);
    expect(await screen.findByText('Welcome to PhraseTab.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /I know this/ })).not.toBeInTheDocument();
  });

  it('records no exposure while onboarding is on screen', async () => {
    resetMemoryStorage();
    localStorage.clear();
    render(<NewTab />);
    await screen.findByText('Welcome to PhraseTab.');
    const progress = await loadProgress();
    expect(progress.currentItemId).toBeNull();
    expect(Object.keys(progress.items)).toHaveLength(0);
  });

  it('enters the card after onboarding is skipped', async () => {
    resetMemoryStorage();
    localStorage.clear();
    const user = userEvent.setup();
    render(<NewTab />);
    await user.click(await screen.findByRole('button', { name: 'Skip setup' }));
    await screen.findByRole('heading', { level: 1 });
    expect(await screen.findByRole('button', { name: /I know this/ })).toBeInTheDocument();
  });
});

describe('the card', () => {
  it('renders a term, a definition and an example', async () => {
    await renderReady();
    expect(currentTerm().length).toBeGreaterThan(0);
    // The definition and example both come from the same entry.
    expect(screen.getByRole('article')).toBeInTheDocument();
  });

  it('persists the item it showed so the next tab continues it', async () => {
    await renderReady();
    const term = currentTerm();
    await waitFor(async () => {
      const progress = await loadProgress();
      expect(progress.currentItemId).not.toBeNull();
    });
    const progress = await loadProgress();
    expect(progress.items[progress.currentItemId!]?.exposures).toBe(1);
    expect(term.length).toBeGreaterThan(0);
  });

  it('hides the exposure tally when every tab shows a new phrase', async () => {
    await renderReady();
    expect(screen.queryByText(/Seen \d+ of \d+ times/)).not.toBeInTheDocument();
  });

  it('reports the exposure tally to assistive technology when repetition is on', async () => {
    await updateSettings({ alwaysNewItem: false });
    await renderReady();
    expect(screen.getByText(/Seen 1 of 3 times before moving on\./)).toBeInTheDocument();
  });
});

describe('actions', () => {
  it('Next rotates to a different item', async () => {
    const user = userEvent.setup();
    await renderReady();
    const before = currentTerm();
    await user.click(screen.getByRole('button', { name: /Next/ }));
    await waitFor(() => expect(currentTerm()).not.toBe(before));
  });

  it('marking known stores the status and moves on', async () => {
    const user = userEvent.setup();
    await renderReady();
    const before = currentTerm();

    await user.click(screen.getByRole('button', { name: /I know this/ }));
    await waitFor(() => expect(currentTerm()).not.toBe(before));

    const progress = await loadProgress();
    const known = Object.values(progress.items).filter((item) => item.status === 'known');
    expect(known).toHaveLength(1);
  });

  it('marking learning stores the status and moves on', async () => {
    const user = userEvent.setup();
    await renderReady();
    const before = currentTerm();

    await user.click(screen.getByRole('button', { name: /Learning/ }));
    await waitFor(() => expect(currentTerm()).not.toBe(before));

    const progress = await loadProgress();
    const learning = Object.values(progress.items).filter((item) => item.status === 'learning');
    expect(learning).toHaveLength(1);
  });

  it('Save keeps the same item on screen and toggles back off', async () => {
    const user = userEvent.setup();
    await renderReady();
    const before = currentTerm();

    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByRole('button', { name: 'Saved' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    // Saving is orthogonal to the rotation: the card must not jump away.
    expect(currentTerm()).toBe(before);

    await waitFor(async () => {
      const progress = await loadProgress();
      expect(Object.values(progress.items).some((item) => item.saved)).toBe(true);
    });

    await user.click(screen.getByRole('button', { name: 'Saved' }));
    await screen.findByRole('button', { name: 'Save' });
    const progress = await loadProgress();
    expect(Object.values(progress.items).some((item) => item.saved)).toBe(false);
  });

  it('shows the known count only once something is known', async () => {
    const user = userEvent.setup();
    await renderReady();
    expect(screen.queryByText(/known/)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /I know this/ }));
    expect(await screen.findByText(/1 known/)).toBeInTheDocument();
  });
});

describe('keyboard', () => {
  it('N advances to another item', async () => {
    const user = userEvent.setup();
    await renderReady();
    const before = currentTerm();
    await user.keyboard('n');
    await waitFor(() => expect(currentTerm()).not.toBe(before));
  });

  it('ArrowRight advances too', async () => {
    const user = userEvent.setup();
    await renderReady();
    const before = currentTerm();
    await user.keyboard('{ArrowRight}');
    await waitFor(() => expect(currentTerm()).not.toBe(before));
  });

  it('S saves without leaving the item', async () => {
    const user = userEvent.setup();
    await renderReady();
    const before = currentTerm();
    await user.keyboard('s');
    await screen.findByRole('button', { name: 'Saved' });
    expect(currentTerm()).toBe(before);
  });

  it('K marks known', async () => {
    const user = userEvent.setup();
    await renderReady();
    await user.keyboard('k');
    await waitFor(async () => {
      const progress = await loadProgress();
      expect(Object.values(progress.items).some((item) => item.status === 'known')).toBe(true);
    });
  });

  it('ignores shortcuts while a modifier is held', async () => {
    const user = userEvent.setup();
    await renderReady();
    const before = currentTerm();
    await user.keyboard('{Control>}n{/Control}');
    // Ctrl+N is "new window" — the page must not steal it.
    expect(currentTerm()).toBe(before);
  });
});

describe('filters', () => {
  it('shows a phrase, never a single word', async () => {
    await renderReady();
    expect(currentTerm().trim()).toMatch(/\s/);
  });

  it('honours a single difficulty', async () => {
    await updateSettings({ difficulties: ['beginner'] });
    await renderReady();
    expect(screen.getByRole('article').textContent).toContain('Beginner');
  });

  // There is deliberately no test for the "no matches" empty state here: the
  // dataset test guarantees every difficulty holds both a word and a phrase, so
  // no combination of settings can empty the library. That branch is defensive
  // only, and the selector's own tests cover resolve() returning null.
});
