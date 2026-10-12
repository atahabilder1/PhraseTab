import { useState } from 'react';
import type { Settings } from '@/storage/types';
import { DIFFICULTIES, TRANSLATION_LANGUAGES, type Difficulty, type TranslationLanguage } from '@/types/vocabulary';

interface OnboardingProps {
  onDone: (settings: Partial<Settings>) => void;
}

type StepId = 'welcome' | 'difficulty' | 'translations';

const STEPS: StepId[] = ['welcome', 'difficulty', 'translations'];

const DIFFICULTY_HINTS: Record<Difficulty, string> = {
  beginner: 'Everyday phrases you will use constantly',
  intermediate: 'Phrases that make writing and speech precise',
  advanced: 'Academic and professional register',
};

/**
 * First-run setup, three short steps (PLAN §11).
 *
 * Everything here has a sensible default already selected, so a user who wants
 * to skip can press Enter through the whole thing in about two seconds. No
 * account, no email, nothing to type.
 */
export function Onboarding({ onDone }: OnboardingProps) {
  const [step, setStep] = useState(0);
  const [difficulties, setDifficulties] = useState<Difficulty[]>([...DIFFICULTIES]);
  const [translations, setTranslations] = useState<TranslationLanguage[]>([]);

  const current = STEPS[step] ?? 'welcome';
  const isLast = step === STEPS.length - 1;

  const toggleDifficulty = (level: Difficulty) => {
    setDifficulties((previous) => {
      const next = previous.includes(level)
        ? previous.filter((entry) => entry !== level)
        : [...previous, level];
      // Never let the user leave with nothing selected — that would filter out
      // every item and leave the New Tab page empty.
      return next.length > 0 ? next : previous;
    });
  };

  const toggleTranslation = (code: TranslationLanguage) => {
    setTranslations((previous) =>
      previous.includes(code)
        ? previous.filter((entry) => entry !== code)
        : [...previous, code],
    );
  };

  const finish = () => {
    onDone({
      difficulties: DIFFICULTIES.filter((level) => difficulties.includes(level)),
      translations,
    });
  };

  return (
    <div className="onboarding">
      <div className="onboarding__panel">
        <p className="eyebrow onboarding__progress">
          Step {step + 1} of {STEPS.length}
        </p>

        {current === 'welcome' && (
          <>
            <h1 className="onboarding__title">Welcome to PhraseTab.</h1>
            <p className="onboarding__body">
              Every new tab shows a different English phrase: phrasal verbs, idioms,
              everyday expressions and natural word pairings.
            </p>
            <p className="onboarding__body">
              Two quick questions and you are set. Nothing leaves your browser.
            </p>
          </>
        )}

        {current === 'difficulty' && (
          <>
            <h1 className="onboarding__title">Which levels?</h1>
            <fieldset className="onboarding__choices">
              <legend className="sr-only">Difficulty levels</legend>
              {DIFFICULTIES.map((level) => (
                <label className="choice" key={level}>
                  <input
                    type="checkbox"
                    checked={difficulties.includes(level)}
                    onChange={() => toggleDifficulty(level)}
                  />
                  <span className="choice__body">
                    <span className="choice__label">
                      {level.charAt(0).toUpperCase() + level.slice(1)}
                    </span>
                    <span className="choice__hint">{DIFFICULTY_HINTS[level]}</span>
                  </span>
                </label>
              ))}
            </fieldset>
            <p className="onboarding__note">Keep at least one level on.</p>
          </>
        )}

        {current === 'translations' && (
          <>
            <h1 className="onboarding__title">Need translation help?</h1>
            <p className="onboarding__body">
              Optional. The card stays English-first either way, with the translation
              underneath.
            </p>
            <fieldset className="onboarding__choices">
              <legend className="sr-only">Translation languages</legend>
              {TRANSLATION_LANGUAGES.map((language) => (
                <label className="choice" key={language.code}>
                  <input
                    type="checkbox"
                    checked={translations.includes(language.code)}
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
            </fieldset>
            <p className="onboarding__note">You can change any of this later in settings.</p>
          </>
        )}

        <div className="onboarding__actions">
          {step > 0 ? (
            <button
              type="button"
              className="button button--quiet"
              onClick={() => setStep((value) => value - 1)}
            >
              Back
            </button>
          ) : (
            <button type="button" className="button button--quiet" onClick={finish}>
              Skip setup
            </button>
          )}

          <button
            type="button"
            className="button button--primary"
            onClick={() => (isLast ? finish() : setStep((value) => value + 1))}
            autoFocus
          >
            {isLast ? 'Start learning' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  );
}
