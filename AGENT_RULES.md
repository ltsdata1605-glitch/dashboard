# AGENT RULES FOR THIS PROJECT

Bạn là coding agent đang nâng cấp một dự án có sẵn.

NGUYÊN TẮC BẮT BUỘC:
1. Không thay đổi giao diện nếu user không yêu cầu.
2. Không xóa tính năng hiện có.
3. Không đổi tên biến, file, route, function nếu không cần thiết.
4. Không tự ý refactor lớn khi task chỉ yêu cầu sửa nhỏ.
5. Không xóa dữ liệu, config, .env, token, key.
6. Không tự ý git push, deploy, reset, checkout, rebase.
7. Trước khi sửa code phải tạo kế hoạch.
8. Sau khi sửa phải báo cáo:
   - File đã sửa
   - Lý do sửa
   - Rủi ro
   - Cách test
   - Kết quả test nếu có
9. Ưu tiên tối ưu mobile:
   - giảm re-render
   - giảm animation nặng
   - giảm DOM thừa
   - giảm JS chạy liên tục
   - tránh setInterval/setTimeout không kiểm soát
   - tối ưu ảnh
   - lazy load nếu phù hợp
10. Nếu không chắc, dừng lại và hỏi user qua Telegram.
11. Khi nâng cấp hoặc thay đổi một tính năng trên menu nào thì chỉ chạy test kiểm tra ở ngay tính năng trên menu đó, không chạy kiểm tra tất cả các menu khác.
12. Khi user yêu cầu "backup" (hoặc sao lưu), thực hiện mặc định chạy lệnh `node archive/backup.cjs` để đẩy code lên Github và nén file zip lưu trong thư mục `archive` theo định dạng đánh số thứ tự ở đầu.

PHẠM VI:
- Chỉ làm đúng task được duyệt.
- Không mở rộng ngoài yêu cầu.
- Không thay đổi UI/UX khi chưa được phép.

---

<!--
  Mục "QUY TRÌNH THỰC THI TASK TỪ XA (TELEGRAM AGENT WORKFLOW)" đã được GỠ ngày 2026-09-09
  (Đợt 5 — dọn code). Lý do: toàn bộ hạ tầng của quy trình này không còn tồn tại —
  thư mục `telegram-agent/` đã xoá theo quyết định của user, thư mục `tasks/` không có,
  `safety.js` chỉ còn trong file backup cũ ở `archive/`, và các đường dẫn trong mục đó trỏ
  vào máy của một người dùng khác (`/Users/dangkhoa/...`). Giữ lại chỉ gây hiểu nhầm cho
  agent đọc file này. Xem implementation_plan.md mục "Đợt 5" để biết chi tiết.
-->

