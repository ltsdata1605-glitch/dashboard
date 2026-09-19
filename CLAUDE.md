# CLAUDE.md — Hướng dẫn phát triển & Quy tắc dự án Dashboard YCX

> File này tổng hợp các quy tắc quan trọng nhất từ `RULES.md`, `AGENT_RULES.md` và `DESIGN_SYSTEM.md`.
> **Quy tắc ưu tiên**: `AGENT_RULES.md` (an toàn) > `RULES.md` (kiến trúc) > `DESIGN_SYSTEM.md` (giao diện UI).
>
> *(Sửa 2026-09-10: bản cũ còn viện dẫn `DESIGN_SYSTEM_MODERN.md` và `AUDIT.md` — cả hai KHÔNG tồn
> tại trong repo. `DESIGN_SYSTEM.md` cũng đã bị xoá nhầm ở commit `8675fd05` và vừa được khôi phục.
> Trỏ tới file không có thật là nguy hiểm thật: agent đi tìm không thấy chuẩn thiết kế sẽ tự bịa
> ra một chuẩn khác.)*

---

## 0.0. Quyền hạn của Agent trên project (chủ dự án cấp 2026-09-18)

> Nguyên văn yêu cầu của chủ dự án: *"Tôi cho phép claude toàn quyền trên project và agent có thể
> làm bất cứ điều gì để nâng cấp và cải thiện dự án."*

**Agent ĐƯỢC tự làm, không cần hỏi trước:**
- Chạy Firebase CLI cho mọi lệnh đọc (`firestore:databases:list`, `firestore:indexes`,
  `projects:list`, `login:list`…). CLI đã đăng nhập sẵn bằng `lts.truongson@gmail.com` nhưng
  **KHÔNG có trong PATH** — phải gọi `./node_modules/.bin/firebase`.
- Chạy script khảo sát chỉ-đọc trên dữ liệu thật (vd `functions/scripts/audit-firestore-readonly.cjs`).
- `npm run deploy:rules`, `npm run deploy:functions`, tạo/sửa Firestore index.
- Tạo database/collection mới, chạy script di trú dữ liệu, sửa `firebase.json`.
- Mọi thao tác Git thông thường: commit, tạo nhánh, push.

**Vẫn BÁO TRƯỚC MỘT CÂU rồi mới làm** (không phải xin phép — chỉ để chủ dự án kịp dừng nếu đang giờ
bán hàng), **chỉ với việc PHÁ HUỶ KHÔNG HOÀN TÁC ĐƯỢC trên dữ liệu production:**
- Xoá collection/database/document thật (khác với ghi đè mà bản sao nguồn vẫn còn nguyên).
- `git push --force`, xoá nhánh từ xa, viết lại lịch sử đã đẩy.
- Xoá/thay `.env`, service account key, hoặc `firebase-applet-config.json` (không bí mật, nhưng sai một ký tự là In Sticker trỏ nhầm database).

*Ba nhóm trên do agent tự thêm 2026-09-18, chủ dự án có thể bỏ nếu không muốn. Lý do: quyền đã cấp
đủ rồi, nhưng ba nhóm này không có đường lùi — sai là mất dữ liệu thật của siêu thị đang chạy, mà
một câu báo trước rẻ hơn nhiều so với khôi phục. Mọi việc khác agent cứ làm thẳng.*

**Mục này thay thế các câu "không phải việc agent tự chạy" ở bản CLAUDE.md cũ** (mục 1.1, dòng Deploy).

---

## 0. Quy trình bắt buộc trước khi sửa code

1. **Yêu cầu bắt buộc trước khi sửa lớn**: Agent phải chủ động thực hiện commit trạng thái Git hiện tại trước khi bắt đầu sửa đổi mã nguồn (ví dụ chạy lệnh commit với tin nhắn mô tả rõ trạng thái "trước khi sửa X").
2. **Yêu cầu Backup**: Khi người dùng yêu cầu "backup", "sao lưu", "sao luu"... Agent phải tự động chạy lệnh:
   ```bash
   node archive/backup.cjs
   ```
   Lệnh này tự động nén zip lưu trong `archive` và đồng bộ lên Github.
