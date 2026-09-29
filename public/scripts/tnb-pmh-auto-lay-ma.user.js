// ==UserScript==
// @name         TNB PMH - Tự động lấy mã hàng loạt
// @namespace    dashboard-ycx
// @version      1.6
// @description  Dán danh sách form PMH → tự gộp theo giới hạn 3000 ký tự của ô chat và gửi lần lượt vào phòng admintnb, tự gom mã trả về thành bảng copy nhanh. Chạy trong phiên đăng nhập của CHÍNH BẠN, không gửi dữ liệu ra máy chủ nào khác.
// @author       Dashboard YCX
// @match        https://admintnb.com/room-pmh*
// @match        https://admintnb.com/room-pmh/*
// @grant        GM_setClipboard
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_xmlhttpRequest
// @connect      asia-southeast1-dashboa-7e20b.cloudfunctions.net
// @updateURL    https://dashboard.pro.vn/scripts/tnb-pmh-auto-lay-ma.user.js
// @downloadURL  https://dashboard.pro.vn/scripts/tnb-pmh-auto-lay-ma.user.js
// ==/UserScript==

/*
 * CHANGELOG:
 * - v1.6 (2026-09-29):
 *   + Thêm bộ lọc "Hôm nay / Tất cả" — mặc định chỉ hiển thị mã nhận trong ngày hôm nay, bấm toggle để xem toàn bộ lịch sử phiên.
 * - v1.5 (2026-09-27):
 *   + Sắp xếp danh sách mã theo thứ tự mới nhất nằm trên cùng (đảo ngược thứ tự hiển thị để các mã vừa được cấp xuất hiện ngay đầu danh sách).
 * - v1.4 (2026-09-27):
 *   + Bổ sung bộ lọc "Loại PMH" (ví dụ: WC200, TL300, ML200...) hỗ trợ gõ tên loại hoặc bấm chọn nhanh qua các thẻ (quick pills) đếm số lượng mã thực tế.
 *   + Hỗ trợ lọc kết hợp giữa "Kho của tôi" và "Loại PMH", tự động cập nhật số lượng mã hiển thị và chức năng Copy mã / Copy bảng.
 * - v1.3 (2026-09-27):
 *   + Thêm bộ lọc "Kho của tôi" (ví dụ: 910) trực tiếp trên giao diện để chỉ lọc và hiển thị riêng mã của siêu thị mình, ẩn hoàn toàn mã của các siêu thị khác trong phòng chung.
 * - v1.2 (2026-09-27):
 *   + Trích xuất tiêu đề đầy đủ của kho (ví dụ: 910 - ĐML_STR_STR - 99 Hùng Vương) để phản hồi định dạng chuẩn về LINE.
 * - v1.1 (2026-09-27):
 *   + Giảm BOT_POLL_INTERVAL từ 5s xuống 2s để gom và gửi form tức thì, trả mã về LINE trong thời hạn hiệu lực của replyToken (miễn phí, không bị tính vào hạn mức push 429).
 *   + Cải thiện hiển thị chi tiết nguyên nhân khi LINE push/reply bị lỗi thay vì thông báo "không rõ".
 * - v1.0: Phiên bản khởi tạo tự động lấy mã hàng loạt và relay bot LINE.
 */

