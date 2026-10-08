# Audit dữ liệu, đồng bộ và hiệu suất — Root + Report BI

ID DATA01–DATA10 trong phụ lục là ID cục bộ, khác ID D01–D18 của báo cáo tổng: DATA01 = D02, DATA02 = D01, DATA03 = D03, DATA04 = D04, DATA05 = D14, DATA06 = D16, DATA07 = D17, DATA08 = D11, DATA09 = D15; DATA10 là nhóm hiệu suất.

Phạm vi: `/workspace/project-audit/dashboard-main`, bản ZIP người dùng gửi, kiểm tra tĩnh và mô phỏng offline; không gọi production, không sửa mã nguồn. Đã đọc đầy đủ các đường chính: `hooks/useDataManagement.ts`, `hooks/useFileUploadLogic.ts`, `services/cloudDataService.ts`, `services/khoDataService.ts`, `services/filterService.ts`, `services/kpiService.ts`, `services/analytics.worker.ts`, `services/dbService/salesData.ts`, `features/bi-dashboard/hooks/useDashboardLogic.ts`, `useIndexedDBState.ts`, `useWorker.ts`, `features/bi-dashboard/utils/db.ts`, `services/dbService.ts`, `biDataService.ts`, cầu nối nhân viên và các đoạn liên quan trong hooks phân tích/BI. Các đường khác được tìm tham chiếu và đọc chọn lọc. Không tuyên bố đã đọc mọi dòng toàn repository.

## Cơ chế đã có và đáng giữ

- Database gốc + BI lấy cùng tên theo UID qua `utils/localDbScope.ts`; có migration cục bộ, tránh chia lệch database.
- Root tách xử lý Excel/KPI vào Worker; JSON UTF-8 transferable và chia khúc khi gửi dữ liệu lớn đã giảm structured clone. Đường chính tính doanh thu dùng `calculateRowMetrics`, không phát hiện công thức thay thế trái phép ở đường đã kiểm tra.
- Root dùng generation cho `SET_DATA` và snapshot FIFO để ghép dữ liệu hàng với số tổng hợp; BI parse dùng cờ `isMounted` để bỏ kết quả cũ khi deps thay đổi.
- Worker BI đã có `onerror`, reject pending, reset worker, timeout 60s. Ghi root có retry; các store BI đã xử lý abort ở nhiều đường.
- Những cơ chế trên chưa giải quyết các lỗi bên dưới. Không coi comment "đã fix audit" là bằng chứng các trường hợp khác đã đúng.

## Kết quả mô phỏng offline

Script `/workspace/audit-repro/data-repro.mjs` dùng Node v24 `stripTypeScriptTypes`, nạp nguyên thuật toán nguồn trong VM và thay dependency Firestore/React bằng mock. Không gọi Firebase hoặc mạng. Những chỉ số sau là tái hiện logic với dữ liệu giả, không phải benchmark iPhone/production.

Chạy: `node /workspace/audit-repro/data-repro.mjs`.

1. 800 dòng văn bản tiếng Việt: splitter tạo chunk 768 dòng, 818.579 ký tự UTF-16 nhưng 1.110.419 bytes UTF-8; riêng nội dung string đã 1.090.560 bytes (>1 MiB) trước overhead Firestore.
2. Gọi `uploadKhoSalesData()` hai lần cùng một báo cáo lịch sử → hai file active, hai dòng cùng ID; `downloadKhoSalesData()` → `processKpis()` cho doanh thu 2.000.000 thay vì 1.000.000.
3. Metadata báo 2 dòng/2 chunk nhưng chunk cuối không tồn tại → `downloadProcessedData()` trả thành công 1 dòng; không reject.
4. Nạp nguyên hook `useDataManagement` với fresh hook state mỗi phiên nhưng giữ local settings, chạy Kho effect thật: lần đầu originalData 2 dòng, lần mở trang thứ hai 0 dòng và không setAppState processing; đã tái hiện lỗi snapshot.
5. Parser thật: `31/02/2026` → `2026-03-03`, `45,5%` → `455`, parse lại `(12.5).toLocaleString('vi-VN')` (`12,5`) → `125`.

## DATA01 — P1 — Đồng bộ Kho không idempotent, nhân doanh thu lịch sử

