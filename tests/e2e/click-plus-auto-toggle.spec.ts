import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { AUTO_CLICK_BOOKMARKLET_CODE } from '../../features/bi-dashboard/components/AutoClickGuideModal';

/**
 * Click+ (userscript Tampermonkey) + bookmarklet Auto Click+ — bản 4.4: tự bật "Trả góp" và
 * "DT quy đổi" trên trang BI mới (baocao.dienmayxanh.com) TRƯỚC khi mở dấu cộng & copy.
 *
 * Không thể chạy trên trang BI thật (cần đăng nhập nội bộ MWG) nên spec này:
 * - Dựng fixture HTML tái tạo ĐÚNG HTML thật user gửi (2026-09-19) cho 2 nút ở trạng thái tắt,
 *   kèm hành vi bật/tắt giả lập theo kiểu React (đổi class + chèn dấu ✓).
 * - Chặn request tới `https://baocao.dienmayxanh.com/…` và trả fixture, để `location.hostname`
 *   khớp `BI_HOSTNAMES` và script rẽ đúng nhánh `initBiPage()`.
 * - Nạp NGUYÊN userscript thật từ `public/scripts/` với shim `GM_*` — không copy logic ra test.
 *
 * Kiểm 2 chiều: đang tắt → được bật; đang bật → KHÔNG bị click lại (click nhầm sẽ tắt mất).
 */

const USERSCRIPT_PATH = resolve(fileURLToPath(new URL('.', import.meta.url)), '../../public/scripts/mwg-auto-thu-thap-diem-thuong.user.js');
const BI_URL = 'https://baocao.dienmayxanh.com/dashboard/revenue-consolidated';

/** Đúng HTML user gửi cho trạng thái tắt; trạng thái bật là suy đoán (span có ✓, viền/nền đổi màu). */
function buildFixture(opts: { traGopOn: boolean; dtQuyDoiOn: boolean }): string {
    const traGopBtn = opts.traGopOn
        ? '<button type="button" id="tra-gop" class="flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-all border-blue-500 bg-blue-50 text-blue-700"><span class="flex h-3.5 w-3.5 items-center justify-center rounded border text-[9px] border-blue-500 bg-blue-500 text-white">✓</span>Trả góp</button>'
        : '<button type="button" id="tra-gop" class="flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-all border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300"><span class="flex h-3.5 w-3.5 items-center justify-center rounded border text-[9px] border-slate-300 dark:border-slate-500"></span>Trả góp</button>';
    const dtThucCls = opts.dtQuyDoiOn ? 'bg-white text-gray-600' : 'bg-blue-600 text-white';
    const dtQuyDoiCls = opts.dtQuyDoiOn ? 'bg-blue-600 text-white' : 'bg-white text-gray-600';
    return `<!doctype html><html><head><meta charset="utf-8"><title>Doanh thu hợp nhất</title></head><body>
<div id="filters">
  <div id="segment">
    <button type="button" id="dt-thuc" class="flex items-center justify-center gap-1.5 font-semibold transition-all px-2.5 py-1 text-xs ${dtThucCls}">DT thực</button>
    <button type="button" id="dt-quy-doi" class="flex items-center justify-center gap-1.5 font-semibold transition-all px-2.5 py-1 text-xs ${dtQuyDoiCls} dark:bg-gray-800 dark:text-gray-300">DT quy đổi</button>
  </div>
  <div id="checks">
    <button type="button" id="ti-trong" class="flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-all border-blue-500 bg-blue-50 text-blue-700"><span class="flex h-3.5 w-3.5 items-center justify-center rounded border text-[9px] border-blue-500 bg-blue-500 text-white">✓</span>Tỉ trọng</button>
    ${traGopBtn}
  </div>
</div>
<table class="ant-table"><tbody>
  <tr><td><button type="button" class="ant-table-row-expand-icon ant-table-row-expand-icon-collapsed" aria-label="Mở rộng dòng" aria-expanded="false"></button></td><td>21 - Miền Nam</td><td>12,435</td></tr>
</tbody></table>
<script>
  window.__clicks = [];
  function log(id) { window.__clicks.push(id); }
  document.getElementById('tra-gop').addEventListener('click', function () {
    log('tra-gop');
    var b = this, m = b.querySelector('span');
    var on = m.textContent.trim() === '✓';
    if (on) { m.textContent = ''; b.className = b.className.replace('border-blue-500 bg-blue-50 text-blue-700', 'border-slate-200 bg-white text-slate-600'); }
    else { m.textContent = '✓'; b.className = b.className.replace('border-slate-200 bg-white text-slate-600', 'border-blue-500 bg-blue-50 text-blue-700'); }
  });
  document.getElementById('ti-trong').addEventListener('click', function () { log('ti-trong'); });
  function pick(activeId) {
    ['dt-thuc', 'dt-quy-doi'].forEach(function (id) {
      var el = document.getElementById(id);
      el.className = el.className.replace('bg-blue-600 text-white', 'bg-white text-gray-600');
      if (id === activeId) el.className = el.className.replace('bg-white text-gray-600', 'bg-blue-600 text-white');
    });
  }
  document.getElementById('dt-thuc').addEventListener('click', function () { log('dt-thuc'); pick('dt-thuc'); });
  document.getElementById('dt-quy-doi').addEventListener('click', function () { log('dt-quy-doi'); pick('dt-quy-doi'); });
  document.querySelector('.ant-table-row-expand-icon').addEventListener('click', function () {
    log('expand'); this.setAttribute('aria-expanded', 'true');
    this.classList.remove('ant-table-row-expand-icon-collapsed'); this.classList.add('ant-table-row-expand-icon-expanded');
  });
</script>
</body></html>`;
}

