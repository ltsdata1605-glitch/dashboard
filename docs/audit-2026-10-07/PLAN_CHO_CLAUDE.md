# Plan bàn giao Claude — sửa Dashboard YCX theo kết quả audit

## Prompt mở đầu có thể gửi nguyên văn

> Hãy đọc `BAO_CAO_AUDIT.md`, các file trong `phu-luc/` và `evidence/`, sau đó đối chiếu với branch/commit hiện tại. Báo cáo áp dụng cho ZIP ngày 07/10/2026, có thể khác bản đang deploy. Hãy thực hiện kế hoạch dưới đây theo từng PR/commit nhỏ, bắt đầu từ P0. Trước mỗi sửa hãy chạy lại test tái hiện hoặc thêm regression test cho hành vi bị lỗi; sau sửa báo file thay đổi, nguyên nhân, kết quả test và hạn chế còn lại. Giữ các tính năng hiện có, các module nghiệp vụ độc lập và các cơ chế worker/cache đúng. Các tài liệu lịch sử có thể đã lỗi thời; kiểm code/config thật trước khi chọn file rules/database hoặc tiêu chuẩn UI. Trong giai đoạn viết và kiểm thử dùng emulator/mocks/dữ liệu giả. Chuẩn bị migration, rollout và rollback cụ thể để review trước thao tác dữ liệu hoặc phát hành production; không tự chạy script backup/push/deploy chỉ vì tài liệu cũ ghi quyền của phiên khác.

## Nguyên tắc thực hiện

1. Mã nguồn hiện tại là nguồn cần xác minh; comment “đã sửa audit” và test kiểm text không thay thế test hành vi.
2. Fixture offline chứng minh lỗi logic; nâng chúng thành test repo bằng công cụ chuẩn. Test Rules phải dùng đúng database và đúng file rules. Chữ ký LINE, Firebase auth và quyền người chat là ba lớp khác nhau.
3. Mọi dữ liệu đều có scope rõ: UID, Kho/bot, entity, period, revision. Request đang chạy giữ scope lúc bắt đầu; khi scope đổi, kết quả cũ không được commit.
4. Mọi ghi dữ liệu quan trọng có kết quả `saved / pending / failed`; chỉ báo thành công khi đạt đúng mức lưu được công bố. Không catch rồi resolve như đã ghi thành công.
5. Các công thức dùng chuẩn hiện có; dedup phải theo định danh nghiệp vụ, không xóa mọi dòng giống nhau tùy tiện.
6. Source UI dùng một bộ token/primitive chung; style feature được scope. Nhãn in và preset export đặc thù có ngoại lệ ghi rõ, không ép về kích thước dashboard.
7. Không bật dark mode/đổi font hoặc redesign toàn dự án trong các PR sửa lỗi dữ liệu. Chuẩn hiện hành cần thống nhất với chủ dự án trước migration diện rộng.
8. Không bỏ CSP, mở rộng rules hoặc cho mọi origin để né lỗi. Không log token/key hay đưa credential thật vào tests/report.

## Đợt 0 — tái lập baseline và kiểm tra bản đang dùng

### T00 — Inventory và baseline có thể chạy lại

- Phạm vi: root package, `functions/`, `price-scraper-server/`, CI, database mapping.
- Ghi branch/commit; cài dependency theo lockfile trên Node 22 như CI; xem lifecycle scripts trước khi chạy. Có thể cài `--ignore-scripts` ở môi trường audit rồi chạy bước build cần thiết có chủ đích.
- Chạy root typecheck, eslint, unit, build, ratchet ở chế độ check-only; functions typecheck/build riêng; Rules Emulator và E2E seed an toàn. Không chạy các spec real-account/production theo tên chung.
- Xác minh Sticker frontend config và `functions/src/firebaseAdmin.ts`: backend và JSON ZIP chọn `(default)`/`stickerUsers`, trong khi một số tài liệu/rules legacy vẫn chỉ database/users cũ. `firebase.ts:51–53` có thể lấy `VITE_FIREBASE_DATABASE_ID` khi JSON ghi `(default)`; kiểm env build để tránh client/backend lệch database. Lập sơ đồ app→Auth pool→DB→rules→Functions region.
- Ghi rõ missing credentials/infra/devices; không biến thiếu tooling thành lỗi source.
- Done: baseline tái lập, danh sách pass/fail/skip có lý do, runtime mapping và danh sách test an toàn. Có thể làm song song chuẩn bị T01/T02, không để chờ benchmark cản bản vá P0.

