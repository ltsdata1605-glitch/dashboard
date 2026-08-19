// ==UserScript==
// @name         MWG - Tự động lấy điểm thưởng nhân viên
// @namespace    dashboard-ycx
// @version      3.4
// @description  Gọi thẳng API GetReward (mỗi mã NV), parse HTML <table> trả về thành TSV giống hệt copy tay; nối cầu với Dashboard YCX để chạy chế độ Tự động; nút Click+ trên trang BI để mở rộng cây dữ liệu theo cấp + tự copy (click theo lô nhỏ, chờ đúng vòng xoay #Loading thật)
// @match        https://newinsite.thegioididong.com/office/thuong-nhan-vien*
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
 * ĐÃ CHẠY THẬT THÀNH CÔNG (test 27 mã NV qua chế độ Tự động, không mã nào lỗi):
 * - Tham số ngày: dtmFromDate / dtmToDate, định dạng mm/dd/yyyy. Tham số mã NV:
 *   strRewardUser. intRewardPositionID luôn = -1. Cookie phiên có sẵn là đủ để gọi API.
 * - Response là HTML <table> 2 tầng header. Script duyệt nguyên <tr>/<td> theo đúng
 *   thứ tự DOM, KHÔNG giãn colspan/rowspan — giống hệt cách trình duyệt tạo phần
 *   plain-text khi Ctrl+C cả bảng, nên ra y hệt lúc copy tay.
 * - Copy vào clipboard: không tự gọi ngay sau vòng lặp fetch dài (dễ bị trình duyệt
 *   âm thầm chặn vì "user gesture" gốc đã hết hạn) — luôn cần 1 cú click Copy riêng.
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
  const SCRIPT_VERSION = '1.5';

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
  async function fetchOne(empId, fromDate, toDate) {
    const params = new URLSearchParams({
      dtmFromDate: fromDate,
      dtmToDate: toDate,
      intRewardPositionID: '-1',
      strRewardUser: empId,
    });

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
      throw new Error(`Server trả lỗi HTTP ${res.status}`);
    }

    const raw = await res.text();
    return convertResponseToTSV(raw);
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
      if (onStart) onStart(i, employees.length, employeeId, displayName);
      try {
        const tsv = await fetchOne(employeeId, fromDateApi, toDateApi);
        const diemThucLanh = extractDiemThucLanh(tsv);
        blocks.push(`===${employeeId}===\n${tsv}`);
        results.push({ employeeId, originalName, status: 'ok', tsv, diemThucLanh });
        if (onItemDone) onItemDone(i, employees.length, employeeId, displayName, { status: 'ok', diemThucLanh });
      } catch (e) {
        const msg = (e && e.message) || String(e);
        blocks.push(`===${employeeId}===\nLỖI: ${msg}`);
        errors.push(`${employeeId}: ${msg}`);
        results.push({ employeeId, originalName, status: 'error', error: msg });
        if (onItemDone) onItemDone(i, employees.length, employeeId, displayName, { status: 'error', error: msg });
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
  // Đã bỏ nút nổi "⚡ Thu thập điểm thưởng" — chế độ Tự động bên Dashboard YCX đã đủ
  // dùng (Hiện tại/Tháng/Năm/Khoảng thời gian), không cần kích hoạt tay từ trang MWG nữa.
  function initMwgPage() {
    checkForAutoJob();
  }

  async function checkForAutoJob() {
    let meta;
    try {
      meta = await gmGet(GM_KEY_META, null);
    } catch (e) {
      return;
    }
    if (!meta || meta.status !== 'requested') return;
    if (!meta.request || !Array.isArray(meta.request.employees) || meta.request.employees.length === 0) return;
    if (Date.now() - (meta.createdAt || 0) > JOB_TTL_MS) return; // job cũ quá 15 phút, bỏ qua

    const { jobId, request } = meta;

    let fromDateApi, toDateApi;
    try {
      fromDateApi = ddmmyyyyToApiFormat(request.fromDate);
      toDateApi = ddmmyyyyToApiFormat(request.toDate);
    } catch (e) {
      await reportJobError(jobId, `Ngày nhận từ Dashboard không hợp lệ: ${e.message}`);
      return;
    }

    const existingOverlay = document.getElementById('mwg-thuthap-overlay');
    if (existingOverlay) existingOverlay.remove();

    const els = buildModal(true);
    saveList(request.employees.map((e) => e.employeeId).join('\n'));

    await runFromModal(els, request.employees, fromDateApi, toDateApi, {
      jobId, rangeFrom: request.fromDate, rangeTo: request.toDate,
    });

    // Tự đóng tab sau khi ghi xong kết quả — chỉ khi tab này do Dashboard mở qua
    // window.open (nên window.close() được phép). Nếu trình duyệt chặn, chỉ là
    // không tự đóng, không mất dữ liệu (đã ghi vào GM storage + còn UI copy thủ công).
    setTimeout(() => {
      try { window.close(); } catch (e) { /* bỏ qua nếu trình duyệt không cho tự đóng */ }
    }, 1800);
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

  // ====== TRANG BI (bi.thegioididong.com): CLICK+ — MỞ RỘNG CÂY DỮ LIỆU THEO CẤP + TỰ ĐỘNG COPY ======
  // `#Loading` / `.overload-wait` là vòng xoay THẬT của trang (xác nhận qua DevTools của
  // người dùng: `<div id="Loading" class="overload-wait">`, overlay cố định toàn màn hình
  // do AngularJS `$http` interceptor bật/tắt khi có request đang chạy) — luôn ưu tiên 2
  // selector này. Các lớp DevExpress/spinner còn lại là suy đoán dự phòng cho báo cáo
  // khác; không khớp được cũng không sao, script chỉ đơn giản là không chờ spinner đó.
  const BI_HOSTNAME = 'bi.thegioididong.com';
  // Click theo LÔ NHỎ (không còn từng-nút-một của bản 3.2 — quá chậm trên báo cáo nhiều
  // nút). Giờ đã sửa xong bug offsetParent (bản 3.2) nên việc chờ vòng xoay thật đã
  // hoạt động đúng — click lô nhỏ (4 nút) + luôn chờ đúng vòng xoay #Loading thật giữa
  // các lô vẫn an toàn (không dồn dập như bản 3.1: lô 6 nút NHƯNG chờ-spinner khi đó
  // hoàn toàn vô tác dụng do bug offsetParent, nên thực chất không hề chờ gì cả).
  const ACP_BATCH_SIZE = 4; // số nút click liên tiếp trong 1 lô trước khi chờ vòng xoay
  const ACP_INTRA_BATCH_CLICK_DELAY = 25; // ms nghỉ giữa từng cú click trong cùng 1 lô
  const ACP_CLICK_SETTLE_MS = 50; // chờ 1 chút sau khi click xong cả lô để vòng xoay (nếu có) kịp xuất hiện trước khi bắt đầu kiểm tra
  const ACP_SPINNER_MAX_WAIT_MS = 6000; // chờ tối đa vòng xoay biến mất cho MỖI LÔ — tránh treo vĩnh viễn nếu trang không phản hồi
  const ACP_SPINNER_POLL_MS = 60;
  const ACP_BATCH_PACING_DELAY = 80; // nghỉ thêm sau khi vòng xoay đã tắt, trước khi click lô kế tiếp
  const ACP_FA_PLUS_SELECTOR = '.fa-plus';
  const ACP_DX_CLOSED_SELECTOR = '.dx-datagrid-group-closed, td.dx-command-expand.dx-datagrid-group-closed';
  const ACP_SPINNER_SELECTOR = [
    '#Loading', '.overload-wait',
    '.dx-loadpanel-content', '.dx-loadpanel:not(.dx-state-invisible)', '.dx-loadindicator',
    '.ant-spin-spinning', '.el-loading-mask',
    '[class*="spinner" i]', '[class*="loading" i]',
  ].join(', ');

  let acpRunning = false;

  function acpIsVisible(el) {
    return !!(el && el.offsetParent !== null);
  }

  // Kiểm tra hiển thị dành riêng cho spinner — KHÔNG dùng offsetParent vì theo spec,
  // offsetParent LUÔN LÀ null với phần tử `position:fixed` (đúng ngay chính vòng xoay
  // thật `#Loading`/`.overload-wait`) bất kể phần tử đó đang hiển thị hay không. Nếu chỉ
  // thêm selector mà không sửa hàm kiểm tra này thì chờ-spinner coi như vô tác dụng.
  function acpIsSpinnerVisible(el) {
    if (!el) return false;
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') return false;
    if (parseFloat(style.opacity || '1') === 0) return false;
    if (style.position === 'fixed') {
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    }
    return el.offsetParent !== null;
  }

  // Kiểm tra nhiều cờ trạng thái khác nhau (aria-expanded, data-state, icon fa-minus,
  // lớp DevExpress đã mở) — tránh click lại 1 dòng đã mở dù icon chưa kịp đổi do tải
  // bất đồng bộ (bug đã gặp thật ở bản 1.6, khiến dòng vừa mở bị tự đóng lại).
  function acpIsAlreadyOpened(el) {
    if (el.classList && el.classList.contains('dx-datagrid-group-opened')) return true;
    const row = el.closest('tr, .dx-row, button, a, [role="button"], .cursor-pointer, td, div');
    if (!row) return false;
    if (row.getAttribute('aria-expanded') === 'true') return true;
    if (row.getAttribute('data-state') === 'open') return true;
    if (row.querySelector('.fa-minus')) return true;
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
    return Array.from(new Set([...faIcons, ...dxClosed]))
      .filter(acpIsVisible)
      .filter((el) => !(el.classList && el.classList.contains('fa-minus')))
      .filter((el) => el.dataset.acpDone !== '1')
      .filter((el) => !acpIsAlreadyOpened(el));
  }

  // Chờ mọi spinner tải dữ liệu biến mất, tối đa maxWaitMs — không khớp được spinner
  // thật của trang thì coi như không cần chờ, không làm treo script. `settleMs` chờ 1
  // chút TRƯỚC lượt kiểm tra đầu tiên, để vòng xoay (nếu request vừa click gây ra) kịp
  // xuất hiện trên DOM — click xong kiểm tra ngay có thể chưa kịp thấy vòng xoay bật lên.
  async function acpWaitForSpinnersToClear(maxWaitMs = ACP_SPINNER_MAX_WAIT_MS, pollMs = ACP_SPINNER_POLL_MS, settleMs = ACP_CLICK_SETTLE_MS) {
    if (settleMs) await sleep(settleMs);
    const start = Date.now();
    while (Date.now() - start < maxWaitMs) {
      const visible = Array.from(document.querySelectorAll(ACP_SPINNER_SELECTOR)).some(acpIsSpinnerVisible);
      if (!visible) return;
      await sleep(pollMs);
    }
  }

  // Cuộn từ đầu xuống cuối trang rồi quay lại đầu, để các dòng bị ảo hoá (virtual
  // scroll / lazy render) kịp được vẽ ra DOM trước khi copy.
  async function acpForceRenderAllRows() {
    const scroller = document.scrollingElement || document.documentElement;
    const step = Math.max(window.innerHeight || 800, 400);
    let pos = 0;
    let guard = 0;
    while (pos < scroller.scrollHeight && guard < 500) {
      window.scrollTo(0, pos);
      await sleep(120);
      pos += step;
      guard++;
    }
    window.scrollTo(0, scroller.scrollHeight);
    await sleep(250);
    window.scrollTo(0, 0);
    await sleep(250);
  }

  // Ghi lại nội dung mọi phần tử mới thêm vào DOM ngay khi nó xuất hiện (đề phòng bị
  // tự thu gọn/gỡ khỏi DOM trước lúc copy — bug đã gặp thật ở một số bảng). buildRecoveryText()
  // chỉ trả về phần đã bị gỡ khỏi DOM hiện tại, không trùng với văn bản đọc trực tiếp
  // từ trang lúc copy (nên nối vào nhau an toàn, không lo nhân đôi dữ liệu).
  function acpStartObserver() {
    const capturedNodes = new WeakSet();
    const recoveryBlocks = [];
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        m.addedNodes.forEach((node) => {
          if (node.nodeType !== 1) return;
          if (capturedNodes.has(node)) return;
          capturedNodes.add(node);
          const text = (node.innerText || node.textContent || '').trim();
          if (text) recoveryBlocks.push({ node, text });
        });
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return {
      disconnect: () => observer.disconnect(),
      buildRecoveryText: () => recoveryBlocks
        .filter((b) => !document.body.contains(b.node))
        .map((b) => b.text)
        .join('\n'),
    };
  }

  // Đọc text hiển thị của trang, loại vùng nhân bản cột cố định DevExpress
  // (.dx-datagrid-content-fixed, .dx-hidden) + hộp trạng thái của chính script, và bỏ
  // dòng rác "undefined".
  function acpExtractVisibleText() {
    const excluded = Array.from(document.querySelectorAll('.dx-datagrid-content-fixed, .dx-hidden'));
    const statusBox = document.getElementById('acp-status-box');
    if (statusBox) excluded.push(statusBox);
    const prevDisplay = excluded.map((el) => el.style.display);
    excluded.forEach((el) => { el.style.display = 'none'; });

    const text = document.body.innerText || document.body.textContent || '';

    excluded.forEach((el, i) => { el.style.display = prevDisplay[i]; });

    return text
      .split('\n')
      .filter((line) => line.trim() && line.trim() !== 'undefined')
      .join('\n');
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

  function acpShowDone(box, clicked, stillPending, copiedLength, lastText, stoppedEarly) {
    box.style.display = 'block';
    box.style.background = `linear-gradient(135deg, ${COLOR_SUCCESS}, #16a34a)`;
    const remainNote = stillPending > 0
      ? `<div style="margin-top:4px;">Còn ${stillPending} nút (cấp con) — bấm Click+ thêm lần nữa để mở tiếp.</div>`
      : '<div style="margin-top:4px;">Đã mở hết cấp hiện tại.</div>';
    const stopNote = stoppedEarly
      ? '<div style="margin-top:4px;">⏹ Đã dừng theo yêu cầu — dữ liệu đã mở tới lúc dừng vẫn được copy đủ.</div>'
      : '';
    box.innerHTML = `
      <div style="font-weight:800;margin-bottom:4px;">✅ Đã mở ${clicked} mục · đã copy ${copiedLength.toLocaleString('vi-VN')} ký tự</div>
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

    try {
      const pending = acpGetPlusCandidates();
      const total = pending.length;
      let clicked = 0;

      acpUpdateStatus(statusBox, 0, total, requestStop);

      // Click theo LÔ NHỎ (ACP_BATCH_SIZE nút/lô, có nghỉ nhẹ giữa từng cú click trong lô)
      // rồi mới chờ đúng vòng xoay tải dữ liệu thật (#Loading/.overload-wait) biến mất 1
      // lần cho cả lô -> nghỉ thêm 1 chút -> mới click lô kế tiếp. Nhanh hơn hẳn so với
      // chờ riêng từng nút một, mà vẫn an toàn vì luôn chờ đúng vòng xoay thật (đã sửa
      // xong bug offsetParent) trước khi dồn thêm request tiếp theo lên backend.
      for (let i = 0; i < pending.length; i++) {
        if (stopRequested) break;
        const el = pending[i];
        try {
          if (!acpIsVisible(el) || acpIsAlreadyOpened(el) || el.dataset.acpDone === '1') {
            continue;
          }
          el.dataset.acpDone = '1';
          el.click();
          clicked++;
        } catch (e) {
          console.error('[Click+] Lỗi tại nút', i + 1, e);
        }
        acpUpdateStatus(statusBox, clicked, total - i - 1, requestStop);

        const isEndOfBatch = (i + 1) % ACP_BATCH_SIZE === 0 || i === pending.length - 1;
        if (!isEndOfBatch) {
          await sleep(ACP_INTRA_BATCH_CLICK_DELAY);
          continue;
        }
        await acpWaitForSpinnersToClear();
        if (stopRequested) break;
        await sleep(ACP_BATCH_PACING_DELAY);
      }

      // Mỗi lần bấm Click+ CHỈ mở đúng 1 cấp (không tự lặp lại quét tìm cấp con mới) —
      // người dùng chủ động bấm lại nút để mở tiếp cấp kế tiếp. Nếu bấm "Dừng lại" giữa
      // chừng, vẫn cuộn/copy đúng phần dữ liệu đã mở được tới lúc đó, không bỏ dở dữ liệu.
      await acpForceRenderAllRows();
      await sleep(400);

      observer.disconnect();
      const currentText = acpExtractVisibleText();
      const recoveryText = observer.buildRecoveryText();
      const finalText = recoveryText ? `${currentText}\n${recoveryText}` : currentText;
      copyToClipboard(finalText);

      const stillPending = acpGetPlusCandidates().length;
      acpShowDone(statusBox, clicked, stillPending, finalText.length, finalText, stopRequested);
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
  } else if (location.hostname === BI_HOSTNAME) {
    initBiPage();
  } else {
    initDashboardPage();
  }
})();
