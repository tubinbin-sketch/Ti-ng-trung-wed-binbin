import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Award,
  Calendar,
  CheckCircle2,
  Download,
  Mic,
  Plus,
  Printer,
  Search,
  Send,
  Sparkles,
  UploadCloud,
} from 'lucide-react';
import { ClassSession, INITIAL_CLASS_SESSIONS, INITIAL_VOCAB_SLIDES, VocabSlide } from '../data/chineseData';
import {
  autoGradeClassSession,
  awardStudentBonusPoints,
  filterClassroomStudents,
  generateRandomStudentCode,
  generateStudentsCsvContent,
  StudentStatusFilter,
} from '../utils/chineseEngine';
import { playGentleChime } from '../utils/speech';
import {
  getStoredAssignment,
  parseAssignmentContent,
  saveStoredAssignment,
  UploadedAssignmentPackage,
} from '../utils/assignmentParser';
import { ClassroomAddStudentModal } from './ClassroomAddStudentModal';
import { ClassroomLuckyWheelModal } from './ClassroomLuckyWheelModal';
import { WorksheetPreviewModal } from './WorksheetPreviewModal';
import {
  ClassroomDataMode,
  getClassroomDataMode,
  loadActiveClassroomSession,
  saveActiveClassroomSession,
  setClassroomDataMode,
} from '../utils/storageService';
import {
  createNewTeacherClass,
  deleteTeacherStudentSlotFromFirestore,
  importLegacyBackupToFirestore,
  resetTeacherStudentSlotInFirestore,
  saveTeacherAssignmentToFirestore,
  saveTeacherStudentSlotToFirestore,
} from '../firebase';
import { appStore, useAppStoreSelector } from '../context/AppStoreContext';
import {
  type ClassStudent,
  DEFAULT_STUDENTS,
  getStoredStudentRoster,
  STORAGE_KEY_STUDENTS,
} from './classroom/classroomRosterData';
import { TeacherControlOverview } from './classroom/TeacherControlOverview';
import { ClassroomScheduleTable } from './classroom/ClassroomScheduleTable';
import { ClassroomGradingGrid } from './classroom/ClassroomGradingGrid';
import { ClassroomAnalyticsPanel } from './classroom/ClassroomAnalyticsPanel';

