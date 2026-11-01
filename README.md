# HANU × 阮文受 — Hệ Thống Học Tập & Quản Lý Lớp Học Hán Ngữ HSK 3.0

Ứng dụng web học tiếng Trung HSK 1–9 dành cho lớp học (**React 19 + Vite + Tailwind CSS v4 + Express + Firebase Auth & Cloud Firestore + Gemini AI**), thiết kế sẵn sàng triển khai trên **Google Cloud Run**.

---

## 1. Kiến trúc & Tính năng chính

1. **Xác thực Tài khoản (Firebase Authentication)**:
   - **Giáo viên**: Đăng nhập bằng tài khoản Google (`GoogleAuthProvider`), tự động khởi tạo hồ sơ giáo viên và lớp học trên Firestore. (Đã loại bỏ hoàn toàn cơ chế mã PIN cũ).
   - **Học sinh**: Tham gia lớp bằng **Mã lớp (`joinCode`) + Mã học viên (`studentCode`, VD: `HV-001`)** do giáo viên cấp (sử dụng Firebase Anonymous Auth hoặc Google Auth để cấp `uid` riêng biệt cho từng học sinh). Học sinh không thể chọn tên của học sinh khác để làm bài hộ.
   - **Chế độ Bản Demo (`🧪 Xem bản demo`)**: Chạy dữ liệu mẫu 12 học viên hoàn toàn trong bộ nhớ tạm để trải nghiệm nhanh mà không ghi lên Firestore.

2. **Cơ sở dữ liệu thời gian thực & Offline Cache (Cloud Firestore)**:
   - `teachers/{uid}`: Hồ sơ giảng viên.
   - `classes/{classId}`: `{ teacherUid, name, hskLevel, joinCode }`.
   - `classes/{classId}/students/{studentUid}`: `{ name, studentCode, hskLevel, joinedAt }`.
   - `classes/{classId}/decks/{deckId}`: Bộ thẻ bài giảng từ vựng của giáo viên.
   - `classes/{classId}/assignments/{assignmentId}`: Đề bài tập về nhà đã giao.
   - `classes/{classId}/submissions/{submissionId}`: `{ studentUid, assignmentId, score, answersJson, submittedAt }` — học sinh chỉ được tạo bài nộp của chính mình, không sửa được điểm sau khi nộp và không đọc được bài làm của bạn khác.
   - `classes/{classId}/leaderboard/{studentUid}`: Bảng xếp hạng lớp chỉ công khai `{ name, studentCode, hskLevel, score, timeSeconds, streak }`.
   - `users/{studentUid}/srs/{wordId}`: Tiến độ ôn tập Flashcard SRS & trạng thái "đã thuộc" cá nhân của từng học sinh.
   - Bật sẵn **Firestore Offline Persistence (`persistentLocalCache`)** giúp học viên tra từ và ôn Flashcard ngay cả khi mất mạng.

3. **Công cụ Di chuyển Dữ liệu Cũ (`📂 Chuyển JSON cũ lên Firestore`)**:
   - Giáo viên bấm nút **`📂 Chuyển JSON cũ lên Firestore`** trong trang Quản lý lớp (`/giao-vien/lop/:classId`) và chọn file `classroom-state.json` hoặc `HANU_HSK3_Full_Backup_*.json` để tự động tạo lớp, danh sách học sinh, bài tập và bộ từ vựng trên Firestore.

4. **Định tuyến URL (`react-router-dom`)**:
   - `/hoc`: Học từ vựng, ngữ pháp & Luyện viết chữ Hán ô Mễ Tự Cách.
   - `/flashcard`: Ôn tập Flashcard SRS & Sổ tay từ khó (错题本).
   - `/bai-tap` & `/bai-tap/:id`: Đấu trường Bài tập HSK 3.0 (`/bai-tap/homework`, `/bai-tap/sentence-builder`, `/bai-tap/speedtest`, `/bai-tap/leaderboard`).
   - `/giao-vien/soan-bai`: Studio Soạn bài giảng của Giáo viên.
   - `/giao-vien/lop/:classId`: Quản lý lớp học, giao bài và sổ điểm.
   - `/dang-nhap`: Cổng đăng nhập Giáo viên / Học sinh.
   - Hỗ trợ đầy đủ nút Back / Forward của trình duyệt và trang `404` khi nhập sai URL.

