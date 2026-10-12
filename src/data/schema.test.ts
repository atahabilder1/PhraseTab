import { describe, expect, it } from 'vitest';
import { formatIssues, validateDataset } from './schema';

function validItem(overrides: Record<string, unknown> = {}) {
  return {
    id: 'word-concise',
    term: 'concise',
    normalizedTerm: 'concise',
    kind: 'word',
    partOfSpeech: 'adjective',
    difficulty: 'intermediate',
    definition: 'Saying what is needed in few words.',
    example: 'Keep the summary concise.',
    ...overrides,
  };
}

function wrap(...items: unknown[]) {
  return { version: 1, items };
}

/** Fields flagged by the validator, for concise assertions. */
function fieldsOf(raw: unknown): string[] {
  return validateDataset(raw).issues.map((issue) => issue.field);
}

describe('validateDataset', () => {
  it('accepts a minimal valid dataset', () => {
    const result = validateDataset(wrap(validItem()));
    expect(result.valid, formatIssues(result.issues)).toBe(true);
  });

  it('accepts every optional field when well formed', () => {
    const result = validateDataset(
      wrap(
        validItem({
          synonyms: ['brief'],
          antonyms: ['wordy'],
          tags: ['writing'],
          pronunciation: { ipa: '/kənˈsaɪs/' },
          translations: { bn: 'সংক্ষিপ্ত', 'zh-CN': '简洁的' },
          source: 'wordtab-original',
        }),
      ),
    );
    expect(result.valid, formatIssues(result.issues)).toBe(true);
  });

  it('rejects a non-object dataset', () => {
    expect(validateDataset(null).valid).toBe(false);
    expect(validateDataset([]).valid).toBe(false);
  });

  it('rejects a missing or invalid version', () => {
    expect(fieldsOf({ items: [validItem()] })).toContain('version');
    expect(fieldsOf({ version: 0, items: [validItem()] })).toContain('version');
    expect(fieldsOf({ version: 1.5, items: [validItem()] })).toContain('version');
  });

  it('rejects a missing or empty items array', () => {
    expect(fieldsOf({ version: 1 })).toContain('items');
    expect(fieldsOf({ version: 1, items: [] })).toContain('items');
  });

  it('rejects empty required strings', () => {
    for (const field of ['id', 'term', 'definition', 'example'] as const) {
      expect(fieldsOf(wrap(validItem({ [field]: '   ' }))), field).toContain(field);
    }
  });

  it('rejects an unknown kind', () => {
    expect(fieldsOf(wrap(validItem({ kind: 'proverb' })))).toContain('kind');
  });

  it('rejects an unknown difficulty', () => {
    expect(fieldsOf(wrap(validItem({ difficulty: 'C1' })))).toContain('difficulty');
  });

  it('rejects a normalizedTerm that does not match the term', () => {
    expect(fieldsOf(wrap(validItem({ term: 'Get Along', normalizedTerm: 'get along ' })))).toContain(
      'normalizedTerm',
    );
  });

  it('accepts a correctly normalized multi-word term', () => {
    const result = validateDataset(
      wrap(validItem({ id: 'p1', term: 'Get  Along With', normalizedTerm: 'get along with' })),
    );
    expect(result.valid, formatIssues(result.issues)).toBe(true);
  });

  it('rejects duplicate ids', () => {
    const issues = validateDataset(
      wrap(validItem(), validItem({ term: 'brief', normalizedTerm: 'brief' })),
    ).issues;
    expect(issues.some((issue) => issue.field === 'id')).toBe(true);
  });

  it('rejects duplicate normalized terms', () => {
    const issues = validateDataset(wrap(validItem(), validItem({ id: 'word-concise-2' }))).issues;
    expect(issues.some((issue) => issue.field === 'normalizedTerm')).toBe(true);
  });

  it('allows a duplicate term that is tagged as a separate sense', () => {
    const result = validateDataset(
      wrap(validItem(), validItem({ id: 'word-concise-2', tags: ['duplicate-sense'] })),
    );
    expect(result.valid, formatIssues(result.issues)).toBe(true);
  });

  it('rejects malformed optional arrays', () => {
    expect(fieldsOf(wrap(validItem({ synonyms: 'brief' })))).toContain('synonyms');
    expect(fieldsOf(wrap(validItem({ tags: [''] })))).toContain('tags[0]');
    expect(fieldsOf(wrap(validItem({ antonyms: [null] })))).toContain('antonyms[0]');
  });

  it('rejects malformed pronunciation', () => {
    expect(fieldsOf(wrap(validItem({ pronunciation: 'kənˈsaɪs' })))).toContain('pronunciation');
    expect(fieldsOf(wrap(validItem({ pronunciation: { ipa: 42 } })))).toContain(
      'pronunciation.ipa',
    );
  });

  it('rejects non-string and unknown-language translations', () => {
    expect(fieldsOf(wrap(validItem({ translations: { bn: 12 } })))).toContain('translations.bn');
    expect(fieldsOf(wrap(validItem({ translations: { fr: 'concis' } })))).toContain(
      'translations.fr',
    );
    expect(fieldsOf(wrap(validItem({ translations: [] })))).toContain('translations');
  });

  it('reports the index of the offending item', () => {
    const issues = validateDataset(wrap(validItem(), validItem({ id: 'x', kind: 'bad' }))).issues;
    expect(issues[0]?.index).toBe(1);
    expect(issues[0]?.id).toBe('x');
  });

  it('formats issues into a readable report', () => {
    const issues = validateDataset(wrap(validItem({ kind: 'bad' }))).issues;
    expect(formatIssues(issues)).toContain('items[0]');
    expect(formatIssues(issues)).toContain('kind');
  });
});
