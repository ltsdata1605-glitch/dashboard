import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Userscript BI-Sync — chế độ Tự động REALTIME phải xin số CỦA HÔM NAY, không phải Luỹ kế.
 *
 * Lỗi thật (chủ dự án báo 2026-09-30): chạy Realtime nhưng đổ kết quả Luỹ kế. Nguyên nhân: Direct API
 * Engine (bản 6.8–7.0) gửi FROMDATE = ngày 01 đầu tháng → TODATE = hôm nay (= dải Luỹ kế) và Thi đua
 * TIMETYPE = 2 (Luỹ kế; trang MWG dùng ?timetype=1 cho Realtime). Bấm nút "Realtime" trên giao diện
 * không cứu được vì số lấy thẳng từ API.
 *
 * Không vào được baocao.dienmayxanh.com thật (cần đăng nhập nội bộ MWG) nên spec này: dựng trang giả
 * đúng domain, gieo token JWT giả vào localStorage, chặn MỌI lượt POST /kb-api/ để GHI LẠI payload
 * userscript gửi đi, nạp NGUYÊN userscript thật với shim GM_*, rồi kiểm payload.
 */

const USERSCRIPT_PATH = resolve(fileURLToPath(new URL('.', import.meta.url)), '../../public/scripts/mwg-auto-thu-thap-diem-thuong.user.js');
const BI_URL = 'https://baocao.dienmayxanh.com/dashboard/revenue-consolidated?ycx_mode=realtime&job_id=test-rt';

// "Lũy kế" đang được chọn — đúng trạng thái mặc định của trang thật
const FIXTURE = `<!doctype html><html><head><meta charset="utf-8"><title>Doanh thu hợp nhất</title></head><body>
<div><button type="button" class="bg-blue-600 text-white">Lũy kế</button><button type="button" class="bg-white text-gray-600">Realtime</button></div>
<div><button type="button" class="bg-white text-gray-600">DT thực</button><button type="button" class="bg-blue-600 text-white">DT quy đổi</button></div>
<button type="button" class="border-blue-500 bg-blue-50 text-blue-700"><span>✓</span>Trả góp</button>
</body></html>`;

