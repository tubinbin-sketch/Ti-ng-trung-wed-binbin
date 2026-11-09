import React, { useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Eye,
  FileText,
  Sparkles,
  Trash2,
  UploadCloud,
  UserCheck,
} from 'lucide-react';
import {
  ASSIGNMENT_TEXT_TEMPLATE,
  countAssignmentQuestions,
  UploadedAssignmentPackage,
} from '../../utils/assignmentParser';
import { isStudentNeedsSupport } from '../../utils/chineseEngine';
import { ClassStudent } from './classroomRosterData';

interface TeacherControlOverviewProps {
  studentsList: ClassStudent[];
  activePackage: UploadedAssignmentPackage;
  assignmentTitle: string;
  onChangeAssignmentTitle: (title: string) => void;
  assignmentDueDate: string;
  onChangeAssignmentDueDate: (date: string) => void;
  selectedFile: File | null;
  onSelectFile: (file: File | null) => void;
  customPastedText: string;
  onChangeCustomPastedText: (text: string) => void;
  isExtracting: boolean;
  onAssignUploadedFile: () => void;
  onClearAssignment: () => void;
  successBanner: string | null;
  assignError: string | null;
  onSwitchToStudentView?: () => void;
  onFilterUnsubmitted: () => void;
  onOpenAddStudentModal: () => void;
}

function formatDueDate(value: string): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' });
}

const inputClass =
  'w-full min-h-11 px-3 rounded-xl bg-surface-2 border border-border text-sm text-ink placeholder:text-ink-subtle';

