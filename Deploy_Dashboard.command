#!/bin/bash
cd "$(dirname "$0")"

echo "=================================================="
echo "  ĐANG TIẾN HÀNH ĐỒNG BỘ VÀ DEPLOY LÊN GITHUB"
echo "=================================================="
echo ""

npm run deploy

echo ""
echo "=================================================="
echo "  HOÀN TẤT DEPLOY! Cửa sổ sẽ tự động đóng sau 5 giây..."
echo "=================================================="
sleep 5
