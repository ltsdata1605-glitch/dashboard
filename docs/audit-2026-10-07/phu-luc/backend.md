# Audit backend, LINE, relay, Gemini và server So giá — 2026-10-07

Phạm vi: đọc toàn bộ `functions/src/lineBotWebhook.ts`, `lineBotScheduler.ts`, `lineBotScheduleDue.ts`, `pmhRelay.ts`, `gemini.ts`, `pmhFlexCard.ts` và các helper liên quan; đọc `price-scraper-server/server.js`, scraper và matcher/normalizer; trace LINE frontend services/hooks, `services/lineReportDelivery.ts`, `public/liff-copy.html`, rules, deployment/CI. Userscript 4.454 dòng được kiểm tra các handler bridge, đọc token, HTTP, relay và download; chưa rà từng dòng UI/automation của script này. Auth/session/sticker được agent khác kiểm tra.

Đã đọc hướng dẫn AGENT_RULES.md, RULES.md và phần backend/an toàn của CLAUDE.md. Không sửa mã ứng dụng, không deploy, không đọc/ghi Firestore thật, không gọi LINE/Gemini/MWG thật, không ghi giá trị bí mật vào báo cáo. ZIP không chứa thông tin branch/commit đủ tin cậy; kết luận áp dụng mã nguồn bản ZIP. Không xác minh IAM/gateway, Cloud Functions/rules/index đang triển khai trên production.

## Kết luận chính

Frontend có nhiều biện pháp mới, nhưng backend còn các đường ghi dữ liệu không xác thực và các thao tác coupon không bảo vệ trước cạnh tranh. Kiểm chữ ký LINE ở webhook **có và đúng với rawBody**, nhưng nằm sau các nhánh `?action=...`; vì vậy chữ ký không bảo vệ những action đó. Nếu endpoint triển khai công khai như cấu hình nguồn và không có gateway/IAM ngoài repo chặn, các lỗi B01–B03 cần xử lý trước khi coi hệ thống sẵn sàng phát hành.

## B01 — P1 khẩn cấp: HTTP action mark-used cho phép người không đăng nhập sửa coupon của nhiều bot

- File: `functions/src/lineBotWebhook.ts:1606`, `:1722`, `:1735`, `:1742`, `:1794`, `:2007`; client thật `public/liff-copy.html:129`.
- Điều kiện: POST vào endpoint với `action=mark-used`, `code` tồn tại và `usedBy` tùy chọn. GET không gây mutation vì đã return tại handler GET; POST có thể đặt tham số trên query như LIFF hiện tại, không cần body JSON.
- Không kiểm Firebase ID token, LINE ID/access token, ticket coupon, người được cấp hay quyền đối với bot. Quét **mọi bot active**, tìm coupon theo code trong 2 collection rồi batch update `USED`. Cùng code ở nhiều bot sẽ bị cập nhật cùng lúc. Caller giả `usedBy`; có thể làm bot gửi xác nhận bằng channelAccessToken của máy chủ khi document có quoteToken/chatId.
- Đây là lỗi authorization ở Admin SDK; sửa Firestore Rules không tự chặn HTTP handler.
- Tái hiện offline **actual handler**: `/workspace/audit-backend-repro.cjs`, kết quả `/workspace/audit-backend-repro-results.jsonl`. Request không auth, không chữ ký: HTTP200, `signatureChecks=0`, `updatedCount=2`; ownerA/ownerB đều thành USED với tên giả. Mock không gửi tin LINE thật.
- Sửa: tách webhook sự kiện và API quản trị/LIFF. Quản trị cần Firebase token + quyền theo bot/kho; LIFF cần backend xác minh token LINE đúng audience/channel và/hoặc ticket ngắn hạn ký bởi server gắn với botId+couponId+recipient+expiry. Lấy danh tính từ token đã xác minh. Không tìm xuyên tất cả bot bằng raw code. Chuyển trạng thái trong transaction; trả rõ not-found/forbidden/conflict.
- Nghiệm thu: anonymous/expired token/wrong bot/wrong recipient không được ghi; code trùng ở bot khác không thay đổi; 2 lần đồng thời chỉ 1 chuyển trạng thái và 1 push; cập nhật DB thất bại không gửi xác nhận thành công.

## B02 — P1: uploadMedia công khai ghi đè media bằng Admin SDK; kiểu nội dung không được kiểm

