import { useCallback, useEffect, useMemo, useState } from 'react';
import { CloseIcon, SearchIcon, SettingsIcon } from '@/components/Icons';
import { ListenButton } from '@/components/ListenButton';
import { getItemById } from '@/data/vocabulary';
import { applyItemAction } from '@/learning/selector';
import { loadProgress, loadSettings, saveProgress } from '@/storage/storage';
import { savedItemIds, type Progress } from '@/storage/types';
import { applyTheme } from '@/theme/theme';
import {
  TRANSLATION_LANGUAGES,
  difficultyLabel,
  kindLabel,
  normalizeTerm,
  type TranslationLanguage,
  type VocabularyItem,
  type VocabularyKind,
} from '@/types/vocabulary';

type KindFilter = 'all' | 'word' | 'phrase';

const KIND_FILTERS: { value: KindFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'word', label: 'Words' },
  { value: 'phrase', label: 'Phrases' },
];

function matchesKind(kind: VocabularyKind, filter: KindFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'word') return kind === 'word';
  return kind !== 'word';
}

/**
 * The saved list (PLAN §12).
 *
 * A list, not a dashboard: search, a type filter, and one action per row. Rows
 * carry the definition because the whole point of saving something is coming
 * back to read it, and making the user click through would defeat that.
 */
export function Saved() {
  const [progress, setProgress] = useState<Progress | null>(null);
  const [translations, setTranslations] = useState<readonly TranslationLanguage[]>([]);
  const [query, setQuery] = useState('');
  const [kindFilter, setKindFilter] = useState<KindFilter>('all');

  useEffect(() => {
    void (async () => {
      const [settings, loaded] = await Promise.all([loadSettings(), loadProgress()]);
      applyTheme(settings.theme);
      setTranslations(settings.translations);
      setProgress(loaded);
    })();
  }, []);

  const unsave = useCallback(
    (id: string) => {
      setProgress((current) => {
        if (!current) return current;
        const next = applyItemAction(current, id, 'toggleSave');
        void saveProgress(next);
        return next;
      });
    },
    [],
  );

  const items = useMemo<VocabularyItem[]>(() => {
    if (!progress) return [];
    return savedItemIds(progress)
      .map((id) => getItemById(id))
      .filter((item): item is VocabularyItem => item !== undefined);
  }, [progress]);

  const visible = useMemo(() => {
    const needle = normalizeTerm(query);
    return items.filter((item) => {
      if (!matchesKind(item.kind, kindFilter)) return false;
      if (needle.length === 0) return true;
      // Search the definition too — people remember meanings, not spellings.
      return (
        item.normalizedTerm.includes(needle) ||
        item.definition.toLowerCase().includes(needle)
      );
    });
  }, [items, kindFilter, query]);

  if (!progress) return <div className="page" aria-busy="true" />;

  return (
    <div className="page">
      <header className="page__bar frame__bar">
        <a className="wordmark" href="newtab.html">
          PhraseTab
        </a>
        <nav className="frame__nav" aria-label="PhraseTab">
          <a className="nav-button" href="settings.html" aria-label="Settings">
            <SettingsIcon />
            <span className="sr-only">Settings</span>
          </a>
        </nav>
      </header>

      <main className="page__body">
        <h1 className="page__title">Saved</h1>
        <p className="page__lede">
          {items.length === 0
            ? 'Nothing saved yet.'
            : `${items.length} ${items.length === 1 ? 'item' : 'items'} you starred.`}
        </p>

        {items.length > 0 && (
          <div className="saved__controls">
            <div className="search">
              <SearchIcon className="search__icon" />
              <input
                type="search"
                className="search__input"
                value={query}
                placeholder="Search terms and meanings"
                aria-label="Search saved items"
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
            <div className="segmented" role="group" aria-label="Filter by type">
              {KIND_FILTERS.map((filter) => (
                <button
                  key={filter.value}
                  type="button"
                  className={
                    kindFilter === filter.value ? 'segmented__item is-active' : 'segmented__item'
                  }
                  aria-pressed={kindFilter === filter.value}
                  onClick={() => setKindFilter(filter.value)}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {items.length === 0 ? (
          <div className="empty">
            <p className="empty__body">
              Press <kbd className="action__key">S</kbd> on a new tab, or the star under any
              card, to keep it here for later.
            </p>
            <a className="button button--primary" href="newtab.html">
              Open a card
            </a>
          </div>
        ) : visible.length === 0 ? (
          <div className="empty">
            <p className="empty__body">
              No saved item matches “{query.trim()}”
              {kindFilter !== 'all' ? ` in ${kindFilter === 'word' ? 'words' : 'phrases'}` : ''}.
            </p>
            <button
              type="button"
              className="button"
              onClick={() => {
                setQuery('');
                setKindFilter('all');
              }}
            >
              Clear filters
            </button>
          </div>
        ) : (
          <ul className="saved__list">
            {visible.map((item) => (
              <li className="saved__row" key={item.id}>
                <div className="saved__head">
                  <h2 className="saved__term" lang="en">
                    {item.term}
                  </h2>
                  <ListenButton term={item.term} />
                  <span className="saved__tags eyebrow">
                    {item.partOfSpeech ?? kindLabel(item.kind)} · {difficultyLabel(item.difficulty)}
                  </span>
                  <button
                    type="button"
                    className="saved__remove"
                    onClick={() => unsave(item.id)}
                    aria-label={`Remove ${item.term} from saved`}
                    title="Remove from saved"
                  >
                    <CloseIcon />
                  </button>
                </div>
                <p className="saved__definition">{item.definition}</p>
                <p className="saved__example" lang="en">
                  {item.example}
                </p>
                {TRANSLATION_LANGUAGES.filter(
                  (language) =>
                    translations.includes(language.code) && item.translations?.[language.code],
                ).map((language) => (
                  <p className="saved__translation" key={language.code} lang={language.bcp47}>
                    <span className="saved__translation-label">{language.nativeLabel}</span>
                    {item.translations?.[language.code]}
                  </p>
                ))}
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
