# Audit luồng dữ liệu các tính năng

Phạm vi: ưu tiên Phân ca, Sticker Event/Sticker Printer, Báo cáo khai thác; đọc thêm công thức Check thưởng. Không sửa nguồn, không deploy, không gọi production. Các kết luận dưới đây là xác minh từ luồng mã; nơi chưa chạy trình duyệt/Firestore thật được ghi rõ. LINE và thuế do agent khác phụ trách. Chưa thể cài dependency vì proxy mạng lỗi; không được coi báo cáo này là bằng chứng toàn bộ runtime đã đạt.

## F01 — P1 — Đổi tháng Phân ca có thể ghi lịch tháng cũ đè lên tháng mới

- Bằng chứng: `features/phan-ca/hooks/usePhanCaData.ts:161` bắt đầu load khi `monthYear` thay đổi, nhưng không hạ `isDataLoadedForSupermarket`; các lần load nams/nus/rules/pattern phải await trước khi đọc schedule ở dòng 177. Effect persist ở dòng 252–271 vẫn thấy cờ true, tạo `schedule-${monthYear}` mới ở dòng 261 và ghi `staffList`/history/busy/unresolved của tháng cũ vào đó. Tháng mới đã có lịch vẫn bị ghi đè local ngay. Không có cancellation/generation token ở load nên khi đổi tháng/kho liên tục, response cũ cũng có thể áp state vào phạm vi mới.
- Tái hiện: có lịch tháng 09 và 10 khác nhau; mở tháng 09 rồi chọn 10; xem IndexedDB `Kho::schedule-2026-10`. Nếu cloud vắng/lỗi/offline, lần đọc tháng 10 lấy chính lịch tháng 09 vừa bị ghi. Với mạng chậm, đổi 10→11 trước khi load xong làm tăng rủi ro response chéo.
- Hậu quả: hỏng lịch, lịch bận và lịch sử; có thể sync dữ liệu hỏng lên cloud.
- Sửa: state dữ liệu phải gắn `{uid,supermarket,month}`; đóng write trước chuyển scope, load song song các key độc lập, chỉ apply khi token còn khớp, chỉ persist khi scope đã hydrate đúng; không cập nhật lastModified do thao tác hydrate.
- Kiểm chứng đã chạy: native Node24 strip TypeScript từ **hook nguồn thật**, adapter React/IndexedDB/Firestore giả offline trong `/workspace/audit-feature-proofs.cjs`: trước `fixture-october`, sau effect load+persist của render đổi tháng, local và state đều thành `fixture-september`, phát sinh 11 writes. Đây là unit harness, không phải browser E2E.
- Nghiệm thu: lịch 09/10/11 không đổi sau chuyển nhanh; offline và delayed response; lịch cũ không phát sinh write vào key mới. Nên chạy hook test với IndexedDB và mock Firestore.

## F02 — P1 — Lịch Phân ca đã chỉnh tay tự bị tạo lại khi nạp nhân viên

- Bằng chứng: `features/phan-ca/PhanCaView.tsx:205` đặt timeout `generateNewSchedule()` mỗi khi `nams`/`nus` đổi, kể cả load từ DB. Hook dòng 192–193 luôn set các array nhân viên vừa nạp. `generateNewSchedule` ở dòng 186–196 tạo lại lịch rồi thay `staffList`, không phân biệt hydration với thay đổi người dùng và không kiểm tra đã có lịch.
- Tái hiện: sửa thủ công một ca, lưu, đóng/mở tính năng; đợi >1s sau nạp nhân viên. Lịch bộ phận đang chọn có thể được sinh lại và persist. Đây là luồng mã xác minh; chưa chạy UI.
- Sửa: chỉ sinh lại theo hành động rõ ràng hoặc thay đổi cấu hình được xác nhận; không đưa auto generate vào effect hydration. Giữ lịch đã có, cung cấp preview khác biệt trước áp.
- Nghiệm thu: mở lại/đổi kho/đổi tháng giữ mọi ca sửa tay, history và busy overrides.

## F03 — P1 — Xóa bảng giá/tồn kho Sticker không lan sang thiết bị khác

