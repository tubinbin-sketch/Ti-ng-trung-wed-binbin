# HỒ SƠ ĐÁNH GIÁ & TUÂN THỦ BẢO VỆ DỮ LIỆU CÁ NHÂN (DATA PROTECTION COMPLIANCE)

**Dự án**: Nền tảng Học tiếng Trung HSK 3.0 — Bin-Bin HSK (`HANU × 阮文受`)  
**Căn cứ pháp lý tham chiếu tại Việt Nam**:
- **Luật Bảo vệ dữ liệu cá nhân số 91/2025/QH15** (có hiệu lực từ ngày 01/01/2026).
- **Nghị định 356/2025/NĐ-CP** quy định chi tiết một số điều và biện pháp thi hành Luật Bảo vệ dữ liệu cá nhân.
- **Nghị định 13/2023/NĐ-CP** về bảo vệ dữ liệu cá nhân.

> *Lưu ý pháp lý*: Tài liệu này là đánh giá kỹ thuật và hướng dẫn tuân thủ dành cho Chủ sở hữu dự án / Đơn vị vận hành lớp học. Chủ dự án cần rà soát cùng bộ phận pháp chế hoặc cố vấn pháp lý của đơn vị trước khi nộp hồ sơ thông báo/đánh giá tác động xử lý dữ liệu cá nhân (DPIA) tới Cơ quan chuyên trách bảo vệ dữ liệu cá nhân (Bộ Công an) nếu thuộc diện phải nộp theo quy định.

---

## 1. KIỂM KÊ DỮ LIỆU CÁ NHÂN TRONG HỆ THỐNG (DATA INVENTORY)

### 1.1. Phân loại dữ liệu theo Luật 91/2025/QH15
- **Dữ liệu cá nhân nhạy cảm**: **KHÔNG THU THẬP** (Ứng dụng không thu thập thông tin sức khỏe, tài chính, ngân hàng, định vị GPS, sinh trắc học lưu trữ, quan điểm chính trị/tôn giáo).
- **Dữ liệu cá nhân cơ bản**:

| Nhóm chủ thể | Loại dữ liệu cá nhân cơ bản | Mục đích xử lý | Nơi lưu trữ | Thời hạn lưu trữ |
| :--- | :--- | :--- | :--- | :--- |
| **Người tự học (Chưa vào lớp)** | Tiến độ từ vựng, lịch ôn tập SRS, chuỗi ngày học (Daily Streak), mục tiêu ngày | Duy trì tiến độ tự học cá nhân | Chỉ lưu trên trình duyệt của người dùng (`localStorage`) | Cho đến khi người dùng bấm nút **"Xóa dữ liệu cục bộ"** tại `/chinh-sach-rieng-tu` hoặc xóa bộ nhớ trình duyệt |
| **Học viên trong Lớp học** | Tên hiển thị (hoặc Biệt danh), Mã học viên ngẫu nhiên (`HV-XXXXXX`), UID ẩn danh/Firebase, điểm bài tập, câu trả lời bài tập, tiến độ SRS | Quản lý sĩ số lớp, chấm điểm bài tập tự động trên server, hiển thị bảng xếp hạng và thống kê từ vựng cần ôn | Google Cloud Firestore (`classes/{classId}/students/{uid}`, `submissions`, `leaderboard`, `users/{uid}/srs`) | Trong thời gian khóa học và tối đa 12 tháng sau khi kết thúc khóa học (hoặc xóa ngay khi có yêu cầu) |
| **Giảng viên** | Họ tên hiển thị, Địa chỉ Email Google, UID Firebase, trạng thái xác thực email (`email_verified`) | Xác thực quyền Giảng viên (`role == 'teacher'`) và quản lý các lớp học do giảng viên tạo | Firebase Authentication & Firestore (`/teachers/{uid}`, `/classes/{classId}`) | Trong suốt thời gian Giảng viên duy trì tài khoản giảng dạy trên nền tảng |

### 1.2. Dữ liệu giọng nói khi luyện phát âm (Web Speech API)
- Khi học viên bấm nút **"🎙️ Đọc thử"** ở trang Bài học, Flashcard hoặc Popup từ vựng, luồng âm thanh microphone chỉ được trình duyệt chuyển đổi thành văn bản tiếng Trung (`zh-CN`) tạm thời trong bộ nhớ RAM để chấm độ chính xác phiên âm.
- Nền tảng **không ghi âm, không lưu trữ tệp âm thanh (`.wav`/`.mp3`)** và **không tải giọng nói của học viên lên máy chủ Bin-Bin HSK**.

---

## 2. BẢO VỆ DỮ LIỆU TRẺ EM & HỌC SINH DƯỚI 16 TUỔI

