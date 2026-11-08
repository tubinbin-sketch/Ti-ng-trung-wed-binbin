import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Award,
  CheckCircle2,
  Dices,
  Download,
  Mic,
  Plus,
  Printer,
  Search,
  UploadCloud,
} from 'lucide-react';
import { INITIAL_VOCAB_SLIDES, VocabSlide } from '../data/chineseData';
import {
  awardStudentBonusPoints,
  isStudentNeedsSupport,
  filterClassroomStudents,
  generateRandomStudentCode,
  generateStudentsCsvContent,
  StudentStatusFilter,
} from '../utils/chineseEngine';
import { playGentleChime } from '../utils/speech';
import {
  countAssignmentQuestions,
  EMPTY_ASSIGNMENT,
  getStoredAssignment,
  parseAssignmentContent,
  readAssignmentFileText,
  saveStoredAssignment,
  UploadedAssignmentPackage,
} from '../utils/assignmentParser';
import { ClassroomAddStudentModal } from './ClassroomAddStudentModal';
import { ClassroomLuckyWheelModal } from './ClassroomLuckyWheelModal';
import { WorksheetPreviewModal } from './WorksheetPreviewModal';
import {
  ActiveClassroomSession,
  loadActiveClassroomSession,
  saveActiveClassroomSession,
} from '../utils/storageService';
import {
  createNewTeacherClass,
  deleteAllTeacherAssignmentsFromFirestore,
  deleteTeacherStudentSlotFromFirestore,
  importLegacyBackupToFirestore,
  resetTeacherStudentSlotInFirestore,
  saveTeacherAssignmentToFirestore,
  saveTeacherStudentSlotToFirestore,
} from '../firebase';
import { appStore, useAppStoreSelector } from '../context/AppStoreContext';
import {
  type ClassStudent,
  getStoredStudentRoster,
  STORAGE_KEY_STUDENTS,
} from './classroom/classroomRosterData';
import { TeacherControlOverview } from './classroom/TeacherControlOverview';
import { ClassroomGradingGrid } from './classroom/ClassroomGradingGrid';
import { ClassroomAnalyticsPanel } from './classroom/ClassroomAnalyticsPanel';

