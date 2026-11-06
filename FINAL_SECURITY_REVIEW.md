# ĐÁNH GIÁ BẢO MẬT TỔNG THỂ SAU NÂNG CẤP (FINAL SECURITY REVIEW)
**Dự án:** Tiếng Trung HANU — Bin-Bin HSK 3.0  
**Nhánh đánh giá:** `feat/security-hardening-v2`  
**Kết quả kiểm thử tự động:** 74/74 Unit & Security Tests PASS (`0` lỗi), `eslint firestore.rules` PASS (`0` lỗi), `tsc --noEmit --strict` PASS (`0` lỗi).

---

## 1. Các Cơ Chế Bảo Vệ Đã Được Kiểm Chứng Bằng Kiểm Thử Tự Động

### 1.1. Xác thực, Kiểm tra Thu hồi Phiên & Phân quyền Giảng viên (`POST /api/teachers/bootstrap` & `isTeacherUserAuthorized`)
- **Kiểm chứng:**
  - Chỉ chấp nhận `verifiedUser.emailVerified === true` (từ chối cả `emailVerified: false` và `emailVerified: undefined` với HTTP `403`).
  - Không còn bất kỳ email quản trị mặc định nào hard-code trong `server.ts`. Nếu biến môi trường `TEACHER_EMAIL_ALLOWLIST` không được thiết lập, `getTeacherEmailAllowlist()` trả về `[]` (fail-closed) và từ chối mọi yêu cầu bootstrap.
  - **Kiểm tra thu hồi phiên (`verifyIdToken(token, true)`):** Middleware `verifyFirebaseIdToken` truyền `checkRevoked = true` và `authenticateBearerRequest` bắt lỗi `auth/id-token-revoked` để trả về HTTP `401` kèm `code: 'auth/id-token-revoked'`.
  - **Đối chiếu kép quyền Giảng viên (`isTeacherUserAuthorized`):** Khi kiểm tra quyền Giảng viên trên server (`isUserAuthorizedForAi`, `POST /api/classes/:classId/students/:studentCode/reset-slot`), server bắt buộc đối chiếu đồng thời **cả** custom claim/bản ghi `role == 'teacher'` **lẫn** `emailVerified === true` và `isEmailInTeacherAllowlist(user.email)` để nếu một giáo viên bị xóa khỏi `TEACHER_EMAIL_ALLOWLIST`, quyền truy cập bị chặn ngay lập tức (`403 Forbidden`).

### 1.2. Chống Race Condition Khi Nhận Mã Học Viên (`POST /api/classes/join`)
- **Kiểm chứng:**
  - Việc kiểm tra mã lớp (`joinCodes/{joinCode}`), kiểm tra slot học viên (`studentCode`), và ghi nhận chủ sở hữu slot (`classes/{classId}/students/{uid}` + `classes/{classId}/studentCodeLocks/{studentCode}`) được thực thi trong một giao dịch nguyên tử (`claimStudentSlotTransaction`).
  - Đã kiểm thử bằng `Promise.all` với 2 tài khoản gửi request đồng thời nhận cùng một mã `HV-RACE99`: chính xác 1 tài khoản nhận HTTP `200 OK` và tài khoản còn lại nhận HTTP `409 Conflict`.
  - Học viên không thể đọc trực tiếp `/joinCodes/{code}` từ Client SDK (`allow get: if isTeacher() && isValidId(code);`) và không thể tự tạo bản ghi `students/{uid}` từ trình duyệt.

### 1.3. Chống Race Condition Lượt Nộp & Chống Giả Mạo Thời Gian Xếp Hạng (`POST /api/submissions`)
- **Kiểm chứng:**
  - Bước kiểm tra số lượt nộp (`attemptCount < maxAttempts` trên khóa `{assignmentId}_{uid}`), chấm điểm đối chiếu `answerKeys`, và ghi kết quả vào `submissions`, `leaderboard`, `students` nằm trong cùng một giao dịch nguyên tử (`submitAssignmentTransaction`).
  - Đã kiểm thử bằng `Promise.all` khi gửi 2 request nộp bài song song: chỉ 1 request thành công (`200 OK`, `attemptCount = 1`), request còn lại bị từ chối (`409 Conflict`).
  - Server **không sử dụng** `req.body.timeSeconds` do client gửi. Thời gian làm bài được tính bởi `computeServerAuthoritativeTimeSeconds` dựa trên mốc `startedAtMs` lưu tại `classes/{classId}/assignmentStarts/{assignmentId}_{uid}` (qua `POST /api/assignments/start`), có sàn tối thiểu `max(5, totalQuestions * 2)` giây và mức phạt mặc định `300s` nếu học viên bỏ qua bước khởi tạo phiên làm bài.

### 1.4. Kiểm Soát Schema (`keys().hasOnly()`) & Cô Lập Đáp Án (`firestore.rules`)
- **Kiểm chứng:**
  - Mọi collection cho phép Client SDK ghi (`teachers`, `joinCodes`, `classes`, `students`, `decks`, `assignments`, `answerKeys`, `srs`) đều kiểm tra `request.resource.data.keys().hasOnly([...])`, chặn việc chèn trường lạ (shadow fields).
  - Học viên chỉ được phép sửa duy nhất trường `name` trên hồ sơ lớp học của chính mình (`affectedKeys().hasOnly(['name'])`).
  - Đáp án bài tập lưu tại `/classes/{classId}/answerKeys/{assignmentId}` bị chặn đọc/ghi tuyệt đối đối với học viên.