**Xác minh:** tái hiện offline bằng hàm nguồn thật + mock Firestore, theo tới hàm KPI thật.

**Bằng chứng:** `services/khoDataService.ts:89` dùng `doc(filesRef)` sinh ID mới với mọi upload không realtime. `:103` đánh active. `:232-235` và `:370-385` gộp mọi file active bằng flat không khử dòng trùng. `hooks/useDataManagement.ts:893-898` mỗi lần "Xem báo cáo" gửi TOÀN BỘ merged dataset lên Kho; `:746-751`, `:791-795` cũng gửi dataset hợp nhất sau xoá tệp. `hooks/useFileUploadLogic.ts:586-588` gửi merged data sau upload. `services/kpiService.ts:26-33` cộng doanh thu của mọi dòng. `utils/dataUtils.ts:555-600` chỉ chuẩn hoá ngày, không dedup.

**Điều kiện:** có ít nhất một tệp lịch sử active (merged.isRealtime=false), manager bấm xem báo cáo hai lần; hoặc hai manager cùng Kho tải cùng dữ liệu. File lịch sử sau chứa A+B còn file cũ A vẫn active → A bị cộng hai lần. Có hộp cảnh báo overlap khi nhập lịch sử CỤC BỘ (`useFileUploadLogic:305-437`), nhưng re-sync Kho không đi qua hộp này.

**Tác động:** số doanh thu/KPI/hiệu suất nhân viên sai; dữ liệu và số document/chunk tích luỹ, tốn tải đọc/ghi và RAM. Đây không chỉ là lỗi hiệu suất.

**Sửa:** quy định dữ liệu Kho là một snapshot hoàn chỉnh hay các file nguồn; giữ ID ổn định/hashes/source manifest, upsert file nguồn đã sync, không auto-ID cho việc xem/xoá/re-sync snapshot. Thiết kế chống trùng dựa định danh dòng (đơn+chi tiết dòng/SKU+nguồn), không xoá nhầm nhiều SKU trong một đơn. Chuyển dữ liệu cũ theo plan có bản sao, không tự xoá production.

**Nghiệm thu:** upload/re-sync/view 10 lần không tăng số file cùng nội dung hoặc đổi tổng doanh thu; file A rồi A+B không nhân A; hai manager cùng dữ liệu không nhân số; nhiều dòng SKU hợp lệ cùng đơn vẫn được giữ.

## DATA02 — P1 — Nhân viên mở Phân Tích lần thứ hai mất dữ liệu Kho

**Xác minh:** tái hiện offline Kho effect nguyên hook với fresh state và persistent local cache; chưa test trình duyệt đăng nhập thật.

**Bằng chứng:** `hooks/useDataManagement.ts:61` originalData khởi tạo `[]`; boot `:175-176` chỉ đọc sales registry/store qua `getMergedSalesData`, còn Kho cache được ghi vào settings ở `services/khoDataService.ts:378`. Kho effect `useDataManagement:578-592` đã fetch đủ khoRows rồi `if (lastApplied === snapshot) return` ở `:582`, snapshot được lưu bền qua các phiên. `setOriginalData` ở `:589` chỉ xảy ra nếu snapshot đổi; không có đoạn lưu khoRows vào sales store.

**Điều kiện:** employee chưa từng tự upload, cloud riêng UID không có salesData, lần đầu xem dữ liệu shared của quản lý; reload trong lúc dữ liệu Kho chưa thay đổi. Lần 1 cache rows/settings + snapshot; lần 2 boot originalData rỗng nhưng snapshot trùng nên bỏ nạp rows. Manager có local dữ liệu riêng cũng có thể giữ tập dữ liệu local không đồng nhất với Kho nếu snapshot không đổi.

**Sửa:** snapshot “đã áp dụng vào RAM” chỉ sống trong phiên, hoặc persist atomically snapshot + dataset khởi động và chỉ skip khi dataset đang hiển thị khớp snapshot thật. Không chỉ sửa bằng kiểm tra snapshot toàn cục.

