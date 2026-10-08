# Audit 2026-10-07 — bộ tài liệu gốc + kế hoạch sửa

Đưa vào repo 2026-10-08, **sau khi** mọi bản vá đã lên production (Cloud Functions + Firestore Rules deploy
2026-10-08, web app dashboard.pro.vn). Repo công khai nên trước đó bộ này chỉ nằm ngoài repo.

- `BAO_CAO_AUDIT.md`, `PLAN_CHO_CLAUDE.md`, `phu-luc/`, `evidence/` — bản audit độc lập chủ dự án gửi (nguyên trạng).
  Script trong `evidence/` khẳng định LỖI CÒN TỒN TẠI nên chạy trên code hiện tại sẽ "đỏ" — đó là đúng.
- `KE_HOACH_SUA_THEO_AUDIT.md` — kế hoạch 7 giai đoạn (GĐ0–GĐ6) chủ dự án duyệt từng bước.
- Kết quả từng giai đoạn (đo trước/sau, test, commit): `implementation_plan.md` các mục "Audit 2026-10-07 — Giai đoạn …"
  và "Audit D11…".

Còn mở (xem implementation_plan.md): bot LINE chưa cấu hình admin thì ai cũng DUYỆT được (cần chủ dự án cấu hình),
manager cùng Kho đọc được token bot dùng chung, thẻ LIFF cũ còn hiệu lực tới 2026-11-15, chạy offline (service worker).
