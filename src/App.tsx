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
  BookOpen,
  Check,
  Cloud,
  CloudOff,
  Download,
  FlaskConical,
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
import { SlideDeckStudio } from './components/SlideDeckStudio';
import {
  DEFAULT_STUDENTS,
  getStoredStudentRoster,
  STORAGE_KEY_STUDENTS,
} from './components/classroom/classroomRosterData';
import { AuthModal, UserProfile, UserRole } from './components/AuthModal';
import { LazyErrorBoundary } from './components/LazyErrorBoundary';
import { HomeDashboard } from './components/HomeDashboard';
import { appStore, useAppStoreSelector } from './context/AppStoreContext';
import {
  AppSidebar,
  AppTabBar,
  Avatar,
  NavItem,
  NavSection,
  ThemePicker,
} from './components/layout/AppShell';

const StrokeWritingModal = React.lazy(() =>
  import('./components/StrokeWritingModal').then((m) => ({ default: m.StrokeWritingModal }))
);
const StudentAssignmentArena = React.lazy(() =>
  import('./components/StudentAssignmentArena').then((m) => ({
    default: m.StudentAssignmentArena,
  }))
);
const ClassroomManager = React.lazy(() =>
  import('./components/ClassroomManager').then((m) => ({ default: m.ClassroomManager }))
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
  getClassroomDataMode,
  getCurrentSyncStatus,
  getStudentLearnedSlideIds,
  isTeacherSessionUnlocked,
  loadActiveClassroomSession,
  runStorageMigrations,
  saveActiveClassroomSession,
  saveStudentLearnedSlideIds,
  setActiveStudentStorageId,
  setClassroomDataMode,
  setTeacherSessionUnlocked,
  SyncStatus,
} from './utils/storageService';
import { saveStoredAssignment } from './utils/assignmentParser';
import {
  auth,
  onAuthStateChanged,
  saveStudentSrsWordToFirestore,
  saveTeacherDeckToFirestore,
  subscribeToClassroom,
  subscribeToStudentSrs,
} from './firebase';