test('Tự động Realtime: mọi lượt gọi API chỉ lấy HÔM NAY, Thi đua TIMETYPE 1', async ({ page }) => {
    const calls: { endpoint: string; body: Record<string, unknown> }[] = [];
    await page.route('https://baocao.dienmayxanh.com/**', async (route) => {
        const req = route.request();
        const url = req.url();
        if (url.includes('/kb-api/')) {
            const endpoint = url.split('/kb-api/')[1];
            calls.push({ endpoint, body: JSON.parse(req.postData() || '{}') });
            const data = endpoint.endsWith('filter-store-getbyasmlist')
                ? [{ id: 1678, Value: '1678 - ĐMM_AGI_TTO - Tri Tôn' }]
                : [];
            return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data }) });
        }
        return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: FIXTURE });
    });
    await page.addInitScript(() => {
        const w = window as unknown as Record<string, unknown>;
        const store = new Map<string, unknown>();
        w.__gm = store;
        w.GM_setClipboard = () => {};
        w.GM_getValue = (k: string, d: unknown) => (store.has(k) ? store.get(k) : d);
        w.GM_setValue = (k: string, v: unknown) => { store.set(k, v); };
        w.GM_addValueChangeListener = () => 0;
        // JWT giả (3 khúc base64url) — acpExtractTokenFromStorage đọc access_token trong localStorage
        localStorage.setItem('oidc.user:test', JSON.stringify({ access_token: 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ0ZXN0In0.c2lnbmF0dXJl' }));
    });
    await page.goto(BI_URL);
    await page.addScriptTag({ content: readFileSync(USERSCRIPT_PATH, 'utf-8') });

    await page.waitForFunction(
        () => Boolean((window as unknown as { __gm: Map<string, unknown> }).__gm.get('ycx_bi_automation_done')),
        undefined,
        { timeout: 60_000 },
    );

    const today = await page.evaluate(() => {
        const d = new Date();
        return Number(`${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`);
    });

    const theoNgay = calls.filter((c) => 'FROMDATE' in c.body);
    // Doanh thu hợp nhất (card + bảng) + Ngành hàng BI + Nhân viên cho 1 siêu thị = 4 lượt
    expect(theoNgay.map((c) => c.endpoint).sort()).toEqual([
        'reports/revenue-consolidated-card-get',
        'reports/revenue-consolidated-get',
        'reports/revenue-consolidated-get',
        'reports/revenue-consolidated-staff-get',
    ]);
    for (const c of theoNgay) {
        expect(c.body.FROMDATE, `${c.endpoint}: FROMDATE phải là hôm nay (ngày 01 đầu tháng = Luỹ kế)`).toBe(today);
        expect(c.body.TODATE, `${c.endpoint}: TODATE`).toBe(today);
    }

    const thiDua = calls.filter((c) => c.endpoint === 'reports/competition-bymsg-get');
    expect(thiDua).toHaveLength(1);
    expect(thiDua[0].body.TIMETYPE, 'Thi đua Realtime: TIMETYPE 1 (2 = Luỹ kế)').toBe(1);
});

test('bảng tiến trình trên trang MWG: cùng giao diện modal Dashboard, sáng đúng bước, xong báo hoàn tất', async ({ page }) => {
    let thaThiDua: () => void = () => {};
    const choThiDua = new Promise<void>((r) => { thaThiDua = r; });
    await page.route('https://baocao.dienmayxanh.com/**', async (route) => {
        const url = route.request().url();
        if (url.includes('/kb-api/')) {
            // Giữ API Thi đua lại để chụp được lúc bảng đang ở bước Thi đua
            if (url.includes('competition-bymsg-get')) await choThiDua;
            const data = url.includes('filter-store-getbyasmlist') ? [{ id: 1678, Value: '1678 - ĐMM_AGI_TTO - Tri Tôn' }] : [];
            return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data }) });
        }
        return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: FIXTURE });
    });
    await page.addInitScript(() => {
        const w = window as unknown as Record<string, unknown>;
        const store = new Map<string, unknown>();
        w.__gm = store;
        w.GM_setClipboard = () => {};
        w.GM_getValue = (k: string, d: unknown) => (store.has(k) ? store.get(k) : d);
        w.GM_setValue = (k: string, v: unknown) => { store.set(k, v); };
        w.GM_addValueChangeListener = () => 0;
        localStorage.setItem('oidc.user:test', JSON.stringify({ access_token: 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ0ZXN0In0.c2lnbmF0dXJl' }));
    });
    await page.setViewportSize({ width: 1314, height: 884 });
    await page.goto(BI_URL);
    await page.addScriptTag({ content: readFileSync(USERSCRIPT_PATH, 'utf-8') });

    const bang = page.locator('#acp-bi-sync-overlay');
    await expect(bang).toContainText('Tự động Cập nhật Realtime');
    await expect(bang).toContainText('4 báo cáo');
    const dong = (ten: string) => bang.locator('div[style*="justify-content:space-between"]', { hasText: ten }).first();
    await expect(dong('Báo cáo Thi đua')).toContainText('Đang xử lý', { timeout: 30_000 });
    await expect(dong('Doanh thu hợp nhất')).toContainText('Đã xong');
    await expect(dong('Ngành hàng BI')).not.toContainText('Đã xong');
    await expect(bang).toContainText('2/4 (50%)');
    // Thứ tự dòng = thứ tự chạy thật: Hợp nhất → Thi đua → Ngành hàng → Nhân viên; Thi đua mang số 2
    const thuTu = await bang.locator('div[style*="font-weight:700;font-size:13px"]').allTextContents();
    // (selector bắt cả ký hiệu trong vòng tròn: số / ✓ — bỏ đi)
    expect(thuTu.map(t => t.trim()).filter(t => t && !/^(\d+|✓)$/.test(t))).toEqual(['Doanh thu hợp nhất', 'Báo cáo Thi đua', 'Ngành hàng BI', 'Doanh thu nhân viên']);
    await expect(dong('Ngành hàng BI')).toContainText('3');
    await page.screenshot({ path: test.info().outputPath('mwg-dang-chay.png') });

    thaThiDua();
    await expect(bang).toContainText('Toàn bộ 4 báo cáo Realtime đã chuyển về Dashboard YCX', { timeout: 30_000 });
    for (const ten of ['Doanh thu hợp nhất', 'Ngành hàng BI', 'Doanh thu nhân viên', 'Báo cáo Thi đua']) {
        await expect(dong(ten)).toContainText('Đã xong');
    }
    await page.screenshot({ path: test.info().outputPath('mwg-xong.png') });
    // Lớp phủ không chặn chuột trang phía sau (đường UI Fallback cần bấm nút trên trang)
    expect(await bang.evaluate((el) => getComputedStyle(el).pointerEvents)).toBe('none');
});
