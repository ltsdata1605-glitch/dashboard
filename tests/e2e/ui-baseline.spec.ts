import { test, expect, hasRealDataProfile } from './helpers/realDataContext';
import { captureTables, captureCards, saveSnapshot, loadSnapshot, diffSnapshots, countCells } from './helpers/tableSnapshot';
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
const VIEWS: {
    name: string;
    go: (page: Page) => Promise<void>;
    /** Mặc định chụp mọi <table>. Đặt selector để chụp khối không phải bảng (thẻ KPI...). */
    cardSelector?: string;
    /** Phần tử phải xuất hiện trước khi chụp. */
    waitFor?: string;
}[] = [
    {
        // KpiOverview — 4 thẻ KPI đầu màn Tổng quan (DT Thực / DTQĐ / HQQĐ / Trả Chậm).
        name: 'tongquan-kpi-cards',
        cardSelector: '.premium-card-shadow',
        waitFor: '.premium-card-shadow',
        go: async page => {
            await page.getByRole('button', { name: /Tổng quan/i }).first().click({ timeout: 30_000 });
            // App NHỚ sub-tab lần trước (có thể đang ở "Thi đua"). Thẻ KPI của KpiOverview chỉ nằm
            // ở sub-tab "Doanh thu" — không bấm thì chờ mãi không thấy.
            await page.getByRole('button', { name: 'Doanh thu', exact: true }).first().click({ timeout: 30_000 });
        },
    },
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
        // Phải NHỎ HƠN test timeout (60s trong playwright.config.ts): chờ đúng 60s thì test timeout bắn
        // trước và báo "Target page has been closed" — thông báo che mất nguyên nhân thật.
        await page.locator(view.waitFor ?? 'table tbody tr').first().waitFor({ timeout: 25_000 });
        await page.waitForTimeout(2500);

        const snap = view.cardSelector
            ? await captureCards(page, view.cardSelector)
            : await captureTables(page);
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
