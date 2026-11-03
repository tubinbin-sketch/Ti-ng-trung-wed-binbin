import React, { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  Check,
  ChevronRight,
  Flame,
  GraduationCap,
  Layers,
  PenLine,
  PenTool,
  Presentation,
  Search,
  Target,
  Trophy,
  Volume2,
  X,
} from 'lucide-react';
import { VocabSlide } from '../data/chineseData';
import { UserProfile } from './AuthModal';
import { speakChinese } from '../utils/speech';
import { Dialog } from './ui/Dialog';
import {
  DailyGoalTarget,
  DailyStudyProgress,
  extractUnlearnedPosCategories,
  filterUnlearnedSlides,
  getDailyStudyProgress,
  loadStoredSrsRecords,
  recordDailyWordReview,
  setDailyStudyGoal,
  SrsWordRecord,
} from '../utils/hskStudyHelpers';
import {
  PronunciationPracticeButton,
  PronunciationResultBanner,
  usePronunciationPractice,
} from './PronunciationPracticeWidget';

interface HomeDashboardProps {
  userProfile: UserProfile;
  slides: VocabSlide[];
  activeSlideIndex: number;
  totalVocabBankCount: number;
  classroomStudentCount: number;
  onContinueLesson: () => void;
  onPracticeWriting: (slide: VocabSlide) => void;
  onOpenFlashcard: () => void;
  onOpenHomework: () => void;
  onOpenLeaderboard: () => void;
  onOpenLessonBuilder: () => void;
  onOpenClassroom: () => void;
  onPickSlide: (index: number) => void;
  onToggleLearned?: (slideId: string) => void;
}

function greetingForNow(): string {
  const h = new Date().getHours();
  if (h < 11) return 'Chào buổi sáng';
  if (h < 14) return 'Chào buổi trưa';
  if (h < 18) return 'Chào buổi chiều';
  return 'Chào buổi tối';
}

function firstName(full: string): string {
  const clean = full.replace(/\s*\(.*?\)\s*/g, '').trim();
  if (!clean || /^học viên/i.test(clean)) return 'bạn';
  const parts = clean.split(/\s+/);
  return parts[parts.length - 1] || clean || 'bạn';
}

/** Faint 米字格 grid behind the featured character. */
function MiZiGeBackdrop() {
  return (
    <svg
      viewBox="0 0 100 100"
      className="absolute inset-0 w-full h-full text-accent/25"
      aria-hidden="true"
      preserveAspectRatio="none"
    >
      <rect x="1" y="1" width="98" height="98" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <g stroke="currentColor" strokeWidth="0.6" strokeDasharray="3 3" fill="none">
        <line x1="50" y1="0" x2="50" y2="100" />
        <line x1="0" y1="50" x2="100" y2="50" />
        <line x1="0" y1="0" x2="100" y2="100" />
        <line x1="100" y1="0" x2="0" y2="100" />
      </g>
    </svg>
  );
}

/** Visual circular progress ring for learned vocabulary ratio. */
function VocabProgressRing({ percent }: { percent: number }) {
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, percent));
  const strokeDashoffset = circumference - (clamped / 100) * circumference;

  return (
    <div
      className="relative w-16 h-16 shrink-0 grid place-items-center"
      data-testid="vocab-progress-ring"
      aria-hidden="true"
    >
      <svg viewBox="0 0 64 64" className="w-16 h-16 -rotate-90">
        <circle
          cx="32"
          cy="32"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          className="text-surface-2"
        />
        <circle
          cx="32"
          cy="32"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="text-primary transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <span className="absolute text-xs font-semibold tabular-nums text-ink">{clamped}%</span>
    </div>
  );
}

