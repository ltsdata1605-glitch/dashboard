# API.md

## Mục tiêu

Chuẩn hóa cách gọi service/dữ liệu để tránh mỗi module tự gọi và tự xử lý dữ liệu một kiểu.

**Lưu ý quan trọng (audit 2026-07-05):** Dự án này **không có backend/API server riêng**.
Không có `apiClient.ts`, không có REST endpoint nội bộ, không có `ApiResponse<T>` envelope.
Toàn bộ "API layer" thực chất là:

1. **Firebase SDK** (Firestore + Auth) gọi trực tiếp từ client — xem `DATABASE.md` để
   biết chi tiết collection/document.
2. **Parser client-side** cho file Excel/CSV người dùng upload — đây là nguồn dữ liệu
   chính của toàn app, không phải gọi API.
3. Một số **REST API bên thứ 3** gọi trực tiếp bằng `fetch()` (không qua service layer
   tập trung): Google Sheets API (xuất báo cáo), Google Gemini API (`@google/genai`).

---

## Cấu trúc service thật (không phải cấu trúc lý thuyết)

```txt
services/                          # Dùng chung cho Root — KHÔNG được import bởi features/*
├── firebase.ts                    # Khởi tạo Firebase app, export `db`, `auth`
├── firestoreService.ts            # CRUD cho users/, shared_configs/ (config, schedule...)
├── dbService.ts                   # Wrapper IndexedDB (qua `idb`) — cache Excel đã parse
├── cloudDataService.ts            # Đồng bộ dữ liệu doanh thu lên users/{uid}/salesData
├── dataService.ts                 # Xử lý/transform dữ liệu chung
├── employeeService.ts             # Logic liên quan nhân viên (Root)
├── filterService.ts               # Helper filter dùng chung (Root)
├── industryService.ts             # Logic ngành hàng/nhóm hàng
├── kpiService.ts / metricService.ts / summaryService.ts / trendService.ts
│                                   # Tính toán/tổng hợp số liệu cho KPI card, biểu đồ
├── notificationService.ts         # Đọc/ghi users/{uid}/notifications
├── syncService.ts                 # Đồng bộ trạng thái user (lastActive...)
├── googleSheetsService.ts         # Gọi TRỰC TIẾP Google Sheets REST API bằng fetch()
│                                   # (dùng OAuth token người dùng, không qua service layer)
├── checkThuongIframeService.ts    # Cầu nối IndexedDB cùng-origin cho iframe "Check thưởng"
│                                   # (tool ngoài nhúng qua iframe, KHÔNG phải REST API)
├── parsers/                       # Parser Excel/CSV → object nội bộ (camelCase)
├── analytics.worker.ts / worker.ts  # Web Worker xử lý tính toán nặng, tránh block UI thread
└── (KHÔNG có apiClient.ts, KHÔNG có ApiResponse<T> — không cần vì không có backend riêng)
```

Mỗi zone cách ly (`features/bi-dashboard`, `features/phan-ca`, `features/sticker-event`)
có **service riêng của zone đó**, ví dụ `features/sticker-event/services/firebaseService.ts`
(đọc/ghi collection `stores/{storeId}`). Theo `RULES.md` §2.0, các zone này **không được
import `services/` gốc** — ESLint rule `import/no-restricted-paths` chặn việc này.

---

## Nguyên tắc chung

- Không gọi `fetch()`/Firebase SDK trực tiếp rải rác trong UI component nếu đã có service
  tương ứng — ngoại lệ đã chấp nhận: 1 số component gọi thẳng Firestore cho thao tác đơn
  giản, 1-lần (xem ví dụ thực tế trong `contexts/AuthContext.tsx`, `hooks/useSystemTraffic.ts`)
  — không bắt buộc phải bọc mọi câu lệnh Firestore vào service nếu chỉ dùng ở đúng 1 nơi.
- Response Firestore trả về `DocumentSnapshot`/`QuerySnapshot` — luôn `.data()` rồi ép kiểu
  qua TypeScript interface (định nghĩa trong `types.ts` hoặc `types/nhanVienTypes.ts` theo
  zone) trước khi đưa vào UI, không truyền `DocumentData` thô.
- Không hardcode API key/token trong source. Firebase config đọc qua biến môi trường
  `VITE_FIREBASE_*` (xem `.env.example` nếu có, hoặc `services/firebase.ts`).
- Google Sheets API cần OAuth token của người dùng hiện tại (không dùng service account) —
  token lấy từ luồng đăng nhập Google, không lưu token vào Firestore/localStorage lâu dài.

---

## Error handling (pattern thật đang dùng)

Không có `normalizeApiError()` dùng chung. Pattern thực tế trong toàn bộ codebase:

```ts
try {
    await someFirestoreCall();
    toast.success('Đã lưu thành công!');
} catch (error) {
    console.warn('Mô tả ngắn lỗi:', error); // console.warn, không phải console.error
    toast.error('Có lỗi xảy ra, vui lòng thử lại.');
}
```

- Dùng `react-hot-toast` để báo lỗi/thành công cho người dùng — không tự dựng error banner
  riêng cho từng màn hình.
- Lỗi `permission-denied` từ Firestore (thường gặp ở Chế Độ Dùng Thử/demo mode vì không có
  quyền Firebase Auth thật) được xử lý bằng cách bắt riêng `error?.code === 'permission-denied'`
  và hiển thị thông báo phù hợp, không throw tiếp ra UI (xem ví dụ:
  `components/views/UserManagementView.tsx`).
- Đây là nợ kỹ thuật đã biết: error handling rải rác theo pattern giống nhau ở nhiều nơi
  nhưng chưa gom về 1 helper dùng chung — có thể cân nhắc khi làm Phase 6 (Cleanup).

---

## Excel/CSV parsing (nguồn dữ liệu chính — không phải "API" nhưng đóng vai trò tương đương)

Vì đây là nguồn dữ liệu chính của app, coi tầng parser như "API layer" thật sự cần chuẩn hóa:

- File `.xlsx`/`.xls` parse bằng thư viện `xlsx`; `.csv` bằng `papaparse`.
- Mỗi zone có parser riêng phù hợp định dạng file của zone đó
  (VD: `services/parsers/` ở Root cho file YCX; `features/bi-dashboard/utils/dashboardHelpers.ts`,
  `features/phan-ca/utils/scheduleUtils.ts`, `features/sticker-event/services/fileParser.ts`).
- Parser phải luôn map tên cột Excel gốc (tiếng Việt, do người dùng đặt) sang field nội bộ
  `camelCase` cố định — không để tên cột thô rò rỉ vào UI hoặc logic tính toán.
- Dữ liệu lớn nên xử lý qua Web Worker (`analytics.worker.ts`, `worker.ts`) để tránh treo UI
  khi parse/tính toán file hàng chục nghìn dòng.

---

## Checklist

- [ ] Không gọi Firebase SDK trực tiếp trong UI nếu đã có service tương ứng cho use-case đó.
- [ ] Firestore document luôn ép kiểu qua TypeScript interface trước khi dùng ở UI.
- [ ] Lỗi luôn có `try/catch` + thông báo `toast` cho người dùng, không nuốt lỗi âm thầm.
- [ ] Không hardcode Firebase config/API key/token trong source.
- [ ] Zone `features/*` không import `services/` gốc (ESLint chặn, xem `RULES.md` §2.0).
- [ ] Parser Excel/CSV map cột tiếng Việt sang field `camelCase` ngay tại tầng parser.
- [ ] Dữ liệu lớn xử lý qua Web Worker nếu có thể, tránh block UI thread.
