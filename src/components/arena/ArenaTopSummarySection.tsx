import React from 'react';
import { BookOpen, Clock, Flame, Headphones, Puzzle, RotateCcw, Sparkles, Timer, Trophy } from 'lucide-react';
import { type UploadedAssignmentPackage } from '../../utils/assignmentParser';
import { type Hsk3PillarMetric } from '../../utils/hsk3Engine';
import { type SrsWordRecord } from '../../utils/hskStudyHelpers';
import { speakChinese } from '../../utils/speech';
import { loadActiveClassroomSession } from '../../utils/storageService';
import { BinBinPandaMascotSVG, type PandaMood } from '../BinBinPandaAI';
import { type ClassStudent } from '../ClassroomManager';
import { Dialog } from '../ui/Dialog';
import { ArenaScoreBreakdown, LISTENING_CHALLENGES } from './arenaDataAndHelpers';

interface ArenaTopSummarySectionProps {
  showConfetti: boolean;
  assignmentPackage: UploadedAssignmentPackage;
  activeStudentName: string;
  isDemoMode: boolean;
  effectiveRoster: ClassStudent[];
  onChangeActiveStudent: (nextName: string) => void;
  isListeningExamMode: boolean;
  onToggleListeningExamMode: () => void;
  isSubmitted: boolean;
  isSpeedTestSubmitted: boolean;
  onQuickFillSampleAnswers: () => void;
  hsk3Pillars: Hsk3PillarMetric[];
  srsMistakeWords: SrsWordRecord[];
  isPillarsExpanded: boolean;
  onTogglePillarsExpanded: () => void;
  activeSection: 'homework' | 'sentence-builder' | 'speedtest' | 'leaderboard';
  onChangeSection: (sec: 'homework' | 'sentence-builder' | 'speedtest' | 'leaderboard') => void;
  scorecardRef: React.RefObject<HTMLDivElement | null>;
  pandaMood: PandaMood;
  breakdown: ArenaScoreBreakdown;
  mcAnswersCount: number;
  listeningAnswersCount: number;
  syncedSubmissionSummary: {
    studentName: string;
    totalScore: number;
    vocabProgress: string;
    writingAccuracy: number;
    reviewWords: string[];
    rank?: number;
    totalStudents?: number;
    timeSeconds?: number;
    streak?: number;
  } | null;
  onResetAssignment: () => void;
  showBinBinFeedbackModal: boolean;
  onSetShowBinBinFeedbackModal: (open: boolean) => void;
}

