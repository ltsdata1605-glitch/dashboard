# Workspace Rules

## Backup Commands
Whenever the user requests a backup (e.g. "backup", "hãy backup", "sao lưu", etc.), you must automatically run the backup script located at `archive/backup.cjs` using node:
```bash
node archive/backup.cjs
```
This script will handle both pushing the changes to Github and creating a zipped backup under the `archive` directory with sequential numbering.


## Push & Live Deployment Commands
Mỗi khi người dùng yêu cầu push (ví dụ: "push", "hãy push", "push code", "commit và push", v.v.):
- Agent BẮT BUỘC tự động thực thi quy trình đồng bộ và deploy toàn diện:
  1. Commit và push code lên kho lưu trữ GitHub (`main`).
  2. Build và deploy web lên GitHub Pages để cập nhật LIVE trực tiếp trên domain **https://dashboard.pro.vn/** (`npx gh-pages -d dist`).
  3. Tự động chạy `npm run deploy:functions` để deploy ngay Firebase Functions live sau mỗi thay đổi.
- Sau khi hoàn thành, báo cáo rõ ràng các trạng thái:
  - "✅ Đã đẩy code thành công lên GitHub!"
  - "🌐 Đã cập nhật LIVE web tại https://dashboard.pro.vn/!"
  - "⚡ Đã deploy LIVE Firebase Functions thành công!"



## Auto-Review & Error Tracking
- Whenever the user requests an upgrade, modification, or new feature, the Agent MUST proactively use appropriate Skills (e.g., `quality-master`, `analyze-project`, `performance-optimizer`) to review the code, detect potential errors, and optimize the system.
- The Agent MUST ensure that robust error handling (try/catch, Error Boundaries, null-checks) is integrated into new or modified modules.
- For error tracking and monitoring, the Agent should utilize global logging mechanisms or suggest integration with tracking services (like Sentry/Firebase Crashlytics) if critical errors occur.

## Targeted Testing & Fast Execution Rule
- **Nguyên tắc Targeted Testing**: Khi người dùng yêu cầu sửa đổi, tối ưu hoặc thêm tính năng, Agent **BẮT BUỘC chỉ chạy test liên quan trực tiếp đến tính năng/file đó** (dùng `npx vitest related <file> --run` hoặc `npx vitest run <path/to/test.ts>`).
- **Tối ưu tốc độ (Fast Execution)**: Tuyệt đối KHÔNG tự động chạy full test suite (toàn bộ 30+ test suites) hay full build sau mỗi lần sửa nhỏ, trừ khi:
  1. Người dùng yêu cầu rõ ràng ("test all", "kiểm tra toàn bộ").
  2. Khi chuẩn bị deploy production (`npm run deploy`).
- **Chạy ngầm (Background Task)**: Với các lệnh test hoặc kiểm tra, Agent ưu tiên chạy ngầm hoặc kiểm tra tức thì (thời gian dưới 1 giây) để phản hồi người dùng nhanh nhất có thể.


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

## Auto Click+ Bookmarklet Synchronization Rule
Bất cứ khi nào có thay đổi, tối ưu hoặc sửa lỗi trong `public/scripts/mwg-auto-thu-thap-diem-thuong.user.js` liên quan đến tính năng Click+ (mở rộng cấp dữ liệu, selector spinner, batching, cơ chế copy trích xuất dữ liệu, loại trừ element thừa), **BẮT BUỘC** phải:
1. Cập nhật và đồng bộ ngay toàn bộ logic cải tiến đó sang hằng số `AUTO_CLICK_BOOKMARKLET_CODE` trong `features/bi-dashboard/components/AutoClickGuideModal.tsx`.
2. Đảm bảo nút "Auto Click+ 1-Click" trên giao diện (tại Cập nhật > Cấu hình siêu thị & Nhân viên > Dữ liệu) luôn đồng bộ 100% sức mạnh và thuật toán mới nhất của userscript.

## Image Export Standard (Nguyên Tắc Xuất Ảnh Đầy Đủ Cả Dọc & Ngang)
- **Bắt buộc xuất trọn vẹn cả chiều dọc và chiều ngang**: Khi xuất ảnh bất kỳ bảng hay thành phần giao diện nào (đặc biệt là các bảng dữ liệu có thanh cuộn ngang `overflow-x-auto` hoặc dọc `overflow-y-auto` như Chi Tiết Theo Kho, Thi Đua, Bảng Doanh Thu, Ngành Hàng...), **tuyệt đối KHÔNG sử dụng `captureAsDisplayed: true` nếu thành phần đó có cuộn ngang hoặc nhiều cột vượt quá khung nhìn màn hình**.
- **Fix độ rộng cột vừa với nội dung trước khi xuất**: Khi xuất ảnh dạng bảng, trước khi chụp **BẮT BUỘC** phải fix độ rộng của từng cột vừa khít với nội dung thực tế (`fitTablesToContent` / Column Content Fitting). Các cột tiêu đề và số liệu ôm sát nội dung, tuyệt đối không được ép `width: 100%` làm các cột bị kéo dãn toe toét thừa khoảng trắng mênh mông sang hai bên.
- **Cơ chế mở rộng toàn diện**: Phải đảm bảo bộ máy xuất ảnh tự động mở rộng toàn bộ bảng (`fitTablesToContent` / `fitAllColumns` / `fitWidthToTable`), loại bỏ giới hạn chiều rộng/thanh cuộn, gỡ `sticky` về `static`, và đo đạc bề rộng thực tế của mọi cột để ảnh chụp xuất ra đầy đủ 100% tất cả các hàng và tất cả các cột, không bao giờ bị cắt xén hay mất phần cuộn ngang/dọc. Khung card ảnh ôm vừa vặn theo tổng độ rộng các cột của bảng.
- **Chỉ dùng `captureAsDisplayed: true`** cho các thành phần cố định trên màn hình (như cụm thẻ KPI card đơn thuần, biểu đồ xu hướng không chứa bảng dữ liệu tràn viền).

## Silent Real-User Verification Rule (Quy Tắc Tự Động Test Âm Thầm Trên Dữ Liệu Thật)
- **Bắt buộc tự động test thực tế như người dùng thật**: Sau mỗi lần sửa đổi, tối ưu hoặc cập nhật tính năng (đặc biệt liên quan đến giao diện, thẻ KPI, bảng dữ liệu), Agent **BẮT BUỘC tự động chạy test xác thực thực tế** trên chính profile dữ liệu thật (`.e2e-chrome-profile`) hoặc kiểm tra DOM/computed style thực tế của trình duyệt.
- **Thực hiện hoàn toàn âm thầm (Silent & Headless)**: Toàn bộ quá trình test phải chạy ngầm ở chế độ headless (chạy `npm run test:verify-silent` hoặc Playwright headless), không mở cửa sổ gây phiền toái, không làm gián đoạn màn hình làm việc của người dùng.
- **Nguyên tắc "Không báo thành công khi chưa kiểm chứng"**: Tuyệt đối KHÔNG BAO GIỜ báo cáo hoàn tất nếu chưa chạy test xác thực thực tế và chứng minh mọi chỉ số (như `border-radius: 16px`, `overflow: hidden`, dữ liệu số, hiển thị cột) đều PASS 100% đúng yêu cầu.


