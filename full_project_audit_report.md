# ANTIGRAVITY — FULL PROJECT AUDIT & STANDARDIZATION REPORT

**Role**: Lead Product Architect + Senior UX/UI Designer + Principal Software Engineer + System Auditor  
**Date**: May 2026  
**Target**: Antigravity Project (`dashboardycx`)

---

## EXECUTIVE SUMMARY

Dự án Antigravity hiện đang ở giai đoạn phát triển nhanh (rapid prototyping) với nhiều module phức tạp như Phân Ca, Sticker Event, Reports, và BI Dashboard. Quá trình phát triển nhanh này đã dẫn đến một hệ quả tất yếu: **Technical Debt (Nợ Kỹ Thuật) và UX/UI Inconsistency (Sự thiếu đồng bộ trong trải nghiệm người dùng)**.

Mục tiêu của báo cáo này là soát xét toàn diện hệ thống, từ lớp UI/UX bề mặt cho đến kiến trúc mã nguồn và quản lý state sâu bên trong, nhằm vạch ra một lộ trình chuẩn hóa (Standardization Roadmap). Việc này sẽ giúp dự án chuyển mình từ trạng thái "phát triển ngẫu hứng" sang một "sản phẩm Enterprise-grade" đồng bộ, dễ bảo trì và có khả năng mở rộng (scalable).

### GLOBAL METRICS DASHBOARD
- 🎨 **Global Consistency Score**: 45/100 (Thiếu Design Token, trùng lặp style cục bộ)
- 🏗️ **Architecture Health Score**: 55/100 (Phân mảnh thư mục, lạm dụng IndexedDB rải rác)
- 🧠 **UX Professionalism Score**: 60/100 (Thiếu chuẩn chung về empty/loading states)
- 🚀 **Scalability Readiness Score**: 50/100 (Thiếu Shared UI Library và Service Layer)

---

## 1. UI CONSISTENCY AUDIT

Hệ thống UI hiện tại đang sử dụng Tailwind CSS trực tiếp vào `className` ở khắp mọi nơi. Việc này dẫn đến việc một nút bấm (Button) hay Modal có thể có đến 5-6 biến thể khác nhau về màu sắc, bo góc (border-radius), và shadow.

| UI Element | Current Issue | Why It’s Bad | Recommended Standard | Suggested Component Architecture | Refactor Priority |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Buttons** | Đuôi class dài (`px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg...`), lặp lại ở mọi nơi. Có nơi `rounded-lg`, nơi `rounded-full`, nơi `rounded-md`. | Khó thay đổi hàng loạt, tạo cảm giác "chắp vá" cho người dùng. | Tạo `<Button />` component với các `variant` (primary, secondary, ghost, danger) và `size` (sm, md, lg). | `components/ui/Button.tsx` (dùng `cva` hoặc `clsx`). | 🔴 High |
| **Modals** | Code Modal bị lồng (inline) trực tiếp trong các View (`KiemQuyView`, `TargetHero`). Có nơi dùng overlay `bg-black/50`, nơi dùng `bg-slate-900/40 backdrop-blur-sm`. | Gây phình to file component chính (God component). Thiếu animation đóng/mở chuẩn mực. | Tạo `<Modal />` wrapper tái sử dụng (hỗ trợ AnimatePresence, click outside, ESC to close). | `components/ui/Modal.tsx` | 🔴 High |
| **Tables** | Tồn tại bảng `IndustryTableUtils`, `PerformanceSingleTable`, `HeadToHeadTable`... lặp lại logic sticky header và padding `px-2 py-1`. | Duplicated code khổng lồ, logic sắp xếp (sort) và format số lặp lại ở nhiều nơi. | Tạo `<Table />`, `<Tr />`, `<Td />` abstraction. Gom chung logic `Intl.NumberFormat`. | `components/ui/Table/` | 🟡 Medium |
| **Cards/Tiles** | Các thẻ `StatusTile` tự định nghĩa mảng `themeColors` (emerald, sky, rose...) lặp lại trong file. | Hardcode màu, nếu đổi brand color sẽ phải tìm và thay thế (Find & Replace) rất mệt mỏi. | Khai báo Design Token trong `tailwind.config.ts` thay vì hardcode mảng màu. | `components/ui/Card.tsx` | 🟡 Medium |
| **Empty/Loading** | Nơi thì hiển thị text "Trống", nơi dùng icon AlertTriangle, nơi không hiện gì. | UX rời rạc, làm người dùng bối rối khi dữ liệu trống. | `<EmptyState />` component với title, description, icon prop chuẩn. | `components/ui/EmptyState.tsx` | 🟢 Low |

