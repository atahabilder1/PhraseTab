/**
 * A dependency-free validator for the bundled vocabulary dataset.
 *
 * We do not use Zod here on purpose: the dataset ships inside the New Tab
 * bundle, and validation only ever runs in tests and the CLI check — pulling a
 * schema library into the extension bundle for that would be pure weight.
 */

import {
  DIFFICULTIES,
  VOCABULARY_KINDS,
  TRANSLATION_LANGUAGE_CODES,
  normalizeTerm,
  type Difficulty,
  type TranslationLanguage,
  type VocabularyDataset,
  type VocabularyItem,
  type VocabularyKind,
} from '@/types/vocabulary';

export interface ValidationIssue {
  /** Index in the `items` array, or -1 for dataset-level problems. */
  index: number;
  /** `id` of the offending item when known, for a readable message. */
  id: string | undefined;
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}

const KIND_SET = new Set<string>(VOCABULARY_KINDS);
const DIFFICULTY_SET = new Set<string>(DIFFICULTIES);
const LANGUAGE_SET = new Set<string>(TRANSLATION_LANGUAGE_CODES);

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Validate an optional array of non-empty strings (synonyms, antonyms, tags).
 */
function checkStringArray(
  value: unknown,
  field: string,
  index: number,
  id: string | undefined,
  issues: ValidationIssue[],
): void {
  if (value === undefined) return;
  if (!Array.isArray(value)) {
    issues.push({ index, id, field, message: `${field} must be an array when present` });
    return;
  }
  value.forEach((entry, i) => {
    if (!isNonEmptyString(entry)) {
      issues.push({
        index,
        id,
        field: `${field}[${i}]`,
        message: `${field} entries must be non-empty strings`,
      });
    }
  });
}

function validateItem(
  raw: unknown,
  index: number,
  issues: ValidationIssue[],
): VocabularyItem | undefined {
  if (!isRecord(raw)) {
    issues.push({ index, id: undefined, field: '(item)', message: 'item must be an object' });
    return undefined;
  }

  const id = typeof raw.id === 'string' ? raw.id : undefined;
  const push = (field: string, message: string) => issues.push({ index, id, field, message });

  if (!isNonEmptyString(raw.id)) push('id', 'id must be a non-empty string');
  if (!isNonEmptyString(raw.term)) push('term', 'term must be a non-empty string');
  if (!isNonEmptyString(raw.definition)) push('definition', 'definition must be a non-empty string');
  if (!isNonEmptyString(raw.example)) push('example', 'example must be a non-empty string');

  if (!isNonEmptyString(raw.kind) || !KIND_SET.has(raw.kind)) {
    push('kind', `kind must be one of: ${VOCABULARY_KINDS.join(', ')}`);
  }
  if (!isNonEmptyString(raw.difficulty) || !DIFFICULTY_SET.has(raw.difficulty)) {
    push('difficulty', `difficulty must be one of: ${DIFFICULTIES.join(', ')}`);
  }

  if (isNonEmptyString(raw.term)) {
    const expected = normalizeTerm(raw.term);
    if (raw.normalizedTerm !== expected) {
      push('normalizedTerm', `normalizedTerm must equal normalizeTerm(term) ("${expected}")`);
    }
  } else if (!isNonEmptyString(raw.normalizedTerm)) {
    push('normalizedTerm', 'normalizedTerm must be a non-empty string');
  }

  if (raw.partOfSpeech !== undefined && !isNonEmptyString(raw.partOfSpeech)) {
    push('partOfSpeech', 'partOfSpeech must be a non-empty string when present');
  }
  if (raw.source !== undefined && !isNonEmptyString(raw.source)) {
    push('source', 'source must be a non-empty string when present');
  }

  checkStringArray(raw.synonyms, 'synonyms', index, id, issues);
  checkStringArray(raw.antonyms, 'antonyms', index, id, issues);
  checkStringArray(raw.tags, 'tags', index, id, issues);

  if (raw.pronunciation !== undefined) {
    if (!isRecord(raw.pronunciation)) {
      push('pronunciation', 'pronunciation must be an object when present');
    } else if (
      raw.pronunciation.ipa !== undefined &&
      !isNonEmptyString(raw.pronunciation.ipa)
    ) {
      push('pronunciation.ipa', 'pronunciation.ipa must be a non-empty string when present');
    }
  }

  if (raw.translations !== undefined) {
    if (!isRecord(raw.translations)) {
      push('translations', 'translations must be an object when present');
    } else {
      for (const [code, value] of Object.entries(raw.translations)) {
        if (!LANGUAGE_SET.has(code)) {
          push(
            `translations.${code}`,
            `unknown translation language "${code}" (known: ${TRANSLATION_LANGUAGE_CODES.join(', ')})`,
          );
        }
        if (!isNonEmptyString(value)) {
          push(`translations.${code}`, 'translation values must be non-empty strings');
        }
      }
    }
  }

  return raw as unknown as VocabularyItem;
}

