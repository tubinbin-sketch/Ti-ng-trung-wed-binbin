import React, { useEffect, useMemo, useState } from 'react';
import { GraduationCap, BookOpen, X, Check, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';
import { ClassStudentRecord } from '../utils/chineseEngine';
import { getStoredStudentRoster } from './ClassroomManager';

export type UserRole = 'teacher' | 'student';

export interface UserProfile {
  role: UserRole;
  name: string;
  studentCode?: string;
  classCode: string;
}

interface AuthModalProps {
  isOpen: boolean;
  currentUser: UserProfile;
  roster?: ClassStudentRecord[];
  onClose: () => void;
  onSelectRoleAndLogin: (profile: UserProfile) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  currentUser,
  roster: propRoster,
  onClose,
  onSelectRoleAndLogin,
}) => {
  const activeRoster = useMemo<ClassStudentRecord[]>(() => {
    if (Array.isArray(propRoster)) return propRoster;
    return getStoredStudentRoster();
  }, [propRoster, isOpen]);

  const [selectedRole, setSelectedRole] = useState<UserRole>(currentUser.role);
  const [teacherName, setTeacherName] = useState('Nguyễn Văn Thụ (阮文受)');
  const [studentCodeInput, setStudentCodeInput] = useState<string>(() => {
    if (currentUser.studentCode) return currentUser.studentCode;
    const matched = activeRoster.find((s) => s.name === currentUser.name);
    return matched?.studentCode || activeRoster[0]?.studentCode || 'HV-001';
  });
  const [classCode, setClassCode] = useState(currentUser.classCode || '722229');
  const [studentAuthError, setStudentAuthError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setStudentAuthError(null);
    const matched = activeRoster.find(
      (s) => s.studentCode === currentUser.studentCode || s.name === currentUser.name
    );
    if (matched?.studentCode) {
      setStudentCodeInput(matched.studentCode);
    } else if (activeRoster[0]?.studentCode) {
      setStudentCodeInput(activeRoster[0].studentCode);
    }
  }, [isOpen, currentUser.name, currentUser.studentCode, activeRoster]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const matchedStudent = activeRoster.find(
    (s) => (s.studentCode || '').trim().toUpperCase() === studentCodeInput.trim().toUpperCase()
  );

  const handleConfirmTeacher = () => {
    onSelectRoleAndLogin({
      role: 'teacher',
      name: teacherName.trim() || 'Nguyễn Văn Thụ (阮文受)',
      classCode: classCode.trim() || '722229',
    });
  };

  const handleConfirmStudent = () => {
    const cleanCode = studentCodeInput.trim().toUpperCase();
    if (!cleanCode) {
      setStudentAuthError('Vui lòng chọn hoặc nhập Mã học viên được Giáo viên cấp (ví dụ: HV-001).');
      return;
    }

    if (activeRoster.length === 0) {
      setStudentAuthError(
        'Lớp học hiện chưa có danh sách học viên. Vui lòng nhờ Giáo viên cấp Mã học viên hoặc bật Chế độ Demo.'
      );
      return;
    }

    const found = activeRoster.find(
      (s) => (s.studentCode || '').trim().toUpperCase() === cleanCode
    );
    if (!found) {
      setStudentAuthError(
        `Mã học viên "${cleanCode}" không tồn tại trong danh sách lớp. Vui lòng chọn đúng mã HV-xxx được cấp.`
      );
      return;
    }

    setStudentAuthError(null);
    onSelectRoleAndLogin({
      role: 'student',
      name: found.name,
      studentCode: found.studentCode,
      classCode: classCode.trim() || '722229',
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Cổng Đăng Nhập và Chọn Vai Trò HANU × 阮文受"
      data-testid="auth-role-modal"
    >
      <div className="w-full max-w-3xl rounded-3xl bg-[#FAFBF7] border border-[#C5CFB4] text-[#1E3227] p-6 sm:p-8 shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 pb-5 border-b border-[#DCE2CE]">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#9B8A3E]">
              <ShieldCheck className="w-4 h-4" />
              <span>HANU × 阮文受 · CỔNG ĐĂNG NHẬP HỆ THỐNG</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-[#1E3227] mt-1">
              Chọn Vai Trò Để Bắt Đầu Trải Nghiệm
            </h3>
            <p className="text-sm text-[#3F5447] mt-1">
              Giao diện được tối giản riêng biệt cho Giảng viên (2 công cụ soạn &amp; quản lý lớp) và Học sinh (đăng nhập theo Mã học viên được cấp).
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng cổng đăng nhập"
            className="p-2 rounded-xl text-[#3F5447] hover:bg-[#E7ECD9] hover:text-[#1E3227] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2 Large Role Selection Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 my-6">
          {/* Card 1: Teacher Portal */}
          <div
            className={`rounded-2xl p-5 border-2 transition-all flex flex-col justify-between ${
              selectedRole === 'teacher'
                ? 'bg-[#F1F5EC] border-[#1E3227]'
                : 'bg-white border-[#D5DEC7] hover:border-[#9B8A3E]'
            }`}
          >
            <div>
              <button
                type="button"
                data-testid="select-role-teacher-card-btn"
                aria-pressed={selectedRole === 'teacher'}
                onClick={() => setSelectedRole('teacher')}
                className="w-full text-left cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#1E3227] rounded-xl"
              >
                <div className="flex items-center justify-between">
                  <div className="w-11 h-11 rounded-2xl bg-[#1E3227] text-[#F7E29C] flex items-center justify-center">
                    <GraduationCap className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-bold tracking-wider uppercase text-[#9B8A3E]">
                    教师端 · GIẢNG VIÊN
                  </span>
                </div>

                <h4 className="text-lg font-bold text-[#1E3227] mt-4">
                  Cổng Giáo Viên (教师端)
                </h4>
                <p className="text-sm text-[#3F5447] mt-1.5 leading-relaxed">
                  Dành cho Giảng viên soạn bài tự động kèm nét viết chữ Mễ, hình ảnh minh họa, trình chiếu và quản lý lớp học.
                </p>

                <ul className="mt-3.5 space-y-1.5 text-xs text-[#1E3227]">
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-[#2E6B47] shrink-0" />
                    <span>1. Soạn Bài Tự Động (Chữ Hán + Cách viết + Ảnh)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-[#2E6B47] shrink-0" />
                    <span>2. Quản Lý Lớp &amp; Giao Bài Chấm Điểm Tự Động</span>
                  </li>
                </ul>
              </button>

              <div className="mt-4 pt-3 border-t border-[#DCE2CE]">
                <label
                  htmlFor="portal-teacher-name"
                  className="block text-xs font-semibold text-[#3F5447] mb-1"
                >
                  Tên Giảng viên đăng nhập:
                </label>
                <input
                  id="portal-teacher-name"
                  type="text"
                  value={teacherName}
                  onFocus={() => setSelectedRole('teacher')}
                  onChange={(e) => setTeacherName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#C5CFB4] text-sm font-medium text-[#1E3227] focus:outline-none focus:border-[#1E3227]"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleConfirmTeacher}
              className="mt-5 w-full py-2.5 px-4 rounded-xl bg-[#1E3227] hover:bg-[#2B4637] text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              data-testid="enter-teacher-portal-btn"
            >
              <span>Vào Cổng Giáo Viên</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Card 2: Student Portal */}
          <div
            className={`rounded-2xl p-5 border-2 transition-all flex flex-col justify-between ${
              selectedRole === 'student'
                ? 'bg-[#F1F5EC] border-[#1E3227]'
                : 'bg-white border-[#D5DEC7] hover:border-[#9B8A3E]'
            }`}
          >
            <div>
              <button
                type="button"
                data-testid="select-role-student-card-btn"
                aria-pressed={selectedRole === 'student'}
                onClick={() => setSelectedRole('student')}
                className="w-full text-left cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#1E3227] rounded-xl"
              >
                <div className="flex items-center justify-between">
                  <div className="w-11 h-11 rounded-2xl bg-[#9B8A3E] text-white flex items-center justify-center">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-bold tracking-wider uppercase text-[#3F5447]">
                    学生端 · HỌC VIÊN
                  </span>
                </div>

                <h4 className="text-lg font-bold text-[#1E3227] mt-4">
                  Cổng Học Sinh (学生端)
                </h4>
                <p className="text-sm text-[#3F5447] mt-1.5 leading-relaxed">
                  Chọn đúng Mã học viên (ví dụ HV-001) từ danh sách lớp hoặc nhập mã học viên đã được Giáo viên cấp để nộp bài đúng hồ sơ cá nhân.
                </p>
              </button>

              <div className="mt-4 pt-3 border-t border-[#DCE2CE] space-y-2.5">
                <div>
                  <label
                    htmlFor="portal-student-code-select"
                    className="block text-xs font-semibold text-[#3F5447] mb-1"
                  >
                    Chọn học viên trong danh sách lớp ({activeRoster.length} HV):
                  </label>
                  <select
                    id="portal-student-code-select"
                    data-testid="portal-student-code-select"
                    value={matchedStudent?.studentCode || ''}
                    onFocus={() => setSelectedRole('student')}
                    onChange={(e) => {
                      setSelectedRole('student');
                      setStudentCodeInput(e.target.value);
                      setStudentAuthError(null);
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#C5CFB4] text-sm font-bold text-[#1E3227] focus:outline-none focus:border-[#1E3227]"
                  >
                    {activeRoster.length === 0 ? (
                      <option value="">-- Lớp học chưa có học viên --</option>
                    ) : (
                      activeRoster.map((st, idx) => {
                        const code = st.studentCode || `HV-${String(idx + 1).padStart(3, '0')}`;
                        return (
                          <option key={st.id || code} value={code}>
                            {code} · {st.name} ({st.hskLevel || 'HSK 2'} · {st.totalPoints}đ)
                          </option>
                        );
                      })
                    )}
                  </select>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <label
                      htmlFor="portal-student-code-input"
                      className="block text-xs font-semibold text-[#3F5447] mb-1"
                    >
                      Hoặc nhập Mã học viên được cấp:
                    </label>
                    <input
                      id="portal-student-code-input"
                      data-testid="portal-student-code-input"
                      type="text"
                      value={studentCodeInput}
                      onFocus={() => setSelectedRole('student')}
                      onChange={(e) => {
                        setSelectedRole('student');
                        setStudentCodeInput(e.target.value.toUpperCase());
                        setStudentAuthError(null);
                      }}
                      placeholder="Ví dụ: HV-001"
                      className="w-full px-3 py-2 rounded-xl bg-white border border-[#C5CFB4] text-sm font-bold text-[#1E3227] uppercase tracking-wider focus:outline-none focus:border-[#1E3227]"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="portal-class-code"
                      className="block text-xs font-semibold text-[#3F5447] mb-1"
                    >
                      Mã lớp:
                    </label>
                    <input
                      id="portal-class-code"
                      type="text"
                      value={classCode}
                      onChange={(e) => setClassCode(e.target.value)}
                      className="w-full px-2.5 py-2 rounded-xl bg-white border border-[#C5CFB4] text-sm font-medium text-[#1E3227] tabular-nums focus:outline-none focus:border-[#1E3227]"
                    />
                  </div>
                </div>

                {matchedStudent && (
                  <div className="px-3 py-1.5 rounded-lg bg-[#E7ECD9]/80 text-xs font-semibold text-[#1E3227]">
                    ✓ Xác nhận hồ sơ: <strong>{matchedStudent.studentCode}</strong> —{' '}
                    <strong>{matchedStudent.name}</strong> ({matchedStudent.hskLevel || 'HSK 2'})
                  </div>
                )}

                {studentAuthError && (
                  <div
                    data-testid="student-auth-error"
                    className="p-2 rounded-lg bg-red-50 border border-red-300 text-red-900 text-xs font-semibold flex items-center gap-1.5"
                  >
                    <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                    <span>{studentAuthError}</span>
                  </div>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={handleConfirmStudent}
              className="mt-5 w-full py-2.5 px-4 rounded-xl bg-[#9B8A3E] hover:bg-[#867632] text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              data-testid="enter-student-portal-btn"
            >
              <span>Vào Cổng Học Sinh</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Footer Note */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-[#DCE2CE] text-xs text-[#3F5447]">
          <span>
            Đang đăng nhập:{' '}
            <strong className="text-[#1E3227]">
              {currentUser.role === 'teacher' ? 'Giáo viên' : 'Học sinh'}: {currentUser.name}
            </strong>
          </span>
          <span>Bạn có thể chuyển đổi nhanh giữa 2 chế độ bất cứ lúc nào trên thanh công cụ.</span>
        </div>
      </div>
    </div>
  );
};


