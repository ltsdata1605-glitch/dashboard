// ==UserScript==
// @name         MWG - Tự động lấy điểm thưởng nhân viên
// @namespace    dashboard-ycx
// @version      2.7
// @description  Gọi thẳng API GetReward (mỗi mã NV), parse HTML <table> trả về thành TSV giống hệt copy tay; nối cầu với Dashboard YCX để chạy chế độ Tự động
// @match        https://newinsite.thegioididong.com/office/thuong-nhan-vien*
// @match        https://dashboard.pro.vn/*
// @match        http://127.0.0.1:5173/*
// @match        http://127.0.0.1:5174/*
// @match        http://127.0.0.1/*
// @match        http://localhost:5173/*
// @match        http://localhost:5174/*
// @match        http://localhost/*
// @match        https://localhost/*
// @match        https://bi.thegioididong.com/*
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

  // ====== TRANG BI: AutoClick+ mở nút dấu cộng + tự copy ======
  const BI_HOSTNAME = 'bi.thegioididong.com';

  function initBiPage() {
    const ACP_BTN_ID = 'acp-laptop-btn';
    const ACP_MSG_ID = 'acp-laptop-msg';
    const ACP_DELAY = 55;
    const ACP_BATCH_SIZE = 6;
    const ACP_BATCH_PAUSE = 220;
    const ACP_UI_THROTTLE = 140;

    let acpRunning = false;
    let acpLastUiUpdate = 0;

    const yieldToBrowser = () =>
      new Promise(resolve => {
        requestAnimationFrame(() => setTimeout(resolve, 0));
      });

    // Lấy danh sách tất cả document có thể đọc được (document chính + iframe cùng nguồn)
    function getReadableDocuments() {
      const docs = [document];
      document.querySelectorAll('iframe').forEach(iframe => {
        try {
          const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
          if (iframeDoc && iframeDoc.body) {
            docs.push(iframeDoc);
          }
        } catch (e) {
          // Bỏ qua iframe khác nguồn dính CORS
        }
      });
      return docs;
    }

    // Kiểm tra xem có biểu tượng xoay tròn / loading spinner nào đang hiển thị trên trang hoặc iframe hay không
    function hasActiveSpinners() {
      const docs = getReadableDocuments();
      const selectors = [
        '.dx-loadindicator', '.dx-loadpanel', '.dx-loadpanel-content', '.dx-loadpanel-wrapper',
        '.dx-overlay-wrapper', '[class*="loadpanel"]', '[class*="indicator"]',
        '.fa-spinner', '.fa-spin', '.fa-circle-notch',
        '[class*="animate-spin"]', '[class*="loading-spinner"]',
        'svg.animate-spin', 'div.loading'
      ];
      for (const doc of docs) {
        if (!doc.body) continue;
        for (const sel of selectors) {
          const els = doc.querySelectorAll(sel);
          for (const el of els) {
            if (isVisible(el)) return true;
          }
        }
      }
      return false;
    }

    // Chờ cho tất cả loading spinners biến mất hoàn toàn và ổn định 400ms trước khi trích xuất dữ liệu copy
    async function waitForSpinnersToClear(maxWaitMs = 8000) {
      const start = performance.now();
      while (performance.now() - start < maxWaitMs) {
        if (!hasActiveSpinners()) {
          await sleep(400);
          if (!hasActiveSpinners()) return true;
        }
        await sleep(150);
      }
      return false;
    }

    // Chờ DOM "ổn định" sau một hành động (vd click mở hàng): gom các node được thêm mới,
    // dừng khi không còn mutation nào trong `quietMs`, hoặc tối đa `maxMs` (phòng trường hợp
    // trang tải bất đồng bộ chậm/không bao giờ dừng mutate).
    function waitForDomSettle(triggerFn, { quietMs = 120, maxMs = 900 } = {}) {
      return new Promise(resolve => {
        const addedNodes = [];
        let quietTimer = null;
        let maxTimer = null;
        let done = false;

        const finish = () => {
          if (done) return;
          done = true;
          observer.disconnect();
          clearTimeout(quietTimer);
          clearTimeout(maxTimer);
          resolve(addedNodes);
        };

        const scheduleQuiet = () => {
          clearTimeout(quietTimer);
          quietTimer = setTimeout(finish, quietMs);
        };

        const observer = new MutationObserver(mutations => {
          for (const m of mutations) {
            m.addedNodes.forEach(n => addedNodes.push(n));
          }
          scheduleQuiet();
        });
        observer.observe(document.body, { childList: true, subtree: true });

        maxTimer = setTimeout(finish, maxMs);
        scheduleQuiet(); // trường hợp click không gây mutation nào (hàng trống, đã mở sẵn, v.v.)
        triggerFn();
      });
    }

    // --- Kiểm tra trạng thái đã mở rộng của hàng (thuật toán Bookmarklet) ---
    function isAlreadyOpened(el) {
      if (!el || !el.isConnected) return false;
      if (el.dataset && el.dataset.clickPlusDone === '1') return true;

      const clickable = el.closest ? el.closest('button, a, [role="button"], .cursor-pointer, tr, td, div') : null;
      if (!clickable) return false;

      if (clickable.dataset && clickable.dataset.clickPlusDone === '1') return true;
      if (clickable.getAttribute('aria-expanded') === 'true') return true;
      if (clickable.getAttribute('data-state') === 'open') return true;
      if (clickable.querySelector('.fa-minus, .dx-datagrid-group-opened, .dx-command-collapse')) return true;

      return false;
    }

    // --- Tìm nút dấu cộng (quét cả document chính lẫn iframe cùng nguồn) ---
    function isPlusButton(el) {
      if (!el || !el.isConnected) return false;

      // Đã đánh dấu click qua dataset hoặc đã mở rộng -> BỎ QUA TUYỆT ĐỐI
      if (el.dataset && el.dataset.clickPlusDone === '1') return false;
      if (isAlreadyOpened(el)) return false;

      // 1. Kiểm tra class đã mở (nút trừ / collapse)
      if (el.classList) {
        if (el.classList.contains('fa-minus') ||
            el.classList.contains('dx-datagrid-group-opened') ||
            el.classList.contains('dx-command-collapse')) {
          return false;
        }
      }

      const parentTd = el.closest ? el.closest('td') : null;
      if (parentTd && parentTd.classList && parentTd.classList.contains('dx-command-collapse')) {
        return false;
      }

      const parentTr = el.closest ? el.closest('tr') : null;
      if (parentTr && parentTr.classList &&
          (parentTr.classList.contains('dx-datagrid-group-opened') || parentTr.getAttribute('aria-expanded') === 'true')) {
        return false;
      }

      // 2. Kiểm tra nếu là nút cộng / chưa mở
      if (el.classList) {
        if (el.classList.contains('fa-plus') ||
            el.classList.contains('dx-datagrid-group-closed') ||
            el.classList.contains('dx-icon-expandcompleted')) {
          return true;
        }
      }

      if (parentTd && parentTd.classList && parentTd.classList.contains('dx-command-expand')) {
        return true;
      }

      return false;
    }

    function isVisible(el) {
      return Boolean(el && el.isConnected && el.getClientRects().length > 0);
    }

    function getRowContainer(el) {
      if (!el) return null;
      const tableRow = el.closest('tr') || el.closest('td');
      if (tableRow) return tableRow;

      // Hỗ trợ cấu trúc div của DevExpress (dx-row, v.v.) hoặc các hàng ảo
      let cur = el.parentElement;
      while (cur && cur !== document.body) {
        if (cur.classList) {
          for (const cls of cur.classList) {
            const clsLower = cls.toLowerCase();
            if (clsLower.includes('row') || clsLower.includes('td') || clsLower.includes('tr')) {
              return cur;
            }
          }
        }
        cur = cur.parentElement;
      }
      return el.parentElement;
    }

    function getPlusButtons(excludeRows) {
      const allButtons = [];
      const queryDocs = getReadableDocuments();
      const selectors = [
        '.fa-solid.fa-plus.text-gray-700',
        '.fa-plus',
        '.dx-datagrid-group-closed',
        'td.dx-command-expand'
      ];

      for (const doc of queryDocs) {
        if (!doc.body) continue;
        for (const sel of selectors) {
          try {
            const found = Array.from(doc.querySelectorAll(sel));
            if (found.length > 0) {
              allButtons.push(...found);
            }
          } catch (e) {}
        }
      }

      const validButtons = allButtons
        .filter(el => isVisible(el))
        .filter(el => isPlusButton(el))
        .filter(el => !isAlreadyOpened(el))
        .filter(el => el.dataset?.clickPlusDone !== '1');

      const uniqueButtons = Array.from(new Set(validButtons));

      // Bước A: Loại bỏ các thẻ cha bao ngoài nếu thẻ con của nó cũng nằm trong danh sách click (chỉ giữ phần tử sâu nhất)
      const deepestButtons = uniqueButtons.filter(btnA => {
        const hasDescendant = uniqueButtons.some(btnB => btnB !== btnA && btnA.contains(btnB));
        return !hasDescendant;
      });

      // Bước B: Đảm bảo chỉ click tối đa một lần trên mỗi hàng (row container) để tránh trigger click đúp do nổi bọt sự kiện.
      const finalButtons = [];
      const seenRows = new Set();

      for (const btn of deepestButtons) {
        const row = getRowContainer(btn) || btn;
        if (excludeRows && (excludeRows.has(btn) || excludeRows.has(row))) {
          continue;
        }
        if (seenRows.has(row) || isAlreadyOpened(row)) {
          continue;
        }
        seenRows.add(row);
        finalButtons.push(btn);
      }

      return finalButtons;
    }



    // Lấy nội dung text của các node vừa được thêm vào DOM bởi một click (dùng chung với waitForDomSettle).
    function extractAddedText(nodes) {
      const isOwnUi = (el) => (
        el.id === ACP_BTN_ID || el.id === ACP_MSG_ID ||
        Boolean(el.closest?.(`#${ACP_BTN_ID}, #${ACP_MSG_ID}`))
      );

      const candidates = nodes.filter(n => {
        if (!n || !n.isConnected) return false;
        if (n.nodeType !== 1 && n.nodeType !== 3) return false;
        const el = n.nodeType === 1 ? n : n.parentElement;
        return Boolean(el) && !isOwnUi(el);
      });

      const topLevel = candidates.filter(nodeA => (
        !candidates.some(nodeB => nodeB !== nodeA && nodeB.nodeType === 1 && nodeB.contains(nodeA))
      ));

      return topLevel
        .map(n => ((n.nodeType === 1 ? n.innerText : n.textContent) || '').trim())
        .filter(Boolean)
        .join('\n');
    }

    // --- Giao diện ---
    function closeAcpMessage() {
      document.getElementById(ACP_MSG_ID)?.remove();
    }

    function getAcpButton() {
      return document.getElementById(ACP_BTN_ID);
    }

    function refreshAcpButtonLabel() {
      const btn = getAcpButton();
      if (!btn || acpRunning) return;
      const count = getPlusButtons().length;
      btn.textContent = count > 0 ? '⚡ Click+' : '📋 Copy Click+';
    }

    function createAcpButton() {
      if (!document.body || getAcpButton()) return;
      const btn = document.createElement('button');
      btn.id = ACP_BTN_ID;
      btn.type = 'button';
      btn.textContent = '⚡ Click+';
      btn.style.cssText = `
        position:fixed;right:20px;bottom:80px;z-index:2147483647;
        min-width:140px;padding:12px 22px;border:1px solid rgba(255,255,255,0.3);border-radius:999px;
        background:linear-gradient(135deg,#2563eb 0%,#1d4ed8 100%);color:#fff;
        box-shadow:0 8px 25px rgba(37,99,235,0.4),0 2px 8px rgba(0,0,0,0.15);
        font:700 14px system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
        letter-spacing:0.3px;cursor:pointer;user-select:none;
        transition:all 0.25s cubic-bezier(0.4,0,0.2,1);backdrop-filter:blur(8px);
      `;
      btn.addEventListener('mouseenter', () => {
        if (!acpRunning) {
          btn.style.transform = 'translateY(-2px) scale(1.03)';
          btn.style.boxShadow = '0 12px 30px rgba(37,99,235,0.5),0 4px 12px rgba(0,0,0,0.2)';
        }
      });
      btn.addEventListener('mouseleave', () => {
        if (!acpRunning) {
          btn.style.transform = 'translateY(0) scale(1)';
          btn.style.boxShadow = '0 8px 25px rgba(37,99,235,0.4),0 2px 8px rgba(0,0,0,0.15)';
        }
      });
      btn.addEventListener('mousedown', () => {
        if (!acpRunning) btn.style.transform = 'translateY(0) scale(0.97)';
      });
      btn.addEventListener('mouseup', () => {
        if (!acpRunning) btn.style.transform = 'translateY(-2px) scale(1.03)';
      });
      btn.addEventListener('click', runAutoClick);
      document.body.appendChild(btn);
      refreshAcpButtonLabel();

      // Tự động quét lại nhãn nút định kỳ 1s/lần (bắt kịp sự kiện đổi tab / AJAX swap DOM)
      setInterval(refreshAcpButtonLabel, 1000);
    }



    function showAcpMessage({ title, message = '', success = true, showCopyButton = false, autoClose = true, copyText = null }) {
      closeAcpMessage();
      const box = document.createElement('div');
      box.id = ACP_MSG_ID;
      
      const bgColor = success ? '#f0fdf4' : '#fee2e2';
      const textColor = success ? '#166534' : '#991b1b';
      const borderColor = success ? '#bbf7d0' : '#fca5a5';
      const shadowColor = success ? 'rgba(22, 101, 52, 0.12)' : 'rgba(153, 27, 27, 0.12)';

      box.style.cssText = `
        position:fixed;top:20px;right:20px;z-index:2147483647;
        width:310px;max-width:calc(100vw - 40px);padding:14px 16px;
        border-radius:12px;background:${bgColor};color:${textColor};
        border:1px solid ${borderColor};box-shadow:0 8px 25px ${shadowColor};
        font:14px Arial,sans-serif;
      `;
      const titleEl = document.createElement('div');
      titleEl.style.cssText = 'margin-bottom:6px;font-size:15px;font-weight:700;';
      titleEl.textContent = title;
      box.appendChild(titleEl);
      if (message) {
        const msgEl = document.createElement('div');
        msgEl.innerHTML = message;
        box.appendChild(msgEl);
      }
      if (showCopyButton) {
        const copyBtn = document.createElement('button');
        copyBtn.type = 'button';
        copyBtn.textContent = '📋 Copy ngay';
        copyBtn.style.cssText = `
          width:100%;margin-top:12px;padding:10px;border:0;border-radius:8px;
          background:${textColor};color:#fff;font-weight:700;cursor:pointer;
          box-shadow:0 4px 10px rgba(0,0,0,0.1);transition:opacity 0.2s;
        `;
        copyBtn.addEventListener('mouseenter', () => { copyBtn.style.opacity = '0.9'; });
        copyBtn.addEventListener('mouseleave', () => { copyBtn.style.opacity = '1'; });
        copyBtn.onclick = async () => {
          copyBtn.disabled = true;
          copyBtn.textContent = 'Đang copy...';
          const copied = copyText != null ? await copyTextToClipboard(copyText) : await copyBiPageText();
          if (copied) {
            box.style.background = '#f0fdf4';
            box.style.color = '#166534';
            box.style.borderColor = '#bbf7d0';
            box.innerHTML = '✅ Đã copy toàn bộ nội dung.';
            setTimeout(closeAcpMessage, 1800);
          } else {
            copyBtn.disabled = false;
            copyBtn.textContent = '📋 Thử copy lại';
          }
        };
        box.appendChild(copyBtn);
      }
      document.body.appendChild(box);
      if (autoClose && !showCopyButton) setTimeout(closeAcpMessage, 3500);
      return box;
    }

    function showAcpProgress(total, onCancel) {
      closeAcpMessage();
      const box = document.createElement('div');
      box.id = ACP_MSG_ID;
      box.style.cssText = `
        position:fixed;top:20px;right:20px;z-index:2147483647;
        width:310px;max-width:calc(100vw - 40px);padding:14px 16px;
        border-radius:12px;background:linear-gradient(135deg,#0284c7,#2563eb);
        color:#fff;box-shadow:0 8px 25px rgba(0,0,0,.28);
        font:14px Arial,sans-serif;
      `;
      box.innerHTML = `
        <div data-role="title" style="font-size:15px;font-weight:700;margin-bottom:8px">Đang mở rộng dữ liệu...</div>
        <div data-role="progress">0 / ${total}</div>
        <div data-role="time" style="margin-top:5px;font-size:13px;opacity:.95">Thời gian: 0.0 giây</div>
        <div style="height:8px;margin-top:10px;overflow:hidden;border-radius:99px;background:rgba(255,255,255,.25)">
          <div data-role="bar" style="width:0%;height:100%;border-radius:99px;background:#fff"></div>
        </div>
        <button type="button" data-role="cancel" style="margin-top:12px;width:100%;padding:8px;border:0;border-radius:8px;background:rgba(255,255,255,0.2);color:#fff;font-weight:700;cursor:pointer;font-size:12px;transition:background 0.2s;">⏹ Dừng lại</button>
      `;
      const cancelBtn = box.querySelector('[data-role="cancel"]');
      cancelBtn.addEventListener('click', onCancel);
      cancelBtn.addEventListener('mouseenter', () => { cancelBtn.style.background = 'rgba(255,255,255,0.3)'; });
      cancelBtn.addEventListener('mouseleave', () => { cancelBtn.style.background = 'rgba(255,255,255,0.2)'; });
      document.body.appendChild(box);
      return {
        box,
        title: box.querySelector('[data-role="title"]'),
        progress: box.querySelector('[data-role="progress"]'),
        time: box.querySelector('[data-role="time"]'),
        bar: box.querySelector('[data-role="bar"]'),
      };
    }

    function updateAcpProgress(ui, processed, total, clicked, startedAt, force = false) {
      const now = performance.now();
      if (!force && now - acpLastUiUpdate < ACP_UI_THROTTLE) return;
      acpLastUiUpdate = now;
      const percent = total ? Math.round((processed / total) * 100) : 100;
      const elapsed = ((now - startedAt) / 1000).toFixed(1);
      ui.progress.textContent = `${processed} / ${total} — đã mở ${clicked}`;
      ui.time.textContent = `Thời gian: ${elapsed} giây`;
      ui.bar.style.width = `${percent}%`;
      const btn = getAcpButton();
      if (btn) btn.textContent = `Đang mở ${processed}/${total}`;
    }

    // --- Copy nội dung ---
    // Đọc và chuyển đổi tất cả thẻ <table> trong document/iframe thành định dạng TSV chuẩn (\t giữa các cột, \n giữa các dòng).
    // Tự động lọc bỏ các phần tử rác DevExpress (.dx-datagrid-content-fixed, .dx-hidden, aria-hidden), ô undefined và dòng trùng lặp.
    function getBiPageText() {
      const btn = getAcpButton();
      const msg = document.getElementById(ACP_MSG_ID);
      const oldBtnDisplay = btn?.style.display;
      const oldMsgDisplay = msg?.style.display;
      if (btn) btn.style.display = 'none';
      if (msg) msg.style.display = 'none';

      const isOwnUi = (el) => Boolean(el && (el.id === ACP_BTN_ID || el.id === ACP_MSG_ID || el.closest?.(`#${ACP_BTN_ID}, #${ACP_MSG_ID}`)));

      const isHiddenOrDup = (el) => {
        if (!el) return true;
        if (el.closest?.('.dx-datagrid-content-fixed, .dx-hidden, .dx-invisible, [aria-hidden="true"], .dx-aria-element, .dx-datagrid-filter-row')) return true;
        return false;
      };

      try {
        const docs = getReadableDocuments();
        const extractedSections = [];

        for (const doc of docs) {
          if (!doc.body) continue;

          // 1. Quét các thẻ <table> chuẩn, bỏ qua bảng chứa cột cố định trùng lặp (.dx-datagrid-content-fixed)
          const tables = Array.from(doc.querySelectorAll('table')).filter(t => !isOwnUi(t) && !isHiddenOrDup(t));
          if (tables.length > 0) {
            for (const table of tables) {
              const rows = Array.from(table.querySelectorAll('tr')).filter(r => !isOwnUi(r) && !isHiddenOrDup(r));
              if (!rows.length) continue;

              const tableLines = [];
              for (const tr of rows) {
                const cells = Array.from(tr.querySelectorAll('th, td')).filter(c => !isOwnUi(c) && !isHiddenOrDup(c));
                if (!cells.length) continue;

                const cellTexts = cells.map(cell => {
                  const raw = cell.innerText || cell.textContent || '';
                  const clean = raw.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
                  return (clean === 'undefined' || clean === 'null') ? '' : clean;
                });

                // Nếu tất cả ô trong dòng đều rỗng -> bỏ qua dòng trống này
                if (cellTexts.every(txt => txt === '')) continue;

                tableLines.push(cellTexts.join('\t'));
              }

              if (tableLines.length > 0) {
                extractedSections.push(tableLines.join('\n'));
              }
            }
          }

          // 2. Nếu không tìm thấy thẻ <table> hoặc cần lấy thêm innerText tổng thể làm fallback
          if (extractedSections.length === 0) {
            const bodyText = (doc.body.innerText || '').trim();
            if (bodyText) {
              extractedSections.push(bodyText);
            }
          }
        }

        const rawFullText = extractedSections.filter(Boolean).join('\n\n').trim();
        const lines = rawFullText.split('\n');
        const cleanLines = [];
        let lastLine = null;

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) {
            if (cleanLines.length > 0 && cleanLines[cleanLines.length - 1] !== '') {
              cleanLines.push('');
            }
            continue;
          }
          // Khử trùng lặp dòng liền kề giống hệt nhau
          if (trimmed === lastLine) continue;

          // Bỏ qua các dòng rác chứa từ khóa undefined rác của DevExpress
          const noTabStr = trimmed.replace(/[\t\s]/g, '');
          if (noTabStr === 'undefined' || noTabStr.includes('undefined0.00undefined') || noTabStr.startsWith('undefined')) continue;

          cleanLines.push(line);
          lastLine = trimmed;
        }

        return cleanLines.join('\n').trim();
      } finally {
        if (btn) btn.style.display = oldBtnDisplay || '';
        if (msg) msg.style.display = oldMsgDisplay || '';
      }
    }

    // Copy bằng cách BÔI ĐEN (Range/Selection) toàn trang (kể cả trong iframe) rồi để trình duyệt tự copy gốc
    async function copyEverythingNatively() {
      const btn = getAcpButton();
      const msg = document.getElementById(ACP_MSG_ID);
      const oldBtnDisplay = btn?.style.display;
      const oldMsgDisplay = msg?.style.display;
      if (btn) btn.style.display = 'none';
      if (msg) msg.style.display = 'none';
      try {
        let copied = false;
        const docs = getReadableDocuments();

        for (const doc of docs) {
          if (!doc.body) continue;
          try {
            const win = doc.defaultView || window;
            const range = doc.createRange();
            range.selectNodeContents(doc.body);
            const selection = win.getSelection ? win.getSelection() : window.getSelection();
            if (selection) {
              selection.removeAllRanges();
              selection.addRange(range);
            }
            await sleep(150);
            if (doc.execCommand) {
              copied = doc.execCommand('copy') || copied;
            } else if (document.execCommand) {
              copied = document.execCommand('copy') || copied;
            }
            if (selection) selection.removeAllRanges();
          } catch (e) {
            console.warn('AutoClick+ copyEverythingNatively error on doc:', e);
          }
        }
        return copied;
      } finally {
        if (btn) btn.style.display = oldBtnDisplay || '';
        if (msg) msg.style.display = oldMsgDisplay || '';
      }
    }

    async function copyUsingClipboardApi(text) {
      if (!navigator.clipboard || !window.isSecureContext) return false;
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch { return false; }
    }

    function copyUsingTextarea(text) {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;left:-9999px;top:0;width:1px;height:1px;opacity:0;pointer-events:none;';
      document.body.appendChild(ta);
      ta.focus({ preventScroll: true });
      ta.select();
      ta.setSelectionRange(0, ta.value.length);
      let copied = false;
      try { copied = document.execCommand('copy'); } catch { copied = false; }
      ta.remove();
      window.getSelection()?.removeAllRanges();
      return copied;
    }

    async function copyTextToClipboard(text) {
      if (!text) return false;

      // 1. Ưu tiên tuyệt đối GM_setClipboard (Đặc quyền Tampermonkey - KHÔNG BAO GIỜ bị chặn)
      try {
        if (typeof GM_setClipboard !== 'undefined') {
          GM_setClipboard(text);
          return true;
        }
      } catch (e) {
        console.warn('AutoClick+ GM_setClipboard error:', e);
      }

      // 2. Dự phòng 1: Clipboard API
      const ok = await copyUsingClipboardApi(text);
      if (ok) return true;

      // 3. Dự phòng 2: Textarea document.execCommand
      return copyUsingTextarea(text);
    }

    async function copyBiPageText() {
      await yieldToBrowser();
      return copyTextToClipboard(getBiPageText());
    }

    // --- Chạy AutoClick ---
    async function runAutoClick() {
      if (acpRunning) {
        showAcpMessage({ title: '⚠️ AutoClick+ đang chạy', message: 'Không cần bấm thêm lần nữa.', success: false });
        return;
      }
      acpRunning = true;
      closeAcpMessage();
      const btn = getAcpButton();
      if (btn) { btn.disabled = true; btn.style.cursor = 'wait'; btn.style.background = '#475569'; }

      let userStop = false;
      const onUserCancel = () => {
        userStop = true;
        showAcpMessage({ title: '⏹ Đang dừng lại...', message: 'Vui lòng đợi giây lát.', success: false });
      };

      const ACP_MAX_ROUNDS = 1;         // Mỗi lần click Click+ chỉ mở đúng 1 cấp dấu cộng
      const ACP_CLICK_BATCH_SIZE = 6;  // Giảm kích thước lô từ 20 xuống 6 nút để tránh nghẽn luồng sự kiện
      const ACP_CLICK_DELAY = 35;      // Micro-delay 35ms giữa các cú click trong lô
      const ACP_BATCH_YIELD = 180;     // Nghỉ 180ms giữa các lô giúp UI và Network stack xử lý mượt mà

      const startedAt = performance.now();
      let clicked = 0;
      let seenTotal = 0;
      let round = 0;
      const clickedItems = new Set();

      const accumulatedChunks = [];
      let pending = getPlusButtons(clickedItems);
      const ui = showAcpProgress(pending.length, onUserCancel);

      try {
        while (!userStop && pending.length && round < ACP_MAX_ROUNDS) {
          round++;
          seenTotal += pending.length;

          for (let i = 0; i < pending.length && !userStop; i += ACP_CLICK_BATCH_SIZE) {
            const batch = pending.slice(i, i + ACP_CLICK_BATCH_SIZE);

            try {
              const addedNodes = await waitForDomSettle(async () => {
                for (const pb of batch) {
                  const row = getRowContainer(pb) || pb;
                  // Kiểm tra lại trước khi click: nếu đã mở hoặc không còn là nút plus -> bỏ qua ngay (chống thu gọn lại)
                  if (!isPlusButton(pb) || isAlreadyOpened(pb)) continue;

                  if (pb.dataset) pb.dataset.clickPlusDone = '1';
                  if (row.dataset) row.dataset.clickPlusDone = '1';

                  clickedItems.add(pb);
                  clickedItems.add(row);
                  try {
                    pb.click();
                    clicked++;
                  } catch (err) {
                    console.warn('AutoClick+ bỏ qua một nút lỗi:', err);
                  }
                  await sleep(ACP_CLICK_DELAY);
                }

              }, { quietMs: 150, maxMs: 1500 });
              const chunkText = extractAddedText(addedNodes);
              if (chunkText) accumulatedChunks.push(chunkText);
            } catch (err) {
              console.warn('AutoClick+ bỏ qua một lô lỗi:', err);
            }

            updateAcpProgress(ui, clicked, seenTotal, clicked, startedAt);
            await sleep(ACP_BATCH_YIELD);
            await yieldToBrowser();
          }

          if (userStop) break;
        }



        updateAcpProgress(ui, clicked, seenTotal, clicked, startedAt, true);
        ui.title.textContent = userStop ? 'Đang chờ dữ liệu tải xong (Dừng bởi user)...' : 'Đang chờ dữ liệu tải xong...';
        if (btn) btn.textContent = 'Đang tải dữ liệu...';
        await yieldToBrowser();

        // Chờ cho tất cả loading spinners / biểu tượng xoay tròn biến mất hoàn toàn và ổn định trước khi đọc DOM
        await waitForSpinnersToClear(8000);

        if (btn) btn.textContent = 'Đang copy...';
        await yieldToBrowser();

        // Đọc dữ liệu DOM hoàn chỉnh hiện tại sau khi đã mở các hàng và dữ liệu tải xong
        const currentFullText = getBiPageText();
        let finalText = currentFullText;


        // Nếu có các đoạn dữ liệu thu thập được từ các hàng tự đóng lại trước đó, bổ sung các đoạn còn thiếu
        if (accumulatedChunks.length > 0) {
          const missingChunks = accumulatedChunks.filter(chunk => chunk && !currentFullText.includes(chunk));
          if (missingChunks.length > 0) {
            finalText = [currentFullText, ...missingChunks].join('\n\n');
          }
        }

        // Tự động copy toàn bộ dữ liệu vào Clipboard (ưu tiên GM_setClipboard chuẩn TSV)
        let copied = await copyTextToClipboard(finalText);
        if (!copied) {
          // Chỉ dùng dự phòng copyEverythingNatively khi GM_setClipboard / Clipboard API thất bại hoàn toàn
          copied = await copyEverythingNatively();
        }

        const elapsed = ((performance.now() - startedAt) / 1000).toFixed(1);
        if (copied) {
          showAcpMessage({
            title: userStop ? '⏹ Đã dừng lại' : '✅ Đã mở 1 cấp & Copy All',
            message: `Đã mở <b>${clicked}/${seenTotal}</b> mục cấp này.<br>Đã tự động Copy All toàn bộ dữ liệu sạch vào Clipboard.<br>Thời gian: ${elapsed} giây.`,
            success: !userStop,
          });
          if (btn) btn.textContent = userStop ? '⏹ Đã dừng' : '✅ Đã Copy All';
        } else {
          showAcpMessage({
            title: '⚠️ Trình duyệt chặn tự copy',
            message: `Đã mở <b>${clicked}/${seenTotal}</b> mục.<br>Bấm nút bên dưới để copy.`,
            success: false, showCopyButton: true, autoClose: false, copyText: finalText,
          });
          if (btn) btn.textContent = '📋 Copy thủ công';
        }


      } catch (error) {
        console.error('AutoClick+ lỗi:', error);
        showAcpMessage({
          title: '⚠️ Không thể hoàn tất',
          message: 'Trang có thể đang tải hoặc thay đổi cấu trúc. Mở Console để xem chi tiết.',
          success: false,
        });
      } finally {
        acpRunning = false;
        if (btn) { btn.disabled = false; btn.style.cursor = 'pointer'; btn.style.background = '#2563eb'; }
        setTimeout(refreshAcpButtonLabel, 1800);
      }
    }

    // Khởi tạo nút
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', createAcpButton, { once: true });
    } else {
      createAcpButton();
    }
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