/**
 * Validate a whole dataset: per-item shape, unique ids, and unique normalized
 * terms. A term may legitimately appear twice for different senses; mark such
 * an entry with the `duplicate-sense` tag to opt out of the uniqueness check.
 */
export function validateDataset(raw: unknown): ValidationResult {
  const issues: ValidationIssue[] = [];

  if (!isRecord(raw)) {
    return {
      valid: false,
      issues: [{ index: -1, id: undefined, field: '(dataset)', message: 'dataset must be an object' }],
    };
  }
  if (typeof raw.version !== 'number' || !Number.isInteger(raw.version) || raw.version < 1) {
    issues.push({
      index: -1,
      id: undefined,
      field: 'version',
      message: 'version must be a positive integer',
    });
  }
  if (!Array.isArray(raw.items)) {
    issues.push({ index: -1, id: undefined, field: 'items', message: 'items must be an array' });
    return { valid: false, issues };
  }
  if (raw.items.length === 0) {
    issues.push({ index: -1, id: undefined, field: 'items', message: 'items must not be empty' });
  }

  const seenIds = new Map<string, number>();
  const seenTerms = new Map<string, number>();

  raw.items.forEach((rawItem, index) => {
    const item = validateItem(rawItem, index, issues);
    if (!item) return;

    if (typeof item.id === 'string' && item.id.length > 0) {
      const previous = seenIds.get(item.id);
      if (previous !== undefined) {
        issues.push({
          index,
          id: item.id,
          field: 'id',
          message: `duplicate id (also used at index ${previous})`,
        });
      } else {
        seenIds.set(item.id, index);
      }
    }

    const allowsDuplicateSense = Array.isArray(item.tags) && item.tags.includes('duplicate-sense');
    if (typeof item.normalizedTerm === 'string' && item.normalizedTerm.length > 0) {
      const previous = seenTerms.get(item.normalizedTerm);
      if (previous !== undefined && !allowsDuplicateSense) {
        issues.push({
          index,
          id: item.id,
          field: 'normalizedTerm',
          message: `duplicate normalized term "${item.normalizedTerm}" (also at index ${previous}); tag it "duplicate-sense" if intentional`,
        });
      } else if (previous === undefined) {
        seenTerms.set(item.normalizedTerm, index);
      }
    }
  });

  return { valid: issues.length === 0, issues };
}

/** Render issues as a readable multi-line report for test output and the CLI. */
export function formatIssues(issues: readonly ValidationIssue[]): string {
  return issues
    .map((issue) => {
      const where = issue.index >= 0 ? `items[${issue.index}]` : 'dataset';
      const who = issue.id ? ` (${issue.id})` : '';
      return `${where}${who} → ${issue.field}: ${issue.message}`;
    })
    .join('\n');
}

/**
 * Parse-and-throw helper. Used where a dataset is assumed valid (the bundled
 * one, already covered by tests) and a failure means a build-time mistake.
 */
export function assertValidDataset(raw: unknown): VocabularyDataset {
  const result = validateDataset(raw);
  if (!result.valid) {
    throw new Error(`Invalid vocabulary dataset:\n${formatIssues(result.issues)}`);
  }
  return raw as VocabularyDataset;
}

export type { Difficulty, TranslationLanguage, VocabularyKind };
