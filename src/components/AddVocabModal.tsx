import React, { useState } from 'react';
import { AlertCircle, Sparkles, X } from 'lucide-react';
import { VocabSlide } from '../data/chineseData';
import { createCustomVocabSlide } from '../utils/chineseEngine';

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

  if (!isOpen) return null;

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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
      role="dialog"
      aria-modal="true"
      data-testid="add-vocab-modal"
      onClick={onClose}
    >
      <form
        onSubmit={handleSave}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-3xl bg-[#FAFBF7] border border-[#9B8A3E]/60 shadow-2xl p-5 sm:p-6 space-y-4 text-[#1E3227]"
      >
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-[rgba(30,50,39,0.14)]">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-[#9B8A3E]">
              SOẠN GIÁO ÁN HÁN NGỮ · LƯU TRỮ TỰ ĐỘNG
            </div>
            <h3 className="text-base sm:text-lg font-bold text-[#1E3227] mt-0.5">
              + Tự thêm từ vựng mới vào Slide bài giảng
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white border border-[rgba(30,50,39,0.15)] flex items-center justify-center text-[#1E3227] hover:bg-[#F4F6EE] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {customVocabError && (
          <div className="px-3 py-2 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{customVocabError}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-[#1E3227] mb-1">
              Chữ Hán (汉字) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              data-testid="custom-vocab-hanzi-input"
              value={customHanzi}
              onChange={(e) => {
                setCustomHanzi(e.target.value);
                if (customVocabError) setCustomVocabError(null);
              }}
              placeholder="Ví dụ: 团圆, 熊猫, 茶..."
              autoFocus
              className="w-full px-3 py-2 rounded-xl bg-white border border-[rgba(30,50,39,0.2)] text-sm font-['Noto_Sans_SC'] font-bold text-[#1E3227] focus:outline-none focus:border-[#9B8A3E]"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-[#1E3227] mb-1">
              Phiên âm Pinyin
            </label>
            <input
              type="text"
              data-testid="custom-vocab-pinyin-input"
              value={customPinyin}
              onChange={(e) => setCustomPinyin(e.target.value)}
              placeholder="Ví dụ: tuán yuán (để trống sẽ tự tra)"
              className="w-full px-3 py-2 rounded-xl bg-white border border-[rgba(30,50,39,0.2)] text-xs sm:text-sm text-[#1E3227] focus:outline-none focus:border-[#9B8A3E]"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-[#1E3227] mb-1">
              Âm Hán Việt
            </label>
            <input
              type="text"
              data-testid="custom-vocab-hanviet-input"
              value={customHanViet}
              onChange={(e) => setCustomHanViet(e.target.value)}
              placeholder="Ví dụ: đoàn viên"
              className="w-full px-3 py-2 rounded-xl bg-white border border-[rgba(30,50,39,0.2)] text-xs sm:text-sm text-[#1E3227] focus:outline-none focus:border-[#9B8A3E]"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-[#1E3227] mb-1">
              Nghĩa tiếng Việt <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              data-testid="custom-vocab-meaning-input"
              value={customMeaning}
              onChange={(e) => {
                setCustomMeaning(e.target.value);
                if (customVocabError) setCustomVocabError(null);
              }}
              placeholder="Ví dụ: đoàn viên, sum họp"
              className="w-full px-3 py-2 rounded-xl bg-white border border-[rgba(30,50,39,0.2)] text-xs sm:text-sm text-[#1E3227] focus:outline-none focus:border-[#9B8A3E]"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-[#1E3227] mb-1">
            Câu ví dụ tiếng Trung (Ngữ cảnh trên Slide)
          </label>
          <input
            type="text"
            data-testid="custom-vocab-example-input"
            value={customExampleHanzi}
            onChange={(e) => setCustomExampleHanzi(e.target.value)}
            placeholder="Ví dụ: 中秋节 全家人 一起 团圆。"
            className="w-full px-3 py-2 rounded-xl bg-white border border-[rgba(30,50,39,0.2)] text-xs sm:text-sm font-['Noto_Sans_SC'] text-[#1E3227] focus:outline-none focus:border-[#9B8A3E]"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-[#1E3227] mb-1">
              Dịch nghĩa câu ví dụ
            </label>
            <input
              type="text"
              value={customExampleMeaning}
              onChange={(e) => setCustomExampleMeaning(e.target.value)}
              placeholder="Ví dụ: Tết Trung thu cả nhà cùng sum họp."
              className="w-full px-3 py-2 rounded-xl bg-white border border-[rgba(30,50,39,0.2)] text-xs text-[#1E3227] focus:outline-none focus:border-[#9B8A3E]"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-[#1E3227] mb-1">
              Cấp độ HSK
            </label>
            <select
              value={customHskLevel}
              onChange={(e) => setCustomHskLevel(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-white border border-[rgba(30,50,39,0.2)] text-xs font-semibold text-[#1E3227] focus:outline-none focus:border-[#9B8A3E]"
            >
              <option value="HSK 1">HSK 1</option>
              <option value="HSK 2">HSK 2</option>
              <option value="HSK 3">HSK 3</option>
              <option value="HSK 4">HSK 4</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[rgba(30,50,39,0.12)]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white border border-[rgba(30,50,39,0.18)] text-xs font-semibold text-[#1E3227] hover:bg-[#F4F6EE] cursor-pointer"
          >
            Hủy
          </button>
          <button
            type="submit"
            data-testid="save-custom-vocab-btn"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1E3227] hover:bg-[#2B4637] text-[#FAFBF7] text-xs font-bold shadow-xs cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#C5B358]" />
            <span>Lưu &amp; Tạo Slide Ngay</span>
          </button>
        </div>
      </form>
    </div>
  );
};
