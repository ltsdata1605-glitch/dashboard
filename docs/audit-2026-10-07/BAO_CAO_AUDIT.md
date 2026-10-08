# Báo cáo audit Dashboard YCX

Ngày kiểm tra: 07/10/2026. Nguồn: ZIP `dashboard-main (2).zip` do chủ dự án cung cấp. Không suy luận rằng mã đang deploy giống hệt ZIP.

## Kết luận trực tiếp

**Đây là một web app thật, có frontend React/Vite, backend Firebase Functions, Firestore và lưu trữ IndexedDB. Tuy nhiên, bản mã này chưa đủ an toàn và ổn định để được coi là đã hoàn thiện.** Có hai đường lỗi nghiêm trọng trong xác thực In Sticker, cùng nhiều lỗi phân quyền, đồng bộ và tính đúng dữ liệu cần xử lý trước khi tối ưu giao diện. Cấu hình deploy còn hai bộ rules; backend Sticker và JSON trong ZIP chọn `(default)` chung với root, trong khi nhiều tài liệu vẫn mô tả database riêng. Frontend có nhánh override bằng `VITE_FIREBASE_DATABASE_ID` ngay cả khi JSON ghi `(default)`. Phải kiểm tra instance/config/env đang dùng trước khi sửa rules; chưa có dữ liệu build-env production để kết luận runtime.

**Giao diện chỉ đồng nhất một phần.** Dự án đã có thư viện UI, icon, export và token chung. Các bảng, KPI, nút, modal và popup vẫn có nhiều cách dựng/style riêng; dùng chung component không bảo đảm đồng nhất khi caller tự ghi đè style. Các tài liệu quy chuẩn còn mâu thuẫn.

**Đã có nhiều hỗ trợ laptop và iOS nhưng chưa thể xác nhận tối ưu Safari iOS.** Có responsive, safe-area, `dvh`, PWA manifest và job WebKit trong CI. Vẫn có lỗi luồng PDF khi in tem, rủi ro camera sau đóng modal, vùng chạm ở landscape/iPad và phần chưa có kiểm thử thiết bị thật. Tính năng So giá phụ thuộc server riêng trên laptop; không hoạt động trên iPhone theo thiết kế hiện tại.

## Phạm vi và mức độ xác minh

- Lập inventory toàn bộ 980 file thực trong ZIP; số 1.123 entry của ZIP gồm cả thư mục. SHA-256 archive: `84f751763e3a357e0b65ee3faa512addc99f0306df7b6bfe9067567667403901`.
- Rà soát xuyên frontend gốc, BI, Phân ca, Sticker, Khai thác, Check thưởng, Thuế, LINE, Cloud Functions, hai file rules, cấu hình, tests và scraper. Các phụ lục ghi rõ file đã đọc đầy đủ và file đọc trọng tâm. Không khẳng định đã đọc từng dòng mọi asset, tài liệu lịch sử, userscript dài hoặc mọi nhánh UI.
- Parse cú pháp 459 file `.ts` bằng Node: không có lỗi parser. Đây **không phải** TypeScript typecheck; không kiểm tra JSX/TSX, import resolution hoặc logic nghiệp vụ.
- Chạy thân hàm/service/hook gốc trong mô phỏng cục bộ với adapter giả cho Firebase/React/IndexedDB: đã tái hiện lỗi xác thực, LINE, Thuế và Phân ca. Không gọi Firebase hoặc LINE production; không tạo/chỉnh tài khoản thật.
- `npm ci` không hoàn tất vì proxy mạng không kết nối được. `typecheck`, `test:unit`, `build` dừng vì thiếu `tsc`, `vitest`, `vite`. Đây là hạn chế môi trường, **không phải bằng chứng source build lỗi**. Chưa chạy đầy đủ suite, Rules Emulator hoặc Playwright.
- Chưa kiểm tra IAM, App Check/IAP thực tế, rules đang deploy, dữ liệu thật, header hosting, iPhone/Safari thật, thời gian tải hoặc benchmark trên laptop thật.