5. **Bảo vệ API Gemini AI & Dữ liệu Nét chữ / Hình minh họa Nội bộ**:
   - Các endpoint `/api/hanzi/enrich`, `/api/hanzi/suggest`, `/api/binbin/chat` yêu cầu header `Authorization: Bearer <Firebase ID Token>`, được xác thực phía server bằng `firebase-admin` và giới hạn lượt gọi theo `uid` (theo phút & theo ngày qua `AI_DAILY_LIMIT`).
   - Dữ liệu nét viết chữ Hán được phục vụ trực tiếp từ gói `hanzi-writer-data` tại `/hanzi-data/:char.json` (không phụ thuộc `cdn.jsdelivr.net`).
   - Toàn bộ 63 ảnh minh họa từ vựng được lưu cục bộ tại `public/illustrations/*.svg` (không phụ thuộc `images.unsplash.com`).

---

## 2. Hướng dẫn tạo Firebase Project từ đầu (Từng bước)

1. Truy cập [Firebase Console](https://console.firebase.google.com/) và bấm **Add project** (hoặc chọn Google Cloud project hiện có).
2. **Bật Authentication**:
   - Vào **Build → Authentication → Get started**.
   - Trong tab **Sign-in method**, bật:
     - **Google** (dành cho Giáo viên và Học sinh đăng nhập bằng Google).
     - **Anonymous** (dành cho Học sinh tham gia nhanh bằng Mã lớp + Mã học viên).
   - Trong tab **Settings → Authorized domains**, thêm tên miền Cloud Run của bạn (ví dụ: `your-service-xyz.a.run.app`).
3. **Tạo Cloud Firestore Database**:
   - Vào **Build → Firestore Database → Create database**.
   - Chọn vị trí (ví dụ `asia-southeast1` hoặc `nam5`) và khởi tạo ở chế độ **Production mode**.
4. **Triển khai Firestore Security Rules**:
   - Sao chép nội dung file `firestore.rules` trong repo vào tab **Rules** trên Firebase Console và bấm **Publish** (hoặc chạy `firebase deploy --only firestore:rules`).
5. **Lấy cấu hình Web App**:
   - Vào **Project Settings → General → Your apps → Web app (`</>`)**.
   - Điền các giá trị vào file `.env` (theo mẫu `.env.example`) hoặc cập nhật `firebase-applet-config.json`.

---

## 3. Chạy thử tại máy cục bộ (Local Development & Firebase Emulator)

```bash
# 1. Cài đặt dependencies
npm install

# 2. Tạo file .env từ .env.example
cp .env.example .env

# 3. Chạy server phát triển (Express + Vite tại http://localhost:3000)
npm run dev
```

### Chạy kiểm thử tự động (`npm test`) & Kiểm thử Firestore Rules với Emulator:

```bash
# Chạy toàn bộ unit tests (Tone Sandhi, SRS, AI Auth/UID Quota, Hanzi Data, Firestore Rules Invariants)
npm test

# Nếu máy có cài Firebase CLI & Java, chạy kèm Firestore Emulator trực tiếp:
npx firebase-tools emulators:exec --only firestore "npm test"
```

---

## 4. Triển khai lên Google Cloud Run

```bash
# 1. Kiểm tra bản build Production
npm run build

# 2. Deploy lên Cloud Run (sử dụng Application Default Credentials cho firebase-admin)
gcloud run deploy hanu-hsk3-classroom \
  --source . \
  --region asia-southeast1 \
  --allow-unauthenticated \
  --set-env-vars="NODE_ENV=production,FIREBASE_PROJECT_ID=YOUR_PROJECT_ID,AI_DAILY_LIMIT=60" \
  --set-secrets="GEMINI_API_KEY=GEMINI_API_KEY:latest"
```
