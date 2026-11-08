#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Deploy HANU HSK (web app + API) to Google Cloud Run.
#
# Run it in Google Cloud Shell (https://shell.cloud.google.com), which already
# has gcloud and git and is signed in to your Google account:
#
#   git clone https://github.com/tubinbin-sketch/Ti-ng-trung-wed-binbin.git
#   cd Ti-ng-trung-wed-binbin
#   bash scripts/deploy-cloud-run.sh
#
# The first run enables the APIs, creates an image repository and asks for the
# Gemini API key (stored in Secret Manager, never in the code). Later runs
# just rebuild and redeploy. Settings can be passed as environment variables:
#
#   PROJECT_ID=...  REGION=asia-southeast1  SERVICE=hanu-hsk
#   TEACHER_EMAIL_ALLOWLIST="co.thu@gmail.com,thay.nam@gmail.com"
#   VITE_RECAPTCHA_ENTERPRISE_SITE_KEY=...   (optional, enables App Check)
#   ALLOWED_ORIGINS="https://your-domain.vn" (optional, extra trusted sites)
# ---------------------------------------------------------------------------
set -euo pipefail

cd "$(dirname "$0")/.."

# Firebase project of this app (from firebase-applet-config.json) is the default:
# Cloud Run must run in the same project to read Firestore without extra keys.
DEFAULT_PROJECT="$(sed -n 's/.*"projectId": *"\([^"]*\)".*/\1/p' firebase-applet-config.json | head -1)"
PROJECT_ID="${PROJECT_ID:-${DEFAULT_PROJECT:-$(gcloud config get-value project 2>/dev/null)}}"
REGION="${REGION:-asia-southeast1}"          # Singapore: closest region to Vietnam
SERVICE="${SERVICE:-hanu-hsk}"
REPO="${REPO:-hanu}"
RECAPTCHA_KEY="${VITE_RECAPTCHA_ENTERPRISE_SITE_KEY:-}"

if [[ -z "${PROJECT_ID}" ]]; then
  echo "Không xác định được Google Cloud project. Chạy lại với PROJECT_ID=<id-du-an>." >&2
  exit 1
fi

echo "▶ Project: ${PROJECT_ID} · Region: ${REGION} · Service: ${SERVICE}"
gcloud config set project "${PROJECT_ID}" >/dev/null

echo "▶ Bật các dịch vụ cần thiết (lần đầu mất ~1 phút)…"
gcloud services enable run.googleapis.com cloudbuild.googleapis.com \
  artifactregistry.googleapis.com secretmanager.googleapis.com \
  firestore.googleapis.com firebaseappcheck.googleapis.com --quiet

if ! gcloud artifacts repositories describe "${REPO}" --location="${REGION}" >/dev/null 2>&1; then
  echo "▶ Tạo kho image ${REPO}…"
  gcloud artifacts repositories create "${REPO}" --repository-format=docker \
    --location="${REGION}" --description="HANU HSK images" --quiet
fi

# --- Secrets (stored in Secret Manager) -------------------------------------
ensure_secret() {
  local name="$1" prompt="$2" generate="${3:-}"
  if gcloud secrets describe "${name}" >/dev/null 2>&1; then
    return
  fi
  local value=""
  if [[ -n "${generate}" ]]; then
    value="$(head -c 48 /dev/urandom | base64 | tr -d '\n/+=' | head -c 48)"
  else
    read -r -s -p "${prompt}: " value
    echo
  fi
  if [[ -z "${value}" ]]; then
    echo "Bỏ qua ${name} (để trống)." >&2
    return
  fi
  printf '%s' "${value}" | gcloud secrets create "${name}" --data-file=- --replication-policy=automatic --quiet
}

ensure_secret gemini-api-key "Dán Gemini API key (lấy ở https://aistudio.google.com/apikey)"
ensure_secret rate-limit-hmac-secret "" generate

# Cloud Run's runtime service account must be able to read the secrets and Firestore.
PROJECT_NUMBER="$(gcloud projects describe "${PROJECT_ID}" --format='value(projectNumber)')"
RUNTIME_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"
for secret in gemini-api-key rate-limit-hmac-secret; do
  if gcloud secrets describe "${secret}" >/dev/null 2>&1; then
    gcloud secrets add-iam-policy-binding "${secret}" \
      --member="serviceAccount:${RUNTIME_SA}" --role=roles/secretmanager.secretAccessor --quiet >/dev/null
  fi
done
gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${RUNTIME_SA}" --role=roles/datastore.user --condition=None --quiet >/dev/null
# Teacher sign-up sets a custom "teacher" claim on the Firebase user.
gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${RUNTIME_SA}" --role=roles/firebaseauth.admin --condition=None --quiet >/dev/null
# Server verifies Firebase App Check tokens.
gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${RUNTIME_SA}" --role=roles/firebaseappcheck.tokenVerifier --condition=None --quiet >/dev/null || true

# --- Build ---------------------------------------------------------------------
IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO}/${SERVICE}:$(git rev-parse --short=12 HEAD 2>/dev/null || date +%s)"
echo "▶ Build image ${IMAGE} (khoảng 3–6 phút)…"
gcloud builds submit --config cloudbuild.yaml \
  --substitutions="_IMAGE=${IMAGE},_RECAPTCHA_SITE_KEY=${RECAPTCHA_KEY}" .

# --- Runtime settings ---------------------------------------------------------
# Without a reCAPTCHA Enterprise key the browser can't send App Check tokens, so
# enforcing App Check would reject every API call. Enforce it once a key exists.
ENFORCE_APP_CHECK="${ENFORCE_APP_CHECK:-$([[ -n "${RECAPTCHA_KEY}" ]] && echo true || echo false)}"
ENV_FILE="$(mktemp)"
cat >"${ENV_FILE}" <<EOF
NODE_ENV: "production"
FIREBASE_PROJECT_ID: "${PROJECT_ID}"
ENFORCE_APP_CHECK: "${ENFORCE_APP_CHECK}"
TEACHER_EMAIL_ALLOWLIST: "${TEACHER_EMAIL_ALLOWLIST:-}"
ALLOWED_ORIGINS: "${ALLOWED_ORIGINS:-}"
AI_DAILY_LIMIT: "${AI_DAILY_LIMIT:-60}"
MAX_SUBMISSION_ATTEMPTS: "${MAX_SUBMISSION_ATTEMPTS:-1}"
EOF

SECRETS="GEMINI_API_KEY=gemini-api-key:latest,RATE_LIMIT_HMAC_SECRET=rate-limit-hmac-secret:latest"
if ! gcloud secrets describe gemini-api-key >/dev/null 2>&1; then
  SECRETS="RATE_LIMIT_HMAC_SECRET=rate-limit-hmac-secret:latest"
fi

echo "▶ Deploy lên Cloud Run…"
gcloud run deploy "${SERVICE}" \
  --image="${IMAGE}" \
  --region="${REGION}" \
  --allow-unauthenticated \
  --port=8080 \
  --cpu=1 --memory=512Mi \
  --min-instances=0 --max-instances=5 \
  --concurrency=80 --timeout=60s \
  --env-vars-file="${ENV_FILE}" \
  --set-secrets="${SECRETS}" \
  --quiet
rm -f "${ENV_FILE}"

URL="$(gcloud run services describe "${SERVICE}" --region="${REGION}" --format='value(status.url)')"
echo
echo "✅ Đã deploy: ${URL}"
echo "   Kiểm tra: ${URL}/healthz"
echo
echo "Việc cần làm 1 lần: thêm tên miền sau vào Firebase Console → Authentication →"
echo "Settings → Authorized domains để đăng nhập Google hoạt động:"
echo "   ${URL#https://}"
if [[ "${ENFORCE_APP_CHECK}" == "false" ]]; then
  echo
  echo "Lưu ý: App Check đang TẮT (chưa có VITE_RECAPTCHA_ENTERPRISE_SITE_KEY)."
fi
if [[ -z "${TEACHER_EMAIL_ALLOWLIST:-}" ]]; then
  echo
  echo "Lưu ý: chưa có email giáo viên nào (TEACHER_EMAIL_ALLOWLIST). Chạy lại với"
  echo '   TEACHER_EMAIL_ALLOWLIST="email1@gmail.com,email2@gmail.com" bash scripts/deploy-cloud-run.sh'
fi
