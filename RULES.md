# 📋 PROJECT RULES — DASHBOARD YCX

> Tài liệu bắt buộc đọc trước khi chỉnh sửa bất kỳ file nào trong dự án.
> Mục tiêu: Đảm bảo thay đổi ở Module A **KHÔNG** ảnh hưởng đến Module B.

---

## 1. TỔNG QUAN DỰ ÁN

### Stack công nghệ
| Layer | Công nghệ | Phiên bản |
|---|---|---|
| Framework | React | 19.x |
| Bundler | Vite | 6.x |
| Styling | Tailwind CSS | 4.x (plugin `@tailwindcss/vite`) |
| State | React Context + Hooks (không Redux) | — |
| Auth | Firebase Auth + Firestore | 12.x |
| Icons | lucide-react | 0.577+ |
| Charts | Recharts | 3.x |

### Cấu trúc thư mục

> ⚠️ Dự án thực tế gồm **4 khu vực kiến trúc song song** (Root + 3 `features/*`), không phải 1 hệ thống duy nhất. Xem chi tiết ở mục 2.0.

```
dashboardycx/
├── App.tsx                  ← Router chính (tab-based, không dùng react-router)
├── index.tsx                ← Entry point
├── index.html               ← HTML shell
├── styles.css               ← Global CSS + Tailwind imports + @theme tokens
├── styles/tokens.css        ← Design token 3-tier (Primitive→Semantic→Component) — nguồn chân lý màu/spacing/radius
├── constants.ts             ← Hằng số toàn cục
├── types.ts                 ← TypeScript types dùng chung
├── contexts/                ← React Context providers (Auth, Layout, Dashboard, Sync)
├── hooks/                   ← Custom hooks — CHỈ dùng cho module `analysis`(Dashboard)/`check-thuong`
├── services/                ← Firebase, API, data processing, print — CHỈ dùng cho Root
├── utils/                   ← Pure utility functions dùng CHUNG cho cả 4 khu vực (vd. dataUtils.ts)
├── components/
│   ├── shared/ui/           ← ⭐ BỘ COMPONENT CHUẨN dùng chung cho cả 4 khu vực (Button, Input, Modal, ConfirmDialog, Skeleton, Card, StatCard, Badge, Tabs, Dropdown, Select, DataTable, Tooltip, EmptyState, ProgressBar)
│   ├── layout/              ← Shell UI: Sidebar, Header, MobileBottomNav, TopBar
│   ├── views/               ← ⭐ CÁC MODULE CHÍNH của Root (mỗi file = 1 chức năng độc lập)
│   ├── employees/           ← Phân tích ngành hàng (Dashboard) — khá lớn, cân nhắc tách file khi sửa
│   ├── charts/              ← Recharts wrappers
│   ├── tables/              ← Bảng biểu dùng chung (Root)
│   ├── filters/             ← Bộ lọc dùng chung (Root)
│   ├── modals/              ← Modal/Dialog dùng chung kiểu cũ (Root) — song song với `shared/ui/Modal`, xem mục 2.5
│   ├── common/              ← ErrorBoundary, Loading, ...
│   └── upload/              ← Upload components
├── features/                ← ⭐ 3 KHU VỰC ĐỘC LẬP, mỗi thư mục là 1 "mini-app" riêng — xem mục 2.0
│   ├── bi-dashboard/        ← Report BI (tab `employees`), mount qua BiWrapper
│   ├── phan-ca/             ← Phân ca nhân viên (tab `tools-phanca`), mount qua PhanCaView
│   └── sticker-event/       ← In Sticker (tab `tools-print-sticker`), mount qua StickerPrinterView
├── public/                  ← Static assets (images, fonts, frames)
└── .agents/                 ← Workflow/skill agent (chính thức) — KHÔNG nhầm với `_agents/` (cũ, đã archive)
```

---

## 2. ⭐ KIẾN TRÚC MODULE — QUY TẮC CÁCH LY

### 2.0 Tổng quan 4 khu vực (Zones) — ĐỌC TRƯỚC KHI SỬA BẤT KỲ FILE NÀO

