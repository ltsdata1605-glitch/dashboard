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
