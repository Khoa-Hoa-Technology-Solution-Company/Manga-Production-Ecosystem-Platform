let audioCtx: AudioContext | null = null;

/**
 * Plays a premium two-tone notification sound using the browser's Web Audio API.
 * This ensures clean, instant audio without requesting external files.
 */
export function playNotificationSound() {
  // Check if notification sound is enabled in localStorage
  const isSoundEnabled = localStorage.getItem('mangaflow-notification-sound') !== 'false';
  if (!isSoundEnabled) return;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    if (!audioCtx) {
      audioCtx = new AudioContextClass();
    }

    // Resume context if suspended (common browser autoplay restriction)
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const now = audioCtx.currentTime;

    // First chime: D5 note (587.33 Hz) - short & sweet
    const osc1 = audioCtx.createOscillator();
    const gain1 = audioCtx.createGain();
    
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now);
    
    gain1.gain.setValueAtTime(0.08, now);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);
    
    osc1.connect(gain1);
    gain1.connect(audioCtx.destination);
    
    osc1.start(now);
    osc1.stop(now + 0.15);

    // Second chime: A5 note (880.00 Hz) - higher pitch, longer fade
    const osc2 = audioCtx.createOscillator();
    const gain2 = audioCtx.createGain();
    
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880.00, now + 0.08);
    
    gain2.gain.setValueAtTime(0.08, now + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.40);
    
    osc2.connect(gain2);
    gain2.connect(audioCtx.destination);
    
    osc2.start(now + 0.08);
    osc2.stop(now + 0.40);
  } catch (error) {
    console.warn('Auto-play blocked or audio context failed to initialize:', error);
  }
}