Theo quy định về bảo vệ dữ liệu cá nhân của trẻ em và người dưới 16 tuổi tại Luật số 91/2025/QH15 và Nghị định 356/2025/NĐ-CP:
1. **Không bắt buộc đăng ký tài khoản cá nhân**: Học sinh có thể sử dụng toàn bộ tính năng học từ vựng, luyện viết chữ Hán, Flashcard SRS và ngữ pháp mà không cần cung cấp email, số điện thoại hay ngày tháng năm sinh.
2. **Tham gia lớp học qua Mã học viên ngẫu nhiên (`HV-XXXXXX`)**:
   - Giáo viên tạo sẵn mã học viên ngẫu nhiên (không suy đoán được danh tính).
   - Khuyến nghị giáo viên và phụ huynh hướng dẫn học sinh dưới 16 tuổi sử dụng **Tên gọi ở lớp / Tên viết tắt** (ví dụ: `Minh Châu`) thay vì họ tên đầy đủ kèm thông tin nhạy cảm.
3. **Tính năng Che thông tin cá nhân trên Bảng xếp hạng (`StudentLeaderboard.tsx`)**:
   - Đã trang bị nút **"Che Mã HV"** (`data-testid="leaderboard-privacy-mask-toggle"`) ngay trên Bảng xếp hạng để tự động ẩn bớt ký tự Mã học viên (`HV-***01`) và viết tắt tên đệm của các học viên khác khi trình chiếu trên màn hình lớp học.

---

## 3. KIỂM SOÁT CHIA SẺ DỮ LIỆU VỚI BÊN THỨ BA (THIRD-PARTY PROCESSORS)

1. **Google Firebase (Authentication & Cloud Firestore)**:
   - Vai trò: Hạ tầng xác thực và cơ sở dữ liệu đám mây bảo mật theo tiêu chuẩn ISO/IEC 27001, SOC 2.
2. **Google Gemini API (`@google/genai`)**:
   - Vai trò: Hỗ trợ giải thích từ vựng và trợ giảng ngữ pháp.
   - **Biện pháp kỹ thuật bảo vệ dữ liệu cá nhân (P1 Hardened)**: Hàm `sanitizeAiUserInput` và `validateAndSanitizeBinBinChatPayload` trong `server/services/geminiAiService.ts` tự động loại bỏ thẻ HTML/script, lọc Prompt Injection đa ngôn ngữ (Việt / Trung / Anh), cô lập ngữ cảnh trong thẻ `<untrusted_*>`, và che giấu mọi địa chỉ Email (`[EMAIL_ĐÃ_ẨN]`), Số điện thoại (`[SĐT_ĐÃ_ẨN]`), CCCD 12 số (`[CCCD_ĐÃ_ẨN]`), JWT/Bearer token (`[TOKEN_ĐÃ_ẨN]`) cùng khóa API (`[API_KEY_ĐÃ_ẨN]`). Hệ thống không bao giờ gửi danh sách học sinh hay điểm số cá nhân sang Gemini API.
3. **Bảo vệ Quyền riêng tư trong Bộ đếm Rate Limit (`rateLimits/*` — P2 Hardened)**:
   - Tuyệt đối không lưu địa chỉ IP thô, UID thô hoặc Firebase ID Token trong bộ sưu tập `/rateLimits/{bucketId}`.
   - Mọi định danh rate limit được băm một chiều bằng **HMAC-SHA256** (`hashRateLimitIdentifier`), kèm trường thời gian tự hủy `expiresAt` (`Date` chuẩn Firestore TTL Policy, thời hạn lưu giữ 24 giờ).

---

## 4. THỰC HIỆN QUYỀN CỦA CHỦ THỂ DỮ LIỆU (DATA SUBJECT RIGHTS)

Tại trang `/chinh-sach-rieng-tu` (`src/components/PrivacyPolicyPage.tsx`), người dùng có thể thực hiện ngay lập tức:
1. **Quyền được biết & Quyền truy cập / Xuất dữ liệu**: Bấm nút **"Xuất dữ liệu cá nhân (.json)"** để tải về toàn bộ dữ liệu học tập đang lưu trên thiết bị dưới định dạng chuẩn JSON.
2. **Quyền xóa dữ liệu cục bộ (Bảo vệ trên máy tính dùng chung)**: Bấm nút **"Xóa dữ liệu cục bộ trên thiết bị này"** để xóa sạch toàn bộ khóa `hanu_*` trong `localStorage` và `sessionStorage` sau buổi học tại phòng máy.
3. **Quyền yêu cầu xóa / chỉnh sửa hồ sơ lớp học trên Cloud**: Học viên hoặc Phụ huynh gửi yêu cầu tới Giảng viên chủ nhiệm lớp (giảng viên có nút Xóa / Cấp lại slot học viên trực tiếp trong `ClassroomManager` thông qua giao dịch nguyên tử `resetStudentSlotTransaction` bảo toàn 100% lịch sử học tập) hoặc liên hệ kênh quản trị chính thức của lớp để được xử lý trong vòng 72 giờ.

