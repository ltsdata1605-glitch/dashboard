# 📦 PROMPT HOÀN CHỈNH: CÔNG CỤ KIỂM KÊ KHO HÀNG

**Phiên bản**: 1.0  
**Ngày tạo**: 2026-07-29  
**Trạng thái**: Sẵn sàng triển khai  

---

## 🎯 TỔNG QUAN FEATURE

Công cụ kiểm kê kho hàng dành cho menu "Kho hàng" trong Dashboard YCX. Cho phép nhân viên kho nhập file tồn kho Excel, xem dữ liệu được lọc, tìm kiếm sản phẩm, và quét QR code để kiểm kê thực tế so với tồn kho.

**Mục tiêu chính:**
- ✅ Nhập file Excel tồn kho nhanh chóng
- ✅ Lọc dữ liệu theo múi cạnh (siêu thị, ngành hàng, nhóm hàng, v.v.)
- ✅ Tìm kiếm sản phẩm theo tên hoặc IMEI
- ✅ Quét QR code để kiểm kê và cập nhật số lượng thực tế
- ✅ Xóa dữ liệu đã nhập khi cần tải lại
- ✅ Liên kết tới report tồn kho (https://report.mwgroup.vn/home/dashboard/6)

---

## 📋 CẤU TRÚC DỮ LIỆU

### File Excel Tồn Kho (Imports)

File input có 19 cột, **chỉ cần 17 cột sau** (bỏ `Mã hình thức nhập` và `Giá chuẩn`):

| # | Cột (Column Name) | Kiểu | Bắt buộc | Ghi chú |
|----|---|---|---|---|
| 1 | `Mã siêu thị` | số | ✅ | Định danh siêu thị |
| 2 | `Tên siêu thị` | text | ✅ | Tên đầy đủ siêu thị |
| 3 | `Thương hiệu công ty` | text | ✅ | VD: "dienmayxanh" |
| 4 | `Ngành hàng` | text | ✅ | VD: "484 - Điện gia dụng" |
| 5 | `Nhóm hàng` | text | ✅ | VD: "4146 - Bếp gas đôi" |
| 6 | `Mã sản phẩm` | text | ✅ | SKU / Mã barcode |
| 7 | `Tên sản phẩm` | text | ✅ | Tên đầy đủ sản phẩm |
| 8 | `Tên hình thức nhập` | text | ⚠️ | Cho phép null/trống |
| 9 | `Ngày nhập` | datetime | ⚠️ | ISO format, cho phép null |
| 10 | `Số hóa đơn` | text | ⚠️ | Có thể trống |
| 11 | `Ngày hóa đơn` | datetime | ⚠️ | ISO format, cho phép null |
| 12 | `Nhà cung cấp` | text | ⚠️ | Có thể trống |
| 13 | `IMEI_1` | text | ✅ | **Quan trọng**: Dùng quét QR code |
| 14 | `Trạng thái sản phẩm` | text | ⚠️ | VD: "1-Mới", "2-Đã sử dụng" |
| 15 | `Số lượng` | số | ✅ | Số lượng tồn kho |
| 16 | `Giá vốn` | số | ⚠️ | Cho phép null |
| 17 | `Giá nhập (Chưa VAT)` | số | ⚠️ | Cho phép null |

**Tổng dữ liệu mẫu:** 8,114 hàng

### Dữ liệu Kiểm Kê (Checking State)

Khi người dùng quét QR code, mỗi sản phẩm sẽ có thêm trạng thái kiểm kê:

```typescript
interface CheckingItem {
  // Từ file Excel
  id: string; // Ghép từ Mã siêu thị + Mã sản phẩm + IMEI_1
  maKho: number;
  tenKho: string;
  maSanPham: string;
  tenSanPham: string;
  imei: string;
  soLuongTonKho: number; // Từ file Excel
  
  // Dữ liệu kiểm kê (update khi quét QR)
  soLuongKiemKe: number; // Số lượng quét được
  chieuThayCo: number; // soLuongKiemKe - soLuongTonKho (âm = thiếu, dương = thừa)
  trangThaiKiem: 'chua_kiem' | 'da_kiem' | 'hoan_thanh'; // Trạng thái kiểm kê
  ghiChu?: string;
}
```

---

## 🎨 GIAO DIỆN & LAYOUT

### 1. **Phần Công Cụ** (Toolbar)

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 📁 Nhập File  |  🗑️ Xóa Dữ Liệu  |  🔗 Mở Report  |  📊 Thống Kê       │
│ (Chọn .xlsx)  |  (Xác nhận)      |  (Tab mới)     |  (Tối tân)         │
└─────────────────────────────────────────────────────────────────────────┘
```

**Chi tiết:**
- **📁 Nhập File**: Input file upload. Khi chọn file, tự động parse Excel và hiển thị thông tin ("Đang load...", sau đó "Đã tải 8,114 sản phẩm").
- **🗑️ Xóa Dữ Liệu**: Nút xóa, khi click hiển thị dialog xác nhận ("Bạn có chắc xóa toàn bộ dữ liệu đã nhập?"). Xóa → Clear state.
- **🔗 Mở Report**: Link button tới https://report.mwgroup.vn/home/dashboard/6 (target="_blank").
- **📊 Thống Kê**: Hiển thị card nhỏ gồm: "Tổng SKU", "Tổng số lượng", "Đã kiểm kê", "Chênh lệch".

### 2. **Phần Bộ Lọc** (Filter Panel - Tương ứng các cột tô đỏ)

```
┌──────────────────────────────────────────────────────────────────────────┐
│ 🔍 Tìm kiếm:  [Nhập tên SP / IMEI... ]    ❌ (Clear)                   │
├──────────────────────────────────────────────────────────────────────────┤
│ 🏪 Siêu Thị      │ 📦 Ngành Hàng  │ 📂 Nhóm Hàng  │ 🏭 Nhà Cung Cấp    │
│ [Chọn...]       │ [Chọn...]      │ [Chọn...]     │ [Chọn...]          │
├──────────────────────────────────────────────────────────────────────────┤
│ 📊 Trạng Thái SP │ 🔄 Trạng Thái Kiểm  │ 💰 Mức Giá   │ ⏰ Ngày Nhập      │
│ [Chọn...]       │ [Chọn...]           │ [Min-Max]    │ [Từ-Đến]          │
└──────────────────────────────────────────────────────────────────────────┘
```

**Chi tiết bộ lọc:**

1. **🔍 Tìm kiếm toàn cầu** (Real-time search):
   - Tìm theo: Tên sản phẩm, Mã sản phẩm, IMEI
   - Tìm kiếm fuzzy (không cần gõ đầy đủ, VD: "bếp" match "Bếp gas đôi")
   - Loại bỏ khoảng trắng/cách chữ

2. **🏪 Siêu Thị** (Multi-select dropdown):
   - Lấy unique từ cột `Tên siêu thị`
   - Mặc định chọn tất cả
   - Nếu chọn 1 siêu thị → các filter khác (Ngành/Nhóm) update động

3. **📦 Ngành Hàng** (Multi-select dropdown):
   - Lấy unique từ cột `Ngành hàng`
   - Phụ thuộc vào siêu thị đã chọn
   - Format: "484 - Điện gia dụng"

4. **📂 Nhóm Hàng** (Multi-select dropdown):
   - Lấy unique từ cột `Nhóm hàng`
   - Phụ thuộc vào Ngành hàng đã chọn
   - Format: "4146 - Bếp gas đôi"

5. **🏭 Nhà Cung Cấp** (Multi-select dropdown):
   - Lấy unique từ cột `Nhà cung cấp`
   - Hiển thị cả null/trống

6. **📊 Trạng Thái SP** (Multi-select):
   - Các giá trị từ `Trạng thái sản phẩm`: "1-Mới", "2-Đã sử dụng", ...
   - Cho phép lựa chọn multiple

7. **🔄 Trạng Thái Kiểm** (Single/Multi-select):
   - `chua_kiem` (Chưa kiểm kê)
   - `da_kiem` (Đã kiểm kê)
   - `hoan_thanh` (Hoàn thành - chênh lệch = 0)

8. **💰 Mức Giá** (Range slider):
   - Min-Max từ cột `Giá vốn`
   - Hiển thị thành "0 VNĐ - 10,000,000 VNĐ"

9. **⏰ Ngày Nhập** (Date range picker):
   - From / To từ cột `Ngày nhập`
   - Format: DD/MM/YYYY hoặc date picker

**Lưu ý**:
- Tất cả filter là AND logic (chọn siêu thị A + Ngành B = chỉ A+B)
- Nếu nhập text tìm kiếm + chọn filter → apply cả 2
- Nút **❌ Clear Filter** để reset tất cả bộ lọc

---

### 3. **Phần Dữ Liệu** (Data Table)

```
┌──────────┬──────────┬─────────────────┬────────┬──────┬──────┬─────────┐
│ Mã SKU   │ Tên SP   │ IMEI            │ Tồn KK │ Kiểm │ Chênh│ Ghi Chú │
├──────────┼──────────┼─────────────────┼────────┼──────┼──────┼─────────┤
│ 484414.. │ Bếp gas..│ 51134F31MF95... │ 1      │ 0    │ -1   │         │
│ ...      │ ...      │ ...             │ ...    │ ...  │ ...  │ ...     │
└──────────┴──────────┴─────────────────┴────────┴──────┴──────┴─────────┘
Nhập: Tìm thêm SỐ LƯỢNG KIỂM = 1 (bấm Enter hoặc nút ➕) | Xóa dòng (🗑️)
```

**Cột bảng:**
1. **Mã SKU** (sticky): 13 ký tự đầu từ `Mã sản phẩm`
2. **Tên SP**: Rút gọn 50 ký tự + "..." nếu quá dài (hover → tooltip full text)
3. **IMEI**: 15-20 ký tự, copy-to-clipboard icon
4. **Tồn KK** (Tồn Kho): Số từ file Excel, text-align: right, màu `slate-600`
5. **Kiểm** (Kiểm Kê): Số lượng quét được, text-align: right, màu `sky-600` (editable or input)
6. **Chênh** (Chênh Lệch): Kiểm - Tồn, text-align: right, màu dynamic:
   - Xanh (emerald) nếu = 0
   - Đỏ (rose) nếu < 0 (thiếu)
   - Vàng (amber) nếu > 0 (thừa)
7. **Ghi Chú**: Text input nhỏ cho note người dùng (ví dụ: "Hư hỏng", "Chưa ghi nhãn")

**Tương tác:**
- **Quét QR code**: Khi user quét IMEI qua QR code reader (hoặc input thủ công), tự động:
  - Tìm row có IMEI match
  - Increment cột **Kiểm** (+1)
  - Recalc cột **Chênh**
  - Highlight dòng xanh (success) và lock 1s để UX rõ
- **Nhập số thủ công**: Có thể gõ trực tiếp vào cột **Kiểm** (nếu muốn set số thay vì +1)
- **Xóa/Edit ghi chú**: Click vào cell → edit inline

**Pagination/Scrolling:**
- Bảng scrollable, có thể sticky header
- Hiển thị 50 dòng/page, có load-more hoặc pagination buttons
- Tổng cộng: "Hiển thị 1-50 của 8,114"

---

## 🔧 CHỨC NĂNG CHI TIẾT

### A. Nhập File Excel

**Flow:**
1. User click nút **📁 Nhập File**
2. Hiển thị input file (`<input type="file" accept=".xlsx,.xls" />`)
3. Khi select file:
   - Kiểm tra định dạng (.xlsx hoặc .xls)
   - Parse Excel bằng `xlsx` library
   - Validate cột bắt buộc (14 cột chính)
   - Nếu thiếu cột → hiển thị error toast: "File không hợp lệ: Thiếu cột '{tên cột}'"
   - Nếu OK → Load dữ liệu vào state (in-memory)
   - Hiển thị toast thành công: "✅ Đã tải 8,114 sản phẩm"
   - Mở rộng bộ lọc + table dữ liệu

**Xử lý lỗi:**
- File không hợp lệ (không phải Excel) → Error toast
- File quá lớn (> 50MB) → Error toast
- Dữ liệu thiếu (cột required = null) → Log warning, skip dòng đó
- Parse date fail → Dùng default date

---

### B. Xóa Dữ Liệu

**Flow:**
1. User click **🗑️ Xóa Dữ Liệu**
2. Hiển thị modal confirm:
   ```
   ⚠️ Xóa toàn bộ dữ liệu?
   Bạn sẽ xóa {n} sản phẩm đã tải. Hành động này không thể hoàn tác.
   [❌ Hủy]  [✅ Xóa]
   ```
3. Nếu confirm → Clear state, reset bộ lọc, ẩn bảng dữ liệu
4. Hiển thị toast: "✅ Đã xóa dữ liệu"

---

### C. Tìm Kiếm Sản Phẩm

**Chức năng:**
- Input real-time search tại **🔍 Tìm kiếm**
- Tìm trong các cột: Tên sản phẩm, Mã sản phẩm, IMEI
- Fuzzy search: "bếp gas" match "Bếp gas đôi Sunhouse"
- Không case-sensitive
- Bỏ diacritics (tìm "dep" match "đẹp")
- Instant filter (debounce 300ms để không lag)

**Ví dụ:**
- Gõ "51134F31" → Hiển thị tất cả row có IMEI chứa đoạn này
- Gõ "bếp" → Hiển thị "Bếp gas đôi", "Bếp từ", etc.

---

### D. Quét QR Code / IMEI Tracking

**Flow:**
1. Bên cạnh bảng hoặc trong toolbar, có input **🔐 Quét QR Code / Nhập IMEI:**
   ```
   [Đặt con trỏ rồi quét QR hoặc gõ IMEI...]
   ```
2. Khi nhập (quét hoặc gõ):
   - Tìm row có `IMEI` = giá trị nhập
   - Nếu tìm thấy:
     - Increment `Số lượng Kiểm kê` (+1)
     - Recalc `Chênh lệch` = Kiểm - Tồn
     - Highlight dòng **xanh** (emerald) và lock UI 500ms → slide out effect (thể hiện dòng đó đã được scan)
     - Clear input, focus lại (sẵn sàng quét SP tiếp theo)
     - Toast success: "✅ Đã scan: {Tên sản phẩm} (1/5)"
   - Nếu không tìm thấy:
     - Highlight input **đỏ** (rose) + shake animation
     - Toast warning: "⚠️ IMEI không tìm thấy trong kho"
     - Clear input sau 2s
   - Nếu IMEI để trống → ignore, focus input

**Ghi chú:**
- Mỗi lần quét cùng IMEI → +1 lần nữa (cho phép recount)
- Có nút **🔄 Reset** bên input để clear số lượng kiểm kê về 0 (nếu scan nhầm)

---

### E. Thống Kê & KPI

**Hiển thị bên trên bộ lọc:**
```
┌─────────────────┬─────────────────┬─────────────────┬─────────────────┐
│ 📊 Tổng SKU     │ 📦 Tổng Số Lượng│ ✅ Đã Kiểm Kê   │ ⚠️ Chênh Lệch    │
│ 8,114 (100%)    │ 12,456 cái      │ 245 (3%)        │ -124 cái (1.0%)  │
└─────────────────┴─────────────────┴─────────────────┴─────────────────┘
```

**Công thức:**
- **Tổng SKU**: Số dòng = số unique Mã sản phẩm + IMEI
- **Tổng Số Lượng**: Sum của cột `Số lượng` (Tồn KK)
- **Đã Kiểm Kê**: Count của dòng có `Số lượng Kiểm` > 0
- **Chênh Lệch**: Sum(Kiểm - Tồn) = total thừa/thiếu

---

### F. Liên Kết Report

Nút **🔗 Mở Report** link tới:
```
https://report.mwgroup.vn/home/dashboard/6
```
- Open tab mới (target="_blank")
- Icon link + text "Mở Report Tồn Kho"

---

## 🎮 UX / Interaction Details

### 1. **Loading State**
- Khi nhập file: Spinner + "Đang phân tích file..." (max 5s)
- Nếu > 5s: Show error "File quá lớn hoặc lỗi parse"

### 2. **Empty State**
```
🎒 Chưa có dữ liệu kiểm kê
Hãy nhập file tồn kho Excel để bắt đầu
[📁 Chọn File]
```

### 3. **Notifications/Toasts**
- ✅ Success: "Đã tải 8,114 sản phẩm" (auto-hide 3s)
- ⚠️ Warning: "IMEI không tìm thấy" (auto-hide 5s, có close button)
- ❌ Error: "File không hợp lệ" (persistent, có close button)

### 4. **Responsive Design**
- **Desktop (≥1024px)**:
  - Bộ lọc 2 hàng (9 filter box)
  - Bảng full width, sticky header
  - Toolbar horizontal
- **Tablet (768-1023px)**:
  - Bộ lọc collapse vào accordion/tabs
  - Bảng horizontal scroll
  - Toolbar vertical stack
- **Mobile (<768px)**:
  - Bộ lọc collapse hoàn toàn
  - Bảng card view (1 card = 1 dòng)
  - Nhập file + QR scan nổi bật

### 5. **Keyboard Shortcuts** (Optional)
- **Ctrl+S**: Save (export checking result as CSV)
- **Ctrl+Z**: Undo last scan (pop từ array)
- **Escape**: Clear search/focus

---

## 💾 STATE MANAGEMENT

### Data Structure

```typescript
interface InventoryState {
  // File data
  items: {
    id: string; // unique key
    maKho: number;
    tenKho: string;
    maSanPham: string;
    tenSanPham: string;
    imei: string;
    soLuongTonKho: number;
    giaTien: number;
    ngayNhap?: Date;
    trangThaiSP?: string;
    // ... other columns
  }[];

  // Checking state
  checkingData: {
    [id: string]: {
      soLuongKiemKe: number;
      chieuThayCo: number; // calculated
      trangThaiKiem: 'chua_kiem' | 'da_kiem' | 'hoan_thanh';
      ghiChu?: string;
      lastScanTime?: Date;
    };
  };

  // Filter state
  filters: {
    searchText: string;
    selectedKho: string[];
    selectedNganh: string[];
    selectedNhom: string[];
    selectedNhaCungCap: string[];
    selectedTrangThaiSP: string[];
    selectedTrangThaiKiem: string[];
    priceRange: [number, number];
    dateRange: [Date | null, Date | null];
  };

  // UI state
  isLoading: boolean;
  error?: string;
  totalFiltered: number;
  currentPage: number;
}
```

---

## 📱 Export / Report Output (Phase 2)

**Future feature** (không bắt buộc lần đầu):
- Export kiểm kê kết quả thành CSV/Excel
- Format: Mã SKU, Tên, IMEI, Tồn Kho, Kiểm Kê, Chênh Lệch, Ghi Chú
- Có thể in báo cáo kiểm kê PDF

---

## 🔐 Bảo Mật & Quy Tắc

1. **Dữ liệu nhạy cảm**: 
   - IMEI là sensitive data, cần hide một phần khi display công khai (VD: 5113***MF952)
   - Giá tế tế không hiển thị nếu người dùng không phải manager

2. **Upload file**:
   - Chỉ accept `.xlsx`, `.xls` (kiểm tra MIME type + extension)
   - Max file size: 50MB
   - Parse client-side (không upload server)

3. **Dữ liệu tạm thời**:
   - Lưu trong `localStorage` (key: `kho_hang_checking_{date}`)
   - User có thể refresh page mà không mất data
   - Tự động xóa sau 7 ngày (cleanup script)

---

## 📊 Công Thức & Validation

### Recalc Chênh Lệch

```
chieuThayCo = soLuongKiemKe - soLuongTonKho

Nếu chieuThayCo:
  - = 0: Hoàn thành ✅ (màu emerald)
  - < 0: Thiếu ❌ (màu rose) (VD: Kiểm=0, Tồn=1 → thiếu 1)
  - > 0: Thừa ⚠️ (màu amber) (VD: Kiểm=2, Tồn=1 → thừa 1)
```

### Validate Data Input

- **Số lượng**: Không âm, <= 999,999
- **IMEI**: Phải chứa chữ-số, độ dài 10-20
- **Ngày**: Format ISO, không vượt quá ngày hôm nay
- **Tên sản phẩm**: Không empty, trimmed

---

## 🚀 Roadmap Triển Khai

### Phase 1: MVP (2-3 tuần)
- [x] Nhập file Excel
- [x] Bộ lọc (Kho, Ngành, Nhóm, Nhà CC)
- [x] Table dữ liệu (columns cơ bản)
- [x] Tìm kiếm sản phẩm
- [x] Quét QR code / IMEI
- [x] Xóa dữ liệu
- [x] Thống kê KPI
- [x] Responsive mobile

### Phase 2: Enhancement (Tuần 4-5)
- [ ] Export CSV/Excel kiểm kê kết quả
- [ ] In báo cáo PDF
- [ ] Sync với backend (save checking state)
- [ ] History kiểm kê (log từng lần scan)
- [ ] Batch QR code (quét 10 cái cùng lúc)

### Phase 3: Advanced (Tuần 6+)
- [ ] Barcode generation (in label QR)
- [ ] Real-time sync multi-user (socket.io)
- [ ] Offline mode + sync khi online
- [ ] AI tự động detect chênh lệch bất thường

---

## 📝 TESTING CHECKLIST

### Functional Tests
- [ ] Nhập file Excel OK → Load 8,114 items
- [ ] Nhập file lỗi → Hiển thị error message rõ
- [ ] Xóa dữ liệu → Confirm dialog OK → Clear state
- [ ] Filter theo Kho → Chỉ show items của kho đó
- [ ] Filter multiple Ngành → AND logic OK
- [ ] Tìm kiếm "bếp" → Match fuzzy OK
- [ ] Quét IMEI 51134F31MF952 → +1 kiểm kê OK
- [ ] Quét IMEI không tồn → Hiển thị warning OK
- [ ] Chênh lệch = 0 → Màu xanh OK
- [ ] Chênh lệch < 0 → Màu đỏ OK
- [ ] Chênh lệch > 0 → Màu vàng OK
- [ ] Export CSV → File download OK
- [ ] Thống kê KPI update khi quét → OK

### UX Tests
- [ ] Mobile: Bộ lọc collapse OK
- [ ] Tablet: Bảng scroll horizontal OK
- [ ] Loading spinner hiển thị khi parse file lớn
- [ ] Toast notification hiển thị + auto-hide OK
- [ ] Keyboard focus management OK (Tab, Enter)

### Performance Tests
- [ ] File 8,114 items parse < 3s
- [ ] Render bảng 50 items < 1s
- [ ] Filter 1000 items search < 200ms
- [ ] localStorage save < 500ms

---

## 🎯 Acceptance Criteria

1. ✅ Người dùng có thể nhập file Excel tồn kho (8,114 hàng)
2. ✅ Người dùng có thể lọc dữ liệu theo 7-8 chiều (Kho, Ngành, Nhóm, etc.)
3. ✅ Người dùng có thể tìm kiếm sản phẩm theo tên/IMEI (fuzzy search)
4. ✅ Người dùng có thể quét QR code (input IMEI) để kiểm kê (auto +1)
5. ✅ Chênh lệch tính toán chính xác (Kiểm - Tồn)
6. ✅ UI responsive trên mobile/tablet/desktop
7. ✅ Thống kê KPI real-time (Tổng SKU, Tổng SL, Đã Kiểm, Chênh)
8. ✅ Người dùng có thể xóa dữ liệu (có confirm dialog)
9. ✅ Liên kết tới Report Tồn Kho (external link)
10. ✅ Dữ liệu persist qua refresh (localStorage)

---

## 🔗 Tài Liệu Tham Khảo

- **File tồn kho mẫu**: `/Users/ltson/Downloads/Tồnkhochitiết026a7b1f56bf4ebe855163098324721020260728_101144_c18fd08ec89d4b05b1caa478aa9d3183_202607281144.xlsx`
- **Report Tồn Kho**: https://report.mwgroup.vn/home/dashboard/6
- **Library parse Excel**: `xlsx@0.18.5` (đã install)
- **UI Components**: Dùng `components/shared/ui/*` (Button, Input, Modal, etc.)
- **Design System**: Màu `sky`, `emerald`, `rose`, `amber`, `slate` (theo CLAUDE.md)

---

## 👤 Ownership & Contact

**PM**: TBD  
**Dev Lead**: TBD  
**QA**: TBD  
**Last Updated**: 2026-07-29  
**Status**: 🟢 Ready to Build

---

## 📌 Notes & Assumptions

1. File Excel luôn có 19 cột đúng thứ tự (không thay đổi schema)
2. IMEI là unique key (không có duplicate)
3. Người dùng chỉ kiểm kê trên 1 file/ngày (không cần multi-session)
4. Data không cần sync realtime với server (lần đầu là local-only)
5. QR code reader là input thủ công (gõ IMEI hoặc paste từ QR scanner app)