- Bằng chứng: `features/sticker-event/services/firebaseService.ts:235` xóa chunk và chỉ ghi `totalItems:0/chunkCount:0` vào metadata riêng; dòng 240–241 chủ động giữ `lastUpdated` cũ, không sửa metadata/sync. `hooks/useStickerEventDb.ts:180` quyết định tải bằng timestamp, và dòng 190/200 chỉ áp cloud khi `length>0`.
- Tái hiện: máy A và B cùng kho đã có cache; A xóa toàn bộ; B mở lại. B thấy cloud timestamp bằng bản cache nên không tải, tiếp tục hiện bảng giá/tồn cũ. Kể cả tăng timestamp ở riêng backend, cloud `[]` vẫn không xóa state local do guard length>0.
- Sửa: xóa là một revision hợp lệ; publish manifest revision mới, total=0 và tombstone; client áp mảng rỗng và clear cache. Phân biệt dữ liệu rỗng hợp lệ với fetch error.
- Kiểm chứng đã chạy: service clear và hook loader **nguồn thật** với Firebase/IDB adapters giả offline. Chunk bị xóa=1, merged timestamp vẫn=1, product fetch=0, UI vẫn `old-price`; ép timestamp cloud mới=2, fetch trả [] nhưng UI vẫn `old-price`. Script trên chạy exit0.
- Nghiệm thu: hai phiên cùng kho nhận deletion; offline reconnect không khôi phục dữ liệu cũ; timestamp/manifest là nguồn duy nhất.

## F04 — P1 — Upload Sticker không atomic, người khác có thể đọc bộ dữ liệu trộn

- Bằng chứng: `firebaseService.ts:97–134` và `140–174` ghi từng chunk vào `chunk_0, chunk_1...` đang được người dùng đọc, sau đó xóa phần dư, rồi cập nhật metadata/sync bằng hai setDoc riêng. Fetch dòng 180–219 đọc toàn collection không lọc revision. `Timestamp.now()` dòng 116/124/158/164/716 là đồng hồ client, khác với comment “server sinh”.
- Tái hiện: upload mới >=2 chunk; chunk đầu ghi xong thì mất mạng hoặc bị timeout; máy khác query collection sẽ nhận chunk mới + chunk cũ. Hai admin upload cùng lúc có thể đan xen chunk và cùng sửa manifest. Thiết bị có đồng hồ nhanh còn có thể khiến smart-sync bỏ qua bản mới từ máy chậm.
- Sửa: ghi vào generation ID mới, kiểm tra số lượng/hash, commit một manifest `activeRevision` sau khi hoàn thành; reader chỉ đọc generation đã commit; dùng server timestamp/revision monotonic, chống upload trùng bằng operation ID/lock; dọn generation cũ sau.
- Nghiệm thu: inject lỗi giữa mọi bước, upload cạnh tranh, client lệch giờ; reader luôn thấy một bộ hoàn chỉnh hoặc bộ cũ; retry không ghi lặp vô hạn.

## F05 — P2 — HTML injection trong tên sản phẩm/phiếu; rủi ro XSS cần đối chiếu CSP

- Bằng chứng: `stickerprinter/pageHtmlUtils.ts:184–217` interpolate các trường page code/header/footer/label/giá vào HTML không escape; `hooks/useStickerPrinterData.ts:1518` gọi `insertAdjacentHTML` trên kết quả. Excel name/header/footer được đọc nguyên văn ở `stickerprinter/excelParsers.ts:222–246/270–287`. `services/printService.ts:173/243/322/370/402` cũng interpolate tên, promotion và tên nhân viên nguyên văn; đưa vào `renderContainer.innerHTML` ở dòng 1335/1383 trên mobile hoặc iframe cùng origin không sandbox `frameDoc.write` dòng 1468. Ngoài ra `DrawTicketBlock.tsx:75–80` truyền rich HTML chưa sanitize vào `useContentEditable.ts:22/36`.
- Tác động xác minh: markup từ file/danh sách đi nguyên vào DOM, có thể thêm nội dung/ảnh ngoài dự kiến và phá giao diện/tem in. Đã chạy hàm generatePageHtml nguồn thật trong Node: HTML đầu ra giữ nguyên thẻ img cùng event-handler marker. **Chưa xác minh JavaScript thực thi**: `index.html:50–68` có CSP enforce, script-src không cho unsafe-inline, nên event-handler inline thường bị chặn; iframe about:blank cũng có thể kế thừa CSP. Vì vậy đây là HTML injection đã xác minh và rủi ro XSS có điều kiện, không được báo như lỗ hổng chiếm phiên đã khai thác thành công. CSP cho img-src https bất kỳ. DOMPurify có tồn tại cho một số nội dung rich-text nhưng không bảo vệ các đường này.
- Tái hiện an toàn: đưa thẻ `img` có event-handler chỉ đặt marker vào ô tên sản phẩm hoặc tiêu đề fixture; import→in, xác minh marker trong môi trường offline. Không gửi dữ liệu ra ngoài.
- Sửa: tạo DOM bằng textContent/React cho trường plain text; HTML rich text phải sanitize trước mọi gán innerHTML, cả hook editable và print; escape đúng context attribute/text/URL; iframe print sandbox phù hợp. Test payload ở import, saved list, restore và print desktop/mobile.