---

## 2. UX FLOW AUDIT

### Phát hiện các luồng rời rạc:
- **Confirmation Flow**: Đang sử dụng `window.confirm()` mặc định của trình duyệt (`if(confirm('...'))`) cho những action quan trọng (ví dụ: Reset Target, Xoá Lịch Sử). **Root cause:** Thiếu component `<ConfirmDialog />`. Điều này làm giảm tính chuyên nghiệp của UX vì `window.confirm` chặn main thread và không ăn nhập với UI hệ thống.
- **Form Experience**: Ở chức năng Kiểm Quỹ, khi nhập số xong, người dùng ấn Enter nhảy xuống ô tiếp theo là rất tốt. Tuy nhiên, các Modal khác như Tạo Bộ Phận, Nhập Target lại thiếu behavior phím Enter để "Lưu".
- **Feedback States (Toast)**: Tồn tại cả thư viện `react-hot-toast` (trong App) và tự viết component `<Toast />` cục bộ (trong SupermarketConfig). Sự xung đột này khiến lúc hiện thông báo góc phải, lúc hiện ở giữa, lúc tự tắt lúc không.

### Chuẩn hóa UX Rules:
1. **No Native Modals**: CẤM sử dụng `window.alert`, `window.confirm`, `window.prompt`. Thay thế hoàn toàn bằng hệ thống `<ConfirmDialog />` và `<AlertDialog />`.
2. **Unified Notification**: Chỉ sử dụng DUY NHẤT một hệ thống Toast (Khuyến nghị giữ `react-hot-toast` và xóa component `<Toast />` tự viết).
3. **Keyboard Accessibility**: Tất cả các Form phải hỗ trợ submit bằng `Enter`. Các Modal phải đóng được bằng `Escape`.
4. **Destructive Actions**: Mọi hành động xoá (Delete/Remove/Reset) đều bắt buộc phải hiển thị Confirm Dialog kèm nút Submit màu Đỏ (`danger`).

---

## 3. LOGIC & FUNCTION CONSISTENCY AUDIT

### Phân tích nợ kỹ thuật Logic (Technical Debt)
1. **Lạm dụng IndexedDB (State Mutation Risks)**: Hook `useIndexedDBState` đang được khởi tạo vô tội vạ ở cấp độ component (`TargetHero`, `SupermarketConfig`, `KiemQuyView`). Khi component re-render nhiều lần, nó tạo ra áp lực I/O cực lớn lên trình duyệt.
   - *Conflict*: Dữ liệu cấu hình nhân viên bị parse (tách dòng, filter) lặp đi lặp lại bên trong `useMemo` ở cả 2 file `SupermarketConfig.tsx` và `TargetHero.tsx`. Nếu 1 file cập nhật luật filter, file kia sẽ bị lệch logic (Inconsistent Validation).
2. **Massive Component (God Component)**: File `SettingsView.tsx` (50,000+ bytes) và `StickerPrinterView.tsx` (75,000+ bytes) đang chứa toàn bộ Business Logic, UI, Modal, State, Event Handlers. 
   - *Risk*: Rất khó debug, dễ gây regression (sửa lỗi này sinh lỗi kia).
3. **Data Parsing Hardcoding**: Rất nhiều logic split string dựa trên text cứng: `!l.startsWith('Hỗ trợ BI')`, `!l.startsWith('ĐML_STR_STR')`.
   - *Risk*: Bất kỳ một thay đổi nhỏ nào trong file Excel/Text nguồn từ hệ thống nội bộ sẽ làm gãy toàn bộ Dashboard.

### Đề xuất chuẩn hóa:
- **Domain-Driven Design (DDD)**: Đưa toàn bộ logic parse string (`.split('\t')`) ra khỏi các file UI Components và chuyển vào thư mục `services/parsers/`. 
- **Centralized Store**: Thay vì để mỗi component tự chọc vào IndexedDB qua hook, hãy dùng Zustand hoặc Redux Toolkit làm Global Store, sync với IndexedDB thông qua một Middleware duy nhất để chống Race Conditions.

