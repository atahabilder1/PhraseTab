/**
 * Access to the bundled vocabulary dataset.
 *
 * The JSON is imported statically so Vite inlines it into the New Tab bundle:
 * opening a tab must never wait on a fetch, a network request, or disk I/O.
 */

import raw from './vocabulary.json';
import type { VocabularyDataset, VocabularyItem } from '@/types/vocabulary';

// The dataset's shape is enforced by `dataset.test.ts`, which runs the full
// validator against this exact file. Casting here keeps the runtime cost at
// zero rather than re-validating 100 entries on every new tab.
const dataset = raw as VocabularyDataset;

export const DATASET_VERSION = dataset.version;

export const VOCABULARY: readonly VocabularyItem[] = dataset.items;

const BY_ID = new Map(VOCABULARY.map((item) => [item.id, item]));

export function getItemById(id: string | null | undefined): VocabularyItem | undefined {
  return id == null ? undefined : BY_ID.get(id);
}

/** The raw dataset object, for the validator and tests. */
export function getRawDataset(): unknown {
  return raw;
}
