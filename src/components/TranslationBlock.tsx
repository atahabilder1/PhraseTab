import {
  TRANSLATION_LANGUAGES,
  type TranslationLanguage,
  type VocabularyItem,
} from '@/types/vocabulary';

interface TranslationBlockProps {
  item: VocabularyItem;
  /** Languages the user turned on, in settings order. */
  enabled: readonly TranslationLanguage[];
}

/**
 * Optional translations under the entry.
 *
 * The card stays English-first (PLAN §5): translations sit below the example in
 * a muted label/value grid, never above or beside the headword. An enabled
 * language with no translation for this item is skipped silently rather than
 * showing an empty row — the graceful fallback is simply less to read.
 */
export function TranslationBlock({ item, enabled }: TranslationBlockProps) {
  const rows = TRANSLATION_LANGUAGES.filter((language) => {
    if (!enabled.includes(language.code)) return false;
    return Boolean(item.translations?.[language.code]);
  });

  if (rows.length === 0) return null;

  return (
    <dl className="entry__meta entry__meta--translations">
      {rows.map((language) => (
        <div className="entry__meta-row" key={language.code}>
          <dt className="entry__meta-label" lang={language.bcp47}>
            {language.nativeLabel}
            <span className="sr-only"> ({language.englishLabel})</span>
          </dt>
          <dd className="entry__meta-value" lang={language.bcp47}>
            {item.translations?.[language.code]}
          </dd>
        </div>
      ))}
    </dl>
  );
}