---

## 4. CODE ARCHITECTURE AUDIT

### Tình trạng Folder Structure hiện tại:
Cấu trúc đang bị phân mảnh nghiêm trọng:
```text
├── bi-module/
│   ├── components/
│   ├── hooks/
│   └── utils/
├── components/
│   ├── views/
│   └── ...
├── hooks/
├── services/
└── utils/
```
Module `bi-module` đứng riêng nhưng lại thực hiện cùng chức năng hiển thị UI như các component ngoài root. Điều này sinh ra *Duplicate Modules*. Chẳng hạn `components/Icons.tsx` và `bi-module/components/Icons.tsx` có thể đang lặp lại.

### Đề xuất Kiến trúc mới (Feature-Based Architecture):
Chuyển sang kiến trúc module hướng tính năng (Feature Slices):
```text
src/
├── core/                  # Code dùng chung toàn cục (Auth, API config)
├── shared/                # Design System UI Components (Button, Modal, Table)
│   ├── ui/
│   ├── hooks/
│   └── utils/
├── features/              # Các chức năng độc lập (Feature-based)
│   ├── bi-dashboard/      # Gom toàn bộ bi-module vào đây
│   ├── phan-ca/           # Gom từ components/views/phanca
│   ├── sticker-event/     # Gom từ components/views/stickerevent
│   └── cash-control/      # KiemQuyView.tsx
└── app/                   # App.tsx, Routes, Global Layouts, Context Providers
```

---

## 5. DESIGN SYSTEM PROPOSAL (ANTIGRAVITY UI)

Tạo một Design System chung (dựa trên Tailwind) để áp dụng toàn dự án:

1. **Color Tokens**:
   - `primary`: Tông `sky` (sky-500 đến sky-700) dùng cho action chính.
   - `secondary`: Tông `slate` (slate-100 đến slate-800) dùng cho viền, text, background phụ.
   - `success`: `emerald-500` (Khớp, Tốt, Xong).
   - `warning`: `amber-500` (Cảnh báo, Đang chờ).
   - `danger`: `rose-500` (Thiếu, Lỗi, Xoá).

2. **Typography Scale** (Phông SVN-Gilroy / Inter):
   - `text-xs (12px)`: Metadata, Subtitles.
   - `text-sm (14px)`: Base text, Table content.
   - `text-base (16px)`: Buttons, Inputs.
   - `text-xl (20px)`: Card Titles.

3. **Border Radius (Bo góc)**:
   - `rounded-md (6px)`: Buttons, Inputs, Tooltips.
   - `rounded-xl (12px)`: Cards, Modals.
   - `rounded-none (0px)`: Data Tables (Tạo cảm giác phẳng, chuyên nghiệp).

4. **Shadow System**:
   - Dừng việc lạm dụng đổ bóng đậm. Sử dụng Shadow siêu mỏng: `shadow-sm` cho Cards, `shadow-xl` cho Modals/Dropdowns. Khuyến khích viền mỏng (`border border-slate-200`) hơn là bóng đổ.

---

## 6. PRODUCT STANDARDIZATION RULEBOOK

> **Quy tắc Vàng cho Team Dev (ANTIGRAVITY Consistency Rules)**

1. **Naming Rules**: 
   - Files UI bắt buộc là PascalCase (`Button.tsx`).
   - Hooks bắt buộc là camelCase có chữ `use` (`useCloudSync.ts`).
   - Utilities bắt buộc là camelCase (`dataUtils.ts`).
2. **Form Rules**: Mọi thẻ `<input>` đều phải được bọc trong component `<Input />` của Design System. Không hardcode style `ring`, `border` trực tiếp trong View.
3. **Modal Rules**: Content bên trong Modal nếu dài phải cuộn bên trong thân (`overflow-y-auto`), không bao giờ để Modal kéo giãn làm mất Header và Footer khỏi tầm nhìn.
4. **Data Table Rules**: Header bảng luôn viết HOA (`uppercase tracking-wider text-[11px]`). Nền header nhóm chính dùng Pastel. Row khi hover đổi sang màu nền xám nhạt (`bg-slate-50`).
5. **Loading Rules**: Không hiện Text "Loading...". Bắt buộc sử dụng `<Skeleton />` layout tương ứng với component sắp được load.

---

## 7. TECHNICAL DEBT REPORT

