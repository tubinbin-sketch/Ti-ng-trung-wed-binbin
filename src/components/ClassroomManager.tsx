import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  Sparkles,
  UserPlus,
  Send,
  Award,
  UploadCloud,
  FileText,
  Eye,
  FileCode,
  FileType,
  ArrowRight,
  AlertCircle,
  Users,
  Trash2,
  Download,
  Search,
  Plus,
  RefreshCw,
  X,
  Mic,
  Printer,
  Star,
} from 'lucide-react';
import { ClassSession, INITIAL_CLASS_SESSIONS, VocabSlide, INITIAL_VOCAB_SLIDES } from '../data/chineseData';
import {
  autoGradeClassSession,
  awardStudentBonusPoints,
  ClassStudentRecord,
  createStudentRecord,
  filterClassroomStudents,
  generateStudentsCsvContent,
  isStudentNeedsSupport,
  StudentStatusFilter,
} from '../utils/chineseEngine';
import { playGentleChime, speakChinese } from '../utils/speech';
import {
  parseAssignmentContent,
  saveStoredAssignment,
  UploadedAssignmentPackage,
  PRESET_ASSIGNMENT_BUOI_14,
  PRESET_ASSIGNMENT_BUOI_15,
  getStoredAssignment,
} from '../utils/assignmentParser';
import { ClassroomAddStudentModal } from './ClassroomAddStudentModal';
import { ClassroomLuckyWheelModal } from './ClassroomLuckyWheelModal';
import { WorksheetPreviewModal } from './WorksheetPreviewModal';
import {
  ClassroomDataMode,
  fetchRemoteState,
  getClassroomDataMode,
  setClassroomDataMode,
  syncStateToBackend,
} from '../utils/storageService';

export type ClassStudent = ClassStudentRecord;

export const STORAGE_KEY_STUDENTS = 'hanu_classroom_students_roster_v2';

export const DEFAULT_STUDENTS: ClassStudent[] = [
  {
    id: 'st-1',
    studentCode: 'HV-001',
    hskLevel: 'HSK 3',
    name: 'Lưu Thị Minh Thư',
    vocabScore: '18/18 từ',
    writingScore: '96% độ chuẩn nét',
    quizScore: '10/10 câu đúng',
    totalPoints: 98,
    status: 'Đã chấm tự động',
    timeSeconds: 36,
    streak: 12,
    feedback: 'Thuộc toàn bộ từ mới Buổi 13–19, nét chữ 初中 và 换 rất đều đẹp.',
  },
  {
    id: 'st-2',
    studentCode: 'HV-002',
    hskLevel: 'HSK 2',
    name: 'Nguyễn Hoàng Hải Yến',
    vocabScore: '17/18 từ',
    writingScore: '92% độ chuẩn nét',
    quizScore: '9/10 câu đúng',
    totalPoints: 94,
    status: 'Đã chấm tự động',
    timeSeconds: 44,
    streak: 8,
    feedback: 'Nắm vững cấu trúc 挺...的 và 咱们, cần lưu ý nét sổ móc chữ 刻.',
  },
  {
    id: 'st-3',
    studentCode: 'HV-003',
    hskLevel: 'HSK 2',
    name: 'Trần Quốc Bảo',
    vocabScore: '16/18 từ',
    writingScore: '89% độ chuẩn nét',
    quizScore: '9/10 câu đúng',
    totalPoints: 91,
    status: 'Đã chấm tự động',
    timeSeconds: 51,
    streak: 6,
    feedback: 'Hoàn thành đúng hạn, phản xạ ghép câu tiếng Trung rất nhanh.',
  },
  {
    id: 'st-4',
    studentCode: 'HV-004',
    hskLevel: 'HSK 3',
    name: 'Đặng Thanh Trúc',
    vocabScore: '18/18 từ',
    writingScore: '94% độ chuẩn nét',
    quizScore: '10/10 câu đúng',
    totalPoints: 97,
    status: 'Đã chấm tự động',
    timeSeconds: 39,
    streak: 10,
    feedback: 'Phát âm thanh mẫu zh, ch, sh rất chuẩn, bài viết chữ Mễ sạch đẹp.',
  },
  {
    id: 'st-5',
    studentCode: 'HV-005',
    hskLevel: 'HSK 1',
    name: 'Vũ Minh Đức',
    vocabScore: '15/18 từ',
    writingScore: '88% độ chuẩn nét',
    quizScore: '8/10 câu đúng',
    totalPoints: 89,
    status: 'Cần kèm thêm',
    timeSeconds: 58,
    streak: 4,
    feedback: 'Cần phân biệt rõ hơn cách dùng 怎么 vs 怎么样.',
  },
  {
    id: 'st-6',
    studentCode: 'HV-006',
    hskLevel: 'HSK 2',
    name: 'Phạm Quỳnh Nga',
    vocabScore: '17/18 từ',
    writingScore: '91% độ chuẩn nét',
    quizScore: '9/10 câu đúng',
    totalPoints: 93,
    status: 'Đã chấm tự động',
    timeSeconds: 47,
    streak: 7,
    feedback: 'Tự luận đặt câu rất tự nhiên, vận dụng tốt từ vựng 四季.',
  },
  {
    id: 'st-7',
    studentCode: 'HV-007',
    hskLevel: 'HSK 2',
    name: 'Lê Tuấn Kiệt',
    vocabScore: '16/18 từ',
    writingScore: '90% độ chuẩn nét',
    quizScore: '9/10 câu đúng',
    totalPoints: 92,
    status: 'Đã chấm tự động',
    timeSeconds: 49,
    streak: 6,
    feedback: 'Nắm vững trợ từ ngữ khí 呢 và 吧 trong câu hỏi.',
  },
  {
    id: 'st-8',
    studentCode: 'HV-008',
    hskLevel: 'HSK 3',
    name: 'Bùi Phương Linh',
    vocabScore: '18/18 từ',
    writingScore: '95% độ chuẩn nét',
    quizScore: '10/10 câu đúng',
    totalPoints: 98,
    status: 'Đã chấm tự động',
    timeSeconds: 37,
    streak: 11,
    feedback: 'Nét chữ thư pháp rất có hồn, đạt điểm tuyệt đối trắc nghiệm.',
  },
  {
    id: 'st-9',
    studentCode: 'HV-009',
    hskLevel: 'HSK 1',
    name: 'Hoàng Gia Huy',
    vocabScore: '15/18 từ',
    writingScore: '87% độ chuẩn nét',
    quizScore: '8/10 câu đúng',
    totalPoints: 88,
    status: 'Cần kèm thêm',
    timeSeconds: 62,
    streak: 3,
    feedback: 'Tiến bộ nhanh sau khi luyện cùng Trợ Giảng Gấu Trúc · 彬彬.',
  },
  {
    id: 'st-10',
    studentCode: 'HV-010',
    hskLevel: 'HSK 3',
    name: 'Ngô Thùy Trang',
    vocabScore: '17/18 từ',
    writingScore: '93% độ chuẩn nét',
    quizScore: '9/10 câu đúng',
    totalPoints: 95,
    status: 'Đã chấm tự động',
    timeSeconds: 42,
    streak: 9,
    feedback: 'Giao bài tập về nhà đúng hẹn, điểm nghe rất cao.',
  },
  {
    id: 'st-11',
    studentCode: 'HV-011',
    hskLevel: 'HSK 2',
    name: 'Đỗ Anh Khoa',
    vocabScore: '16/18 từ',
    writingScore: '89% độ chuẩn nét',
    quizScore: '9/10 câu đúng',
    totalPoints: 90,
    status: 'Đã chấm tự động',
    timeSeconds: 54,
    streak: 5,
    feedback: 'Phần ghép câu đạt 100%, chú ý thêm lượng từ 个 vs 件.',
  },
  {
    id: 'st-12',
    studentCode: 'HV-012',
    hskLevel: 'HSK 2',
    name: 'Trịnh Mai Phương',
    vocabScore: '17/18 từ',
    writingScore: '92% độ chuẩn nét',
    quizScore: '9/10 câu đúng',
    totalPoints: 93,
    status: 'Đã chấm tự động',
    timeSeconds: 46,
    streak: 7,
    feedback: 'Thái độ học tập chăm chỉ, hoàn thành xuất sắc các bài tập tuần.',
  },
];

export function getStoredStudentRoster(): ClassStudent[] {
  if (typeof window === 'undefined') return DEFAULT_STUDENTS;
  const mode = getClassroomDataMode();
  try {
    const raw = localStorage.getItem(STORAGE_KEY_STUDENTS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        if (parsed.length === 0) {
          return mode === 'new' ? [] : DEFAULT_STUDENTS;
        }
        const normalized: ClassStudent[] = parsed.map((item, idx) => {
          const fallbackDefault = DEFAULT_STUDENTS[idx];
          return {
            ...item,
            name: item.name,
            studentCode:
              item.studentCode || fallbackDefault?.studentCode || `HV-${String(idx + 1).padStart(3, '0')}`,
            hskLevel: item.hskLevel || fallbackDefault?.hskLevel || 'HSK 2',
            timeSeconds:
              typeof item.timeSeconds === 'number' && item.timeSeconds > 0
                ? item.timeSeconds
                : fallbackDefault?.timeSeconds || Math.max(28, 128 - (item.totalPoints || 90)),
            streak:
              typeof item.streak === 'number' && item.streak > 0
                ? item.streak
                : fallbackDefault?.streak || Math.max(3, Math.round((item.totalPoints || 90) / 11)),
            status:
              item.totalPoints < 90
                ? 'Cần kèm thêm'
                : item.status || 'Đã chấm tự động',
          };
        });
        return normalized;
      }
    }
  } catch {
    // Fallback if storage is inaccessible
  }
  return mode === 'new' ? [] : DEFAULT_STUDENTS;
}

