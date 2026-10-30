import React, { useState } from 'react';
import { GraduationCap, BookOpen, X, Check, ArrowRight, ShieldCheck } from 'lucide-react';

export type UserRole = 'teacher' | 'student';

export interface UserProfile {
  role: UserRole;
  name: string;
  classCode: string;
}

interface AuthModalProps {
  isOpen: boolean;
  currentUser: UserProfile;
  onClose: () => void;
  onSelectRoleAndLogin: (profile: UserProfile) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  currentUser,
  onClose,
  onSelectRoleAndLogin,
}) => {
  const [selectedRole, setSelectedRole] = useState<UserRole>(currentUser.role);
  const [teacherName, setTeacherName] = useState('Nguyễn Văn Thụ (阮文受)');
  const [studentName, setStudentName] = useState('Lưu Thị Minh Thư');
  const [classCode, setClassCode] = useState(currentUser.classCode || '722229');

  if (!isOpen) return null;

  const handleConfirmTeacher = () => {
    onSelectRoleAndLogin({
      role: 'teacher',
      name: teacherName.trim() || 'Nguyễn Văn Thụ (阮文受)',
      classCode: classCode.trim() || '722229',
    });
  };

  const handleConfirmStudent = () => {
    onSelectRoleAndLogin({
      role: 'student',
      name: studentName.trim() || 'Lưu Thị Minh Thư',
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
            <p className="text-xs sm:text-sm text-[#3F5447] mt-1">
              Giao diện được tối giản riêng biệt cho Giảng viên (2 công cụ soạn &amp; quản lý lớp) và Học sinh (2 mục học từ, tập viết &amp; làm bài tập).
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng cổng đăng nhập"
            className="p-2 rounded-xl text-[#3F5447] hover:bg-[#E7ECD9] hover:text-[#1E3227] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2 Large Role Selection Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 my-6">
          {/* Card 1: Teacher Portal */}
          <div
            onClick={() => setSelectedRole('teacher')}
            className={`rounded-2xl p-5 border-2 transition-all cursor-pointer flex flex-col justify-between ${
              selectedRole === 'teacher'
                ? 'bg-[#F1F5EC] border-[#1E3227]'
                : 'bg-white border-[#D5DEC7] hover:border-[#9B8A3E]'
            }`}
          >
            <div>
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
              <p className="text-xs text-[#3F5447] mt-1.5 leading-relaxed">
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

              <div className="mt-4 pt-3 border-t border-[#DCE2CE]">
                <label
                  htmlFor="portal-teacher-name"
                  className="block text-[11px] font-semibold text-[#3F5447] mb-1"
                >
                  Tên Giảng viên đăng nhập:
                </label>
                <input
                  id="portal-teacher-name"
                  type="text"
                  value={teacherName}
                  onChange={(e) => setTeacherName(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#C5CFB4] text-xs font-medium text-[#1E3227] focus:outline-none focus:border-[#1E3227]"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleConfirmTeacher();
              }}
              className="mt-5 w-full py-2.5 px-4 rounded-xl bg-[#1E3227] hover:bg-[#2B4637] text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
              data-testid="enter-teacher-portal-btn"
            >
              <span>Vào Cổng Giáo Viên</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Card 2: Student Portal */}
          <div
            onClick={() => setSelectedRole('student')}
            className={`rounded-2xl p-5 border-2 transition-all cursor-pointer flex flex-col justify-between ${
              selectedRole === 'student'
                ? 'bg-[#F1F5EC] border-[#1E3227]'
                : 'bg-white border-[#D5DEC7] hover:border-[#9B8A3E]'
            }`}
          >
            <div>
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
              <p className="text-xs text-[#3F5447] mt-1.5 leading-relaxed">
                Dành cho Học viên vào học từ vựng thầy/cô đã giao, tập viết nét chữ trên ô chữ Mễ và làm trò chơi bài tập.
              </p>

              <ul className="mt-3.5 space-y-1.5 text-xs text-[#1E3227]">
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-[#2E6B47] shrink-0" />
                  <span>1. Bài Học &amp; Tập Viết Hôm Nay (Ô chữ Mễ trực tiếp)</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-[#2E6B47] shrink-0" />
                  <span>2. Trò Chơi Ghép Câu &amp; Bảng Xếp Hạng Thi Đua</span>
                </li>
              </ul>

              <div className="mt-4 pt-3 border-t border-[#DCE2CE] grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label
                    htmlFor="portal-student-name"
                    className="block text-[11px] font-semibold text-[#3F5447] mb-1"
                  >
                    Họ tên Học sinh:
                  </label>
                  <input
                    id="portal-student-name"
                    type="text"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#C5CFB4] text-xs font-medium text-[#1E3227] focus:outline-none focus:border-[#1E3227]"
                  />
                </div>
                <div>
                  <label
                    htmlFor="portal-class-code"
                    className="block text-[11px] font-semibold text-[#3F5447] mb-1"
                  >
                    Mã lớp:
                  </label>
                  <input
                    id="portal-class-code"
                    type="text"
                    value={classCode}
                    onChange={(e) => setClassCode(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full px-2.5 py-2 rounded-xl bg-white border border-[#C5CFB4] text-xs font-medium text-[#1E3227] tabular-nums focus:outline-none focus:border-[#1E3227]"
                  />
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleConfirmStudent();
              }}
              className="mt-5 w-full py-2.5 px-4 rounded-xl bg-[#9B8A3E] hover:bg-[#867632] text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
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
