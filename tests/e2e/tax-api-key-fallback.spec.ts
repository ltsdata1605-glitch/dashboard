import { expect, test } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * Dự phòng khi khoá Gemini chung hết hạn mức: màn Tính Thuế phải hiện đúng lý do VÀ nút mở
 * hộp thoại nhập API Key riêng (miễn phí, lưu trong máy người dùng) — chủ dự án chốt 2026-09-22.
 * Giả lập bằng cách thay module OCR để nó ném đúng lỗi hạn mức (không gọi AI thật, không tốn quota).
 */
const OCR_STUB = `
export const SAMPLE_MWG_DAY20_BONUS_ITEMS = [];
export const extractSalarySlip = async () => {
  throw new Error('Hạn mức Gemini API hôm nay đã hết. Thử lại sau, hoặc dán API Key riêng của bạn ở nút "API Key".');
};
export const extractSalarySlipInfo = extractSalarySlip;
`;

const makePng = (): string => {
    // PNG 1x1 hợp lệ — đủ để qua bước đọc file, vì OCR đã bị stub.
    const base64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
    const dir = mkdtempSync(join(tmpdir(), 'ycx-tax-'));
    const file = join(dir, 'phieu-luong.png');
    writeFileSync(file, Buffer.from(base64, 'base64'));
    return file;
};

test('hết hạn mức AI: hiện lý do + nút mở hộp thoại API Key riêng', async ({ page }) => {
    await page.route('**/features/tax-calculator/services/salarySlipOcrService.ts*', route =>
        route.fulfill({ status: 200, contentType: 'application/javascript', body: OCR_STUB }));

    await page.goto('/?tab=tools-tax');
    await page.getByRole('button', { name: /Kích hoạt Chế độ Dùng Thử/i }).click();
    // Chờ panel nhập liệu thật sự render (tiêu đề "Tính Thuế" có bản ẩn ở sidebar)
    await expect(page.getByRole('button', { name: /Tải ảnh/i }).first()).toBeVisible({ timeout: 30_000 });

    // Tải ảnh vào ô Bảng lương ngày 5 (input ẩn sr-only cạnh nút "Tải ảnh")
    const fileInputs = page.locator('input[type="file"]');
    await expect(fileInputs.first()).toHaveCount(1, { timeout: 15_000 }).catch(() => {});
    console.log('SỐ INPUT FILE:', await fileInputs.count());
    await fileInputs.first().setInputFiles(makePng());
    await page.waitForTimeout(2500);
    console.log('CÓ CHỮ HẠN MỨC?', await page.getByText(/Hạn mức Gemini/).count());

    const err = page.getByText(/Hạn mức Gemini API hôm nay đã hết/).first();
    await expect(err).toBeVisible({ timeout: 20_000 });
    const btn = page.getByRole('button', { name: /API Key riêng của bạn/i }).first();
    await expect(btn).toBeVisible();
    await btn.click();

    // Hộp thoại nhập khoá mở ra, có ô nhập + hướng dẫn tự tạo khoá
    await expect(page.getByPlaceholder(/AIza/i).first()).toBeVisible({ timeout: 10_000 });
    console.log('ĐÃ MỞ HỘP THOẠI API KEY SAU KHI HẾT HẠN MỨC');
    await page.screenshot({ path: 'test-results/tax-api-key-fallback.png' });
});