- File: `functions/src/lineBotWebhook.ts:1661`, `:1663`, `:1670`, `:1631`, `:1638`; `features/line-bot/services/botMediaService.ts:94`.
- POST `action=uploadMedia` không auth/chữ ký, caller chọn `mediaId`; `.set()` ghi đè document đó. Không ràng buộc owner/kho, MIME, magic bytes, dung lượng ứng dụng, quota hoặc thời gian lưu. Firestore giới hạn document khoảng 1MiB chỉ là giới hạn nền tảng, không phải quota ứng dụng.
- GET phục vụ `contentType` caller lưu, URL công khai và cache `public,max-age=31536000,immutable`. Có thể đưa HTML/SVG active content dưới origin Cloud Function hoặc thay ảnh báo cáo. Chưa chứng minh XSS trên **origin dashboard**; không gọi đây là takeover dashboard. Có thể host nội dung tùy ý và tiêu hao đọc/ghi/invocations.
- Mock actual handler: anonymous upload `mediaId=victim_report`, `contentType=text/html` được HTTP200 success và viết document; `signatureChecks=0`.
- Sửa: upload authenticated + owner scope; ID server sinh bằng crypto; allowlist JPEG/PNG và xác minh bytes, giới hạn size/parts; immutable object/version; tách metadata riêng tư khỏi binary storage; TTL và quota. Dùng storage phù hợp ảnh thay lưu base64 Firestore. LINE cần đọc ảnh công khai: cấp URL ký/capability ngắn hạn, không bắt LINE đăng nhập Firebase. Thêm nosniff và cache policy phù hợp.
- Nghiệm thu: anonymous upload/overwrite ảnh của người khác/HTML/SVG/size vượt giới hạn bị từ chối; URL ảnh LINE còn hoạt động; hết hạn hoặc thu hồi chặn lần tải mới; bản HD dọn đủ các parts.

## B03 — P1: Gemini OCR phiếu lương không yêu cầu auth, không quota/giới hạn input

- File: `functions/src/gemini.ts:121`–`:136` (salary handler), `:55`–`:63` (generate ca xoay), `:28`–`:33` (timeout), `:172`–`:237` (fallback), `:259`–`:282` (output).
- Salary callable không có `request.auth` guard; kiểm tra chỉ truthiness `base64Data/mimeType`, không type, size, ảnh hợp lệ, role/status/session, App Check, rate limit hoặc ngân sách theo user. Callable không mặc định bắt buộc người gọi đăng nhập. Người không auth có thể dùng API key máy chủ chạy OCR lặp lại.
- generateWithGemini có auth nhưng mọi tài khoản Firebase đều được gọi, prompt không giới hạn; chưa kiểm membership đang approved/active hay quota. Salary `withTimeout` chỉ Promise.race, không hủy model request đang chạy; model chậm có thể tiếp tục tính phí khi model sau bắt đầu. generate ca xoay không dùng timeout riêng. Salary không runtime validate toàn bộ schema/output; JSON có detectedType ngoài enum vẫn `isValid=true`.
- Repro offline actual salary handler `/workspace/audit-gemini-repro.cjs`, output `/workspace/audit-gemini-repro-results.jsonl`: thiếu auth, provider mock được gọi 1 lần, `accepted=true`. Không gọi Gemini thật.
- Sửa: xác thực và authorization server phù hợp người dùng được phép; App Check; schema input/output với enum/range, max ảnh/prompt/output token; quota/rate limit + budget/maxInstances theo nhu cầu; abort/timeout thật qua SDK hỗ trợ, tránh nhiều request còn chạy đồng thời. Lỗi client trả mã an toàn, chi tiết provider chỉ log đã lọc.
- Nghiệm thu: anonymous/unapproved/revoked session bị từ chối trước provider; quá quota/type/size không tạo provider call; model timeout được cancel hoặc kiểm soát tổng chi phí; response sai schema bị báo lỗi thay thành dữ liệu lương hợp lệ.

## B04 — P1: manager bất kỳ có thể đọc credential và sửa bot/kho khác

