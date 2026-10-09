# Kế hoạch sửa Dashboard YCX theo audit — bản đối chiếu & bổ sung

Ngày: 07/10/2026 · Đối chiếu trên commit `dda2e9c` (HEAD hiện tại), không phải ZIP.
⚠️ Repo `ltsdata1605-glitch/dashboard` đang **PUBLIC** → file này và bộ bằng chứng KHÔNG được commit lên GitHub cho tới khi Giai đoạn 0 + 1 đã deploy.

---

## A. Kết quả kiểm tra bộ audit bạn gửi

### A1. Cách tôi kiểm

| Việc | Kết quả |
|---|---|
| `npm ci` root + `functions/` | OK (audit cũ không cài được vì proxy) |
| `npm run check` (typecheck + eslint + unit + build + ratchet) | **XANH** — 0 lỗi eslint (166 cảnh báo), 1060 test qua, build 22s, ratchet OK |
| `functions` typecheck | XANH |
| Chạy lại 7 script bằng chứng của audit trên code HIỆN TẠI | **Tất cả vẫn tái hiện lỗi** (xem A2) |
| Đọc tay code các điểm P0/P1 | Khớp số dòng của audit (sai lệch ≤ vài dòng) |

### A2. Từng phát hiện — audit nói đúng không?

| ID | Nội dung ngắn | Kết luận trên HEAD |
|---|---|---|
| S01 | `stickerStaffAuth` không xác thực, đổi mật khẩu + tạo token cho UID người khác | ✅ ĐÚNG, còn nguyên — **nặng hơn audit mô tả** (xem B1) |
| S02 | username `admin`/`21707` → superadmin | ✅ ĐÚNG (`stickerEvent.ts:8,14,88`) |
| S03 | user pending tự chọn Kho vẫn đọc được dữ liệu Kho | ✅ ĐÚNG (`requestAccess` ghi departmentId → `resolveSession` cấp claim → `khoData`/`biData` chỉ kiểm `myKhos()`) |
| S04 | admin đặt status expired nhưng role manager giữ nguyên | ✅ ĐÚNG (script tái hiện) |
| S05 | root và Sticker ghi đè claims của nhau | ✅ ĐÚNG (`session.ts:109`, `stickerEvent.ts:25`, cả `demoteExpiredUsers`) |
| S06 | `mark-used` không xác thực, sửa coupon mọi bot | ✅ ĐÚNG (script: 2 chủ bot bị đổi USED, tên giả) |
| S07 | `uploadMedia` ẩn danh ghi đè ID tuỳ ý, MIME tuỳ ý | ✅ ĐÚNG (ghi được `text/html`) |
| S08 | Lệnh DUYỆT không kiểm admin | ✅ ĐÚNG |
| S09 | Ảnh báo cáo fallback toàn hệ thống | ✅ ĐÚNG (đọc code) |
| S10 | OCR phiếu lương gọi Gemini không cần đăng nhập | ✅ ĐÚNG (`gemini.ts:121` không có `request.auth`) — tốn tiền API |
| S11 | postMessage Check thưởng không kiểm nguồn | ✅ ĐÚNG một phần: nhánh `CHECK_THUONG_SHARE_RETRY` đã kiểm, 3 nhánh đầu (dòng 52–90) thì chưa |
| S12 | HTML in tem chưa escape | ✅ ĐÚNG (chuỗi `onerror` giữ nguyên trong HTML) — CSP chặn script inline nên mức P2 hợp lý |
| S13 | `line_bots` mọi manager đọc/ghi mọi bot (kèm token, secret, pmhRelayToken); `bot_media`/`report_commands` đọc công khai, ai đăng nhập cũng ghi | ✅ ĐÚNG (`firestore.rules:170–185`) |
| S14 | savedLists Sticker ai đăng nhập cũng đọc/ghi | ✅ ĐÚNG |
| D01 | Nhân viên mở app lần 2 thấy 0 dòng | ✅ ĐÚNG (script: lần 1 = 2 dòng, lần 2 = 0) |
| D02 | Đồng bộ Kho nhân đôi doanh thu | ✅ ĐÚNG (1tr → 2tr) |
| D03 | Thiếu chunk vẫn trả "thành công" | ✅ ĐÚNG |
| D04 | Chunk đếm ký tự thay vì byte → vượt 1MiB với tiếng Việt | ✅ ĐÚNG (818k ký tự = 1,11MB) |
| D05 | Đổi tháng Phân ca ghi đè lịch tháng mới bằng tháng cũ | ✅ ĐÚNG (script) |
| D06–D07, D09–D18 | | ✅ Các điểm có script đều tái hiện; các điểm "T" (đọc code) tôi kiểm mẫu D10, D14 — đúng |
| D08 | ID lịch sử Thuế trùng giữa 2 máy | ✅ ĐÚNG (`autoIncrement: true`) |
| D15 | `45,5%` → 455; `31/02` → 03/03 | ✅ ĐÚNG |
| PDF/CSP | iframe nạp `data:` nhưng CSP `frame-src` không có `data:` | ✅ ĐÚNG (`printService.ts:1368,1413` + `index.html:58`) |
| Service worker | Không có | ✅ ĐÚNG |

