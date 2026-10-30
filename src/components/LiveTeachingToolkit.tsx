import React, { useEffect, useMemo, useState } from 'react';
import {
  Monitor,
  Dices,
  Timer,
  FileSpreadsheet,
  Volume2,
  ChevronLeft,
  ChevronRight,
  Star,
  Play,
  Pause,
  RotateCcw,
  Printer,
  Copy,
  Check,
  X,
  Sparkles,
  BookOpen,
  Gamepad2,
  Send,
  Headphones,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { VocabSlide } from '../data/chineseData';
import {
  formatClassTimer,
  generateHsk3LessonPlanSummary,
  getHsk3VocabStandard,
  pickRandomStudent,
} from '../utils/hsk3Engine';
import {
  awardStudentBonusPoints,
  ClassStudentRecord,
} from '../utils/chineseEngine';
import {
  getStoredStudentRoster,
  STORAGE_KEY_STUDENTS,
} from './ClassroomManager';
import { playGentleChime, speakChinese } from '../utils/speech';
import {
  ClassroomMiniGameMode,
  generateAssignmentFromSlides,
  generateClassroomMiniGameQuestions,
} from '../utils/hskStudyHelpers';
import { saveStoredAssignment } from '../utils/assignmentParser';
import { SlideIllustration } from './SlideIllustration';

interface LiveTeachingToolkitProps {
  slides: VocabSlide[];
  currentSlide: VocabSlide;
  activeSlideIndex: number;
  onSelectSlideIndex: (idx: number) => void;
  onNotify?: (message: string) => void;
  onSwitchToStudentHomework?: () => void;
}

export const LiveTeachingToolkit: React.FC<LiveTeachingToolkitProps> = ({
  slides,
  currentSlide,
  activeSlideIndex,
  onSelectSlideIndex,
  onNotify,
  onSwitchToStudentHomework,
}) => {
  // 1. Projector Mode state
  const [isProjectorOpen, setIsProjectorOpen] = useState(false);

  // 2. Lucky Student Picker state
  const [isLuckyModalOpen, setIsLuckyModalOpen] = useState(false);
  const [roster, setRoster] = useState<ClassStudentRecord[]>(() => getStoredStudentRoster());
  const [pickedStudent, setPickedStudent] = useState<ClassStudentRecord | null>(() => {
    const initial = getStoredStudentRoster();
    return initial[0] || null;
  });
  const [isSpinningStudent, setIsSpinningStudent] = useState(false);
  const [awardedBanner, setAwardedBanner] = useState<string | null>(null);

  // 3. Class Timer state
  const [isTimerPanelOpen, setIsTimerPanelOpen] = useState(false);
  const [timerPresetSeconds, setTimerPresetSeconds] = useState<number>(60);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(60);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [timerFinishedAlert, setTimerFinishedAlert] = useState<boolean>(false);

  // 4. 1-Click Classroom Mini-Game state
  const [isMiniGameOpen, setIsMiniGameOpen] = useState(false);
  const [miniGameMode, setMiniGameMode] = useState<ClassroomMiniGameMode>('image-to-hanzi');
  const [miniGameRoundIdx, setMiniGameRoundIdx] = useState(0);
  const [miniGameSelectedOption, setMiniGameSelectedOption] = useState<string | null>(null);
  const [miniGameScore, setMiniGameScore] = useState(0);
  const [miniGameStudentId, setMiniGameStudentId] = useState<string>(() => {
    const initial = getStoredStudentRoster();
    return initial[0]?.id || 'st-1';
  });
  const [miniGameBonusBanner, setMiniGameBonusBanner] = useState<string | null>(null);

  // 5. 1-Click Assignment Generator from Slide state
  const [isAssignSlideModalOpen, setIsAssignSlideModalOpen] = useState(false);
  const [selectedSlideIdsForHomework, setSelectedSlideIdsForHomework] = useState<string[]>(() =>
    slides.slice(0, 6).map((s) => s.id)
  );
  const [assignedSuccessBanner, setAssignedSuccessBanner] = useState<string | null>(null);

  // 6. HSK 3.0 Lesson Plan & Worksheet Summary Modal state
  const [isLessonPlanOpen, setIsLessonPlanOpen] = useState(false);
  const [copiedLessonPlan, setCopiedLessonPlan] = useState(false);

  const currentHsk3Meta = useMemo(
    () => getHsk3VocabStandard(currentSlide),
    [currentSlide]
  );

  const lessonPlanSummary = useMemo(
    () => generateHsk3LessonPlanSummary(slides),
    [slides]
  );

  const miniGameQuestions = useMemo(
    () => generateClassroomMiniGameQuestions(slides, miniGameMode, 6),
    [slides, miniGameMode]
  );
  const currentMiniGameQ =
    miniGameQuestions[miniGameRoundIdx % Math.max(1, miniGameQuestions.length)] ||
    miniGameQuestions[0];

  // Keep roster synced with localStorage updates
  useEffect(() => {
    const syncRoster = () => {
      const latest = getStoredStudentRoster();
      setRoster(latest);
      setPickedStudent((prev) => {
        if (!prev) return latest[0] || null;
        return latest.find((s) => s.id === prev.id || s.name === prev.name) || latest[0] || null;
      });
    };
    window.addEventListener('hanu_students_updated', syncRoster);
    return () => window.removeEventListener('hanu_students_updated', syncRoster);
  }, []);

  // Allow toggling Fullscreen Projector via 'F' shortcut event or Escape key
  useEffect(() => {
    const handleToggleProjector = () => {
      setIsProjectorOpen((prev) => !prev);
    };
    window.addEventListener('hanu_toggle_projector_fullscreen', handleToggleProjector);
    return () => {
      window.removeEventListener('hanu_toggle_projector_fullscreen', handleToggleProjector);
    };
  }, []);

  // Escape key closes Projector Fullscreen Mode
  useEffect(() => {
    if (!isProjectorOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsProjectorOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isProjectorOpen]);

  // Countdown interval for Class Timer
  useEffect(() => {
    if (!isTimerRunning) return;
    const interval = window.setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          window.clearInterval(interval);
          setIsTimerRunning(false);
          setTimerFinishedAlert(true);
          playGentleChime(880, 0.35);
          setTimeout(() => playGentleChime(1046.5, 0.4), 240);
          onNotify?.('⏰ Hết giờ thảo luận / viết bài! Đã phát chuông báo lớp học.');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [isTimerRunning, onNotify]);

  const handleOpenLuckyPicker = () => {
    const latest = getStoredStudentRoster();
    setRoster(latest);
    setAwardedBanner(null);
    if (!pickedStudent && latest.length > 0) {
      setPickedStudent(latest[0]);
    }
    setIsLuckyModalOpen(true);
  };

  const handleSpinLuckyStudent = () => {
    const latest = getStoredStudentRoster();
    setRoster(latest);
    setAwardedBanner(null);
    if (latest.length === 0) return;

    setIsSpinningStudent(true);
    playGentleChime(587.33, 0.12);
    setTimeout(() => {
      const chosen = pickRandomStudent(latest, pickedStudent?.id);
      if (chosen) {
        setPickedStudent(chosen);
      }
      setIsSpinningStudent(false);
      playGentleChime(783.99, 0.22);
    }, 180);
  };

  const handleAwardBonusPoint = (targetStudent?: ClassStudentRecord | null, customReason?: string) => {
    const studentToReward = targetStudent || pickedStudent;
    if (!studentToReward) return;
    const currentRoster = getStoredStudentRoster();
    const updatedRoster = awardStudentBonusPoints(
      currentRoster,
      studentToReward.id,
      1,
      customReason || `Phát biểu xây dựng bài từ vựng “${currentSlide.hanzi}”`
    );
    try {
      localStorage.setItem(STORAGE_KEY_STUDENTS, JSON.stringify(updatedRoster));
    } catch {
      // ignore storage errors
    }
    setRoster(updatedRoster);
    const updatedTarget =
      updatedRoster.find((s) => s.id === studentToReward.id || s.name === studentToReward.name) ||
      studentToReward;
    setPickedStudent(updatedTarget);
    window.dispatchEvent(
      new CustomEvent('hanu_students_updated', { detail: updatedRoster.length })
    );
    const msg = `Đã cộng +1 ⭐ Phát biểu cho học viên ${updatedTarget.name} (Tổng điểm mới: ${updatedTarget.totalPoints}/100đ)!`;
    setAwardedBanner(msg);
    setMiniGameBonusBanner(msg);
    onNotify?.(msg);
    playGentleChime(987.77, 0.28);
  };

  const handleSelectTimerPreset = (seconds: number) => {
    setTimerPresetSeconds(seconds);
    setRemainingSeconds(seconds);
    setTimerFinishedAlert(false);
    setIsTimerRunning(true);
    playGentleChime(659.25, 0.15);
  };

  const handleOpenMiniGame = () => {
    const latest = getStoredStudentRoster();
    setRoster(latest);
    setMiniGameRoundIdx(0);
    setMiniGameSelectedOption(null);
    setMiniGameScore(0);
    setMiniGameBonusBanner(null);
    setIsMiniGameOpen(true);
    if (currentSlide?.hanzi) {
      speakChinese(currentSlide.hanzi);
    }
  };

  const handlePickMiniGameAnswer = (optHanzi: string, isCorrect: boolean) => {
    if (miniGameSelectedOption) return;
    setMiniGameSelectedOption(optHanzi);
    speakChinese(optHanzi);
    if (isCorrect) {
      setMiniGameScore((s) => s + 10);
      playGentleChime(783.99, 0.22);
    } else {
      playGentleChime(392, 0.16);
    }
  };

  const handleOpenAssignFromSlideModal = () => {
    // Ensure currentSlide is always included in selection by default
    setSelectedSlideIdsForHomework((prev) => {
      if (prev.includes(currentSlide.id)) return prev;
      return [currentSlide.id, ...prev.slice(0, 5)];
    });
    setAssignedSuccessBanner(null);
    setIsAssignSlideModalOpen(true);
  };

  const handleToggleSlideForHomework = (slideId: string) => {
    setSelectedSlideIdsForHomework((prev) =>
      prev.includes(slideId) ? prev.filter((id) => id !== slideId) : [...prev, slideId]
    );
  };

  const handlePublishSlideAssignment = () => {
    const chosenSlides = slides.filter((s) => selectedSlideIdsForHomework.includes(s.id));
    const effectiveSlides = chosenSlides.length > 0 ? chosenSlides : [currentSlide, ...slides.slice(0, 3)];
    const pkg = generateAssignmentFromSlides(effectiveSlides, 14);
    saveStoredAssignment(pkg);
    const wordListStr = effectiveSlides.map((s) => s.hanzi).join(', ');
    const msg = `✅ Đã giao bài tập về nhà từ Slide (${effectiveSlides.length} từ: ${wordListStr}) sang Chế độ Học sinh!`;
    setAssignedSuccessBanner(msg);
    onNotify?.(msg);
    playGentleChime(880, 0.25);
  };

  const handleCopyLessonPlan = () => {
    const lines = [
      `=== ${lessonPlanSummary.lessonTitle} ===`,
      `Tổng số từ vựng: ${lessonPlanSummary.totalWords} từ (Chữ viết tay 手写字: ${lessonPlanSummary.handwritingCount} · Chữ nhận diện 认读字: ${lessonPlanSummary.recognitionCount})`,
      '',
      ...lessonPlanSummary.rows.map(
        (r) =>
          `${r.index}. ${r.hanzi} (${r.pinyin} - Hán Việt: ${r.hanViet.toUpperCase()}) [${r.hskLevel} · ${r.charStandard}]: ${r.meaning}\n   - Điểm ngữ pháp (语法点): ${r.grammarFormula}\n   - Phân biệt & Ngữ dụng: ${r.synonymNote}\n   - Câu ví dụ: ${r.exampleSentence}`
      ),
    ];
    try {
      navigator.clipboard?.writeText(lines.join('\n'));
    } catch {
      // ignore clipboard errors in headless browser
    }
    setCopiedLessonPlan(true);
    onNotify?.('Đã sao chép toàn bộ Giáo án & Bảng ngữ pháp HSK 3.0 vào bộ nhớ tạm!');
    setTimeout(() => setCopiedLessonPlan(false), 2500);
  };

  return (
    <>
      {/* =====================================================================
          TEACHER LIVE TEACHING TOOLKIT BAR (SLIM 44PX FLOATING PILL BAR)
          ===================================================================== */}
      <div
        data-testid="live-teaching-toolkit-bar"
        className="relative"
      >
        <div className="min-h-[34px] rounded-xl bg-[#1E3227] text-[#FAFBF7] border border-[#C5B358]/60 px-2.5 py-1 shadow-xs flex items-center justify-between gap-1.5 flex-nowrap overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1 shrink-0">
            <span className="font-sans text-[11px] font-bold text-[#C5B358] whitespace-nowrap shrink-0">
              🎛️ Đứng lớp:
            </span>
          </div>

          {/* Compact 1-Click Classroom Buttons on 1 Single Line */}
          <div className="flex items-center gap-1 shrink-0 flex-nowrap">
            <button
              type="button"
              data-testid="toolkit-projector-btn"
              onClick={() => {
                setIsProjectorOpen(true);
                speakChinese(currentSlide.hanzi);
              }}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#C5B358] hover:bg-[#d5c368] text-[#1E3227] text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap"
              title="Mở chế độ màn hình lớn chữ to (Phím tắt: F)"
            >
              <Monitor className="w-3 h-3 shrink-0" />
              <span>Fullscreen</span>
            </button>

            <button
              type="button"
              data-testid="toolkit-lucky-picker-btn"
              onClick={handleOpenLuckyPicker}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white/10 hover:bg-white/20 text-[#FAFBF7] border border-[#C5B358]/40 text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap"
              title="Quay số ngẫu nhiên gọi học viên phát biểu"
            >
              <Dices className="w-3 h-3 text-[#C5B358] shrink-0" />
              <span>Gọi tên</span>
            </button>

            <button
              type="button"
              data-testid="toolkit-timer-btn"
              onClick={() => setIsTimerPanelOpen((v) => !v)}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap border tabular-nums ${
                isTimerPanelOpen || isTimerRunning
                  ? 'bg-[#FAFBF7] text-[#1E3227] border-[#C5B358]'
                  : 'bg-white/10 hover:bg-white/20 text-[#FAFBF7] border-[#C5B358]/40'
              }`}
              title="Đồng hồ bấm giờ thảo luận lớp học"
            >
              <Timer className="w-3 h-3 text-[#C5B358] shrink-0" />
              <span>{formatClassTimer(remainingSeconds)}</span>
            </button>

            <button
              type="button"
              data-testid="toolkit-minigame-btn"
              onClick={handleOpenMiniGame}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#C84B31] hover:bg-[#d8583d] text-white border border-[#C5B358]/50 text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap shadow-2xs"
              title="Mở Mini-Game tương tác nhanh cho cả lớp"
            >
              <Gamepad2 className="w-3 h-3 text-[#FDE68A] shrink-0" />
              <span>Mini-Game</span>
            </button>

            <button
              type="button"
              data-testid="toolkit-assign-slide-btn"
              onClick={handleOpenAssignFromSlideModal}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#E7ECD9] hover:bg-white text-[#1E3227] border border-[#C5B358] text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap"
              title="Giao bài tập về nhà 1-Click từ Slide hiện tại"
            >
              <Send className="w-3 h-3 text-[#1E3227] shrink-0" />
              <span>Giao bài</span>
            </button>

            <button
              type="button"
              data-testid="toolkit-lesson-plan-btn"
              onClick={() => setIsLessonPlanOpen(true)}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white/10 hover:bg-white/20 text-[#FAFBF7] border border-[#C5B358]/40 text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap"
              title="Xem và sao chép Giáo án HSK 3.0"
            >
              <FileSpreadsheet className="w-3 h-3 text-[#C5B358] shrink-0" />
              <span>Giáo án</span>
            </button>
          </div>
        </div>

        {/* Compact On-Demand Timer Popover Bar (Only shown when teacher clicks ⏱️ Bấm giờ) */}
        {isTimerPanelOpen && (
          <div
            data-testid="toolkit-timer-panel"
            className="mt-1.5 rounded-2xl bg-[#1E3227] text-[#FAFBF7] border border-[#C5B358]/60 px-3.5 py-2 shadow-lg flex flex-wrap items-center justify-between gap-2.5"
          >
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-bold text-[#C5B358]">
                ⏱️ Chọn nhanh thời gian:
              </span>
              {[
                { label: '30s', secs: 30 },
                { label: '1p', secs: 60 },
                { label: '3p', secs: 180 },
              ].map((preset) => (
                <button
                  key={preset.secs}
                  type="button"
                  data-testid={`timer-preset-${preset.secs}`}
                  onClick={() => handleSelectTimerPreset(preset.secs)}
                  className={`px-2.5 py-0.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    timerPresetSeconds === preset.secs
                      ? 'bg-[#C5B358] text-[#1E3227]'
                      : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div
                data-testid="class-timer-readout"
                className={`px-2.5 py-0.5 rounded-lg font-mono text-sm font-black tabular-nums border ${
                  timerFinishedAlert
                    ? 'bg-[#C84B31] text-white border-white'
                    : 'bg-[#FAFBF7] text-[#1E3227] border-[#C5B358]'
                }`}
              >
                {formatClassTimer(remainingSeconds)}
              </div>

              <button
                type="button"
                data-testid="timer-toggle-run-btn"
                onClick={() => {
                  setTimerFinishedAlert(false);
                  if (remainingSeconds === 0) {
                    setRemainingSeconds(timerPresetSeconds);
                  }
                  setIsTimerRunning((r) => !r);
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#C5B358] text-[#1E3227] text-xs font-bold cursor-pointer"
              >
                {isTimerRunning ? (
                  <>
                    <Pause className="w-3 h-3" />
                    <span>Tạm dừng</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3 h-3" />
                    <span>Bắt đầu</span>
                  </>
                )}
              </button>

              <button
                type="button"
                data-testid="timer-reset-btn"
                onClick={() => {
                  setIsTimerRunning(false);
                  setTimerFinishedAlert(false);
                  setRemainingSeconds(timerPresetSeconds);
                }}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white/15 hover:bg-white/25 text-white text-xs font-semibold cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Đặt lại</span>
              </button>

              {timerFinishedAlert && (
                <span className="text-xs font-bold text-[#FDE047]">
                  🔔 Hết giờ!
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* =====================================================================
          MODAL 1: 🖥️ CHẾ ĐỘ TRÌNH CHIẾU FULLSCREEN (PROJECTOR MODE + KEYBOARD SHORTCUTS)
          ===================================================================== */}
      {isProjectorOpen && (
        <div
          className="fixed inset-0 z-50 bg-[#122018]/95 backdrop-blur-md flex flex-col justify-between p-4 sm:p-8 text-[#FAFBF7] overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-label="Chế độ Trình chiếu Lớp học (Projector Mode)"
          data-testid="projector-mode-modal"
        >
          {/* Top Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/15 pb-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="px-3 py-1 rounded-xl bg-[#C5B358] text-[#1E3227] text-xs font-black uppercase">
                🖥️ TRÌNH CHIẾU FULLSCREEN · MÁY CHIẾU LỚP HỌC
              </span>
              <span className="text-sm font-bold text-[#E7ECD9]">
                Từ mục #{activeSlideIndex + 1}/{slides.length} · {currentHsk3Meta.stageLabel} ·{' '}
                {currentHsk3Meta.hskLevelNormalized}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-white/10 text-xs text-[#C5B358] font-semibold">
                ⌨️ Phím tắt: ⬅️ ➡️ Chuyển từ · Space Phát âm · Esc Thoát
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => speakChinese(currentSlide.hanzi)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#C5B358] text-[#1E3227] text-xs sm:text-sm font-bold cursor-pointer"
              >
                <Volume2 className="w-4 h-4" />
                <span>Phát âm từ ({currentSlide.hanzi}) [Space]</span>
              </button>
              <button
                type="button"
                onClick={() => speakChinese(currentSlide.exampleHanzi)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs sm:text-sm font-bold cursor-pointer"
              >
                <Volume2 className="w-4 h-4 text-[#C5B358]" />
                <span>Đọc cả câu ví dụ</span>
              </button>
              <button
                type="button"
                data-testid="close-projector-mode-btn"
                onClick={() => setIsProjectorOpen(false)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs sm:text-sm font-bold border border-white/25 cursor-pointer"
              >
                <X className="w-4 h-4" />
                <span>Thoát trình chiếu</span>
              </button>
            </div>
          </div>

          {/* Center Giant High-Contrast Classroom Stage */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 my-auto py-6 items-center max-w-7xl mx-auto w-full">
            {/* Left 6 cols: Giant Hanzi + Pinyin + Meaning + HSK 3.0 Character Standard */}
            <div className="lg:col-span-6 rounded-3xl bg-[#1E3227] border-2 border-[#C5B358] p-6 sm:p-8 text-center space-y-4 shadow-2xl">
              <div className="flex flex-wrap items-center justify-center gap-2">
                <span className="px-3 py-1 rounded-lg bg-[#C5B358]/20 border border-[#C5B358] text-[#C5B358] text-xs font-bold">
                  {currentHsk3Meta.hskLevelNormalized} · {currentSlide.partOfSpeech}
                </span>
                <span className="px-3 py-1 rounded-lg bg-white/10 text-white text-xs font-bold">
                  {currentHsk3Meta.charCategoryLabel}
                </span>
              </div>

              <div
                data-testid="projector-giant-hanzi"
                className="font-['Noto_Sans_SC'] text-7xl sm:text-8xl md:text-9xl font-black text-white tracking-wider py-2 select-all"
              >
                {currentSlide.hanzi}
              </div>

              <div className="text-3xl sm:text-4xl font-bold text-[#C5B358] tracking-wide">
                {currentSlide.pinyin}
              </div>

              <div className="text-base sm:text-lg text-[#E7ECD9]">
                Hán Việt: <strong className="uppercase text-white">{currentSlide.hanViet}</strong>
              </div>

              <div className="text-2xl sm:text-3xl font-extrabold text-white pt-1">
                {currentSlide.meaning}
              </div>

              {/* Radical & Stroke Breakdown Bar */}
              <div className="pt-4 border-t border-white/15 flex flex-wrap items-center justify-center gap-3">
                {currentSlide.characters.map((ch, idx) => (
                  <div
                    key={`proj-char-${ch.char}-${idx}`}
                    className="px-4 py-2 rounded-2xl bg-black/30 border border-white/15 text-sm"
                  >
                    <strong className="font-['Noto_Sans_SC'] text-xl text-[#C5B358] mr-2">
                      {ch.char}
                    </strong>
                    <span>Bộ thủ: {ch.radical}</span> ·{' '}
                    <strong className="text-[#C5B358]">{ch.strokeCount} nét</strong>
                  </div>
                ))}
              </div>
            </div>

            {/* Right 6 cols: HSK 3.0 Grammar Formula & Classroom Example Sentence */}
            <div className="lg:col-span-6 space-y-5">
              {/* Grammar Formula Box */}
              <div className="rounded-3xl bg-[#FAFBF7] text-[#1E3227] border-2 border-[#C5B358] p-6 space-y-3 shadow-xl">
                <div className="text-xs font-bold uppercase tracking-wider text-[#9B8A3E]">
                  📐 ĐIỂM NGỮ PHÁP HSK 3.0 &amp; CẤU TRÚC CÂU (语法点)
                </div>
                <div className="text-base font-bold text-[#1E3227]">
                  {currentHsk3Meta.grammarTitle}
                </div>
                <div className="p-3.5 rounded-2xl bg-[#1E3227] text-[#C5B358] font-mono text-base sm:text-lg font-bold tracking-wide">
                  {currentHsk3Meta.grammarFormula}
                </div>
                <div className="text-xs sm:text-sm text-[#3F5447] leading-relaxed">
                  {currentHsk3Meta.synonymDistinction}
                </div>
              </div>

              {/* Example Sentence Box */}
              <div className="rounded-3xl bg-[#1E3227] border-2 border-white/20 p-6 space-y-3 shadow-xl">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#C5B358]">
                    🗣️ CÂU VÍ DỤ ĐỒNG ĐỌC TRÊN LỚP (课堂例句)
                  </span>
                  <button
                    type="button"
                    onClick={() => speakChinese(currentSlide.exampleHanzi)}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#C5B358] text-[#1E3227] text-xs font-bold cursor-pointer"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>Nghe mẫu</span>
                  </button>
                </div>
                <p className="font-['Noto_Sans_SC'] text-2xl sm:text-3xl font-bold text-white leading-snug">
                  {currentSlide.exampleHanzi}
                </p>
                <p className="text-lg font-semibold text-[#C5B358]">
                  {currentSlide.examplePinyin}
                </p>
                <p className="text-base text-[#E7ECD9] italic">
                  “{currentSlide.exampleMeaning}”
                </p>
              </div>
            </div>
          </div>

          {/* Bottom Navigation Bar */}
          <div className="flex items-center justify-between border-t border-white/15 pt-4">
            <button
              type="button"
              onClick={() =>
                onSelectSlideIndex((activeSlideIndex - 1 + slides.length) % slides.length)
              }
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white/15 hover:bg-white/25 text-white text-sm font-bold cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5" />
              <span>Từ trước (⬅️)</span>
            </button>

            <div className="text-sm font-bold text-[#C5B358]">
              Đang trình chiếu: {currentSlide.hanzi} ({currentSlide.pinyin}) — {activeSlideIndex + 1}/
              {slides.length}
            </div>

            <button
              type="button"
              onClick={() => onSelectSlideIndex((activeSlideIndex + 1) % slides.length)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#C5B358] hover:bg-[#d5c368] text-[#1E3227] text-sm font-bold cursor-pointer"
            >
              <span>Từ tiếp theo (➡️)</span>
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 2: 🎲 GỌI TÊN HỌC VIÊN NGẪU NHIÊN + CỘNG +1 ⭐ VÀO SỔ ĐIỂM
          ===================================================================== */}
      {isLuckyModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Gọi tên học viên ngẫu nhiên"
          data-testid="lucky-student-modal"
          onClick={() => setIsLuckyModalOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-3xl bg-[#FAFBF7] border-2 border-[#9B8A3E] p-6 shadow-2xl space-y-4 text-[#1E3227]"
          >
            <div className="flex items-start justify-between gap-3 border-b border-[rgba(30,50,39,0.14)] pb-3">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-[#9B8A3E]">
                  🎲 GỌI TÊN HỌC VIÊN NGẪU NHIÊN · TƯƠNG TÁC TRÊN LỚP
                </div>
                <h3 className="text-lg font-bold text-[#1E3227] mt-0.5">
                  Mời học viên đọc từ &amp; đặt câu với “{currentSlide.hanzi}”
                </h3>
              </div>
              <button
                type="button"
                data-testid="close-lucky-modal-btn"
                onClick={() => setIsLuckyModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white border border-[rgba(30,50,39,0.15)] flex items-center justify-center text-[#1E3227] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {pickedStudent ? (
              <div className="p-5 rounded-2xl bg-[#1E3227] text-[#FAFBF7] border border-[#C5B358] text-center space-y-2.5 shadow-md">
                <div className="text-xs font-bold uppercase tracking-wider text-[#C5B358]">
                  {isSpinningStudent ? 'Đang bốc thăm học viên...' : 'Xin mời học viên phát biểu:'}
                </div>
                <div
                  data-testid="lucky-picked-student-name"
                  className="text-2xl sm:text-3xl font-black text-white"
                >
                  {pickedStudent.name}
                </div>
                <div className="text-xs text-[#E7ECD9]">
                  Mã HV: <strong>{pickedStudent.studentCode}</strong> · Cấp độ:{' '}
                  <strong>{pickedStudent.hskLevel}</strong> · Điểm Sổ điểm:{' '}
                  <strong
                    data-testid="lucky-picked-student-points"
                    className="text-[#C5B358] tabular-nums"
                  >
                    {pickedStudent.totalPoints}/100đ
                  </strong>
                </div>
                <div className="pt-2 text-xs text-[#FAFBF7]/90 bg-white/10 rounded-xl p-2.5">
                  Nhiệm vụ: Đọc to từ <strong className="text-[#C5B358]">{currentSlide.hanzi}</strong> (
                  {currentSlide.pinyin}) và đặt câu theo cấu trúc:{' '}
                  <span className="font-mono text-[#C5B358]">{currentHsk3Meta.grammarFormula}</span>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-[#F4F6EE] text-xs text-[#3F5447] text-center">
                Chưa có học viên trong danh sách lớp.
              </div>
            )}

            {awardedBanner && (
              <div
                data-testid="lucky-awarded-confirmation"
                className="p-3 rounded-xl bg-[#E7ECD9] border border-[#1E3227]/25 text-xs font-bold text-[#1E3227] flex items-center gap-2"
              >
                <Star className="w-4 h-4 text-[#9B8A3E] fill-[#9B8A3E] shrink-0" />
                <span>{awardedBanner}</span>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2">
              <button
                type="button"
                data-testid="lucky-spin-again-btn"
                onClick={handleSpinLuckyStudent}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-white border border-[#9B8A3E] text-[#1E3227] hover:bg-[#F4F6EE] text-xs font-bold transition-all cursor-pointer"
              >
                <Dices className="w-4 h-4 text-[#9B8A3E]" />
                <span>🎲 Bốc thăm học viên khác ({roster.length} HV)</span>
              </button>

              <button
                type="button"
                data-testid="lucky-award-point-btn"
                disabled={!pickedStudent}
                onClick={() => handleAwardBonusPoint(pickedStudent)}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#1E3227] hover:bg-[#2B4637] text-[#FAFBF7] text-xs font-bold transition-all shadow-sm cursor-pointer"
              >
                <Star className="w-4 h-4 text-[#C5B358] fill-[#C5B358]" />
                <span>+1 ⭐ Phát biểu (Lưu Sổ điểm)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 3: 🎮 MINI-GAME LỚP HỌC (1-CLICK QUIZ: NHÌN HÌNH ĐOÁN CHỮ / NGHE ÂM CHỌN ĐÁP ÁN)
          ===================================================================== */}
      {isMiniGameOpen && currentMiniGameQ && (
        <div
          className="fixed inset-0 z-50 bg-[#122018]/92 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-label="Mini-Game Lớp Học 1-Click Quiz"
          data-testid="classroom-minigame-modal"
          onClick={() => setIsMiniGameOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-4xl rounded-3xl bg-[#FAFBF7] border-2 border-[#C5B358] shadow-2xl overflow-hidden text-[#1E3227]"
          >
            {/* Header */}
            <div className="px-5 py-4 bg-[#1E3227] text-[#FAFBF7] flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Gamepad2 className="w-5 h-5 text-[#C5B358]" />
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[#C5B358]">
                    🎮 MINI-GAME LỚP HỌC (1-CLICK QUIZ) · THI ĐUA LẤY ĐIỂM THƯỞNG
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-white">
                    Câu {(miniGameRoundIdx % miniGameQuestions.length) + 1}/{miniGameQuestions.length} · Điểm lớp hiện tại:{' '}
                    <span className="text-[#C5B358] tabular-nums">{miniGameScore} điểm</span>
                  </h3>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  data-testid="minigame-mode-image"
                  onClick={() => {
                    setMiniGameMode('image-to-hanzi');
                    setMiniGameSelectedOption(null);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    miniGameMode === 'image-to-hanzi'
                      ? 'bg-[#C5B358] text-[#1E3227]'
                      : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  🖼️ Nhìn hình đoán chữ Hán
                </button>
                <button
                  type="button"
                  data-testid="minigame-mode-audio"
                  onClick={() => {
                    setMiniGameMode('audio-to-hanzi');
                    setMiniGameSelectedOption(null);
                    speakChinese(currentMiniGameQ.targetHanzi);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    miniGameMode === 'audio-to-hanzi'
                      ? 'bg-[#C5B358] text-[#1E3227]'
                      : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  🎧 Nghe âm chọn nhanh đáp án
                </button>
                <button
                  type="button"
                  data-testid="close-minigame-modal-btn"
                  onClick={() => setIsMiniGameOpen(false)}
                  className="px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </div>

            {/* Game Body */}
            <div className="p-5 sm:p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
                {/* Left 5 cols: Visual Prompt or Audio Prompt */}
                <div className="md:col-span-5">
                  {miniGameMode === 'image-to-hanzi' ? (
                    <div className="space-y-2">
                      <div className="aspect-[400/220] w-full rounded-2xl overflow-hidden border-2 border-[#9B8A3E]/50 bg-[#18221D]">
                        <SlideIllustration
                          illustrationKey={currentMiniGameQ.illustrationKey}
                          hanzi="？"
                          pinyin=""
                          meaning={currentMiniGameQ.targetMeaning}
                          imageUrl={currentMiniGameQ.imageUrl}
                        />
                      </div>
                      <div className="p-3 rounded-xl bg-[#E7ECD9] text-center">
                        <div className="text-[11px] font-bold uppercase text-[#9B8A3E]">
                          Nghĩa tiếng Việt &amp; Âm Hán Việt
                        </div>
                        <div className="text-base font-extrabold text-[#1E3227] mt-0.5">
                          “{currentMiniGameQ.targetMeaning}” (Hán Việt: {currentMiniGameQ.targetHanViet.toUpperCase()})
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-6 rounded-2xl bg-[#1E3227] text-white text-center space-y-4 border-2 border-[#C5B358]">
                      <div className="w-16 h-16 rounded-full bg-[#C5B358]/20 border border-[#C5B358] flex items-center justify-center mx-auto">
                        <Headphones className="w-8 h-8 text-[#C5B358]" />
                      </div>
                      <div>
                        <div className="text-xs font-bold uppercase text-[#C5B358]">
                          PHẦN THI NGHE PHẢN XẠ LỚP HỌC
                        </div>
                        <p className="text-sm text-[#E7ECD9] mt-1">
                          Bấm nút bên dưới để phát âm từ vựng cho cả lớp nghe và giơ tay chọn nhanh!
                        </p>
                      </div>
                      <button
                        type="button"
                        data-testid="minigame-play-audio-btn"
                        onClick={() => speakChinese(currentMiniGameQ.targetHanzi)}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#C5B358] hover:bg-[#d5c368] text-[#1E3227] text-sm font-black cursor-pointer shadow-md"
                      >
                        <Volume2 className="w-4 h-4" />
                        <span>🔊 Phát âm từ bí ẩn</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Right 7 cols: 4 Big Answer Options */}
                <div className="md:col-span-7 space-y-3">
                  <div className="text-sm font-bold text-[#1E3227]">
                    {currentMiniGameQ.promptTitle}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {currentMiniGameQ.options.map((opt, idx) => {
                      const isPicked = miniGameSelectedOption === opt.hanzi;
                      const showResult = Boolean(miniGameSelectedOption);
                      let cardStyle =
                        'bg-white border-[rgba(30,50,39,0.2)] hover:border-[#9B8A3E] text-[#1E3227]';
                      if (showResult) {
                        if (opt.isCorrect) {
                          cardStyle = 'bg-[#E7ECD9] border-2 border-[#1E3227] text-[#1E3227]';
                        } else if (isPicked) {
                          cardStyle = 'bg-red-50 border-2 border-red-400 text-red-900';
                        } else {
                          cardStyle = 'bg-white/50 border-[rgba(30,50,39,0.1)] opacity-60';
                        }
                      }

                      return (
                        <button
                          key={`${opt.hanzi}-${idx}`}
                          type="button"
                          data-testid={`minigame-option-${idx}`}
                          onClick={() => handlePickMiniGameAnswer(opt.hanzi, opt.isCorrect)}
                          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2 shadow-2xs ${cardStyle}`}
                        >
                          <div>
                            <div className="font-['Noto_Sans_SC'] text-2xl sm:text-3xl font-black">
                              {opt.hanzi}
                            </div>
                            <div className="text-xs font-bold text-[#9B8A3E] mt-1">
                              {showResult || miniGameMode === 'image-to-hanzi'
                                ? opt.pinyin
                                : 'Bấm để chọn đáp án'}
                            </div>
                            {miniGameMode === 'audio-to-hanzi' && (
                              <div className="text-xs text-[#3F5447] mt-0.5">{opt.meaning}</div>
                            )}
                          </div>
                          {showResult && opt.isCorrect && (
                            <CheckCircle2 className="w-6 h-6 text-[#1E3227] shrink-0" />
                          )}
                          {showResult && isPicked && !opt.isCorrect && (
                            <AlertCircle className="w-6 h-6 text-red-600 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Quick Student Bonus Star Bar */}
                  <div className="p-3.5 rounded-2xl bg-[#F4F6EE] border border-[#9B8A3E]/40 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-[#1E3227]">
                        Thưởng điểm cho học viên trả lời đúng:
                      </span>
                      <select
                        aria-label="Chọn học viên nhận điểm thưởng Mini-Game"
                        value={miniGameStudentId}
                        onChange={(e) => setMiniGameStudentId(e.target.value)}
                        className="px-2.5 py-1.5 rounded-xl bg-white border border-[rgba(30,50,39,0.2)] text-xs font-bold text-[#1E3227]"
                      >
                        {roster.map((st) => (
                          <option key={st.id} value={st.id}>
                            {st.studentCode} · {st.name} ({st.totalPoints}đ)
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      type="button"
                      data-testid="minigame-award-star-btn"
                      onClick={() => {
                        const target = roster.find((s) => s.id === miniGameStudentId) || roster[0];
                        handleAwardBonusPoint(
                          target,
                          `Trả lời đúng Mini-Game từ vựng “${currentMiniGameQ.targetHanzi}”`
                        );
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#1E3227] hover:bg-[#2B4637] text-[#FAFBF7] text-xs font-bold cursor-pointer"
                    >
                      <Star className="w-3.5 h-3.5 text-[#C5B358] fill-[#C5B358]" />
                      <span>+1 ⭐ Thưởng Sổ điểm</span>
                    </button>
                  </div>

                  {miniGameBonusBanner && (
                    <div
                      data-testid="minigame-bonus-banner"
                      className="p-2.5 rounded-xl bg-[#E7ECD9] border border-[#1E3227]/20 text-xs font-bold text-[#1E3227]"
                    >
                      {miniGameBonusBanner}
                    </div>
                  )}
                </div>
              </div>

              {/* Footer Next Question */}
              <div className="flex items-center justify-between pt-3 border-t border-[rgba(30,50,39,0.12)]">
                <span className="text-xs text-[#3F5447]">
                  Mẹo: Bấm sang câu tiếp theo để cả lớp cùng thi đua phản xạ từ vựng HSK 3.0!
                </span>
                <button
                  type="button"
                  data-testid="minigame-next-question-btn"
                  onClick={() => {
                    const nextRound = (miniGameRoundIdx + 1) % miniGameQuestions.length;
                    setMiniGameRoundIdx(nextRound);
                    setMiniGameSelectedOption(null);
                    setMiniGameBonusBanner(null);
                    const nextQ = miniGameQuestions[nextRound];
                    if (nextQ && miniGameMode === 'audio-to-hanzi') {
                      speakChinese(nextQ.targetHanzi);
                    }
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1E3227] hover:bg-[#2B4637] text-white text-xs font-bold cursor-pointer"
                >
                  <span>Câu hỏi tiếp theo</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 4: 📤 TRÌNH TẠO BÀI TẬP & GIAO BÀI TỰ ĐỘNG TỪ SLIDE (1-CLICK ASSIGNMENT GENERATOR)
          ===================================================================== */}
      {isAssignSlideModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-label="Giao bài tập về nhà từ Slide này"
          data-testid="assign-from-slide-modal"
          onClick={() => setIsAssignSlideModalOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl rounded-3xl bg-[#FAFBF7] border-2 border-[#9B8A3E] p-5 sm:p-6 shadow-2xl space-y-4 text-[#1E3227]"
          >
            <div className="flex items-start justify-between gap-3 border-b border-[rgba(30,50,39,0.14)] pb-3">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-[#9B8A3E]">
                  📤 1-CLICK ASSIGNMENT GENERATOR · ĐỒNG BỘ SANG HỌC SINH
                </div>
                <h3 className="text-base sm:text-lg font-bold text-[#1E3227] mt-0.5">
                  Tích chọn từ vựng trong Slide để tạo &amp; giao bài tập về nhà
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAssignSlideModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white border border-[rgba(30,50,39,0.15)] flex items-center justify-center text-[#1E3227] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#3F5447]">
              Chọn các từ vựng giáo viên vừa giảng trên lớp. Khi bấm{' '}
              <strong>“📤 Giao bài tập về nhà từ Slide này”</strong>, hệ thống tự động sinh bộ bài tập 5 kỹ năng HSK 3.0 (Trắc nghiệm, Sắp xếp câu, Đặt câu &amp; Luyện nói) ở bên <strong>Chế độ Học sinh</strong>.
            </p>

            {/* Word Checkboxes Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-60 overflow-y-auto p-1">
              {slides.map((s) => {
                const isChecked = selectedSlideIdsForHomework.includes(s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    data-testid={`assign-word-toggle-${s.hanzi}`}
                    onClick={() => handleToggleSlideForHomework(s.id)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-1.5 ${
                      isChecked
                        ? 'bg-[#1E3227] border-[#9B8A3E] text-white'
                        : 'bg-white border-[rgba(30,50,39,0.15)] text-[#1E3227] hover:border-[#9B8A3E]'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="font-['Noto_Sans_SC'] text-base font-bold truncate">
                        {s.hanzi}
                      </div>
                      <div
                        className={`text-[10px] truncate ${
                          isChecked ? 'text-[#C5B358]' : 'text-[#3F5447]'
                        }`}
                      >
                        {s.meaning}
                      </div>
                    </div>
                    <div
                      className={`w-4 h-4 rounded-md flex items-center justify-center shrink-0 ${
                        isChecked ? 'bg-[#C5B358] text-[#1E3227]' : 'border border-gray-300'
                      }`}
                    >
                      {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </button>
                );
              })}
            </div>

            {assignedSuccessBanner && (
              <div
                data-testid="assign-slide-success-banner"
                className="p-3.5 rounded-2xl bg-[#E7ECD9] border border-[#1E3227]/25 text-xs text-[#1E3227] flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <span className="font-bold">{assignedSuccessBanner}</span>
                {onSwitchToStudentHomework && (
                  <button
                    type="button"
                    data-testid="jump-to-student-homework-btn"
                    onClick={() => {
                      setIsAssignSlideModalOpen(false);
                      onSwitchToStudentHomework();
                    }}
                    className="px-3 py-1.5 rounded-xl bg-[#1E3227] text-white font-bold text-xs whitespace-nowrap cursor-pointer"
                  >
                    🎓 Mở Bài tập Học sinh ngay
                  </button>
                )}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[rgba(30,50,39,0.12)]">
              <span className="text-xs font-bold text-[#9B8A3E]">
                Đã chọn: {selectedSlideIdsForHomework.length} từ vựng trọng tâm
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAssignSlideModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white border border-[rgba(30,50,39,0.2)] text-xs font-bold text-[#3F5447] cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  data-testid="confirm-publish-slide-assignment-btn"
                  onClick={handlePublishSlideAssignment}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1E3227] hover:bg-[#2B4637] text-[#FAFBF7] text-xs font-bold shadow-sm cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5 text-[#C5B358]" />
                  <span>📤 Giao bài tập về nhà từ Slide này</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 5: 📝 TẠO NHANH GIÁO ÁN & PHIẾU BÀI TẬP HSK 3.0 (LESSON PLAN GENERATOR)
          ===================================================================== */}
      {isLessonPlanOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-label="Giáo án & Phiếu bài tập HSK 3.0"
          data-testid="hsk3-lesson-plan-modal"
          onClick={() => setIsLessonPlanOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-5xl bg-[#FAFBF7] rounded-3xl border-2 border-[#9B8A3E] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-[#1E3227]"
          >
            {/* Header */}
            <div className="px-5 py-4 bg-[#1E3227] text-[#FAFBF7] flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <BookOpen className="w-5 h-5 text-[#C5B358]" />
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[#C5B358]">
                    TỰ ĐỘNG TỔNG HỢP TỪ SLIDE BÀI GIẢNG · CHUẨN KHUNG HSK 3.0 (三等九级)
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-white">
                    📝 Giáo Án &amp; Phiếu Bài Tập Trọng Tâm ({lessonPlanSummary.totalWords} từ vựng ·{' '}
                    {lessonPlanSummary.handwritingCount} chữ viết tay 手写字 ·{' '}
                    {lessonPlanSummary.recognitionCount} chữ nhận diện 认读字)
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  data-testid="copy-lesson-plan-btn"
                  onClick={handleCopyLessonPlan}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold cursor-pointer"
                >
                  {copiedLessonPlan ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-[#C5B358]" />
                      <span>Đã sao chép</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-[#C5B358]" />
                      <span>Sao chép Giáo án</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#C5B358] hover:bg-[#d5c368] text-[#1E3227] text-xs font-bold cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>In Giáo án &amp; Phiếu (A4)</span>
                </button>
                <button
                  type="button"
                  data-testid="close-lesson-plan-modal-btn"
                  onClick={() => setIsLessonPlanOpen(false)}
                  className="px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-semibold cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </div>

            {/* Body Table */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
              <div className="overflow-x-auto rounded-2xl border border-[rgba(30,50,39,0.18)] bg-white">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#E7ECD9] text-[#1E3227] border-b border-[rgba(30,50,39,0.15)]">
                      <th className="py-2.5 px-3 font-bold">#</th>
                      <th className="py-2.5 px-3 font-bold">Từ vựng &amp; Pinyin</th>
                      <th className="py-2.5 px-3 font-bold">Cấp HSK 3.0 &amp; Chuẩn chữ</th>
                      <th className="py-2.5 px-3 font-bold">
                        Điểm Ngữ Pháp HSK 3.0 &amp; Cấu trúc câu (语法点)
                      </th>
                      <th className="py-2.5 px-3 font-bold">Câu ví dụ &amp; Phân biệt từ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[rgba(30,50,39,0.1)]">
                    {lessonPlanSummary.rows.map((row) => (
                      <tr key={`lp-row-${row.index}-${row.hanzi}`} className="hover:bg-[#FAFBF7]">
                        <td className="py-2.5 px-3 font-bold text-[#9B8A3E] tabular-nums">
                          {row.index}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-['Noto_Sans_SC'] text-base font-bold text-[#1E3227]">
                            {row.hanzi}
                          </div>
                          <div className="text-[11px] font-semibold text-[#9B8A3E]">
                            {row.pinyin} · <span className="uppercase">{row.hanViet}</span>
                          </div>
                          <div className="text-xs font-bold text-[#1E3227] mt-0.5">
                            {row.meaning}
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-[#1E3227]">{row.hskLevel}</div>
                          <div className="text-[11px] text-[#3F5447]">{row.stageLabel}</div>
                          <div className="text-[11px] font-bold text-[#9B8A3E] mt-0.5">
                            {row.charStandard}
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="p-2 rounded-lg bg-[#F4F6EE] border border-[#9B8A3E]/35 font-mono text-[11px] font-bold text-[#1E3227]">
                            {row.grammarFormula}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 max-w-xs">
                          <div className="font-['Noto_Sans_SC'] font-semibold text-[#1E3227]">
                            {row.exampleSentence}
                          </div>
                          <div className="text-[11px] text-[#3F5447] mt-1">{row.synonymNote}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
