#!/bin/bash
# Cài tự động đồng bộ GitHub → máy tính (macOS). Chạy 1 lần: bash scripts/dong-bo-may-tinh/cai-dat.sh
set -e
REPO="$(cd "$(dirname "$0")/../.." && pwd)"
NHAN="vn.dashboard.dong-bo"
PLIST="$HOME/Library/LaunchAgents/$NHAN.plist"
SCRIPT="$REPO/scripts/dong-bo-may-tinh/dong-bo.sh"
CHU_KY="${CHU_KY_GIAY:-300}"   # 5 phút; đổi bằng: CHU_KY_GIAY=600 bash cai-dat.sh

[ "$(uname)" = "Darwin" ] || { echo "Script này dành cho macOS."; exit 1; }

# macOS chặn tiến trình nền (launchd) đọc ~/Documents, ~/Desktop, ~/Downloads → log báo
# "Operation not permitted", mã thoát 126, KHÔNG BAO GIỜ đồng bộ (gặp thật 2026-09-30).
case "$REPO" in
  "$HOME/Documents"*|"$HOME/Desktop"*|"$HOME/Downloads"*)
    echo "⚠️  Dự án đang nằm trong $(echo "$REPO" | sed "s|$HOME/||" | cut -d/ -f1) — macOS sẽ CHẶN đồng bộ nền."
    echo "   Chuyển dự án ra ngoài (vd: mv \"$REPO\" ~/dashboardycx) rồi chạy lại cài đặt ở chỗ mới,"
    echo "   hoặc cấp Full Disk Access cho /bin/bash (xem README mục 'Operation not permitted')."
    ;;
esac
chmod +x "$SCRIPT"
mkdir -p "$HOME/Library/LaunchAgents"
cat > "$PLIST" <<PL
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key><string>$NHAN</string>
    <key>ProgramArguments</key><array><string>/bin/bash</string><string>$SCRIPT</string><string>$REPO</string></array>
    <key>StartInterval</key><integer>$CHU_KY</integer>
    <key>RunAtLoad</key><true/>
    <key>StandardErrorPath</key><string>$HOME/Library/Logs/dashboard-dong-bo.log</string>
</dict>
</plist>
PL
launchctl unload "$PLIST" 2>/dev/null || true
launchctl load "$PLIST"
echo "✅ Đã cài. Máy sẽ tự kéo bản mới của nhánh main mỗi $((CHU_KY/60)) phút (và khi đăng nhập)."
echo "   Thư mục dự án: $REPO"
echo "   Nhật ký:       ~/Library/Logs/dashboard-dong-bo.log"
echo "   Gỡ cài:        bash scripts/dong-bo-may-tinh/go-cai-dat.sh"
