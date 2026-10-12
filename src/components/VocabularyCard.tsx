import { ExposureTally } from './ExposureTally';
import { ListenButton } from './ListenButton';
import { TranslationBlock } from './TranslationBlock';
import {
  difficultyLabel,
  kindLabel,
  type TranslationLanguage,
  type VocabularyItem,
} from '@/types/vocabulary';

interface VocabularyCardProps {
  item: VocabularyItem;
  translations: readonly TranslationLanguage[];
  exposure: { current: number; total: number };
}

/**
 * One vocabulary entry, set as a dictionary entry rather than a card.
 *
 * Reading order matches the printed convention learners already know:
 * part of speech and level, then the headword, then pronunciation, then the
 * sense, then a citation, then relations. Nothing is boxed; the single rule
 * under the headword is the only structural device, and it carries the
 * repetition tally at its end.
 */
export function VocabularyCard({ item, translations, exposure }: VocabularyCardProps) {
  const hasSynonyms = (item.synonyms?.length ?? 0) > 0;
  const hasAntonyms = (item.antonyms?.length ?? 0) > 0;

  return (
    // Keying on the id restarts the entrance animation whenever the item
    // rotates, which is the only motion on the page.
    <article className="entry" key={item.id} aria-labelledby="entry-term">
      <p className="entry__eyebrow eyebrow">
        <span>{item.partOfSpeech ?? kindLabel(item.kind)}</span>
        <span className="entry__eyebrow-dot" aria-hidden="true" />
        <span>{difficultyLabel(item.difficulty)}</span>
      </p>

      <h1 className="entry__term" id="entry-term" lang="en">
        {item.term}
      </h1>

      {/* Phrases carry no IPA; the row keeps its height either way so the rule
          below never shifts between items. */}
      <div className="entry__pronunciation">
        {item.pronunciation?.ipa && (
          <span className="entry__ipa" aria-label={`Pronounced ${item.pronunciation.ipa}`}>
            {item.pronunciation.ipa}
          </span>
        )}
        <ListenButton term={item.term} />
      </div>

      <div className="entry__rule">
        <span className="entry__rule-line" aria-hidden="true" />
        <ExposureTally current={exposure.current} total={exposure.total} />
      </div>

      <p className="entry__definition">{item.definition}</p>

      <blockquote className="entry__example" lang="en">
        {item.example}
      </blockquote>

      {(hasSynonyms || hasAntonyms) && (
        <dl className="entry__meta">
          {hasSynonyms && (
            <div className="entry__meta-row">
              <dt className="entry__meta-label eyebrow">
                Syn<span className="sr-only">onyms</span>
              </dt>
              <dd className="entry__meta-value">{item.synonyms?.join(', ')}</dd>
            </div>
          )}
          {hasAntonyms && (
            <div className="entry__meta-row">
              <dt className="entry__meta-label eyebrow">
                Ant<span className="sr-only">onyms</span>
              </dt>
              <dd className="entry__meta-value">{item.antonyms?.join(', ')}</dd>
            </div>
          )}
        </dl>
      )}

      <TranslationBlock item={item} enabled={translations} />
    </article>
  );
}
