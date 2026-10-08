# Cách sử dụng gói audit

Gửi Claude **ZIP mã nguồn gốc** cùng gói `GOI_AUDIT_CLAUDE.zip`. Gói audit này chỉ chứa báo cáo, kế hoạch và bằng chứng kiểm tra; không chứa bản mã ứng dụng đã sửa.

Thứ tự đọc:

1. `BAO_CAO_AUDIT.md`: kết luận và mức độ xác minh.
2. `PLAN_CHO_CLAUDE.md`: prompt mở đầu, 23 task T00–T22, phụ thuộc và tiêu chí hoàn thành.
3. `phu-luc/`: vị trí source, điều kiện và chi tiết từng nhóm.
4. `evidence/`: kết quả chạy offline, inventory và giới hạn môi trường.

Finding ID trong bảng tổng là S01–S14/D01–D18. Phụ lục backend dùng B01–B14, feature dùng F01–F12, design DS-01–DS-09, auth AUTH/RULE/MSG; phụ lục dữ liệu dùng DATA01–DATA10 với mapping ngay đầu. Task ID T00–T22 chỉ dùng cho kế hoạch triển khai.

Phiên audit không thay source ứng dụng, không push/deploy, không tạo/sửa user thật và không gọi API/dữ liệu production. Code deploy có thể khác ZIP; luôn đối chiếu commit/config thật trước sửa.

## Chạy bằng chứng offline

Các script đã chạy bằng Node 24.19.0 và không cần npm dependency. Chúng dùng `node:module.stripTypeScriptTypes` và adapter giả; không thay thế Firebase Emulator, test integration hoặc browser thật.

Trong shell, đặt `PROJECT_DIR` tới thư mục source hiện tại, rồi chạy các script:

```bash
export PROJECT_DIR=/duong-dan/dashboard-main
node evidence/auth-offline-proof.cjs
node evidence/audit-backend-repro.cjs
node evidence/audit-gemini-repro.cjs
node evidence/check-thuong-message-proof.cjs
node evidence/data-repro.mjs
node evidence/audit-feature-proofs.cjs
node evidence/tax-offline-repro.mjs
```

Tất cả danh tính, media, coupon và dataset trong mocks là fixture. Một số script **chủ động xác nhận lỗi hiện tại được tái hiện**, nên exit 0 không có nghĩa ứng dụng an toàn. Sau sửa phải thay expectation thành behavior hợp lệ và bổ sung tests theo framework repo.

`parse-typescript.mjs` chỉ parse `.ts`, không typecheck, không JSX, không thực thi modules. `verification-environment.txt` ghi lý do npm/build/full test bị chặn trong môi trường audit; không kết luận dự án không build được.

Kết quả `source-inventory.json` ghi tên/kích thước file trong ZIP và archive SHA256 để xác định bản đã audit. Không có `.env` thật hay token production trong gói.

## Nhắc Claude khi giao việc

“Làm T01/T02 trước; không bắt đầu bằng redesign hoặc refactor toàn app. Mỗi task phải có test hành vi tái hiện và báo kết quả thật. Các finding chỉ xác minh tĩnh cần runtime/emulator để kiểm lại. Tôn trọng module isolation, đúng database/rules và policy dữ liệu. Chuẩn bị bản sửa/migration/rollout cụ thể để review trước production.”