### A3. Chỗ audit KHÔNG còn đúng / cần sửa lại

1. **Số đếm thiết kế đã lỗi thời.** Audit ghi 171 `<button>` thô ở 43 file — HEAD chỉ còn **9 ở 5 file** (đã được dọn sau ZIP). Dùng số đo mới ở mục C.
2. **"Không build/test được"** — chỉ là hạn chế môi trường của audit. Trên HEAD toàn bộ `npm run check` xanh.
3. **Lưu ý dùng lệnh:** root `typecheck` đỏ nếu chưa `npm ci` trong `functions/` (root có test import chéo sang `functions/src`). Môi trường mới phải cài cả hai.
4. **Câu "không tự push/deploy" trong PLAN_CHO_CLAUDE** mâu thuẫn với CLAUDE.md mục 0.0 (bạn đã cấp quyền). Tôi theo CLAUDE.md, nhưng vẫn **chờ bạn duyệt từng giai đoạn** như bạn yêu cầu lần này.
5. **CLAUDE.md đang sai về database In Sticker**: ghi Sticker dùng database riêng `ai-studio-…` + `firestore.stickerevent.rules`. Thực tế code (`functions/src/firebaseAdmin.ts`, `features/sticker-event/firebase-applet-config.json`) đã chuyển sang `(default)`, rules Sticker hiệu lực nằm trong `firestore.rules`. `firebase.json` vẫn deploy file rules cũ sang database cũ. Agent đọc CLAUDE.md sẽ sửa nhầm file rules → sửa ở GĐ6.

---

## B. Bổ sung — những gì audit chưa nêu hoặc nêu nhẹ

| ID | Mức | Phát hiện | Vị trí |
|---|---|---|---|
| **B1** | **P0+ (chiếm tài khoản chủ dự án)** | S01 không chỉ ảnh hưởng In Sticker. Nếu username có `@` thì hàm dùng nguyên giá trị đó làm email → kẻ tấn công nhập email của **bất kỳ tài khoản nào trong project** (kể cả tài khoản Google super admin của app gốc), cùng một mã kho do chính họ tạo bằng `stickerRegister`. Hàm sẽ **đặt mật khẩu có thể đoán trước** cho tài khoản đó. Vì cùng Auth pool, họ đăng nhập app gốc bằng email + mật khẩu đó → `resolveSession` cấp quyền admin theo email. Không cần IAM ký token (bước đổi mật khẩu chạy trước). | `stickerEvent.ts:321,383` + `session.ts:10,80` |
| B2 | P0 | Mật khẩu nhân viên là `staff_<username>_123456`, client còn thử `<username>123456`, `123456123456`, `staff123456`. Ai biết username nhân viên là đăng nhập được thẳng bằng Firebase SDK, không cần Cloud Function. | `Login.tsx:143,198,229` |
| B3 | P1 | Rule `stores/{storeId}/**` cho mọi user đăng nhập đọc/ghi kho `SUPERADMIN`, và cho phép theo `token.departmentId == storeId` → user **pending của app gốc** (tự chọn Kho qua `requestAccess`) đọc/ghi dữ liệu Sticker của kho đó. Lỗ S03 lan sang In Sticker. | `firestore.rules:158` |
| B4 | P1 | `stickerRegister`: người đăng ký đầu tiên của một mã kho bất kỳ thành Admin kho đó (ai đến trước được trước) — không có bằng chứng thuộc siêu thị. | `stickerEvent.ts:62` |
| B5 | P2 | `?mediaId=` phục vụ lại đúng `contentType` đã lưu (vd `text/html`) trên domain cloudfunctions → XSS lưu trữ trên domain functions (cộng với S07). | `lineBotWebhook.ts:1611` |
| B6 | P2 | Các action `verifyToken / sendTestPush / pushImage / sendBroadcast / getProfile` là proxy mở không xác thực (người gọi phải tự có token nên rủi ro thấp, nhưng bị lạm dụng tốn invocations). | `lineBotWebhook.ts:1688–1960` |
| B7 | P2 | Host trên GitHub Pages: không đặt được header HTTP (`frame-ancestors`, `X-Frame-Options`, HSTS tuỳ chỉnh) — CSP qua `<meta>` không chặn được việc nhúng trang (clickjacking). | `index.html`, hosting |
| B8 | Vận hành | Cần kiểm ngay trên Firebase Console: tài khoản super admin có xuất hiện provider "Password" lạ không; các lượt gọi `stickerStaffAuth` có `username` chứa `@` trong log. | — |