Mức xác minh: **M** = tái hiện thân mã gốc với mocks offline; **T** = xác nhận bằng đọc luồng mã; **R** = rủi ro cần kiểm thử runtime. Mô phỏng chứng minh hành vi mã trong điều kiện fixture, không chứng minh đã xảy ra sự cố production.

Ưu tiên: **P0** cần xử lý khẩn cấp do nguy cơ chiếm tài khoản/quyền cao nhất; **P1** bảo mật, sai/mất dữ liệu hoặc hỏng chức năng quan trọng; **P2** độ ổn định, trải nghiệm, hiệu suất và bảo trì. Mức ưu tiên tính cho bản mã được cung cấp.

## 1. Đăng nhập, phân quyền và backend

| ID | Ưu tiên / chứng cứ | Phát hiện và tác động | Vị trí chính |
|---|---|---|---|
| S01 | P0 / M | `stickerStaffAuth` không đòi xác thực/quyền sở hữu. Nhánh đăng ký nhận email của tài khoản đã tồn tại, đổi password, ghi profile staff và tạo custom token cho UID đó. Nhánh login staff cũng không có chứng minh danh tính. Auth pool dùng chung nên phạm vi ảnh hưởng có thể vượt In Sticker. | `functions/src/stickerEvent.ts:313`, `:321`, `:348`, `:375`, `:383`, `:400` |
| S02 | P0 / M | Người dùng đã đăng nhập có thể gửi username được dành cho quản trị để nhận `stickerRole=superadmin`; quyền cao nhất được suy từ tên do client chọn. | `functions/src/stickerEvent.ts:14`, `:37`, `:88` |
| S03 | P1 / M+T | User chưa được duyệt tự chọn Kho; `resolveSession` vẫn cấp claim Kho đó. Rules đọc doanh số/BI chỉ kiểm đăng nhập và Kho, không kiểm duyệt. Có đường đọc dữ liệu Kho khi còn pending. | `functions/src/session.ts:143`, `:109`; `firestore.rules:72`, `:76`, `:90` |
| S04 | P1 / M | Thu hồi bằng status expired không hạ role/department tương ứng. Sau phiên resolve mới, user vẫn có claim manager. Cần tách lỗi này khỏi độ trễ hết hạn token thông thường. | `functions/src/admin.ts:77`, `:90`; `functions/src/session.ts:69`, `:93` |
| S05 | P1 / M | Root và Sticker dùng `setCustomUserClaims` để thay toàn bộ claims, xóa namespace của nhau; đăng nhập mini-app này có thể làm mini-app kia mất quyền. | `functions/src/session.ts:109`; `functions/src/stickerEvent.ts:24` |
| S06 | P1 / M | HTTP `mark-used` được xử lý trước kiểm chữ ký webhook, không xác thực Firebase/LIFF; có thể sửa coupon cùng code thuộc nhiều chủ bot và giả tên người dùng. | `functions/src/lineBotWebhook.ts:1722`, `:1997` |
| S07 | P1 / M | `uploadMedia` cho caller không xác thực ghi document do họ chọn, kể cả ID đã tồn tại và MIME tùy ý. Có nguy cơ ghi đè ảnh, lạm dụng lưu trữ; không kết luận mọi MIME đều đã khai thác XSS thực tế. | `functions/src/lineBotWebhook.ts:1661` |
| S08 | P1 / M | Lệnh DUYỆT không xác minh người gửi thuộc admins; lệnh hủy có thể trả coupon USED về UNUSED từ người không phải người nhận. Chữ ký LINE xác nhận nguồn webhook, không xác nhận quyền nghiệp vụ của người chat. | `functions/src/lineBotWebhook.ts:2264`, `:2827` |
| S09 | P1 / T | Ảnh báo cáo/command có đường lưu và fallback toàn hệ thống; bot khác có thể lấy ảnh không thuộc bot/Kho của mình khi dùng lệnh báo cáo. | `features/line-bot/services/lineBotFirestoreService.ts:301`; `functions/src/lineBotWebhook.ts:2166`, `:2173` |
| S10 | P1 / M+T | OCR phiếu lương có thể gọi nhà cung cấp AI từ request không có auth; chưa có quota ứng dụng hoặc giới hạn payload chặt. Rủi ro tiêu hao ngân sách và hạn mức. | `functions/src/gemini.ts:124` |
| S11 | P2 / M có điều kiện | Listener Check thưởng nhận message từ source/origin lạ vẫn ghi state. Khai thác trên browser cần có window reference; chưa chứng minh framing/COOP production. Không khẳng định đã rò dữ liệu về sender. | `components/views/CheckThuongView.tsx:51`, `:78`, `:106` |
| S12 | P2 / T; XSS thực thi chưa xác minh | Tên sản phẩm/phiếu nhập từ Excel và rich text đi vào HTML in/editable thiếu escape/sanitize ở một số đường. Đã xác nhận HTML injection/source-to-sink; CSP trong ZIP chặn inline script nên không khẳng định event-handler chạy hoặc chiếm phiên. Cần test payload vô hại trên đúng DOM in. | `features/sticker-event/stickerprinter/pageHtmlUtils.ts:184`; `features/sticker-event/hooks/useStickerPrinterData.ts:1518`; `features/sticker-event/services/printService.ts:1335`, `:1468`; `features/sticker-event/stickerprinter/useContentEditable.ts:22` |
| S13 | P1 / T | Rules `line_bots` cho mọi manager đọc/ghi mọi bot, không giới hạn Kho; config chứa access token/secret. Rules report/media còn cho public read và mọi user đăng nhập write. Đây là vượt ranh giới dữ liệu/credential giữa các chủ bot. | `firestore.rules:167–185`; `features/line-bot/services/lineBotFirestoreService.ts:123`, `:141` |
| S14 | P1 / T | Saved lists và itemChunks Sticker cho mọi tài khoản đăng nhập đọc/ghi, không kiểm storeId/owner; lọc danh sách ở frontend không bảo vệ dữ liệu. Rule permissive này cũng tồn tại trong file rules legacy. | `firestore.rules:152–156`; `firestore.stickerevent.rules:33–46` |

