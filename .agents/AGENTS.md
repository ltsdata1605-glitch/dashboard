# Workspace Rules

## Backup Commands
Whenever the user requests a backup (e.g. "backup", "hãy backup", "sao lưu", etc.), you must automatically run the backup script located at `archive/backup.cjs` using node:
```bash
node archive/backup.cjs
```
This script will handle both pushing the changes to Github and creating a zipped backup under the `archive` directory with sequential numbering.


## Auto-Review & Error Tracking
- Whenever the user requests an upgrade, modification, or new feature, the Agent MUST proactively use appropriate Skills (e.g., `quality-master`, `analyze-project`, `performance-optimizer`) to review the code, detect potential errors, and optimize the system.
- The Agent MUST ensure that robust error handling (try/catch, Error Boundaries, null-checks) is integrated into new or modified modules.
- For error tracking and monitoring, the Agent should utilize global logging mechanisms or suggest integration with tracking services (like Sentry/Firebase Crashlytics) if critical errors occur.


## Communication Style & Reporting
- Luôn mô tả và trình bày rõ ràng các hành động sẽ làm (Kế hoạch thực thi) trước khi bắt tay vào code hoặc sửa lỗi.
- Giải thích rõ ràng mục đích của từng hành động (làm việc đó để đạt được kết quả gì, ảnh hưởng thế nào đến hệ thống) sau mỗi yêu cầu của người dùng.
- Cuối mỗi phản hồi, luôn luôn đính kèm thời gian ngày và giờ thực tế tại thời điểm phản hồi theo định dạng: `[🕒 YYYY-MM-DD HH:mm:ss]`.

## Vibecoding Operation Standards
Để đảm bảo chất lượng, hiệu năng và dễ bảo trì, mọi hành động sửa đổi hay nâng cấp đều BẮT BUỘC tuân thủ:
1. **Planning (Trước khi code)**: Bắt buộc kích hoạt `planning-with-files` và thiết kế luồng xử lý trước khi thực sự viết/sửa file nguồn. Đối với code mới, tham khảo thêm `architecture`.
2. **Coding (Trong khi code)**: Phải duy trì tiêu chuẩn của `clean-code` (viết hàm nhỏ, tên biến rõ ràng) và tuân thủ chặt chẽ `react-best-practices`. Bất kỳ thay đổi liên quan đến Database đều phải tuân thủ chuẩn `firebase` (denormalization, optimizing queries).
3. **Debugging (Xử lý lỗi)**: Tuyệt đối không được "đoán mò" và sửa mù quáng (guess & check). BẮT BUỘC sử dụng `systematic-debugging` để truy vết root cause dựa trên stack trace, log, và giả thuyết.
4. **Execution (Thực thi & Commit)**: Áp dụng `executing-plans` cho các quy trình dài hạn, và sử dụng `git-pushing` để tạo commit nhỏ, gọn gàng, chia nhánh khoa học.
5. **Architecture (Kiến trúc & Chuẩn hoá)**: BẮT BUỘC tuân thủ mô hình Feature-Sliced Design.
   - Mọi tính năng/module mới phải được gói gọn trong thư mục `features/<feature-name>/`.
   - Code phải được chia nhỏ (Component/Hook không vượt quá 300 dòng).
   - Các module phải giao tiếp qua `index.ts` (Public API) để tránh imports lộn xộn.
   - Khai báo kiểu dữ liệu (TypeScript) chặt chẽ, không dùng `any` bừa bãi.

## Tampermonkey UserScript Versioning Rule
Mỗi khi chỉnh sửa hoặc nâng cấp file user script `public/scripts/mwg-auto-thu-thap-diem-thuong.user.js` (hoặc bất kỳ script Tampermonkey nào khác), **BẮT BUỘC** phải:
1. Tăng chỉ số `@version` trong phần header metadata (ví dụ: từ `1.9` $\rightarrow$ `2.0` hoặc `1.9.1`).
2. Thêm thông tin ghi chú về các thay đổi của bản mới vào phần comment header (Changelog).
Điều này giúp Tampermonkey trên trình duyệt của người dùng phát hiện bản mới thông qua `@updateURL`/`@downloadURL` và tự động cập nhật mượt mà.