---

## C. Thiết kế — đã đồng nhất chưa? (đo trên HEAD, `components/` + `features/`)

**Trả lời ngắn:** Có **một nơi dùng chung** (`styles/tokens.css` + `components/shared/ui/*` gồm Button, Input, Select, Modal, ConfirmDialog, KpiCard, StatCard, DataTable, Dropdown, Tooltip…), nút bấm đã gần như thống nhất, **nhưng bảng, thẻ KPI, modal/popup chưa**. Và chính bộ dùng chung đang **trái với quy chuẩn ghi trong CLAUDE.md**.

| Chỉ số | Số đo | Chuẩn CLAUDE.md |
|---|---|---|
| `<button>` thô | 9 lần / 5 file | 0 — gần đạt ✅ |
| `<table>` tự dựng vs `DataTable` | 57 / 49 file — DataTable gần như không dùng | Bảng chung một khung |
| Overlay tự dựng `fixed inset-0` | 28 / 26 file | Cấm tự dựng modal |
| `rounded-xl` / `rounded-2xl` / `rounded-3xl` | 378 / 118 / 5 | Bỏ xl cho card, bỏ 3xl |
| `text-[10px]`, `text-[9px]`, `text-[8px]` | 44 + 30 | Tối thiểu 11px |
| `shadow-lg/xl/2xl` | 84 / 68 file | Chỉ modal, dropdown |
| Mã màu hex cứng | 292 / 34 file | Chỉ token |
| `style={{…}}` inline | 141 / 53 file | — |
| Class `dark:` (đã tắt dark mode) | 8.367 / 213 file | Vô hiệu, nặng bundle |
| **KpiCard dùng chung** | `rounded-2xl`, `hover:shadow-lg`, `backdrop-blur`, pill | Trái chuẩn "phẳng, không bóng" |
| **Button dùng chung** | `rounded-md` (6px) | CLAUDE.md ghi 4px |
| Vùng chạm 44px của Button/Input | chỉ dưới 640px (`sm:`), trong khi layout mobile tới 1024px | iPhone ngang / iPad bị nút 32–36px |
| CSS Phân ca | selector/keyframe global trùng `styles.css`; biến `.phanca-root` không tới được Modal (portal ra `body`) | Phải scope |

→ Kết luận: cần **chốt lại 1 chuẩn** (mâu thuẫn KpiCard 16px vs phẳng, nút 4px vs 6px) **trước** khi migrate hàng loạt.

## D. Laptop & Safari iOS — đã tốt chưa?

| Hạng mục | Đánh giá |
|---|---|
| Laptop | Kiến trúc tốt (lazy-load, Web Worker, cache), build xanh. Nhưng lỗi dữ liệu D01/D02/D05 làm số liệu **sai** trên mọi thiết bị. So giá chỉ chạy localhost, origin `dashboard.pro.vn` bị CORS chặn |
| Safari iOS | Có safe-area, `dvh`, manifest, job WebKit trong CI. **Chưa đạt**: xem PDF in tem bị CSP chặn; camera có thể còn bật sau khi đóng modal; nút nhỏ ở iPhone ngang/iPad; `maximum-scale=1, user-scalable=no` khoá zoom; không có service worker (mở từ Home Screen khi mất mạng = trắng) |
| Chưa ai kiểm trên iPhone thật | Google login popup, bàn phím ảo, camera, tải/chia sẻ PDF, quay lại app sau khi chuyển nền |

---

## E. KẾ HOẠCH THEO GIAI ĐOẠN — bạn duyệt từng ô