export const ArenaTopSummarySection: React.FC<ArenaTopSummarySectionProps> = ({
  showConfetti,
  assignmentPackage,
  activeStudentName,
  isDemoMode,
  effectiveRoster,
  onChangeActiveStudent,
  isListeningExamMode,
  onToggleListeningExamMode,
  isSubmitted,
  isSpeedTestSubmitted,
  onQuickFillSampleAnswers,
  hsk3Pillars,
  srsMistakeWords,
  isPillarsExpanded,
  onTogglePillarsExpanded,
  activeSection,
  onChangeSection,
  scorecardRef,
  pandaMood,
  breakdown,
  mcAnswersCount,
  listeningAnswersCount,
  syncedSubmissionSummary,
  onResetAssignment,
  showBinBinFeedbackModal,
  onSetShowBinBinFeedbackModal,
}) => {
  const { mcScore, soScore, esScore, listeningScore, totalScore, reviewWords, avgWritingAccuracy } =
    breakdown;

  return (
    <>
      {showConfetti && (
        <div
          data-testid="submission-confetti-celebration"
          aria-hidden="true"
          className="fixed inset-0 z-50 pointer-events-none overflow-hidden"
        >
          {Array.from({ length: 36 }).map((_, i) => {
            const left = `${(i * 97) % 100}%`;
            const delay = `${(i % 7) * 0.08}s`;
            const duration = `${1.8 + (i % 5) * 0.3}s`;
            const colors = ['#D4AF37', '#0F5243', '#B8292F', '#9B8A3E', '#15803D'];
            return (
              <span
                key={i}
                style={{
                  left,
                  top: '-20px',
                  backgroundColor: colors[i % colors.length],
                  animationDelay: delay,
                  animationDuration: duration,
                }}
                className="absolute w-2.5 h-4 rounded-xs opacity-90 animate-bounce shadow-xs"
              />
            );
          })}
        </div>
      )}

      {/* Unified Compact Student & Assignment Header Bar */}
      <div
        data-testid="student-roster-selector-bar"
        className="px-3.5 py-2.5 rounded-2xl bg-surface/90 border border-border shadow-2xs text-ink flex flex-wrap items-center justify-between gap-2.5 transition-all"
      >
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <span className="px-2.5 py-1 rounded-xl bg-primary text-on-primary text-xs font-bold whitespace-nowrap shrink-0">
            Buổi {assignmentPackage.sessionNumber} · HSK 1–3
          </span>
          <span className="font-bold text-xs text-ink break-words">
            {assignmentPackage.fileName}
          </span>
          <span className="text-xs text-ink-muted whitespace-nowrap">
            · Hạn: {assignmentPackage.dueDate}
          </span>
          <span data-testid="active-student-badge-name" className="sr-only">
            {activeStudentName}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-1.5">
            <label
              htmlFor="student-roster-select"
              className="text-xs font-bold text-ink-muted whitespace-nowrap"
            >
              Học viên:
            </label>
            {isDemoMode ? (
              <select
                id="student-roster-select"
                data-testid="student-roster-selector"
                value={activeStudentName}
                onChange={(e) => onChangeActiveStudent(e.target.value)}
                className="px-2.5 py-1 rounded-xl bg-surface border border-border text-xs font-bold text-ink cursor-pointer max-w-full"
              >
                {effectiveRoster.map((st) => (
                  <option key={st.id} value={st.name}>
                    {st.studentCode} · {st.name} ({st.hskLevel} · {st.totalPoints}đ)
                  </option>
                ))}
              </select>
            ) : (
              <span
                id="student-roster-select"
                data-testid="student-roster-selector"
                className="px-2.5 py-1 rounded-xl bg-primary/10 border border-border text-xs font-bold text-ink"
              >
                🔒 {loadActiveClassroomSession()?.studentCode || 'HV'} · {activeStudentName}
              </span>
            )}
          </div>

          <button
            type="button"
            data-testid="toggle-listening-exam-mode-btn"
            onClick={onToggleListeningExamMode}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              isListeningExamMode
                ? 'bg-accent text-on-primary border-transparent'
                : 'bg-surface hover:bg-canvas text-ink border-border'
            }`}
          >
            <Headphones className="w-3.5 h-3.5" />
            <span>
              {isListeningExamMode
                ? 'Đang luyện nghe'
                : 'Luyện nghe (听力)'}
            </span>
          </button>

          {!isSubmitted && (
            <button
              type="button"
              data-testid="quick-fill-sample-answers-btn"
              onClick={onQuickFillSampleAnswers}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-primary hover:bg-primary/90 text-on-primary border border-transparent text-xs font-bold transition-all cursor-pointer whitespace-nowrap"
            >
              <span>Điền đáp án mẫu</span>
            </button>
          )}
        </div>
      </div>

      {/* Collapsible HSK 3.0 4-Pillar Summary Bar */}
      <div
        data-testid="hsk3-student-roadmap"
        className="px-4 py-3 rounded-2xl bg-surface border border-border"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-bold text-ink whitespace-nowrap">
              Lộ trình HSK 3.0
            </span>
            {hsk3Pillars.map((pillar) => (
              <div
                key={`compact-${pillar.id}`}
                data-testid={`hsk3-compact-pillar-${pillar.id}`}
                className="inline-flex flex-col gap-0.5 px-2.5 py-1 rounded-xl bg-canvas border border-border min-w-[118px]"
              >
                <div className="flex items-center justify-between gap-1.5 text-xs font-bold">
                  <span lang="zh-CN" className="text-ink font-['Noto_Sans_SC']">
                    {pillar.titleZh}
                  </span>
                  <span className="text-primary tabular-nums">{pillar.percent}%</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-primary/10 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-500"
                    style={{ width: `${pillar.percent}%` }}
                  />
                </div>
              </div>
            ))}
            <span
              data-testid="srs-mistake-count-pill"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-canvas border border-border-strong text-xs font-bold text-ink"
            >
              Từ khó: <span className="text-accent tabular-nums">{srsMistakeWords.length} từ</span>
            </span>
          </div>

          <button
            type="button"
            data-testid="toggle-hsk3-pillars-btn"
            onClick={onTogglePillarsExpanded}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-canvas hover:bg-surface border border-border-strong text-xs font-bold text-ink transition-all cursor-pointer whitespace-nowrap"
          >
            <span>{isPillarsExpanded ? 'Thu gọn' : 'Xem chi tiết'}</span>
          </button>
        </div>

        {isPillarsExpanded && (
          <div className="mt-3 pt-3 border-t border-border space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {hsk3Pillars.map((pillar) => (
                <div
                  key={pillar.id}
                  data-testid={`hsk3-pillar-${pillar.id}`}
                  className="p-3 rounded-2xl bg-surface-2 space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-ink">{pillar.titleVi}</span>
                    <span lang="zh-CN" className="text-xs font-bold text-gold font-['Noto_Sans_SC']">
                      {pillar.titleZh}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-base font-bold text-ink tabular-nums">
                      {pillar.currentCount}{' '}
                      <span className="text-xs font-semibold text-ink-muted">
                        / {pillar.targetCount} {pillar.unitLabel}
                      </span>
                    </span>
                    <span className="text-xs font-semibold text-gold tabular-nums">
                      {pillar.percent}%
                    </span>
                  </div>
                  <p className="text-xs text-ink-muted leading-snug">{pillar.statusNote}</p>
                </div>
              ))}
            </div>

            <div
              data-testid="arena-mistake-notebook-banner"
              className="p-2.5 rounded-xl bg-canvas border border-border-strong flex flex-wrap items-center justify-between gap-2"
            >
              <div className="flex items-center gap-2 text-xs text-ink">
                <span className="font-bold">📓 Sổ tay từ hay quên (<span lang="zh-CN">错题本</span>):</span>
                <span className="text-ink-muted">
                  {srsMistakeWords.length > 0
                    ? `Đang lưu ${srsMistakeWords.length} từ cần ôn tập kỹ:`
                    : 'Tất cả từ vựng đều đã ghi nhớ tốt!'}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {srsMistakeWords.map((item) => (
                  <button
                    key={item.slideId}
                    type="button"
                    onClick={() => speakChinese(item.hanzi)}
                    className="px-2.5 py-1 rounded-xl bg-surface border border-border-strong text-xs font-bold text-ink hover:bg-primary/10 cursor-pointer"
                  >
                    <span lang="zh-CN" className="font-['Noto_Sans_SC'] mr-1">{item.hanzi}</span>
                    <span className="text-xs text-gold">({item.pinyin})</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sub-tabs */}
      <div
        role="tablist"
        aria-label="Các phần bài tập"
        className="flex items-end gap-1 border-b border-border overflow-x-auto no-scrollbar"
      >
        {(
          [
            { id: 'homework', testId: 'arena-subtab-homework', icon: BookOpen, label: 'Phiếu bài tập', count: assignmentPackage.multipleChoiceList.length + assignmentPackage.sentenceOrderingList.length + assignmentPackage.essayList.length },
            { id: 'sentence-builder', testId: 'arena-subtab-sentence-builder', icon: Puzzle, label: 'Ghép câu', count: null },
            { id: 'speedtest', testId: 'arena-subtab-speedtest', icon: Timer, label: 'Kiểm tra 15 phút', count: null },
            { id: 'leaderboard', testId: 'arena-subtab-leaderboard', icon: Trophy, label: 'Xếp hạng lớp', count: null },
          ] as const
        ).map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSection === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              data-testid={tab.testId}
              onClick={() => onChangeSection(tab.id)}
              className={`relative inline-flex items-center gap-2 h-11 px-3 sm:px-4 -mb-px border-b-2 text-sm whitespace-nowrap transition-colors cursor-pointer ${
                isActive
                  ? 'border-primary text-primary font-semibold'
                  : 'border-transparent text-ink-muted hover:text-ink font-medium'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{tab.label}</span>
              {tab.count !== null && (
                <span className="px-1.5 py-0.5 rounded-md bg-surface-2 text-ink-muted text-xs tabular-nums">
                  {tab.count}
                </span>
              )}
              {tab.id === 'leaderboard' && (isSubmitted || isSpeedTestSubmitted) && (
                <span className="w-2 h-2 rounded-full bg-highlight shrink-0" aria-label="Có cập nhật" />
              )}
            </button>
          );
        })}
      </div>

      {/* AI Grading Overview Scorecard */}
      {isSubmitted && (
        <div
          ref={scorecardRef}
          data-testid="ai-grading-scorecard"
          className="rounded-3xl bg-canvas border-2 border-border-strong p-6 shadow-md space-y-4 scroll-mt-6"
        >
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-border pb-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-ink shrink-0 border border-border-strong">
                <BinBinPandaMascotSVG mood={pandaMood} size={44} />
              </div>
              <div>
                <div className="flex items-center gap-2 text-xs font-bold text-gold">
                  <span>KẾT QUẢ CHẤM ĐIỂM HÁN NGỮ TỰ ĐỘNG</span>
                  <span>·</span>
                  <span className="text-ink">HSK 1–3 CHUẨN</span>
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-ink mt-0.5">
                  {totalScore >= 85
                    ? '🎉 Xuất sắc! Bạn đã nắm rất vững kiến thức và ngữ pháp bài học!'
                    : totalScore >= 70
                    ? '👍 Kết quả khá tốt! Cần chú ý thêm vị trí trạng ngữ & trợ từ kết cấu.'
                    : '💪 Đã nộp bài thành công! Hãy xem kỹ phần chữa lỗi sai bên dưới nhé.'}
                </h2>
                <p className="text-xs text-ink-muted mt-1">
                  Bài làm của học viên <strong className="text-ink">{activeStudentName}</strong> đã được ghi nhận vào hệ thống lớp học.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-surface p-3.5 rounded-2xl border border-border-strong">
              <div className="text-right">
                <div className="text-xs font-semibold text-ink-muted">TỔNG ĐIỂM BÀI LÀM</div>
                <div
                  data-testid="submitted-total-score"
                  className="text-3xl font-bold text-ink tabular-nums"
                >
                  {totalScore} <span className="text-sm font-bold text-gold">/ 100</span>
                </div>
              </div>
              <div
                className={`px-3 py-2 rounded-xl flex items-center justify-center font-bold text-xs text-on-primary ${
                  totalScore >= 85 ? 'bg-primary' : totalScore >= 70 ? 'bg-gold' : 'bg-warning'
                }`}
              >
                {totalScore >= 85 ? 'Xuất sắc' : totalScore >= 70 ? 'Khá giỏi' : 'Đạt'}
              </div>
            </div>
          </div>

          {syncedSubmissionSummary && (
            <div
              data-testid="teacher-gradebook-sync-banner"
              className="p-3.5 rounded-2xl bg-primary/10 border border-primary/25 text-xs text-ink flex flex-col sm:flex-row sm:items-center justify-between gap-2"
            >
              <div className="space-y-1">
                <div className="font-bold text-ink flex flex-wrap items-center gap-2">
                  <span>✅ Đã đồng bộ Bảng Xếp Hạng cho học viên “{activeStudentName}”:</span>
                  {syncedSubmissionSummary.rank && (
                    <span
                      data-testid="submitted-rank-pill"
                      className="px-2 py-0.5 rounded-lg bg-primary text-gold font-semibold text-xs"
                    >
                      🏆 Xếp hạng #{syncedSubmissionSummary.rank}/{syncedSubmissionSummary.totalStudents || 12}
                    </span>
                  )}
                  {syncedSubmissionSummary.timeSeconds && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-surface text-ink font-bold text-xs">
                      <Clock className="w-3 h-3 text-gold" />
                      {syncedSubmissionSummary.timeSeconds}s
                    </span>
                  )}
                  {syncedSubmissionSummary.streak && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-warning/15 text-warning font-bold text-xs">
                      <Flame className="w-3 h-3" />
                      Streak {syncedSubmissionSummary.streak} ngày
                    </span>
                  )}
                </div>
                <div className="text-ink-muted">
                  Tiến độ từ vựng: <strong className="text-ink">{syncedSubmissionSummary.vocabProgress}</strong> · Nét viết:{' '}
                  <strong className="text-ink">{syncedSubmissionSummary.writingAccuracy}%</strong> · Đã lưu vào 📓 Sổ từ khó:{' '}
                  <strong className="text-accent">
                    {syncedSubmissionSummary.reviewWords.length > 0
                      ? syncedSubmissionSummary.reviewWords.join(', ')
                      : 'Không có lỗi sai (Đã nắm vững 100%)'}
                  </strong>
                </div>
              </div>
              <button
                type="button"
                data-testid="scorecard-jump-leaderboard-btn"
                onClick={() => onChangeSection('leaderboard')}
                className="px-3 py-1.5 rounded-xl bg-primary text-on-primary font-bold text-xs whitespace-nowrap cursor-pointer"
              >
                🏆 Xem Bảng Xếp Hạng Lớp
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-2xl bg-surface border border-border p-3.5 flex items-center justify-between">
              <div>
                <div className="text-xs text-ink-muted">Phần A: Trắc nghiệm</div>
                <div className="text-sm font-bold text-ink">{mcScore} / 30 điểm</div>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-md bg-primary/10 font-bold text-ink">
                {mcAnswersCount}/{assignmentPackage.multipleChoiceList.length} câu
              </span>
            </div>
            <div className="rounded-2xl bg-surface border border-border p-3.5 flex items-center justify-between">
              <div>
                <div className="text-xs text-ink-muted">Phần B: Sắp xếp câu</div>
                <div className="text-sm font-bold text-ink">{soScore} / 40 điểm</div>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-md bg-primary/10 font-bold text-ink">
                {assignmentPackage.sentenceOrderingList.length} câu
              </span>
            </div>
            <div className="rounded-2xl bg-surface border border-border p-3.5 flex items-center justify-between">
              <div>
                <div className="text-xs text-ink-muted">Phần C: Tự luận đặt câu</div>
                <div className="text-sm font-bold text-ink">{esScore} / 30 điểm</div>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-md bg-primary/10 font-bold text-ink">
                {reviewWords.length > 0 ? `Ôn: ${reviewWords.join(', ')}` : 'Thuộc 100%'}
              </span>
            </div>
            <div className="rounded-2xl bg-surface border border-border p-3.5 flex items-center justify-between">
              <div>
                <div className="text-xs text-ink-muted">Phần D: Nghe &amp; Nét viết</div>
                <div className="text-sm font-bold text-ink">
                  +{listeningScore}đ · {avgWritingAccuracy}% nét
                </div>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-md bg-primary/10 font-bold text-ink">
                {listeningAnswersCount}/{LISTENING_CHALLENGES.length} câu nghe
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onResetAssignment}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border bg-surface hover:bg-canvas text-ink text-xs font-bold transition-all cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-ink-muted" />
              Làm lại bài này
            </button>
            <button
              type="button"
              onClick={() => onChangeSection('leaderboard')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border-strong bg-canvas hover:bg-surface text-ink text-xs font-bold transition-all cursor-pointer"
            >
              <Trophy className="w-3.5 h-3.5 text-gold" />
              Xem Bảng vàng thi đua
            </button>
            <button
              type="button"
              onClick={() => onSetShowBinBinFeedbackModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-on-primary text-xs font-bold transition-all cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Lời khuyên của Trợ Giảng 彬彬
            </button>
          </div>
        </div>
      )}

      <Dialog
        isOpen={showBinBinFeedbackModal}
        onClose={() => onSetShowBinBinFeedbackModal(false)}
        title="Lời khuyên từ Trợ Giảng Gấu Trúc · 彬彬"
        maxWidthClass="max-w-md"
      >
        <div className="p-6 space-y-4 bg-canvas text-ink">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <BinBinPandaMascotSVG mood="cheering" size={38} />
            </div>
            <div>
              <h2 className="text-base font-bold text-ink">
                Lời khuyên từ Trợ Giảng Gấu Trúc · <span lang="zh-CN">彬彬</span>
              </h2>
              <p className="text-xs text-gold">
                Nhận xét &amp; Chữa lỗi chi tiết: {assignmentPackage.fileName}
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-surface border border-border text-sm text-ink space-y-2 leading-relaxed">
            <p>
              <strong>1. Nhận xét tổng quan:</strong> Bạn đã đạt{' '}
              <strong className="text-gold">{totalScore}/100 điểm</strong> trong bài tập Buổi{' '}
              {assignmentPackage.sessionNumber}!
            </p>
            <p>
              <strong>2. Lưu ý ngữ pháp Hán ngữ cốt lõi:</strong> Hãy luôn nhớ quy tắc ngữ pháp vàng:
              <em className="text-primary block mt-0.5">
                Chủ ngữ + Trạng ngữ thời gian/địa điểm + Động từ + Tân ngữ.
              </em>
            </p>
            <p>
              <strong>3. Lời khen nét chữ &amp; luyện tập:</strong> Hãy tiếp tục luyện viết chữ Mễ ở Tab 1 để trau chuốt độ cân đối của các chữ Hán nhé!
            </p>
          </div>

          <button
            type="button"
            onClick={() => onSetShowBinBinFeedbackModal(false)}
            className="w-full py-2.5 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary/90 transition-all cursor-pointer"
          >
            Đã hiểu, cảm ơn 彬彬!
          </button>
        </div>
      </Dialog>
    </>
  );
};
