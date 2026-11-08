import React from 'react';
import { AlertCircle, CheckCircle2, FileText, RotateCcw, Sparkles, Trash2 } from 'lucide-react';
import { ClassSession } from '../../data/chineseData';
import { Dialog } from '../ui/Dialog';
import { ClassStudent } from './classroomRosterData';

interface ClassroomScheduleTableProps {
  sessions: ClassSession[];
  studentsList: ClassStudent[];
  selectedReportSession: ClassSession | null;
  onSelectReportSession: (session: ClassSession | null) => void;
  onRegradeSession: (session: ClassSession) => void;
  onDeleteStudentClick: (student: ClassStudent, e?: React.MouseEvent) => void;
}

export const ClassroomScheduleTable: React.FC<ClassroomScheduleTableProps> = ({
  sessions,
  studentsList,
  selectedReportSession,
  onSelectReportSession,
  onRegradeSession,
  onDeleteStudentClick,
}) => {
  return (
    <>
      <section aria-labelledby="schedule-table-heading">
        <h3 id="schedule-table-heading" className="sr-only">
          Lịch trình và tiến độ chấm bài 19 buổi học
        </h3>

        {/* Desktop & Tablet Table View (md and up) */}
        <div className="hidden md:block overflow-x-auto rounded-2xl border border-border bg-surface">
          <table className="w-full table-auto text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border bg-surface-2/60 text-ink-muted">
                <th className="py-3.5 px-4 font-semibold whitespace-nowrap">Buổi</th>
                <th className="py-3.5 px-4 font-semibold whitespace-nowrap">Ngày học</th>
                <th className="py-3.5 px-4 font-semibold">Tên bài giảng (Việt · Trung)</th>
                <th className="py-3.5 px-4 font-semibold hidden lg:table-cell whitespace-nowrap">Người dạy</th>
                <th className="py-3.5 px-4 font-semibold whitespace-nowrap">Giáo án</th>
                <th className="py-3.5 px-4 font-semibold whitespace-nowrap">Trạng thái chấm bài</th>
                <th className="py-3.5 px-4 font-semibold text-right whitespace-nowrap">Thao tác tự động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sessions.map((session) => {
                const needsGrading = !session.autoGraded && session.submissionsCount > 0;
                return (
                  <tr key={session.id} className="hover:bg-surface-2/40 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-ink tabular-nums whitespace-nowrap">
                      #{session.sessionNumber}
                    </td>
                    <td className="py-3.5 px-4 text-ink-muted whitespace-nowrap tabular-nums">
                      {session.dateLabel}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-sm text-ink leading-snug">
                        {session.lessonTitle}
                      </div>
                      <div lang="zh-CN" className="font-hanzi text-xs text-ink-muted mt-0.5">
                        {session.chineseTitle}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-ink-muted hidden lg:table-cell whitespace-nowrap">
                      {session.instructor}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-primary tabular-nums">
                        <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span>{session.slideCount} Slide</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => onSelectReportSession(session)}
                        title={`${session.submissionsCount}/${session.totalStudents} bài đã chấm`}
                        className="inline-flex items-center gap-1.5 min-h-9 px-2 py-1 rounded-lg text-xs font-semibold text-gold hover:text-ink hover:bg-surface-2 transition-colors cursor-pointer tabular-nums"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-gold shrink-0" />
                        <span>{session.submissionsCount}/{session.totalStudents} đã chấm</span>
                      </button>
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5 justify-end">
                        <button
                          type="button"
                          onClick={() => onSelectReportSession(session)}
                          className="inline-flex items-center gap-1 min-h-9 px-2.5 py-1 rounded-lg bg-transparent hover:bg-surface-2 text-ink border border-border text-xs font-medium transition-colors whitespace-nowrap cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5 text-gold shrink-0" />
                          <span>Chi tiết</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onRegradeSession(session)}
                          title={`Chấm lại Buổi #${session.sessionNumber}`}
                          className={`inline-flex items-center gap-1 min-h-9 px-2 py-1 rounded-lg text-xs transition-colors whitespace-nowrap cursor-pointer ${
                            needsGrading
                              ? 'bg-primary hover:bg-primary-hover text-on-primary font-semibold'
                              : 'bg-transparent hover:bg-surface-2 text-ink-muted hover:text-ink font-medium'
                          }`}
                        >
                          <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                          <span>Chấm lại</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile Flat List View (< 768px) — Single surface with hairline dividers, zero nested cards */}
        <ul className="md:hidden rounded-2xl border border-border bg-surface divide-y divide-border">
          {sessions.map((session) => {
            const needsGrading = !session.autoGraded && session.submissionsCount > 0;
            return (
              <li key={session.id} className="p-4 space-y-2.5">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-semibold text-primary tabular-nums">
                    Buổi #{session.sessionNumber} · {session.dateLabel}
                  </span>
                  <span className="inline-flex items-center gap-1 text-ink-muted tabular-nums">
                    <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                    {session.slideCount} Slide
                  </span>
                </div>

                <div>
                  <div className="font-semibold text-sm text-ink leading-snug">
                    {session.lessonTitle}
                  </div>
                  <div lang="zh-CN" className="font-hanzi text-xs text-ink-muted mt-0.5">
                    {session.chineseTitle} · {session.instructor}
                  </div>
                </div>

                <div className="pt-1 flex flex-wrap items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-gold tabular-nums">
                    <Sparkles className="w-3.5 h-3.5 shrink-0" />
                    {session.submissionsCount}/{session.totalStudents} bài đã chấm
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onSelectReportSession(session)}
                      className="inline-flex items-center gap-1.5 min-h-10 px-3 py-1.5 rounded-xl border border-border bg-transparent hover:bg-surface-2 text-ink text-xs font-medium transition-colors cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5 text-gold" />
                      <span>Chi tiết</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onRegradeSession(session)}
                      className={`inline-flex items-center gap-1.5 min-h-10 px-3 py-1.5 rounded-xl text-xs transition-colors cursor-pointer ${
                        needsGrading
                          ? 'bg-primary hover:bg-primary-hover text-on-primary font-semibold'
                          : 'border border-border bg-transparent hover:bg-surface-2 text-ink-muted hover:text-ink font-medium'
                      }`}
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Chấm lại</span>
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Accessible Dialog: Detailed Session Report */}
      <Dialog
        isOpen={Boolean(selectedReportSession)}
        onClose={() => onSelectReportSession(null)}
        title={
          selectedReportSession
            ? `Báo cáo chi tiết Buổi #${selectedReportSession.sessionNumber}: ${selectedReportSession.lessonTitle}`
            : 'Báo cáo chi tiết buổi học'
        }
        maxWidthClass="max-w-2xl"
      >
        {selectedReportSession && (
          <div className="p-5 sm:p-6 flex flex-col max-h-[85vh] overflow-hidden bg-surface text-ink rounded-3xl border border-border">
            <div className="flex items-start justify-between gap-3 pb-4 border-b border-border">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-gold">
                  <span>Báo Cáo Chi Tiết Bài Làm</span>
                  <span>·</span>
                  <span className="text-primary font-semibold tabular-nums">
                    Buổi #{selectedReportSession.sessionNumber}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-ink mt-1">
                  {selectedReportSession.lessonTitle}
                </h3>
                <p lang="zh-CN" className="text-xs text-ink-muted mt-0.5 font-hanzi">
                  {selectedReportSession.chineseTitle} · Lớp HSK 1–3 · Ngày học: {selectedReportSession.dateLabel}
                </p>
              </div>
              <button
                type="button"
                aria-label="Đóng báo cáo chi tiết"
                onClick={() => onSelectReportSession(null)}
                className="w-9 h-9 rounded-full bg-surface-2 hover:bg-primary-soft text-ink flex items-center justify-center text-sm font-bold transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <dl className="grid grid-cols-3 divide-x divide-border py-4 border-b border-border text-center">
              <div className="px-2">
                <dt className="text-xs font-medium text-ink-muted">Điểm trung bình</dt>
                <dd className="text-xl font-bold text-ink mt-1 tabular-nums">9.3 / 10</dd>
                <dd className="text-xs text-success font-semibold mt-0.5">Xuất sắc (93%)</dd>
              </div>
              <div className="px-2">
                <dt className="text-xs font-medium text-ink-muted">Tỷ lệ hoàn thành</dt>
                <dd className="text-xl font-bold text-gold mt-1 tabular-nums">100%</dd>
                <dd className="text-xs text-ink-muted mt-0.5 tabular-nums">
                  {selectedReportSession.submissionsCount}/{selectedReportSession.totalStudents} học viên
                </dd>
              </div>
              <div className="px-2">
                <dt className="text-xs font-medium text-ink-muted">Tự động chấm điểm</dt>
                <dd className="text-xl font-bold text-ink mt-1 tabular-nums">0.3s</dd>
                <dd className="text-xs text-success font-semibold mt-0.5">Tức thì 100%</dd>
              </div>
            </dl>

            <div className="py-3.5 border-b border-border text-xs">
              <div className="flex items-center gap-1.5 font-semibold text-ink mb-1">
                <AlertCircle className="w-4 h-4 text-gold shrink-0" />
                <span>Lỗi ngữ pháp &amp; từ vựng học sinh mắc nhiều nhất trong buổi:</span>
              </div>
              <p className="text-ink-muted text-sm leading-relaxed">
                • <strong>3 học viên</strong> nhầm lẫn giữa đại từ khẩu ngữ <strong lang="zh-CN">咱们</strong> (bắt buộc bao gồm cả người nghe) và <strong lang="zh-CN">我们</strong>.<br />
                • <strong>2 học viên</strong> viết nét sổ móc (<span lang="zh-CN">竖钩</span>) chữ <strong lang="zh-CN">刻</strong> chưa đủ góc nghiêng chuẩn theo ô <span lang="zh-CN">米字格</span>.
              </p>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 space-y-2 pt-3">
              <div className="text-xs font-semibold text-ink mb-1 flex items-center justify-between">
                <span>Danh sách kết quả học viên ({studentsList.length} người):</span>
                <span className="text-xs text-gold font-semibold">Tự động đồng bộ</span>
              </div>
              <div className="divide-y divide-border border-t border-border">
                {studentsList.map((st, idx) => (
                  <div
                    key={st.id || idx}
                    className="py-2.5 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-sm text-ink">
                        {idx + 1}. {st.name}
                      </div>
                      <div className="text-xs text-ink-muted leading-snug">{st.feedback}</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-ink font-semibold text-xs tabular-nums">
                        {st.totalPoints || 95}đ
                      </span>
                      <span className="text-success font-semibold text-xs">
                        {st.status}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => onDeleteStudentClick(st, e)}
                        aria-label={`Xóa học viên ${st.name}`}
                        className="p-1.5 rounded-md text-danger hover:bg-danger/10 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 mt-3 border-t border-border flex items-center justify-between gap-3">
              <span className="text-xs text-ink-muted">
                Đã đồng bộ kết quả vào sổ điểm giáo viên.
              </span>
              <button
                type="button"
                onClick={() => onSelectReportSession(null)}
                className="min-h-10 px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-on-primary text-xs font-semibold transition-colors cursor-pointer"
              >
                Đóng báo cáo
              </button>
            </div>
          </div>
        )}
      </Dialog>
    </>
  );
};
