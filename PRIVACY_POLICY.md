# CHÍNH SÁCH QUYỀN RIÊNG TƯ & BẢO VỆ DỮ LIỆU CÁ NHÂN — BIN-BIN HSK

**Hiệu lực cập nhật**: Tháng 11/2026  
**Đơn vị vận hành**: Nền tảng Học tiếng Trung HSK 3.0 — **Bin-Bin HSK (HANU × 阮文受)**  
**Đường dẫn truy cập trực tiếp trên ứng dụng**: `/chinh-sach-rieng-tu`

---

## 1. Cam kết chung
Bin-Bin HSK tôn trọng và cam kết bảo vệ quyền riêng tư, dữ liệu cá nhân của Giảng viên, Học viên và Phụ huynh theo đúng quy định của **Luật Bảo vệ dữ liệu cá nhân số 91/2025/QH15**, **Nghị định 356/2025/NĐ-CP** và **Nghị định 13/2023/NĐ-CP**.

## 2. Dữ liệu chúng tôi thu thập và mục đích sử dụng
1. **Chế độ Tự học (Không đăng nhập)**:
   - Dữ liệu tiến độ học từ vựng, lịch ôn tập Flashcard SRS, chuỗi ngày học (Daily Streak) và mục tiêu ngày chỉ được lưu trữ cục bộ trên trình duyệt của bạn (`localStorage`).
   - Chúng tôi **không** thu thập họ tên, email, số điện thoại hay địa chỉ IP cá nhân của người tự học.
2. **Chế độ Lớp học trực tuyến**:
   - **Học viên**: Lưu Tên hiển thị trong lớp, Mã học viên ngẫu nhiên do Giảng viên cấp (`HV-XXXXXX`), bài nộp và điểm số bài tập nhằm mục đích chấm bài tự động và giúp Giảng viên theo dõi tiến độ học tập.
   - **Giảng viên**: Lưu Tên hiển thị và địa chỉ Email Google đã xác thực để kiểm tra quyền quản trị lớp học (`TEACHER_EMAIL_ALLOWLIST`).
3. **Tính năng Luyện phát âm (Web Speech API)**:
   - Giọng đọc tiếng Trung của bạn chỉ được trình duyệt nhận diện tại chỗ để chấm độ chính xác phát âm, **không** lưu trữ tệp ghi âm trên máy chủ.
4. **Tính năng Trợ giảng AI Gấu Trúc Bân Bân (Google Gemini API)**:
   - Chỉ gửi nội dung câu hỏi tiếng Trung / ngữ pháp HSK qua máy chủ proxy tới Google Gemini API.
   - Hệ thống tự động ẩn (mask) Email và Số điện thoại nếu bạn vô tình nhập vào khung trò chuyện.

## 3. Bảo vệ Học viên dưới 16 tuổi
- Học viên dưới 16 tuổi tham gia lớp học trực tuyến cần có sự đồng ý và hướng dẫn của Phụ huynh/Người giám hộ hoặc Giảng viên chủ nhiệm lớp.
- Khuyến khích sử dụng Tên gọi ở lớp hoặc Tên viết tắt kèm Mã học viên (`HV-XXXXXX`).
- Bảng xếp hạng lớp học tích hợp sẵn chế độ **"Che Mã HV"** để ẩn bớt thông tin định danh khi trình chiếu trên lớp.

## 4. Quyền của bạn đối với dữ liệu cá nhân
Bạn có thể truy cập trang `/chinh-sach-rieng-tu` bất kỳ lúc nào để:
- **Tải xuống bản sao dữ liệu cá nhân (`.json`)** đang lưu trên thiết bị.
- **Xóa sạch dữ liệu cục bộ trên thiết bị** ngay sau khi sử dụng máy tính chung tại trường học hoặc nơi công cộng.
- Yêu cầu Giảng viên hoặc Quản trị viên (`dondon.win10@gmail.com`) chỉnh sửa hoặc xóa hoàn toàn hồ sơ học viên trên đám mây trong vòng 72 giờ làm việc.
