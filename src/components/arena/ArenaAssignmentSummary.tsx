import React from 'react';
import { CalendarClock, Headphones, MessageCircle, RotateCcw, Trophy } from 'lucide-react';
import {
  countAssignmentQuestions,
  type UploadedAssignmentPackage,
} from '../../utils/assignmentParser';
import { speakChinese } from '../../utils/speech';

export interface ArenaSubmissionResult {
  /** null while the server is still grading. */
  score: number | null;
  correctCount: number | null;
  totalQuestions: number;
  reviewWords: string[];
  source: 'server' | 'local' | 'pending';
  error?: string;
}

function formatDueDate(value: string): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit' });
}

export const ArenaAssignmentHeader: React.FC<{
  assignmentPackage: UploadedAssignmentPackage;
  isListeningExamMode: boolean;
  onToggleListeningExamMode: () => void;
}> = ({ assignmentPackage, isListeningExamMode, onToggleListeningExamMode }) => {
  const total = countAssignmentQuestions(assignmentPackage);
  const due = formatDueDate(assignmentPackage.dueDate);
  return (
    <section
      data-testid="student-roster-selector-bar"
      className="rounded-2xl bg-surface border border-border p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
    >
      <div className="min-w-0 space-y-1">
        <p className="text-xs font-medium text-ink-muted">
          Bài được giao{assignmentPackage.teacherName ? ` · ${assignmentPackage.teacherName}` : ''}
        </p>
        <h2 className="text-lg sm:text-xl font-semibold text-ink leading-snug text-balance">
          {assignmentPackage.sessionTitle || 'Bài tập'}
        </h2>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-muted">
          <span className="tabular-nums">{total} câu</span>
          {due && (
            <span className="inline-flex items-center gap-1.5">
              <CalendarClock className="w-4 h-4" aria-hidden="true" />
              Hạn {due}
            </span>
          )}
        </p>
      </div>
      {assignmentPackage.multipleChoiceList.length > 0 && (
        <button
          type="button"
          data-testid="toggle-listening-exam-mode-btn"
          aria-pressed={isListeningExamMode}
          onClick={onToggleListeningExamMode}
          className={`self-start sm:self-auto inline-flex items-center gap-2 min-h-11 px-3.5 rounded-xl border text-sm font-medium transition-colors cursor-pointer ${
            isListeningExamMode
              ? 'bg-primary text-on-primary border-transparent'
              : 'bg-surface hover:bg-surface-2 text-ink border-border'
          }`}
        >
          <Headphones className="w-4 h-4" aria-hidden="true" />
          {isListeningExamMode ? 'Đang ẩn chữ (luyện nghe)' : 'Luyện nghe: ẩn chữ'}
        </button>
      )}
    </section>
  );
};

export const ArenaResultCard: React.FC<{
  result: ArenaSubmissionResult;
  resultRef: React.RefObject<HTMLDivElement | null>;
  onRetry: () => void;
  onResubmit?: () => void;
  onOpenLeaderboard: () => void;
  onAskBinBin: () => void;
}> = ({ result, resultRef, onRetry, onResubmit, onOpenLeaderboard, onAskBinBin }) => {
  const { score } = result;
  const verdict =
    score === null
      ? 'Đã nộp bài, máy chủ đang chấm…'
      : score >= 85
      ? 'Rất tốt!'
      : score >= 60
      ? 'Khá ổn, xem lại các câu sai nhé.'
      : 'Đã nộp. Ôn lại các từ bên dưới rồi thử lại.';

  return (
    <div
      ref={resultRef}
      data-testid="ai-grading-scorecard"
      tabIndex={-1}
      className="rounded-2xl bg-surface border border-border-strong p-5 sm:p-6 space-y-4 scroll-mt-6 animate-pop-in focus:outline-none"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-medium text-ink-muted">
            {result.source === 'server'
              ? 'Điểm do máy chủ chấm'
              : result.source === 'local'
              ? 'Điểm tự chấm trên máy này'
              : 'Đang chờ kết quả'}
          </p>
          <h2 className="text-lg font-semibold text-ink mt-0.5" role="status">
            {verdict}
          </h2>
          {result.correctCount !== null && (
            <p className="text-sm text-ink-muted tabular-nums mt-0.5">
              Đúng {result.correctCount}/{result.totalQuestions} câu
            </p>
          )}
        </div>
        <div className="flex items-baseline gap-1 shrink-0" data-testid="submitted-total-score">
          <span className="text-4xl font-semibold text-ink tabular-nums">{score ?? '…'}</span>
          <span className="text-sm text-ink-muted">/100</span>
        </div>
      </div>

      {result.error && (
        <p role="alert" className="text-sm text-accent">
          {result.error}
        </p>
      )}

      {result.reviewWords.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-ink-muted">Đã thêm vào Sổ từ khó để ôn:</p>
          <div className="flex flex-wrap gap-2">
            {result.reviewWords.map((word) => (
              <button
                key={word}
                type="button"
                onClick={() => speakChinese(word)}
                lang="zh-CN"
                className="min-h-9 px-3 rounded-lg bg-surface-2 hover:bg-primary-soft text-base font-['Noto_Sans_SC'] text-ink transition-colors cursor-pointer"
              >
                {word}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2 pt-1">
        {result.error && onResubmit && (
          <button
            type="button"
            onClick={onResubmit}
            className="inline-flex items-center gap-1.5 min-h-10 px-3.5 rounded-xl bg-primary hover:bg-primary-hover text-on-primary text-sm font-semibold transition-colors cursor-pointer"
          >
            Gửi lại bài
          </button>
        )}
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 min-h-10 px-3.5 rounded-xl border border-border hover:bg-surface-2 text-sm font-medium text-ink transition-colors cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" aria-hidden="true" />
          Làm lại
        </button>
        <button
          type="button"
          data-testid="scorecard-jump-leaderboard-btn"
          onClick={onOpenLeaderboard}
          className="inline-flex items-center gap-1.5 min-h-10 px-3.5 rounded-xl border border-border hover:bg-surface-2 text-sm font-medium text-ink transition-colors cursor-pointer"
        >
          <Trophy className="w-4 h-4" aria-hidden="true" />
          Bảng xếp hạng
        </button>
        <button
          type="button"
          onClick={onAskBinBin}
          className="inline-flex items-center gap-1.5 min-h-10 px-3.5 rounded-xl bg-primary hover:bg-primary-hover text-on-primary text-sm font-semibold transition-colors cursor-pointer"
        >
          <MessageCircle className="w-4 h-4" aria-hidden="true" />
          Hỏi 彬彬 về bài này
        </button>
      </div>
    </div>
  );
};