- Rules: `firestore.rules:167`–`:172`: self **hoặc isManager**, không scope kho/owner.
- Backend/client: `features/line-bot/types/lineBot.types.ts:137` chứa channelAccessToken/channelSecret; `services/lineBotFirestoreService.ts:123` đọc config nguyên văn, `:141` lưu config; `useLineBotConfig.ts:31` đọc token; `services/lineReportDelivery.ts:61` lấy raw token, `:235` chuyển qua DOM CustomEvent.
- Manager có thể truy vấn document bot của manager kho khác, lấy access token/secret/relay token và dữ liệu phụ; dùng LINE trực tiếp hoặc đổi bot config/coupons/schedules. Frontend tìm kho hợp lệ không thay thế rules. `findWarehouseBot:96` còn dùng `botDept.includes(ud)` nên kho `910` có thể khớp `1910`; giới hạn quét30 gây chọn thiếu bot.
- Phần auth/rules agent riêng có bằng chứng đầy đủ. Plan backend phải chuyển credential về Secret Manager/server-only collection, client chỉ xem metadata; callable action nhận botId rồi server lookup credential và authorize đúng kho. Rule owner/scope chính xác cho dữ liệu bot, bảo vệ server-owned fields; không mở quy tắc rộng để giữ inheritance.
- Nghiệm thu emulator manager khoA không đọc/ghi botB; inherited bot cùng kho được phép theo policy rõ ràng; JS bundle/Firestore client/DOM event không mang credential sau migration; xoay credential đã từng chia sẻ vượt scope nếu xác nhận ảnh hưởng.

## B05 — P1: báo cáo ảnh bị chia sẻ toàn hệ thống và không áp dụng giới hạn nhóm

- `firestore.rules:178`–`:185`: mọi người public read bot_media/report_commands; mọi Firebase signed-in user write, không owner/role.
- `services/lineReportDelivery.ts:301`–`:304` ghi ảnh cùng command vào cả `line_bots/{botId}/report_commands/{cmd}` lẫn **global** `report_commands/{cmd}`; namespace global không bot/kho. `:181`/`:198` media thiếu owner/kho/TTL.
- `functions/src/lineBotWebhook.ts:2162`–`:2167` khi bot thiếu command riêng dùng command toàn hệ thống; `:2173`–`:2191` fallback `bc` chọn report media mới nhất toàn hệ thống. Dữ liệu `groupIds` có được ghi (delivery:285,298) nhưng webhook không check groupIds trước reply ảnh `:2204`–`:2217`; direct chat cũng nhận ảnh.
- Trigger: khoA đã xuất ảnh `bc`; bot khoB chưa có command ảnh riêng. Thành viên chat botB gõ `bc` có thể nhận ảnhA. Hoặc thành viên ngoài groupIds gõ command tại chat/nhóm khác. Signed-in user có thể thay global command/ảnh bằng SDK. Không cần biết mediaId trước vì collection đọc public và command chung dễ truy vấn.
- Sửa: loại bỏ fallback cross-tenant; command/media metadata bắt buộc botId+kho/owner; kiểm nhóm/người đọc trước reply. Public URL chỉ là capability để LINE tải **đúng ảnh đã authorized gửi**. Tách public fetch khỏi public listing/rules và đặt TTL/retention. Không log URL ký/PII.
- Nghiệm thu: hai bot dùng cùng command nhận đúng ảnh của mình; bot chưa ảnh báo chưa có; ngoài nhóm whitelist/chat không được phép không nhận report; viewer không sửa command/ảnh; không public list toàn báo cáo.

## B06 — P1: lệnh DUYỆT không kiểm admin; hủy coupon không kiểm người nhận/trạng thái

- `functions/src/lineBotWebhook.ts:2823`–`:2925`, `:2928`–`:3025`: mọi message hợp lệ từ LINE được gõ DUYỆT/DUYỆT MĐH; không truy vấn `admins` hay check senderUserId role. App có admins với role SUPER_ADMIN/APPROVER/VIEWER (`lineBot.types.ts:96`–`:106`) nhưng backend không dùng. Approval không bị group feature issueCoupon gate. `approvalCommand` cấu hình cũng không được dùng, regex hardcode.
- `:2264`–`:2291`: `huy code` tìm mã rồi reset UNUSED, clear recipient/order; không check sender là recipient/admin hay coupon đang USED/expired. Chữ ký LINE chỉ chứng minh event từ LINE, không chứng minh người gửi là admin.
- Repro actual handler mock: sender9 chưa là admin gõ DUYỆT -> request APPROVED, `adminCollectionQueried=false`; sender9 hủy coupon USED của Uintended -> UNUSED.
- Sửa: policy command theo role LINE đã khai báo, senderUserId và nhóm; hủy chỉ đúng state/recipient hoặc admin có lý do; USED không tự hoàn kho chỉ nhờ tin nhắn, cần reconcile việc sử dụng thực tế. Tôn trọng active=false và giới hạn tính năng trước nhánh hành động; config.active hiện không được webhook kiểm.
- Nghiệm thu: APPROVER/SUPER_ADMIN mới approve, VIEWER/nonadmin bị chặn; người khác không hủy; USED/expired không thành khả dụng; bot disable ngừng xử lý side effects; mọi thay đổi ghi audit server.