| Cấp độ | Vấn đề cốt lõi (Root Cause) | Hậu quả (Risk) | Khắc phục (Solution) |
| :---: | :--- | :--- | :--- |
| **CRITICAL** | God Components (`SettingsView.tsx`, `StickerPrinterView.tsx`) trên 1,000 dòng code. | Rất dễ tạo conflict khi merge code, IDE chậm, không thể test độc lập. | Tách nhỏ thành các component con và custom hooks. |
| **CRITICAL** | Logic Parse String cứng rải rác (`split('\t')`, `!startsWith('BP')`) nằm trong component UI (`TargetHero`). | Nguồn data thay đổi format 1 cột sẽ làm trắng xoá toàn bộ Dashboard (Crash). | Đẩy parser logic vào 1 file Service chuyên trách. |
| **HIGH** | `useIndexedDBState` gây spam write I/O. Các component update IDB riêng rẽ tạo Race Conditions. | Performance trên máy yếu sẽ bị giật lag, treo trình duyệt khi update data lớn. | Dùng Zustand cache state in-memory, debounce lưu xuống IDB. |
| **MEDIUM** | Dùng chung 2 loại Toast (`react-hot-toast` và tự chế). Các nút Confirm dùng `window.confirm()`. | UX không đồng bộ, trông giống app nghiệp dư. | Chuẩn hóa dùng 1 thư viện Toast. Tạo Dialog Component. |
| **LOW** | `bi-module` chứa một bản sao của hệ thống hooks/components. | Trùng lặp code base, tốn công bảo trì 2 chỗ. | Merge vào cấu trúc `src/shared/ui` chung. |

---

## 8. REFACTOR ROADMAP

Để đưa hệ thống về chuẩn, cần thực hiện theo các bước sau, TUYỆT ĐỐI không làm cùng lúc tránh gãy ứng dụng (Downtime).

### **Phase 1: Critical Stabilization & UI Core (Ưu tiên Cao - 2 Tuần)**
- **Mục tiêu**: Loại bỏ code thừa, tạo móng UI.
- **Tasks**:
  1. Xây dựng thư mục `shared/ui` chứa: `<Button />`, `<Input />`, `<Modal />`, `<ConfirmDialog />`.
  2. Xóa các component UI tự chế cục bộ (Toast tự viết, Button dài dòng class).
  3. Thay thế toàn bộ `window.confirm` thành `<ConfirmDialog />`.

### **Phase 2: Logic Decoupling (Ưu tiên Cao - 2 Tuần)**
- **Mục tiêu**: Tách Business Logic ra khỏi UI.
- **Tasks**:
  1. Tách logic parse Data (TSV/Excel) từ `TargetHero`, `SupermarketConfig` ra file `services/parsers/employeeParser.ts`.
  2. Gom logic tính toán `combinedDepts` vào một Custom Hook duy nhất `useDepartments()`.
  3. Chia nhỏ `SettingsView.tsx` thành `SettingsTabs`, `SettingsForm`, `SettingsActions`.

### **Phase 3: State Management Overhaul (Ưu tiên Trung bình - 3 Tuần)**
- **Mục tiêu**: Tối ưu hiệu năng, giảm tải IndexedDB.
- **Tasks**:
  1. Áp dụng `Zustand` làm global store quản lý cấu hình.
  2. `useIndexedDBState` sẽ chỉ đóng vai trò là persist layer (lưu trữ bất đồng bộ dưới background), component chỉ đọc từ RAM (Zustand) để UI mượt mà 60fps.

### **Phase 4: Architecture Refactor (Ưu tiên Trung bình - 2 Tuần)**
- **Mục tiêu**: Gom nhánh rẽ `bi-module` về kiến trúc Feature-Based.
- **Tasks**:
  1. Di chuyển toàn bộ views vào `features/`.
  2. Định tuyến lại hệ thống routing và imports.
  3. Clean up `node_modules` imports thừa.

### **Phase 5: Design System Migration (Optimization - 2 Tuần)**
- **Mục tiêu**: Thống nhất toàn bộ màu sắc, typography bằng Design Token.
- **Tasks**:
  1. Đưa `themeColors` vào `tailwind.config.ts`.
  2. Tạo bộ tài liệu nội bộ Storybook (hoặc Markdown chi tiết) cho team dev.

---

*Hết báo cáo.*
