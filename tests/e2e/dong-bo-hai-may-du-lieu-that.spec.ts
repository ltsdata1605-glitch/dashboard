import { expect, test, type Browser, type Page } from '@playwright/test';
import { chanGhiCloud, dangNhapBangToken, hasCustomToken } from './helpers/customTokenLogin';

/**
 * 2 THIẾT BỊ cùng tài khoản thật (laptop 1440 + iPhone 390) đăng nhập song song (2026-10-14). CHỈ ĐỌC: mọi lượt ghi
 * (kênh Write, transaction commit, Cloud Function trừ resolveSession/listManagedUsers) bị chặn và được kiểm là KHÔNG có —
 * lúc mở app không được đẩy gì lên Cloud khi chưa ai sửa gì (đẩy cấu hình nhẹ nay theo từng khoá, services/lightSync.ts).
 * Đo: thời gian từ lúc đăng nhập tới khi vào app, và 2 máy có cùng cấu hình nhẹ + cùng số dòng dữ liệu không.
 */
test.skip(!hasCustomToken(), 'Chưa có custom token của tài khoản test');
test.setTimeout(240_000);

const launch = {
    ...(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}),
    ...(process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' } } : {}),
};
test.use({ launchOptions: launch });

const IPHONE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';

async function moMay(browser: Browser, ten: string, opts: Parameters<Browser['newContext']>[0]) {
    const ctx = await browser.newContext({ baseURL: test.info().project.use.baseURL, ...opts });
    const page = await ctx.newPage();
    const loi: string[] = [];
    page.on('pageerror', e => loi.push(e.message));
    const logs: string[] = [];
    page.on('console', m => { const t = m.text(); if (/Cloud Sync|CloudData|cấu hình nhẹ/.test(t)) logs.push(t.slice(0, 160)); });
    const biChan = await chanGhiCloud(page);
    const ghi: string[] = [];
    {
        // Cho qua yêu cầu MỞ luồng ghi (không mang dữ liệu), mọi yêu cầu có "writes" vẫn bị HUỶ + ghi lại để kiểm.
        await page.context().route(/firestore\.googleapis\.com\/.*Firestore\/Write\//, route => {
            const than = decodeURIComponent((route.request().postData() || '').replace(/\+/g, ' '));
            if (/"writes"|"update"|"delete"|"transform"/.test(than)) {
                const ten = [...new Set([...than.matchAll(/documents\/([^"\\,}]{1,140})/g)].map(m => m[1].replace(/users\/[^/]+/, 'users/U')))];
                // Lấy TRỌN danh sách trường: cắt 300 ký tự như trước thì tên khoá cuối bị cụt ("settings.khoDataCa") — lượt dọn
                // khoá Kho cũ (2026-10-21) xoá cả chục trường một lượt.
                const truong = [...new Set([...than.matchAll(/"fieldPaths"\s*:\s*\[([^\]]*)/g)].map(m => m[1]))];
                ghi.push(`WRITE ${ten.join(',')} ${truong.join(';')}`);
                return route.abort();
            }
            return route.continue();
        });
    }
    const t0 = Date.now();
    await dangNhapBangToken(page);
    await expect(page.getByRole('button', { name: /Tiếp tục với Google/i })).toHaveCount(0, { timeout: 60_000 });
    await expect(page.locator('#root')).not.toBeEmpty();
    const vaoApp = Date.now() - t0;
    return { ten, page, ctx, loi, logs, biChan, vaoApp, ghi };
}

const cauHinhNhe = (page: Page) => page.evaluate(async () => {
    const dbs = await indexedDB.databases();
    const ten = dbs.map(d => d.name || '').find(n => n.startsWith('BI_HUB_DATABASE_V2__'));
    if (!ten) return null;
    return await new Promise<Record<string, string>>((ok) => {
        const r = indexedDB.open(ten);
        r.onsuccess = () => {
            const db = r.result;
            const ten2 = Array.from(db.objectStoreNames).find(n => /setting/i.test(n));
            if (!ten2) { ok({}); return; }
            const tx = db.transaction(ten2, 'readonly');
            const st = tx.objectStore(ten2);
            const out: Record<string, string> = {};
            const req = st.openCursor();
            req.onsuccess = () => {
                const c = req.result;
                if (!c) { ok(out); return; }
                const k = String(c.key);
                if (/^(kpiCardConfig|kpiTargets|warehouseTargets|gtdhTargets|summaryTableConfig)$/.test(k)) out[k] = JSON.stringify(c.value).slice(0, 4000);
                c.continue();
            };
        };
        r.onerror = () => ok({});
    });
});

test('2 máy cùng tài khoản: vào app nhanh, cùng dữ liệu, không ghi gì lúc mở', async ({ browser }) => {
    const [laptop, iphone] = await Promise.all([
        moMay(browser, 'laptop', { viewport: { width: 1440, height: 900 } }),
        moMay(browser, 'iphone', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, userAgent: IPHONE_UA }),
    ]);
    // Chờ đồng bộ nền chạy xong (listener gắn sau 2 s, kéo cấu hình + dữ liệu Kho).
    await Promise.all([laptop.page.waitForTimeout(25_000), iphone.page.waitForTimeout(0)]);
    const [cA, cB] = await Promise.all([cauHinhNhe(laptop.page), cauHinhNhe(iphone.page)]);
    for (const m of [laptop, iphone]) {
        await m.page.screenshot({ path: `test-results/hai-may-${m.ten}.png` });
        console.log(`[${m.ten}] vào app sau ${m.vaoApp} ms | lỗi JS ${m.loi.length} | bị chặn ghi: ${JSON.stringify(m.biChan)}`);
        console.log(`[${m.ten}] định ghi (đã chặn): ${JSON.stringify([...new Set(m.ghi)])}`);
        console.log(`[${m.ten}] log đồng bộ: ${JSON.stringify(m.logs.slice(0, 12))}`);
    }
    console.log('KHOA_CAU_HINH', JSON.stringify(Object.keys(cA || {})), JSON.stringify(Object.keys(cB || {})));
    const parse = (o: Record<string, string> | null) => Object.fromEntries(Object.entries(o || {}).map(([k, v]) => [k, JSON.parse(v)]));
    expect(parse(cA)).toEqual(parse(cB));
    // Mở app khi chưa ai sửa gì: KHÔNG được ghi cấu hình (doc setting/configuration, hay `settings.<khoá>` của đường cũ
    // ngoài vài khoá nó còn quản — services/syncService.ts → laKhoaDongBoCu). Trước 2026-10-14: ghi settings.active_tab,
    // bộ lọc, lịch tự đồng bộ… của máy này lên, rồi máy khác đăng nhập chép đè xuống.
    const DUONG_CU_CON_QUAN = /^"settings\.(salesFilesRegistry|stickerPrinterState|stickerPrintHistory|stickerSavedLists|last-updates-list|summary-|competition-)/;
    // Lượt DỌN một lần (2026-10-21, AuthContext): xoá bộ đệm Kho của app bản cũ khỏi users/{uid}.settings (làm tài liệu gần 1 MB).
    // Tài khoản test luôn còn các khoá này vì test chặn ghi → lần nào cũng thấy; đã có bài riêng: dang-nhap-ho-so-tinh-san.
    const DON_KHOA_KHO_CU = /^"settings\.`?(khoDataCache_|khoDataAppliedSnapshot::)/;
    for (const m of [laptop, iphone]) {
        const ghi = m.ghi.join('\n');
        expect(ghi, m.ten).not.toContain('setting/configuration');
        const truongSettings = [...ghi.matchAll(/"settings\.[^"\n]+"/g)].map(x => x[0]);
        expect(truongSettings.filter(t => !DUONG_CU_CON_QUAN.test(t) && !DON_KHOA_KHO_CU.test(t)), m.ten).toEqual([]);
        expect(m.biChan.filter(x => x.startsWith('Firestore/commit')), m.ten).toEqual([]);
    }
    await laptop.ctx.close(); await iphone.ctx.close();
});