3. **Lập kế hoạch trước khi sửa**: Luôn tạo hoặc cập nhật tệp `implementation_plan.md` mô tả các tệp thay đổi và thiết kế giải pháp trước khi thực hiện.
4. **Phạm vi tác động**: Chỉ thực hiện đúng phạm vi yêu cầu của task. Không tự ý mở rộng, không tự ý refactor lớn khi task yêu cầu sửa nhỏ, không đổi tên biến/file/route/function nếu không cần thiết.
5. **Bảo mật**: Không tự ý hard-code API key mới vào mã nguồn, không in nội dung token/key ra log hay báo cáo, không commit file bí mật (`.env`, service account key) vào Git. *(Sửa 2026-09-19: bản cũ liệt kê cả `firebase-applet-config.json` — không đúng, xem mục 1.1: đó là cấu hình web công khai, đang được commit và nên vậy.)* *(Sửa 2026-09-18 theo mục 0.0: agent ĐƯỢC đọc/dùng các file này để làm việc; chỉ XOÁ hoặc THAY chúng mới cần báo trước một câu.)*
6. **Báo cáo hoàn tất**: Sau khi sửa xong, báo cáo rõ ràng: các file đã sửa, lý do sửa, rủi ro, cách kiểm tra.
7. **Xác minh trước khi báo cáo**: Bắt buộc chạy lệnh kiểm tra tự động trước khi báo cáo hoàn thành:
   ```bash
   npm run check
   ```
   (Lệnh này chạy gộp typecheck, eslint, build và lint-ratchet).
8. **Luôn TỰ TEST rồi mới báo cáo**: `npm run check` chỉ chứng minh code biên dịch được, KHÔNG
   chứng minh tính năng chạy đúng. Sau mỗi lần sửa/nâng cấp, agent phải tự kiểm chứng thay đổi ở
   mức cao nhất có thể rồi **báo cáo kết quả thật** (đã chạy gì, thấy gì), không đẩy toàn bộ việc
   kiểm tra cho người dùng:
   - **UI: dùng Playwright** (đã cài sẵn, `npm run test:e2e`, thêm `--headed` để xem trực tiếp).
     Cấu hình `playwright.config.ts` tự khởi động `npm run dev` và tự tắt khi xong; nếu người dùng
     đang mở sẵn dev server thì dùng lại chứ không tắt server của họ. Test đặt trong `tests/e2e/`.
     Viết test tạm cho đúng thay đổi vừa làm, chạy, xem kết quả/ảnh chụp rồi mới báo cáo.
   - Nếu cần chạy dev server thủ công (`npm run dev`), nhớ **lưu lại PID** — xem quy tắc không tra
     PID theo port.
   - Với logic thuần (parser, hàm tính toán, định dạng): viết script nhỏ trong thư mục scratchpad
     chạy bằng `node`/`npx tsx` với dữ liệu mẫu, đối chiếu kết quả trước/sau.
   - Với tính năng cần dữ liệu thật: dùng dữ liệu giả đã có sẵn cách dựng (xem memory
     `reference_bi_dashboard_seed_data_testing`, `reference_sticker_event_test_accounts`).
   - Nếu thật sự không tự test được (thiếu dữ liệu thật/quyền/thiết bị), phải nói RÕ: đã thử cách
     nào, vướng ở đâu, và hướng dẫn người dùng các bước kiểm tra cụ thể — không nói chung chung
     "chưa test UI thật".

---

## 1. Kiến trúc — 4 khu vực song song (QUAN TRỌNG NHẤT)

Dự án thực tế gồm 4 khu vực "mini-app" song song hoạt động độc lập, không phải 1 hệ thống duy nhất:

| Khu vực | Thư mục chứa | Mount point (`App.tsx`) | Ghi chú / Cách ly |
|---|---|---|---|
| **Root** | `components/`, `hooks/`, `services/`, `contexts/`, `utils/` | Trực tiếp trong `TabContent` | `hooks/` và `services/` ở root chỉ dành cho tab `analysis` và `check-thuong`. |
| **bi-dashboard** | `features/bi-dashboard/` | `<BiWrapper />` (tab `employees`) | Hoàn toàn tách biệt khỏi các khu vực còn lại. |
| **phan-ca** | `features/phan-ca/` | `<PhanCaView />` (tab `tools-phanca`) | Hoàn toàn tách biệt khỏi các khu vực còn lại. |
| **sticker-event** | `features/sticker-event/` | `<StickerPrinterView />` (tab `tools-print-sticker`) | Hoàn toàn tách biệt khỏi các khu vực còn lại. |

