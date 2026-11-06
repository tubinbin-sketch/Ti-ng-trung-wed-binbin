# NHẬT KÝ THAY ĐỔI HỆ THỐNG (CHANGELOG)

## [v3.0.0] — Nhánh `feat/security-hardening-v2` (2026-11-05)

### Bảo mật & Phân quyền Backend (`server.ts`, `src/firebase.ts`)
- **Xác thực `emailVerified === true` nghiêm ngặt (Item 1):**
  - Cập nhật `verifyFirebaseIdToken` trong `server.ts` để chỉ trả về `emailVerified: decoded.email_verified === true` (thay vì `!== false`).
  - Cập nhật `POST /api/teachers/bootstrap` bắt buộc `verifiedUser.emailVerified === true` mới cho phép cấp quyền Giảng viên; từ chối cả trường hợp `false` và `undefined` với mã HTTP `403`.
- **Loại bỏ Email quản trị mặc định hard-code (Item 2):**
  - Xóa bỏ danh sách email mặc định trong `getTeacherEmailAllowlist()`. Hàm chỉ đọc từ biến môi trường `process.env.TEACHER_EMAIL_ALLOWLIST` và trả về mảng rỗng `[]` (fail-closed) nếu biến môi trường chưa được thiết lập.
- **Giao dịch nguyên tử khi nhận mã học viên tại `POST /api/classes/join` (Item 3):**
  - Bổ sung `claimStudentSlotTransaction` vào `ServerStoreAdapter` (sử dụng `adminDb.runTransaction` kết hợp khóa `classes/{classId}/studentCodeLocks/{studentCode}` trên Firestore và hàng đợi khóa nguyên tử `runAtomic` trên bộ nhớ test).
  - Ngăn chặn hoàn toàn race condition khi hai tài khoản cùng gửi yêu cầu nhận chung một `studentCode`.
- **Giao dịch nguyên tử khi nộp bài & chấm điểm tại `POST /api/submissions` (Item 4):**
  - Bổ sung `submitAssignmentTransaction` vào `ServerStoreAdapter` để gom việc kiểm tra thành viên lớp, kiểm tra giới hạn lượt nộp (`attemptCount < maxAttempts` trên khóa `{assignmentId}_{uid}`), chấm điểm với `answerKeys`, và ghi kết quả vào `submissions`, `leaderboard`, `students` thành một thao tác nguyên tử duy nhất.
- **Thời gian làm bài chuẩn từ Server — Không tin tưởng `timeSeconds` từ Client (Item 5):**
  - Thêm route `POST /api/assignments/start` ghi nhận thời điểm bắt đầu làm bài `startedAtMs` tại `classes/{classId}/assignmentStarts/{assignmentId}_{uid}`.
  - Thêm hàm `computeServerAuthoritativeTimeSeconds`: tính thời gian làm bài dựa trên `startedAtMs` của server (áp mức sàn tối thiểu `max(5, totalQuestions * 2)` giây và mức phạt mặc định `300s` nếu bỏ qua `/api/assignments/start`), loại bỏ hoàn toàn việc đọc `req.body.timeSeconds`.