**Nghiệm thu:** employee mở/reload 3 lần luôn thấy cùng số liệu; chạy online/offline sau lần 1; cache có metadata nhưng rows bị mất phải tải lại hoặc báo rõ, không silently skip; manager local và shared snapshot khác phải được phân biệt.

## DATA03 — P1 — Chunk cloud có thể đọc tập dữ liệu thiếu/lai và vẫn được chấp nhận

**Xác minh:** missing chunk tái hiện offline; race nhiều writer/reader xác minh cấu trúc code, chưa chạy Firebase thật.

**Bằng chứng:** `services/cloudDataService.ts:146-157` ghi đè cố định `chunk_N` qua từng batch 10 docs, meta cuối; không có generation immutable/checksum. Reader `:219-245` đọc song song các chunk cố định, thiếu document `:224` trả `[]`, không so totalRows hoặc version. Kho dùng cùng pattern (`khoDataService:112-123`, `:207-225`). Worker root/normalize không kiểm tra rowCount theo metadata.

**Điều kiện:** dữ liệu >10 chunks, batch đầu commit rồi mạng/quota fail trước meta/batch sau; client khác đang download trong lúc upload; hai thiết bị upload cùng UID/realtime slot. Đọc metadata cũ vẫn đọc được chunk đầu mới. Số chunk bằng nhau thì cũng có thể ghép thế hệ khác nếu request đọc chạy qua thời điểm commit. Thiếu chunk thường do upload/corruption/delete không được phân loại lỗi.

**Sửa:** dataset version/generation riêng, chunks immutable mang version; upload staging xong kiểm đủ chunk rồi công bố manifest/current pointer cuối cùng; reader verify rowCount/checksum/shape/version, retry hoặc giữ bản tốt trước. Dọn phiên bản cũ sau khoảng an toàn; tránh cleanup writer cũ xoá chunk writer mới.

**Nghiệm thu:** inject fail ở batch 2, thiếu chunk, writer đồng thời, download trong lúc đổi version; chỉ nhận tập cũ đầy đủ hoặc tập mới đầy đủ; báo lỗi rõ nếu không đủ, không thay local bằng dữ liệu thiếu.

**Liên quan khóa cấu hình nặng:** `services/firestoreService.ts:286-301` assemble đọc TẤT CẢ docs `chunks`, không kiểm metadata.chunkCount/generation. `:363` công bố meta trước cleanup `:365-388`, nên khi giảm số chunk reader có thể ghép chunk dư cũ và parse thất bại; hoặc ghép JSON lai. `lastKnownChunkCount` chỉ trong tab, không khóa writer thiết bị khác. Áp dụng cùng versioning; reader chỉ lấy đúng manifest và validate.

## DATA04 — P1 — Giới hạn “800KB” đếm ký tự, không đếm bytes/document Firestore

**Xác minh:** tái hiện offline splitter thật, riêng bytes của các string lớn hơn 1 MiB.

**Bằng chứng:** `services/cloudDataService.ts:18` MAX_CHUNK_BYTES nhưng `:80-89` dùng `rowStr.length`; chuỗi tiếng Việt/emoji không bằng số byte UTF-8. `chunkData` cũng không reject/split một dòng riêng quá lớn. Kho reuse `:25,:74-75`. Khóa nặng `firestoreService` dùng CHAR_SIZE cũng cần rà tương tự.

**Tác động:** upload nhiều dữ liệu thất bại với document quá lớn, đôi khi sau khi đã commit các batch đầu, dẫn tới DATA03. Mẫu đo đã chứng minh chưa tính overhead map/array mà đã vượt trần; không cần giả định Firestore JSON serialization đúng bằng JSON byte count.

**Sửa:** đo UTF-8 và cộng overhead cấu trúc Firestore, hạn dưới trần có margin; tốt hơn lưu raw JSON string đã giới hạn byte nếu contract cho phép, hoặc Storage/object backend; single row oversized báo cụ thể. Không bỏ cột âm thầm để fit.

**Nghiệm thu:** fixture nhiều tiếng Việt/NFD/emoji, ASCII, row sát trần và row quá lớn; mọi doc/batch dưới giới hạn; lỗi kích thước không công bố dữ liệu mới partial.

## DATA05 — P1 — Cloud tự đồng bộ xoá archive local trước khi ghi thành công