## F06 — P1/P2 — Sản phẩm nhập tay báo lưu/xóa ngay, nhưng cloud lỗi bị nuốt và ID tạm không cập nhật danh sách in

- Bằng chứng: `hooks/useStickerEventDb.ts:288–335` thêm optimistic vào ba state, gọi `saveManualProduct(...).then` dòng 324 rồi chỉ remap ID thật trong `manualProducts` và `allProducts` dòng 326–327; không remap `displayedProducts`, nơi vừa cache ID temp. Hàm async trả `tempId` dòng 334 ngay mà chưa await cloud. `handleManualDelete` dòng 337–353 xóa local và bỏ gọi backend ở dòng 346 nếu `docId.startsWith('temp_')`; catch chỉ console. Update tương tự dòng 355–383.
- Tái hiện: thêm sản phẩm rồi xóa trong ManualInputModal trước save cloud hoàn thành (dòng 388 gọi onDeleteProduct bằng temp ID); delete bỏ gọi backend, create đang chạy vẫn có thể tạo record thật và quay lại lần sau. Sau create, ID temp còn ở displayedProducts/cache là rủi ro reference stale, không khẳng định mọi nút xóa bảng in phải xóa cloud (xóa bảng in có thể chỉ là bỏ khỏi hàng đợi theo thiết kế). Offline/permission/quota error tạo cảm giác thành công nhưng mất sản phẩm sau reload.
- Sửa: await commit hoặc outbox durable có trạng thái pending/error/retry; remap tất cả references và caches atomically; xóa pending create phải cancel/reconcile operation; rollback khi thất bại và hiển thị lỗi.
- Nghiệm thu: create→update/delete trước network hoàn tất; quota/permission/offline; reload và hai thiết bị có cùng record.

## F07 — P2 — Đồng bộ trạng thái Sticker đánh dấu thành công dù setDoc thất bại

- Bằng chứng: `hooks/useStickerEventState.ts:333–347` gán `cloudSavedRevisionRef=revision` trước save và mong `.catch` reset để retry. Nhưng `services/firebaseService.ts:654–671` catch lỗi setDoc chỉ console và resolve; vì vậy `.catch` của hook không bao giờ chạy.
- Tái hiện: mạng/quyền bị từ chối tại saveUserState; chuyển tab/visibility với payload không đổi. Hook coi revision đã lưu và không retry.
- Sửa: service phải throw hoặc trả kết quả typed; chỉ advance revision sau acknowledgment; serialize flush mới/cũ để response cũ không đánh dấu revision mới.
- Nghiệm thu: failure rồi reconnect retry đúng payload; không có success state giả.

## F08 — P2 — Phân trang danh sách đã lưu bị cắt nhưng không có cách lấy tiếp

