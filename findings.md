# Findings: Cơ chế Target Trả Góp & Target Quy Đổi

## 1. Nguồn dữ liệu Target
- File nguồn: `features/bi-dashboard/components/TargetHero.tsx`
- Tab: Cập nhật -> Cấu hình siêu thị chi tiết -> Tab "Target Doanh thu".
- Storage Keys trong IndexedDB:
  - `targethero-${safeName}-tragop`: Lưu giá trị Target Trả góp sau điều chỉnh (ví dụ trong ảnh: 60%). Giá trị gốc mặc định là 45%.
  - `targethero-${safeName}-quydoi`: Lưu giá trị Target Quy đổi sau điều chỉnh (ví dụ trong ảnh: 60%). Giá trị gốc mặc định là 40%.
  - Khi người dùng kéo slider hoặc nhập số %, `TargetHero` ghi trực tiếp vào key IndexedDB này và phát trigger update.

## 2. Dữ liệu cột tương ứng trên bảng Doanh thu (`RevenueTab.tsx` / `RevenueDesktopRow.tsx`)
- Cột **`HQQĐ`**:
  - Giá trị thực tế của nhân viên: `row.hieuQuaQD * 100` (dạng phần trăm, ví dụ 55%).
  - Target tương ứng: `Target Quy đổi` (ở tab Cập nhật).
- Cột **`%T.Góp`**:
  - Giá trị thực tế của nhân viên: `row.calculatedInstallment` (dạng phần trăm, ví dụ 58%).
  - Target tương ứng: `Target Trả góp` (ở tab Cập nhật).

## 3. Vấn đề hiện tại
- Trước đây, `RevenueDesktopRow` tính màu qua `colorSettings.hqqd` và `colorSettings.tragop` với ngưỡng cố định trong ColorSettings (good=35%/45%, average=30%/40%), hoàn toàn tách rời với Target thực tế mà Quản lý siêu thị thiết lập trong tab Cập nhật (ví dụ 60%).
- Do đó, khi Target tăng lên 60%, những người đạt 55% hoặc 58% lẽ ra là **kém hơn target** thì lại hiển thị màu vàng trung bình theo ngưỡng cũ, và các mức màu không phản ánh đúng mục tiêu kinh doanh của siêu thị.
