// ==UserScript==
// @name         MWG - Tự động thu thập điểm thưởng nhân viên
// @namespace    dashboard-ycx
// @version      0.4
// @description  Gọi thẳng API GetReward (mỗi mã NV), parse HTML <table> trả về thành TSV giống hệt copy tay, hiện kết quả để tự copy (dùng cookie phiên có sẵn)
// @match        https://newinsite.thegioididong.com/office/thuong-nhan-vien*
// @grant        GM_setClipboard
// ==/UserScript==

/*
 * ĐÃ CHẠY THẬT THÀNH CÔNG (test 27 mã NV, không mã nào lỗi):
 * - Tham số ngày: dtmFromDate / dtmToDate, định dạng mm/dd/yyyy (vd 07/01/2026 =
 *   ngày 1/7/2026). Hộp thoại cho gõ theo dd/mm/yyyy (giống cách site hiển thị ngày
 *   trong bảng kết quả), script tự quy đổi 1 chiều sang mm/dd/yyyy trước khi gọi API.
 * - Tham số mã NV: strRewardUser. intRewardPositionID luôn = -1 (không lọc vị trí).
 * - Cookie phiên có sẵn (credentials: 'include') là đủ để gọi API, không cần token gì thêm.
 * - Response là HTML <table> 2 tầng header (mỗi nhóm ngành hàng colspan=4, riêng
 *   2 cột cuối "Tổng Đơn"/"Tổng thưởng" không có nhóm cha ở tầng 1). Script duyệt
 *   nguyên <tr>/<td> theo đúng thứ tự DOM, KHÔNG giãn colspan/rowspan — đúng hệt cách
 *   trình duyệt tạo phần plain-text khi Ctrl+C cả bảng, nên header 2 tầng và dòng
 *   "Tổng cộng" ra y hệt lúc copy tay (không lọc bớt dòng nào).
 *
 * LỖI ĐÃ GẶP VÀ ĐÃ SỬA: chạy xong 27 mã NV báo "đã copy" nhưng clipboard thực ra
 * trống — do vòng lặp fetch tuần tự mất hàng chục giây, tới lúc gọi copy thì "cú click"
 * ban đầu đã hết hạn nên trình duyệt/Tampermonkey âm thầm chặn lệnh ghi clipboard
 * (không báo lỗi). Từ bản này: kết quả hiện ngay trong hộp thoại (đã tự bôi đen sẵn),
 * bấm nút "Copy vào clipboard" là một cú click mới nên luôn chắc chắn ăn; nếu vẫn
 * không ăn thì Ctrl+C thủ công trên vùng đã bôi đen.
 */