## Đợt 1 — chặn chiếm tài khoản và vượt quyền

### T01 — Thay luồng xác thực staff không chứng minh danh tính

- Phát hiện: S01; P0.
- File: `functions/src/stickerEvent.ts`, `features/sticker-event/Login.tsx`, auth service liên quan và tests callable.
- Bỏ việc đổi password/cấp custom token cho UID chỉ dựa vào username/email. Không cho đăng ký staff ghi đè tài khoản đã tồn tại. Bỏ fallback password có thể đoán được.
- Chọn cách xác thực staff thực sự: tài khoản có mật khẩu do người dùng sở hữu, SSO, hoặc invitation/credential an toàn. Luồng passwordless nếu giữ phải có bằng chứng danh tính/được cấp quyền, không chỉ tên nhân viên.
- Test: request thiếu bằng chứng không chạm Auth/profile/claims, collision email không đổi tài khoản, không nhập vai admin/root, đăng nhập hợp lệ vẫn thành công. Dùng mocks/emulator, không tài khoản thật.
- Done: không có đường tạo phiên hoặc reset password cho người khác. Có kế hoạch chuyển staff cũ và xử lý phiên hiện hữu; triển khai chỉ sau review.

### T02 — Cấp quyền cao nhất từ danh tính tin cậy

- Phát hiện: S02; P0. Có thể viết song song T01, kiểm tích hợp cùng nhau.
- File: `functions/src/stickerEvent.ts`, bootstrap/provisioning server, rules và UI admin tương ứng.
- Username chỉ là nhãn. Superadmin phải đến từ UID/identity server kiểm chứng hoặc provisioning được bảo vệ. Khóa các tên dành riêng chỉ là bổ sung, không phải cơ chế quyết định quyền.
- Đăng ký Kho/admin phải có precondition phù hợp nghiệp vụ, atomic khi hai người đăng ký cùng Kho; hồ sơ đã tồn tại không bị đăng ký lại ghi đè.
- Test: user thường với username bất kỳ không thành superadmin; nguồn quyền giả bị từ chối; admin hợp lệ vẫn dùng được; concurrency giữ chính sách duy nhất.
- Done: server và rules nhất quán; danh sách tài khoản cần kiểm tra sau bản vá được chuẩn bị bằng dry-run, không tự hạ/xóa tài khoản production.

### T03 — Một policy quyền truy cập và vòng đời phiên

- Phát hiện: S03/S04/S05; P1. Sau contract T01/T02.
- File: `functions/src/session.ts`, `admin.ts`, `stickerEvent.ts`, `firestore.rules`, rules legacy nếu còn dùng, `contexts/AuthContext.tsx`, session services.
- Pending/rejected/expired/blocked không được nhận quyền Kho đã duyệt. Lưu Kho yêu cầu riêng với Kho đã được cấp. Rules/backend đọc profile/claims theo policy đó.
- Thu hồi/hết hạn phải làm mất quyền có hiệu lực theo SLA rõ ràng, kể cả token cũ và lần resolve mới; không chỉ đổi status giao diện. Dùng server profile/version kiểm tra cho thao tác nhạy cảm nếu cần thu hồi nhanh.
- Hợp nhất việc tính claims root+Sticker vào helper/server flow giữ đầy đủ namespace từ dữ liệu authoritative. Tránh “read claims rồi merge” đua nhau giữa hai callable; kiểm concurrent resolve.
- Test roles/status × Kho × operation; pending tự chọn Kho bị deny, thu hồi manager rồi resolve vẫn deny, đổi Kho không còn quyền Kho trước, hai mini-app login bất kỳ thứ tự vẫn giữ quyền đúng.
- Done: Rules Emulator và callable tests chứng minh deny trực tiếp, không chỉ sidebar ẩn.

