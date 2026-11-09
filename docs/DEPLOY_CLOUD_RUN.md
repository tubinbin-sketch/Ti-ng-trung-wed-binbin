# Đưa HANU HSK lên Google Cloud Run

Netlify chỉ phục vụ phần giao diện. Các chức năng cần máy chủ — **trợ giảng 彬彬 (AI)**, **tra từ AI**, **vào lớp bằng mã**, **nộp bài và chấm điểm**, **đăng ký giáo viên** — chỉ chạy khi `server.ts` chạy. Cloud Run chạy cả giao diện lẫn máy chủ trong một container, cùng một địa chỉ web, nên mọi chức năng hoạt động đầy đủ.

Chi phí: Cloud Run có hạn mức miễn phí hằng tháng (2 triệu lượt truy cập). Với `--min-instances=0`, khi không ai dùng thì không tốn tiền máy. Dự án Google Cloud cần **bật thanh toán (billing)** để dùng Cloud Build và Cloud Run.

---

## Cách 1 — Deploy bằng Cloud Shell (khuyên dùng, ~10 phút lần đầu)

Không cần cài gì trên máy.

1. Mở **https://shell.cloud.google.com** và đăng nhập bằng tài khoản Google sở hữu dự án Firebase của app (`gen-lang-client-0729047629`).
2. Dán lần lượt:

   ```bash
   git clone https://github.com/tubinbin-sketch/Ti-ng-trung-wed-binbin.git
   cd Ti-ng-trung-wed-binbin
   TEACHER_EMAIL_ALLOWLIST="email-giao-vien@gmail.com" bash scripts/deploy-cloud-run.sh
   ```

   - Thay `email-giao-vien@gmail.com` bằng email Google của giáo viên (nhiều email thì cách nhau bằng dấu phẩy). Chỉ những email này mới đăng ký được vai trò giáo viên.
   - Lần đầu, script hỏi **Gemini API key**: lấy ở https://aistudio.google.com/apikey rồi dán vào (không hiện ra màn hình). Khóa được lưu trong Secret Manager, không nằm trong code.
3. Khi xong, script in ra địa chỉ dạng `https://hanu-hsk-xxxxxxxx.asia-southeast1.run.app`.

### Việc làm một lần sau khi deploy

- **Firebase Console → Authentication → Settings → Authorized domains → Add domain**: thêm tên miền Cloud Run vừa in ra (không có `https://`). Thiếu bước này thì nút "Đăng nhập bằng Google" sẽ báo lỗi.
- Mở `https://<địa-chỉ>/healthz` — thấy `{"ok":true,…}` là máy chủ đang chạy.

### Cập nhật bản mới

Mỗi khi `main` có thay đổi, mở Cloud Shell và chạy:

```bash
cd Ti-ng-trung-wed-binbin && git pull && bash scripts/deploy-cloud-run.sh
```

(Truyền lại `TEACHER_EMAIL_ALLOWLIST=...` nếu muốn giữ danh sách giáo viên — mỗi lần deploy, cấu hình được ghi lại từ đầu.)

---

## Cách 2 — Deploy từ GitHub (nút "Run workflow")

Sau khi đã chạy Cách 1 ít nhất một lần (để tạo kho image và các secret):

1. Tạo tài khoản dịch vụ cho GitHub trong Cloud Shell:

   ```bash
   PROJECT_ID=gen-lang-client-0729047629
   gcloud iam service-accounts create github-deployer --display-name="GitHub deploy"
   SA=github-deployer@$PROJECT_ID.iam.gserviceaccount.com
   for role in run.admin cloudbuild.builds.editor artifactregistry.writer \
               iam.serviceAccountUser storage.admin serviceusage.serviceUsageConsumer \
               logging.viewer; do
     gcloud projects add-iam-policy-binding $PROJECT_ID --member=serviceAccount:$SA --role=roles/$role --condition=None
   done
   gcloud iam service-accounts keys create key.json --iam-account=$SA
   cat key.json   # sao chép toàn bộ nội dung, rồi xóa file: rm key.json
   ```

2. Trên GitHub: **Settings → Secrets and variables → Actions**
   - Tab *Secrets* → **New repository secret** `GCP_SA_KEY` = nội dung `key.json`.
   - Tab *Variables* → thêm `GCP_PROJECT_ID` = `gen-lang-client-0729047629`, `TEACHER_EMAIL_ALLOWLIST` = danh sách email giáo viên.
3. **Actions → Deploy to Cloud Run → Run workflow**. Muốn tự deploy sau mỗi lần gộp vào `main`: bỏ dấu `#` ở mục `push:` trong `.github/workflows/deploy-cloud-run.yml`.

---

## Cấu hình

| Biến | Bắt buộc | Ý nghĩa |
|---|---|---|
| `gemini-api-key` (Secret Manager) | Có, để AI chạy | Khóa Gemini API |
| `rate-limit-hmac-secret` (Secret Manager) | Tự tạo | Khóa băm IP/UID khi giới hạn lượt gọi |
| `TEACHER_EMAIL_ALLOWLIST` | Có, để có giáo viên | Email Google được phép đăng ký giáo viên |
| `VITE_RECAPTCHA_ENTERPRISE_SITE_KEY` | Không | Bật Firebase App Check (chống gọi API giả mạo). Có khóa này thì App Check tự bật |
| `ALLOWED_ORIGINS` | Không | Tên miền khác được gọi API (ví dụ tên miền riêng) |
| `AI_DAILY_LIMIT` | Không (60) | Số lượt AI mỗi người dùng mỗi ngày |
| `REGION` | Không (`asia-southeast1`) | Singapore — gần Việt Nam nhất |

**App Check:** khi chưa có `VITE_RECAPTCHA_ENTERPRISE_SITE_KEY`, script để `ENFORCE_APP_CHECK=false` (nếu bật mà không có khóa, mọi lệnh gọi API sẽ bị chặn). Khi đã tạo khóa reCAPTCHA Enterprise và đăng ký trong Firebase Console → App Check, chạy lại:

```bash
VITE_RECAPTCHA_ENTERPRISE_SITE_KEY=<site-key> TEACHER_EMAIL_ALLOWLIST="..." bash scripts/deploy-cloud-run.sh
```

---

## Netlify sau khi có Cloud Run

Để mọi người dùng một địa chỉ có đủ chức năng, cho Netlify chuyển hướng sang Cloud Run: thay toàn bộ nội dung `public/_redirects` bằng

```
/*  https://hanu-hsk-xxxxxxxx.asia-southeast1.run.app/:splat  301!
```

(thay bằng địa chỉ Cloud Run thật). Hoặc gắn tên miền riêng thẳng vào Cloud Run: Cloud Run → service `hanu-hsk` → **Manage custom domains**.

---

## Khi có lỗi

- **Đăng nhập Google báo `auth/unauthorized-domain`** → chưa thêm tên miền vào Authorized domains (xem trên).
- **彬彬 trả lời "chế độ ngoại tuyến"** → chưa có secret `gemini-api-key`, hoặc khóa sai. Sửa: `printf '%s' "<khóa-mới>" | gcloud secrets versions add gemini-api-key --data-file=-` rồi deploy lại.
- **API trả 401** → App Check đang bật nhưng thiếu site key. Deploy lại không kèm `VITE_RECAPTCHA_ENTERPRISE_SITE_KEY` (App Check sẽ tắt), hoặc thêm khóa đúng.
- **Xem log máy chủ:** `gcloud run services logs read hanu-hsk --region asia-southeast1 --limit 100`
