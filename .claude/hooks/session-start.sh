#!/bin/bash
# SessionStart hook cho phiên Claude Code trên cloud: cài dependency để `npm run check` chạy được ngay.
#
# Cài cả `functions/` vì typecheck ở gốc kéo theo functions/src/firebaseAdmin.ts (cần `firebase-admin`
# chỉ có trong functions/node_modules) — giống bước "Cài dependency functions" trong .github/workflows/check.yml.
# Dùng `npm install` (không phải `npm ci`) để tận dụng node_modules đã được cache của container.
set -euo pipefail

# Chỉ chạy trên cloud; máy dev/Mac của chủ dự án tự quản node_modules.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-$(dirname "$0")/../..}"

# Playwright dùng Chromium cài sẵn trong container — không tải lại trình duyệt.
export PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

npm install --no-audit --no-fund
npm install --prefix functions --no-audit --no-fund

# Plugin Playwright (MCP) mặc định tìm Chrome ở /opt/google/chrome/chrome — container chỉ có Chromium
# của Playwright, và chạy bằng root nên phải thêm --no-sandbox. Dựng script bọc trỏ sang Chromium đó.
CHROMIUM_BIN="$(ls -d /opt/pw-browsers/chromium-*/chrome-linux/chrome 2>/dev/null | sort -V | tail -1 || true)"
if [ -n "$CHROMIUM_BIN" ] && [ ! -x /opt/google/chrome/chrome ]; then
  mkdir -p /opt/google/chrome
  printf '#!/bin/sh\nexec %s --no-sandbox "$@"\n' "$CHROMIUM_BIN" > /opt/google/chrome/chrome
  chmod +x /opt/google/chrome/chrome
fi

# Plugin Firebase (MCP) chạy `npx -y firebase-tools@latest mcp` và bị cắt sau 30s nếu lần đầu phải tải
# gói. Tải trước vào cache npx để lần khởi động MCP chỉ mất vài giây.
npx -y firebase-tools@latest --version > /dev/null 2>&1 || true

# Biến dùng cho cả phiên (Playwright + Firebase Admin). CLAUDE_ENV_FILE do Claude Code cấp cho hook SessionStart.
if [ -n "${CLAUDE_ENV_FILE:-}" ]; then
  # Chromium cài sẵn của container (playwright.config.ts đọc E2E_CHROMIUM_PATH, 2 spec dữ liệu thật đọc PW_CHROMIUM).
  if [ -x /opt/pw-browsers/chromium ] || [ -e /opt/pw-browsers/chromium ]; then
    echo 'export E2E_CHROMIUM_PATH=/opt/pw-browsers/chromium' >> "$CLAUDE_ENV_FILE"
    echo 'export PW_CHROMIUM=/opt/pw-browsers/chromium' >> "$CLAUDE_ENV_FILE"
  fi

  # Service account test (đặt trong biến môi trường của environment trên claude.ai, base64 hoặc JSON thô) →
  # file quyền 600 NGOÀI repo cho Admin SDK / firebase CLI. Không in nội dung khoá. Helper đăng nhập e2e
  # (tests/e2e/helpers/customTokenLogin.ts) đọc thẳng FIREBASE_TEST_SA_B64 + FIREBASE_TEST_UID, không cần file này.
  if [ -n "${GOOGLE_APPLICATION_CREDENTIALS_JSON:-}" ]; then
    SA_FILE="$HOME/.config/gcloud/ycx-service-account.json"
    mkdir -p "$(dirname "$SA_FILE")"
    (
      umask 077
      case "$GOOGLE_APPLICATION_CREDENTIALS_JSON" in
        \{*) printf '%s' "$GOOGLE_APPLICATION_CREDENTIALS_JSON" > "$SA_FILE" ;;
        *) printf '%s' "$GOOGLE_APPLICATION_CREDENTIALS_JSON" | base64 -d > "$SA_FILE" ;;
      esac
    ) && echo "export GOOGLE_APPLICATION_CREDENTIALS=\"$SA_FILE\"" >> "$CLAUDE_ENV_FILE"
  fi
fi
