# ĐẶC TẢ KIẾN TRÚC BẢO MẬT & PHÂN QUYỀN (SECURITY SPECIFICATION)
**Dự án:** Tiếng Trung HANU — Bin-Bin HSK 3.0  
**Phiên bản:** 3.1 (Hợp nhất từ `SECURITY_SPEC.md` và `security_spec.md`, đồng bộ 100% với `firestore.rules` và `server.ts`)

---

## 1. Mục tiêu bảo mật cốt lõi

1. **Vào lớp bắt buộc qua Server & Nguyên tử hóa (Atomic Slot Claiming):**
   - Học viên **không thể** tự ghi bản ghi vào `classes/{classId}/students/{uid}` từ trình duyệt và **không thể** đọc trực tiếp `/joinCodes/{code}` từ Client SDK.
   - Luồng tham gia lớp bắt buộc đi qua `POST /api/classes/join` với Firebase ID Token hợp lệ.
   - Server thực thi giao dịch nguyên tử (`adminDb.runTransaction` thông qua `claimStudentSlotTransaction`) kết hợp khóa độc quyền `classes/{classId}/studentCodeLocks/{studentCode}` để kiểm tra `joinCodes/{joinCode}`, đối chiếu `studentCode` (ngẫu nhiên ≥ 6 ký tự CSPRNG) chưa bị tài khoản khác chiếm chỗ, rồi mới ghi đồng thời `classes/{classId}/students/{uid}`, `studentCodeLocks/{studentCode}`, và `users/{uid}`. Hai request song song cùng nhận một `studentCode` đảm bảo chỉ 1 tài khoản thành công (`200 OK`), tài khoản còn lại bị từ chối (`409 Conflict`).

2. **Chấm điểm trên Server, Nguyên tử hóa lượt nộp & Chống giả mạo `timeSeconds`:**
   - Đáp án bài tập (`multipleChoiceAnswers`, `sentenceOrderingAnswers`, `essayModels`) được tách khỏi `classes/{classId}/assignments/{assignmentId}` và lưu riêng tại `classes/{classId}/answerKeys/{assignmentId}` (chỉ Giảng viên chủ nhiệm lớp và Admin SDK trên server đọc được).
   - Khi học viên mở đề bài hoặc bắt đầu bài kiểm tra nhanh, client gọi `POST /api/assignments/start` để server ghi mốc thời gian `startedAtMs` tại `classes/{classId}/assignmentStarts/{assignmentId}_{uid}`.
   - Khi học viên nộp bài qua `POST /api/submissions`, toàn bộ bước kiểm tra tư cách thành viên lớp, kiểm tra số lượt nộp (`attemptCount < maxAttempts` trên khóa xác định `{assignmentId}_{uid}`), chấm điểm đối chiếu `answerKeys`, tính thời gian làm bài chuẩn từ server (`computeServerAuthoritativeTimeSeconds` — **tuyệt đối không tin tưởng `timeSeconds` do client gửi**), và ghi kết quả vào `submissions`, `leaderboard`, `students` được thực hiện trong **một giao dịch nguyên tử duy nhất (`submitAssignmentTransaction`)**.

3. **Xác thực Vai trò Giảng viên (Teacher Role) Nghiêm ngặt & Kiểm tra Thu hồi Phiên (Token Revocation) — Fail-Closed:**
   - Loại bỏ hoàn toàn mọi email quản trị mặc định hard-code trong mã nguồn (`getTeacherEmailAllowlist()` chỉ đọc từ biến môi trường `process.env.TEACHER_EMAIL_ALLOWLIST`; nếu biến môi trường trống sẽ trả về `[]` — fail-closed).
   - `verifyFirebaseIdToken` gọi `adminAuth.verifyIdToken(idToken, true)` (`checkRevoked = true`), bắt mã lỗi `auth/id-token-revoked` để trả về HTTP `401` tức thì, và chỉ công nhận `emailVerified: decoded.email_verified === true`.
   - `isTeacherUserAuthorized(user)` đối chiếu đồng thời custom claim `role === 'teacher'`, `emailVerified === true` VÀ `isEmailInTeacherAllowlist(user.email)` trên mọi request để thu hồi quyền ngay lập tức nếu email bị gỡ khỏi danh sách cho phép.
   - `POST /api/teachers/bootstrap` bắt buộc `verifiedUser.emailVerified === true` VÀ `isEmailInTeacherAllowlist(email) === true` trước khi cấp custom claim `role = 'teacher'` và ghi `/teachers/{uid}`.

