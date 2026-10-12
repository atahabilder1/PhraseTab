/**
 * The shape of WordTab's bundled vocabulary data.
 *
 * This file is the single source of truth for the dataset contract. It is
 * deliberately free of React/Chrome imports so it can be used by the runtime,
 * the tests and the validation script alike.
 */

export const VOCABULARY_KINDS = [
  'word',
  'phrasal_verb',
  'idiom',
  'expression',
  'collocation',
] as const;

export type VocabularyKind = (typeof VOCABULARY_KINDS)[number];

export const DIFFICULTIES = ['beginner', 'intermediate', 'advanced'] as const;

export type Difficulty = (typeof DIFFICULTIES)[number];

/**
 * Language codes for optional translations. Adding a language means adding a
 * code here, a label in `TRANSLATION_LANGUAGES`, and the strings in the
 * dataset — no other code has to change.
 */
export const TRANSLATION_LANGUAGE_CODES = ['bn', 'zh-CN'] as const;

export type TranslationLanguage = (typeof TRANSLATION_LANGUAGE_CODES)[number];

export interface TranslationLanguageInfo {
  code: TranslationLanguage;
  /** Name of the language in that language, shown as the row label. */
  nativeLabel: string;
  /** English name, used in settings and for screen readers. */
  englishLabel: string;
  /** BCP-47 tag for `lang` attributes so browsers pick the right font. */
  bcp47: string;
}

export const TRANSLATION_LANGUAGES: readonly TranslationLanguageInfo[] = [
  { code: 'bn', nativeLabel: 'বাংলা', englishLabel: 'Bangla', bcp47: 'bn' },
  { code: 'zh-CN', nativeLabel: '中文', englishLabel: 'Chinese (Simplified)', bcp47: 'zh-CN' },
];

export type Translations = Partial<Record<TranslationLanguage, string>>;

export interface VocabularyItem {
  id: string;
  term: string;
  /** Lowercased, whitespace-collapsed `term`; used for de-duplication. */
  normalizedTerm: string;
  kind: VocabularyKind;
  partOfSpeech?: string;
  difficulty: Difficulty;

  definition: string;
  example: string;

  synonyms?: string[];
  antonyms?: string[];

  pronunciation?: {
    ipa?: string;
  };

  translations?: Translations;

  tags?: string[];
  source?: string;
}

/** Versioned envelope so future dataset migrations are detectable. */
export interface VocabularyDataset {
  version: number;
  items: VocabularyItem[];
}

/** Kinds that count as "phrases" for the Words / Phrases / Mixed setting. */
export const PHRASE_KINDS: readonly VocabularyKind[] = [
  'phrasal_verb',
  'idiom',
  'expression',
  'collocation',
];

export function isPhraseKind(kind: VocabularyKind): boolean {
  return kind !== 'word';
}

const KIND_LABELS: Record<VocabularyKind, string> = {
  word: 'word',
  phrasal_verb: 'phrasal verb',
  idiom: 'idiom',
  expression: 'expression',
  collocation: 'collocation',
};

export function kindLabel(kind: VocabularyKind): string {
  return KIND_LABELS[kind];
}

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

export function difficultyLabel(difficulty: Difficulty): string {
  return DIFFICULTY_LABELS[difficulty];
}

/** Lowercase and collapse whitespace, matching `normalizedTerm` in the data. */
export function normalizeTerm(term: string): string {
  return term.trim().toLowerCase().replace(/\s+/g, ' ');
}