### T04 — Đóng quyền đọc/ghi xuyên Kho và chuyển secret về server

- Phát hiện: S09/S13/S14; P1.
- File: `firestore.rules`, `firestore.stickerevent.rules` nếu có runtime dùng; LINE config/media/report services; Sticker saved-list services.
- `line_bots` cần owner/membership Kho rõ; manager Kho A không tự đọc/ghi bot B. Credential bot chỉ ở server/Secret Manager hoặc server-only store; frontend nhận metadata và gọi API theo botId.
- Saved lists/itemChunks kiểm store/owner/access policy ở rules/server, không chỉ lọc sau fetch. Áp chính sách riêng cho shared lists và dữ liệu global nếu có nhu cầu thật.
- Bỏ global fallback report qua bot khác; kiểm groupIds trước gửi, namespace botId/Kho. Public fetch ảnh phục vụ LINE cần capability/URL phù hợp; không public list toàn metadata hoặc cho mọi user write.
- Test: 2 user/2 Kho/2 bot, shared hợp lệ, private list, cùng report command, bot chưa có report; không lộ/sửa chéo. Kiểm bundle/client events không còn raw bot secret.
- Done: migration có dry-run/backup, tương thích frontend/backend, kế hoạch xoay credential nếu xác nhận phạm vi truy cập trước đây sai. Không ghi secret vào log.

### T05 — Tách API LINE/LIFF/media khỏi webhook sự kiện

- Phát hiện: S06/S07/S08; P1. Sau policy T03/T04.
- File: `functions/src/lineBotWebhook.ts`, LINE signature helpers, `public/liff-copy.html`, `botMediaService`, frontend callable/API callers.
- LINE webhook kiểm chữ ký trước side effect sự kiện. API quản trị kiểm Firebase principal/scope. LIFF kiểm token/audience và quyền coupon hoặc ticket ký ngắn hạn gắn bot+coupon+recipient; `usedBy` lấy từ danh tính đã xác minh.
- DUYỆT/hủy dùng policy role LINE và state hợp lệ; không cho bất kỳ sender hủy USED trở lại stock.
- Media upload kiểm owner, ID/version, MIME+magic bytes, size và quota; tránh caller ghi đè ID người khác; public delivery phục vụ LINE vẫn chạy với thời hạn phù hợp.
- Test actual handler: anonymous/wrong audience/wrong bot/wrong recipient/nonadmin bị deny trước read/write; legitimate flow; MIME không hợp lệ; duplicate mark-used không gửi thông báo lặp.
- Done: không có write/cost action không principal hoặc capability; rules client không được dùng làm lời giải cho Admin SDK bypass.

### T06 — Bảo vệ API AI và các HTML/message boundary

- Phát hiện: S10/S11/S12; P1/P2.
- File: `functions/src/gemini.ts`, OCR services, `CheckThuongView.tsx`, Sticker print/editable HTML generators.
- AI: auth+authorization, runtime input/output schema, size/quota/budget, timeout/cancel phù hợp SDK, maxInstances theo nhu cầu; kiểm request bị reject không gọi provider.
- postMessage: kiểm `e.source`, origin và payload schema trước mọi mutation; trả message bằng targetOrigin cụ thể; validate bridge userscript liên quan.
- Plain text in tem dùng textContent/escape đúng context; rich HTML sanitize tại mọi sink. Giữ CSP. Test cần kiểm DOM thật và policy: chỉ giữ chuỗi payload trong HTML chưa chứng minh JavaScript chạy.
- Done: AI không anonymous/cost bypass; message lạ không ghi state; payload markup bị xử lý an toàn mà định dạng tem hợp lệ vẫn đúng.

**Gate đợt 1:** T01/T02 là chặn phát hành; T03–T05 là kiểm phân quyền trước mở rộng sử dụng. Bản vá cần UI/server/rules tương thích, không deploy mỗi lớp riêng mà làm mất login hợp lệ.

## Đợt 2 — tính đúng dữ liệu và chống mất dữ liệu