4. **Kiểm soát Schema Nghiêm ngặt (`keys().hasOnly()`) trên `firestore.rules`:**
   - Tất cả các collection/subcollection cho phép ghi từ Client SDK (`teachers`, `joinCodes`, `classes`, `students`, `decks`, `assignments`, `answerKeys`, `srs`) đều áp dụng `request.resource.data.keys().hasOnly([...])` để chặn hoàn toàn việc chèn trường lạ (shadow fields / arbitrary payload pollution).

5. **Bảo vệ Endpoint AI (`/api/gemini`), App Check Fail-Closed & Rate Limit Đa Instance:**
   - Bắt buộc xác thực Firebase ID Token (`Authorization: Bearer <idToken>`).
   - Bắt buộc Firebase App Check (`shouldEnforceAppCheck()`) mặc định ở chế độ **fail-closed** trên môi trường `NODE_ENV=production` (trừ khi ghi đè tường minh `ENFORCE_APP_CHECK=false`, kèm cảnh báo bảo mật rõ ràng). Mọi request từ frontend tới `/api/*` luôn đính kèm header `X-Firebase-AppCheck`.
   - Kiểm tra hạn mức ngày bằng Firestore Transaction trên `aiUsage/{uid}_{YYYY-MM-DD}`. Trong môi trường `production` (hoặc `STRICT_FIRESTORE_AI_QUOTA=true`), nếu Firestore gặp sự cố, hệ thống **fail-closed (`503 Service Unavailable`)** thay vì âm thầm chuyển sang bộ đếm RAM cục bộ.
   - Hỗ trợ giới hạn tốc độ chia sẻ liên instance (`rateLimits/{bucketId}`) bằng Firestore Transaction trên cả 6 scope (`api_general`, `teacher_bootstrap`, `ai_minute`, `join_class`, `assignment_start`, `reset_student_slot`).

---

## 2. Ma trận Phân quyền Firestore (`firestore.rules`)

