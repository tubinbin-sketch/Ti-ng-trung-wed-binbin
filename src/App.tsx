/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense, useEffect, useRef, useState } from 'react';
import {
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate,
  useParams,
  Link,
} from 'react-router-dom';
import {
  AlertTriangle,
  AudioLines,
  BookOpen,
  Puzzle,
  Check,
  Cloud,
  CloudOff,
  Download,
  GraduationCap,
  Home,
  Layers,
  Lock,
  LogIn,
  PenTool,
  Presentation,
  RefreshCw,
  Trophy,
  Users,
} from 'lucide-react';
import {
  INITIAL_VOCAB_SLIDES,
  TEACHER_THEME_PRESETS,
  TeacherThemePreset,
  VocabSlide,
} from './data/chineseData';
const SlideDeckStudio = React.lazy(() =>
  import('./components/SlideDeckStudio').then((m) => ({ default: m.SlideDeckStudio }))
);
import {
  getStoredStudentRoster,
  STORAGE_KEY_STUDENTS,
} from './components/classroom/classroomRosterData';
import type { UserProfile, UserRole } from './components/AuthModal';
import { LazyErrorBoundary } from './components/LazyErrorBoundary';
import { HomeDashboard } from './components/HomeDashboard';
import { PWAInstallButton } from './components/PWAInstallButton';
import { PageSkeleton } from './components/ui/PageSkeleton';
import { EmptyState } from './components/ui/EmptyState';
import { appStore, useAppStoreSelector } from './context/AppStoreContext';
import {
  AppSidebar,
  AppTabBar,
  Avatar,
  NavItem,
  NavSection,
  ThemePicker,
} from './components/layout/AppShell';

// The login dialog pulls in Firebase; load it only when it's opened.
const AuthModal = React.lazy(() =>
  import('./components/AuthModal').then((m) => ({ default: m.AuthModal }))
);
const StrokeWritingModal = React.lazy(() =>
  import('./components/StrokeWritingModal').then((m) => ({ default: m.StrokeWritingModal }))
);
const StudentAssignmentArena = React.lazy(() =>
  import('./components/StudentAssignmentArena').then((m) => ({ default: m.StudentAssignmentArena }))
);
const PracticeStudio = React.lazy(() =>
  import('./components/PracticeStudio').then((m) => ({ default: m.PracticeStudio }))
);
const ShadowingStudio = React.lazy(() =>
  import('./components/ShadowingStudio').then((m) => ({ default: m.ShadowingStudio }))
);
const ClassroomManager = React.lazy(() =>
  import('./components/ClassroomManager').then((m) => ({ default: m.ClassroomManager }))
);
const PrivacyPolicyPage = React.lazy(() =>
  import('./components/PrivacyPolicyPage').then((m) => ({ default: m.PrivacyPolicyPage }))
);
const BinBinPandaAI = React.lazy(() =>
  import('./components/BinBinPandaAI').then((m) => ({ default: m.BinBinPandaAI }))
);
import { speakChinese } from './utils/speech';
import {
  BinBinSlidePayload,
  createCustomVocabSlide,
  repairAndUpgradeSlide,
  SMART_HANZI_DICTIONARY,
} from './utils/chineseEngine';
import {
  applyStudentLearnedToSlides,
  exportFullSystemBackupToFile,
  getCurrentSyncStatus,
  getStudentLearnedSlideIds,
  isTeacherSessionUnlocked,
  loadActiveClassroomSession,
  runStorageMigrations,
  saveActiveClassroomSession,
  saveStudentLearnedSlideIds,
  setActiveStudentStorageId,
  setTeacherSessionUnlocked,
  SyncStatus,
} from './utils/storageService';
import {
  mergeRemoteFirestoreSrsIntoLocal,
  recordDailyWordReview,
} from './utils/hskStudyHelpers';
import { saveStoredAssignment } from './utils/assignmentParser';
import { currentFirebaseUid, loadFirebase } from './firebaseClient';

const STORAGE_KEY_UI_THEME = 'hanu_ui_theme';

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

type TeacherTab = 'lesson-builder' | 'class-manager';
type StudentTab = 'today-lesson' | 'flashcard-srs' | 'quiz-leaderboard';

