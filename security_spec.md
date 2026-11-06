# ĐẶC TẢ KIẾN TRÚC BẢO MẬT & PHÂN QUYỀN (SECURITY SPECIFICATION)
**Dự án:** Tiếng Trung HANU — Bin-Bin HSK 3.0  
**Phiên bản:** 3.0 (Đồng bộ 100% với `firestore.rules` và `server.ts` trên nhánh `feat/security-hardening-v2`)

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

3. **Xác thực Vai trò Giảng viên (Teacher Role)嚴 ngặt — Fail-Closed:**
   - Loại bỏ hoàn toàn mọi email quản trị mặc định hard-code trong mã nguồn (`getTeacherEmailAllowlist()` chỉ đọc từ biến môi trường `process.env.TEACHER_EMAIL_ALLOWLIST`; nếu biến môi trường trống sẽ trả về `[]` — fail-closed).
   - `verifyFirebaseIdToken` chỉ công nhận `emailVerified: decoded.email_verified === true`.
   - `POST /api/teachers/bootstrap` bắt buộc `verifiedUser.emailVerified === true` VÀ `isEmailInTeacherAllowlist(email) === true` trước khi cấp custom claim `role = 'teacher'` và ghi `/teachers/{uid}`.

4. **Kiểm soát Schema Nghiêm ngặt (`keys().hasOnly()`) trên `firestore.rules`:**
   - Tất cả các collection/subcollection cho phép ghi từ Client SDK (`teachers`, `joinCodes`, `classes`, `students`, `decks`, `assignments`, `answerKeys`, `srs`) đều áp dụng `request.resource.data.keys().hasOnly([...])` để chặn hoàn toàn việc chèn trường lạ (shadow fields / arbitrary payload pollution).

5. **Bảo vệ Endpoint AI (`/api/gemini`), App Check & Rate Limit Đa Instance:**
   - Bắt buộc xác thực Firebase ID Token (`Authorization: Bearer <idToken>`).
   - Hỗ trợ bắt buộc Firebase App Check (`shouldEnforceAppCheck()`) khi `ENFORCE_APP_CHECK=true` hoặc tự động kích hoạt trong môi trường `NODE_ENV=production` khi đã cấu hình `VITE_RECAPTCHA_ENTERPRISE_SITE_KEY`.
   - Kiểm tra hạn mức ngày bằng Firestore Transaction trên `aiUsage/{uid}_{YYYY-MM-DD}`. Trong môi trường `production` (hoặc `STRICT_FIRESTORE_AI_QUOTA=true`), nếu Firestore gặp sự cố, hệ thống **fail-closed (`503 Service Unavailable`)** thay vì âm thầm chuyển sang bộ đếm RAM cục bộ.
   - Hỗ trợ giới hạn tốc độ chia sẻ liên instance (`rateLimits/{bucketId}`) bằng Firestore Transaction kết hợp bộ nhớ L1 cho các route nhạy cảm (`/api/classes/join`, `/api/teachers/bootstrap`).

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

### 3.3. `POST /api/assignments/start` & `POST /api/submissions`
- **`POST /api/assignments/start`:** Ghi nhận `startedAtMs = Date.now()` trên server tại `classes/{classId}/assignmentStarts/{assignmentId}_{uid}` (giữ nguyên mốc đầu tiên nếu học viên chưa nộp bài).
- **`POST /api/submissions`:**
  - Thực thi `submitAssignmentTransaction` nguyên tử:
    1. Kiểm tra `classes/{classId}/students/{uid}` (nếu chưa thuộc lớp -> `403 Forbidden`).
    2. Đọc `classes/{classId}/answerKeys/{assignmentId}` (hoặc preset fallback trên server) và `classes/{classId}/submissions/{assignmentId}_{uid}`.
    3. Kiểm tra `prevAttempts < maxAttempts` (nếu vượt quá -> `409 Conflict`, chống race condition khi gửi nhiều request nộp bài đồng thời).
    4. Tính `timeSeconds = computeServerAuthoritativeTimeSeconds({ startedAtMs, submittedAtMs, totalQuestions })` dựa trên `assignmentStarts/{assignmentId}_{uid}` (tối thiểu `max(5, totalQuestions * 2)` giây; nếu không có `startedAtMs` hợp lệ thì áp dụng mức phạt mặc định `300` giây, hoàn toàn bỏ qua `req.body.timeSeconds`).
    5. Ghi đồng thời `submissions/{assignmentId}_{uid}`, `leaderboard/{uid}`, và `students/{uid}`.
