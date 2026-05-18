---
description: Sync source code to Github and deploy to Github Pages
---

Người dùng yêu cầu mỗi khi muốn "đẩy lên github" (push code, deploy project), cần thực hiện chuỗi hành động đồng bộ hóa toàn diện để đảm bảo website đang chạy (`gh-pages`) và source code (`main`) đều giống hệt 100% với code trên máy tính cá nhân.

1. Đồng bộ source code lên Github: Thêm file thay đổi, tạo commit với message mô tả, và push lên nhánh gốc (main).
```sh
git add -A
git commit -m "chore: sync source code and deploy latest web changes"
git push origin main
```

2. Tiến hành build và deploy dự án để cập nhật website:
```sh
npm run deploy
```

3. Gửi thông báo đến người dùng với nội dung xác nhận: 
"Đã hoàn tất đồng bộ! Cả website đang chạy trên web và source code gốc được lưu trữ trên GitHub của bạn đều đã đồng điệu với code trên máy tính cá nhân 100%."