- **App Check Fail-Closed trên Production & Header `X-Firebase-AppCheck` toàn diện (P0 #1):**
  - Cập nhật `shouldEnforceAppCheck()` trong `server.ts`: trên `NODE_ENV === 'production'`, App Check mặc định luôn được bật (`true`) trừ khi có biến môi trường ghi đè tường minh `ENFORCE_APP_CHECK=false`, đồng thời in cảnh báo `console.warn` rõ ràng nếu bị tắt.
  - Đổi `ENFORCE_APP_CHECK=true` trong `.env.example`.
  - Cập nhật `getFirebaseAuthHeaders()` (`src/firebase.ts`) và `getAuthBearerHeaders()` + `registerFirebaseAppCheckGetter` (`src/utils/chineseEngine.ts`) để luôn gửi header `X-Firebase-AppCheck` trong mọi request tới `/api/*`.
- **Kiểm tra thu hồi phiên (`verifyIdToken(token, true)`) & Đối chiếu quyền Giáo viên thời gian thực (P0 #2):**
  - Đổi `verifyIdToken(idToken)` thành `verifyIdToken(idToken, true)` trong `verifyFirebaseIdToken`, bắt lỗi `auth/id-token-revoked` tại `authenticateBearerRequest` để trả về HTTP `401` kèm `code: 'auth/id-token-revoked'`.
  - Bổ sung `isTeacherUserAuthorized(user)`: đối chiếu đồng thời cả custom claim (`role === 'teacher'`) lẫn `emailVerified === true` và `TEACHER_EMAIL_ALLOWLIST` trên mọi tác vụ giáo viên (`isUserAuthorizedForAi`, `POST /api/classes/:classId/students/:studentCode/reset-slot`) để chặn ngay quyền truy cập nếu giáo viên bị xóa khỏi danh sách cho phép.
- **AI Quota Fail-Closed trong Production (Item 9):**
  - Bổ sung `isStrictFirestoreAiQuotaEnabled()`: khi `NODE_ENV=production` (hoặc `STRICT_FIRESTORE_AI_QUOTA=true`), nếu giao dịch Firestore `aiUsage/{uid}_{YYYY-MM-DD}` hoặc `rateLimits/ai_minute_{uid}` gặp lỗi, server trả về HTTP `503 Service Unavailable` thay vì âm thầm chuyển sang quota RAM cục bộ.
- **Đồng bộ Rate Limit đa Instance qua Firestore `rateLimits` (P0 #3):**
  - Thay thế các bộ đếm rate limit lưu trên `Map` trong RAM (middleware `/api` chung `apiRateLimiter` và giới hạn AI theo phút trong `checkAndIncrementAiFirestoreQuota`) bằng bộ đếm chia sẻ qua Firestore (`rateLimits/{bucketId}`).
  - Thiết lập ngưỡng giới hạn độc lập trong `RATE_LIMIT_SCOPES` cho: `api_general` (90/phút), `teacher_bootstrap` (10/10 phút), `ai_minute` (30/phút), `join_class` (15/10 phút), `assignment_start` (`POST /api/assignments/start` — 20/phút), và `reset_student_slot` (`POST /api/classes/:classId/students/:studentCode/reset-slot` — 15/10 phút).

### Firestore Security Rules & Tài liệu Đặc tả (`firestore.rules`, `security_spec.md`)
- **Bổ sung `request.resource.data.keys().hasOnly([...])` toàn diện (Item 6):**
  - Áp dụng danh sách trường cho phép (`keys().hasOnly()`) đối với `/classes/{classId}`, `/classes/{classId}/students/{studentUid}`, `/classes/{classId}/decks/{deckId}`, `/classes/{classId}/assignments/{assignmentId}`, `/classes/{classId}/answerKeys/{assignmentId}`, và `/users/{studentUid}/srs/{wordId}`.
- **Thu hẹp quyền đọc `/joinCodes/{code}` (Item 7):**
  - Đổi `allow get` trên `/joinCodes/{code}` từ `isSignedIn()` thành `isTeacher() && isValidId(code)` vì luồng học viên vào lớp đã xử lý hoàn toàn qua server (`POST /api/classes/join`).
- **Khóa truy cập Client vào các bảng nội bộ của Server:**
  - Bổ sung `allow read, write: if false;` cho `/rateLimits/{bucketId}`, `/classes/{classId}/studentCodeLocks/{studentCode}`, và `/classes/{classId}/assignmentStarts/{startId}`.
- **Đồng bộ hóa `security_spec.md` & `SECURITY_SPEC.md` (Item 11):**
  - Cập nhật ma trận phân quyền và đặc tả kỹ thuật khớp 100% với `firestore.rules` và `server.ts`.

### Bài Kiểm Tra Tốc Độ (Speed Test), TypeScript Strict & Kiểm Thử Tự Động
- **Chuẩn hóa `SPEED_TEST_10_QUESTIONS` & Server Answer Key:**
  - Phân bổ lại vị trí đáp án đúng của 10 câu Speed Test qua cả 4 lựa chọn `A, B, C, D` (thay vì toàn bộ là `A`) và đồng bộ khóa `stq-1`..`stq-10` trong `BUILTIN_SERVER_ANSWER_KEYS['speedtest-10']`.
- **Cấu hình Công cụ & TypeScript `strict` (Items 12 & 13):**
  - Bật `"strict": true` trong `tsconfig.json` (0 lỗi biên dịch).
  - Thêm tệp cấu hình `firebase.json` cho Firestore Rules & Emulator.
  - Mở rộng bộ kiểm thử tự động lên **74 bài kiểm thử (74/74 PASS)** trong `src/utils/*.test.ts`, bao gồm kiểm thử race condition đồng thời (`Promise.all`) cho cả `/api/classes/join` và `/api/submissions`.
