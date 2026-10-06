import { test, expect, type Page } from '@playwright/test';

/**
 * CHUẨN HOÁ ICON — Giai đoạn 2: thanh công cụ Report BI → Doanh thu (ảnh chủ dự án gửi 2026-10-02:
 * khung đỏ "Cùng kỳ / Còn lại / Realtime", nút máy ảnh đánh dấu "CHUẨN").
 *
 * Chủ dự án chọn (a): chỉ đồng bộ ICON — đồng hồ, ô tích THẬT, icon Realtime — về cùng cỡ `md` với máy
 * ảnh (16px laptop / 18px điện thoại); không đổi kiểu nút. Trước khi sửa: đồng hồ 14px, ô tích là ô vuông
 * 14px tự dựng, Realtime là chấm 8px, máy ảnh 16px; nút máy ảnh rộng 32px trên điện thoại.
 */
const ANALYSIS = {
    updatedAt: Date.now(), totalCount: 3,
    employees: [
        { id: '101', name: 'Nguyễn Văn A', originalName: '101 - Nguyễn Văn A', department: 'BP ALL IN ONE - DMX' },
        { id: '102', name: 'Trần Thị B', originalName: '102 - Trần Thị B', department: 'BP ALL IN ONE - DMX' },
        { id: '103', name: 'Lê Văn C', originalName: '103 - Lê Văn C', department: 'BP ALL IN ONE - DMX' },
    ],
};
const LUYKE = [
    'BP ALL IN ONE - DMX\t\t',
    '101 - Nguyễn Văn A\t120,000,000\t100',
    '102 - Trần Thị B\t98,000,000\t80',
    '103 - Lê Văn C\t75,000,000\t60',
].join('\n');

async function moBI(page: Page) {
    await page.goto('/?tab=employees');
    await page.getByRole('button', { name: /Kích hoạt Chế độ Dùng Thử/i }).click();
    await page.waitForTimeout(2500);
    await page.evaluate(async ({ analysis, luyke }) => {
        const db = await new Promise<IDBDatabase>((res, rej) => {
            const r = indexedDB.open('BI_HUB_DATABASE_V2');
            r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
        });
        await new Promise<void>((res, rej) => {
            const tx = db.transaction(['settings'], 'readwrite');
            const s = tx.objectStore('settings');
            s.put(['Tân Hiệp'], 'bi_updater-custom-supermarkets');
            s.put(analysis, 'analysis-employees-list');
            s.put(analysis, 'bi_analysis-employees-list');
            s.put(luyke, 'bi_config-Tân Hiệp-danhsach');
            tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error);
        });
        db.close();
    }, { analysis: ANALYSIS, luyke: LUYKE });
    await page.reload();
    await page.waitForTimeout(4000);
    await page.getByRole('button', { name: /^Nhân viên$/i }).first().click();
    await page.waitForTimeout(2500);
}

/** Đo các icon trên thanh công cụ (hàng chứa nút "Realtime") của tab Doanh thu đang hiển thị. */
async function doThanh(page: Page) {
    return page.evaluate(() => {
        const realtime = Array.from(document.querySelectorAll('button')).find(
            (b) => b.textContent?.trim() === 'Realtime' && b.getBoundingClientRect().width > 0);
        if (!realtime) return null;
        const bar = realtime.closest('.no-print')!;
        return Array.from(bar.querySelectorAll('svg.ycx-icon'))
            .filter((el) => el.getBoundingClientRect().width > 0)
            .map((el) => {
                const r = el.getBoundingClientRect();
                const btn = el.closest('button')!.getBoundingClientRect();
                return {
                    name: el.getAttribute('data-icon'),
                    w: r.width, h: r.height,
                    // lệch tâm dọc của icon so với nút chứa nó (px)
                    dy: Math.abs((r.top + r.height / 2) - (btn.top + btn.height / 2)),
                    btnW: btn.width, btnH: btn.height,
                };
            });
    });
}

for (const [label, width, px, tap] of [['iPhone 390', 390, 18, 44], ['laptop 1366', 1366, 16, 0]] as const) {
    test(`${label}: Cùng kỳ / Còn lại / Realtime / xuất ảnh cùng cỡ ${px}px, canh giữa nút`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        await moBI(page);
        const icons = await doThanh(page);
        expect(icons, 'không thấy thanh công cụ Doanh thu').not.toBeNull();
        const names = icons!.map((i) => i.name);
        for (const n of ['clock', 'checkboxOff', 'live', 'exportBatch', 'exportImage']) expect(names).toContain(n);
        expect(names.some((n) => n === 'viewGrid' || n === 'viewList')).toBe(true);

        for (const i of icons!) {
            if (i.name === 'chevronDown' || i.name === 'close') continue; // mũi tên mở menu / xoá chip: cỡ sm có chủ đích
            expect([i.w, i.h], i.name!).toEqual([px, px]);
            expect(i.dy, `${i.name} lệch dọc trong nút`).toBeLessThanOrEqual(1);
        }
        if (tap) {
            for (const i of icons!.filter((x) => ['exportImage', 'exportBatch', 'viewGrid', 'viewList'].includes(x.name!))) {
                expect(Math.min(i.btnW, i.btnH), `vùng chạm ${i.name}`).toBeGreaterThanOrEqual(tap);
            }
        }

        // Bấm "Còn lại" → ô tích chuyển sang trạng thái đã tích, vẫn cùng cỡ.
        await page.getByRole('button', { name: 'Còn lại' }).click();
        const sau = await doThanh(page);
        const tick = sau!.find((i) => i.name === 'checkboxOn');
        expect(tick, 'ô tích phải chuyển sang đã tích').toBeTruthy();
        expect([tick!.w, tick!.h]).toEqual([px, px]);

        const bar = page.locator('.no-print', { has: page.getByRole('button', { name: 'Realtime' }) }).first();
        await bar.screenshot({ path: `test-results/icon-thanh-bi-${width}.png` });
    });
}
