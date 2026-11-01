# Giao diện HANU HSK — hệ thống thiết kế

## Nguyên tắc
- Một lớp token duy nhất trong `src/index.css`. Component chỉ dùng tên token (`bg-surface`, `text-ink`, `border-border`, `bg-primary`…), **không viết mã màu hex**.
- Nền sáng, trung tính; một màu thương hiệu (xanh ngọc) cho hành động chính; đỏ son chỉ dùng cho con dấu 汉 và cảnh báo.
- Chữ Hán hiển thị bằng `font-hanzi` (Noto Serif SC), giao diện dùng Be Vietnam Pro.
- Dark mode và các theme màu chỉ là một khối biến CSS (`html[data-theme="…"]`).

## Token màu
| Token | Dùng cho |
|---|---|
| `canvas` | nền trang |
| `surface` / `surface-2` | thẻ, panel / nền phụ, ô nhập |
| `ink` / `ink-muted` / `ink-subtle` | chữ chính / phụ / mờ |
| `border` / `border-strong` | viền thường / viền nút phụ |
| `primary`, `primary-hover`, `primary-soft`, `on-primary` | nút chính, trạng thái đang chọn |
| `inverse`, `inverse-hover` | nút/khối tối (chữ trắng) |
| `accent`, `accent-soft` | đỏ son: con dấu, lỗi, cảnh báo |
| `gold`, `highlight`, `on-highlight` | nhãn hổ phách, sao, chuỗi ngày học |
| `success`, `warning`, `danger` | trạng thái |

## Bố cục
- Máy tính (≥1024px): sidebar trái 256px + thanh trên 64px, nội dung tối đa 1320px.
- Điện thoại: thanh trên 56px + thanh tab dưới đáy (5 mục, đổi theo vai trò).
- Thành phần khung nằm ở `src/components/layout/AppShell.tsx`; trang tổng quan ở `src/components/HomeDashboard.tsx`.

## Theme
`halora-sage` (Ngọc bích, mặc định), `warm-crimson` (Đỏ son), `minimal-ink` (Thủy mặc), `classic-amber` (Hổ phách), `moon-night` (Tối). Lựa chọn được lưu ở `localStorage['hanu_ui_theme']`; lần đầu tự theo chế độ sáng/tối của hệ điều hành.

## Script chuyển đổi
`scripts/codemod-design-tokens.py` đã chuyển các mã màu cũ sang token. Chạy lại an toàn (idempotent) nếu có code mới còn dùng màu hex cũ:
```
python3 scripts/codemod-design-tokens.py src
```