Mỗi giai đoạn: viết test tái hiện lỗi trước (đỏ) → sửa → test xanh → `npm run check` + test functions/rules → commit → push → (khi bạn duyệt) deploy → báo cáo theo mẫu: lỗi gì, file nào, test gì, rủi ro, cách rollback.

### ☑ GĐ0 — VÁ KHẨN (trong ngày, ~nửa ngày) · chặn B1, B2, S01, S02, S10
> **Tiến độ:** đã làm & deploy 2026-10-07 (chi tiết: `implementation_plan.md` mục "Audit bảo mật — Giai đoạn 0")

| # | Việc | Ảnh hưởng người dùng |
|---|---|---|
| 0.1 | `stickerStaffAuth`: bắt buộc đăng nhập; **không bao giờ** đổi mật khẩu tài khoản đã tồn tại; từ chối username chứa `@`; chỉ thao tác tài khoản `@example.com` chỉ có provider password và là staff Sticker | Nhân viên cũ vẫn đăng nhập được tạm thời; đường chiếm tài khoản bị đóng |
| 0.2 | Bỏ cấp superadmin theo username → chỉ theo UID của bạn (cấu hình phía server) | Không đổi với bạn |
| 0.3 | `parseSalarySlipWithGemini`: bắt buộc `request.auth` + giới hạn kích thước ảnh + `maxInstances` | Không đổi với người dùng hợp lệ |
| 0.4 | Bỏ danh sách mật khẩu dự phòng đoán được ở `Login.tsx` | — |
| 0.5 | (Bạn làm trên Console, tôi hướng dẫn) Kiểm provider của tài khoản admin; thu hồi phiên (`revokeRefreshTokens`) nếu thấy dấu hiệu lạ | Bạn phải đăng nhập lại |
| Test | Unit test callable với mock (chuyển script audit thành test vitest trong `functions/`) | |
| Deploy | `npm run deploy:functions` + build/gh-pages | |

**Cần bạn quyết (chặn GĐ0 phần 2):** nhân viên In Sticker đăng nhập bằng gì? (a) Admin kho đặt **mã PIN** cho từng nhân viên (đề xuất), (b) nhân viên tự đặt mật khẩu, (c) đăng nhập Google. Hiện tại "biết tên = vào được".

### ☑ GĐ1 — PHÂN QUYỀN & PHIÊN (2–3 ngày) · S03–S09, S11–S14, B3–B6 (task T03–T06)
> **Tiến độ:** đã làm & deploy; S13/S14 hoàn tất 2026-10-08 (bí mật Bot LINE về `line_bot_secrets`)

1. Gộp claims root + Sticker vào **một hàm server** → hết ghi đè nhau (S05).
2. Pending/expired/rejected không có claim Kho; tách "Kho yêu cầu" khỏi "Kho được duyệt" (S03, B3). Expired hạ role (S04).
3. Rules: `line_bots` chỉ chủ bot; chuyển `channelAccessToken`/`channelSecret`/`pmhRelayToken` sang chỗ chỉ server đọc được; `bot_media`/`report_commands` bỏ ghi tự do; `savedLists` theo storeId; bỏ ngoại lệ `SUPERADMIN` và `departmentId` ở `stores` (S13, S14, B3).
4. LINE: `mark-used` cần vé ký ngắn hạn gắn bot+coupon; `uploadMedia` cần Firebase token, chặn ghi đè ID, chỉ nhận ảnh thật (magic bytes); DUYỆT/HUỶ kiểm admin (S06–S09, B5, B6).
5. Check thưởng: kiểm `e.source`/`origin` ở mọi nhánh (S11); escape HTML in tem (S12).
6. Test: **Rules Emulator** (2 user × 2 Kho × 2 bot), test handler webhook.
7. Lưu ý vận hành: sau khi chuyển secret, nên **xoay Channel Access Token** của các bot (vì đã từng lộ cho mọi manager).

### ☑ GĐ2 — DỮ LIỆU ĐÚNG, KHÔNG MẤT (4–6 ngày) · D01–D18 (T07–T14)
> **Tiến độ:** đã làm (D01–D18) & deploy