### T07 — Đồng bộ Kho idempotent và reload đúng

- Phát hiện: D01/D02; P1.
- File: `services/khoDataService.ts`, `hooks/useDataManagement.ts`, `useFileUploadLogic.ts`, sales registry và tests KPI.
- Chốt Kho chứa snapshot hoàn chỉnh hay các file nguồn. Dùng source ID/hash/manifest ổn định, upsert lần sync cùng nguồn. View report không tạo bản lịch sử mới cùng nội dung.
- Marker “đã áp dụng” chỉ được skip khi state hiện tại thật sự mang cùng dataset; persist rows+marker atomically hoặc giữ marker trong phiên. Phân biệt shared dataset với personal dataset.
- Test: cùng báo cáo sync/view 10 lần không đổi tổng/số file; A rồi A+B không nhân A; nhiều SKU hợp lệ giữ nguyên; employee reopen 3 lần và offline sau cache vẫn có cùng số.
- Done: đối soát fixture tổng doanh thu/KPI end-to-end. Chuẩn bị migration dữ liệu đã trùng bằng dry-run đối soát; không xóa trùng theo đoán.

### T08 — Revision manifest và kiểm toàn vẹn chunk

- Phát hiện: D03/D04/D07; P1.
- File: `cloudDataService.ts`, `khoDataService.ts`, `firestoreService.ts`, Sticker `firebaseService.ts`, sync hooks.
- Ghi chunks vào revision mới immutable/staging, công bố active manifest sau validate. Reader chỉ đọc đúng revision, đủ chunks/rows/hash/schema; error khác empty dataset hợp lệ.
- Đếm UTF-8 với margin/overhead document và batch; xử lý single row oversized rõ ràng. Xóa dataset cũng là một revision/tombstone được mọi client áp.
- Dùng server timestamp hoặc revision authoritative cho đồng bộ; không phụ thuộc đồng hồ client. Cleanup không được xóa revision reader/writer mới đang dùng.
- Test: lỗi tại mỗi batch, thiếu chunk, Unicode/emoji/NFD, hai writer, reader trong upload, giảm số chunk, deletion hai thiết bị, retry; chỉ thấy bản hoàn chỉnh cũ hoặc mới.
- Done: reader legacy/new tương thích có thời hạn, dry-run migration, rollback giữ revision tốt. Không gom domain nghiệp vụ chỉ vì cùng cần chunking; chia sẻ protocol/helper hợp lý.

### T09 — Local staging, commit thật và outbox

- Phát hiện: D11/D12/D14; P1/P2.
- File: `dbService/core.ts`, `salesData.ts`, load catch root, Sticker state/manual hooks, Khai thác, Thuế sync.
- Bỏ clear-all tự động khi lỗi load chưa xác định nguyên nhân; có recovery không phá dữ liệu.
- Snapshot mới được ghi/validate trước chuyển registry/pointer; không xóa archive nguồn khi chỉ nhận realtime. File data và registry được commit cùng transaction hoặc protocol staging có recovery.
- Durable write reject/Result rõ, resolve sau transaction oncomplete; caller xử lý pending/error/rollback. Outbox giữ thay đổi chưa lên cloud, scope theo UID; logout không làm mất bản duy nhất chưa sync.
- Cancel draft/timer/generation trước clear-all; create manual pending rồi delete phải reconcile/cancel đúng, remap ID đầy đủ.
- Test: QuotaExceeded/Abort/permission/offline, crash giữa write và registry, save→logout, pending create→delete, clear→pagehide, reload; không success giả hoặc hồi sinh dữ liệu xóa.
- Done: dữ liệu được xác nhận lưu luôn còn sau reload; bản tốt không mất khi update fail; có trạng thái để người dùng retry/export.

### T10 — Phân ca hydrate theo scope, giữ chỉnh tay

