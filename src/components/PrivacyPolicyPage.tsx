import React, { useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Database,
  Download,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserCheck,
  Users,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const PrivacyPolicyPage: React.FC = () => {
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [confirmClearLocal, setConfirmClearLocal] = useState(false);

  const handleExportPersonalData = () => {
    try {
      const exportedData: Record<string, unknown> = {
        exportedAt: new Date().toISOString(),
        platform: 'Bin-Bin HSK (HANU × 阮文受)',
        legalFramework: [
          'Luật Bảo vệ dữ liệu cá nhân số 91/2025/QH15',
          'Nghị định 356/2025/NĐ-CP',
          'Nghị định 13/2023/NĐ-CP',
        ],
        localStorageItems: {} as Record<string, unknown>,
      };

      const itemsMap = exportedData.localStorageItems as Record<string, unknown>;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('hanu_')) {
          const rawVal = localStorage.getItem(key);
          try {
            itemsMap[key] = rawVal ? JSON.parse(rawVal) : rawVal;
          } catch {
            itemsMap[key] = rawVal;
          }
        }
      }

      const blob = new Blob([JSON.stringify(exportedData, null, 2)], {
        type: 'application/json;charset=utf-8',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStr = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `BinBin_HSK_DuLieuCaNhan_${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setActionMessage(
        'Đã xuất thành công toàn bộ dữ liệu học tập cá nhân (.json) trên thiết bị này.'
      );
    } catch {
      setActionMessage('Không thể xuất dữ liệu lúc này. Vui lòng thử lại.');
    }
  };

  const handleClearLocalData = () => {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('hanu_')) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
      sessionStorage.clear();
      setConfirmClearLocal(false);
      setActionMessage(
        `Đã xóa sạch ${keysToRemove.length} mục dữ liệu học tập cục bộ trên trình duyệt này (An toàn cho máy tính dùng chung).`
      );
    } catch {
      setActionMessage('Không thể xóa dữ liệu cục bộ lúc này.');
    }
  };

  return (
    <div
      data-testid="privacy-policy-page"
      className="max-w-3xl mx-auto px-4 py-6 sm:py-8 space-y-6 pb-24"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-muted hover:text-ink transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Quay về trang học
        </Link>
        <span className="px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
          Tuân thủ Luật BVDLCN 91/2025/QH15 & NĐ 356/2025/NĐ-CP
        </span>
      </div>

      <header className="space-y-2 border-b border-border pb-5">
        <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
          <ShieldCheck className="w-4 h-4" />
          Chính sách quyền riêng tư & Bảo vệ dữ liệu cá nhân
        </div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-ink tracking-tight">
          Dữ liệu học tập của bạn được bảo vệ như thế nào?
        </h1>
        <p className="text-sm text-ink-muted leading-relaxed">
          Áp dụng cho nền tảng học tiếng Trung <strong>Bin-Bin HSK (HANU × 阮文受)</strong>. Văn bản
          này được xây dựng minh bạch theo <strong>Luật Bảo vệ dữ liệu cá nhân số 91/2025/QH15</strong>,{' '}
          <strong>Nghị định 356/2025/NĐ-CP</strong> và <strong>Nghị định 13/2023/NĐ-CP</strong>.
        </p>
      </header>

      {/* Self-service Data Subject Rights Card */}
      <section
        data-testid="privacy-self-service-card"
        className="rounded-2xl bg-surface border-2 border-border-strong p-4 sm:p-5 space-y-3 shadow-2xs"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-ink flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-primary shrink-0" />
              Trung tâm Tự quản lý Dữ liệu Cá nhân (Quyền của Chủ thể dữ liệu)
            </h2>
            <p className="text-xs text-ink-muted mt-0.5">
              Bạn có toàn quyền truy cập, tải xuống bản sao dữ liệu học tập hoặc xóa sạch dữ liệu
              cục bộ khi sử dụng máy tính công cộng / phòng máy nhà trường.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 pt-1">
          <button
            type="button"
            data-testid="privacy-export-json-btn"
            onClick={handleExportPersonalData}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary-hover transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Xuất dữ liệu cá nhân (.json)
          </button>

          {!confirmClearLocal ? (
            <button
              type="button"
              data-testid="privacy-clear-local-btn"
              onClick={() => setConfirmClearLocal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-surface-2 border border-border text-ink text-xs font-semibold hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Xóa dữ liệu cục bộ trên thiết bị này
            </button>
          ) : (
            <div className="inline-flex items-center gap-2 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-xl">
              <span className="text-xs font-semibold text-rose-800">
                Xác nhận xóa dữ liệu cục bộ?
              </span>
              <button
                type="button"
                data-testid="privacy-confirm-clear-local-btn"
                onClick={handleClearLocalData}
                className="px-2.5 py-1 rounded-lg bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 cursor-pointer"
              >
                Đồng ý xóa
              </button>
              <button
                type="button"
                onClick={() => setConfirmClearLocal(false)}
                className="px-2 py-1 rounded-lg text-xs font-semibold text-ink-muted hover:text-ink cursor-pointer"
              >
                Hủy
              </button>
            </div>
          )}
        </div>

        {actionMessage && (
          <div
            data-testid="privacy-action-feedback"
            className="flex items-center gap-2 text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionMessage}</span>
          </div>
        )}
      </section>

      <section className="space-y-4 text-sm text-ink leading-relaxed">
        <div className="p-4 sm:p-5 rounded-xl bg-surface border border-border space-y-2">
          <div className="flex items-center gap-2 font-semibold text-ink">
            <Database className="w-4 h-4 text-primary" />
            1. Danh mục dữ liệu thu thập & Nguyên tắc tối thiểu hóa
          </div>
          <p className="text-ink-muted">
            Ứng dụng tuân thủ nguyên tắc <strong>Tối thiểu hóa dữ liệu (Data Minimization)</strong>{' '}
            — chỉ xử lý dữ liệu cá nhân cơ bản phục vụ trực tiếp cho việc học tập, <strong>không</strong>{' '}
            thu thập dữ liệu cá nhân nhạy cảm (không thu thập CCCD, tài chính, vị trí GPS hay danh bạ):
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-ink-muted">
            <li>
              <strong>Khi bạn tự học (không đăng nhập lớp)</strong>: Tiến độ từ vựng, lịch ôn tập
              ngắt quãng (SRS), chuỗi ngày học (Daily Streak) và mục tiêu ngày chỉ lưu cục bộ ngay
              trên trình duyệt của bạn (<code>localStorage</code>). Không có bất kỳ dữ liệu nào gửi
              về máy chủ.
            </li>
            <li>
              <strong>Khi bạn tham gia Lớp học trực tuyến</strong>: Hệ thống lưu Tên hiển thị do bạn
              nhập, Mã học viên ngẫu nhiên do Giảng viên cấp (<code>HV-XXXXXX</code>), điểm bài tập
              và lịch sử ôn tập SRS trên Google Cloud Firestore để Giảng viên chấm bài và theo dõi
              tiến độ.
            </li>
            <li>
              <strong>Khi Giảng viên đăng nhập bằng Google</strong>: Hệ thống xác thực địa chỉ Email,
              tên hiển thị và trạng thái xác thực email (<code>email_verified</code>) qua Firebase
              Authentication để kiểm tra quyền quản lý lớp học.
            </li>
            <li>
              <strong>Khi luyện phát âm giọng đọc (Web Speech API)</strong>: Giọng đọc tiếng Trung
              của bạn được xử lý trực tiếp bởi trình duyệt để so khớp phiên âm, <strong>không</strong>{' '}
              lưu trữ tệp ghi âm giọng nói trên máy chủ của ứng dụng.
            </li>
          </ul>
        </div>

        <div className="p-4 sm:p-5 rounded-xl bg-surface border border-border space-y-2">
          <div className="flex items-center gap-2 font-semibold text-ink">
            <Sparkles className="w-4 h-4 text-primary" />
            2. Sử dụng Trí tuệ nhân tạo (Google Gemini AI) & Tự động ẩn PII
          </div>
          <p className="text-ink-muted">
            Khi bạn tra cứu từ vựng chuyên sâu hoặc trò chuyện với Trợ giảng Gấu Trúc Bân Bân (彬彬),
            nội dung câu hỏi tiếng Trung/tiếng Việt sẽ được gửi qua máy chủ proxy tới dịch vụ{' '}
            <strong>Google Gemini API</strong> để tạo câu trả lời sư phạm.
          </p>
          <p className="text-ink-muted">
            <strong>Bảo vệ dữ liệu cá nhân trước khi gửi AI</strong>: Máy chủ Bin-Bin HSK tích hợp
            bộ lọc tự động che (mask) địa chỉ Email và Số điện thoại nếu người dùng vô tình nhập vào
            khung chat, đồng thời không đính kèm Mã học viên hay danh sách lớp vào câu lệnh gửi tới
            Gemini.
          </p>
        </div>

        <div className="p-4 sm:p-5 rounded-xl bg-surface border border-border space-y-2">
          <div className="flex items-center gap-2 font-semibold text-ink">
            <Users className="w-4 h-4 text-primary" />
            3. Bảo vệ dữ liệu Trẻ em & Học viên dưới 16 tuổi
          </div>
          <p className="text-ink-muted">
            Theo quy định của Luật Bảo vệ dữ liệu cá nhân số 91/2025/QH15 và Nghị định
            356/2025/NĐ-CP về xử lý dữ liệu của trẻ em và người dưới 16 tuổi:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-ink-muted">
            <li>
              Học sinh dưới 16 tuổi khi tham gia lớp học trực tuyến cần có sự đồng ý và hướng dẫn của
              Phụ huynh/Người giám hộ hoặc Giảng viên chủ nhiệm lớp được nhà trường/phụ huynh ủy quyền.
            </li>
            <li>
              Khuyến nghị học sinh sử dụng <strong>Tên viết tắt hoặc Biệt danh học tập</strong> kèm
              Mã học viên ngẫu nhiên (ví dụ: <code>Minh Châu · HV-7X9P2M</code>) và không nhập thông
              tin liên lạc cá nhân lên hệ thống.
            </li>
            <li>
              Trên Bảng xếp hạng lớp học, người dùng và giảng viên có thể bật chế độ{' '}
              <strong>Ẩn bớt Mã học viên & Họ tên</strong> khi trình chiếu trên lớp.
            </li>
          </ul>
        </div>

        <div className="p-4 sm:p-5 rounded-xl bg-surface border border-border space-y-2">
          <div className="flex items-center gap-2 font-semibold text-ink">
            <Lock className="w-4 h-4 text-primary" />
            4. Biện pháp Bảo mật Kỹ thuật & Thời hạn Lưu trữ
          </div>
          <ul className="list-disc pl-5 space-y-1.5 text-ink-muted">
            <li>
              Toàn bộ kết nối truyền tải qua giao thức mã hóa <strong>HTTPS / TLS</strong>.
            </li>
            <li>
              Đáp án bài tập (<code>answerKeys</code>) được tách riêng khỏi đề bài công khai và chỉ
              chấm điểm ở phía máy chủ (Server-side Grading) để đảm bảo công bằng.
            </li>
            <li>
              Học viên trong lớp không thể xem danh sách hồ sơ chi tiết hoặc bài nộp của học viên
              khác do quy tắc phân quyền <code>firestore.rules</code> kiểm soát chặt chẽ theo từng
              định danh <code>uid</code>.
            </li>
            <li>
              <strong>Thời hạn lưu trữ</strong>: Dữ liệu lớp học được lưu trữ trong suốt khóa học và
              tối đa 12 tháng sau khi kết thúc khóa để học viên tra cứu lại kết quả, trừ khi Giảng
              viên hoặc Học viên yêu cầu xóa sớm hơn.
            </li>
          </ul>
        </div>

        <div className="p-4 sm:p-5 rounded-xl bg-surface border border-border space-y-2">
          <div className="flex items-center gap-2 font-semibold text-ink">
            <Mail className="w-4 h-4 text-primary" />
            5. Liên hệ Thực hiện Quyền Chủ thể Dữ liệu & Báo cáo Sự cố
          </div>
          <p className="text-ink-muted">
            Nếu bạn hoặc Phụ huynh cần yêu cầu chỉnh sửa, rút lại sự đồng ý, xóa hồ sơ học viên trên
            Cloud Firestore hoặc thông báo sự cố bảo mật, vui lòng liên hệ trực tiếp Giảng viên phụ
            trách lớp học hoặc Ban quản trị dự án qua địa chỉ:{' '}
            <a
              href="mailto:dondon.win10@gmail.com"
              className="font-semibold text-primary hover:underline"
            >
              dondon.win10@gmail.com
            </a>{' '}
            (Thời gian phản hồi và xử lý yêu cầu: trong vòng 72 giờ làm việc theo quy định pháp luật).
          </p>
        </div>
      </section>
    </div>
  );
};

export default PrivacyPolicyPage;
