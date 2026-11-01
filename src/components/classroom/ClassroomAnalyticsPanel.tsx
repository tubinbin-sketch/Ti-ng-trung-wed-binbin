import React from 'react';
import { Mic, Printer, Star } from 'lucide-react';

interface ClassroomAnalyticsPanelProps {
  readingHistory: any[];
  handwritingHistory: any[];
  onOpenWorksheetModal: () => void;
}

export const ClassroomAnalyticsPanel: React.FC<ClassroomAnalyticsPanelProps> = ({
  readingHistory,
  handwritingHistory,
  onOpenWorksheetModal,
}) => {
  return (
    <div
      data-testid="classroom-reading-writing-analytics"
      className="rounded-2xl border border-border bg-surface p-5 pb-16 space-y-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border">
        <div>
          <h4 className="text-sm font-bold text-ink flex items-center gap-1.5">
            <Mic className="w-4 h-4 text-gold" />
            <span>Thống kê Luyện Đọc Phát Âm &amp; Viết Tay Ô Mễ Tự Cách (Học viên)</span>
          </h4>
          <p className="text-xs text-ink-muted mt-0.5">
            Đồng bộ tức thì từ bài tập &ldquo;Đọc thử&rdquo; (Web Speech API zh-CN) và &ldquo;Viết thử&rdquo; (<span lang="zh-CN">米字格</span>) của học viên trong lớp.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            data-testid="analytics-open-worksheet-btn"
            onClick={onOpenWorksheetModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary/90 transition-all cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>In Phiếu Luyện Viết A4 (PDF)</span>
          </button>
        </div>
      </div>

      {/* 4 Summary Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-canvas border border-border">
          <div className="text-xs text-ink-muted font-medium">Lượt luyện đọc đã ghi nhận</div>
          <div className="text-xl font-bold text-ink mt-1 tabular-nums">
            {readingHistory.length} lượt
          </div>
          <div className="text-xs text-success font-semibold mt-0.5">
            Web Speech API zh-CN
          </div>
        </div>
        <div className="p-3.5 rounded-xl bg-canvas border border-border">
          <div className="text-xs text-ink-muted font-medium">Độ chuẩn phát âm TB</div>
          <div className="text-xl font-bold text-gold mt-1 tabular-nums">
            {readingHistory.length > 0
              ? `${Math.round(
                  readingHistory.reduce((acc, cur) => acc + (cur.score || 90), 0) /
                    readingHistory.length
                )}%`
              : '94%'}
          </div>
          <div className="text-xs text-success font-semibold mt-0.5">
            Thanh điệu chuẩn Bắc Kinh
          </div>
        </div>
        <div className="p-3.5 rounded-xl bg-canvas border border-border">
          <div className="text-xs text-ink-muted font-medium">Lượt viết tay Ô Mễ Tự Cách</div>
          <div className="text-xl font-bold text-ink mt-1 tabular-nums">
            {handwritingHistory.length} nét
          </div>
          <div className="text-xs text-ink-muted font-semibold mt-0.5">
            Đối chiếu HanziWriter
          </div>
        </div>
        <div className="p-3.5 rounded-xl bg-canvas border border-border">
          <div className="text-xs text-ink-muted font-medium">Độ chính xác viết nét TB</div>
          <div className="text-xl font-bold text-accent mt-1 tabular-nums">
            {handwritingHistory.length > 0
              ? `${Math.round(
                  handwritingHistory.reduce((acc, cur) => acc + (cur.accuracy || 88), 0) /
                    handwritingHistory.length
                )}%`
              : '91%'}
          </div>
          <div className="text-xs text-success font-semibold mt-0.5">
            Bút thuận &amp; tọa độ nét
          </div>
        </div>
      </div>

      {/* 2 Detailed Breakdown Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left Column: Recent Reading Drills */}
        <div className="rounded-xl border border-border bg-canvas p-3.5 space-y-2.5">
          <div className="flex items-center justify-between pb-2 border-b border-border">
            <h5 className="text-xs font-bold text-ink flex items-center gap-1.5">
              <Mic className="w-3.5 h-3.5 text-accent" />
              <span>Lịch sử phát âm câu ví dụ gần đây</span>
            </h5>
            <span className="text-xs text-ink-muted">
              {readingHistory.length} bản ghi
            </span>
          </div>
          <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
            {readingHistory.length === 0 ? (
              <div className="p-4 rounded-lg bg-surface text-center text-xs text-ink-muted italic">
                Chưa có lượt ghi âm mới. Khi học sinh bấm &ldquo;Đọc thử&rdquo; ở thẻ câu ví dụ, dữ liệu sẽ tự động đồng bộ về đây.
              </div>
            ) : (
              readingHistory.slice(0, 10).map((r) => (
                <div
                  key={r.id}
                  className="p-2.5 rounded-lg bg-surface border border-border space-y-1 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span lang="zh-CN" className="font-['Noto_Sans_SC'] font-bold text-sm text-ink">
                      {r.hanzi} · &ldquo;{r.targetSentence}&rdquo;
                    </span>
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-primary text-on-primary font-bold text-xs tabular-nums">
                      {r.score}%
                    </span>
                  </div>
                  <div className="text-ink-muted text-xs">
                    Nhận diện: <span lang="zh-CN" className="font-mono text-ink">{r.transcript}</span>
                  </div>
                  <div className="text-xs text-success font-medium">
                    ✓ {r.feedback}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Recent Handwriting Drills */}
        <div className="rounded-xl border border-border bg-canvas p-3.5 space-y-2.5">
          <div className="flex items-center justify-between pb-2 border-b border-border">
            <h5 className="text-xs font-bold text-ink flex items-center gap-1.5">
              <Star className="w-3.5 h-3.5 text-gold" />
              <span>Lịch sử viết tay Ô Mễ Tự Cách gần đây</span>
            </h5>
            <span className="text-xs text-ink-muted">
              {handwritingHistory.length} bản ghi
            </span>
          </div>
          <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
            {handwritingHistory.length === 0 ? (
              <div className="p-4 rounded-lg bg-surface text-center text-xs text-ink-muted italic">
                Chưa có lượt viết tay mới. Khi học sinh luyện viết nét trong Ô Mễ Tự Cách, kết quả chấm điểm sẽ hiển thị tại đây.
              </div>
            ) : (
              handwritingHistory.slice(0, 10).map((h) => (
                <div
                  key={h.id}
                  className="p-2.5 rounded-lg bg-surface border border-border space-y-1 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span lang="zh-CN" className="font-['Noto_Sans_SC'] font-bold text-sm text-ink">
                      Chữ: {h.char} ({h.hanziWord})
                    </span>
                    <div className="flex items-center gap-1">
                      <span className="px-1.5 py-0.5 rounded bg-gold/20 text-ink font-bold text-xs tabular-nums">
                        {h.accuracy}%
                      </span>
                      <span className="text-gold font-bold">
                        {'★'.repeat(h.stars || 1)}
                      </span>
                    </div>
                  </div>
                  {h.isReversedDirection && (
                    <div className="text-xs text-warning font-bold bg-warning/10 px-1.5 py-0.5 rounded">
                      ⚠️ Học sinh kéo ngược hướng bút thuận
                    </div>
                  )}
                  <div className="text-xs text-ink-muted">
                    {h.feedback}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
