# AUDIT DỰ ÁN — DASHBOARD YCX
*Thực hiện: 04/07/2026 — Phạm vi: toàn bộ codebase (kiến trúc, chất lượng code, UI/design system, dọn dẹp repo)*

## Tóm tắt điều hành

Dự án có **3 tài liệu chuẩn được viết khá tốt** (`RULES.md`, `DESIGN_SYSTEM.md`, `UI_GUIDELINES.md`) mô tả đúng những gì một dashboard chuyên nghiệp cần có: kiến trúc module cách ly, component UI dùng chung, bảng màu semantic, quy tắc bảng biểu... Vấn đề không nằm ở *thiếu định hướng*, mà ở **khoảng cách giữa tài liệu và code thực tế**:

- Kiến trúc thực tế đã phình thành **4 "mini-app" song song** (`features/bi-dashboard`, `features/phan-ca`, `features/sticker-event`, cộng phần gốc) mà tài liệu chỉ mô tả 1 hệ thống thống nhất.
- Bộ component chuẩn (`components/shared/ui/`) **đã được xây dựng đầy đủ và đúng chuẩn** nhưng gần như không được dùng — ước tính độ tuân thủ design system thực tế **dưới 30%** ở các module lớn.
- Có **1 lỗ hổng bảo mật thực sự** (Firebase API key hard-code trong source).
- Repo tích tụ nhiều rác từ quá trình vibecode: 18 script vá lỗi one-off, file backup nặng, 2 tài liệu design system mâu thuẫn nhau, 2 thư mục `_agents`/`.agents` trùng tên.

Tin tốt: nền tảng để sửa đã có sẵn (component library đúng chuẩn, tài liệu rõ ràng) — đây là bài toán **dọn dẹp và migrate**, không phải xây lại từ đầu.

---

## 1. Vấn đề mức CAO — nên xử lý trước

### 1.1 [Bảo mật] Firebase API key hard-code trong source
`services/firebase.ts` chứa `apiKey` cứng trong code đã commit lên git, thay vì đọc từ `.env.local` (dự án đã có sẵn cơ chế này). `features/sticker-event/firebase.ts` lại khởi tạo một Firebase App **thứ hai**, độc lập, dùng named-app pattern khác hẳn (`getApps()/getApp()`).
- **Rủi ro**: key đã lộ vĩnh viễn trong lịch sử git (nếu repo public hoặc rò rỉ sẽ không thu hồi được bằng cách sửa code).
- **Khắc phục**: chuyển sang `import.meta.env.VITE_FIREBASE_*`, xoay vòng (rotate) API key trên Firebase Console, hợp nhất 1 Firebase app dùng chung nếu 2 hệ thống không cần tách biệt thật sự.

### 1.2 [Bảo mật] `telegram-agent/bot.js` cho AI thực thi shell command qua blocklist, không phải allowlist
Bot cho phép `spawn(command, {shell:true})`, chỉ được chặn bởi regex blocklist trong `safety.js` (chặn `rm -rf`, `git push`, `.env`...). Blocklist dễ bị lách (`rm -r -f` hai flag tách rời, `find . -delete`, `curl | sh`...). Lớp bảo vệ thật sự duy nhất là kiểm tra `TELEGRAM_ALLOWED_USER_ID`.
- **Khắc phục**: chuyển sang allowlist lệnh cụ thể thay vì blocklist, hoặc chạy trong sandbox/container cách ly, đặc biệt nếu có ý định mở rộng cho nhiều người dùng Telegram hơn.

### 1.3 [Kiến trúc] Tài liệu mô tả 1 hệ thống, code thực tế là 4 hệ thống song song
`RULES.md` nói tới "bi-module" (tên thật: `features/bi-dashboard/`) và hoàn toàn không nhắc `features/phan-ca/`, `features/sticker-event/` — mỗi thư mục có `hooks/`, `services/`, `components/`, thậm chí `firebase.ts` riêng, tách biệt hoàn toàn khỏi `services/`, `hooks/`, `contexts/` gốc.
- **Hệ quả**: quy tắc "hooks/ chỉ dùng cho Dashboard/check-thuong" chỉ là quy ước bằng lời, không có cơ chế kỹ thuật nào ngăn nhầm lẫn khi dự án đã có 4 "vùng" độc lập.
- **Khắc phục**: viết lại RULES.md phản ánh đúng thực tế 4 sub-app, hoặc — tốt hơn — hợp nhất dần các `features/*` về chung 1 kiến trúc nếu mục tiêu là chuẩn hóa thật sự.