**Quy tắc cách ly bắt buộc:**
- ❌ Các thư mục `features/*` **không được import chéo lẫn nhau** và **không được import** `hooks/*` hoặc `services/*` ở thư mục gốc.
- ✅ Cả 4 khu vực chỉ được dùng chung đúng 2 thứ: các UI component trong `components/shared/ui/*` và các hàm thuần tiện ích trong `utils/dataUtils.ts`.
- ✅ **Ngoại lệ thứ 3 (bổ sung 2026-08-31)**: `features/bi-dashboard/` được phép import `services/firebase.ts` ở gốc (chỉ instance `db`/`auth`, KHÔNG import các `services/*` khác) — cần thiết cho tính năng phân quyền theo siêu thị (đọc/ghi collection `biData/{maKho}` dùng chung, xem mục 1.1). Đây là truy cập trực tiếp instance Firebase đã khởi tạo sẵn (không phải import logic nghiệp vụ của root), nên không phá vỡ tinh thần cách ly — ngoại lệ này chỉ cần cho các khu vực dùng chung database `(default)` của project `dashboa-7e20b`. *(Sửa 2026-09-17: bản cũ ghi "chỉ 2 khu vực dùng chung 1 project Firebase" — thực tế cả 4 khu vực dùng chung project này; xem mục 1.1.)*
- ✅ **Ngoại lệ thứ 4 (bổ sung 2026-09-09)**: DUY NHẤT file `features/bi-dashboard/services/analysisEmployeeSyncService.ts` được phép import `services/dbService` ở gốc. File này là **cầu nối có chủ đích** giữa 2 khu vực: đẩy danh sách nhân viên từ Phân Tích (gốc) sang Report BI, nên bắt buộc phải chạm cả 2 phía. Cụ thể nó cần `saveSetting()` của gốc vì hàm đó phát event `ycx-setting-changed` mà `hooks/useCloudSync` ở gốc đang lắng nghe — `saveSetting` riêng của bi-dashboard ghi sang IndexedDB khác (`BI_HUB_DATABASE_V2`) và KHÔNG phát event này. ⚠️ Ngoại lệ được khai trong `eslint.config.js` theo **đúng 1 đường dẫn file**, không phải mở cho cả thư mục: thêm file thứ 2 import `services/` gốc vẫn bị chặn (đã kiểm chứng bằng file dò).
- ⚠️ Một hàm cùng tên ở 2 khu vực khác nhau (ví dụ: `formatCurrency` ở sticker-event dùng in nhãn, khác với rút gọn "1.2 Tr" ở dashboard) **không mặc nhiên là trùng lặp cần gộp**. Kiểm tra ngữ cảnh trước khi dedupe.
- 🔴 **Logic tính toán — Nguồn chân lý duy nhất**: Mọi số liệu doanh thu, doanh thu quy đổi (DTQĐ) và số lượng quy đổi (weightedQuantity) bắt buộc phải tính toán qua hàm chuẩn `utils/dataUtils.ts → calculateRowMetrics()`. CẤM tự ý viết lại công thức tính cục bộ ở nơi khác gây sai số chênh lệch.

---

## 1.1. Backend — Cloud Functions & Firestore Rules (bổ sung 2026-07-17)

Ngoài 4 khu vực frontend ở mục 1, dự án có 1 khu vực **backend thật sự** (không chỉ Firebase BaaS thuần client-to-Firestore):

| Thành phần | Vị trí | Vai trò |
|---|---|---|
| Cloud Functions | `functions/` (project Node/TypeScript riêng, KHÔNG thuộc build Vite) | App gốc: `resolveSession`, `requestAccess`, `adminUpdateUser`, `listManagedUsers`, `generateWithGemini`, `demoteExpiredUsers`. In Sticker: `stickerRegister`, `stickerResolveSession`, `stickerAdminUpdateUser`, `stickerStaffAuth` |
| Firestore Rules — database `(default)` | `firestore.rules` (repo root) | Chặn client (kể cả admin) ghi trực tiếp field nhạy cảm vào `users/{uid}` |
| Firestore Rules — database In Sticker | `firestore.stickerevent.rules` (repo root) | Rules RIÊNG cho database `ai-studio-16672ec9-…`. *(bổ sung vào bảng 2026-09-17: bảng cũ chỉ ghi 1 file rules, khiến dễ tưởng cả dự án chỉ có `firestore.rules` — thêm collection cho In Sticker mà sửa sai file thì rules không có tác dụng gì.)* |

