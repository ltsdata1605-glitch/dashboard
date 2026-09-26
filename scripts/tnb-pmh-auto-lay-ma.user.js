// ==UserScript==
// @name         TNB PMH - Tự động lấy mã hàng loạt
// @namespace    dashboard-ycx
// @version      1.0
// @description  Dán danh sách form PMH → tự gộp theo giới hạn 3000 ký tự của ô chat và gửi lần lượt vào phòng admintnb, tự gom mã trả về thành bảng copy nhanh. Chạy trong phiên đăng nhập của CHÍNH BẠN, không gửi dữ liệu ra máy chủ nào khác.
// @author       Dashboard YCX
// @match        https://admintnb.com/room-pmh*
// @match        https://admintnb.com/room-pmh/*
// @grant        GM_setClipboard
// @grant        GM_setValue
// @grant        GM_getValue
// @updateURL    https://dashboard.pro.vn/scripts/tnb-pmh-auto-lay-ma.user.js
// @downloadURL  https://dashboard.pro.vn/scripts/tnb-pmh-auto-lay-ma.user.js
// ==/UserScript==

/*
 * BẢN 1.0 — MÔ HÌNH AN TOÀN: TỰ ĐỘNG HOÁ THAO TÁC CỦA CHÍNH NGƯỜI DÙNG.
 * - Script CHỈ chạy trong tab admintnb.com đã đăng nhập của bạn. Nó làm đúng việc bạn vẫn làm tay:
 *   điền nội dung vào ô "Nhập Nội Dung..." (textarea.tnb-pmh-input) rồi bấm nút GỬI.
 * - KHÔNG có máy chủ trung gian, KHÔNG đọc/gửi mã bảo mật ra ngoài, KHÔNG gọi API ẩn. Toàn bộ dữ
 *   liệu ở lại trong trình duyệt của bạn — giống hệt userscript MWG mà dự án đã dùng.
 * - Ô chat giới hạn 3000 ký tự/tin. Script tự gộp nhiều form vào 1 tin cho tới sát ngưỡng an toàn
 *   (2800 ký tự / tối đa N form), gửi lần lượt có giãn cách để không làm nghẽn phòng chung.
 * - Mã trả về (bong bóng bot ➜ PMH <Loại> : <Mã>) được gom tự động thành bảng, lọc theo đúng Mã
 *   Kho bạn vừa gửi, có nút Copy bảng / Copy mã.
 */