### 1.4 [Design System] Component chuẩn tồn tại nhưng bị bỏ qua gần như toàn hệ thống
`components/shared/ui/` **đã có đầy đủ** Button, Input, Modal, ConfirmDialog, Skeleton, Card, StatCard, Badge, Tabs... đúng như `DESIGN_SYSTEM.md` mô tả. Nhưng đo thực tế:
- 438 thẻ `<button>` thô so với chỉ 14 file dùng component `Button` dùng chung.
- `Modal.tsx` (chuẩn, có AnimatePresence) chỉ được dùng ở **1 nơi** trong toàn repo.
- 40 file tự viết modal riêng (`fixed inset-0 ...`) thay vì dùng chung.
- Có **3 hệ thống modal song song**: `shared/ui/Modal` (mới), `components/modals/ModalWrapper` (cũ, đang được ~12 modal dùng), và hàng chục modal tự viết trong `features/sticker-event`, `features/phan-ca`.
- **Khắc phục**: chọn 1 chuẩn modal duy nhất (khuyến nghị `shared/ui/Modal`), lên kế hoạch migrate dần theo từng view, chặn PR mới tạo `<button>`/modal thô bằng code review hoặc ESLint custom rule.

### 1.5 [Design System] 3 hệ token màu xung đột nhau
`styles/tokens.css` (dường như không được import ở đâu), `styles.css` (`@theme` đặt `--color-indigo-500: #0ea5e9` — thực chất là **sky** nhưng gọi tên "indigo", gây nhầm lẫn), và `features/phan-ca/phanca.css` (`--brand-primary: #4338ca` — indigo thật, không có `.dark` override nào). Không file nào là nguồn chân lý duy nhất.
- **Khắc phục**: xóa `styles/tokens.css` nếu xác nhận không dùng, sửa tên biến sai trong `styles.css`, gộp `phanca.css` vào theme chung + bổ sung dark mode.

### 1.6 [Design System] `styles.css` chứa CSS custom vượt xa phạm vi cho phép
RULES.md quy định "Tailwind-only, không CSS custom trừ `@media print`", nhưng `styles.css` có ~400 dòng ngoài phạm vi đó (`.surface-card`, `.chart-card`, animation keyframes, `.bg-static-blobs`...).
- **Khắc phục**: chuyển các pattern lặp lại thành component React hoặc Tailwind `@apply` có kiểm soát, không để CSS global phình tự do.

### 1.7 [Code quality] `services/dbService.ts` — god file 1636 dòng, ~76 export
Quản lý toàn bộ IndexedDB: settings, sales data, KPI targets, warehouse config, theme map, sync... trong 1 file.
- **Khắc phục**: tách theo domain (`dbService/settings.ts`, `salesData.ts`, `kpiConfig.ts`, `warehouseConfig.ts`...).

### 1.8 [Code quality] `AuthContext` không memo hóa Provider value
`contexts/AuthContext.tsx` truyền object literal trực tiếp vào `value={{...}}` không qua `useMemo` — mọi consumer (gần như toàn app) re-render mỗi khi `AuthProvider` render lại. `LayoutContext.tsx` đã làm đúng bằng `useMemo` — chỉ cần áp dụng lại pattern đó.
- **Khắc phục**: bọc value bằng `useMemo` với dependency đầy đủ.

### 1.9 [Code quality] `DashboardContext.Provider value={logic as any}`
`components/views/DashboardView.tsx:258` ép kiểu `as any` để né TypeScript verify interface `DashboardContextType` (50 field) — vi phạm trực tiếp quy tắc "không dùng any" của chính RULES.md.
- **Khắc phục**: đảm bảo `useDashboardLogic()` trả về đúng shape của interface, bỏ `as any`.

### 1.10 [Repo hygiene] File backup nặng đã bị commit vào git
`archive/dashboardycx_backup_20260524_131942.tar.gz` đã track trong git dù `.gitignore` chặn `*.tar.gz` (rule chỉ chặn file mới, không gỡ file cũ) — khiến `.git` phình vĩnh viễn. Thư mục `archive/` hiện chiếm 3.3GB trên đĩa.
- **Khắc phục**: `git rm --cached` file này, cân nhắc `git filter-repo`/BFG để giảm size lịch sử nếu cần; chỉ giữ 1-2 bản backup gần nhất, chuyển backup dài hạn ra ngoài repo (cloud storage).

---

## 2. Vấn đề mức TRUNG BÌNH

