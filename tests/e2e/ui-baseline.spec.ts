import { test, expect, hasRealDataProfile } from './helpers/realDataContext';
import { captureTables, saveSnapshot, loadSnapshot, diffSnapshots, countCells } from './helpers/tableSnapshot';
import type { Page } from '@playwright/test';

/**
 * ẢNH CHỤP SỐ LIỆU MÀN HÌNH trên DỮ LIỆU THẬT — lưới an toàn cho dự án làm lại Report BI.
 *
 * Cách dùng:
 *   SNAPSHOT_LABEL=before npx playwright test tests/e2e/ui-baseline.spec.ts   # trước khi sửa
 *   SNAPSHOT_LABEL=after  npx playwright test tests/e2e/ui-baseline.spec.ts   # sau khi sửa
 *   SNAPSHOT_LABEL=after SNAPSHOT_COMPARE=1 ...                               # sau + so luôn
 *
 * So NỘI DUNG SỐ chứ không so ảnh pixel: giao diện thì CỐ Ý đổi, còn số thì KHÔNG ĐƯỢC đổi.
 */
test.skip(!hasRealDataProfile(), 'cần .e2e-chrome-profile — chạy node scripts/e2e-auth-setup.mjs');

const LABEL = process.env.SNAPSHOT_LABEL || 'after';
const COMPARE = process.env.SNAPSHOT_COMPARE === '1' || LABEL === 'after';

/** Vào Report BI qua sidebar. Dùng baseURL (127.0.0.1) — KHÔNG hardcode localhost: khác origin
 *  thì mất phiên đăng nhập Firebase (đã mắc lỗi này một lần). */
async function openReportBi(page: Page) {
    await page.goto('/');
    const sidebar = page.locator('aside').first();
    await sidebar.waitFor({ state: 'visible', timeout: 60_000 });
    await sidebar.locator('button:has(svg.lucide-users)').first().click();
    await page.getByRole('button', { name: /Tổng quan/i }).first().waitFor({ timeout: 30_000 });
}

/** Các màn hình được theo dõi. Thêm dần khi Đợt 1 tách tới file tương ứng. */
const VIEWS: { name: string; go: (page: Page) => Promise<void> }[] = [
    {
        // CompetitionSummaryView — chỉ render ở sub-tab "Tổng" (activeCompetitionTab === 'tatca').
        name: 'nhanvien-thidua-tong',
        go: async page => {
            await page.getByRole('button', { name: /Nhân viên/i }).first().click({ timeout: 40_000 });
            await page.getByRole('button', { name: 'Thi đua', exact: true }).first().click();
            await page.getByRole('button', { name: 'Tổng', exact: true }).first().click({ timeout: 30_000 });
        },
    },
];

for (const view of VIEWS) {
    test(`ảnh chụp số liệu: ${view.name}`, async ({ page }) => {
        const errors: string[] = [];
        page.on('pageerror', e => errors.push(String(e)));

        await openReportBi(page);
        await view.go(page);
        await page.locator('table tbody tr').first().waitFor({ timeout: 60_000 });
        await page.waitForTimeout(2500);

        const snap = await captureTables(page);
        const cells = countCells(snap);
        saveSnapshot(LABEL, view.name, snap);
        console.log(`[${LABEL}] ${view.name}: ${snap.length} bảng, ${cells} ô`);

        expect(cells, 'phải chụp được dữ liệu thật, không phải bảng rỗng').toBeGreaterThan(0);
        expect(errors, 'không có lỗi runtime').toEqual([]);

        if (COMPARE) {
            const before = loadSnapshot('before', view.name);
            // Thiếu baseline phải ĐỎ, không được im lặng đi qua: một phép so bị bỏ qua âm thầm
            // nguy hiểm hơn không có phép so nào, vì nó cho cảm giác an toàn giả.
            expect(
                before,
                `chưa có ảnh "before" cho ${view.name} — chạy SNAPSHOT_LABEL=before trước khi sửa code`
            ).not.toBeNull();

            const d = diffSnapshots(before!, snap);
            if (d.length) console.log('  LỆCH:\n   ' + d.slice(0, 20).join('\n   '));
            expect(d, 'số liệu phải GIỐNG HỆT bản trước khi sửa').toEqual([]);
        }
    });
}
