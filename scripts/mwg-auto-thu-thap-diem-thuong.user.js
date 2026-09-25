// ==UserScript==
// @name         MWG - Tự động lấy điểm thưởng nhân viên
// @namespace    dashboard-ycx
// @version      4.6
// @description  Gọi thẳng API GetReward (mỗi mã NV), parse HTML <table> trả về thành TSV giống hệt copy tay; nối cầu với Dashboard YCX để chạy chế độ Tự động; nút Click+ trên trang BI để mở rộng cây dữ liệu theo cấp + tự copy (click theo lô nhỏ, chờ đúng vòng xoay #Loading thật; tự bật "Trả góp" + "DT quy đổi" trên baocao.dienmayxanh.com trước khi mở)
// @match        https://newinsite.thegioididong.com/office/thuong-nhan-vien*
// @match        https://baocao.dienmayxanh.com/*
// @match        https://bi.thegioididong.com/*
// @match        https://dashboard.pro.vn/*
// @match        http://127.0.0.1:5173/*
// @match        http://127.0.0.1:5174/*
// @match        http://127.0.0.1/*
// @match        http://localhost:5173/*
// @match        http://localhost:5174/*
// @match        http://localhost/*
// @match        https://localhost/*
// @grant        GM_setClipboard
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addValueChangeListener
// @updateURL    https://dashboard.pro.vn/scripts/mwg-auto-thu-thap-diem-thuong.user.js
// @downloadURL  https://dashboard.pro.vn/scripts/mwg-auto-thu-thap-diem-thuong.user.js
// ==/UserScript==