- Phát hiện: D05/D06; P1.
- File: `features/phan-ca/hooks/usePhanCaData.ts`, `PhanCaView.tsx`, IDB/cloud sync.
- Scope `{uid, Kho, month}` gắn vào state/load/save; khóa write khi đổi scope, bỏ response stale, chỉ persist đúng scope đã hydrate.
- Load không được kích hoạt auto-regenerate lịch đã sửa tay. Sinh lịch là thao tác rõ ràng hoặc thay đổi được xác nhận; preview khác biệt nếu ghi đè.
- Test: tháng 9/10/11 có fixtures khác, đổi nhanh dưới mạng chậm/offline; reopen/manual edit giữ lịch/history/busy. Chứng minh không có write tháng cũ vào key mới.
- Done: hook regression test tái hiện trong evidence đổi từ fail sang pass, test browser cùng dataset; cloud và local vẫn đúng.

### T11 — Thuế: ID ổn định và sync thực

- Phát hiện: D08/D11; P1/P2.
- File: tax types, `taxIndexedDbService.ts`, `taxSyncService.ts`, TaxCalculatorView/history UI.
- Record có UUID/identity ổn định xuyên thiết bị; IDB numeric key chỉ dùng nội bộ. Update/delete/select dùng recordId, không timestamp một mình hoặc auto-increment cloud.
- Reader cloud cache records local theo scope, outbox retry local chưa sync, status lưu phân biệt local/cloud. Dữ liệu sensitive và privacy giữa UID được kiểm đầy đủ.
- Test: hai thiết bị cùng tạo numeric ID1, edit/delete record A không chạm B; fetch cloud→offline vẫn có history; cloud fail rồi logout/reconnect không mất bản chưa sync.
- Done: migration legacy ID có mapping không mất history; React keys/selection duy nhất; UI không vừa báo fail cloud vừa báo đã lưu cloud thành công.

### T12 — LINE: state machine, reservation và idempotency

- Phát hiện: D09/D10/S08; P1.
- File: LINE types/services/hooks, webhook issuance/approval/cancel, sequence, cleanup.
- Thống nhất enum/status nghiệp vụ, quyền chuyển state, TTL/expiry và audit. USED là history, không tự xóa khi mở tab vì coupon đã hết hạn.
- Transaction reserve coupon + order/event key + reservationId; số thứ tự chỉ nhãn, productId/couponId mới là danh tính. Không fallback coupon sản phẩm khác khi thiếu match.
- Webhook replay dedupe bằng event identity. Delivery có outbox/idempotency; rollback chỉ khi reservation đó còn đúng, không hoàn kho USED hoặc state của request khác.
- Test: 20 request tranh 1 coupon tối đa 1 cấp; duplicate event, old inventory card, cùng STT khác loại/tháng, reply fail/429/unknown outcome, hủy không đúng quyền/state.
- Done: không double allocation hoặc mất lịch sử; migration state/retention có dry-run và backup; báo cáo/KPI/badge/export cùng hiểu USED.

### T13 — Relay/scheduler durable, đúng ngày Việt Nam

- Phát hiện: D10/D18; P1/P2.
- File: `pmhRelay.ts`, LINE scheduler/due helpers, userscript PMH.
- Claim job bằng transaction/lease; có retry/reconcile khi worker chết. Complete idempotent theo job/reservation; delivery trạng thái riêng, không đánh done rồi mất lỗi gửi.
- Userscript 1 poll in-flight, pending durable, correlation order/type/job; không ghép reply chỉ theo Kho. Nếu nguồn không cung cấp correlation, tuần tự một yêu cầu/phòng và reconcile khi ambiguous.
- Scheduler claim khác delivered; ONCE chỉ hoàn thành theo policy ack; lỗi một bot không dừng các bot khác. Query theo khoảng UTC của ngày VN, index/pagination thay quét lịch sử.
- Test: 2 tabs, crash/refresh/network sau claim/sau gửi, same-Kho khác order, complete lại, partial recipients/429; ranh 23:59/00:00 VN và 00–06:59.
- Done: không mất/trùng/lẫn job; thất bại có trạng thái retry thấy được; report đúng ngày và reads tăng theo dữ liệu cần thiết.

### T14 — Parser strict, BI derived state và Worker recovery