S01 không chỉ là “mật khẩu yếu”: backend có thể đổi password và tạo token của người khác. S02 không chỉ là “ẩn nút admin”: backend tự cấp claim superadmin. Nếu các hàm đang deploy trùng bản ZIP và endpoint truy cập được, hai lỗi này cần được xử lý trước các việc còn lại.

Những phần bảo vệ đã có: backend riêng xử lý nhiều thao tác user, rules chặn client ghi field phân quyền root, manager được lọc Kho ở server, một số webhook có kiểm chữ ký, CSP đã enforce, và DOMPurify được dùng ở một số đường. Các lớp này cần giữ lại và hoàn thiện; chúng chưa bảo vệ tất cả entry point.

## 2. Tải, xử lý, đồng bộ và tính đúng dữ liệu

| ID | Ưu tiên / chứng cứ | Phát hiện và tác động | Vị trí chính |
|---|---|---|---|
| D01 | P1 / M | Nhân viên chỉ nhận dữ liệu Kho: snapshot “đã áp dụng” được lưu qua phiên, nhưng dữ liệu đang hiển thị không được persist cùng marker. Lần mở sau bỏ apply vì snapshot bằng nhau dù state vừa khởi tạo rỗng. Proof: lần đầu 2 dòng, lần hai 0 dòng. | `hooks/useDataManagement.ts:575–592`; `services/khoDataService.ts:366` |
| D02 | P1 / M | Re-sync lịch sử tạo file auto-ID từ toàn bộ merged dataset, fetch lại nối mọi file active không dedup. Proof cùng dữ liệu tải hai lần cho doanh thu 2 triệu thay vì 1 triệu. Retention theo tuổi file không xử lý trùng. | `services/khoDataService.ts:89`, `:308`, `:384`; `hooks/useDataManagement.ts:893` |
| D03 | P1 / M+T | Root sales và Sticker ghi đè chunk đang active qua nhiều commit, thiếu revision immutable. Reader có thể thấy tập trộn khi upload lỗi/cạnh tranh; đã tái hiện root trả thành công 1 dòng dù metadata báo 2 dòng/2 chunk. Heavy config cũng cần versioning/integrity. | `services/cloudDataService.ts:146–156`, `:223`; `features/sticker-event/services/firebaseService.ts:97–174`, `:180`; `services/firestoreService.ts:286` |
| D04 | P1 / M | Chunk dùng số ký tự JSON làm số byte; fixture tạo chunk khoảng 819 nghìn ký tự nhưng riêng nội dung string hơn 1,09 triệu byte UTF-8, vượt 1MiB trước overhead. Row quá lớn cũng cần xử lý riêng. | `services/cloudDataService.ts:72–89` |
| D05 | P1 / M | Chuyển tháng Phân ca vẫn để cờ hydrated true, effect persist ghi state tháng cũ vào key tháng mới trước khi load xong. Mô phỏng hook gốc đã tái hiện ghi đè lịch tháng 10 bằng lịch tháng 9. | `features/phan-ca/hooks/usePhanCaData.ts:161`, `:253`, `:261` |
| D06 | P1 / T | Khi hydrate danh sách nhân viên, effect đặt timeout sinh lịch mới; lịch đã sửa tay có thể bị tạo lại khi mở tính năng. | `features/phan-ca/PhanCaView.tsx:205–211` |
| D07 | P1 / M | Xóa bảng giá/tồn Sticker không tăng sync revision; client lại chỉ áp dữ liệu cloud có length > 0. Mô phỏng delete + loader thật xác nhận thiết bị khác vẫn giữ giá cũ, kể cả khi ép timestamp mới nhưng dữ liệu trả về rỗng. | `features/sticker-event/services/firebaseService.ts:235–247`; `features/sticker-event/hooks/useStickerEventDb.ts:180–203` |
| D08 | P1 / M | Hai thiết bị có ID lịch sử Thuế auto-increment giống nhau. Update theo ID có thể sửa cả hai record cloud; select/delete cũng mất tính duy nhất. | `features/tax-calculator/services/taxIndexedDbService.ts:27`; `features/tax-calculator/services/taxSyncService.ts:99`, `:127`, `:157`; `features/tax-calculator/TaxCalculatorView.tsx:249`, `:269` |
| D09 | P1 / M | Hai request LINE đọc cùng coupon UNUSED trước khi reserve. Transaction sequence chỉ giữ số thứ tự, không giữ coupon; đã tái hiện cấp một coupon cho hai người. | `functions/src/lineBotWebhook.ts:2628`, `:2722–2765` |
| D10 | P1/P2 / M predicate+T | Dọn coupon xem USED là stock vì chỉ loại SENT, có thể xóa lịch sử dùng. Báo cáo ngày Việt Nam so với prefix ISO UTC nên bỏ lượt dùng 00:00–06:59 giờ Việt Nam. | `features/line-bot/services/lineBotFirestoreService.ts:292`; `functions/src/lineBotScheduler.ts:414`, `:437` |
| D11 | P1/P2 / T | Một số CRUD/sync optimistic nuốt lỗi; Sticker state được đánh dấu saved trước ack, Khai thác/Thuế có thông báo thành công dù phần cloud/local thất bại. Dữ liệu chưa lên cloud cần outbox; đọc cloud Thuế chưa ghi cache lịch sử vào local. | `features/sticker-event/hooks/useStickerEventDb.ts:293`, `features/sticker-event/hooks/useStickerEventState.ts:333`; `features/sticker-event/services/firebaseService.ts:654`; `features/khai-thac/KhaiThacView.tsx:129`; `features/tax-calculator/services/taxSyncService.ts:70`, `:128` |
| D12 | P2 / T | Khai thác clear-all chưa hủy draft/timer pending; pagehide/unmount có thể ghi nháp cũ trở lại sau xóa. | `features/khai-thac/KhaiThacView.tsx:94–112`, `:201` |
| D13 | P2 / T+M | Danh sách Sticker/manual product bị cap nhưng không cursor tải tiếp; quantity JSON chưa kiểm số nguyên hữu hạn, quantity thập phân gây RangeError, chuỗi có thể in sai số lượng, số cực lớn có thể treo tab. | `features/sticker-event/services/firebaseService.ts:483`, `:745`; `features/sticker-event/hooks/useStickerEventFile.ts:380`; `features/sticker-event/services/printService.ts:1281` |
| D14 | P1 / T | Apply cloud xóa toàn bộ sales files/registry trước ghi snapshot mới; lỗi ghi có thể mất bản cũ và realtime có thể xóa archive. Boot catch lỗi bất kỳ còn tự xóa sales/config. | `services/dbService/salesData.ts:78`, `:108`; `hooks/useDataManagement.ts:534–539` |
| D15 | P2 / M | Parser vi-VN: `45,5%` thành `455`, `12,5` thành `125`; ngày không hợp lệ `31/02/2026` bị roll thành `03/03/2026`. Chỉ kết luận cho input string tương ứng, không quy mọi Excel numeric đều sai. | `utils/dataUtils.ts:113–124`, `:406–414` |
| D16 | P2 / T | BI xóa raw source nhưng parsed state cũ chưa clear; fallback KPI tổng cụm cho siêu thị thiếu cột có thể dùng sai phạm vi. | `features/bi-dashboard/hooks/useDashboardLogic.ts:113`, `:123`, `:654`; `features/bi-dashboard/components/DataUpdater.tsx:885` |
| D17 | P2 / T | Root Worker onerror nói đang tải lại nhưng chưa recovery; PROCESS result thiếu generation/requestId phù hợp để bỏ kết quả sau reset/đổi scope. | `hooks/useDataManagement.ts:961–1008`; `services/analytics.worker.ts:49` |
| D18 | P1/P2 / T | Relay poll claim ngoài transaction, thiếu lease/reconcile; completion thiếu idempotency; userscript ghép response chỉ theo Kho. Scheduler ghi slot đã chạy/tắt ONCE trước khi gửi thành công. Có nguy cơ mất/trùng/lẫn job và bỏ lịch gửi. | `functions/src/pmhRelay.ts:65`, `:103`; `public/scripts/tnb-pmh-auto-lay-ma.user.js:296`; `functions/src/lineBotScheduler.ts:510` |