## B07 — P1: cấp coupon không atomic, cùng mã có thể cấp hai người / sai sản phẩm

- `lineBotWebhook.ts:2628`, `:2722`–`:2765` lấy snapshot UNUSED rồi update SENT; form `:3241`–`:3349`; duyệt `:2829`–`:2899`, `:2956`–`:3008`. Không coupon transaction/precondition. `pmhSequence.ts:49` transaction **chỉ bộ đếm số thứ tự**, không khóa coupon hay MĐH.
- Hai event song song cùng thấy cùng UNUSED; mỗi event cập nhật SENT và gửi cùng code, lần sau ghi đè recipient. Check orderId duplicate riêng không atomic, redelivery webhook thiếu event ID/idempotency nên cũng lặp cấp/pending/relay. Nhánh eN rollback khi reply thất bại (`:2784`) có thể ghi UNUSED lên state mới từ request khác; nhánh form/approval không xử lý send false, để SENT dù người dùng không nhận.
- Duyệt còn chọn mã bất kỳ nếu không match (`:2876`,`:2985`); inventory đánh STT theo tồn kho thay đổi (`:648`,`:2662`) nên chạm eN trên thẻ tồn cũ có thể cấp sản phẩm khác sau khi thứ tự thay đổi.
- Repro actual handler mock: 2 request e1 song song, cùng coupon c1 có **2 update SENT** với 2 recipientIds khác nhau; cả2 HTTP200. Không gọi LINE thật. Đây là cạnh tranh logic; cần test Firestore Emulator khi sửa để kiểm transaction thực tế.
- Sửa: transaction đọc fresh coupon+claim/orderId key+pending request, validate AVAILABLE/expiry/category/product, reserve duy nhất; stable productId trong action thay STT mutable; deterministic unique couponCode/orderId keys; outbox delivery có idempotency và conditional rollback gắn reservation ID. Dedupe webhookEventId; không ép exactly-once gửi mạng nếu chưa xử lý ambiguity.
- Nghiệm thu: 20 request cạnh tranh1 coupon tối đa1 người được cấp; event redelivery không tạo coupon lần2; no matching product báo hết/sai loại; thẻ tồn cũ không đổi product; failure sau DB/đang gửi không trả mã về khả dụng sai.

## B08 — P1: mở tab kho coupon tự xóa lịch sử USED sau ngày hết hạn

- `features/line-bot/services/lineBotFirestoreService.ts:280`–`:341`: `isStockCoupon = data.status !== 'SENT'`; do đó **USED cũng được batch.delete** khi expiryDate < todayVN.
- `features/line-bot/hooks/useCouponManager.ts:43` cleanup tự chạy mỗi load; cùng predicate 54/129 ẩn USED. Backend dùng USED thật tại webhook:1797; frontend union `CouponStatus` chỉ UNUSED/SENT/REVOKED (`lineBot.types.ts:6`), KPI/badge/export coi state này không đúng (`useCouponManager.ts:97`,`:233`).
- Repro predicate fixture: status USED, expiry hômqua -> willDelete=true. Source trace chứng minh hook auto gọi cleanup; chưa dùng database thật.
- Tác động: mất lịch sử ai dùng, usedAt/orderId và báo cáo cuối ngày/tra cứu. Dữ liệu còn ở filtered_coupons chỉ khi code đó đã có bản sao, không bảo đảm.
- Sửa: state machine thống nhất cả backend/frontend (AVAILABLE/RESERVED/SENT/USED/REVOKED/EXPIRED theo quyết định nghiệp vụ); chỉ archive/expire UNUSED, không xóa USED; retention lịch sử tách khỏi tồn. Migration chạy có dry-run/backups và audit riêng, không tự xóa production trong task đầu.
- Nghiệm thu: mở lại tab/mốc qua ngày không mất USED; USED có badge/filter/KPI/export đúng; expired UNUSED không cấp được; báo cáo/tra mã vẫn đọc historical data.