**Xác minh:** code path trực tiếp, chưa inject IndexedDB quota thật.

**Bằng chứng:** `services/dbService/salesData.ts:78-94` và `:108-125` gọi `clearAllSalesFiles()` TRƯỚC khi lưu bản cloud mới. Hàm clear xoá tất cả salesData_* và tempRealtime/registry (`:521-548`). Cloud watcher `useDataManagement:645-650` tự gọi apply; bản realtime mới cũng dùng đường xoá toàn bộ lịch sử. Dataset cloud chỉ chứa merged active rows (`useFileUploadLogic:586`), không mang bản archive inactive hoặc registry file nguồn. Nếu saveSalesFileData/put sau clear quota-fail, dữ liệu cũ đã mất.

**Điều kiện:** laptop có archive inactive rồi thiết bị khác đồng bộ bản realtime mới hơn; hoặc thiết bị gần hết storage, ghi bản cloud thất bại sau clear. Không thể khôi phục đầy đủ archive từ snapshot merged trên cloud riêng.

**Sửa:** staging local trước, chuyển con trỏ/registry atomically sau validate, giữ archive từng tệp và chỉ thay snapshot tương ứng; quy định rõ sync snapshot versus sync kho tệp. Thất bại không xoá bản tốt.

**Nghiệm thu:** inject QuotaExceededError ở write mới vẫn giữ old rows+registry; nhận realtime không xoá các file archive; nguồn nhiều file/bản inactive có cách khôi phục đúng theo contract.

**Đường boot khác cũng nguy hiểm:** `hooks/useDataManagement.ts:534-539` catch lỗi khởi tạo bất kỳ tự `clearAllSalesFiles()` + `clearProductConfig()`. Lỗi config hỏng/transaction/shape không chứng minh mọi sales files hỏng. Cần bỏ xoá tự động blanket, giữ nguyên cho người dùng recovery có chủ đích.

## DATA06 — P2 (ảnh hưởng tính đúng báo cáo) — BI giữ kết quả đã parse sau khi xoá nguồn, dùng số tổng cụm cho siêu thị thiếu số

**Xác minh:** tĩnh theo consumer; không chạy UI thật.

- Xoá từng dữ liệu realtime tại `features/bi-dashboard/components/DataUpdater.tsx:885-886` set raw `''`. `hooks/useDashboardLogic.ts:113` return nếu rỗng nhưng KHÔNG `setSummaryRealtimeParsed` về empty; các effect `:123,:133,:143` tương tự. `:811-812` vẫn báo hasData theo bảng cũ. DataUpdater reset `:736-799` chỉ reset raw/shared caches, không các parsed state. BI wrapper giữ Dashboard sống sau khi chuyển qua updater, nên quay lại vẫn có parsed cũ. Hook nhân viên cũng tương tự với danhSach `useNhanVienData:347` và trả góp `:429` (realtime revenue khác có clear đúng ở `:365-367`).
- `hooks/useDashboardLogic.ts:654-667` fallback header KPI vào `kpis` của một siêu thị đang chọn, kể cả activeSupermarket không phải Tổng. Nếu row riêng thiếu lượt khách/bill/target/dự kiến mà header KPI là tổng cụm, thẻ siêu thị nhận số tổng. Bằng chứng parser/header có trường tổng, consumer không gắn scope vào fallback. Cần kiểm với fixture 2 siêu thị, header total và row thiếu cột; không khẳng định mọi báo cáo thực tế đều thiếu.

**Sửa:** khi raw nguồn rỗng/parse lỗi/reset/đổi scope phải clear derived state hoặc giữ bản cũ nhưng gắn stale/error rõ; fallback chỉ cùng entity/period, không dùng KPI tổng cụm cho store thiếu. Không đổi số thiếu thành 0 nếu nghiệp vụ coi là unknown.

**Nghiệm thu:** load rồi xoá raw/đặt lại, quay qua BI dashboard/nhân viên không còn số cũ; store A thiếu lượt khách không hiện tổng A+B; parse lỗi và scope đổi có loading/error/unknown nhất quán.

## DATA07 — P2 — Worker Root crash không recovery và response PROCESS chưa được ràng buộc generation

**Xác minh:** tĩnh; chưa làm browser Worker crash test.