| Đường dẫn (Path) | `get` | `list` | `create` | `update` | `delete` | Ràng buộc Schema (`keys().hasOnly()`) & Ghi chú |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `/teachers/{uid}` | Chủ sở hữu + `isTeacher()` | `false` | Chủ sở hữu + `isTeacher()` | Chủ sở hữu + `isTeacher()` | `false` | `['uid', 'email', 'displayName', 'role', 'updatedAt', 'createdAt']` |
| `/joinCodes/{code}` | Chỉ `isTeacher()` | `false` | Chỉ GV chủ nhiệm lớp (`code.size() >= 6`, `!exists(...)`) | `false` | Chỉ GV chủ nhiệm lớp | `['classId', 'teacherUid', 'createdAt']`. Học sinh vào lớp qua `POST /api/classes/join` nên bị từ chối `get` trực tiếp. |
| `/classes/{classId}` | Thành viên lớp (`isClassMember`) | Chỉ GV của lớp (`resource.data.teacherUid == auth.uid`) | Chỉ `isTeacher()` (`teacherUid == auth.uid`) | Chỉ GV chủ nhiệm lớp (`teacherUid` bất biến) | Chỉ GV chủ nhiệm lớp | `['id', 'teacherUid', 'teacherName', 'name', 'hskLevel', 'joinCode', 'createdAt', 'updatedAt']` |
| `/classes/{classId}/students/{studentUid}` | GV của lớp hoặc chính học viên (`isOwner(studentUid)`) | Chỉ GV chủ nhiệm lớp | Chỉ GV chủ nhiệm lớp (Học sinh **không** được tự tạo) | GV của lớp; hoặc Học viên **chỉ được sửa trường `name`** (`affectedKeys().hasOnly(['name'])`) | Chỉ GV chủ nhiệm lớp | GV: `['id', 'studentUid', 'studentCode', 'name', 'hskLevel', 'joinedAt', 'vocabScore', 'writingScore', 'quizScore', 'totalPoints', 'status', 'feedback', 'reviewWords', 'timeSeconds', 'streak', 'lastSubmittedAt', 'updatedAt']` |
| `/classes/{classId}/studentCodeLocks/{studentCode}` | `false` | `false` | `false` | `false` | `false` | Chỉ Admin SDK truy cập trong `claimStudentSlotTransaction`. |
| `/classes/{classId}/decks/{deckId}` | Thành viên lớp (`isClassMember`) | Thành viên lớp (`isClassMember`) | Chỉ GV chủ nhiệm lớp | Chỉ GV chủ nhiệm lớp | Chỉ GV chủ nhiệm lớp | `['id', 'title', 'hskLevel', 'teacherUid', 'slides', 'updatedAt']` |
| `/classes/{classId}/assignments/{assignmentId}` | Thành viên lớp (`isClassMember`) | Thành viên lớp (`isClassMember`) | Chỉ GV chủ nhiệm lớp (`!('answerKey' in data)`) | Chỉ GV chủ nhiệm lớp (`!('answerKey' in data)`) | Chỉ GV chủ nhiệm lớp | `['id', 'title', 'fileName', 'fileType', 'sessionTitle', 'sessionNumber', 'uploadedAt', 'dueDate', 'teacherName', 'teacherUid', 'rawContent', 'multipleChoiceList', 'sentenceOrderingList', 'essayList', 'questions', 'hskLevel', 'description', 'updatedAt']` |
| `/classes/{classId}/answerKeys/{assignmentId}` | Chỉ GV chủ nhiệm lớp | Chỉ GV chủ nhiệm lớp | Chỉ GV chủ nhiệm lớp | Chỉ GV chủ nhiệm lớp | Chỉ GV chủ nhiệm lớp | `['assignmentId', 'teacherUid', 'multipleChoiceAnswers', 'sentenceOrderingAnswers', 'essayModels', 'maxAttempts', 'updatedAt', 'answers']`. Học viên bị chặn tuyệt đối. |
| `/classes/{classId}/assignmentStarts/{startId}` | `false` | `false` | `false` | `false` | `false` | Chỉ Admin SDK ghi mốc bắt đầu làm bài qua `POST /api/assignments/start`. |
| `/classes/{classId}/submissions/{submissionId}` | GV chủ nhiệm lớp hoặc chính học viên (`resource.data.studentUid == auth.uid`) | Chỉ GV chủ nhiệm lớp (`isClassTeacher`) hoặc học viên lọc theo `studentUid == auth.uid` | `false` (Chỉ Server Admin SDK) | `false` (Chỉ Server Admin SDK) | `false` | Ghi độc quyền bởi `POST /api/submissions` trong `submitAssignmentTransaction`. |
| `/classes/{classId}/leaderboard/{studentUid}` | Thành viên lớp (`isClassMember`) | Thành viên lớp (`isClassMember`) | `false` (Chỉ Server Admin SDK) | `false` (Chỉ Server Admin SDK) | `false` | Ghi độc quyền bởi `POST /api/submissions` với `timeSeconds` tính từ server. |
| `/users/{studentUid}` | Chính học viên (`isOwner`) | `false` | `false` (Ghi qua Server Admin SDK) | `false` | `false` | Hồ sơ danh sách lớp học đã tham gia (`enrolledClassIds`). |
| `/users/{studentUid}/srs/{wordId}` | Chính học viên (`isOwner`) | Chính học viên (`isOwner`) | Chính học viên (`isOwner`) | Chính học viên (`isOwner`) | Chính học viên (`isOwner`) | `['wordId', 'hanzi', 'pinyin', 'meaning', 'learned', 'intervalDays', 'easeFactor', 'repetitions', 'dueAt', 'nextReviewAt', 'lastReviewedAt', 'updatedAt']` |
| `/aiUsage/{usageId}` | `false` | `false` | `false` | `false` | `false` | Chỉ Server Admin SDK quản lý hạn mức AI theo ngày. |
| `/rateLimits/{bucketId}` | `false` | `false` | `false` | `false` | `false` | Chỉ Server Admin SDK quản lý bộ đếm rate-limit chia sẻ liên instance. |

---

## 3. Đặc tả các Route Bảo mật trên Server (`server.ts`)