Dự án **THỰC TẾ** gồm 4 khu vực kiến trúc song song, mỗi khu vực phát triển gần như độc lập qua các đợt vibecode khác nhau. Trước khi sửa, luôn xác định bạn đang ở khu vực nào:

| Khu vực | Thư mục | Mount point (`App.tsx`) | Hooks/services riêng | Được dùng chung |
|---|---|---|---|---|
| **Root** | `components/` (trừ `employees`), `hooks/`, `services/`, `contexts/`, `utils/` | Trực tiếp trong `TabContent` (`analysis`, `check-thuong`, `settings`...) | `hooks/*`, `services/*` gốc — CHỈ dành cho `analysis`/`check-thuong` | `components/shared/ui/*` |
| **bi-dashboard** | `features/bi-dashboard/` | `<BiWrapper />` (lazy, preload sớm lúc idle) — tab `employees` | `hooks/`, `store/`, `workers/`, `contexts/` riêng của feature | `components/shared/ui/*`, `utils/dataUtils.ts` |
| **phan-ca** | `features/phan-ca/` | `<PhanCaView />` (lazy) — tab `tools-phanca` | `hooks/`, `services/`, `model/`, `db/` riêng của feature | `components/shared/ui/*`, `utils/dataUtils.ts` |
| **sticker-event** | `features/sticker-event/` | `<StickerPrinterView />` (lazy) — tab `tools-print-sticker` | `hooks/`, `services/` riêng của feature | `components/shared/ui/*` |

**Quy tắc cách ly bắt buộc giữa 4 khu vực:**
- ❌ `features/bi-dashboard`, `features/phan-ca`, `features/sticker-event` **KHÔNG được import chéo lẫn nhau**.
- ❌ `features/*` **KHÔNG được import** `hooks/*` hoặc `services/*` ở gốc — cần logic tương tự thì viết riêng trong chính feature đó.
- ✅ Cả 4 khu vực đều dùng chung đúng 2 thứ: `components/shared/ui/*` (xem mục 2.5) và các hàm thuần trong `utils/dataUtils.ts`.
- ⚠️ Một hàm cùng tên ở 2 khu vực **không mặc nhiên là trùng lặp cần gộp** — ví dụ `features/sticker-event/utils/format.ts:formatCurrency` format đầy đủ "1.200.000 ₫" để in giá lên sticker, khác mục đích với `utils/dataUtils.ts:formatCurrency` chuyên rút gọn "1.2 Tr" cho dashboard. Kiểm tra ngữ cảnh dùng trước khi "dedupe".

### 2.1 Định nghĩa Module
Mỗi View trong `components/views/` (Root) hoặc mỗi `features/*` là một **module độc lập**:

| Module ID (Tab) | File chính | Khu vực | Mô tả |
|---|---|---|---|
| `analysis` | `DashboardView.tsx` | Root | Phân tích YCX — biểu đồ, bảng, KPI |
| `check-thuong` | `CheckThuongView.tsx` | Root | Check thưởng nhân viên |
| `employees` | `features/bi-dashboard/components/BiWrapper` | bi-dashboard | Report BI (feature riêng) |
| `tools-print-sticker` | `features/sticker-event/StickerPrinterView.tsx` | sticker-event | In Sticker (Giá Sốc + Giờ Vàng + Event-Tồn kho) |
| `tools-phanca` | `features/phan-ca/PhanCaView.tsx` | phan-ca | Phân ca nhân viên |
| `tools-coupon` | `CouponConverterView.tsx` | Root | Chuyển đổi Coupon |
| `tools-tax` | `ExternalToolView` (iframe) | Root | Hoàn thuế (external) |
| `tools-audit` | `ExternalToolView` (iframe) | Root | Kiểm quỹ (external) |
| `settings` | `SettingsView.tsx` | Root | Cài đặt hệ thống |
| `help` | `AboutView.tsx` | Root | Giới thiệu |

### 2.2 ⚠️ QUY TẮC VÀNG: Không xâm phạm module khác