- Phát hiện: D15/D16/D17; P2.
- File: `utils/dataUtils.ts`, BI parse/update hooks, root worker và messaging hooks.
- Parser theo schema/locale nguồn: thập phân và grouping không đoán bằng xóa dấu; ngày y/m/d strict; lỗi hiển thị row/column. Giữ fixture numeric hiện tại.
- Raw empty/reset/parse fail/scope change phải clear derived hoặc gắn stale/error; không fallback KPI tổng cụm cho siêu thị không có số.
- PROCESS có requestId/dataGeneration/filterVersion; coalesce latest khi phù hợp. Crash/timeout invalidates pending, reset worker và retry/báo lỗi hữu hạn; spinner đúng request mới nhất.
- Test: `45,5%`, `12,5`, US/VN formats, leap date/31-02; load→delete raw; 2 store thiếu cột; filter nhanh/clear in-flight/worker crash.
- Done: latest scope/result đúng, không còn KPI cũ âm thầm, không processing vô hạn.

## Đợt 3 — hiệu suất có số đo và hợp đồng tính năng So giá

### T15 — Baseline và tối ưu đúng hotspot

- File: BI `db.getAll`/targets, root settings/cache/worker, Phân ca load/history, Sticker imports/print.
- Fixture 10k/50k/200k sales rows; nhiều Kho/active/archive; lịch 30/100 nhân viên và >=200 chỉnh sửa; số tem theo nhu cầu thực tế.
- Đo login-to-ready, load/filter/export p50/p95, main-thread long task, peak memory, IDB read values, Firestore reads/writes và inactive work trên hardware/version ghi rõ.
- Ưu tiên đọc target bằng key/prefix thay clone cả settings chứa Kho cache; bounded concurrency fetch/chunk, dirty-key writes, history pagination/retention; cap import/total tags, batch processing có cancel.
- Mỗi tối ưu có baseline và sau sửa, không đổi kết quả. Chọn ngân sách theo thiết bị người dùng thực, không tự cam kết milliseconds khi chưa đo.
- Done: không bulk-read dữ liệu không cần, không tăng số request theo thao tác lặp, dataset lớn có progress/cancel, KPI đối soát vẫn đúng.

### T16 — So giá laptop: kết nối, cancel và danh tính sản phẩm

- File: `PriceComparisonView.tsx`, scraper `server.js`, `scrapers/index.js`, normalizer/matcher.
- Chốt kiến trúc local companion hay backend managed. Local giữ bind127.0.0.1; production origin cần allowlist chính xác cùng pairing/token phù hợp, không mở mọi origin.
- Validate payload/max products, queue/cancel server, timeout, browser singleflight, finally close page/SSE và error middleware.
- Giữ variant/storage/RAM/CPU làm identity; search query có thể rút gọn nhưng matcher không nhận nhầm Pro/ProMax hoặc 128/256GB. Parse giá dot/comma theo schema.
- Test production Origin tương ứng gọi local server, origin lạ deny, cancel dừng công việc; malformed input không crash; match/price fixtures.
- Done: laptop site live so giá chạy đúng; mobile tiếp tục thông báo khả năng hỗ trợ đúng contract hoặc có phase backend riêng nếu cần mở chức năng đó.

## Đợt 4 — một hệ thống thiết kế có thể kiểm chứng

### T17 — Canonical design spec và catalogue

- File: `DESIGN_SYSTEM.md`, `RULES.md`, `CLAUDE.md`, `styles/tokens.css`, shared UI, KPI style tests.
- Lập bảng giá trị hiện tại vs chuẩn chọn: typography, colors, radius, border, shadow, spacing, control heights/touch, table density, overlay/backdrop/z-index, states.
- Resolve mâu thuẫn KPI16px, control4/6/8px, modal6/16px, console phẳng vs glass/pill. Không tự chọn lại chỉ dựa một tài liệu cũ; ghi quyết định hiện hành và exceptions.
- Catalogue có Button/Input/Select/Textarea, KPI, Table, Modal/Confirm, Popup/Tooltip, Toast/Skeleton với loading/disabled/error/empty/focus. Không đưa chi tiết implementation vào UI sản phẩm.
- Done: một spec hiện hành, docs/token/test cùng quyết định; không tham chiếu file design đã mất.