| # | Vấn đề | Vị trí | Đề xuất |
|---|---|---|---|
| 2.1 | ~2687 lượt hardcode màu ngoài palette semantic (indigo/orange/teal/purple thay vì sky/emerald/amber/rose quy định) | `features/sticker-event/*`, `components/charts/TrendChart.tsx`, `components/tables/SummaryTable.tsx` | Quét & thay theo mapping màu → token semantic |
| 2.2 | Portal desktop + toolbar mobile `lg:hidden` không đủ cặp ở phần lớn view | `CheckThuongView`, `SettingsView` (thiếu mobile), `CouponConverterView`, `UserManagementView`, `LoginView`, `AboutView` (thiếu cả 2) | Audit từng view, bổ sung theo mẫu `DashboardView.tsx` (duy nhất làm đủ) |
| 2.3 | `phanca.css` không có class `.dark` nào — bảng phân ca không hỗ trợ dark mode | `features/phan-ca/phanca.css`, `ScheduleTable`, `DailyStatsTable` | Xóa CSS custom, chuyển sang Tailwind + `dark:` |
| 2.4 | 321 chỗ dùng `any` trong components/hooks/services/utils/contexts/features | Điểm nóng: `features/*` (210), `components/employees` (193) | Bật `@typescript-eslint/no-explicit-any` cảnh báo, dọn dần theo module |
| 2.5 | Header bảng không đồng nhất cỡ chữ chuẩn `text-[11px]` | `MonthlyTrendTable.tsx`, `SummaryTable.tsx` | Tạo `<TableHeaderCell>` dùng chung |
| 2.6 | `components/employees/` (24 file, 6168 dòng) không được nhắc trong RULES.md, nhiều file gần/vượt ngưỡng refactor (490-590 dòng) | `ContestTable.tsx`, `useIndustryAnalysisLogic.ts`, `PerformanceSingleTable.tsx` | Bổ sung vào RULES.md, tách file lớn |
| 2.7 | 18 script `fix_*.cjs` + `update_task.cjs` ở root — đã xác nhận là script vá lỗi one-off, không còn được gọi ở đâu | Root project | Xóa toàn bộ, hoặc chuyển vào `archive/scripts/` nếu muốn giữ lịch sử |
| 2.8 | 2 tài liệu design system mâu thuẫn nhau hoàn toàn (palette, font khác nhau) | `DESIGN_SYSTEM.md` (root) vs `design-system/ycx-dashboard/MASTER.md` | Xác định 1 nguồn chân lý, archive bản còn lại |
| 2.9 | `_agents/` (2 file, có vẻ bỏ hoang) vs `.agents/` (đang hoạt động, chứa AGENTS.md thật) — tên gần giống gây nhầm lẫn | Root | Archive/xóa `_agents/`, giữ `.agents/` là chính thức |
| 2.10 | Script `deploy` trong `package.json` chạy `git add -A` tự động, không loại trừ gì, tự push thẳng `main` | `package.json` | Thay bằng add có chọn lọc, hoặc yêu cầu review diff trước khi deploy |
| 2.11 | God file thực sự nằm ở `features/*`, không phải `App.tsx` (289 dòng, ổn) | `StickerPrinterView.tsx` (1831 dòng), `StickerPrintPreview.tsx` (1504), `printService.ts` (1466), `PhanCaView.tsx` (1430), `usePhanCa.ts` (1361), `BonusTab.tsx` (1123) | Ưu tiên tách nhóm sticker-event và phan-ca trước |
| 2.12 | `scratch/backup_services/` chứa bản sao gần trùng `dbService.ts`, `uiService.ts` với bản chính | `scratch/` (đã gitignore) | Xóa nếu không còn cần, tránh sửa nhầm bản backup |
| 2.13 | `hooks/` không có cơ chế kỹ thuật nào enforce "chỉ dùng cho Dashboard/check-thuong" | `hooks/*` | ESLint `no-restricted-imports` giới hạn theo path |

---

## 3. Vấn đề mức THẤP (dọn dẹp nhanh)

- `useIndustryAnalysisLogic.ts.patch` — file `.patch` rác đã bị commit vào git, không được import ở đâu → xóa.
- 52 chỗ `console.log` còn sót (khác 294 `console.error/warn` hợp lệ) → thêm ESLint `no-console` (cho phép warn/error).
- `rounded-3xl` vẫn xuất hiện ở 9 nơi dù RULES.md khuyến cáo tránh (`LoginView`, `AboutView`, `PendingApprovalView`...) → đổi về `rounded-xl`/`rounded-2xl`.
- `border-2`/`border-4` trên bảng dữ liệu vi phạm "chỉ viền mỏng 1px" (`EditShiftModal.tsx`, `EditPatternModal.tsx`).
- `gray-*`/`zinc-*` trộn lẫn với hệ `slate-*` ở 9 chỗ → tìm-thay về slate.
- `CouponConverterView` là view duy nhất chưa dùng `lazy()` như 9 view còn lại (`App.tsx`).
- `dashboardycx_backup.zip` (57MB) và `bg_phieu.png` trùng tên với bản trong `public/frame/` nằm rác ở root.
- `.env.example` của telegram-agent hardcode đường dẫn máy cá nhân (`/Users/dangkhoa/...`) → đổi thành placeholder generic.
- `Deploy_Dashboard.command` (script double-click macOS, đặc thù máy cá nhân) không nên nằm trong source dùng chung.
- `ThemeContext` được RULES.md liệt kê nhưng không tồn tại thực tế (theme logic nằm lẫn trong `features/bi-dashboard/hooks/useTheme.ts`).
- Trùng lặp hàm format tiền/số giữa `utils/dataUtils.ts` và `features/sticker-event/utils/format.ts`.

