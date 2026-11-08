import React, { useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Eye,
  FileCode,
  FileText,
  FileType,
  FolderKanban,
  Plus,
  Sparkles,
  UploadCloud,
  UserCheck,
  Users,
} from 'lucide-react';
import {
  PRESET_ASSIGNMENT_BUOI_14,
  PRESET_ASSIGNMENT_BUOI_15,
  UploadedAssignmentPackage,
} from '../../utils/assignmentParser';
import { isStudentNeedsSupport } from '../../utils/chineseEngine';
import { ActiveClassroomSession } from '../../utils/storageService';
import { ClassStudent } from './classroomRosterData';

interface TeacherControlOverviewProps {
  activeClassMeta: ActiveClassroomSession | null;
  studentsList: ClassStudent[];
  activePackage: UploadedAssignmentPackage;
  selectedSessionNumber: number;
  onSelectSessionNumber: (num: number) => void;
  selectedFile: File | null;
  onSelectFile: (file: File | null) => void;
  customPastedText: string;
  onChangeCustomPastedText: (text: string) => void;
  isExtracting: boolean;
  onAssignUploadedFile: () => void;
  onLoadDemoPackage: (pkg: UploadedAssignmentPackage) => void;
  successBanner: string | null;
  onSwitchToStudentView?: () => void;
  onCreateNewClassroom: () => void;
  onFilterUnsubmitted: () => void;
  onOpenAddStudentModal: () => void;
}

const SESSION_OPTIONS = [
  { num: 14, title: 'Buổi 14 · Đón Tết Trung Thu & Ngữ Pháp Đặt Câu' },
  { num: 15, title: 'Buổi 15 · Mua Sắm & Ngữ Pháp Lượng Từ' },
  { num: 16, title: 'Buổi 16 · Đi Lại, Chỉ Đường & Giao Thông' },
  { num: 17, title: 'Buổi 17 · Thời Tiết & Cảm Xúc Bốn Mùa' },
];

function formatMiddleEllipsis(text: string, maxLen = 30): string {
  if (!text || text.length <= maxLen) return text;
  const extIdx = text.lastIndexOf('.');
  if (extIdx > 0 && text.length - extIdx <= 6) {
    const ext = text.slice(extIdx);
    const base = text.slice(0, extIdx);
    const budget = Math.max(8, maxLen - ext.length - 1);
    const keepEnd = Math.min(4, Math.max(3, Math.floor(budget * 0.35)));
    const keepStart = Math.max(5, budget - keepEnd);
    return `${base.slice(0, keepStart)}…${base.slice(-keepEnd)}${ext}`;
  }
  const head = Math.ceil((maxLen - 1) * 0.65);
  const tail = Math.max(4, maxLen - 1 - head);
  return `${text.slice(0, head)}…${text.slice(-tail)}`;
}