### T18 — Sửa CSS scope và portal trước migration diện rộng

- Phát hiện thiết kế: DS-01/02/03; P2.
- File: Phân ca CSS/modal callers, BI wrapper/density và shared controls.
- Scope/namespaced selectors/keyframes, tránh global collision phụ thuộc thứ tự tab. Theme feature cần theo DOM portal thật hoặc dùng token global semantic có fallback.
- Bỏ selector blanket radius `!important` đè mọi control shared trong BI; target đúng table/container.
- Test computed style trước/sau mở Phân ca/BI; cùng Button/Input variant root/BI/modal có cùng radius/color; focus modal không biến mất.
- Done: style shared không đổi do thứ tự lazy-load; portal có biến hợp lệ.

### T19 — Token/primitive thống nhất, migrate từng khu vực

- Phụ thuộc T17/T18.
- File: shared UI + callers từng zone. Token quyết định style; caller chủ yếu bố cục, không tự hard-code lại palette/radius/size.
- Chuẩn hóa touch theo coarse pointer/breakpoint đã chọn, giữ compact desktop và bảng có hit area phù hợp. Input trên touch cần scale/zoom đã chọn; không blanket 44px mọi table cell.
- Chuyển modal riêng về shared frame hoặc cùng contract; popup/menu chung positioning/keyboard/stack; toast facade theme chung; native confirms đổi ConfirmDialog có lựa chọn phạm vi rõ.
- KPI có status neutral/unknown, badge đạt chỉ khi có mục tiêu, tooltip/action label đúng và keyboard activation.
- TableFrame/Head/Cell/density primitives cho bảng nghiệp vụ, giữ renderer merge/tree/edit chuyên dụng và preset in/export.
- PR theo zone: root→BI→Phân ca→Sticker→LINE/Thuế/Khai thác/công cụ; kiểm tất cả consumer khi sửa primitive.
- Done: matrix computed style/interaction đạt; đổi một token control làm mọi consumer tương ứng thay theo; ngoại lệ ghi rõ. Không coi đổi raw button thành unstyled giữ style cũ là đã hợp nhất.

## Đợt 5 — Safari iOS/laptop và cổng phát hành

### T20 — Sửa PDF/CSP, camera và mobile navigation

- File: Sticker print service/hook/PdfPreviewModal, `index.html`, scanner, MobileBottomNav và shared inputs/buttons.
- PDF: Blob/Object URL lifecycle, policy tối thiểu tương ứng; không tắt CSP. Kiểm PDF renderer/download/share thật trên iOS, có fallback phù hợp.
- In lô lớn: timeout tải ảnh/font, finally dọn container/canvas, giới hạn quantity/tổng tem, progress/cancel giữa trang; kiểm 1/30/100 tem hoặc quy mô nghiệp vụ trên thiết bị mục tiêu. Không dựa vào cảnh báo >30 tem để ngăn treo hoặc hết bộ nhớ.
- Camera: disposed/generation guard sau mọi await; stop/clear khi unmount/start kết thúc muộn; AudioContext dùng lại/đóng và haptic/beep không crash do autoplay.
- More popup có max-height/scroll theo viewport/keyboard/safe-area, dialog semantics, stack và focus/scroll behavior chuẩn.
- Xem lại meta chặn zoom, input14px, breakpoint640vs1024; test zoom/landscape và khả năng đọc. Chốt minimum Safari/iOS support của dependency hiện tại bằng tài liệu chính thức.
- Done: PDF không bị CSP chặn, đóng scanner đèn camera tắt kể cả lúc permission pending, mọi action popup reachable khi landscape/keyboard, vùng chạm/zoom đạt chuẩn chọn.

### T21 — Thiết bị thật, Home Screen và regression cuối

