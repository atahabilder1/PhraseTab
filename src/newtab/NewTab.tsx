import { useEffect } from 'react';
import { ActionBar } from '@/components/ActionBar';
import { BookmarkIcon, SettingsIcon } from '@/components/Icons';
import { VocabularyCard } from '@/components/VocabularyCard';
import { Onboarding } from '@/onboarding/Onboarding';
import { speak } from '@/speech/speech';
import { usePhraseTab } from './usePhraseTab';

/**
 * The New Tab page.
 *
 * Layout is a three-row frame: a near-invisible top bar, the entry optically
 * centred in the middle, and the actions plus counts at the bottom. Nothing
 * scrolls; nothing loads over the network.
 */
export function NewTab() {
  const state = usePhraseTab();
  const { item, settings, ready, next, markKnown, markLearning, toggleSave } = state;

  // Keyboard shortcuts. The page has no text input, so single keys are safe,
  // but we still bail out if focus is inside a field or a modifier is held.
  useEffect(() => {
    if (!ready || !settings.onboardingComplete || !item) return;

    const handler = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.isContentEditable) return;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;

      switch (event.key.toLowerCase()) {
        case 'n':
        case 'arrowright':
          event.preventDefault();
          next();
          break;
        case 'k':
          event.preventDefault();
          markKnown();
          break;
        case 'l':
          event.preventDefault();
          markLearning();
          break;
        case 's':
          event.preventDefault();
          toggleSave();
          break;
        case 'p':
          event.preventDefault();
          speak(item.term);
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [ready, settings.onboardingComplete, item, next, markKnown, markLearning, toggleSave]);

  if (!ready) {
    // Storage resolves in a few milliseconds. Hold the frame rather than
    // flashing a spinner on a page that opens dozens of times a day.
    return <div className="frame frame--holding" aria-busy="true" />;
  }

  if (!settings.onboardingComplete) {
    return <Onboarding onDone={state.completeOnboarding} />;
  }

  return (
    <div className="frame">
      <header className="frame__bar">
        <span className="wordmark">PhraseTab</span>
        <nav className="frame__nav" aria-label="PhraseTab">
          <a className="nav-button" href="saved.html">
            <BookmarkIcon />
            <span>Saved</span>
          </a>
          <a className="nav-button" href="settings.html" aria-label="Settings">
            <SettingsIcon />
            <span className="sr-only">Settings</span>
          </a>
        </nav>
      </header>

      <main className="frame__main">
        {item ? (
          <VocabularyCard
            key={item.id}
            item={item}
            translations={settings.translations}
            exposure={state.exposure}
          />
        ) : (
          <EmptyFilters />
        )}
      </main>

      <footer className="frame__footer">
        {item ? (
          <>
            <ActionBar
              status={state.itemStatus}
              saved={state.itemSaved}
              onLearning={markLearning}
              onKnown={markKnown}
              onToggleSave={toggleSave}
              onNext={next}
            />
            {state.knownCount + state.learningCount > 0 && (
              // Nothing to celebrate on a first run, and "0 known" is a worse
              // greeting than an empty line.
              <p className="counts eyebrow">
                {state.knownCount} known
                {state.learningCount > 0 ? ` · ${state.learningCount} learning` : ''}
              </p>
            )}
          </>
        ) : null}
      </footer>
    </div>
  );
}

/**
 * Shown when the user's filters match nothing. An empty screen is an
 * invitation to act, so it names the cause and links straight to the fix.
 */
function EmptyFilters() {
  return (
    <div className="entry entry--empty">
      <p className="eyebrow">Nothing to show</p>
      <h1 className="entry__term entry__term--empty">No matches</h1>
      <p className="entry__definition">
        Your content and difficulty filters rule out every item in the library. Turn a
        level back on to start again.
      </p>
      <p>
        <a className="button" href="settings.html">
          Open settings
        </a>
      </p>
    </div>
  );
}
