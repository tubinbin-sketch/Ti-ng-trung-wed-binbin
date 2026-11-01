import React, { useMemo, useState } from 'react';
import {
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Volume2,
  ArrowRight,
  RotateCcw,
  X,
  Award,
} from 'lucide-react';
import { VocabSlide } from '../data/chineseData';
import {
  evaluateMeasureWordAttempt,
  generateMeasureWordChallenges,
  MeasureWordEvalResult,
} from '../utils/hskMeasureWordEngine';
import { playGentleChime, speakChinese } from '../utils/speech';
import { Dialog } from './ui/Dialog';

interface MeasureWordDrillModalProps {
  isOpen: boolean;
  slides: VocabSlide[];
  onClose: () => void;
}

export const MeasureWordDrillModal: React.FC<MeasureWordDrillModalProps> = ({
  isOpen,
  slides,
  onClose,
}) => {
  const challenges = useMemo(() => generateMeasureWordChallenges(slides), [slides]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [evalResult, setEvalResult] = useState<MeasureWordEvalResult | null>(null);
  const [score, setScore] = useState(0);
  const [answeredCount, setAnsweredCount] = useState(0);

  const currentItem = challenges[currentIdx % challenges.length];

  const handleSelectOption = (measureWord: string) => {
    if (evalResult) return;
    const res = evaluateMeasureWordAttempt(currentItem, measureWord);
    setEvalResult(res);
    setAnsweredCount((c) => c + 1);
    if (res.isCorrect) {
      setScore((s) => s + res.scoreDelta);
      playGentleChime(783.99, 0.22);
      speakChinese(currentItem.fullSentenceHanzi, 0.92);
    } else {
      playGentleChime(392, 0.16);
      speakChinese(currentItem.phraseHanzi, 0.9);
    }
  };

  const handleNextQuestion = () => {
    setEvalResult(null);
    setCurrentIdx((idx) => (idx + 1) % challenges.length);
  };

  const handleResetDrill = () => {
    setCurrentIdx(0);
    setEvalResult(null);
    setScore(0);
    setAnsweredCount(0);
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      labelledBy="measure-word-modal-title"
      maxWidthClass="max-w-2xl"
      testId="measure-word-drill-modal"
    >
      <div className="w-full rounded-3xl bg-canvas border border-border text-ink p-5 sm:p-6 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-border">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-gold">
              <BookOpen className="w-4 h-4 text-primary" />
              <span>CHUYÊN ĐỀ NGỮ PHÁP HSK 3.0 · <span lang="zh-CN">量词搭配</span></span>
            </div>
            <h3 id="measure-word-modal-title" className="text-lg sm:text-xl font-bold text-ink mt-0.5">
              Phản Xạ Lượng Từ &amp; Cụm Danh Từ Chuẩn Bản Xứ
            </h3>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-primary text-on-primary text-sm font-bold tabular-nums">
              <Award className="w-4 h-4" />
              <span>{score} điểm</span>
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng cửa sổ luyện lượng từ"
              className="p-2 rounded-xl text-ink-muted hover:bg-primary/10 hover:text-ink transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Question Progress & Target Noun Card */}
        <div className="rounded-2xl bg-surface border border-border p-4 space-y-3 shadow-2xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="px-2.5 py-0.5 rounded-lg bg-primary/10 text-primary text-sm font-bold">
              Câu {(currentIdx % challenges.length) + 1}/{challenges.length} · {currentItem.hskLevel}
            </span>
            <button
              type="button"
              onClick={() => speakChinese(currentItem.fullSentenceHanzi, 0.9)}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-primary text-on-primary text-sm font-bold cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            >
              <Volume2 className="w-4 h-4" />
              <span>Nghe câu mẫu</span>
            </button>
          </div>

          <div className="p-3.5 rounded-xl bg-canvas border border-border text-center space-y-1.5">
            <div className="text-sm font-semibold text-ink-muted">
              Chọn lượng từ thích hợp điền vào chỗ trống cho danh từ{' '}
              <strong lang="zh-CN" className="text-ink font-['Noto_Sans_SC']">
                {currentItem.nounHanzi} ({currentItem.nounPinyin} — {currentItem.nounMeaning})
              </strong>
              :
            </div>
            <div lang="zh-CN" className="font-['Noto_Sans_SC'] text-xl sm:text-2xl font-bold text-ink py-1">
              {currentItem.sentencePrefix}
              <span className="inline-flex items-center justify-center min-w-[44px] px-2.5 py-0.5 mx-1 rounded-lg bg-primary/10 border-2 border-dashed border-primary text-accent">
                {evalResult ? evalResult.correctMeasureWord : '？'}
              </span>
              {currentItem.sentenceSuffix}
            </div>
            <div className="text-sm text-ink-muted italic">
              “{currentItem.fullSentenceMeaning}”
            </div>
          </div>

          {/* 4 Measure Word Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {currentItem.options.map((opt) => {
              const isChosen = evalResult?.selectedMeasureWord === opt.measureWord;
              const isRightOption = opt.measureWord === currentItem.correctMeasureWord;
              let btnStyle = 'bg-surface hover:bg-canvas border-border text-ink';
              if (evalResult) {
                if (isRightOption) {
                  btnStyle = 'bg-success/10 border-success text-ink ring-2 ring-success/30';
                } else if (isChosen && !isRightOption) {
                  btnStyle = 'bg-danger/10 border-danger text-ink';
                }
              }
              return (
                <button
                  key={opt.measureWord}
                  type="button"
                  data-testid={`mw-option-${opt.measureWord}`}
                  onClick={() => handleSelectOption(opt.measureWord)}
                  className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer flex items-start justify-between gap-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${btnStyle}`}
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span lang="zh-CN" className="font-['Noto_Sans_SC'] text-2xl font-bold text-primary">
                        {opt.measureWord}
                      </span>
                      <span className="text-sm font-bold text-gold">({opt.pinyin})</span>
                    </div>
                    <p className="text-sm text-ink-muted leading-snug">{opt.usageHint}</p>
                  </div>
                  {evalResult && isRightOption && (
                    <CheckCircle2 className="w-5 h-5 text-success shrink-0 mt-0.5" />
                  )}
                  {evalResult && isChosen && !isRightOption && (
                    <AlertCircle className="w-5 h-5 text-danger shrink-0 mt-0.5" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Instant Pedagogical Explanation Banner */}
        {evalResult && (
          <div
            data-testid="measure-word-eval-banner"
            className={`p-3.5 rounded-2xl border text-sm space-y-1 ${
              evalResult.isCorrect
                ? 'bg-success/10 border-success/40 text-ink'
                : 'bg-warning/10 border-warning/40 text-ink'
            }`}
          >
            <div className="font-bold flex items-center gap-1.5">
              {evalResult.isCorrect ? (
                <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-warning shrink-0" />
              )}
              <span>{evalResult.feedbackVi}</span>
            </div>
            <div className="text-sm font-medium text-ink pt-1">
              Phiên âm cả câu: <strong>{currentItem.fullSentencePinyin}</strong>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border">
          <button
            type="button"
            onClick={handleResetDrill}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-surface hover:bg-primary/10 text-ink border border-border text-sm font-bold cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            <RotateCcw className="w-4 h-4 text-gold" />
            <span>Làm lại từ đầu ({answeredCount} câu đã làm)</span>
          </button>

          <button
            type="button"
            data-testid="mw-next-question-btn"
            onClick={handleNextQuestion}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-on-primary text-sm font-bold shadow-xs cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            <span>Câu tiếp theo</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </Dialog>
  );
};
