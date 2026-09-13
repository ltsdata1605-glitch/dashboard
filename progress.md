# Progress: Dynamic Target Comparison for %T.Góp & HQQĐ

## Session Log
- 2026-09-12 16:30: Phân tích yêu cầu liên kết `Target Trả góp` và `Target Quy đổi` với 2 cột `%T.Góp` và `HQQĐ`.
- Đã xác định chính xác key IndexedDB và cách tính của `TargetHero.tsx`.
- Đã lấy ý kiến người dùng và chốt quy tắc phân tầng:
  - $\ge 100\%$ Target: Xanh lá đậm (`#059669`)
  - $85\% - < 100\%$ Target: Cam đậm (`#ea580c`)
  - $< 85\%$ Target: Đỏ đậm (`#dc2626`)
- Đã triển khai `getMetricColorByTarget` và liên kết trực tiếp Target động vào `RevenueTab.tsx` và `RevenueDesktopRow.tsx`.
- Toàn bộ test unit (353 tests) và typecheck đều passed 100%.