---

## 4. Điểm đã làm ĐÚNG — nên giữ và nhân rộng

- `components/shared/ui/` được xây dựng đầy đủ, đúng chuẩn `DESIGN_SYSTEM.md` — chỉ cần *dùng nhiều hơn*, không cần viết lại.
- `components/modals/`, `components/tables/` (viết gần đây hơn) bám khá sát `UI_GUIDELINES.md` — độ tuân thủ ước tính 70-80%, cao hơn hẳn phần còn lại.
- `LayoutContext.tsx` đã memo hóa value đúng cách — dùng làm mẫu để sửa `AuthContext`.
- Không có secret thật nào bị lộ trong `.env.local`/`.env.example` — chỉ có placeholder.
- Không phát hiện `window.alert`/`window.confirm`/`window.prompt` thật nào trong code — quy tắc "nghiêm cấm" này được tuân thủ tốt.
- `components/views/` (nhóm view chính) khá gọn gàng, file lớn nhất chỉ 647 dòng — vấn đề độ phức tạp nằm ở `features/*` và `components/employees/`, không phải lõi app.

---

## 5. Lộ trình đề xuất (ưu tiên theo tác động / công sức)

**Giai đoạn 1 — Vá ngay (rủi ro cao, công sức thấp)**
1. Rotate Firebase API key + chuyển sang biến môi trường.
2. Siết lại cơ chế an toàn của `telegram-agent/bot.js` (allowlist thay vì blocklist).
3. `git rm --cached` file `.tar.gz` trong `archive/`.
4. Xóa 18 file `fix_*.cjs`, `update_task.cjs`, file `.patch` rác, `dashboardycx_backup.zip`, `bg_phieu.png` rác ở root.
5. Sửa `AuthContext` dùng `useMemo` (copy pattern từ `LayoutContext`).

**Giai đoạn 2 — Thống nhất tài liệu (công sức thấp, giá trị cao cho làm việc với AI agent về sau)**
6. Xác định 1 bản `DESIGN_SYSTEM.md` chính thức, xóa/archive bản mâu thuẫn.
7. Viết lại `RULES.md` phản ánh đúng 4 khu vực kiến trúc thực tế (`features/bi-dashboard`, `features/phan-ca`, `features/sticker-event`, phần gốc).
8. Gộp `_agents/` vào `.agents/` hoặc xóa nếu không còn dùng.

**Giai đoạn 3 — Migrate UI về design system chung (công sức cao, nên làm dần theo module)**
9. Chọn `shared/ui/Modal` làm chuẩn duy nhất, migrate lần lượt từng modal tự viết.
10. Thay `<button>` thô bằng component `Button` — bắt đầu từ view có nhiều nhất.
11. Bổ sung dark mode cho `phanca.css`/`features/phan-ca`.
12. Chuẩn hóa màu về semantic token (sky/emerald/amber/rose), dọn `styles.css` custom CSS thừa.

**Giai đoạn 4 — Tách god file (công sức cao, làm khi có thời gian)**
13. Tách `services/dbService.ts`, `StickerPrinterView.tsx`, `PhanCaView.tsx`, `usePhanCa.ts`, `BonusTab.tsx` theo domain/trách nhiệm nhỏ hơn.

---

## Phụ lục — số liệu định lượng đã thu thập

- `any` toàn vùng kiểm tra: **321** lượt (nhiều nhất: `features/*` 210, `components/employees` 193)
- `console.log` còn sót: **52** (so với 294 `console.error/warn` hợp lệ)
- `<button>` thô: **438** so với **14** file dùng component `Button` chung
- Modal tự viết riêng lẻ: **40** file, so với 1 hệ `shared/ui/Modal`, 1 hệ `components/modals/ModalWrapper`
- Hardcode màu ngoài palette semantic: **~2687** lượt
- `features/bi-dashboard/`: 18.497 dòng | `components/employees/`: 6.168 dòng/24 file | `services/`: 5.800 dòng (2 god file chiếm 44%)
- `archive/`: 3.3GB trên đĩa, gồm 1 file `.tar.gz` đã lỡ commit vào git
