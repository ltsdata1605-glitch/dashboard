# Task Plan: Rà soát, dọn dẹp và tối ưu toàn bộ dự án

## 1. Mục tiêu & Phạm vi
Thực hiện 4 nhiệm vụ trọng tâm:
1. **Xoá file thừa**: Các file rác, file nháp, file backup cũ không dùng, file trùng lặp (ví dụ `bg_phieutgd.png` ở root).
2. **Xoá code thừa, code cũ**: Các function/component/module chết, imports không còn sử dụng, dead exports.
3. **Dọn dẹp & tối ưu hiệu năng**: Tối ưu tốc độ tải và chạy, bundle size, loại bỏ re-render thừa, tinh gọn code theo clean-code và react-best-practices.
4. **Khắc phục triệt để lỗi icon không hiển thị**: Bổ sung đầy đủ các icon còn thiếu vào `ICON_MAP` (`lock`, `calendar-check`, `calendar-x`, `sliders-horizontal`, `line-chart`, `layout`, `grid`, `compass`, v.v.) và cơ chế fallback an toàn, không để xuất hiện ô xám/icon vỡ.

---

## 2. Kế hoạch từng giai đoạn

### Giai đoạn 1: Rà soát & Khắc phục triệt để lỗi Icon không hiển thị (Mục 4)
- [x] Đã quét toàn bộ codebase tìm các icon bị thiếu:
  - `lock` trong `PivotTable.tsx`
  - `calendar-check`, `calendar-x` trong `HeadToHeadTab.tsx`
  - `sliders-horizontal` trong `FilterSection.tsx`
  - `line-chart`, `layout`, `grid`, `compass` trong `HeadToHeadConfigModal.tsx` và `CustomExploitationTabModal.tsx`
- [x] Bổ sung các icon trên vào `components/common/Icon.tsx` (import tường minh từ `lucide-react` để giữ tree-shaking).
- [x] Bổ sung cơ chế Fallback Component (HelpCircle) thay cho ô vuông xám `<span className="bg-slate-200">`.
- [x] Kiểm tra lại tất cả các màn hình có sử dụng icon.

### Giai đoạn 2: Quét và Xoá File thừa (Mục 1)
- [x] Xoá file ngoài root: `bg_phieutgd.png` (bản sao 51KB ở root, file thật ở `public/frame/bg_phieutgd.png`).
- [x] Xoá file log thừa: `firestore-debug.log`.
- [x] Xoá modal chết mồ côi: `features/bi-dashboard/components/dashboard/competition/CompetitionCommentaryModal.tsx` (282 dòng không có caller).

### Giai đoạn 3: Rà soát Code thừa & Code cũ không còn sử dụng (Mục 2)
- [x] Xoá hằng số chết `SAMPLE_INPUT` (100 dòng text mẫu) trong `utils/couponSampleData.ts`.
- [x] Xoá import thừa `lazy`, `ClipboardCheck` trong `App.tsx`.
- [x] Xoá 8 icon import thừa trong `Sidebar.tsx` (`ChevronLeft`, `ChevronRight`, `Search`, `Bell`, `Moon`, `Sun`, `MessageSquare`, `X`).
- [x] Xoá icon import thừa `Shield` trong `MobileBottomNav.tsx`.

### Giai đoạn 4: Tối ưu hoá hiệu năng & dọn dẹp cấu trúc (Mục 3)
- [x] Rà soát bundle: giữ nguyên tree-shaking icon map tường minh.
- [x] Đã kiểm tra và xác nhận 0 `console.log` debug rác còn sót trong source code.
- [x] Tối ưu hóa bundle và giảm re-render với React.memo cho views/navbars.

### Giai đoạn 5: Kiểm tra xác minh (Verification & Testing)
- [x] `npm run typecheck` đạt 0 lỗi (Exit code 0).
- [x] Targeted vitest: 50/50 tests passed (260ms).