### 1.5. App Check Fail-Closed, Hạn Mức AI Fail-Closed & Đồng Bộ Rate Limit Đa Instance (`rateLimits`)
- **Kiểm chứng:**
  - **App Check Fail-Closed trên Production:** Trên `NODE_ENV === 'production'`, `shouldEnforceAppCheck()` mặc định luôn trả về `true` trừ khi đặt tường minh `ENFORCE_APP_CHECK=false` (đồng thời in cảnh báo `console.warn`). Trong `.env.example`, `ENFORCE_APP_CHECK=true`. Frontend (`src/firebase.ts` và `src/utils/chineseEngine.ts`) luôn đính kèm header `X-Firebase-AppCheck` trong mọi request tới `/api/*`.
  - **AI Quota Fail-Closed:** Khi `NODE_ENV=production` (hoặc `STRICT_FIRESTORE_AI_QUOTA=true`), nếu giao dịch Firestore `aiUsage/{uid}_{YYYY-MM-DD}` hoặc `rateLimits/ai_minute_{uid}` gặp lỗi, endpoint AI trả về `503 Service Unavailable` thay vì âm thầm chuyển sang bộ đếm RAM cục bộ.
  - **Rate Limit Đa Instance qua Firestore (`rateLimits/{bucketId}`):** Toàn bộ giới hạn tốc độ (`api_general`, `teacher_bootstrap`, `ai_minute`, `join_class`, `assignment_start`, `reset_student_slot`) đều được đồng bộ qua collection `rateLimits` trên Firestore với ngưỡng riêng biệt trong `RATE_LIMIT_SCOPES`.

---

## 2. Các Giới Hạn Còn Lại & Yêu Cầu Cấu Hình Khi Triển Khai Production

Để hệ thống vận hành an toàn trong môi trường thực tế, quản trị viên hạ tầng cần lưu ý các giới hạn kỹ thuật và bước cấu hình bắt buộc sau:

1. **Cấu hình Biến Môi Trường Bắt Buộc trên Cloud Run:**
   - Vì email mặc định đã được gỡ bỏ khỏi code, quản trị viên **bắt buộc** phải thiết lập biến môi trường `TEACHER_EMAIL_ALLOWLIST` (danh sách email Giảng viên đã xác thực, phân tách bằng dấu phẩy) trên Cloud Run trước khi Giảng viên gọi `/api/teachers/bootstrap`.
   - Cần thiết lập `VITE_RECAPTCHA_ENTERPRISE_SITE_KEY` và `ENFORCE_APP_CHECK=true` trên môi trường production để kích hoạt kiểm tra Firebase App Check bắt buộc.
2. **Triển khai `firestore.rules` lên Firebase Project thật:**
   - Tệp `firestore.rules` trong repository cần được deploy lên Firebase Project bằng lệnh `firebase deploy --only firestore:rules` (hoặc qua CI/CD) để các quy tắc phân quyền có hiệu lực trên cơ sở dữ liệu đám mây.
3. **Chế độ Luyện tập Demo Offline vs Chế độ Lớp học Firestore:**
   - Khi người dùng tự học ở chế độ Demo Offline (`getClassroomDataMode() === 'demo'`), dữ liệu câu hỏi mẫu (`SPEED_TEST_10_QUESTIONS`, `PRESET_ASSIGNMENT_BUOI_14`) nằm ở client để phục vụ việc tự luyện tập không cần mạng/lớp học. Trong chế độ Lớp học Firestore (`getClassroomDataMode() === 'firestore'`), toàn bộ điểm số và bảng xếp hạng của lớp đều do Server quyết định thông qua `POST /api/submissions` đối chiếu với `answerKeys` trên Firestore.
4. **Giới hạn của Rate Limit qua Firestore Transaction:**
   - `rateLimits/{bucketId}` trên Firestore phù hợp cho lưu lượng vừa và nhỏ của các route nhạy cảm (`/api/classes/join`, `/api/teachers/bootstrap`). Nếu hệ thống chịu tấn công DDoS tần suất lớn ở tầng mạng, cần kết hợp thêm Google Cloud Armor ở phía trước Cloud Run và cấu hình Firestore TTL Policy để tự động dọn dẹp các bản ghi `rateLimits` / `aiUsage` cũ.
5. **Tuân thủ Pháp lý & Quyền riêng tư:**
   - Ứng dụng đã cung cấp tính năng ẩn danh tính học viên trên bảng xếp hạng (`StudentLeaderboard.tsx`), lọc PII (email/SĐT) trước khi gửi tới Gemini AI (`sanitizeAiUserInput`), và trang quản lý dữ liệu cá nhân (`PrivacyPolicyPage.tsx`). Tuy nhiên, việc tuân thủ pháp lý đầy đủ (như Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân) còn phụ thuộc vào quy trình quản lý dữ liệu, hợp đồng xử lý dữ liệu và chính sách vận hành của đơn vị chủ quản.
