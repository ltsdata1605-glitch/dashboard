#!/bin/bash
# Tự kéo thay đổi mới trên GitHub (nhánh main) về máy tính — chạy định kỳ bởi launchd (macOS).
# Cài: bash scripts/dong-bo-may-tinh/cai-dat.sh   ·   Gỡ: bash scripts/dong-bo-may-tinh/go-cai-dat.sh
#
# AN TOÀN TRƯỚC HẾT — script KHÔNG BAO GIỜ ghi đè việc đang làm dở trên máy:
#   - Chỉ chạy khi đang ở nhánh main VÀ không có file sửa dở / chưa commit.
#   - Chỉ "fast-forward" (git pull --ff-only): máy có commit riêng chưa push thì DỪNG, báo cho biết.
#   - Không push, không xoá, không reset gì cả.
# Mọi trường hợp bỏ qua đều ghi log + hiện thông báo macOS để người dùng biết vì sao chưa đồng bộ.

set -u
REPO="${1:-$(cd "$(dirname "$0")/../.." && pwd)}"
LOG="$HOME/Library/Logs/dashboard-dong-bo.log"
mkdir -p "$(dirname "$LOG")" 2>/dev/null
# launchd chạy với PATH tối giản — thêm chỗ Homebrew/Node hay nằm.
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$PATH"

ghi() { echo "$(date '+%Y-%m-%d %H:%M:%S') $*" >> "$LOG"; }
bao() {  # thông báo macOS (bỏ qua nếu không phải macOS)
    command -v osascript >/dev/null 2>&1 && osascript -e "display notification \"$1\" with title \"Dashboard — đồng bộ\"" >/dev/null 2>&1
    ghi "$1"
}

cd "$REPO" 2>/dev/null || { ghi "Không vào được thư mục $REPO"; exit 1; }
[ -d .git ] || { ghi "$REPO không phải repo git"; exit 1; }

nhanh=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)
if [ "$nhanh" != "main" ]; then ghi "Bỏ qua: đang ở nhánh '$nhanh', không phải main."; exit 0; fi

if ! git fetch -q origin main 2>>"$LOG"; then ghi "Bỏ qua: không kết nối được GitHub (mất mạng?)."; exit 0; fi

cu=$(git rev-parse HEAD); moi=$(git rev-parse origin/main)
[ "$cu" = "$moi" ] && exit 0   # đã mới nhất — im lặng

if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
    bao "Có bản mới trên GitHub nhưng máy đang có file sửa dở — CHƯA đồng bộ. Commit/stash rồi chạy: git pull"
    exit 0
fi
if [ -n "$(git rev-list origin/main..HEAD)" ]; then
    bao "Máy có commit chưa push — CHƯA đồng bộ để tránh xung đột. Chạy tay: git pull"
    exit 0
fi

doiLock=$(git diff --name-only "$cu" "$moi" -- package-lock.json functions/package-lock.json)
if ! git pull -q --ff-only origin main 2>>"$LOG"; then bao "Kéo bản mới thất bại — xem log $LOG"; exit 1; fi

soCommit=$(git rev-list --count "$cu..$moi")
if echo "$doiLock" | grep -q '^package-lock.json$'; then ghi "package-lock đổi → npm install"; npm install --no-audit --no-fund >>"$LOG" 2>&1; fi
if echo "$doiLock" | grep -q '^functions/package-lock.json$'; then ghi "functions/package-lock đổi → npm install (functions)"; (cd functions && npm install --no-audit --no-fund >>"$LOG" 2>&1); fi

bao "Đã đồng bộ $soCommit commit mới từ GitHub ($(git log -1 --format=%h))."