**Bản đồ database → file rules** nằm ở mảng `firestore[]` trong `firebase.json`. `npm run deploy:rules`
deploy CẢ HAI file cùng lúc.

**Quy tắc bắt buộc:**
- 🔴 Mọi thay đổi `role`, `status`, `departmentId`, `expiresAt`, `requestedRole` của user (kể cả tự sửa hay admin duyệt người khác) **bắt buộc đi qua Cloud Function** (`resolveSession`/`requestAccess`/`adminUpdateUser`). **Cấm** `updateDoc`/`setDoc` trực tiếp các field này từ client — `firestore.rules` đã chặn cứng, code client vi phạm sẽ nhận `permission-denied`.
- ⚠️ Khi thêm **collection/subcollection Firestore mới**, **bắt buộc cập nhật file rules ĐÚNG với database của khu vực đó**: root / `features/phan-ca` / `features/bi-dashboard` dùng database `(default)` → sửa `firestore.rules`; `features/sticker-event` dùng database riêng → sửa `firestore.stickerevent.rules`. *(Sửa 2026-09-17: bản cũ ghi "3 khu vực dùng chung project Firebase `dashboa-7e20b`" — thực tế **cả 4 khu vực** dùng chung project đó, sticker-event chỉ khác database. Nói "3 khu vực" dễ khiến người đọc tưởng sticker-event ở project khác nên không liên quan.)* Quên bước này gây lỗi "Missing or insufficient permissions" im lặng (đã xảy ra thật với `users/{uid}/salesData` và `_system/stats` — audit ban đầu bỏ sót vì dùng grep quá hẹp, chỉ bắt `collection(db, 'x')` 1 tham số, không bắt được `collection(db, 'users', uid, 'salesData')` nhiều tham số).
- 🔵 **Phân quyền theo siêu thị ở Report BI** (bổ sung 2026-08-31): dữ liệu Thi đua/Summary Luỹ kế dùng chung theo siêu thị lưu ở `biData/{maKho}/…` — dùng LẠI đúng field `departmentId`/hàm `myKhos()` đã có (1 Kho = 1 Siêu thị trong thực tế công ty, xác nhận với user), KHÔNG có custom claim `allowedSupermarkets` riêng. Chỉ manager/admin được ghi (`isManager()`), mọi user cùng Kho đọc được. Xem `implementation_plan.md` mục "Đợt 4" để biết đầy đủ thiết kế + bảng map "tên siêu thị trong báo cáo" → "Mã Kho".
- `functions/` là project TypeScript độc lập (tsconfig/package.json riêng), bị loại trừ khỏi `tsconfig.json` và `eslint.config.js` ở gốc — không chạy qua `npm run check`, phải tự `cd functions && npm run typecheck && npm run build` để kiểm tra riêng.
- Deploy: `npm run deploy:rules` (deploy CẢ HAI file rules) / `npm run deploy:functions`. *(Sửa 2026-09-18: bản cũ ghi "không phải việc agent tự chạy" — xem mục 0.0, chủ dự án đã cấp quyền.)*
- 🔴 **`features/sticker-event` dùng CHUNG project Firebase `dashboa-7e20b` với 3 khu vực còn lại, chỉ khác *database*** — database `ai-studio-16672ec9-22fb-43a6-b6ee-e59aa8a8c699`, cấu hình động qua `firebase-applet-config.json` — file này **ĐƯỢC commit trong git** và điều đó đúng: nó chỉ chứa cấu hình Firebase *web* (`apiKey`, `projectId`, `authDomain`…), thứ Firebase thiết kế để gửi tới mọi trình duyệt, bảo mật nằm ở Firestore Rules chứ không ở việc giấu `apiKey`. *(Sửa 2026-09-19: bản cũ ghi "gitignored" — SAI, đã kiểm bằng `git ls-files` + `git check-ignore`. Câu sai này từng làm agent nghi CI thiếu file khi điều tra job e2e đỏ.)* Phía Cloud Functions, `functions/src/firebaseAdmin.ts` có sẵn 2 instance: `db` (database `(default)`) và `stickerDb` (database In Sticker).
  *(Sửa 2026-09-17: bản cũ ghi "dùng Firebase project **riêng**" và "**chưa** áp dụng pattern Cloud Functions này, vẫn ghi `role` trực tiếp từ client" — **CẢ HAI ĐỀU SAI**. Đã đo trên code: `firebase-applet-config.json` có `projectId: dashboa-7e20b`; còn `firestore.stickerevent.rules` hiện đã khoá `protectedKeys() = ['role','storeId','username']` khỏi mọi lượt update từ client và **bỏ hẳn `allow create`** — hồ sơ user chỉ tạo được qua Cloud Function `stickerRegister`, đổi role/storeId chỉ qua `stickerAdminUpdateUser`. Câu sai này nguy hiểm thật: nó từng làm agent kết luận sai về nguồn gốc hết hạn mức Firestore, xem `implementation_plan.md` mục "Audit hạn mức đọc/ghi Firestore".)*
