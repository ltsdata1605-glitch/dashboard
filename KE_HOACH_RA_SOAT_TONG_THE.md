# KẾ HOẠCH RÀ SOÁT TỔNG THỂ — DASHBOARD YCX
> Lập ngày 07/07/2026 trên nhánh `ui-rebuild-v1`. Mỗi mục "PROMPT" bên dưới là 1 khối
> văn bản độc lập — copy nguyên khối dán vào Antigravity cho Claude xử lý từng đợt.
> Làm **tuần tự theo thứ tự** (Đợt 0 → 1 → 2 → 3). Không nhảy cóc.

---

## A. HIỆN TRẠNG THẬT ĐÃ ĐO (07/07/2026)

Trạng thái đã **tốt hơn nhiều** so với `AUDIT.md` (04/07) — nhánh `ui-rebuild-v1` đã làm phần lớn việc migrate UI:

| Chỉ số | AUDIT cũ (04/07) | Thực tế bây giờ | Nhận xét |
|---|---|---|---|
| Lỗi typecheck | — | **0** | ✅ Xanh |
| ESLint | — | **0 error / 12 warning** (9 tự fix được) | ✅ Rất sạch |
| `<button>` thô | 438 | **3** (đều hợp lệ) | ✅ Đã migrate xong |
| `shared/ui/Modal` được dùng | 1 file | **41 file** | ✅ Đã migrate phần lớn |
| `ModalWrapper` cũ còn lại | ~12 | **1 file** | 🟡 Gần xong |
| `fixed inset-0` tự viết | 40 | **30** | 🟠 Còn ở features/* |
| `styles/tokens.css` | không import | **đã import** vào styles.css | ✅ Đã sửa |
| `console.log` sót | 52 | **55** | 🟠 Còn |
| `any` | 321 | **359** | 🔴 Nợ lớn nhất còn lại |
| Màu ngoài palette semantic | ~2687 | **1202** | 🟠 Còn (root 606, bi-dashboard 314, sticker 226, phan-ca 56) |
| File chết `.patch` | có | **vẫn còn** 1 (`useIndustryAnalysisLogic.ts.patch`) | 🟢 Xóa nhanh |

**Kết luận:** phần lớn việc "chuẩn hóa UI component" (nút, modal) đã xong. 3 nhóm việc còn lại khớp đúng 3 yêu cầu của bạn:
1. **Code sạch / dọn thừa / chuẩn** → `any` (359), `console.log` (55), file chết, god file, 30 modal tự viết ở features.
2. **Logic tính toán đồng nhất (⚠️ VIỆC QUAN TRỌNG NHẤT — chưa ai làm)** → công thức Doanh thu Quy đổi (DTQĐ) bị tính lệch nhau giữa các khu vực.
3. **Đồng nhất thiết kế theo chuẩn "Phân Tích"** → 1202 chỗ màu lệch palette + dark mode phan-ca.

### ⚠️ Phát hiện nghiêm trọng nhất (task #2 — sai số tính toán)
Công thức chuẩn nằm ở `utils/dataUtils.ts → calculateRowMetrics()`:
```
DTQĐ = doanh_thu × hệ_số_quy_đổi + (30% × doanh_thu  NẾU là đơn Trả góp/Trả chậm)
```
Nhưng **chỉ 3 file dùng hàm chuẩn** (`summaryService`, `employeeService`, `filterService`). Còn **~9 file tự tính lại** và **bỏ sót phần +30% trả góp**, thậm chí sai cả công thức gốc:

| Nơi tính | Công thức đang dùng | +30% trả góp | Base doanh thu |
|---|---|:---:|---|
| `calculateRowMetrics` (CHUẨN) | `price×heso + 30% nếu trả góp` | ✅ | `price` |
| `components/charts/TrendChart.tsx` | `price×heso` | ❌ thiếu | `price` |
| `hooks/useHeadToHeadLogic.ts` | `price×heso` | ❌ thiếu | `price` |
| `components/employees/industry/useIndustryAnalysisLogic.ts` | `price×heso` | ❌ thiếu | `price` |
| `components/tables/summary/CrossSellingTable.tsx` | `price×qty×heso` | ❌ thiếu | ⚠️ `price×qty` (nghi **nhân đôi** vì price đã là thành tiền) |

Số lượng quy đổi (`weightedQuantity`) cũng đang được tính **3–4 kiểu khác nhau** (có/không xét bảo hiểm, có/không `vasMultiplierMap`). → Đây là nguyên nhân gây lệch số giữa các bảng/biểu đồ.

---

## B. NGUYÊN TẮC ÁP DỤNG CHO MỌI PROMPT (đã nhúng sẵn trong từng prompt)
- Luôn **commit trạng thái hiện tại trước** khi bắt đầu sửa.
- Tuân thủ `CLAUDE.md`. Chỉ làm đúng phạm vi prompt, **không tự mở rộng / refactor thêm / đổi UI khi chưa yêu cầu**.
- Sau khi sửa: chạy `npm run check` (typecheck + eslint + build + ratchet) phải xanh.
- Báo cáo: file đã sửa, lý do, rủi ro, cách test, kết quả `npm run check`.
- **Không** `git push` / deploy / xóa `.env`, key.

---

# ĐỢT 0 — DỌN RÁC NHANH (rủi ro thấp, làm trước để lấy đà)

### PROMPT 0.1 — Xóa file chết + dọn console.log + eslint --fix
```
Bối cảnh: dự án Dashboard YCX, nhánh ui-rebuild-v1. Đọc CLAUDE.md trước. Đây là đợt dọn rác an toàn.

Trước khi sửa: hãy commit trạng thái hiện tại với message "chore: trạng thái trước khi dọn rác đợt 0".

Việc cần làm (chỉ đúng những mục này, không hơn):
1. Xóa file chết: components/employees/industry/useIndustryAnalysisLogic.ts.patch (file .patch rác, không được import ở đâu — hãy grep xác nhận "useIndustryAnalysisLogic.ts.patch" không xuất hiện trong import nào rồi mới xóa).
2. Chạy `npx eslint . --fix` để xử lý 9 warning tự sửa được (chủ yếu unused eslint-disable directive). KHÔNG sửa tay các warning khác.
3. Rà 55 chỗ `console.log` trong components/ features/ hooks/ services/ utils/ (dùng: grep -rn "console.log" --include='*.ts' --include='*.tsx' components features hooks services utils). Với mỗi chỗ: nếu là log debug thì xóa; nếu là log có ý nghĩa vận hành thì đổi thành console.warn/error. Liệt kê cho tôi bảng "file : nội dung log : quyết định (xóa/đổi)".

Ràng buộc: không đổi logic, không đổi UI, không refactor gì thêm.
Sau khi xong: chạy `npm run check`, báo cáo kết quả và bảng quyết định console.log.
```

---

# ĐỢT 1 — ĐỒNG NHẤT LOGIC TÍNH TOÁN (⚠️ QUAN TRỌNG NHẤT — task #2)
> Làm 2 bước: **1A rà soát + chốt định nghĩa (KHÔNG sửa code)** trước, rồi **1B mới sửa**.
> Bước 1A bắt buộc phải xong và bạn duyệt trước khi chạy 1B, vì "+30% trả góp có nên áp
> mọi nơi không" là **quyết định nghiệp vụ của bạn**, không được để AI tự đoán.

### PROMPT 1A — Rà soát & lập bản đồ mọi công thức tính (CHỈ ĐỌC, không sửa)
```
Bối cảnh: dự án Dashboard YCX. Đọc CLAUDE.md. Đây là nhiệm vụ CHỈ ĐỌC — KHÔNG được sửa bất kỳ file code nào.

Mục tiêu: lập bản đồ đầy đủ mọi nơi tính Doanh thu Quy đổi (DTQĐ) và Số lượng quy đổi (weightedQuantity), so với công thức chuẩn trong utils/dataUtils.ts → calculateRowMetrics().

Công thức chuẩn:
  DTQĐ = doanh_thu × getHeSoQuyDoi(...) + (0.3 × doanh_thu nếu đơn là Trả góp/Trả chậm)
  weightedQuantity: có xét isInsurance (bỏ qtyMultiplier nếu là bảo hiểm), ưu tiên vasMultiplierMap ?? quantityMultiplierMap, riêng Vieon = quantity × heso.

Việc cần làm:
1. grep toàn bộ nơi gọi getHeSoQuyDoi và nơi tính revenueQD/doanhThuQD/revQD/DTQĐ trong components/ features/ hooks/ services/ utils/.
2. Với MỖI nơi, đọc đoạn code và ghi vào 1 bảng: [file:dòng] | công thức DTQĐ đang dùng | có +30% trả góp không | base doanh thu (price hay price×qty) | công thức weightedQuantity | có dùng calculateRowMetrics không.
3. Kiểm tra riêng nghi vấn: components/tables/summary/CrossSellingTable.tsx dùng `price × qty × heso` — xác minh COL.PRICE ('Giá bán_1') là ĐƠN GIÁ hay THÀNH TIỀN (đọc constants.ts + dữ liệu mẫu du-lieu-mau.txt). Nếu là thành tiền thì `×qty` là nhân đôi → đánh dấu BUG.
4. Kết luận: liệt kê các điểm LỆCH so với chuẩn, phân loại "chắc chắn bug" vs "cần bạn quyết định nghiệp vụ".
5. Đặt câu hỏi rõ ràng cho tôi: những chỗ nào (TrendChart, HeadToHead, IndustryAnalysis...) ĐÁNG LẼ phải cộng +30% trả góp giống hàm chuẩn, hay cố tình không cộng? Nêu rõ hệ quả từng lựa chọn.

Xuất ra 1 file báo cáo: BAO_CAO_LOGIC_TINH_TOAN.md. KHÔNG sửa code.
```

### PROMPT 1B — Hợp nhất về hàm tính chuẩn (chạy SAU khi duyệt 1A)
```
Bối cảnh: dự án Dashboard YCX. Đọc CLAUDE.md và BAO_CAO_LOGIC_TINH_TOAN.md (từ bước 1A).

Trước khi sửa: commit trạng thái hiện tại với message "chore: trạng thái trước khi hợp nhất logic tính toán".

Mục tiêu: đưa mọi nơi tính DTQĐ/weightedQuantity về DÙNG CHUNG utils/dataUtils.ts → calculateRowMetrics() (hoặc tách hàm con dùng chung nếu context cần từng phần), để không còn sai số giữa các khu vực.

Quy tắc quyết định (theo chốt của tôi ở bước 1A — điền vào đây trước khi chạy):
  - [ ] Các nơi sau PHẢI cộng +30% trả góp: ______
  - [ ] Các nơi sau CỐ Ý không cộng (giữ nguyên): ______

Việc cần làm:
1. Sửa từng file lệch trong BAO_CAO để gọi calculateRowMetrics thay vì tự tính, TRỪ các nơi tôi đánh dấu "cố ý không cộng".
2. Sửa bug nhân đôi ở CrossSellingTable nếu 1A xác nhận là bug.
3. Với mỗi file sửa: chỉ đổi phần tính toán, KHÔNG đụng UI/layout/màu.
4. Sau mỗi 2–3 file, chạy npm run typecheck để bắt lỗi sớm.

Ràng buộc: đây là SHARED logic → grep kỹ import trước khi đổi signature; không đổi tên/tham số export đang dùng nếu không bắt buộc.
Sau khi xong: chạy `npm run check`, và tự đối chiếu 1 vài con số (VD tổng DTQĐ 1 kho) trước/sau để chắc chắn thay đổi đúng chủ đích. Báo cáo từng file đã sửa + rủi ro.
```

---

# ĐỢT 2 — ĐỒNG NHẤT THIẾT KẾ THEO CHUẨN "PHÂN TÍCH" (task #3)
> Chuẩn giao diện = tab **Phân Tích** (`components/views/DashboardView.tsx` và các bảng/thẻ nó
> dùng: `components/tables/*`, `components/kpis/*`, `components/summary/*`). Đây là khu vực bám
> `DESIGN_SYSTEM.md` sát nhất. Các khu vực khác chỉnh về giống nó, KHÔNG đổi ngược lại.

### PROMPT 2A — Trích xuất "chuẩn thiết kế Phân Tích" thành checklist (CHỈ ĐỌC)
```
Bối cảnh: dự án Dashboard YCX. Đọc CLAUDE.md + DESIGN_SYSTEM.md. Nhiệm vụ CHỈ ĐỌC, không sửa code.

Mục tiêu: coi tab "Phân Tích" (components/views/DashboardView.tsx và các component nó dùng: components/tables/, components/kpis/, components/summary/, components/charts/) là CHUẨN VÀNG, rồi rút ra 1 checklist thiết kế cụ thể để áp cho các khu vực khác.

Việc cần làm — đọc và ghi lại thành file CHUAN_THIET_KE_PHAN_TICH.md:
1. Bảng màu semantic thực tế đang dùng (sky/slate/emerald/amber/rose) + cách dùng dark: đi kèm.
2. Bo góc, border, shadow, cỡ chữ header bảng (text-[11px]...), spacing chuẩn.
3. Cách bố trí toolbar desktop (portal #global-header-actions) + toolbar mobile lg:hidden.
4. Các component shared/ui nào được dùng (Button/Modal/Input/Badge/Card...).
5. Liệt kê 10–15 "quy tắc rút ra" dạng checklist ngắn gọn để đối chiếu khu vực khác.

KHÔNG sửa code. Chỉ xuất checklist.
```

### PROMPT 2B — Chuẩn hóa màu khu vực `components/` (root) về palette
```
Bối cảnh: dự án Dashboard YCX. Đọc CLAUDE.md, DESIGN_SYSTEM.md, CHUAN_THIET_KE_PHAN_TICH.md.

Trước khi sửa: commit "chore: trước khi chuẩn hóa màu components root".

Mục tiêu: thay màu ngoài palette semantic trong thư mục components/ (khoảng 606 chỗ) về đúng scale sky(primary)/slate(secondary)/emerald(success)/amber(warning)/rose(danger). Mỗi màu phải có dark: tương ứng.

Mapping đề xuất (điều chỉnh nếu ngữ cảnh khác): indigo/blue/violet→sky ; green→emerald ; orange/yellow→amber ; red→rose ; gray/zinc→slate. TEAL/PURPLE/CYAN chỉ đổi nếu đang dùng như "primary/secondary", còn nếu là màu phân loại dữ liệu (chart category) thì GIỮ và ghi chú lại.

Quy tắc:
- KHÔNG tìm-thay hàng loạt vô tội vạ: styles.css cố ý override --color-indigo-* thành sky; có chỗ 'indigo' dùng như màu riêng (xem CLAUDE.md mục 2). Đọc ngữ cảnh từng dòng.
- Không đổi bố cục, không đổi logic, chỉ đổi class màu.
- Đối chiếu với CHUAN_THIET_KE_PHAN_TICH.md để chắc chắn khớp tab Phân Tích.

Làm theo từng file con (charts/ → tables/ → modals/ → employees/...), sau mỗi nhóm chạy npm run build kiểm tra. Xong chạy `npm run check`. Báo cáo số chỗ đổi + ảnh chụp trước/sau nếu có thể.
```

### PROMPT 2C — Chuẩn hóa màu `features/bi-dashboard` (314 chỗ)
```
(Giống PROMPT 2B nhưng phạm vi = features/bi-dashboard/. Commit "chore: trước khi chuẩn hóa màu bi-dashboard". Đây là ISOLATED — an toàn sửa, không ảnh hưởng khu vực khác. Đối chiếu CHUAN_THIET_KE_PHAN_TICH.md.)
```

### PROMPT 2D — Chuẩn hóa màu + dark mode `features/sticker-event` (226) và `features/phan-ca` (56)
```
Bối cảnh: dự án Dashboard YCX. Đọc CLAUDE.md, DESIGN_SYSTEM.md, CHUAN_THIET_KE_PHAN_TICH.md.
Trước khi sửa: commit "chore: trước khi chuẩn hóa màu sticker-event & phan-ca".

Mục tiêu:
1. Đổi màu ngoài palette trong features/sticker-event/ (226 chỗ) và features/phan-ca/ (56 chỗ) về palette semantic (mapping như 2B). LƯU Ý: formatCurrency ở sticker-event là bản in giá, KHÔNG gộp với bản dashboard.
2. features/phan-ca/phanca.css hiện có comment map dark mode nhưng bảng phân ca còn thiếu dark: nhiều chỗ — bổ sung dark: cho các class màu còn thiếu, hoặc chuyển sang Tailwind dark: nếu đang là CSS custom.

Đây là 2 khu vực ISOLATED, không import chéo. Không đổi logic in ấn/xếp ca. Xong chạy `npm run check` + test dark mode cả 2 khu vực. Báo cáo.
```

---

# ĐỢT 3 — CODE SẠCH / CHUẨN HÓA PHẦN CÒN LẠI (task #1)
> Làm sau cùng vì rủi ro cao hơn và cần thời gian. Làm dần từng module, mỗi lần 1 prompt.

### PROMPT 3A — Gỡ dần `any` theo module (bật cảnh báo trước)
```
Bối cảnh: dự án Dashboard YCX. Đọc CLAUDE.md (quy tắc: không dùng any trừ khi parse Excel/raw thô).
Trước khi sửa: commit "chore: trước khi gỡ any đợt <tên-module>".

Hiện có ~359 chỗ `any`. Làm TỪNG MODULE một, KHÔNG làm cả repo 1 lần. Module lần này: <CHỌN 1: features/bi-dashboard | components/employees | services | features/sticker-event | ...>.

Việc cần làm:
1. Liệt kê mọi `any` trong module đã chọn (grep -rEn "\bany\b").
2. Với mỗi chỗ: thay bằng kiểu cụ thể / unknown + narrow / generic. GIỮ any chỉ khi thật sự là dữ liệu Excel/raw thô không thể định kiểu — và ghi comment "// any: raw Excel data" cho rõ.
3. Ưu tiên tạo type dùng lại trong types.ts nếu lặp nhiều.

Ràng buộc: không đổi logic runtime, chỉ thêm/siết kiểu. Sau mỗi ~10 chỗ chạy npm run typecheck.
Xong chạy `npm run check`. Báo cáo: số any trước/sau trong module, số còn giữ có lý do.
```

### PROMPT 3B — Hợp nhất nốt hệ modal (`ModalWrapper` cũ + 30 modal `fixed inset-0`)
```
Bối cảnh: dự án Dashboard YCX. Đọc CLAUDE.md (mục 3: có 3 hệ modal song song; khi sửa 1 modal xác định nó thuộc hệ nào trước).
Trước khi sửa: commit "chore: trước khi hợp nhất modal".

Hiện trạng: shared/ui/Modal đã dùng 41 file (chuẩn), ModalWrapper cũ còn 1 file, còn 30 file dùng `fixed inset-0` tự viết (chủ yếu features/sticker-event, features/phan-ca).

Việc cần làm:
1. Liệt kê 30 file `fixed inset-0` và phân loại: (a) modal thật nên migrate sang shared/ui/Modal ; (b) overlay/không phải modal (dropdown, toast, backdrop loading) → GIỮ nguyên.
2. Migrate 1 modal thật ĐẦU TIÊN sang shared/ui/Modal làm mẫu, cho tôi xem diff + ảnh trước/sau. DỪNG LẠI chờ tôi duyệt trước khi migrate hàng loạt.
3. Xử lý nốt file ModalWrapper cũ cuối cùng.

Ràng buộc: giữ nguyên hành vi (đóng/mở, ESC, click backdrop), không đổi nội dung modal. Từng bước, không ồ ạt. Xong chạy `npm run check`.
```

### PROMPT 3C — Tách god file (làm khi rảnh, từng file một)
```
Bối cảnh: dự án Dashboard YCX. Đọc CLAUDE.md (mục 3: tách nhỏ CHỈ khi được yêu cầu — đây là yêu cầu chính thức).
Trước khi sửa: commit "chore: trước khi tách <tên file>".

God file cần tách (làm TỪNG FILE, 1 prompt = 1 file): chọn 1 trong:
  - services/dbService.ts (1640 dòng) → tách theo domain: settings / salesData / kpiConfig / warehouseConfig / sync.
  - features/sticker-event/StickerPrinterView.tsx (1887) → tách component con + hook logic.
  - features/sticker-event/stickerprinter/StickerPrintPreview.tsx (1716).
  - features/phan-ca/PhanCaView.tsx (1430).
  - features/bi-dashboard/components/nhanvien/BonusTab.tsx (1138).

Việc cần làm cho file đã chọn:
1. Đọc & vẽ sơ đồ trách nhiệm (phần nào tách được).
2. Tách thành các file con cùng thư mục, GIỮ NGUYÊN API export public (grep import trước).
3. KHÔNG đổi logic, chỉ di chuyển. Đây là refactor thuần cấu trúc.

Sau khi tách chạy `npm run check` + test đúng tính năng của file đó (không cần test toàn app). Báo cáo cấu trúc mới.
```

---

## C. THỨ TỰ THỰC HIỆN ĐỀ XUẤT
1. **Đợt 0** (0.1) — 30 phút, lấy đà, an toàn.
2. **Đợt 1** (1A → duyệt → 1B) — **ưu tiên cao nhất**, đây là chỗ gây sai số thật.
3. **Đợt 2** (2A → 2B → 2C → 2D) — đồng nhất giao diện theo chuẩn Phân Tích.
4. **Đợt 3** (3A nhiều lần theo module → 3B → 3C nhiều lần) — làm dần, không gấp.

> Mẹo: sau mỗi đợt, nếu `npm run check` xanh và bạn đã kiểm tra tay, hãy commit với message
> mô tả rõ đợt vừa làm để dễ quay lui nếu cần.

---

# PHỤ LỤC — DARK MODE CHO `features/sticker-event` (làm trong Antigravity, cần soi mắt)
> Phát hiện 10/07: sticker-event **chưa có dark mode nào** (root cứng `bg-white text-slate-800`,
> ~450 class màu / 25 file, gần như 0 `dark:`). Trong dark mode nó là "ốc đảo sáng" — không
> vỡ chữ nhưng lệch tông. Đây là việc **viết mới**, PHẢI xem app chạy để đối chiếu, nên làm ở
> Antigravity (không làm mù). ⚠️ Điểm chí tử: **vùng xem trước con tem là GIẤY TRẮNG — KHÔNG
> được cho tối** (nếu tối là hỏng chức năng in).

### PROMPT DARK-CA — Thêm dark mode cho sticker-event (từng file, soi mắt)
```
Bối cảnh: dự án Dashboard YCX, features/sticker-event/ hiện chưa có dark mode. Đọc CLAUDE.md và
CHUAN_THIET_KE_PHAN_TICH.md (lấy tab Phân Tích làm chuẩn tông màu dark). Dark mode toàn app là
class .dark trên <html> (Tailwind dark:).

Trước khi sửa: commit "chore: trước khi thêm dark mode sticker-event".

Mục tiêu: thêm biến thể dark: cho phần CHROME của sticker-event (toolbar, panel, modal, nút, list,
input...) để đồng nhất tông tối với phần còn lại của app.

MAPPING chuẩn (2 tầng bề mặt như tab Phân Tích):
  - Nền trang/gốc: bg-white  -> thêm dark:bg-slate-900
  - Nền card/panel/modal: bg-white hoặc bg-slate-50 -> dark:bg-slate-800 ; bg-slate-100 -> dark:bg-slate-800
  - Chữ chính: text-slate-800/900 -> dark:text-slate-100 ; text-slate-700 -> dark:text-slate-200
  - Chữ phụ: text-slate-600 -> dark:text-slate-300 ; text-slate-500 -> dark:text-slate-400
  - Viền: border-slate-100/200 -> dark:border-slate-700 ; border-slate-300 -> dark:border-slate-600
  - Màu semantic nền nhạt: bg-{sky|emerald|amber|rose}-50 -> dark:bg-{...}-900/30 ;
    text-{...}-600/700 -> dark:text-{...}-400

⚠️ TUYỆT ĐỐI KHÔNG cho tối các vùng sau (giữ nền trắng giấy):
  - Vùng xem trước con tem / phiếu (StickerPrintPreview.tsx và mọi div render nội dung tem).
  - printService.ts (HTML in ấn — giữ nguyên hoàn toàn).
  - Nút brand Google-yellow #fbbc04 trong StickerPrintControls.tsx (giữ nguyên).

Cách làm BẮT BUỘC theo lô, có kiểm mắt:
  1. Bật dark mode trên app, mở tab In tem. Chụp/nhìn trạng thái hiện tại.
  2. Làm 1 file mỗi lần (bắt đầu: StickerEventApp.tsx -> BottomNavigation.tsx -> InventoryToolbar.tsx
     -> ControlPanel.tsx -> ResultsDisplay.tsx -> các *Modal.tsx). Sau mỗi file, XEM LẠI trên app
     ở cả light lẫn dark, đảm bảo: không có chữ tối trên nền tối, không có mảng trắng chói, vùng
     xem trước tem VẪN trắng.
  3. Sau mỗi 3-4 file chạy npm run check.
  4. KHÔNG dùng find-replace mù toàn thư mục — dễ làm tối vùng giấy in.

Xong: chạy npm run check, xác nhận vùng xem trước tem còn trắng, báo cáo từng file + ảnh light/dark.
```
