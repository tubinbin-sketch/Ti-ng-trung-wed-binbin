import React from 'react';
import {
  BookOpen,
  ChevronRight,
  GraduationCap,
  Layers,
  PenLine,
  PenTool,
  Presentation,
  Trophy,
  Volume2,
} from 'lucide-react';
import { VocabSlide } from '../data/chineseData';
import { UserProfile } from './AuthModal';
import { speakChinese } from '../utils/speech';

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
}: HomeDashboardProps) {
  const current = slides[activeSlideIndex] || slides[0];
  const learnedCount = slides.filter((s) => s.learned).length;
  const total = slides.length || 1;
  const percent = Math.round((learnedCount / total) * 100);
  const toReview = slides
    .map((s, i) => ({ s, i }))
    .filter(({ s }) => !s.learned)
    .slice(0, 8);
  const isTeacher = userProfile.role === 'teacher';

  return (
    <div className="space-y-6" data-testid="home-dashboard">
      <div className="animate-rise-in">
        <p className="text-sm text-ink-muted">{greetingForNow()},</p>
        <h2 className="text-2xl sm:text-[28px] font-semibold text-ink mt-0.5">
          {firstName(userProfile.name)}
        </h2>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Continue lesson — the featured word */}
        {current && (
          <section
            className="lg:col-span-2 rounded-3xl bg-surface border border-border shadow-xs overflow-hidden animate-rise-in"
            style={{ '--stagger': 1 } as React.CSSProperties}
            aria-labelledby="continue-heading"
          >
            <div className="flex flex-col sm:flex-row">
              <div className="shrink-0 sm:w-64 min-h-44 p-6 flex items-center justify-center gap-1.5 bg-surface-2">
                {Array.from(current.hanzi)
                  .slice(0, 4)
                  .map((ch, i, arr) => {
                    const size = arr.length === 1 ? 144 : arr.length === 2 ? 96 : 68;
                    return (
                      <div key={`${ch}-${i}`} className="relative shrink-0" style={{ width: size, height: size }}>
                        <MiZiGeBackdrop />
                        <span
                          className="absolute inset-0 grid place-items-center font-hanzi leading-none text-ink"
                          style={{ fontSize: size * 0.68 }}
                        >
                          {ch}
                        </span>
                      </div>
                    );
                  })}
              </div>

              <div className="flex-1 p-5 sm:p-6 flex flex-col gap-4">
                <div>
                  <h3 id="continue-heading" className="text-sm font-medium text-ink-muted">
                    Tiếp tục bài học
                  </h3>
                  <div className="mt-2 flex items-baseline gap-3 flex-wrap">
                    <span className="text-xl font-semibold text-ink">{current.pinyin}</span>
                    {current.hanViet && (
                      <span className="text-sm text-ink-subtle">{current.hanViet}</span>
                    )}
                    <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-primary-soft text-primary">
                      {current.hskLevel}
                    </span>
                  </div>
                  <p className="mt-1.5 text-ink">{current.meaning}</p>
                  {current.exampleHanzi && (
                    <p className="mt-3 text-sm text-ink-muted">
                      <span className="font-hanzi text-ink">{current.exampleHanzi}</span>
                      {current.exampleMeaning && <span> — {current.exampleMeaning}</span>}
                    </p>
                  )}
                </div>

                <div className="mt-auto flex flex-wrap items-center gap-2">
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
                    className="inline-flex items-center justify-center w-10 h-10 rounded-xl text-ink-muted hover:bg-surface-2 hover:text-ink transition-colors cursor-pointer"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Progress */}
        <section
          className="rounded-3xl bg-surface border border-border shadow-xs p-5 sm:p-6 flex flex-col animate-rise-in"
          style={{ '--stagger': 2 } as React.CSSProperties}
          aria-labelledby="progress-heading"
        >
          <h3 id="progress-heading" className="text-sm font-medium text-ink-muted">
            Tiến độ bộ từ
          </h3>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="text-4xl font-semibold tabular-nums text-ink">{learnedCount}</span>
            <span className="text-ink-muted">/ {slides.length} từ đã thuộc</span>
          </div>
          <div
            className="mt-4 h-2 rounded-full bg-surface-2 overflow-hidden"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
            aria-label="Tỷ lệ từ đã thuộc"
          >
            <div className="h-full rounded-full bg-primary transition-[width] duration-700 ease-out" style={{ width: `${percent}%` }} />
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

      {/* Words to review */}
      {toReview.length > 0 && (
        <section
          aria-labelledby="review-heading"
          className="animate-rise-in"
          style={{ '--stagger': 4 } as React.CSSProperties}
        >
          <div className="flex items-baseline justify-between mb-3">
            <h3 id="review-heading" className="text-base font-semibold text-ink">
              Từ chưa thuộc
            </h3>
            <button
              type="button"
              onClick={onOpenFlashcard}
              className="text-sm font-medium text-primary hover:underline cursor-pointer"
            >
              Ôn tất cả
            </button>
          </div>
          <ul className="grid gap-2 grid-cols-2 sm:grid-cols-4">
            {toReview.map(({ s, i }) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => onPickSlide(i)}
                  className="w-full text-left rounded-2xl bg-surface border border-border hover:border-primary/40 px-4 py-3 transition-colors cursor-pointer"
                >
                  <span className="block font-hanzi text-2xl text-ink leading-tight">{s.hanzi}</span>
                  <span className="block text-xs text-ink-muted mt-1 truncate">
                    {s.pinyin} · {s.meaning}
                  </span>
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
    </div>
  );
}
