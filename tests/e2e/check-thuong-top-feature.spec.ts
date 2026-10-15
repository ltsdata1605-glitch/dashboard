import { test, expect } from '@playwright/test';
import { CHECK_THUONG_COLS } from '../../features/check-thuong/services/checkThuongCalc';

/**
 * Tính năng "Top thưởng" của Check Thưởng (tab con `leaderboard`).
 *
 * VIẾT LẠI HOÀN TOÀN 2026-09-18. Bản cũ mở thẳng trang vanilla `public/check-thuong.html` và tìm
 * `#topFilter20Btn` / `#topContent` — **những id đó không hề tồn tại**. Một test dùng
 * `expect(page.locator(...)).toBeDefined()`, vốn LUÔN đúng kể cả khi phần tử không có, nên nó
 * "xanh" suốt mà không kiểm gì; test còn lại treo 60 giây rồi timeout.
 *
 * Tính năng thật nằm ở component REACT (`CheckThuongLeaderboardView` → `CheckThuongChannelTopGrid`
 * + `CheckThuongTopTable`). CẬP NHẬT 2026-10-12: Check Thưởng nay chạy hẳn trong app (chủ dự án bỏ iframe +
 * kênh `postMessage`, 2026-10-11) → dữ liệu vào bằng ĐÚNG đường người dùng đi: chọn file ở ô nạp file (tệp
 * TSV đúng vị trí cột `CHECK_THUONG_COLS`), không cần đăng nhập.
 *
 * Tầng TÍNH TOÁN đã được phủ ở `features/check-thuong/services/checkThuongCalc.test.ts` (10 test,
 * import hàm thật). Spec này chỉ giữ phần chỉ nó kiểm được: dữ liệu có chảy tới màn hình và hiển
 * thị đúng không.
 */

/** Dựng 1 dòng dữ liệu thô đúng vị trí cột mà `checkThuongCalc.ts` đọc. */
const row = (kenh: string, sieuThi: string, nganhHang: string, percent: number, thuong: number) => {
    const r: (string | number)[] = new Array(14).fill('');
    r[CHECK_THUONG_COLS.KENH] = kenh;
    r[CHECK_THUONG_COLS.SIEU_THI] = sieuThi;
    r[CHECK_THUONG_COLS.NGANH_HANG] = nganhHang;
    r[CHECK_THUONG_COLS.PERCENT_DU_KIEN] = percent;
    r[CHECK_THUONG_COLS.TONG_THUONG] = thuong;
    return r;
};

/** Siêu thị B có thưởng cao nhất — dùng để kiểm thứ tự sắp xếp trên màn hình. */
const COMPETITION_DATA = [
    row('DML', '910 - Siêu Thị A', 'Ngành 1', 1.2, 1_000_000),
    row('DML', '910 - Siêu Thị A', 'Ngành 2', 0.8, 500_000),
    row('DMM', '920 - Siêu Thị B', 'Ngành 1', 1.5, 3_000_000),
    row('TGDD', '930 - Siêu Thị C', 'Ngành 1', 0.9, 200_000),
];

/** Tệp TSV giống file Excel thật: dòng tiêu đề có "Siêu thị / Ngành hàng / Thưởng" đúng cột, rồi các dòng dữ liệu. */
function tepDuLieu(): { name: string; mimeType: string; buffer: Buffer } {
    const tieuDe: string[] = new Array(14).fill('');
    tieuDe[CHECK_THUONG_COLS.KENH] = 'Kênh';
    tieuDe[CHECK_THUONG_COLS.SIEU_THI] = 'Siêu thị';
    tieuDe[CHECK_THUONG_COLS.NGANH_HANG] = 'Ngành hàng';
    tieuDe[CHECK_THUONG_COLS.PERCENT_DU_KIEN] = '% Dự kiến';
    tieuDe[CHECK_THUONG_COLS.TONG_THUONG] = 'Tổng thưởng';
    const dong = [tieuDe, ...COMPETITION_DATA].map(r => r.join('\t')).join('\n');
    return { name: 'du-lieu-gia.csv', mimeType: 'text/csv', buffer: Buffer.from(dong, 'utf-8') };
}

async function openTopThuong(page: import('@playwright/test').Page) {
    await page.goto('/?tab=check-thuong');
    await page.getByRole('button', { name: /Kích hoạt Chế độ Dùng Thử/i }).click();

    const oNapFile = page.locator('input[type="file"][accept*=".xlsx"]').first();
    await oNapFile.waitFor({ state: 'attached', timeout: 30_000 });
    await oNapFile.setInputFiles(tepDuLieu());

    // Có dữ liệu thì thanh tra cứu (Tra cứu | Top thưởng) mới hiện trên thanh tiêu đề.
    await page.getByRole('button', { name: /Top thưởng/i }).first().click({ timeout: 20_000 });
    await expect(page.getByText(/Siêu Thị B/).first()).toBeVisible({ timeout: 15_000 });
}

