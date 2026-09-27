# Findings: Rà soát & Tối ưu hoá

## 1. Icon bị lỗi không hiển thị
- `components/common/Icon.tsx`:
  - `ICON_MAP` sử dụng danh sách tĩnh để hỗ trợ tree-shaking (~180 icon).
  - Khi một icon name không nằm trong `ICON_MAP`, component trả về:
    `<span className="inline-block w-${size} h-${size} bg-slate-200 rounded-sm ${className}" />`
    gây ra hiện tượng ô vuông xám, vỡ icon trên giao diện.
  - Các icon đang được gọi thực tế nhưng THIẾU trong `ICON_MAP`:
    1. `'lock'`: được dùng trong `components/pivot/PivotTable.tsx` (hiển thị ghi chú phạm vi dữ liệu).
    2. `'calendar-check'`: được dùng trong `components/employees/HeadToHeadTab.tsx` (nút toggle bao gồm ngày hôm nay).
    3. `'calendar-x'`: được dùng trong `components/employees/HeadToHeadTab.tsx` (nút toggle khi tắt hôm nay).
    4. `'sliders-horizontal'`: được dùng trong `components/filters/FilterSection.tsx` (menu Tuỳ chỉnh mục Bảng Pivot).
    5. `'line-chart'`: nằm trong danh sách icon ngẫu nhiên của `HeadToHeadConfigModal.tsx` và `CustomExploitationTabModal.tsx`.
    6. `'layout'`: nằm trong danh sách icon ngẫu nhiên của 2 modal trên.
    7. `'grid'`: nằm trong danh sách icon ngẫu nhiên của 2 modal trên.
    8. `'compass'`: nằm trong danh sách icon ngẫu nhiên của 2 modal trên.

## 2. File thừa & File trùng lặp
- `bg_phieutgd.png` ở root: Kích thước 51KB, trong khi code thực tế gọi `/frame/bg_phieutgd.png` (nằm trong `public/frame/bg_phieutgd.png` 332KB). File ở root là file rác từ tháng 8.
- `firestore-debug.log`: File log tạm của firebase emulator.

## 3. Code thừa & Dead Code
- Cần quét toàn bộ các export không có import và các hàm không có caller.
