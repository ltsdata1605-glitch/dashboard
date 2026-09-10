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
 *
 * ⚠️ GIỚI HẠN QUAN TRỌNG — đọc trước khi hoảng vì thấy 'LỆCH':
 * Ảnh chụp lấy từ DỮ LIỆU THẬT ĐANG SỐNG. Nếu ai đó dán dữ liệu mới hoặc sửa target trong lúc
 * giữa hai lần chụp, mọi con số phụ thuộc sẽ lệch — KHÔNG PHẢI code hỏng. Đã xảy ra thật
 * 2026-09-10: mục tiêu tháng đổi 40.052 Tr → 41.592 Tr, kéo theo %HT ở 3 màn.
 *
 * Cách phân biệt: lệch do CODE thường thay đổi CẤU TRÚC (số cột, số dòng, tên cột) hoặc lệch đồng
 * loạt theo một quy luật; lệch do DỮ LIỆU chỉ đổi giá trị và các số liên quan vẫn nhất quán với
 * nhau (kiểm tra bằng cách chia tay: 15.639 / 41.592 = 38% ✓). Nghi ngờ thì chụp lại `before` rồi
 * chạy lại ngay — nếu lần hai khớp thì là dữ liệu, không phải code.
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

/** Vào module Phân Tích (root). Icon `BarChart3` của lucide render ra class
 *  `lucide-chart-column` — KHÔNG phải `lucide-bar-chart-3` như tên component. */
async function openPhanTich(page: Page) {
    await page.goto('/');
    const sidebar = page.locator('aside').first();
    await sidebar.waitFor({ state: 'visible', timeout: 60_000 });
    await sidebar.locator('button:has(svg.lucide-chart-column)').first().click();
}

/** Các màn hình được theo dõi. Thêm dần khi Đợt 1 tách tới file tương ứng. */
const VIEWS: {
    name: string;
    go: (page: Page) => Promise<void>;
    /** Mặc định vào Report BI. Đặt true để vào module Phân Tích. */
    phanTich?: boolean;
    /** Mặc định chụp mọi <table>. Đặt selector để chụp khối không phải bảng (thẻ KPI...). */
    cardSelector?: string;
    /** Phần tử phải xuất hiện trước khi chụp. */
    waitFor?: string;
}[] = [
    {
        // Phân Tích (root) — Đợt 5. Bảng "Chi tiết theo Kho".
        // ⚠️ Bảng này có nút xoay hướng NGANG/DỌC và app NHỚ lựa chọn lần trước trong IndexedDB.
        //    Đổi hướng làm ảnh chụp lệch hoàn toàn (31 dòng × 5 cột ↔ 1 dòng × 38 cột) dù DỮ LIỆU
        //    y hệt. Nếu thấy 'LỆCH' ở màn này, kiểm tra hướng bảng TRƯỚC khi nghi code hỏng.
        name: 'phantich-chitiet-kho',
        phanTich: true,
        go: async () => { /* mở sẵn ở màn chính */ },
    },
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
        // CompetitionView — bảng Thi đua Luỹ kế (Tổng quan > Thi đua). Nguồn của %HT V.Trội và Còn Lại.
        name: 'tongquan-thidua',
        go: async page => {
            await page.getByRole('button', { name: /Tổng quan/i }).first().click({ timeout: 30_000 });
            await page.getByRole('button', { name: 'Thi đua', exact: true }).first().click({ timeout: 30_000 });
            await page.getByText('Luỹ kế', { exact: true }).first().click();
        },
    },
    {
        // SummaryTableView — bảng tổng hợp siêu thị, cùng màn với thẻ KPI (Tổng quan > Doanh thu).
        name: 'tongquan-summary-table',
        go: async page => {
            await page.getByRole('button', { name: /Tổng quan/i }).first().click({ timeout: 30_000 });
            await page.getByRole('button', { name: 'Doanh thu', exact: true }).first().click({ timeout: 30_000 });
        },
    },
    {
        // RevenueTab — Nhân viên › Doanh thu (tab mặc định).
        name: 'nhanvien-doanhthu',
        go: async page => {
            await page.getByRole('button', { name: /Nhân viên/i }).first().click({ timeout: 30_000 });
            await page.getByRole('button', { name: 'Doanh thu', exact: true }).first().click({ timeout: 30_000 });
        },
    },
    {
        // InstallmentTab — Nhân viên › Trả góp.
        name: 'nhanvien-tragop',
        go: async page => {
            await page.getByRole('button', { name: /Nhân viên/i }).first().click({ timeout: 30_000 });
            await page.getByRole('button', { name: 'Trả góp', exact: true }).first().click({ timeout: 30_000 });
        },
    },
    {
        // BonusTab — Nhân viên › Thưởng.
        name: 'nhanvien-thuong',
        go: async page => {
            await page.getByRole('button', { name: /Nhân viên/i }).first().click({ timeout: 30_000 });
            await page.getByRole('button', { name: 'Thưởng', exact: true }).first().click({ timeout: 30_000 });
        },
    },
    // ⚠️ KHÔNG theo dõi 'nhanvien-chitiet': tài khoản dùng để chụp CHƯA DÁN dữ liệu Chi tiết,
    //    màn hình hiện trạng thái rỗng ("Header cần có: Nhân viên DTLK DTQĐ..."). Không phải lỗi —
    //    chỉ là không chụp được ảnh có số để đối chiếu. Thêm lại khi tài khoản có dữ liệu tab này.

    {
        // CompetitionGroupView (CompetitionGroupCard) — sub-tab "Nhóm" (activeCompetitionTab === 'nhom').
        name: 'nhanvien-thidua-nhom',
        go: async page => {
            await page.getByRole('button', { name: /Nhân viên/i }).first().click({ timeout: 30_000 });
            await page.getByRole('button', { name: 'Thi đua', exact: true }).first().click();
            await page.getByRole('button', { name: 'Nhóm', exact: true }).first().click({ timeout: 30_000 });
        },
    },
    {
        // IndividualCompetitionView — sub-tab "Cá nhân" (activeCompetitionTab === 'canhan').
        name: 'nhanvien-thidua-canhan',
        go: async page => {
            await page.getByRole('button', { name: /Nhân viên/i }).first().click({ timeout: 30_000 });
            await page.getByRole('button', { name: 'Thi đua', exact: true }).first().click();
            await page.getByRole('button', { name: 'Cá nhân', exact: true }).first().click({ timeout: 30_000 });
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

        if (view.phanTich) await openPhanTich(page); else await openReportBi(page);
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