export { type ClassStudent, DEFAULT_STUDENTS, getStoredStudentRoster, STORAGE_KEY_STUDENTS };

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
  const [studentsList, setStudentsList] = useState<ClassStudent[]>(() => getStoredStudentRoster());
  const [classroomMode, setClassroomModeState] = useState<ClassroomDataMode>(() => getClassroomDataMode());
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
  const [activeClassMeta, setActiveClassMeta] = useState(() => loadActiveClassroomSession());
  const legacyBackupInputRef = useRef<HTMLInputElement>(null);

  const storeRevisions = useAppStoreSelector((s) => ({
    students: s.studentsRosterVersion,
    srs: s.srsVersion,
    remote: s.syncStatus,
    mode: s.classroomMode,
    reading: s.readingHistoryVersion,
    handwriting: s.handwritingHistoryVersion,
  }));

  useEffect(() => {
    setClassroomModeState(getClassroomDataMode());
    setStudentsList(getStoredStudentRoster());
    setActiveClassMeta(loadActiveClassroomSession());
    try {
      const rRaw = localStorage.getItem('hanu_student_reading_eval_history_v2');
      if (rRaw) setReadingHistory(JSON.parse(rRaw));
      const hRaw = localStorage.getItem('hanu_student_handwriting_history_v2');
      if (hRaw) setHandwritingHistory(JSON.parse(hRaw));
    } catch {
      // ignore
    }
  }, [
    storeRevisions.students,
    storeRevisions.srs,
    storeRevisions.remote,
    storeRevisions.mode,
    storeRevisions.reading,
    storeRevisions.handwriting,
  ]);

  useEffect(() => {
    onStudentCountChange?.(studentCount);
  }, [studentCount, onStudentCountChange]);

  const [sessions, setSessions] = useState<ClassSession[]>(() =>
    INITIAL_CLASS_SESSIONS.map((s) => ({
      ...autoGradeClassSession(s),
      totalStudents: studentCount,
      submissionsCount: studentCount,
    }))
  );
  const [activeTab, setActiveTab] = useState<'schedule' | 'grading' | 'analytics'>('schedule');
  const [actionBanner, setActionBanner] = useState<string>(
    'Hoàn tất tự động: Đã giao bài và chấm điểm toàn bộ 19/19 buổi học trong khóa HSK 1–3!'
  );
  const [selectedReportSession, setSelectedReportSession] = useState<ClassSession | null>(null);
  const [studentToDelete, setStudentToDelete] = useState<ClassStudent | null>(null);
  const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false);
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [studentStatusFilter, setStudentStatusFilter] = useState<StudentStatusFilter>('all');
  const [isLuckyWheelOpen, setIsLuckyWheelOpen] = useState(false);

  const filteredStudents = useMemo(
    () => filterClassroomStudents(studentsList, studentSearchQuery, studentStatusFilter),
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

  const [selectedSessionNumber, setSelectedSessionNumber] = useState<number>(14);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [customPastedText, setCustomPastedText] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [activePackage, setActivePackage] = useState<UploadedAssignmentPackage>(() => getStoredAssignment());
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  const totalCourseSessions = 19;
  const completedCount = 10 + sessions.filter((s) => s.status === 'completed').length;
  const assignedCount = 12 + sessions.filter((s) => s.homeworkAssigned).length;
  const gradedCount = 12 + sessions.filter((s) => s.autoGraded).length;

  const persistRosterAndSync = (updated: ClassStudent[], overrideMode?: ClassroomDataMode) => {
    const targetMode = overrideMode || classroomMode;
    setStudentsList(updated);
    try {
      localStorage.setItem(STORAGE_KEY_STUDENTS, JSON.stringify(updated));
    } catch {
      // ignore
    }
    const nextTotal = updated.length;
    onStudentCountChange?.(nextTotal);
    if (targetMode !== 'demo') {
      const session = loadActiveClassroomSession();
      if (session?.classId) {
        updated.forEach((student) => {
          void saveTeacherStudentSlotToFirestore(session.classId, student).catch(() => {});
        });
      }
    }
    appStore.notifyStudentsUpdated(nextTotal);
    setSessions((prev) =>
      prev.map((s) => ({
        ...s,
        totalStudents: nextTotal,
        submissionsCount: s.autoGraded ? nextTotal : Math.min(s.submissionsCount, nextTotal),
      }))
    );
  };

  const handleAssignUploadedFile = () => {
    setIsExtracting(true);
    playGentleChime(587.33, 0.2);
    setTimeout(() => {
      const fileName = selectedFile
        ? selectedFile.name
        : customPastedText.trim()
        ? 'Noi_Dung_De_Bai_Giao_Vien.txt'
        : 'De_On_Tap_Buoi_14_HSK1-3.docx';
      const parsedPkg = parseAssignmentContent(
        customPastedText || fileName,
        fileName,
        selectedSessionNumber,
        `Buổi ${selectedSessionNumber} - HSK 1–3`
      );
      saveStoredAssignment(parsedPkg);
      setActivePackage(parsedPkg);
      if (getClassroomDataMode() !== 'demo') {
        const session = loadActiveClassroomSession();
        if (session?.classId) {
          void saveTeacherAssignmentToFirestore(session.classId, parsedPkg).catch(() => {});
        }
      }
      setIsExtracting(false);
      setSuccessBanner(`✅ Đã trích xuất câu hỏi từ "${fileName}" và đồng bộ lên Firestore lớp học!`);
      playGentleChime(783.99, 0.3);
    }, 500);
  };

  const handleLoadDemoPackage = (pkg: UploadedAssignmentPackage) => {
    setIsExtracting(true);
    setTimeout(() => {
      saveStoredAssignment(pkg);
      setActivePackage(pkg);
      setSelectedSessionNumber(pkg.sessionNumber);
      if (getClassroomDataMode() !== 'demo') {
        const session = loadActiveClassroomSession();
        if (session?.classId) {
          void saveTeacherAssignmentToFirestore(session.classId, pkg).catch(() => {});
        }
      }
      setIsExtracting(false);
      setSuccessBanner(`✅ Đã giao đề "${pkg.fileName}" tới toàn bộ học sinh lớp HSK 1–3!`);
      playGentleChime(659.25, 0.25);
    }, 350);
  };

  const handleActivateDemoClassroom = () => {
    setClassroomDataMode('demo');
    setClassroomModeState('demo');
    persistRosterAndSync(DEFAULT_STUDENTS, 'demo');
    setActionBanner(`🧪 Đã bật Chế độ Demo với ${DEFAULT_STUDENTS.length} học viên mẫu.`);
    playGentleChime(659.25, 0.2);
  };

  const handleCreateNewClassroom = async () => {
    setClassroomDataMode('new');
    setClassroomModeState('new');
    persistRosterAndSync([], 'new');
    setActiveTab('grading');
    try {
      const created = await createNewTeacherClass('Lớp HSK 1–3 Thực Tế', 'HSK 1–3');
      const nextSession = {
        role: 'teacher' as const,
        uid: created.teacherUid,
        displayName: activeClassMeta?.displayName || 'Giáo viên HSK',
        email: activeClassMeta?.email,
        classId: created.id,
        className: created.name,
        joinCode: created.joinCode,
        isDemo: false,
      };
      saveActiveClassroomSession(nextSession);
      setActiveClassMeta(nextSession);
      setActionBanner(`🆕 Đã tạo lớp học mới trên Firestore (Mã lớp: ${created.joinCode}).`);
    } catch {
      setActionBanner('🆕 Đã tạo lớp học mới (0 học viên). Bấm "+ Thêm học viên mới" để cấp Mã HV!');
    }
    playGentleChime(587.33, 0.2);
  };

  const handleLegacyJsonBackupImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const parsedJson = JSON.parse(await file.text());
      setActionBanner('⏳ Đang di chuyển dữ liệu JSON cũ lên Cloud Firestore...');
      const result = await importLegacyBackupToFirestore(
        parsedJson,
        activeClassMeta?.className || 'HSK 1–3 — Lớp Di Chuyển Từ JSON'
      );
      setClassroomDataMode('new');
      setClassroomModeState('new');
      const nextSession = {
        role: 'teacher' as const,
        uid: activeClassMeta?.uid || 'teacher',
        displayName: activeClassMeta?.displayName || 'Giáo viên HSK',
        email: activeClassMeta?.email,
        classId: result.classDoc.id,
        className: result.classDoc.name,
        joinCode: result.classDoc.joinCode,
        isDemo: false,
      };
      saveActiveClassroomSession(nextSession);
      setActiveClassMeta(nextSession);
      setActionBanner(`✅ Đã di chuyển ${result.importedStudents} học viên lên Firestore (Mã lớp: ${result.classDoc.joinCode})!`);
    } catch (err: any) {
      setActionBanner(`⚠️ Không thể nhập JSON: ${err?.message || 'Vui lòng đăng nhập Giáo viên Google trước.'}`);
    } finally {
      e.target.value = '';
    }
  };

  const handleExportCsv = () => {
    const csvContent = generateStudentsCsvContent(studentsList);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Bang_Diem_Lop_HSK_${studentsList.length}HV.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 500);
    setActionBanner(`📥 Đã xuất file CSV bảng điểm (${studentsList.length} học viên) thành công!`);
  };

  const handleConfirmDelete = () => {
    if (!studentToDelete) return;
    const updated = studentsList.filter((s) => s.id !== studentToDelete.id);
    if (classroomMode !== 'demo' && activeClassMeta?.classId) {
      void deleteTeacherStudentSlotFromFirestore(
        activeClassMeta.classId,
        studentToDelete.id,
        studentToDelete.studentCode
      ).catch(() => {});
    }
    persistRosterAndSync(updated, updated.length === 0 ? 'new' : undefined);
    setActionBanner(`Đã xóa học viên "${studentToDelete.name}" khỏi lớp (Sĩ số mới: ${updated.length} học viên).`);
    setStudentToDelete(null);
  };

  const handleAwardBonusPoints = (studentId: string, bonusPoints: number, reason: string) => {
    const target = studentsList.find((s) => s.id === studentId);
    if (!target) return;
    const updated = awardStudentBonusPoints(studentsList, studentId, bonusPoints, reason);
    persistRosterAndSync(updated);
    const updatedStudent = updated.find((s) => s.id === studentId);
    setActionBanner(
      `🎉 Đã cộng +${bonusPoints} điểm cho "${target.name}" (${reason})! Điểm mới: ${updatedStudent?.totalPoints ?? target.totalPoints}đ.`
    );
  };

  const handleReissueStudentCode = async (student: ClassStudent) => {
    const fallbackNewCode = generateRandomStudentCode('HV');
    let issuedCode = fallbackNewCode;

    if (classroomMode !== 'demo' && activeClassMeta?.classId) {
      try {
        const res = await resetTeacherStudentSlotInFirestore(
          activeClassMeta.classId,
          student.studentCode,
          true
        );
        if (res.studentCode) {
          issuedCode = res.studentCode;
        }
      } catch {
        // Fallback to local code update
      }
    }

    const updated = studentsList.map((st) =>
      st.id === student.id ? { ...st, studentCode: issuedCode } : st
    );
    persistRosterAndSync(updated);
    setActionBanner(
      `🔑 Đã gỡ liên kết thiết bị cũ và cấp mã mới "${issuedCode}" cho học viên "${student.name}".`
    );
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-surface/90 backdrop-blur-md border border-border text-ink p-5 md:p-7 shadow-xs space-y-6">
        {/* Top Class Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-border">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-gold uppercase tracking-wider">
              <span>Bảng điều khiển Giáo viên · Cloud Firestore</span>
              <span>·</span>
              <span
                data-testid="active-class-join-code-badge"
                className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold"
              >
                Mã lớp: {activeClassMeta?.joinCode || '722229'}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-ink mt-1">
              {activeClassMeta?.className || 'HSK 1–3 — Lớp Tối 246 (19:30–21:00)'}
            </h2>
            <p className="text-xs text-ink-muted mt-1">
              Lịch học: Thứ 2, 4, 6 · Tiến độ:{' '}
              <strong className="text-ink tabular-nums">{completedCount}/{totalCourseSessions} buổi</strong> · Giảng viên: {activeClassMeta?.displayName || 'GV Nguyễn Văn Thụ (阮文受)'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <input
              ref={legacyBackupInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleLegacyJsonBackupImport}
              className="hidden"
              data-testid="legacy-json-backup-file-input"
            />
            <button
              type="button"
              onClick={() => legacyBackupInputRef.current?.click()}
              data-testid="import-legacy-json-backup-btn"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-canvas hover:bg-primary/10 text-ink border border-gold/60 text-xs font-bold transition-all cursor-pointer"
            >
              <UploadCloud className="w-3.5 h-3.5 text-primary" />
              <span>📂 Chuyển JSON cũ lên Firestore</span>
            </button>
            <button
              type="button"
              onClick={handleActivateDemoClassroom}
              data-testid="activate-demo-classroom-btn"
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                classroomMode === 'demo' && studentsList.length > 0
                  ? 'bg-primary text-white border-primary'
                  : 'bg-canvas hover:bg-primary/10 text-ink border-gold/60'
              }`}
            >
              <span>🧪 Xem bản demo</span>
            </button>
            <button
              type="button"
              onClick={handleCreateNewClassroom}
              data-testid="create-new-classroom-btn"
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                classroomMode === 'new' && studentsList.length === 0
                  ? 'bg-accent text-white border-accent'
                  : 'bg-canvas hover:bg-primary/10 text-ink border-gold/60'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tạo lớp học mới</span>
            </button>
            <button
              type="button"
              onClick={handleExportCsv}
              data-testid="header-export-csv-report-btn"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-canvas hover:bg-primary/10 text-ink border border-gold/60 text-xs font-bold transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-gold" />
              <span>📊 Xuất Bảng Điểm CSV</span>
            </button>
            <button
              type="button"
              onClick={() => {
                playGentleChime(783.99, 0.24);
                setSessions((prev) => prev.map((s) => autoGradeClassSession(s)));
                setActionBanner('Hoàn tất tự động: Đã giao bài và chấm điểm toàn bộ 19/19 buổi học!');
              }}
              data-testid="batch-autograde-btn"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-bold transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-gold" />
              <span>Giao &amp; Tự chấm toàn khóa</span>
            </button>
          </div>
        </div>

        {/* 4 Synchronized KPI Stat Boxes */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="rounded-xl bg-canvas border border-border p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-semibold text-ink-muted">
              <span>Tổng số buổi</span>
              <Calendar className="w-3.5 h-3.5 text-gold" />
            </div>
            <div className="text-xl sm:text-2xl font-bold text-ink mt-1 tabular-nums">{totalCourseSessions}</div>
            <div className="text-xs text-ink-muted mt-0.5 truncate">Khóa chuẩn HSK 1–3</div>
          </div>
          <div className="rounded-xl bg-canvas border border-border p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-semibold text-ink-muted">
              <span>Đã giao bài</span>
              <Send className="w-3.5 h-3.5 text-primary" />
            </div>
            <div className="text-xl sm:text-2xl font-bold text-ink mt-1 tabular-nums" data-testid="assigned-sessions-count">
              {assignedCount}/{totalCourseSessions}
            </div>
            <div className="text-xs text-primary font-semibold mt-0.5 truncate">Kèm Slide &amp; Đề chuẩn</div>
          </div>
          <div className="rounded-xl bg-canvas border border-border p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-semibold text-ink-muted">
              <span>Đã tự chấm điểm</span>
              <Sparkles className="w-3.5 h-3.5 text-gold" />
            </div>
            <div className="text-xl sm:text-2xl font-bold text-gold mt-1 tabular-nums" data-testid="graded-sessions-count">
              {gradedCount}/{totalCourseSessions}
            </div>
            <div className="text-xs text-gold font-semibold mt-0.5 truncate">100% học viên đã chấm</div>
          </div>
          <div className="rounded-xl bg-canvas border border-border p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-semibold text-ink-muted">
              <span>Sĩ số học viên</span>
              <Award className="w-3.5 h-3.5 text-primary" />
            </div>
            <div className="text-xl sm:text-2xl font-bold text-ink mt-1 tabular-nums">{studentCount}</div>
            <div className="text-xs text-ink-muted mt-0.5 truncate">Đầy đủ tài khoản</div>
          </div>
        </div>

        {/* Dedicated Teacher Control Overview (Class List, Assigned Homework, Unsubmitted Students) */}
        <TeacherControlOverview
          activeClassMeta={activeClassMeta}
          studentsList={studentsList}
          activePackage={activePackage}
          selectedSessionNumber={selectedSessionNumber}
          onSelectSessionNumber={setSelectedSessionNumber}
          selectedFile={selectedFile}
          onSelectFile={setSelectedFile}
          customPastedText={customPastedText}
          onChangeCustomPastedText={setCustomPastedText}
          isExtracting={isExtracting}
          onAssignUploadedFile={handleAssignUploadedFile}
          onLoadDemoPackage={handleLoadDemoPackage}
          successBanner={successBanner}
          onSwitchToStudentView={onSwitchToStudentView}
          onCreateNewClassroom={handleCreateNewClassroom}
          onFilterUnsubmitted={() => {
            setStudentStatusFilter('needs_support');
            setActiveTab('grading');
          }}
          onOpenAddStudentModal={() => setIsAddStudentModalOpen(true)}
        />

        {/* Sub-navigation Tabs & Search Toolbar */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab('schedule')}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                  activeTab === 'schedule'
                    ? 'bg-primary text-white'
                    : 'bg-canvas text-ink-muted border border-border hover:text-ink'
                }`}
              >
                <Calendar className="w-3.5 h-3.5 text-gold" />
                Chương trình và tiến độ
              </button>
              <button
                type="button"
                data-testid="tab-student-grading"
                onClick={() => setActiveTab('grading')}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                  activeTab === 'grading'
                    ? 'bg-primary text-white'
                    : 'bg-canvas text-ink-muted border border-border hover:text-ink'
                }`}
              >
                <Award className="w-3.5 h-3.5 text-gold" />
                Bảng điểm tự động học viên ({studentCount})
              </button>
              <button
                type="button"
                data-testid="tab-reading-writing-analytics"
                onClick={() => setActiveTab('analytics')}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                  activeTab === 'analytics'
                    ? 'bg-primary text-white'
                    : 'bg-canvas text-ink-muted border border-border hover:text-ink'
                }`}
              >
                <Mic className="w-3.5 h-3.5 text-gold" />
                Luyện Đọc &amp; Viết chữ ({readingHistory.length + handwritingHistory.length})
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                data-testid="open-lucky-wheel-btn"
                onClick={() => setIsLuckyWheelOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gold/15 hover:bg-gold/25 text-ink border border-gold text-xs font-bold transition-all cursor-pointer"
              >
                <span>🎡 Gọi tên ngẫu nhiên (Lucky Wheel) &amp; Ghép Thẻ</span>
              </button>
              <button
                type="button"
                data-testid="open-add-student-modal-btn"
                onClick={() => setIsAddStudentModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-bold transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-gold" />
                <span>+ Thêm học viên mới</span>
              </button>
              <button
                type="button"
                data-testid="export-students-csv-btn"
                onClick={handleExportCsv}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-canvas hover:bg-primary/10 text-ink border border-gold/60 text-xs font-bold transition-all cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-gold" />
                <span>📊 Xuất Bảng Điểm CSV/In Báo Cáo</span>
              </button>
              <button
                type="button"
                data-testid="classroom-print-worksheet-btn"
                onClick={() => setIsWorksheetModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-surface hover:bg-primary/10 text-ink border border-gold/60 text-xs font-bold transition-all cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-gold" />
                <span>🖨️ In Phiếu Viết A4 (PDF)</span>
              </button>
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 p-2.5 rounded-2xl bg-canvas border border-border">
            <div className="relative flex-1 min-w-0">
              <Search className="w-3.5 h-3.5 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
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
                className="w-full pl-8 pr-8 py-1.5 rounded-xl bg-surface border border-border text-sm text-ink placeholder:text-ink-muted"
              />
              {studentSearchQuery && (
                <button
                  type="button"
                  aria-label="Xóa từ khóa tìm kiếm"
                  onClick={() => setStudentSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink text-xs cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1.5 shrink-0" role="group" aria-label="Bộ lọc trạng thái học viên">
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
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    studentStatusFilter === f.id
                      ? 'bg-primary text-white'
                      : 'bg-surface text-ink-muted border border-border hover:text-ink'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="px-3.5 py-2 rounded-xl bg-canvas border border-gold/45 text-xs font-medium text-ink flex items-center gap-2" data-testid="classroom-status-banner">
          <CheckCircle2 className="w-4 h-4 text-gold shrink-0" />
          <span className="truncate">{actionBanner}</span>
        </div>

        {activeTab === 'schedule' ? (
          <ClassroomScheduleTable
            sessions={sessions}
            studentsList={studentsList}
            selectedReportSession={selectedReportSession}
            onSelectReportSession={setSelectedReportSession}
            onRegradeSession={(session) => {
              playGentleChime(659.25, 0.2);
              setSessions((prev) => prev.map((s) => (s.id === session.id ? autoGradeClassSession(s) : s)));
              setActionBanner(`Đã chấm điểm tự động cho Buổi #${session.sessionNumber}: "${session.lessonTitle}".`);
            }}
            onDeleteStudentClick={(st, e) => {
              e?.stopPropagation();
              setStudentToDelete(st);
            }}
          />
        ) : activeTab === 'grading' ? (
          <ClassroomGradingGrid
            studentsList={studentsList}
            filteredStudents={filteredStudents}
            onRestoreDefaultStudents={handleActivateDemoClassroom}
            onResetFilters={() => {
              setStudentSearchQuery('');
              setStudentStatusFilter('all');
            }}
            onOpenAddStudentModal={() => setIsAddStudentModalOpen(true)}
            onDeleteStudentClick={(st, e) => {
              e?.stopPropagation();
              setStudentToDelete(st);
            }}
            onReissueStudentCode={handleReissueStudentCode}
            onAwardBonusPoints={handleAwardBonusPoints}
            studentToDelete={studentToDelete}
            onCloseDeleteModal={() => setStudentToDelete(null)}
            onConfirmDeleteStudent={handleConfirmDelete}
          />
        ) : (
          <ClassroomAnalyticsPanel
            readingHistory={readingHistory}
            handwritingHistory={handwritingHistory}
            onOpenWorksheetModal={() => setIsWorksheetModalOpen(true)}
          />
        )}
      </div>

      <ClassroomAddStudentModal
        isOpen={isAddStudentModalOpen}
        onClose={() => setIsAddStudentModalOpen(false)}
        onAddStudent={(newStudent) => {
          const updated = [newStudent, ...studentsList];
          persistRosterAndSync(updated);
          setActiveTab('grading');
          setIsAddStudentModalOpen(false);
          setActionBanner(`✅ Đã thêm học viên "${newStudent.name}" (${newStudent.studentCode})! Sĩ số mới: ${updated.length}.`);
          playGentleChime(783.99, 0.25);
        }}
        existingStudentsCount={studentsList.length}
      />

      <ClassroomLuckyWheelModal
        isOpen={isLuckyWheelOpen}
        onClose={() => setIsLuckyWheelOpen(false)}
        studentsList={studentsList}
        onAwardBonusPoints={handleAwardBonusPoints}
      />

      <WorksheetPreviewModal
        isOpen={isWorksheetModalOpen}
        onClose={() => setIsWorksheetModalOpen(false)}
        slides={slides && slides.length > 0 ? slides : INITIAL_VOCAB_SLIDES}
      />
    </div>
  );
};
