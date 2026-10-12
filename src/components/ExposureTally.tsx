/**
 * The repetition meter.
 *
 * WordTab's whole product principle is that an item repeats before it rotates
 * (CLAUDE.md), and this is the only place that state is visible. It reads as
 * tally marks sitting at the end of the entry rule — the vernacular of a
 * printed dictionary rather than a progress bar, and quiet enough not to
 * compete with the headword.
 */

interface ExposureTallyProps {
  /** Views spent on the current item, 1-based. */
  current: number;
  /** Views the item gets before the selector rotates. */
  total: number;
}

/** Beyond this the marks stop being countable at a glance. */
const MAX_MARKS = 10;

export function ExposureTally({ current, total }: ExposureTallyProps) {
  const marks = Math.min(Math.max(total, 1), MAX_MARKS);
  const filled = Math.min(Math.max(current, 0), marks);
  const remaining = Math.max(marks - filled, 0);

  const label =
    remaining === 0
      ? `Seen ${filled} of ${marks} times. A new item comes next.`
      : `Seen ${filled} of ${marks} times before moving on.`;

  return (
    <span className="tally" title={label}>
      <span className="sr-only">{label}</span>
      {Array.from({ length: marks }, (_, index) => (
        <span
          key={index}
          aria-hidden="true"
          className={index < filled ? 'tally__mark tally__mark--on' : 'tally__mark'}
        />
      ))}
    </span>
  );
}
