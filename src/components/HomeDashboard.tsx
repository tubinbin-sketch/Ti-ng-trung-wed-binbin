import React, { useState } from 'react';
import {
  BookOpen,
  Check,
  ChevronRight,
  GraduationCap,
  Layers,
  PenLine,
  PenTool,
  Presentation,
  Trophy,
  Volume2,
  X,
} from 'lucide-react';
import { VocabSlide } from '../data/chineseData';
import { UserProfile } from './AuthModal';
import { speakChinese } from '../utils/speech';
import { Dialog } from './ui/Dialog';

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

  const current = slides[activeSlideIndex] || slides[0];
  const learnedCount = slides.filter((s) => s.learned).length;
  const total = slides.length || 1;
  const percent = Math.round((learnedCount / total) * 100);
  const remainingCount = Math.max(0, slides.length - learnedCount);
  const toReview = slides
    .map((s, i) => ({ s, i }))
    .filter(({ s }) => !s.learned)
    .slice(0, 8);
  const isTeacher = userProfile.role === 'teacher';

  const activePreviewSlide = previewWord
    ? slides[previewWord.index] || previewWord.slide
    : null;

  return (
    <div className="space-y-6 pb-24 sm:pb-16 lg:pb-10" data-testid="home-dashboard">
      <div className="animate-rise-in">
        <p className="text-sm text-ink-muted">{greetingForNow()},</p>
        <h2 className="text-2xl sm:text-[28px] font-semibold text-ink mt-0.5">
          {firstName(userProfile.name)}
        </h2>
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
                  <p className="text-sm text-ink-muted line-clamp-2 pt-0.5">
                    <span className="font-hanzi text-ink">{current.exampleHanzi}</span>
                    {current.exampleMeaning && <span> — {current.exampleMeaning}</span>}
                  </p>
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

      {/* Words to review — click to open quick detail popup or jump directly to lesson */}
      {toReview.length > 0 && (
        <section
          aria-labelledby="review-heading"
          className="animate-rise-in"
          style={{ '--stagger': 4 } as React.CSSProperties}
        >
          <div className="flex items-baseline justify-between gap-2 mb-3">
            <div>
              <h3 id="review-heading" className="text-base font-semibold text-ink">
                Từ chưa thuộc
              </h3>
              <p className="text-xs text-ink-muted mt-0.5">
                Bấm vào thẻ từ để xem nhanh Pinyin, nghĩa, ví dụ hoặc mở trong Bài học
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
          <ul className="grid gap-2.5 grid-cols-2 sm:grid-cols-4">
            {toReview.map(({ s, i }) => (
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
                  <span className="block font-hanzi text-2xl text-ink leading-tight group-hover:text-primary transition-colors">
                    {s.hanzi}
                  </span>
                  <span className="block text-xs text-ink-muted mt-1 truncate">
                    {s.pinyin} · {s.meaning}
                  </span>
                </button>
                <button
                  type="button"
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

            <div className="pt-2 border-t border-border flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  data-testid="home-word-detail-open-lesson-btn"
                  onClick={() => {
                    const targetIdx = previewWord.index;
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
                    setPreviewWord(null);
                    onPracticeWriting(targetSlide);
                  }}
                  className="inline-flex items-center gap-1.5 h-10 px-3.5 rounded-xl border border-border-strong bg-surface hover:bg-surface-2 text-ink text-sm font-medium transition-colors cursor-pointer"
                >
                  <PenLine className="w-4 h-4" />
                  <span>Luyện viết</span>
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => speakChinese(activePreviewSlide.hanzi)}
                  aria-label={`Phát âm ${activePreviewSlide.hanzi}`}
                  className="inline-flex items-center gap-1.5 h-10 px-3 rounded-xl border border-border bg-surface hover:bg-surface-2 text-ink text-sm font-medium transition-colors cursor-pointer"
                >
                  <Volume2 className="w-4 h-4 text-primary" />
                  <span>Phát âm</span>
                </button>
                {onToggleLearned && (
                  <button
                    type="button"
                    data-testid="home-word-detail-toggle-learned-btn"
                    onClick={() => {
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
