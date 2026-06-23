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

PHẠM VI:
- Chỉ làm đúng task được duyệt.
- Không mở rộng ngoài yêu cầu.
- Không thay đổi UI/UX khi chưa được phép.

---

# QUY TRÌNH THỰC THI TASK TỪ XA (TELEGRAM AGENT WORKFLOW)

Khi nhận lệnh và làm việc trong project này, Agent bắt buộc tuân thủ:
1. **Kiểm tra Approved Tasks**: Đọc file [approved.md](file:///Users/dangkhoa/Downloads/Vide%20Coding/dashboardycx/tasks/approved.md) và hàng đợi [tasks.json](file:///Users/dangkhoa/Downloads/Vide%20Coding/dashboardycx/telegram-agent/queue/tasks.json) để xác định xem Task ID nào đang ở trạng thái `approved` cần được thực thi.
2. **Đọc Kế hoạch (Plan)**: Đọc file kế hoạch tương ứng tại `tasks/plan-[TASK-ID].md` trước khi tiến hành sửa đổi bất kỳ code nào.
3. **Tuân thủ Tuyệt đối Safety Guard**: Không viết các lệnh, code hoặc cấu hình vi phạm bộ lọc bảo mật trong `safety.js` (không thay đổi .env, không xóa db/file dữ liệu, không tự ý push/deploy).
4. **Báo cáo Thực thi**: Sau khi hoàn thành, ghi báo cáo kết quả chi tiết (bao gồm cả walkthrough/diff) vào file [reports.md](file:///Users/dangkhoa/Downloads/Vide%20Coding/dashboardycx/tasks/reports.md) để bot có thể tự động gửi phản hồi kết quả về điện thoại cho User.