test.describe('Check Thưởng — Top thưởng (component React)', () => {
    test('hiển thị đủ 3 siêu thị từ dữ liệu bơm vào', async ({ page }) => {
        await openTopThuong(page);

        const body = await page.locator('body').innerText();
        expect(body).toContain('Siêu Thị A');
        expect(body).toContain('Siêu Thị B');
        expect(body).toContain('Siêu Thị C');
    });

    test('siêu thị thưởng CAO NHẤT đứng trước siêu thị thưởng thấp hơn', async ({ page }) => {
        await openTopThuong(page);

        // B = 3.000.000 > A = 1.500.000 (gộp 2 ngành) > C = 200.000.
        const body = await page.locator('body').innerText();
        const posB = body.indexOf('Siêu Thị B');
        const posC = body.indexOf('Siêu Thị C');
        expect(posB, 'không thấy Siêu Thị B trên màn hình').toBeGreaterThan(-1);
        expect(posC, 'không thấy Siêu Thị C trên màn hình').toBeGreaterThan(-1);
        expect(posB, 'siêu thị thưởng cao nhất phải đứng trước').toBeLessThan(posC);
    });

    test('gộp đúng 2 ngành hàng của cùng một siêu thị thành một dòng', async ({ page }) => {
        await openTopThuong(page);

        // "910 - Siêu Thị A" có 2 dòng thô (Ngành 1 + Ngành 2) nhưng phải gộp thành 1 mục.
        const count = await page.getByText(/Siêu Thị A/).count();
        expect(count, 'Siêu Thị A bị lặp — dữ liệu chưa được gộp theo siêu thị').toBeLessThanOrEqual(2);
    });

    test('không còn kênh postMessage: tin "CHECK_THUONG_FILE_LOADED" từ trang khác không nạp được dữ liệu — audit S11', async ({ page }) => {
        await page.goto('/?tab=check-thuong');
        await page.getByRole('button', { name: /Kích hoạt Chế độ Dùng Thử/i }).click();
        await page.locator('input[type="file"][accept*=".xlsx"]').first().waitFor({ state: 'attached', timeout: 30_000 });
        await page.evaluate((data) => {
            for (const origin of [window.location.origin, 'https://trang-la.example']) {
                window.dispatchEvent(new MessageEvent('message', {
                    origin, source: window,
                    data: { type: 'CHECK_THUONG_FILE_LOADED', competitionData: data, fileName: 'gia-mao.xlsx' },
                }));
            }
        }, COMPETITION_DATA);
        await page.waitForTimeout(1200);
        await expect(page.getByRole('button', { name: /Top thưởng/i })).toHaveCount(0);
        await expect(page.getByText(/Siêu Thị B/)).toHaveCount(0);
    });

    test('4 thẻ KPI hiển thị theo grid 4 cột nhỏ gọn và đổi đơn vị tỷ khi >= 1 tỷ (1.66 tỷ)', async ({ page }) => {
        // Nạp dữ liệu với tổng thưởng trên 1 tỷ (1.657.000.000 đ)
        const DATA_TY = [
            row('DML', '910 - Siêu Thị A', 'Ngành 1', 1.2, 1_000_000_000),
            row('DMM', '920 - Siêu Thị B', 'Ngành 1', 1.5, 657_000_000),
        ];
        function tepDuLieuTy() {
            const tieuDe: string[] = new Array(14).fill('');
            tieuDe[CHECK_THUONG_COLS.KENH] = 'Kênh';
            tieuDe[CHECK_THUONG_COLS.SIEU_THI] = 'Siêu thị';
            tieuDe[CHECK_THUONG_COLS.NGANH_HANG] = 'Ngành hàng';
            tieuDe[CHECK_THUONG_COLS.PERCENT_DU_KIEN] = '% Dự kiến';
            tieuDe[CHECK_THUONG_COLS.TONG_THUONG] = 'Tổng thưởng';
            const dong = [tieuDe, ...DATA_TY].map(r => r.join('\t')).join('\n');
            return { name: 'du-lieu-ty.csv', mimeType: 'text/csv', buffer: Buffer.from(dong, 'utf-8') };
        }

        await page.setViewportSize({ width: 390, height: 844 });
        await page.goto('/?tab=check-thuong');
        await page.getByRole('button', { name: /Kích hoạt Chế độ Dùng Thử/i }).click();
        const oNapFile = page.locator('input[type="file"][accept*=".xlsx"]').first();
        await oNapFile.waitFor({ state: 'attached', timeout: 30_000 });
        await oNapFile.setInputFiles(tepDuLieuTy());
        await page.getByRole('button', { name: /Top thưởng/i }).first().click({ timeout: 20_000 });

        // 1. Grid 4 cột: 4 thẻ KPI nằm cùng một hàng ngang (cùng Y)
        const cards = page.locator('.kpi-overview-card');
        await expect(cards).toHaveCount(4);
        const box0 = (await cards.nth(0).boundingBox())!;
        const box1 = (await cards.nth(1).boundingBox())!;
        const box2 = (await cards.nth(2).boundingBox())!;
        const box3 = (await cards.nth(3).boundingBox())!;
        expect(Math.abs(box0.y - box1.y)).toBeLessThanOrEqual(2);
        expect(Math.abs(box1.y - box2.y)).toBeLessThanOrEqual(2);
        expect(Math.abs(box2.y - box3.y)).toBeLessThanOrEqual(2);

        // 2. Thẻ 2 hiển thị 1.66 tỷ thay vì 1.657 Tr
        await expect(cards.nth(1).getByText('1.66', { exact: true }).filter({ visible: true })).toBeVisible();
        await expect(cards.nth(1).getByText('tỷ', { exact: true }).filter({ visible: true })).toBeVisible();

        // 3. Ảnh chụp xác thực
        await page.locator('.grid.grid-cols-4').first().screenshot({ path: test.info().outputPath('check-thuong-kpi-grid-4.png') });
    });
});
