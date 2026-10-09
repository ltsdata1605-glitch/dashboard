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
