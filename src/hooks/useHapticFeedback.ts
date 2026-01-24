import { useCallback, useRef } from 'react';

interface HapticOptions {
  duration?: number;
  debounceMs?: number;
}

export function useHapticFeedback(options: HapticOptions = {}) {
  const { duration = 50, debounceMs = 150 } = options;
  const lastTrigger = useRef<number>(0);

  const vibrate = useCallback(() => {
    const now = Date.now();
    
    // Debounce to prevent too frequent vibrations
    if (now - lastTrigger.current < debounceMs) {
      return false;
    }

    // Check if vibration API is available
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate(duration);
        lastTrigger.current = now;
        return true;
      } catch (e) {
        console.warn('Haptic feedback not available:', e);
        return false;
      }
    }

    return false;
  }, [duration, debounceMs]);

  const isSupported = typeof navigator !== 'undefined' && 'vibrate' in navigator;

  return { vibrate, isSupported };
}