## B09 — P1: PMH relay dễ cấp lại/mất job và gửi kết quả sai yêu cầu

- `functions/src/pmhRelay.ts:65`–`:82`: query pending -> batch set processing ngoài transaction. Hai poll/tabs cùng nhận cùng5 job trước commit. Không lease expiry/requeue/reconcile processing; tab đóng/mất mạng sau claim kẹt vĩnh viễn.
- `:103`–`:114`: complete kiểm owner nhưng không trạng thái/idempotency, ghi done trước LINE delivery; complete retry có thể cấp số/gửi lại/reset code USED về UNUSED (`:193`–`:209`) và delivery thất bại vẫn done. Input codes/errors chỉ TS cast, không runtime schema/size; malformed input có thể làm hỏng sau khi đánh done.
- `public/scripts/tnb-pmh-auto-lay-ma.user.js:370`: interval2s gọi async botPoll không có inFlight lock; `:296`–`:318` khớp response **chỉ kho**, không MĐH/type/request correlation. Hai request cùng kho đang pending sẽ nhận cùng mã mới, thậm chí mã người khác gửi trong phòng chung. `:328` xóa pending trước POST; POST thất bại không retry. GM request không timeout được đặt (`:61`).
- Sửa: transaction claim lease + worker/session; job operation correlation, schema và status machine; idempotent complete/outbox delivery; userscript1 poll in-flight, persist pending và retry kết quả, tuần tự1 yêu cầu trên phòng nếu nguồn không hỗ trợ correlation. Crash sau gửi form phải needs-reconcile, không blind re-submit tạo phiếu mới.
- Nghiệm thu:2 worker không nhận cùng job; refresh/mất mạng không mất job/result; same-kho khácMĐH không chia sẻ response; complete2 lần không gửi/lưu lại USED; LINE 429/network lỗi có trạng thái retry rõ ràng.

## B10 — P2: scheduler giữ chỗ như đã gửi trước khi delivery thành công

- `lineBotScheduler.ts:510`–`:518`: ghi lastAutoRunSlot, lastRunAt và tắt ONCE trước fetch nhóm/gửi LINE. `:549`–`:553` failure chỉ ghi0/N; `dueSlot()` không cho lại khe này. Crash/network/429 sau claim làm mất lịch, ONCE tắt dù chưa gửi. Error một bot làm rơi cả loop ngoài do catch chung (`:557`). Fetch LINE helper `:32` không timeout/abort.
- Sửa: reservation/lease tách delivered state theo recipient, lease reclaim, retry backoff hữu hạn, stable LINE retry-key nếu endpoint hỗ trợ; chỉ tắt ONCE sau chính sách thành công rõ ràng. Isolate từng job/bot failure; timeout cho tất cả outbound calls; lấy fresh schedule trong claim để tránh schedule bị sửa nhưng dùng stale data.
- Nghiệm thu: crash sau claim/before push, push429/timeout, partial groups, overlapping scheduler không mất lịch hoặc gửi trùng; ONCE lỗi vẫn thấy pending/failure để retry.

## B11 — P2: báo cáo22h lọc ngàyUTC thay ngàyViệt Nam và quét toàn lịch sử

- `lineBotScheduler.ts:368` lấy todayVN nhưng `:412`–`:414`,`:436`–`:437` so ISO UTC usedAt bằng startsWith(todayVN). `usedAt` được ghi new Date().toISOString() (`lineBotWebhook.ts:1725`,`:1797`).
- Ví dụ USED 01:00 ngày07/10VN = `2026-10-06T18:00:00Z`, bị bỏ khỏi báo cáo ngày07. Dùng `filteredAt/sentAt` dự phòng khi thiếu usedAt còn gán sai ngày sử dụng.
- Repro offline fixture ghi đúng localVNDate2026-10-07 nhưng predicate reported=false.
- `where status==USED get()` tải mọi USED cả lịch sử ở2 collection mỗi tối, lọcclient-server memory sau; CSD tải mọi UNUSED rồi lọc tháng; webhook cấp mã/tồn repeatedly đọc mọi coupons. Data tăng -> đọc/cost/timeouts tăng. Dedup code chỉ áp dụng coupons vs filtered list, không giữa nhiều filtered rows cùng code.
- Sửa: UTC range tương ứng00:00–24:00VN hoặc Timestamp + ngàyVN nhất quán; query range/index/pagination và aggregate tồn/count; dedupe đúng nghiệp vụ. Index config cần khai báo versioned, vì repo firebase.json không có indexes file; chưa xác minh indexes console đang có hay thiếu.
- Nghiệm thu: mốc23:59/00:00VN, UTC offset, các tháng, cùng code2 collection; volume test lớn; số reads theo số records ngày hôm đó thay cả lịch sử.

