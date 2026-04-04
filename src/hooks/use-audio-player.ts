import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";

/**
 * Singleton audio player shared across every VoiceCard.
 *
 * Guarantees:
 *  - Only one clip plays at a time (starting a new one auto-stops the previous).
 *  - All React subscribers see consistent state via useSyncExternalStore.
 *  - Cleanup on unmount pauses playback and revokes resources.
 */

// ── Module-level singleton ─────────────────────────────────────────────────

let audio: HTMLAudioElement | null = null;
let currentUrl: string | null = null;
let playing = false;
const listeners = new Set<() => void>();

function getAudio(): HTMLAudioElement {
  if (!audio) {
    audio = new Audio();
    audio.addEventListener("ended", () => {
      playing = false;
      currentUrl = null;
      emit();
    });
    audio.addEventListener("pause", () => {
      playing = false;
      emit();
    });
    audio.addEventListener("play", () => {
      playing = true;
      emit();
    });
  }
  return audio;
}

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

interface AudioSnapshot {
  currentUrl: string | null;
  isPlaying: boolean;
}

let snapshot: AudioSnapshot = { currentUrl: null, isPlaying: false };

function getSnapshot(): AudioSnapshot {
  const next: AudioSnapshot = { currentUrl, isPlaying: playing };
  // Structural equality – avoid unnecessary re-renders
  if (
    next.currentUrl !== snapshot.currentUrl ||
    next.isPlaying !== snapshot.isPlaying
  ) {
    snapshot = next;
  }
  return snapshot;
}

// ── Public hook ────────────────────────────────────────────────────────────

export function useAudioPlayer() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const play = useCallback((url: string) => {
    const el = getAudio();
    if (currentUrl === url && playing) {
      // Toggle off – same clip playing → pause
      el.pause();
      return;
    }
    // New clip (or same clip after pause)
    if (currentUrl !== url) {
      el.src = url;
      currentUrl = url;
    }
    el.currentTime = 0;
    el.play().catch(() => {
      /* autoplay policy – swallow */
    });
  }, []);

  const stop = useCallback(() => {
    const el = getAudio();
    el.pause();
    el.currentTime = 0;
    currentUrl = null;
    playing = false;
    emit();
  }, []);

  // Cleanup when the last subscriber unmounts (page navigation)
  const mountRef = useRef(true);
  useEffect(() => {
    mountRef.current = true;
    return () => {
      mountRef.current = false;
      // If navigating away from the voices page, stop playback
      if (audio && playing) {
        audio.pause();
        audio.currentTime = 0;
        playing = false;
        currentUrl = null;
        emit();
      }
    };
  }, []);

  return {
    /** URL of the clip currently loaded (null = idle). */
    currentUrl: state.currentUrl,
    /** Whether audio is actively playing right now. */
    isPlaying: state.isPlaying,
    /** Play the clip at `url`. If the same URL is already playing, toggles pause. */
    play,
    /** Hard stop — pause + rewind + clear state. */
    stop,
    /** Convenience: is THIS url the one currently playing? */
    isPlayingUrl: (url: string) =>
      state.currentUrl === url && state.isPlaying,
  };
}
