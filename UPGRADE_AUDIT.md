# BÁO CÁO KIỂM TOÁN TOÀN DIỆN (UPGRADE AUDIT) — BIN-BIN HSK

**Dự án**: HANU × 阮文受 — Nền tảng Học tiếng Trung HSK 3.0 & Quản lý Lớp học thông minh (Bin-Bin HSK)  
**Kiến trúc hiện tại**: React 19 + TypeScript + Vite 6 + Tailwind CSS 4 + Express 5 (`server.ts`) + Firebase Auth / Cloud Firestore + Google Gemini API (`@google/genai`)  
**Phạm vi kiểm toán**: Toàn bộ mã nguồn Frontend, Backend API, Firebase Security Rules, luồng xử lý dữ liệu cá nhân (theo Luật Bảo vệ dữ liệu cá nhân số 91/2025/QH15, Nghị định 356/2025/NĐ-CP & Nghị định 13/2023/NĐ-CP), kiểm thử tự động và hiệu năng.

---

## 1. BẢNG TỔNG HỢP TRẠNG THÁI CÁC MODULE

| STT | Module / Thành phần | Tệp chính | Phân loại trạng thái | Đánh giá chi tiết & Hạng mục nâng cấp |
| :--- | :--- | :--- | :--- | :--- |
| 1 | **Frontend Shell & Điều hướng** | `src/App.tsx`, `src/layouts/AppShell.tsx`, `src/components/QuickSettingsModal.tsx` | ✅ Hoạt động tốt | Đã có `LazyErrorBoundary`, tách 5 tab chính (`/`, `/hoc`, `/flashcard`, `/ngu-phap`, `/bai-tap`), hỗ trợ chế độ Học sinh / Giáo viên và phím tắt. |
| 2 | **Trang Tổng quan & Mục tiêu ngày** | `src/components/HomeDashboard.tsx`, `src/utils/hskStudyHelpers.ts` | ✅ Hoạt động tốt | Đã có Daily Streak (`🔥 X ngày`), Daily Goal (`5/10/20 từ`), vòng tiến độ `VocabProgressRing`, bộ lọc thông minh + tìm kiếm nhanh mục "Từ chưa thuộc" và popup xem chi tiết kèm nút phát âm / đọc thử. |
| 3 | **Studio Bài giảng & Học từ vựng** | `src/components/SlideDeckStudio.tsx`, `src/components/PronunciationPracticeWidget.tsx` | ✅ Hoạt động tốt | Đã tối ưu chiều cao Above-the-fold, hỗ trợ HanziWriter luyện viết nét chữ, Web Speech API (`zh-CN`) chấm điểm phát âm (`Chuẩn xác / Gần đúng / Cần thử lại`), và phím tắt `Space`, `←/→`, `1-2-3-4`. |
| 4 | **Ôn tập SRS & Flashcard** | `src/components/SrsReviewModal.tsx`, `src/utils/srsEngine.ts` | ✅ Hoạt động tốt | Thuật toán SM-2 Spaced Repetition (`intervalDays`, `easeFactor`, `repetitions`, `lapses`) hoạt động ổn định, đồng bộ hai chiều LocalStorage ↔ Firestore `users/{uid}/srs/{wordId}`. |
| 5 | **Ngữ pháp, Lượng từ & Từ điển Hán-Việt** | `src/components/InteractiveGrammarHub.tsx`, `src/components/MeasureWordHub.tsx`, `src/utils/chineseEngine.ts` | ✅ Hoạt động tốt | Kho dữ liệu HSK 1–9 phong phú, phân tích chiết tự (bộ thủ, số nét, lục thư), tra cứu thông minh không cần gọi AI khi từ đã có trong từ điển nội bộ. |
| 6 | **Bài tập, Chấm điểm & Bảng xếp hạng** | `src/components/StudentHomeworkPortal.tsx`, `src/components/StudentLeaderboard.tsx`, `src/utils/assignmentParser.ts` | ⚠️ Có giới hạn → **Đã nâng cấp** | Đã tách `sanitizeAssignmentForPublic` và `extractAssignmentAnswerKey` để chống lộ đáp án. **Nâng cấp**: Bổ sung chế độ **Ẩn danh Mã học viên / Tên trên Bảng xếp hạng** (Privacy Masking) để bảo vệ dữ liệu cá nhân học sinh trong lớp học. |
| 7 | **Quản lý Lớp học (Giáo viên)** | `src/components/ClassroomManager.tsx`, `src/components/classroom/*` | ⚠️ Có giới hạn → **Đã nâng cấp** | Đã hỗ trợ tạo lớp, giao bài, xuất CSV điểm số. **Nâng cấp**: Ghi nhãn rõ ràng `Dữ liệu mẫu minh họa (Demo)` khi ở chế độ Demo; dùng CSPRNG cho mã học viên (`HV-XXXXXX`) và mã lớp (`HSK-XXXXXX`). |
| 8 | **Backend Express & API Bảo mật** | `server.ts` | ⚠️ Rủi ro bảo mật nhỏ → **Đã khắc phục** | 1) `generateServerRandomCode` dùng `Math.random()` → nâng cấp lên `crypto.randomInt()` (CSPRNG).<br>2) Các khối `catch (err)` trả thẳng `err.message` ở mã lỗi `500` → chuẩn hóa thông báo lỗi an toàn, không lộ chi tiết nội bộ.<br>3) Bổ sung HTTP Security Headers (`X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `X-Frame-Options` tương thích môi trường).<br>4) Bổ sung bộ giới hạn chống dò mã (Brute-force rate limiter) riêng cho `/api/classes/join` và `/api/teachers/bootstrap`.<br>5) Kiểm tra `email_verified` khi cấp quyền giáo viên. |
| 9 | **Firebase Auth & Firestore Rules** | `src/firebase.ts`, `firestore.rules` | ✅ Hoạt động tốt → **Đã gia cố thêm** | Đã cấu hình `experimentalAutoDetectLongPolling: true` chống lỗi iframe IndexedDB; Firestore Rules đã chặn leo thang đặc quyền, ẩn `answerKeys`, khóa ghi trực tiếp `submissions` và `leaderboard`. **Gia cố thêm**: Ràng buộc chặt `keys().hasOnly(...)` cho `teachers/{uid}` và `joinCodes/{code}`. |
| 10 | **Gemini AI Proxy & Guardrails** | `server.ts`, `src/components/BinBinPandaAI.tsx`, `src/components/LiveTeachingToolkit.tsx` | ⚠️ Có giới hạn → **Đã nâng cấp** | Đã ẩn hoàn toàn `GEMINI_API_KEY` phía server và giới hạn quota `aiUsage/{uid}_{YYYY-MM-DD}`. **Nâng cấp**: Bổ sung bộ lọc `sanitizeAiUserInput` chống Prompt Injection và tự động ẩn thông tin định danh cá nhân (Email, SĐT, Mã học viên) trước khi gửi lên Gemini API. |
| 11 | **Bảo vệ Dữ liệu Cá nhân & Quyền Riêng tư** | `src/components/PrivacyPolicyPage.tsx`, `PRIVACY_POLICY.md`, `DATA_PROTECTION.md` | ⚠️ Có giới hạn → **Đã nâng cấp toàn diện** | Cập nhật đầy đủ theo **Luật Bảo vệ dữ liệu cá nhân số 91/2025/QH15**, **Nghị định 356/2025/NĐ-CP** và **Nghị định 13/2023/NĐ-CP**: bổ sung quy định về học sinh dưới 16 tuổi, danh mục dữ liệu thu thập, bên xử lý dữ liệu thứ ba, và công cụ tự phục vụ **Xuất dữ liệu cá nhân (`.json`)** + **Xóa sạch dữ liệu cục bộ (Chế độ máy tính dùng chung)** ngay trên trang `/chinh-sach-rieng-tu`. |
| 12 | **Kiểm thử Tự động & CI** | `src/utils/*.test.ts`, `.github/workflows/ci.yml` | ✅ Hoạt động tốt → **Mở rộng thêm** | Đã có 69 unit & security tests chạy qua `node:test`. **Mở rộng**: Thêm các bài kiểm thử CSPRNG, HTTP Security Headers, chống brute-force `/api/classes/join`, khử PII/Prompt Injection cho AI, và ẩn thông báo lỗi 500 nội bộ. |

---

## 2. PHÂN TÍCH CHI TIẾT CÁC PHÁT HIỆN BẢO MẬT & DỮ LIỆU CÁ NHÂN

### 2.1. Các phát hiện bảo mật đã được xử lý triệt để
1. **Sinh mã ngẫu nhiên an toàn mật mã (CSPRNG)**:
   - *Trước khi sửa*: `generateServerRandomCode` trong `server.ts` và `generateRandomAlphanumericCode` trong `src/utils/chineseEngine.ts` sử dụng `Math.random()`.
   - *Sau khi sửa*: Sử dụng `crypto.randomInt()` của Node.js trên `server.ts` và `globalThis.crypto.getRandomValues()` trên trình duyệt, loại bỏ hoàn toàn khả năng dự đoán chuỗi mã lớp (`HSK-XXXXXX`) và mã học sinh (`HV-XXXXXX`).
2. **Chống Brute-force Mã tham gia lớp (`/api/classes/join`)**:
   - *Trước khi sửa*: Chia sẻ chung bộ giới hạn 90 requests/phút của toàn bộ `/api/*`, cho phép kẻ tấn công thử tới 90 mã học sinh mỗi phút.
   - *Sau khi sửa*: Áp dụng bộ giới hạn chuyên biệt `checkJoinClassRateLimit` (tối đa **15 lần thử / 10 phút** trên mỗi cặp IP + UID), trả về mã `429 Too Many Requests` kèm thông báo tiếng Việt rõ ràng.
3. **Chống rò rỉ thông tin hệ thống qua lỗi 500 (Error Message Sanitization)**:
   - *Trước khi sửa*: Các endpoint `/api/teachers/bootstrap`, `/api/classes/join`, `/api/classes/:classId/students/:studentCode/reset-slot`, `/api/submissions` trả trực tiếp `err.message` cho client khi gặp lỗi `500`.
   - *Sau khi sửa*: Ghi log lỗi ở phía server và chỉ trả thông báo chuẩn hóa an toàn cho client, không tiết lộ cấu trúc bảng hay chuỗi kết nối nội bộ.
4. **Bảo vệ AI khỏi Prompt Injection & Rò rỉ PII (`sanitizeAiUserInput`)**:
   - *Trước khi sửa*: Nội dung câu hỏi trong `/api/binbin/chat`, `/api/hanzi/enrich`, `/api/hanzi/suggest` chỉ cắt độ dài (`slice`).
   - *Sau khi sửa*: Loại bỏ ký tự điều khiển ẩn, vô hiệu hóa các mẫu câu lệnh ghi đè hệ thống (`ignore previous instructions`, `<|system|>`, `[INST]`), đồng thời tự động che (mask) địa chỉ email và số điện thoại nếu học sinh vô tình nhập vào khung chat với Trợ giảng Gấu Trúc Bân Bân.
5. **Bổ sung HTTP Security Headers**:
   - Thiết lập middleware bảo mật trên Express (`X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), geolocation=(), payment=(), usb=(), microphone=(self)`, `X-Permitted-Cross-Domain-Policies: none`).

### 2.2. Tuân thủ pháp luật về Bảo vệ Dữ liệu Cá nhân (Luật 91/2025/QH15 & NĐ 356/2025/NĐ-CP)
- **Nguyên tắc tối thiểu hóa dữ liệu (Data Minimization)**: Học sinh tự học không cần tạo tài khoản hay cung cấp email/số điện thoại. Khi tham gia lớp học, chỉ lưu Tên hiển thị, Mã học viên ngẫu nhiên do giáo viên cấp và Kết quả bài tập.
- **Bảo vệ trẻ em & học sinh dưới 16 tuổi**: Bổ sung mục hướng dẫn rõ ràng cho giáo viên, phụ huynh và học sinh dưới 16 tuổi tại trang Chính sách quyền riêng tư (`/chinh-sach-rieng-tu`) và tài liệu `DATA_PROTECTION.md`.
- **Quyền của chủ thể dữ liệu (Data Subject Rights)**: Cung cấp nút bấm trực tiếp trên giao diện `/chinh-sach-rieng-tu` để người dùng:
  1. **Xem & Tải xuống toàn bộ dữ liệu cá nhân** dưới dạng tệp `.json` chuẩn máy đọc.
  2. **Xóa sạch dữ liệu cục bộ trên thiết bị** (dành cho học sinh ngồi máy tính phòng lab của trường hoặc thiết bị dùng chung).
  3. **Bật/tắt chế độ ẩn bớt Mã học viên / Họ tên trên Bảng xếp hạng** (`StudentLeaderboard.tsx`) khi trình chiếu trước lớp.
