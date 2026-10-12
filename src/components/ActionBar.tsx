import { ArrowRightIcon, StarIcon } from './Icons';
import type { LearningStatus } from '@/storage/types';

interface ActionBarProps {
  status: LearningStatus;
  saved: boolean;
  onLearning: () => void;
  onKnown: () => void;
  onToggleSave: () => void;
  onNext: () => void;
}

/**
 * The four actions from PLAN §8.
 *
 * Text buttons on a hairline rule rather than pills: the entry above is the
 * only thing with visual weight, and a row of filled buttons would pull the eye
 * straight past the word. Each one shows its keyboard shortcut, which is both
 * a discovery aid and an honest signal that this page is keyboard-driven.
 *
 * `Learning` and `I know this` are toggles reflecting stored state — pressing
 * the active one again is a no-op rather than an unmarked surprise, so
 * `aria-pressed` carries the truth.
 *
 * The visible key hints are `aria-hidden`: folding them into each button's
 * accessible name would have screen readers announce "Save S". The shortcut is
 * exposed through `aria-keyshortcuts` instead, which is the attribute for it.
 */
export function ActionBar({
  status,
  saved,
  onLearning,
  onKnown,
  onToggleSave,
  onNext,
}: ActionBarProps) {
  return (
    <div className="actions">
      <div className="actions__group">
        <button
          type="button"
          className={
            status === 'learning' ? 'action action--learning is-active' : 'action action--learning'
          }
          onClick={onLearning}
          aria-pressed={status === 'learning'}
          aria-keyshortcuts="L"
        >
          <span>Learning</span>
          <kbd className="action__key" aria-hidden="true">
            L
          </kbd>
        </button>

        <button
          type="button"
          className={status === 'known' ? 'action action--known is-active' : 'action action--known'}
          onClick={onKnown}
          aria-pressed={status === 'known'}
          aria-keyshortcuts="K"
        >
          <span>I know this</span>
          <kbd className="action__key" aria-hidden="true">
            K
          </kbd>
        </button>
      </div>

      <div className="actions__group">
        <button
          type="button"
          className={saved ? 'action action--save is-active' : 'action action--save'}
          onClick={onToggleSave}
          aria-pressed={saved}
          aria-keyshortcuts="S"
        >
          <StarIcon filled={saved} className="action__icon" />
          <span>{saved ? 'Saved' : 'Save'}</span>
          <kbd className="action__key" aria-hidden="true">
            S
          </kbd>
        </button>

        <button
          type="button"
          className="action action--next"
          onClick={onNext}
          aria-keyshortcuts="N"
        >
          <span>Next</span>
          <ArrowRightIcon className="action__icon" />
          <kbd className="action__key" aria-hidden="true">
            N
          </kbd>
        </button>
      </div>
    </div>
  );
}
