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

  if (!isOpen) return null;

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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="Luyện Lượng Từ & Kết Hợp Danh Từ HSK 3.0"
      data-testid="measure-word-drill-modal"
    >
      <div className="w-full max-w-2xl rounded-3xl bg-[#FAF7F0] border border-[#C5B358]/60 text-[#0F382E] p-5 sm:p-6 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-[#0F5243]/15">
          <div>
            <div className="inline-flex items-center gap-1.5 text-sm font-bold text-[#9B8A3E]">
              <BookOpen className="w-4 h-4 text-[#0F5243]" />
              <span>CHUYÊN ĐỀ NGỮ PHÁP HSK 3.0 · 量词搭配</span>
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-[#0F382E] mt-0.5">
              Phản Xạ Lượng Từ &amp; Cụm Danh Từ Chuẩn Bản Xứ
            </h3>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-[#0F5243] text-[#FAF7F0] text-sm font-bold tabular-nums">
              <Award className="w-4 h-4 text-[#C5B358]" />
              <span>{score} điểm</span>
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng cửa sổ luyện lượng từ"
              className="p-2 rounded-xl text-[#3A544B] hover:bg-[#0F5243]/10 hover:text-[#0F382E] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Question Progress & Target Noun Card */}
        <div className="rounded-2xl bg-white border border-[#0F5243]/15 p-4 space-y-3 shadow-2xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="px-2.5 py-0.5 rounded-lg bg-[#0F5243]/10 text-[#0F5243] text-sm font-bold">
              Câu {(currentIdx % challenges.length) + 1}/{challenges.length} · {currentItem.hskLevel}
            </span>
            <button
              type="button"
              onClick={() => speakChinese(currentItem.fullSentenceHanzi, 0.9)}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-gradient-to-r from-[#0F5243] to-[#166E5B] text-[#FAF7F0] text-sm font-bold cursor-pointer"
            >
              <Volume2 className="w-4 h-4 text-[#C5B358]" />
              <span>Nghe câu mẫu</span>
            </button>
          </div>

          <div className="p-3.5 rounded-xl bg-[#FAF7F0] border border-[#C5B358]/40 text-center space-y-1.5">
            <div className="text-sm font-semibold text-[#3A544B]">
              Chọn lượng từ thích hợp điền vào chỗ trống cho danh từ{' '}
              <strong className="text-[#0F382E] font-['Noto_Sans_SC']">
                {currentItem.nounHanzi} ({currentItem.nounPinyin} — {currentItem.nounMeaning})
              </strong>
              :
            </div>
            <div className="font-['Noto_Sans_SC'] text-xl sm:text-2xl font-bold text-[#0F382E] py-1">
              {currentItem.sentencePrefix}
              <span className="inline-flex items-center justify-center min-w-[44px] px-2.5 py-0.5 mx-1 rounded-lg bg-[#0F5243]/10 border-2 border-dashed border-[#0F5243] text-[#B8292F]">
                {evalResult ? evalResult.correctMeasureWord : '？'}
              </span>
              {currentItem.sentenceSuffix}
            </div>
            <div className="text-sm text-[#3A544B] italic">
              “{currentItem.fullSentenceMeaning}”
            </div>
          </div>

          {/* 4 Measure Word Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {currentItem.options.map((opt) => {
              const isChosen = evalResult?.selectedMeasureWord === opt.measureWord;
              const isRightOption = opt.measureWord === currentItem.correctMeasureWord;
              let btnStyle =
                'bg-white hover:bg-[#FAF7F0] border-[#0F5243]/20 text-[#0F382E]';
              if (evalResult) {
                if (isRightOption) {
                  btnStyle = 'bg-emerald-50 border-emerald-600 text-emerald-950 ring-2 ring-emerald-500/30';
                } else if (isChosen && !isRightOption) {
                  btnStyle = 'bg-red-50 border-red-500 text-red-950';
                }
              }
              return (
                <button
                  key={opt.measureWord}
                  type="button"
                  data-testid={`mw-option-${opt.measureWord}`}
                  onClick={() => handleSelectOption(opt.measureWord)}
                  className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer flex items-start justify-between gap-2 ${btnStyle}`}
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-['Noto_Sans_SC'] text-2xl font-bold text-[#0F5243]">
                        {opt.measureWord}
                      </span>
                      <span className="text-sm font-bold text-[#9B8A3E]">({opt.pinyin})</span>
                    </div>
                    <p className="text-sm text-[#3A544B] leading-snug">{opt.usageHint}</p>
                  </div>
                  {evalResult && isRightOption && (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  )}
                  {evalResult && isChosen && !isRightOption && (
                    <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
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
                ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                : 'bg-amber-50 border-amber-300 text-amber-950'
            }`}
          >
            <div className="font-bold flex items-center gap-1.5">
              {evalResult.isCorrect ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
              )}
              <span>{evalResult.feedbackVi}</span>
            </div>
            <div className="text-sm font-medium text-[#0F382E] pt-1">
              Phiên âm cả câu: <strong>{currentItem.fullSentencePinyin}</strong>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#0F5243]/15">
          <button
            type="button"
            onClick={handleResetDrill}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-[#E7ECD9] text-[#0F382E] border border-[#0F5243]/20 text-sm font-bold cursor-pointer"
          >
            <RotateCcw className="w-4 h-4 text-[#9B8A3E]" />
            <span>Làm lại từ đầu ({answeredCount} câu đã làm)</span>
          </button>

          <button
            type="button"
            data-testid="mw-next-question-btn"
            onClick={handleNextQuestion}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#0F5243] to-[#166E5B] text-[#FAF7F0] text-sm font-bold shadow-xs cursor-pointer"
          >
            <span>Câu tiếp theo</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
