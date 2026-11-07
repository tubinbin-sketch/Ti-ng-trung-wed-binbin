import React from 'react';
import { Printer } from 'lucide-react';
import { VocabSlide } from '../data/chineseData';
import { Dialog } from './ui/Dialog';

export interface WorksheetPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  slides: VocabSlide[];
}

export const WorksheetPreviewModal: React.FC<WorksheetPreviewModalProps> = ({
  isOpen,
  onClose,
  slides,
}) => {
  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      labelledBy="worksheet-modal-title"
      maxWidthClass="max-w-4xl"
      testId="worksheet-a4-modal"
    >
      <div className="w-full bg-surface rounded-3xl border-2 border-border-strong shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Action Bar */}
        <div className="px-5 py-3.5 bg-primary text-on-primary flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Printer className="w-4 h-4 shrink-0" />
            <span id="worksheet-modal-title" className="text-xs sm:text-sm font-bold">
              Bản Xem Trước Trang A4 — Phiếu Tập Viết Chữ Hán (<span lang="zh-CN">米字格</span> · {slides.length} từ vựng)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              data-testid="print-worksheet-confirm-btn"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-canvas text-ink text-xs font-bold transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-on-primary"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>In ngay / Lưu PDF (A4)</span>
            </button>
            <button
              type="button"
              data-testid="close-worksheet-modal-btn"
              onClick={onClose}
              className="px-3 py-1.5 rounded-xl bg-surface/15 hover:bg-surface/25 text-on-primary text-xs font-semibold cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-on-primary"
            >
              Đóng
            </button>
          </div>
        </div>

        {/* Printable A4 Sheet Container */}
        <div className="print-a4-worksheet flex-1 overflow-y-auto p-6 sm:p-8 bg-canvas text-ink space-y-5">
          {/* 1. Tiêu đề lớp học HANU × 阮文受 */}
          <div className="border-b-2 border-primary pb-4 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div>
              <div className="text-xs font-bold text-gold">
                HANU × <span lang="zh-CN">阮文受</span> · GIÁO ÁN THỰC HÀNH HÁN TỰ CHUẨN HSK 3.0
              </div>
              <h2 className="text-xl font-bold text-ink mt-0.5">
                PHIẾU TẬP VIẾT CHỮ MỄ &amp; BÀI TẬP TỰ LUYỆN (<span lang="zh-CN">汉字米字格与综合练习卷</span>)
              </h2>
            </div>
            <div className="text-xs text-ink-muted space-y-1 sm:text-right">
              <div>Họ và tên học viên: ___________________________</div>
              <div>Lớp: HSK 1–3 (Mã lớp: 722229) · Điểm: _______/100</div>
            </div>
          </div>

          {/* 2. Bảng tổng hợp từ vựng */}
          <div data-testid="worksheet-vocab-summary-table" className="space-y-1.5">
            <h3 className="text-xs font-semibold text-ink">
              PHẦN I. BẢNG TỔNG HỢP TỪ VỰNG TRỌNG TÂM ({slides.length} TỪ CHUẨN HSK 3.0)
            </h3>
            <div className="overflow-x-auto rounded-xl border border-border bg-surface">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-canvas border-b border-border text-ink">
                    <th className="py-1.5 px-2.5 font-bold w-10">STT</th>
                    <th className="py-1.5 px-2.5 font-bold">Chữ Hán</th>
                    <th className="py-1.5 px-2.5 font-bold">Pinyin</th>
                    <th className="py-1.5 px-2.5 font-bold">Âm Hán Việt</th>
                    <th className="py-1.5 px-2.5 font-bold">Nghĩa tiếng Việt</th>
                    <th className="py-1.5 px-2.5 font-bold">Câu ví dụ ngữ cảnh</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {slides.slice(0, 12).map((s, idx) => (
                    <tr key={`tbl-${s.id}-${idx}`}>
                      <td className="py-1 px-2.5 font-bold text-gold tabular-nums">{idx + 1}</td>
                      <td lang="zh-CN" className="py-1 px-2.5 font-['Noto_Sans_SC'] font-bold text-sm text-ink">{s.hanzi}</td>
                      <td className="py-1 px-2.5 font-semibold text-gold">{s.pinyin}</td>
                      <td className="py-1 px-2.5 uppercase font-semibold text-ink-muted">{s.hanViet}</td>
                      <td className="py-1 px-2.5 font-semibold text-ink">{s.meaning}</td>
                      <td lang="zh-CN" className="py-1 px-2.5 font-['Noto_Sans_SC'] text-xs text-ink-muted">{s.exampleHanzi}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 3. Hàng ô Mễ Tự Cách */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-semibold text-ink">
              PHẦN II. LUYỆN VIẾT CHỮ HÁN TRÊN Ô MỄ TỰ CÁCH (<span lang="zh-CN">米字格描红与临摹</span>)
            </h3>
            {slides.map((s, idx) => (
              <div
                key={`ws-${s.id}-${idx}`}
                className="p-3 rounded-2xl bg-surface border border-border flex flex-col md:flex-row md:items-center justify-between gap-3"
              >
                <div className="min-w-[190px] max-w-[230px]">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs font-bold text-gold tabular-nums">
                      #{idx + 1}
                    </span>
                    <span lang="zh-CN" className="font-['Noto_Sans_SC'] text-2xl font-bold text-ink">
                      {s.hanzi}
                    </span>
                    <span className="text-xs font-bold text-gold">{s.pinyin}</span>
                  </div>
                  <div className="text-xs text-ink-muted mt-0.5">
                    Hán Việt: <strong className="uppercase">{s.hanViet}</strong> · {s.meaning}
                  </div>
                  <div className="text-xs text-ink-muted mt-0.5">
                    {s.characters.map((c) => `${c.char} (${c.strokeCount} nét)`).join(' · ')}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto py-1">
                  {Array.from({ length: 7 }).map((_, boxIdx) => {
                    const charToRender =
                      s.characters[boxIdx % s.characters.length]?.char || s.hanzi[0];
                    const isModel = boxIdx < s.characters.length;
                    const isTrace =
                      boxIdx >= s.characters.length && boxIdx < s.characters.length * 2 + 1;
                    return (
                      <div
                        key={`mzg-${idx}-${boxIdx}`}
                        className="relative w-12 h-12 shrink-0 bg-canvas border border-border-strong"
                      >
                        <svg
                          viewBox="0 0 100 100"
                          className="w-full h-full"
                          role="img"
                          aria-label={`Ô tập viết chữ ${charToRender || s.hanzi} (ô ${boxIdx + 1})`}
                        >
                          <line x1="0" y1="50" x2="100" y2="50" stroke="#C5B358" strokeWidth="1" strokeDasharray="3 3" strokeOpacity="0.6" />
                          <line x1="50" y1="0" x2="50" y2="100" stroke="#C5B358" strokeWidth="1" strokeDasharray="3 3" strokeOpacity="0.6" />
                          <line x1="0" y1="0" x2="100" y2="100" stroke="#C5B358" strokeWidth="0.8" strokeDasharray="3 3" strokeOpacity="0.45" />
                          <line x1="100" y1="0" x2="0" y2="100" stroke="#C5B358" strokeWidth="0.8" strokeDasharray="3 3" strokeOpacity="0.45" />
                          {(isModel || isTrace) && (
                            <text
                              x="50"
                              y="74"
                              textAnchor="middle"
                              lang="zh-CN"
                              className="font-['Noto_Sans_SC'] font-bold"
                              fontSize="68"
                              fill={isModel ? '#0F382E' : '#C5CBB9'}
                            >
                              {charToRender}
                            </text>
                          )}
                        </svg>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* 4. Phần bài tập tự luyện ở cuối trang */}
          <div
            data-testid="worksheet-practice-exercises-section"
            className="p-4 rounded-2xl bg-surface border border-border space-y-2.5"
          >
            <h3 className="text-xs font-semibold text-ink">
              PHẦN III. BÀI TẬP TỰ LUYỆN &amp; DỊCH CÂU CHUẨN HSK 3.0 (<span lang="zh-CN">课后综合练习</span>)
            </h3>
            <div className="space-y-2 text-xs text-ink">
              <div>
                <strong>Câu 1 (Điền từ vào chỗ trống):</strong> <span lang="zh-CN">春天的阳光非常</span> ________ (wēn nuǎn - ấm áp)，________ (zán men - chúng ta) <span lang="zh-CN">一起去公园散步吧。</span>
              </div>
              <div>
                <strong>Câu 2 (Sắp xếp từ thành câu hoàn chỉnh):</strong> <span lang="zh-CN">打算 / 明天 / 去 / 我 / 图书馆 / 复习</span> → ________________________________________________
              </div>
              <div>
                <strong>Câu 3 (Dịch sang tiếng Trung sử dụng từ vựng bài học):</strong> “Thời tiết hôm nay rất ấm áp, chúng ta cùng nhau luyện viết chữ Hán nhé.”
                <div className="mt-1 border-b border-dashed border-border h-5" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </Dialog>
  );
};
