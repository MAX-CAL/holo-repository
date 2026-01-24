import { useCallback, useRef, useMemo } from 'react';

interface HapticOptions {
  duration?: number;
  debounceMs?: number;
}

// Helper to safely get userAgent
function getUserAgent(): string {
  if (typeof window !== 'undefined' && window.navigator) {
    return window.navigator.userAgent || '';
  }
  return '';
}

function isIOSDevice(): boolean {
  return /iPad|iPhone|iPod/.test(getUserAgent());
}

export function useHapticFeedback(options: HapticOptions = {}) {
  const { duration = 50, debounceMs = 150 } = options;
  const lastTrigger = useRef<number>(0);
  const audioContextRef = useRef<AudioContext | null>(null);

  const vibrate = useCallback(() => {
    const now = Date.now();
    
    // Debounce to prevent too frequent vibrations
    if (now - lastTrigger.current < debounceMs) {
      return false;
    }

    lastTrigger.current = now;

    // Try native vibration API first (works on Android)
    if (typeof window !== 'undefined' && 'vibrate' in window.navigator) {
      try {
        const result = window.navigator.vibrate(duration);
        if (result) return true;
      } catch {
        // Silently fail, try fallback
      }
    }

    // iOS Safari fallback: use AudioContext with silent audio + haptic
    // This triggers the taptic engine on supported iOS devices
    try {
      if (isIOSDevice()) {
        // Create AudioContext if not exists
        if (!audioContextRef.current) {
          const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
          audioContextRef.current = new AudioContextClass();
        }
        
        const ctx = audioContextRef.current;
        
        // Resume context if suspended (required for iOS)
        if (ctx.state === 'suspended') {
          ctx.resume();
        }
        
        // Create a very short, silent oscillator to trigger haptic
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        // Make it essentially silent
        gainNode.gain.value = 0.001;
        oscillator.frequency.value = 1;
        
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.01);
        
        return true;
      }
    } catch {
      // AudioContext not available
    }

    return false;
  }, [duration, debounceMs]);

  const isSupported = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return 'vibrate' in window.navigator || isIOSDevice();
  }, []);

  return { vibrate, isSupported };
}