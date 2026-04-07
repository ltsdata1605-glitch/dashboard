# DESIGN GUIDELINES: DASHBOARD YCX TABLE STYLES

_Tài liệu này dùng để định hướng phong cách thiết kế UI/UX cho TẤT CẢ các bảng biểu được tạo mới trong tương lai hoặc khi refactor bảng biểu cũ của dự án Dashboard YCX._

**MỤC TIÊU CỐT LÕI**: Kế thừa chuẩn mực tuyệt đối từ siêu cấu trúc bảng "CHI TIẾT NGÀNH HÀNG" (SummaryTable) ở Chế độ Tiêu chuẩn.

---

## 1. Hệ Thống Lưới Phẳng Nhất Quán (Flat Grid 1px)
Không sử dụng các loại viền dày, viền kép, hay hiệu ứng đổ bóng viền lồi lõm lỗi thời để tạo cảm giác "vô cực" và "chuyên nghiệp" cho giao diện chứa dữ liệu khổng lồ:

- **Border tiêu chuẩn**: Bắt buộc sử dụng `border-slate-200 dark:border-slate-700` cho tất cả đường bao ngoài và lề chia ô bên trong bảng.
- **Độ mảnh khung lưới**: Chỉ đường viền mỏng tiêu chuẩn HTML (`border`, `border-b`, `border-l`, `border-r`), TUYỆT ĐỐI không dùng `border-b-4`, `border-2` hoặc `shadow`.
- Bảng phải có cấu trúc chìm/liền mạch vào nền của thẻ Container.

## 2. Header Đa Cấp & Màu Pastel Hiện Đại (Group Header & Sub Header)
Thay vì các màu xám/đen cơ bản, các nhóm chỉ tiêu (doanh thu, quy đổi, hiển thị ngành) được phân chia bởi dải màu nền Pastel (Nhạt) thanh lịch để hỗ trợ đánh lừa thị giác (Scannability):

- **Header Nhóm Chính (Group Header)**: Phân nhóm các cột liên quan (VD: SỐ LƯỢNG có các cột phụ SL, +/-SL). Màu nền dùng cụm thẻ màu Pastel, ví dụ: 
  - `bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-300`
  - `bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300`
  - `bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300`
  - `bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300`
- **Tên Cột**: LUÔN VIẾT HOA toàn bộ (UPPERCASE) ở các tiêu đề chính, sử dụng `text-[11px] font-bold tracking-tight`. Các tiêu đề phụ bên dưới được viết ngắn gọn gọn gàng.
- **Header Phụ (Sub Header)**: Nằm ngay dưới Group Header, nền thường là Trắng hoặc đồng bộ cùng tông trắng ráo (`bg-white dark:bg-slate-900`) với đường `border-b` siêu mỏng.

## 3. Quy Ước Bố Cục Thân Bảng (Table Body)
- **Hiệu ứng Hover (Xuyên Suốt)**: Các dòng phải sử dụng logic đổi màu nhạt khi lướt chuột qua: `hover:bg-slate-50 dark:hover:bg-slate-800` có kèm transition `transition-colors`.
- **Canh lề Nội Dung (Cell Alignment)**:
   - *Chuỗi ký tự, Tên Khách/Nhân viên/Sản phẩm*: Canh trái (`text-left`).
   - *Con số tuyệt đối (Tiền bạc)*: Canh phải (`text-right`) hoặc Canh Giữa `text-center`. Luôn ưu tiên dùng font số hiển thị Tabular Lining nếu có hỗ trợ.
   - *Cột %*: Ưu tiên tô màu tuỳ theo mức độ (Xanh lá > Đỏ > Cam).
- **Phân tách Hàng lẻ (Hàng tổng/Sticky)**:
   - Các dòng chữ dạng "Tổng" hay "Chỉ số chốt" của Table Body luôn phải in đậm, để xám khác biệt `bg-slate-100 dark:bg-slate-800`.
   - Cột cố định (`sticky left-0`) phải được tô màu nền cùng màu với Body Container để chống rác trong lúc scroll ngang (`z-20` ở thead, `z-10` ở row).

## 4. Tương Tác & Lọc (Interactions)
- Các Toolbars thả nổi nằm gọn cùng hàng với Title thay vì rớt vãi xuống dưới. 
- Tìm Kiếm/Dropdown: Luôn cài đặt chế độ Debounce (sử dụng thư viện Re-render hoặc `useDeferredValue`) để tránh rác luồng Main Thread DOM.
- Các Popover Filter luôn dùng giao diện lưới Float thả từ trên xuống gọn nhẹ `absolute z-50 mt-2 shadow-xl`.
