# NHẬT KÝ NÂNG CẤP & BẢO MẬT HỆ THỐNG (CHANGELOG) — BIN-BIN HSK

Tài liệu này ghi nhận chi tiết toàn bộ quá trình kiểm toán, vá lỗi bảo mật, bảo vệ dữ liệu cá nhân và nâng cấp trải nghiệm học tập cho nền tảng **Bin-Bin HSK (HANU × 阮文受)**.

---

## [Đợt 1] Kiểm toán toàn diện Kiến trúc, Bảo mật & Dữ liệu cá nhân
- Lập báo cáo kiểm toán `/UPGRADE_AUDIT.md` phân tích 12 phân hệ: Frontend Shell, HomeDashboard, SlideDeckStudio, SRS Engine, Ngữ pháp & Từ điển Hán-Việt, Bài tập & Bảng xếp hạng, Quản lý Lớp học, Backend Express (`server.ts`), Firebase Auth & Firestore Rules, Gemini AI Proxy, Quyền riêng tư & Dữ liệu cá nhân, và Hệ thống Kiểm thử tự động.

## [Đợt 2] Gia cố Bảo mật Backend (`server.ts`) & Firestore Security Rules (`firestore.rules`)
- **Nâng cấp CSPRNG (`crypto.randomInt` & `crypto.getRandomValues`)**:
  - Thay thế hoàn toàn `Math.random()` trong `generateServerRandomCode` (`server.ts`) và `generateRandomAlphanumericCode` (`src/utils/chineseEngine.ts`) bằng bộ sinh số ngẫu nhiên an toàn mật mã (CSPRNG), đảm bảo mã lớp (`HSK-XXXXXX`) và mã học viên (`HV-XXXXXX`) không thể bị dự đoán.
- **Chống dò mã lớp / mã học viên (Brute-force Rate Limiter)**:
  - Bổ sung `checkJoinClassRateLimit` trên `POST /api/classes/join` (giới hạn tối đa 15 lần thử / 10 phút trên mỗi `uid:ip`), ngăn chặn hành vi dò quét mã học viên.
- **Kiểm tra xác thực Email Giảng viên (`email_verified`)**:
  - Trong `verifyFirebaseIdToken` và `POST /api/teachers/bootstrap`, từ chối cấp quyền `role = 'teacher'` nếu tài khoản có `email_verified === false`.
- **Bổ sung HTTP Security Headers**:
  - Thiết lập middleware bảo mật trên Express: `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), geolocation=(), payment=(), usb=(), microphone=(self)`, và `X-Permitted-Cross-Domain-Policies: none`.
- **Chống lộ thông tin nội bộ qua lỗi 500**:
  - Chuẩn hóa toàn bộ các khối `catch (err)` ở `/api/teachers/bootstrap`, `/api/classes/join`, `/api/classes/:classId/students/:studentCode/reset-slot`, và `/api/submissions`: ghi log lỗi nội bộ trên server và chỉ trả về thông báo tiếng Việt thân thiện, không tiết lộ `err.message` thô.
- **Gia cố `firestore.rules`**:
  - Bổ sung kiểm tra danh sách trường cho phép `request.resource.data.keys().hasOnly(...)` đối với `/teachers/{uid}` và `/joinCodes/{code}`.

## [Đợt 3] Bảo vệ Dữ liệu Cá nhân & Quyền Riêng tư (Luật 91/2025/QH15 & Nghị định 356/2025/NĐ-CP)
- **Bộ lọc AI chống Prompt Injection & Tự động che PII (`sanitizeAiUserInput`)**:
  - Áp dụng cho `/api/hanzi/enrich`, `/api/hanzi/suggest`, và `/api/binbin/chat` để loại bỏ ký tự điều khiển, chặn câu lệnh ghi đè hệ thống (`<system>`, `[INST]`, `ignore previous instructions`) và tự động che Email (`[EMAIL_ĐÃ_ẨN]`) cùng Số điện thoại Việt Nam (`[SĐT_ĐÃ_ẨN]`) trước khi gửi tới Gemini API.
- **Nâng cấp trang Chính sách Quyền riêng tư (`/chinh-sach-rieng-tu` — `src/components/PrivacyPolicyPage.tsx`)**:
  - Cập nhật nội dung tuân thủ **Luật Bảo vệ dữ liệu cá nhân số 91/2025/QH15**, **Nghị định 356/2025/NĐ-CP** và **Nghị định 13/2023/NĐ-CP** (bao gồm quy định bảo vệ học sinh dưới 16 tuổi).
  - Bổ sung **Trung tâm Tự quản lý Dữ liệu Cá nhân** với 2 công cụ trực tiếp:
    1. **Xuất dữ liệu cá nhân (`.json`)**: Tải xuống toàn bộ dữ liệu học tập cá nhân trên thiết bị.
    2. **Xóa dữ liệu cục bộ trên thiết bị này**: Xóa sạch dữ liệu `hanu_*` trong `localStorage` và `sessionStorage` khi dùng máy tính chung.
- **Chế độ Ẩn danh / Che Mã học viên trên Bảng xếp hạng (`src/components/StudentLeaderboard.tsx`)**:
  - Bổ sung nút **"Che Mã HV"** (`data-testid="leaderboard-privacy-mask-toggle"`) giúp ẩn bớt ký tự mã học viên (`HV-***01`) và viết tắt tên của các học viên khác khi chiếu bảng xếp hạng trên lớp.
- **Minh bạch hóa dữ liệu mẫu Demo (`src/components/classroom/classroomRosterData.ts`)**:
  - Ghi chú rõ `DEFAULT_STUDENTS` là dữ liệu mẫu giả định chỉ dùng trong chế độ Demo cục bộ.

## [Đợt 4–7] Cải tiến Tính năng Học tập, Trải nghiệm Người dùng & Tài liệu Kỹ thuật
- Hoàn thiện hệ thống Chuỗi ngày học (`Daily Streak`), Mục tiêu ngày (`5/10/20 từ`), Bộ lọc thông minh & Tìm kiếm nhanh cho mục "Từ chưa thuộc" trên `HomeDashboard`.
- Tích hợp Luyện phát âm & Chấm điểm giọng đọc (`Web Speech API - zh-CN`) trực tiếp trong Popup xem nhanh từ vựng, trang Bài học (`/hoc`) và trang Flashcard (`/flashcard`).
- Hỗ trợ đầy đủ phím tắt bàn phím (`Space`, `ArrowLeft`, `ArrowRight`, `1-2-3-4`) và vòng tiến độ trực quan `VocabProgressRing`.
- Ban hành bộ tài liệu chuẩn: `/UPGRADE_AUDIT.md`, `/SECURITY_SPEC.md`, `/DATA_PROTECTION.md`, `/PRIVACY_POLICY.md`, và `/CHANGELOG.md`.

## [Đợt 8] Kiểm thử Tự động, Kiểm tra Trình duyệt & Đóng gói Bản phát hành
- Mở rộng bộ kiểm thử bảo mật `src/utils/serverSecurity.test.ts` (kiểm tra HTTP Security Headers, CSPRNG, chống brute-force `/api/classes/join`, và lọc PII/Prompt Injection cho AI).
- Toàn bộ unit tests & security tests (`src/utils/*.test.ts`), kiểm tra kiểu TypeScript (`compile_applet` & `lint_applet`) và kiểm thử trình duyệt thực tế (`playwright-cli`) đạt 100% PASS, Console `0 Errors / 0 Warnings`.
- Đóng gói mã nguồn sạch vào tệp `Bin-Bin-HSK-Upgraded.zip`.