Cần sửa tính đúng trước tối ưu tốc độ: một dashboard load rất nhanh nhưng cộng doanh số hai lần vẫn là lỗi nghiêm trọng. Không áp dedup bằng “mọi dòng giống nhau” tùy tiện: phải định nghĩa danh tính file/dòng và quy tắc overlap nghiệp vụ để giữ các giao dịch hợp lệ.

## 3. Hiệu suất

Các biện pháp tốt đã có: lazy-load, chunk vendor, Web Worker, transfer buffer, xử lý sales theo chunk, cache theo file, batch Firestore, và nhiều test liên quan tải lớn. Không nên xóa các lớp này chỉ vì code phức tạp.

Các điểm cần xử lý hoặc đo tiếp:

1. D02 làm dữ liệu/file active tăng và tốn read/write theo mỗi lần re-sync; đây là lỗi tăng khối lượng có nguyên nhân rõ trong source.
2. Fetch Kho/Cloud dùng Promise.all không giới hạn trên file/chunk; với dataset lớn cần giới hạn concurrency và đo peak RAM, không tải/clone nhiều bản cùng lúc.
3. Phân ca đọc khoảng 10 key cloud tuần tự; lịch sử chứa snapshot đầy đủ không giới hạn và ghi lại nhiều key theo effect. Cần dirty-state, load độc lập song song có giới hạn và retention/history theo entry.
4. JSON quantity có thể tạo toàn bộ mảng tem/HTML trước phân trang. Cần giới hạn tổng công việc và tạo theo batch, có hủy.
5. Scanner tạo AudioContext theo lượt quét và chưa đóng; cần tái sử dụng/đóng tài nguyên.
6. Giữ các view đã mở trong App là chủ đích giữ state. Cần đo listener/timer/worker của view inactive; không kết luận keep-alive tự nó là lỗi.

