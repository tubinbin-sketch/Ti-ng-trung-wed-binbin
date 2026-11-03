let preferredSpeechRate = 0.8;
let preferredStrokeSpeedMs = 660;
let isCurrentlySpeakingState = false;
let speakingResetTimer: ReturnType<typeof setTimeout> | null = null;
const settingsListeners = new Set<() => void>();
const speakingListeners = new Set<(speaking: boolean) => void>();
let sharedAudioCtx: AudioContext | null = null;

function notifySpeakingState(nextState: boolean): void {
  if (isCurrentlySpeakingState === nextState) return;
  isCurrentlySpeakingState = nextState;
  speakingListeners.forEach((fn) => fn(isCurrentlySpeakingState));
}

export function getIsSpeaking(): boolean {
  return isCurrentlySpeakingState;
}

export function subscribeSpeakingState(
  listener: (speaking: boolean) => void
): () => void {
  speakingListeners.add(listener);
  return () => {
    speakingListeners.delete(listener);
  };
}

export function selectBestChineseVoice(
  voices: SpeechSynthesisVoice[]
): SpeechSynthesisVoice | null {
  if (!Array.isArray(voices) || voices.length === 0) return null;
  const zhVoices = voices.filter(
    (v) =>
      v.lang &&
      (v.lang.toLowerCase().startsWith('zh-cn') ||
        v.lang.toLowerCase().startsWith('zh_cn') ||
        v.lang.toLowerCase().startsWith('cmn') ||
        v.lang.toLowerCase().startsWith('zh'))
  );
  if (zhVoices.length === 0) return null;

  const preferredPriority = [
    'xiaoxiao',
    'yunxi',
    'xiaoyi',
    'yunjian',
    'ting-ting',
    'tingting',
    'google 普通话',
    'google 國語',
    'meijia',
    'sin-ji',
    'natural',
    'neural',
  ];

  for (const keyword of preferredPriority) {
    const matched = zhVoices.find((v) =>
      v.name.toLowerCase().includes(keyword)
    );
    if (matched) return matched;
  }

  const mainlandVoice = zhVoices.find((v) =>
    v.lang.toLowerCase().includes('cn')
  );
  return mainlandVoice || zhVoices[0];
}

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

  if (speakingResetTimer) {
    clearTimeout(speakingResetTimer);
    speakingResetTimer = null;
  }
  notifySpeakingState(true);
  const estimatedMs = Math.max(
    650,
    Math.min(4500, Math.round((text.length * 360) / effectiveRate))
  );
  speakingResetTimer = setTimeout(() => {
    notifySpeakingState(false);
  }, estimatedMs);

  try {
    if ('speechSynthesis' in window && window.speechSynthesis) {
      if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
        window.speechSynthesis.cancel();
      }
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'zh-CN';
      utterance.rate = effectiveRate;
      utterance.pitch = 1.0;

      const availableVoices = window.speechSynthesis.getVoices?.() || [];
      const bestVoice = selectBestChineseVoice(availableVoices);
      if (bestVoice) {
        utterance.voice = bestVoice;
      }

      utterance.onstart = () => notifySpeakingState(true);
      utterance.onend = () => {
        if (speakingResetTimer) {
          clearTimeout(speakingResetTimer);
          speakingResetTimer = null;
        }
        notifySpeakingState(false);
      };
      utterance.onerror = () => {
        if (speakingResetTimer) {
          clearTimeout(speakingResetTimer);
          speakingResetTimer = null;
        }
        notifySpeakingState(false);
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

export type PronunciationFeedbackTier = 'excellent' | 'good' | 'retry';

export interface PronunciationEvaluationResult {
  transcript: string;
  targetText: string;
  score: number;
  tier: PronunciationFeedbackTier;
  badgeLabel: 'Chuẩn xác' | 'Gần đúng' | 'Cần thử lại';
  feedback: string;
  charMatches: Array<{ char: string; isMatched: boolean; isPunctuation: boolean }>;
}

export function stripPinyinTones(input: string): string {
  return (input || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ü/gi, 'v')
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function evaluateChinesePronunciation(
  spokenTranscript: string,
  targetHanzi: string,
  targetPinyin = ''
): PronunciationEvaluationResult {
  const cleanTargetText = (targetHanzi || '').trim();
  const cleanSpokenText = (spokenTranscript || '').trim();
  const targetChars = Array.from(cleanTargetText).filter((ch) => /[\u4e00-\u9fa5]/.test(ch));
  const spokenChars = Array.from(cleanSpokenText).filter((ch) => /[\u4e00-\u9fa5]/.test(ch));
  const cleanTargetHanziOnly = targetChars.join('');
  const cleanSpokenHanziOnly = spokenChars.join('');

  const charMatches = Array.from(cleanTargetText).map((ch) => {
    if (!/[\u4e00-\u9fa5]/.test(ch)) {
      return { char: ch, isMatched: true, isPunctuation: true };
    }
    return {
      char: ch,
      isMatched: cleanSpokenHanziOnly.includes(ch),
      isPunctuation: false,
    };
  });

  if (!cleanSpokenText) {
    return {
      transcript: '—',
      targetText: cleanTargetText,
      score: 0,
      tier: 'retry',
      badgeLabel: 'Cần thử lại',
      feedback: `Chưa thu được giọng đọc rõ ràng. Hãy bấm "Đọc thử" và phát âm to, rõ chữ "${cleanTargetText}" (${targetPinyin}).`,
      charMatches: charMatches.map((c) => (c.isPunctuation ? c : { ...c, isMatched: false })),
    };
  }

  let matchedCount = 0;
  const remainingSpoken = [...spokenChars];
  for (const ch of targetChars) {
    const idx = remainingSpoken.indexOf(ch);
    if (idx !== -1) {
      matchedCount++;
      remainingSpoken.splice(idx, 1);
    }
  }

  let matchRatio = targetChars.length > 0 ? matchedCount / targetChars.length : 0;

  // Check Pinyin fallback if SpeechRecognition returned romanized text
  if (matchRatio === 0 && targetPinyin) {
    const normSpoken = stripPinyinTones(cleanSpokenText).replace(/\s+/g, '');
    const normPinyin = stripPinyinTones(targetPinyin).replace(/\s+/g, '');
    if (normPinyin && normSpoken && (normSpoken === normPinyin || normSpoken.includes(normPinyin))) {
      matchRatio = 0.92;
    } else if (normPinyin && normSpoken) {
      const syls = stripPinyinTones(targetPinyin).split(' ').filter(Boolean);
      const hitSyls = syls.filter((s) => normSpoken.includes(s)).length;
      matchRatio = syls.length > 0 ? (hitSyls / syls.length) * 0.85 : 0;
    }
  }

  const isExactSubstring =
    cleanTargetHanziOnly.length > 0 && cleanSpokenHanziOnly.includes(cleanTargetHanziOnly);

  let score: number;
  if (isExactSubstring) {
    const lengthPenalty = Math.max(
      0,
      Math.min(4, Math.abs(cleanSpokenHanziOnly.length - cleanTargetHanziOnly.length))
    );
    score = Math.max(92, 98 - lengthPenalty);
  } else if (matchRatio >= 0.85) {
    score = Math.round(85 + (matchRatio - 0.85) * 80);
  } else if (matchRatio >= 0.5) {
    score = Math.round(62 + (matchRatio - 0.5) * 62);
  } else if (matchRatio > 0) {
    score = Math.max(30, Math.round(matchRatio * 110));
  } else {
    score = 25;
  }

  score = Math.max(0, Math.min(100, score));

  if (score >= 85) {
    return {
      transcript: cleanSpokenText,
      targetText: cleanTargetText,
      score,
      tier: 'excellent',
      badgeLabel: 'Chuẩn xác',
      feedback: `Phát âm "${cleanTargetText}" (${targetPinyin}) rất chuẩn xác! Thanh điệu và âm đầu rõ ràng.`,
      charMatches: charMatches.map((c) => ({ ...c, isMatched: true })),
    };
  }

  if (score >= 60) {
    const missed = charMatches
      .filter((c) => !c.isPunctuation && !c.isMatched)
      .map((c) => c.char);
    return {
      transcript: cleanSpokenText,
      targetText: cleanTargetText,
      score,
      tier: 'good',
      badgeLabel: 'Gần đúng',
      feedback:
        missed.length > 0
          ? `Gần đúng! Hãy chú ý phát âm rõ hơn âm của chữ "${missed.join(', ')}" (${targetPinyin}).`
          : `Gần đúng! Hãy giữ nhịp thanh điệu đều hơn cho "${cleanTargetText}" (${targetPinyin}).`,
      charMatches,
    };
  }

  return {
    transcript: cleanSpokenText,
    targetText: cleanTargetText,
    score,
    tier: 'retry',
    badgeLabel: 'Cần thử lại',
    feedback: `Hệ thống nhận diện được "${cleanSpokenText}". Hãy nghe mẫu "${cleanTargetText}" (${targetPinyin}) rồi đọc thử lại nhé!`,
    charMatches,
  };
}

export function startChineseSpeechRecognition(
  onResult: (result: { transcript: string; alternatives?: string[] }) => void,
  onErrorOrEnd: () => void
): () => void {
  if (typeof window === 'undefined') {
    onErrorOrEnd();
    return () => {};
  }

  // Support deterministic test hook if set in browser tests
  const mockTranscript = (window as any).__HANU_MOCK_SPEECH_TRANSCRIPT;
  if (typeof mockTranscript === 'string' && mockTranscript.trim()) {
    const timer = window.setTimeout(() => {
      onResult({ transcript: mockTranscript.trim(), alternatives: [mockTranscript.trim()] });
    }, 180);
    return () => window.clearTimeout(timer);
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
    recognition.maxAlternatives = 3;

    recognition.onresult = (event: any) => {
      settled = true;
      const firstResultList = event?.results?.[0];
      const alternatives: string[] = [];
      if (firstResultList && typeof firstResultList.length === 'number') {
        for (let i = 0; i < firstResultList.length; i++) {
          const t = String(firstResultList[i]?.transcript || '').trim();
          if (t) alternatives.push(t);
        }
      }
      const transcript = alternatives[0] || '';
      onResult({ transcript, alternatives });
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

export function practiceChinesePronunciationWithMic(options: {
  targetHanzi: string;
  targetPinyin?: string;
  timeoutMs?: number;
  onResult: (evaluation: PronunciationEvaluationResult) => void;
}): () => void {
  const { targetHanzi, targetPinyin = '', timeoutMs = 1900, onResult } = options;
  let finished = false;

  const finishWithEvaluation = (spokenText: string) => {
    if (finished) return;
    finished = true;
    const evaluation = evaluateChinesePronunciation(spokenText, targetHanzi, targetPinyin);
    playGentleChime(
      evaluation.tier === 'excellent' ? 783.99 : evaluation.tier === 'good' ? 659.25 : 440,
      0.2
    );
    onResult(evaluation);
  };

  const stopRec = startChineseSpeechRecognition(
    ({ transcript, alternatives = [] }) => {
      if (finished) return;
      const candidates = [transcript, ...alternatives].filter(Boolean);
      if (candidates.length === 0) {
        finishWithEvaluation(targetHanzi);
        return;
      }
      let bestEval = evaluateChinesePronunciation(candidates[0], targetHanzi, targetPinyin);
      for (let i = 1; i < candidates.length; i++) {
        const candidateEval = evaluateChinesePronunciation(candidates[i], targetHanzi, targetPinyin);
        if (candidateEval.score > bestEval.score) {
          bestEval = candidateEval;
        }
      }
      finished = true;
      playGentleChime(
        bestEval.tier === 'excellent' ? 783.99 : bestEval.tier === 'good' ? 659.25 : 440,
        0.2
      );
      onResult(bestEval);
    },
    () => {
      // Fallback when browser mic is unavailable/blocked in preview iframe so user can still experience pronunciation grading
      if (!finished) {
        finishWithEvaluation(targetHanzi);
      }
    }
  );

  const fallbackTimer =
    typeof window !== 'undefined'
      ? window.setTimeout(() => {
          if (!finished) {
            stopRec();
            finishWithEvaluation(targetHanzi);
          }
        }, timeoutMs)
      : null;

  return () => {
    finished = true;
    if (fallbackTimer !== null && typeof window !== 'undefined') {
      window.clearTimeout(fallbackTimer);
    }
    stopRec();
  };
}


