import React, { useState } from 'react';
import { AlertCircle, Sparkles, X } from 'lucide-react';
import { VocabSlide } from '../data/chineseData';
import { createCustomVocabSlide } from '../utils/chineseEngine';
import { Dialog } from './ui/Dialog';

export interface AddVocabModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveVocab: (newSlide: VocabSlide) => void;
  nextIndex: number;
}

export const AddVocabModal: React.FC<AddVocabModalProps> = ({
  isOpen,
  onClose,
  onSaveVocab,
  nextIndex,
}) => {
  const [customHanzi, setCustomHanzi] = useState('');
  const [customPinyin, setCustomPinyin] = useState('');
  const [customHanViet, setCustomHanViet] = useState('');
  const [customMeaning, setCustomMeaning] = useState('');
  const [customExampleHanzi, setCustomExampleHanzi] = useState('');
  const [customExampleMeaning, setCustomExampleMeaning] = useState('');
  const [customHskLevel, setCustomHskLevel] = useState('HSK 3');
  const [customVocabError, setCustomVocabError] = useState<string | null>(null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanHanzi = customHanzi.trim();
    if (!cleanHanzi) {
      setCustomVocabError('Vui lòng nhập chữ Hán (Hanzi)');
      return;
    }
    const cleanMeaning = customMeaning.trim();
    if (!cleanMeaning) {
      setCustomVocabError('Vui lòng nhập nghĩa tiếng Việt');
      return;
    }

    const slide = createCustomVocabSlide(
      {
        hanzi: cleanHanzi,
        pinyin: customPinyin.trim() || undefined,
        hanViet: customHanViet.trim() || undefined,
        meaning: cleanMeaning,
        exampleHanzi: customExampleHanzi.trim() || undefined,
        exampleMeaning: customExampleMeaning.trim() || undefined,
        hskLevel: customHskLevel,
      },
      nextIndex
    );

    if (!slide) {
      setCustomVocabError('Không thể tạo Slide từ thông tin đã nhập.');
      return;
    }

    onSaveVocab(slide);
    setCustomHanzi('');
    setCustomPinyin('');
    setCustomHanViet('');
    setCustomMeaning('');
    setCustomExampleHanzi('');
    setCustomExampleMeaning('');
    setCustomVocabError(null);
    onClose();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      labelledBy="add-vocab-modal-title"
      maxWidthClass="max-w-lg"
      testId="add-vocab-modal"
    >
      <form
        onSubmit={handleSave}
        className="w-full rounded-3xl bg-canvas border border-border shadow-2xl p-5 sm:p-6 space-y-4 text-ink"
      >
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-border">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-gold">
              SOẠN GIÁO ÁN HÁN NGỮ · LƯU TRỮ TỰ ĐỘNG
            </div>
            <h3 id="add-vocab-modal-title" className="text-base sm:text-lg font-bold text-ink mt-0.5">
              + Tự thêm từ vựng mới vào Slide bài giảng
            </h3>
          </div>
          <button
            type="button"
            aria-label="Đóng cửa sổ thêm từ vựng"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-surface border border-border flex items-center justify-center text-ink hover:bg-primary/10 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {customVocabError && (
          <div
            role="alert"
            className="px-3 py-2 rounded-xl bg-danger/10 border border-danger/30 text-danger text-xs font-semibold flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{customVocabError}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="custom-hanzi-input" className="block text-xs font-bold text-ink mb-1">
              Chữ Hán (<span lang="zh-CN">汉字</span>) <span className="text-danger">*</span>
            </label>
            <input
              id="custom-hanzi-input"
              type="text"
              lang="zh-CN"
              data-autofocus="true"
              data-testid="custom-vocab-hanzi-input"
              value={customHanzi}
              onChange={(e) => {
                setCustomHanzi(e.target.value);
                if (customVocabError) setCustomVocabError(null);
              }}
              placeholder="Ví dụ: 团圆, 熊猫, 茶..."
              className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-sm font-['Noto_Sans_SC'] font-bold text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            />
          </div>
          <div>
            <label htmlFor="custom-pinyin-input" className="block text-xs font-bold text-ink mb-1">
              Phiên âm Pinyin
            </label>
            <input
              id="custom-pinyin-input"
              type="text"
              data-testid="custom-vocab-pinyin-input"
              value={customPinyin}
              onChange={(e) => setCustomPinyin(e.target.value)}
              placeholder="Ví dụ: tuán yuán (để trống sẽ tự tra)"
              className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            />
          </div>
          <div>
            <label htmlFor="custom-hanviet-input" className="block text-xs font-bold text-ink mb-1">
              Âm Hán Việt
            </label>
            <input
              id="custom-hanviet-input"
              type="text"
              data-testid="custom-vocab-hanviet-input"
              value={customHanViet}
              onChange={(e) => setCustomHanViet(e.target.value)}
              placeholder="Ví dụ: đoàn viên"
              className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            />
          </div>
          <div>
            <label htmlFor="custom-meaning-input" className="block text-xs font-bold text-ink mb-1">
              Nghĩa tiếng Việt <span className="text-danger">*</span>
            </label>
            <input
              id="custom-meaning-input"
              type="text"
              data-testid="custom-vocab-meaning-input"
              value={customMeaning}
              onChange={(e) => {
                setCustomMeaning(e.target.value);
                if (customVocabError) setCustomVocabError(null);
              }}
              placeholder="Ví dụ: đoàn viên, sum họp"
              className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            />
          </div>
        </div>

        <div>
          <label htmlFor="custom-example-hanzi" className="block text-xs font-bold text-ink mb-1">
            Câu ví dụ tiếng Trung (Ngữ cảnh trên Slide)
          </label>
          <input
            id="custom-example-hanzi"
            type="text"
            lang="zh-CN"
            data-testid="custom-vocab-example-input"
            value={customExampleHanzi}
            onChange={(e) => setCustomExampleHanzi(e.target.value)}
            placeholder="Ví dụ: 中秋节 全家人 一起 团圆。"
            className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-sm font-['Noto_Sans_SC'] text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="custom-example-meaning" className="block text-xs font-bold text-ink mb-1">
              Dịch nghĩa câu ví dụ
            </label>
            <input
              id="custom-example-meaning"
              type="text"
              value={customExampleMeaning}
              onChange={(e) => setCustomExampleMeaning(e.target.value)}
              placeholder="Ví dụ: Tết Trung thu cả nhà cùng sum họp."
              className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            />
          </div>
          <div>
            <label htmlFor="custom-hsk-select" className="block text-xs font-bold text-ink mb-1">
              Cấp độ HSK
            </label>
            <select
              id="custom-hsk-select"
              value={customHskLevel}
              onChange={(e) => setCustomHskLevel(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-sm font-semibold text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            >
              <option value="HSK 1">HSK 1</option>
              <option value="HSK 2">HSK 2</option>
              <option value="HSK 3">HSK 3</option>
              <option value="HSK 4">HSK 4</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-surface border border-border text-xs font-semibold text-ink hover:bg-primary/10 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            Hủy
          </button>
          <button
            type="submit"
            data-testid="save-custom-vocab-btn"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary hover:opacity-95 text-canvas text-xs font-bold shadow-xs cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Lưu &amp; Tạo Slide Ngay</span>
          </button>
        </div>
      </form>
    </Dialog>
  );
};
