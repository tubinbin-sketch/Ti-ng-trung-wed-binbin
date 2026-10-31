import React, { useState } from 'react';
import { Lock, ShieldCheck, KeyRound, X, ArrowRight, AlertCircle } from 'lucide-react';
import { DEFAULT_TEACHER_PIN, setTeacherSessionUnlocked, verifyTeacherPin } from '../utils/storageService';

interface TeacherPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessUnlock: () => void;
}

export const TeacherPinModal: React.FC<TeacherPinModalProps> = ({
  isOpen,
  onClose,
  onSuccessUnlock,
}) => {
  const [pinInput, setPinInput] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (verifyTeacherPin(pinInput)) {
      setTeacherSessionUnlocked(true);
      setErrorMsg(null);
      setPinInput('');
      onSuccessUnlock();
    } else {
      setErrorMsg('Mã PIN giảng viên chưa đúng. Vui lòng nhập mã PIN chuẩn (2026).');
    }
  };

  const handleQuickDemoUnlock = () => {
    setPinInput(DEFAULT_TEACHER_PIN);
    setTeacherSessionUnlocked(true);
    setErrorMsg(null);
    onSuccessUnlock();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Xác Thực Mã PIN Cổng Giảng Viên"
      data-testid="teacher-pin-modal"
    >
      <div className="w-full max-w-md rounded-3xl bg-[#FAF7F0] border border-[#C5B358]/60 text-[#0F382E] p-6 shadow-2xl space-y-4">
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-[#0F5243]/15">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#0F5243] to-[#166E5B] text-[#FAF7F0] flex items-center justify-center shrink-0 shadow-xs">
              <Lock className="w-5 h-5 text-[#C5B358]" />
            </div>
            <div>
              <div className="text-sm font-bold text-[#9B8A3E] flex items-center gap-1">
                <ShieldCheck className="w-4 h-4 text-[#0F5243]" />
                <span>BẢO MẬT CỔNG GIẢNG VIÊN</span>
              </div>
              <h3 className="text-lg font-bold text-[#0F382E]">
                Xác Thực Giảng Viên (教师端)
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng hộp thoại PIN"
            className="p-1.5 rounded-xl text-[#3A544B] hover:bg-[#0F5243]/10 hover:text-[#0F382E] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-[#3A544B] leading-relaxed">
          Nhập mã PIN giảng viên để mở khóa quyền chỉnh sửa bộ thẻ từ vựng, quản lý danh sách học viên và chấm điểm lớp học (Mã PIN mặc định: <strong className="text-[#0F382E]">2026</strong>).
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label
              htmlFor="teacher-pin-input"
              className="block text-sm font-bold text-[#0F382E] mb-1.5"
            >
              Mã PIN Giảng viên:
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-[#9B8A3E] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="teacher-pin-input"
                data-testid="teacher-pin-input"
                type="password"
                inputMode="numeric"
                autoFocus
                value={pinInput}
                onChange={(e) => {
                  setPinInput(e.target.value);
                  if (errorMsg) setErrorMsg(null);
                }}
                placeholder="Nhập mã PIN (2026)..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-[#0F5243]/25 text-sm font-bold text-[#0F382E] tracking-widest focus:outline-none focus:border-[#0F5243]"
              />
            </div>
          </div>

          {errorMsg && (
            <div className="p-2.5 rounded-xl bg-red-50 border border-red-300 text-red-900 text-sm font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
            <button
              type="submit"
              data-testid="confirm-teacher-pin-btn"
              className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#0F5243] to-[#166E5B] hover:from-[#12604F] hover:to-[#1B7D68] text-[#FAF7F0] text-sm font-bold flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
            >
              <span>Xác nhận PIN</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              data-testid="quick-demo-pin-unlock-btn"
              onClick={handleQuickDemoUnlock}
              className="py-2.5 px-3.5 rounded-xl bg-white hover:bg-[#E7ECD9] text-[#0F382E] border border-[#C5B358]/60 text-sm font-bold transition-colors cursor-pointer"
            >
              Mở nhanh (PIN: 2026)
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
