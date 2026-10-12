# Findings: Check Thưởng Native React Migration

## 1. Dữ liệu gốc & Lưu trữ
- **Store name trong IndexedDB/Firestore**: `checkthuong_data`
- **Cấu trúc lưu trữ**:
  ```ts
  interface CheckThuongStoragePayload {
    schemaVersion: 1;
    source: 'check-thuong';
    competitionData: any[][]; // Mảng 2 chiều chứa các dòng dữ liệu sau dòng tiêu đề
    fileName?: string;
    uploadTime?: string;
    code1?: string;
    code2?: string;
    lastModified?: number;
  }
  ```
- **Cột dữ liệu chuẩn (CHECK_THUONG_COLS)**:
  - `KENH`: Cột 3 (index 3) - Kênh (Vùng/Kênh)
  - `SIEU_THI`: Cột 4 (index 4) - Tên/mã siêu thị (vd: "910 - Vĩnh Phúc")
  - `NGANH_HANG`: Cột 5 (index 5) - Tên môn thi / ngành hàng thi đua
  - `PERCENT_DU_KIEN`: Cột 6 (index 6) - % Dự kiến hoàn thành (số thập phân hoặc chuỗi %)
  - `DU_KIEN_VUOT`: Cột 7 (index 7) - Dự kiến DT / SL vượt
  - `LAY_TOP_10`: Cột 8 (index 8) - Tiêu chí lấy top (vd: "10")
  - `HANG_VUOT_UU`: Cột 9 (index 9) - Hạng vượt ưu
  - `HANG_PERCENT_TARGET`: Cột 10 (index 10) - Hạng % target
  - `THUONG_VUOT_UU`: Cột 11 (index 11) - Tiền thưởng vượt ưu
  - `THUONG_TOP_PERCENT`: Cột 12 (index 12) - Tiền thưởng top %
  - `TONG_THUONG`: Cột 13 (index 13) - Tổng tiền thưởng

## 2. Tiền xử lý dữ liệu (preProcessData)
- **noFundGroups**: Tập hợp các nhóm `${kenh}|${nganhHang}` không có bất kỳ siêu thị nào có thưởng (`bonus = 0` trên toàn bộ file).
- **bestAwardedByGroup** & **bestAwardedByName**: Lưu dòng đạt giải thấp nhất (hạng cao nhất) có thưởng của từng nhóm để tính "Thưởng dự kiến" (potential bonus) cho các môn chưa có giải:
  - `getPotentialBonus(row)`: Lấy mức thưởng của môn đạt giải trong nhóm để tính thưởng giả định khi lọt vào top.

## 3. Phân loại 6 nhóm thi đua (Group Definitions)
1. **Đạt thưởng (`achieved`)**: `parseNumber(row[TONG_THUONG]) > 0`
2. **Sắp có (`nearly`)**: Không thuộc `noFundGroups`, chưa có thưởng (`TONG_THUONG == 0`), và có thứ hạng (`HANG_VUOT_UU` hoặc `HANG_PERCENT_TARGET`) nằm trong khoảng `cutoffRank < rank <= cutoffRank + 20`.
3. **Đạt ≥ 100% (`achieved100`)**: `parseNumber(row[PERCENT_DU_KIEN]) >= 1.0`
4. **Chưa Đạt < 100% (`notAchieved100`)**: `parseNumber(row[PERCENT_DU_KIEN]) < 1.0`
5. **Không quỹ (`noFund`)**: Thuộc `noFundGroups` (toàn hệ thống môn này không có tiền thưởng).
6. **No sale (`noSale`)**: Không thuộc `noFundGroups` và `parseNumber(row[PERCENT_DU_KIEN]) == 0`.

## 4. Tra cứu & So sánh 2 kho
- **Store matcher (`createStoreMatcher`)**: 4 bước tìm kiếm:
  1. Khớp chính xác chuỗi.
  2. Khớp chuỗi số đầu tiên (vd: `910` trong `910 - Vĩnh Phúc`).
  3. Khớp từ riêng biệt qua Regex.
  4. Fallback `includes()` không phân biệt hoa thường.
- **So sánh 2 kho**:
  - Ghép tất cả các ngành hàng xuất hiện ở Kho 1 và Kho 2.
  - So sánh: %DK, Hạng vượt ưu, Tổng thưởng, Chênh lệch thưởng (+/-).
  - Thẻ tóm tắt so sánh (Winner Crown Icon), Top 3 thế mạnh của từng kho.

## 5. Bảng xếp hạng chi tiết ngành hàng (Ranking Modal)
- Khi bấm vào bất kỳ dòng/thẻ ngành hàng nào:
  - Lọc tất cả siêu thị trong cùng ngành hàng (và cùng kênh).
  - Sắp xếp ưu tiên: Thứ hạng siêu thị đang xem (Hạng tốt hơn giữa V.Trội và % Target).
  - Cho phép sort theo từng cột (%DK, DT/SL vượt, Hạng VT, Hạng %HT, Thưởng).
  - Highlight nổi bật dòng của siêu thị đang tra cứu.

## 6. Xuất ảnh báo cáo
- Xuất ảnh tổng hợp (Hero Banner).
- Xuất ảnh từng nhóm trạng thái (`achieved`, `nearly`...).
- Xuất ảnh so sánh 2 siêu thị.
- Xuất ảnh bảng xếp hạng môn thi.
- Tuân thủ quy tắc Image Export Standard của dự án: Full width, không cắt ngang/dọc, mở rộng toàn bộ bảng.