**Bằng chứng:** `hooks/useDataManagement.ts:1005-1008` onerror chỉ đổi status “Đang tải lại...” nhưng không terminate/recreate, clear queue, kết thúc isFilterProcessing hoặc thay appState; `PROCESS` phía worker không id/generation (`services/analytics.worker.ts:49-79`), main `:961-990` nhận và commit mọi kết quả, dù đã clear/change originalData. SET_DATA có generation chỉ bảo vệ lần nạp cache, không bảo vệ PROCESS đã gửi.

**Điều kiện:** Worker module crash/OOM/Safari lifecycle sau gửi PROCESS gây UI processing kéo dài; clear dữ liệu trong lúc PROCESS cũ còn pending có thể trả lại old dashboard sau clear. Khi đổi filters nhanh, cờ isFilterProcessing hạ ngay theo response đầu dù các process mới còn queue. FIFO giữ đúng cặp mảng với result nhưng không đảm bảo result còn hiện hành. Không khẳng định FIFO tự làm kết quả cuối sai — kết quả cuối thường đúng khi mọi task hoàn tất.

**Sửa:** mỗi process có requestId+dataGeneration+filterVersion, chỉ commit request phù hợp; clear/reset invalidates pending; coalesce filter pending latest, timeout+onerror reset/retry hoặc báo lỗi để retry tay. Mọi worker setup async phải có cancelled guard nếu unmount trước dynamic import.

**Nghiệm thu:** crash/hang/clear in-flight/đổi filters nhanh trả kết quả đúng latest hoặc error hữu hạn; không báo đang tự tải lại nếu không retry; spinner không tắt trước latest task hoàn tất.

## DATA08 — P1/P2 tùy dữ liệu — Registry/cấu hình có thể báo lưu thành công dù IndexedDB fail

**Xác minh:** tĩnh contract rõ.

**Bằng chứng:** `services/dbService/core.ts:205-213` `saveSetting` retry rồi chỉ log, resolve với throwOnFailure=false. `services/dbService/salesData.ts:297-299` saveSalesFilesRegistry dùng hàm này. `hooks/useFileUploadLogic:490` data blob đã ghi; registry write `:523` fail vẫn tiếp tới toast success `:578`. Tệp có blob nhưng không vào registry, reopen không thấy/không sync. Các config/targets cũng nhiều caller dùng catch nhưng catch không bao giờ chạy khi permanent failure. Đã có `saveSettingOrThrow` (`core:218`) nhưng mới áp dụng riêng, cần mở rộng có chủ đích ở durable write.

**Sửa:** write critical phải reject hoặc trả Result rõ; commit file data+registry trong cùng transaction hoặc dùng staging recovery; UI phân biệt saved-to-device / pending-cloud / failed; không đổi contract toàn bộ một lần nếu nhiều call sites không await.

**Nghiệm thu:** quota/denied/abort/disk failure không hiện success; refresh không mất tệp đã xác nhận lưu; retry recovery được; config fail hiển thị cảnh báo và không đánh lastModified success.

## DATA09 — P2 — Parser số và ngày chưa kiểm ngữ nghĩa đầu vào

**Xác minh:** tái hiện offline hàm nguồn thật.

**Bằng chứng:** `utils/dataUtils.ts:406` loại mọi dấu phẩy, `:409-410` coi .ddd là nghìn; `45,5%` →455. `:113-124` Date constructor tự roll invalid dates, `31/02/2026` →03/03. Dữ liệu số numeric Excel vẫn đúng; đây là lỗi khi các ô/nguồn API là string có thập phân theo vi-VN, không khẳng định file Excel numeric thực tế bị ảnh hưởng. Node UTC test đã chứng minh roll date, chưa kiểm timezone Safari.

**Sửa:** contract parser theo nguồn/locale rõ, normalize decimal/thousands có schema; parse strict ngày kiểm y/m/d/h/m/s sau constructor; ngày-only tránh phụ thuộc UTC/device timezone; không biến mọi malformed number thành 0 mà không báo hàng/cột lỗi.

**Nghiệm thu:** numeric + US grouping/decimal + vi-VN grouping/decimal + %/âm/null, ngày nhuận/31-02/ISO offset/Vietnam vs UTC; giữ backward compatibility fixture thực tế.

