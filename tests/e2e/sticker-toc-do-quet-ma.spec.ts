import { test, expect, type Page } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Dự án chạy ESM (package.json "type": "module") nên không có __dirname
const THU_MUC_TEST = path.dirname(fileURLToPath(import.meta.url));

/**
 * TỐC ĐỘ NHẬN DẠNG MÃ VẠCH (chủ dự án báo 2026-09-25: "chưa nhận dạng nhanh code").
 *
 * Camera giả của Chromium được nạp một video Y4M do `helpers/gen-barcode-y4m.cjs` tự sinh, chứa
 * mã vạch EAN-13 THẬT (tự mã hoá, không cần ffmpeg). Mã được vẽ CỐ Ý NHỎ (mỗi module 1px, cả mã
 * rộng 95px trong khung 640x480) để tái hiện đúng tình huống ngoài siêu thị: tem hơi xa, vạch mảnh.
 *
 * Trước khi sửa, đúng ca này KHÔNG nhận được sau 40 giây (3/3 lần) vì html5-qrcode thu nhỏ vùng
 * quét về kích thước CSS (311x183px) rồi mới giải mã. Sau khi thêm đường quét nhanh bằng
 * BarcodeDetector gốc (đọc thẳng thẻ <video> ở độ phân giải gốc): ~200ms.
 */
const MA_VACH = '200123400001'; // 12 số, mã đầy đủ sau khi thêm số kiểm tra: 2001234000017
const MSP = '2001234000017';

const thuMuc = mkdtempSync(path.join(tmpdir(), 'ycx-barcode-'));
const Y4M = path.join(thuMuc, 'ean13-nho.y4m');
execFileSync('node', [path.join(THU_MUC_TEST, 'helpers', 'gen-barcode-y4m.cjs'), Y4M, MA_VACH, '1']);
if (!existsSync(Y4M)) throw new Error('Không sinh được video mã vạch cho camera giả');

test.use({ launchOptions: { args: [
    '--use-fake-ui-for-media-stream',
    '--use-fake-device-for-media-stream',
    `--use-file-for-fake-video-capture=${Y4M}`,
] } });

const AUTH_HOOK_STUB = `
const FAKE_USER = { uid: 'u-audit', email: 'audit@test.local' };
const FAKE_DATA = { uid: 'u-audit', username: 'admin', role: 'admin', storeId: '910', storeHasAdmin: true };
export function useStickerEventAuth() {
  return { user: FAKE_USER, setUser: () => {}, userData: FAKE_DATA, setUserData: () => {},
           isInitializing: false, setIsInitializing: () => {}, handleLoginSuccess: () => {} };
}
`;

const PRODUCTS = [{
    msp: MSP, sanPham: 'Sản phẩm dùng để đo tốc độ quét', thuongERP: 1000, thuongNong: 0,
    tongThuong: 1000, giaGoc: '1.000.000', giaGiam: '900.000', khuyenMai: '', ngayIn: '25/09/2026',
    selected: false, quantity: 1,
}];

async function moInSticker(page: Page) {
    await page.route('**/features/sticker-event/hooks/useStickerEventAuth.ts*', r =>
        r.fulfill({ status: 200, contentType: 'application/javascript', body: AUTH_HOOK_STUB }));
    await page.goto('/?tab=tools-print-sticker&sub=event');
    await page.waitForTimeout(1200);
    const demo = page.getByText(/Kích hoạt Chế độ Dùng Thử/i).first();
    if (await demo.isVisible().catch(() => false)) {
        await demo.click();
        await page.waitForTimeout(2200);
        await page.goto('/?tab=tools-print-sticker&sub=event');
    }
    await page.waitForTimeout(2500);
    await page.evaluate(async (products) => {
        const db = await new Promise<IDBDatabase>((res, rej) => {
            const r = indexedDB.open('ProductSearchDB', 1);
            r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains('appData')) r.result.createObjectStore('appData'); };
            r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
        });
        await new Promise<void>((res, rej) => {
            const tx = db.transaction(['appData'], 'readwrite');
            tx.objectStore('appData').put(products, 'products');
            tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error);
        });
        db.close();
    }, PRODUCTS);
    await page.reload();
    await page.waitForTimeout(3000);
}

test('mã vạch nhỏ được nhận trong vòng 5 giây', async ({ page, context }) => {
    test.setTimeout(120000);
    await context.grantPermissions(['camera']);
    await page.setViewportSize({ width: 390, height: 844 });
    await moInSticker(page);

    const lanDo: number[] = [];
    for (let i = 1; i <= 2; i++) {
        await page.getByRole('button', { name: /Quét mã/i }).first().click();
        const t0 = Date.now();
        await page.getByText(/THÀNH CÔNG/).first().waitFor({ state: 'visible', timeout: 15000 });
        lanDo.push(Date.now() - t0);
        await page.getByRole('button', { name: /Dừng quét/i }).first().click().catch(() => {});
        await page.waitForTimeout(1200);
    }
    console.log('THỜI GIAN NHẬN DẠNG (ms):', JSON.stringify(lanDo));

    // Ngưỡng 5s đặt rộng rãi so với mức đo được (~200ms) để không đỏ vặt khi máy CI chậm; mục đích
    // là chặn việc quay lại tình trạng cũ (không nhận được gì sau 40 giây).
    for (const ms of lanDo) expect(ms).toBeLessThan(5000);
});

test('vùng quét đủ lớn để giữ chi tiết mã vạch', async ({ page, context }) => {
    await context.grantPermissions(['camera']);
    await page.setViewportSize({ width: 390, height: 844 });
    await moInSticker(page);
    await page.getByRole('button', { name: /Quét mã/i }).first().click();
    await page.waitForTimeout(3000);

    const canvas = await page.evaluate(() => {
        const c = document.querySelector('#html5-qrcode-reader canvas') as HTMLCanvasElement | null;
        return c ? { w: c.width, h: c.height } : null;
    });
    console.log('VÙNG QUÉT (canvas giải mã):', JSON.stringify(canvas));
    // Trước khi sửa: 311x183. html5-qrcode giải mã ĐÚNG ở kích thước này nên càng lớn càng nét.
    expect(canvas).toBeTruthy();
    expect(canvas!.w).toBeGreaterThanOrEqual(340);
    expect(canvas!.h).toBeGreaterThanOrEqual(240);
});
