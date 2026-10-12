import { useCallback, useEffect, useState } from 'react';
import { BookmarkIcon } from '@/components/Icons';
import { loadProgress, loadSettings, resetProgress, updateSettings } from '@/storage/storage';
import {
  DEFAULT_SETTINGS,
  MAX_EXPOSURES,
  MIN_EXPOSURES,
  countKnown,
  countLearning,
  savedItemIds,
  type ContentMode,
  type Settings as SettingsShape,
  type ThemePreference,
} from '@/storage/types';
import { applyTheme } from '@/theme/theme';
import {
  DIFFICULTIES,
  TRANSLATION_LANGUAGES,
  difficultyLabel,
  type Difficulty,
  type TranslationLanguage,
} from '@/types/vocabulary';
import { VOCABULARY } from '@/data/vocabulary';

const CONTENT_MODES: { value: ContentMode; label: string; hint: string }[] = [
  { value: 'mixed', label: 'Mixed', hint: 'Words and phrases together' },
  { value: 'words', label: 'Words', hint: 'Single vocabulary words only' },
  { value: 'phrases', label: 'Phrases', hint: 'Phrasal verbs, idioms, expressions, collocations' },
];

const THEMES: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

const DIFFICULTY_HINTS: Record<Difficulty, string> = {
  beginner: 'Everyday words you will use constantly',
  intermediate: 'Words that make writing and speech precise',
  advanced: 'Academic and professional register',
};

/**
 * The settings page (PLAN §10).
 *
 * Every control writes immediately — there is no Save button, because there is
 * nothing here a user would want to stage and commit. Open New Tab pages pick
 * the change up through the storage listener without a reload.
 */
