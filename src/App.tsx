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
  UserCheck,
  ChevronUp,
  ChevronDown,
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
import { QuizGameArena } from './components/QuizGameArena';
import { StudentAssignmentArena } from './components/StudentAssignmentArena';
import { ClassroomManager, getStoredStudentRoster } from './components/ClassroomManager';
import { TeacherThemeStudio } from './components/TeacherThemeStudio';
import { AuthModal, UserProfile, UserRole } from './components/AuthModal';
import { BinBinPandaAI, BinBinPandaMascotSVG } from './components/BinBinPandaAI';
import { speakChinese } from './utils/speech';
import {
  BinBinSlidePayload,
  createCustomVocabSlide,
  repairAndUpgradeSlide,
} from './utils/chineseEngine';

type TeacherTab = 'lesson-builder' | 'class-manager';
type StudentTab = 'today-lesson' | 'flashcard-srs' | 'quiz-leaderboard';

export default function App() {
  // User Profile & Role State (Default logged in as Teacher Nguyễn Văn Thụ)
  const [selectedStudentName, setSelectedStudentName] = useState<string>(() => {
    const roster = getStoredStudentRoster();
    return roster[0]?.name || 'Lưu Thị Minh Thư';
  });
  const [userProfile, setUserProfile] = useState<UserProfile>({
    role: 'teacher',
    name: 'Nguyễn Văn Thụ (阮文受)',
    classCode: '722229',
  });
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [hasOpenedPortalOnce, setHasOpenedPortalOnce] = useState(false);
  const [isHeroCollapsed, setIsHeroCollapsed] = useState(true);

  // Separate 2-Tab State for Teacher Mode & Student Mode
  const [teacherTab, setTeacherTab] = useState<TeacherTab>('lesson-builder');
  const [studentTab, setStudentTab] = useState<StudentTab>('today-lesson');
  const [showThemeDrawer, setShowThemeDrawer] = useState(false);

  const [slides, setSlides] = useState<VocabSlide[]>(() => {
    try {
      const saved = localStorage.getItem('hanu_custom_vocab_slides_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const baseIds = new Set(INITIAL_VOCAB_SLIDES.map((s) => s.hanzi));
          const extra = parsed
            .filter((s: VocabSlide) => s && s.hanzi && !baseIds.has(s.hanzi))
            .map((s: VocabSlide) => repairAndUpgradeSlide(s));
          return [...INITIAL_VOCAB_SLIDES, ...extra];
        }
      }
    } catch {
      // ignore storage errors
    }
    return INITIAL_VOCAB_SLIDES;
  });
  const [activeSlideIndex, setActiveSlideIndex] = useState(10); // Default to 温暖 (wēn nuǎn)
  const [writingModalSlide, setWritingModalSlide] = useState<VocabSlide | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<TeacherThemePreset>(
    TEACHER_THEME_PRESETS[0]
  );
  const [classroomStudentCount, setClassroomStudentCount] = useState<number>(
    () => getStoredStudentRoster().length
  );

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

  // Synchronize CSS variables whenever the user switches among the 5 teacher themes
  useEffect(() => {
    const root = document.documentElement;
    const isDark = selectedTheme.id === 'moon-night';
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
  }, [selectedTheme]);

  // Web Animations API Entrance (runs once when fonts are ready, fill: backwards, then cancels)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq.matches) return;

    let cancelled = false;
    const activeAnimations: Animation[] = [];

    const runEntrance = async () => {
      try {
        if ('fonts' in document) {
          await document.fonts.ready;
        }
      } catch {
        // Ignore font readiness errors
      }
      if (cancelled) return;

      const easing = 'cubic-bezier(0.16, 1, 0.3, 1)';

      // 1. Header items drop from top staggered
      headerItemsRef.current.forEach((el, idx) => {
        if (!el || typeof el.animate !== 'function') return;
        const anim = el.animate(
          [
            { opacity: 0, transform: 'translateY(-18px)' },
            { opacity: 1, transform: 'translateY(0)' },
          ],
          {
            duration: 520,
            delay: idx * 55,
            easing,
            fill: 'backwards',
          }
        );
        activeAnimations.push(anim);
      });

      // 2. Tracking dot pops in with circular clip-path, label follows
      if (kickerDotRef.current && typeof kickerDotRef.current.animate === 'function') {
        activeAnimations.push(
          kickerDotRef.current.animate(
            [
              { clipPath: 'circle(0% at 50% 50%)', transform: 'scale(0.5)' },
              { clipPath: 'circle(50% at 50% 50%)', transform: 'scale(1)' },
            ],
            { duration: 420, delay: 180, easing, fill: 'backwards' }
          )
        );
      }

      if (kickerLabelRef.current && typeof kickerLabelRef.current.animate === 'function') {
        activeAnimations.push(
          kickerLabelRef.current.animate(
            [
              { opacity: 0, transform: 'translateX(-10px)' },
              { opacity: 1, transform: 'translateX(0)' },
            ],
            { duration: 460, delay: 250, easing, fill: 'backwards' }
          )
        );
      }

      // 3. Each headline line rises inside its own mask
      [headlineLine1Ref.current, headlineLine2Ref.current].forEach((lineEl, idx) => {
        if (!lineEl || typeof lineEl.animate !== 'function') return;
        activeAnimations.push(
          lineEl.animate(
            [
              { transform: 'translateY(105%)', opacity: 0 },
              { transform: 'translateY(0%)', opacity: 1 },
            ],
            {
              duration: 620,
              delay: 300 + idx * 110,
              easing,
              fill: 'backwards',
            }
          )
        );
      });

      // 4. Paragraph and CTA settle into position
      [bodyCopyRef.current, ctaGroupRef.current].forEach((el, idx) => {
        if (!el || typeof el.animate !== 'function') return;
        activeAnimations.push(
          el.animate(
            [
              { opacity: 0, transform: 'translateY(16px)' },
              { opacity: 1, transform: 'translateY(0)' },
            ],
            {
              duration: 540,
              delay: 480 + idx * 90,
              easing,
              fill: 'backwards',
            }
          )
        );
      });

      // 5. Three frosted glass metric cards rise sequentially
      glassCardsRef.current.forEach((cardEl, idx) => {
        if (!cardEl || typeof cardEl.animate !== 'function') return;
        activeAnimations.push(
          cardEl.animate(
            [
              { opacity: 0, transform: 'translateY(22px)' },
              { opacity: 1, transform: 'translateY(0)' },
            ],
            {
              duration: 560,
              delay: 380 + idx * 110,
              easing,
              fill: 'backwards',
            }
          )
        );
      });

      // Animations settle naturally via fill: 'backwards'; only cancel on unmount if still running.
    };

    runEntrance();

    return () => {
      cancelled = true;
      activeAnimations.forEach((a) => {
        try {
          a.cancel();
        } catch {
          // ignore
        }
      });
    };
  }, []);

  const scrollToStudio = () => {
    setMobileMenuOpen(false);
    studioSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Switch role directly via the quick Role Switcher in #studio
  const handleQuickSwitchRole = (targetRole: UserRole) => {
    const roster = getStoredStudentRoster();
    const validStudentName =
      roster.some((s) => s.name === selectedStudentName)
        ? selectedStudentName
        : roster[0]?.name || 'Lưu Thị Minh Thư';
    if (targetRole === 'student' && validStudentName !== selectedStudentName) {
      setSelectedStudentName(validStudentName);
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

  // Navigate to a specific feature and open AuthModal on first start if requested
  const handleStartFromHero = (openPortal = true) => {
    scrollToStudio();
    if (openPortal && !hasOpenedPortalOnce) {
      setHasOpenedPortalOnce(true);
      setAuthModalOpen(true);
    }
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
        const current = slides[activeSlideIndex] || slides[6];
        speakChinese(current.hanzi);
      }
    } else if (target === 'quiz') {
      handleQuickSwitchRole('student');
      setStudentTab('quiz-leaderboard');
    } else if (target === 'class') {
      handleQuickSwitchRole('teacher');
      setTeacherTab('class-manager');
    }
    studioSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleToggleLearnedSlide = (slideId: string) => {
    setSlides((prev) =>
      prev.map((s) => (s.id === slideId ? { ...s, learned: !s.learned } : s))
    );
    setWritingModalSlide((prev) =>
      prev && prev.id === slideId ? { ...prev, learned: !prev.learned } : prev
    );
  };

  const persistCustomSlides = (allSlides: VocabSlide[]) => {
    try {
      const baseHanzis = new Set(INITIAL_VOCAB_SLIDES.map((s) => s.hanzi));
      const customOnly = allSlides.filter((s) => !baseHanzis.has(s.hanzi));
      localStorage.setItem('hanu_custom_vocab_slides_v2', JSON.stringify(customOnly));
    } catch {
      // ignore storage quota errors
    }
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

  // Auto-collapse Hero into the refined horizontal banner when entering Homework mode or scrolling down
  useEffect(() => {
    if (userProfile.role === 'student' && studentTab === 'quiz-leaderboard') {
      setIsHeroCollapsed(true);
    }
  }, [userProfile.role, studentTab]);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 140 && !isHeroCollapsed) {
        setIsHeroCollapsed(true);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isHeroCollapsed]);

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
          SCREEN 1: REFINED LIQUID GLASS HORIZONTAL BANNER OR FULL HERO STAGE
          ===================================================================== */}
      {isHeroCollapsed ? (
        <header
          data-testid="collapsed-hero-header"
          className="sticky top-0 z-30 h-11 min-h-[44px] backdrop-blur-xl bg-white/75 border-b border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] px-4 sm:px-8 flex items-center justify-between gap-2"
        >
          {/* Left: Logo HANU × 阮文受 + Avatar 彬彬 32px + [Đổi kiểu] */}
          <div className="flex items-center gap-2.5 min-w-0">
            <a
              href="#top"
              className="inline-flex items-center gap-2 font-bold text-sm text-[#1E3227] shrink-0"
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 32 32"
                fill="none"
                aria-hidden="true"
                className="shrink-0"
              >
                <circle cx="16" cy="5" r="2.6" fill="#1E3227" />
                <circle cx="25.5" cy="10.5" r="2.6" fill="#1E3227" />
                <circle cx="25.5" cy="21.5" r="2.6" fill="#1E3227" />
                <circle cx="16" cy="27" r="2.6" fill="#1E3227" />
                <circle cx="6.5" cy="21.5" r="2.6" fill="#1E3227" />
                <circle cx="6.5" cy="10.5" r="2.6" fill="#1E3227" />
                <circle cx="16" cy="16" r="3.2" fill="#9B8A3E" />
              </svg>
              <span>
                HANU × <span className="font-['Noto_Sans_SC']">阮文受</span>
              </span>
            </a>

            <span className="text-[#9B8A3E]/50 hidden xs:inline">|</span>

            {/* Avatar 彬彬 32px */}
            <div className="inline-flex items-center gap-1.5 shrink-0">
              <div
                className="w-8 h-8 rounded-full bg-[#FAFBF7] border border-[#9B8A3E] flex items-center justify-center shrink-0 shadow-2xs"
                title="Trợ giảng Gấu trúc Bin Bin (彬彬)"
              >
                <BinBinPandaMascotSVG size={26} />
              </div>
              <span className="text-[11px] font-bold text-[#3F5447] hidden md:inline">
                Trợ giảng 彬彬
              </span>
            </div>

            {/* Nút [Đổi kiểu] */}
            <button
              type="button"
              onClick={() => setShowThemeDrawer(true)}
              data-testid="compact-theme-switcher-btn"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-gradient-to-r from-[#0F5243] to-[#166E5B] hover:from-[#12604F] hover:to-[#1B7D68] text-[#FAF7F0] border border-[#C5B358]/50 text-[11px] font-bold shadow-xs transition-all duration-300 active:scale-95 cursor-pointer shrink-0"
              title="Đổi kiểu giao diện & màu sắc bảng lớp"
            >
              <Palette className="w-3 h-3 text-[#C5B358] shrink-0" />
              <span>Đổi kiểu</span>
            </button>
          </div>

          {/* Right: [Mở rộng Banner ▾] */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              data-testid="toggle-hero-banner-btn"
              onClick={() => setIsHeroCollapsed(false)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl backdrop-blur-md bg-white/80 hover:bg-white text-[#0F5243] border border-[#9B8A3E]/35 text-[11px] font-bold transition-all duration-300 active:scale-95 cursor-pointer"
              title="Mở rộng Banner giới thiệu & Vòng tròn Linh vật"
            >
              <ChevronDown className="w-3.5 h-3.5 text-[#9B8A3E] shrink-0" />
              <span>Mở rộng Banner</span>
            </button>
          </div>
        </header>
      ) : (
        <section className="halora-stage" aria-label="HANU × 阮文受 — Nền tảng Hán ngữ Thông minh">
          {/* Header */}
          <header className="halora-header">
            {/* Left: 6-petal dot circle logo + "HANU × 阮文受" */}
            <a
              href="#top"
              ref={(el) => {
                headerItemsRef.current[0] = el;
              }}
              className="halora-brand"
            >
              <svg
                width="28"
                height="28"
                viewBox="0 0 32 32"
                fill="none"
                aria-hidden="true"
                className="shrink-0"
              >
                <circle cx="16" cy="5" r="2.6" fill="#1E3227" />
                <circle cx="25.5" cy="10.5" r="2.6" fill="#1E3227" />
                <circle cx="25.5" cy="21.5" r="2.6" fill="#1E3227" />
                <circle cx="16" cy="27" r="2.6" fill="#1E3227" />
                <circle cx="6.5" cy="21.5" r="2.6" fill="#1E3227" />
                <circle cx="6.5" cy="10.5" r="2.6" fill="#1E3227" />
                <circle cx="16" cy="16" r="3.2" fill="#9B8A3E" />
              </svg>
              <span>
                HANU × <span className="font-['Noto_Sans_SC']">阮文受</span>
              </span>
            </a>

            {/* Center: 4 Concise Pure Vietnamese Navigation Links */}
            <nav className="halora-nav" aria-label="Điều hướng chính">
              <button
                type="button"
                ref={(el) => {
                  headerItemsRef.current[1] = el;
                }}
                onClick={() => {
                  setIsHeroCollapsed(true);
                  handleSelectNavTarget('vocab');
                }}
                className="halora-nav-link"
              >
                Từ vựng
              </button>
              <button
                type="button"
                ref={(el) => {
                  headerItemsRef.current[2] = el;
                }}
                onClick={() => {
                  setIsHeroCollapsed(true);
                  handleSelectNavTarget('writing');
                }}
                className="halora-nav-link"
              >
                Tập viết
              </button>
              <button
                type="button"
                ref={(el) => {
                  headerItemsRef.current[3] = el;
                }}
                onClick={() => {
                  setIsHeroCollapsed(true);
                  handleSelectNavTarget('quiz');
                }}
                className="halora-nav-link"
              >
                Trò chơi
              </button>
              <button
                type="button"
                ref={(el) => {
                  headerItemsRef.current[4] = el;
                }}
                onClick={() => {
                  setIsHeroCollapsed(true);
                  handleSelectNavTarget('class');
                }}
                className="halora-nav-link"
              >
                Lớp học
              </button>
            </nav>

            {/* Right: Collapse Banner + Giao diện */}
            <div className="halora-header-actions">
              <button
                type="button"
                data-testid="toggle-hero-banner-btn"
                onClick={() => setIsHeroCollapsed(true)}
                className="halora-pill-cart !bg-white/75 !text-[#1E3227] hover:!bg-white"
              >
                <ChevronUp className="w-4 h-4 shrink-0" />
                <span>Thu gọn Banner</span>
              </button>

              <button
                type="button"
                ref={(el) => {
                  headerItemsRef.current[6] = el;
                }}
                onClick={() => setShowThemeDrawer(true)}
                className="halora-pill-dark"
              >
                Đổi kiểu
              </button>
            </div>

            {/* Mobile (<820px) Circular Hamburger Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-label={mobileMenuOpen ? 'Đóng menu' : 'Mở menu điều hướng'}
              aria-expanded={mobileMenuOpen}
              className="halora-hamburger-btn"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </header>

          {/* Main 3-Zone Hero Content: Left Copy (max-width 420px) | Center Dragon & Ring | Right 3 Glass Cards */}
          <div className="halora-hero-main">
            {/* Left Copy Column (Vertically Centered, max-width 420px) */}
            <div className="halora-copy-col">
              <div className="halora-kicker">
                <span ref={kickerDotRef} className="halora-kicker-dot" />
                <span ref={kickerLabelRef}>
                  HANU × 阮文受 · NỀN TẢNG HÁN NGỮ THÔNG MINH
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
                Từ vựng, thứ tự nét viết, ngữ pháp, trò chơi tương tác và chấm bài tự động — chuẩn hóa thành bài giảng sinh động, tức thì.
              </p>

              <div ref={ctaGroupRef} className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  data-testid="hero-start-btn"
                  onClick={() => {
                    setIsHeroCollapsed(true);
                    handleStartFromHero(true);
                  }}
                  className="halora-pill-dark"
                >
                  Bắt đầu soạn bài
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsHeroCollapsed(true);
                    handleSelectNavTarget('writing');
                  }}
                  className="halora-pill-cart !text-[#1E3227] !bg-white/55 hover:!bg-white/75"
                >
                  <Edit3 className="w-4 h-4" />
                  <span>Tập viết chữ Hán</span>
                </button>
              </div>
            </div>

            {/* Middle Grid Spacer for Center Dragon Visual */}
            <div className="hidden md:block" aria-hidden="true" />

            {/* Right Column: Three Minimalist Frosted Glass Metric Cards (222x160s) */}
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
                aria-label="TỪ VỰNG 82.120 CHUẨN HSK 1–9 — Mở trình chiếu từ vựng"
              >
                <div className="halora-card-label">
                  <span>TỪ VỰNG</span>
                  <BookOpen className="w-4 h-4 stroke-[1.75] shrink-0" />
                </div>
                <div className="halora-card-value">82.120</div>
                <div className="halora-card-sub is-gold">CHUẨN HSK 1–9</div>
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
                <div className="halora-card-sub is-gold">GIÁO ÁN THÔNG MINH</div>
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
                aria-label="HỌC VIÊN 800+ ĐẠT CHUẨN ĐẦU RA — Mở quản lý lớp học"
              >
                <div className="halora-card-label">
                  <span>HỌC VIÊN</span>
                  <Users className="w-4 h-4 stroke-[1.75] shrink-0" />
                </div>
                <div className="halora-card-value">800+</div>
                <div className="halora-card-sub">ĐẠT CHUẨN ĐẦU RA</div>
              </button>
            </div>
          </div>

          {/* Center Visual: Eastern Dragon, Jade Ring, Luminous Pearl, Auspicious Clouds & Red Seal Stamp ("阮文受") */}
          <HaloraCenterScene />
        </section>
      )}

      {/* =====================================================================
          SCREEN 2: HANU × 阮文受 — ROLE-SEPARATED LEARNING & TEACHING STUDIO (#studio)
          ===================================================================== */}
      <main
        ref={studioSectionRef}
        id="studio"
        className="relative z-20 max-w-[1360px] mx-auto px-4 sm:px-8 pt-2 pb-12"
      >
        {/* =================================================================
            FLOATING GLASS DOCK: UNIFIED ROLE BAR + SMOOTH SLIDING PILL TABS
            ================================================================= */}
        <div
          data-testid="floating-glass-dock"
          className="sticky top-12 z-25 rounded-2xl backdrop-blur-xl bg-white/75 border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:border-[#C5B358]/50 px-3 py-1.5 mb-2 flex flex-col gap-1.5 transition-all duration-300"
        >
          {/* Row 1: Role Profile + Teacher Mode Tabs (if Teacher) + Role Switcher [Giáo viên | Học sinh] */}
          <div className="min-h-[34px] flex items-center justify-between gap-2 flex-nowrap overflow-x-auto no-scrollbar">
            {/* Left: GIẢNG VIÊN / HỌC VIÊN Profile Button */}
            <button
              type="button"
              data-testid="header-auth-btn"
              onClick={() => setAuthModalOpen(true)}
              className="flex items-center gap-1.5 shrink-0 text-left cursor-pointer hover:opacity-85 transition-opacity"
              title="Bấm để mở Cổng Đăng Nhập & Hồ Sơ"
            >
              <span
                className={`px-2 py-0.5 rounded-lg font-bold text-[10px] uppercase tracking-wider shrink-0 ${
                  userProfile.role === 'teacher'
                    ? 'bg-gradient-to-r from-[#0F5243] to-[#166E5B] text-[#FAF7F0] shadow-2xs'
                    : 'bg-gradient-to-r from-[#B8292F] to-[#961C21] text-[#FAF7F0] shadow-2xs'
                }`}
              >
                {userProfile.role === 'teacher' ? 'GIẢNG VIÊN' : 'HỌC VIÊN'}
              </span>
              <span className="text-xs font-bold text-[#0F382E] whitespace-nowrap">
                {userProfile.name.replace(/\s*\(.*?\)\s*/g, '')}
              </span>
            </button>

            {/* Center (Teacher Mode): [1. Soạn Bài | 2. Quản Lý Lớp (10)] with smooth sliding pill */}
            {userProfile.role === 'teacher' && (
              <div
                className="relative inline-grid grid-cols-2 items-center p-0.5 rounded-xl bg-[#0F5243]/8 border border-[#0F5243]/15 shrink-0"
                role="tablist"
                aria-label="Không gian Giáo viên (2 mục)"
              >
                {/* Sliding Active Pill Indicator */}
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute top-0.5 bottom-0.5 left-0.5 w-[calc(50%-2px)] rounded-lg bg-gradient-to-r from-[#0F5243] to-[#166E5B] shadow-[0_2px_10px_rgba(15,82,67,0.28)] transition-transform duration-300 ease-out"
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
                  className={`relative z-10 inline-flex items-center justify-center gap-1 px-3 py-1 rounded-lg text-[11px] font-bold transition-all duration-300 active:scale-95 whitespace-nowrap cursor-pointer ${
                    teacherTab === 'lesson-builder'
                      ? 'text-white'
                      : 'text-[#3A544B] hover:text-[#0F5243]'
                  }`}
                >
                  <Presentation className="w-3 h-3 shrink-0" />
                  <span>1. Soạn Bài</span>
                </button>

                <button
                  type="button"
                  role="tab"
                  data-testid="teacher-tab-classroom"
                  aria-selected={teacherTab === 'class-manager'}
                  onClick={() => setTeacherTab('class-manager')}
                  className={`relative z-10 inline-flex items-center justify-center gap-1 px-3 py-1 rounded-lg text-[11px] font-bold transition-all duration-300 active:scale-95 whitespace-nowrap cursor-pointer ${
                    teacherTab === 'class-manager'
                      ? 'text-white'
                      : 'text-[#3A544B] hover:text-[#0F5243]'
                  }`}
                >
                  <GraduationCap className="w-3 h-3 shrink-0" />
                  <span>2. Quản Lý Lớp ({classroomStudentCount})</span>
                </button>
              </div>
            )}

            {/* Right: Quick Role Switcher [Giáo viên | Học sinh] with Jade & Cinnabar pills */}
            <div className="flex items-center gap-1 shrink-0">
              <div
                className="inline-flex items-center p-0.5 rounded-xl bg-[#0F5243]/8 border border-[#0F5243]/15 text-[11px]"
                role="group"
                aria-label="Chuyển đổi nhanh vai trò"
              >
                <button
                  type="button"
                  data-testid="role-switch-teacher"
                  onClick={() => handleQuickSwitchRole('teacher')}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all duration-300 active:scale-95 whitespace-nowrap cursor-pointer ${
                    userProfile.role === 'teacher'
                      ? 'bg-gradient-to-r from-[#0F5243] to-[#166E5B] text-white shadow-[0_2px_10px_rgba(15,82,67,0.28)]'
                      : 'text-[#3A544B] hover:text-[#0F5243]'
                  }`}
                >
                  <GraduationCap className="w-3 h-3 shrink-0" />
                  <span>Giáo viên</span>
                </button>
                <button
                  type="button"
                  data-testid="role-switch-student"
                  onClick={() => handleQuickSwitchRole('student')}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all duration-300 active:scale-95 whitespace-nowrap cursor-pointer ${
                    userProfile.role === 'student'
                      ? 'bg-gradient-to-r from-[#B8292F] to-[#961C21] text-white shadow-[0_2px_10px_rgba(184,41,47,0.28)]'
                      : 'text-[#3A544B] hover:text-[#B8292F]'
                  }`}
                >
                  <Users className="w-3 h-3 shrink-0" />
                  <span>Học sinh</span>
                </button>
              </div>
            </div>
          </div>

          {/* Row 2 (Student Mode): 3-Mode Segmented Control with Smooth Sliding Jade Pill */}
          {userProfile.role === 'student' && (
            <div
              className="relative grid grid-cols-3 p-1 rounded-xl bg-[#0F5243]/6 border border-[#0F5243]/12 w-full h-9 items-center overflow-hidden"
              role="tablist"
              aria-label="Chế độ Tự Học & Ôn Tập Thông Minh (3 mục)"
            >
              {/* Smooth Sliding Jade Pill Background */}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute top-1 bottom-1 left-1 w-[calc((100%-8px)/3)] rounded-lg bg-gradient-to-r from-[#0F5243] to-[#166E5B] shadow-[0_3px_12px_rgba(15,82,67,0.28)] transition-transform duration-300 ease-out"
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
                className={`relative z-10 h-full flex items-center justify-center gap-1.5 px-2 rounded-lg text-xs font-bold transition-all duration-300 active:scale-95 whitespace-nowrap cursor-pointer ${
                  studentTab === 'today-lesson'
                    ? 'text-white'
                    : isDarkTheme
                    ? 'text-[#E5E7EB] hover:text-white'
                    : 'text-[#0F382E]/80 hover:text-[#0F5243]'
                }`}
              >
                <span className="truncate">📖 Học &amp; Viết nét</span>
              </button>

              <button
                type="button"
                role="tab"
                data-testid="student-tab-flashcard"
                aria-selected={studentTab === 'flashcard-srs'}
                onClick={() => setStudentTab('flashcard-srs')}
                className={`relative z-10 h-full flex items-center justify-center gap-1.5 px-2 rounded-lg text-xs font-bold transition-all duration-300 active:scale-95 whitespace-nowrap cursor-pointer ${
                  studentTab === 'flashcard-srs'
                    ? 'text-white'
                    : isDarkTheme
                    ? 'text-[#E5E7EB] hover:text-white'
                    : 'text-[#0F382E]/80 hover:text-[#0F5243]'
                }`}
              >
                <span className="truncate">🃏 Flashcard</span>
              </button>

              <button
                type="button"
                role="tab"
                data-testid="student-tab-quiz"
                aria-selected={studentTab === 'quiz-leaderboard'}
                onClick={() => setStudentTab('quiz-leaderboard')}
                className={`relative z-10 h-full flex items-center justify-center gap-1.5 px-2 rounded-lg text-xs font-bold transition-all duration-300 active:scale-95 whitespace-nowrap cursor-pointer ${
                  studentTab === 'quiz-leaderboard'
                    ? 'text-white'
                    : isDarkTheme
                    ? 'text-[#E5E7EB] hover:text-white'
                    : 'text-[#0F382E]/80 hover:text-[#0F5243]'
                }`}
              >
                <span className="truncate">✍️ Bài tập HSK 3.0</span>
              </button>
            </div>
          )}
        </div>

        {/* Active Role Workspace Content */}
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
              roleMode="teacher"
              onSwitchToStudentHomework={() => {
                handleQuickSwitchRole('student');
                setStudentTab('quiz-leaderboard');
              }}
            />
          ) : (
            <ClassroomManager
              onStudentCountChange={setClassroomStudentCount}
              onSwitchToStudentView={() => {
                handleQuickSwitchRole('student');
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
              handleQuickSwitchRole('teacher');
              setTeacherTab('class-manager');
            }}
          />
        )}
      </main>

      {/* Quiet Editorial Footer */}
      <footer
        className="max-w-[1360px] mx-auto px-4 sm:px-8 py-3.5 border-t text-center text-xs"
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
          · Hệ Thống Trợ Giảng Hán Ngữ Thông Minh · 彬彬 · Chuẩn HSK 3.0 © 2026
        </span>
      </footer>

      {/* Floating Bottom-Right Widget: Gấu trúc Bin Bin AI (彬彬) · Hỗ trợ học tập */}
      <BinBinPandaAI
        variant="floating"
        activeSlide={slides[activeSlideIndex] || slides[0]}
        onApplyToSlide={handleApplyBinBinSlidePayload}
      />

      {/* Login & Role Selection Portal Modal */}
      <AuthModal
        isOpen={authModalOpen}
        currentUser={userProfile}
        onSelectRoleAndLogin={(nextProfile) => {
          if (nextProfile.role === 'student' && nextProfile.name) {
            setSelectedStudentName(nextProfile.name);
          }
          setUserProfile(nextProfile);
          setHasOpenedPortalOnce(true);
          setAuthModalOpen(false);
          scrollToStudio();
        }}
        onClose={() => setAuthModalOpen(false)}
      />

      {/* Optional Full-Screen Hanzi Stroke Order Modal (when user clicks "Phóng to ô viết") */}
      {writingModalSlide && (
        <StrokeWritingModal
          slide={writingModalSlide}
          onClose={() => setWritingModalSlide(null)}
          onToggleLearned={handleToggleLearnedSlide}
        />
      )}

      {/* Theme Customizer Modal when clicking "Giao diện" */}
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
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#1E3227] text-white text-xs font-semibold border border-white/20"
              >
                <Palette className="w-3.5 h-3.5" />
                Đóng bảng Giao diện
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
