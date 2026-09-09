import { expect, test } from '@playwright/test';
import { openReportBi, seedCompetitionData } from './helpers/seed';

/** Bảng Thi đua (Report BI > Tổng quan > Thi đua) — kiểm chứng các thay đổi ngày 2026-09-05. */
test.describe('Report BI — bảng Thi đua Luỹ kế', () => {
    test.beforeEach(async ({ page }) => {
        await openReportBi(page);
        await seedCompetitionData(page);
        await page.getByRole('button', { name: /Tổng quan/i }).first().click();
        await page.getByRole('button', { name: 'Thi đua', exact: true }).first().click();
        // Mặc định là chế độ Realtime + siêu thị "Tổng" (chưa có dữ liệu) — chuyển sang Luỹ kế và
        // chọn đúng siêu thị trong dữ liệu giả.
        await page.getByText('Luỹ kế', { exact: true }).first().click();
        await page.getByText('CỤM', { exact: true }).first().click();
        await page.getByText(/Hùng Vương/).first().click();
        await expect(page.getByText('NHÓM THI ĐUA')).toBeVisible({ timeout: 15_000 });
    });

    test('bộ cột mặc định: đủ số cột, có nhóm Vượt trội và cột Còn Lại', async ({ page }) => {
        const headerCells = page.locator('table thead th');
        const labels = (await headerCells.allInnerTexts()).map(t => t.replace(/\s+/g, ' ').trim());
        console.log('CỘT MẶC ĐỊNH:', JSON.stringify(labels));

        // KHÔNG khoá cứng NHÃN cột (cập nhật 2026-09-09): bộ nhãn hiển thị
        // (COMPETITION_COLUMN_LABELS trong dashboardHelpers.ts) đang được đổi liên tục — chỉ trong
        // 1 buổi đã đổi 'L.Kế'→'LUỸ KẾ', 'Target V.Trội'→'TAR V.TRỘI', '%HT V.Trội'→'%DKHT V.TRỘI'.
        // Khoá chuỗi hiển thị chỉ làm test đỏ liên tục mà không chỉ ra lỗi thật nào. Quy tắc chọn
        // cột được phủ chi tiết ở tầng đơn vị:
        // features/bi-dashboard/components/dashboard/competition/competitionSortAndCalc.test.ts
        // KHÔNG khoá SỐ cột chính xác nữa (cập nhật lần 2, 2026-09-09): bộ cột mặc định vẫn đang
        // được thêm/bớt liên tục — chỉ trong cùng một ngày đã đổi từ 4 lên 5 cột dữ liệu
        // (commit 2c48d6ac thêm '%HT V.TRỘI' cho Luỹ kế). Khoá con số chính xác chỉ làm test đỏ
        // mỗi lần thêm cột hợp lệ. Khoá khoảng hợp lý + các cột BẮT BUỘC phải có là đủ để bắt
        // trường hợp bảng vỡ thật (mất cột, cột rỗng).
        expect(labels.length, 'số cột bất thường (2 cột cố định + các cột dữ liệu)').toBeGreaterThanOrEqual(5);
        expect(labels.length, 'số cột bất thường — nhiều hơn hẳn dự kiến').toBeLessThanOrEqual(10);
        expect(labels[1]).toContain('NHÓM THI ĐUA');
        expect(labels.every(l => l.length > 0), 'có cột trống — nhãn cột hỏng').toBe(true);
        expect(labels.some(l => l.includes('V.TRỘI')), 'mất nhóm cột Vượt trội').toBe(true);
        expect(labels.some(l => l.includes('C.LẠI')), 'mất cột Còn Lại').toBe(true);
    });

    test('2 cột vượt trội có số liệu (không còn "-")', async ({ page }) => {
        const firstRow = page.locator('table tbody tr').filter({ hasText: 'VAS' }).first();
        const targetVT = (await firstRow.locator('td').nth(2).innerText()).trim();
        expect(targetVT).not.toBe('-');
        expect(Number(targetVT.replace(/\./g, ''))).toBeGreaterThan(0);
    });

    test('mặc định sắp xếp giảm dần theo %DKHT', async ({ page }) => {
        // Lấy các dòng của nhóm tiêu chí đầu tiên (mỗi nhóm là 1 <tbody>)
        const rows = page.locator('table tbody').first().locator('tr').filter({ has: page.locator('td') });
        const values: number[] = [];
        const count = await rows.count();
        for (let i = 1; i < count; i++) { // bỏ dòng tiêu đề "TIÊU CHÍ"
            const text = (await rows.nth(i).locator('td').nth(4).innerText()).replace('%', '').trim();
            const num = Number(text);
            if (!Number.isNaN(num)) values.push(num);
        }
        expect(values.length).toBeGreaterThan(1);
        expect([...values].sort((a, b) => b - a)).toEqual(values);
    });

    test('popup Bộ lọc thi đua mở được và có nút gạt cột', async ({ page }) => {
        // THU HẸP PHẠM VI 2026-09-09: test cũ bấm nút gạt rồi khoá THỨ TỰ NHÃN cột sau khi bật.
        // Từ khi các cột Target được liên kết thành 2 nhóm loại trừ nhau (toggleCompetitionColumn),
        // "bật 1 cột thì nó xuống cuối" KHÔNG còn là hành vi đúng — bật nhóm này sẽ TẮT nhóm kia.
        // Quy tắc đó nay được phủ chặt bằng 7 test đơn vị trên chính hàm thuần đó; ở đây chỉ giữ
        // phần E2E kiểm được: popup mở ra và có nút gạt.
        await page.getByTitle(/Bộ lọc thi đua/i).click();
        await expect(page.getByText('Bộ lọc bảng thi đua')).toBeVisible({ timeout: 10_000 });
        const soNutGat = await page.locator('[role="switch"]').count();
        console.log('SỐ NÚT GẠT:', soNutGat);
        expect(soNutGat, 'popup lọc không có nút gạt nào').toBeGreaterThan(0);
    });
});