(function () {
  'use strict';

  const MAX_CHARS = 2800;        // ngưỡng an toàn dưới maxlength=3000 của ô chat
  const DEFAULT_PER_MSG = 1;     // mỗi tin chỉ gửi 1 form
  const DEFAULT_GAP_SEC = 2.0;   // giãn cách giữa 2 tin (giây)
  const PANEL_ID = 'tnb-pmh-helper';
  // ---- Bot LINE relay ----
  const CF_BASE = 'https://asia-southeast1-dashboa-7e20b.cloudfunctions.net';
  const POLL_URL = CF_BASE + '/pmhRelayPoll';
  const COMPLETE_URL = CF_BASE + '/pmhRelayComplete';
  const BOT_POLL_INTERVAL = 2000;

  // ------------------------------------------------------------------ tiện ích
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const norm = (s) => (s || '').replace(/\r\n/g, '\n').replace(/\u00a0/g, ' ');
  const gmGet = (k, d) => { try { return GM_getValue(k, d); } catch (e) { return d; } };
  const gmSet = (k, v) => { try { GM_setValue(k, v); } catch (e) { } };

  function gmFetch(url, opts) {
    opts = opts || {};
    return new Promise(function (resolve, reject) {
      GM_xmlhttpRequest({
        method: opts.method || 'GET',
        url: url,
        headers: opts.headers || {},
        data: opts.body || undefined,
        responseType: 'json',
        onload: function (r) {
          resolve({ ok: r.status >= 200 && r.status < 300, status: r.status, json: function () { return Promise.resolve(r.response); } });
        },
        onerror: function (e) { reject(new Error('Network error')); },
        ontimeout: function () { reject(new Error('Timeout')); },
      });
    });
  }

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
    } catch (e) { }
    try { navigator.clipboard.writeText(text); return true; } catch (e) { }
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
      let kho = '', ten = '', fullStore = lines[0] || '';
      const mStore = (lines[0] || '').match(/^(\d{2,7})\s*-\s*(.+)$/);
      if (mStore) { kho = mStore[1]; ten = mStore[2]; }
      else { kho = lines[0] || ''; }
      const resLine = lines.find((l) => l.includes('➜')) || '';
      const mOk = resLine.match(/➜\s*PMH\s+(\S+)\s*:\s*([A-Za-z0-9]{4,})/);
      const mErr = resLine.match(/➜\s*❌\s*(.+)$/);
      if (mOk) out.push({ kho, ten, fullStore, loai: mOk[1], ma: mOk[2], err: '' });
      else if (mErr) out.push({ kho, ten, fullStore, loai: '', ma: '', err: mErr[1].trim() });
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
    todayOnly: true,
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
        if (!state.results.has(key)) { r.ts = Date.now(); state.results.set(key, r); changed = true; }
      } else if (r.err) {
        r.ts = Date.now();
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
  // ----------------------------------------------------------- BOT LINE RELAY
  const bot = {
    active: false,
    timer: null,
    token: gmGet('tnb_relay_token', ''),
    pending: new Map(),   // docId -> { form, khos, submitted, results, errors, submittedAt }
    log: [],
  };

  function botLog(msg) {
    const t = new Date().toLocaleTimeString('vi-VN');
    bot.log.unshift('[' + t + '] ' + msg);
    if (bot.log.length > 50) bot.log.length = 50;
    renderBotLog();
  }

  function renderBotLog() {
    const el = $('.tph-botlog');
    if (!el) return;
    el.textContent = bot.log.slice(0, 8).join('\n');
  }

  var pollCount = 0;

  async function botPoll() {
    if (!bot.active || !bot.token) return;
    try {
      const resp = await gmFetch(POLL_URL, {
        headers: { 'Authorization': 'Bearer ' + bot.token },
      });
      pollCount++;
      if (!resp.ok) { botLog('⚠️ Poll lỗi HTTP ' + resp.status); return; }
      const data = await resp.json();
      const items = data.items || [];
      if (!items.length) {
        if (pollCount % 12 === 0) botLog('💓 Poll OK — chờ form (đã poll ' + pollCount + ' lần)');
        return;
      }
      botLog('📥 Nhận ' + items.length + ' form từ LINE');
      for (const item of items) {
        if (bot.pending.has(item.id)) continue;
        const khos = extractKhos(splitForms(item.form));
        for (const k of khos) state.sentKhos.add(k);
        if (!gmGet('tnb_my_kho', '') && khos.length > 0) {
          gmSet('tnb_my_kho', [...khos].join(','));
          const inputKho = $('.tph-my-kho');
          if (inputKho) inputKho.value = [...khos].join(',');
        }
        bot.pending.set(item.id, {
          form: item.form, khos: khos, submitted: false,
          results: [], errors: [], submittedAt: 0,
          seenBefore: new Set(state.results.keys()),
          errCountBefore: state.errors.length,
        });
      }
      // Gửi từng form chưa gửi
      for (const [id, item] of bot.pending) {
        if (item.submitted) continue;
        await botSubmitForm(id, item);
        await sleep(2000);
      }
    } catch (e) {
      botLog('⚠️ Poll lỗi: ' + (e.message || e));
    }
  }

  async function botSubmitForm(id, item) {
    const input = findInput();
    if (!input) { botLog('⚠️ Không thấy ô nhập liệu'); return; }
    setReactValue(input, item.form);
    await sleep(140);
    const btn = findSendButton();
    if (btn && !btn.disabled) btn.click();
    else pressEnter(input);
    item.submitted = true;
    item.submittedAt = Date.now();
    botLog('📨 Gửi form kho ' + [...item.khos].join(','));
  }

  function botCheckResponses() {
    for (const [id, item] of bot.pending) {
      if (!item.submitted) continue;
      // Chỉ lấy mã MỚI xuất hiện SAU khi gửi form (snapshot trước gửi đã lưu)
      for (const [key, r] of state.results) {
        if (item.khos.has(r.kho) && !item.seenBefore.has(key)) {
          if (!item.results.find(function (x) { return x.kho === r.kho && x.ma === r.ma; })) {
            item.results.push(r);
          }
        }
      }
      for (var ei = 0; ei < state.errors.length; ei++) {
        var e = state.errors[ei];
        if (ei < item.errCountBefore) continue;
        if (item.khos.has(e.kho)) {
          if (!item.errors.find(function (x) { return x.kho === e.kho && x.err === e.err; })) {
            item.errors.push(e);
          }
        }
      }
      // Có kết quả → gửi về
      if (item.results.length > 0 || item.errors.length > 0) {
        botPostResult(id, item);
      }
      // Timeout 5 phút
      if (item.submittedAt && Date.now() - item.submittedAt > 300000 && item.results.length === 0) {
        botPostResult(id, { ...item, errors: [{ kho: [...item.khos].join(','), err: 'Hết thời gian chờ (5 phút)' }] });
      }
    }
  }

  async function botPostResult(id, item) {
    bot.pending.delete(id);
    try {
      var resp = await gmFetch(COMPLETE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + bot.token,
        },
        body: JSON.stringify({
          id: id,
          codes: item.results.map(function (r) {
            return {
              kho: r.kho,
              ten: r.ten || '',
              storeHeader: r.fullStore || (r.ten ? r.kho + ' - ' + r.ten : r.kho),
              type: r.loai,
              code: r.ma
            };
          }),
          errors: item.errors.map(function (e) { return (e.fullStore || e.kho) + ': ' + e.err; }),
        }),
      });
      var data = await resp.json();
      var maCount = item.results.length;
      if (data && data.pushed) {
        var methodText = data.method === 'reply' ? ' [miễn phí qua replyToken]' : '';
        botLog('✅ Trả ' + maCount + ' mã về LINE OK' + methodText + ' (kho ' + [...item.khos].join(',') + ')');
      } else {
        botLog('⚠️ Trả ' + maCount + ' mã nhưng LINE gửi thất bại: ' + (data && data.reason || 'không rõ'));
      }
    } catch (e) {
      botLog('⚠️ Gửi kết quả lỗi: ' + (e.message || e));
    }
  }

  function botStart() {
    if (bot.active) return;
    bot.token = gmGet('tnb_relay_token', '');
    if (!bot.token) { botLog('⚠️ Chưa nhập Relay Token'); return; }
    bot.active = true;
    gmSet('tnb_bot_active', true);
    botLog('🤖 Bot đã BẬT — poll mỗi ' + (BOT_POLL_INTERVAL / 1000) + 's');
    bot.timer = setInterval(function () {
      botPoll();
      botCheckResponses();
    }, BOT_POLL_INTERVAL);
    botPoll();
    renderBotToggle();
  }

  function botStop() {
    bot.active = false;
    gmSet('tnb_bot_active', false);
    if (bot.timer) { clearInterval(bot.timer); bot.timer = null; }
    botLog('⏹ Bot đã TẮT');
    renderBotToggle();
  }

  function renderBotToggle() {
    var el = $('.tph-bot-status');
    if (el) el.textContent = bot.active ? '🟢 Đang chạy' : '⚪ Tắt';
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
      '#' + PANEL_ID + ' .tph-pill{padding:2px 7px;font-size:10px;font-weight:700;border-radius:12px;border:1px solid #bae6fd;',
      'background:#f0f9ff;color:#0369a1;cursor:pointer;transition:all .15s;user-select:none;line-height:1.3;}',
      '#' + PANEL_ID + ' .tph-pill:hover{background:#e0f2fe;border-color:#38bdf8;}',
      '#' + PANEL_ID + ' .tph-pill.is-active{background:#0284c7;color:#fff;border-color:#0284c7;box-shadow:0 1px 3px rgba(2,132,199,.3);}',
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
      // ---- Bot mode UI ----
      '<div style="border:1px solid #0ea5e9;border-radius:6px;padding:8px;margin-bottom:8px;background:#f0f9ff;">',
      '<div class="tph-row" style="margin:0;">',
      '<b style="font-size:12px;">🤖 Chế độ Bot LINE</b>',
      '<span class="tph-bot-status" style="font-size:11px;">⚪ Tắt</span>',
      '<button class="tph-btn" data-act="bottoggle" style="padding:4px 10px;font-size:11px;background:#0ea5e9;color:#fff;">Bật</button>',
      '</div>',
      '<div class="tph-row" style="margin:4px 0 0;">',
      '<label style="font-size:11px;">Token:</label>',
      '<input class="tph-relay-token" type="password" placeholder="Relay token" ',
      'value="' + esc(gmGet('tnb_relay_token', '')) + '" ',
      'style="flex:1;padding:4px;border:1px solid #cbd5e1;border-radius:4px;font-size:11px;">',
      '</div>',
      '<pre class="tph-botlog" style="font-size:10px;color:#475569;margin:4px 0 0;max-height:80px;overflow:auto;white-space:pre-wrap;line-height:1.3;"></pre>',
      '</div>',
      // ---- End bot mode UI ----

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
      '<div style="margin:4px 0 6px;background:#f8fafc;padding:6px 8px;border-radius:6px;border:1px solid #e2e8f0;display:flex;flex-direction:column;gap:5px;">',
      '<div style="display:flex;align-items:center;gap:6px;">',
      '<label style="font-size:11px;font-weight:700;color:#0369a1;white-space:nowrap;width:74px;">🏢 Kho:</label>',
      '<input class="tph-my-kho" type="text" placeholder="Ví dụ: 910 (trống: xem hết)" ',
      'value="' + esc(gmGet('tnb_my_kho', '')) + '" ',
      'style="flex:1;padding:3px 6px;border:1px solid #cbd5e1;border-radius:4px;font-size:11px;font-weight:700;color:#0f172a;" ',
      'title="Chỉ hiển thị và copy mã thuộc mã kho này (để trống: xem tất cả)">',
      '</div>',
      '<div style="display:flex;align-items:center;gap:6px;">',
      '<label style="font-size:11px;font-weight:700;color:#0369a1;white-space:nowrap;width:74px;">🏷️ Loại PMH:</label>',
      '<input class="tph-filter-loai" type="text" placeholder="Ví dụ: WC200, TL300..." ',
      'value="' + esc(gmGet('tnb_filter_loai', '')) + '" ',
      'style="flex:1;padding:3px 6px;border:1px solid #cbd5e1;border-radius:4px;font-size:11px;font-weight:700;color:#0f172a;" ',
      'title="Lọc theo loại PMH (gõ tên loại hoặc bấm chọn thẻ nhanh bên dưới)">',
      '</div>',
      '<div class="tph-loai-pills-box" style="display:flex;flex-wrap:wrap;gap:4px;margin-top:2px;"></div>',
      '</div>',
      '<div class="tph-status">Sẵn sàng. Hãy đăng nhập Mã Bảo Mật vào phòng trước khi gửi.</div>',
      '<div class="tph-res"></div>',
      '</div>',
    ].join('');
    document.body.appendChild(wrap);

    const setStatus = (s) => { const el = $('.tph-status', wrap); if (el) el.textContent = s; };

    wrap.addEventListener('click', (e) => {
      const pill = e.target && e.target.closest && e.target.closest('.tph-pill');
      if (pill) {
        const loai = pill.getAttribute('data-loai') || '';
        const curLoai = gmGet('tnb_filter_loai', '');
        const nextLoai = (curLoai.toUpperCase() === loai.toUpperCase()) ? '' : loai;
        gmSet('tnb_filter_loai', nextLoai);
        const inputLoai = $('.tph-filter-loai', wrap);
        if (inputLoai) inputLoai.value = nextLoai;
        renderResults();
        return;
      }
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
      } else if (act === 'toggletoday') {
        state.todayOnly = !state.todayOnly;
        renderResults();
      } else if (act === 'toggleall') {
        state.showAll = !state.showAll;
        renderResults();
      } else if (act === 'clearres') {
        state.results.clear(); state.errors = []; state.seenRows.clear();
        renderResults();
        setStatus('Đã xoá kết quả (không ảnh hưởng tin đã gửi).');
      } else if (act === 'bottoggle') {
        var tokenInput = $('.tph-relay-token', wrap);
        if (tokenInput) { bot.token = tokenInput.value.trim(); gmSet('tnb_relay_token', bot.token); }
        if (bot.active) botStop(); else botStart();
        e.target.textContent = bot.active ? 'Tắt' : 'Bật';
      }
    });

    wrap.addEventListener('input', (e) => {
      if (e.target && e.target.classList.contains('tph-my-kho')) {
        gmSet('tnb_my_kho', e.target.value.trim());
        renderResults();
      }
      if (e.target && e.target.classList.contains('tph-filter-loai')) {
        gmSet('tnb_filter_loai', e.target.value.trim());
        renderResults();
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

  function todayStart() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }

  function visibleResults() {
    const all = Array.from(state.results.values()).reverse();
    let list = all;
    if (state.todayOnly) {
      const ts0 = todayStart();
      list = list.filter((r) => (r.ts || 0) >= ts0);
    }
    if (!state.showAll) {
      const myKho = (gmGet('tnb_my_kho', '') || '').trim();
      if (myKho) {
        const myKhoList = myKho.split(/[\s,;|]+/).filter(Boolean);
        list = list.filter((r) => myKhoList.includes(r.kho));
      } else if (state.sentKhos.size > 0) {
        list = list.filter((r) => state.sentKhos.has(r.kho));
      }
    }
    const filterLoai = (gmGet('tnb_filter_loai', '') || '').trim().toUpperCase();
    if (filterLoai) {
      const loaiList = filterLoai.split(/[\s,;|]+/).map((s) => s.trim().toUpperCase()).filter(Boolean);
      list = list.filter((r) => {
        const rLoai = (r.loai || '').toUpperCase();
        return loaiList.some((target) => rLoai === target || rLoai.includes(target));
      });
    }
    return list;
  }

  function renderResults() {
    const box = $('.tph-res');
    if (!box) return;
    const myKho = (gmGet('tnb_my_kho', '') || '').trim();
    const myKhoList = myKho ? myKho.split(/[\s,;|]+/).filter(Boolean) : null;
    const curFilterLoai = (gmGet('tnb_filter_loai', '') || '').trim();
    const rows = visibleResults();

    // Cập nhật các thẻ chọn nhanh (quick pills) theo danh sách mã hiện tại
    const pillsBox = $('.tph-loai-pills-box');
    if (pillsBox) {
      let allResults = Array.from(state.results.values());
      if (state.todayOnly) {
        const ts0 = todayStart();
        allResults = allResults.filter((r) => (r.ts || 0) >= ts0);
      }
      const baseResults = state.showAll
        ? allResults
        : (myKhoList
            ? allResults.filter((r) => myKhoList.includes(r.kho))
            : (state.sentKhos.size === 0 ? allResults : allResults.filter((r) => state.sentKhos.has(r.kho))));

      const counts = {};
      for (const r of baseResults) {
        if (r.loai) counts[r.loai] = (counts[r.loai] || 0) + 1;
      }
      const types = Object.keys(counts).sort();
      if (types.length > 0) {
        let pillsHtml = '<button type="button" class="tph-pill' + (!curFilterLoai ? ' is-active' : '') + '" data-loai="">Tất cả (' + baseResults.length + ')</button>';
        for (const t of types) {
          const isActive = curFilterLoai.toUpperCase() === t.toUpperCase();
          pillsHtml += '<button type="button" class="tph-pill' + (isActive ? ' is-active' : '') + '" data-loai="' + esc(t) + '">' + esc(t) + ' (' + counts[t] + ')</button>';
        }
        pillsBox.innerHTML = pillsHtml;
        pillsBox.style.display = 'flex';
      } else {
        pillsBox.innerHTML = '';
        pillsBox.style.display = 'none';
      }
    }

    let baseErrs = state.errors;
    if (state.todayOnly) {
      const ts0 = todayStart();
      baseErrs = baseErrs.filter((e) => (e.ts || 0) >= ts0);
    }
    const rawErrs = state.showAll
      ? baseErrs
      : (myKhoList
          ? baseErrs.filter((e) => myKhoList.includes(e.kho))
          : (state.sentKhos.size === 0 ? baseErrs : baseErrs.filter((e) => state.sentKhos.has(e.kho))));
    const errs = rawErrs.slice().reverse();

    const parts = [];
    const countDetails = [];
    if (state.todayOnly) countDetails.push('Hôm nay');
    if (myKho && !state.showAll) countDetails.push('Kho ' + esc(myKho));
    if (curFilterLoai) countDetails.push('Loại ' + esc(curFilterLoai));
    const countTitle = countDetails.length > 0
      ? countDetails.join(' · ') + ': ' + rows.length + ' mã'
      : 'Mã nhận: ' + rows.length;

    const isFiltered = (myKho && !state.showAll) || Boolean(curFilterLoai) || state.todayOnly;
    parts.push('<div class="tph-row" style="justify-content:space-between;gap:4px;">' +
      '<span style="font-weight:700;color:' + (isFiltered ? '#0284c7' : '#0f172a') + ';flex:1;">' + countTitle + (errs.length ? ' · lỗi: ' + errs.length : '') + '</span>' +
      '<span style="display:flex;gap:8px;align-items:center;font-size:11px;">' +
      '<label style="cursor:pointer;white-space:nowrap;"><input type="checkbox" data-act="toggletoday"' +
      (state.todayOnly ? ' checked' : '') + '> hôm nay</label>' +
      '<label style="cursor:pointer;white-space:nowrap;"><input type="checkbox" data-act="toggleall"' +
      (state.showAll ? ' checked' : '') + '> mọi kho</label>' +
      '</span></div>');
    if (rows.length) {
      parts.push('<div class="tph-row"><button class="tph-btn tph-ghost" data-act="copyma">Copy mã</button>' +
        '<button class="tph-btn tph-ghost" data-act="copytable">Copy bảng</button>' +
        '<button class="tph-btn tph-ghost" data-act="clearres">Xoá</button></div>');
      parts.push('<div style="font-size:12px;line-height:1.6;font-family:ui-monospace,Menlo,monospace;">');
      for (const r of rows) {
        parts.push('<div style="padding:2px 0;border-bottom:1px solid #f1f5f9;">' +
          esc(r.kho) + ' - ' + esc(r.ten) +
          '<br><span style="color:#0f766e;font-weight:700;">➜ PMH ' + esc(r.loai) + ' : ' + esc(r.ma) + '</span></div>');
      }
      parts.push('</div>');
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
    // Auto-start bot mode nếu đã bật trước đó
    if (gmGet('tnb_bot_active', false) && gmGet('tnb_relay_token', '')) {
      setTimeout(botStart, 2000);
    }



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
