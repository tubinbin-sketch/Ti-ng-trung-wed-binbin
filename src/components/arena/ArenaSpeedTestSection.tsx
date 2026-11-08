import React from 'react';
import { Check, Send, Volume2 } from 'lucide-react';
import { speakChinese } from '../../utils/speech';
import { SPEED_TEST_10_QUESTIONS } from './arenaDataAndHelpers';

interface ArenaSpeedTestSectionProps {
  speedTestSecondsLeft: number;
  isSpeedTestSubmitted: boolean;
  speedTestScore: number;
  activeStudentName: string;
  speedTestAnswers: Record<string, string>;
  onSelectSpeedTestAnswer: (qId: string, opt: string) => void;
  isListeningExamMode: boolean;
  onQuickFillSpeedTest: () => void;
  onResetSpeedTest: () => void;
  onSubmitSpeedTest: () => void;
  onAskBinBinAboutQuestion: (targetWord: string, questionText: string, explanationText?: string) => void;
}

function formatTimerMmSs(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export const ArenaSpeedTestSection: React.FC<ArenaSpeedTestSectionProps> = ({
  speedTestSecondsLeft,
  isSpeedTestSubmitted,
  speedTestScore,
  activeStudentName,
  speedTestAnswers,
  onSelectSpeedTestAnswer,
  isListeningExamMode,
  onQuickFillSpeedTest,
  onResetSpeedTest,
  onSubmitSpeedTest,
  onAskBinBinAboutQuestion,
}) => {
  const [activeQuestionIdx, setActiveQuestionIdx] = React.useState(0);
  const questionCardRefs = React.useRef<Array<HTMLDivElement | null>>([]);

  React.useEffect(() => {
    const handleQuizKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const total = SPEED_TEST_10_QUESTIONS.length;
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault();
        const nextIdx = (activeQuestionIdx + 1) % total;
        setActiveQuestionIdx(nextIdx);
        questionCardRefs.current[nextIdx]?.focus();
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault();
        const prevIdx = (activeQuestionIdx - 1 + total) % total;
        setActiveQuestionIdx(prevIdx);
        questionCardRefs.current[prevIdx]?.focus();
      } else if (e.key === ' ' || e.code === 'Space') {
        const currentQ = SPEED_TEST_10_QUESTIONS[activeQuestionIdx];
        if (currentQ && target?.tagName !== 'BUTTON') {
          e.preventDefault();
          speakChinese(currentQ.targetWord);
        }
      } else if (!isSpeedTestSubmitted) {
        const keyUpper = e.key.toUpperCase();
        const optIdx =
          keyUpper === '1' || keyUpper === 'A'
            ? 0
            : keyUpper === '2' || keyUpper === 'B'
            ? 1
            : keyUpper === '3' || keyUpper === 'C'
            ? 2
            : keyUpper === '4' || keyUpper === 'D'
            ? 3
            : -1;
        const currentQ = SPEED_TEST_10_QUESTIONS[activeQuestionIdx];
        if (optIdx >= 0 && currentQ && currentQ.options[optIdx]) {
          e.preventDefault();
          onSelectSpeedTestAnswer(currentQ.id, currentQ.options[optIdx]);
        }
      }
    };

    window.addEventListener('keydown', handleQuizKeyDown);
    return () => window.removeEventListener('keydown', handleQuizKeyDown);
  }, [activeQuestionIdx, isSpeedTestSubmitted, onSelectSpeedTestAnswer]);

  return (
    <div
      data-testid="speed-test-10-arena"
      className="rounded-3xl bg-surface/90 border-2 border-border-strong p-5 sm:p-6 shadow-md space-y-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-border">
        <div>
          <div className="text-xs font-bold text-accent">
            CHẾ ĐỘ THI THỬ TỐC ĐỘ 15 PHÚT · ĐÁNH GIÁ CHUẨN HSK 3.0
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-ink mt-0.5">
            🏆 Bài Kiểm Tra Nhanh 10 Câu Toàn Diện (Nghe · Đọc · Ngữ Pháp · Hán Tự · Dịch)
          </h2>
          <p className="text-xs text-ink-muted mt-1" data-testid="quiz-keyboard-shortcuts-hint">
            ⌨️ Điều hướng bàn phím: <kbd className="px-1.5 py-0.5 rounded bg-surface-2 border border-border text-ink font-mono">↑/↓</kbd> hoặc <kbd className="px-1.5 py-0.5 rounded bg-surface-2 border border-border text-ink font-mono">←/→</kbd> chuyển câu · <kbd className="px-1.5 py-0.5 rounded bg-surface-2 border border-border text-ink font-mono">1–4</kbd> / <kbd className="px-1.5 py-0.5 rounded bg-surface-2 border border-border text-ink font-mono">A–D</kbd> chọn đáp án · <kbd className="px-1.5 py-0.5 rounded bg-surface-2 border border-border text-ink font-mono">Space</kbd> nghe phát âm
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div
            data-testid="speed-test-timer-badge"
            className="px-3.5 py-1.5 rounded-xl bg-primary text-gold font-mono text-sm font-semibold tabular-nums flex items-center gap-1.5"
          >
            <span>⏱️ Thời gian:</span>
            <span>{formatTimerMmSs(speedTestSecondsLeft)}</span>
          </div>

          {!isSpeedTestSubmitted ? (
            <button
              type="button"
              data-testid="speed-test-quick-fill-btn"
              onClick={onQuickFillSpeedTest}
              className="px-3 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-ink border border-border-strong text-xs font-bold cursor-pointer"
            >
              ⚡ Điền nhanh 10 câu mẫu
            </button>
          ) : (
            <button
              type="button"
              data-testid="speed-test-reset-btn"
              onClick={onResetSpeedTest}
              className="px-3 py-1.5 rounded-xl bg-canvas hover:bg-primary/10 text-ink border border-border text-xs font-bold cursor-pointer"
            >
              🔄 Làm lại đề 10 câu
            </button>
          )}
        </div>
      </div>

      {isSpeedTestSubmitted && (
        <div
          data-testid="hsk3-completion-certificate"
          className="p-6 rounded-3xl bg-canvas border-2 border-border-strong shadow-xl space-y-4 relative overflow-hidden"
        >
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-border-strong pb-4">
            <div className="flex items-center gap-3.5">
              <div
                lang="zh-CN"
                className="w-14 h-14 rounded-2xl bg-primary text-gold flex items-center justify-center font-['Noto_Serif_SC'] text-2xl font-bold border border-transparent shrink-0"
              >
                证
              </div>
              <div>
                <div className="text-xs font-semibold text-gold">
                  HANU × 阮文受 · CHỨNG NHẬN NĂNG LỰC HÁN NGỮ QUỐC TẾ
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-ink mt-0.5">
                  📜 PHIẾU CHỨNG NHẬN HOÀN THÀNH BÀI HỌC CHUẨN HSK 3.0
                </h3>
                <p className="text-xs text-ink-muted mt-0.5">
                  Cấp cho học viên: <strong className="text-ink">{activeStudentName}</strong> · Lớp HSK 1–3
                </p>
              </div>
            </div>

            <div className="px-4 py-2.5 rounded-2xl bg-primary text-on-primary text-right border border-transparent shrink-0">
              <div className="text-xs font-bold text-gold">
                ĐIỂM KIỂM TRA 10 CÂU
              </div>
              <div
                data-testid="speed-test-final-score"
                className="text-2xl sm:text-3xl font-bold tabular-nums"
              >
                {speedTestScore} <span className="text-xs font-bold text-gold">/ 100đ</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-center">
            {[
              { label: 'Nghe hiểu', score: `${Math.min(100, speedTestScore + 2)}%` },
              { label: 'Phát âm', score: '96%' },
              { label: 'Đọc hiểu', score: `${speedTestScore}%` },
              { label: 'Chữ viết Mễ', score: '96%' },
              { label: 'Dịch ngữ pháp', score: `${speedTestScore}%` },
            ].map((skill) => (
              <div
                key={skill.label}
                className="p-2.5 rounded-xl bg-surface border border-border-strong"
              >
                <div className="text-xs text-ink-muted font-semibold">{skill.label}</div>
                <div className="text-sm font-bold text-primary tabular-nums mt-0.5">
                  {skill.score}
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-xs text-ink-muted">
            <span>
              ✅ Đã đồng bộ tự động vào Sổ điểm của <strong>GV Nguyễn Văn Thụ (阮文受)</strong>.
            </span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5" role="list" aria-label="Danh sách 10 câu hỏi kiểm tra nhanh">
        {SPEED_TEST_10_QUESTIONS.map((q, qIdx) => {
          const selected = speedTestAnswers[q.id];
          const isAnsweredWrong = isSpeedTestSubmitted && selected !== q.correctAnswer;
          const isActiveCard = activeQuestionIdx === qIdx;
          return (
            <div
              key={q.id}
              ref={(el) => {
                questionCardRefs.current[qIdx] = el;
              }}
              tabIndex={0}
              role="group"
              aria-label={`Câu hỏi ${qIdx + 1}: ${q.skillLabel} — ${q.prompt}`}
              onFocus={() => setActiveQuestionIdx(qIdx)}
              onClick={() => setActiveQuestionIdx(qIdx)}
              data-testid={`speed-test-q-${q.id}`}
              className={`p-4 rounded-2xl bg-canvas border space-y-2.5 flex flex-col justify-between transition-colors ${
                isActiveCard ? 'border-primary ring-1 ring-primary/30' : 'border-border'
              }`}
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-bold">
                    {q.skillLabel}
                  </span>
                  <button
                    type="button"
                    data-testid={`speed-test-listen-btn-${q.id}`}
                    aria-label={`Nghe phát âm từ ${q.targetWord} của câu ${qIdx + 1}`}
                    onClick={() => speakChinese(q.targetWord)}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-primary text-on-primary border border-transparent text-xs font-bold cursor-pointer"
                  >
                    <Volume2 className="w-3 h-3" aria-hidden="true" />
                    <span lang="zh-CN" className="font-['Noto_Sans_SC']">
                      {isListeningExamMode && !isSpeedTestSubmitted
                        ? `🔊 Nghe câu #${qIdx + 1}`
                        : q.targetWord}
                    </span>
                  </button>
                </div>

                {isListeningExamMode && !isSpeedTestSubmitted ? (
                  <div
                    data-testid={`speed-test-listening-mask-${q.id}`}
                    className="p-2.5 rounded-xl bg-surface border border-dashed border-primary/35 text-xs font-bold text-ink flex items-center justify-between gap-2"
                  >
                    <span>🎧 Câu #{qIdx + 1} (<span lang="zh-CN">听力</span>): Bấm nghe âm thanh để chọn đáp án đúng</span>
                    <button
                      type="button"
                      onClick={() => speakChinese(q.prompt)}
                      className="px-2 py-1 rounded-lg bg-primary/10 text-ink text-xs font-bold cursor-pointer shrink-0"
                    >
                      🔊 Nghe cả câu
                    </button>
                  </div>
                ) : (
                  <p className="text-sm font-bold text-ink leading-snug">{q.prompt}</p>
                )}
              </div>

              <div className="space-y-1.5 pt-1" role="radiogroup" aria-label={`Các lựa chọn cho câu ${qIdx + 1}`}>
                {q.options.map((opt, optIdx) => {
                  const isPicked = selected === opt;
                  const isCorrect = opt === q.correctAnswer;
                  return (
                    <button
                      key={opt}
                      type="button"
                      role="radio"
                      aria-checked={isPicked}
                      aria-label={`Lựa chọn ${optIdx + 1}: ${opt}`}
                      disabled={isSpeedTestSubmitted}
                      onClick={() => {
                        setActiveQuestionIdx(qIdx);
                        onSelectSpeedTestAnswer(q.id, opt);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer flex items-center justify-between gap-2 ${
                        isSpeedTestSubmitted
                          ? isCorrect
                            ? 'bg-success/10 border-success text-ink font-bold'
                            : isPicked
                            ? 'bg-danger/10 border-danger text-ink'
                            : 'bg-surface/60 border-border text-ink-muted'
                          : isPicked
                          ? 'bg-primary border-primary text-on-primary font-bold'
                          : 'bg-surface hover:bg-canvas border-border text-ink'
                      }`}
                    >
                      <span lang="zh-CN" className="font-['Noto_Sans_SC']">{opt}</span>
                      {isSpeedTestSubmitted && isCorrect && (
                        <Check className="w-4 h-4 text-success shrink-0" aria-hidden="true" />
                      )}
                    </button>
                  );
                })}
              </div>

              {isSpeedTestSubmitted && (
                <div
                  className={`p-2.5 rounded-xl text-xs space-y-1.5 ${
                    isAnsweredWrong
                      ? 'bg-danger/10 text-ink border border-danger/30'
                      : 'bg-primary/10 text-ink'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-1.5">
                    <span>
                      <strong>Giải thích chuẩn HSK 3.0:</strong> {q.explanation}
                    </span>
                    <button
                      type="button"
                      data-testid={`ask-binbin-stq-${q.id}`}
                      onClick={() =>
                        onAskBinBinAboutQuestion(q.targetWord, q.prompt, q.explanation)
                      }
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-primary text-on-primary text-xs font-bold cursor-pointer shrink-0"
                    >
                      <span>🐼 Hỏi 彬彬 câu này</span>
                    </button>
                  </div>
                  {isAnsweredWrong && (
                    <div className="text-xs font-bold text-accent">
                      📓 Đã tự động thêm từ &ldquo;<span lang="zh-CN">{q.targetWord}</span>&rdquo; vào Sổ từ khó để ôn lại!
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {!isSpeedTestSubmitted && (
        <div className="flex items-center justify-between gap-3 pt-3 border-t border-border">
          <span className="text-xs text-ink-muted">
            Đã chọn: <strong className="text-ink">{Object.keys(speedTestAnswers).length}/10 câu</strong> · Nộp bài để nhận Phiếu Chứng Nhận HSK 3.0 ngay lập tức.
          </span>
          <button
            type="button"
            data-testid="submit-speed-test-btn"
            onClick={onSubmitSpeedTest}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-on-primary text-xs sm:text-sm font-bold shadow-md cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span>Nộp Đề 10 Câu &amp; Nhận Chứng Nhận HSK 3.0</span>
          </button>
        </div>
      )}
    </div>
  );
};
