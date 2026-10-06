import { test, expect, type Page } from '@playwright/test';
import { auditIcons, type IconAuditResult } from './helpers/iconAudit';

/**
 * CHUẨN HOÁ ICON — Giai đoạn 4: audit icon Report BI (Siêu thị, 4 tab Nhân viên, Cập nhật) ở điện thoại và
 * laptop. Cùng tiêu chí với icon-audit-man-goc (xem helpers/iconAudit.ts).
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
}

async function bam(page: Page, name: RegExp) {
    await page.getByRole('button', { name }).first().click();
    await page.waitForTimeout(2000);
}

for (const [label, width] of [['điện thoại 390', 390], ['laptop 1366', 1366]] as const) {
    test(`audit icon Report BI — ${label}`, async ({ page }) => {
        test.setTimeout(180_000);
        await page.setViewportSize({ width, height: 900 });
        await moBI(page);
        const mobile = width < 1024;
        const ketQua: Record<string, IconAuditResult> = {};
        const chup = async (key: string) => {
            ketQua[key] = await auditIcons(page, mobile);
            await page.screenshot({ path: `test-results/icon-audit-bi-${key}-${width}.png` });
        };
        await chup('sieu-thi');
        await bam(page, /^Nhân viên$/i);
        for (const [key, tab] of [['doanh-thu', /^Doanh thu$/], ['tra-cham', /^Trả chậm$/], ['thi-dua', /^Thi đua$/], ['thuong', /^Thưởng$/]] as const) {
            await bam(page, tab);
            await chup(key);
        }
        await bam(page, /^Cập nhật$/i);
        await chup('cap-nhat');
        console.log(`AUDIT BI ${label}\n` + JSON.stringify(ketQua, null, 1));
        for (const [man, r] of Object.entries(ketQua)) {
            expect(r.legacy, `${man}: icon chưa qua AppIcon`).toEqual([]);
            expect(r.lech, `${man}: icon lệch dọc trong nút`).toEqual([]);
            expect(r.nutChuNhoHon, `${man}: icon trong nút có chữ nhỏ hơn md`).toEqual([]);
            expect(r.vungCham, `${man}: nút chỉ có icon dưới 44px trên điện thoại`).toEqual([]);
        }
    });
}
