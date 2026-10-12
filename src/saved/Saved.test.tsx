import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Saved } from './Saved';
import { loadProgress, resetMemoryStorage, saveProgress, updateSettings } from '@/storage/storage';
import { DEFAULT_PROGRESS } from '@/storage/types';

/** Three saved items spanning both content types, for filter and search tests. */
async function seedSaved() {
  await saveProgress({
    ...DEFAULT_PROGRESS,
    items: {
      'word-resilient': { status: 'learning', exposures: 2, lastShownAt: 300, saved: true },
      'phrasal-figure-out': { status: 'unseen', exposures: 1, lastShownAt: 200, saved: true },
      'word-nuance': { status: 'known', exposures: 4, lastShownAt: 100, saved: true },
      // Seen but not saved: must never appear in the list.
      'word-concise': { status: 'known', exposures: 5, lastShownAt: 400, saved: false },
    },
  });
}

beforeEach(async () => {
  resetMemoryStorage();
  localStorage.clear();
  await updateSettings({ onboardingComplete: true, translations: ['bn'] });
});

describe('empty state', () => {
  it('invites the user to save something', async () => {
    render(<Saved />);
    expect(await screen.findByText('Nothing saved yet.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open a card' })).toBeInTheDocument();
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
  });
});

describe('the list', () => {
  beforeEach(seedSaved);

  it('lists only saved items, most recently shown first', async () => {
    render(<Saved />);
    const headings = await screen.findAllByRole('heading', { level: 2 });
    expect(headings.map((node) => node.textContent)).toEqual([
      'resilient',
      'figure out',
      'nuance',
    ]);
  });

  it('counts them', async () => {
    render(<Saved />);
    expect(await screen.findByText('3 items you starred.')).toBeInTheDocument();
  });

  it('shows the enabled translation and not the disabled one', async () => {
    render(<Saved />);
    await screen.findAllByRole('heading', { level: 2 });
    expect(screen.getAllByText('বাংলা').length).toBe(3);
    expect(screen.queryByText('中文')).not.toBeInTheDocument();
  });
});

describe('search and filters', () => {
  beforeEach(seedSaved);

  it('searches terms', async () => {
    const user = userEvent.setup();
    render(<Saved />);
    await screen.findAllByRole('heading', { level: 2 });

    await user.type(screen.getByRole('searchbox'), 'resil');
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 2, name: 'resilient' })).toBeInTheDocument();
  });

  it('searches definitions too, because people remember meanings', async () => {
    const user = userEvent.setup();
    render(<Saved />);
    await screen.findAllByRole('heading', { level: 2 });

    await user.type(screen.getByRole('searchbox'), 'difference in meaning');
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 2, name: 'nuance' })).toBeInTheDocument();
  });

  it('filters to words and to phrases', async () => {
    const user = userEvent.setup();
    render(<Saved />);
    await screen.findAllByRole('heading', { level: 2 });

    await user.click(screen.getByRole('button', { name: 'Words' }));
    expect(
      screen.getAllByRole('heading', { level: 2 }).map((node) => node.textContent),
    ).toEqual(['resilient', 'nuance']);

    await user.click(screen.getByRole('button', { name: 'Phrases' }));
    expect(
      screen.getAllByRole('heading', { level: 2 }).map((node) => node.textContent),
    ).toEqual(['figure out']);
  });

  it('explains an empty search result and offers a way back', async () => {
    const user = userEvent.setup();
    render(<Saved />);
    await screen.findAllByRole('heading', { level: 2 });

    await user.type(screen.getByRole('searchbox'), 'zzzz');
    expect(screen.queryAllByRole('heading', { level: 2 })).toHaveLength(0);

    await user.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(3);
  });
});

describe('removing', () => {
  beforeEach(seedSaved);

  it('drops the row and persists the change', async () => {
    const user = userEvent.setup();
    render(<Saved />);
    await screen.findAllByRole('heading', { level: 2 });

    await user.click(screen.getByRole('button', { name: 'Remove resilient from saved' }));
    expect(screen.queryByRole('heading', { level: 2, name: 'resilient' })).not.toBeInTheDocument();

    const progress = await loadProgress();
    expect(progress.items['word-resilient']?.saved).toBe(false);
    // Unsaving must not erase what the user learned about the item.
    expect(progress.items['word-resilient']?.status).toBe('learning');
    expect(progress.items['word-resilient']?.exposures).toBe(2);
    expect(progress.items['phrasal-figure-out']?.saved).toBe(true);
  });
});