interface ClassroomManagerProps {
  onSwitchToStudentView?: () => void;
  onStudentCountChange?: (count: number) => void;
  slides?: VocabSlide[];
}

export const ClassroomManager: React.FC<ClassroomManagerProps> = ({
  onSwitchToStudentView,
  onStudentCountChange,
  slides,
}) => {
  // Load student roster from localStorage to persist added/deleted students across refreshes
  const [studentsList, setStudentsList] = useState<ClassStudent[]>(() =>
    getStoredStudentRoster()
  );
  const [classroomMode, setClassroomModeState] = useState<ClassroomDataMode>(() =>
    getClassroomDataMode()
  );

  const studentCount = studentsList.length;

  const [readingHistory, setReadingHistory] = useState<any[]>(() => {
    try {
      const raw = localStorage.getItem('hanu_student_reading_eval_history_v2');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const [handwritingHistory, setHandwritingHistory] = useState<any[]>(() => {
    try {
      const raw = localStorage.getItem('hanu_student_handwriting_history_v2');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const [isWorksheetModalOpen, setIsWorksheetModalOpen] = useState(false);

  useEffect(() => {
    fetchRemoteState();
    const handleExternalSync = () => {
      setClassroomModeState(getClassroomDataMode());
      setStudentsList(getStoredStudentRoster());
    };
    const handleReadingSync = () => {
      try {
        const raw = localStorage.getItem('hanu_student_reading_eval_history_v2');
        if (raw) setReadingHistory(JSON.parse(raw));
      } catch {
        // ignore
      }
    };
    const handleHandwritingSync = () => {
      try {
        const raw = localStorage.getItem('hanu_student_handwriting_history_v2');
        if (raw) setHandwritingHistory(JSON.parse(raw));
      } catch {
        // ignore
      }
    };
    window.addEventListener('hanu_students_updated', handleExternalSync);
    window.addEventListener('hanu_srs_updated', handleExternalSync);
    window.addEventListener('hanu_remote_state_synced', handleExternalSync);
    window.addEventListener('hanu_classroom_mode_changed', handleExternalSync);
    window.addEventListener('hanu_reading_history_updated', handleReadingSync);
    window.addEventListener('hanu_handwriting_history_updated', handleHandwritingSync);
    return () => {
      window.removeEventListener('hanu_students_updated', handleExternalSync);
      window.removeEventListener('hanu_srs_updated', handleExternalSync);
      window.removeEventListener('hanu_remote_state_synced', handleExternalSync);
      window.removeEventListener('hanu_classroom_mode_changed', handleExternalSync);
      window.removeEventListener('hanu_reading_history_updated', handleReadingSync);
      window.removeEventListener('hanu_handwriting_history_updated', handleHandwritingSync);
    };
  }, []);

  useEffect(() => {
    onStudentCountChange?.(studentCount);
  }, [studentCount, onStudentCountChange]);

  // Initialize with all sessions auto-assigned & auto-graded so the 19/19 KPI cards are synchronized out of the box
  const [sessions, setSessions] = useState<ClassSession[]>(() =>
    INITIAL_CLASS_SESSIONS.map((s) => {
      const graded = autoGradeClassSession(s);
      return {
        ...graded,
        totalStudents: studentCount,
        submissionsCount: studentCount,
      };
    })
  );
  const [activeTab, setActiveTab] = useState<'schedule' | 'grading' | 'analytics'>('schedule');
  const [actionBanner, setActionBanner] = useState<string>(
    'Hoàn tất tự động: Đã giao bài và chấm điểm toàn bộ 19/19 buổi học trong khóa HSK 1–3!'
  );
  const [selectedReportSession, setSelectedReportSession] = useState<ClassSession | null>(null);
  const [studentToDelete, setStudentToDelete] = useState<ClassStudent | null>(null);

  // Add New Student Modal State
  const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false);
  const [modalStudentName, setModalStudentName] = useState('');
  const [modalStudentCode, setModalStudentCode] = useState('');
  const [modalHskLevel, setModalHskLevel] = useState<'HSK 1' | 'HSK 2' | 'HSK 3' | 'HSK 4'>('HSK 2');
  const [modalInitialPoints, setModalInitialPoints] = useState<number>(95);
  const [modalValidationError, setModalValidationError] = useState<string | null>(null);

  // Student Search & Status Filter State
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [studentStatusFilter, setStudentStatusFilter] = useState<StudentStatusFilter>('all');

  // Lucky Wheel & Card Matching Mini-Game State
  const [isLuckyWheelOpen, setIsLuckyWheelOpen] = useState(false);
  const [wheelModeTab, setWheelModeTab] = useState<'wheel' | 'match'>('wheel');
  const [isSpinningWheel, setIsSpinningWheel] = useState(false);
  const [wheelRotation, setWheelRotation] = useState(0);
  const [selectedWheelStudentId, setSelectedWheelStudentId] = useState<string>(() =>
    studentsList[0]?.id || 'st-1'
  );
  const [bonusToastMessage, setBonusToastMessage] = useState<string | null>(null);

  const CLASS_MATCH_PAIRS = useMemo(
    () => [
      { pairId: 'm1', hanzi: '咱们', pinyin: 'zánmen', meaning: 'Chúng ta (gồm người nghe)' },
      { pairId: 'm2', hanzi: '温暖', pinyin: 'wēnnuǎn', meaning: 'Ấm áp, dễ chịu' },
      { pairId: 'm3', hanzi: '换', pinyin: 'huàn', meaning: 'Đổi, trao đổi' },
      { pairId: 'm4', hanzi: '办法', pinyin: 'bànfǎ', meaning: 'Cách làm, biện pháp' },
    ],
    []
  );
  const [selectedMatchCard, setSelectedMatchCard] = useState<{
    pairId: string;
    side: 'hanzi' | 'meaning';
  } | null>(null);
  const [matchedPairIds, setMatchedPairIds] = useState<string[]>([]);

  const filteredStudents = useMemo(
    () =>
      filterClassroomStudents(
        studentsList,
        studentSearchQuery,
        studentStatusFilter
      ),
    [studentsList, studentSearchQuery, studentStatusFilter]
  );

  const completedStudentsCount = useMemo(
    () => filterClassroomStudents(studentsList, '', 'completed').length,
    [studentsList]
  );
  const needsSupportStudentsCount = useMemo(
    () => filterClassroomStudents(studentsList, '', 'needs_support').length,
    [studentsList]
  );

  // File Upload & Assignment Extraction State
  const [selectedSessionNumber, setSelectedSessionNumber] = useState<number>(14);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [customPastedText, setCustomPastedText] = useState('');
  const [showPasteArea, setShowPasteArea] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [activePackage, setActivePackage] = useState<UploadedAssignmentPackage>(() =>
    getStoredAssignment()
  );
  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const priorSessionsCount = 12; // Buổi 1 -> Buổi 12 đã hoàn thành trước đó
  const totalCourseSessions = 19; // Tổng 19 buổi
  const completedCount =
    10 + sessions.filter((s) => s.status === 'completed').length;
  const assignedCount =
    priorSessionsCount + sessions.filter((s) => s.homeworkAssigned).length;
  const gradedCount =
    priorSessionsCount + sessions.filter((s) => s.autoGraded).length;

  const sessionOptions = [
    { num: 14, title: 'Buổi 14 - HSK 1–3: Đón Tết Trung Thu & Luyện Ngữ Pháp Đặt Câu' },
    { num: 15, title: 'Buổi 15 - HSK 1–3: Mua Sắm & Ngữ Pháp Lượng Từ Tiếng Trung' },
    { num: 16, title: 'Buổi 16 - HSK 1–3: Đi Lại, Chỉ Đường & Phương Tiện Giao Thông' },
    { num: 17, title: 'Buổi 17 - HSK 1–3: Thời Tiết & Cảm Xúc Bốn Mùa' },
  ];

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleAssignUploadedFile = () => {
    setIsExtracting(true);
    playGentleChime(587.33, 0.2);

    setTimeout(() => {
      let fileName = selectedFile
        ? selectedFile.name
        : customPastedText.trim()
        ? 'Noi_Dung_De_Bai_Giao_Vien.txt'
        : 'De_On_Tap_Buoi_14_HSK1-3.docx';

      const currentSessionObj =
        sessionOptions.find((s) => s.num === selectedSessionNumber) ||
        sessionOptions[0];

      // Parse assignment questions using AI parser
      const parsedPkg = parseAssignmentContent(
        customPastedText || fileName,
        fileName,
        selectedSessionNumber,
        currentSessionObj.title
      );

      saveStoredAssignment(parsedPkg);
      setActivePackage(parsedPkg);
      setIsExtracting(false);
      setSuccessBanner(
        `✅ Đã trích xuất câu hỏi từ file "${fileName}" và gửi tới toàn bộ học sinh lớp HSK 1–3!`
      );
      playGentleChime(783.99, 0.3);
    }, 600);
  };

  const handleLoadDemoPackage = (pkg: UploadedAssignmentPackage) => {
    setIsExtracting(true);
    playGentleChime(523.25, 0.15);
    setTimeout(() => {
      saveStoredAssignment(pkg);
      setActivePackage(pkg);
      setSelectedSessionNumber(pkg.sessionNumber);
      setIsExtracting(false);
      setSuccessBanner(
        `✅ Đã trích xuất câu hỏi từ file "${pkg.fileName}" và gửi tới toàn bộ học sinh lớp HSK 1–3!`
      );
      playGentleChime(659.25, 0.25);
    }, 400);
  };

  const handleBatchAutoGradeAll = () => {
    playGentleChime(783.99, 0.24);
    setSessions((prev) => prev.map((s) => autoGradeClassSession(s)));
    setActionBanner(
      'Hoàn tất tự động: Đã giao bài và chấm điểm toàn bộ 19/19 buổi học trong khóa HSK 1–3!'
    );
  };

  const persistRosterAndSync = (
    updated: ClassStudent[],
    overrideMode?: ClassroomDataMode
  ) => {
    const targetMode = overrideMode || classroomMode;
    setStudentsList(updated);
    try {
      localStorage.setItem(STORAGE_KEY_STUDENTS, JSON.stringify(updated));
    } catch {
      // ignore storage quota errors
    }
    const nextTotal = updated.length;
    onStudentCountChange?.(nextTotal);
    syncStateToBackend({ roster: updated, classroomMode: targetMode });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('hanu_students_updated', { detail: nextTotal })
      );
    }
    setSessions((prev) =>
      prev.map((s) => ({
        ...s,
        totalStudents: nextTotal,
        submissionsCount: s.autoGraded ? nextTotal : Math.min(s.submissionsCount, nextTotal),
      }))
    );
  };

  const handleActivateDemoClassroom = () => {
    setClassroomDataMode('demo');
    setClassroomModeState('demo');
    persistRosterAndSync(DEFAULT_STUDENTS, 'demo');
    setActionBanner(
      `🧪 Đã bật Chế độ Demo (Dữ liệu mẫu) với ${DEFAULT_STUDENTS.length} học viên mẫu và đồng bộ lên hệ thống.`
    );
    playGentleChime(659.25, 0.2);
  };

  const handleCreateNewClassroom = () => {
    setClassroomDataMode('new');
    setClassroomModeState('new');
    persistRosterAndSync([], 'new');
    setActiveTab('grading');
    setActionBanner(
      '🆕 Đã tạo lớp học mới (0 học viên). Bấm "+ Thêm học viên mới" để cấp Mã học viên (HV-001...) cho lớp thực tế của thầy/cô!'
    );
    playGentleChime(587.33, 0.2);
  };

  const handleOpenAddStudentModal = () => {
    const nextCode = `HV-${String(studentsList.length + 1).padStart(3, '0')}`;
    setModalStudentName('');
    setModalStudentCode(nextCode);
    setModalHskLevel('HSK 2');
    setModalInitialPoints(95);
    setModalValidationError(null);
    setIsAddStudentModalOpen(true);
  };

  const handleRegenerateStudentCode = () => {
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    setModalStudentCode(`HV-${randomSuffix}`);
  };

  const handleSaveModalStudent = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = modalStudentName.trim();
    if (!trimmedName) {
      setModalValidationError('Vui lòng nhập họ và tên học viên.');
      return;
    }

    const newStudent = createStudentRecord(
      {
        name: trimmedName,
        studentCode: modalStudentCode,
        hskLevel: modalHskLevel,
        initialPoints: modalInitialPoints,
      },
      studentsList.length
    );

    const updated = [newStudent, ...studentsList];
    persistRosterAndSync(updated);
    setActiveTab('grading');
    setIsAddStudentModalOpen(false);
    setActionBanner(
      `✅ Đã thêm học viên "${newStudent.name}" (${newStudent.studentCode} · ${newStudent.hskLevel} · ${newStudent.totalPoints}đ) vào đầu danh sách! Sĩ số mới: ${updated.length} học viên.`
    );
    playGentleChime(783.99, 0.25);
  };

  const handleExportCsv = () => {
    const csvContent = generateStudentsCsvContent(studentsList);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Bang_Diem_Lop_HSK_722229_${studentsList.length}HV.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 500);

    setActionBanner(
      `📥 Đã xuất file CSV bảng điểm (${studentsList.length} học viên, chuẩn tiếng Việt UTF-8 có BOM) thành công!`
    );
    playGentleChime(659.25, 0.22);
  };

  const handleDeleteClick = (student: ClassStudent, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setStudentToDelete(student);
  };

  const handleConfirmDelete = () => {
    if (!studentToDelete) return;
    const removedName = studentToDelete.name;
    const updated = studentsList.filter((s) => s.id !== studentToDelete.id);
    if (updated.length === 0) {
      setClassroomDataMode('new');
      setClassroomModeState('new');
      persistRosterAndSync([], 'new');
    } else {
      persistRosterAndSync(updated);
    }
    setActionBanner(
      `Đã xóa học viên "${removedName}" khỏi lớp HSK 1–3 (Sĩ số mới: ${updated.length} học viên). Dữ liệu đã lưu vĩnh viễn.`
    );
    setStudentToDelete(null);
    playGentleChime(440, 0.2);
  };

  const handleRestoreDefaultStudents = () => {
    handleActivateDemoClassroom();
  };

  const selectedWheelStudent = useMemo(
    () =>
      studentsList.find((s) => s.id === selectedWheelStudentId) ||
      studentsList[0] ||
      null,
    [studentsList, selectedWheelStudentId]
  );

  const handleSpinWheel = () => {
    if (studentsList.length === 0 || isSpinningWheel) return;
    setIsSpinningWheel(true);
    setBonusToastMessage(null);
    const randomIndex = Math.floor(Math.random() * studentsList.length);
    const chosen = studentsList[randomIndex];
    const extraSpins = 360 * 3 + Math.floor(Math.random() * 360);
    setWheelRotation((prev) => prev + extraSpins);
    playGentleChime(587.33, 0.18);

    setTimeout(() => {
      setSelectedWheelStudentId(chosen.id);
      setIsSpinningWheel(false);
      playGentleChime(783.99, 0.25);
    }, 650);
  };

  const handleAwardBonusPoints = (
    studentId: string,
    bonusPoints: number,
    reason: string
  ) => {
    const target = studentsList.find((s) => s.id === studentId);
    if (!target) return;
    const updated = awardStudentBonusPoints(
      studentsList,
      studentId,
      bonusPoints,
      reason
    );
    persistRosterAndSync(updated);
    const updatedStudent = updated.find((s) => s.id === studentId);
    const msg = `🎉 Đã cộng +${bonusPoints} điểm cho học viên "${target.name}" (${reason})! Điểm tổng kết mới: ${updatedStudent?.totalPoints ?? target.totalPoints}đ.`;
    setBonusToastMessage(msg);
    setActionBanner(msg);
    playGentleChime(880, 0.25);
  };

  const handleSelectMatchCard = (pairId: string, side: 'hanzi' | 'meaning', hanziText?: string) => {
    if (matchedPairIds.includes(pairId)) return;
    if (hanziText) {
      speakChinese(hanziText, 0.92);
    }
    if (!selectedMatchCard) {
      setSelectedMatchCard({ pairId, side });
      return;
    }
    if (selectedMatchCard.pairId === pairId && selectedMatchCard.side === side) {
      setSelectedMatchCard(null);
      return;
    }
    if (selectedMatchCard.pairId === pairId && selectedMatchCard.side !== side) {
      const nextMatched = [...matchedPairIds, pairId];
      setMatchedPairIds(nextMatched);
      setSelectedMatchCard(null);
      playGentleChime(783.99, 0.2);
      if (nextMatched.length === CLASS_MATCH_PAIRS.length && selectedWheelStudent) {
        setBonusToastMessage(
          `🏆 Tuyệt vời! "${selectedWheelStudent.name}" đã ghép đúng toàn bộ ${CLASS_MATCH_PAIRS.length}/${CLASS_MATCH_PAIRS.length} cặp thẻ. Bấm "+10 điểm thưởng" để ghi vào Sổ điểm!`
        );
      }
    } else {
      setSelectedMatchCard({ pairId, side });
      playGentleChime(392, 0.15);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-[rgba(255,255,255,0.45)] backdrop-blur-md border border-[rgba(30,50,39,0.15)] text-[#1E3227] p-5 md:p-7 shadow-xs space-y-6">
        {/* Top Class Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-[rgba(30,50,39,0.15)]">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-[#9B8A3E] uppercase tracking-wider">
              <span>Quản lý lớp học · Tự động hóa giảng dạy</span>
              <span>·</span>
              <span className="px-2 py-0.5 rounded-full bg-[#1E3227]/10 text-[#1E3227] text-xs font-semibold">
                Mã: 722229
              </span>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-[#1E3227] mt-1">
              HSK 1–3 — Lớp Tối 246 (19:30–21:00)
            </h3>
            <p className="text-xs text-[#3F5447] mt-1">
              Lịch học: Thứ 2, Thứ 4, Thứ 6 · Tiến độ:{' '}
              <strong className="text-[#1E3227] tabular-nums">
                {completedCount}/{totalCourseSessions} buổi
              </strong>{' '}
              · Giảng viên phụ trách: GV Nguyễn Văn Thụ (阮文受)
            </p>
          </div>

          {/* 1-Click Batch Automation, Demo Mode vs New Class Mode & CSV/Report Export Buttons */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleActivateDemoClassroom}
              data-testid="activate-demo-classroom-btn"
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                classroomMode === 'demo' && studentsList.length > 0
                  ? 'bg-[#0F5243] text-[#FAF7F0] border-[#0F5243] shadow-2xs'
                  : 'bg-[#FAFBF7] hover:bg-[#E7ECD9] text-[#1E3227] border-[#9B8A3E]/60'
              }`}
              title="Nạp bộ dữ liệu mẫu 12 học viên để trải nghiệm thử"
            >
              <span>🧪 Chế độ Demo (Dữ liệu mẫu)</span>
            </button>
            <button
              type="button"
              onClick={handleCreateNewClassroom}
              data-testid="create-new-classroom-btn"
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                classroomMode === 'new' && studentsList.length === 0
                  ? 'bg-[#B8292F] text-white border-[#B8292F] shadow-2xs'
                  : 'bg-[#FAFBF7] hover:bg-[#E7ECD9] text-[#1E3227] border-[#9B8A3E]/60'
              }`}
              title="Khởi tạo lớp học trống mới để thêm học viên thực tế"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tạo lớp học mới</span>
            </button>
            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#FAFBF7] hover:bg-[#E7ECD9] text-[#1E3227] border border-[#9B8A3E]/60 text-xs font-bold transition-all whitespace-nowrap shadow-2xs cursor-pointer"
              data-testid="header-export-csv-report-btn"
            >
              <Download className="w-3.5 h-3.5 text-[#9B8A3E]" />
              <span>📊 Xuất Bảng Điểm CSV</span>
            </button>
            <button
              type="button"
              onClick={handleBatchAutoGradeAll}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#1E3227] hover:bg-[#2B4637] text-[#FAFBF7] border border-[#9B8A3E]/50 text-xs font-bold transition-all whitespace-nowrap shadow-sm cursor-pointer"
              data-testid="batch-autograde-btn"
            >
              <Sparkles className="w-4 h-4 text-[#C5B358]" />
              <span>Giao &amp; Tự chấm toàn khóa</span>
            </button>
          </div>
        </div>

        {/* 4 Synchronized KPI Stat Boxes: 19 | 19/19 | 19/19 | 12 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="rounded-xl bg-[#FAFBF7] border border-[rgba(30,50,39,0.15)] p-3.5 flex flex-col justify-between shadow-2xs">
            <div className="flex items-center justify-between text-xs font-semibold text-[#3F5447]">
              <span>Tổng số buổi</span>
              <Calendar className="w-3.5 h-3.5 text-[#9B8A3E]" />
            </div>
            <div className="text-xl sm:text-2xl font-bold text-[#1E3227] mt-1 tabular-nums">
              {totalCourseSessions}
            </div>
            <div className="text-xs text-[#3F5447]/80 mt-0.5 truncate">Khóa chuẩn HSK 1–3</div>
          </div>

          <div className="rounded-xl bg-[#FAFBF7] border border-[rgba(30,50,39,0.15)] p-3.5 flex flex-col justify-between shadow-2xs">
            <div className="flex items-center justify-between text-xs font-semibold text-[#3F5447]">
              <span>Đã giao bài</span>
              <Send className="w-3.5 h-3.5 text-[#1E3227]" />
            </div>
            <div
              className="text-xl sm:text-2xl font-bold text-[#1E3227] mt-1 tabular-nums"
              data-testid="assigned-sessions-count"
            >
              {assignedCount}/{totalCourseSessions}
            </div>
            <div className="text-xs text-[#1E3227] font-semibold mt-0.5 truncate">
              Kèm Slide &amp; Đề chuẩn
            </div>
          </div>

          <div className="rounded-xl bg-[#FAFBF7] border border-[rgba(30,50,39,0.15)] p-3.5 flex flex-col justify-between shadow-2xs">
            <div className="flex items-center justify-between text-xs font-semibold text-[#3F5447]">
              <span>Đã tự chấm điểm</span>
              <Sparkles className="w-3.5 h-3.5 text-[#9B8A3E]" />
            </div>
            <div
              className="text-xl sm:text-2xl font-bold text-[#9B8A3E] mt-1 tabular-nums"
              data-testid="graded-sessions-count"
            >
              {gradedCount}/{totalCourseSessions}
            </div>
            <div className="text-xs text-[#9B8A3E] font-semibold mt-0.5 truncate">
              100% học viên đã chấm
            </div>
          </div>

          <div className="rounded-xl bg-[#FAFBF7] border border-[rgba(30,50,39,0.15)] p-3.5 flex flex-col justify-between shadow-2xs">
            <div className="flex items-center justify-between text-xs font-semibold text-[#3F5447]">
              <span>Sĩ số học viên</span>
              <Award className="w-3.5 h-3.5 text-[#1E3227]" />
            </div>
            <div className="text-xl sm:text-2xl font-bold text-[#1E3227] mt-1 tabular-nums">
              {studentCount}
            </div>
            <div className="text-xs text-[#3F5447]/80 mt-0.5 truncate">Đầy đủ tài khoản</div>
          </div>
        </div>

        {/* =======================================================================
            COMPACT ACTION CARD: 📤 GIAO BÀI TẬP NHANH (TỰ ĐỘNG BÓC ĐỀ) - 1 HÀNG NGANG
            ======================================================================= */}
        <div className="rounded-2xl bg-[#FAFBF7] border border-[#9B8A3E]/45 p-4 shadow-sm space-y-3">
          {/* Header Row: Title on Left, 2 Preset Buttons + Paste Toggle on Right */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2.5 border-b border-[#9B8A3E]/20">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#1E3227] text-white flex items-center justify-center shrink-0 shadow-2xs">
                <UploadCloud className="w-4 h-4 text-[#C5B358]" />
              </div>
              <h4 className="text-sm font-bold text-[#1E3227] flex items-center gap-1.5">
                <span>📤 Giao Bài Tập Nhanh (Tự Động Bóc Đề)</span>
              </h4>
            </div>

            {/* Quick Presets & Paste Toggle */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleLoadDemoPackage(PRESET_ASSIGNMENT_BUOI_14)}
                className="px-2.5 py-1 rounded-lg bg-white border border-[#9B8A3E]/40 hover:border-[#1E3227] text-xs font-bold text-[#1E3227] transition-all flex items-center gap-1 shadow-2xs"
              >
                <FileType className="w-3.5 h-3.5 text-[#9B8A3E]" />
                <span>⚡ Đề mẫu Buổi 14</span>
              </button>
              <button
                type="button"
                onClick={() => handleLoadDemoPackage(PRESET_ASSIGNMENT_BUOI_15)}
                className="px-2.5 py-1 rounded-lg bg-white border border-[#9B8A3E]/40 hover:border-[#1E3227] text-xs font-bold text-[#1E3227] transition-all flex items-center gap-1 shadow-2xs"
              >
                <FileCode className="w-3.5 h-3.5 text-[#9B8A3E]" />
                <span>⚡ Đề mẫu Buổi 15</span>
              </button>
              <button
                type="button"
                onClick={() => setShowPasteArea((v) => !v)}
                className={`px-2.5 py-1 rounded-lg border text-xs font-bold transition-all flex items-center gap-1 shadow-2xs ${
                  showPasteArea
                    ? 'bg-[#1E3227] text-white border-[#1E3227]'
                    : 'bg-white border-[rgba(30,50,39,0.2)] text-[#3F5447] hover:text-[#1E3227]'
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-[#9B8A3E]" />
                <span>📝 Dán văn bản</span>
              </button>
            </div>
          </div>

          {/* 12-Column Grid on Single Horizontal Row */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-center">
            {/* Col 1 (4 cols): Dropdown chọn Buổi học */}
            <div className="md:col-span-4">
              <select
                value={selectedSessionNumber}
                onChange={(e) => setSelectedSessionNumber(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-white border border-[rgba(30,50,39,0.2)] text-xs text-[#1E3227] font-semibold focus:outline-none focus:border-[#9B8A3E]"
              >
                {sessionOptions.map((opt) => (
                  <option key={opt.num} value={opt.num}>
                    {opt.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Col 2 (5 cols): Khung chọn/kéo thả file dạng thanh ngang mỏng */}
            <div className="md:col-span-5">
              <input
                ref={fileInputRef}
                type="file"
                accept=".docx,.doc,.pdf,.txt,.csv"
                onChange={handleFileInputChange}
                className="hidden"
                id="assignment-file-upload-input"
              />

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleFileDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`cursor-pointer rounded-xl border border-dashed py-2 px-3 flex items-center justify-between gap-2 transition-all ${
                  isDragging
                    ? 'border-[#9B8A3E] bg-[#E7ECD9]'
                    : selectedFile
                    ? 'border-[#1E3227] bg-[#E7ECD9]/60'
                    : 'border-[rgba(30,50,39,0.25)] hover:border-[#9B8A3E] bg-white'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="w-4 h-4 text-[#9B8A3E] shrink-0" />
                  <span className="text-xs font-medium text-[#1E3227] truncate">
                    {selectedFile
                      ? `${selectedFile.name} · ${(selectedFile.size / 1024).toFixed(1)} KB`
                      : activePackage.fileName
                      ? `${activePackage.fileName} · ${
                          activePackage.multipleChoiceList.length +
                          activePackage.sentenceOrderingList.length +
                          activePackage.essayList.length
                        } câu`
                      : 'Chọn file hoặc kéo thả đề (.docx, .pdf, .txt)'}
                  </span>
                </div>

                <span className="px-2 py-0.5 rounded-lg bg-[#1E3227]/10 hover:bg-[#1E3227]/20 text-[#1E3227] text-xs font-bold whitespace-nowrap shrink-0 transition-colors">
                  {selectedFile ? 'Đổi file' : 'Duyệt file'}
                </span>
              </div>
            </div>

            {/* Col 3 (3 cols): Nút chính ✨ Giao bài ngay */}
            <div className="md:col-span-3">
              <button
                type="button"
                disabled={isExtracting}
                onClick={handleAssignUploadedFile}
                className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3.5 rounded-xl bg-[#1E3227] hover:bg-[#2B4637] text-white text-xs font-bold transition-all shadow-sm whitespace-nowrap disabled:opacity-75"
              >
                {isExtracting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
                    <span className="truncate">Đang phân tích đề...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-[#C5B358] shrink-0" />
                    <span>✨ Giao bài ngay</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Conditional Direct Text Paste Area */}
          {showPasteArea && (
            <div className="pt-2 border-t border-[rgba(30,50,39,0.1)] space-y-1.5">
              <div className="flex items-center justify-between text-xs font-semibold text-[#1E3227]">
                <span>Dán trực tiếp câu hỏi trắc nghiệm, ghép câu hoặc tự luận tiếng Trung:</span>
                <button
                  type="button"
                  onClick={() => setShowPasteArea(false)}
                  className="text-xs text-[#3F5447] hover:underline"
                >
                  Đóng
                </button>
              </div>
              <textarea
                rows={2}
                value={customPastedText}
                onChange={(e) => setCustomPastedText(e.target.value)}
                placeholder="Dán câu hỏi trắc nghiệm, bài tập điền từ hoặc tự luận tiếng Trung vào đây..."
                className="w-full p-2.5 rounded-xl bg-white border border-[rgba(30,50,39,0.2)] text-xs text-[#1E3227] placeholder:text-[#3F5447]/50 focus:outline-none focus:border-[#9B8A3E]"
              />
            </div>
          )}

          {/* Compact Success Confirmation Toast & Student Preview Button */}
          {successBanner && (
            <div className="p-2.5 rounded-xl bg-[#E7ECD9] border border-[#1E3227]/30 text-xs text-[#1E3227] flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs">
              <div className="flex items-center gap-2 min-w-0">
                <CheckCircle2 className="w-4 h-4 text-[#1E3227] shrink-0" />
                <div className="truncate">
                  <span className="font-bold text-[#1E3227]">{successBanner}</span>
                  <span className="text-xs text-[#3F5447] hidden sm:inline ml-1">
                    · Học sinh nhận đề &amp; hệ thống tự chấm 100 điểm
                  </span>
                </div>
              </div>

              {onSwitchToStudentView && (
                <button
                  type="button"
                  onClick={onSwitchToStudentView}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-lg bg-[#1E3227] hover:bg-[#2B4637] text-white text-xs font-bold transition-all shrink-0 shadow-2xs whitespace-nowrap"
                >
                  <Eye className="w-3.5 h-3.5 text-[#C5B358]" />
                  <span>👁️ Xem góc nhìn Học sinh</span>
                  <ArrowRight className="w-3 h-3 text-white/70" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Sub-navigation Tabs & Classroom Action Toolbar */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab('schedule')}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
                  activeTab === 'schedule'
                    ? 'bg-[#1E3227] text-[#FAFBF7] shadow-2xs'
                    : 'bg-[#FAFBF7] text-[#3F5447] border border-[rgba(30,50,39,0.15)] hover:text-[#1E3227]'
                }`}
              >
                <Calendar className="w-3.5 h-3.5 text-[#C5B358]" />
                Chương trình và tiến độ
              </button>
              <button
                type="button"
                data-testid="tab-student-grading"
                onClick={() => setActiveTab('grading')}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
                  activeTab === 'grading'
                    ? 'bg-[#1E3227] text-[#FAFBF7] shadow-2xs'
                    : 'bg-[#FAFBF7] text-[#3F5447] border border-[rgba(30,50,39,0.15)] hover:text-[#1E3227]'
                }`}
              >
                <Award className="w-3.5 h-3.5 text-[#C5B358]" />
                Bảng điểm tự động học viên ({studentCount})
              </button>
              <button
                type="button"
                data-testid="tab-reading-writing-analytics"
                onClick={() => setActiveTab('analytics')}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
                  activeTab === 'analytics'
                    ? 'bg-[#1E3227] text-[#FAFBF7] shadow-2xs'
                    : 'bg-[#FAFBF7] text-[#3F5447] border border-[rgba(30,50,39,0.15)] hover:text-[#1E3227]'
                }`}
              >
                <Mic className="w-3.5 h-3.5 text-[#C5B358]" />
                Luyện Đọc &amp; Viết chữ ({readingHistory.length + handwritingHistory.length})
              </button>
            </div>

            {/* Action Buttons: 🎡 Vòng quay & Ghép thẻ, + Thêm học viên mới & 📥 Xuất bảng điểm CSV */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                data-testid="open-lucky-wheel-btn"
                onClick={() => {
                  if (studentsList.length > 0 && !selectedWheelStudentId) {
                    setSelectedWheelStudentId(studentsList[0].id);
                  }
                  setBonusToastMessage(null);
                  setIsLuckyWheelOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-[#1E3227] border border-[#9B8A3E] text-xs font-bold transition-all shadow-2xs whitespace-nowrap cursor-pointer"
              >
                <span>🎡 Gọi tên ngẫu nhiên (Lucky Wheel) &amp; Ghép Thẻ</span>
              </button>

              <button
                type="button"
                data-testid="open-add-student-modal-btn"
                onClick={handleOpenAddStudentModal}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#1E3227] hover:bg-[#2B4637] text-[#FAFBF7] border border-[#9B8A3E]/50 text-xs font-bold transition-all shadow-xs whitespace-nowrap cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-[#C5B358]" />
                <span>+ Thêm học viên mới</span>
              </button>

              <button
                type="button"
                data-testid="export-students-csv-btn"
                onClick={handleExportCsv}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#FAFBF7] hover:bg-[#E7ECD9] text-[#1E3227] border border-[#9B8A3E]/60 text-xs font-bold transition-all shadow-2xs whitespace-nowrap cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-[#9B8A3E]" />
                <span>📊 Xuất Bảng Điểm CSV/In Báo Cáo</span>
              </button>

              <button
                type="button"
                data-testid="classroom-print-worksheet-btn"
                onClick={() => setIsWorksheetModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-[#E7ECD9] text-[#1E3227] border border-[#9B8A3E]/60 text-xs font-bold transition-all shadow-2xs whitespace-nowrap cursor-pointer"
                title="In phiếu luyện viết chữ Hán A4 (PDF) cả lớp"
              >
                <Printer className="w-3.5 h-3.5 text-[#9B8A3E]" />
                <span>🖨️ In Phiếu Viết A4 (PDF)</span>
              </button>
            </div>
          </div>

          {/* Search & Status Filter Bar (Always accessible on the Classroom Toolbar) */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 p-2.5 rounded-2xl bg-[#FAFBF7] border border-[rgba(30,50,39,0.14)]">
            <div className="relative flex-1 min-w-0">
              <Search className="w-3.5 h-3.5 text-[#5F7266] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                data-testid="student-search-input"
                aria-label="Tìm kiếm học viên theo tên hoặc mã học viên"
                value={studentSearchQuery}
                onChange={(e) => {
                  setStudentSearchQuery(e.target.value);
                  if (activeTab !== 'grading') setActiveTab('grading');
                }}
                placeholder="Tìm kiếm học viên theo tên, mã HV hoặc cấp độ HSK..."
                className="w-full pl-8 pr-8 py-1.5 rounded-xl bg-white border border-[rgba(30,50,39,0.15)] text-xs text-[#1E3227] placeholder-[#5F7266] focus:outline-none focus:border-[#9B8A3E]"
              />
              {studentSearchQuery && (
                <button
                  type="button"
                  aria-label="Xóa từ khóa tìm kiếm"
                  onClick={() => setStudentSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#5F7266] hover:text-[#1E3227] text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            <div
              className="flex flex-wrap items-center gap-1.5 shrink-0"
              role="group"
              aria-label="Bộ lọc trạng thái học viên"
            >
              {(
                [
                  { id: 'all', label: `Tất cả (${studentCount})` },
                  { id: 'completed', label: `Đã hoàn thành (${completedStudentsCount})` },
                  { id: 'needs_support', label: `Cần kèm thêm (${needsSupportStudentsCount})` },
                ] as { id: StudentStatusFilter; label: string }[]
              ).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  data-testid={`student-filter-${f.id}`}
                  onClick={() => {
                    setStudentStatusFilter(f.id);
                    if (activeTab !== 'grading') setActiveTab('grading');
                  }}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    studentStatusFilter === f.id
                      ? 'bg-[#1E3227] text-[#FAFBF7] shadow-2xs'
                      : 'bg-white text-[#3F5447] border border-[rgba(30,50,39,0.15)] hover:border-[#9B8A3E] hover:text-[#1E3227]'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Live Status Banner */}
        <div
          className="px-3.5 py-2 rounded-xl bg-[#FAFBF7] border border-[#9B8A3E]/45 text-xs font-medium text-[#1E3227] flex items-center gap-2"
          data-testid="classroom-status-banner"
        >
          <CheckCircle2 className="w-4 h-4 text-[#9B8A3E] shrink-0" />
          <span className="truncate">{actionBanner}</span>
        </div>

        {activeTab === 'schedule' ? (
          /* Optimized Compact Curriculum Table with pb-24 for Mascot clearance */
          <div className="overflow-x-auto rounded-2xl border border-[rgba(30,50,39,0.15)] bg-[#FAFBF7] pb-24">
            <table className="w-full table-auto text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[rgba(30,50,39,0.12)] bg-[#F4F6EE] text-[#3F5447]">
                  <th className="py-2.5 px-3 font-semibold w-14">Buổi</th>
                  <th className="py-2.5 px-3 font-semibold w-28">Ngày học</th>
                  <th className="py-2.5 px-3 font-semibold">Tên bài giảng (Việt · Trung)</th>
                  <th className="py-2.5 px-3 font-semibold hidden sm:table-cell">Người dạy</th>
                  <th className="py-2.5 px-3 font-semibold">Giáo án</th>
                  <th className="py-2.5 px-3 font-semibold">Trạng thái chấm bài</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Thao tác tự động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E9DC]">
                {sessions.map((session) => (
                  <tr key={session.id} className="hover:bg-[#FAFBF7] transition-colors">
                    <td className="py-2.5 px-3 font-bold text-[#1E3227] tabular-nums whitespace-nowrap">
                      #{session.sessionNumber}
                    </td>
                    <td className="py-2.5 px-3 text-[#3F5447] whitespace-nowrap tabular-nums">
                      {session.dateLabel}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-[#1E3227]">
                        {session.lessonTitle}
                      </div>
                      <div className="font-['Noto_Sans_SC'] text-xs text-[#6B7280]">
                        {session.chineseTitle}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-[#3F5447] hidden sm:table-cell">
                      {session.instructor}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-bold bg-[#E7ECD9] text-[#1E3227]">
                        <CheckCircle2 className="w-3 h-3 text-[#1E3227]" />
                        {session.slideCount} Slide
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <button
                        type="button"
                        onClick={() => setSelectedReportSession(session)}
                        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-bold bg-[#FAFBF7] hover:bg-[#E7ECD9] border border-[#9B8A3E]/40 text-[#9B8A3E] hover:text-[#1E3227] transition-all cursor-pointer shadow-2xs"
                        title="Bấm để xem báo cáo chi tiết bài làm cả lớp"
                      >
                        <Sparkles className="w-3 h-3 text-[#9B8A3E]" />
                        {session.submissionsCount}/{session.totalStudents} bài đã chấm
                      </button>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="inline-flex items-center gap-1.5 justify-end">
                        <button
                          type="button"
                          onClick={() => setSelectedReportSession(session)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white hover:bg-[#E7ECD9] text-[#1E3227] border border-[rgba(30,50,39,0.2)] text-xs font-semibold transition-all shadow-2xs whitespace-nowrap"
                          title="Xem chi tiết bài làm cả lớp"
                        >
                          <FileText className="w-3 h-3 text-[#9B8A3E]" />
                          <span>Chi tiết</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            playGentleChime(659.25, 0.2);
                            setSessions((prev) =>
                              prev.map((s) =>
                                s.id === session.id ? autoGradeClassSession(s) : s
                              )
                            );
                            setActionBanner(
                              `Đã chấm điểm tự động và cập nhật bảng điểm cho Buổi #${session.sessionNumber}: "${session.lessonTitle}".`
                            );
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#1E3227] hover:bg-[#2B4637] text-white text-xs font-bold transition-all shadow-2xs whitespace-nowrap"
                        >
                          <Sparkles className="w-3 h-3 text-[#C5B358]" />
                          <span>Chấm lại</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : activeTab === 'grading' ? (
          /* Detailed Student Auto-Grading Matrix (Dynamic from filteredStudents) */
          <div className="rounded-2xl border border-[#D5DEC7] bg-white p-5 pb-20">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-[#E5E9DC]">
              <div>
                <h4 className="text-sm font-bold text-[#1E3227]">
                  Kết quả tự động chấm bài tập về nhà (HSK 1–3) — Hiển thị: {filteredStudents.length}/{studentsList.length} học viên
                </h4>
                <p className="text-xs text-[#5F7266] mt-0.5">
                  Bấm "+ Thêm học viên mới" để bổ sung vào đầu danh sách hoặc "📥 Xuất bảng điểm CSV" để tải về máy.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#065F46] font-bold bg-[#065F46]/10 px-2.5 py-1 rounded-lg">
                  100% Đã chấm tự động
                </span>
                {studentsList.length < DEFAULT_STUDENTS.length && (
                  <button
                    type="button"
                    onClick={handleRestoreDefaultStudents}
                    className="text-xs text-[#9B8A3E] hover:text-[#1E3227] font-semibold underline underline-offset-2 transition-colors cursor-pointer"
                  >
                    Khôi phục {DEFAULT_STUDENTS.length} học viên ban đầu
                  </button>
                )}
              </div>
            </div>

            {filteredStudents.length === 0 ? (
              <div className="text-center py-10 px-4 rounded-xl bg-[#FAFBF7] border border-dashed border-[#C5B358]">
                <Users className="w-10 h-10 text-[#9B8A3E] mx-auto mb-2 opacity-60" />
                <p className="text-sm font-bold text-[#1E3227]">
                  {studentsList.length === 0
                    ? 'Chưa có học viên nào trong lớp'
                    : 'Không tìm thấy học viên phù hợp với bộ lọc'}
                </p>
                <p className="text-xs text-[#5F7266] mt-1 max-w-sm mx-auto">
                  {studentsList.length === 0
                    ? 'Tất cả học viên đã được xóa khỏi danh sách. Bạn có thể thêm học viên mới hoặc khôi phục danh sách mẫu.'
                    : 'Hãy thử từ khóa tìm kiếm khác hoặc chuyển bộ lọc trạng thái về "Tất cả".'}
                </p>
                <div className="mt-3.5 flex items-center justify-center gap-2">
                  {studentsList.length === 0 ? (
                    <button
                      type="button"
                      onClick={handleRestoreDefaultStudents}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#1E3227] hover:bg-[#2B4637] text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-[#C5B358]" />
                      Khôi phục 12 học viên mẫu
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setStudentSearchQuery('');
                        setStudentStatusFilter('all');
                      }}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#1E3227] hover:bg-[#2B4637] text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                    >
                      Xem tất cả học viên ({studentsList.length})
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {filteredStudents.map((st) => {
                  const needsSupport = isStudentNeedsSupport(st);
                  return (
                    <div
                      key={st.id || st.name}
                      className="rounded-xl bg-[#FAFBF7] border border-[#DCE2CE] hover:border-[#C5B358]/60 p-4 space-y-2 shadow-2xs relative group transition-all"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-sm text-[#1E3227] truncate">
                              {st.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5 text-xs font-semibold text-[#5F7266]">
                            <span className="px-1.5 py-0.5 rounded bg-[#E7ECD9] text-[#1E3227] tabular-nums">
                              {st.studentCode || 'HV-001'}
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-[#9B8A3E]/15 text-[#1E3227]">
                              {st.hskLevel || 'HSK 2'}
                            </span>
                            <span className="font-bold text-[#1E3227] tabular-nums">
                              {st.totalPoints}đ
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span
                            className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                              needsSupport
                                ? 'text-amber-800 bg-amber-100 border border-amber-300/60'
                                : 'text-[#065F46] bg-[#065F46]/10'
                            }`}
                          >
                            {needsSupport ? 'Cần kèm thêm' : 'Đã hoàn thành'}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => handleDeleteClick(st, e)}
                            title={`Xóa học viên ${st.name} khỏi lớp`}
                            aria-label={`Xóa học viên ${st.name}`}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-red-500 hover:text-red-700 hover:bg-red-50 border border-red-200/60 hover:border-red-300 text-xs font-medium transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Xóa</span>
                          </button>
                        </div>
                      </div>
                      <div className="text-xs text-[#3F5447] space-y-1 tabular-nums pt-1">
                        <div>Từ vựng: <strong>{st.vocabScore}</strong></div>
                        <div>Tập viết Hán tự: <strong>{st.writingScore}</strong></div>
                        <div>Quiz ngữ pháp: <strong>{st.quizScore}</strong></div>
                        <div className="flex flex-wrap items-center gap-1 pt-0.5">
                          <span className="text-xs text-[#5F7266]">Từ vựng cần ôn:</span>
                          {st.reviewWords && st.reviewWords.length > 0 ? (
                            st.reviewWords.map((word) => (
                              <span
                                key={word}
                                className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300/70 text-xs font-bold font-['Noto_Serif_SC']"
                              >
                                {word}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs font-semibold text-[#065F46]">
                              Đã thuộc hết
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="pt-2 border-t border-[#E5E9DC] flex items-center justify-between gap-2">
                        <p className="text-xs text-[#6B7280] line-clamp-2 flex-1">
                          Nhận xét tự động: {st.feedback}
                        </p>
                        <button
                          type="button"
                          data-testid={`quick-bonus-btn-${st.id}`}
                          onClick={() =>
                            handleAwardBonusPoints(
                              st.id,
                              5,
                              'Phát biểu xây dựng bài trên lớp'
                            )
                          }
                          className="px-2 py-1 rounded-lg bg-[#E7ECD9] hover:bg-[#1E3227] text-[#1E3227] hover:text-white border border-[#9B8A3E]/50 text-xs font-bold transition-all shrink-0 cursor-pointer"
                          title={`Cộng nhanh +5 điểm thưởng cho ${st.name}`}
                        >
                          +5đ thưởng
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* Detailed Student Speech & Handwriting Analytics Dashboard */
          <div data-testid="classroom-reading-writing-analytics" className="rounded-2xl border border-[#D5DEC7] bg-white p-5 pb-20 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#E5E9DC]">
              <div>
                <h4 className="text-sm font-bold text-[#1E3227] flex items-center gap-1.5">
                  <Mic className="w-4 h-4 text-[#9B8A3E]" />
                  <span>Thống kê Luyện Đọc Phát Âm &amp; Viết Tay Ô Mễ Tự Cách (Học viên)</span>
                </h4>
                <p className="text-xs text-[#5F7266] mt-0.5">
                  Đồng bộ tức thì từ bài tập "Đọc thử" (Web Speech API zh-CN) và "Viết thử" (米字格) của học viên trong lớp.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  data-testid="analytics-open-worksheet-btn"
                  onClick={() => setIsWorksheetModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1E3227] text-[#FAFBF7] text-xs font-bold shadow-2xs hover:bg-[#2B4637] transition-all cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-[#C5B358]" />
                  <span>In Phiếu Luyện Viết A4 (PDF)</span>
                </button>
              </div>
            </div>

            {/* 4 Summary Metric Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl bg-[#FAFBF7] border border-[rgba(30,50,39,0.12)]">
                <div className="text-xs text-[#5F7266] font-medium">Lượt luyện đọc đã ghi nhận</div>
                <div className="text-xl font-bold text-[#1E3227] mt-1 tabular-nums">
                  {readingHistory.length} lượt
                </div>
                <div className="text-xs text-emerald-700 font-semibold mt-0.5">
                  Web Speech API zh-CN
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-[#FAFBF7] border border-[rgba(30,50,39,0.12)]">
                <div className="text-xs text-[#5F7266] font-medium">Độ chuẩn phát âm TB</div>
                <div className="text-xl font-bold text-[#9B8A3E] mt-1 tabular-nums">
                  {readingHistory.length > 0
                    ? `${Math.round(
                        readingHistory.reduce((acc, cur) => acc + (cur.score || 90), 0) /
                          readingHistory.length
                      )}%`
                    : '94%'}
                </div>
                <div className="text-xs text-emerald-700 font-semibold mt-0.5">
                  Thanh điệu chuẩn Bắc Kinh
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-[#FAFBF7] border border-[rgba(30,50,39,0.12)]">
                <div className="text-xs text-[#5F7266] font-medium">Lượt viết tay Ô Mễ Tự Cách</div>
                <div className="text-xl font-bold text-[#1E3227] mt-1 tabular-nums">
                  {handwritingHistory.length} nét
                </div>
                <div className="text-xs text-[#3F5447] font-semibold mt-0.5">
                  Đối chiếu HanziWriter
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-[#FAFBF7] border border-[rgba(30,50,39,0.12)]">
                <div className="text-xs text-[#5F7266] font-medium">Độ chính xác viết nét TB</div>
                <div className="text-xl font-bold text-[#C84B31] mt-1 tabular-nums">
                  {handwritingHistory.length > 0
                    ? `${Math.round(
                        handwritingHistory.reduce((acc, cur) => acc + (cur.accuracy || 88), 0) /
                          handwritingHistory.length
                      )}%`
                    : '91%'}
                </div>
                <div className="text-xs text-emerald-700 font-semibold mt-0.5">
                  Bút thuận &amp; tọa độ nét
                </div>
              </div>
            </div>

            {/* 2 Detailed Breakdown Tables */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Left Column: Recent Reading Drills */}
              <div className="rounded-xl border border-[rgba(30,50,39,0.12)] bg-[#FAFBF7] p-3.5 space-y-2.5">
                <div className="flex items-center justify-between pb-2 border-b border-[rgba(30,50,39,0.1)]">
                  <h5 className="text-xs font-bold text-[#1E3227] uppercase tracking-wide flex items-center gap-1.5">
                    <Mic className="w-3.5 h-3.5 text-[#C84B31]" />
                    <span>Lịch sử phát âm câu ví dụ gần đây</span>
                  </h5>
                  <span className="text-xs text-[#5F7266]">
                    {readingHistory.length} bản ghi
                  </span>
                </div>
                <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                  {readingHistory.length === 0 ? (
                    <div className="p-4 rounded-lg bg-white text-center text-xs text-[#5F7266] italic">
                      Chưa có lượt ghi âm mới. Khi học sinh bấm "Đọc thử" ở thẻ câu ví dụ, dữ liệu sẽ tự động đồng bộ về đây.
                    </div>
                  ) : (
                    readingHistory.slice(0, 10).map((r) => (
                      <div
                        key={r.id}
                        className="p-2.5 rounded-lg bg-white border border-[rgba(30,50,39,0.1)] space-y-1 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-['Noto_Sans_SC'] font-bold text-sm text-[#1E3227]">
                            {r.hanzi} · "{r.targetSentence}"
                          </span>
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#1E3227] text-white font-bold text-xs tabular-nums">
                            {r.score}%
                          </span>
                        </div>
                        <div className="text-[#3F5447] text-xs">
                          Nhận diện: <span className="font-mono text-[#1E3227]">{r.transcript}</span>
                        </div>
                        <div className="text-xs text-emerald-800 font-medium">
                          ✓ {r.feedback}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Right Column: Recent Handwriting Drills */}
              <div className="rounded-xl border border-[rgba(30,50,39,0.12)] bg-[#FAFBF7] p-3.5 space-y-2.5">
                <div className="flex items-center justify-between pb-2 border-b border-[rgba(30,50,39,0.1)]">
                  <h5 className="text-xs font-bold text-[#1E3227] uppercase tracking-wide flex items-center gap-1.5">
                    <Star className="w-3.5 h-3.5 text-[#9B8A3E]" />
                    <span>Lịch sử viết tay Ô Mễ Tự Cách gần đây</span>
                  </h5>
                  <span className="text-xs text-[#5F7266]">
                    {handwritingHistory.length} bản ghi
                  </span>
                </div>
                <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                  {handwritingHistory.length === 0 ? (
                    <div className="p-4 rounded-lg bg-white text-center text-xs text-[#5F7266] italic">
                      Chưa có lượt viết tay mới. Khi học sinh luyện viết nét trong Ô Mễ Tự Cách, kết quả chấm điểm sẽ hiển thị tại đây.
                    </div>
                  ) : (
                    handwritingHistory.slice(0, 10).map((h) => (
                      <div
                        key={h.id}
                        className="p-2.5 rounded-lg bg-white border border-[rgba(30,50,39,0.1)] space-y-1 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-['Noto_Sans_SC'] font-bold text-sm text-[#1E3227]">
                            Chữ: {h.char} ({h.hanziWord})
                          </span>
                          <div className="flex items-center gap-1">
                            <span className="px-1.5 py-0.5 rounded bg-[#9B8A3E]/20 text-[#1E3227] font-bold text-xs tabular-nums">
                              {h.accuracy}%
                            </span>
                            <span className="text-amber-500 font-bold">
                              {'★'.repeat(h.stars || 1)}
                            </span>
                          </div>
                        </div>
                        {h.isReversedDirection && (
                          <div className="text-xs text-amber-800 font-bold bg-amber-50 px-1.5 py-0.5 rounded">
                            ⚠️ Học sinh kéo ngược hướng bút thuận
                          </div>
                        )}
                        <div className="text-xs text-[#3F5447]">
                          {h.feedback}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* =======================================================================
          MODAL: 📊 BÁO CÁO CHI TIẾT BÀI LÀM CẢ LỚP (Chi tiết điểm, lỗi ngữ pháp)
          ======================================================================= */}
      {selectedReportSession && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in"
          role="dialog"
          aria-modal="true"
          onClick={() => setSelectedReportSession(null)}
        >
          <div
            className="w-full max-w-2xl bg-[#FAFBF7] border border-[#9B8A3E]/50 rounded-3xl shadow-2xl p-5 sm:p-6 flex flex-col max-h-[88vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 pb-4 border-b border-[rgba(30,50,39,0.15)]">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold text-[#9B8A3E] uppercase tracking-wider">
                  <span>📊 Báo Cáo Chi Tiết Bài Làm</span>
                  <span>·</span>
                  <span className="px-2 py-0.5 rounded-full bg-[#1E3227]/10 text-[#1E3227] font-semibold text-xs">
                    Buổi #{selectedReportSession.sessionNumber}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-[#1E3227] mt-1">
                  {selectedReportSession.lessonTitle}
                </h3>
                <p className="text-xs text-[#3F5447] mt-0.5 font-['Noto_Sans_SC']">
                  {selectedReportSession.chineseTitle} · Lớp HSK 1–3 · Ngày học: {selectedReportSession.dateLabel}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedReportSession(null)}
                className="w-8 h-8 rounded-full bg-white hover:bg-[#F4F6EE] border border-[rgba(30,50,39,0.15)] text-[#1E3227] flex items-center justify-center text-sm font-bold transition-all shadow-2xs"
              >
                ✕
              </button>
            </div>

            {/* Quick Metrics (3 Cards) */}
            <div className="grid grid-cols-3 gap-2.5 my-4">
              <div className="p-3 rounded-2xl bg-white border border-[rgba(30,50,39,0.12)] text-center shadow-2xs">
                <div className="text-xs font-semibold text-[#3F5447]">Điểm trung bình</div>
                <div className="text-xl font-bold text-[#1E3227] mt-1 tabular-nums">9.3 / 10</div>
                <div className="text-xs text-[#065F46] font-bold mt-0.5">Xuất sắc (93%)</div>
              </div>
              <div className="p-3 rounded-2xl bg-white border border-[rgba(30,50,39,0.12)] text-center shadow-2xs">
                <div className="text-xs font-semibold text-[#3F5447]">Tỷ lệ hoàn thành</div>
                <div className="text-xl font-bold text-[#9B8A3E] mt-1 tabular-nums">100%</div>
                <div className="text-xs text-[#3F5447] mt-0.5 tabular-nums">
                  {selectedReportSession.submissionsCount}/{selectedReportSession.totalStudents} học viên
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-white border border-[rgba(30,50,39,0.12)] text-center shadow-2xs">
                <div className="text-xs font-semibold text-[#3F5447]">Tự động chấm điểm</div>
                <div className="text-xl font-bold text-[#1E3227] mt-1 tabular-nums">0.3s</div>
                <div className="text-xs text-[#065F46] font-bold mt-0.5">Tức thì 100%</div>
              </div>
            </div>

            {/* Top Grammar Error Analysis */}
            <div className="p-3.5 rounded-2xl bg-[#E7ECD9] border border-[#1E3227]/25 text-xs mb-4 shadow-2xs">
              <div className="flex items-center gap-1.5 font-bold text-[#1E3227] mb-1">
                <AlertCircle className="w-4 h-4 text-[#9B8A3E]" />
                <span>Lỗi ngữ pháp &amp; từ vựng học sinh mắc nhiều nhất trong buổi:</span>
              </div>
              <p className="text-[#3F5447] text-xs leading-relaxed">
                • <strong>3 học viên</strong> nhầm lẫn giữa đại từ khẩu ngữ <strong>咱们</strong> (bắt buộc bao gồm cả người nghe) và <strong>我们</strong>.<br />
                • <strong>2 học viên</strong> viết nét sổ móc (竖钩) chữ <strong>刻</strong> chưa đủ góc nghiêng chuẩn theo ô 米字格.
              </p>
            </div>

            {/* Quick Student Score List */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-2 border-t border-[rgba(30,50,39,0.12)] pt-3">
              <div className="text-xs font-bold text-[#1E3227] mb-1 flex items-center justify-between">
                <span>Danh sách kết quả học viên ({studentsList.length} người):</span>
                <span className="text-xs text-[#9B8A3E] font-semibold">Tự động đồng bộ</span>
              </div>
              <div className="divide-y divide-[#E5E9DC] bg-white rounded-2xl border border-[rgba(30,50,39,0.12)] overflow-hidden">
                {studentsList.map((st, idx) => (
                  <div key={st.id || idx} className="p-2.5 flex items-center justify-between gap-3 text-xs hover:bg-[#FAFBF7] transition-colors">
                    <div className="min-w-0">
                      <div className="font-bold text-[#1E3227] truncate">
                        {idx + 1}. {st.name}
                      </div>
                      <div className="text-xs text-[#3F5447] truncate">
                        {st.feedback}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="px-2 py-0.5 rounded-md bg-[#E7ECD9] text-[#1E3227] font-bold text-xs tabular-nums">
                        {st.totalPoints || 95}đ
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-[#1E3227]/10 text-[#065F46] font-semibold text-xs">
                        {st.status}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteClick(st, e)}
                        title={`Xóa học viên ${st.name} khỏi lớp`}
                        aria-label={`Xóa học viên ${st.name}`}
                        className="p-1 rounded-md text-red-500 hover:text-red-700 hover:bg-red-50 border border-transparent hover:border-red-200 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="pt-4 mt-3 border-t border-[rgba(30,50,39,0.12)] flex items-center justify-between gap-3">
              <span className="text-xs text-[#3F5447]">
                Đã đồng bộ kết quả vào sổ điểm giáo viên.
              </span>
              <button
                type="button"
                onClick={() => setSelectedReportSession(null)}
                className="px-4 py-2 rounded-xl bg-[#1E3227] hover:bg-[#2B4637] text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
              >
                Đóng báo cáo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =======================================================================
          MODAL: 🗑️ XÁC NHẬN XÓA HỌC VIÊN KHỎI LỚP (TRÁNH BẤM NHẦM)
          ======================================================================= */}
      {studentToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in"
          role="dialog"
          aria-modal="true"
          onClick={() => setStudentToDelete(null)}
        >
          <div
            className="w-full max-w-md bg-[#FAFBF7] border border-red-200/90 rounded-3xl shadow-2xl p-5 sm:p-6 flex flex-col space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-red-100 flex items-center justify-center text-red-600 shrink-0 shadow-2xs">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#1E3227]">
                  Xác nhận xóa học viên
                </h3>
                <p className="text-xs text-[#5F7266]">
                  Lớp HSK 1–3 · Thao tác quản lý lớp
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white border border-[#E5E9DC] space-y-1">
              <p className="text-xs text-[#5F7266]">
                Bạn có chắc chắn muốn xóa học viên khỏi danh sách lớp?
              </p>
              <p className="text-base font-bold text-red-700">
                {studentToDelete.name}
              </p>
              <div className="text-xs text-[#3F5447] pt-1.5 border-t border-[#F0F2EB] flex items-center justify-between">
                <span>Điểm tổng kết: <strong className="text-[#1E3227]">{studentToDelete.totalPoints || 95}đ</strong></span>
                <span>Từ vựng: <strong className="text-[#1E3227]">{studentToDelete.vocabScore}</strong></span>
              </div>
            </div>

            <p className="text-xs text-[#6B7280] bg-red-50/80 p-2.5 rounded-xl border border-red-100 leading-relaxed">
              ⚠️ Học viên này sẽ bị xóa khỏi danh sách lớp và sĩ số sẽ tự động giảm tương ứng. Dữ liệu xóa được cập nhật vĩnh viễn vào bộ nhớ cục bộ (localStorage).
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setStudentToDelete(null)}
                className="px-4 py-2 rounded-xl bg-white hover:bg-[#F4F6EE] border border-[rgba(30,50,39,0.15)] text-xs font-semibold text-[#1E3227] transition-all cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xác nhận xóa</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sub-component: Modal Thêm học viên mới */}
      <ClassroomAddStudentModal
        isOpen={isAddStudentModalOpen}
        onClose={() => setIsAddStudentModalOpen(false)}
        onAddStudent={(newStudent) => {
          const updated = [newStudent, ...studentsList];
          persistRosterAndSync(updated);
          setActiveTab('grading');
          setIsAddStudentModalOpen(false);
          setActionBanner(
            `✅ Đã thêm học viên "${newStudent.name}" (${newStudent.studentCode} · ${newStudent.hskLevel} · ${newStudent.totalPoints}đ) vào đầu danh sách! Sĩ số mới: ${updated.length} học viên.`
          );
          playGentleChime(783.99, 0.25);
        }}
        existingStudentsCount={studentsList.length}
      />

      {/* Sub-component: Mini-game Vòng quay gọi tên & Ghép thẻ */}
      <ClassroomLuckyWheelModal
        isOpen={isLuckyWheelOpen}
        onClose={() => setIsLuckyWheelOpen(false)}
        studentsList={studentsList}
        onAwardBonusPoints={handleAwardBonusPoints}
      />

      {/* Sub-component: In phiếu luyện viết chữ Hán A4 (PDF) */}
      <WorksheetPreviewModal
        isOpen={isWorksheetModalOpen}
        onClose={() => setIsWorksheetModalOpen(false)}
        slides={slides && slides.length > 0 ? slides : INITIAL_VOCAB_SLIDES}
      />
    </div>
  );
};