async function openFixture(page: Page, opts: { traGopOn: boolean; dtQuyDoiOn: boolean }) {
    await page.route('https://baocao.dienmayxanh.com/**', (route) =>
        route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: buildFixture(opts) }),
    );
    await page.addInitScript(() => {
        const w = window as unknown as Record<string, unknown>;
        const store = new Map<string, unknown>();
        w.__clip = '';
        w.GM_setClipboard = (t: string) => { w.__clip = t; };
        w.GM_getValue = (k: string, d: unknown) => (store.has(k) ? store.get(k) : d);
        w.GM_setValue = (k: string, v: unknown) => { store.set(k, v); };
        w.GM_addValueChangeListener = () => 0;
        // Bookmarklet dùng navigator.clipboard — Chromium headless không cấp quyền, ghi ra biến cho test đọc.
        Object.defineProperty(navigator, 'clipboard', {
            configurable: true,
            value: { writeText: async (t: string) => { w.__clip = t; } },
        });
    });
    await page.goto(BI_URL);
}

async function loadUserscript(page: Page) {
    await page.addScriptTag({ content: readFileSync(USERSCRIPT_PATH, 'utf-8') });
    await expect(page.locator('#acp-float-btn')).toBeVisible();
}

const clicks = (page: Page) => page.evaluate(() => (window as unknown as { __clicks: string[] }).__clicks);

test.describe('Click+ userscript — tự bật Trả góp + DT quy đổi', () => {
    test('cả 2 đang tắt → bật đúng 2 nút, mỗi nút 1 lần, rồi mới mở dấu cộng', async ({ page }) => {
        await openFixture(page, { traGopOn: false, dtQuyDoiOn: false });
        await loadUserscript(page);

        await page.locator('#acp-float-btn').click();
        await expect(page.locator('#acp-status-box')).toContainText('Đã tự bật: Trả góp, DT quy đổi');

        expect(await clicks(page)).toEqual(['tra-gop', 'dt-quy-doi', 'expand']);
        await expect(page.locator('#tra-gop span')).toHaveText('✓');
        await expect(page.locator('#dt-quy-doi')).toHaveClass(/bg-blue-600/);
        await expect(page.locator('#dt-thuc')).toHaveClass(/bg-white/);
        // "Tỉ trọng" đang bật sẵn — tuyệt đối không được đụng vào.
        await expect(page.locator('#ti-trong span')).toHaveText('✓');
        // Hộp trạng thái không lọt vào clipboard.
        const clip = await page.evaluate(() => (window as unknown as { __clip: string }).__clip);
        expect(clip).toContain('21 - Miền Nam');
        expect(clip).not.toContain('Đã tự bật');
    });

    test('cả 2 đang bật sẵn → KHÔNG click lại (không tắt nhầm)', async ({ page }) => {
        await openFixture(page, { traGopOn: true, dtQuyDoiOn: true });
        await loadUserscript(page);

        await page.locator('#acp-float-btn').click();
        await expect(page.locator('#acp-status-box')).toContainText('Đã mở 1 mục');

        expect(await clicks(page)).toEqual(['expand']);
        await expect(page.locator('#acp-status-box')).not.toContainText('Đã tự bật');
        await expect(page.locator('#tra-gop span')).toHaveText('✓');
        await expect(page.locator('#dt-quy-doi')).toHaveClass(/bg-blue-600/);
    });

    test('chỉ Trả góp tắt → chỉ bật Trả góp', async ({ page }) => {
        await openFixture(page, { traGopOn: false, dtQuyDoiOn: true });
        await loadUserscript(page);

        await page.locator('#acp-float-btn').click();
        await expect(page.locator('#acp-status-box')).toContainText('Đã tự bật: Trả góp');

        expect(await clicks(page)).toEqual(['tra-gop', 'expand']);
    });
});

test.describe('Bookmarklet Auto Click+ — cùng logic tự bật', () => {
    test('cả 2 đang tắt → bật đúng 2 nút rồi copy', async ({ page }) => {
        await openFixture(page, { traGopOn: false, dtQuyDoiOn: false });
        await page.evaluate(AUTO_CLICK_BOOKMARKLET_CODE.replace(/^javascript:/, ''));

        await expect(page.locator('#__copy_wait_toast__')).toContainText('Đã tự bật: Trả góp, DT quy đổi');
        expect(await clicks(page)).toEqual(['tra-gop', 'dt-quy-doi', 'expand']);
        const clip = await page.evaluate(() => (window as unknown as { __clip: string }).__clip);
        expect(clip).toContain('21 - Miền Nam');
    });

    test('cả 2 đang bật sẵn → không click lại', async ({ page }) => {
        await openFixture(page, { traGopOn: true, dtQuyDoiOn: true });
        await page.evaluate(AUTO_CLICK_BOOKMARKLET_CODE.replace(/^javascript:/, ''));

        await expect(page.locator('#__copy_wait_toast__')).toContainText('Đã copy xong');
        expect(await clicks(page)).toEqual(['expand']);
        await expect(page.locator('#__copy_wait_toast__')).not.toContainText('Đã tự bật');
    });
});
