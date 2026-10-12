import { describe, expect, it } from 'vitest';
import { formatIssues, validateDataset } from './schema';
import { getRawDataset, VOCABULARY } from './vocabulary';
import {
  DIFFICULTIES,
  VOCABULARY_KINDS,
  TRANSLATION_LANGUAGE_CODES,
  normalizeTerm,
} from '@/types/vocabulary';

describe('bundled vocabulary dataset', () => {
  it('satisfies the schema', () => {
    const result = validateDataset(getRawDataset());
    expect(result.valid, `\n${formatIssues(result.issues)}\n`).toBe(true);
  });

  it('has unique ids', () => {
    const ids = new Set(VOCABULARY.map((item) => item.id));
    expect(ids.size).toBe(VOCABULARY.length);
  });

  it('has unique normalized terms', () => {
    const terms = new Set(VOCABULARY.map((item) => item.normalizedTerm));
    expect(terms.size).toBe(VOCABULARY.length);
  });

  it('normalizes every term consistently', () => {
    for (const item of VOCABULARY) {
      expect(item.normalizedTerm).toBe(normalizeTerm(item.term));
    }
  });

  it('is large enough for the selector to rotate items', () => {
    // PLAN §26 asks for a 50-100 entry reviewed seed set.
    expect(VOCABULARY.length).toBeGreaterThanOrEqual(50);
  });

  it('contains phrases only, no single words', () => {
    for (const item of VOCABULARY) {
      expect(item.term.trim(), item.id).toMatch(/\s/);
    }
  });

  it('covers every phrase kind', () => {
    for (const kind of VOCABULARY_KINDS) {
      expect(VOCABULARY.some((item) => item.kind === kind), kind).toBe(true);
    }
  });

  it('has at least one phrase at every difficulty', () => {
    // The selector must always find something when a user narrows the filters
    // to a single difficulty.
    for (const difficulty of DIFFICULTIES) {
      expect(
        VOCABULARY.some((item) => item.difficulty === difficulty),
        difficulty,
      ).toBe(true);
    }
  });

  it('provides every supported translation for every item', () => {
    for (const item of VOCABULARY) {
      for (const code of TRANSLATION_LANGUAGE_CODES) {
        expect(item.translations?.[code], `${item.id} is missing ${code}`).toBeTruthy();
      }
    }
  });

  it('quotes an example that actually uses the term', () => {
    // Catches copy/paste mistakes where an example belongs to another entry.
    // Examples inflect the term ("bite the bullet" -> "bit the bullet"), and
    // irregular verbs share no prefix with their past tense, so we only require
    // that *some* content word of the term survives into the example.
    const FUNCTION_WORDS = new Set([
      'a', 'an', 'the', 'of', 'to', 'in', 'on', 'at', 'it', 'is', 'be',
      'your', 'you', 'my', 'someone', 'up', 'off', 'and', 'for', 'with',
    ]);

    const missing = VOCABULARY.filter((item) => {
      const example = item.example.toLowerCase();
      const tokens = item.normalizedTerm.split(' ');
      const content = tokens.filter((token) => !FUNCTION_WORDS.has(token));
      // Single-word terms have no fallback, so allow a truncated stem to match
      // regular endings (-s, -ed, -ing, -ly).
      const candidates = content.length > 0 ? content : tokens;
      return !candidates.some((token) => {
        const stem = token.length > 5 ? token.slice(0, token.length - 2) : token;
        return example.includes(stem);
      });
    });
    expect(missing.map((item) => item.id)).toEqual([]);
  });
});