function AssignmentRouteWrapper({
  slides,
  studentName,
  onSelectStudentName,
  onSwitchToTeacherView,
}: {
  slides: VocabSlide[];
  studentName: string;
  onSelectStudentName: (name: string) => void;
  onSwitchToTeacherView: () => void;
}) {
  const { id } = useParams<{ id?: string }>();
  // Practice used to live under /bai-tap; keep old links working.
  if (id === 'speedtest' || id === 'kiem-tra') return <Navigate to="/luyen-tap/trac-nghiem" replace />;
  if (id === 'sentence-builder' || id === 'ghep-cau') return <Navigate to="/luyen-tap/ghep-cau" replace />;
  const normalizedSection = id === 'leaderboard' || id === 'xep-hang' ? 'leaderboard' : 'homework';

  return (
    <LazyErrorBoundary fallbackLabel="Không thể tải khu vực Bài tập HSK.">
      <Suspense
        fallback={<PageSkeleton label="Đang tải bài tập…" />}
      >
        <StudentAssignmentArena
          slides={slides}
          studentName={studentName}
          initialSection={normalizedSection}
          onSelectStudentName={onSelectStudentName}
          onSwitchToTeacherView={onSwitchToTeacherView}
        />
      </Suspense>
    </LazyErrorBoundary>
  );
}

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();

  const [selectedStudentName, setSelectedStudentName] = useState<string>(() => {
    const activeSession = loadActiveClassroomSession();
    if (activeSession?.role === 'student' && activeSession.displayName) {
      return activeSession.displayName;
    }
    const roster = getStoredStudentRoster();
    return roster[0]?.name || 'Học viên HSK';
  });

  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    const activeSession = loadActiveClassroomSession();
    if (activeSession) {
      return {
        role: activeSession.role,
        name:
          activeSession.displayName ||
          activeSession.studentName ||
          activeSession.teacherName ||
          'Học viên HSK',
        uid: activeSession.uid,
        email: activeSession.email,
        classId: activeSession.classId,
        classCode: activeSession.joinCode || undefined,
        studentCode: activeSession.studentCode,
        isDemo: activeSession.isDemo,
      };
    }
    const roster = getStoredStudentRoster();
    const initialStudent = roster[0]?.name || 'Học viên HSK';
    return {
      role: 'student',
      name: initialStudent,
    };
  });

  const [authModalOpen, setAuthModalOpen] = useState(false);

  const [teacherTab, setTeacherTab] = useState<TeacherTab>('lesson-builder');
  const [studentTab, setStudentTab] = useState<StudentTab>('today-lesson');
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(false);
  const settingsMenuRef = useRef<HTMLDivElement | null>(null);

  const [slides, setSlides] = useState<VocabSlide[]>(() =>
    runStorageMigrations(INITIAL_VOCAB_SLIDES)
  );
  const [activeSlideIndex, setActiveSlideIndex] = useState(10); // Default to 温暖 (wēn nuǎn)
  const [writingModalSlide, setWritingModalSlide] = useState<VocabSlide | null>(null);
  const [selectedTheme, setSelectedTheme] = useState<TeacherThemePreset>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_UI_THEME);
      const match = TEACHER_THEME_PRESETS.find((t) => t.id === stored);
      if (match) return match;
    } catch {
      // storage unavailable: fall back to default dark theme
    }
    return TEACHER_THEME_PRESETS.find((t) => t.id === 'moon-night') || TEACHER_THEME_PRESETS[0];
  });
  const [classroomStudentCount, setClassroomStudentCount] = useState<number>(
    () => getStoredStudentRoster().length
  );
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(() => getCurrentSyncStatus());

  // Sync URL pathname with userProfile.role, studentTab, and teacherTab
  useEffect(() => {
    const path = location.pathname;
    if (path === '/hoc') {
      if (userProfile.role !== 'student') {
        setUserProfile((prev) => ({ ...prev, role: 'student' }));
      }
      setStudentTab('today-lesson');
    } else if (path === '/flashcard') {
      if (userProfile.role !== 'student') {
        setUserProfile((prev) => ({ ...prev, role: 'student' }));
      }
      setStudentTab('flashcard-srs');
    } else if (path === '/bai-tap' || path.startsWith('/bai-tap/')) {
      if (userProfile.role !== 'student') {
        setUserProfile((prev) => ({ ...prev, role: 'student' }));
      }
      setStudentTab('quiz-leaderboard');
    } else if (path === '/giao-vien/soan-bai') {
      if (userProfile.role !== 'teacher') {
        setUserProfile((prev) => ({
          ...prev,
          role: 'teacher',
          name: prev.role === 'teacher' ? prev.name : 'Giáo viên',
        }));
      }
      setTeacherTab('lesson-builder');
    } else if (path.startsWith('/giao-vien/lop/')) {
      const routeClassId = path.split('/giao-vien/lop/')[1]?.split('/')[0] || '';
      setUserProfile((prev) => ({
        ...prev,
        role: 'teacher',
        name:
          prev.role === 'teacher' && !/^học viên/i.test(prev.name)
            ? prev.name
            : 'Giáo viên',
        classId: prev.classId || routeClassId || undefined,
      }));
      setTeacherTab('class-manager');
    }
  }, [location.pathname]);

  // Firebase loads in the background after the first screen (see firebaseClient.ts).
  // firebaseUid is the reactive "signed in" signal for the effects below.
  const [firebaseUid, setFirebaseUid] = useState<string | null>(null);

  // Teacher pages need a teacher sign-in on this device (the server re-checks every request).
  const hasTeacherAccess = () =>
    isTeacherSessionUnlocked() || loadActiveClassroomSession()?.role === 'teacher';

  // Listen to Firebase Auth state changes and active classroom Firestore subscriptions
  useEffect(() => {
    let cancelled = false;
    let unsubAuth: (() => void) | undefined;
    loadFirebase()
      .then(({ auth, onAuthStateChanged }) => {
        if (cancelled) return;
        unsubAuth = onAuthStateChanged(auth, (user) => {
      setFirebaseUid(user?.uid ?? null);
      if (!user) return;
      const session = loadActiveClassroomSession();
      if (session && !session.isDemo) {
        setUserProfile((prev) => ({
          ...prev,
          uid: user.uid,
          email: user.email || prev.email,
        }));
      }
        });
      })
      .catch(() => {
        // Offline or blocked: the app keeps working with local data.
      });
    return () => {
      cancelled = true;
      unsubAuth?.();
    };
  }, []);

  // Real-time Firestore listener for active class (slides, assignment, roster/leaderboard)
  useEffect(() => {
    // Wait for the restored Firebase session (it arrives asynchronously after load).
    if (!firebaseUid) return;
    const activeSession = loadActiveClassroomSession();
    const classId = userProfile.classId || activeSession?.classId;
    if (!classId || classId.startsWith('demo-')) return;

    let cancelled = false;
    let unsubClassroom: (() => void) | undefined;
    void loadFirebase().then(({ subscribeToClassroom }) => {
      if (cancelled) return;
      unsubClassroom = subscribeToClassroom(
      classId,
      userProfile.role,
      {
        onDeckSlides: (remoteSlides) => {
          if (remoteSlides.length > 0) {
            const studentKey =
              userProfile.studentCode || selectedStudentName || userProfile.uid || 'HV-001';
            setSlides((prev) => {
              const remoteHanzis = new Set(remoteSlides.map((s) => s.hanzi));
              const localCustom = prev.filter((s) => !remoteHanzis.has(s.hanzi));
              return applyStudentLearnedToSlides([...remoteSlides, ...localCustom], studentKey);
            });
          }
        },
        onAssignment: (pkg) => {
          saveStoredAssignment(pkg);
        },
        onStudentsRoster: (students) => {
          try {
            localStorage.setItem(STORAGE_KEY_STUDENTS, JSON.stringify(students));
            setClassroomStudentCount(students.length);
            window.dispatchEvent(
              new CustomEvent('hanu_students_updated', { detail: students.length })
            );
          } catch {
            // ignore
          }
        },
        onLeaderboard: (leaderboardRows) => {
          if (userProfile.role === 'student') {
            try {
              const mapped = leaderboardRows.map((row, idx) => ({
                id: row.uid || `lb-${idx + 1}`,
                studentCode: row.studentCode || `HV-${String(idx + 1).padStart(3, '0')}`,
                hskLevel: (row.hskLevel as any) || 'HSK 2',
                name: row.name,
                vocabScore: '18/18 từ',
                writingScore: '95% độ chuẩn nét',
                quizScore: '10/10 câu đúng',
                totalPoints: row.score,
                status: 'Đã chấm tự động' as const,
                timeSeconds: row.timeSeconds,
                streak: row.streak,
                feedback: 'Đồng bộ từ Bảng Xếp Hạng Lớp (Firestore).',
              }));
              localStorage.setItem(STORAGE_KEY_STUDENTS, JSON.stringify(mapped));
              setClassroomStudentCount(mapped.length);
              window.dispatchEvent(
                new CustomEvent('hanu_students_updated', { detail: mapped.length })
              );
            } catch {
              // ignore
            }
          }
        },
      }
    );
    });

    return () => {
      cancelled = true;
      unsubClassroom?.();
    };
  }, [userProfile.classId, userProfile.role, firebaseUid]);

  // Real-time Firestore listener for personal Student SRS ("users/{uid}/srs/{wordId}")
  useEffect(() => {
    if (userProfile.role !== 'student') return;
    const uid = firebaseUid || userProfile.uid;
    if (!uid || uid.startsWith('demo-')) return;

    let cancelled = false;
    let unsubSrs: (() => void) | undefined;
    void loadFirebase().then(({ subscribeToStudentSrs }) => {
      if (cancelled) return;
      unsubSrs = subscribeToStudentSrs(uid, (srsMap) => {
      if (Object.keys(srsMap).length === 0) return;
      const learnedIds = new Set<string>();
      Object.entries(srsMap).forEach(([wordId, data]) => {
        if (data?.learned) {
          learnedIds.add(wordId);
        }
      });
      const studentKey = userProfile.studentCode || selectedStudentName || uid;
      saveStudentLearnedSlideIds(learnedIds, studentKey);
      setSlides((prev) => {
        mergeRemoteFirestoreSrsIntoLocal(prev, srsMap, studentKey);
        return applyStudentLearnedToSlides(prev, studentKey);
      });
      appStore.notifySrsUpdated();
    });
    });
    return () => {
      cancelled = true;
      unsubSrs?.();
    };
  }, [
    firebaseUid,
    userProfile.uid,
    userProfile.role,
    userProfile.studentCode,
    selectedStudentName,
  ]);

  const totalVocabBankCount = React.useMemo(() => {
    const dictKeys = Object.keys(SMART_HANZI_DICTIONARY);
    const uniqueSet = new Set([...dictKeys, ...slides.map((s) => s.hanzi)]);
    return uniqueSet.size;
  }, [slides]);

  // App bus (AppStoreContext): BinBin panel, sync status and data mode live there.
  const binbinDock = useAppStoreSelector((st) => ({
    isOpen: st.binbinIsOpen,
    mode: st.binbinDisplayMode,
  }));
  const isBinBinDockedOpen = binbinDock.isOpen && binbinDock.mode === 'docked';
  const storeSyncStatus = useAppStoreSelector((st) => st.syncStatus);
  const binbinApplyPayload = useAppStoreSelector((st) => st.binbinApplySlidePayload);
  const isFirstStoreSync = useRef(true);

  useEffect(() => {
    if (isFirstStoreSync.current) {
      isFirstStoreSync.current = false;
      return;
    }
    setSyncStatus(storeSyncStatus);
  }, [storeSyncStatus]);

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


  useEffect(() => {
    const roster = getStoredStudentRoster();
    const matched = roster.find(
      (s) => s.studentCode === userProfile.studentCode || s.name === selectedStudentName
    );
    const studentKey =
      matched?.studentCode || userProfile.studentCode || selectedStudentName || 'HV-001';
    setActiveStudentStorageId(studentKey);
    setSlides((prev) => applyStudentLearnedToSlides(prev, studentKey));
    window.dispatchEvent(new CustomEvent('hanu_srs_updated'));
  }, [selectedStudentName, userProfile.studentCode]);

  const studioSectionRef = useRef<HTMLElement | null>(null);

  const isFirstThemeApply = useRef(true);
  useEffect(() => {
    const root = document.documentElement;
    // Cross-fade colours when the user switches theme (not on first paint).
    let fadeTimer: number | undefined;
    if (!isFirstThemeApply.current && !prefersReducedMotion()) {
      root.classList.add('theme-transition');
      fadeTimer = window.setTimeout(() => root.classList.remove('theme-transition'), 350);
    }
    isFirstThemeApply.current = false;
    root.setAttribute('data-theme', selectedTheme.id);
    try {
      localStorage.setItem(STORAGE_KEY_UI_THEME, selectedTheme.id);
    } catch {
      // ignore storage errors
    }
    return () => {
      if (fadeTimer) window.clearTimeout(fadeTimer);
      root.classList.remove('theme-transition');
    };
  }, [selectedTheme]);

  // Gentle fade/rise of the page content on navigation. Uses the Web Animations
  // API so the route components are not remounted (their state is kept).
  const lastAnimatedPath = useRef(location.pathname);
  useEffect(() => {
    if (lastAnimatedPath.current === location.pathname) return;
    lastAnimatedPath.current = location.pathname;
    const el = studioSectionRef.current;
    if (!el || prefersReducedMotion() || typeof el.animate !== 'function') return;
    el.animate(
      [
        { opacity: 0, transform: 'translateY(4px)' },
        { opacity: 1, transform: 'none' },
      ],
      { duration: 200, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' }
    );
  }, [location.pathname]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSettingsMenuOpen(false);
        setWritingModalSlide(null);
        setAuthModalOpen(false);
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const applyRoleSwitch = (targetRole: UserRole, desiredTeacherTab?: TeacherTab) => {
    const roster = getStoredStudentRoster();
    const validStudentName = roster.some((s) => s.name === selectedStudentName)
      ? selectedStudentName
      : roster[0]?.name || 'Học viên HSK';
    if (targetRole === 'student' && validStudentName !== selectedStudentName) {
      setSelectedStudentName(validStudentName);
    }
    const nextClassId = userProfile.classId || 'lop-cua-toi';
    setUserProfile((prev) => ({
      ...prev,
      role: targetRole,
      name:
        targetRole === 'teacher'
          ? prev.role === 'teacher'
            ? prev.name
            : 'Giáo viên'
          : validStudentName,
    }));

    if (targetRole === 'teacher') {
      const nextTab = desiredTeacherTab || teacherTab;
      setTeacherTab(nextTab);
      if (nextTab === 'class-manager') {
        navigate(`/giao-vien/lop/${nextClassId}`);
      } else {
        navigate('/giao-vien/soan-bai');
      }
    } else {
      navigate('/hoc');
    }
  };

  const handleQuickSwitchRole = (targetRole: UserRole, desiredTeacherTab?: TeacherTab) => {
    if (targetRole === 'teacher' && userProfile.role !== 'teacher') {
      if (hasTeacherAccess()) {
        applyRoleSwitch('teacher', desiredTeacherTab);
        return;
      }
      setAuthModalOpen(true);
      return;
    }
    applyRoleSwitch(targetRole, desiredTeacherTab);
  };

  const handleSelectNavTarget = (target: 'vocab' | 'writing' | 'quiz' | 'class') => {
    if (target === 'vocab' || target === 'writing') {
      if (userProfile.role === 'teacher') {
        setTeacherTab('lesson-builder');
        navigate('/giao-vien/soan-bai');
      } else {
        setStudentTab('today-lesson');
        navigate('/hoc');
      }
      if (target === 'writing') {
        const current = slides[activeSlideIndex] || slides[0];
        speakChinese(current.hanzi);
      }
    } else if (target === 'quiz') {
      setUserProfile((prev) => ({ ...prev, role: 'student' }));
      setStudentTab('quiz-leaderboard');
      navigate('/bai-tap');
    } else if (target === 'class') {
      handleQuickSwitchRole('teacher', 'class-manager');
    }
    scrollToStudio();
  };

  const persistCustomSlides = (allSlides: VocabSlide[]) => {
    try {
      localStorage.setItem('hanu_full_slides_deck_v3', JSON.stringify(allSlides));
      const baseHanzis = new Set(INITIAL_VOCAB_SLIDES.map((s) => s.hanzi));
      const customOnly = allSlides.filter((s) => !baseHanzis.has(s.hanzi));
      localStorage.setItem('hanu_custom_vocab_slides_v2', JSON.stringify(customOnly));
      if (
        userProfile.role === 'teacher' &&
        userProfile.classId &&
        !userProfile.classId.startsWith('demo-')
      ) {
        const classId = userProfile.classId;
        void loadFirebase()
          .then(({ saveTeacherDeckToFirestore }) => saveTeacherDeckToFirestore(classId, allSlides))
          .catch(() => {});
      }
    } catch {
      // ignore storage quota errors
    }
  };

  const handleToggleLearnedSlide = (slideId: string) => {
    const roster = getStoredStudentRoster();
    const matched = roster.find(
      (s) => s.studentCode === userProfile.studentCode || s.name === selectedStudentName
    );
    const studentKey =
      matched?.studentCode || userProfile.studentCode || selectedStudentName || 'HV-001';

    setSlides((prev) => {
      const updated = prev.map((s) => (s.id === slideId ? { ...s, learned: !s.learned } : s));
      const learnedIds = getStudentLearnedSlideIds(studentKey);
      const targetSlide = updated.find((s) => s.id === slideId);
      if (targetSlide?.learned) {
        learnedIds.add(slideId);
        recordDailyWordReview(slideId, updated);
      } else {
        learnedIds.delete(slideId);
      }
      saveStudentLearnedSlideIds(learnedIds, studentKey);
      persistCustomSlides(updated);
      const signedInUid = currentFirebaseUid();
      if (signedInUid && targetSlide) {
        const record = {
          slideId,
          hanzi: targetSlide.hanzi,
          pinyin: targetSlide.pinyin,
          meaning: targetSlide.meaning,
          learned: Boolean(targetSlide.learned),
        };
        void loadFirebase()
          .then(({ saveStudentSrsWordToFirestore }) =>
            saveStudentSrsWordToFirestore(signedInUid, slideId, record)
          )
          .catch(() => {});
      }
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
    if (!binbinApplyPayload) return;
    handleApplyBinBinSlidePayload(binbinApplyPayload);
    appStore.clearBinBinSlidePayload();
  }, [binbinApplyPayload]);

  const isDarkTheme = selectedTheme.id === 'moon-night';
  const activeClassIdForUrl = userProfile.classId || 'lop-cua-toi';
  const displayName = userProfile.name.replace(/\s*\(.*?\)\s*/g, '').trim() || 'Học viên';
  const teacherLocked = !hasTeacherAccess();

  const goStudent = (path: string) => {
    if (path === '/flashcard') setStudentTab('flashcard-srs');
    else if (path.startsWith('/bai-tap')) setStudentTab('quiz-leaderboard');
    else if (path === '/hoc') setStudentTab('today-lesson');
    navigate(path);
    scrollToStudio();
  };

  const path = location.pathname;
  const activeNavId =
    path === '/'
      ? 'home'
      : path === '/hoc'
      ? 'lesson'
      : path === '/flashcard'
      ? 'flashcard'
      : path === '/bai-tap/leaderboard' || path === '/bai-tap/xep-hang'
      ? 'leaderboard'
      : path.startsWith('/bai-tap')
      ? 'homework'
      : path.startsWith('/luyen-tap')
      ? 'practice'
      : path === '/shadowing'
      ? 'shadowing'
      : path === '/giao-vien/soan-bai'
      ? 'builder'
      : path.startsWith('/giao-vien')
      ? 'classroom'
      : '';

  const PAGE_TITLES: Record<string, string> = {
    home: 'Tổng quan',
    lesson: 'Bài học',
    flashcard: 'Flashcard',
    homework: 'Bài tập',
    practice: 'Luyện tập',
    shadowing: 'Shadowing',
    leaderboard: 'Bảng xếp hạng',
    builder: 'Soạn bài giảng',
    classroom: 'Quản lý lớp',
  };
  const pageTitle =
    PAGE_TITLES[activeNavId] ||
    (path === '/dang-nhap'
      ? 'Đăng nhập'
      : path === '/chinh-sach-rieng-tu'
      ? 'Chính sách quyền riêng tư'
      : 'Không tìm thấy trang');

  const navHome: NavItem = {
    id: 'home',
    label: 'Tổng quan',
    icon: Home,
    onSelect: () => {
      navigate('/');
      scrollToStudio();
    },
    testId: 'nav-home',
  };
  const navLesson: NavItem = {
    id: 'lesson',
    label: 'Bài học & viết chữ',
    shortLabel: 'Bài học',
    icon: BookOpen,
    onSelect: () => goStudent('/hoc'),
    testId: 'student-tab-lesson',
  };
  const navFlashcard: NavItem = {
    id: 'flashcard',
    label: 'Flashcard',
    icon: Layers,
    onSelect: () => goStudent('/flashcard'),
    testId: 'student-tab-flashcard',
  };
  const navShadowing: NavItem = {
    id: 'shadowing',
    label: 'Shadowing',
    icon: AudioLines,
    onSelect: () => goStudent('/shadowing'),
    testId: 'nav-shadowing',
  };
  const navPractice: NavItem = {
    id: 'practice',
    label: 'Luyện tập',
    shortLabel: 'Luyện tập',
    icon: Puzzle,
    onSelect: () => goStudent('/luyen-tap'),
    testId: 'nav-practice',
  };
  const navHomework: NavItem = {
    id: 'homework',
    label: 'Bài tập được giao',
    shortLabel: 'Bài tập',
    icon: PenTool,
    onSelect: () => goStudent('/bai-tap'),
    testId: 'student-tab-quiz',
  };
  const navLeaderboard: NavItem = {
    id: 'leaderboard',
    label: 'Bảng xếp hạng',
    shortLabel: 'Xếp hạng',
    icon: Trophy,
    onSelect: () => goStudent('/bai-tap/leaderboard'),
    testId: 'nav-leaderboard',
  };
  const navBuilder: NavItem = {
    id: 'builder',
    label: 'Soạn bài giảng',
    shortLabel: 'Soạn bài',
    icon: Presentation,
    onSelect: () => handleQuickSwitchRole('teacher', 'lesson-builder'),
    testId: 'teacher-tab-lesson',
    locked: teacherLocked,
  };
  const navClassroom: NavItem = {
    id: 'classroom',
    label: 'Quản lý lớp',
    shortLabel: 'Lớp học',
    icon: GraduationCap,
    onSelect: () => handleQuickSwitchRole('teacher', 'class-manager'),
    testId: 'teacher-tab-classroom',
    locked: teacherLocked,
    badge: classroomStudentCount,
  };

  const navSections: NavSection[] = [
    { id: 'main', label: '', items: [navHome] },
    { id: 'learn', label: 'Học tập', items: [navLesson, navFlashcard, navShadowing, navPractice, navHomework, navLeaderboard] },
    { id: 'teach', label: 'Giảng dạy', items: [navBuilder, navClassroom] },
  ];

  const tabBarItems: NavItem[] =
    userProfile.role === 'teacher'
      ? [navHome, navBuilder, navClassroom, navLesson, navHomework]
      : [navHome, navLesson, navFlashcard, navShadowing, navHomework];

  const syncLabel = syncStatus === 'syncing'
    ? 'Đang đồng bộ…'
    : syncStatus === 'offline'
    ? 'Ngoại tuyến — sẽ đồng bộ khi có mạng'
    : 'Đã đồng bộ';
  const SyncIcon = syncStatus === 'syncing'
    ? RefreshCw
    : syncStatus === 'offline'
    ? CloudOff
    : Cloud;

  const roleLabel = userProfile.role === 'teacher' ? 'Giáo viên' : 'Học viên';

  const teacherGate = (
    <EmptyState
      testId="teacher-signin-gate"
      icon={<Lock aria-hidden="true" />}
      title="Đăng nhập giáo viên để tiếp tục"
      description="Khu soạn bài và quản lý lớp chỉ dành cho giáo viên. Đăng nhập bằng tài khoản Google đã được cấp quyền giáo viên."
      actionLabel="Đăng nhập giáo viên"
      onAction={() => setAuthModalOpen(true)}
      secondaryActionLabel="Về trang học"
      onSecondaryAction={() => goStudent('/hoc')}
    />
  );

  return (
    <div
      id="top"
      className="min-h-dvh w-full bg-canvas text-ink lg:pl-64"
      data-theme-dark={isDarkTheme ? 'true' : undefined}
    >
      <a
        href="#studio"
        onClick={(e) => {
          e.preventDefault();
          studioSectionRef.current?.focus();
        }}
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus:px-4 focus:py-2 focus:rounded-xl focus:bg-primary focus:text-on-primary focus:text-sm focus:font-semibold focus:shadow-lg"
      >
        Bỏ qua tới nội dung chính
      </a>
      <AppSidebar
        sections={navSections}
        activeId={activeNavId}
        onHome={navHome.onSelect}
        footer={
          <button
            type="button"
            data-testid="header-auth-btn"
            onClick={() => setAuthModalOpen(true)}
            className="w-full flex items-center gap-2.5 rounded-xl px-2 py-2 min-h-11 hover:bg-surface-2 transition-colors text-left cursor-pointer"
            title={`${displayName} — ${roleLabel}${userProfile.classCode ? ` · Lớp ${userProfile.classCode}` : ''}`}
          >
            <Avatar name={userProfile.name} size={32} />
            <span className="min-w-0 flex-1 leading-tight">
              <span className="block text-sm font-semibold text-ink">{displayName}</span>
              <span className="block text-[11px] text-ink-muted mt-0.5 whitespace-nowrap">
                {roleLabel}
                {userProfile.classCode ? ` · Lớp ${userProfile.classCode}` : ''}
              </span>
            </span>
            <LogIn className="w-4 h-4 text-ink-subtle shrink-0" aria-hidden="true" />
          </button>
        }
      />

      <div className="min-w-0 flex flex-col min-h-dvh overflow-x-clip">
        {/* Top bar */}
        <header
          data-testid="floating-glass-dock"
          className="sticky top-0 z-20 h-14 lg:h-16 border-b border-border bg-surface/90 backdrop-blur-md"
        >
          <div className="h-full max-w-[1320px] mx-auto px-4 sm:px-6 flex items-center gap-3">
            <div className="lg:hidden shrink-0">
              <button
                type="button"
                onClick={navHome.onSelect}
                className="min-w-11 min-h-11 inline-grid place-items-center rounded-xl cursor-pointer"
                aria-label="HANU HSK — về trang tổng quan"
              >
                <span className="app-seal">汉</span>
              </button>
            </div>
            <h1 className="flex-1 min-w-0 text-lg lg:text-2xl font-semibold text-ink">
              {pageTitle}
            </h1>

            <PWAInstallButton />

            <button
              type="button"
              onClick={() => appStore.openBinBinAssistant()}
              data-testid="navbar-open-binbin-btn"
              className="inline-flex items-center justify-center gap-2 min-h-11 min-w-11 px-3 rounded-xl border border-border bg-surface hover:bg-surface-2 text-sm font-medium text-ink transition-colors cursor-pointer shrink-0"
              title="Hỏi trợ giảng 彬彬"
            >
              <span aria-hidden="true">🐼</span>
              <span className="hidden sm:inline">Hỏi 彬彬</span>
              <span className="sm:hidden sr-only">Hỏi trợ giảng</span>
            </button>

            {/* Account menu */}
            <div className="relative shrink-0" ref={settingsMenuRef}>
              <button
                type="button"
                data-testid="navbar-settings-menu-btn"
                aria-expanded={settingsMenuOpen}
                aria-haspopup="menu"
                aria-label="Tài khoản, giao diện và tiện ích"
                onClick={() => setSettingsMenuOpen((v) => !v)}
                className="relative inline-flex items-center justify-center min-w-11 min-h-11 rounded-full cursor-pointer ring-offset-2 ring-offset-surface hover:ring-2 hover:ring-border-strong transition-shadow"
              >
                <Avatar name={userProfile.name} size={36} />
                <span
                  aria-hidden="true"
                  className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-surface ${
                    syncStatus === 'offline'
                      ? 'bg-ink-subtle'
                      : syncStatus === 'syncing'
                      ? 'bg-highlight'
                      : 'bg-success'
                  }`}
                />
              </button>

              {settingsMenuOpen && (
                <div
                  data-testid="navbar-settings-dropdown"
                  role="menu"
                  aria-label="Tài khoản và tiện ích"
                  className="absolute right-0 mt-2 w-[300px] max-w-[calc(100vw-24px)] rounded-2xl border border-border bg-surface shadow-xl z-50 animate-pop-in overflow-hidden"
                >
                  <div className="p-4 flex items-center gap-3 border-b border-border">
                    <Avatar name={userProfile.name} size={40} />
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-ink truncate">{displayName}</div>
                      <div className="text-xs text-ink-muted truncate">
                        {userProfile.email ||
                          (userProfile.studentCode ? `Mã học viên ${userProfile.studentCode}` : roleLabel)}
                      </div>
                    </div>
                  </div>

                  <div className="p-4 space-y-4">
                    <div
                      data-testid="navbar-sync-status-badge"
                      className="flex items-center gap-2 text-xs text-ink-muted"
                    >
                      <SyncIcon
                        className={`w-4 h-4 shrink-0 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`}
                        aria-hidden="true"
                      />
                      <span>{syncLabel}</span>
                    </div>

                    <div>
                      <div className="text-xs font-medium text-ink-muted mb-1.5">Vai trò</div>
                      <div
                        className="grid grid-cols-2 p-1 rounded-xl bg-surface-2"
                        role="group"
                        aria-label="Chuyển vai trò"
                      >
                        <button
                          type="button"
                          data-testid="role-switch-student"
                          aria-pressed={userProfile.role === 'student'}
                          onClick={() => {
                            setSettingsMenuOpen(false);
                            handleQuickSwitchRole('student');
                          }}
                          className={`inline-flex items-center justify-center gap-1.5 h-8 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                            userProfile.role === 'student'
                              ? 'bg-surface text-ink shadow-xs'
                              : 'text-ink-muted hover:text-ink'
                          }`}
                        >
                          <Users className="w-4 h-4" aria-hidden="true" />
                          Học viên
                        </button>
                        <button
                          type="button"
                          data-testid="role-switch-teacher"
                          aria-pressed={userProfile.role === 'teacher'}
                          onClick={() => {
                            setSettingsMenuOpen(false);
                            handleQuickSwitchRole('teacher');
                          }}
                          className={`inline-flex items-center justify-center gap-1.5 h-8 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                            userProfile.role === 'teacher'
                              ? 'bg-surface text-ink shadow-xs'
                              : 'text-ink-muted hover:text-ink'
                          }`}
                        >
                          {teacherLocked ? (
                            <Lock className="w-4 h-4" aria-hidden="true" />
                          ) : (
                            <GraduationCap className="w-4 h-4" aria-hidden="true" />
                          )}
                          Giáo viên
                        </button>
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-medium text-ink-muted mb-2">
                        Giao diện · <span className="text-ink">{selectedTheme.name}</span>
                      </div>
                      <ThemePicker
                        themes={TEACHER_THEME_PRESETS}
                        selectedId={selectedTheme.id}
                        onSelect={setSelectedTheme}
                      />
                    </div>
                  </div>

                  <div className="p-1.5 border-t border-border">
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setSettingsMenuOpen(false);
                        setAuthModalOpen(true);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 h-9 rounded-lg hover:bg-surface-2 text-sm text-ink transition-colors cursor-pointer"
                    >
                      <LogIn className="w-4 h-4 text-ink-muted" aria-hidden="true" />
                      Đăng nhập & tài khoản
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      data-testid="navbar-full-backup-btn"
                      onClick={() => {
                        setSettingsMenuOpen(false);
                        exportFullSystemBackupToFile(slides, getStoredStudentRoster());
                      }}
                      className="w-full flex items-center gap-2.5 px-3 h-9 rounded-lg hover:bg-surface-2 text-sm text-ink transition-colors cursor-pointer"
                    >
                      <Download className="w-4 h-4 text-ink-muted" aria-hidden="true" />
                      Tải bản sao lưu (.json)
                    </button>
                  </div>
                  <div className="px-4 py-2.5 border-t border-border flex items-center justify-between gap-2 text-xs text-ink-subtle">
                    <span>HANU × 阮文受 · © 2026</span>
                    <Link
                      to="/chinh-sach-rieng-tu"
                      onClick={() => setSettingsMenuOpen(false)}
                      className="hover:text-ink hover:underline"
                    >
                      Quyền riêng tư
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <main
          ref={studioSectionRef}
          id="studio"
          tabIndex={-1}
          className={`relative flex-1 w-full max-w-[1320px] mx-auto px-4 sm:px-6 pt-5 sm:pt-6 pb-32 lg:pb-16 focus:outline-none ${
            isBinBinDockedOpen ? 'lg:pr-[384px]' : ''
          }`}
        >
        <Routes>
          <Route
            path="/"
            element={
              <HomeDashboard
                userProfile={userProfile}
                slides={slides}
                activeSlideIndex={activeSlideIndex}
                totalVocabBankCount={totalVocabBankCount}
                classroomStudentCount={classroomStudentCount}
                onContinueLesson={() => goStudent('/hoc')}
                onPracticeWriting={(slide) => setWritingModalSlide(slide)}
                onOpenFlashcard={() => goStudent('/flashcard')}
                onOpenHomework={() => goStudent('/bai-tap')}
                onOpenLeaderboard={() => goStudent('/bai-tap/leaderboard')}
                onOpenShadowing={() => goStudent('/shadowing')}
                onOpenLessonBuilder={() => handleQuickSwitchRole('teacher', 'lesson-builder')}
                onOpenClassroom={() => handleQuickSwitchRole('teacher', 'class-manager')}
                onPickSlide={(index) => {
                  setActiveSlideIndex(index);
                  goStudent('/hoc');
                }}
                onToggleLearned={handleToggleLearnedSlide}
              />
            }
          />

          {/* /hoc: Student Stroke Writing & Lesson */}
          <Route
            path="/hoc"
            element={
              <LazyErrorBoundary fallbackLabel="Không thể tải trang Bài học & Luyện viết.">
                <Suspense fallback={<PageSkeleton label="Đang tải bài học…" />}>
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
                    studentStudyMode="writing"
                    onChangeStudentStudyMode={(mode) => {
                      if (mode === 'flashcard') {
                        setStudentTab('flashcard-srs');
                        navigate('/flashcard');
                      } else {
                        setStudentTab('today-lesson');
                        navigate('/hoc');
                      }
                    }}
                    onSwitchToStudentHomework={() => {
                      setStudentTab('quiz-leaderboard');
                      navigate('/bai-tap');
                    }}
                  />
                </Suspense>
              </LazyErrorBoundary>
            }
          />

          {/* /flashcard: Student Flashcard & SRS */}
          <Route
            path="/flashcard"
            element={
              <LazyErrorBoundary fallbackLabel="Không thể tải trang Ôn tập Flashcard SRS.">
                <Suspense fallback={<PageSkeleton label="Đang tải Flashcard…" />}>
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
                    studentStudyMode="flashcard"
                    onChangeStudentStudyMode={(mode) => {
                      if (mode === 'flashcard') {
                        setStudentTab('flashcard-srs');
                        navigate('/flashcard');
                      } else {
                        setStudentTab('today-lesson');
                        navigate('/hoc');
                      }
                    }}
                    onSwitchToStudentHomework={() => {
                      setStudentTab('quiz-leaderboard');
                      navigate('/bai-tap');
                    }}
                  />
                </Suspense>
              </LazyErrorBoundary>
            }
          />

          {/* /bai-tap & /bai-tap/:id: Student Assignment Arena */}
          <Route
            path="/bai-tap"
            element={
              <AssignmentRouteWrapper
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
            }
          />
          <Route
            path="/bai-tap/:id"
            element={
              <AssignmentRouteWrapper
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
            }
          />

          {/* /shadowing: listen-and-repeat practice by HSK level */}
          <Route
            path="/shadowing"
            element={
              <LazyErrorBoundary fallbackLabel="Không thể tải trang Shadowing.">
                <Suspense fallback={<PageSkeleton label="Đang tải Shadowing…" />}>
                  <ShadowingStudio slides={slides} />
                </Suspense>
              </LazyErrorBoundary>
            }
          />

          {/* /luyen-tap: self-practice (not graded for the class) */}
          {['/luyen-tap', '/luyen-tap/:tab'].map((routePath) => (
            <Route
              key={routePath}
              path={routePath}
              element={
                <LazyErrorBoundary fallbackLabel="Không thể tải trang Luyện tập.">
                  <Suspense fallback={<PageSkeleton label="Đang tải Luyện tập…" />}>
                    <PracticeStudio slides={slides} studentName={userProfile.name} />
                  </Suspense>
                </LazyErrorBoundary>
              }
            />
          ))}

          {/* /giao-vien: Redirects to /giao-vien/lop/:classId */}
          <Route
            path="/giao-vien"
            element={<Navigate to={`/giao-vien/lop/${activeClassIdForUrl}`} replace />}
          />

          {/* /giao-vien/soan-bai: Teacher Lesson & Slide Deck Builder */}
          <Route
            path="/giao-vien/soan-bai"
            element={
              teacherLocked ? (
                teacherGate
              ) : (
              <LazyErrorBoundary fallbackLabel="Không thể tải Studio Soạn bài giảng.">
                <Suspense fallback={<PageSkeleton label="Đang tải Studio soạn bài giảng…" />}>
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
                      setUserProfile((prev) => ({ ...prev, role: 'student' }));
                      setStudentTab('quiz-leaderboard');
                      navigate('/bai-tap');
                    }}
                  />
                </Suspense>
              </LazyErrorBoundary>
              )
            }
          />

          {/* /giao-vien/lop/:classId: Teacher Classroom Manager */}
          <Route
            path="/giao-vien/lop/:classId"
            element={
              teacherLocked ? (
                teacherGate
              ) : (
              <LazyErrorBoundary fallbackLabel="Không thể tải Bảng điều khiển Quản lý Lớp học.">
                <Suspense
                  fallback={<PageSkeleton label="Đang tải trang quản lý lớp…" />}
                >
                  <ClassroomManager
                    slides={slides}
                    onStudentCountChange={setClassroomStudentCount}
                    onSwitchToStudentView={() => {
                      setUserProfile((prev) => ({ ...prev, role: 'student' }));
                      setStudentTab('quiz-leaderboard');
                      navigate('/bai-tap');
                    }}
                  />
                </Suspense>
              </LazyErrorBoundary>
              )
            }
          />

          {/* /dang-nhap: Standalone Authentication Route */}
          <Route
            path="/dang-nhap"
            element={
              <Suspense fallback={<PageSkeleton label="Đang mở trang đăng nhập…" />}>
                <AuthModal
                  isOpen={true}
                  standalonePage={true}
                  currentUser={userProfile}
                  onSelectRoleAndLogin={(nextProfile) => {
                    if (nextProfile.role === 'student' && nextProfile.name) {
                      setSelectedStudentName(nextProfile.name);
                    }
                    setUserProfile(nextProfile);
                    if (nextProfile.role === 'teacher') {
                      setTeacherTab('class-manager');
                      navigate(`/giao-vien/lop/${nextProfile.classId || 'lop-cua-toi'}`);
                    } else {
                      setStudentTab('today-lesson');
                      navigate('/hoc');
                    }
                  }}
                  onClose={() => navigate('/')}
                />
              </Suspense>
            }
          />

          {/* /chinh-sach-rieng-tu: Privacy policy (linked from the login dialog) */}
          <Route
            path="/chinh-sach-rieng-tu"
            element={
              <LazyErrorBoundary fallbackLabel="Không tải được trang Chính sách quyền riêng tư.">
                <Suspense
                  fallback={<PageSkeleton />}
                >
                  <PrivacyPolicyPage />
                </Suspense>
              </LazyErrorBoundary>
            }
          />

          {/* 404 Not Found Route */}
          <Route
            path="*"
            element={
              <div
                data-testid="not-found-404-page"
                className="max-w-md mx-auto my-16 text-center"
              >
                <div className="w-12 h-12 mx-auto rounded-2xl bg-accent-soft text-accent grid place-items-center">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <h2 className="mt-5 text-xl font-semibold text-ink">Không tìm thấy trang này</h2>
                <p className="mt-2 text-sm text-ink-muted">
                  Đường dẫn <code className="px-1.5 py-0.5 rounded bg-surface-2 text-ink">{location.pathname}</code> không tồn tại hoặc đã được đổi.
                </p>
                <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                  <Link
                    to="/"
                    data-testid="back-to-study-home-link"
                    className="inline-flex items-center h-10 px-4 rounded-xl bg-primary hover:bg-primary-hover text-on-primary text-sm font-semibold transition-colors"
                  >
                    Về trang tổng quan
                  </Link>
                  <Link
                    to="/hoc"
                    className="inline-flex items-center h-10 px-4 rounded-xl border border-border-strong bg-surface hover:bg-surface-2 text-ink text-sm font-medium transition-colors"
                  >
                    Mở bài học
                  </Link>
                </div>
              </div>
            }
          />
        </Routes>
        </main>
      </div>

      <AppTabBar items={tabBarItems} activeId={activeNavId} />

      {/* Trợ giảng 彬彬 — opened from the top bar */}
      <LazyErrorBoundary compact>
        <Suspense fallback={null}>
          <BinBinPandaAI
            variant="floating"
            activeSlide={slides[activeSlideIndex] || slides[0]}
            onApplyToSlide={handleApplyBinBinSlidePayload}
            hideFloatingTrigger
          />
        </Suspense>
      </LazyErrorBoundary>

      {/* Login & Role Selection Portal Modal (loaded on first open) */}
      {authModalOpen && (
        <Suspense fallback={null}>
          <AuthModal
            isOpen={authModalOpen}
            currentUser={userProfile}
            onSelectRoleAndLogin={(nextProfile) => {
              if (nextProfile.role === 'student' && nextProfile.name) {
                setSelectedStudentName(nextProfile.name);
              }
              setUserProfile(nextProfile);
              setAuthModalOpen(false);
              if (nextProfile.role === 'teacher') {
                setTeacherTab('class-manager');
                navigate(`/giao-vien/lop/${nextProfile.classId || 'lop-cua-toi'}`);
              } else {
                setStudentTab('today-lesson');
                navigate('/hoc');
              }
              scrollToStudio();
            }}
            onClose={() => setAuthModalOpen(false)}
          />
        </Suspense>
      )}

      {/* Optional Full-Screen Hanzi Stroke Order Modal */}
      {writingModalSlide && (
        <LazyErrorBoundary fallbackLabel="Không thể tải bảng Luyện viết chữ Hán.">
          <Suspense fallback={null}>
            <StrokeWritingModal
              slide={writingModalSlide}
              onClose={() => setWritingModalSlide(null)}
              onToggleLearned={handleToggleLearnedSlide}
            />
          </Suspense>
        </LazyErrorBoundary>
      )}

    </div>
  );
}
