# Findings & Data Structure Analysis: Industry KPI Cards

## 1. Dữ liệu ngành hàng trong BI Dashboard
- Nguồn dữ liệu ngành hàng có 2 chế độ:
  - `isRealtime`: `realtimeData` (chứa `tree: IndustryTreeNode[]`, `headers: string[]`, `rows: string[][]`)
  - `!isRealtime` (Lũy kế): `luykeData` (chứa `tree: IndustryTreeNode[]`, `table: { headers: string[], rows: string[][] }`)
- Mỗi node trong `tree` có dạng:
  ```ts
  export interface IndustryTreeNode {
      name: string; // e.g. "13 - Điện thoại" hoặc "1491 - Smartphone"
      values: string[]; // Các cột dữ liệu ứng với headers
      children: IndustryTreeNode[];
      level: number; // 0=Ngành hàng (NNH), 1=Nhóm hàng, 2=Hãng
  }
  ```

## 2. Danh sách 12 thẻ mặc định và phân cấp:
1. `Smartphone`: Nhóm hàng (level 1), con của "Viễn thông di động" / "Điện thoại"
2. `Laptop`: Ngành hàng (level 0) hoặc nhóm hàng
3. `Iphone`: Nhóm hàng (level 1), con của "Apple"
4. `Đồng hồ thời trang`: Nhóm hàng (level 1), con của "Phụ kiện - Đồng hồ"
5. `Sim data`: Nhóm hàng (level 1)
6. `Pin sạc dự phòng`: Nhóm hàng (level 1)
7. `Camera`: Nhóm hàng (level 1)
8. `Tai nghe`: Nhóm hàng (level 1)
9. `Tủ lạnh, đông, mát`: Ngành hàng (level 0)
10. `Tivi`: Nhóm hàng (level 1), con của "Điện tử"
11. `Máy giặt, sấy`: Ngành hàng (level 0)
12. `Máy lạnh & máy nước nóng`: Ngành hàng (level 0)

## 3. Cách so khớp tên thông minh
- Dùng `formatIndustryDisplayName`: bỏ tiền tố số `"1491 - Smartphone"` -> `"Smartphone"`.
- Chuẩn hóa chuỗi (bỏ dấu tiếng Việt, viết thường, bỏ khoảng trắng thừa) để so khớp chính xác:
  - `"iPhone"` <-> `"Iphone"` <-> `"iphone"`
  - `"Máy lạnh & Máy nước nóng"` <-> `"Máy lạnh & máy nước nóng"`
  - `"Đồng hồ thời trang"` <-> `"dong ho thoi trang"`