export const TeacherControlOverview: React.FC<TeacherControlOverviewProps> = ({
  studentsList,
  activePackage,
  assignmentTitle,
  onChangeAssignmentTitle,
  assignmentDueDate,
  onChangeAssignmentDueDate,
  selectedFile,
  onSelectFile,
  customPastedText,
  onChangeCustomPastedText,
  isExtracting,
  onAssignUploadedFile,
  onClearAssignment,
  successBanner,
  assignError,
  onSwitchToStudentView,
  onFilterUnsubmitted,
  onOpenAddStudentModal,
}) => {
  const [showPasteArea, setShowPasteArea] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const totalQuestions = countAssignmentQuestions(activePackage);
  const hasAssignment = totalQuestions > 0;
  const attentionList = studentsList.filter(
    (st) => st.status === 'Chưa nộp' || isStudentNeedsSupport(st)
  );

  return (
    <div data-testid="teacher-control-overview-grid" className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Assign homework */}
      <section
        data-testid="teacher-panel-assigned-homework"
        aria-labelledby="quick-assign-heading"
        className="lg:col-span-2 rounded-2xl bg-surface border border-border p-5 space-y-4 min-w-0"
      >
        <div className="flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
          <h3 id="quick-assign-heading" className="text-sm font-semibold text-ink">
            Bài tập cho lớp
          </h3>
        </div>

        {hasAssignment ? (
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-primary-soft">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-ink truncate">{activePackage.sessionTitle}</div>
              <div className="text-xs text-ink-muted tabular-nums mt-0.5">
                {activePackage.multipleChoiceList.length} trắc nghiệm ·{' '}
                {activePackage.sentenceOrderingList.length} sắp xếp câu ·{' '}
                {activePackage.essayList.length} đặt câu
                {activePackage.dueDate ? ` · Hạn ${formatDueDate(activePackage.dueDate)}` : ''}
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {onSwitchToStudentView && (
                <button
                  type="button"
                  onClick={onSwitchToStudentView}
                  className="inline-flex items-center gap-1.5 min-h-9 px-3 rounded-lg bg-surface hover:bg-surface-2 text-primary text-xs font-semibold transition-colors cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                  Xem như học viên
                </button>
              )}
              <button
                type="button"
                onClick={onClearAssignment}
                data-testid="clear-assignment-btn"
                className="inline-flex items-center gap-1.5 min-h-9 px-3 rounded-lg hover:bg-surface text-ink-muted hover:text-accent text-xs font-medium transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                Gỡ bài
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-ink-muted">
            Chưa giao bài nào. Học viên sẽ thấy trang Bài tập trống cho tới khi bạn giao bài.
          </p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-[1fr_11rem] gap-3">
          <label className="space-y-1.5 min-w-0">
            <span className="text-xs font-medium text-ink-muted">Tên bài</span>
            <input
              type="text"
              value={assignmentTitle}
              onChange={(e) => onChangeAssignmentTitle(e.target.value)}
              placeholder="VD: Buổi 14 – Mua sắm"
              className={inputClass}
            />
          </label>
          <label className="space-y-1.5">
            <span className="text-xs font-medium text-ink-muted">Hạn nộp</span>
            <input
              type="date"
              value={assignmentDueDate}
              onChange={(e) => onChangeAssignmentDueDate(e.target.value)}
              className={inputClass}
            />
          </label>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.csv,.md,.docx"
          onChange={(e) => {
            onSelectFile(e.target.files?.[0] || null);
            e.target.value = '';
          }}
          className="hidden"
          id="assignment-file-upload-input"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
            className={`min-h-11 rounded-xl border border-dashed px-3 py-2 flex items-center gap-2 text-left transition-colors cursor-pointer min-w-0 ${
              isDragging || selectedFile
                ? 'border-primary bg-primary-soft'
                : 'border-border-strong hover:bg-surface-2'
            }`}
          >
            <UploadCloud className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
            <span className="flex-1 min-w-0 truncate text-sm text-ink">
              {selectedFile ? selectedFile.name : 'Chọn file đề (.txt, .docx)'}
            </span>
            {selectedFile && (
              <span
                role="button"
                tabIndex={0}
                aria-label="Bỏ chọn file"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectFile(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    e.stopPropagation();
                    onSelectFile(null);
                  }
                }}
                className="text-xs text-ink-muted hover:text-ink px-1"
              >
                ✕
              </span>
            )}
          </button>
          <button
            type="button"
            aria-expanded={showPasteArea}
            onClick={() => setShowPasteArea((v) => !v)}
            className={`min-h-11 rounded-xl border px-3 flex items-center gap-2 text-sm transition-colors cursor-pointer ${
              showPasteArea
                ? 'border-primary/40 bg-primary-soft text-primary font-semibold'
                : 'border-border text-ink hover:bg-surface-2'
            }`}
          >
            <FileText className="w-4 h-4 shrink-0" aria-hidden="true" />
            Dán văn bản câu hỏi
          </button>
        </div>

        {showPasteArea && (
          <div className="space-y-2 animate-rise-in">
            <label htmlFor="custom-assignment-paste-textarea" className="text-xs font-medium text-ink-muted">
              Dán câu hỏi, mỗi dòng một ý. Trắc nghiệm cần dòng "Đáp án: …"; sắp xếp câu dùng
              "Sắp xếp: 我 / 喜欢 / 你"; đặt câu dùng "Đặt câu: 温暖".
            </label>
            <textarea
              id="custom-assignment-paste-textarea"
              rows={7}
              value={customPastedText}
              onChange={(e) => onChangeCustomPastedText(e.target.value)}
              placeholder={'Câu 1: …\nA. …\nB. …\nĐáp án: A'}
              className="w-full p-3 rounded-xl bg-surface-2 border border-border text-sm text-ink placeholder:text-ink-subtle font-['Noto_Sans_SC',_inherit] leading-relaxed"
            />
            <button
              type="button"
              onClick={() => onChangeCustomPastedText(ASSIGNMENT_TEXT_TEMPLATE)}
              className="text-xs text-primary font-semibold hover:underline cursor-pointer"
            >
              Chèn mẫu để sửa
            </button>
          </div>
        )}

        {assignError && (
          <p role="alert" className="flex items-start gap-2 text-sm text-accent">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
            <span>{assignError}</span>
          </p>
        )}
        {successBanner && (
          <p role="status" className="flex items-start gap-2 text-sm text-success font-medium">
            <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
            <span>{successBanner}</span>
          </p>
        )}

        <div className="flex justify-end">
          <button
            type="button"
            disabled={isExtracting}
            onClick={onAssignUploadedFile}
            data-testid="assign-homework-btn"
            className="inline-flex items-center justify-center gap-1.5 min-h-11 px-5 rounded-xl bg-primary hover:bg-primary-hover text-on-primary text-sm font-semibold transition-colors disabled:opacity-70 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 shrink-0" aria-hidden="true" />
            {isExtracting ? 'Đang đọc đề…' : hasAssignment ? 'Giao bài mới' : 'Giao bài'}
          </button>
        </div>
      </section>

      {/* Students who need attention */}
      <section
        data-testid="teacher-panel-unsubmitted-students"
        aria-labelledby="panel-unsubmitted-heading"
        className="rounded-2xl bg-surface border border-border p-5 flex flex-col gap-3 min-w-0"
      >
        <div className="flex items-center justify-between gap-2">
          <h3 id="panel-unsubmitted-heading" className="inline-flex items-center gap-2 text-sm font-semibold text-ink">
            <AlertCircle className="w-4 h-4 text-accent shrink-0" aria-hidden="true" />
            Cần chú ý
          </h3>
          {studentsList.length > 0 && (
            <span className="text-xs text-ink-muted tabular-nums">
              {attentionList.length}/{studentsList.length}
            </span>
          )}
        </div>

        {studentsList.length === 0 ? (
          <div className="flex-1 flex flex-col items-start gap-3">
            <p className="text-sm text-ink-muted leading-relaxed">
              Lớp chưa có học viên. Thêm học viên để theo dõi ai đã nộp bài.
            </p>
            <button
              type="button"
              onClick={onOpenAddStudentModal}
              className="inline-flex items-center gap-1.5 min-h-10 px-3 rounded-xl border border-border hover:bg-surface-2 text-sm font-medium text-ink transition-colors cursor-pointer"
            >
              Thêm học viên
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
        ) : attentionList.length === 0 ? (
          <p className="flex items-center gap-2 text-sm text-success font-medium">
            <UserCheck className="w-4 h-4 shrink-0" aria-hidden="true" />
            Cả lớp đã nộp bài và đạt yêu cầu.
          </p>
        ) : (
          <>
            <ul className="divide-y divide-border max-h-56 overflow-y-auto -mx-1 px-1">
              {attentionList.map((st) => (
                <li key={st.id} className="py-2.5 flex items-center justify-between gap-2 text-sm min-w-0">
                  <span className="min-w-0 truncate text-ink">
                    {st.name} <span className="text-ink-subtle text-xs tabular-nums">{st.studentCode}</span>
                  </span>
                  <span
                    className={`shrink-0 text-xs font-medium tabular-nums ${
                      st.status === 'Chưa nộp' ? 'text-ink-muted' : 'text-warning'
                    }`}
                  >
                    {st.status === 'Chưa nộp' ? 'Chưa nộp' : `${st.totalPoints}đ`}
                  </span>
                </li>
              ))}
            </ul>
            <button
              type="button"
              data-testid="filter-unsubmitted-students-btn"
              onClick={onFilterUnsubmitted}
              className="self-start text-sm text-primary font-semibold hover:underline cursor-pointer"
            >
              Lọc trong bảng điểm
            </button>
          </>
        )}
      </section>
    </div>
  );
};
