/**
 * Pronunciation via the browser's built-in speech synthesis.
 *
 * MVP deliberately uses no audio API and no network (PLAN §8): everything here
 * runs on voices the browser already has. Speech synthesis is genuinely
 * unavailable on some platforms and some Linux builds ship zero voices, so
 * every entry point is failure-safe and `isSpeechAvailable()` lets the UI hide
 * the control rather than offer something that does nothing.
 */

/** Do we have a usable speech synthesis implementation? */
export function isSpeechAvailable(): boolean {
  return (
    typeof window !== 'undefined' &&
    'speechSynthesis' in window &&
    typeof window.SpeechSynthesisUtterance === 'function'
  );
}

/**
 * Voice lists load asynchronously in Chrome: the first call to `getVoices()`
 * usually returns an empty array, and the real list arrives with the
 * `voiceschanged` event. We cache it so picking a voice stays synchronous.
 */
let cachedVoices: SpeechSynthesisVoice[] = [];

function refreshVoices(): SpeechSynthesisVoice[] {
  if (!isSpeechAvailable()) return [];
  try {
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) cachedVoices = voices;
  } catch {
    // Some environments throw rather than returning an empty list.
  }
  return cachedVoices;
}

/**
 * Start listening for the voice list. Call once at app start; returns an
 * unsubscribe function.
 */
export function primeVoices(): () => void {
  if (!isSpeechAvailable()) return () => {};
  refreshVoices();
  const handler = () => refreshVoices();
  window.speechSynthesis.addEventListener('voiceschanged', handler);
  return () => window.speechSynthesis.removeEventListener('voiceschanged', handler);
}

/**
 * Pick an English voice, preferring one that matches the user's own locale so
 * a British user hears British English. Returns null to let the browser choose.
 */
function pickEnglishVoice(): SpeechSynthesisVoice | null {
  const voices = refreshVoices();
  if (voices.length === 0) return null;

  const english = voices.filter((voice) => voice.lang.toLowerCase().startsWith('en'));
  if (english.length === 0) return null;

  const locale = (navigator.language || 'en-US').toLowerCase();
  return (
    english.find((voice) => voice.lang.toLowerCase() === locale) ??
    english.find((voice) => voice.default) ??
    english[0] ??
    null
  );
}

export interface SpeakOptions {
  /** Called when the utterance finishes, errors, or could not start. */
  onEnd?: () => void;
  /** Slightly slower than default reads more clearly for learners. */
  rate?: number;
}

/**
 * Speak an English term. Returns false when speech is unavailable or failed to
 * start, so the caller can avoid showing a "speaking" state that never ends.
 */
export function speak(text: string, options: SpeakOptions = {}): boolean {
  const { onEnd, rate = 0.92 } = options;
  if (!isSpeechAvailable() || text.trim().length === 0) return false;

  try {
    // Cancel anything queued so rapid presses do not stack up.
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = rate;

    const voice = pickEnglishVoice();
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    }

    if (onEnd) {
      utterance.addEventListener('end', onEnd);
      utterance.addEventListener('error', onEnd);
    }

    window.speechSynthesis.speak(utterance);
    return true;
  } catch (error) {
    console.warn('[WordTab] Speech synthesis failed.', error);
    onEnd?.();
    return false;
  }
}

/** Stop any in-progress speech. Safe to call when nothing is speaking. */
export function stopSpeaking(): void {
  if (!isSpeechAvailable()) return;
  try {
    window.speechSynthesis.cancel();
  } catch {
    // Nothing useful to do; the page must not break over a cancelled utterance.
  }
}
