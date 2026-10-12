import { useEffect, useRef, useState } from 'react';
import { SpeakerIcon } from './Icons';
import { isSpeechAvailable, speak, stopSpeaking } from '@/speech/speech';

interface ListenButtonProps {
  term: string;
}

/**
 * Pronounces the term with the browser's speech synthesis.
 *
 * Renders nothing at all when speech is unavailable: an inert button that
 * silently does nothing is worse than no button. Pressing while speaking stops
 * playback, so a mis-tap is always recoverable.
 */
export function ListenButton({ term }: ListenButtonProps) {
  const [speaking, setSpeaking] = useState(false);
  const available = useRef(isSpeechAvailable()).current;

  // Never leave an utterance running after the card rotates or the tab closes.
  useEffect(() => {
    return () => {
      stopSpeaking();
    };
  }, []);

  useEffect(() => {
    setSpeaking(false);
    stopSpeaking();
  }, [term]);

  if (!available) return null;

  const handleClick = () => {
    if (speaking) {
      stopSpeaking();
      setSpeaking(false);
      return;
    }
    const started = speak(term, { onEnd: () => setSpeaking(false) });
    setSpeaking(started);
  };

  return (
    <button
      type="button"
      className={speaking ? 'listen listen--speaking' : 'listen'}
      onClick={handleClick}
      aria-label={speaking ? `Stop pronouncing ${term}` : `Listen to ${term}`}
      title={speaking ? 'Stop' : 'Listen  ·  P'}
    >
      <SpeakerIcon />
    </button>
  );
}