## B12 — P2: xác nhận dùng bằng tin nhắn có thể đánh dấu nhầm coupon

- `lineBotWebhook.ts:2331` nhận tin chỉ cần “👉” + “sử dụng lúc”; `:2355`–`:2365` chọn UNUSED theo cardIndex rồi latest filteredAt, không category/month/chatId/recipient hoặc code.
- `pmhSequence.ts:24`,`:46` đếm riêng event/gvgs/pmh và reset mỗi tháng. Ba loại/mỗi tháng có thể cùng index1. Một câu xác nhận GVGS1 có thể update EVENT1 hoặc thẻ tháng khác. Nếu câu không có index, query bỏ cả cardIndex và update thẻ UNUSED mới nhất; tên usedBy lấy từ raw message dễ giả.
- Sửa: bỏ mutation từ freeform acknowledgement nếu server đã xử lý LIFF; hoặc event phải mang couponId/token correlation, validate sender/chat/state. Số thứ tự chỉ là nhãn hiển thị, không dùng làm primary key.
- Nghiệm thu: Event1/GVGS1/PMH1 và hai tháng không bị ảnh hưởng chéo; message không index không thay state; fake text/nonrecipient không ghi.

## B13 — P2: So giá trên laptop production không kết nối được local server; cancel chỉ hủy trình duyệt

- `components/views/PriceComparisonView.tsx:65` luôn http://localhost:3456; `price-scraper-server/server.js:20`–`:31` chỉ cho Origin localhost/127.0.0.1. Origin production https://dashboard.pro.vn bị403 ngay CORS, dù local server đang chạy. E2E mocks request nên không phát hiện. Thiết bị mobile được app đánh dấu không hỗ trợ có chủ đích; không gọi đây là Safari bug.
- Client AbortController tại view:280 và cancel/unmount không làm server ngừng loops ở server:80–137, không req/res-close observer, job queue hoặc cancelAPI. Nhiều requests mở nhiều pages/jobs; body chỉ kiểm products.length chứ không Array/type/maxcount. Express4 async route thiếu error wrapper; malformed products/competitors có thể reject ngoài trycatch, làm server lỗi/crash theo Node unhandled rejection policy.
- Browser singleton `scrapers/index.js:6` launch không khóa promise; concurrent cold requests có thể launch nhiều Chromium, chỉ reference cuối được close. detailPage tại:91 không close trong finally nếu goto/evaluate lỗi, nên leak page theo thời gian. Bound127.0.0.1 và chặn CORS lạ là biện pháp tốt, phạm vi abuse này chủ yếu tại máy local hoặc khi owner tự mở rộng bind.
- Sửa: chọn deployment contract (production origin được phép có auth local pairing/token; hoặc endpoint managed server) và allowlist cụ thể; giữ loopback mặc định. Validation/max products, queue bounded, singleflight browser launch, perjob cancellation+timeout, finally close detail pages và SSE, Express async error middleware.
- Nghiệm thu: laptop mở production site thật hoặc testOrigin tương ứng so giá thành công; origin lạ403; cancel không còn jobs/pages sau ngưỡng; hai jobs không spawn hai Chrome; malformed body400 không crash; request10000 products được từ chối.

## B14 — P2: So giá đối chiếu sai model/biến thể/bộ nhớ

- `price-scraper-server/utils/nameNormalizer.js:60`–`:67` bỏ RAM/storage/CPU; `utils/productMatcher.js:153`–`:160` fallback overlap cho đồng dạng không phân biệt Pro/ProMax/storage.
- Repro actual pure modules: normalize `iPhone 16 Pro 256GB` -> `iPhone 16 Pro`; matcher với `iPhone 16 Pro Max 128GB` returns true, confidence70, overlap100%. Dữ liệu so sánh có thể báo giá rẻ hơn cho sản phẩm khác. `parseVNDPrice('26,590,000đ')` trả0 dù comment hỗ trợ dấu phẩy.
- Sửa: tách identity (brand/model/variant/storage/RAM/CPU) khỏi query search; bắt buộc khớp thuộc tính ảnh hưởng giá, hiển thị confidence/nguồn và unmatched cần review; parser dùng nhóm giá hỗ trợ dấu phù hợp tránh nối hai giá.
- Nghiệm thu: iPhonePro/ProMax khác nhau,128/256GB khác nhau, laptop cùng model khác CPU/RAM không match nhầm; giá 26.590.000₫/26,590,000đ và old+sale được parse đúng.