```
❌ SAI: Sửa StickerPrinterView.tsx rồi vô tình thay đổi import/export
         trong services/dataService.ts — ảnh hưởng DashboardView.

✅ ĐÚNG: Mỗi lần sửa, chỉ chạm vào file thuộc module đang sửa.
         Nếu buộc phải sửa file dùng chung → kiểm tra tất cả nơi import.
```

### 2.3 Phân loại file theo mức ảnh hưởng

| Cấp độ | File | Ảnh hưởng khi sửa | Cách xử lý |
|---|---|---|---|
| 🔴 **CRITICAL** | `App.tsx`, `index.tsx`, `styles.css`, `styles/tokens.css`, `constants.ts`, `types.ts` | Toàn bộ app | Cực kỳ cẩn thận. Chỉ thêm, không sửa/xóa code cũ |
| 🟠 **SHARED** | `contexts/*`, `services/*`, `hooks/*`, `components/layout/*`, `components/shared/ui/*`, `utils/dataUtils.ts` | Nhiều module / cả 4 khu vực | Kiểm tra tất cả nơi import trước khi sửa (grep cả `features/*`) |
| 🟢 **ISOLATED** | `components/views/XxxView.tsx`, `components/employees/*` | Chỉ Root/Dashboard | An toàn sửa, không ảnh hưởng module khác |
| 🟢 **ISOLATED** | `features/bi-dashboard/*` | Chỉ Report BI | Hoàn toàn tách biệt khỏi 3 khu vực còn lại |
| 🟢 **ISOLATED** | `features/phan-ca/*` | Chỉ Phân ca | Hoàn toàn tách biệt khỏi 3 khu vực còn lại |
| 🟢 **ISOLATED** | `features/sticker-event/*` | Chỉ In Sticker | Hoàn toàn tách biệt khỏi 3 khu vực còn lại |

### 2.4 Checklist trước khi sửa file SHARED / CRITICAL

1. **Grep tất cả import**: `grep -r "tên_function_hoặc_file" --include="*.tsx" --include="*.ts"`
2. **Không đổi tên function/interface** đang được export — chỉ thêm mới
3. **Không thay đổi signature** (tham số) của function đang được dùng ở nhiều nơi
4. **Thêm optional parameter** thay vì thay đổi parameter bắt buộc: `newParam?: type`
5. **Build test**: Luôn chạy `npm run build` sau khi sửa file shared

### 2.5 ⭐ SHARED CORE CONTRACT — bắt buộc cho cả 4 khu vực

Đây là "hợp đồng" tối thiểu mà Root, `bi-dashboard`, `phan-ca`, `sticker-event` đều phải tuân theo, bất kể khu vực đó được viết lúc nào hay bởi đợt vibecode nào. Vi phạm các điều này là nguyên nhân chính khiến giao diện/hành vi giữa các khu vực bị lệch nhau (xem AUDIT.md).

1. **UI component**: Mọi phần tử tương tác (button, modal, input, badge, bảng, dropdown, skeleton loading) BẮT BUỘC dùng `components/shared/ui/*`. Cấm viết mới `<button>` thô hoặc tự dựng modal `fixed inset-0` — dùng `Button`, `Modal`, `ConfirmDialog` có sẵn (xem props tại `components/shared/ui/index.ts`).
2. **Màu & token**: Chỉ dùng bảng màu semantic đã duyệt (`sky`=primary, `slate`=secondary, `emerald`=success, `amber`=warning, `rose`=danger). Cấm khai báo `:root`/custom property CSS mới trong file của `features/*` (nguồn token duy nhất là `styles/tokens.css`). *Lưu ý đã biết*: `styles.css` hiện override `--color-indigo-*` bằng hex của `sky` — một số nơi cố tình dùng `indigo-*` làm alias cho "primary" (đúng ý), một số nơi khác dùng `indigo` như 1 màu riêng biệt trong mảng xoay vòng màu cùng với `sky` (vd. `TargetHero.tsx`, `CompetitionTab.tsx`, `colorTheme` type ở `DataUpdater.tsx`/`SupermarketConfig.tsx`) — 2 nhóm này đang vô tình render giống hệt nhau. **Chưa sửa tự động vì rủi ro làm 2 màu vốn cần phân biệt bị trộn lẫn — khi động tới các nhóm này ở Phase migrate sau, cần xử lý thủ công theo từng trường hợp, không tìm-thay hàng loạt.**
3. **Utils dùng chung**: Format tiền/số/ngày nên tái sử dụng `utils/dataUtils.ts` khi cùng mục đích hiển thị. Nếu một feature cần định dạng khác về bản chất (vd. giá đầy đủ để in vs số rút gọn để xem dashboard), được phép có hàm riêng — nhưng phải đặt tên/comment rõ mục đích khác biệt, không đặt trùng tên `formatCurrency`/`formatNumber` gây nhầm là bản duplicate.
4. **Dark mode**: Mọi class có màu phải có `dark:` tương ứng — không có ngoại lệ theo khu vực. Nếu feature dùng CSS custom property riêng (không phải Tailwind), phải có khối `.dark .ten-scope-class {...}` tương ứng.
5. **Mobile toolbar pattern**: View có toolbar desktop (portal `#global-header-actions`) bắt buộc có toolbar mobile `lg:hidden` tương ứng, theo mẫu `DashboardView.tsx`.

