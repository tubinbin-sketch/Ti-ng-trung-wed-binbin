# HANU × 阮文受 — Hệ Thống Trợ Giảng & Học Tập Hán Ngữ Chuẩn HSK 3.0

Nền tảng giảng dạy, soạn bài tự động, luyện viết chữ Hán trên ô Mễ Tự Cách (`米字格`), bài tập 5 kỹ năng và quản lý lớp học tiếng Trung chuẩn khung **HSK 3.0 (3 giai đoạn – 9 cấp độ)** theo phong cách thiết kế **Modern Oriental Liquid Glass** (Ngọc Bích `#0F5243` & Chu Sa Hoàng Gia `#B8292F` trên nền giấy tuyên thành `#FAF7F0`).

---

## Kiến Trúc & Tính Năng Cốt Lõi

### 1. Phân Quyền Vai Trò & Bảo Mật Cổng Giáo Viên (Student-First & Teacher PIN Gate)
- **Mặc định chế độ Học sinh (`student`)**: Học viên truy cập trực tiếp vào không gian tự học từ vựng, tập viết nét chữ Mễ, Flashcard lặp lại ngắt quãng (Spaced Repetition + Sổ từ khó `错题本`), Luyện Lượng từ & Thanh điệu HSK 3.0, và Đấu trường Bài tập 5 kỹ năng.
- **Khóa PIN Cổng Giáo viên (`teacher`)**: Chuyển sang chế độ Giảng viên yêu cầu xác thực mã PIN bảo mật (Mã PIN demo mặc định: `2026`) để bảo vệ công cụ quản lý lớp, bảng điểm và trình biên tập bài giảng.

### 2. Hệ Thống Thanh Công Cụ Tối Giản 3 Tầng (3-Tier Teacher Workspace)
- **Tầng 1 (Top Navbar hợp nhất)**: Logo `HANU × 阮文受`, chuyển đổi 2 phân hệ chính (`1. Soạn Bài`, `2. Quản Lý Lớp`), nút `Đổi kiểu`, `Sao lưu JSON`, và chuyển đổi vai trò `Học sinh / Giáo viên`.
- **Tầng 2 (Thanh Tìm Kiếm, Bộ Lọc Popover & Menu Công Cụ Đứng Lớp)**:
  - Ô tìm kiếm từ vựng thông minh kèm kho từ gợi ý chuẩn HSK 3.0.
  - Popover **`Bộ lọc & Hiển thị`**: Gom gọn bộ lọc cấp độ HSK 1–9, 3 giai đoạn (Sơ cấp, Trung cấp, Cao cấp), các nút bật/tắt `Pinyin`, `Nghĩa TV`, và tùy chỉnh tốc độ viết nét / giọng đọc.
  - Menu thả xuống **`Công cụ đứng lớp`**: Gom gọn các công cụ giảng dạy trực tiếp (`Trình chiếu Fullscreen`, `Gọi tên ngẫu nhiên`, `Đồng hồ bấm giờ`, `Mini-Game lớp học`, `Nghe viết Chính tả 听写`, `Luyện Lượng từ 量词`, `Giao bài từ Slide`, `Giáo án HSK 3.0`, `In phiếu A4`, `Phím tắt`).
- **Tầng 3 (Dải Từ Vựng Cuộn Ngang Mượt Mà)**: Hiển thị danh sách thẻ từ vựng với trạng thái đã thuộc và chuyển đổi tức thì.

### 3. Bố Cục 3 Cột Cân Đối & Chuẩn Sư Phạm HSK 3.0
- **Cột 1 (Thẻ Từ Vựng Trung Tâm)**: Chữ Hán trung tâm kích thước lớn (`64px–80px`), ngay bên dưới Pinyin là từ loại, Hán Việt, nghĩa tiếng Việt rõ ràng và câu ví dụ giao tiếp thực tế kèm phát âm chuẩn `zh-CN`, chiết tự bộ thủ và điểm ngữ pháp HSK 3.0.
- **Cột 2 (Ô Mễ Tự Cách · 米字格)**: Hoạt ảnh thứ tự nét viết chuẩn `HanziWriter` kết hợp chế độ tự viết chấm điểm độ chính xác từng nét trên canvas SVG.
- **Cột 3 (Minh Họa Ngữ Cảnh & Hội Thoại Thực Tế · 课文)**: Kết hợp hình ảnh ngữ cảnh an toàn (`SafeImage` tự động chuyển sang tranh thủy mặc Phương Đông khi lỗi mạng), câu ví dụ thực tế (luyện phát âm thu âm giọng nói) và hội thoại A–B đọc Karaoke.

### 4. Backend Express & Lưu Trữ Bền Vững (`server.ts` & `storageService.ts`)
- **Rate Limiting & Input Validation**: Giới hạn tần suất gọi API (`/api/*`) chống spam, kiểm tra độ dài chuỗi đầu vào và trả về mã trạng thái HTTP chuẩn (`400`, `429`, `500`, `503`), ẩn thông tin lỗi nội bộ.
- **Model cấu hình qua biến môi trường**: Sử dụng `process.env.GEMINI_MODEL || 'gemini-2.5-flash'` qua SDK `@google/genai`.
- **Đồng bộ & Sao lưu toàn diện (`storageService.ts`)**: Đồng bộ trạng thái lớp học qua API `/api/storage/state` kết hợp `localStorage` và xuất/nhập toàn bộ dữ liệu lớp học ra file `.json`.

---

## Cài Đặt & Vận Hành

```bash
# 1. Cài đặt dependencies
npm install

# 2. Cấu hình biến môi trường (sao chép từ .env.example)
cp .env.example .env

# 3. Chạy môi trường phát triển (Full-stack Express + Vite trên cổng 3000)
npm run dev

# 4. Chạy bộ kiểm thử đơn vị (Unit Tests)
npm test

# 5. Kiểm tra TypeScript & Build Production
npm run lint
npm run build
```
