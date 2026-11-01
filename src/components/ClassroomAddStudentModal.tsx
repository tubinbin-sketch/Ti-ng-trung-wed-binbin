import React, { useState } from 'react';
import { AlertCircle, RefreshCw, UserPlus, X } from 'lucide-react';
import {
  ClassStudentRecord,
  createStudentRecord,
  generateRandomStudentCode,
} from '../utils/chineseEngine';
import { Dialog } from './ui/Dialog';

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
    generateRandomStudentCode('HV')
  );
  const [modalHskLevel, setModalHskLevel] = useState<'HSK 1' | 'HSK 2' | 'HSK 3' | 'HSK 4'>('HSK 2');
  const [modalInitialPoints, setModalInitialPoints] = useState<number>(0);
  const [modalValidationError, setModalValidationError] = useState<string | null>(null);

  const handleRegenerateCode = () => {
    setModalStudentCode(generateRandomStudentCode('HV'));
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
      modalStudentCode.trim().toUpperCase() || generateRandomStudentCode('HV');

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
    setModalStudentCode(generateRandomStudentCode('HV'));
    setModalInitialPoints(0);
    setModalValidationError(null);
    onClose();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      labelledBy="add-student-modal-title"
      maxWidthClass="max-w-md"
      testId="add-student-dialog"
    >
      <form
        onSubmit={handleSave}
        className="w-full bg-canvas border border-border rounded-3xl shadow-2xl p-5 sm:p-6 flex flex-col space-y-4 text-ink"
      >
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center text-on-primary shrink-0 shadow-2xs">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 id="add-student-modal-title" className="text-base font-bold text-ink">
                Thêm học viên mới vào lớp
              </h3>
              <p className="text-xs text-ink-muted">
                Lớp HSK 1–3 · Cấp mã định danh học viên riêng
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Đóng cửa sổ thêm học viên"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-surface hover:bg-primary/10 border border-border text-ink flex items-center justify-center text-xs font-bold transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {modalValidationError && (
          <div
            role="alert"
            className="px-3 py-2 rounded-xl bg-danger/10 border border-danger/30 text-danger text-xs font-semibold flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{modalValidationError}</span>
          </div>
        )}

        <div className="space-y-3.5">
          <div>
            <label
              htmlFor="modal-student-name"
              className="block text-xs font-bold text-ink mb-1"
            >
              Họ và tên học viên <span className="text-danger">*</span>
            </label>
            <input
              id="modal-student-name"
              data-autofocus="true"
              data-testid="modal-student-name-input"
              type="text"
              value={modalStudentName}
              onChange={(e) => {
                setModalStudentName(e.target.value);
                if (modalValidationError) setModalValidationError(null);
              }}
              placeholder="Ví dụ: Nguyễn Minh Châu..."
              className="w-full px-3.5 py-2 rounded-xl bg-surface border border-border text-sm text-ink placeholder-ink-muted/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label
                htmlFor="modal-student-code"
                className="block text-xs font-bold text-ink"
              >
                Mã học viên (Tự sinh hoặc nhập tay)
              </label>
              <button
                type="button"
                onClick={handleRegenerateCode}
                className="inline-flex items-center gap-1 text-xs font-semibold text-gold hover:text-ink transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
              >
                <RefreshCw className="w-3.5 h-3.5" />
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
              className="w-full px-3.5 py-2 rounded-xl bg-surface border border-border text-sm font-mono font-bold text-ink placeholder-ink-muted/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="modal-student-hsk"
                className="block text-xs font-bold text-ink mb-1"
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
                className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-sm font-semibold text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
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
                className="block text-xs font-bold text-ink mb-1"
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
                className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-sm font-semibold text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-surface border border-border text-xs font-semibold text-ink hover:bg-primary/10 transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            Hủy bỏ
          </button>
          <button
            type="submit"
            data-testid="confirm-add-student-btn"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary hover:opacity-95 text-on-primary text-xs font-bold shadow-xs transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Thêm vào danh sách</span>
          </button>
        </div>
      </form>
    </Dialog>
  );
};
