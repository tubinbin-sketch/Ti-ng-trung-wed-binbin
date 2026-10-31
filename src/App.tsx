/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Menu,
  X,
  BookOpen,
  Sparkles,
  Users,
  Presentation,
  GraduationCap,
  Palette,
  Edit3,
  ChevronUp,
  ChevronDown,
  Layers,
  PenTool,
  Lock,
  Download,
  Settings,
} from 'lucide-react';
import {
  INITIAL_VOCAB_SLIDES,
  TEACHER_THEME_PRESETS,
  TeacherThemePreset,
  VocabSlide,
} from './data/chineseData';
import { HaloraCenterScene } from './components/HaloraCenterScene';
import { SlideDeckStudio } from './components/SlideDeckStudio';
import { StrokeWritingModal } from './components/StrokeWritingModal';
import { StudentAssignmentArena } from './components/StudentAssignmentArena';
import { ClassroomManager, getStoredStudentRoster } from './components/ClassroomManager';
import { TeacherThemeStudio } from './components/TeacherThemeStudio';
import { AuthModal, UserProfile, UserRole } from './components/AuthModal';
import { BinBinPandaAI, BinBinPandaMascotSVG } from './components/BinBinPandaAI';
import { TeacherPinModal } from './components/TeacherPinModal';
import { speakChinese } from './utils/speech';
import {
  BinBinSlidePayload,
  createCustomVocabSlide,
  repairAndUpgradeSlide,
  SMART_HANZI_DICTIONARY,
} from './utils/chineseEngine';
import {
  exportFullSystemBackupToFile,
  fetchRemoteState,
  getCurrentSyncStatus,
  isTeacherSessionUnlocked,
  runStorageMigrations,
  SyncStatus,
  syncStateToBackend,
} from './utils/storageService';

type TeacherTab = 'lesson-builder' | 'class-manager';
type StudentTab = 'today-lesson' | 'flashcard-srs' | 'quiz-leaderboard';