- 🔴 **Hạn mức Firestore — trần CỨNG của database In Sticker.** Đo thật bằng
  `./node_modules/.bin/firebase firestore:databases:list --project dashboa-7e20b` (2026-09-18):

  | Database | Edition | Dùng bởi |
  |---|---|---|
  | `(default)` | **STANDARD** | root, bi-dashboard, phan-ca |
  | `ai-studio-16672ec9-…` | **ENTERPRISE** | sticker-event |

  Database In Sticker là **Enterprise edition do Google AI Studio tự tạo** — đây mới là nguyên nhân
  thật của trần cứng (không phải chuyện Spark/Blaze). `(default)` là STANDARD nên có gói miễn phí
  tiêu chuẩn và nâng Blaze được → **di trú sang `(default)` thực sự gỡ được trần**. Database In
  Sticker thuộc diện **"free tier database"**: server trả nguyên văn *"This database cannot exceed free quota limits even when a billing instrument is enabled"*. Nghĩa là **nâng lên gói Blaze cũng KHÔNG nới được** hạn mức cho database này. (Thông báo lỗi không nêu con số; hạn mức đọc miễn phí tiêu chuẩn của Firestore là 50.000/ngày — con số này là suy ra từ tài liệu, chưa phải quan sát.) Hạn mức bị chạm thật ngày 2026-09-17 là hạn mức **ĐỌC**. Khi sửa bất cứ gì trong `features/sticker-event` chạm Firestore, **phải cân nhắc số lượt đọc**: đừng thêm query chạy mỗi lần mở app/mở modal mà không có cơ chế cache hoặc smart-sync theo mốc thời gian (`metadata/sync`). Xem `implementation_plan.md` mục "Audit hạn mức đọc/ghi Firestore" để biết các mẫu đã áp dụng và cách ĐO (`tests/unit/sticker-firestore-quota.test.ts` — bộ mock Firestore đếm chính xác số lượt đọc/ghi/xoá của hàm thật).
- ⚠️ Riêng In Sticker, `role` được dùng qua **custom claim `stickerRole`/`stickerStoreId`** (không phải `role`/`departmentId` của app gốc) — 2 hệ phân quyền tách biệt dù ở cùng project.

---

## 2. Quy chuẩn Thiết kế & Giao diện (Design System)

- **Màu sắc**: Chỉ dùng bảng màu semantic đã duyệt: `sky` (primary), `slate` (secondary), `emerald` (success), `amber` (warning), `rose` (danger). Cấm khai báo custom property màu sắc mới trong `features/*`.
- **Màu ramp (Xoay vòng)**: Khi phân biệt trên 5 hạng mục dữ liệu, dùng pattern "6 họ semantic x 2 tầng sắc độ" (5 màu chuẩn + `indigo`, mỗi họ 2 sắc độ đậm/nhạt), không tự chế màu ngoài palette.
- **UI Components**: Mọi phần tử tương tác (button, input, modal, confirm dialog, badge, select, dropdown) **bắt buộc** dùng components ở `components/shared/ui/*`. Cấm viết `<button>` thô hoặc tự dựng modal `fixed inset-0` mới.
- **Cấm tuyệt đối `window.alert/confirm/prompt`**: Bắt buộc dùng component `<ConfirmDialog />`.
- **Dark mode**: **ĐÃ TẮT toàn dự án** (áp dụng từ 2026-07-10). Cấm viết class `dark:` mới cho các thay đổi giao diện. Các class `dark:` cũ trong code được giữ nguyên (vô hiệu, không cần dọn dẹp).
- **Bo góc** *(sửa 2026-09-10 theo chuẩn "Bảng điều khiển ca trực")*: `rounded` (4px — input/button),
  `rounded-md` (6px — modal/dropdown, thứ NỔI LÊN trên). Bảng và vùng dữ liệu: `rounded-none`.
  ❌ Bỏ `rounded-xl` cho card, ❌ bỏ `rounded-3xl`. Nguyên tắc: **bo góc và đổ bóng nói "tôi ở tầng
  khác" — chỉ dùng cho thứ thật sự nổi lên trên**, đừng nói bừa.