- Bằng chứng: `firebaseService.ts:483–502` dừng khi >=20 kết quả được quyền xem; admin nhận trang đầu 50 rồi break. API chỉ trả array không cursor/hasMore. `SavedListsModal` và hook Sticker nhận danh sách này để liệt kê, không gọi load-more cursor. Fetch manual products cũng chỉ `limit(200)` dòng 745 không có pagination.
- Tái hiện: tạo 51 danh sách trong một kho, admin không thấy danh sách cũ thứ 51; nhân viên chỉ thấy một phần sau khi đủ 20. Tạo 201 sản phẩm nhập tay sẽ mất ít nhất một sản phẩm khỏi view sau reload.
- Sửa: trả cursor+hasMore, UI “Tải thêm”, truy vấn owner phía server theo policy; pagination đủ tất cả dữ liệu cần; migration legacy metadata trước khi chuyển query.
- Nghiệm thu: tìm và mở được mục thứ 51/201; quyền và thứ tự ổn định.

## F09 — P2 — Quantity từ JSON không được kiểm tra số nguyên hữu hạn hoặc giới hạn

- Bằng chứng: `hooks/useStickerEventFile.ts:375` nhận `quantity:item.quantity>0?item.quantity:1`; JSON quantity string, số thập phân hoặc 1e100 đều đi qua. `services/printService.ts:1281` dùng `Array(p.quantity).fill(p)` và sinh toàn bộ HTML trước phân trang. Đã chạy Node xác minh Array(1.5)/Array(1e100) ném RangeError và Array('10') có length=1; không chạy fixture khối lượng cực lớn gây OOM.
- Tái hiện: JSON hợp lệ với một sản phẩm có quantity=1.5 → RangeError; quantity=1000000000 → nguy cơ hết RAM/treo tab; quantity="10" tạo `Array("10")` có 1 phần tử, chỉ in một tem. Các quantity chỉnh UI có floor nhưng import bỏ qua.
- Sửa: schema import, `Number.isSafeInteger`, min/max nghiệp vụ và cap tổng tem; lưu quantity dưới kiểu number; tạo từng trang/lô thay vì flatMap toàn bộ; warning/confirm quy mô và cancel job.
- Nghiệm thu: decimal/string/huge/NaN fixture reject rõ ràng; hàng nghìn tem vẫn có tiến trình, cancel, không OOM iOS.

## F10 — P2 — Báo cáo khai thác có nhiều thông báo thành công trước commit thật

- Bằng chứng: `features/khai-thac/KhaiThacView.tsx:129–149` thêm/xóa custom fields optimistic, catch chỉ console nhưng toast success; dòng 196–199 deleteReport await `.catch` rồi vẫn xóa UI+toast; dòng 214–227 add/remove lead tương tự. IndexedDB service đã resolve khi transaction commit nhưng UI không sử dụng bảo đảm này. Nạp lỗi dòng 80–88 vẫn setLoaded true, cho phép ghi default state sau read error.
- Tái hiện: inject IndexedDB QuotaExceededError/AbortError. UI báo thêm/xóa thành công; reload làm khách hàng biến mất hoặc record bị xóa quay lại.
- Sửa: await commit, catch hiển thị lỗi/rollback; loading/error state tách khỏi loaded; chặn ghi khi load thất bại; nháp/khách cần export-backup hoặc recovery vì là local-only.
- Nghiệm thu: simulate storage full/abort/blocked; không báo thành công giả và không ghi state rỗng lên dữ liệu chưa nạp.

## F11 — P2 — Clear-all Khai thác không dọn bản nháp đang chờ

- Bằng chứng: `KhaiThacView.tsx:94–108` giữ `pendingDraft` và debounce 300ms; `clearAll` dòng 201–205 xóa DB và `setDraft` trực tiếp nhưng không clear timer/pendingDraft. Handler pagehide/unmount dòng 109–112 flush nháp cũ.
- Tái hiện: gõ notes/name/revenue rồi chuyển Nhật ký→xóa toàn bộ trong <300ms; hoặc xóa khi pending draft vẫn còn rồi unmount/pagehide. Callback có thể ghi nháp cũ sau clearAll và khôi phục khi mở lại.
- Sửa: cancel timer và clear pending trước transaction clear; dùng generation token cho save pending, lưu nháp rỗng trong cùng transaction nếu cần.
- Nghiệm thu: fake timers + clearAll + pagehide/unmount không sinh dữ liệu cũ lại.

## F12 — P2 — Hiệu suất/giới hạn dữ liệu Phân ca