## Vấn đề userscript cần kiểm thử bổ sung (không nâng thành exploit đã xác minh)

- `mwg-auto-thu-thap-diem-thuong.user.js:2764` nhận postMessage token/storeIds không check origin/source;:2768 lưu JWT vào GM storage;:2816 ưu tiên captured/cache token trước token storage mới, không check expiry/account và không clear trên logout. Nguy cơ dùng token người trước/expired hoặc nhận message giả từ iframe/opener. Cần test account-switch/iframe và phân quyền API MWG; chưa chứng minh đọc dữ liệu ngoài quyền server MWG.
- `@connect *` tại:29; download:4395 dùng done.url lấy qua dữ liệu nguồn mà không host allowlist/final redirect check. Endpoint BI/LINE khác đã fixed hoặc mở tab worker có allowlist. Cần hạn chế host download được MWG cấp, giữ timeout và sizecap; không gọi đây là public SSRF trên CloudFunctions.
- CustomEvent mang raw LINE token (lineReportDelivery:235) đọc được bởi script cùng page; token đã có ở client từ Firestore. Chuyển secret server-only giải quyết nguyên nhân, chỉ đổi CustomEvent thành postMessage không giải quyết.

## Plan giao Claude — chia PR nhỏ, chỉ audit/fix local trước; deploy sau review

1. **API security contract (B01–B04)**: inventory mọi endpoint/caller; định nghĩa Firebase admin vs LINE webhook vs LIFF. Tách middleware/auth, identity/scope, secrets server-only và migration tương thích. Emulator/mock authorization tests trước khi sửa UI. Done: mọi write/cost call có principal+scope; legitimate LIFF và image fetch vẫn chạy.
2. **Tenant/private reports (B05)**: botId/kho namespacing, group whitelist, media owner+TTL/signedURL, bỏ global fallback, restrictive rules. Migration dry-run liệt kê global report không tự xóa. Done: hai bots/hai kho tests không đọc/ghi/nhận report chéo.
3. **Coupon state và claims (B06–B08/B12)**: shared runtime schema/transition policy (giữ module isolation phù hợp), transaction claim+order key/eventid, role LINE enforcement, stable productID, outbox+conditional rollback, archive USED. Done: cạnh tranh một coupon, cancellation, expiry, errors, replay, history đều đúng.
4. **Relay durability (B09)**: lease claim/reconcile, worker in-flight, persist pending, correlation, idempotent complete+delivery. Done: hai tabs/network crash/same-kho orders/429 không mất/trùng/lẫn mã.
5. **Scheduler data correctness (B10–B11)**: outbox state/retry per recipient, timezone UTC-range/index, per-bot error isolation+timeout. Done: lease crash, ONCE/partial failure, day boundary, volume read budget được test.
6. **Gemini resource budget (B03)**: input/output schemas/quota/App Check/request cancel/maxInstances/cost guard. Done: unauthorized/quota/input invalid không gọi AI; model timeout không fanout không kiểm soát.
7. **So giá contract và accuracy (B13–B14)**: local service security pairing/origin, queue/cancel/validation/browser lifecycle, product identity/parser fixtures. Done: laptop production origin thật, không crash/leak, variant match chính xác.
8. **Check pipeline**: giữ CI typecheck functions đã có; bổ sung emulator security và actual handler mock cho API business paths. Tests hiện nhiều pure parser/UI mock chưa cover server authorization/atomic claims/secret boundaries. Không chạy test gửi LINE thật hoặc thay production data.

## Hạn chế của chứng cứ

Offline VM lấy handler thật sau stripTypeScriptTypes, thay imports/DB/fetch bằng mock; chứng minh đường control flow, authorization guard thiếu và race giữa snapshot/update. Không chứng minh IAM/rules đang deploy, tồn tại record thật, hoặc LINE delivery thực. Fixture timezone/cleanup và pure matcher không phải test integration Firestore. Không assert project đã bị tấn công hay credential bị lấy; đó cần kiểm tra logs/infra có ủy quyền riêng.
