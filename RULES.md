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
```
dashboardycx/
├── App.tsx                  ← Router chính (tab-based, không dùng react-router)
├── index.tsx                ← Entry point
├── index.html               ← HTML shell
├── styles.css               ← Global CSS + Tailwind imports
├── constants.ts             ← Hằng số toàn cục
├── types.ts                 ← TypeScript types dùng chung
├── contexts/                ← React Context providers (Auth, Layout, Dashboard, Theme)
├── hooks/                   ← Custom hooks — logic nghiệp vụ
├── services/                ← Firebase, API, data processing, print
├── utils/                   ← Pure utility functions
├── components/
│   ├── layout/              ← Shell UI: Sidebar, Header, MobileBottomNav, TopBar
│   ├── views/               ← ⭐ CÁC MODULE CHÍNH (mỗi file = 1 chức năng độc lập)
│   ├── charts/              ← Recharts wrappers
│   ├── tables/              ← Bảng biểu dùng chung
│   ├── filters/             ← Bộ lọc dùng chung
│   ├── modals/              ← Modal/Dialog dùng chung
│   ├── common/              ← ErrorBoundary, Loading, ...
│   └── upload/              ← Upload components
├── bi-module/               ← Module Report BI (sub-project, tách biệt)
├── public/                  ← Static assets (images, fonts, frames)
└── _agents/workflows/       ← Workflow scripts (deploy, etc.)
```

---

## 2. ⭐ KIẾN TRÚC MODULE — QUY TẮC CÁCH LY

### 2.1 Định nghĩa Module
Mỗi View trong `components/views/` là một **module độc lập**:

| Module ID (Tab) | File chính | Mô tả |
|---|---|---|
| `analysis` | `DashboardView.tsx` | Phân tích YCX — biểu đồ, bảng, KPI |
| `check-thuong` | `CheckThuongView.tsx` | Check thưởng nhân viên |
| `employees` | `bi-module/BiWrapper` | Report BI (sub-module riêng) |
| `tools-print-sticker` | `StickerPrinterView.tsx` | In Sticker (Giá Sốc + Giờ Vàng + Event-Tồn kho) |
| `tools-phanca` | `phanca/PhanCaView.tsx` | Phân ca nhân viên |
| `tools-coupon` | `CouponConverterView.tsx` | Chuyển đổi Coupon |
| `tools-tax` | `ExternalToolView` (iframe) | Hoàn thuế (external) |
| `tools-audit` | `ExternalToolView` (iframe) | Kiểm quỹ (external) |
| `settings` | `SettingsView.tsx` | Cài đặt hệ thống |
| `help` | `AboutView.tsx` | Giới thiệu |

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
| 🔴 **CRITICAL** | `App.tsx`, `index.tsx`, `styles.css`, `constants.ts`, `types.ts` | Toàn bộ app | Cực kỳ cẩn thận. Chỉ thêm, không sửa/xóa code cũ |
| 🟠 **SHARED** | `contexts/*`, `services/*`, `hooks/*`, `components/layout/*` | Nhiều module | Kiểm tra tất cả nơi import trước khi sửa |
| 🟢 **ISOLATED** | `components/views/XxxView.tsx` | Chỉ module đó | An toàn sửa, không ảnh hưởng module khác |
| 🟢 **ISOLATED** | `bi-module/*` | Chỉ Report BI | Hoàn toàn tách biệt |

### 2.4 Checklist trước khi sửa file SHARED / CRITICAL

1. **Grep tất cả import**: `grep -r "tên_function_hoặc_file" --include="*.tsx" --include="*.ts"`
2. **Không đổi tên function/interface** đang được export — chỉ thêm mới
3. **Không thay đổi signature** (tham số) của function đang được dùng ở nhiều nơi
4. **Thêm optional parameter** thay vì thay đổi parameter bắt buộc: `newParam?: type`
5. **Build test**: Luôn chạy `npm run build` sau khi sửa file shared

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