**Checklist cụ thể để tick khi sửa code** nằm ở mục 9.5.

---

## 3. NAVIGATION & ROUTING

### 3.1 Cơ chế hoạt động
- **KHÔNG dùng React Router** — Navigation bằng `activeTab` state trong `LayoutContext`
- Sidebar (`Sidebar.tsx`) và MobileBottomNav (`MobileBottomNav.tsx`) gọi `setActiveTab(id)` 
- `App.tsx > TabContent` render view tương ứng theo `activeTab`

### 3.2 Lazy-mount pattern
```tsx
// Views được lazy-load VÀ persist sau lần mount đầu tiên
// Khi chuyển tab: view cũ KHÔNG unmount, chỉ ẩn bằng CSS
// → Giữ state, tránh re-fetch data

// Active:   className="block relative w-full h-full"
// Inactive: className="absolute left-[-9999px] opacity-0 pointer-events-none"
```

### 3.3 Khi thêm module mới
Cần sửa **đúng 3 file** (không hơn):
1. `App.tsx` — Thêm vào `persistentViews[]` hoặc conditional render + `TAB_TITLES`
2. `Sidebar.tsx` — Thêm menu item vào `menuStructure`
3. `MobileBottomNav.tsx` — Thêm vào `moreTabs[]`

---

## 4. DESIGN SYSTEM

### 4.1 UI Framework
- **Tailwind CSS 4** — Dùng class utility, KHÔNG viết CSS custom trừ `@media print`
- **Không dùng rounded corners mạnh** — Ưu tiên `rounded-lg` hoặc `rounded-xl`, tránh `rounded-3xl`
- **Dark mode**: Luôn thêm class `dark:` cho mỗi element màu sắc

### 4.2 Bảng biểu (Tables)
Tuân thủ `UI_GUIDELINES.md`:
- Border: `border-slate-200 dark:border-slate-700` (1px mỏng)
- Header: Pastel backgrounds (`bg-sky-50`, `bg-emerald-50`, `bg-violet-50`)
- Text: UPPERCASE cho header chính, `text-[11px] font-bold tracking-tight`
- Hover: `hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors`

### 4.3 Portal Pattern
- **Desktop toolbar**: Các view inject controls vào Header qua `createPortal(content, document.getElementById('global-header-actions')!)`
- **Mobile toolbar**: Mỗi view tự render sticky toolbar riêng (`lg:hidden`)
- Khi tạo view mới, luôn implement cả 2 toolbar

### 4.4 Glassmorphism / Pill Style (cho toolbar controls)
```tsx
// Container
className="bg-white/60 dark:bg-slate-900/60 p-1.5 rounded-full border border-slate-200/50 dark:border-slate-700/50 backdrop-blur-xl shadow-sm"

// Active button
className="bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm"

// Inactive button  
className="text-slate-500 hover:text-slate-700 dark:text-slate-400"
```

---

## 5. EXTERNAL TOOLS — IFRAME INTEGRATION