export function Settings() {
  const [settings, setSettings] = useState<SettingsShape>(DEFAULT_SETTINGS);
  const [ready, setReady] = useState(false);
  const [stats, setStats] = useState({ known: 0, learning: 0, saved: 0 });
  const [resetState, setResetState] = useState<'idle' | 'confirm' | 'done'>('idle');

  const refreshStats = useCallback(async () => {
    const progress = await loadProgress();
    setStats({
      known: countKnown(progress),
      learning: countLearning(progress),
      saved: savedItemIds(progress).length,
    });
  }, []);

  useEffect(() => {
    void (async () => {
      const loaded = await loadSettings();
      applyTheme(loaded.theme);
      setSettings(loaded);
      await refreshStats();
      setReady(true);
    })();
  }, [refreshStats]);

  const patch = useCallback(async (changes: Partial<SettingsShape>) => {
    const saved = await updateSettings(changes);
    applyTheme(saved.theme);
    setSettings(saved);
  }, []);

  const toggleDifficulty = (level: Difficulty) => {
    const next = settings.difficulties.includes(level)
      ? settings.difficulties.filter((entry) => entry !== level)
      : [...settings.difficulties, level];
    // Refuse to leave the user with an empty library rather than silently
    // repairing it after the fact.
    if (next.length === 0) return;
    void patch({ difficulties: DIFFICULTIES.filter((entry) => next.includes(entry)) });
  };

  const toggleTranslation = (code: TranslationLanguage) => {
    const next = settings.translations.includes(code)
      ? settings.translations.filter((entry) => entry !== code)
      : [...settings.translations, code];
    void patch({ translations: next });
  };

  const handleReset = async () => {
    if (resetState !== 'confirm') {
      setResetState('confirm');
      return;
    }
    await resetProgress();
    await refreshStats();
    setResetState('done');
  };

  if (!ready) return <div className="page" aria-busy="true" />;

  const onlyDifficulty = settings.difficulties.length === 1 ? settings.difficulties[0] : null;

  return (
    <div className="page">
      <header className="page__bar frame__bar">
        <a className="wordmark" href="newtab.html">
          PhraseTab
        </a>
        <nav className="frame__nav" aria-label="PhraseTab">
          <a className="nav-button" href="saved.html">
            <BookmarkIcon />
            <span>Saved</span>
          </a>
        </nav>
      </header>

      <main className="page__body">
        <h1 className="page__title">Settings</h1>
        <p className="page__lede">
          {VOCABULARY.length} words and phrases, stored in the extension. Changes apply to
          open tabs right away.
        </p>

        <Section title="Content" hint="What appears on a new tab.">
          <fieldset className="field">
            <legend className="field__legend eyebrow">Type</legend>
            <div className="choices">
              {CONTENT_MODES.map((mode) => (
                <label className="choice" key={mode.value}>
                  <input
                    type="radio"
                    name="contentMode"
                    checked={settings.contentMode === mode.value}
                    onChange={() => void patch({ contentMode: mode.value })}
                  />
                  <span className="choice__body">
                    <span className="choice__label">{mode.label}</span>
                    <span className="choice__hint">{mode.hint}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="field">
            <legend className="field__legend eyebrow">Difficulty</legend>
            <div className="choices">
              {DIFFICULTIES.map((level) => {
                const isLastOne = onlyDifficulty === level;
                return (
                  <label className="choice" key={level}>
                    <input
                      type="checkbox"
                      checked={settings.difficulties.includes(level)}
                      disabled={isLastOne}
                      onChange={() => toggleDifficulty(level)}
                    />
                    <span className="choice__body">
                      <span className="choice__label">{difficultyLabel(level)}</span>
                      <span className="choice__hint">
                        {isLastOne
                          ? 'Keep at least one level on'
                          : DIFFICULTY_HINTS[level]}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        </Section>

        <Section
          title="Translations"
          hint="Shown under the example. The card stays English-first."
        >
          <div className="choices">
            {TRANSLATION_LANGUAGES.map((language) => (
              <label className="choice" key={language.code}>
                <input
                  type="checkbox"
                  checked={settings.translations.includes(language.code)}
                  onChange={() => toggleTranslation(language.code)}
                />
                <span className="choice__body">
                  <span className="choice__label">
                    {language.englishLabel}{' '}
                    <span className="choice__native" lang={language.bcp47}>
                      {language.nativeLabel}
                    </span>
                  </span>
                </span>
              </label>
            ))}
          </div>
        </Section>

        <Section
          title="Repetition"
          hint="PhraseTab shows the same item a few times before moving on, because that is how words stick."
        >
          <div className="field">
            <label className="field__row" htmlFor="exposures">
              <span className="field__label">
                Times to show an item
                <span className="field__hint">
                  Press Next any time to move on early.
                </span>
              </span>
              <span className="stepper">
                <input
                  id="exposures"
                  type="range"
                  min={MIN_EXPOSURES}
                  max={MAX_EXPOSURES}
                  step={1}
                  value={settings.exposuresPerItem}
                  disabled={settings.alwaysNewItem}
                  onChange={(event) =>
                    void patch({ exposuresPerItem: Number(event.target.value) })
                  }
                />
                <output className="stepper__value" htmlFor="exposures">
                  {settings.exposuresPerItem}
                </output>
              </span>
            </label>
          </div>

          <label className="choice">
            <input
              type="checkbox"
              checked={settings.alwaysNewItem}
              onChange={(event) => void patch({ alwaysNewItem: event.target.checked })}
            />
            <span className="choice__body">
              <span className="choice__label">Show a new item on every tab</span>
              <span className="choice__hint">
                Turns repetition off entirely. Faster, but harder to remember.
              </span>
            </span>
          </label>
        </Section>

        <Section title="Appearance">
          <div className="choices choices--row">
            {THEMES.map((theme) => (
              <label className="choice choice--compact" key={theme.value}>
                <input
                  type="radio"
                  name="theme"
                  checked={settings.theme === theme.value}
                  onChange={() => void patch({ theme: theme.value })}
                />
                <span className="choice__label">{theme.label}</span>
              </label>
            ))}
          </div>
        </Section>

        <Section title="Progress">
          <dl className="stats">
            <div className="stats__item">
              <dt className="eyebrow">Known</dt>
              <dd>{stats.known}</dd>
            </div>
            <div className="stats__item">
              <dt className="eyebrow">Learning</dt>
              <dd>{stats.learning}</dd>
            </div>
            <div className="stats__item">
              <dt className="eyebrow">Saved</dt>
              <dd>{stats.saved}</dd>
            </div>
          </dl>

          <div className="danger">
            <p className="field__hint">
              {resetState === 'done'
                ? 'Progress cleared. Your settings are unchanged.'
                : 'Clears known, learning and saved items. Settings are unaffected.'}
            </p>
            {resetState !== 'done' && (
              <button
                type="button"
                className={resetState === 'confirm' ? 'button button--danger' : 'button'}
                onClick={() => void handleReset()}
                onBlur={() => setResetState('idle')}
              >
                {resetState === 'confirm' ? 'Yes, erase my progress' : 'Reset progress'}
              </button>
            )}
          </div>
        </Section>

        <Section title="Privacy">
          <p className="field__hint">
            PhraseTab requests a single permission &mdash; <code>storage</code> &mdash; and
            nothing else. No account, no analytics, no ads, no network access. Nothing you
            do here leaves this browser, and everything works offline.
          </p>
        </Section>
      </main>
    </div>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="section">
      <div className="section__head">
        <h2 className="section__title eyebrow">{title}</h2>
        {hint && <p className="section__hint">{hint}</p>}
      </div>
      <div className="section__body">{children}</div>
    </section>
  );
}