Thứ tự theo mức hại đến số liệu:
1. **D02** đồng bộ Kho nhân đôi doanh thu + **D01** nhân viên mở lại thấy trống (T07). Kèm script dry-run đếm dữ liệu đã bị trùng trên production — chỉ báo cáo, không tự xoá.
2. **D03/D04/D07** chunk: đếm byte UTF-8, ghi theo revision, thiếu chunk = lỗi chứ không phải thành công (T08).
3. **D14/D11/D12** không xoá sạch dữ liệu khi lỗi tải; chỉ báo "đã lưu" khi đã lưu thật (T09).
4. **D05/D06** Phân ca đổi tháng ghi đè + tự sinh lại lịch đã sửa tay (T10).
5. **D08** Thuế ID trùng giữa máy (T11).
6. **D09/D10/D18** LINE cấp 1 coupon cho 2 người, báo cáo lệch giờ VN, relay (T12–T13).
7. **D15–D17** parser `45,5%`, ngày 31/02, BI giữ KPI cũ, worker treo (T14).

### ☑ GĐ3 — HIỆU SUẤT CÓ SỐ ĐO (2–3 ngày) · T15, T16
> **Tiến độ:** đã làm, có số đo trước/sau

Đo trước/sau (thời gian đăng nhập → thấy dashboard, lọc p95, RAM, số lượt đọc Firestore) với 10k/50k/200k dòng; giới hạn số request song song; Phân ca tải song song + ghi theo key thay đổi; giới hạn số tem + huỷ được; So giá chạy được từ `dashboard.pro.vn` tới máy local (allowlist + mã ghép đôi).

### ☑ GĐ4 — HỆ THỐNG THIẾT KẾ THỐNG NHẤT (5–8 ngày, chia theo khu) · T17–T19
> **Tiến độ:** đã làm — chuẩn (B) bo mềm; `rawOverlay` 27→0, `tinyText` 82→50, `offScaleRadius` 11→4 (phần còn lại có chủ đích)

1. **Chốt chuẩn với bạn** (1 trang so sánh có ảnh): bo góc nút 4 hay 6px; KpiCard phẳng hay giữ bo 16px; mật độ bảng; z-index modal.
2. Sửa CSS Phân ca rò rỉ global + biến không tới modal.
3. Sửa **bộ dùng chung trước** (KpiCard, Button, Modal, khung bảng `TableFrame`), rồi migrate theo khu: gốc → BI → Phân ca → Sticker → LINE/Thuế/Khai thác. Thêm luật `lint-ratchet` cho: `fixed inset-0`, `text-[<11px]`, hex cứng, `rounded-2xl/3xl`, `shadow-lg+` — chỉ được giảm.
4. Vùng chạm 44px theo `pointer: coarse` thay vì `< 640px`.
5. (Tuỳ chọn) gỡ 8.367 class `dark:` vô hiệu để nhẹ CSS.

### ☑ GĐ5 — SAFARI iOS & LAPTOP (2–3 ngày) · T20–T21
> **Tiến độ:** đã làm; chờ chủ dự án kiểm iPhone thật; offline (service worker) đã làm 2026-10-08

PDF dùng Blob URL + CSP `frame-src blob:` + nút "Mở/Chia sẻ" dự phòng cho iOS; camera tắt chắc chắn khi đóng; popup "Thêm" cuộn được khi xoay ngang/bàn phím; xem lại khoá zoom; Playwright WebKit ma trận 1366×768, 1440×900, 390×844, 844×390, 768×1024. **Cần bạn** kiểm 1 vòng trên iPhone thật theo checklist tôi soạn (Google login, camera, in PDF, Home Screen, chuyển nền).
Service worker offline: chỉ làm nếu bạn cần mở app khi mất mạng.

### ☑ GĐ6 — TÀI LIỆU & PHÁT HÀNH (½ ngày) · T22
> **Tiến độ:** đã làm; bộ tài liệu audit đã vào repo

Sửa CLAUDE.md (database Sticker, chuẩn thiết kế đã chốt), dọn `firebase.json` khỏi rules của database cũ (sau khi xác nhận database cũ không còn ai dùng), thêm `functions` typecheck + Rules Emulator vào CI; commit bộ audit vào repo **sau khi** các lỗ đã vá.

---

## F. Các quyết định tôi cần từ bạn

1. Duyệt **GĐ0** để vá ngay hôm nay? (khuyến nghị: có — B1 cho phép chiếm tài khoản admin chính)
2. Cách đăng nhập cho nhân viên In Sticker (PIN do admin đặt / mật khẩu riêng / Google).
3. GĐ4: chuẩn bo góc nút & phong cách KpiCard (tôi sẽ gửi trang so sánh khi tới GĐ4).
4. Có cần app chạy offline từ Home Screen không.
