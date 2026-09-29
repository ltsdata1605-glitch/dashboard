#!/bin/bash
# Gỡ tự động đồng bộ (macOS).
PLIST="$HOME/Library/LaunchAgents/vn.dashboard.dong-bo.plist"
launchctl unload "$PLIST" 2>/dev/null || true
rm -f "$PLIST"
echo "✅ Đã gỡ tự động đồng bộ. (Nhật ký cũ vẫn ở ~/Library/Logs/dashboard-dong-bo.log)"