**Chưa có số đo** thời gian đăng nhập, p95 filter, main-thread blocking, memory, request count hoặc bundle thực build trong phiên này. Các mục cần benchmark không được diễn đạt thành “đã đo chậm”. Phụ lục dữ liệu bổ sung các điểm riêng BI/root và mức xác minh.

## 4. Thiết kế dùng chung hay rời rạc?

| Nhóm | Phần chung đang có | Phần chưa thống nhất |
|---|---|---|
| Token/theme | `styles/tokens.css`, semantic palette, `styles.css` | Nhiều class Tailwind và giá trị cục bộ không đi qua token; feature CSS vẫn có biến/selector riêng |
| Nút/input | `components/shared/ui/Button.tsx`, `components/shared/ui/Input.tsx`, `components/shared/ui/Select.tsx` | Native controls, unstyled/none và className override vẫn tự quyết kích thước/màu/radius |
| KPI/card | `components/shared/ui/KpiCard.tsx`, `components/shared/ui/StatCard.tsx` | KPI/card tự dựng; shared KpiCard 16px trong khi tài liệu yêu cầu phẳng/vuông; nhiều độ lớn chữ/surface khác nhau |
| Bảng | `DataTable`, scroll cue và export primitives | Phần lớn bảng có markup/header/border/spacing/sticky riêng; bảng in có mục đích khác cần ngoại lệ rõ |
| Modal | `Modal`, `ConfirmDialog`, `useModalBehavior` | Modal tự dựng có nhiều mức radius/header; dùng behavior chung nhưng style khác; có popup chưa theo contract |
| Dropdown/popup/toast | Shared Dropdown/Tooltip, toast library | Các select/dropdown đời cũ và popup riêng vẫn tồn tại; theme/behavior chưa đồng nhất toàn diện |