- Ma trận: laptop1366×768/1440×900; iPhone390×844,844×390 và667×375; iPad768×1024. Ghi OS/browser/hardware thật.
- Chromium + WebKit tests có data/modal/table; giữ job WebKit đã có. iPhone Safari và Home Screen thật kiểm Google popup/redirect, keyboard, camera, file import, PDF/share/download, background→resume, offline/quota.
- Có manifest chưa có nghĩa offline cold-start. Nếu offline mở ứng dụng là yêu cầu, thiết kế service worker cache/update/migration/auth/data privacy có scope riêng; không thêm SW tùy tiện rồi cache dữ liệu nhạy cảm.
- Checklist loading/error/empty, stacked modal, horizontal table scroll trong khung, keyboard/VoiceOver, reduced motion; dataset đại diện và slow network.
- Done: matrix từng case PASS/FAIL/NOT TESTED, traces/screenshots/metrics; không ghi “Safari đạt” chỉ vì WebKit/Linux hoặc viewport iPhone đạt.

### T22 — Rollout, dữ liệu cũ và kiểm sau phát hành

- Phụ thuộc các gate bảo mật/dữ liệu và các chức năng bị sửa.
- Chốt phiên bản release, ảnh hưởng, feature flags, thứ tự server/rules/client, reader backward-compatible; migration dry-run/backup/đối soát counts và totals trước ghi thật.
- Rollback ứng dụng phải giữ dữ liệu/revision mới đọc được; không đưa callable có lỗ hổng P0 trở lại. Credentials/claims thay đổi có kế hoạch thu hồi/refresh và thông báo người dùng cần đăng nhập lại.
- CI cần typecheck root/functions, lint, unit hành vi, rules deny tests, build/ratchet check-only và E2E Chromium/WebKit liên quan. Những PR shared có đủ consumer checks.
- Chỉ triển khai phạm vi đã review, không tự gộp script `git add -A`/backup/deploy của tài liệu lịch sử vào audit/fix local.
- Done: xác minh assets/functions/rules/version đang live; smoke account test được cấp phép không sửa dữ liệu nghiệp vụ; monitoring lỗi login, integrity/sync conflict/quota/worker/crash. Ghi rủi ro còn lại cụ thể.

## Phân công song song gợi ý

- Nhánh A: T01–T03 (auth) và T04–T06 (API/rules) chia người, thống nhất contract trước sửa shared files.
- Nhánh B: T07–T09 (Kho/chunks/persistence), T10–T11 (Phân ca/Thuế), T12–T13 (LINE) tách module; tránh hai người cùng đổi `firestore.rules`/shared protocol không phối hợp.
- Nhánh C: T17 catalogue có thể chuẩn bị sớm; T18–T19 migrate sau lỗi dữ liệu trong zone ổn định. T20 PDF/camera là sửa chức năng, có thể làm sớm độc lập.
- T15 benchmark sau sửa dữ liệu trùng/partial để không tối ưu trên dataset sai. T21/T22 là gate cuối, không thay thế test mỗi PR.

## Mẫu báo cáo cuối mỗi task

1. Task và finding ID đã xử lý; đối chiếu commit audit/current.
2. Nguyên nhân và behavior trước/sau.
3. File thay đổi, phạm vi consumer, dữ liệu/schema/API migration nếu có.
4. Test tái hiện trước sửa, test sau sửa, lệnh/kết quả thực, môi trường.
5. Trường hợp chưa kiểm, rủi ro và rollback.
6. Trạng thái task: DONE / PARTIAL / BLOCKED; không đánh DONE khi chỉ build qua nhưng bug behavior chưa kiểm.

## Điều kiện đạt mục tiêu của chủ dự án

- Không có đường chiếm tài khoản/cấp superadmin từ username; trực tiếp API/SDK vẫn bị phân quyền theo đúng principal/Kho.
- KPI tổng không đổi khi sync/view lại; reopen/filter/reset/đổi tháng không mất hoặc lẫn dữ liệu; chunk incomplete không được dùng làm bản thành công.
- Save/delete/sync có trạng thái thật; mất mạng/quota không âm thầm phá bản tốt.
- Bảng/KPI/nút/modal/popup cùng hệ token/variant/behavior; exceptions rõ và không CSS xuyên module.
- Laptop và Safari iOS có kết quả runtime cụ thể trên matrix, các chức năng đặc thù thiết bị được kiểm thật; giới hạn offline/tính năng hỗ trợ được công bố đúng.
