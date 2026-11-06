# ĐẶC TẢ KIẾN TRÚC BẢO MẬT (SECURITY SPECIFICATION) — BIN-BIN HSK

**Dự án**: Bin-Bin HSK (`HANU × 阮文受`)  
**Phiên bản bảo mật**: 2.5 (Hardened Production-Ready)  

---

## 1. MÔ HÌNH PHÂN QUYỀN & XÁC THỰC (AUTH & RBAC)

1. **Giảng viên (`role == 'teacher'`)**:
   - Đăng nhập qua Firebase Google Authentication (`signInWithPopup` / `signInWithRedirect`).
   - Kích hoạt quyền qua `POST /api/teachers/bootstrap` với 3 điều kiện bắt buộc:
     1. Firebase ID Token hợp lệ (`Authorization: Bearer <idToken>`).
     2. Trạng thái email đã xác thực (`email_verified !== false`).
     3. Email nằm trong danh sách cho phép `TEACHER_EMAIL_ALLOWLIST`.
   - Máy chủ sử dụng `firebase-admin` gán Custom Claim `{ role: 'teacher' }` và tạo hồ sơ `/teachers/{uid}` có kiểm soát trường (`keys().hasOnly(...)`).

2. **Học viên (`student`)**:
   - Có thể tự học hoàn toàn cục bộ (`localStorage`) mà không cần tạo tài khoản.
   - Khi tham gia lớp học trực tuyến: xác thực qua Firebase Auth (ẩn danh hoặc tài khoản Google) và gọi `POST /api/classes/join` kèm `joinCode` (`HSK-XXXXXX`) và `studentCode` (`HV-XXXXXX`) do Giảng viên cấp.
   - Học viên **không thể** tự tạo bản ghi `classes/{classId}/students/{uid}` từ client; chỉ máy chủ `firebase-admin` mới được ghi sau khi xác minh slot `studentCode` chưa bị chiếm.

---

## 2. QUY TẮC BẢO MẬT FIRESTORE (`firestore.rules`)

| Đường dẫn dữ liệu | Quyền Đọc (`get` / `list`) | Quyền Ghi (`create` / `update` / `delete`) | Cơ chế bảo vệ cốt lõi |
| :--- | :--- | :--- | :--- |
| `/teachers/{uid}` | Chỉ chính giảng viên đó (`get`); `list = false` | Chỉ giảng viên có custom claim `role == 'teacher'`, giới hạn trường bằng `keys().hasOnly(...)` | Chặn người dùng tự gán `role = 'teacher'` từ client. |
| `/joinCodes/{code}` | Người đã đăng nhập (`get`); `list = false` | Chỉ giảng viên chủ nhiệm lớp được `create` khi mã chưa tồn tại (`!exists(...)`) và `code.size() >= 6` | Chặn dò quét danh sách mã lớp và chống ghi đè mã lớp của giáo viên khác. |
| `/classes/{classId}` | `get`: Thành viên lớp; `list`: Chỉ giảng viên sở hữu (`resource.data.teacherUid == request.auth.uid`) | Chỉ giảng viên sở hữu lớp | Học viên hoặc người lạ không thể liệt kê toàn bộ các lớp học trên hệ thống. |
| `/classes/{classId}/students/{studentUid}` | `get`: Giảng viên lớp hoặc chính học viên đó; `list`: Chỉ giảng viên lớp | `create/delete`: Chỉ giảng viên lớp (hoặc Admin SDK); `update`: Học viên chỉ được sửa duy nhất trường `['name']` | Chặn học viên tự sửa `totalPoints`, `vocabScore`, `writingScore`, `quizScore`, `feedback`, `status` hoặc xem danh sách bạn cùng lớp. |
| `/classes/{classId}/assignments/{assignmentId}` | Thành viên lớp (`get`, `list`) | Chỉ giảng viên lớp, cấm trường `answerKey` xuất hiện trong tài liệu đề bài công khai | Đảm bảo đề bài phát cho học viên không bao giờ chứa đáp án. |
| `/classes/{classId}/answerKeys/{assignmentId}` | Chỉ giảng viên chủ nhiệm lớp (`isClassTeacher`) | Chỉ giảng viên chủ nhiệm lớp | Đáp án tuyệt mật, chỉ Giảng viên và Server Admin SDK đọc được khi chấm bài. |
| `/classes/{classId}/submissions/{submissionId}` | Giảng viên lớp hoặc chính học viên nộp bài | `allow create, update, delete: if false` (Chỉ ghi qua `POST /api/submissions`) | Chặn học viên tự gửi điểm giả mạo lên Firestore. |
| `/classes/{classId}/leaderboard/{studentUid}` | Thành viên lớp (`get`, `list`) | `allow create, update, delete: if false` (Chỉ ghi qua `POST /api/submissions`) | Bảng xếp hạng chỉ được cập nhật từ kết quả chấm điểm của máy chủ. |
| `/users/{studentUid}/srs/{wordId}` | Chỉ chính chủ (`isOwner(studentUid)`) | Chỉ chính chủ, kiểm tra kiểu dữ liệu `intervalDays` (0–3650) | Bảo vệ kho thẻ ôn tập cá nhân của từng học viên. |
| `/aiUsage/{usageId}` | Chỉ chính chủ (`get`); `list = false` | `allow create, update, delete: if false` (Chỉ ghi qua Server Transaction) | Chống xóa hoặc đặt lại bộ đếm giới hạn lượt gọi AI hàng ngày. |