Kiểm kê text trên 275 file app TSX trong `components/` và `features/`: 851 candidate `<Button` ở 199 file, 171 `<button` ở 43 file; 87 `<Input` và 175 raw input; 2 DataTable candidate và 57 raw table; 73 Modal, 23 ConfirmDialog, 23 KpiCard. Số đếm có thể gồm template/comment và các native element hợp lệ, **không phải tỷ lệ phần trăm đồng nhất**. Chi tiết/ngoại lệ nằm trong phụ lục thiết kế.

Các vấn đề cụ thể cần sửa:

- Quy chuẩn `DESIGN_SYSTEM.md`, `CLAUDE.md`, `RULES.md` chưa cùng một quyết định về vuông/phẳng, glass/pill, màu và dark mode. Test KPI yêu cầu 16px nhưng tài liệu console lại mô tả khác. Claude cần một chuẩn hiện hành duy nhất và catalogue minh họa trước khi migrate.
- CSS Phân ca có selector/keyframe global trùng `styles.css`; mở feature lazy có thể thay style toàn app. `features/phan-ca/phanca.css:303` và `styles.css:166`, `:174` là ví dụ.
- Input Phân ca dùng `.config-input` và biến đặt trên `.phanca-root`, trong khi shared Modal portal ra `document.body`; biến không được kế thừa vào modal. Border/background/focus dựa trên biến đó có thể mất. Vị trí: `features/phan-ca/phanca.css:5`, `:235`; `features/phan-ca/components/EditRulesModal.tsx:107`; `components/shared/ui/Modal.tsx:250`, `:370`.
- Breakpoint tăng vùng chạm shared Button/Input chỉ dưới 640px, trong khi mobile layout tới 1024px. Landscape iPhone/iPad có thể dùng control 32–36px.