- Bằng chứng: `hooks/usePhanCaData.ts:166–180` 10 key đọc+sync tuần tự; cloud mỗi getDoc phải chờ key trước. `logHistory` dòng 347–354 prepend snapshot đầy đủ không giới hạn; mỗi thay đổi effect dòng 252–270 ghi lại 11 key local và history cả mảng; cloud `firestoreSync.ts:20–25` lưu cả lịch sử trong một document.
- Tác động: cold load chậm theo tổng RTT của >=10 request; lịch sử tăng không giới hạn gây CPU/storage tăng, eventually vượt 1MiB document Firestore. Cloud error bị console, không có trạng thái sync lỗi/outbox, nên có thể chỉ local giữ dữ liệu.
- Sửa: load Promise.all có cancellation, key writes theo dirty-state, debounce phù hợp và flush lifecycle; history theo entry/pagination hoặc cap retention rõ ràng; chunk theo byte và quota tests; chạy thuật toán nặng trong worker khi đo thấy block.
- Nghiệm thu: fixture 30/100 nhân viên, 31 ngày, >=200 chỉnh sửa; đo RTT slow network, writes/thao tác, JSON bytes; history vẫn restore và sync không vượt giới hạn.

## Coverage chi tiết

Đã đọc toàn bộ: Phân ca `hooks/usePhanCaData.ts`, `db/idb.ts`, `services/firestoreSync.ts`, `constants.ts`, `services/googleSheetsExport.ts`; Sticker `hooks/useStickerEventDb.ts`, `hooks/useStickerEventState.ts`, `hooks/useStickerEventFile.ts` (một lần output phần đầu bị truncate, đã đối chiếu các đoạn phát hiện), `hooks/useStickerEventPrint.ts`, `services/firebaseService.ts`, `services/fileParser.ts`, `services/dbService.ts`, `stickerprinter/pageHtmlUtils.ts`, `stickerprinter/ticketSanitize.ts`, `stickerprinter/useContentEditable.ts`; Khai thác `KhaiThacView.tsx`, `services/khaiThacDb.ts`, `utils/expression.ts`, `utils/aggregate.ts`, `components/ReportEntryTab.tsx`; Check thưởng `services/checkThuongCalc.ts`.

Đọc trọng tâm/đối chiếu call sites: Phân ca `PhanCaView.tsx`, `services/scheduleService.ts`, `utils/scheduleUtils.ts`, `components/EditPatternModal.tsx`; Sticker `hooks/useStickerPrinterData.ts`, `services/printService.ts`, `stickerprinter/excelParsers.ts`, `stickerprinter/DrawTicketBlock.tsx`, `StickerEventApp.tsx`, `SavedListsModal.tsx`; Check thưởng `components/CheckThuongLeaderboardView.tsx`. Chưa đọc hết toàn bộ những file lớn này; audit cosmetic UI do agent thiết kế phụ trách. Cần tránh tuyên bố đã kiểm chứng 100% mọi nhánh UI/Safari/thực tế Firebase.

## Plan bàn giao Claude cho nhóm tính năng

1. F01/F02: bảo vệ hydration/scope trước persist và bỏ auto-regenerate lịch khi load. Mỗi lỗi một test tái hiện; commit riêng.
2. F05: một quy ước plain text/rich text dùng chung, xử lý tất cả HTML sinks gồm print/editable/import/restore; test offline benign marker + CSP.
3. F03/F04: chuyển sync Sticker sang revision manifest atomic, hỗ trợ deletion và server timestamps; migration dữ liệu cũ và rollback path.
4. F06/F07/F10/F11: thống nhất contract persistence result, UI error/pending/outbox và rollback; storage fault injection; lifecycle flush không viết scope cũ.
5. F08/F09/F12: pagination dữ liệu, schema import, giới hạn khối lượng theo byte/total tags và history retention; benchmark laptop/iOS dataset đại diện.

Mỗi bước cần kiểm tra đơn vị liên quan, test trình duyệt offline/slow-network và dữ liệu giả; không dùng production để khai thác. Trước phát hành: chạy thiết bị Safari iOS thật cho import lớn, background/reopen, PDF/print, clipboard, quota; kết quả WebKit mô phỏng ghi riêng.