(function () {
  'use strict';

  // ====== CẤU HÌNH ======
  const STORAGE_KEY_LIST = 'mwg_thuthap_employee_list';
  const API_URL = 'https://newinsite.thegioididong.com/office/RewardPoint/RewardPoint/GetReward';
  const DELAY_MS = 700; // nghỉ giữa các lượt gọi API, tránh bị chặn

  // ====== TIỆN ÍCH CHUNG ======
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const pad2 = (n) => String(n).padStart(2, '0');

  // Site hiển thị ngày kiểu Việt Nam dd/mm/yyyy (khớp mẫu response: "01/07/2026" = 1/7).
  function toDDMMYYYY(date) {
    return `${pad2(date.getDate())}/${pad2(date.getMonth() + 1)}/${date.getFullYear()}`;
  }

  function getDefaultDateRange() {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from: toDDMMYYYY(from), to: toDDMMYYYY(now) };
  }

  // API xác nhận cần dtmFromDate/dtmToDate dạng mm/dd/yyyy (vd dtmFromDate=07/01/2026
  // = ngày 1/7/2026) — quy đổi 1 chiều duy nhất từ ô nhập dd/mm/yyyy, không đoán định dạng.
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
  // Nhánh chính (đã xác nhận qua mẫu thật): GetReward trả HTML <table> 2 tầng header.
  // Giữ nhánh JSON và text thô làm dự phòng, phòng khi gặp response ở dạng khác.
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

  // Duyệt nguyên <tr>/<td> theo đúng thứ tự DOM, KHÔNG giãn colspan/rowspan — đây
  // chính xác là cách trình duyệt tạo phần plain-text khi Ctrl+C cả bảng, nên header
  // 2 tầng và dòng "Tổng cộng" ra y hệt lúc copy tay (không lọc bớt tr nào theo class).
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

  // ====== HỘP THOẠI NHẬP DANH SÁCH & CHẠY ======
  function buildModal() {
    const overlay = document.createElement('div');
    overlay.id = 'mwg-thuthap-overlay';
    Object.assign(overlay.style, {
      position: 'fixed', inset: '0', background: 'rgba(0,0,0,.5)',
      zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center',
    });

    const box = document.createElement('div');
    Object.assign(box.style, {
      background: '#fff', borderRadius: '12px', padding: '20px',
      width: '520px', maxWidth: '92vw', maxHeight: '88vh', overflow: 'auto',
      boxShadow: '0 10px 40px rgba(0,0,0,.3)', fontFamily: 'system-ui, sans-serif',
      fontSize: '14px', color: '#1e293b',
    });

    box.innerHTML = `
      <h3 style="margin:0 0 12px;font-size:16px;font-weight:800;">⚡ Thu thập điểm thưởng nhân viên</h3>
      <label style="display:block;font-weight:600;margin-bottom:4px;">Danh sách mã NV (mỗi dòng 1 mã)</label>
      <textarea id="mwg-emp-list" rows="8" style="width:100%;box-sizing:border-box;font-family:monospace;font-size:13px;padding:8px;border:1px solid #cbd5e1;border-radius:8px;"></textarea>
      <div style="display:flex;gap:10px;margin-top:10px;">
        <div style="flex:1;">
          <label style="display:block;font-weight:600;margin-bottom:4px;">Từ ngày (dd/mm/yyyy)</label>
          <input id="mwg-date-from" type="text" style="width:100%;box-sizing:border-box;padding:6px 8px;border:1px solid #cbd5e1;border-radius:8px;">
        </div>
        <div style="flex:1;">
          <label style="display:block;font-weight:600;margin-bottom:4px;">Đến ngày (dd/mm/yyyy)</label>
          <input id="mwg-date-to" type="text" style="width:100%;box-sizing:border-box;padding:6px 8px;border:1px solid #cbd5e1;border-radius:8px;">
        </div>
      </div>
      <p id="mwg-progress" style="min-height:36px;margin:12px 0;font-size:13px;color:#475569;white-space:pre-wrap;"></p>
      <div id="mwg-result-wrap" style="display:none;margin-bottom:12px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
          <label style="font-weight:600;">Kết quả (đã tự bôi đen sẵn — Ctrl+C nếu nút Copy không ăn)</label>
          <button id="mwg-btn-copy" type="button" style="padding:4px 10px;border-radius:6px;border:1px solid #cbd5e1;background:#fff;cursor:pointer;font-size:12px;">📋 Copy vào clipboard</button>
        </div>
        <textarea id="mwg-result" rows="6" readonly style="width:100%;box-sizing:border-box;font-family:monospace;font-size:12px;padding:8px;border:1px solid #cbd5e1;border-radius:8px;background:#f8fafc;"></textarea>
      </div>
      <div style="display:flex;justify-content:flex-end;gap:8px;">
        <button id="mwg-btn-close" style="padding:8px 14px;border-radius:8px;border:1px solid #cbd5e1;background:#fff;cursor:pointer;">Đóng</button>
        <button id="mwg-btn-start" style="padding:8px 16px;border-radius:8px;border:none;background:#1a73e8;color:#fff;font-weight:700;cursor:pointer;">Bắt đầu</button>
      </div>
    `;

    overlay.appendChild(box);
    document.body.appendChild(overlay);

    const els = {
      textarea: box.querySelector('#mwg-emp-list'),
      dateFrom: box.querySelector('#mwg-date-from'),
      dateTo: box.querySelector('#mwg-date-to'),
      progress: box.querySelector('#mwg-progress'),
      btnStart: box.querySelector('#mwg-btn-start'),
      btnClose: box.querySelector('#mwg-btn-close'),
      resultWrap: box.querySelector('#mwg-result-wrap'),
      resultTextarea: box.querySelector('#mwg-result'),
      btnCopy: box.querySelector('#mwg-btn-copy'),
    };

    els.textarea.value = loadSavedList();

    const defaultDates = getDefaultDateRange();
    els.dateFrom.value = defaultDates.from;
    els.dateTo.value = defaultDates.to;

    els.btnClose.addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });

    // Nút copy độc lập, bấm trực tiếp -> luôn là 1 cú click "tươi" nên chắc chắn được phép,
    // khác với gọi copy tự động ngay sau vòng lặp fetch dài (dễ bị trình duyệt/Tampermonkey
    // âm thầm chặn vì thao tác click gốc đã hết hạn "user gesture").
    els.btnCopy.addEventListener('click', () => {
      copyToClipboard(els.resultTextarea.value);
      els.resultTextarea.focus();
      els.resultTextarea.select();
      const original = els.btnCopy.textContent;
      els.btnCopy.textContent = '✅ Đã copy!';
      setTimeout(() => { els.btnCopy.textContent = original; }, 1500);
    });

    els.btnStart.addEventListener('click', async () => {
      const listText = els.textarea.value;
      saveList(listText);

      const empIds = parseEmployeeIds(listText);
      if (empIds.length === 0) {
        els.progress.textContent = 'Chưa có mã NV nào trong danh sách.';
        return;
      }

      let fromDateApi, toDateApi;
      try {
        fromDateApi = ddmmyyyyToApiFormat(els.dateFrom.value);
        toDateApi = ddmmyyyyToApiFormat(els.dateTo.value);
      } catch (e) {
        els.progress.textContent = e.message + ' — vui lòng nhập đúng dd/mm/yyyy.';
        return;
      }

      els.btnStart.disabled = true;
      els.btnStart.textContent = 'Đang chạy...';
      els.textarea.disabled = true;
      els.dateFrom.disabled = true;
      els.dateTo.disabled = true;

      const blocks = [];
      const errors = [];

      for (let i = 0; i < empIds.length; i++) {
        const empId = empIds[i];
        els.progress.textContent = `Đang lấy ${i + 1}/${empIds.length}: ${empId}...`;
        try {
          const tsv = await fetchOne(empId, fromDateApi, toDateApi);
          blocks.push(`===${empId}===\n${tsv}`);
        } catch (e) {
          const msg = (e && e.message) || String(e);
          blocks.push(`===${empId}===\nLỖI: ${msg}`);
          errors.push(`${empId}: ${msg}`);
          els.progress.textContent = `Lỗi ở NV ${empId}: ${msg} — đang tiếp tục...`;
        }
        if (i < empIds.length - 1) await sleep(DELAY_MS);
      }

      const output = blocks.join('\n\n');

      // Hiện kết quả ngay trong hộp thoại và tự bôi đen sẵn — không tự động gọi copy ở
      // đây vì vòng lặp fetch có thể mất hàng chục giây, dễ khiến lệnh copy bị chặn âm
      // thầm. Người dùng bấm nút "Copy vào clipboard" (hoặc Ctrl+C thủ công) ngay bên dưới.
      els.resultTextarea.value = output;
      els.resultWrap.style.display = 'block';
      els.resultTextarea.focus();
      els.resultTextarea.select();

      els.btnStart.disabled = false;
      els.btnStart.textContent = 'Bắt đầu';
      els.textarea.disabled = false;
      els.dateFrom.disabled = false;
      els.dateTo.disabled = false;

      if (errors.length === 0) {
        els.progress.textContent = `Xong! Lấy được dữ liệu của ${empIds.length} nhân viên. Bấm "Copy vào clipboard" bên dưới rồi qua Dashboard YCX dán.`;
      } else {
        els.progress.textContent =
          `Xong (có lỗi)! Thành công ${empIds.length - errors.length}/${empIds.length}. Bấm "Copy vào clipboard" bên dưới (đã gồm cả dòng lỗi) rồi dán.\n` +
          `Chi tiết lỗi:\n` + errors.map((e) => '- ' + e).join('\n');
      }
    });
  }

  // ====== NÚT KÍCH HOẠT ======
  const btn = document.createElement('button');
  btn.textContent = '⚡ Thu thập điểm thưởng';
  Object.assign(btn.style, {
    position: 'fixed', bottom: '20px', right: '20px', zIndex: 99999,
    padding: '10px 16px', background: '#1a73e8', color: '#fff',
    border: 'none', borderRadius: '8px', cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(0,0,0,.3)', fontSize: '14px',
  });
  btn.onclick = () => {
    if (document.getElementById('mwg-thuthap-overlay')) return;
    buildModal();
  };
  document.body.appendChild(btn);
})();