export default function App() {
  // Default to Student view ('student') for learners; Teacher mode is protected by TeacherPinModal
  const [selectedStudentName, setSelectedStudentName] = useState<string>(() => {
    const roster = getStoredStudentRoster();
    return roster[0]?.name || 'Học viên HSK';
  });
  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    const roster = getStoredStudentRoster();
    const initialStudent = roster[0]?.name || 'Học viên HSK';
    return {
      role: 'student',
      name: initialStudent,
      classCode: '722229',
    };
  });
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [teacherPinModalOpen, setTeacherPinModalOpen] = useState(false);
  const [pendingTeacherTab, setPendingTeacherTab] = useState<TeacherTab | null>(null);
  const [isHeroCollapsed, setIsHeroCollapsed] = useState(true);

  // Separate 2-Tab State for Teacher Mode & 3-Tab State for Student Mode
  const [teacherTab, setTeacherTab] = useState<TeacherTab>('lesson-builder');
  const [studentTab, setStudentTab] = useState<StudentTab>('today-lesson');
  const [showThemeDrawer, setShowThemeDrawer] = useState(false);
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(false);
  const settingsMenuRef = useRef<HTMLDivElement | null>(null);

  // Unified Schema Migration (SCHEMA_VERSION check + legacy slide-25 / 既哦 cleanup)
  const [slides, setSlides] = useState<VocabSlide[]>(() =>
    runStorageMigrations(INITIAL_VOCAB_SLIDES)
  );
  const [activeSlideIndex, setActiveSlideIndex] = useState(10); // Default to 温暖 (wēn nuǎn)
  const [writingModalSlide, setWritingModalSlide] = useState<VocabSlide | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<TeacherThemePreset>(
    TEACHER_THEME_PRESETS[0]
  );
  const [classroomStudentCount, setClassroomStudentCount] = useState<number>(
    () => getStoredStudentRoster().length
  );
  const [isBinBinDockedOpen, setIsBinBinDockedOpen] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(() => getCurrentSyncStatus());

  // Dynamic real counts computed from actual data
  const totalVocabBankCount = React.useMemo(() => {
    const dictKeys = Object.keys(SMART_HANZI_DICTIONARY);
    const uniqueSet = new Set([...dictKeys, ...slides.map((s) => s.hanzi)]);
    return uniqueSet.size;
  }, [slides]);

  useEffect(() => {
    const handleDockState = (e: Event) => {
      const custom = e as CustomEvent<{ isOpen: boolean; displayMode: string }>;
      if (custom.detail) {
        setIsBinBinDockedOpen(
          Boolean(custom.detail.isOpen && custom.detail.displayMode === 'docked')
        );
      }
    };
    window.addEventListener('binbin:dock-state', handleDockState);
    return () => window.removeEventListener('binbin:dock-state', handleDockState);
  }, []);

  useEffect(() => {
    const handleRosterUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<number>;
      if (typeof customEvent.detail === 'number') {
        setClassroomStudentCount(customEvent.detail);
      } else {
        setClassroomStudentCount(getStoredStudentRoster().length);
      }
    };
    window.addEventListener('hanu_students_updated', handleRosterUpdate);
    return () => {
      window.removeEventListener('hanu_students_updated', handleRosterUpdate);
    };
  }, []);

  // Two-way backend sync & sync status indicator listener
  useEffect(() => {
    const handleSyncStatusChange = (e: Event) => {
      const custom = e as CustomEvent<SyncStatus>;
      if (custom.detail) {
        setSyncStatus(custom.detail);
      }
    };
    const handleRemoteStateSynced = (e: Event) => {
      const custom = e as CustomEvent<{ slides?: VocabSlide[]; roster?: unknown[] }>;
      if (custom.detail?.slides && Array.isArray(custom.detail.slides) && custom.detail.slides.length > 0) {
        setSlides(custom.detail.slides.map((s) => repairAndUpgradeSlide(s)));
      }
      if (custom.detail?.roster && Array.isArray(custom.detail.roster)) {
        setClassroomStudentCount(custom.detail.roster.length);
      }
    };
    window.addEventListener('hanu_sync_status_changed', handleSyncStatusChange);
    window.addEventListener('hanu_remote_state_synced', handleRemoteStateSynced);
    void fetchRemoteState();
    return () => {
      window.removeEventListener('hanu_sync_status_changed', handleSyncStatusChange);
      window.removeEventListener('hanu_remote_state_synced', handleRemoteStateSynced);
    };
  }, []);

  // Refs for Web Animations API entrance timeline
  const headerItemsRef = useRef<(HTMLElement | null)[]>([]);
  const kickerDotRef = useRef<HTMLSpanElement | null>(null);
  const kickerLabelRef = useRef<HTMLSpanElement | null>(null);
  const headlineLine1Ref = useRef<HTMLSpanElement | null>(null);
  const headlineLine2Ref = useRef<HTMLSpanElement | null>(null);
  const bodyCopyRef = useRef<HTMLParagraphElement | null>(null);
  const ctaGroupRef = useRef<HTMLDivElement | null>(null);
  const glassCardsRef = useRef<(HTMLButtonElement | null)[]>([]);
  const studioSectionRef = useRef<HTMLElement | null>(null);

  // Synchronize CSS variables & data-theme attribute whenever the user switches among the 5 teacher themes
  useEffect(() => {
    const root = document.documentElement;
    const isDark = selectedTheme.id === 'moon-night';
    root.setAttribute('data-theme', selectedTheme.id);
    root.style.setProperty('--theme-canvas', selectedTheme.bgCanvas);
    root.style.setProperty('--theme-surface', selectedTheme.bgSurface);
    root.style.setProperty('--theme-ink', selectedTheme.inkPrimary);
    root.style.setProperty('--theme-ink-muted', selectedTheme.inkSecondary);
    root.style.setProperty('--theme-accent', selectedTheme.accentColor);
    root.style.setProperty('--theme-banner', selectedTheme.bannerTone);
    root.style.setProperty(
      '--theme-tab-bar-bg',
      isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(30, 50, 39, 0.09)'
    );
    root.style.setProperty(
      '--theme-tab-bar-border',
      isDark ? 'rgba(255, 255, 255, 0.18)' : 'rgba(30, 50, 39, 0.18)'
    );
    root.style.setProperty(
      '--theme-glass-bg',
      isDark ? 'rgba(24, 38, 32, 0.88)' : 'rgba(255, 255, 255, 0.78)'
    );
    root.style.setProperty(
      '--theme-glass-border',
      isDark ? 'rgba(197, 179, 88, 0.28)' : 'rgba(255, 255, 255, 0.65)'
    );
  }, [selectedTheme]);

  // Global Escape key & outside click handler for modals and navbar settings menu
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSettingsMenuOpen(false);
        setShowThemeDrawer(false);
        setWritingModalSlide(null);
        setAuthModalOpen(false);
        setTeacherPinModalOpen(false);
        setPendingTeacherTab(null);
      }
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (
        settingsMenuRef.current &&
        !settingsMenuRef.current.contains(e.target as Node)
      ) {
        setSettingsMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const scrollToStudio = () => {
    setMobileMenuOpen(false);
    studioSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const applyRoleSwitch = (targetRole: UserRole) => {
    const roster = getStoredStudentRoster();
    const validStudentName = roster.some((s) => s.name === selectedStudentName)
      ? selectedStudentName
      : roster[0]?.name || 'Học viên HSK';
    if (targetRole === 'student' && validStudentName !== selectedStudentName) {
      setSelectedStudentName(validStudentName);
    }
    if (targetRole === 'teacher') {
      void fetchRemoteState();
    }
    setUserProfile((prev) => ({
      role: targetRole,
      name:
        targetRole === 'teacher'
          ? 'Nguyễn Văn Thụ (阮文受)'
          : validStudentName,
      classCode: prev.classCode || '722229',
    }));
  };

  // Switch role via Role Switcher; require Teacher PIN when switching to Teacher unless already unlocked
  const handleQuickSwitchRole = (targetRole: UserRole, desiredTeacherTab?: TeacherTab) => {
    if (targetRole === 'teacher' && userProfile.role !== 'teacher' && !isTeacherSessionUnlocked()) {
      setPendingTeacherTab(desiredTeacherTab || null);
      setTeacherPinModalOpen(true);
      return;
    }
    if (desiredTeacherTab) {
      setTeacherTab(desiredTeacherTab);
    }
    applyRoleSwitch(targetRole);
  };

  const handleSelectNavTarget = (target: 'vocab' | 'writing' | 'quiz' | 'class') => {
    setMobileMenuOpen(false);
    if (target === 'vocab' || target === 'writing') {
      if (userProfile.role === 'teacher') {
        setTeacherTab('lesson-builder');
      } else {
        setStudentTab('today-lesson');
      }
      if (target === 'writing') {
        const current = slides[activeSlideIndex] || slides[0];
        speakChinese(current.hanzi);
      }
    } else if (target === 'quiz') {
      applyRoleSwitch('student');
      setStudentTab('quiz-leaderboard');
    } else if (target === 'class') {
      handleQuickSwitchRole('teacher', 'class-manager');
    }
    studioSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const persistCustomSlides = (allSlides: VocabSlide[]) => {
    try {
      localStorage.setItem('hanu_full_slides_deck_v3', JSON.stringify(allSlides));
      const baseHanzis = new Set(INITIAL_VOCAB_SLIDES.map((s) => s.hanzi));
      const customOnly = allSlides.filter((s) => !baseHanzis.has(s.hanzi));
      localStorage.setItem('hanu_custom_vocab_slides_v2', JSON.stringify(customOnly));
      syncStateToBackend({ slides: allSlides });
    } catch {
      // ignore storage quota errors
    }
  };

  const handleToggleLearnedSlide = (slideId: string) => {
    setSlides((prev) => {
      const updated = prev.map((s) => (s.id === slideId ? { ...s, learned: !s.learned } : s));
      persistCustomSlides(updated);
      return updated;
    });
    setWritingModalSlide((prev) =>
      prev && prev.id === slideId ? { ...prev, learned: !prev.learned } : prev
    );
  };

  const handleAddSlides = (newSlides: VocabSlide[]) => {
    setSlides((prev) => {
      const updated = [...prev, ...newSlides];
      persistCustomSlides(updated);
      return updated;
    });
  };

  const handleUpdateSlide = (updatedSlide: VocabSlide) => {
    setSlides((prev) => {
      const updated = prev.map((s) => (s.id === updatedSlide.id ? updatedSlide : s));
      persistCustomSlides(updated);
      return updated;
    });
  };

  const handleReplaceAllSlides = (nextSlides: VocabSlide[]) => {
    if (!Array.isArray(nextSlides) || nextSlides.length === 0) return;
    const normalized = nextSlides
      .filter((s) => s && s.hanzi)
      .map((s) => repairAndUpgradeSlide(s));
    if (normalized.length === 0) return;
    setSlides(normalized);
    setActiveSlideIndex(0);
    persistCustomSlides(normalized);
  };

  const handleResetDefaultSlides = () => {
    try {
      localStorage.removeItem('hanu_full_slides_deck_v3');
      localStorage.removeItem('hanu_custom_vocab_slides_v2');
    } catch {
      // ignore storage errors
    }
    setSlides(INITIAL_VOCAB_SLIDES);
    setActiveSlideIndex(10);
  };

  const handleApplyBinBinSlidePayload = (payload: BinBinSlidePayload) => {
    if (!payload || !payload.hanzi) return;
    setSlides((prev) => {
      const existingIdx = prev.findIndex((s) => s.hanzi === payload.hanzi);
      if (existingIdx !== -1) {
        const existing = prev[existingIdx];
        const updatedSlide: VocabSlide = {
          ...existing,
          pinyin: payload.pinyin || existing.pinyin,
          hanViet: payload.hanViet || existing.hanViet,
          meaning: payload.meaning || existing.meaning,
          usageNote: payload.usageNote || existing.usageNote,
          exampleHanzi: payload.exampleHanzi || existing.exampleHanzi,
          examplePinyin: payload.examplePinyin || existing.examplePinyin,
          exampleMeaning: payload.exampleMeaning || existing.exampleMeaning,
        };
        const nextList = prev.map((s, idx) => (idx === existingIdx ? updatedSlide : s));
        persistCustomSlides(nextList);
        setActiveSlideIndex(existingIdx);
        return nextList;
      }

      const created = createCustomVocabSlide(
        {
          hanzi: payload.hanzi,
          pinyin: payload.pinyin,
          hanViet: payload.hanViet,
          meaning: payload.meaning,
          partOfSpeech: payload.partOfSpeech,
          hskLevel: payload.hskLevel,
          exampleHanzi: payload.exampleHanzi,
          examplePinyin: payload.examplePinyin,
          exampleMeaning: payload.exampleMeaning,
        },
        prev.length + 1
      );
      if (!created) return prev;
      const nextList = [...prev, created];
      persistCustomSlides(nextList);
      setActiveSlideIndex(nextList.length - 1);
      return nextList;
    });
  };

  useEffect(() => {
    const onBinBinApply = (e: Event) => {
      const customEvt = e as CustomEvent<BinBinSlidePayload>;
      if (customEvt.detail) {
        handleApplyBinBinSlidePayload(customEvt.detail);
      }
    };
    window.addEventListener('binbin:apply-slide', onBinBinApply);
    return () => window.removeEventListener('binbin:apply-slide', onBinBinApply);
  }, []);

  const isDarkTheme = selectedTheme.id === 'moon-night';

  useEffect(() => {
    if (userProfile.role === 'student' && studentTab === 'quiz-leaderboard') {
      setIsHeroCollapsed(true);
      void fetchRemoteState();
    }
    if (userProfile.role === 'teacher' && teacherTab === 'class-manager') {
      void fetchRemoteState();
    }
  }, [userProfile.role, studentTab, teacherTab]);

  const studentTabActiveIdx =
    studentTab === 'today-lesson' ? 0 : studentTab === 'flashcard-srs' ? 1 : 2;

  return (
    <div
      id="top"
      className={`min-h-screen transition-colors duration-300 ${
        isDarkTheme
          ? ''
          : 'bg-gradient-to-br from-[#FAF7F0] via-[#F4EFE6] to-[#EAE3D5]'
      }`}
      style={{
        backgroundColor: isDarkTheme ? selectedTheme.bgCanvas : undefined,
        color: selectedTheme.inkPrimary,
      }}
    >
      {/* =====================================================================
          TIER 1: STREAMLINED TOP NAVBAR (BRAND/ROLE + TABS + 🐼 BINBIN + SETTINGS MENU)
          ===================================================================== */}
      <header
        data-testid="floating-glass-dock"
        className={`sticky top-0 z-30 backdrop-blur-xl border-b shadow-[0_4px_20px_rgb(0,0,0,0.04)] px-2 sm:px-4 py-1.5 transition-all duration-300 ${
          isDarkTheme
            ? 'bg-[#121E18]/90 border-white/15 text-[#E8EFEA]'
            : 'bg-white/90 border-white/70 text-[#0F382E]'
        }`}
      >
        <div className="max-w-[1380px] mx-auto flex flex-nowrap items-center justify-between gap-1.5 sm:gap-2">
          {/* Left: Brand HANU × 阮文受 + Active User Profile */}
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 shrink-0">
            <a
              href="#top"
              className={`inline-flex items-center gap-1.5 font-bold text-xs sm:text-sm shrink-0 ${
                isDarkTheme ? 'text-[#E8EFEA]' : 'text-[#1E3227]'
              }`}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 32 32"
                fill="none"
                aria-hidden="true"
                className="shrink-0"
              >
                <circle cx="16" cy="5" r="2.6" fill={isDarkTheme ? '#E8EFEA' : '#1E3227'} />
                <circle cx="25.5" cy="10.5" r="2.6" fill={isDarkTheme ? '#E8EFEA' : '#1E3227'} />
                <circle cx="25.5" cy="21.5" r="2.6" fill={isDarkTheme ? '#E8EFEA' : '#1E3227'} />
                <circle cx="16" cy="27" r="2.6" fill={isDarkTheme ? '#E8EFEA' : '#1E3227'} />
                <circle cx="6.5" cy="21.5" r="2.6" fill={isDarkTheme ? '#E8EFEA' : '#1E3227'} />
                <circle cx="6.5" cy="10.5" r="2.6" fill={isDarkTheme ? '#E8EFEA' : '#1E3227'} />
                <circle cx="16" cy="16" r="3.2" fill="#9B8A3E" />
              </svg>
              <span className="whitespace-nowrap">
                HANU<span className="hidden sm:inline"> × </span>
                <span className="hidden sm:inline font-['Noto_Sans_SC']">阮文受</span>
              </span>
            </a>

            <span className="text-[#9B8A3E]/40 hidden md:inline">|</span>

            <button
              type="button"
              data-testid="header-auth-btn"
              onClick={() => setAuthModalOpen(true)}
              className="inline-flex items-center gap-1.5 shrink-0 text-left cursor-pointer hover:opacity-85 transition-opacity"
              title="Bấm để mở Cổng Đăng Nhập & Hồ Sơ"
            >
              <span
                className={`px-2 py-0.5 rounded-md font-bold text-xs uppercase tracking-wide shrink-0 ${
                  userProfile.role === 'teacher'
                    ? 'bg-gradient-to-r from-[#0F5243] to-[#166E5B] text-[#FAF7F0] shadow-2xs'
                    : 'bg-gradient-to-r from-[#B8292F] to-[#961C21] text-[#FAF7F0] shadow-2xs'
                }`}
              >
                <span className="sm:hidden">{userProfile.role === 'teacher' ? 'GV' : 'HV'}</span>
                <span className="hidden sm:inline">
                  {userProfile.role === 'teacher' ? 'Giảng viên' : 'Học viên'}
                </span>
              </span>
              <span
                className={`text-xs font-bold hidden lg:inline whitespace-nowrap ${
                  isDarkTheme ? 'text-[#E8EFEA]' : 'text-[#0F382E]'
                }`}
              >
                {userProfile.name.replace(/\s*\(.*?\)\s*/g, '')}
              </span>
            </button>
          </div>

          {/* Center: Mode-Specific Main Tabs (Teacher 2 Tabs OR Student 3 Tabs) */}
          {userProfile.role === 'teacher' ? (
            <div
              className="relative inline-grid grid-cols-2 items-center p-0.5 rounded-lg bg-[#0F5243]/10 border border-[#0F5243]/20 shrink-0"
              role="tablist"
              aria-label="Không gian Giáo viên (2 mục)"
            >
              <span
                aria-hidden="true"
                className="pointer-events-none absolute top-0.5 bottom-0.5 left-0.5 w-[calc(50%-2px)] rounded-md bg-gradient-to-r from-[#0F5243] to-[#166E5B] shadow-[0_2px_8px_rgba(15,82,67,0.25)] transition-transform duration-300 ease-out"
                style={{
                  transform:
                    teacherTab === 'lesson-builder' ? 'translateX(0%)' : 'translateX(100%)',
                }}
              />
              <button
                type="button"
                role="tab"
                data-testid="teacher-tab-lesson"
                aria-selected={teacherTab === 'lesson-builder'}
                onClick={() => setTeacherTab('lesson-builder')}
                className={`relative z-10 inline-flex items-center justify-center gap-1 px-2.5 sm:px-3 py-1 rounded-md text-xs font-bold transition-all duration-300 active:scale-95 whitespace-nowrap cursor-pointer ${
                  teacherTab === 'lesson-builder'
                    ? 'text-white'
                    : isDarkTheme
                    ? 'text-[#E5E7EB] hover:text-white'
                    : 'text-[#3A544B] hover:text-[#0F5243]'
                }`}
              >
                <Presentation className="w-3.5 h-3.5 shrink-0" />
                <span>1. Soạn Bài</span>
              </button>

              <button
                type="button"
                role="tab"
                data-testid="teacher-tab-classroom"
                aria-selected={teacherTab === 'class-manager'}
                onClick={() => setTeacherTab('class-manager')}
                className={`relative z-10 inline-flex items-center justify-center gap-1 px-2.5 sm:px-3 py-1 rounded-md text-xs font-bold transition-all duration-300 active:scale-95 whitespace-nowrap cursor-pointer ${
                  teacherTab === 'class-manager'
                    ? 'text-white'
                    : isDarkTheme
                    ? 'text-[#E5E7EB] hover:text-white'
                    : 'text-[#3A544B] hover:text-[#0F5243]'
                }`}
              >
                <GraduationCap className="w-3.5 h-3.5 shrink-0" />
                <span>2. Quản Lý Lớp ({classroomStudentCount})</span>
              </button>
            </div>
          ) : (
            <div
              className="relative inline-grid grid-cols-3 p-0.5 rounded-lg bg-[#0F5243]/10 border border-[#0F5243]/20 items-center overflow-hidden shrink-0"
              role="tablist"
              aria-label="Chế độ Tự Học & Ôn Tập Thông Minh (3 mục)"
            >
              <span
                aria-hidden="true"
                className="pointer-events-none absolute top-0.5 bottom-0.5 left-0.5 w-[calc((100%-4px)/3)] rounded-md bg-gradient-to-r from-[#0F5243] to-[#166E5B] shadow-[0_2px_8px_rgba(15,82,67,0.25)] transition-transform duration-300 ease-out"
                style={{
                  transform: `translateX(${studentTabActiveIdx * 100}%)`,
                }}
              />

              <button
                type="button"
                role="tab"
                data-testid="student-tab-lesson"
                aria-selected={studentTab === 'today-lesson'}
                onClick={() => setStudentTab('today-lesson')}
                className={`relative z-10 flex items-center justify-center gap-1 px-2 sm:px-3 py-1 rounded-md text-xs font-bold transition-all duration-300 active:scale-95 whitespace-nowrap cursor-pointer ${
                  studentTab === 'today-lesson'
                    ? 'text-white'
                    : isDarkTheme
                    ? 'text-[#E5E7EB] hover:text-white'
                    : 'text-[#0F382E]/85 hover:text-[#0F5243]'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden sm:inline">Học &amp; Viết nét</span>
                <span className="sm:hidden">Học nét</span>
              </button>

              <button
                type="button"
                role="tab"
                data-testid="student-tab-flashcard"
                aria-selected={studentTab === 'flashcard-srs'}
                onClick={() => setStudentTab('flashcard-srs')}
                className={`relative z-10 flex items-center justify-center gap-1 px-2 sm:px-3 py-1 rounded-md text-xs font-bold transition-all duration-300 active:scale-95 whitespace-nowrap cursor-pointer ${
                  studentTab === 'flashcard-srs'
                    ? 'text-white'
                    : isDarkTheme
                    ? 'text-[#E5E7EB] hover:text-white'
                    : 'text-[#0F382E]/85 hover:text-[#0F5243]'
                }`}
              >
                <Layers className="w-3.5 h-3.5 shrink-0" />
                <span>Flashcard</span>
              </button>

              <button
                type="button"
                role="tab"
                data-testid="student-tab-quiz"
                aria-selected={studentTab === 'quiz-leaderboard'}
                onClick={() => setStudentTab('quiz-leaderboard')}
                className={`relative z-10 flex items-center justify-center gap-1 px-2 sm:px-3 py-1 rounded-md text-xs font-bold transition-all duration-300 active:scale-95 whitespace-nowrap cursor-pointer ${
                  studentTab === 'quiz-leaderboard'
                    ? 'text-white'
                    : isDarkTheme
                    ? 'text-[#E5E7EB] hover:text-white'
                    : 'text-[#0F382E]/85 hover:text-[#0F5243]'
                }`}
              >
                <PenTool className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden md:inline">Bài tập HSK</span>
                <span className="md:hidden">Bài tập</span>
              </button>
            </div>
          )}

          {/* Right: 🐼 Hỏi 彬彬 + 1 Settings/Utilities Menu */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0" ref={settingsMenuRef}>
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('binbin:open-assistant'))}
              data-testid="navbar-open-binbin-btn"
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold transition-all duration-300 active:scale-95 cursor-pointer shrink-0 ${
                isDarkTheme
                  ? 'bg-[#0F5243]/40 hover:bg-[#0F5243]/60 text-[#FAF7F0] border-[#C5B358]/40'
                  : 'bg-gradient-to-r from-[#0F5243]/15 to-[#166E5B]/15 hover:from-[#0F5243]/25 hover:to-[#166E5B]/25 text-[#0F382E] border-[#0F5243]/30'
              }`}
              title="Hỏi Trợ Giảng Gấu Trúc · 彬彬"
            >
              <span className="text-sm leading-none">🐼</span>
              <span>Hỏi 彬彬</span>
            </button>

            <div className="relative">
              <button
                type="button"
                data-testid="navbar-settings-menu-btn"
                aria-expanded={settingsMenuOpen}
                aria-haspopup="menu"
                aria-label="Mở menu cài đặt và tiện ích"
                onClick={() => setSettingsMenuOpen((v) => !v)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold transition-all duration-300 active:scale-95 cursor-pointer shrink-0 ${
                  isDarkTheme
                    ? 'bg-[#182821] hover:bg-[#1E3227] text-[#E8EFEA] border-white/20'
                    : 'bg-white hover:bg-[#FAF7F0] text-[#0F382E] border-[#0F5243]/20'
                }`}
                title="Cài đặt, Đổi vai trò, Giao diện & Sao lưu dữ liệu"
              >
                <Settings className="w-3.5 h-3.5 text-[#9B8A3E] shrink-0" />
                <span className="hidden sm:inline">Tiện ích</span>
              </button>

              {/* Settings & Utilities Dropdown Menu */}
              <div
                data-testid="navbar-settings-dropdown"
                role="menu"
                aria-label="Menu tiện ích và cài đặt hệ thống"
                className={`${
                  settingsMenuOpen ? 'block' : 'hidden'
                } absolute right-0 mt-2 w-72 rounded-2xl border p-3 shadow-2xl z-50 space-y-2.5 ${
                  isDarkTheme
                    ? 'bg-[#15231D] border-[#C5B358]/35 text-[#E8EFEA]'
                    : 'bg-[#FAFBF7] border-[#0F5243]/20 text-[#0F382E]'
                }`}
              >
                {/* Sync Status Row */}
                <div className="flex items-center justify-between pb-2 border-b border-current/10">
                  <span className="text-xs font-bold opacity-80">Trạng thái dữ liệu:</span>
                  <span
                    data-testid="navbar-sync-status-badge"
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold border whitespace-nowrap ${
                      syncStatus === 'syncing'
                        ? 'bg-amber-50 text-amber-800 border-amber-300'
                        : syncStatus === 'offline'
                        ? 'bg-stone-100 text-stone-700 border-stone-300'
                        : 'bg-emerald-50 text-[#0F5243] border-emerald-500/30'
                    }`}
                  >
                    <span>
                      {syncStatus === 'syncing'
                        ? '🔄'
                        : syncStatus === 'offline'
                        ? '⚡'
                        : '☁️'}
                    </span>
                    <span>
                      {syncStatus === 'syncing'
                        ? 'Đang lưu...'
                        : syncStatus === 'offline'
                        ? 'Chế độ Offline'
                        : 'Đã đồng bộ'}
                    </span>
                  </span>
                </div>

                {/* Role Switcher inside Settings Dropdown */}
                <div className="space-y-1.5">
                  <div className="text-xs font-bold opacity-80">Chuyển đổi vai trò:</div>
                  <div
                    className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-[#0F5243]/10 border border-[#0F5243]/20"
                    role="group"
                    aria-label="Chuyển đổi nhanh vai trò"
                  >
                    <button
                      type="button"
                      data-testid="role-switch-student"
                      onClick={() => {
                        setSettingsMenuOpen(false);
                        handleQuickSwitchRole('student');
                      }}
                      className={`inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        userProfile.role === 'student'
                          ? 'bg-gradient-to-r from-[#B8292F] to-[#961C21] text-white shadow-xs'
                          : 'hover:text-[#B8292F]'
                      }`}
                    >
                      <Users className="w-3.5 h-3.5 shrink-0" />
                      <span>Học sinh</span>
                    </button>
                    <button
                      type="button"
                      data-testid="role-switch-teacher"
                      onClick={() => {
                        setSettingsMenuOpen(false);
                        handleQuickSwitchRole('teacher');
                      }}
                      className={`inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        userProfile.role === 'teacher'
                          ? 'bg-gradient-to-r from-[#0F5243] to-[#166E5B] text-white shadow-xs'
                          : 'hover:text-[#0F5243]'
                      }`}
                    >
                      {userProfile.role === 'teacher' ? (
                        <GraduationCap className="w-3.5 h-3.5 shrink-0" />
                      ) : (
                        <Lock className="w-3.5 h-3.5 shrink-0 text-[#9B8A3E]" />
                      )}
                      <span>Giáo viên</span>
                    </button>
                  </div>
                </div>

                {/* Utility Buttons */}
                <div className="space-y-1 pt-1 border-t border-current/10">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setSettingsMenuOpen(false);
                      setShowThemeDrawer(true);
                    }}
                    data-testid="compact-theme-switcher-btn"
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-[#0F5243]/10 text-xs font-bold transition-colors cursor-pointer"
                  >
                    <span className="inline-flex items-center gap-2">
                      <Palette className="w-4 h-4 text-[#9B8A3E] shrink-0" />
                      <span>Đổi kiểu giao diện &amp; màu nền</span>
                    </span>
                    <span className="text-xs text-[#9B8A3E]">{selectedTheme.name}</span>
                  </button>

                  <button
                    type="button"
                    role="menuitem"
                    data-testid="toggle-hero-banner-btn"
                    onClick={() => {
                      setSettingsMenuOpen(false);
                      setIsHeroCollapsed((v) => !v);
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-[#0F5243]/10 text-xs font-bold transition-colors cursor-pointer"
                  >
                    <span className="inline-flex items-center gap-2">
                      {isHeroCollapsed ? (
                        <ChevronDown className="w-4 h-4 text-[#9B8A3E] shrink-0" />
                      ) : (
                        <ChevronUp className="w-4 h-4 text-[#9B8A3E] shrink-0" />
                      )}
                      <span>{isHeroCollapsed ? 'Mở Banner giới thiệu' : 'Ẩn Banner giới thiệu'}</span>
                    </span>
                  </button>

                  <button
                    type="button"
                    role="menuitem"
                    data-testid="navbar-full-backup-btn"
                    onClick={() => {
                      setSettingsMenuOpen(false);
                      exportFullSystemBackupToFile(slides, getStoredStudentRoster());
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-[#0F5243]/10 text-xs font-bold transition-colors cursor-pointer"
                  >
                    <span className="inline-flex items-center gap-2">
                      <Download className="w-4 h-4 text-[#9B8A3E] shrink-0" />
                      <span>Sao lưu dữ liệu hệ thống (.json)</span>
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Ensure document always has a valid semantic <h1> even when Hero Banner is collapsed */}
      {isHeroCollapsed && (
        <h1 className="sr-only">
          HANU × 阮文受 — Hệ Thống Trợ Giảng &amp; Học Tập Hán Ngữ Chuẩn HSK 3.0
        </h1>
      )}

      {/* =====================================================================
          OPTIONAL COMPACT HERO BANNER (WITH DYNAMIC REAL METRICS & CTA)
          ===================================================================== */}
      {!isHeroCollapsed && (
        <section className="halora-stage" aria-label="HANU × 阮文受 — Hệ Thống Trợ Giảng & Học Tập Hán Ngữ Chuẩn HSK 3.0">
          <div className="halora-hero-main">
            {/* Left Copy Column */}
            <div className="halora-copy-col">
              <div className="halora-kicker">
                <span ref={kickerDotRef} className="halora-kicker-dot" />
                <span ref={kickerLabelRef}>
                  HANU × 阮文受 · HỆ THỐNG HÁN NGỮ CHUẨN HSK 3.0
                </span>
              </div>

              <h1 className="halora-headline">
                <span className="halora-headline-mask">
                  <span ref={headlineLine1Ref} className="halora-headline-line">
                    Hiểu ngôn ngữ.
                  </span>
                </span>
                <span className="halora-headline-mask">
                  <span ref={headlineLine2Ref} className="halora-headline-line">
                    Làm chủ Hán ngữ.
                  </span>
                </span>
              </h1>

              <p ref={bodyCopyRef} className="halora-body-copy">
                Từ vựng, thứ tự nét viết ô Mễ Tự Cách, ngữ pháp HSK 3.0, bài tập tương tác và chấm điểm tự động — chuẩn hóa thành bài giảng sinh động, tức thì.
              </p>

              <div ref={ctaGroupRef} className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  data-testid="hero-start-btn"
                  onClick={() => {
                    setIsHeroCollapsed(true);
                    scrollToStudio();
                  }}
                  className="halora-pill-dark"
                >
                  Vào học ngay
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsHeroCollapsed(true);
                    handleSelectNavTarget('writing');
                  }}
                  className="halora-pill-cart !text-[#1E3227] !bg-white/65 hover:!bg-white/85"
                >
                  <Edit3 className="w-4 h-4" />
                  <span>Tập viết chữ Hán</span>
                </button>
              </div>
            </div>

            {/* Middle Grid Spacer for Center Dragon Visual */}
            <div className="hidden md:block" aria-hidden="true" />

            {/* Right Column: Three Frosted Glass Metric Cards with Dynamic Real Counts */}
            <div className="halora-metrics-col">
              <button
                type="button"
                ref={(el) => {
                  glassCardsRef.current[0] = el;
                }}
                onClick={() => {
                  setIsHeroCollapsed(true);
                  handleSelectNavTarget('vocab');
                }}
                className="halora-glass-card"
                aria-label={`TỪ VỰNG ${slides.length} thẻ bài giảng (${totalVocabBankCount} từ trong kho) — Mở trình chiếu từ vựng`}
              >
                <div className="halora-card-label">
                  <span>BÀI GIẢNG &amp; KHO TỪ</span>
                  <BookOpen className="w-4 h-4 stroke-[1.75] shrink-0" />
                </div>
                <div className="halora-card-value" data-testid="hero-metric-vocab-count">
                  {slides.length} / {totalVocabBankCount}
                </div>
                <div className="halora-card-sub is-gold">THẺ BÀI GIẢNG · HSK 1–9</div>
              </button>

              <button
                type="button"
                ref={(el) => {
                  glassCardsRef.current[1] = el;
                }}
                onClick={() => {
                  setIsHeroCollapsed(true);
                  handleSelectNavTarget('vocab');
                }}
                className="halora-glass-card"
                aria-label="SOẠN BÀI Tự động GIÁO ÁN THÔNG MINH — Mở soạn bài tự động"
              >
                <div className="halora-card-label">
                  <span>SOẠN BÀI</span>
                  <Sparkles className="w-4 h-4 stroke-[1.75] shrink-0" />
                </div>
                <div className="halora-card-value">Tự động</div>
                <div className="halora-card-sub is-gold">GIÁO ÁN HSK 3.0</div>
              </button>

              <button
                type="button"
                ref={(el) => {
                  glassCardsRef.current[2] = el;
                }}
                onClick={() => {
                  setIsHeroCollapsed(true);
                  handleSelectNavTarget('class');
                }}
                className="halora-glass-card"
                aria-label={`HỌC VIÊN ${classroomStudentCount} học viên trong lớp — Mở quản lý lớp học`}
              >
                <div className="halora-card-label">
                  <span>SĨ SỐ LỚP HỌC</span>
                  <Users className="w-4 h-4 stroke-[1.75] shrink-0" />
                </div>
                <div className="halora-card-value" data-testid="hero-metric-student-count">
                  {classroomStudentCount} HV
                </div>
                <div className="halora-card-sub">LỚP HSK 722229</div>
              </button>
            </div>
          </div>

          <HaloraCenterScene />
        </section>
      )}

      {/* =====================================================================
          MAIN LEARNING & TEACHING WORKSPACE (#studio)
          ===================================================================== */}
      <main
        ref={studioSectionRef}
        id="studio"
        className={`relative z-20 max-w-[1360px] mx-auto px-3 sm:px-6 pt-3 pb-36 sm:pb-32 transition-all duration-300 ${
          isBinBinDockedOpen ? 'lg:pr-[372px]' : ''
        }`}
      >
        {userProfile.role === 'teacher' ? (
          teacherTab === 'lesson-builder' ? (
            <SlideDeckStudio
              slides={slides}
              activeSlideIndex={activeSlideIndex}
              onSelectSlideIndex={setActiveSlideIndex}
              onOpenWritingModal={(slide) => setWritingModalSlide(slide)}
              onToggleLearned={handleToggleLearnedSlide}
              onAddSlides={handleAddSlides}
              onUpdateSlide={handleUpdateSlide}
              onReplaceAllSlides={handleReplaceAllSlides}
              onResetDefaultSlides={handleResetDefaultSlides}
              roleMode="teacher"
              onSwitchToStudentHomework={() => {
                applyRoleSwitch('student');
                setStudentTab('quiz-leaderboard');
              }}
            />
          ) : (
            <ClassroomManager
              slides={slides}
              onStudentCountChange={setClassroomStudentCount}
              onSwitchToStudentView={() => {
                applyRoleSwitch('student');
                setStudentTab('quiz-leaderboard');
              }}
            />
          )
        ) : studentTab === 'today-lesson' || studentTab === 'flashcard-srs' ? (
          <SlideDeckStudio
            slides={slides}
            activeSlideIndex={activeSlideIndex}
            onSelectSlideIndex={setActiveSlideIndex}
            onOpenWritingModal={(slide) => setWritingModalSlide(slide)}
            onToggleLearned={handleToggleLearnedSlide}
            onAddSlides={handleAddSlides}
            onUpdateSlide={handleUpdateSlide}
            onReplaceAllSlides={handleReplaceAllSlides}
            onResetDefaultSlides={handleResetDefaultSlides}
            roleMode="student"
            studentStudyMode={studentTab === 'flashcard-srs' ? 'flashcard' : 'writing'}
            onChangeStudentStudyMode={(mode) =>
              setStudentTab(mode === 'flashcard' ? 'flashcard-srs' : 'today-lesson')
            }
            onSwitchToStudentHomework={() => setStudentTab('quiz-leaderboard')}
          />
        ) : (
          <StudentAssignmentArena
            slides={slides}
            studentName={userProfile.name}
            onSelectStudentName={(nextName) => {
              setSelectedStudentName(nextName);
              setUserProfile((prev) => ({ ...prev, name: nextName }));
            }}
            onSwitchToTeacherView={() => {
              handleQuickSwitchRole('teacher', 'class-manager');
            }}
          />
        )}
      </main>

      {/* Quiet Editorial Footer */}
      <footer
        className="max-w-[1360px] mx-auto px-4 sm:px-8 py-4 border-t text-center text-sm"
        style={{
          color: selectedTheme.inkSecondary,
          borderColor: isDarkTheme
            ? 'rgba(255, 255, 255, 0.14)'
            : 'rgba(30, 50, 39, 0.15)',
        }}
      >
        <span>
          <strong style={{ color: selectedTheme.inkPrimary }}>
            HANU × 阮文受 (Nguyễn Văn Thụ)
          </strong>{' '}
          · Hệ Thống Trợ Giảng &amp; Học Tập Hán Ngữ Chuẩn HSK 3.0 · 彬彬 © 2026
        </span>
      </footer>

      {/* Single Floating Bottom-Right Widget: Trợ Giảng Gấu Trúc · 彬彬 */}
      <BinBinPandaAI
        variant="floating"
        activeSlide={slides[activeSlideIndex] || slides[0]}
        onApplyToSlide={handleApplyBinBinSlidePayload}
        hideFloatingTrigger={userProfile.role === 'student' && studentTab === 'quiz-leaderboard'}
      />

      {/* Teacher PIN Authentication Modal */}
      <TeacherPinModal
        isOpen={teacherPinModalOpen}
        onClose={() => {
          setTeacherPinModalOpen(false);
          setPendingTeacherTab(null);
        }}
        onSuccessUnlock={() => {
          setTeacherPinModalOpen(false);
          if (pendingTeacherTab) {
            setTeacherTab(pendingTeacherTab);
            setPendingTeacherTab(null);
          }
          applyRoleSwitch('teacher');
        }}
      />

      {/* Login & Role Selection Portal Modal */}
      <AuthModal
        isOpen={authModalOpen}
        currentUser={userProfile}
        onSelectRoleAndLogin={(nextProfile) => {
          if (nextProfile.role === 'teacher' && !isTeacherSessionUnlocked()) {
            setAuthModalOpen(false);
            setTeacherPinModalOpen(true);
            return;
          }
          if (nextProfile.role === 'student' && nextProfile.name) {
            setSelectedStudentName(nextProfile.name);
          }
          setUserProfile(nextProfile);
          setAuthModalOpen(false);
          scrollToStudio();
        }}
        onClose={() => setAuthModalOpen(false)}
      />

      {/* Optional Full-Screen Hanzi Stroke Order Modal */}
      {writingModalSlide && (
        <StrokeWritingModal
          slide={writingModalSlide}
          onClose={() => setWritingModalSlide(null)}
          onToggleLearned={handleToggleLearnedSlide}
        />
      )}

      {/* Theme Customizer Modal */}
      {showThemeDrawer && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-label="Tùy chỉnh giao diện HANU × 阮文受"
        >
          <div className="relative w-full max-w-5xl my-auto">
            <div className="flex justify-end mb-2">
              <button
                type="button"
                onClick={() => setShowThemeDrawer(false)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#1E3227] text-white text-sm font-semibold border border-white/20 cursor-pointer"
              >
                <Palette className="w-4 h-4" />
                <span>Đóng bảng Giao diện</span>
              </button>
            </div>
            <TeacherThemeStudio
              selectedTheme={selectedTheme}
              onSelectTheme={setSelectedTheme}
            />
          </div>
        </div>
      )}
    </div>
  );
}