### 5.1 Pattern chuẩn cho tool bên ngoài
```tsx
// Simple iframe (không cần state persistence):
<ExternalToolView url="https://..." title="Tên tool" />

// Embedded iframe with caching (cần giữ state):
// Dùng CSS visibility toggle thay vì conditional render
// Xem StickerPrinterView.tsx → eventEverOpened pattern
```

### 5.2 Các external tool hiện có
| Tool | URL | Cách tích hợp |
|---|---|---|
| Hoàn thuế | `tinhthue-netify-*.run.app` | iframe qua ExternalToolView |
| Kiểm quỹ | `kiemquy-final-*.run.app` | iframe qua ExternalToolView |
| Event-Tồn kho | `stickerevent-final-*.run.app` | Cached iframe trong StickerPrinterView |

---

## 6. STATE MANAGEMENT

### 6.1 Context Providers
| Context | Phạm vi | Chức năng |
|---|---|---|
| `AuthContext` | Toàn app | User auth, role, login/logout |
| `LayoutContext` | Toàn app | activeTab, sidebar state, dark mode |
| `DashboardContext` | DashboardView | Data upload, filter state |
| `ThemeContext` | Toàn app | Theme preferences |

### 6.2 Custom Hooks
- Hooks trong `hooks/` chỉ dùng cho module `analysis` (Dashboard) và `check-thuong`
- **KHÔNG** import hooks của Dashboard vào module Sticker/Phanca/Coupon
- Mỗi module tự quản lý state riêng bằng `useState` / `useReducer` nội bộ

### 6.3 Services
- `firebase.ts` — Firebase init (SHARED, không sửa)
- `firestoreService.ts` — Firestore CRUD (SHARED)
- `dbService.ts` — IndexedDB persistence (SHARED)
- Các service khác (`dataService`, `filterService`, `kpiService`, ...) chỉ dùng cho DashboardView

---

## 7. CODING PATTERNS BẮT BUỘC

### 7.1 Performance
```tsx
// ✅ Dùng React.memo cho component nặng
const HeavyComponent = React.memo(() => { ... });

// ✅ Dùng useMemo cho computed data
const sortedData = useMemo(() => data.sort(...), [data]);

// ✅ Dùng useCallback cho handler truyền xuống child
const handleClick = useCallback(() => { ... }, [deps]);

// ✅ Dùng lazy() cho Views
const MyView = lazy(() => import('./components/views/MyView'));
```

### 7.2 TypeScript
- Luôn khai báo type cho props interface
- Export types cần thiết từ `types.ts` (shared) hoặc local file (isolated)
- **Không dùng `any`** trừ khi parse dữ liệu Excel raw

### 7.3 Comments & Documentation  
- Giữ nguyên tất cả comment và docstring hiện có khi sửa code
- Thêm `// FIXME:` hoặc `// TODO:` cho code cần xử lý sau
- Mô tả logic phức tạp bằng comment tiếng Việt hoặc tiếng Anh đều được

---

## 8. DEPLOYMENT

### 8.1 Quy trình deploy
```bash
# Bước 1: Sync source code
git add -A
git commit -m "chore: sync source code and deploy latest web changes"
git push origin main

# Bước 2: Build & deploy to GitHub Pages
npm run deploy
```

### 8.2 Pre-deploy checklist
- [ ] `npm run build` thành công (không lỗi TypeScript)
- [ ] Không có `console.log` debug còn sót
- [ ] Test trên cả Desktop và Mobile viewport
- [ ] Kiểm tra Dark mode

---

## 9. QUY TẮC AN TOÀN KHI SỬA CODE

### 9.1 Nguyên tắc "Scope nhỏ nhất"
```
Mỗi PR/commit chỉ nên sửa 1 module tại 1 thời điểm.
Nếu cần sửa 2 module → tách thành 2 commit riêng biệt.
```

### 9.2 Bảng kiểm tra ảnh hưởng chéo

Trước khi sửa, tự hỏi:

