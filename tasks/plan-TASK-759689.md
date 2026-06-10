# Kế hoạch cho TASK-759689: Kiểm tra toàn bộ dự án theo hướng tối ưu mobile. Tìm các đoạn code gây lag, nóng máy, hao pin: animation nặng, setInterval, render lặp, DOM quá nhiều, ảnh nặng, API gọi liên tục. Không sửa giao diện, không đổi chức năng. Trước tiên chỉ báo cáo danh sách vấn đề và đề xuất cách xử lý.

## Mục tiêu
Nâng cấp ứng dụng theo yêu cầu: "Kiểm tra toàn bộ dự án theo hướng tối ưu mobile. Tìm các đoạn code gây lag, nóng máy, hao pin: animation nặng, setInterval, render lặp, DOM quá nhiều, ảnh nặng, API gọi liên tục. Không sửa giao diện, không đổi chức năng. Trước tiên chỉ báo cáo danh sách vấn đề và đề xuất cách xử lý."

## Thay đổi đề xuất
- [ ] Phân tích các file liên quan trong project
- [ ] Sửa đổi mã nguồn an toàn theo chỉ dẫn của AGENT_RULES.md
- [ ] Thực hiện kiểm thử và chạy kiểm tra lint

## Kế hoạch xác thực
- [ ] Chạy lệnh kiểm tra biên dịch: npm run lint
