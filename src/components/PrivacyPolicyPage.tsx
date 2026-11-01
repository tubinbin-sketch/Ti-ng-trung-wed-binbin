import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Mic, Database, UserCheck, Lock, ArrowLeft, FileText } from 'lucide-react';

export const PrivacyPolicyPage: React.FC = () => {
  return (
    <section
      data-testid="privacy-policy-page"
      aria-labelledby="privacy-policy-heading"
      className="max-w-4xl mx-auto my-4 sm:my-8 rounded-3xl bg-surface border border-border p-6 sm:p-10 shadow-md space-y-6 text-ink"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 pb-5 border-b border-border">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
            <ShieldCheck className="w-4 h-4" />
            <span>TUÂN THỦ NGHỊ ĐỊNH 13/2023/NĐ-CP · BẢO VỆ DỮ LIỆU CÁ NHÂN</span>
          </span>
          <h2 id="privacy-policy-heading" className="text-2xl sm:text-3xl font-semibold text-ink mt-2">
            Chính Sách Quyền Riêng Tư &amp; Bảo Vệ Dữ Liệu Học Viên
          </h2>
          <p className="text-sm text-ink-muted mt-1">
            Hệ thống Trợ Giảng &amp; Học Tập Hán Ngữ Chuẩn HSK 3.0 — HANU × <span lang="zh-CN">阮文受</span> (Cập nhật: 2026)
          </p>
        </div>

        <Link
          to="/hoc"
          data-testid="privacy-back-home-btn"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-on-primary text-sm font-bold shadow-xs hover:opacity-95 transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Quay về trang Học tập</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-5 rounded-2xl bg-canvas border border-border space-y-2">
          <div className="flex items-center gap-2 text-primary font-bold text-base">
            <Database className="w-5 h-5 shrink-0" />
            <h3>1. Phạm vi thu thập &amp; Lưu trữ dữ liệu học sinh</h3>
          </div>
          <p className="text-sm text-ink-muted leading-relaxed">
            Hệ thống chỉ thu thập các thông tin tối thiểu phục vụ trực tiếp cho việc giảng dạy và theo dõi tiến độ học tập HSK:
          </p>
          <ul className="list-disc pl-5 text-sm text-ink space-y-1">
            <li>Họ tên hiển thị, Mã học sinh (ví dụ: <code>HV-001</code>) và Mã lớp học.</li>
            <li>Định danh phiên bảo mật (Firebase <code>uid</code>) tách biệt cho từng học viên.</li>
            <li>Tiến độ ôn tập từ vựng ngắt quãng (SRS), độ chính xác nét viết chữ Hán và điểm bài tập.</li>
          </ul>
        </div>

        <div className="p-5 rounded-2xl bg-canvas border border-border space-y-2">
          <div className="flex items-center gap-2 text-accent font-bold text-base">
            <Mic className="w-5 h-5 shrink-0" />
            <h3>2. Quyền truy cập Micro &amp; Dữ liệu giọng nói</h3>
          </div>
          <p className="text-sm text-ink-muted leading-relaxed">
            Khi học viên bấm nút <strong>Luyện đọc / Thu âm phát âm</strong>, trình duyệt sẽ xin quyền truy cập Micro thông qua chuẩn <code>Web Speech API</code>:
          </p>
          <ul className="list-disc pl-5 text-sm text-ink space-y-1">
            <li>Micro chỉ kích hoạt khi học viên chủ động bấm nút thu âm và tự động ngắt ngay sau khi đọc xong câu.</li>
            <li>Hệ thống <strong>không ghi âm ngầm</strong> và <strong>không lưu trữ file âm thanh giọng nói</strong> của học viên trên máy chủ.</li>
            <li>Học viên có thể từ chối hoặc thu hồi quyền Micro bất kỳ lúc nào mà vẫn sử dụng đầy đủ các tính năng viết nét, Flashcard và làm bài tập.</li>
          </ul>
        </div>

        <div className="p-5 rounded-2xl bg-canvas border border-border space-y-2">
          <div className="flex items-center gap-2 text-primary font-bold text-base">
            <FileText className="w-5 h-5 shrink-0" />
            <h3>3. Tuân thủ Nghị định 13/2023/NĐ-CP</h3>
          </div>
          <p className="text-sm text-ink-muted leading-relaxed">
            Theo quy định tại <strong>Nghị định số 13/2023/NĐ-CP</strong> của Chính phủ Việt Nam về Bảo vệ dữ liệu cá nhân:
          </p>
          <ul className="list-disc pl-5 text-sm text-ink space-y-1">
            <li><strong>Quyền được biết &amp; đồng ý:</strong> Học viên và phụ huynh nắm rõ mục đích xử lý dữ liệu học tập trong phạm vi lớp học.</li>
            <li><strong>Quyền truy cập &amp; chỉnh sửa:</strong> Học viên và giảng viên có thể xem, xuất bản sao lưu (<code>.json</code>) hoặc yêu cầu cập nhật thông tin.</li>
            <li><strong>Quyền xóa dữ liệu:</strong> Học viên có quyền yêu cầu giảng viên xóa hồ sơ học viên và lịch sử điểm khỏi lớp học trên Cloud Firestore.</li>
          </ul>
        </div>

        <div className="p-5 rounded-2xl bg-canvas border border-border space-y-2">
          <div className="flex items-center gap-2 text-primary font-bold text-base">
            <Lock className="w-5 h-5 shrink-0" />
            <h3>4. Bảo mật Cloud Firestore &amp; Phân quyền</h3>
          </div>
          <p className="text-sm text-ink-muted leading-relaxed">
            Dữ liệu lớp học được bảo vệ bằng quy tắc bảo mật <code>firestore.rules</code> nghiêm ngặt:
          </p>
          <ul className="list-disc pl-5 text-sm text-ink space-y-1">
            <li>Chỉ giảng viên sở hữu lớp (xác thực qua Google Auth) mới có quyền quản trị danh sách học viên và giao đề bài.</li>
            <li>Mỗi học viên chỉ có quyền ghi dữ liệu bài nộp và sổ từ SRS của chính <code>uid</code> mình, không thể sửa điểm của học viên khác.</li>
            <li>Chế độ <strong>Xem bản demo</strong> chỉ chạy trên bộ nhớ tạm của trình duyệt, không gửi dữ liệu cá nhân lên đám mây.</li>
          </ul>
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-primary/10 border border-border flex flex-wrap items-center justify-between gap-3 text-sm">
        <div className="flex items-center gap-2 text-ink font-semibold">
          <UserCheck className="w-5 h-5 text-primary shrink-0" />
          <span>Mọi yêu cầu hỗ trợ về dữ liệu cá nhân, vui lòng liên hệ Giảng viên phụ trách lớp học HSK của bạn.</span>
        </div>
        <Link
          to="/dang-nhap"
          className="px-3.5 py-2 rounded-xl bg-surface border border-border text-ink font-bold text-xs hover:bg-canvas transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          Mở Cổng Đăng Nhập
        </Link>
      </div>
    </section>
  );
};