(function () {
  'use strict';

  const MAX_CHARS = 2800;        // ngưỡng an toàn dưới maxlength=3000 của ô chat
  const DEFAULT_PER_MSG = 12;    // số form tối đa gộp vào 1 tin
  const DEFAULT_GAP_SEC = 2.0;   // giãn cách giữa 2 tin (giây)
  const PANEL_ID = 'tnb-pmh-helper';

  // ------------------------------------------------------------------ tiện ích
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const norm = (s) => (s || '').replace(/\r\n/g, '\n').replace(/\u00a0/g, ' ');
  const gmGet = (k, d) => { try { return GM_getValue(k, d); } catch (e) { return d; } };
  const gmSet = (k, v) => { try { GM_setValue(k, v); } catch (e) {} };

  function setReactValue(el, value) {
    const proto = el.tagName === 'TEXTAREA'
      ? window.HTMLTextAreaElement.prototype
      : window.HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
    setter.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function pressEnter(el) {
    for (const type of ['keydown', 'keypress', 'keyup']) {
      el.dispatchEvent(new KeyboardEvent(type, {
        key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true,
      }));
    }
  }

  const findInput = () =>
    $('textarea.tnb-pmh-input') || $('textarea[placeholder*="Nội Dung"]');
  const findSecurityInput = () =>
    $('input.tnb-pmh-security-code') || $('input[placeholder*="Bảo Mật"]');
  const findSendButton = () =>
    $$('button').find((b) => !b.closest('#' + PANEL_ID) && (b.textContent || '').toUpperCase().includes('GỬI')) || null;
  const findMessages = () => $('.tnb-pmh-messages');

  function copy(text) {
    try {
      if (typeof GM_setClipboard === 'function') {
        GM_setClipboard(text, { type: 'text', mimetype: 'text/plain' });
        return true;
      }
    } catch (e) {}
    try { navigator.clipboard.writeText(text); return true; } catch (e) {}
    return false;
  }

  // ------------------------------------------------------ tách & gộp form gửi
  function splitForms(text) {
    // Chuẩn hoá NFC để chữ tiếng Việt gõ dạng tổ hợp (NFD) cũng khớp mốc tách.
    const t = norm(text).normalize('NFC').trim();
    if (!t) return [];
    let parts;
    if (/form\s*m/i.test(t)) {
      // Tách trước mỗi tiêu đề "FORM MẪU"/"ORM MẪU"/"RM MẪU" — bám phần ASCII "FORM M", không lệ
      // thuộc dấu tiếng Việt (tránh lỗi NFC/NFD làm hụt mốc tách).
      parts = t.split(/(?=^[ \t]*(?:📝|✅|☑️)?[ \t]*(?:FORM|ORM|RM)[ \t]*M)/im);
    } else if (/pmh/i.test(t)) {
      // Không có tiêu đề FORM: tách trước mỗi dòng "Loại PMH" ("Lo.i" phủ cả "Loại"/"Loai"/NFD).
      parts = t.split(/(?=^[ \t]*(?:📝|✅)?[ \t]*Lo.{0,2}i[ \t]*PMH)/im);
    } else {
      // Định dạng tự do: tách theo dòng gạch ngăn.
      parts = t.split(/^[ \t]*[-=_]{3,}[ \t]*$/im);
    }
    return parts.map((s) => s.trim()).filter((s) => s.length > 0);
  }

  function chunkForms(forms, perMsg) {
    const chunks = [];
    let cur = [];
    let curLen = 0;
    for (const f of forms) {
      const add = f.length + (cur.length ? 2 : 0);
      if (cur.length && (cur.length >= perMsg || curLen + add > MAX_CHARS)) {
        chunks.push(cur); cur = []; curLen = 0;
      }
      cur.push(f);
      curLen += f.length + (cur.length > 1 ? 2 : 0);
    }
    if (cur.length) chunks.push(cur);
    return chunks.map((c) => c.join('\n\n'));
  }

  function extractKhos(forms) {
    const set = new Set();
    for (const f of forms) {
      const re = /kho[^\n:：]*[:：]?\s*(\d{2,7})/gi;
      let m;
      while ((m = re.exec(f))) set.add(m[1]);
    }
    return set;
  }

  // ---------------------------------------------------- đọc mã từ bong bóng bot
  function parseBotBubble(text) {
    const blocks = norm(text).split(/\n?\s*━{2,}\s*\n?/);
    const out = [];
    for (const b of blocks) {
      const lines = b.split('\n').map((s) => s.trim()).filter(Boolean);
      if (!lines.length) continue;
      let kho = '', ten = '';
      const mStore = (lines[0] || '').match(/^(\d{2,7})\s*-\s*(.+)$/);
      if (mStore) { kho = mStore[1]; ten = mStore[2]; }
      const resLine = lines.find((l) => l.includes('➜')) || '';
      const mOk = resLine.match(/➜\s*PMH\s+(\S+)\s*:\s*([A-Za-z0-9]{4,})/);
      const mErr = resLine.match(/➜\s*❌\s*(.+)$/);
      if (mOk) out.push({ kho, ten, loai: mOk[1], ma: mOk[2], err: '' });
      else if (mErr) out.push({ kho, ten, loai: '', ma: '', err: mErr[1].trim() });
    }
    return out;
  }

  // ------------------------------------------------------------------ trạng thái
  const state = {
    running: false,
    stop: false,
    sentKhos: new Set(),
    results: new Map(),   // key -> {kho,ten,loai,ma}
    errors: [],           // {kho,ten,err}
    seenRows: new Set(),  // data-id đã xử lý (chống trùng)
    showAll: false,
  };

  function ingestBotRow(row) {
    const id = row.getAttribute('data-id') || '';
    if (id && state.seenRows.has(id)) return false;
    if (id) state.seenRows.add(id);
    const txt = ($('.tnb-pmh-text', row) || row).textContent || '';
    let changed = false;
    for (const r of parseBotBubble(txt)) {
      if (r.ma) {
        const key = r.kho + '|' + r.loai + '|' + r.ma;
        if (!state.results.has(key)) { state.results.set(key, r); changed = true; }
      } else if (r.err) {
        state.errors.push(r);
        changed = true;
      }
    }
    return changed;
  }

  function scanExisting() {
    let changed = false;
    for (const row of $$('.tnb-pmh-row.is-bot')) {
      if (ingestBotRow(row)) changed = true;
    }
    return changed;
  }

  // ------------------------------------------------------------------- gửi loạt
  async function startSend(rawText, perMsg, gapMs, setStatus) {
    if (state.running) return;
    const forms = splitForms(rawText);
    if (!forms.length) { setStatus('⚠️ Không tìm thấy form nào trong ô dán.'); return; }
    const chunks = chunkForms(forms, perMsg);
    state.sentKhos = extractKhos(forms);
    state.running = true;
    state.stop = false;
    renderResults();

    for (let i = 0; i < chunks.length; i++) {
      if (state.stop) { setStatus('⏹ Đã dừng ở tin ' + i + '/' + chunks.length + '.'); break; }
      const input = findInput();
      if (!input) {
        setStatus('⚠️ Không thấy ô nhập liệu — bạn đã nhập Mã Bảo Mật để vào phòng chưa?');
        break;
      }
      setReactValue(input, chunks[i]);
      await sleep(140);
      const btn = findSendButton();
      if (btn && !btn.disabled) btn.click();
      else pressEnter(input);
      setStatus('📨 Đã gửi ' + (i + 1) + '/' + chunks.length + ' tin (' + forms.length + ' form). Đang chờ mã…');
      if (i < chunks.length - 1) await sleep(gapMs);
    }

    state.running = false;
    if (!state.stop) {
      setStatus('✅ Xong: đã gửi ' + chunks.length + ' tin / ' + forms.length +
        ' form. Mã sẽ hiện dần bên dưới khi admin duyệt (OK ALL).');
    }
  }

  // ------------------------------------------------------------------------ UI
  function injectStyle() {
    if ($('#tnb-pmh-helper-style')) return;
    const st = document.createElement('style');
    st.id = 'tnb-pmh-helper-style';
    st.textContent = [
      '#' + PANEL_ID + '{position:fixed;top:12px;right:12px;width:344px;max-width:calc(100vw - 24px);',
      'z-index:2147483000;background:#fff;border:1px solid #cbd5e1;border-radius:8px;',
      'box-shadow:0 10px 30px rgba(15,23,42,.22);font:13px/1.45 -apple-system,Segoe UI,Roboto,sans-serif;color:#0f172a;}',
      '#' + PANEL_ID + ' *{box-sizing:border-box;}',
      '#' + PANEL_ID + ' .tph-hd{display:flex;align-items:center;gap:8px;padding:8px 10px;background:#0f2f5f;',
      'color:#fff;border-radius:8px 8px 0 0;cursor:default;}',
      '#' + PANEL_ID + ' .tph-hd b{font-size:13px;flex:1;}',
      '#' + PANEL_ID + ' .tph-hd button{background:rgba(255,255,255,.16);color:#fff;border:0;border-radius:5px;',
      'width:26px;height:26px;font-size:15px;cursor:pointer;}',
      '#' + PANEL_ID + ' .tph-body{padding:10px;max-height:calc(100vh - 90px);overflow:auto;}',
      '#' + PANEL_ID + ' textarea{width:100%;min-height:96px;resize:vertical;padding:8px;border:1px solid #cbd5e1;',
      'border-radius:6px;font:12px/1.4 ui-monospace,Menlo,monospace;}',
      '#' + PANEL_ID + ' .tph-row{display:flex;gap:8px;align-items:center;margin:8px 0;flex-wrap:wrap;}',
      '#' + PANEL_ID + ' .tph-row label{font-size:12px;color:#475569;}',
      '#' + PANEL_ID + ' input.tph-num{width:56px;padding:5px;border:1px solid #cbd5e1;border-radius:5px;}',
      '#' + PANEL_ID + ' .tph-btn{padding:8px 12px;border:0;border-radius:6px;font-weight:600;cursor:pointer;}',
      '#' + PANEL_ID + ' .tph-go{background:#0ea5e9;color:#fff;flex:1;}',
      '#' + PANEL_ID + ' .tph-stop{background:#e11d48;color:#fff;}',
      '#' + PANEL_ID + ' .tph-ghost{background:#f1f5f9;color:#0f172a;border:1px solid #cbd5e1;}',
      '#' + PANEL_ID + ' .tph-status{margin:8px 0;padding:7px 9px;background:#f8fafc;border:1px solid #e2e8f0;',
      'border-radius:6px;font-size:12px;color:#334155;min-height:18px;}',
      '#' + PANEL_ID + ' .tph-res{border-top:1px dashed #e2e8f0;margin-top:6px;padding-top:8px;}',
      '#' + PANEL_ID + ' .tph-res table{width:100%;border-collapse:collapse;font-size:12px;}',
      '#' + PANEL_ID + ' .tph-res td{padding:2px 4px;border-bottom:1px solid #f1f5f9;vertical-align:top;}',
      '#' + PANEL_ID + ' .tph-res .ma{font-family:ui-monospace,Menlo,monospace;font-weight:700;color:#0f766e;}',
      '#' + PANEL_ID + ' .tph-err{color:#b91c1c;font-size:12px;margin-top:6px;white-space:pre-wrap;}',
      '#' + PANEL_ID + '.tph-min .tph-body{display:none;}',
      '#tnb-pmh-fab{position:fixed;top:12px;right:12px;z-index:2147483000;background:#0f2f5f;color:#fff;',
      'border:0;border-radius:20px;padding:8px 14px;font:600 13px sans-serif;cursor:pointer;box-shadow:0 6px 18px rgba(15,23,42,.25);}',
    ].join('');
    document.head.appendChild(st);
  }

  function buildPanel() {
    if ($('#' + PANEL_ID)) return;
    injectStyle();
    const wrap = document.createElement('div');
    wrap.id = PANEL_ID;
    wrap.innerHTML = [
      '<div class="tph-hd"><b>TNB PMH · Lấy mã hàng loạt</b>',
      '<button data-act="min" title="Thu gọn">–</button></div>',
      '<div class="tph-body">',
      '<div class="tph-hint" style="font-size:12px;color:#475569;margin-bottom:6px;">',
      'Dán nhiều form PMH (mỗi form bắt đầu bằng "FORM MẪU LẤY PMH"). Script tự gộp &lt; 3000 ký tự/tin rồi gửi lần lượt.</div>',
      '<textarea class="tph-input" placeholder="Dán danh sách form vào đây…\nVí dụ:\nFORM MẪU LẤY PMH\nLoại PMH: WC200\nMã Kho Áp Dụng: 322\nMĐH áp dụng: 00322SO...\n\nFORM MẪU LẤY PMH\nLoại PMH: MM700\n..."></textarea>',
      '<div class="tph-row">',
      '<label>Form/tin</label><input class="tph-num tph-per" type="number" min="1" max="20" value="' + DEFAULT_PER_MSG + '">',
      '<label>Giãn cách (giây)</label><input class="tph-num tph-gap" type="number" min="0.5" step="0.5" value="' + DEFAULT_GAP_SEC + '">',
      '</div>',
      '<div class="tph-row">',
      '<button class="tph-btn tph-go" data-act="go">▶ Chạy lấy mã</button>',
      '<button class="tph-btn tph-stop" data-act="stop">⏹</button>',
      '</div>',
      '<div class="tph-status">Sẵn sàng. Hãy đăng nhập Mã Bảo Mật vào phòng trước khi gửi.</div>',
      '<div class="tph-res"></div>',
      '</div>',
    ].join('');
    document.body.appendChild(wrap);

    const setStatus = (s) => { const el = $('.tph-status', wrap); if (el) el.textContent = s; };

    wrap.addEventListener('click', (e) => {
      const act = e.target && e.target.getAttribute && e.target.getAttribute('data-act');
      if (!act) return;
      if (act === 'min') {
        wrap.remove();
        showFab();
        gmSet('tnb_pmh_min', true);
      } else if (act === 'go') {
        const raw = $('.tph-input', wrap).value;
        const per = Math.max(1, parseInt($('.tph-per', wrap).value, 10) || DEFAULT_PER_MSG);
        const gap = Math.max(0.5, parseFloat($('.tph-gap', wrap).value) || DEFAULT_GAP_SEC) * 1000;
        startSend(raw, per, gap, setStatus);
      } else if (act === 'stop') {
        state.stop = true;
        setStatus('⏹ Đang dừng sau tin hiện tại…');
      } else if (act === 'copytable') {
        const rows = visibleResults();
        const tsv = rows.map((r) => [r.kho, r.ten, r.loai, r.ma].join('\t')).join('\n');
        setStatus(copy(tsv) ? 'Đã copy ' + rows.length + ' dòng (bảng).' : 'Không copy được.');
      } else if (act === 'copyma') {
        const rows = visibleResults();
        const txt = rows.map((r) => r.kho + ' - ' + r.loai + ' : ' + r.ma).join('\n');
        setStatus(copy(txt) ? 'Đã copy ' + rows.length + ' mã.' : 'Không copy được.');
      } else if (act === 'toggleall') {
        state.showAll = !state.showAll;
        renderResults();
      } else if (act === 'clearres') {
        state.results.clear(); state.errors = []; state.seenRows.clear();
        renderResults();
        setStatus('Đã xoá kết quả (không ảnh hưởng tin đã gửi).');
      }
    });
    renderResults();
  }

  function showFab() {
    if ($('#tnb-pmh-fab')) return;
    const b = document.createElement('button');
    b.id = 'tnb-pmh-fab';
    b.textContent = 'TNB PMH ▸';
    b.onclick = () => { b.remove(); gmSet('tnb_pmh_min', false); buildPanel(); };
    document.body.appendChild(b);
  }

  function visibleResults() {
    const all = Array.from(state.results.values());
    if (state.showAll || state.sentKhos.size === 0) return all;
    return all.filter((r) => state.sentKhos.has(r.kho));
  }

  function renderResults() {
    const box = $('.tph-res');
    if (!box) return;
    const rows = visibleResults();
    const errs = state.showAll || state.sentKhos.size === 0
      ? state.errors
      : state.errors.filter((e) => state.sentKhos.has(e.kho));
    const parts = [];
    parts.push('<div class="tph-row" style="justify-content:space-between;">' +
      '<span style="font-weight:600;">Mã nhận: ' + rows.length + (errs.length ? ' · lỗi: ' + errs.length : '') + '</span>' +
      '<span><label style="cursor:pointer;"><input type="checkbox" data-act="toggleall"' +
      (state.showAll ? ' checked' : '') + '> tất cả kho</label></span></div>');
    if (rows.length) {
      parts.push('<div class="tph-row"><button class="tph-btn tph-ghost" data-act="copyma">Copy mã</button>' +
        '<button class="tph-btn tph-ghost" data-act="copytable">Copy bảng</button>' +
        '<button class="tph-btn tph-ghost" data-act="clearres">Xoá</button></div>');
      parts.push('<table><tbody>');
      for (const r of rows) {
        parts.push('<tr><td>' + esc(r.kho) + '</td><td>' + esc(r.loai) +
          '</td><td class="ma">' + esc(r.ma) + '</td></tr>');
      }
      parts.push('</tbody></table>');
    } else {
      parts.push('<div style="font-size:12px;color:#94a3b8;">Chưa có mã. Gửi form rồi chờ admin duyệt.</div>');
    }
    if (errs.length) {
      parts.push('<div class="tph-err">⚠️ ' + errs.length + ' form lỗi:\n' +
        errs.map((e) => e.kho + ': ' + e.err).join('\n') + '</div>');
    }
    box.innerHTML = parts.join('');
  }

  function esc(s) {
    return (s || '').replace(/[&<>"]/g, (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  }

  // ------------------------------------------------------------- vòng đời / gắn
  function ensurePanel() {
    if (gmGet('tnb_pmh_min', false)) { if (!$('#tnb-pmh-fab')) showFab(); return; }
    if (!$('#' + PANEL_ID)) buildPanel();
  }

  function boot() {
    ensurePanel();
    scanExisting();
    renderResults();

    const msgObserver = new MutationObserver(() => {
      if (scanExisting()) renderResults();
    });
    const attach = () => {
      const m = findMessages();
      if (m && !m.__tphObserved) {
        m.__tphObserved = true;
        msgObserver.observe(m, { childList: true, subtree: true });
      }
    };
    attach();

    // SPA có thể render lại — định kỳ đảm bảo panel & observer còn sống
    setInterval(() => { ensurePanel(); attach(); }, 2500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
