import { useRef } from 'react';
import { ExposureTally } from './ExposureTally';
import { ListenButton } from './ListenButton';
import { TranslationBlock } from './TranslationBlock';
import { useFitOneLine } from './useFitOneLine';
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
/** Headwords longer than this (in characters) wrap at a smaller size when
    they cannot fit on one line. */
const LONG_TERM_LENGTH = 22;

export function VocabularyCard({ item, translations, exposure }: VocabularyCardProps) {
  const termRef = useRef<HTMLHeadingElement>(null);
  useFitOneLine(termRef, item.term);
  const ipa = item.pronunciation?.ipa;
  const hasSynonyms = (item.synonyms?.length ?? 0) > 0;
  const hasAntonyms = (item.antonyms?.length ?? 0) > 0;

  return (
    // Keying on the id restarts the entrance animation whenever the item
    // rotates, which is the only motion on the page.
    <article className="entry" key={item.id} aria-labelledby="entry-term">
      <div className="entry__label-row">
        <p className="entry__eyebrow eyebrow">
          <span>{item.partOfSpeech ?? kindLabel(item.kind)}</span>
          <span className="entry__eyebrow-dot" aria-hidden="true" />
          <span>{difficultyLabel(item.difficulty)}</span>
        </p>
        {/* Without IPA the speaker would sit alone on its own row under the
            headword, so it rides on the label line instead. */}
        {!ipa && <ListenButton term={item.term} />}
      </div>

      <h1
        ref={termRef}
        className={
          item.term.length > LONG_TERM_LENGTH ? 'entry__term entry__term--long' : 'entry__term'
        }
        id="entry-term"
        lang="en"
      >
        {item.term}
      </h1>

      {ipa && (
        <div className="entry__pronunciation">
          <span className="entry__ipa" aria-label={`Pronounced ${ipa}`}>
            {ipa}
          </span>
          <ListenButton term={item.term} />
        </div>
      )}

      <div className="entry__rule">
        <span className="entry__rule-line" aria-hidden="true" />
        {/* With a new phrase on every tab there is no repetition to count. */}
        {exposure.total > 1 && (
          <ExposureTally current={exposure.current} total={exposure.total} />
        )}
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