| Câu hỏi | Nếu CÓ → Hành động |
|---|---|
| File này được import ở module khác? | Grep toàn bộ project, kiểm tra ảnh hưởng |
| Mình đang thay đổi interface/type? | Kiểm tra tất cả nơi sử dụng type đó |
| Mình đang sửa CSS global? | Kiểm tra tất cả views có class bị ảnh hưởng |
| Mình đang sửa Context Provider? | Tất cả consumer sẽ re-render — cân nhắc kỹ |
| Mình đang thêm dependency mới? | Kiểm tra bundle size impact |

### 9.3 Rollback
- Dự án dùng Git — luôn có thể `git stash` hoặc `git checkout -- <file>` để rollback
- Backup ZIP được tạo định kỳ tại root project (`dashboardycx_backup_*.zip`)

### 9.4 Cách ly phạm vi & Quy trình báo cáo sửa đổi
- **Cách ly phạm vi (Không ảnh hưởng chéo)**: Khi sửa code theo yêu cầu, chỉ tác động đúng file và tính năng được yêu cầu, tuyệt đối không làm ảnh hưởng đến tính năng hay mã nguồn của các khu vực/chức năng khác trong hệ thống.
- **Quy trình báo cáo hoàn tất**: Tất cả yêu cầu khi hoàn tất cần được báo cáo rõ ràng:
  1. Mô tả lại yêu cầu của người dùng.
  2. Nêu rõ các bước thực hiện và chi tiết mỗi bước đã thay đổi mã nguồn như thế nào.
  3. Trình bày cách hoạt động của tính năng mới/sau khi sửa.
  4. Thực hiện kiểm tra (Typecheck/Lint/Build) để đảm bảo dự án không phát sinh lỗi trước khi báo cáo.

### 9.5 Shared Core Contract Checklist (tick trước khi báo cáo hoàn tất bất kỳ thay đổi UI nào)

- [ ] Không thêm `<button>` thô / modal `fixed inset-0` mới — dùng `components/shared/ui/*`.
- [ ] Màu dùng đúng scale semantic (sky/slate/emerald/amber/rose) — không thêm màu ngoài danh sách đã duyệt.
- [ ] Mỗi class màu có `dark:` cặp tương ứng.
- [ ] Không tạo `:root`/custom property CSS mới trong file của `features/*` — dùng token có sẵn ở `styles/tokens.css`.
- [ ] Format tiền/số/ngày dùng hàm chung `utils/dataUtils.ts` nếu cùng mục đích hiển thị; nếu viết hàm riêng vì khác mục đích, đặt tên rõ ràng không trùng tên hàm chung.
- [ ] View có toolbar desktop (portal) phải có toolbar mobile `lg:hidden` tương ứng.
- [ ] Không import chéo giữa `features/bi-dashboard`, `features/phan-ca`, `features/sticker-event`; không import `hooks/`/`services/` gốc từ `features/*`.
- [ ] Chạy `npm run check` (typecheck + build) + `npx eslint .` trước khi báo cáo hoàn tất.

---

## 10. MOBILE RESPONSIVE

### 10.1 Breakpoints
- Mobile: `< 1024px` (tự detect qua `window.innerWidth < 1024`)
- Desktop: `≥ 1024px` (`lg:` prefix trong Tailwind)

### 10.2 Quy tắc mobile
- **Không ẩn tính năng** — Tất cả chức năng desktop phải có trên mobile
- Sidebar ẩn → dùng `MobileBottomNav` thay thế
- Header portal không hiển thị → dùng sticky toolbar riêng (`lg:hidden`)
- Table scroll ngang → wrap trong `overflow-x-auto`
- Touch targets tối thiểu `44x44px`

---

## 11. FILE QUAN TRỌNG — KHÔNG SỬA NẾU KHÔNG CẦN

| File | Lý do |
|---|---|
| `services/firebase.ts` | Firebase config — sửa = mất kết nối toàn app |
| `contexts/AuthContext.tsx` | Auth flow — sửa = ảnh hưởng login toàn app |
| `contexts/LayoutContext.tsx` | Navigation — sửa = ảnh hưởng routing toàn app |
| `index.html` | HTML shell — sửa = ảnh hưởng SEO, fonts, meta |
| `vite.config.ts` | Build config — sửa = ảnh hưởng build/deploy |
| `package.json` | Dependencies — chỉ thêm, không xóa/upgrade lớn |
