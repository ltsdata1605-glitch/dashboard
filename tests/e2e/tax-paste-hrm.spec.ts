import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';

/**
 * Nhập liệu bằng CÁCH DÁN TEXT từ HRM (chủ dự án yêu cầu 2026-09-23): bấm vào ô là tự dán,
 * giống Report BI › Cập nhật dữ liệu. Không gọi AI, không tốn hạn mức Gemini.
 * Dữ liệu dùng đúng 2 trang HRM thật đã lưu ở tests/fixtures/.
 */
const day5Text = readFileSync('tests/fixtures/hrm-luong-ngay5.txt', 'utf8');
const day20Text = readFileSync('tests/fixtures/hrm-thuong-ngay20.txt', 'utf8');

const openTax = async (page: import('@playwright/test').Page) => {
    await page.goto('/?tab=tools-tax');
    await page.getByRole('button', { name: /Kích hoạt Chế độ Dùng Thử/i }).click();
    await expect(page.getByTestId('paste-day5')).toBeVisible({ timeout: 30_000 });
};

test('bấm ô là tự dán: nạp đủ 2 đợt từ text HRM, số liệu khớp phiếu', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await openTax(page);

    // Nạp Đợt 1 (Chi tiết lương)
    await page.evaluate(text => navigator.clipboard.writeText(text), day5Text);
    await page.getByTestId('paste-day5').click();
    await expect(page.getByText(/Đã đọc Chi tiết lương Đợt 1/)).toBeVisible({ timeout: 10_000 });

    // Nạp Đợt 2 (Xem chi tiết thưởng)
    await page.evaluate(text => navigator.clipboard.writeText(text), day20Text);
    await page.getByTestId('paste-day20').click();
    await expect(page.getByText(/Đã đọc Chi tiết thưởng Đợt 2/)).toBeVisible({ timeout: 10_000 });

    // Banner đủ 2 đợt + tổng thu nhập = 7.722.410 + 28.302.349
    await expect(page.getByText('Đã nạp đủ 2 đợt lương & thưởng')).toBeVisible();
    await expect(page.getByText('36.024.759 đ').first()).toBeVisible();

    // Thẻ Đợt 1: lương và BHXH đúng phiếu
    const card5 = await page.getByText('1. Lương ngày 5').locator('xpath=../../..').innerText();
    console.log('THẺ ĐỢT 1:', card5.replace(/\n/g, ' | '));
    expect(card5).toContain('7.722.410');
    expect(card5).toContain('496.650');

    // Thẻ Đợt 2: thưởng và thuế đã khấu trừ đúng phiếu
    const card20 = await page.getByText('2. Thưởng ngày 20').locator('xpath=../../..').innerText();
    console.log('THẺ ĐỢT 2:', card20.replace(/\n/g, ' | '));
    expect(card20).toContain('28.302.349');
    expect(card20).toContain('305.285');

    // Danh sách thưởng nóng: 8 khoản, 2 khoản "Khoán/Thi đua" được chọn sẵn làm nhận thay
    await expect(page.getByText(/Nóng \(8\)/)).toBeVisible();
    await expect(page.getByText('Khoán công việc T08.2026')).toBeVisible();

    // Ngân hàng nhận tiền tự khớp VietinBank + số tài khoản lấy từ phiếu
    const bankSelect = page.locator('select').filter({ hasText: 'Chọn ngân hàng' }).first();
    await expect(bankSelect).toHaveValue('VietinBank');
    await expect(page.locator('input[value="109005866487"]').first()).toBeVisible();
    console.log('NGÂN HÀNG TỰ CHỌN TỪ PHIẾU:', await bankSelect.inputValue());

    await page.screenshot({ path: 'test-results/tax-paste-hrm.png', fullPage: true });
});

test('dán nhầm ô: báo lỗi rõ ràng, không ghi đè dữ liệu', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await openTax(page);

    await page.evaluate(text => navigator.clipboard.writeText(text), day20Text);
    await page.getByTestId('paste-day5').click();
    await expect(page.getByText(/không phải trang "Chi tiết lương"/).first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Đã nạp đủ 2 đợt lương & thưởng')).toHaveCount(0);
    console.log('ĐÃ CHẶN DÁN NHẦM Ô ĐỢT 1');
});

test('trình duyệt chặn đọc bộ nhớ tạm: hiện ô để tự Ctrl+V', async ({ page }) => {
    // Không cấp quyền clipboard-read -> readText() ném lỗi
    await page.addInitScript(() => {
        Object.defineProperty(navigator, 'clipboard', {
            configurable: true,
            value: { readText: () => Promise.reject(new Error('bị chặn')) },
        });
    });
    await openTax(page);

    await page.getByTestId('paste-day5').click();
    const area = page.getByTestId('paste-area-day5');
    await expect(area).toBeVisible();

    // Mô phỏng người dùng tự dán vào ô
    await area.fill(day5Text);
    await expect(page.getByText(/Đã đọc Chi tiết lương Đợt 1/)).toBeVisible({ timeout: 10_000 });
    await expect(area).toHaveCount(0);
    console.log('Ô DÁN TAY HOẠT ĐỘNG KHI BỊ CHẶN CLIPBOARD');
});