/*
 * BẢN 4.6 — TỰ ĐỘNG RETRY KHI GẶP LỖI MẠNG / HTTP 5xx & HỖ TRỢ CHẠY TIẾP TỤC (RESUME):
 * - Thêm cơ chế tự động thử lại (retry tối đa 2 lần, nghỉ 1.2s) trong fetchOne khi máy chủ MWG bị nghẽn
 *   (HTTP 500, 502, 504) hoặc rớt kết nối mạng tạm thời, tránh bị đứt gánh giữa chừng khi chạy nhiều tháng.
 * - Ngoại trừ lỗi 401/403 (hết phiên đăng nhập) sẽ dừng ngay để báo người dùng đăng nhập lại mà không retry vô ích.
 *
 * BẢN 4.5 — HỖ TRỢ ĐỔ THƯỞNG NHIỀU THÁNG / CHẠY NĂM LIÊN TỤC TRÊN CÙNG 1 TAB:
 * - Khắc phục triệt để lỗi đổ thưởng Năm không chạy được hết năm (bị trình duyệt chặn popup khi mở tab async).
 * - Lắng nghe GM_KEY_META theo thời gian thực trên trang MWG qua GM_addValueChangeListener + poll 1s.
 * - Khi chạy Năm (multiStep), script tái sử dụng tab MWG đang mở để xử lý tuần tự từng tháng,
 *   KHÔNG tự đóng tab giữa các tháng -> ngăn chặn 100% việc trình duyệt chặn popup khi mở tab async.
 * - Tự động đóng tab sau khi toàn bộ chuỗi tháng (isLastStep) đã hoàn thành xuất sắc.
 *
 * ĐÃ CHẠY THẬT THÀNH CÔNG (test 27 mã NV qua chế độ Tự động, không mã nào lỗi):
 * - Tham số ngày: dtmFromDate / dtmToDate, định dạng mm/dd/yyyy. Tham số mã NV:
 *   strRewardUser. intRewardPositionID luôn = -1. Cookie phiên có sẵn là đủ để gọi API.
 * - Response là HTML <table> 2 tầng header. Script duyệt nguyên <tr>/<td> theo đúng
 *   thứ tự DOM, KHÔNG giãn colspan/rowspan — giống hệt cách trình duyệt tạo phần
 *   plain-text khi Ctrl+C cả bảng, nên ra y hệt lúc copy tay.
 * - Copy vào clipboard: không tự gọi ngay sau vòng lặp fetch dài (dễ bị trình duyệt
 *   âm thầm chặn vì "user gesture" gốc đã hết hạn) — luôn cần 1 cú click Copy riêng.
 *
 * BẢN 4.4 — TỰ BẬT "TRẢ GÓP" + "DT QUY ĐỔI" TRƯỚC KHI MỞ CẤP & COPY (trang BI mới):
 * - Yêu cầu user (2026-09-19): báo cáo "Doanh thu hợp nhất" trên baocao.dienmayxanh.com có ô check
 *   "Trả góp" và cặp nút "DT thực | DT quy đổi" quyết định cột nào có trong bảng. Dashboard YCX
 *   cần đủ cả 2 → mỗi lần bấm Click+, script tự bật 2 nút đó nếu đang tắt, RỒI mới quét dấu cộng.
 * - Nhận diện theo NHÃN nút (text node trực tiếp của <button>, bỏ qua span icon), không theo class
 *   Tailwind (đổi thường xuyên). Chỉ click khi CHẮC CHẮN đang tắt theo đúng HTML thật user gửi:
 *   "Trả góp" tắt = span đầu rỗng + viền xám border-slate-200; "DT quy đổi" tắt = nền trắng bg-white.
 *   Nghi ngờ thì bỏ qua — click nhầm nút đang bật sẽ TẮT nó đi, tệ hơn là không tự bật.
 * - Sau mỗi click: chờ vòng xoay + poll tới khi nút đổi trạng thái (tối đa 1.5s). Không đổi được
 *   thì báo "Không bật được" trong hộp trạng thái nhưng KHÔNG chặn việc mở cấp/copy.
 * - Quét ứng viên dấu cộng SAU khi bật toggle (bảng React có thể render lại toàn bộ dòng).
 * - Đồng bộ cùng logic sang Bookmarklet Auto Click+ trên Dashboard YCX.
 *
 * BẢN 4.3 — THANH LỌC 100% VĂN BẢN CLIPBOARD, LOẠI BỎ RÁC STATUS BOX & NÚT NỔI:
 * - Khắc phục triệt để lỗi dính chuỗi '⚡ Đang mở cấp hiện tại... Đã mở: 0 · Còn lại: 27 ⏹ Dừng lại' vào clipboard.
 * - Nguyên nhân: MutationObserver vô tình bắt các node con của hộp trạng thái lúc cập nhật innerHTML và đưa vào recoveryBlocks.
 * - Thêm hàm acpSanitizeText làm sạch tuyệt đối, loại bỏ mọi chuỗi text trạng thái của script khỏi bản copy.
 * - Đồng bộ với Bookmarklet Auto Click+ và CopyAll trên Dashboard YCX.
 *
 * BẢN 4.2 — ĐỒNG BỘ CƠ CHẾ COPY TOÀN TRANG (COPY ALL) GIỐNG HỆT BOOKMARKLET COPYALL:
 * - Khắc phục lỗi copy thiếu 37 chương trình thi đua: Bản 4.1 trước đó dùng document.querySelector('.ant-table, table')
 *   chỉ chọn đúng 1 bảng đầu tiên (Bảo hiểm tổng), khiến 37 chương trình còn lại phía sau bị bỏ sót.
 *   Nay đổi lại bôi đen toàn bộ document.body qua range.selectNodeContents(document.body) giống hệt
 *   bookmarklet CopyAll, đảm bảo copy trọn vẹn 100% tất cả 38 chương trình và chi tiết nhân viên.
 * - Loại trừ triệt để hộp trạng thái (#acp-status-box, #acp-float-btn) trong cả Range Selection và
 *   MutationObserver recoveryBlocks, ngăn chặn hoàn toàn việc dính chuỗi "⚡ Đang mở cấp hiện tại..." vào clipboard.
 *
 * BẢN 4.1 — KHẮC PHỤC TRIỆT ĐỂ LỖI TREO / ĐƠ Ở KHÚC CUỐI:
 * - Chuẩn hóa ACP_SPINNER_SELECTOR: loại bỏ các selector quá rộng (.ant-spin, .ant-table-loading, [class*="loading"])
 *   tránh hiểu nhầm phần tử bọc tĩnh của Ant Design (.ant-spin-nested-loading) là vòng xoay đang tải.
 * - Cải tiến acpIsSpinnerVisible: kiểm tra kích thước thật (rect.width > 0, rect.height > 0) và opacity, giới hạn maxWait 2.5s.
 * - Thay innerText bằng textContent trong MutationObserver để ngăn chặn 100% hiện tượng Layout Thrashing (ép trình duyệt tính reflow liên tục gây đơ UI).
 * - Tối ưu acpExtractVisibleText: ưu tiên lấy nội dung từ container bảng thay vì document.body, giảm 90% tải DOM khi copy.
 * - Bổ sung thông báo "⚡ Đang sao chép dữ liệu..." ngay khi click xong, cập nhật chính xác số lượng còn lại về 0, không còn kẹt ở khúc cuối.
 *
 * BẢN 4.0 — TỐI ƯU TỐC ĐỘ CLICK+ VƯỢT TRỘI (NHANH GẤP 5-7 LẦN):
 * - Tăng ACP_BATCH_SIZE từ 8 lên 25 nút mỗi lô, giảm số vòng lặp chờ đồng bộ.
 * - Giảm ACP_INTRA_BATCH_CLICK_DELAY từ 15ms xuống 2ms (click liên tục dứt khoát).
 * - Giảm ACP_CLICK_SETTLE_MS từ 50ms xuống 15ms và ACP_SPINNER_POLL_MS từ 60ms xuống 25ms.
 * - Giảm ACP_BATCH_PACING_DELAY từ 40ms xuống 10ms.
 * - Throttle cập nhật trạng thái DOM acpUpdateStatus (chỉ chạy mỗi 5 nút hoặc cuối lô) tránh nghẽn reflow.
 * - Tối ưu acpForceRenderAllRows cuộn trang mượt & nhanh hơn gấp 3 lần, giảm độ trễ trước khi copy.
 *
 * BẢN 3.9 — CẬP NHẬT TRANG BI MỚI (BAOCAO.DIENMAYXANH.COM):
 * - Bổ sung @match https://baocao.dienmayxanh.com/* để Tampermonkey nạp script trên trang báo cáo BI mới.
 * - Mở rộng cấu hình tên miền BI_HOSTNAMES hỗ trợ song song cả baocao.dienmayxanh.com và bi.thegioididong.com.
 * - Hiển thị và vận hành đầy đủ thanh công cụ nổi ⚡ Click+ trên hệ thống báo cáo mới của Điện Máy Xanh.
 *
 * BẢN 3.8 — CẬP NHẬT SELECTOR NÚT MỞ RỘNG DÒNG MỚI (ANT DESIGN TABLE):
 * - Hệ thống BI cập nhật cấu trúc bảng mới sử dụng Ant Design Table. Nút "+" mở rộng dòng có định dạng:
 *   `<button type="button" class="ant-table-row-expand-icon ant-table-row-expand-icon-collapsed" aria-label="Mở rộng dòng" aria-expanded="false"></button>`
 * - Bổ sung selector `ACP_ANT_CLOSED_SELECTOR` bao gồm:
 *   `button.ant-table-row-expand-icon-collapsed, .ant-table-row-expand-icon-collapsed, button.ant-table-row-expand-icon[aria-expanded="false"], button[aria-label="Mở rộng dòng"][aria-expanded="false"]`.
 * - Cập nhật `acpIsAlreadyOpened()` để nhận diện trạng thái đã mở của Ant Design (`.ant-table-row-expand-icon-expanded`, `aria-expanded="true"`).
 * - Bổ sung `.ant-table-loading`, `.ant-spin` vào bộ chờ spinner `ACP_SPINNER_SELECTOR`.
 *
 * BẢN 3.7 — SỬA LỖI KHÔNG CÓ DỮ LIỆU KHI CHẠY TỰ ĐỘNG DO SAI ĐỊNH DẠNG MÃ NV:
 * - Khi danh sách nhân viên từ Dashboard / Phân Tích có khuôn dạng "Mã NV - Tên NV" (ví dụ: 195025 - Nguyễn Thị Mỹ Linh),
 *   nếu tham số employeeId bị gửi lẫn họ tên tiếng Việt, API GetReward của MWG sẽ trả về rỗng vì không khớp mã NV.
 * - Sửa: Thêm lớp phòng vệ bóc tách mã số tự động (\d+) từ employeeId, originalName, hoặc displayName
 *   trong runBatch trước khi gọi fetchOne. Đảm bảo strRewardUser luôn luôn là mã số NV nguyên bản.
 *
 * BẢN 3.5 — ĐỒNG BỘ TOAST & BẢO ĐẢM TƯƠNG THÍCH VỚI BOOKMARKLET COPYALL:
 * - Tương thích hoàn toàn với bookmarklet CopyAll trên trang BI Thegioididong.
 * - Tối ưu hoá luồng thông báo tiến độ sao chép văn bản toàn trang.
 *
 * BẢN 3.6 — SỬA COPY BỊ SÓT DỮ LIỆU SAU KHI MỞ RỘNG & TĂNG TỐC ĐỘ CLICK+:
 * - User báo cáo thật: mở "+" chạy tốt, nhưng copy cuối cùng bị SÓT dữ liệu — tự kiểm chứng bằng
 *   1 bookmarklet "Copy All" độc lập (Selection/Range API) và xác nhận copy đủ, khác kết quả của
 *   acpExtractVisibleText() cũ (dùng document.body.innerText).
 * - Nguyên nhân: innerText tính theo layout ĐÃ RENDER — DevExpress DataGrid có scroll container
 *   riêng cho bảng (khác window scroll), dòng cấp con vừa mở rộng nằm ngoài khung nhìn của chính
 *   bảng lúc copy có thể bị innerText bỏ sót dù vẫn còn nguyên trong DOM.
 * - Sửa: acpExtractVisibleText() đổi sang bôi đen toàn bộ document.body qua Range rồi lấy
 *   Selection.toString() — đúng cách bookmarklet CopyAll của user đang dùng, phản ánh đúng nội
 *   dung thật có trong DOM, không phụ thuộc bảng đã cuộn tới đâu. Giữ innerText làm phương án dự
 *   phòng nếu Selection API lỗi. Vẫn dùng copyToClipboard() (ưu tiên GM_setClipboard, đáng tin cậy
 *   hơn navigator.clipboard.writeText của bookmarklet vì không bị giới hạn "user gesture"/quyền).
 * - User báo cáo thêm: tốc độ mở "+" rất chậm (196 nút còn lại). Cơ chế chống quá tải backend thật
 *   sự là acpWaitForSpinnersToClear() (chờ đúng vòng xoay #Loading của trang biến mất giữa các lô)
 *   — KHÔNG phải các độ trễ cố định. Tăng ACP_BATCH_SIZE 4→8, giảm ACP_INTRA_BATCH_CLICK_DELAY
 *   25→15ms và ACP_BATCH_PACING_DELAY 80→40ms; giữ nguyên spinner-wait (an toàn không đổi vì mỗi
 *   lô vẫn phải đợi trang xử lý xong thật mới click lô kế tiếp, không dồn request).
 *
 * BẢN 0.6 — UX CHO CHẾ ĐỘ TỰ ĐỘNG:
 * - Static asset công khai tại /scripts/..., có @updateURL/@downloadURL để tự cập nhật
 *   qua Tampermonkey sau này (không cần cài lại tay mỗi lần sửa script).
 * - Hộp thoại thiết kế lại: khi được Dashboard tự kích hoạt, ẩn hẳn khu vực nhập liệu
 *   (đã tự động), chỉ hiện tiến độ gọn (progress bar + đang lấy + vừa xong kèm Điểm
 *   thực lãnh) + nút Dừng lại. Khi tự bấm nút "⚡" trên trang thì vẫn như cũ (có ô nhập).
 * - Điểm thực lãnh của từng NV được parse ngay lúc chạy (dòng "Tổng cộng", cột thứ 9 —
 *   đúng cột `parseBonusBlock` bên Dashboard đang dùng làm "tong") và gửi kèm về
 *   Dashboard để hiện trong "Xem chi tiết" của toast kết quả.
 *
 * BẢN 0.7 — FEED TIẾN ĐỘ + POPUP HOÀN TẤT GỌN:
 * - Khu vực "Vừa xong" giờ là 1 feed trượt cao cố định (~5 dòng, dùng CSS transform
 *   translateY theo index + transition, không phình hộp thoại). Dòng lỗi KHÔNG vào
 *   feed trượt (tránh bài toán "lỗi bị đẩy mất" khi feed chỉ có 5 chỗ) — dồn vào 1 khu
 *   vực riêng luôn hiện "✗ N lỗi", bấm vào xem đủ danh sách, và tự mở ra khi chạy xong.
 * - Chạy xong KHÔNG hiện textarea dữ liệu thô mặc định nữa — thay bằng màn hình gọn
 *   (headline + phụ đề). Tự động: tự quay về Dashboard (đóng tab) như cũ. Chạy tay:
 *   tự copy clipboard + có nút "Copy lại" dự phòng (đề phòng lần copy tự động bị chặn
 *   âm thầm do "user gesture" đã hết hạn — xem ghi chú bản cũ) + link "Xem dữ liệu thô".
 *
 * BẢN 0.8 — BỎ NÚT NỔI TRÊN TRANG MWG:
 * - Chế độ Tự động bên Dashboard YCX (popup Hiện tại/Tháng/Năm/Khoảng thời gian) đã đủ
 *   dùng, không còn kịch bản người dùng tự bấm nút trên trang MWG nữa — bỏ hẳn nút nổi
 *   "⚡ Thu thập điểm thưởng" để đỡ rối trang. checkForAutoJob() vẫn chạy như cũ.
 *
 * BẢN 1.6 — SỬA AUTOCLICK+ (TRANG BI) MỞ THIẾU/TỰ ĐÓNG LẠI DỮ LIỆU:
 * - Bảng nhiều cấp lồng nhau (NNH → nhóm hàng → hãng): trước đây chỉ quét nút dấu-cộng
 *   MỘT LẦN rồi bấm hết, nên các nút dấu-cộng cấp con mới lộ ra sau khi mở cấp cha
 *   không bao giờ được bấm → thiếu dữ liệu dòng sâu nhất dù báo "Hoàn tất". Sửa: bấm
 *   nhiều lượt, mỗi lượt quét lại DOM để bắt nút mới lộ ra, dừng khi không còn nút nào.
 * - Một số bảng (vd BC theo nhân viên): icon dòng không đổi từ dấu-cộng sang dấu-trừ
 *   kịp lúc do tải dữ liệu bất đồng bộ → lượt quét sau bấm trùng lần 2 khiến dòng vừa
 *   mở tự đóng lại. Sửa: nhớ mọi hàng đã bấm trong một Set xuyên suốt các lượt, không
 *   bao giờ bấm lại một hàng bất kể icon hiển thị gì.
 * - Một số bảng khác còn không giữ nhiều dòng mở cùng lúc (mở dòng mới tự đóng dòng cũ)
 *   nên đọc DOM ở bước cuối vẫn có thể mất dữ liệu các dòng đã đóng lại. Sửa tận gốc:
 *   dùng MutationObserver chụp đúng phần nội dung mới lộ ra ngay sau TỪNG cú click và
 *   cộng dồn lại, thay vì chỉ đọc DOM một lần ở bước cuối cùng.
 *
 * BẢN 1.7 — TỐI ƯU TỐC ĐỘ AUTOCLICK+ (bảng vài nghìn nút bị chậm sau bản 1.6):
 * - Bản 1.6 chờ DOM ổn định (MutationObserver) riêng cho TỪNG cú click để không mất dữ liệu,
 *   nhưng với bảng lớn (vd ~2.262 nút dấu-cộng) thì chờ riêng lẻ từng nút cộng dồn lại thành
 *   rất chậm (có thể tới vài phút). Sửa: click theo LÔ (20 nút/lô), chỉ chờ DOM ổn định
 *   MỘT LẦN cho cả lô — MutationObserver vẫn bắt đủ mọi nội dung mới lộ ra do bất kỳ click
 *   nào trong lô gây ra nên không đánh đổi độ chính xác, chỉ giảm số lần chờ.
 *
 * BẢN 1.8 — SỬA COPY THIẾU DỮ LIỆU Ở BẢNG PHẲNG/RỘNG (không có nút dấu-cộng nào):
 * - Thêm `copyEverythingNatively()` bôi đen Range/Selection toàn bộ nội dung trang.
 *
 * BẢN 1.9 — SỬA TRIỆT ĐỂ LỖI "COPY ALL" THIẾU DỮ LIỆU (QUÉT IFRAME & PRESERVE TSV):
 * - Quét cả document chính lẫn tất cả `iframe` cùng nguồn (`getReadableDocuments()`).
 * - Chuyển đổi chuẩn xác từng `<table>` trong các document thành định dạng TSV (\t và \n).
 *
 * BẢN 2.0 — TỐI ƯU TỐC ĐỘ CLICK (PACING) & TỰ ĐỘNG CHỜ SPINNER TẢI DỮ LIỆU:
 * - Giảm kích thước lô từ 20 xuống 6 nút/lô, thêm micro-delay 35ms giữa các cú click.
 * - Thêm cơ chế tự động chờ tất cả loading spinners (`waitForSpinnersToClear`) biến mất.
 *
 * BẢN 2.1 — ĐỔI TÊN NÚT THÀNH "CLICK+" & HIỆN ĐẠI HOÁ UI + SIẾT BẬC CHỜ SPINNER:
 * - Đổi tên nút thành `⚡ Click+` / `📋 Copy Click+`.
 * - Thiết kế giao diện nút nổi hiện đại sang trọng (gradient, glassmorphism, hiệu ứng nhún mượt mà).
 *
 * BẢN 2.2 — TỰ ĐỘNG MỞ RỘNG TẤT CẢ CÁC CẤP TRONG 1 LẦN CLICK DUY NHẤT:
 * - Tự động chờ spinner cấp con và mở liên hoàn Cấp 1 -> Cấp 2 -> Cấp 3.
 *
 * BẢN 2.3 — MỖI LẦN CLICK "CLICK+" CHỈ MỞ ĐÚNG 1 CẤP (+):
 * - Đặt ACP_MAX_ROUNDS = 1: Mỗi lần nhấn nút Click+, script chỉ mở toàn bộ các nút dấu cộng của cấp hiện tại,
 *   tự động chờ spinner tải 100% dữ liệu cấp đó rồi copy và kết thúc. Nhường quyền kiểm soát từng cấp cho người dùng.
 *
 * BẢN 2.4 — TỰ ĐỘNG COPY ALL TOÀN BỘ DỮ LIỆU SAU MỖI LẦN MỞ 1 CẤP:
 * - Thực thi tự động Copy All ngay sau khi hoàn tất mở 1 cấp và chờ spinner tải xong 100%.
 *
 * BẢN 2.5 — XỬ LÝ TRIỆT ĐỂ LỖI COPY TRÙNG LẶP & DỮ LIỆU RÁC "UNDEFINED":
 * - Lọc bỏ các phần tử rác DevExpress (.dx-datagrid-content-fixed, .dx-hidden) và dòng rác 'undefined'.
 *
 * BẢN 2.6 — TỰ ĐỘNG CẬP NHẬT NHÃN NÚT KHI CHUYỂN TAB & CHỐNG TỰ THU GỌN LẠI:
 * - Thêm bộ quét định kỳ 1s tự động đổi nhãn nút nổi thành `⚡ Click+` ngay khi chuyển tab có nút dấu cộng mới.
 * - Bổ sung đầy đủ selector cho DevExpress DataGrid (.dx-datagrid-group-closed, td.dx-command-expand).
 * - Siết chặt isPlusButton(): Kiểm tra trạng thái đã mở của thẻ cha (tr/td), tuyệt đối không click lại hàng đã mở (chống thu gọn).
 *
 * BẢN 2.7 — TÍCH HỢP DATASET TAGGING TỪ BOOKMARKLET & BẢO TOÀN DỮ LIỆU MỞ NHIỀU CẤP:
 * - Đánh dấu HTML dataset `el.dataset.clickPlusDone = '1'` ngay khi click nút/hàng (từ thuật toán Bookmarklet).
 * - Thêm `isAlreadyOpened(el)` kiểm tra các cờ DOM đa dạng (`aria-expanded="true"`, `data-state="open"`, `.fa-minus`).
 * - Bảo toàn 100% dữ liệu qua kết hợp `accumulatedChunks` (MutationObserver) + `GM_setClipboard(finalText)`.
 *
 * BẢN 3.0 — XOÁ BỎ HOÀN TOÀN TÍNH NĂNG CLICK+ (AUTOCLICK+):
 * - Xoá bỏ toàn bộ khối mã nguồn initBiPage(), nút nổi Click+ và các chức năng tự động mở dấu cộng/copy trang BI theo yêu cầu.
 *
 * BẢN 3.1 — LÀM LẠI CLICK+ TRÊN TAMPERMONKEY (nút nổi, chạy trên https://bi.thegioididong.com/*):
 * - Làm lại từ đầu (không phục hồi nguyên xi mã cũ đã xoá ở bản 3.0), giữ lại các bài học
 *   đã đúc kết qua các bản 1.6-2.7 ở trên: đánh dấu dataset trên phần tử đã click để
 *   không bao giờ click lại (tránh vô tình đóng dòng vừa mở), click theo lô kèm
 *   micro-delay + chờ spinner tải dữ liệu biến mất, MutationObserver ghi lại nội dung
 *   mọi phần tử mới thêm vào DOM để bù dữ liệu nếu sau đó bị tự thu gọn/gỡ khỏi DOM,
 *   loại vùng nhân bản cột cố định DevExpress (.dx-datagrid-content-fixed/.dx-hidden)
 *   và dòng rác "undefined" khỏi văn bản copy, copy qua copyToClipboard() dùng chung.
 * - Theo yêu cầu: mỗi lần bấm nút chỉ mở ĐÚNG 1 CẤP (không tự động mở liên hoàn nhiều
 *   cấp như bản 2.2) — người dùng chủ động bấm lại nút để mở tiếp cấp con.
 * - Có CHỦ ĐÍCH bỏ bớt so với bản cũ: không quét iframe cùng nguồn (getReadableDocuments
 *   của bản 1.9) — nếu về sau phát hiện báo cáo cụ thể nhúng iframe và bị thiếu dữ liệu,
 *   cần bổ sung lại phần này.
 *
 * BẢN 3.2 — SỬA TRANG BỊ ĐƠ/XOAY LIÊN TỤC DO CLICK QUÁ NHANH (click theo lô 6 nút/35ms):
 * - Người dùng báo thật: trên báo cáo lớn (465 nút), bản 3.1 làm trang bị đơ, vòng xoay
 *   quay liên tục, và xuất hiện alert lỗi "Đã xảy ra lỗi! Vui lòng đăng xuất, và đăng nhập
 *   lại!" — do click dồn dập theo lô (6 nút liên tiếp chỉ nghỉ 35ms) làm quá tải backend/
 *   phiên đăng nhập của trang BI (AngularJS, ng-app="BIreportApp").
 * - Đổi hẳn sang click TUẦN TỰ TỪNG NÚT MỘT: click 1 nút -> chờ đúng vòng xoay tải dữ
 *   liệu thật của trang biến mất -> nghỉ thêm 1 chút -> mới click nút kế tiếp. Không còn
 *   click theo lô (bỏ ACP_BATCH_SIZE).
 * - Người dùng tự mở DevTools xác nhận vòng xoay THẬT của trang là
 *   `<div id="Loading" class="overload-wait">` (overlay cố định toàn màn hình, do
 *   AngularJS $http interceptor bật/tắt) — thêm `#Loading`/`.overload-wait` vào đầu
 *   ACP_SPINNER_SELECTOR, ưu tiên hơn các lớp suy đoán cũ.
 * - PHÁT HIỆN BUG: hàm kiểm tra hiển thị cũ dùng `el.offsetParent !== null`, nhưng theo
 *   spec, offsetParent LUÔN LÀ null với phần tử `position:fixed` — bất kể phần tử đó có
 *   đang hiển thị hay không. Vòng xoay thật `#Loading` chính là `position:fixed`, nên nếu
 *   chỉ thêm selector mà không sửa hàm kiểm tra thì script vẫn không bao giờ "thấy" được
 *   vòng xoay đang quay, chờ-spinner coi như vô tác dụng. Thêm `acpIsSpinnerVisible()`
 *   dùng `getComputedStyle` + `getBoundingClientRect` để kiểm tra đúng cho cả phần tử
 *   `position:fixed`.
 * - Thêm nút "⏹ Dừng lại" ngay trong hộp trạng thái — vì chạy tuần tự từng nút sẽ chậm
 *   hơn hẳn so với chạy theo lô, báo cáo nhiều nút (vd 465) có thể mất khá lâu, cần cho
 *   người dùng chủ động dừng giữa chừng mà vẫn giữ + copy được phần dữ liệu đã mở.
 *
 * BẢN 3.3 — TĂNG TỐC LẠI: CLICK THEO LÔ NHỎ (đã sửa xong bug offsetParent ở bản 3.2):
 * - Người dùng báo bản 3.2 (từng-nút-một) chạy quá chậm. Nhận ra nguyên nhân THẬT khiến
 *   bản 3.1 bị quá tải KHÔNG PHẢI do bản thân việc click theo lô, mà do bug offsetParent
 *   (xem bản 3.2) làm chờ-spinner hoàn toàn vô tác dụng — tức bản 3.1 thực chất KHÔNG hề
 *   chờ gì cả giữa các lô, cứ thế click dồn dập liên tục.
 * - Giờ bug đã sửa (chờ-spinner hoạt động đúng), quay lại click theo LÔ NHỎ (4 nút/lô,
 *   có nghỉ nhẹ 25ms giữa từng cú click trong lô) rồi mới chờ đúng vòng xoay #Loading thật
 *   biến mất 1 lần cho cả lô — vẫn đảm bảo không dồn request khi trang chưa xử lý xong,
 *   nhưng nhanh hơn hẳn so với chờ riêng lẻ từng nút một của bản 3.2.
 * - Giữ nguyên toàn bộ phần an toàn khác của bản 3.2: vòng xoay #Loading/.overload-wait
 *   xác nhận thật, hàm kiểm tra hiển thị đúng cho position:fixed, nút "⏹ Dừng lại".
 *
 * BẢN 3.4 — SỬA CLICK+ VÔ TÌNH BẤM MỞ CẢ DROPDOWN/BỘ LỌC NGOÀI BẢNG:
 * - User báo cáo thật + đối chiếu 2 bản copy (Click+ tự copy vs copy tay): dữ liệu BẢNG
 *   giống hệt nhau, nhưng bản Click+ có thêm rất nhiều dòng thừa không liên quan — toàn
 *   bộ danh sách vùng, toàn bộ 11 tháng của bộ lọc kỳ báo cáo, các lựa chọn khác của bộ
 *   lọc "Doanh thu theo"... trong khi copy tay (dropdown vẫn đóng) không có các dòng này.
 * - Nguyên nhân: ACP_FA_PLUS_SELECTOR = '.fa-plus' quét TOÀN TRANG (document.querySelectorAll),
 *   không giới hạn — khớp luôn icon "+" của các dropdown/bộ lọc khác dùng chung class
 *   FontAwesome đó, không riêng gì nút mở-rộng-dòng lồng nhau trong bảng dữ liệu. Click+
 *   bấm luôn các dropdown này, làm chúng bung ra và nội dung lọt vào văn bản copy cuối.
 * - Sửa: acpGetPlusCandidates() lọc thêm `el.closest('table')` cho tập hợp từ
 *   ACP_FA_PLUS_SELECTOR — nút mở-rộng-dòng thật luôn nằm trong 1 <table>, các dropdown/
 *   bộ lọc điều hướng thì không. Không đụng tới ACP_DX_CLOSED_SELECTOR (DevExpress) vì
 *   selector đó vốn đã đủ đặc thù, chưa thấy bằng chứng bị lẫn tương tự.
 *
 *
 * CHƯA KIỂM CHỨNG THẬT (cần test tay trước khi tin tưởng hoàn toàn):
 * - GM storage dùng chung xuyên 2 domain cho cùng 1 script; GM_addValueChangeListener
 *   bắn tin xuyên tab; window.close() tự động trên tab do window.open() mở.
 * - @updateURL/@downloadURL thực sự khiến Tampermonkey tự cập nhật (chỉ có tác dụng
 *   với các lượt cài MỚI từ bản 0.6 trở đi — bản đã cài trước đó phải cập nhật tay 1
 *   lần cuối để có 2 dòng này).
 * - Copy tự động ngay khi chạy tay vừa xong (bản 0.7) có thực sự ăn trên trình duyệt
 *   thật hay không — nút "Copy lại" là lối thoát dự phòng nếu không.
 */