### 3.1. `POST /api/teachers/bootstrap`
- **Xác thực:** Firebase ID Token (`Authorization: Bearer <idToken>`) + App Check (`verifyRequestAppCheck`) + Shared Rate Limit (`teacher_bootstrap`).
- **Kiểm tra:**
  1. `verifiedUser.emailVerified === true` (bắt buộc boolean `true`, từ chối `false` hoặc `undefined` với HTTP `403`).
  2. `isEmailInTeacherAllowlist(verifiedUser.email) === true` đối chiếu biến môi trường `TEACHER_EMAIL_ALLOWLIST` (không có email mặc định hard-code; nếu chưa cấu hình biến môi trường thì từ chối tất cả với HTTP `403`).
- **Tác vụ:** Gọi `setCustomUserClaims(uid, { role: 'teacher' })` và ghi `/teachers/{uid}`.

### 3.2. `POST /api/classes/join`
- **Xác thực:** Firebase ID Token + App Check + Shared Rate Limit (`join_class`, tối đa 10 lần / 10 phút).
- **Cơ chế Nguyên tử (`claimStudentSlotTransaction`):**
  1. Đọc `joinCodes/{joinCode}`, `classes/{classId}`, `classes/{classId}/students/{uid}`, `classes/{classId}/studentCodeLocks/{studentCode}` và slot học viên trong cùng một Firestore Transaction.
  2. Nếu `studentCodeLocks/{studentCode}` hoặc slot đã gắn với `studentUid` khác -> trả về `409 Conflict`.
  3. Ghi đồng thời `classes/{classId}/students/{uid}`, `classes/{classId}/studentCodeLocks/{studentCode}`, cập nhật slot gốc `slot-{studentCode}`, và cập nhật `users/{uid}.enrolledClassIds`.

### 3.3. `POST /api/assignments/start` & `POST /api/submissions` (P1 Assignment Authorization Hardened)
- **Kiểm tra Ủy quyền Bài tập (`validateAssignmentAndAnswerKeyAuthorization`):**
  1. Xác thực Firebase ID Token (`verifyIdToken(token, true)`) + App Check; từ chối ngay (`403`) nếu `req.body.studentUid` khác `verifiedUser.uid`.
  2. Kiểm tra học viên đã thuộc lớp `classes/{classId}/students/{uid}` (`403` nếu chưa thuộc lớp).
  3. Kiểm tra bài tập thực sự tồn tại trong lớp (`classes/{classId}/assignments/{assignmentId}` hoặc `answerKeys/{assignmentId}`; trả về `404` nếu không tồn tại).
  4. Kiểm tra bài tập và `answerKey` thuộc đúng giáo viên chủ nhiệm lớp (`teacherUid === classData.teacherUid` và `classId` khớp; trả về `403` nếu lệch lớp/giáo viên).
  5. Kiểm tra bài tập đang ở trạng thái mở (`status` không phải `closed`/`archived`/`draft`/`disabled`/`locked`, `isClosed !== true`, `enabled !== false`, và chưa quá hạn `closedAt`).
- **`POST /api/assignments/start` (`startAssignmentTransaction`):** Ghi nhận `startedAtMs = Date.now()` trên server tại `classes/{classId}/assignmentStarts/{assignmentId}_{uid}` (giữ nguyên mốc đầu tiên nếu học viên chưa nộp bài).
- **`POST /api/submissions` (`submitAssignmentTransaction`):**
  1. Từ chối (`400 Bad Request`) nếu client gửi kèm `answerKey` và tự động loại bỏ mọi trường điểm số giả mạo (`totalPoints`, `vocabScore`, `status`...) trong `answers`.
  2. Chống nộp lặp (replay attack) qua `submissionNonce` (`409 Conflict` nếu trùng nonce đã nộp) và kiểm tra nguyên tử `prevAttempts < maxAttempts` (`409 Conflict` nếu vượt quá số lượt).
  3. Tính `timeSeconds = computeServerAuthoritativeTimeSeconds({ startedAtMs, submittedAtMs, totalQuestions })` dựa trên `assignmentStarts/{assignmentId}_{uid}` (hoàn toàn bỏ qua `req.body.timeSeconds`).
  4. Ghi đồng thời `submissions/{assignmentId}_{uid}`, `leaderboard/{uid}`, và `students/{uid}` trong cùng một giao dịch.

