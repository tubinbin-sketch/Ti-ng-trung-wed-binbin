let preferredSpeechRate = 0.8;
let preferredStrokeSpeedMs = 660;
const settingsListeners = new Set<() => void>();
let sharedAudioCtx: AudioContext | null = null;

export function getPreferredSpeechRate(): number {
  return preferredSpeechRate;
}

export function setPreferredSpeechRate(rate: number): void {
  const clamped = Math.max(0.5, Math.min(1.5, Math.round(rate * 100) / 100));
  preferredSpeechRate = clamped;
  settingsListeners.forEach((fn) => fn());
}

export function getPreferredStrokeSpeedMs(): number {
  return preferredStrokeSpeedMs;
}

export function setPreferredStrokeSpeedMs(ms: number): void {
  const clamped = Math.max(300, Math.min(1200, Math.round(ms)));
  preferredStrokeSpeedMs = clamped;
  settingsListeners.forEach((fn) => fn());
}

export function subscribeSlideSettings(listener: () => void): () => void {
  settingsListeners.add(listener);
  return () => {
    settingsListeners.delete(listener);
  };
}

export function speakChinese(text: string, customRate?: number): void {
  if (typeof window === 'undefined' || !text) return;

  const effectiveRate =
    typeof customRate === 'number'
      ? Math.max(0.45, Math.min(1.5, customRate))
      : preferredSpeechRate;

  try {
    if ('speechSynthesis' in window && window.speechSynthesis) {
      if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
        window.speechSynthesis.cancel();
      }
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'zh-CN';
      utterance.rate = effectiveRate;
      utterance.pitch = 1.0;
      utterance.onerror = () => {
        // Silently ignore canceled/interrupted speech events
      };
      window.speechSynthesis.speak(utterance);
    }
  } catch {
    // Fallback silently if speechSynthesis is restricted
  }

  playGentleChime(528, 0.12);
}

export function playGentleChime(freq = 587.33, durationSec = 0.16): void {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
      sharedAudioCtx = new AudioCtx();
    }
    if (sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx.resume().catch(() => {});
    }

    const ctx = sharedAudioCtx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(0.05, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationSec);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + durationSec);
  } catch {
    // Ignore audio context errors when autoplay blocked
  }
}

export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  );
}

export function startChineseSpeechRecognition(
  onResult: (result: { transcript: string }) => void,
  onErrorOrEnd: () => void
): () => void {
  if (typeof window === 'undefined') {
    onErrorOrEnd();
    return () => {};
  }
  const SpeechRecognitionAPI =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!SpeechRecognitionAPI) {
    onErrorOrEnd();
    return () => {};
  }

  let settled = false;
  try {
    const recognition = new SpeechRecognitionAPI();
    recognition.lang = 'zh-CN';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      settled = true;
      const transcript = String(event?.results?.[0]?.[0]?.transcript || '').trim();
      onResult({ transcript });
    };

    recognition.onerror = () => {
      if (!settled) {
        settled = true;
        onErrorOrEnd();
      }
    };

    recognition.onend = () => {
      if (!settled) {
        settled = true;
        onErrorOrEnd();
      }
    };

    recognition.start();
    return () => {
      try {
        recognition.stop();
      } catch {
        // ignore
      }
    };
  } catch {
    onErrorOrEnd();
    return () => {};
  }
}

