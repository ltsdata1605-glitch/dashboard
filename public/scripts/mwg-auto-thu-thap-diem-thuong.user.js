// ==UserScript==
// @name         MWG - Tự động lấy điểm thưởng nhân viên
// @namespace    dashboard-ycx
// @version      0.7
// @description  Gọi thẳng API GetReward (mỗi mã NV), parse HTML <table> trả về thành TSV giống hệt copy tay; nối cầu với Dashboard YCX để chạy chế độ Tự động
// @match        https://newinsite.thegioididong.com/office/thuong-nhan-vien*
// @match        https://dashboard.pro.vn/*
// @match        http://127.0.0.1:5173/*
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
  const SCRIPT_VERSION = '0.7';

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

  // ====== TRANG MWG: nút kích hoạt bấm tay + tự dò job đang chờ từ Dashboard ======
  function initMwgPage() {
    const btn = document.createElement('button');
    btn.textContent = '⚡ Thu thập điểm thưởng';
    Object.assign(btn.style, {
      position: 'fixed', bottom: '20px', right: '20px', zIndex: 99999,
      padding: '10px 16px', background: COLOR_PRIMARY, color: '#fff',
      border: 'none', borderRadius: '999px', cursor: 'pointer',
      boxShadow: '0 4px 14px rgba(2,132,199,.35)', fontSize: '14px', fontWeight: '700',
    });
    btn.onclick = () => {
      if (document.getElementById('mwg-thuthap-overlay')) return;
      buildModal(false);
    };
    document.body.appendChild(btn);

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

  // ====== RẼ NHÁNH THEO DOMAIN ======
  if (location.hostname === MWG_HOSTNAME) {
    initMwgPage();
  } else {
    initDashboardPage();
  }
})();
