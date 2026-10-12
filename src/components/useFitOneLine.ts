import { useLayoutEffect, type RefObject } from 'react';

/** Below this size (px) a one-line headword stops reading as a headword. */
const MIN_ONE_LINE_PX = 34;

/**
 * Shrink a headword just enough to fit on one line.
 *
 * The stylesheet sets the largest size; if the text overflows at that size it
 * is scaled down to fit, as long as it stays at or above `MIN_ONE_LINE_PX`.
 * Phrases too long for that fall back to the stylesheet's wrapped (balanced,
 * two-line) layout. Runs before paint, so the resize is never visible.
 */
export function useFitOneLine(ref: RefObject<HTMLElement | null>, text: string): void {
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;

    const fit = () => {
      element.style.fontSize = '';
      element.style.whiteSpace = 'nowrap';

      const available = element.clientWidth;
      const needed = element.scrollWidth;
      // Zero widths mean no layout (jsdom, hidden tab): leave the CSS alone.
      if (available === 0 || needed === 0) {
        element.style.whiteSpace = '';
        return;
      }
      if (needed <= available) return;

      const current = parseFloat(getComputedStyle(element).fontSize);
      // Floor, with a 1px margin, so rounding can never cause a sliver of overflow.
      const fitted = Math.floor((current * available) / needed) - 1;
      if (fitted >= MIN_ONE_LINE_PX) {
        element.style.fontSize = `${fitted}px`;
      } else {
        element.style.whiteSpace = '';
      }
    };

    fit();

    // The bundled font may still be swapping in on the very first paint, and
    // the column width changes with the window.
    let cancelled = false;
    void document.fonts?.ready.then(() => {
      if (!cancelled) fit();
    });
    window.addEventListener('resize', fit);
    return () => {
      cancelled = true;
      window.removeEventListener('resize', fit);
    };
  }, [ref, text]);
}