- **Đổ bóng** *(mới 2026-09-10)*: KHÔNG đổ bóng cho khối tĩnh. Chỉ modal và dropdown.
- **Mật độ bảng** *(mới 2026-09-10)*: dòng dữ liệu cao **26px** (đệm `3px 8px`), đầu bảng **28px** và
  bắt buộc dính trên (`sticky`), dải nhóm **24px**. Bảng nhiều cột phải **ghim cột đầu** (`sticky left`,
  viền phải 2px).
- **Trạng thái đạt/chưa đạt**: mã hoá bằng **vạch màu 3px ở mép trái dòng**, KHÔNG dùng viên pill giữa
  bảng. Pill chiếm chiều ngang — thứ khan hiếm nhất ở bảng 48 cột.
- **Cỡ chữ nhỏ nhất là 11px** và phải dùng phông condensed. ❌ Bỏ `text-[10px]` — màn hình siêu thị
  thường là laptop cũ, độ phân giải thấp.
- **Phông**: `UTM Avo` (tự host, `public/fonts/`) cho số và nội dung — **giữ nguyên, không đổi**: đây là
  phông Việt được chọn có chủ đích, đã tinh chỉnh ánh xạ trọng lượng để tránh giả đậm.
  `Roboto Condensed` (đã nạp sẵn trong `index.html`) cho nhãn cột viết hoa.
- **Bảng biểu (Tables)**: Viền mỏng `border-slate-200`, header bảng viết hoa `text-[11px] font-bold tracking-wider`.
  ⚠️ *Sửa 2026-09-10: mục này trước ghi `tracking-tight` là SAI.* Đo trên code thật: trong class mang
  dấu hiệu header bảng, `tracking-wider` **46 lần** vs `tracking-tight` **9 lần** — và `DESIGN_SYSTEM.md`
  cũng ghi `tracking-wider`. Quy tắc sai này đã khiến code mới viết theo bị lệch chuẩn; 8 header còn
  sót dùng `tracking-tight` là di sản của lỗi đó, dọn dần khi có dịp chạm vào file.
- **Đồng nhất thiết kế** *(ĐẢO NGƯỢC 2026-09-10)*: chuẩn mới là **"Bảng điều khiển ca trực"**, áp cho
  **Report BI trước** (Đợt 3), rồi **Phân Tích và các module còn lại đi theo** (Đợt 5).
  Trước đây quy tắc là "lấy Phân Tích làm chuẩn vàng" — nay không còn đúng.
  Đặc tả đầy đủ (13 token màu kèm mã hex, thang chữ, mật độ, mẫu bảng 48 cột) ở `DESIGN_SYSTEM.md`.
  Nguyên tắc gốc: **mỗi pixel dành cho số, không dành cho trang trí** — người dùng là quản lý siêu thị
  liếc màn hình giữa hai lượt khách.

---

## 3. Hiện trạng & Lộ trình rà soát (Tháng 7/2026)

- **Gỡ bỏ any**: Chỉ dùng `any` khi parse dữ liệu Excel raw thô từ Google Sheets hoặc thư viện bên ngoài.
- **Tách tệp cồng kềnh**: Các tệp god-file như `printService.ts` (~1466 dòng) hoặc `StickerPrinterView.tsx` chỉ refactor tách nhỏ khi có yêu cầu cụ thể.
- **Responsive**: View nào có toolbar desktop (portal vào `#global-header-actions`) bắt buộc phải có toolbar mobile `lg:hidden` tương ứng.
- **Tiến độ rà soát**:
  - Đợt 0: Dọn rác nhanh (file chết, unused warnings, console.log).
  - Đợt 1: Hợp nhất logic tính toán DTQĐ về `calculateRowMetrics()` để sửa sai lệch số liệu.
  - Đợt 2: Đồng nhất thiết kế các module còn lại theo module Phân Tích (chuẩn hóa màu, bo góc, border).
  - Đợt 3: Loại bỏ any, hợp nhất modal và tách god-file.
