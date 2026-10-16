import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const TNB_PMH_SCRIPT_PATH = resolve(fileURLToPath(new URL('.', import.meta.url)), '../../public/scripts/tnb-pmh-auto-lay-ma.user.js');
const MWG_SCRIPT_PATH = resolve(fileURLToPath(new URL('.', import.meta.url)), '../../public/scripts/mwg-auto-thu-thap-diem-thuong.user.js');
const DATA_URL = 'https://admintnb.com/data/#code=PEFF4Y';

const FIXTURE_HTML = `<!doctype html><html><head><meta charset="utf-8"><title>Tra cứu dữ liệu</title></head><body>
<div class="container">
  <input id="mbm-code" type="text" placeholder="" />
  <button id="mbm-btn" type="button">XÁC NHẬN</button>
  <div id="result" style="display:none;"></div>
</div>
<script>
  var btn = document.getElementById('mbm-btn');
  var inp = document.getElementById('mbm-code');
  var res = document.getElementById('result');
  btn.addEventListener('click', function() {
    if (inp.value) {
      res.textContent = 'Tra cứu thành công: ' + inp.value;
      res.style.display = 'block';
    }
  });
</script>
</body></html>`;

test.describe('TNB Data Auto-fill Userscript', () => {
    test('tnb-pmh-auto-lay-ma.user.js tự động điền #mbm-code và bấm #mbm-btn trên /data/', async ({ page }) => {
        await page.route('https://admintnb.com/**', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'text/html; charset=utf-8',
                body: FIXTURE_HTML,
            });
        });

        await page.addInitScript(() => {
            const w = window as any;
            const store = new Map<string, any>();
            w.GM_getValue = (k: string, d: any) => store.has(k) ? store.get(k) : d;
            w.GM_setValue = (k: string, v: any) => { store.set(k, v); };
            w.GM_setClipboard = () => {};
            w.GM_xmlhttpRequest = () => {};
        });

        await page.goto(DATA_URL);
        await page.addScriptTag({ content: readFileSync(TNB_PMH_SCRIPT_PATH, 'utf-8') });

        // Chờ kết quả tra cứu được kích hoạt tự động
        const resultEl = page.locator('#result');
        await expect(resultEl).toBeVisible({ timeout: 5000 });
        await expect(resultEl).toHaveText('Tra cứu thành công: PEFF4Y');

        const inputVal = await page.locator('#mbm-code').inputValue();
        expect(inputVal).toBe('PEFF4Y');
    });

    test('mwg-auto-thu-thap-diem-thuong.user.js tự động điền #mbm-code và bấm #mbm-btn trên /data/', async ({ page }) => {
        await page.route('https://admintnb.com/**', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'text/html; charset=utf-8',
                body: FIXTURE_HTML,
            });
        });

        await page.addInitScript(() => {
            const w = window as any;
            const store = new Map<string, any>();
            w.GM_getValue = (k: string, d: any) => store.has(k) ? store.get(k) : d;
            w.GM_setValue = (k: string, v: any) => { store.set(k, v); };
            w.GM_addValueChangeListener = () => {};
            w.GM_setClipboard = () => {};
            w.GM_openInTab = () => {};
            w.GM_xmlhttpRequest = () => {};
        });

        await page.goto(DATA_URL);
        await page.addScriptTag({ content: readFileSync(MWG_SCRIPT_PATH, 'utf-8') });

        const resultEl = page.locator('#result');
        await expect(resultEl).toBeVisible({ timeout: 5000 });
        await expect(resultEl).toHaveText('Tra cứu thành công: PEFF4Y');

        const inputVal = await page.locator('#mbm-code').inputValue();
        expect(inputVal).toBe('PEFF4Y');
    });
});