### 3.4. `POST /api/classes/:classId/students/:studentCode/reset-slot` (P1 Atomic Transaction)
- Thực thi trong một giao dịch Firestore nguyên tử (`resetStudentSlotTransaction`):
  1. Xác minh quyền chủ sở hữu lớp của giáo viên (`classData.teacherUid === verifiedUser.uid`) và kiểm tra email giáo viên còn nằm trong `TEACHER_EMAIL_ALLOWLIST`.
  2. Kiểm tra học viên có mã `studentCode` tồn tại trong lớp (`404` nếu không tồn tại) và kiểm tra mã mới không trùng với bất kỳ học viên hay `studentCodeLocks` nào khác trong lớp (`409 Conflict`).
  3. Xóa hồ sơ gắn UID cũ và `studentCodeLocks/{oldCode}`, tạo/cập nhật `studentCodeLocks/{nextCode}` và ghi hồ sơ `slot-{nextCode}` trong khi **bảo toàn 100% lịch sử học tập & điểm số** (`vocabScore`, `writingScore`, `quizScore`, `totalPoints`, `status`, `feedback`, `reviewWords`, `timeSeconds`, `streak`, `lastSubmittedAt`, `submissions/*`).

### 3.5. Bảo mật Gemini AI, Schema Validation & Chống Prompt Injection Đa Ngôn Ngữ (`POST /api/binbin/chat` — P1 Hardened)
- **Strict Schema Validation (`validateAndSanitizeBinBinChatPayload`):** Không đọc trực tiếp object thô từ `req.body`. Chỉ chấp nhận các khóa cho phép (`prompt`, `actionType`, `contextSlide`, `contextQuiz`, `history`), kiểm tra `actionType` theo allowlist, giới hạn độ dài từng trường và giới hạn `history` tối đa 6 lượt (`role` chỉ nhận `'user' | 'model'`).
- **Chống Prompt Injection (Việt / Trung / Anh) & XSS:** Hàm `sanitizeAiUserInput()` loại bỏ thẻ `<script>`, `<iframe>`, HTML, `javascript:`, lọc các mẫu Prompt Injection bằng tiếng Việt, tiếng Trung và tiếng Anh, đồng thời cô lập dữ liệu trong thẻ `<untrusted_slide_data>`, `<untrusted_quiz_data>`, `<untrusted_user_query>`.
- **Ẩn danh hóa PII & Bí mật:** Tự động che giấu Email (`[EMAIL_ĐÃ_ẨN]`), SĐT (`[SĐT_ĐÃ_ẨN]`), CCCD (`[CCCD_ĐÃ_ẨN]`), JWT/Bearer token (`[TOKEN_ĐÃ_ẨN]`) và Google API Key (`[API_KEY_ĐÃ_ẨN]`). Giới hạn `maxOutputTokens: 2048` và làm sạch đầu ra qua `sanitizeAiOutputObject()`.

### 3.6. Fail-Closed AI Quota (P0) & Bảo vệ Quyền riêng tư Rate Limit (P2)
- **P0 (`STRICT_FIRESTORE_AI_QUOTA` & `STRICT_SHARED_RATE_LIMIT`):** Trên môi trường `NODE_ENV === 'production'`, `isStrictFirestoreAiQuotaEnabled()` và `isStrictSharedRateLimitEnabled()` **luôn trả về `true`** (không cho phép biến môi trường `STRICT_FIRESTORE_AI_QUOTA=false` vô hiệu hóa chế độ fail-closed trên production; trả về HTTP `503` khi Firestore gặp sự cố). Chỉ cho phép fallback RAM có giới hạn (`5000` bản ghi) ở môi trường `development`/`test`.
- **P2 (`rateLimits/*` HMAC-SHA256 & TTL):** Mọi khóa định danh trong `rateLimits/{bucketId}` đều được băm một chiều bằng **HMAC-SHA256** (`hashRateLimitIdentifier` với `RATE_LIMIT_HMAC_SECRET`), tuyệt đối không lưu IP thô hay token, kèm trường TTL `expiresAt` (`Date`, lưu giữ 24 giờ). Hàm `resolveClientIp()` chỉ tin tưởng `req.ip` của Express (`trust proxy = 1`), không bao giờ đọc trực tiếp `req.headers['x-forwarded-for']`.