export function HomeDashboard({
  userProfile,
  slides,
  activeSlideIndex,
  totalVocabBankCount,
  classroomStudentCount,
  onContinueLesson,
  onPracticeWriting,
  onOpenFlashcard,
  onOpenHomework,
  onOpenLeaderboard,
  onOpenLessonBuilder,
  onOpenClassroom,
  onPickSlide,
  onToggleLearned,
}: HomeDashboardProps) {
  const [previewWord, setPreviewWord] = useState<{ slide: VocabSlide; index: number } | null>(null);
  const [unlearnedSearchQuery, setUnlearnedSearchQuery] = useState('');
  const [unlearnedFilter, setUnlearnedFilter] = useState<string>('all');

  const [srsRecords, setSrsRecords] = useState<Record<string, SrsWordRecord>>(() =>
    loadStoredSrsRecords(slides, userProfile.studentCode || userProfile.name)
  );

  const [dailyProgress, setDailyProgress] = useState<DailyStudyProgress>(() =>
    getDailyStudyProgress(slides)
  );

  useEffect(() => {
    setSrsRecords(loadStoredSrsRecords(slides, userProfile.studentCode || userProfile.name));
  }, [slides, userProfile.studentCode, userProfile.name]);

  useEffect(() => {
    const syncSrs = () =>
      setSrsRecords(loadStoredSrsRecords(slides, userProfile.studentCode || userProfile.name));
    const syncDaily = () => setDailyProgress(getDailyStudyProgress(slides));
    window.addEventListener('hanu_srs_updated', syncSrs);
    window.addEventListener('hanu_daily_progress_updated', syncDaily);
    return () => {
      window.removeEventListener('hanu_srs_updated', syncSrs);
      window.removeEventListener('hanu_daily_progress_updated', syncDaily);
    };
  }, [slides, userProfile.studentCode, userProfile.name]);

  const current = slides[activeSlideIndex] || slides[0];
  const learnedCount = slides.filter((s) => s.learned).length;
  const total = slides.length || 1;
  const percent = Math.round((learnedCount / total) * 100);
  const remainingCount = Math.max(0, slides.length - learnedCount);
  const isTeacher = userProfile.role === 'teacher';

  const posCategories = useMemo(() => extractUnlearnedPosCategories(slides), [slides]);

  const filteredUnlearned = useMemo(
    () =>
      filterUnlearnedSlides(slides, srsRecords, {
        query: unlearnedSearchQuery,
        filter: unlearnedFilter,
      }),
    [slides, srsRecords, unlearnedSearchQuery, unlearnedFilter]
  );

  const displayedUnlearned = useMemo(() => {
    if (unlearnedSearchQuery.trim() || unlearnedFilter !== 'all') {
      return filteredUnlearned.slice(0, 12);
    }
    return filteredUnlearned.slice(0, 8);
  }, [filteredUnlearned, unlearnedSearchQuery, unlearnedFilter]);

  const activePreviewSlide = previewWord
    ? slides[previewWord.index] || previewWord.slide
    : null;

  const popupPronunciation = usePronunciationPractice(
    activePreviewSlide?.hanzi || '',
    activePreviewSlide?.pinyin || '',
    activePreviewSlide?.id
  );

  const dailyGoalPercent = Math.min(
    100,
    Math.round((dailyProgress.reviewedCountToday / Math.max(1, dailyProgress.dailyGoal)) * 100)
  );

  const handleCycleDailyGoal = () => {
    const nextGoal: DailyGoalTarget =
      dailyProgress.dailyGoal === 5 ? 10 : dailyProgress.dailyGoal === 10 ? 20 : 5;
    setDailyProgress(setDailyStudyGoal(nextGoal, slides));
  };

  const handleSelectDailyGoal = (goal: DailyGoalTarget, e: React.MouseEvent) => {
    e.stopPropagation();
    setDailyProgress(setDailyStudyGoal(goal, slides));
  };

  return (
    <div className="space-y-6 pb-24 sm:pb-16 lg:pb-10" data-testid="home-dashboard">
      {/* Greeting + Daily Streak & Daily Goal Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 animate-rise-in">
        <div>
          <p className="text-sm text-ink-muted">{greetingForNow()},</p>
          <h2 className="text-2xl sm:text-[28px] font-semibold text-ink mt-0.5">
            {firstName(userProfile.name)}
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Daily Streak Badge */}
          <div
            data-testid="home-daily-streak-badge"
            className="inline-flex items-center gap-2 h-11 px-3.5 rounded-2xl bg-surface border border-border shadow-2xs"
            title="Chuỗi ngày học liên tiếp"
          >
            <span className="w-7 h-7 rounded-xl bg-highlight/20 text-gold grid place-items-center shrink-0">
              <Flame className="w-4 h-4 fill-current" />
            </span>
            <div className="leading-tight">
              <span className="block text-xs text-ink-muted">Chuỗi ngày học</span>
              <span className="block text-sm font-semibold text-ink tabular-nums">
                🔥 {dailyProgress.streakDays} ngày liên tiếp
              </span>
            </div>
          </div>

          {/* Daily Goal Progress & Switcher (5 / 10 / 20 words) */}
          <div
            data-testid="home-daily-goal-widget"
            onClick={handleCycleDailyGoal}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleCycleDailyGoal();
              }
            }}
            title="Bấm để đổi mục tiêu ôn tập trong ngày (5 / 10 / 20 từ)"
            className="flex items-center gap-3 min-h-11 px-3.5 py-2 rounded-2xl bg-surface border border-border hover:border-border-strong shadow-2xs transition-colors cursor-pointer"
          >
            <span className="w-7 h-7 rounded-xl bg-primary-soft text-primary grid place-items-center shrink-0">
              <Target className="w-4 h-4" />
            </span>
            <div className="min-w-[140px]">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="font-medium text-ink tabular-nums" data-testid="home-daily-goal-text">
                  Đã ôn {dailyProgress.reviewedCountToday}/{dailyProgress.dailyGoal} từ hôm nay
                </span>
              </div>
              <div
                className="mt-1.5 h-1.5 w-full rounded-full bg-surface-2 overflow-hidden"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={dailyProgress.dailyGoal}
                aria-valuenow={Math.min(dailyProgress.reviewedCountToday, dailyProgress.dailyGoal)}
                aria-label="Tiến độ mục tiêu từ vựng hôm nay"
              >
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out"
                  style={{ width: `${dailyGoalPercent}%` }}
                />
              </div>
            </div>
            <div
              className="flex items-center gap-1 pl-1 border-l border-border"
              aria-label="Chọn mục tiêu số từ mỗi ngày"
            >
              {([5, 10, 20] as const).map((goalOption) => {
                const isSelected = dailyProgress.dailyGoal === goalOption;
                return (
                  <button
                    key={goalOption}
                    type="button"
                    data-testid={`daily-goal-btn-${goalOption}`}
                    onClick={(e) => handleSelectDailyGoal(goalOption, e)}
                    aria-pressed={isSelected}
                    className={`h-6 px-2 rounded-lg text-xs font-semibold tabular-nums transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-primary text-on-primary'
                        : 'bg-surface-2 text-ink-muted hover:text-ink'
                    }`}
                  >
                    {goalOption}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Continue lesson — compact side-by-side layout on wider screens */}
        {current && (
          <section
            className="lg:col-span-2 rounded-3xl bg-surface border border-border shadow-xs p-5 sm:p-6 flex flex-col justify-between gap-4 animate-rise-in"
            style={{ '--stagger': 1 } as React.CSSProperties}
            aria-labelledby="continue-heading"
          >
            <div className="flex items-center justify-between gap-2">
              <h3 id="continue-heading" className="text-sm font-medium text-ink-muted">
                Tiếp tục bài học
              </h3>
              <span className="text-xs text-ink-subtle tabular-nums">
                Từ {activeSlideIndex + 1}/{slides.length} · {current.hskLevel}
                {current.partOfSpeech ? ` · ${current.partOfSpeech}` : ''}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5">
              {/* Compact Hanzi MiZiGe box placed right beside Pinyin/Meaning */}
              <div
                onClick={() => speakChinese(current.hanzi)}
                title={`Chạm để nghe phát âm ${current.hanzi}`}
                className="shrink-0 self-start sm:self-center rounded-2xl bg-surface-2 p-3 flex items-center justify-center gap-1.5 cursor-pointer hover:bg-primary-soft/40 transition-colors"
              >
                {Array.from(current.hanzi)
                  .slice(0, 4)
                  .map((ch, i, arr) => {
                    const size = arr.length === 1 ? 92 : arr.length === 2 ? 78 : 58;
                    return (
                      <div
                        key={`${ch}-${i}`}
                        className="relative shrink-0 bg-surface/70 rounded-lg"
                        style={{ width: size, height: size }}
                      >
                        <MiZiGeBackdrop />
                        <span
                          className="absolute inset-0 grid place-items-center font-hanzi leading-none text-ink"
                          style={{ fontSize: Math.round(size * 0.68) }}
                        >
                          {ch}
                        </span>
                      </div>
                    );
                  })}
              </div>

              {/* Pinyin, Han-Viet, Meaning & Example right next to the character */}
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex items-baseline gap-2.5 flex-wrap">
                  <span className="text-xl sm:text-2xl font-semibold text-primary">
                    {current.pinyin}
                  </span>
                  {current.hanViet && (
                    <span className="text-sm text-ink-subtle">Hán Việt: {current.hanViet}</span>
                  )}
                </div>
                <p className="text-base sm:text-lg font-medium text-ink">{current.meaning}</p>
                {current.exampleHanzi && (
                  <div className="flex items-start gap-2 pt-0.5">
                    <p className="text-sm text-ink-muted line-clamp-2 flex-1">
                      <span className="font-hanzi text-ink">{current.exampleHanzi}</span>
                      {current.exampleMeaning && <span> — {current.exampleMeaning}</span>}
                    </p>
                    <button
                      type="button"
                      data-testid="home-continue-example-speak-btn"
                      onClick={() => speakChinese(current.exampleHanzi)}
                      aria-label={`Nghe câu ví dụ: ${current.exampleHanzi}`}
                      title={`Nghe phát âm câu ví dụ: ${current.exampleHanzi}`}
                      className="shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-lg bg-surface-2 text-ink-muted hover:text-primary hover:bg-primary-soft/60 transition-colors cursor-pointer"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-border/70 flex flex-wrap items-center gap-2">
              <button
                type="button"
                data-testid="home-continue-btn"
                onClick={onContinueLesson}
                className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-primary hover:bg-primary-hover text-on-primary text-sm font-semibold transition-colors cursor-pointer"
              >
                <BookOpen className="w-4 h-4" />
                Học tiếp
              </button>
              <button
                type="button"
                onClick={() => onPracticeWriting(current)}
                className="inline-flex items-center gap-2 h-10 px-4 rounded-xl border border-border-strong bg-surface hover:bg-surface-2 text-ink text-sm font-medium transition-colors cursor-pointer"
              >
                <PenLine className="w-4 h-4" />
                Luyện viết
              </button>
              <button
                type="button"
                onClick={() => speakChinese(current.hanzi)}
                aria-label={`Nghe phát âm ${current.hanzi}`}
                className="inline-flex items-center gap-1.5 h-10 px-3 rounded-xl text-ink-muted hover:bg-surface-2 hover:text-ink text-sm font-medium transition-colors cursor-pointer"
              >
                <Volume2 className="w-4 h-4" />
                <span>Phát âm</span>
              </button>
            </div>
          </section>
        )}

        {/* Progress with visual circular ring + linear progress bar */}
        <section
          className="rounded-3xl bg-surface border border-border shadow-xs p-5 sm:p-6 flex flex-col justify-between animate-rise-in"
          style={{ '--stagger': 2 } as React.CSSProperties}
          aria-labelledby="progress-heading"
          data-testid="home-progress-card"
        >
          <div>
            <div className="flex items-center justify-between gap-2">
              <h3 id="progress-heading" className="text-sm font-medium text-ink-muted">
                Tiến độ bộ từ
              </h3>
              <span className="text-xs text-ink-subtle tabular-nums">
                Còn {remainingCount} từ cần ôn
              </span>
            </div>

            <div className="mt-3 flex items-center justify-between gap-4">
              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl sm:text-4xl font-semibold tabular-nums text-ink">
                    {learnedCount}
                  </span>
                  <span className="text-sm sm:text-base text-ink-muted">
                    / {slides.length} từ đã thuộc
                  </span>
                </div>
                <p className="text-xs text-ink-subtle mt-1">
                  {learnedCount === slides.length
                    ? 'Tuyệt vời! Bạn đã hoàn thành toàn bộ bộ từ.'
                    : `Đã hoàn thành ${percent}% mục tiêu từ vựng bài học`}
                </p>
              </div>
              <VocabProgressRing percent={percent} />
            </div>

            <div
              className="mt-4 h-2.5 rounded-full bg-surface-2 overflow-hidden"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percent}
              aria-label="Tỷ lệ từ đã thuộc"
            >
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-700 ease-out"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>

          <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl bg-surface-2 px-3 py-2.5">
              <dt className="text-ink-muted text-xs">Kho từ HSK</dt>
              <dd className="font-semibold text-ink tabular-nums">{totalVocabBankCount}</dd>
            </div>
            <div className="rounded-xl bg-surface-2 px-3 py-2.5">
              <dt className="text-ink-muted text-xs">Lớp {userProfile.classCode || '—'}</dt>
              <dd className="font-semibold text-ink tabular-nums">{classroomStudentCount} học viên</dd>
            </div>
          </dl>
        </section>
      </div>

      {/* Quick actions */}
      <section
        aria-labelledby="practice-heading"
        className="animate-rise-in"
        style={{ '--stagger': 3 } as React.CSSProperties}
      >
        <h3 id="practice-heading" className="text-base font-semibold text-ink mb-3">
          Luyện tập
        </h3>
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
          {[
            {
              icon: Layers,
              title: 'Ôn flashcard',
              body: 'Lặp lại ngắt quãng, tự chấm nhớ / quên',
              onClick: onOpenFlashcard,
              testId: 'home-flashcard-btn',
            },
            {
              icon: PenTool,
              title: 'Làm bài tập',
              body: 'Đề HSK 3.0, ghép câu, kiểm tra tốc độ',
              onClick: onOpenHomework,
              testId: 'home-homework-btn',
            },
            {
              icon: Trophy,
              title: 'Bảng xếp hạng',
              body: 'Xem điểm và chuỗi ngày học của lớp',
              onClick: onOpenLeaderboard,
              testId: 'home-leaderboard-btn',
            },
          ].map(({ icon: Icon, title, body, onClick, testId }) => (
            <button
              key={title}
              type="button"
              data-testid={testId}
              onClick={onClick}
              className="group text-left flex items-center gap-3 rounded-2xl bg-surface border border-border hover:border-border-strong p-4 transition-colors cursor-pointer"
            >
              <span className="w-10 h-10 shrink-0 rounded-xl bg-primary-soft text-primary grid place-items-center">
                <Icon className="w-5 h-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-ink">{title}</span>
                <span className="block text-xs text-ink-muted truncate">{body}</span>
              </span>
              <ChevronRight className="w-4 h-4 text-ink-subtle group-hover:text-ink transition-colors" />
            </button>
          ))}
        </div>
      </section>

      {/* Words to review — with smart filter chips, quick search, direct speaker button & detail popup */}
      {remainingCount > 0 && (
        <section
          aria-labelledby="review-heading"
          className="animate-rise-in space-y-3"
          style={{ '--stagger': 4 } as React.CSSProperties}
        >
          <div className="flex items-baseline justify-between gap-2">
            <div>
              <h3 id="review-heading" className="text-base font-semibold text-ink">
                Từ chưa thuộc{' '}
                <span className="text-xs font-normal text-ink-muted tabular-nums">
                  ({filteredUnlearned.length}/{remainingCount} từ)
                </span>
              </h3>
              <p className="text-xs text-ink-muted mt-0.5">
                Bấm vào thẻ từ để xem nhanh Pinyin, nghĩa, ví dụ, luyện đọc thử hoặc mở trong Bài học
              </p>
            </div>
            <button
              type="button"
              onClick={onOpenFlashcard}
              className="text-sm font-medium text-primary hover:underline cursor-pointer shrink-0"
            >
              Ôn tất cả
            </button>
          </div>

          {/* Smart Filter & Quick Search Toolbar */}
          <div
            data-testid="home-unlearned-toolbar"
            className="flex flex-col sm:flex-row sm:items-center gap-2.5 rounded-2xl bg-surface border border-border p-2.5"
          >
            <div className="relative sm:w-64 shrink-0">
              <Search className="w-4 h-4 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                data-testid="home-unlearned-search-input"
                value={unlearnedSearchQuery}
                onChange={(e) => setUnlearnedSearchQuery(e.target.value)}
                placeholder="Tìm chữ Hán, Pinyin, nghĩa..."
                aria-label="Tìm nhanh trong danh sách từ chưa thuộc"
                className="w-full h-9 pl-9 pr-8 rounded-xl bg-surface-2 border border-transparent focus:border-primary focus:bg-surface focus:outline-none text-sm text-ink placeholder:text-ink-subtle"
              />
              {unlearnedSearchQuery && (
                <button
                  type="button"
                  onClick={() => setUnlearnedSearchQuery('')}
                  aria-label="Xóa từ khóa tìm kiếm"
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full grid place-items-center text-ink-subtle hover:text-ink cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div
              className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5"
              role="group"
              aria-label="Bộ lọc từ chưa thuộc"
            >
              {[
                { id: 'all', label: 'Tất cả', testId: 'unlearned-filter-all' },
                { id: 'hard', label: 'Hay quên / Từ khó', testId: 'unlearned-filter-hard' },
                { id: 'new', label: 'Chưa học lần nào', testId: 'unlearned-filter-new' },
                ...posCategories.map((pos) => ({
                  id: `pos:${pos}`,
                  label: pos,
                  testId: `unlearned-filter-pos-${pos}`,
                })),
              ].map((chip) => {
                const active = unlearnedFilter === chip.id;
                return (
                  <button
                    key={chip.id}
                    type="button"
                    data-testid={chip.testId}
                    onClick={() => setUnlearnedFilter(chip.id)}
                    aria-pressed={active}
                    className={`h-8 px-3 rounded-xl text-xs font-medium whitespace-nowrap shrink-0 border transition-colors cursor-pointer ${
                      active
                        ? 'bg-primary-soft text-primary border-primary/40 font-semibold'
                        : 'bg-surface-2/70 text-ink-muted border-transparent hover:text-ink hover:bg-surface-2'
                    }`}
                  >
                    {chip.label}
                  </button>
                );
              })}
            </div>
          </div>

          {displayedUnlearned.length === 0 ? (
            <div
              data-testid="home-unlearned-empty-state"
              className="rounded-2xl bg-surface border border-border p-6 text-center space-y-2"
            >
              <p className="text-sm text-ink-muted">
                Không tìm thấy từ chưa thuộc nào khớp với bộ lọc hiện tại.
              </p>
              <button
                type="button"
                onClick={() => {
                  setUnlearnedSearchQuery('');
                  setUnlearnedFilter('all');
                }}
                className="inline-flex items-center h-8 px-3 rounded-xl bg-surface-2 hover:bg-primary-soft text-xs font-medium text-primary transition-colors cursor-pointer"
              >
                Đặt lại bộ lọc
              </button>
            </div>
          ) : (
            <ul className="grid gap-2.5 grid-cols-2 sm:grid-cols-4">
              {displayedUnlearned.map(({ s, i, isHard }) => (
                <li
                  key={s.id}
                  className="group relative rounded-2xl bg-surface border border-border hover:border-primary/40 transition-colors"
                >
                  <button
                    type="button"
                    data-testid={`home-unlearned-word-${s.hanzi}`}
                    onClick={() => {
                      setPreviewWord({ slide: s, index: i });
                      speakChinese(s.hanzi);
                    }}
                    aria-label={`Xem chi tiết từ ${s.hanzi} (${s.pinyin} - ${s.meaning})`}
                    className="w-full text-left px-4 py-3 pr-10 cursor-pointer"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="font-hanzi text-2xl text-ink leading-tight group-hover:text-primary transition-colors">
                        {s.hanzi}
                      </span>
                      {isHard && (
                        <span className="px-1.5 py-0.5 rounded bg-accent-soft text-accent text-[10px] font-medium">
                          Khó
                        </span>
                      )}
                    </div>
                    <span className="block text-xs text-ink-muted mt-1 truncate">
                      {s.pinyin} · {s.meaning}
                    </span>
                  </button>
                  <button
                    type="button"
                    data-testid={`home-unlearned-speak-${s.hanzi}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      speakChinese(s.hanzi);
                    }}
                    aria-label={`Nghe phát âm ${s.hanzi}`}
                    title={`Nghe phát âm ${s.hanzi}`}
                    className="absolute top-2.5 right-2.5 w-7 h-7 rounded-lg grid place-items-center text-ink-subtle hover:text-primary hover:bg-primary-soft/60 transition-colors cursor-pointer"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {isTeacher && (
        <section
          aria-labelledby="teach-heading"
          className="animate-rise-in"
          style={{ '--stagger': 5 } as React.CSSProperties}
        >
          <h3 id="teach-heading" className="text-base font-semibold text-ink mb-3">
            Giảng dạy
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={onOpenLessonBuilder}
              className="text-left flex items-center gap-3 rounded-2xl bg-surface border border-border hover:border-border-strong p-4 transition-colors cursor-pointer"
            >
              <span className="w-10 h-10 shrink-0 rounded-xl bg-surface-2 text-ink grid place-items-center">
                <Presentation className="w-5 h-5" />
              </span>
              <span>
                <span className="block text-sm font-semibold text-ink">Soạn bài giảng</span>
                <span className="block text-xs text-ink-muted">Thêm từ, sắp xếp slide, trình chiếu</span>
              </span>
            </button>
            <button
              type="button"
              onClick={onOpenClassroom}
              className="text-left flex items-center gap-3 rounded-2xl bg-surface border border-border hover:border-border-strong p-4 transition-colors cursor-pointer"
            >
              <span className="w-10 h-10 shrink-0 rounded-xl bg-surface-2 text-ink grid place-items-center">
                <GraduationCap className="w-5 h-5" />
              </span>
              <span>
                <span className="block text-sm font-semibold text-ink">Quản lý lớp</span>
                <span className="block text-xs text-ink-muted">
                  {classroomStudentCount} học viên · giao bài, chấm điểm
                </span>
              </span>
            </button>
          </div>
        </section>
      )}

      {/* Quick Word Detail Popup for "Từ chưa thuộc" */}
      <Dialog
        isOpen={Boolean(activePreviewSlide && previewWord)}
        onClose={() => setPreviewWord(null)}
        title={activePreviewSlide ? `Chi tiết từ vựng ${activePreviewSlide.hanzi}` : 'Chi tiết từ vựng'}
        maxWidthClass="max-w-lg"
        testId="home-word-detail-dialog"
      >
        {activePreviewSlide && previewWord && (
          <div className="rounded-3xl bg-surface border border-border shadow-xl p-5 sm:p-6 space-y-4 text-ink">
            <div className="flex items-start justify-between gap-3">
              <div className="text-xs text-ink-subtle">
                Từ số {previewWord.index + 1}/{slides.length} · {activePreviewSlide.hskLevel}
                {activePreviewSlide.partOfSpeech ? ` · ${activePreviewSlide.partOfSpeech}` : ''}
              </div>
              <button
                type="button"
                onClick={() => setPreviewWord(null)}
                aria-label="Đóng cửa sổ chi tiết từ"
                className="w-8 h-8 rounded-full grid place-items-center text-ink-muted hover:bg-surface-2 hover:text-ink transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div
                onClick={() => speakChinese(activePreviewSlide.hanzi)}
                className="shrink-0 self-start rounded-2xl bg-surface-2 p-3 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {Array.from(activePreviewSlide.hanzi)
                  .slice(0, 4)
                  .map((ch, idx, arr) => {
                    const size = arr.length === 1 ? 84 : arr.length === 2 ? 72 : 56;
                    return (
                      <div
                        key={`${ch}-${idx}`}
                        className="relative shrink-0 bg-surface/80 rounded-lg"
                        style={{ width: size, height: size }}
                      >
                        <MiZiGeBackdrop />
                        <span
                          className="absolute inset-0 grid place-items-center font-hanzi leading-none text-ink"
                          style={{ fontSize: Math.round(size * 0.68) }}
                        >
                          {ch}
                        </span>
                      </div>
                    );
                  })}
              </div>

              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-baseline gap-2.5 flex-wrap">
                  <span
                    className="text-2xl font-semibold text-primary"
                    data-testid="home-word-detail-pinyin"
                  >
                    {activePreviewSlide.pinyin}
                  </span>
                  {activePreviewSlide.hanViet && (
                    <span className="text-sm text-ink-subtle">
                      Hán Việt: {activePreviewSlide.hanViet}
                    </span>
                  )}
                </div>
                <p
                  className="text-lg font-semibold text-ink"
                  data-testid="home-word-detail-meaning"
                >
                  {activePreviewSlide.meaning}
                </p>
                {activePreviewSlide.usageNote && (
                  <p className="text-xs text-ink-muted leading-relaxed">
                    {activePreviewSlide.usageNote}
                  </p>
                )}
              </div>
            </div>

            {activePreviewSlide.exampleHanzi && (
              <div className="rounded-2xl bg-surface-2 p-3.5 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-ink-subtle">Câu ví dụ</span>
                  <button
                    type="button"
                    onClick={() => speakChinese(activePreviewSlide.exampleHanzi)}
                    className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline cursor-pointer"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    Nghe câu
                  </button>
                </div>
                <p className="font-hanzi text-base sm:text-lg text-ink">
                  {activePreviewSlide.exampleHanzi}
                </p>
                {activePreviewSlide.examplePinyin && (
                  <p className="text-xs text-primary">{activePreviewSlide.examplePinyin}</p>
                )}
                {activePreviewSlide.exampleMeaning && (
                  <p className="text-sm text-ink-muted">{activePreviewSlide.exampleMeaning}</p>
                )}
              </div>
            )}

            {/* Speech Recognition Pronunciation Result inside Popup */}
            <PronunciationResultBanner
              result={popupPronunciation.result}
              targetHanzi={activePreviewSlide.hanzi}
              onRetry={popupPronunciation.startOrStopPractice}
              onClose={popupPronunciation.clearResult}
              testId="popup-pronunciation-result"
            />

            <div className="pt-2 border-t border-border flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  data-testid="home-word-detail-open-lesson-btn"
                  onClick={() => {
                    const targetIdx = previewWord.index;
                    recordDailyWordReview(activePreviewSlide.id, slides);
                    setPreviewWord(null);
                    onPickSlide(targetIdx);
                  }}
                  className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl bg-primary hover:bg-primary-hover text-on-primary text-sm font-semibold transition-colors cursor-pointer"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Mở trong Bài học</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const targetSlide = activePreviewSlide;
                    recordDailyWordReview(activePreviewSlide.id, slides);
                    setPreviewWord(null);
                    onPracticeWriting(targetSlide);
                  }}
                  className="inline-flex items-center gap-1.5 h-10 px-3.5 rounded-xl border border-border-strong bg-surface hover:bg-surface-2 text-ink text-sm font-medium transition-colors cursor-pointer"
                >
                  <PenLine className="w-4 h-4" />
                  <span>Luyện viết</span>
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => speakChinese(activePreviewSlide.hanzi)}
                  aria-label={`Phát âm ${activePreviewSlide.hanzi}`}
                  className="inline-flex items-center gap-1.5 h-10 px-3 rounded-xl border border-border bg-surface hover:bg-surface-2 text-ink text-sm font-medium transition-colors cursor-pointer"
                >
                  <Volume2 className="w-4 h-4 text-primary" />
                  <span>Phát âm</span>
                </button>
                <PronunciationPracticeButton
                  isRecording={popupPronunciation.isRecording}
                  onClick={() => popupPronunciation.startOrStopPractice()}
                  testId="popup-pronounce-practice-btn"
                />
                {onToggleLearned && (
                  <button
                    type="button"
                    data-testid="home-word-detail-toggle-learned-btn"
                    onClick={() => {
                      recordDailyWordReview(activePreviewSlide.id, slides);
                      onToggleLearned(activePreviewSlide.id);
                      setPreviewWord(null);
                    }}
                    className="inline-flex items-center gap-1.5 h-10 px-3 rounded-xl border border-border bg-surface hover:bg-surface-2 text-ink text-sm font-medium transition-colors cursor-pointer"
                  >
                    <Check className="w-4 h-4 text-success" />
                    <span>{activePreviewSlide.learned ? 'Bỏ đánh dấu' : 'Đã thuộc'}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
