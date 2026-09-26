import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Userscript "TNB PMH - Tự động lấy mã hàng loạt" (public/scripts/tnb-pmh-auto-lay-ma.user.js).
 *
 * Không chạy được trên admintnb.com thật (cần mã bảo mật của người dùng) nên spec này dựng fixture
 * tái tạo ĐÚNG cấu trúc DOM mà người dùng đã gửi:
 *   - textarea.tnb-pmh-input kiểu React "controlled": nút GỬI CHỈ đọc giá trị qua sự kiện `input`,
 *     KHÔNG đọc thẳng textarea.value → nếu script quên dispatch 'input' thì bot nhận rỗng, test đỏ.
 *   - .tnb-pmh-messages chứa các dòng .tnb-pmh-row.is-bot > .tnb-pmh-text; bot trả 1 tin gộp nhiều
 *     block ngăn bằng "━━━━━━" giống hệt bot thật.
 * Nạp NGUYÊN userscript thật với shim GM_* — không copy logic ra test.
 *
 * Đây là test RÁP NỐI DOM trên trang MÔ PHỎNG, không thay cho việc dán thử 1 lần trên trang live.
 */

const USERSCRIPT_PATH = resolve(fileURLToPath(new URL('.', import.meta.url)), '../../public/scripts/tnb-pmh-auto-lay-ma.user.js');
const ROOM_URL = 'https://admintnb.com/room-pmh/';

const FIXTURE = `<!doctype html><html><head><meta charset="utf-8"><title>TNB_ĐMX - PHIẾU MUA HÀNG</title></head><body>
<div class="tnb-pmh-app">
  <div class="tnb-pmh-messages" aria-live="polite"></div>
  <textarea class="tnb-pmh-input" rows="1" maxlength="3000" placeholder="Nhập Nội Dung ..."></textarea>
  <button type="button" class="tnb-pmh-send">📨 GỬI</button>
</div>
<script>
  // React "controlled input": chỉ tin vào giá trị đến từ sự kiện 'input', bỏ qua .value gán thô.
  var currentValue = '';
  var ta = document.querySelector('.tnb-pmh-input');
  ta.addEventListener('input', function (e) { currentValue = e.target.value; });
  var msgs = document.querySelector('.tnb-pmh-messages');
  var nextId = 1000;
  var NL = String.fromCharCode(10);
  function addRow(cls, text) {
    var row = document.createElement('div');
    row.className = 'tnb-pmh-row ' + cls;
    row.setAttribute('data-id', String(nextId++));
    row.innerHTML = '<div class="tnb-pmh-bubble-wrap"><div class="tnb-pmh-meta">DM · now</div>' +
      '<div class="tnb-pmh-bubble"><span class="tnb-pmh-text"></span></div></div>';
    row.querySelector('.tnb-pmh-text').textContent = text;
    msgs.appendChild(row);
  }
  // Bot giả trả về 1 tin cố định (khớp Mã Kho của THREE_FORMS), đúng định dạng bot thật:
  // "<kho> - <tên>\\n➜ PMH <loại> : <MÃ>" nối bằng "━━━━━━". Không tự parse nhãn tiếng Việt —
  // phần bóc tách nhãn đã được kiểm ở test logic thuần (node), test này chỉ lo phần ráp nối DOM.
  var REPLY = [['322', 'WC200', 'PHC96180QP'], ['1378', 'OP300', 'ABCDE12345'], ['10011', 'TL300', 'Z2Y9X8W7V6']];
  document.querySelector('.tnb-pmh-send').addEventListener('click', function () {
    var v = currentValue.trim();
    if (!v) return; // chỉ chạy khi giá trị đến qua sự kiện 'input' (chứng minh React-setter đúng)
    addRow('is-user', v);
    var blocks = REPLY.map(function (r) {
      return r[0] + ' - ĐML_TEST_' + r[0] + NL + '➜ PMH ' + r[1] + ' : ' + r[2];
    });
    addRow('is-bot', blocks.join(NL + '━━━━━━' + NL));
    currentValue = '';
    ta.value = '';
  });
</script>
</body></html>`;

async function setup(page: Page) {
  await page.route('https://admintnb.com/**', (route) =>
    route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: FIXTURE }),
  );
  await page.addInitScript(() => {
    const w = window as unknown as Record<string, unknown>;
    const store = new Map<string, unknown>();
    w.__clip = '';
    w.GM_setClipboard = (t: string) => { w.__clip = t; };
    w.GM_getValue = (k: string, d: unknown) => (store.has(k) ? store.get(k) : d);
    w.GM_setValue = (k: string, v: unknown) => { store.set(k, v); };
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: async (t: string) => { w.__clip = t; } },
    });
  });
  await page.goto(ROOM_URL);
  await page.addScriptTag({ content: readFileSync(USERSCRIPT_PATH, 'utf-8') });
  await expect(page.locator('#tnb-pmh-helper')).toBeVisible();
}

const THREE_FORMS = [
  'FORM MẪU LẤY PMH',
  'Loại PMH: WC200',
  'Mã Kho Áp Dụng: 322',
  'MĐH áp dụng: 00322SO26070523460',
  '',
  'FORM MẪU LẤY PMH',
  'Loại PMH: OP300',
  'Mã Kho Áp Dụng: 1378',
  'MĐH áp dụng: 01378SO26070671155',
  '',
  'FORM MẪU LẤY PMH',
  'Loại PMH: TL300',
  'Mã Kho Áp Dụng: 10011',
  'MĐH áp dụng: 10011SO26070277755',
].join('\n');

test.describe('TNB PMH userscript — gửi loạt & gom mã', () => {
  test('điền ô + bấm GỬI (không bấm nhầm nút panel) → gom đủ 3 mã từ bong bóng bot', async ({ page }) => {
    await setup(page);

    await page.locator('#tnb-pmh-helper .tph-input').fill(THREE_FORMS);
    await page.locator('#tnb-pmh-helper .tph-gap').fill('0.5');
    await page.locator('#tnb-pmh-helper [data-act="go"]').click();

    // Bot (fixture) chỉ trả mã nếu giá trị đến qua sự kiện 'input' — chứng minh React-setter chạy đúng.
    const res = page.locator('#tnb-pmh-helper .tph-res');
    await expect(res).toContainText('Mã nhận: 3');
    await expect(res).toContainText('PHC96180QP');
    await expect(res).toContainText('ABCDE12345');
    await expect(res).toContainText('Z2Y9X8W7V6');

    // Đúng 1 tin người dùng được gửi (3 form gộp 1 tin), không lặp vô hạn do bấm nhầm nút "Chạy".
    const userRows = await page.locator('.tnb-pmh-messages .tnb-pmh-row.is-user').count();
    expect(userRows).toBe(1);

    // Copy mã ra clipboard đúng định dạng.
    await page.locator('#tnb-pmh-helper [data-act="copyma"]').click();
    const clip = await page.evaluate(() => (window as unknown as { __clip: string }).__clip);
    expect(clip).toContain('322 - WC200 : PHC96180QP');
    expect(clip).toContain('10011 - TL300 : Z2Y9X8W7V6');
  });

  test('thu gọn về nút nổi rồi mở lại', async ({ page }) => {
    await setup(page);
    await page.locator('#tnb-pmh-helper [data-act="min"]').click();
    await expect(page.locator('#tnb-pmh-helper')).toHaveCount(0);
    await expect(page.locator('#tnb-pmh-fab')).toBeVisible();
    await page.locator('#tnb-pmh-fab').click();
    await expect(page.locator('#tnb-pmh-helper')).toBeVisible();
  });
});