## DATA10 — P2 — BI đọc toàn bộ settings lớn để lấy vài target, còn tính đồng bộ main thread

**Xác minh:** code path; chưa đo time/RAM trên Safari/laptop, không đưa số latency giả.

**Bằng chứng:** `features/bi-dashboard/hooks/useDashboardLogic.ts:447` mỗi calculateTargets gọi `db.getAll`, chỉ cần key targethero; `features/bi-dashboard/utils/db.ts:245-261` `store.getAll()` clone TẤT CẢ settings trước filter `bi_`. Store này chứa cả khoDataCache_* (hàng trăm nghìn row), config, bonus và raw báo cáo. shared root+BI database theo UID đã đúng nhưng bulk scan này kéo toàn bộ root cache dù chỉ đọc target. `hooks/useCloudSync.ts:73` getAllSettings cũng lọc sau đọc; initial root `useDataManagement:362` tương tự. Root main `:1086-1123` vẫn lọc nhiều lượt qua cả dataset song song worker; hook kho custom columns `hooks/useWarehouseLogic:48-160` dùng timeout nhưng for-loop synchronous, startTransition ở setter không làm tính toán có thể ngắt.

**Sửa:** đọc key range prefix/known keys/registry target bằng key cursor trước get; tránh đọc values key không cần; chia settings nặng theo store/domain nếu migration đã có plan; benchmark 10k/50k/200k rows và nhiều archive, đo main long tasks/heap/worker clone rồi tối ưu hotspots. Dời timeout đơn thuần không loại main-thread freeze.

**Nghiệm thu:** request target không đọc cache rows root, lượt đọc có count; mở BI dashboard trên 200k cache không tạo clone toàn store; đo baseline và sau sửa trên thiết bị thật; đưa ngân sách định lượng đã thống nhất (không tự đặt 200k phải <200ms khi chưa có target hardware).

## Chưa kết luận / cần fixture và thiết bị

- Không kết luận Safari iOS "đã tối ưu" từ worker/viewport comments. Chưa có benchmark WebKit hoặc Safari thật, heap quota, lifecycle background, IndexedDB purge, file 60MB và ảnh export thật trong phạm vi này.
- Keepalive views ở App.tsx:85-112 là chủ ý giữ state; các BI hooks nhiều chỗ có isActive guard. Root data/cloud listeners còn hoạt động khi hidden để auto-sync; cần đo và tách công việc được phép chạy nền thay vì gắn nhãn leak cho mọi mounted tab.
- Chưa kiểm nghiệp vụ toàn bộ forecast/bonus/competition bằng data thật; có nhiều test các hàm tính thuần. Lỗi scope/merge/version bên trên vẫn có thể làm test hàm tính đúng mà báo cáo end-to-end sai.
- Không dùng dữ liệu thật/hardcoded credentials trong output; không deploy, push hoặc xoá dữ liệu.

## Plan cho Claude (phần dữ liệu)

1. Thêm regression fixtures offline DATA01/DATA02/DATA03/DATA04 trước sửa, chốt source manifest và rule idempotency.
2. Sửa Kho idempotency + reload snapshot, không migration xoá production ở bước viết code. Nghiệm thu DATA01/DATA02 là release gate.
3. Version cloud chunks/manifest và byte limit, reader fail-closed với integrity; áp dụng cho sales, Kho realtime và heavy config; migration reader tương thích legacy, rollback giữ snapshot cũ.
4. Local staging/atomic archive writes, loại blanket clear on error; critical writes có error contract và UI sync trạng thái thật.
5. Worker generation/recovery/coalescing và BI raw→parsed reset/scope fallback. Test đổi bộ lọc, clear và worker crash bằng browser mocks, không chỉ test math.
6. Parser strict theo nguồn, fixture thực tế vi-VN/US/ngày múi giờ; xử lý import error chỉ rõ dòng/cột.
7. Đo perf trên dataset đại diện và Safari thật rồi sửa bulk settings reads/main-thread loops. Mỗi PR giữ nguyên behavior ngoài bug, test scoped + typecheck/build theo quy tắc dự án.
