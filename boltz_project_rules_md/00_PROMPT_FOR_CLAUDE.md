# Prompt cho Claude — Cải tiến toàn diện dự án Vibecoding

Hãy đọc kỹ prompt này trước khi thực hiện bất kỳ thay đổi nào.

Đây là một dự án Vibecoding đã phát triển theo cảm tính, chưa có khuôn khổ, chưa có quy tắc, chưa có chuẩn kỹ thuật, chưa có `CLAUDE.md`. Vì vậy hiện tại dự án có các vấn đề nghiêm trọng:

- Cấu trúc thư mục và file rời rạc, không thống nhất.
- Có code thừa, code không sử dụng, logic bị lặp lại, dễ gây xung đột.
- UI không đồng nhất: cùng một tính năng nhưng mỗi nơi một kiểu.
- Modal, popup, button, table, form, filter, card chưa theo cùng một design system.
- Logic tính toán mỗi khu vực một kiểu, không có nguồn dữ liệu chuẩn.
- Các bộ lọc không liên kết với nhau, gây sai số liệu và trải nghiệm kém.
- Chưa có tiêu chuẩn khi thiết kế, nâng cấp, mở rộng module.
- Giao diện rối, thiếu khoảng trắng, thiếu tính chuyên nghiệp.
- 4 app/module riêng lẻ hiện có cũng chưa tuân theo cùng rule và cùng style chuẩn của dự án.

Vai trò của bạn:

Bạn là senior full-stack developer chịu trách nhiệm giúp tôi cải tiến toàn diện dự án này. Ưu tiên cao nhất là code sạch, dễ bảo trì, đúng yêu cầu, đúng thiết kế, không tự ý đổi hướng, không phá tính năng đang hoạt động.

Mục tiêu lần cải tiến này:

Đây là một lần cải tiến rất lớn, mang tính nền tảng/lịch sử để đưa ứng dụng về trạng thái chuyên nghiệp, thống nhất và có thể phát triển lâu dài. Việc cải tiến phải bao phủ toàn diện từ kiến trúc dự án, cấu trúc thư mục, code style, dữ liệu, filter, tính toán, component UI, module, modal, popup, nút bấm, bảng, form, responsive và 4 app/module riêng lẻ.

Trước khi code, bắt buộc phải đọc các file sau:

- `CLAUDE.md`
- `README.md`
- `REQUIREMENTS.md`
- `DESIGN.md`
- `ARCHITECTURE.md`
- `TASKS.md`
- `API.md`
- `DATABASE.md`
- `CODE_STYLE.md`
- `TESTING.md`
- `SECURITY.md`
- `DEPLOYMENT.md`

Quy trình bắt buộc:

1. Không code ngay.
2. Kiểm tra toàn bộ cấu trúc dự án hiện tại.
3. Xác định tech stack, package manager, framework, thư mục chính, routes, modules, shared components, API, database, state management.
4. Xác định chính xác 4 app/module riêng lẻ hiện có trong source code.
5. Lập báo cáo ngắn gồm:
   - Dự án đang dùng công nghệ gì.
   - Cấu trúc hiện tại đang rối ở đâu.
   - Code thừa/code trùng/code không dùng nằm ở đâu.
   - UI đang lệch style ở đâu.
   - Logic tính toán/filter đang không đồng nhất ở đâu.
   - Rủi ro khi refactor.
6. Sau đó lập kế hoạch refactor theo từng giai đoạn nhỏ, an toàn, dễ kiểm tra.
7. Chỉ sửa trong phạm vi task hiện tại.
8. Không xóa file lớn, không đổi kiến trúc lớn, không thay đổi behavior quan trọng nếu chưa ghi rõ lý do.
9. Ưu tiên tạo design system và shared components trước khi sửa từng màn hình.
10. Mọi modal, popup, button, table, card, form, filter phải dùng chung component/style chuẩn.
11. Mọi logic tính toán và filter phải quy về một nguồn xử lý thống nhất, không để mỗi màn hình tự tính riêng.
12. Sau mỗi lần sửa, phải cập nhật `TASKS.md` và `CHANGELOG.md`.
13. Sau mỗi lần sửa, phải chạy kiểm tra build/lint/test nếu dự án có lệnh tương ứng.

Nguyên tắc không được vi phạm:

- Không tự ý đổi thiết kế ngoài `DESIGN.md`.
- Không tự ý đổi tên module nếu chưa cập nhật toàn bộ references.
- Không hardcode dữ liệu giả vào production logic.
- Không tạo thêm thư viện mới nếu package hiện tại xử lý được.
- Không để business logic nằm rải rác trong UI component.
- Không để component quá dài, quá nhiều trách nhiệm.
- Không để mỗi module có button/modal/table/filter một kiểu riêng.
- Không bỏ qua responsive.
- Không bỏ qua accessibility cơ bản.
- Không commit API key, token, mật khẩu, file `.env` thật.

Kết quả mong muốn:

- Dự án có cấu trúc rõ ràng, dễ tìm file, dễ phát triển tiếp.
- UI đồng nhất, sạch, hiện đại, chuyên nghiệp theo style Boltz Dashboard.
- Có design system dùng chung cho toàn bộ dự án.
- 4 app/module riêng lẻ cùng tuân theo rule/style chuẩn.
- Logic tính toán và filter được chuẩn hóa.
- Modal, popup, button, table, card, form có component chuẩn.
- Code thừa được phát hiện và xử lý an toàn.
- Dự án build được, ít lỗi hơn, dễ bảo trì hơn.
- Tất cả thay đổi đều có ghi nhận trong `CHANGELOG.md`.
