import React from 'react';
import { RefreshCw, Trash2, Users } from 'lucide-react';
import { isStudentNeedsSupport } from '../../utils/chineseEngine';
import { Dialog } from '../ui/Dialog';
import { EmptyState } from '../ui/EmptyState';
import { ClassStudent, DEFAULT_STUDENTS } from './classroomRosterData';

interface ClassroomGradingGridProps {
  studentsList: ClassStudent[];
  filteredStudents: ClassStudent[];
  onRestoreDefaultStudents: () => void;
  onResetFilters: () => void;
  onOpenAddStudentModal: () => void;
  onDeleteStudentClick: (student: ClassStudent, e?: React.MouseEvent) => void;
  onReissueStudentCode?: (student: ClassStudent) => void;
  onAwardBonusPoints: (studentId: string, bonusPoints: number, reason: string) => void;
  studentToDelete: ClassStudent | null;
  onCloseDeleteModal: () => void;
  onConfirmDeleteStudent: () => void;
}

export const ClassroomGradingGrid: React.FC<ClassroomGradingGridProps> = ({
  studentsList,
  filteredStudents,
  onRestoreDefaultStudents,
  onResetFilters,
  onOpenAddStudentModal,
  onDeleteStudentClick,
  onReissueStudentCode,
  onAwardBonusPoints,
  studentToDelete,
  onCloseDeleteModal,
  onConfirmDeleteStudent,
}) => {
  return (
    <>
      <section className="space-y-4 pb-12" aria-labelledby="grading-grid-heading">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border">
          <div>
            <h3 id="grading-grid-heading" className="text-sm font-semibold text-ink">
              Kết quả tự động chấm bài tập về nhà (HSK 1–3) — Hiển thị: {filteredStudents.length}/{studentsList.length} học viên
            </h3>
            <p className="text-xs text-ink-muted mt-0.5 max-w-[65ch]">
              Bấm &ldquo;Thêm học viên&rdquo; để cấp Mã học viên (HV-001...) hoặc &ldquo;Xuất bảng điểm (CSV)&rdquo; để tải về máy.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-success font-semibold">
              ● 100% Đã chấm tự động
            </span>
            {studentsList.length < DEFAULT_STUDENTS.length && (
              <button
                type="button"
                onClick={onRestoreDefaultStudents}
                className="text-xs text-gold hover:text-ink font-semibold underline underline-offset-2 transition-colors cursor-pointer"
              >
                Khôi phục {DEFAULT_STUDENTS.length} học viên ban đầu
              </button>
            )}
          </div>
        </div>

        {filteredStudents.length === 0 ? (
          studentsList.length === 0 ? (
            <EmptyState
              testId="empty-state-zero-students"
              icon={<Users className="w-7 h-7" />}
              title="Lớp học chưa có học viên nào"
              description="Hãy bấm '+ Thêm học viên mới' để cấp mã học viên (HV-001...) cho học sinh thực tế hoặc nạp danh sách 12 học viên mẫu để trải nghiệm thử."
              actionLabel="+ Thêm học viên đầu tiên"
              onAction={onOpenAddStudentModal}
              secondaryActionLabel={`Khôi phục ${DEFAULT_STUDENTS.length} học viên mẫu`}
              onSecondaryAction={onRestoreDefaultStudents}
            />
          ) : (
            <EmptyState
              testId="empty-state-filtered-students"
              icon={<Users className="w-7 h-7" />}
              title="Không tìm thấy học viên phù hợp với bộ lọc"
              description="Hãy thử từ khóa tìm kiếm khác hoặc đặt lại bộ lọc trạng thái về 'Tất cả'."
              actionLabel={`Xem tất cả học viên (${studentsList.length})`}
              onAction={onResetFilters}
            />
          )
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {filteredStudents.map((st) => {
              const needsSupport = isStudentNeedsSupport(st);
              return (
                <div
                  key={st.id || st.name}
                  className="rounded-2xl bg-surface border border-border hover:border-border-strong p-4 space-y-2.5 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <span className="font-semibold text-sm text-ink block leading-snug">
                        {st.name}
                      </span>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1 text-xs font-medium text-ink-muted tabular-nums">
                        <span className="text-primary font-semibold">
                          {st.studentCode || 'HV-001'}
                        </span>
                        <span>·</span>
                        <span className="text-gold font-semibold">
                          {st.hskLevel || 'HSK 2'}
                        </span>
                        <span>·</span>
                        <span className="font-bold text-ink">
                          {st.totalPoints}đ
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className={`text-xs font-semibold ${
                          needsSupport ? 'text-warning' : 'text-success'
                        }`}
                      >
                        {needsSupport ? 'Cần kèm thêm' : 'Đã hoàn thành'}
                      </span>
                      {onReissueStudentCode && (
                        <button
                          type="button"
                          data-testid={`reissue-code-btn-${st.id}`}
                          onClick={() => onReissueStudentCode(st)}
                          title="Gỡ liên kết thiết bị cũ và cấp lại mã học viên"
                          className="inline-flex items-center gap-1 min-h-8 px-2 py-0.5 rounded-lg text-primary hover:bg-primary-soft border border-border text-xs font-medium transition-colors cursor-pointer"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>Cấp lại mã</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(e) => onDeleteStudentClick(st, e)}
                        aria-label={`Xóa học viên ${st.name}`}
                        className="inline-flex items-center gap-1 min-h-8 px-2 py-0.5 rounded-lg text-danger hover:bg-danger/10 border border-border text-xs font-medium transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Xóa</span>
                      </button>
                    </div>
                  </div>

                  <div className="text-xs text-ink-muted space-y-1 tabular-nums pt-2 border-t border-border">
                    <div>
                      Từ vựng: <strong className="text-ink">{st.vocabScore}</strong>
                    </div>
                    <div>
                      Tập viết Hán tự: <strong className="text-ink">{st.writingScore}</strong>
                    </div>
                    <div>
                      Quiz ngữ pháp: <strong className="text-ink">{st.quizScore}</strong>
                    </div>
                    <div className="flex flex-wrap items-center gap-1 pt-0.5">
                      <span className="text-xs text-ink-muted">Từ vựng cần ôn:</span>
                      {st.reviewWords && st.reviewWords.length > 0 ? (
                        st.reviewWords.map((word) => (
                          <span
                            key={word}
                            lang="zh-CN"
                            className="text-warning text-xs font-bold font-hanzi"
                          >
                            {word}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs font-semibold text-success">
                          Đã thuộc hết
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="pt-2.5 border-t border-border flex items-center justify-between gap-2">
                    <p className="text-xs text-ink-muted line-clamp-2 flex-1 leading-snug">
                      Nhận xét tự động: {st.feedback}
                    </p>
                    <button
                      type="button"
                      data-testid={`quick-bonus-btn-${st.id}`}
                      onClick={() =>
                        onAwardBonusPoints(
                          st.id,
                          5,
                          'Phát biểu xây dựng bài trên lớp'
                        )
                      }
                      className="min-h-8 px-2.5 py-1 rounded-lg bg-surface-2 hover:bg-primary text-ink hover:text-on-primary border border-border text-xs font-semibold transition-colors shrink-0 cursor-pointer"
                    >
                      +5đ thưởng
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Accessible Dialog: Confirm Student Deletion */}
      <Dialog
        isOpen={Boolean(studentToDelete)}
        onClose={onCloseDeleteModal}
        title="Xác nhận xóa học viên khỏi lớp"
        maxWidthClass="max-w-md"
      >
        {studentToDelete && (
          <div className="p-5 sm:p-6 flex flex-col space-y-4 bg-surface text-ink rounded-3xl border border-border">
            <div className="flex items-center gap-3">
              <Trash2 className="w-5 h-5 text-danger shrink-0" />
              <div>
                <h3 className="text-base font-bold text-ink">
                  Xác nhận xóa học viên
                </h3>
                <p className="text-xs text-ink-muted">
                  Lớp HSK 1–3 · Thao tác quản lý lớp
                </p>
              </div>
            </div>

            <div className="py-3 border-y border-border space-y-1">
              <p className="text-xs text-ink-muted">
                Bạn có chắc chắn muốn xóa học viên khỏi danh sách lớp?
              </p>
              <p className="text-base font-bold text-danger">
                {studentToDelete.name}
              </p>
              <div className="text-xs text-ink-muted pt-1.5 flex items-center justify-between tabular-nums">
                <span>
                  Điểm tổng kết: <strong className="text-ink">{studentToDelete.totalPoints || 95}đ</strong>
                </span>
                <span>
                  Từ vựng: <strong className="text-ink">{studentToDelete.vocabScore}</strong>
                </span>
              </div>
            </div>

            <p className="text-xs text-ink-muted leading-relaxed">
              ⚠️ Học viên này sẽ bị xóa khỏi danh sách lớp và sĩ số sẽ tự động giảm tương ứng.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                onClick={onCloseDeleteModal}
                className="min-h-10 px-4 py-2 rounded-xl bg-transparent hover:bg-surface-2 border border-border text-xs font-semibold text-ink transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={onConfirmDeleteStudent}
                className="inline-flex items-center gap-1.5 min-h-10 px-4 py-2 rounded-xl bg-danger hover:bg-danger/90 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xác nhận xóa</span>
              </button>
            </div>
          </div>
        )}
      </Dialog>
    </>
  );
};
