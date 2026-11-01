import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  X,
  GraduationCap,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  LogIn,
  PlayCircle,
  Loader2,
  Lock,
} from 'lucide-react';
import {
  auth,
  signInTeacherWithGoogle,
  joinClassAsStudent,
  linkAnonymousStudentWithGoogle,
  type ClassroomMetadata,
} from '../firebase';
import {
  saveActiveClassroomSession,
  setClassroomDataMode,
  setTeacherSessionUnlocked,
  setActiveStudentStorageId,
} from '../utils/storageService';
import { Dialog } from './ui/Dialog';

export type UserRole = 'student' | 'teacher';

export interface UserProfile {
  role: UserRole;
  name: string;
  uid?: string;
  email?: string;
  classId?: string;
  classCode?: string;
  studentCode?: string;
  isDemo?: boolean;
}

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: UserProfile;
  onSelectRoleAndLogin?: (profile: UserProfile) => void;
  currentRole?: 'student' | 'teacher';
  studentName?: string;
  onSelectStudent?: (name: string, studentCode?: string, classId?: string) => void;
  onUnlockTeacher?: (classroom?: ClassroomMetadata) => void;
  onEnterDemoMode?: (role?: 'student' | 'teacher') => void;
  standalonePage?: boolean;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSelectRoleAndLogin,
  currentRole = currentUser?.role || 'student',
  studentName = currentUser?.name || 'Học viên HSK',
  onSelectStudent,
  onUnlockTeacher,
  onEnterDemoMode,
  standalonePage = false,
}) => {
  const [joinCodeInput, setJoinCodeInput] = useState(
    currentUser?.classCode || 'HANU-HSK3'
  );
  const [studentCodeInput, setStudentCodeInput] = useState(
    currentUser?.studentCode || ''
  );
  const [studentError, setStudentError] = useState('');
  const [teacherError, setTeacherError] = useState('');
  const [isStudentLoading, setIsStudentLoading] = useState(false);
  const [isTeacherLoading, setIsTeacherLoading] = useState(false);

  useEffect(() => {
    if (!isOpen && !standalonePage) return;
    setStudentError('');
    setTeacherError('');
  }, [isOpen, standalonePage]);

  if (!isOpen && !standalonePage) return null;

  const handleTeacherGoogleLogin = async () => {
    setTeacherError('');
    setIsTeacherLoading(true);
    try {
      const { user, classroom } = await signInTeacherWithGoogle();
      setClassroomDataMode('new');
      setTeacherSessionUnlocked(true);
      const teacherName = user.displayName || user.email || 'Giảng viên HANU';
      saveActiveClassroomSession({
        classId: classroom.id,
        className: classroom.name,
        joinCode: classroom.joinCode,
        hskLevel: classroom.hskLevel,
        role: 'teacher',
        uid: user.uid,
        displayName: teacherName,
        email: user.email || undefined,
        teacherName,
        isDemo: false,
      });
      onUnlockTeacher?.(classroom);
      onSelectRoleAndLogin?.({
        role: 'teacher',
        name: teacherName,
        uid: user.uid,
        email: user.email || undefined,
        classId: classroom.id,
        classCode: classroom.joinCode,
        isDemo: false,
      });
      onClose();
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Không thể đăng nhập Google lúc này. Bạn có thể bấm "Xem bản demo" để trải nghiệm ngay.';
      setTeacherError(msg);
    } finally {
      setIsTeacherLoading(false);
    }
  };

  const handleStudentJoinSubmit = async (e: React.FormEvent, useGooglePopup = false) => {
    e.preventDefault();
    setStudentError('');
    const cleanJoin = joinCodeInput.trim().toUpperCase();
    const cleanCode = studentCodeInput.trim().toUpperCase();

    if (!cleanJoin) {
      setStudentError('Vui lòng nhập Mã lớp (ví dụ: HANU-HSK3) do Giảng viên cấp.');
      return;
    }
    if (!useGooglePopup && !cleanCode) {
      setStudentError('Vui lòng nhập Mã học sinh (ví dụ: HV-001) hoặc chọn Đăng nhập Google.');
      return;
    }

    setIsStudentLoading(true);
    try {
      const { user, classroom, studentRecord } = await joinClassAsStudent({
        joinCode: cleanJoin,
        studentCode: cleanCode || undefined,
        useGooglePopup,
      });

      setClassroomDataMode('new');
      setTeacherSessionUnlocked(false);
      setActiveStudentStorageId(user.uid);
      saveActiveClassroomSession({
        classId: classroom.id,
        className: classroom.name,
        joinCode: classroom.joinCode,
        hskLevel: classroom.hskLevel,
        role: 'student',
        uid: user.uid,
        displayName: studentRecord.name,
        studentCode: studentRecord.studentCode,
        studentName: studentRecord.name,
        isDemo: false,
      });
      onSelectStudent?.(studentRecord.name, studentRecord.studentCode, classroom.id);
      onSelectRoleAndLogin?.({
        role: 'student',
        name: studentRecord.name,
        uid: user.uid,
        classId: classroom.id,
        classCode: classroom.joinCode,
        studentCode: studentRecord.studentCode,
        isDemo: false,
      });
      onClose();
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Không thể tham gia lớp học. Hãy kiểm tra lại Mã lớp và Mã học sinh.';
      setStudentError(msg);
    } finally {
      setIsStudentLoading(false);
    }
  };

  const handleActivateDemo = (targetRole: 'student' | 'teacher') => {
    setClassroomDataMode('demo');
    if (targetRole === 'teacher') {
      setTeacherSessionUnlocked(true);
      saveActiveClassroomSession({
        classId: 'demo-hsk3-class',
        className: 'Lớp HSK 3.0 Bản Demo (Offline)',
        joinCode: 'DEMO-HSK3',
        hskLevel: 'HSK 3',
        role: 'teacher',
        uid: 'demo-teacher-uid',
        displayName: 'GV Nguyễn Văn Thụ (Demo)',
        teacherName: 'GV Nguyễn Văn Thụ (Demo)',
        isDemo: true,
      });
      onUnlockTeacher?.();
      onSelectRoleAndLogin?.({
        role: 'teacher',
        name: 'GV Nguyễn Văn Thụ (Demo)',
        uid: 'demo-teacher-uid',
        classId: 'demo-hsk3-class',
        classCode: 'DEMO-HSK3',
        isDemo: true,
      });
    } else {
      setTeacherSessionUnlocked(false);
      setActiveStudentStorageId('HV-001');
      saveActiveClassroomSession({
        classId: 'demo-hsk3-class',
        className: 'Lớp HSK 3.0 Bản Demo (Offline)',
        joinCode: 'DEMO-HSK3',
        hskLevel: 'HSK 3',
        role: 'student',
        uid: 'demo-student-hv001',
        displayName: 'Lưu Thị Minh Thư',
        studentCode: 'HV-001',
        studentName: 'Lưu Thị Minh Thư',
        isDemo: true,
      });
      onSelectStudent?.('Lưu Thị Minh Thư', 'HV-001', 'demo-hsk3-class');
      onSelectRoleAndLogin?.({
        role: 'student',
        name: 'Lưu Thị Minh Thư',
        uid: 'demo-student-hv001',
        classId: 'demo-hsk3-class',
        classCode: 'DEMO-HSK3',
        studentCode: 'HV-001',
        isDemo: true,
      });
    }

    onEnterDemoMode?.(targetRole);
    onClose();
  };

  const cardContent = (
    <div
      role={standalonePage ? 'region' : undefined}
      aria-labelledby="auth-modal-title"
      className="relative w-full max-w-2xl mx-auto rounded-3xl overflow-hidden shadow-2xl border border-border bg-surface-2 text-ink"
    >
      {/* Top Header Banner */}
      <div className="px-6 py-4 flex items-center justify-between border-b border-border bg-surface text-ink">
        <div className="flex items-center gap-3">
          <div
            lang="zh-CN"
            className="app-seal !w-10 !h-10"
          >
            汉
          </div>
          <div>
            <div className="text-xs text-ink-muted">
              HANU × <span lang="zh-CN">阮文受</span>
            </div>
            <h2 id="auth-modal-title" className="text-lg font-semibold text-ink">
              Đăng nhập
            </h2>
          </div>
        </div>
        {!standalonePage && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng cửa sổ đăng nhập"
            className="w-8 h-8 rounded-full hover:bg-surface-2 flex items-center justify-center text-ink-muted transition cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-on-primary"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Main Content */}
      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Card 1: Student Join via Class Code + Student Code or Google */}
        <div className="rounded-2xl p-5 bg-surface border border-border shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary">
                <GraduationCap className="w-3.5 h-3.5" />
                Học viên
              </span>
              {currentRole === 'student' && (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-success">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Đang chọn
                </span>
              )}
            </div>

            <h3 className="text-base font-semibold text-ink mb-1">
              Vào lớp bằng mã
            </h3>
            <p className="text-sm text-ink-muted mb-4 leading-relaxed">
              Nhập mã lớp và mã học viên giáo viên đã gửi cho bạn. Tiến độ và điểm số được lưu riêng cho từng người.
            </p>

            <form onSubmit={(e) => handleStudentJoinSubmit(e, false)} className="space-y-3">
              <div>
                <label
                  htmlFor="join-code-input"
                  className="block text-xs font-bold text-ink-muted mb-1"
                >
                  1. Mã lớp học (do Giáo viên cấp):
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="join-code-input"
                    data-autofocus="true"
                    type="text"
                    value={joinCodeInput}
                    onChange={(e) => {
                      setJoinCodeInput(e.target.value.toUpperCase());
                      setStudentError('');
                    }}
                    placeholder="VD: HANU-HSK3"
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-border bg-canvas text-sm font-bold text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus uppercase"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="student-code-input"
                  className="block text-xs font-bold text-ink-muted mb-1"
                >
                  2. Mã học sinh của riêng bạn:
                </label>
                  <input
                  id="student-code-input"
                  type="text"
                  value={studentCodeInput}
                  onChange={(e) => {
                    setStudentCodeInput(e.target.value.toUpperCase());
                    setStudentError('');
                  }}
                  placeholder="VD: HV-8K4M9P"
                  className="w-full px-3 py-2 rounded-xl border border-border bg-canvas text-sm font-bold text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus uppercase"
                />
              </div>

              {studentError && (
                <div
                  role="alert"
                  className="flex items-start gap-1.5 text-xs font-bold text-danger bg-danger/10 px-3 py-2 rounded-xl border border-danger/30"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{studentError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isStudentLoading}
                className="w-full py-2.5 rounded-xl font-semibold text-sm text-on-primary bg-primary hover:opacity-95 shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
              >
                {isStudentLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                <span>Vào lớp</span>
              </button>

              <button
                type="button"
                disabled={isStudentLoading}
                onClick={(e) => handleStudentJoinSubmit(e, true)}
                className="w-full py-2 rounded-xl font-semibold text-xs text-primary bg-primary/10 hover:bg-primary/15 border border-primary/30 transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
              >
                <LogIn className="w-4 h-4" />
                <span>Đăng nhập Google &amp; Tham gia lớp</span>
              </button>

              {auth.currentUser?.isAnonymous && (
                <button
                  type="button"
                  data-testid="link-anonymous-google-btn"
                  disabled={isStudentLoading}
                  onClick={async () => {
                    setStudentError('');
                    setIsStudentLoading(true);
                    try {
                      const linkedUser = await linkAnonymousStudentWithGoogle();
                      onSelectRoleAndLogin?.({
                        role: 'student',
                        name: linkedUser.displayName || studentName,
                        uid: linkedUser.uid,
                        email: linkedUser.email || undefined,
                        classId: currentUser?.classId,
                        classCode: currentUser?.classCode,
                        studentCode: currentUser?.studentCode,
                        isDemo: false,
                      });
                      onClose();
                    } catch (err) {
                      setStudentError(
                        err instanceof Error
                          ? err.message
                          : 'Không thể liên kết tài khoản Google lúc này.'
                      );
                    } finally {
                      setIsStudentLoading(false);
                    }
                  }}
                  className="w-full py-1.5 rounded-xl font-bold text-xs text-ink bg-canvas hover:bg-gold/15 border border-border-strong transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-gold" />
                  <span>Liên kết Google (Giữ tiến độ khi đổi máy)</span>
                </button>
              )}
            </form>
          </div>

          <div className="mt-3 pt-2.5 border-t border-border flex items-center justify-between text-xs text-ink-muted">
            <span>Học viên hiện tại:</span>
            <span className="font-semibold text-primary">{studentName}</span>
          </div>
        </div>

        {/* Card 2: Teacher Login via Google (Firebase Auth) */}
        <div className="rounded-2xl p-5 bg-surface border border-border shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-surface-2 text-ink-muted">
                <ShieldCheck className="w-3.5 h-3.5" />
                Giáo viên
              </span>
              {currentRole === 'teacher' && (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-gold">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Đã mở khóa GV
                </span>
              )}
            </div>

            <h3 className="text-base font-semibold text-ink mb-1">
              Đăng nhập bằng Google
            </h3>
            <p className="text-sm text-ink-muted mb-4 leading-relaxed">
              Tạo lớp, cấp mã cho học viên, soạn bài giảng và giao bài tập — dữ liệu lớp gắn với tài khoản Google của bạn.
            </p>

            {teacherError && (
              <div
                role="alert"
                className="mb-3 flex items-start gap-1.5 text-xs font-bold text-danger bg-danger/10 px-3 py-2 rounded-xl border border-danger/30"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{teacherError}</span>
              </div>
            )}

            <button
              type="button"
              onClick={handleTeacherGoogleLogin}
              disabled={isTeacherLoading}
              className="w-full py-3 rounded-xl font-semibold text-sm text-white bg-inverse hover:bg-inverse-hover shadow-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            >
              {isTeacherLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ShieldCheck className="w-4 h-4" />
              )}
              <span>Tiếp tục với Google</span>
            </button>
          </div>

          {/* Demo Mode Box */}
          <div className="mt-5 pt-4 border-t border-border">
            <div className="text-xs font-semibold text-ink mb-1.5 flex items-center gap-1.5">
              <PlayCircle className="w-4 h-4 text-gold" />
              <span>Dùng thử không cần tài khoản</span>
            </div>
            <p className="text-xs text-ink-muted mb-2.5">
              Xem nhanh giao diện với dữ liệu mẫu. Không có gì được lưu lên máy chủ.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                data-testid="demo-mode-student-btn"
                onClick={() => handleActivateDemo('student')}
                className="py-2 px-2.5 rounded-xl font-semibold text-xs bg-canvas hover:bg-primary/10 text-primary border border-border transition cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
              >
                Học viên mẫu
              </button>
              <button
                type="button"
                data-testid="demo-mode-teacher-btn"
                onClick={() => handleActivateDemo('teacher')}
                className="py-2 px-2.5 rounded-xl font-semibold text-xs bg-canvas hover:bg-accent/10 text-accent border border-border transition cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
              >
                Giáo viên mẫu
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Privacy Link */}
      <div className="px-6 py-3 bg-surface border-t border-border flex flex-wrap items-center justify-between gap-2 text-xs text-ink-muted">
        <span className="inline-flex items-center gap-1.5">
          <Lock className="w-3.5 h-3.5 text-primary" />
          <span>Bảo vệ dữ liệu cá nhân học viên theo Nghị định 13/2023/NĐ-CP</span>
        </span>
        <Link
          to="/chinh-sach-rieng-tu"
          onClick={onClose}
          className="font-bold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          Xem Chính sách quyền riêng tư →
        </Link>
      </div>
    </div>
  );

  if (standalonePage) {
    return (
      <div className="min-h-[calc(100vh-120px)] w-full flex items-center justify-center p-4">
        {cardContent}
      </div>
    );
  }

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      labelledBy="auth-modal-title"
      maxWidthClass="max-w-2xl"
      testId="auth-portal-dialog"
    >
      {cardContent}
    </Dialog>
  );
};