“Một nơi dùng chung” nên hiểu là **một nguồn token + một bộ primitive/variant chuẩn + CSS feature được scope**. Không cần ép mọi CSS vào một file hoặc ép bảng in giống hệt bảng dữ liệu tương tác.

## 5. Laptop, Safari iOS và PWA

| Hạng mục | Đánh giá bản mã |
|---|---|
| Laptop các luồng chính | Có kiến trúc đầy đủ, nhưng D01/D02/D05/D08/D09 ảnh hưởng tính đúng/ổn định; chưa có runtime xác nhận toàn app |
| So giá laptop bản live | Frontend gọi localhost:3456, server CORS chỉ nhận origin localhost/127.0.0.1. Origin dashboard.pro.vn bị từ chối dù server chạy; cần sửa tích hợp an toàn, giữ bind loopback |
| iPhone responsive | Có safe-area, mobile navigation và bố cục chuyên mobile; vẫn cần landscape, keyboard, bảng có dữ liệu thực và popup |
| PDF in giá mobile | Producer trả PDF data URI; modal đặt vào iframe; CSP `frame-src` không cho `data:`. Luồng có xung đột policy, cần sửa URL/lifecycle và kiểm renderer iOS. Không tắt CSP để né lỗi |
| Camera | Async getCameras/start chưa có generation/disposed guard đầy đủ; đóng khi permission/start pending có thể để camera chạy sau unmount |
| Touch/zoom | Control nhỏ ở 640–1023px; nhiều input 14px và meta viewport chặn zoom. Cần đánh giá zoom và khả năng đọc trên Safari thật |
| WebKit CI | **Có**, project opt-in `E2E_WEBKIT` và job riêng nhiều nhóm tests. Không được kết luận chỉ test Chromium |
| Safari/iPhone thật | Chưa xác minh phiên này: Google login, bàn phím ảo, camera, share sheet, download/PDF, background/resume |
| Home Screen / offline | Có manifest/icon/splash. Chưa thấy service worker registration, nên không bảo đảm offline cold-start; dữ liệu IndexedDB không đồng nghĩa app shell offline |

Luồng PDF: `features/sticker-event/services/printService.ts:1368`, `:1413` → `features/sticker-event/hooks/useStickerEventPrint.ts:138` → `features/sticker-event/PdfPreviewModal.tsx:40` đối chiếu `index.html:58`. Đổi sang Blob URL cần kiểm CSP tương ứng và revoke đúng lúc; khả năng render PDF trong iframe trên iOS vẫn phải kiểm riêng.

Ma trận kiểm thử cần bổ sung: laptop 1366×768/1440×900, iPhone portrait 390×844 và landscape 844×390/667×375, iPad 768×1024; trên Chrome/WebKit và ít nhất một iPhone Safari thật. Theo dõi keyboard open, safe-area, cuộn hai chiều, stacked modal, zoom, slow/offline, background rồi mở lại, file lớn và storage/quota.

## 6. Tài liệu và bằng chứng bàn giao

- `PLAN_CHO_CLAUDE.md`: kế hoạch task, thứ tự phụ thuộc, tiêu chí nghiệm thu và quy trình phát hành.
- `phu-luc/auth.md`, `backend.md`, `data.md`, `features.md`, `design.md`, `safari.md`: chi tiết vị trí, điều kiện tái hiện, hướng sửa và coverage từng nhóm.
- `evidence/`: harness offline và kết quả, inventory archive, hạn chế môi trường. Các fixture dùng danh tính giả, không chứa credential production.

Phần sửa ứng dụng, deploy, đọc dữ liệu/tài khoản thật chưa được thực hiện. Báo cáo này là đầu vào để sửa và kiểm lại; không phải chứng nhận toàn bộ code không còn lỗ hổng.