---

## 3. BẢO MẬT API BACKEND, CHỐNG BRUTE-FORCE & AI GUARDRAILS (`server.ts`)

1. **Sinh mã ngẫu nhiên an toàn mật mã (CSPRNG)**:
   - Mọi mã lớp (`HSK-XXXXXX`) và mã học viên (`HV-XXXXXX`) được sinh bằng `crypto.randomInt()` trên Node.js và `crypto.getRandomValues()` trên trình duyệt với bảng 32 ký tự không gây nhầm lẫn (`23456789ABCDEFGHJKLMNPQRSTUVWXYZ`).
2. **Chống Brute-Force Mã Lớp & Mã Học Viên**:
   - Endpoint `POST /api/classes/join` có bộ giới hạn chuyên biệt `checkJoinClassRateLimit` (**tối đa 15 lần thử / 10 phút** trên mỗi cặp `uid:ip`).
3. **Bảo vệ Gemini AI API & Chống Prompt Injection / Lộ PII**:
   - `GEMINI_API_KEY` chỉ nằm trên môi trường máy chủ (`server.ts`), tuyệt đối không xuất hiện trong bundle frontend.
   - Middleware `protectAiRoute` kiểm tra Origin/Referer, xác thực Firebase ID Token, xác thực Firebase App Check (khi `ENFORCE_APP_CHECK=true`), kiểm tra tư cách thành viên lớp và trừ hạn mức `aiUsage/{uid}_{YYYY-MM-DD}` bằng Firestore Transaction.
   - Hàm `sanitizeAiUserInput` tự động loại bỏ ký tự điều khiển, lọc các thẻ tấn công Prompt Injection (`<system>`, `[INST]`, `ignore previous instructions`) và tự động che (mask) Email (`[EMAIL_ĐÃ_ẨN]`) cùng Số điện thoại (`[SĐT_ĐÃ_ẨN]`) trước khi gửi tới Gemini.
4. **HTTP Security Headers & Chuẩn hóa thông báo lỗi**:
   - Mọi phản hồi HTTP từ `server.ts` đính kèm `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), geolocation=(), payment=(), usb=(), microphone=(self)`, `X-Permitted-Cross-Domain-Policies: none`.
   - Các lỗi ngoại lệ `500` được ghi log nội bộ và chỉ trả về thông báo tiếng Việt chung an toàn, không bao giờ trả `err.message` hay stack trace ra client.