(function () {
  'use strict';

  // ====== CẤU HÌNH CHUNG ======
  const STORAGE_KEY_LIST = 'mwg_thuthap_employee_list';
  const API_URL = 'https://newinsite.thegioididong.com/office/RewardPoint/RewardPoint/GetReward';
  const MWG_URL = 'https://newinsite.thegioididong.com/office/thuong-nhan-vien';
  const MWG_HOSTNAME = 'newinsite.thegioididong.com';
  const DELAY_MS = 700; // nghỉ giữa các lượt gọi API, tránh bị chặn

  // Màu nhấn đồng bộ với Dashboard YCX (thang màu sky).
  const COLOR_PRIMARY = '#0284c7';
  const COLOR_PRIMARY_LIGHT = '#0ea5e9';
  const COLOR_PRIMARY_BG = '#f0f9ff';
  const COLOR_SUCCESS = '#059669';
  const COLOR_DANGER = '#e11d48';

  // ====== CẤU HÌNH CẦU NỐI (bridge) VỚI DASHBOARD ======
  const BRIDGE_SOURCE = 'ycx-bonus-bridge';
  const EVT_PING = 'ycx-bonus-bridge:ping';
  const EVT_PONG = 'ycx-bonus-bridge:pong';
  const EVT_START_JOB = 'ycx-bonus-bridge:start-job';
  const EVT_PROGRESS = 'ycx-bonus-bridge:progress';
  const EVT_JOB_DONE = 'ycx-bonus-bridge:job-done';
  const EVT_JOB_ERROR = 'ycx-bonus-bridge:job-error';
  const GM_KEY_META = 'mwg_ycx_bridge_meta';
  const GM_KEY_RESULT = 'mwg_ycx_bridge_result';
  const JOB_TTL_MS = 15 * 60 * 1000;
  const SCRIPT_VERSION = '4.0';

  // Feed "Vừa xong": cao cố định FEED_MAX_ROWS dòng, dòng mới trượt vào từ trên.
  const FEED_ROW_HEIGHT = 21;
  const FEED_MAX_ROWS = 5;

  // ====== TIỆN ÍCH CHUNG ======
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const pad2 = (n) => String(n).padStart(2, '0');

  function toDDMMYYYY(date) {
    return `${pad2(date.getDate())}/${pad2(date.getMonth() + 1)}/${date.getFullYear()}`;
  }

  function getDefaultDateRange() {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from: toDDMMYYYY(from), to: toDDMMYYYY(now) };
  }

  // API xác nhận cần dtmFromDate/dtmToDate dạng mm/dd/yyyy — quy đổi 1 chiều từ ô nhập dd/mm/yyyy.
  function ddmmyyyyToApiFormat(value) {
    const m = String(value).trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!m) {
      throw new Error(`Ngày "${value}" không đúng định dạng dd/mm/yyyy`);
    }
    const [, dd, mm, yyyy] = m;
    return `${pad2(mm)}/${pad2(dd)}/${yyyy}`;
  }

  // ====== LƯU / ĐỌC DANH SÁCH MÃ NV ======
  function loadSavedList() {
    try {
      return localStorage.getItem(STORAGE_KEY_LIST) || '';
    } catch (e) {
      return '';
    }
  }

  function saveList(text) {
    try {
      localStorage.setItem(STORAGE_KEY_LIST, text);
    } catch (e) {
      // bỏ qua nếu trình duyệt chặn localStorage
    }
  }

  // Mỗi dòng có thể là "274487" hoặc "U274487 - Lý Anh Bảo - BP A..." — chỉ lấy phần số.
  function parseEmployeeIds(text) {
    return text
      .split(/\r?\n/)
      .map((line) => {
        const trimmed = line.trim();
        if (!trimmed) return '';
        const match = trimmed.match(/\d+/);
        return match ? match[0] : trimmed;
      })
      .filter(Boolean);
  }

  // ====== GỌI API CHO 1 NHÂN VIÊN (fromDate/toDate phải đã ở dạng mm/dd/yyyy) ======
  async function fetchOne(empId, fromDate, toDate, maxRetries = 2) {
    const params = new URLSearchParams({
      dtmFromDate: fromDate,
      dtmToDate: toDate,
      intRewardPositionID: '-1',
      strRewardUser: empId,
    });

    let attempt = 0;
    while (true) {
      attempt++;
      try {
        const res = await fetch(`${API_URL}?${params.toString()}`, {
          method: 'GET',
          credentials: 'include',
          headers: {
            accept: 'application/json, text/plain, */*',
            'x-requested-with': 'XMLHttpRequest',
          },
        });

        if (res.status === 401 || res.status === 403) {
          throw new Error('Hết phiên đăng nhập hoặc không có quyền — mở lại trang, đăng nhập rồi thử lại');
        }
        if (!res.ok) {
          if (attempt <= maxRetries && res.status >= 500) {
            await sleep(1200);
            continue;
          }
          throw new Error(`Server trả lỗi HTTP ${res.status}`);
        }

        const raw = await res.text();
        return convertResponseToTSV(raw);
      } catch (err) {
        const isAuthError = err && err.message && err.message.includes('Hết phiên đăng nhập');
        if (!isAuthError && attempt <= maxRetries) {
          await sleep(1200);
          continue;
        }
        throw err;
      }
    }
  }

  // ====== CHUYỂN DỮ LIỆU TRẢ VỀ THÀNH TSV ======
  function convertResponseToTSV(raw) {
    const trimmed = (raw || '').trim();
    if (!trimmed) return '(không có dữ liệu trả về)';

    if (trimmed[0] === '<') {
      return htmlToTSV(trimmed);
    }

    if (trimmed[0] === '{' || trimmed[0] === '[') {
      try {
        return jsonToTSV(JSON.parse(trimmed));
      } catch (e) {
        // không parse được JSON -> rơi xuống nhánh text thô bên dưới
      }
    }

    return trimmed; // đã là text/TSV/CSV sẵn -> giữ nguyên
  }

  const ARRAY_WRAPPER_KEYS = [
    'Data', 'data', 'ListData', 'listData', 'Result', 'result',
    'Items', 'items', 'Table', 'table', 'Rows', 'rows', 'List', 'lst',
  ];

  function findArrayInObject(obj, depth) {
    if (Array.isArray(obj)) return obj;
    if (!obj || typeof obj !== 'object' || depth > 2) return null;
    for (const key of ARRAY_WRAPPER_KEYS) {
      if (Array.isArray(obj[key])) return obj[key];
    }
    for (const key of Object.keys(obj)) {
      const found = findArrayInObject(obj[key], depth + 1);
      if (found) return found;
    }
    return null;
  }

  function formatCell(v) {
    if (v === null || v === undefined) return '';
    if (typeof v === 'object') return JSON.stringify(v);
    return String(v).replace(/[\t\n\r]+/g, ' ').trim();
  }

  function jsonToTSV(json) {
    const rows = findArrayInObject(json, 0);
    if (!rows) {
      return 'KHÔNG_NHẬN_DIỆN_ĐƯỢC_CẤU_TRÚC_JSON\n' + JSON.stringify(json);
    }
    if (rows.length === 0) return '(không có dữ liệu)';
    if (typeof rows[0] !== 'object' || rows[0] === null) {
      return rows.map(formatCell).join('\n');
    }
    const headers = Object.keys(rows[0]);
    const lines = [headers.join('\t')];
    for (const row of rows) {
      lines.push(headers.map((h) => formatCell(row[h])).join('\t'));
    }
    return lines.join('\n');
  }

  // Duyệt nguyên <tr>/<td> theo đúng thứ tự DOM, KHÔNG giãn colspan/rowspan — đúng hệt
  // cách trình duyệt tạo phần plain-text khi Ctrl+C cả bảng.
  function htmlToTSV(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const table = doc.querySelector('table');
    if (!table) {
      return 'KHÔNG_TÌM_THẤY_THẺ_TABLE_TRONG_HTML_TRẢ_VỀ\n' + html.slice(0, 800);
    }
    return [...table.querySelectorAll('tr')]
      .map((tr) =>
        [...tr.querySelectorAll('th,td')]
          .map((c) => c.textContent.trim().replace(/[\t\n\r]+/g, ' '))
          .join('\t')
      )
      .join('\n');
  }

  // Điểm thực lãnh = cột thứ 9 (index 8) của dòng "Tổng cộng" — đúng cột mà
  // parseBonusBlock bên Dashboard dùng làm "tong". null nếu NV không có dữ liệu kỳ này.
  function extractDiemThucLanh(tsv) {
    if (!tsv) return null;
    const totalLine = tsv.split('\n').find((l) => l.startsWith('Tổng cộng'));
    if (!totalLine) return null;
    const raw = totalLine.split('\t')[8];
    if (raw === undefined) return null;
    const cleaned = String(raw).replace(/[^\d-]/g, '');
    if (!cleaned) return null;
    const n = parseInt(cleaned, 10);
    return Number.isNaN(n) ? null : n;
  }

  function formatViNumber(n) {
    try {
      return n.toLocaleString('vi-VN');
    } catch (e) {
      return String(n);
    }
  }

  // ====== FEED "VỪA XONG" (trượt, cao cố định) + KHU VỰC LỖI (ghim riêng) ======
  // Mỗi dòng đặt position:absolute, dời vị trí bằng translateY(index*rowHeight) — đổi
  // index của dòng cũ sẽ tự animate nhờ transition đã khai báo sẵn trên style, không
  // cần đo getBoundingClientRect. Dòng thứ FEED_MAX_ROWS trở đi mờ dần rồi bị gỡ khỏi DOM.
  function pushFeedRow(feedEl, html) {
    const existing = Array.from(feedEl.children);

    const row = document.createElement('div');
    row.innerHTML = html;
    Object.assign(row.style, {
      position: 'absolute', left: '0', right: '0', top: '0',
      height: `${FEED_ROW_HEIGHT}px`, lineHeight: `${FEED_ROW_HEIGHT}px`,
      overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
      fontSize: '12.5px', fontWeight: '600',
      transform: 'translateY(-8px)', opacity: '0',
      transition: 'transform .28s ease, opacity .28s ease',
    });
    row.dataset.feedIndex = '0';
    feedEl.appendChild(row);
    void row.offsetHeight; // ép reflow để "chốt" trạng thái ban đầu trước khi đổi sang đích, nếu không transition sẽ nhảy thẳng không animate
    row.style.transform = 'translateY(0)';
    row.style.opacity = '1';

    existing.forEach((el) => {
      const newIdx = parseInt(el.dataset.feedIndex || '0', 10) + 1;
      el.dataset.feedIndex = String(newIdx);
      el.style.transform = `translateY(${newIdx * FEED_ROW_HEIGHT}px)`;
      if (newIdx >= FEED_MAX_ROWS) {
        el.style.opacity = '0';
        setTimeout(() => el.remove(), 300);
      }
    });
  }

  // Dòng lỗi KHÔNG vào feed trượt (feed chỉ có FEED_MAX_ROWS chỗ, dễ bị đẩy mất) — dồn
  // vào 1 khu vực riêng luôn hiện số lượng, bấm vào xem đủ danh sách, và được lệnh gọi
  // ở cuối phiên chạy tự mở ra để người dùng thấy ngay không cần bấm.
  function pushErrorRow(els, errorLog, who, reason) {
    errorLog.push({ who, reason });
    els.errorArea.style.display = 'block';
    els.errorBadge.textContent = `✗ ${errorLog.length} lỗi`;
    const row = document.createElement('div');
    row.style.cssText = `padding:2px 0;color:${COLOR_DANGER};`;
    row.textContent = `✗ ${who} — ${reason}`;
    els.errorList.insertBefore(row, els.errorList.firstChild);
  }

  // ====== COPY VÀO CLIPBOARD (ưu tiên GM_setClipboard, dự phòng Clipboard API) ======
  function copyToClipboard(text) {
    try {
      GM_setClipboard(text);
    } catch (e) {
      navigator.clipboard.writeText(text).catch(() => {
        console.warn('[MWG thu thập] Không copy tự động được, dữ liệu:', text);
      });
    }
  }

  // Gọi GM_getValue/GM_setValue qua Promise.resolve(...) để chạy đúng cả khi API
  // trả về đồng bộ (Tampermonkey kiểu cũ) lẫn khi trả về Promise (GM.* kiểu mới).
  const gmGet = (key, def) => Promise.resolve(GM_getValue(key, def));
  const gmSet = (key, value) => Promise.resolve(GM_setValue(key, value));

  // ====== CHẠY HÀNG LOẠT — DÙNG CHUNG CHO BẤM TAY LẪN TỰ ĐỘNG KÍCH HOẠT ======
  // employees: [{ employeeId, originalName, displayName }].
  async function runBatch(employees, fromDateApi, toDateApi, { onStart, onItemDone, shouldStop } = {}) {
    const blocks = [];
    const errors = [];
    const results = [];
    let stoppedEarly = false;

    for (let i = 0; i < employees.length; i++) {
      if (shouldStop && shouldStop()) { stoppedEarly = true; break; }
      const { employeeId, originalName, displayName } = employees[i];

      // Phòng vệ kép: bóc tách chuỗi số nguyên thuần tuý làm mã NV trước khi gọi API
      let cleanEmpId = String(employeeId || '').trim();
      if (!/^\d+$/.test(cleanEmpId)) {
        const match = cleanEmpId.match(/\d+/)
          || String(originalName || '').match(/\d+/)
          || String(displayName || '').match(/\d+/);
        if (match) cleanEmpId = match[0];
      }

      if (onStart) onStart(i, employees.length, cleanEmpId, displayName);
      try {
        if (!cleanEmpId) {
          throw new Error('Không tìm thấy mã số nhân viên để truy vấn');
        }
        const tsv = await fetchOne(cleanEmpId, fromDateApi, toDateApi);
        const diemThucLanh = extractDiemThucLanh(tsv);
        blocks.push(`===${cleanEmpId}===\n${tsv}`);
        results.push({ employeeId: cleanEmpId, originalName, status: 'ok', tsv, diemThucLanh });
        if (onItemDone) onItemDone(i, employees.length, cleanEmpId, displayName, { status: 'ok', diemThucLanh });
      } catch (e) {
        const msg = (e && e.message) || String(e);
        const targetId = cleanEmpId || employeeId;
        blocks.push(`===${targetId}===\nLỖI: ${msg}`);
        errors.push(`${targetId}: ${msg}`);
        results.push({ employeeId: targetId, originalName, status: 'error', error: msg });
        if (onItemDone) onItemDone(i, employees.length, targetId, displayName, { status: 'error', error: msg });
      }
      if (i < employees.length - 1) {
        if (shouldStop && shouldStop()) { stoppedEarly = true; break; }
        await sleep(DELAY_MS);
      }
    }

    return { blocks, errors, results, stoppedEarly };
  }

  // ====== HỘP THOẠI (chỉ trên trang MWG) ======
  // autoMode=true: ẩn hẳn khu vực nhập liệu (Dashboard đã tự điền/tự chạy).
  // autoMode=false (mặc định, bấm tay nút ⚡): hiện đầy đủ như trước.
  function buildModal(autoMode) {
    const overlay = document.createElement('div');
    overlay.id = 'mwg-thuthap-overlay';
    Object.assign(overlay.style, {
      position: 'fixed', inset: '0', background: 'rgba(15,23,42,.55)',
      zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center',
    });

    const box = document.createElement('div');
    Object.assign(box.style, {
      background: '#fff', borderRadius: '20px', padding: '24px',
      width: '520px', maxWidth: '92vw', maxHeight: '88vh', overflow: 'auto',
      boxShadow: '0 20px 60px rgba(15,23,42,.25)',
      fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif',
      fontSize: '14px', color: '#1e293b',
    });

    box.innerHTML = `
      <h3 style="margin:0 0 16px;font-size:17px;font-weight:800;letter-spacing:-.01em;">⚡ Tự động lấy điểm thưởng nhân viên</h3>

      <div id="mwg-setup-section">
        <label style="display:block;font-weight:600;margin-bottom:4px;font-size:13px;">Danh sách mã NV (mỗi dòng 1 mã)</label>
        <textarea id="mwg-emp-list" rows="8" style="width:100%;box-sizing:border-box;font-family:monospace;font-size:13px;padding:10px;border:1px solid #e2e8f0;border-radius:12px;"></textarea>
        <div style="display:flex;gap:10px;margin-top:10px;">
          <div style="flex:1;">
            <label style="display:block;font-weight:600;margin-bottom:4px;font-size:13px;">Từ ngày (dd/mm/yyyy)</label>
            <input id="mwg-date-from" type="text" style="width:100%;box-sizing:border-box;padding:8px 10px;border:1px solid #e2e8f0;border-radius:12px;">
          </div>
          <div style="flex:1;">
            <label style="display:block;font-weight:600;margin-bottom:4px;font-size:13px;">Đến ngày (dd/mm/yyyy)</label>
            <input id="mwg-date-to" type="text" style="width:100%;box-sizing:border-box;padding:8px 10px;border:1px solid #e2e8f0;border-radius:12px;">
          </div>
        </div>
      </div>

      <div id="mwg-running-section" style="display:none;">
        <p style="margin:0 0 10px;font-size:13px;color:#64748b;">
          Kỳ: <span id="mwg-range-text" style="font-weight:700;color:#334155;"></span> ·
          <span id="mwg-emp-count-toggle" style="cursor:pointer;font-weight:700;color:${COLOR_PRIMARY};border-bottom:1px dashed ${COLOR_PRIMARY};">0 nhân viên</span>
        </p>
        <div id="mwg-emp-readonly-wrap" style="display:none;margin-bottom:10px;">
          <textarea id="mwg-emp-readonly" readonly rows="4" style="width:100%;box-sizing:border-box;font-family:monospace;font-size:11px;padding:8px;border:1px solid #e2e8f0;border-radius:10px;background:${COLOR_PRIMARY_BG};color:#64748b;"></textarea>
        </div>

        <div style="height:8px;background:#e0f2fe;border-radius:999px;overflow:hidden;">
          <div id="mwg-progress-fill" style="height:100%;width:0%;background:linear-gradient(90deg,${COLOR_PRIMARY_LIGHT},${COLOR_PRIMARY});border-radius:999px;transition:width .3s ease;"></div>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:baseline;margin-top:8px;">
          <span id="mwg-progress-counter" style="font-size:22px;font-weight:800;color:${COLOR_PRIMARY};letter-spacing:-.02em;"></span>
          <span id="mwg-current-emp" style="font-size:13px;font-weight:700;color:#334155;text-align:right;"></span>
        </div>

        <div id="mwg-feed" style="position:relative;height:${FEED_ROW_HEIGHT * FEED_MAX_ROWS}px;overflow:hidden;margin-top:8px;"></div>

        <div style="text-align:right;margin-top:10px;">
          <button id="mwg-btn-stop" type="button" style="padding:7px 16px;border-radius:999px;border:1px solid #fecdd3;background:#fff1f2;color:${COLOR_DANGER};font-weight:700;font-size:12px;cursor:pointer;">Dừng lại</button>
        </div>
      </div>

      <div id="mwg-error-area" style="display:none;margin-top:10px;">
        <div style="display:flex;justify-content:flex-end;">
          <span id="mwg-error-badge" style="cursor:pointer;font-size:11px;font-weight:800;color:${COLOR_DANGER};background:#fff1f2;border:1px solid #fecdd3;border-radius:999px;padding:2px 10px;">✗ 0 lỗi</span>
        </div>
        <div id="mwg-error-list" style="display:none;margin-top:6px;max-height:120px;overflow-y:auto;border:1px solid #fecdd3;border-radius:10px;padding:6px 10px;background:#fff1f2;font-size:12px;"></div>
      </div>

      <p id="mwg-status-text" style="min-height:0;margin:0;font-size:13px;color:#475569;white-space:pre-wrap;"></p>

      <div id="mwg-done-section" style="display:none;margin-top:14px;">
        <p id="mwg-done-headline" style="margin:0 0 4px;font-size:14px;font-weight:800;color:#1e293b;"></p>
        <p id="mwg-done-sub" style="margin:0;font-size:12.5px;color:#64748b;"></p>

        <div id="mwg-done-manual-actions" style="display:none;margin-top:10px;">
          <a id="mwg-toggle-raw" href="#" style="font-size:11px;color:#94a3b8;text-decoration:underline;">Xem dữ liệu thô</a>
          <div id="mwg-raw-wrap" style="display:none;margin-top:8px;">
            <textarea id="mwg-result" rows="6" readonly style="width:100%;box-sizing:border-box;font-family:monospace;font-size:12px;padding:8px;border:1px solid #e2e8f0;border-radius:10px;background:#f8fafc;"></textarea>
          </div>
        </div>
      </div>

      <div id="mwg-footer" style="display:flex;justify-content:flex-end;gap:8px;margin-top:14px;">
        <button id="mwg-btn-copy-again" type="button" style="display:none;padding:9px 16px;border-radius:12px;border:1px solid #e2e8f0;background:#fff;cursor:pointer;font-weight:600;">📋 Copy lại</button>
        <button id="mwg-btn-close" style="padding:9px 16px;border-radius:12px;border:1px solid #e2e8f0;background:#fff;cursor:pointer;font-weight:600;">Đóng</button>
        <button id="mwg-btn-start" style="padding:9px 18px;border-radius:12px;border:none;background:${COLOR_PRIMARY};color:#fff;font-weight:700;cursor:pointer;">Bắt đầu</button>
      </div>
    `;

    overlay.appendChild(box);
    document.body.appendChild(overlay);

    const els = {
      setupSection: box.querySelector('#mwg-setup-section'),
      textarea: box.querySelector('#mwg-emp-list'),
      dateFrom: box.querySelector('#mwg-date-from'),
      dateTo: box.querySelector('#mwg-date-to'),
      runningSection: box.querySelector('#mwg-running-section'),
      rangeText: box.querySelector('#mwg-range-text'),
      empCountToggle: box.querySelector('#mwg-emp-count-toggle'),
      empReadonlyWrap: box.querySelector('#mwg-emp-readonly-wrap'),
      empReadonly: box.querySelector('#mwg-emp-readonly'),
      progressFill: box.querySelector('#mwg-progress-fill'),
      progressCounter: box.querySelector('#mwg-progress-counter'),
      currentEmp: box.querySelector('#mwg-current-emp'),
      feed: box.querySelector('#mwg-feed'),
      btnStop: box.querySelector('#mwg-btn-stop'),
      errorArea: box.querySelector('#mwg-error-area'),
      errorBadge: box.querySelector('#mwg-error-badge'),
      errorList: box.querySelector('#mwg-error-list'),
      statusText: box.querySelector('#mwg-status-text'),
      doneSection: box.querySelector('#mwg-done-section'),
      doneHeadline: box.querySelector('#mwg-done-headline'),
      doneSub: box.querySelector('#mwg-done-sub'),
      doneManualActions: box.querySelector('#mwg-done-manual-actions'),
      toggleRawLink: box.querySelector('#mwg-toggle-raw'),
      rawWrap: box.querySelector('#mwg-raw-wrap'),
      resultTextarea: box.querySelector('#mwg-result'),
      btnCopyAgain: box.querySelector('#mwg-btn-copy-again'),
      footer: box.querySelector('#mwg-footer'),
      btnStart: box.querySelector('#mwg-btn-start'),
      btnClose: box.querySelector('#mwg-btn-close'),
    };

    els.textarea.value = loadSavedList();

    const defaultDates = getDefaultDateRange();
    els.dateFrom.value = defaultDates.from;
    els.dateTo.value = defaultDates.to;

    if (autoMode) {
      els.setupSection.style.display = 'none';
    }

    els.empCountToggle.addEventListener('click', () => {
      const willShow = els.empReadonlyWrap.style.display === 'none';
      els.empReadonlyWrap.style.display = willShow ? 'block' : 'none';
    });

    els.btnClose.addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });

    els.errorBadge.addEventListener('click', () => {
      const willShow = els.errorList.style.display === 'none';
      els.errorList.style.display = willShow ? 'block' : 'none';
    });

    els.toggleRawLink.addEventListener('click', (e) => {
      e.preventDefault();
      const willShow = els.rawWrap.style.display === 'none';
      els.rawWrap.style.display = willShow ? 'block' : 'none';
      els.toggleRawLink.textContent = willShow ? 'Ẩn dữ liệu thô' : 'Xem dữ liệu thô';
    });

    // Nút copy độc lập, bấm trực tiếp -> luôn là 1 cú click "tươi" nên chắc chắn được phép,
    // khác với gọi copy tự động ngay khi vừa chạy xong (dễ bị chặn âm thầm nếu "user gesture"
    // gốc đã hết hạn) — đây là lối thoát dự phòng cho đúng tình huống đó.
    els.btnCopyAgain.addEventListener('click', () => {
      copyToClipboard(els.resultTextarea.value);
      const original = els.btnCopyAgain.textContent;
      els.btnCopyAgain.textContent = '✅ Đã copy!';
      setTimeout(() => { els.btnCopyAgain.textContent = original; }, 1500);
    });

    els.btnStart.addEventListener('click', async () => {
      const listText = els.textarea.value;
      saveList(listText);

      const empIds = parseEmployeeIds(listText);
      if (empIds.length === 0) {
        els.statusText.textContent = 'Chưa có mã NV nào trong danh sách.';
        return;
      }

      let fromDateApi, toDateApi;
      try {
        fromDateApi = ddmmyyyyToApiFormat(els.dateFrom.value);
        toDateApi = ddmmyyyyToApiFormat(els.dateTo.value);
      } catch (e) {
        els.statusText.textContent = e.message + ' — vui lòng nhập đúng dd/mm/yyyy.';
        return;
      }

      const employees = empIds.map((id) => ({ employeeId: id, originalName: id, displayName: id }));
      await runFromModal(els, employees, fromDateApi, toDateApi, {
        rangeFrom: els.dateFrom.value, rangeTo: els.dateTo.value,
      });
    });

    return els;
  }

  // Logic "chạy" dùng chung cho bấm tay (jobId=undefined) và tự động kích hoạt
  // (jobId có giá trị — báo tiến độ/kết quả về GM storage cho Dashboard).
  async function runFromModal(els, employees, fromDateApi, toDateApi, { jobId, rangeFrom, rangeTo } = {}) {
    const stopFlag = { requested: false };
    const errorLog = [];
    const runStartedAt = Date.now();

    els.setupSection.style.display = 'none';
    els.footer.style.display = 'none';
    els.statusText.textContent = '';
    els.doneSection.style.display = 'none';
    els.doneManualActions.style.display = 'none';
    els.rawWrap.style.display = 'none';
    els.toggleRawLink.textContent = 'Xem dữ liệu thô';
    els.runningSection.style.display = 'block';

    els.rangeText.textContent = `${rangeFrom || ''} → ${rangeTo || ''}`;
    els.empCountToggle.textContent = `${employees.length} nhân viên`;
    els.empReadonly.value = employees.map((e) => e.displayName || e.employeeId).join('\n');
    els.empReadonlyWrap.style.display = 'none';
    els.progressFill.style.width = '0%';
    els.progressCounter.textContent = `0/${employees.length}`;
    els.currentEmp.textContent = '';
    els.feed.innerHTML = '';
    els.errorArea.style.display = 'none';
    els.errorBadge.textContent = '✗ 0 lỗi';
    els.errorList.innerHTML = '';
    els.errorList.style.display = 'none';
    els.btnStop.disabled = false;
    els.btnStop.textContent = 'Dừng lại';

    const handleStopClick = () => {
      stopFlag.requested = true;
      els.btnStop.disabled = true;
      els.btnStop.textContent = 'Đang dừng...';
    };
    els.btnStop.addEventListener('click', handleStopClick);

    const { blocks, errors, results, stoppedEarly } = await runBatch(employees, fromDateApi, toDateApi, {
      shouldStop: () => stopFlag.requested,
      onStart: (i, total, empId, displayName) => {
        els.progressCounter.textContent = `${i}/${total}`;
        els.progressFill.style.width = `${Math.round((i / total) * 100)}%`;
        els.currentEmp.textContent = `Đang lấy: ${displayName || empId}`;
        if (jobId) reportJobProgress(jobId, i, total, empId);
      },
      onItemDone: (i, total, empId, displayName, outcome) => {
        els.progressFill.style.width = `${Math.round(((i + 1) / total) * 100)}%`;
        const who = displayName || empId;
        if (outcome.status === 'ok') {
          const label = (outcome.diemThucLanh === null || outcome.diemThucLanh === undefined)
            ? 'Không có dữ liệu kỳ này'
            : `Điểm thực lãnh: ${formatViNumber(outcome.diemThucLanh)}`;
          const color = (outcome.diemThucLanh === null || outcome.diemThucLanh === undefined) ? '#94a3b8' : COLOR_SUCCESS;
          pushFeedRow(els.feed, `<span style="color:${color};">✓ ${who} — ${label}</span>`);
        } else {
          // Lỗi KHÔNG vào feed trượt (chỉ có ${FEED_MAX_ROWS} chỗ, dễ bị đẩy mất) — dồn
          // vào khu vực riêng luôn hiện số lượng + xem được đủ danh sách.
          pushErrorRow(els, errorLog, who, outcome.error);
        }
      },
    });

    els.btnStop.removeEventListener('click', handleStopClick);
    els.runningSection.style.display = 'none';

    const output = blocks.join('\n\n');
    els.resultTextarea.value = output;

    // Chạy xong mà có lỗi -> tự mở khu vực lỗi ra luôn, không bắt bấm mới thấy.
    if (errors.length > 0) {
      els.errorList.style.display = 'block';
    }

    const total = employees.length;
    const attempted = results.length;
    const attemptedSuccess = attempted - errors.length;
    const elapsedSec = Math.max(1, Math.round((Date.now() - runStartedAt) / 1000));

    els.doneSection.style.display = 'block';

    if (jobId) {
      // TỰ ĐỘNG: màn hình gọn, không có dữ liệu thô (Dashboard đã có sẵn qua bridge) —
      // tab sẽ tự đóng theo setTimeout ở checkForAutoJob bất kể có lỗi hay không.
      els.doneManualActions.style.display = 'none';
      if (stoppedEarly) {
        els.doneHeadline.textContent = `⏹ Đã dừng: xong ${attempted}/${total} nhân viên${errors.length ? ` · ${errors.length} lỗi` : ''}`;
      } else if (errors.length === 0) {
        els.doneHeadline.textContent = `✅ Hoàn tất ${total}/${total} nhân viên · ${elapsedSec}s`;
      } else {
        els.doneHeadline.textContent = `⚠️ Xong ${attemptedSuccess}/${total} · ${errors.length} lỗi`;
      }
      els.doneSub.textContent = 'Đang quay về Dashboard...';
    } else {
      // CHẠY TAY: tự copy ngay khi vừa xong (best-effort — nút "Copy lại" bên dưới là
      // lối thoát dự phòng nếu cú copy này bị chặn âm thầm), không hiện dữ liệu thô mặc định.
      copyToClipboard(output);
      els.doneManualActions.style.display = 'block';
      if (stoppedEarly) {
        els.doneHeadline.textContent = `⏹ Đã dừng: xong ${attempted}/${total} nhân viên${errors.length ? ` (${errors.length} lỗi)` : ''}.`;
        els.doneSub.textContent = 'Dữ liệu đã lấy được vẫn được copy vào clipboard — qua Dashboard YCX dán vào.';
      } else if (errors.length === 0) {
        els.doneHeadline.textContent = `✅ Đã lấy xong ${total} nhân viên.`;
        els.doneSub.textContent = 'Dữ liệu đã được copy vào clipboard — qua Dashboard YCX dán vào.';
      } else {
        els.doneHeadline.textContent = `⚠️ Xong ${attemptedSuccess}/${total} · ${errors.length} lỗi.`;
        els.doneSub.textContent = 'Dữ liệu đã copy vào clipboard (gồm cả dòng lỗi) — qua Dashboard YCX dán vào.';
      }
    }

    els.footer.style.display = 'flex';
    if (jobId) {
      // Tự động: tab sẽ tự đóng ngay sau, không cần hiện lại khu nhập liệu / nút Bắt đầu.
      els.btnStart.style.display = 'none';
      els.btnCopyAgain.style.display = 'none';
    } else {
      els.setupSection.style.display = 'block';
      els.btnStart.style.display = 'inline-block';
      els.btnStart.disabled = false;
      els.btnStart.textContent = 'Bắt đầu';
      els.textarea.disabled = false;
      els.dateFrom.disabled = false;
      els.dateTo.disabled = false;
      els.btnCopyAgain.style.display = 'inline-block';
    }

    if (jobId) {
      await reportJobDone(jobId, results, stoppedEarly);
    }

    return { blocks, errors, results, stoppedEarly };
  }

  // ====== BÁO TIẾN ĐỘ / KẾT QUẢ VÀO GM STORAGE (chỉ có ý nghĩa khi có jobId) ======
  // Trước mỗi lần ghi, tự đọc lại jobId hiện tại trong GM storage — nếu đã bị 1 job
  // mới hơn ghi đè (bấm "Tự động" lần nữa) thì tự ngừng report, không phá dữ liệu job mới.
  async function reportJobProgress(jobId, done, total, currentEmployeeId) {
    try {
      const meta = await gmGet(GM_KEY_META, null);
      if (!meta || meta.jobId !== jobId) return;
      await gmSet(GM_KEY_META, { ...meta, status: 'running', progress: { done, total, currentEmployeeId } });
    } catch (e) {
      // bỏ qua lỗi ghi GM storage khi report tiến độ — không phá luồng fetch chính
    }
  }

  async function reportJobDone(jobId, results, stoppedEarly) {
    try {
      const meta = await gmGet(GM_KEY_META, null);
      if (!meta || meta.jobId !== jobId) return;
      await gmSet(GM_KEY_RESULT, { jobId, results, stoppedEarly: !!stoppedEarly });
      await gmSet(GM_KEY_META, { ...meta, status: 'done' });
    } catch (e) {
      await reportJobError(jobId, 'Không ghi được kết quả vào bridge (có thể do dữ liệu quá lớn) — dùng nút Copy thủ công trong hộp thoại.');
    }
  }

  async function reportJobError(jobId, message) {
    try {
      const meta = await gmGet(GM_KEY_META, null);
      if (meta && meta.jobId === jobId) {
        await gmSet(GM_KEY_META, { ...meta, status: 'error', errorMessage: message });
      }
    } catch (e) {
      // hết cách — bridge lỗi, người dùng vẫn còn lối thoát Copy thủ công trong modal
    }
  }

  // ====== TRANG MWG: tự dò job đang chờ từ Dashboard ======
  let isRunningAutoJob = false;
  let lastHandledAutoJobId = null;
  let autoModalEls = null;

  function initMwgPage() {
    checkForAutoJob();

    try {
      GM_addValueChangeListener(GM_KEY_META, (_name, _oldValue, newValue) => {
        if (newValue && newValue.status === 'requested' && newValue.jobId !== lastHandledAutoJobId && !isRunningAutoJob) {
          checkForAutoJob();
        }
      });
    } catch (e) {
      console.warn('[YCX bridge] GM_addValueChangeListener không khả dụng trên trang MWG, dùng poll dự phòng', e);
    }

    // Poll dự phòng 1s/lần để phát hiện ngay khi Dashboard gửi job mới trong chuỗi chạy Năm/So sánh
    setInterval(() => {
      if (!isRunningAutoJob) {
        checkForAutoJob();
      }
    }, 1000);
  }

  async function checkForAutoJob() {
    if (isRunningAutoJob) return;
    let meta;
    try {
      meta = await gmGet(GM_KEY_META, null);
    } catch (e) {
      return;
    }
    if (!meta || meta.status !== 'requested') return;
    if (meta.jobId === lastHandledAutoJobId) return;
    if (!meta.request || !Array.isArray(meta.request.employees) || meta.request.employees.length === 0) return;
    if (Date.now() - (meta.createdAt || 0) > JOB_TTL_MS) return; // job cũ quá 15 phút, bỏ qua

    isRunningAutoJob = true;
    lastHandledAutoJobId = meta.jobId;

    const { jobId, request } = meta;

    let fromDateApi, toDateApi;
    try {
      fromDateApi = ddmmyyyyToApiFormat(request.fromDate);
      toDateApi = ddmmyyyyToApiFormat(request.toDate);
    } catch (e) {
      await reportJobError(jobId, `Ngày nhận từ Dashboard không hợp lệ: ${e.message}`);
      isRunningAutoJob = false;
      return;
    }

    // Tái sử dụng modal giao diện nếu đang mở để tránh giật lag hoặc tạo DOM lặp lại
    if (!autoModalEls || !document.getElementById('mwg-thuthap-overlay')) {
      const existingOverlay = document.getElementById('mwg-thuthap-overlay');
      if (existingOverlay) existingOverlay.remove();
      autoModalEls = buildModal(true);
    }

    saveList(request.employees.map((e) => e.employeeId).join('\n'));

    if (request.stepLabel || (request.stepIndex != null && request.stepTotal != null)) {
      const stepIdx = (request.stepIndex || 0) + 1;
      const stepTot = request.stepTotal || 1;
      document.title = `⚡ [${stepIdx}/${stepTot}] ${request.stepLabel || ''} - MWG Thưởng`;
    }

    try {
      await runFromModal(autoModalEls, request.employees, fromDateApi, toDateApi, {
        jobId, rangeFrom: request.fromDate, rangeTo: request.toDate,
      });
    } finally {
      isRunningAutoJob = false;
    }

    // Nếu đây là 1 bước trong chuỗi chạy nhiều bước (chạy Năm hoặc So sánh) và CHƯA PHẢI bước cuối cùng:
    // GIỮ TAB MỞ để các tháng tiếp theo chạy mượt mà ngay trên tab này, không bị popup blocker chặn.
    if (request.multiStep && !request.isLastStep) {
      if (autoModalEls && autoModalEls.statusText) {
        autoModalEls.statusText.textContent = `✅ Đã lấy xong kỳ ${request.fromDate} → ${request.toDate}.\n⚡ Đang chờ tháng tiếp theo từ Dashboard YCX...`;
      }
      return;
    }

    // Nếu là bước cuối cùng của chuỗi hoặc job đơn:
    if (autoModalEls && autoModalEls.statusText) {
      autoModalEls.statusText.textContent = `🎉 ĐÃ HOÀN THÀNH TẤT CẢ CÁC THÁNG!\nTab sẽ tự động đóng sau 3 giây.`;
    }

    setTimeout(() => {
      try { window.close(); } catch (e) { /* bỏ qua nếu trình duyệt không cho tự đóng */ }
    }, 2500);
  }

  // ====== TRANG DASHBOARD: cầu nối CustomEvent (tầng A) <-> GM storage (tầng B) ======
  function initDashboardPage() {
    let lastMetaSnapshot = null;
    let lastResultSnapshot = null;

    window.addEventListener(EVT_PING, (e) => {
      const detail = e.detail;
      if (!detail || detail.source !== BRIDGE_SOURCE || detail.type !== 'ping' || typeof detail.nonce !== 'string') return;
      window.dispatchEvent(new CustomEvent(EVT_PONG, {
        detail: { source: BRIDGE_SOURCE, type: 'pong', nonce: detail.nonce, version: SCRIPT_VERSION },
      }));
    });

    window.addEventListener(EVT_START_JOB, (e) => {
      const detail = e.detail;
      if (!detail || detail.source !== BRIDGE_SOURCE || detail.type !== 'start-job') return;
      if (typeof detail.jobId !== 'string' || !detail.request || !Array.isArray(detail.request.employees)) return;
      gmSet(GM_KEY_META, {
        jobId: detail.jobId,
        createdAt: detail.createdAt || Date.now(),
        status: 'requested',
        request: detail.request,
      }).catch((err) => console.warn('[YCX bridge] Không ghi được job vào GM storage', err));
    });

    function relayMeta(value) {
      if (!value || !value.jobId) return;
      if (value.status === 'running' && value.progress) {
        window.dispatchEvent(new CustomEvent(EVT_PROGRESS, {
          detail: {
            source: BRIDGE_SOURCE, type: 'progress', jobId: value.jobId,
            done: value.progress.done, total: value.progress.total,
            currentEmployeeId: value.progress.currentEmployeeId,
          },
        }));
      } else if (value.status === 'error') {
        window.dispatchEvent(new CustomEvent(EVT_JOB_ERROR, {
          detail: { source: BRIDGE_SOURCE, type: 'job-error', jobId: value.jobId, message: value.errorMessage || 'Lỗi không rõ từ userscript' },
        }));
      }
      // status === 'done' được relay dựa vào key result (relayResult), vì đó mới là
      // nơi chứa dữ liệu thật cần cho Dashboard.
    }

    function relayResult(value) {
      if (!value || !value.jobId) return;
      window.dispatchEvent(new CustomEvent(EVT_JOB_DONE, {
        detail: {
          source: BRIDGE_SOURCE, type: 'job-done', jobId: value.jobId,
          results: value.results || [], stoppedEarly: !!value.stoppedEarly,
        },
      }));
    }

    try {
      GM_addValueChangeListener(GM_KEY_META, (_name, _oldValue, newValue) => relayMeta(newValue));
      GM_addValueChangeListener(GM_KEY_RESULT, (_name, _oldValue, newValue) => relayResult(newValue));
    } catch (e) {
      console.warn('[YCX bridge] GM_addValueChangeListener không khả dụng, chỉ dùng poll dự phòng', e);
    }

    // Poll dự phòng — đề phòng GM_addValueChangeListener lỡ không bắn (khác bản/trình duyệt).
    setInterval(async () => {
      try {
        const meta = await gmGet(GM_KEY_META, null);
        const metaStr = meta ? JSON.stringify(meta) : null;
        if (metaStr && metaStr !== lastMetaSnapshot) {
          lastMetaSnapshot = metaStr;
          relayMeta(meta);
        }
        const result = await gmGet(GM_KEY_RESULT, null);
        const resultStr = result ? JSON.stringify(result) : null;
        if (resultStr && resultStr !== lastResultSnapshot) {
          lastResultSnapshot = resultStr;
          relayResult(result);
        }
      } catch (e) {
        // bỏ qua lỗi đọc GM storage khi poll — sẽ thử lại ở lượt sau
      }
    }, 2500);
  }

  // ====== TRANG BI (baocao.dienmayxanh.com & bi.thegioididong.com): CLICK+ — MỞ RỘNG CÂY DỮ LIỆU THEO CẤP + TỰ ĐỘNG COPY ======
  // `#Loading` / `.overload-wait` là vòng xoay THẬT của trang (xác nhận qua DevTools của
  // người dùng: `<div id="Loading" class="overload-wait">`, overlay cố định toàn màn hình
  // do AngularJS `$http` interceptor bật/tắt khi có request đang chạy) — luôn ưu tiên 2
  // selector này. Các lớp DevExpress/spinner còn lại là suy đoán dự phòng cho báo cáo
  // khác; không khớp được cũng không sao, script chỉ đơn giản là không chờ spinner đó.
  const BI_HOSTNAMES = ['baocao.dienmayxanh.com', 'bi.thegioididong.com'];
  // Click theo LÔ NHỎ (không còn từng-nút-một của bản 3.2 — quá chậm trên báo cáo nhiều
  // nút). Giờ đã sửa xong bug offsetParent (bản 3.2) nên việc chờ vòng xoay thật đã
  // hoạt động đúng — click lô nhỏ (4 nút) + luôn chờ đúng vòng xoay #Loading thật giữa
  // các lô vẫn an toàn (không dồn dập như bản 3.1: lô 6 nút NHƯNG chờ-spinner khi đó
  // hoàn toàn vô tác dụng do bug offsetParent, nên thực chất không hề chờ gì cả).
  // BẢN 3.5 — TĂNG TỐC ĐỘ MỞ (user báo cáo thật: 196 nút còn lại mở rất chậm):
  // Cơ chế CHỐNG QUÁ TẢI thật sự là acpWaitForSpinnersToClear() (chờ đúng vòng xoay #Loading
  // thật của trang biến mất trước khi click lô kế tiếp) — KHÔNG phải các độ trễ cố định dưới đây.
  // Giữ nguyên spinner-wait (ACP_SPINNER_MAX_WAIT_MS/POLL_MS) y hệt bản 3.3, chỉ giảm các khoảng
  // nghỉ TUỲ Ý (intra-batch delay, settle, pacing) và tăng batch size — vẫn an toàn vì mỗi lô vẫn
  // phải đợi trang thật sự xử lý xong (không dồn request) trước khi sang lô kế tiếp.
  const ACP_BATCH_SIZE = 25; // số nút click liên tiếp trong 1 lô trước khi chờ vòng xoay
  const ACP_INTRA_BATCH_CLICK_DELAY = 2; // ms nghỉ giữa từng cú click trong cùng 1 lô
  const ACP_CLICK_SETTLE_MS = 15; // chờ 1 chút sau khi click xong cả lô để vòng xoay (nếu có) kịp xuất hiện trước khi bắt đầu kiểm tra
  const ACP_SPINNER_MAX_WAIT_MS = 5000; // chờ tối đa vòng xoay biến mất cho MỖI LÔ — tránh treo vĩnh viễn nếu trang không phản hồi
  const ACP_SPINNER_POLL_MS = 25;
  const ACP_BATCH_PACING_DELAY = 10; // nghỉ thêm sau khi vòng xoay đã tắt, trước khi click lô kế tiếp
  const ACP_FA_PLUS_SELECTOR = '.fa-plus';
  const ACP_DX_CLOSED_SELECTOR = '.dx-datagrid-group-closed, td.dx-command-expand.dx-datagrid-group-closed';
  const ACP_ANT_CLOSED_SELECTOR = [
    'button.ant-table-row-expand-icon-collapsed',
    '.ant-table-row-expand-icon-collapsed',
    'button.ant-table-row-expand-icon[aria-expanded="false"]',
    'button[aria-label="Mở rộng dòng"][aria-expanded="false"]',
    '[aria-label="Mở rộng dòng"]:not([aria-expanded="true"])',
  ].join(', ');
  const ACP_SPINNER_SELECTOR = [
    '#Loading',
    '.overload-wait',
    '.dx-loadpanel:not(.dx-state-invisible)',
    '.dx-loadpanel-content:not(.dx-state-invisible)',
    '.dx-loadindicator',
    '.ant-spin-spinning',
    '.el-loading-mask:not([style*="display: none"])',
  ].join(', ');

  let acpRunning = false;

  function acpIsVisible(el) {
    if (!el) return false;
    if (el.offsetParent !== null) return true;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  // Kiểm tra hiển thị dành riêng cho spinner — kiểm tra kích thước thật > 0 và opacity > 0.05
  // Tránh bắt nhầm các container tĩnh như .ant-spin-nested-loading hoặc icon ẩn.
  function acpIsSpinnerVisible(el) {
    if (!el) return false;
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') return false;
    if (parseFloat(style.opacity || '1') <= 0.05) return false;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return false;
    return el.offsetParent !== null || style.position === 'fixed';
  }

  // Kiểm tra nhiều cờ trạng thái khác nhau (aria-expanded, data-state, icon fa-minus,
  // lớp DevExpress / Ant Design đã mở) — tránh click lại 1 dòng đã mở dù icon chưa kịp đổi do tải
  // bất đồng bộ (bug đã gặp thật ở bản 1.6, khiến dòng vừa mở bị tự đóng lại).
  function acpIsAlreadyOpened(el) {
    if (el.classList && el.classList.contains('dx-datagrid-group-opened')) return true;
    if (el.classList && el.classList.contains('ant-table-row-expand-icon-expanded')) return true;
    if (el.getAttribute('aria-expanded') === 'true') return true;
    const row = el.closest('tr, .dx-row, .ant-table-row, button, a, [role="button"], .cursor-pointer, td, div');
    if (!row) return false;
    if (row.getAttribute('aria-expanded') === 'true') return true;
    if (row.getAttribute('data-state') === 'open') return true;
    if (row.querySelector('.fa-minus')) return true;
    if (row.querySelector('.ant-table-row-expand-icon-expanded')) return true;
    if (row.querySelector('button[aria-expanded="true"]')) return true;
    if (row.classList && row.classList.contains('dx-datagrid-group-opened')) return true;
    return false;
  }

  function acpGetPlusCandidates() {
    // BUG FIX: '.fa-plus' quá rộng — khớp luôn nút "+" của các dropdown/bộ lọc khác trên
    // trang (vùng, siêu thị, kỳ báo cáo, chỉ tiêu Doanh thu theo...) không liên quan gì
    // tới việc mở rộng dòng dữ liệu lồng nhau trong bảng. Click+ vô tình bấm luôn các
    // dropdown đó, làm nội dung/menu của chúng lẫn vào văn bản copy cuối cùng — user báo
    // cáo thật: bấm Click+ ra nhiều dòng thừa (danh sách tháng, danh sách vùng...) mà copy
    // tay bình thường không có. Nút mở-rộng-dòng THẬT luôn nằm trong 1 <table> — giới hạn
    // lại đúng phạm vi đó để không đụng tới các control khác ngoài bảng.
    const faIcons = Array.from(document.querySelectorAll(ACP_FA_PLUS_SELECTOR)).filter((el) => el.closest('table'));
    const dxClosed = Array.from(document.querySelectorAll(ACP_DX_CLOSED_SELECTOR));
    const antClosed = Array.from(document.querySelectorAll(ACP_ANT_CLOSED_SELECTOR));
    return Array.from(new Set([...faIcons, ...dxClosed, ...antClosed]))
      .filter(acpIsVisible)
      .filter((el) => !(el.classList && el.classList.contains('fa-minus')))
      .filter((el) => !(el.classList && el.classList.contains('ant-table-row-expand-icon-expanded')))
      .filter((el) => el.getAttribute('aria-expanded') !== 'true')
      .filter((el) => el.dataset.acpDone !== '1')
      .filter((el) => !acpIsAlreadyOpened(el));
  }

  // Chờ mọi spinner tải dữ liệu biến mất, tối đa maxWaitMs — không khớp được spinner
  // thật của trang thì coi như không cần chờ, không làm treo script. `settleMs` chờ 1
  // chút TRƯỚC lượt kiểm tra đầu tiên, để vòng xoay (nếu request vừa click gây ra) kịp
  // xuất hiện trên DOM — click xong kiểm tra ngay có thể chưa kịp thấy vòng xoay bật lên.
  async function acpWaitForSpinnersToClear(maxWaitMs = 2500, pollMs = 40, settleMs = ACP_CLICK_SETTLE_MS) {
    if (settleMs) await sleep(settleMs);
    const start = Date.now();
    while (Date.now() - start < maxWaitMs) {
      const spinners = document.querySelectorAll(ACP_SPINNER_SELECTOR);
      if (spinners.length === 0) return;
      const visible = Array.from(spinners).some(acpIsSpinnerVisible);
      if (!visible) return;
      await sleep(pollMs);
    }
  }

  // Cuộn từ đầu xuống cuối trang rồi quay lại đầu, để các dòng bị ảo hoá (virtual
  // scroll / lazy render) kịp được vẽ ra DOM trước khi copy.
  async function acpForceRenderAllRows() {
    const scroller = document.scrollingElement || document.documentElement;
    const tableScroller = document.querySelector('.ant-table-body, .dx-datagrid-rowsview, [class*="table-body"]');

    if (tableScroller && tableScroller.scrollHeight > tableScroller.clientHeight) {
      tableScroller.scrollTop = tableScroller.scrollHeight;
      await sleep(40);
      tableScroller.scrollTop = 0;
    }

    const step = Math.max((window.innerHeight || 800) * 1.5, 600);
    let pos = 0;
    let guard = 0;
    while (pos < scroller.scrollHeight && guard < 35) {
      window.scrollTo(0, pos);
      await sleep(25);
      pos += step;
      guard++;
    }
    window.scrollTo(0, scroller.scrollHeight);
    await sleep(40);
    window.scrollTo(0, 0);
    await sleep(40);
  }

  // Thanh lọc triệt để văn bản trước khi đưa vào Clipboard — loại bỏ sạch sẽ mọi text trạng thái / nút bấm của script
  function acpSanitizeText(rawText) {
    if (!rawText) return '';
    const junkPatterns = [
      /^⚡\s*Click\+/i,
      /^⚡\s*Đang/i,
      /^Đã mở:/i,
      /^Còn lại:/i,
      /^⏹\s*Dừng lại/i,
      /^⏳\s*Đang/i,
      /^📋\s*Copy/i,
      /^✅\s*Đã mở/i,
      /^⚠️\s*Không có dữ liệu/i,
      /^❌\s*(Thất bại|Lỗi)/i,
      /^🔘\s*Đã tự bật/i,
      /^⚠️\s*Không bật được/i,
    ];
    return rawText
      .split('\n')
      .map((l) => l.trim())
      .filter((line) => {
        if (!line || line === 'undefined') return false;
        return !junkPatterns.some((pattern) => pattern.test(line));
      })
      .join('\n');
  }

  // Ghi lại nội dung mọi phần tử mới thêm vào DOM ngay khi nó xuất hiện (đề phòng bị
  // tự thu gọn/gỡ khỏi DOM trước lúc copy).
  function acpStartObserver() {
    const capturedNodes = new WeakSet();
    const recoveryBlocks = [];
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        for (let j = 0; j < m.addedNodes.length; j++) {
          const node = m.addedNodes[j];
          if (node.nodeType !== 1) continue;
          if (capturedNodes.has(node)) continue;
          capturedNodes.add(node);
          // Bỏ qua các phần tử UI của script để không dính text trạng thái vào bản copy
          const isOurUi = node.id === 'acp-status-box' ||
            node.id === 'acp-float-btn' ||
            node.id === '__copy_wait_toast__' ||
            (node.closest && (node.closest('#acp-status-box') || node.closest('#acp-float-btn') || node.closest('#__copy_wait_toast__')));
          if (isOurUi) continue;

          // BUG FIX: Tuyệt đối KHÔNG dùng node.innerText ở đây vì sẽ ép trình duyệt tính reflow
          // layout liên tục (Layout Thrashing), làm đơ UI / treo trình duyệt khi mở nhiều dòng.
          // Dùng textContent để lấy nội dung cực nhanh và mượt.
          const text = (node.textContent || '').trim();
          if (text && text.length > 5) {
            // Không bao giờ bắt các câu chữ trạng thái của chính script
            if (/^(⚡|⏳|⏹|✅|📋|Đã mở:|Còn lại:)/.test(text)) continue;
            recoveryBlocks.push({ node, text });
          }
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return {
      disconnect: () => observer.disconnect(),
      buildRecoveryText: () => {
        if (recoveryBlocks.length === 0 || recoveryBlocks.length > 3000) return '';
        return recoveryBlocks
          .filter((b) => !document.body.contains(b.node))
          .map((b) => b.text)
          .filter((t) => !/^(⚡|⏳|⏹|✅|📋|Đã mở:|Còn lại:)/.test(t))
          .join('\n');
      },
    };
  }

  // Đọc text hiển thị của trang, loại vùng nhân bản cột cố định DevExpress
  // (.dx-datagrid-content-fixed, .dx-hidden) + hộp trạng thái của chính script, và bỏ
  // dòng rác "undefined".
  // BUG FIX: Bôi đen toàn bộ document.body qua Range rồi lấy Selection.toString() giống hệt
  // bookmarklet CopyAll — đảm bảo lấy trọn vẹn 100% tất cả các bảng/chương trình thi đua
  // (tránh lỗi chỉ querySelector trúng 1 bảng đầu tiên).
  function acpExtractVisibleText() {
    const excluded = Array.from(document.querySelectorAll('.dx-datagrid-content-fixed, .dx-hidden, #acp-status-box, #acp-float-btn, #__copy_wait_toast__'));
    const prevDisplay = excluded.map((el) => el.style.display);
    excluded.forEach((el) => { el.style.display = 'none'; });

    let text = '';
    try {
      // Bôi đen toàn bộ document.body qua Range rồi lấy Selection.toString() giống hệt bookmarklet CopyAll
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(document.body);
      selection.removeAllRanges();
      selection.addRange(range);
      text = selection.toString();
      selection.removeAllRanges();
    } catch (e) {
      console.warn('[Click+] Selection API thất bại, dùng lại innerText:', e);
      text = document.body.innerText || document.body.textContent || '';
    }

    excluded.forEach((el, i) => { el.style.display = prevDisplay[i]; });

    return acpSanitizeText(text);
  }

  // ====== BẢN 4.4 — TỰ BẬT "TRẢ GÓP" + "DT QUY ĐỔI" TRƯỚC KHI MỞ CẤP ======
  // Trang BI mới (baocao.dienmayxanh.com) có 2 nút quyết định cột nào có trong bảng: ô check
  // "Trả góp" và nút "DT quy đổi" (cặp segment "DT thực | DT quy đổi"). Dashboard YCX cần đủ
  // cả 2 → Click+ tự bật nếu đang tắt, rồi mới quét dấu cộng. Nhận diện theo NHÃN nút (không
  // theo class Tailwind — đổi thường xuyên). Trạng thái TẮT theo đúng HTML thật user gửi:
  //   Trả góp   : <button class="… border-slate-200 bg-white …"><span class="… border-slate-300"></span>Trả góp</button>
  //               → span đầu RỖNG (bật thì có dấu ✓) + viền xám border-slate-200.
  //   DT quy đổi: <button class="… bg-white text-gray-600 …">DT quy đổi</button> → nền trắng.
  // Nguyên tắc: chỉ click khi CHẮC CHẮN đang tắt (khớp đủ mọi dấu hiệu). Nghi ngờ thì bỏ qua —
  // click nhầm 1 nút đang bật sẽ TẮT nó đi, tệ hơn là không tự bật.
  const ACP_TOGGLE_CONFIRM_MAX_MS = 1500; // chờ tối đa để nút đổi trạng thái sau khi click
  const ACP_TOGGLE_SETTLE_MS = 120; // React cần 1 nhịp render + có thể gọi lại API sau khi đổi toggle

  // Nhãn = các text node trực tiếp của <button> (bỏ qua span icon ✓ / svg), gộp khoảng trắng.
  function acpButtonLabel(btn) {
    const direct = Array.from(btn.childNodes)
      .filter((n) => n.nodeType === 3)
      .map((n) => n.textContent)
      .join('');
    return (direct.trim() || (btn.textContent || '').trim()).replace(/\s+/g, ' ');
  }

  // BẢN 4.5: trang BI đổi giao diện liên tục — nút có thể là <button>, <label> bọc checkbox, hay
  // <div role="button">; nhãn có thể là "Trả góp" hoặc "Trả chậm". Trước đây chỉ tìm đúng
  // <button> + nhãn khớp TUYỆT ĐỐI nên hễ trang đổi là im lặng bỏ qua, người dùng không biết vì
  // sao không tự bật (chủ dự án báo 2026-09-22).
  const ACP_TOGGLE_SELECTOR = 'button, [role="button"], label, a[role="button"], div[class*="cursor-pointer"], span[class*="cursor-pointer"]';

  function acpFindToggleButton(labelOrAliases) {
    const aliases = (Array.isArray(labelOrAliases) ? labelOrAliases : [labelOrAliases])
      .map((x) => String(x).toLowerCase().replace(/\s+/g, ' ').trim());
    const nodes = Array.from(document.querySelectorAll(ACP_TOGGLE_SELECTOR)).filter((el) => {
      if (el.id === 'acp-float-btn' || el.closest('#acp-status-box')) return false;
      return acpIsVisible(el);
    });
    const labelOf = (el) => acpButtonLabel(el).toLowerCase().replace(/\s+/g, ' ').trim();
    // Ưu tiên khớp tuyệt đối; chỉ khi không có mới chấp nhận nhãn CHỨA alias và không quá dài
    // (tránh trúng cả thanh công cụ bọc ngoài).
    return nodes.find((el) => aliases.includes(labelOf(el)))
      || nodes.find((el) => {
        const t = labelOf(el);
        return aliases.some((a) => t.includes(a)) && t.length <= 24;
      })
      || null;
  }

  function acpHasAriaOn(btn) {
    return btn.getAttribute('aria-pressed') === 'true'
      || btn.getAttribute('aria-checked') === 'true'
      || btn.getAttribute('aria-selected') === 'true'
      || btn.getAttribute('data-state') === 'on'
      || btn.getAttribute('data-state') === 'checked';
  }

  /**
   * Trạng thái nút: 'on' | 'off' | 'unknown'. Đọc theo nhiều dấu hiệu, từ chắc chắn đến suy đoán:
   * checkbox thật → aria/data-state → dấu ✓ trong ô vuông → màu nền (active thường là nền xanh
   * đặc + chữ trắng; tắt là nền trắng/trong suốt). KHÔNG đoán bừa: 'unknown' thì tuyệt đối không
   * click, vì click nhầm nút đang bật sẽ TẮT nó đi — tệ hơn là không tự bật.
   */
  function acpToggleState(el) {
    const input = el.querySelector('input[type="checkbox"], input[type="radio"]')
      || (el.tagName === 'INPUT' ? el : null);
    if (input) return input.checked ? 'on' : 'off';

    if (acpHasAriaOn(el)) return 'on';
    const ariaAttrs = ['aria-pressed', 'aria-checked', 'aria-selected'];
    if (ariaAttrs.some((a) => el.getAttribute(a) === 'false')) return 'off';
    if (el.getAttribute('data-state') === 'off' || el.getAttribute('data-state') === 'unchecked') return 'off';

    const cls = el.className && el.className.baseVal !== undefined ? el.className.baseVal : String(el.className || '');
    const mark = el.querySelector(':scope > span');
    if (mark && /rounded|border/.test(String(mark.className || ''))) {
      const ticked = mark.textContent.trim() !== '' || !!mark.querySelector('svg, i, img');
      if (ticked) return 'on';
      if (/border-slate-200|border-gray-200|border-neutral-200|bg-white/.test(cls)) return 'off';
    }

    const ACTIVE = /(bg-(blue|sky|primary|indigo|emerald|green)-[45678]00)|text-white|bg-blue-50|text-blue-700/;
    const INACTIVE = /bg-white|bg-transparent|bg-gray-50|bg-slate-50/;
    if (ACTIVE.test(cls)) return 'on';
    if (INACTIVE.test(cls)) return 'off';
    return 'unknown';
  }

  const ACP_AUTO_TOGGLES = [
    { label: 'Trả góp', aliases: ['trả góp', 'tra gop', 'trả chậm', 'tra cham'] },
    { label: 'DT quy đổi', aliases: ['dt quy đổi', 'dt quy doi', 'doanh thu quy đổi', 'dtqđ', 'dt qđ'] },
  ];

  /**
   * Trả về { turnedOn, failed, notFound, unknown } — báo ĐỦ để người dùng biết vì sao không tự
   * bật được (trước đây không thấy nút thì im lặng, nhìn như tính năng hỏng).
   */
  async function acpEnsureTogglesOn(onProgress) {
    const turnedOn = [];
    const failed = [];
    const notFound = [];
    const unknown = [];
    for (const toggle of ACP_AUTO_TOGGLES) {
      const aliases = toggle.aliases || [toggle.label];
      const btn = acpFindToggleButton(aliases);
      if (!btn) { notFound.push(toggle.label); continue; }
      const state = acpToggleState(btn);
      if (state === 'on') continue;
      if (state === 'unknown') { unknown.push(toggle.label); continue; }
      if (onProgress) onProgress(toggle.label);
      btn.click();
      await acpWaitForSpinnersToClear(ACP_SPINNER_MAX_WAIT_MS, ACP_SPINNER_POLL_MS, ACP_TOGGLE_SETTLE_MS);
      // Xác nhận nút đã đổi trạng thái thật (tìm lại theo nhãn vì React có thể tạo phần tử mới).
      const start = Date.now();
      let confirmed = false;
      while (Date.now() - start < ACP_TOGGLE_CONFIRM_MAX_MS) {
        const fresh = acpFindToggleButton(aliases);
        if (!fresh || acpToggleState(fresh) !== 'off') { confirmed = true; break; }
        await sleep(50);
      }
      (confirmed ? turnedOn : failed).push(toggle.label);
      if (!confirmed) console.warn('[Click+] Đã click nhưng nút vẫn ở trạng thái tắt:', toggle.label);
    }
    return { turnedOn, failed, notFound, unknown };
  }

  function acpUpdateStatusToggling(box, label) {
    box.style.display = 'block';
    box.style.background = `linear-gradient(135deg, ${COLOR_PRIMARY_LIGHT}, ${COLOR_PRIMARY})`;
    box.innerHTML = `
      <div style="font-weight:800;margin-bottom:4px;">⚡ Đang bật "${label}"...</div>
      <div>Bật xong sẽ tự quét dấu cộng và copy.</div>
    `;
  }

  function acpEnsureStatusBox() {
    let box = document.getElementById('acp-status-box');
    if (box) return box;
    box = document.createElement('div');
    box.id = 'acp-status-box';
    Object.assign(box.style, {
      position: 'fixed', right: '24px', bottom: '84px', zIndex: 999997,
      minWidth: '260px', padding: '12px 16px', borderRadius: '14px',
      color: '#fff', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif',
      fontSize: '13px', boxShadow: '0 10px 30px rgba(2,132,199,.35)', display: 'none',
    });
    document.body.appendChild(box);
    return box;
  }

  // onStopClick: callback bấm "Dừng lại" giữa chừng — vì giờ click TUẦN TỰ TỪNG NÚT MỘT
  // (không còn theo lô) nên báo cáo nhiều nút sẽ chạy chậm hơn hẳn, cần cho người dùng
  // chủ động dừng mà vẫn giữ + copy được phần dữ liệu đã mở tới lúc đó.
  function acpUpdateStatus(box, clicked, remaining, onStopClick) {
    box.style.display = 'block';
    box.style.background = `linear-gradient(135deg, ${COLOR_PRIMARY_LIGHT}, ${COLOR_PRIMARY})`;
    box.innerHTML = `
      <div style="font-weight:800;margin-bottom:4px;">⚡ Đang mở cấp hiện tại...</div>
      <div>Đã mở: ${clicked} · Còn lại: ${remaining}</div>
      <a id="acp-stop-link" href="#" style="color:#fff;text-decoration:underline;font-size:12px;display:inline-block;margin-top:4px;">⏹ Dừng lại</a>
    `;
    const stopLink = box.querySelector('#acp-stop-link');
    if (stopLink && onStopClick) {
      stopLink.addEventListener('click', (e) => {
        e.preventDefault();
        stopLink.textContent = 'Đang dừng...';
        onStopClick();
      });
    }
  }

  function acpUpdateStatusProcessing(box, clicked) {
    box.style.display = 'block';
    box.style.background = `linear-gradient(135deg, ${COLOR_PRIMARY_LIGHT}, ${COLOR_PRIMARY})`;
    box.innerHTML = `
      <div style="font-weight:800;margin-bottom:4px;">⚡ Đang sao chép dữ liệu...</div>
      <div>Đã mở xong ${clicked} mục. Đang trích xuất văn bản vào clipboard...</div>
    `;
  }

  function acpShowDone(box, clicked, stillPending, copiedLength, lastText, stoppedEarly, toggles) {
    box.style.display = 'block';
    box.style.background = `linear-gradient(135deg, ${COLOR_SUCCESS}, #16a34a)`;
    const turnedOn = (toggles && toggles.turnedOn) || [];
    const failed = (toggles && toggles.failed) || [];
    const notFound = (toggles && toggles.notFound) || [];
    const unknownState = (toggles && toggles.unknown) || [];
    const toggleNote = (turnedOn.length ? `<div style="margin-top:4px;">🔘 Đã tự bật: ${turnedOn.join(', ')}</div>` : '')
      + (failed.length ? `<div style="margin-top:4px;">⚠️ Không bật được: ${failed.join(', ')} — bật tay rồi bấm Click+ lại.</div>` : '')
      + (notFound.length ? `<div style="margin-top:4px;">⚠️ Không thấy nút: ${notFound.join(', ')} trên trang này — bật tay nếu cần.</div>` : '')
      + (unknownState.length ? `<div style="margin-top:4px;">⚠️ Không rõ trạng thái: ${unknownState.join(', ')} — không dám click, bật tay nếu đang tắt.</div>` : '');
    const remainNote = stillPending > 0
      ? `<div style="margin-top:4px;">Còn ${stillPending} nút (cấp con) — bấm Click+ thêm lần nữa để mở tiếp.</div>`
      : '<div style="margin-top:4px;">Đã mở hết cấp hiện tại.</div>';
    const stopNote = stoppedEarly
      ? '<div style="margin-top:4px;">⏹ Đã dừng theo yêu cầu — dữ liệu đã mở tới lúc dừng vẫn được copy đủ.</div>'
      : '';
    box.innerHTML = `
      <div style="font-weight:800;margin-bottom:4px;">✅ Đã mở ${clicked} mục · đã copy ${copiedLength.toLocaleString('vi-VN')} ký tự</div>
      ${toggleNote}
      ${stopNote}
      ${remainNote}
      <a id="acp-copy-again" href="#" style="color:#fff;text-decoration:underline;font-size:12px;">📋 Copy lại</a>
    `;
    const copyAgainLink = box.querySelector('#acp-copy-again');
    if (copyAgainLink) {
      copyAgainLink.addEventListener('click', (e) => {
        e.preventDefault();
        copyToClipboard(lastText);
        copyAgainLink.textContent = '✅ Đã copy!';
        setTimeout(() => { copyAgainLink.textContent = '📋 Copy lại'; }, 1500);
      });
    }
    setTimeout(() => { box.style.display = 'none'; }, 8000);
  }

  function acpShowError(box, error) {
    box.style.display = 'block';
    box.style.background = `linear-gradient(135deg, ${COLOR_DANGER}, #be123c)`;
    box.innerHTML = `<div style="font-weight:800;">✗ Lỗi khi chạy Click+</div><div>${(error && error.message) || String(error)}</div>`;
  }

  async function acpRunCycle(btn) {
    if (acpRunning) return;
    acpRunning = true;
    const originalLabel = btn.textContent;
    btn.disabled = true;
    btn.style.opacity = '.7';
    btn.textContent = '⏳ Đang mở...';

    const statusBox = acpEnsureStatusBox();
    const observer = acpStartObserver();
    let stopRequested = false;
    const requestStop = () => { stopRequested = true; };

    let toggles = { turnedOn: [], failed: [], notFound: [], unknown: [] };
    try {
      // Bật "Trả góp" + "DT quy đổi" TRƯỚC, rồi mới quét dấu cộng — bảng có thể render lại sau khi
      // đổi toggle, quét trước sẽ cầm phần tử đã bị gỡ khỏi DOM.
      toggles = await acpEnsureTogglesOn((label) => acpUpdateStatusToggling(statusBox, label));

      const pending = acpGetPlusCandidates();
      const total = pending.length;
      let clicked = 0;

      acpUpdateStatus(statusBox, 0, total, requestStop);

      for (let i = 0; i < pending.length; i++) {
        if (stopRequested) break;
        const el = pending[i];
        let wasClicked = false;
        try {
          if (acpIsVisible(el) && !acpIsAlreadyOpened(el) && el.dataset.acpDone !== '1') {
            el.dataset.acpDone = '1';
            el.click();
            clicked++;
            wasClicked = true;
          }
        } catch (e) {
          console.error('[Click+] Lỗi tại nút', i + 1, e);
        }

        const isEndOfBatch = (i + 1) % ACP_BATCH_SIZE === 0 || i === pending.length - 1;
        const remaining = Math.max(0, total - i - 1);
        if (isEndOfBatch || wasClicked || i === pending.length - 1) {
          acpUpdateStatus(statusBox, clicked, remaining, requestStop);
        }

        if (!isEndOfBatch) {
          if (ACP_INTRA_BATCH_CLICK_DELAY > 0) {
            await sleep(ACP_INTRA_BATCH_CLICK_DELAY);
          }
          continue;
        }
        await acpWaitForSpinnersToClear();
        if (stopRequested) break;
        if (ACP_BATCH_PACING_DELAY > 0) {
          await sleep(ACP_BATCH_PACING_DELAY);
        }
      }

      // Thông báo rõ ràng cho người dùng chuyển sang giai đoạn tổng hợp & copy
      acpUpdateStatusProcessing(statusBox, clicked);

      // Mỗi lần bấm Click+ CHỈ mở đúng 1 cấp (không tự lặp lại quét tìm cấp con mới) —
      // người dùng chủ động bấm lại nút để mở tiếp cấp kế tiếp. Nếu bấm "Dừng lại" giữa
      // chừng, vẫn cuộn/copy đúng phần dữ liệu đã mở được tới lúc đó, không bỏ dở dữ liệu.
      await acpForceRenderAllRows();
      await sleep(60);

      observer.disconnect();
      const currentText = acpExtractVisibleText();
      const recoveryText = observer.buildRecoveryText();
      const rawText = recoveryText ? `${currentText}\n${recoveryText}` : currentText;
      const finalText = acpSanitizeText(rawText);
      copyToClipboard(finalText);

      const stillPending = acpGetPlusCandidates().length;
      acpShowDone(statusBox, clicked, stillPending, finalText.length, finalText, stopRequested, toggles);
    } catch (e) {
      console.error('[Click+] Lỗi khi chạy:', e);
      acpShowError(statusBox, e);
    } finally {
      observer.disconnect();
      acpRunning = false;
      btn.disabled = false;
      btn.style.opacity = '1';
      btn.textContent = originalLabel || '⚡ Click+';
    }
  }

  function acpEnsureButton() {
    let btn = document.getElementById('acp-float-btn');
    if (btn) return btn;
    btn = document.createElement('button');
    btn.id = 'acp-float-btn';
    btn.type = 'button';
    btn.textContent = '⚡ Click+';
    Object.assign(btn.style, {
      position: 'fixed', right: '24px', bottom: '24px', zIndex: 999998,
      padding: '12px 20px', borderRadius: '999px', border: 'none',
      background: `linear-gradient(135deg, ${COLOR_PRIMARY_LIGHT}, ${COLOR_PRIMARY})`,
      color: '#fff', fontWeight: '800', fontSize: '14px', letterSpacing: '.01em',
      cursor: 'pointer', boxShadow: '0 10px 30px rgba(2,132,199,.35)',
      fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif',
      transition: 'transform .15s ease',
    });
    btn.addEventListener('mousedown', () => { btn.style.transform = 'scale(.96)'; });
    btn.addEventListener('mouseup', () => { btn.style.transform = 'scale(1)'; });
    btn.addEventListener('mouseleave', () => { btn.style.transform = 'scale(1)'; });
    btn.addEventListener('click', () => { acpRunCycle(btn); });
    document.body.appendChild(btn);
    return btn;
  }

  // Khởi tạo nút nổi + tự cập nhật nhãn theo số nút "+" đang chờ mở (kể cả khi người
  // dùng chuyển qua tab báo cáo khác trong cùng trang mà không tải lại trang).
  function initBiPage() {
    acpEnsureButton();
    setInterval(() => {
      if (acpRunning) return;
      const btn = document.getElementById('acp-float-btn');
      if (!btn) return;
      const count = acpGetPlusCandidates().length;
      btn.textContent = count > 0 ? `⚡ Click+ (${count})` : '⚡ Click+';
    }, 1000);
  }

  // ====== RẼ NHÁNH THEO DOMAIN ======
  if (location.hostname === MWG_HOSTNAME) {
    initMwgPage();
  } else if (BI_HOSTNAMES.includes(location.hostname)) {
    initBiPage();
  } else {
    initDashboardPage();
  }
})();