export const TeacherControlOverview: React.FC<TeacherControlOverviewProps> = ({
  activeClassMeta,
  studentsList,
  activePackage,
  selectedSessionNumber,
  onSelectSessionNumber,
  selectedFile,
  onSelectFile,
  customPastedText,
  onChangeCustomPastedText,
  isExtracting,
  onAssignUploadedFile,
  onLoadDemoPackage,
  successBanner,
  onSwitchToStudentView,
  onCreateNewClassroom,
  onFilterUnsubmitted,
  onOpenAddStudentModal,
}) => {
  const [showPasteArea, setShowPasteArea] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const pendingOrNeedsSupportStudents = studentsList.filter(
    (st) => isStudentNeedsSupport(st) || st.status === 'Chưa nộp'
  );
  const submittedStudents = studentsList.filter(
    (st) => !isStudentNeedsSupport(st) && st.status !== 'Chưa nộp'
  );

  const totalQuestions =
    (activePackage?.multipleChoiceList?.length || 0) +
    (activePackage?.sentenceOrderingList?.length || 0) +
    (activePackage?.essayList?.length || 0);

  const displayClassName =
    activeClassMeta?.className || 'Lớp HSK 3.0 Bản Demo (Offline)';
  const displayJoinCode = activeClassMeta?.joinCode || 'DEMO-HSK3';
  const displayFileName = selectedFile
    ? selectedFile.name
    : activePackage.fileName || 'De_On_Tap_Buoi_14_HSK1-3.docx';

  return (
    <div className="space-y-4">
      {/* 3-Column Teacher Dashboard: Single surface per column, zero nested cards */}
      <div
        data-testid="teacher-control-overview-grid"
        className="grid grid-cols-1 lg:grid-cols-3 gap-4"
      >
        {/* Panel 1: Danh sách lớp */}
        <section
          data-testid="teacher-panel-class-list"
          aria-labelledby="panel-class-list-heading"
          className="rounded-2xl bg-surface border border-border p-5 flex flex-col justify-between gap-4 min-w-0"
        >
          <div className="space-y-3 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h3
                id="panel-class-list-heading"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary"
              >
                <FolderKanban className="w-4 h-4 text-gold shrink-0" />
                <span>1. Danh sách lớp học</span>
              </h3>
              <span className="text-xs font-semibold text-primary">
                ● Đang hoạt động
              </span>
            </div>

            <div className="pt-3 border-t border-border space-y-2 min-w-0">
              <div
                className="text-base font-semibold text-ink leading-snug line-clamp-2 break-words"
                title={displayClassName}
              >
                {displayClassName}
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted">
                <span>
                  Mã lớp: <strong className="text-gold font-semibold tabular-nums">{displayJoinCode}</strong>
                </span>
                <span>·</span>
                <span>
                  Sĩ số: <strong className="text-ink tabular-nums">{studentsList.length} học viên</strong>
                </span>
                <span>·</span>
                <span>19 buổi tiêu chuẩn</span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-border flex items-center gap-2">
            <button
              type="button"
              onClick={onCreateNewClassroom}
              className="flex-1 inline-flex items-center justify-center gap-1.5 min-h-10 px-3 py-2 rounded-xl bg-transparent hover:bg-surface-2 text-ink-muted hover:text-ink border border-border text-xs font-medium transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-primary shrink-0" />
              <span>Tạo lớp mới</span>
            </button>
            <button
              type="button"
              onClick={onOpenAddStudentModal}
              className="flex-1 inline-flex items-center justify-center gap-1.5 min-h-10 px-3 py-2 rounded-xl bg-surface-2 hover:bg-primary-soft text-ink hover:text-primary border border-border text-xs font-semibold transition-colors cursor-pointer"
            >
              <Users className="w-3.5 h-3.5 shrink-0" />
              <span>+ Thêm học viên</span>
            </button>
          </div>
        </section>

        {/* Panel 2: Bài đã giao */}
        <section
          data-testid="teacher-panel-assigned-homework"
          aria-labelledby="panel-assigned-homework-heading"
          className="rounded-2xl bg-surface border border-border p-5 flex flex-col justify-between gap-4 min-w-0"
        >
          <div className="space-y-3 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h3
                id="panel-assigned-homework-heading"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary"
              >
                <BookOpen className="w-4 h-4 text-gold shrink-0" />
                <span>2. Bài tập đã giao</span>
              </h3>
              <span className="text-xs font-semibold text-success tabular-nums">
                Buổi #{activePackage.sessionNumber || 14}
              </span>
            </div>

            <div className="pt-3 border-t border-border space-y-1.5 min-w-0">
              <div
                className="text-sm font-semibold text-ink leading-snug line-clamp-2"
                title={activePackage.sessionTitle || 'Buổi 14 - HSK 1–3: Đón Tết Trung Thu'}
              >
                {activePackage.sessionTitle || 'Buổi 14 - HSK 1–3: Đón Tết Trung Thu'}
              </div>
              <div
                className="text-xs text-ink-muted leading-snug"
                title={activePackage.fileName}
              >
                Tệp đề:{' '}
                <strong className="text-ink font-medium">
                  {formatMiddleEllipsis(activePackage.fileName, 24)}
                </strong>
              </div>
              <div className="text-xs text-ink-subtle tabular-nums pt-0.5">
                {activePackage.multipleChoiceList.length} trắc nghiệm ·{' '}
                {activePackage.sentenceOrderingList.length} ghép câu ·{' '}
                {activePackage.essayList.length} tự luận
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-border flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="text-ink-muted tabular-nums">
              Tổng: <strong className="text-ink">{totalQuestions} câu hỏi</strong>
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                data-testid="add-sample-assignment-btn"
                onClick={() => onLoadDemoPackage(PRESET_ASSIGNMENT_BUOI_14)}
                className="min-h-9 px-2.5 py-1.5 rounded-xl bg-transparent hover:bg-surface-2 text-primary border border-border font-semibold transition-colors cursor-pointer"
              >
                + Thêm bài mẫu
              </button>
              <button
                type="button"
                onClick={() => onLoadDemoPackage(PRESET_ASSIGNMENT_BUOI_15)}
                className="min-h-9 px-2.5 py-1.5 rounded-xl bg-transparent hover:bg-surface-2 text-ink-muted hover:text-ink border border-border font-medium transition-colors cursor-pointer"
              >
                Đề Buổi 15
              </button>
            </div>
          </div>
        </section>

        {/* Panel 3: Ai chưa nộp / Cần kèm — Flat rows with hairline dividers, zero nested cards */}
        <section
          data-testid="teacher-panel-unsubmitted-students"
          aria-labelledby="panel-unsubmitted-heading"
          className="rounded-2xl bg-surface border border-border p-5 flex flex-col justify-between gap-4 min-w-0"
        >
          <div className="space-y-3 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h3
                id="panel-unsubmitted-heading"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent"
              >
                <AlertCircle className="w-4 h-4 text-accent shrink-0" />
                <span>3. Ai chưa nộp / Cần kèm</span>
              </h3>
              <span className="text-xs font-semibold text-warning tabular-nums">
                {pendingOrNeedsSupportStudents.length}/{studentsList.length} HV
              </span>
            </div>

            {studentsList.length === 0 ? (
              <p className="pt-3 border-t border-border text-xs text-ink-muted leading-relaxed">
                Lớp hiện chưa có học viên. Hãy thêm học viên để theo dõi tiến độ nộp bài.
              </p>
            ) : pendingOrNeedsSupportStudents.length === 0 ? (
              <div className="pt-3 border-t border-border text-xs text-success font-semibold flex items-center gap-2">
                <UserCheck className="w-4 h-4 shrink-0" />
                <span>100% học viên ({submittedStudents.length} người) đã nộp bài đầy đủ!</span>
              </div>
            ) : (
              <ul className="border-t border-border divide-y divide-border max-h-36 overflow-y-auto pr-1">
                {pendingOrNeedsSupportStudents.map((st) => (
                  <li
                    key={st.id}
                    className="py-2.5 flex items-center justify-between gap-2 text-xs min-w-0"
                    title={`${st.name} (${st.studentCode}) — ${st.status === 'Chưa nộp' ? 'Chưa nộp' : `${st.totalPoints}đ · Cần kèm`}`}
                  >
                    <span className="font-medium text-ink min-w-0 flex-1 leading-snug break-words">
                      {st.name}{' '}
                      <span className="text-ink-subtle tabular-nums">({st.studentCode})</span>
                    </span>
                    <span className="text-warning font-semibold tabular-nums shrink-0">
                      {st.status === 'Chưa nộp' ? 'Chưa nộp' : `${st.totalPoints}đ · Cần kèm`}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="pt-3 border-t border-border flex items-center justify-between gap-2 text-xs">
            <span className="text-ink-muted tabular-nums">
              Đã hoàn thành: <strong className="text-success">{submittedStudents.length} HV</strong>
            </span>
            <button
              type="button"
              data-testid="filter-unsubmitted-students-btn"
              onClick={onFilterUnsubmitted}
              className="min-h-9 px-2.5 py-1.5 rounded-xl bg-transparent hover:bg-surface-2 text-accent border border-border font-semibold transition-colors cursor-pointer"
            >
              Xem danh sách cần kèm
            </button>
          </div>
        </section>
      </div>

      {/* Quick Assignment Upload & AI Extraction Bar — Single card surface, h3 heading */}
      <section
        aria-labelledby="quick-assign-heading"
        className="rounded-2xl bg-surface border border-border p-5 space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-2.5 pb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <UploadCloud className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
            <h3 id="quick-assign-heading" className="text-sm font-semibold text-ink">
              Giao Bài Tập Nhanh (Tự Động Bóc Đề)
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onLoadDemoPackage(PRESET_ASSIGNMENT_BUOI_14)}
              className="min-h-9 px-2.5 py-1.5 rounded-xl bg-transparent border border-border hover:bg-surface-2 text-xs font-medium text-ink transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <FileType className="w-3.5 h-3.5 text-gold shrink-0" />
              <span>Đề mẫu Buổi 14</span>
            </button>
            <button
              type="button"
              onClick={() => onLoadDemoPackage(PRESET_ASSIGNMENT_BUOI_15)}
              className="min-h-9 px-2.5 py-1.5 rounded-xl bg-transparent border border-border hover:bg-surface-2 text-xs font-medium text-ink transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <FileCode className="w-3.5 h-3.5 text-gold shrink-0" />
              <span>Đề mẫu Buổi 15</span>
            </button>
            <button
              type="button"
              onClick={() => setShowPasteArea((v) => !v)}
              className={`min-h-9 px-2.5 py-1.5 rounded-xl border text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                showPasteArea
                  ? 'bg-primary-soft text-primary border-primary/40 font-semibold'
                  : 'bg-transparent border-border text-ink-muted hover:text-ink hover:bg-surface-2'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-gold shrink-0" />
              <span>Dán văn bản</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-center">
          <div className="lg:col-span-5 min-w-0">
            <select
              aria-label="Chọn buổi học để giao bài tập"
              value={selectedSessionNumber}
              onChange={(e) => onSelectSessionNumber(Number(e.target.value))}
              title={
                SESSION_OPTIONS.find((o) => o.num === selectedSessionNumber)?.title ||
                `Buổi ${selectedSessionNumber}`
              }
              className="w-full min-h-11 px-3 py-2 rounded-xl bg-surface-2 border border-border text-xs text-ink font-medium"
            >
              {SESSION_OPTIONS.map((opt) => (
                <option key={opt.num} value={opt.num}>
                  {opt.title}
                </option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-4 min-w-0">
            <input
              ref={fileInputRef}
              type="file"
              accept=".docx,.doc,.pdf,.txt,.csv"
              onChange={(e) => {
                if (e.target.files?.[0]) onSelectFile(e.target.files[0]);
              }}
              className="hidden"
              id="assignment-file-upload-input"
            />
            <button
              type="button"
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                if (e.dataTransfer.files?.[0]) onSelectFile(e.dataTransfer.files[0]);
              }}
              onClick={() => fileInputRef.current?.click()}
              title={
                selectedFile
                  ? `${selectedFile.name} (${(selectedFile.size / 1024).toFixed(1)} KB)`
                  : activePackage.fileName
                  ? `${activePackage.fileName} (${totalQuestions} câu hỏi)`
                  : 'Chọn file hoặc kéo thả đề (.docx, .pdf, .txt)'
              }
              className={`w-full min-h-11 cursor-pointer rounded-xl border border-dashed py-2 px-3 flex items-center justify-between gap-2 transition-colors text-left min-w-0 ${
                isDragging
                  ? 'border-border-strong bg-primary-soft'
                  : selectedFile
                  ? 'border-primary bg-primary-soft/50'
                  : 'border-border hover:border-border-strong bg-transparent'
              }`}
            >
              <span className="flex items-center gap-2 min-w-0 flex-1">
                <FileText className="w-4 h-4 text-gold shrink-0" />
                <span className="text-xs font-medium text-ink whitespace-nowrap">
                  {selectedFile
                    ? formatMiddleEllipsis(selectedFile.name, 19)
                    : activePackage.fileName
                    ? formatMiddleEllipsis(displayFileName, 19)
                    : 'Chọn hoặc kéo thả đề (.docx, .pdf)'}
                </span>
              </span>
              <span className="text-primary text-xs font-semibold whitespace-nowrap shrink-0">
                {selectedFile ? 'Đổi file' : 'Duyệt file'}
              </span>
            </button>
          </div>

          <div className="lg:col-span-3">
            <button
              type="button"
              disabled={isExtracting}
              onClick={onAssignUploadedFile}
              className="w-full min-h-11 inline-flex items-center justify-center gap-1.5 py-2 px-4 rounded-xl bg-primary hover:bg-primary-hover text-on-primary text-xs font-semibold transition-colors whitespace-nowrap disabled:opacity-75 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span>{isExtracting ? 'Đang phân tích đề...' : 'Giao bài ngay'}</span>
            </button>
          </div>
        </div>

        {showPasteArea && (
          <div className="pt-3 border-t border-border space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-ink">
              <label htmlFor="custom-assignment-paste-textarea">
                Dán trực tiếp câu hỏi trắc nghiệm, ghép câu hoặc tự luận tiếng Trung:
              </label>
              <button
                type="button"
                onClick={() => setShowPasteArea(false)}
                className="text-xs text-ink-muted hover:underline cursor-pointer"
              >
                Đóng
              </button>
            </div>
            <textarea
              id="custom-assignment-paste-textarea"
              rows={2}
              value={customPastedText}
              onChange={(e) => onChangeCustomPastedText(e.target.value)}
              placeholder="Dán câu hỏi trắc nghiệm, bài tập điền từ hoặc tự luận tiếng Trung vào đây..."
              className="w-full p-2.5 rounded-xl bg-surface-2 border border-border text-sm text-ink placeholder:text-ink-muted"
            />
          </div>
        )}

        {successBanner && (
          <div className="pt-3 border-t border-border text-xs text-ink flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
              <span className="font-semibold text-ink leading-snug">{successBanner}</span>
            </div>
            {onSwitchToStudentView && (
              <button
                type="button"
                onClick={onSwitchToStudentView}
                className="inline-flex items-center justify-center gap-1.5 min-h-9 px-3 py-1.5 rounded-lg bg-surface-2 hover:bg-primary-soft text-primary text-xs font-semibold transition-colors shrink-0 cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Xem góc nhìn Học sinh</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
        )}
      </section>
    </div>
  );
};
