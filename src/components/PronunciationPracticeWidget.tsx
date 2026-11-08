import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle2, MicOff, Mic, RefreshCw, Sparkles, Volume2, X } from 'lucide-react';
import {
  describeSpeechFailure,
  practiceChinesePronunciationWithMic,
  PronunciationEvaluationResult,
  speakChinese,
  SpeechFailureReason,
} from '../utils/speech';
import { recordDailyWordReview } from '../utils/hskStudyHelpers';

export function usePronunciationPractice(
  targetHanzi: string,
  targetPinyin: string,
  wordIdForStreak?: string
) {
  const [isRecording, setIsRecording] = useState(false);
  const [result, setResult] = useState<PronunciationEvaluationResult | null>(null);
  const [error, setError] = useState<SpeechFailureReason | null>(null);
  const stopRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    setIsRecording(false);
    setResult(null);
    setError(null);
    if (stopRef.current) {
      stopRef.current();
      stopRef.current = null;
    }
  }, [targetHanzi]);

  useEffect(() => {
    return () => {
      if (stopRef.current) {
        stopRef.current();
        stopRef.current = null;
      }
    };
  }, []);

  const startOrStopPractice = () => {
    if (isRecording) {
      if (stopRef.current) {
        stopRef.current();
        stopRef.current = null;
      }
      setIsRecording(false);
      return;
    }

    setResult(null);
    setError(null);
    setIsRecording(true);
    stopRef.current = practiceChinesePronunciationWithMic({
      targetHanzi,
      targetPinyin,
      onResult: (evalRes) => {
        setIsRecording(false);
        setResult(evalRes);
        // Only a real attempt counts towards today's study goal.
        recordDailyWordReview(wordIdForStreak || targetHanzi);
      },
      onUnavailable: (reason) => {
        setIsRecording(false);
        stopRef.current = null;
        if (reason !== 'aborted') setError(reason);
      },
    });
  };

  const clearResult = () => {
    setResult(null);
    setError(null);
  };

  return {
    isRecording,
    result,
    error,
    startOrStopPractice,
    clearResult,
  };
}

export function PronunciationPracticeButton({
  isRecording,
  onClick,
  testId = 'practice-pronunciation-btn',
  className = '',
  compact = false,
}: {
  isRecording: boolean;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  testId?: string;
  className?: string;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      onClick={onClick}
      aria-pressed={isRecording}
      title="Thu âm giọng đọc tiếng Trung (zh-CN) và chấm điểm phát âm"
      className={`inline-flex items-center gap-1.5 ${
        compact ? 'h-9 px-3 text-xs sm:text-sm' : 'h-10 px-3.5 text-sm'
      } rounded-xl border font-medium transition-colors cursor-pointer whitespace-nowrap ${
        isRecording
          ? 'bg-accent-soft border-accent/40 text-accent animate-pulse'
          : 'border-border-strong bg-surface hover:bg-surface-2 text-ink'
      } ${className}`}
    >
      <Mic className={`w-4 h-4 shrink-0 ${isRecording ? 'text-accent' : 'text-primary'}`} />
      <span>{isRecording ? 'Đang nghe (zh-CN)…' : '🎙️ Đọc thử'}</span>
    </button>
  );
}

export function PronunciationResultBanner({
  result,
  error = null,
  targetHanzi,
  onRetry,
  onClose,
  testId = 'pronunciation-score-result',
}: {
  result: PronunciationEvaluationResult | null;
  /** Why nothing could be graded (mic blocked, no speech…). Shown instead of a score. */
  error?: SpeechFailureReason | null;
  targetHanzi: string;
  onRetry?: () => void;
  onClose?: () => void;
  testId?: string;
}) {
  if (!result && error) {
    return (
      <div
        role="status"
        data-testid={`${testId}-unavailable`}
        className="rounded-2xl bg-surface-2 border border-border p-3.5 text-left flex items-start gap-2.5 animate-fade-in"
      >
        <MicOff className="w-4 h-4 mt-0.5 text-ink-muted shrink-0" />
        <p className="flex-1 text-sm text-ink-muted leading-relaxed">{describeSpeechFailure(error)}</p>
        <div className="flex items-center gap-1 shrink-0">
          {onRetry && error !== 'unsupported' && (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg text-xs font-medium text-primary hover:bg-primary-soft transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Thử lại</span>
            </button>
          )}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng thông báo"
              className="w-8 h-8 rounded-lg grid place-items-center text-ink-subtle hover:text-ink hover:bg-surface transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    );
  }
  if (!result) return null;

  const badgeTone =
    result.tier === 'excellent'
      ? 'bg-success-soft text-success border-success/30'
      : result.tier === 'good'
      ? 'bg-highlight/20 text-gold border-highlight/40'
      : 'bg-accent-soft text-accent border-accent/30';

  const scoreTone =
    result.tier === 'excellent'
      ? 'text-success'
      : result.tier === 'good'
      ? 'text-gold'
      : 'text-accent';

  return (
    <div
      data-testid={testId}
      className="rounded-2xl bg-surface-2 border border-border p-3.5 text-left space-y-2 animate-fade-in"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span
            data-testid={`${testId}-badge`}
            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badgeTone}`}
          >
            {result.tier === 'excellent' ? (
              <CheckCircle2 className="w-3.5 h-3.5" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            <span>{result.badgeLabel}</span>
          </span>
          <span
            data-testid={`${testId}-score`}
            className={`text-sm font-bold tabular-nums ${scoreTone}`}
          >
            Độ chính xác: {result.score}%
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => speakChinese(targetHanzi)}
            className="inline-flex items-center gap-1 h-7 px-2 rounded-lg text-xs font-medium text-primary hover:bg-primary-soft/60 transition-colors cursor-pointer"
            title="Nghe lại phát âm mẫu"
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>Nghe mẫu</span>
          </button>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center gap-1 h-7 px-2 rounded-lg text-xs font-medium text-ink-muted hover:text-ink hover:bg-surface transition-colors cursor-pointer"
              title="Đọc thử lại"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Thử lại</span>
            </button>
          )}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng kết quả chấm phát âm"
              className="w-7 h-7 rounded-lg grid place-items-center text-ink-subtle hover:text-ink hover:bg-surface transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-xs sm:text-sm">
        <span className="text-ink-muted">
          Nhận diện (zh-CN):{' '}
          <strong className="font-hanzi text-base text-ink" data-testid={`${testId}-transcript`}>
            {result.transcript}
          </strong>
        </span>
        {result.charMatches.length > 0 && (
          <span className="inline-flex items-center gap-1 text-xs text-ink-subtle">
            <span>Đối chiếu:</span>
            <span className="inline-flex items-center gap-0.5 font-hanzi text-sm">
              {result.charMatches.map((cm, idx) => (
                <span
                  key={`${cm.char}-${idx}`}
                  className={
                    cm.isPunctuation
                      ? 'text-ink-subtle'
                      : cm.isMatched
                      ? 'text-success font-semibold'
                      : 'text-accent underline decoration-wavy'
                  }
                >
                  {cm.char}
                </span>
              ))}
            </span>
          </span>
        )}
      </div>

      <p className="text-xs text-ink-muted leading-relaxed">{result.feedback}</p>
    </div>
  );
}