export { type ClassStudent, getStoredStudentRoster, STORAGE_KEY_STUDENTS };

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
  const { classId: routeClassId } = useParams<{ classId?: string }>();
  const [studentsList, setStudentsList] = useState<ClassStudent[]>(() => getStoredStudentRoster());
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
  const [activeClassMeta, setActiveClassMeta] = useState<ActiveClassroomSession | null>(() =>
    loadActiveClassroomSession()
  );
  const legacyBackupInputRef = useRef<HTMLInputElement>(null);

  const resolvedClassMeta = useMemo<ActiveClassroomSession>(() => {
    if (activeClassMeta) return activeClassMeta;
    return {
      classId: '',
      className: '',
      joinCode: '',
      role: 'teacher',
      uid: '',
      displayName: '',
    };
  }, [activeClassMeta, routeClassId]);

  const storeRevisions = useAppStoreSelector((s) => ({
    students: s.studentsRosterVersion,
    srs: s.srsVersion,
    remote: s.syncStatus,
    reading: s.readingHistoryVersion,
    handwriting: s.handwritingHistoryVersion,
  }));

  useEffect(() => {
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
    storeRevisions.reading,
    storeRevisions.handwriting,
  ]);

  useEffect(() => {
    onStudentCountChange?.(studentCount);
  }, [studentCount, onStudentCountChange]);

  const [activeTab, setActiveTab] = useState<'grading' | 'analytics'>('grading');
  const [actionBanner, setActionBanner] = useState<string>('');
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

  const [assignmentTitle, setAssignmentTitle] = useState('');
  const [assignmentDueDate, setAssignmentDueDate] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [customPastedText, setCustomPastedText] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [activePackage, setActivePackage] = useState<UploadedAssignmentPackage>(() => getStoredAssignment());
  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  const [assignError, setAssignError] = useState<string | null>(null);

  const assignedQuestionCount = countAssignmentQuestions(activePackage);
  const submittedCount = studentsList.filter((s) => s.status !== 'Chưa nộp').length;
  const needsSupportCount = studentsList.filter(
    (s) => s.status !== 'Chưa nộp' && isStudentNeedsSupport(s)
  ).length;

  const persistRosterAndSync = (updated: ClassStudent[]) => {
    setStudentsList(updated);
    try {
      localStorage.setItem(STORAGE_KEY_STUDENTS, JSON.stringify(updated));
    } catch {
      // ignore
    }
    const nextTotal = updated.length;
    onStudentCountChange?.(nextTotal);
    const session = loadActiveClassroomSession();
    if (session?.classId) {
      updated.forEach((student) => {
        void saveTeacherStudentSlotToFirestore(session.classId, student).catch(() => {});
      });
    }
    appStore.notifyStudentsUpdated(nextTotal);
  };

  const handleAssignUploadedFile = async () => {
    setAssignError(null);
    setSuccessBanner(null);
    const pasted = customPastedText.trim();
    if (!selectedFile && !pasted) {
      setAssignError('Chọn file đề (.txt, .docx) hoặc dán nội dung câu hỏi trước khi giao bài.');
      return;
    }
    setIsExtracting(true);
    try {
      const text = selectedFile ? await readAssignmentFileText(selectedFile) : pasted;
      const fileName = selectedFile ? selectedFile.name : 'Noi_dung_dan.txt';
      const { pkg, warnings } = parseAssignmentContent(text, fileName, assignmentTitle, {
        teacherName: resolvedClassMeta.displayName || resolvedClassMeta.teacherName || '',
        dueDate: assignmentDueDate,
      });
      const total = countAssignmentQuestions(pkg);
      if (total === 0) {
        setAssignError(
          `Không tìm thấy câu hỏi nào đúng mẫu.${warnings.length ? ` ${warnings[0]}` : ''} Xem mẫu định dạng trong mục "Dán văn bản".`
        );
        return;
      }
      saveStoredAssignment(pkg);
      setActivePackage(pkg);
      const session = loadActiveClassroomSession();
      if (session?.classId) {
        void saveTeacherAssignmentToFirestore(session.classId, pkg).catch(() => {});
      }
      setSelectedFile(null);
      setCustomPastedText('');
      setAssignmentTitle('');
      setAssignmentDueDate('');
      setSuccessBanner(
        `Đã giao "${pkg.sessionTitle}" (${total} câu).${
          warnings.length ? ` Bỏ qua ${warnings.length} mục chưa đúng mẫu.` : ''
        }`
      );
      playGentleChime(783.99, 0.3);
    } catch (err) {
      setAssignError(err instanceof Error ? err.message : 'Không đọc được file đề.');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleClearAssignment = () => {
    saveStoredAssignment(EMPTY_ASSIGNMENT);
    setActivePackage(EMPTY_ASSIGNMENT);
    setSuccessBanner(null);
    setActionBanner('Đã gỡ bài tập đang giao. Học viên sẽ thấy trang bài tập trống.');
    const session = loadActiveClassroomSession();
    if (session?.classId) {
      void deleteAllTeacherAssignmentsFromFirestore(session.classId).catch(() => {
        setActionBanner('Đã gỡ bài trên máy này nhưng chưa xóa được trên máy chủ. Kiểm tra mạng rồi thử lại.');
      });
    }
  };

  const handleCreateNewClassroom = async () => {
    persistRosterAndSync([]);
    setActiveTab('grading');
    try {
      const created = await createNewTeacherClass('Lớp HSK 1–3 Thực Tế', 'HSK 1–3');
      const nextSession = {
        role: 'teacher' as const,
        uid: created.teacherUid,
        displayName: resolvedClassMeta.displayName || 'Giáo viên',
        email: resolvedClassMeta.email,
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
        resolvedClassMeta.className || 'HSK 1–3 — Lớp Di Chuyển Từ JSON'
      );
      const nextSession = {
        role: 'teacher' as const,
        uid: resolvedClassMeta.uid || 'teacher',
        displayName: resolvedClassMeta.displayName || 'Giáo viên',
        email: resolvedClassMeta.email,
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
    if (resolvedClassMeta.classId) {
      void deleteTeacherStudentSlotFromFirestore(
        resolvedClassMeta.classId,
        studentToDelete.id,
        studentToDelete.studentCode
      ).catch(() => {});
    }
    persistRosterAndSync(updated);
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

    if (resolvedClassMeta.classId) {
      try {
        const res = await resetTeacherStudentSlotInFirestore(
          resolvedClassMeta.classId,
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

  const cleanTeacherName = (resolvedClassMeta.displayName || resolvedClassMeta.teacherName || '').trim();
  const hasClass = Boolean(resolvedClassMeta.classId && resolvedClassMeta.className);

  return (
    <div className="space-y-6 pb-20 lg:pb-12">
      {/* Class header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-5 border-b border-border">
        <div className="min-w-0 space-y-1.5">
          <h2 className="text-xl sm:text-2xl font-semibold text-ink leading-snug text-balance">
            {hasClass ? resolvedClassMeta.className : 'Chưa có lớp học'}
          </h2>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-muted">
            {hasClass ? (
              <span>
                Mã lớp:{' '}
                <strong
                  data-testid="active-class-join-code-badge"
                  className="font-semibold text-primary tabular-nums tracking-wide"
                >
                  {resolvedClassMeta.joinCode || '—'}
                </strong>
              </span>
            ) : (
              <span>Tạo lớp để có mã lớp gửi cho học viên.</span>
            )}
            {cleanTeacherName && (
              <>
                <span aria-hidden="true">·</span>
                <span>Giáo viên: {cleanTeacherName}</span>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
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
            className="inline-flex items-center gap-1.5 min-h-10 px-3 rounded-xl hover:bg-surface-2 text-ink-muted hover:text-ink border border-border text-xs font-medium transition-colors cursor-pointer"
          >
            <UploadCloud className="w-3.5 h-3.5 shrink-0" />
            <span>Nhập dữ liệu cũ</span>
          </button>
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={studentsList.length === 0}
            data-testid="header-export-csv-report-btn"
            className="inline-flex items-center gap-1.5 min-h-10 px-3 rounded-xl hover:bg-surface-2 text-ink-muted hover:text-ink border border-border text-xs font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-3.5 h-3.5 shrink-0" />
            <span>Xuất bảng điểm</span>
          </button>
          <button
            type="button"
            onClick={handleCreateNewClassroom}
            data-testid="create-new-classroom-btn"
            className={`inline-flex items-center gap-1.5 min-h-10 px-3.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
              hasClass
                ? 'border border-border hover:bg-surface-2 text-ink'
                : 'bg-primary hover:bg-primary-hover text-on-primary'
            }`}
          >
            <Plus className="w-3.5 h-3.5 shrink-0" />
            <span>Tạo lớp mới</span>
          </button>
        </div>
      </div>

      {/* Real numbers only */}
      <dl className="grid grid-cols-2 sm:grid-cols-4 rounded-2xl bg-surface border border-border divide-x divide-border [&>div:nth-child(n+3)]:border-t [&>div:nth-child(n+3)]:border-border sm:[&>div:nth-child(n+3)]:border-t-0">
        {[
          { label: 'Học viên', value: String(studentCount), note: studentCount === 0 ? 'Chưa có ai' : 'trong lớp' },
          {
            label: 'Bài đang giao',
            value: assignedQuestionCount > 0 ? String(assignedQuestionCount) : '—',
            note: assignedQuestionCount > 0 ? 'câu hỏi' : 'Chưa giao bài',
            testId: 'assigned-sessions-count',
          },
          {
            label: 'Đã nộp',
            value: studentCount > 0 ? `${submittedCount}/${studentCount}` : '—',
            note: 'học viên',
            testId: 'graded-sessions-count',
          },
          { label: 'Cần kèm thêm', value: String(needsSupportCount), note: 'dưới 90 điểm' },
        ].map((kpi) => (
          <div key={kpi.label} className="px-4 py-3.5 sm:px-5 sm:py-4">
            <dt className="text-xs font-medium text-ink-muted">{kpi.label}</dt>
            <dd
              data-testid={kpi.testId}
              className="mt-1 text-xl sm:text-2xl font-semibold text-ink tabular-nums"
            >
              {kpi.value}
            </dd>
            <dd className="text-xs text-ink-subtle">{kpi.note}</dd>
          </div>
        ))}
      </dl>

      {/* Dedicated Teacher Control Overview (Class List, Assigned Homework, Unsubmitted Students) */}
      <TeacherControlOverview
        studentsList={studentsList}
        activePackage={activePackage}
        assignmentTitle={assignmentTitle}
        onChangeAssignmentTitle={setAssignmentTitle}
        assignmentDueDate={assignmentDueDate}
        onChangeAssignmentDueDate={setAssignmentDueDate}
        selectedFile={selectedFile}
        onSelectFile={setSelectedFile}
        customPastedText={customPastedText}
        onChangeCustomPastedText={setCustomPastedText}
        isExtracting={isExtracting}
        onAssignUploadedFile={handleAssignUploadedFile}
        onClearAssignment={handleClearAssignment}
        successBanner={successBanner}
        assignError={assignError}
        onSwitchToStudentView={onSwitchToStudentView}
        onFilterUnsubmitted={() => {
          setStudentStatusFilter('needs_support');
          setActiveTab('grading');
        }}
        onOpenAddStudentModal={() => setIsAddStudentModalOpen(true)}
      />

      {/* Section tabs + utilities + search/filter bar */}
      <div className="space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-3 py-2.5 border-b border-border">
          <div
            role="tablist"
            aria-label="Các mục quản lý lớp"
            className="flex items-center gap-1.5 overflow-x-auto no-scrollbar"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'grading'}
              data-testid="tab-student-grading"
              onClick={() => setActiveTab('grading')}
              className={`inline-flex items-center gap-2 min-h-10 px-3.5 rounded-xl text-sm whitespace-nowrap transition-colors cursor-pointer ${
                activeTab === 'grading'
                  ? 'bg-primary-soft text-primary font-semibold'
                  : 'text-ink-muted hover:text-ink hover:bg-surface-2 font-medium'
              }`}
            >
              <Award className="w-4 h-4 shrink-0" />
              <span>Học viên &amp; điểm</span>
              <span className="text-xs tabular-nums opacity-80">({studentCount})</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'analytics'}
              data-testid="tab-reading-writing-analytics"
              onClick={() => setActiveTab('analytics')}
              className={`inline-flex items-center gap-2 min-h-10 px-3.5 rounded-xl text-sm whitespace-nowrap transition-colors cursor-pointer ${
                activeTab === 'analytics'
                  ? 'bg-primary-soft text-primary font-semibold'
                  : 'text-ink-muted hover:text-ink hover:bg-surface-2 font-medium'
              }`}
            >
              <Mic className="w-4 h-4 shrink-0" />
              <span>Luyện đọc &amp; viết</span>
              <span className="text-xs tabular-nums opacity-80">
                ({readingHistory.length + handwritingHistory.length})
              </span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              data-testid="open-lucky-wheel-btn"
              onClick={() => setIsLuckyWheelOpen(true)}
              className="inline-flex items-center gap-1.5 min-h-10 px-3 rounded-xl bg-transparent hover:bg-surface-2 text-ink-muted hover:text-ink border border-border text-xs font-medium transition-colors cursor-pointer"
            >
              <Dices className="w-3.5 h-3.5 shrink-0" />
              <span>Vòng quay gọi tên</span>
            </button>
            <button
              type="button"
              data-testid="classroom-print-worksheet-btn"
              onClick={() => setIsWorksheetModalOpen(true)}
              className="inline-flex items-center gap-1.5 min-h-10 px-3 rounded-xl bg-transparent hover:bg-surface-2 text-ink-muted hover:text-ink border border-border text-xs font-medium transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 shrink-0" />
              <span>In phiếu viết A4</span>
            </button>
            <button
              type="button"
              data-testid="open-add-student-modal-btn"
              onClick={() => setIsAddStudentModalOpen(true)}
              className="inline-flex items-center gap-1.5 min-h-10 px-3 rounded-xl bg-surface-2 hover:bg-primary-soft text-ink hover:text-primary border border-border text-xs font-semibold transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 shrink-0" />
              <span>Thêm học viên</span>
            </button>
          </div>
        </div>

        {/* Flat search & status filter bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1 min-w-0">
            <Search className="w-4 h-4 text-ink-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
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
              className="w-full min-h-10 pl-9 pr-8 py-2 rounded-xl bg-surface border border-border text-sm text-ink placeholder:text-ink-muted"
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
                className={`min-h-10 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                  studentStatusFilter === f.id
                    ? 'bg-primary-soft text-primary border border-primary/40'
                    : 'bg-surface text-ink-muted border border-border hover:text-ink hover:bg-surface-2'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {actionBanner && (
        <div
          role="status"
          className="flex items-center gap-2 text-sm text-ink-muted animate-rise-in"
          data-testid="classroom-status-banner"
        >
          <CheckCircle2 className="w-4 h-4 text-success shrink-0" aria-hidden="true" />
          <span className="leading-snug">{actionBanner}</span>
        </div>
      )}

      {activeTab === 'grading' ? (
        <ClassroomGradingGrid
          studentsList={studentsList}
          filteredStudents={filteredStudents}
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
