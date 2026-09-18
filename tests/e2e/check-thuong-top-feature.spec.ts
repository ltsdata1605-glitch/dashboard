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
 * + `CheckThuongTopTable`), nhận `competitionData` qua `postMessage`. Spec này bơm thẳng dữ liệu
 * bằng đúng kênh đó — không cần iframe, không cần file Excel, không cần đăng nhập.
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

async function openTopThuong(page: import('@playwright/test').Page) {
    await page.goto('/');
    await page.getByRole('button', { name: /Kích hoạt Chế độ Dùng Thử/i }).click();

    // Sidebar thu gọn: nhãn chữ bị ẩn nên nhận diện bằng icon lucide (Sidebar.tsx dùng
    // LayoutDashboard cho mục "Check thưởng").
    const sidebar = page.locator('aside').first();
    await sidebar.waitFor({ state: 'visible', timeout: 20_000 });
    await sidebar.locator('button:has(svg.lucide-layout-dashboard)').first().click();

    // Bơm dữ liệu qua đúng kênh mà CheckThuongView.tsx đang lắng nghe (postMessage từ iframe).
    await page.waitForTimeout(1500);
    await page.evaluate((data) => {
        window.postMessage({
            type: 'CHECK_THUONG_FILE_LOADED',
            competitionData: data,
            fileName: 'du-lieu-gia.xlsx',
            uploadTime: '18/09/2026 10:00',
            code1: '910',
        }, '*');
    }, COMPETITION_DATA);
    await page.waitForTimeout(1200);

    // Sidebar BUNG RA khi chuột đi ngang qua và che mất nút — đưa chuột về góc phải trước khi
    // click, nếu không cú click bị nuốt và timeout 60 giây.
    await page.mouse.move(1200, 400);
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: /Top thưởng/i }).first().click();
    await page.waitForTimeout(2000);
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
});
