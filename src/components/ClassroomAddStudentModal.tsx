import React, { useState } from 'react';
import { AlertCircle, RefreshCw, UserPlus, X } from 'lucide-react';
import { ClassStudentRecord, createStudentRecord } from '../utils/chineseEngine';

export interface ClassroomAddStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddStudent: (newStudent: ClassStudentRecord) => void;
  existingStudentsCount: number;
}

export const ClassroomAddStudentModal: React.FC<ClassroomAddStudentModalProps> = ({
  isOpen,
  onClose,
  onAddStudent,
  existingStudentsCount,
}) => {
  const [modalStudentName, setModalStudentName] = useState('');
  const [modalStudentCode, setModalStudentCode] = useState(() =>
    `HV-${String(existingStudentsCount + 1).padStart(3, '0')}`
  );
  const [modalHskLevel, setModalHskLevel] = useState<'HSK 1' | 'HSK 2' | 'HSK 3' | 'HSK 4'>('HSK 2');
  const [modalInitialPoints, setModalInitialPoints] = useState<number>(95);
  const [modalValidationError, setModalValidationError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleRegenerateCode = () => {
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    setModalStudentCode(`HV-${randomSuffix}`);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = modalStudentName.trim();
    if (!cleanName) {
      setModalValidationError('Vui lòng nhập họ và tên học viên');
      return;
    }
    if (cleanName.length < 2) {
      setModalValidationError('Họ tên học viên phải từ 2 ký tự trở lên');
      return;
    }

    const cleanCode =
      modalStudentCode.trim() ||
      `HV-${String(existingStudentsCount + 1).padStart(3, '0')}`;

    const newRecord = createStudentRecord(
      {
        name: cleanName,
        studentCode: cleanCode,
        hskLevel: modalHskLevel,
        initialPoints: modalInitialPoints,
      },
      existingStudentsCount
    );

    onAddStudent(newRecord);
    setModalStudentName('');
    setModalValidationError(null);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-student-modal-title"
      onClick={onClose}
    >
      <form
        onSubmit={handleSave}
        className="w-full max-w-md bg-[#FAFBF7] border border-[#9B8A3E]/60 rounded-3xl shadow-2xl p-5 sm:p-6 flex flex-col space-y-4 text-[#1E3227]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-[rgba(30,50,39,0.12)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#1E3227] flex items-center justify-center text-[#C5B358] shrink-0 shadow-2xs">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 id="add-student-modal-title" className="text-base font-bold text-[#1E3227]">
                Thêm học viên mới vào lớp
              </h3>
              <p className="text-xs text-[#5F7266]">
                Lớp HSK 1–3 · Mã lớp: 722229 · Tự động đồng bộ sĩ số
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Đóng cửa sổ thêm học viên"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white hover:bg-[#F4F6EE] border border-[rgba(30,50,39,0.15)] text-[#1E3227] flex items-center justify-center text-xs font-bold transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {modalValidationError && (
          <div
            role="alert"
            className="px-3 py-2 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{modalValidationError}</span>
          </div>
        )}

        <div className="space-y-3.5">
          {/* 1. Họ và tên */}
          <div>
            <label
              htmlFor="modal-student-name"
              className="block text-xs font-bold text-[#1E3227] mb-1"
            >
              Họ và tên học viên <span className="text-red-500">*</span>
            </label>
            <input
              id="modal-student-name"
              data-testid="modal-student-name-input"
              type="text"
              value={modalStudentName}
              onChange={(e) => {
                setModalStudentName(e.target.value);
                if (modalValidationError) setModalValidationError(null);
              }}
              placeholder="Ví dụ: Nguyễn Minh Châu..."
              autoFocus
              className="w-full px-3.5 py-2 rounded-xl bg-white border border-[rgba(30,50,39,0.2)] text-xs sm:text-sm text-[#1E3227] placeholder-[#5F7266] focus:outline-none focus:border-[#9B8A3E]"
            />
          </div>

          {/* 2. Mã học viên (Tự sinh hoặc nhập tay) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label
                htmlFor="modal-student-code"
                className="block text-xs font-bold text-[#1E3227]"
              >
                Mã học viên (Tự sinh hoặc nhập tay)
              </label>
              <button
                type="button"
                onClick={handleRegenerateCode}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#9B8A3E] hover:text-[#1E3227] transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Tự sinh mã mới</span>
              </button>
            </div>
            <input
              id="modal-student-code"
              data-testid="modal-student-code-input"
              type="text"
              value={modalStudentCode}
              onChange={(e) => setModalStudentCode(e.target.value)}
              placeholder="HV-013"
              className="w-full px-3.5 py-2 rounded-xl bg-white border border-[rgba(30,50,39,0.2)] text-xs sm:text-sm font-mono font-bold text-[#1E3227] placeholder-[#5F7266] focus:outline-none focus:border-[#9B8A3E]"
            />
          </div>

          {/* 3. Cấp độ HSK & 4. Điểm khởi tạo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="modal-student-hsk"
                className="block text-xs font-bold text-[#1E3227] mb-1"
              >
                Cấp độ (HSK 1–4)
              </label>
              <select
                id="modal-student-hsk"
                data-testid="modal-student-hsk-select"
                value={modalHskLevel}
                onChange={(e) =>
                  setModalHskLevel(
                    e.target.value as 'HSK 1' | 'HSK 2' | 'HSK 3' | 'HSK 4'
                  )
                }
                className="w-full px-3 py-2 rounded-xl bg-white border border-[rgba(30,50,39,0.2)] text-xs sm:text-sm font-semibold text-[#1E3227] focus:outline-none focus:border-[#9B8A3E]"
              >
                <option value="HSK 1">HSK 1 (Sơ cấp 1)</option>
                <option value="HSK 2">HSK 2 (Sơ cấp 2)</option>
                <option value="HSK 3">HSK 3 (Trung cấp 1)</option>
                <option value="HSK 4">HSK 4 (Trung cấp 2)</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="modal-student-points"
                className="block text-xs font-bold text-[#1E3227] mb-1"
              >
                Điểm khởi tạo (0–100)
              </label>
              <input
                id="modal-student-points"
                data-testid="modal-student-points-input"
                type="number"
                min={0}
                max={100}
                value={modalInitialPoints}
                onChange={(e) =>
                  setModalInitialPoints(
                    Math.max(0, Math.min(100, parseInt(e.target.value, 10) || 0))
                  )
                }
                className="w-full px-3 py-2 rounded-xl bg-white border border-[rgba(30,50,39,0.2)] text-xs sm:text-sm font-semibold text-[#1E3227] focus:outline-none focus:border-[#9B8A3E]"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[rgba(30,50,39,0.12)]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white border border-[rgba(30,50,39,0.18)] text-xs font-semibold text-[#1E3227] hover:bg-[#F4F6EE] transition-all cursor-pointer"
          >
            Hủy bỏ
          </button>
          <button
            type="submit"
            data-testid="confirm-add-student-btn"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1E3227] hover:bg-[#2B4637] text-[#FAFBF7] text-xs font-bold shadow-xs transition-all cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5 text-[#C5B358]" />
            <span>Thêm vào danh sách</span>
          </button>
        </div>
      </form>
    </div>
  );
};
