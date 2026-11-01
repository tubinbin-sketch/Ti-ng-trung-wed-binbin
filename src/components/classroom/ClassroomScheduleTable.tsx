import React from 'react';
import { AlertCircle, CheckCircle2, FileText, Sparkles, Trash2 } from 'lucide-react';
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
      <div className="overflow-x-auto rounded-2xl border border-border bg-canvas pb-16">
        <table className="w-full table-auto text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-border bg-surface text-ink-muted">
              <th className="py-2.5 px-3 font-semibold w-14">Buổi</th>
              <th className="py-2.5 px-3 font-semibold w-28">Ngày học</th>
              <th className="py-2.5 px-3 font-semibold">Tên bài giảng (Việt · Trung)</th>
              <th className="py-2.5 px-3 font-semibold hidden sm:table-cell">Người dạy</th>
              <th className="py-2.5 px-3 font-semibold">Giáo án</th>
              <th className="py-2.5 px-3 font-semibold">Trạng thái chấm bài</th>
              <th className="py-2.5 px-3 font-semibold text-right">Thao tác tự động</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sessions.map((session) => (
              <tr key={session.id} className="hover:bg-surface/80 transition-colors">
                <td className="py-2.5 px-3 font-bold text-ink tabular-nums whitespace-nowrap">
                  #{session.sessionNumber}
                </td>
                <td className="py-2.5 px-3 text-ink-muted whitespace-nowrap tabular-nums">
                  {session.dateLabel}
                </td>
                <td className="py-2.5 px-3">
                  <div className="font-semibold text-sm text-ink">
                    {session.lessonTitle}
                  </div>
                  <div lang="zh-CN" className="font-['Noto_Sans_SC'] text-xs text-ink-muted">
                    {session.chineseTitle}
                  </div>
                </td>
                <td className="py-2.5 px-3 text-ink-muted hidden sm:table-cell">
                  {session.instructor}
                </td>
                <td className="py-2.5 px-3">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-bold bg-primary/10 text-primary">
                    <CheckCircle2 className="w-3 h-3 text-primary" />
                    {session.slideCount} Slide
                  </span>
                </td>
                <td className="py-2.5 px-3">
                  <button
                    type="button"
                    onClick={() => onSelectReportSession(session)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-surface hover:bg-primary/10 border border-border-strong text-gold hover:text-ink transition-all cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3 text-gold" />
                    {session.submissionsCount}/{session.totalStudents} bài đã chấm
                  </button>
                </td>
                <td className="py-2.5 px-3 text-right">
                  <div className="inline-flex items-center gap-1.5 justify-end">
                    <button
                      type="button"
                      onClick={() => onSelectReportSession(session)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-surface hover:bg-primary/10 text-ink border border-border text-xs font-semibold transition-all whitespace-nowrap cursor-pointer"
                    >
                      <FileText className="w-3 h-3 text-gold" />
                      <span>Chi tiết</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onRegradeSession(session)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-on-primary text-xs font-bold transition-all whitespace-nowrap cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3 text-gold" />
                      <span>Chấm lại</span>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
          <div className="p-5 sm:p-6 flex flex-col max-h-[85vh] overflow-hidden bg-canvas text-ink">
            <div className="flex items-start justify-between gap-3 pb-4 border-b border-border">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold text-gold">
                  <span>📊 Báo Cáo Chi Tiết Bài Làm</span>
                  <span>·</span>
                  <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold text-xs">
                    Buổi #{selectedReportSession.sessionNumber}
                  </span>
                </div>
                <h2 className="text-lg font-bold text-ink mt-1">
                  {selectedReportSession.lessonTitle}
                </h2>
                <p lang="zh-CN" className="text-xs text-ink-muted mt-0.5 font-['Noto_Sans_SC']">
                  {selectedReportSession.chineseTitle} · Lớp HSK 1–3 · Ngày học: {selectedReportSession.dateLabel}
                </p>
              </div>
              <button
                type="button"
                aria-label="Đóng báo cáo chi tiết"
                onClick={() => onSelectReportSession(null)}
                className="w-8 h-8 rounded-full bg-surface hover:bg-primary/10 border border-border text-ink flex items-center justify-center text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2.5 my-4">
              <div className="p-3 rounded-2xl bg-surface border border-border text-center">
                <div className="text-xs font-semibold text-ink-muted">Điểm trung bình</div>
                <div className="text-xl font-bold text-ink mt-1 tabular-nums">9.3 / 10</div>
                <div className="text-xs text-success font-bold mt-0.5">Xuất sắc (93%)</div>
              </div>
              <div className="p-3 rounded-2xl bg-surface border border-border text-center">
                <div className="text-xs font-semibold text-ink-muted">Tỷ lệ hoàn thành</div>
                <div className="text-xl font-bold text-gold mt-1 tabular-nums">100%</div>
                <div className="text-xs text-ink-muted mt-0.5 tabular-nums">
                  {selectedReportSession.submissionsCount}/{selectedReportSession.totalStudents} học viên
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-surface border border-border text-center">
                <div className="text-xs font-semibold text-ink-muted">Tự động chấm điểm</div>
                <div className="text-xl font-bold text-ink mt-1 tabular-nums">0.3s</div>
                <div className="text-xs text-success font-bold mt-0.5">Tức thì 100%</div>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-primary/10 border border-primary/25 text-xs mb-4">
              <div className="flex items-center gap-1.5 font-bold text-ink mb-1">
                <AlertCircle className="w-4 h-4 text-gold" />
                <span>Lỗi ngữ pháp &amp; từ vựng học sinh mắc nhiều nhất trong buổi:</span>
              </div>
              <p className="text-ink-muted text-sm leading-relaxed">
                • <strong>3 học viên</strong> nhầm lẫn giữa đại từ khẩu ngữ <strong lang="zh-CN">咱们</strong> (bắt buộc bao gồm cả người nghe) và <strong lang="zh-CN">我们</strong>.<br />
                • <strong>2 học viên</strong> viết nét sổ móc (<span lang="zh-CN">竖钩</span>) chữ <strong lang="zh-CN">刻</strong> chưa đủ góc nghiêng chuẩn theo ô <span lang="zh-CN">米字格</span>.
              </p>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 space-y-2 border-t border-border pt-3">
              <div className="text-xs font-bold text-ink mb-1 flex items-center justify-between">
                <span>Danh sách kết quả học viên ({studentsList.length} người):</span>
                <span className="text-xs text-gold font-semibold">Tự động đồng bộ</span>
              </div>
              <div className="divide-y divide-border bg-surface rounded-2xl border border-border overflow-hidden">
                {studentsList.map((st, idx) => (
                  <div
                    key={st.id || idx}
                    className="p-2.5 flex items-center justify-between gap-3 text-xs hover:bg-canvas transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-sm text-ink truncate">
                        {idx + 1}. {st.name}
                      </div>
                      <div className="text-xs text-ink-muted truncate">{st.feedback}</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="px-2 py-0.5 rounded-md bg-primary/10 text-ink font-bold text-xs tabular-nums">
                        {st.totalPoints || 95}đ
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-success/10 text-success font-semibold text-xs">
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
                className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-on-primary text-xs font-bold transition-all cursor-pointer"
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
