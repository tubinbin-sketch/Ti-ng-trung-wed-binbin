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
  { num: 14, title: 'Buổi 14 - HSK 1–3: Đón Tết Trung Thu & Luyện Ngữ Pháp Đặt Câu' },
  { num: 15, title: 'Buổi 15 - HSK 1–3: Mua Sắm & Ngữ Pháp Lượng Từ Tiếng Trung' },
  { num: 16, title: 'Buổi 16 - HSK 1–3: Đi Lại, Chỉ Đường & Phương Tiện Giao Thông' },
  { num: 17, title: 'Buổi 17 - HSK 1–3: Thời Tiết & Cảm Xúc Bốn Mùa' },
];

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

  return (
    <div className="space-y-4">
      {/* 3-Column Teacher Dashboard: Danh sách lớp | Bài đã giao | Ai chưa nộp */}
      <div
        data-testid="teacher-control-overview-grid"
        className="grid grid-cols-1 lg:grid-cols-3 gap-3.5"
      >
        {/* Panel 1: Danh sách lớp */}
        <div
          data-testid="teacher-panel-class-list"
          className="rounded-2xl bg-surface border border-border p-4 shadow-2xs flex flex-col justify-between gap-3"
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-primary uppercase tracking-wider">
                <FolderKanban className="w-4 h-4 text-gold" />
                <span>1. Danh sách lớp học</span>
              </span>
              <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-bold">
                Đang hoạt động
              </span>
            </div>

            <div className="p-3 rounded-xl bg-canvas border border-border space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-bold text-ink truncate">
                  {activeClassMeta?.className || 'HSK 1–3 — Lớp Tối 246'}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-gold/20 text-ink text-xs font-bold tabular-nums shrink-0">
                  Mã: {activeClassMeta?.joinCode || '722229'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-ink-muted">
                <span>Sĩ số: <strong className="text-ink">{studentsList.length} học viên</strong></span>
                <span>19 buổi tiêu chuẩn</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={onCreateNewClassroom}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-canvas hover:bg-primary/10 text-ink border border-border text-xs font-bold transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-primary" />
              <span>Tạo lớp mới</span>
            </button>
            <button
              type="button"
              onClick={onOpenAddStudentModal}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-bold transition-colors cursor-pointer"
            >
              <Users className="w-3.5 h-3.5 text-gold" />
              <span>+ Thêm học viên</span>
            </button>
          </div>
        </div>

        {/* Panel 2: Bài đã giao */}
        <div
          data-testid="teacher-panel-assigned-homework"
          className="rounded-2xl bg-surface border border-border p-4 shadow-2xs flex flex-col justify-between gap-3"
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-primary uppercase tracking-wider">
                <BookOpen className="w-4 h-4 text-gold" />
                <span>2. Bài tập đã giao</span>
              </span>
              <span className="px-2 py-0.5 rounded-full bg-success/10 text-success text-xs font-bold tabular-nums">
                Buổi #{activePackage.sessionNumber || 14}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-canvas border border-border space-y-1.5">
              <div className="text-sm font-bold text-ink line-clamp-1">
                {activePackage.sessionTitle || 'Buổi 14 - HSK 1–3: Đón Tết Trung Thu'}
              </div>
              <div className="text-xs text-ink-muted truncate">
                Tệp đề: <strong className="text-ink">{activePackage.fileName}</strong>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5 text-xs">
                <span className="px-2 py-0.5 rounded-md bg-surface border border-border font-semibold text-ink">
                  {activePackage.multipleChoiceList.length} trắc nghiệm
                </span>
                <span className="px-2 py-0.5 rounded-md bg-surface border border-border font-semibold text-ink">
                  {activePackage.sentenceOrderingList.length} ghép câu
                </span>
                <span className="px-2 py-0.5 rounded-md bg-surface border border-border font-semibold text-ink">
                  {activePackage.essayList.length} tự luận
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 pt-1 text-xs">
            <span className="text-ink-muted">
              Tổng cộng: <strong className="text-ink">{totalQuestions} câu hỏi</strong>
            </span>
            <button
              type="button"
              onClick={() => onLoadDemoPackage(PRESET_ASSIGNMENT_BUOI_15)}
              className="px-2.5 py-1.5 rounded-xl bg-canvas hover:bg-primary/10 text-primary border border-border font-bold transition-colors cursor-pointer"
            >
              Đổi sang đề Buổi 15
            </button>
          </div>
        </div>

        {/* Panel 3: Ai chưa nộp / Cần đôn đốc */}
        <div
          data-testid="teacher-panel-unsubmitted-students"
          className="rounded-2xl bg-surface border border-border p-4 shadow-2xs flex flex-col justify-between gap-3"
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-accent uppercase tracking-wider">
                <AlertCircle className="w-4 h-4 text-accent" />
                <span>3. Ai chưa nộp / Cần kèm</span>
              </span>
              <span className="px-2 py-0.5 rounded-full bg-warning/15 text-warning text-xs font-bold tabular-nums">
                {pendingOrNeedsSupportStudents.length}/{studentsList.length} HV
              </span>
            </div>

            {studentsList.length === 0 ? (
              <div className="p-3 rounded-xl bg-canvas border border-dashed border-border text-xs text-ink-muted">
                Lớp hiện chưa có học viên. Hãy thêm học viên để theo dõi tiến độ nộp bài.
              </div>
            ) : pendingOrNeedsSupportStudents.length === 0 ? (
              <div className="p-3 rounded-xl bg-success/10 border border-success/30 text-xs text-success font-semibold flex items-center gap-2">
                <UserCheck className="w-4 h-4 shrink-0" />
                <span>100% học viên ({submittedStudents.length} người) đã nộp bài đầy đủ!</span>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
                {pendingOrNeedsSupportStudents.map((st) => (
                  <div
                    key={st.id}
                    className="px-2.5 py-1.5 rounded-xl bg-canvas border border-border flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="min-w-0">
                      <span className="font-bold text-ink truncate block">
                        {st.name} ({st.studentCode})
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-warning/15 text-warning font-bold shrink-0">
                      {st.status === 'Chưa nộp' ? 'Chưa nộp' : `${st.totalPoints}đ · Cần kèm`}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-2 pt-1 text-xs">
            <span className="text-ink-muted">
              Đã hoàn thành: <strong className="text-success">{submittedStudents.length} HV</strong>
            </span>
            <button
              type="button"
              data-testid="filter-unsubmitted-students-btn"
              onClick={onFilterUnsubmitted}
              className="px-2.5 py-1.5 rounded-xl bg-accent/10 hover:bg-accent/20 text-accent font-bold transition-colors cursor-pointer"
            >
              Xem danh sách cần kèm
            </button>
          </div>
        </div>
      </div>

      {/* Quick Assignment Upload & AI Extraction Bar */}
      <div className="rounded-2xl bg-canvas border border-gold/45 p-4 shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2.5 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary text-white flex items-center justify-center shrink-0">
              <UploadCloud className="w-4 h-4 text-gold" />
            </div>
            <h4 className="text-sm font-bold text-ink">
              📤 Giao Bài Tập Nhanh (Tự Động Bóc Đề)
            </h4>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onLoadDemoPackage(PRESET_ASSIGNMENT_BUOI_14)}
              className="px-2.5 py-1.5 rounded-lg bg-surface border border-border hover:border-primary text-xs font-bold text-ink transition-all flex items-center gap-1 cursor-pointer"
            >
              <FileType className="w-3.5 h-3.5 text-gold" />
              <span>⚡ Đề mẫu Buổi 14</span>
            </button>
            <button
              type="button"
              onClick={() => onLoadDemoPackage(PRESET_ASSIGNMENT_BUOI_15)}
              className="px-2.5 py-1.5 rounded-lg bg-surface border border-border hover:border-primary text-xs font-bold text-ink transition-all flex items-center gap-1 cursor-pointer"
            >
              <FileCode className="w-3.5 h-3.5 text-gold" />
              <span>⚡ Đề mẫu Buổi 15</span>
            </button>
            <button
              type="button"
              onClick={() => setShowPasteArea((v) => !v)}
              className={`px-2.5 py-1.5 rounded-lg border text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                showPasteArea
                  ? 'bg-primary text-white border-primary'
                  : 'bg-surface border-border text-ink-muted hover:text-ink'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-gold" />
              <span>📝 Dán văn bản</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-center">
          <div className="md:col-span-4">
            <select
              aria-label="Chọn buổi học để giao bài tập"
              value={selectedSessionNumber}
              onChange={(e) => onSelectSessionNumber(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs text-ink font-semibold"
            >
              {SESSION_OPTIONS.map((opt) => (
                <option key={opt.num} value={opt.num}>
                  {opt.title}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-5">
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
              className={`w-full cursor-pointer rounded-xl border border-dashed py-2 px-3 flex items-center justify-between gap-2 transition-all text-left ${
                isDragging
                  ? 'border-gold bg-primary/10'
                  : selectedFile
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-gold bg-surface'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="w-4 h-4 text-gold shrink-0" />
                <span className="text-xs font-medium text-ink truncate">
                  {selectedFile
                    ? `${selectedFile.name} · ${(selectedFile.size / 1024).toFixed(1)} KB`
                    : activePackage.fileName
                    ? `${activePackage.fileName} · ${totalQuestions} câu`
                    : 'Chọn file hoặc kéo thả đề (.docx, .pdf, .txt)'}
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-lg bg-primary/10 text-primary text-xs font-bold whitespace-nowrap shrink-0">
                {selectedFile ? 'Đổi file' : 'Duyệt file'}
              </span>
            </button>
          </div>

          <div className="md:col-span-3">
            <button
              type="button"
              disabled={isExtracting}
              onClick={onAssignUploadedFile}
              className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3.5 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-bold transition-all shadow-2xs whitespace-nowrap disabled:opacity-75 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-gold shrink-0" />
              <span>{isExtracting ? 'Đang phân tích đề...' : '✨ Giao bài ngay'}</span>
            </button>
          </div>
        </div>

        {showPasteArea && (
          <div className="pt-2 border-t border-border space-y-1.5">
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
              className="w-full p-2.5 rounded-xl bg-surface border border-border text-sm text-ink placeholder:text-ink-muted"
            />
          </div>
        )}

        {successBanner && (
          <div className="p-2.5 rounded-xl bg-success/10 border border-success/30 text-xs text-ink flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
              <span className="font-bold text-ink truncate">{successBanner}</span>
            </div>
            {onSwitchToStudentView && (
              <button
                type="button"
                onClick={onSwitchToStudentView}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-white text-xs font-bold transition-all shrink-0 cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5 text-gold" />
                <span>Xem góc nhìn Học sinh</span>
                <ArrowRight className="w-3 h-3 text-white/70" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
