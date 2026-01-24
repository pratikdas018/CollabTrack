let audioCtx = null;

export const playNotificationSound = (type = 'info') => {
  try {
    // Initialize AudioContext lazily to comply with browser autoplay policies
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }

    // Resume context if it was suspended (common in some browsers)
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    const now = audioCtx.currentTime;

    if (type === 'success') {
      // Upward chirp
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.1);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
      osc.start(now);
      osc.stop(now + 0.5);
    } else if (type === 'error') {
      // Low buzz
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.linearRampToValueAtTime(100, now + 0.2);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
    } else if (type === 'warning') {
      // Double beep
      osc.type = 'square';
      osc.frequency.setValueAtTime(800, now);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.setValueAtTime(0, now + 0.1);
      gain.gain.setValueAtTime(0.05, now + 0.15);
      gain.gain.setValueAtTime(0, now + 0.25);
      osc.start(now);
      osc.stop(now + 0.25);
    } else {
      // Default sine blip
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.00001, now + 0.5);
      osc.start(now);
      osc.stop(now + 0.5);
    }

    // Cleanup nodes after playing to prevent memory leaks
    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
    };

  } catch (e) {
    console.error("Audio playback failed", e);
  }
};