const STORAGE_KEY_UI_THEME = 'hanu_ui_theme';

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
  const normalizedSection =
    id === 'speedtest' || id === 'kiem-tra'
      ? 'speedtest'
      : id === 'sentence-builder' || id === 'ghep-cau'
      ? 'sentence-builder'
      : id === 'leaderboard' || id === 'xep-hang'
      ? 'leaderboard'
      : id
      ? 'homework'
      : undefined;

  return (
    <LazyErrorBoundary fallbackLabel="Không thể tải khu vực Bài tập HSK.">
      <Suspense
        fallback={
          <div className="p-8 text-center text-sm font-semibold text-ink-muted">
            Đang tải khu vực Bài tập HSK...
          </div>
        }
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
        classCode: activeSession.joinCode || '722229',
        studentCode: activeSession.studentCode,
        isDemo: activeSession.isDemo,
      };
    }
    const roster = getStoredStudentRoster();
    const initialStudent = roster[0]?.name || 'Học viên HSK';
    return {
      role: 'student',
      name: initialStudent,
      classId: 'demo-class-722229',
      classCode: '722229',
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
      if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
        return TEACHER_THEME_PRESETS.find((t) => t.id === 'moon-night') || TEACHER_THEME_PRESETS[0];
      }
    } catch {
      // storage unavailable: fall back to default theme
    }
    return TEACHER_THEME_PRESETS[0];
  });
  const [classroomStudentCount, setClassroomStudentCount] = useState<number>(
    () => getStoredStudentRoster().length
  );
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(() => getCurrentSyncStatus());
  const [isDemoMode, setIsDemoMode] = useState<boolean>(
    () => getClassroomDataMode() === 'demo'
  );

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
        setUserProfile((prev) => ({ ...prev, role: 'teacher' }));
      }
      setTeacherTab('lesson-builder');
    } else if (path.startsWith('/giao-vien/lop/')) {
      if (userProfile.role !== 'teacher') {
        setUserProfile((prev) => ({ ...prev, role: 'teacher' }));
      }
      setTeacherTab('class-manager');
    }
  }, [location.pathname]);

  // Listen to Firebase Auth state changes and active classroom Firestore subscriptions
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => {
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
    return () => unsubAuth();
  }, []);

  // Real-time Firestore listener for active class (slides, assignment, roster/leaderboard)
  useEffect(() => {
    if (isDemoMode) return;
    const activeSession = loadActiveClassroomSession();
    const classId = userProfile.classId || activeSession?.classId;
    if (!classId || classId.startsWith('demo-')) return;

    const unsubClassroom = subscribeToClassroom(
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

    return () => unsubClassroom();
  }, [userProfile.classId, userProfile.role, isDemoMode]);

  // Real-time Firestore listener for personal Student SRS ("users/{uid}/srs/{wordId}")
  useEffect(() => {
    if (isDemoMode || userProfile.role !== 'student') return;
    const uid = auth.currentUser?.uid || userProfile.uid;
    if (!uid || uid.startsWith('demo-')) return;

    const unsubSrs = subscribeToStudentSrs(uid, (srsMap) => {
      const learnedIds = new Set<string>();
      Object.entries(srsMap).forEach(([wordId, data]) => {
        if (data?.learned) {
          learnedIds.add(wordId);
        }
      });
      if (learnedIds.size > 0) {
        const studentKey = userProfile.studentCode || selectedStudentName || uid;
        saveStudentLearnedSlideIds(learnedIds, studentKey);
        setSlides((prev) => applyStudentLearnedToSlides(prev, studentKey));
      }
    });
    return () => unsubSrs();
  }, [userProfile.uid, userProfile.role, isDemoMode]);

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
  const storeClassroomMode = useAppStoreSelector((st) => st.classroomMode);
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
    setIsDemoMode(getClassroomDataMode() === 'demo');
  }, [storeClassroomMode]);

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

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', selectedTheme.id);
    try {
      localStorage.setItem(STORAGE_KEY_UI_THEME, selectedTheme.id);
    } catch {
      // ignore storage errors
    }
  }, [selectedTheme]);

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

  const handleActivateInMemoryDemo = (targetRole: UserRole = 'student') => {
    setClassroomDataMode('demo');
    setIsDemoMode(true);
    try {
      localStorage.setItem(STORAGE_KEY_STUDENTS, JSON.stringify(DEFAULT_STUDENTS));
    } catch {
      // ignore
    }
    setClassroomStudentCount(DEFAULT_STUDENTS.length);
    window.dispatchEvent(
      new CustomEvent('hanu_students_updated', { detail: DEFAULT_STUDENTS.length })
    );
    if (targetRole === 'teacher') {
      setTeacherSessionUnlocked(true);
      const demoTeacher: UserProfile = {
        role: 'teacher',
        name: 'Nguyễn Văn Thụ (阮文受 · Demo)',
        uid: 'demo-teacher',
        classId: 'demo-class-722229',
        classCode: '722229',
        isDemo: true,
      };
      setUserProfile(demoTeacher);
      saveActiveClassroomSession({
        role: 'teacher',
        uid: 'demo-teacher',
        displayName: demoTeacher.name,
        classId: 'demo-class-722229',
        className: 'HSK 1–3 — Lớp Demo (Trong Bộ Nhớ)',
        joinCode: '722229',
        isDemo: true,
      });
      navigate('/giao-vien/lop/demo-class-722229');
    } else {
      const demoStudent = DEFAULT_STUDENTS[0];
      setSelectedStudentName(demoStudent.name);
      const demoProfile: UserProfile = {
        role: 'student',
        name: demoStudent.name,
        uid: 'demo-student-hv001',
        classId: 'demo-class-722229',
        classCode: '722229',
        studentCode: demoStudent.studentCode,
        isDemo: true,
      };
      setUserProfile(demoProfile);
      saveActiveClassroomSession({
        role: 'student',
        uid: 'demo-student-hv001',
        displayName: demoStudent.name,
        classId: 'demo-class-722229',
        className: 'HSK 1–3 — Lớp Demo (Trong Bộ Nhớ)',
        joinCode: '722229',
        studentCode: demoStudent.studentCode,
        isDemo: true,
      });
      navigate('/hoc');
    }
  };

  const applyRoleSwitch = (targetRole: UserRole, desiredTeacherTab?: TeacherTab) => {
    const roster = getStoredStudentRoster();
    const validStudentName = roster.some((s) => s.name === selectedStudentName)
      ? selectedStudentName
      : roster[0]?.name || 'Học viên HSK';
    if (targetRole === 'student' && validStudentName !== selectedStudentName) {
      setSelectedStudentName(validStudentName);
    }
    const nextClassId = userProfile.classId || 'demo-class-722229';
    setUserProfile((prev) => ({
      ...prev,
      role: targetRole,
      name:
        targetRole === 'teacher'
          ? prev.role === 'teacher'
            ? prev.name
            : 'Nguyễn Văn Thụ (阮文受)'
          : validStudentName,
      classCode: prev.classCode || '722229',
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
      if (isTeacherSessionUnlocked() || auth.currentUser || isDemoMode) {
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
        !isDemoMode &&
        userProfile.classId &&
        !userProfile.classId.startsWith('demo-')
      ) {
        void saveTeacherDeckToFirestore(userProfile.classId, allSlides).catch(() => {});
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
      } else {
        learnedIds.delete(slideId);
      }
      saveStudentLearnedSlideIds(learnedIds, studentKey);
      persistCustomSlides(updated);
      if (!isDemoMode && auth.currentUser?.uid && targetSlide) {
        void saveStudentSrsWordToFirestore(auth.currentUser.uid, slideId, {
          slideId,
          hanzi: targetSlide.hanzi,
          pinyin: targetSlide.pinyin,
          meaning: targetSlide.meaning,
          learned: Boolean(targetSlide.learned),
        }).catch(() => {});
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

  // Preload secondary React.lazy modules in the background 1.5s after mount for 0ms tab/modal switching
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void import('./components/StudentAssignmentArena');
      void import('./components/ClassroomManager');
      void import('./components/BinBinPandaAI');
      void import('./components/StrokeWritingModal');
    }, 1500);
    return () => window.clearTimeout(timer);
  }, []);

  const isDarkTheme = selectedTheme.id === 'moon-night';
  const activeClassIdForUrl = userProfile.classId || 'demo-class-722229';
  const displayName = userProfile.name.replace(/\s*\(.*?\)\s*/g, '').trim() || 'Học viên';
  const teacherLocked =
    userProfile.role !== 'teacher' &&
    !isTeacherSessionUnlocked() &&
    !auth.currentUser &&
    !isDemoMode;

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
    leaderboard: 'Bảng xếp hạng',
    builder: 'Soạn bài giảng',
    classroom: 'Quản lý lớp',
  };
  const pageTitle =
    PAGE_TITLES[activeNavId] || (path === '/dang-nhap' ? 'Đăng nhập' : 'Không tìm thấy trang');

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
  const navHomework: NavItem = {
    id: 'homework',
    label: 'Bài tập HSK',
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
    { id: 'learn', label: 'Học tập', items: [navLesson, navFlashcard, navHomework, navLeaderboard] },
    { id: 'teach', label: 'Giảng dạy', items: [navBuilder, navClassroom] },
  ];

  const tabBarItems: NavItem[] =
    userProfile.role === 'teacher'
      ? [navHome, navBuilder, navClassroom, navLesson, navHomework]
      : [navHome, navLesson, navFlashcard, navHomework, navLeaderboard];

  const syncLabel = isDemoMode
    ? 'Bản demo — dữ liệu không được lưu'
    : syncStatus === 'syncing'
    ? 'Đang đồng bộ…'
    : syncStatus === 'offline'
    ? 'Ngoại tuyến — sẽ đồng bộ khi có mạng'
    : 'Đã đồng bộ';
  const SyncIcon = isDemoMode
    ? FlaskConical
    : syncStatus === 'syncing'
    ? RefreshCw
    : syncStatus === 'offline'
    ? CloudOff
    : Cloud;

  const roleLabel = userProfile.role === 'teacher' ? 'Giáo viên' : 'Học viên';

  return (
    <div
      id="top"
      className="min-h-dvh w-full bg-canvas text-ink lg:pl-64"
      data-theme-dark={isDarkTheme ? 'true' : undefined}
    >
      <AppSidebar
        sections={navSections}
        activeId={activeNavId}
        onHome={navHome.onSelect}
        footer={
          <button
            type="button"
            data-testid="header-auth-btn"
            onClick={() => setAuthModalOpen(true)}
            className="w-full flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-surface-2 transition-colors text-left cursor-pointer"
            title="Tài khoản & đăng nhập"
          >
            <Avatar name={userProfile.name} size={36} />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-ink truncate">{displayName}</span>
              <span className="block text-xs text-ink-muted truncate">
                {roleLabel}
                {userProfile.classCode ? ` · Lớp ${userProfile.classCode}` : ''}
              </span>
            </span>
            <LogIn className="w-4 h-4 text-ink-subtle shrink-0" aria-hidden="true" />
          </button>
        }
      />

      <div className="min-w-0 flex flex-col min-h-dvh">
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
                className="app-seal cursor-pointer"
                aria-label="HANU HSK — về trang tổng quan"
              >
                汉
              </button>
            </div>
            <h1 className="flex-1 min-w-0 text-base lg:text-lg font-semibold text-ink truncate">
              {pageTitle}
            </h1>

            {isDemoMode && (
              <span className="hidden sm:inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg bg-highlight/15 text-gold text-xs font-medium">
                <FlaskConical className="w-3.5 h-3.5" aria-hidden="true" />
                Bản demo
              </span>
            )}

            <button
              type="button"
              onClick={() => appStore.openBinBinAssistant()}
              data-testid="navbar-open-binbin-btn"
              className="inline-flex items-center gap-2 h-9 px-3 rounded-xl border border-border bg-surface hover:bg-surface-2 text-sm font-medium text-ink transition-colors cursor-pointer"
              title="Hỏi trợ giảng 彬彬"
            >
              <span aria-hidden="true">🐼</span>
              <span className="hidden sm:inline">Hỏi 彬彬</span>
              <span className="sm:hidden sr-only">Hỏi trợ giảng</span>
            </button>

            {/* Account menu */}
            <div className="relative" ref={settingsMenuRef}>
              <button
                type="button"
                data-testid="navbar-settings-menu-btn"
                aria-expanded={settingsMenuOpen}
                aria-haspopup="menu"
                aria-label="Tài khoản, giao diện và tiện ích"
                onClick={() => setSettingsMenuOpen((v) => !v)}
                className="relative inline-flex items-center rounded-full cursor-pointer ring-offset-2 ring-offset-surface hover:ring-2 hover:ring-border-strong transition-shadow"
              >
                <Avatar name={userProfile.name} size={34} />
                <span
                  aria-hidden="true"
                  className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-surface ${
                    isDemoMode
                      ? 'bg-highlight'
                      : syncStatus === 'offline'
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
                  className="absolute right-0 mt-2 w-[300px] max-w-[calc(100vw-24px)] rounded-2xl border border-border bg-surface shadow-xl z-50 animate-fade-in overflow-hidden"
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
                        className={`w-4 h-4 shrink-0 ${syncStatus === 'syncing' && !isDemoMode ? 'animate-spin' : ''}`}
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
                      data-testid="navbar-view-demo-btn"
                      onClick={() => {
                        setSettingsMenuOpen(false);
                        handleActivateInMemoryDemo(userProfile.role);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 h-9 rounded-lg hover:bg-surface-2 text-sm text-ink transition-colors cursor-pointer"
                    >
                      <FlaskConical className="w-4 h-4 text-ink-muted" aria-hidden="true" />
                      <span className="flex-1 text-left">Dùng thử với dữ liệu mẫu</span>
                      {isDemoMode && <Check className="w-4 h-4 text-primary" aria-hidden="true" />}
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
                  <div className="px-4 py-2.5 border-t border-border text-xs text-ink-subtle">
                    HANU × 阮文受 · HSK 3.0 · © 2026
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <main
          ref={studioSectionRef}
          id="studio"
          className={`relative flex-1 w-full max-w-[1320px] mx-auto px-4 sm:px-6 pt-5 sm:pt-6 pb-28 lg:pb-12 transition-[padding] duration-300 ${
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
                onOpenLessonBuilder={() => handleQuickSwitchRole('teacher', 'lesson-builder')}
                onOpenClassroom={() => handleQuickSwitchRole('teacher', 'class-manager')}
                onPickSlide={(index) => {
                  setActiveSlideIndex(index);
                  goStudent('/hoc');
                }}
              />
            }
          />

          {/* /hoc: Student Stroke Writing & Lesson */}
          <Route
            path="/hoc"
            element={
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
            }
          />

          {/* /flashcard: Student Flashcard & SRS */}
          <Route
            path="/flashcard"
            element={
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

          {/* /giao-vien: Redirects to /giao-vien/lop/:classId */}
          <Route
            path="/giao-vien"
            element={<Navigate to={`/giao-vien/lop/${activeClassIdForUrl}`} replace />}
          />

          {/* /giao-vien/soan-bai: Teacher Lesson & Slide Deck Builder */}
          <Route
            path="/giao-vien/soan-bai"
            element={
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
            }
          />

          {/* /giao-vien/lop/:classId: Teacher Classroom Manager */}
          <Route
            path="/giao-vien/lop/:classId"
            element={
              <LazyErrorBoundary fallbackLabel="Không thể tải Bảng điều khiển Quản lý Lớp học.">
                <Suspense
                  fallback={
                    <div className="p-8 text-center text-sm font-semibold text-ink-muted">
                      Đang tải Bảng điều khiển Quản lý Lớp học...
                    </div>
                  }
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
            }
          />

          {/* /dang-nhap: Standalone Authentication Route */}
          <Route
            path="/dang-nhap"
            element={
              <AuthModal
                isOpen={true}
                standalonePage={true}
                currentUser={userProfile}
                onSelectRoleAndLogin={(nextProfile) => {
                  if (nextProfile.role === 'student' && nextProfile.name) {
                    setSelectedStudentName(nextProfile.name);
                  }
                  setUserProfile(nextProfile);
                  setIsDemoMode(Boolean(nextProfile.isDemo));
                  if (nextProfile.role === 'teacher') {
                    setTeacherTab('class-manager');
                    navigate(`/giao-vien/lop/${nextProfile.classId || 'demo-class-722229'}`);
                  } else {
                    setStudentTab('today-lesson');
                    navigate('/hoc');
                  }
                }}
                onClose={() => navigate('/')}
              />
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

      {/* Login & Role Selection Portal Modal */}
      <AuthModal
        isOpen={authModalOpen}
        currentUser={userProfile}
        onSelectRoleAndLogin={(nextProfile) => {
          if (nextProfile.role === 'student' && nextProfile.name) {
            setSelectedStudentName(nextProfile.name);
          }
          setUserProfile(nextProfile);
          setIsDemoMode(Boolean(nextProfile.isDemo));
          setAuthModalOpen(false);
          if (nextProfile.role === 'teacher') {
            setTeacherTab('class-manager');
            navigate(`/giao-vien/lop/${nextProfile.classId || 'demo-class-722229'}`);
          } else {
            setStudentTab('today-lesson');
            navigate('/hoc');
          }
          scrollToStudio();
        }}
        onClose={() => setAuthModalOpen(false)}
      />

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
