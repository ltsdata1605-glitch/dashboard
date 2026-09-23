import { expect, test } from '@playwright/test';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * Yêu cầu chủ dự án 2026-09-23 cho màn Tính Thuế:
 *  1. Phiếu lương có tên ngân hàng -> TỰ chọn "Ngân hàng nhận tiền" (trước đây mặc định 'MB'
 *     không có trong danh mục nên vừa chặn tự điền vừa làm QR không dựng được).
 *  2. Thẻ "Mã QR Chuyển Khoản Nhanh" chỉ còn MỘT chế độ "Đồng nghiệp trả thuế".
 *  3. "Số tiền cần chuyển" nói rõ người dùng được nhận lại bao nhiêu tiền hoàn thuế do nhận thay.
 *  4. Ảnh xuất ra: ẩn thông tin thu nhập, có tên người kê khai.
 * OCR bị thay bằng bản giả (không gọi AI thật, không tốn hạn mức) nhưng vẫn đi qua danh mục
 * ngân hàng THẬT để kiểm chứng bước tự khớp ngân hàng.
 */
const OCR_STUB = `
export const SAMPLE_MWG_DAY20_BONUS_ITEMS = [];
export const extractSalarySlip = async (file, kind) => {
  if (kind === 'day5') {
    return {
      fullName: 'TRƯƠNG HOÀNG PHÚC',
      monthYear: '08/2026',
      incomeDay5: 5278580,
      insuranceSalary: 4730000,
      insurance: 496650,
      dependents: 0,
      personalDeduction: 15500000,
      totalDeductionsDay1: 15996650,
      remainingDeductionsDay1: 10718070,
      bankAccount: '0123456789',
      bankName: 'NH TMCP Quân Đội (MB)'
    };
  }
  return {
    fullName: 'TRƯƠNG HOÀNG PHÚC',
    monthYear: '08/2026',
    incomeDay20: 25462224,
    bonusMain: 2648224,
    bonusHot: 22814000,
    actualTaxDay20: 974415,
    bonusItems: [
      { id: 'hot_1', name: 'Khoán công việc', amount: 9305000, category: 'hot' },
      { id: 'hot_2', name: 'Thưởng thi đua ngành hàng', amount: 2337000, category: 'hot' },
      { id: 'main_1', name: 'Thưởng doanh thu', amount: 2648224, category: 'main' }
    ],
    bankAccount: '0123456789',
    bankName: 'NH TMCP Quân Đội (MB)'
  };
};
export const extractSalarySlipInfo = extractSalarySlip;
`;

const makePng = (): string => {
    const base64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
    const dir = mkdtempSync(join(tmpdir(), 'ycx-tax-qr-'));
    const file = join(dir, 'phieu-luong.png');
    writeFileSync(file, Buffer.from(base64, 'base64'));
    return file;
};

/** Mở màn Tính Thuế ở chế độ dùng thử rồi nạp cả 2 phiếu (đợt 1 + đợt 2) qua OCR giả */
const openTaxWithBothSlips = async (page: import('@playwright/test').Page) => {
    await page.route('**/features/tax-calculator/services/salarySlipOcrService.ts*', route =>
        route.fulfill({ status: 200, contentType: 'application/javascript', body: OCR_STUB }));

    await page.goto('/?tab=tools-tax');
    await page.getByRole('button', { name: /Kích hoạt Chế độ Dùng Thử/i }).click();
    await expect(page.getByRole('button', { name: /Tải ảnh/i }).first()).toBeVisible({ timeout: 30_000 });

    const png = makePng();
    const fileInputs = page.locator('input[type="file"]');
    const count = await fileInputs.count();
    await fileInputs.nth(0).setInputFiles(png);
    await expect(page.getByText(/Đã nhận diện Bảng lương Đợt 1|TRƯƠNG HOÀNG PHÚC/).first())
        .toBeVisible({ timeout: 15_000 });
    if (count > 1) {
        await fileInputs.nth(1).setInputFiles(png);
    }
    await page.waitForTimeout(1500);
};

test('phiếu lương có tên ngân hàng: tự chọn "Ngân hàng nhận tiền" + dựng được QR', async ({ page }) => {
    await openTaxWithBothSlips(page);

    const bankSelect = page.locator('select').filter({ hasText: 'Chọn ngân hàng' }).first();
    await expect(bankSelect).toBeVisible({ timeout: 15_000 });
    await expect(bankSelect).toHaveValue('MBBank');

    // Số tài khoản cũng lấy từ phiếu -> QR thật sự được dựng
    await expect(page.locator('input[value="0123456789"]').first()).toBeVisible();
    await expect(page.locator('img[alt*="VietQR"]')).toBeVisible({ timeout: 10_000 });
    console.log('NGÂN HÀNG TỰ CHỌN:', await bankSelect.inputValue());
});

test('thẻ QR chỉ còn chế độ "Đồng nghiệp trả thuế" và nói rõ tiền hoàn thuế nhận lại', async ({ page }) => {
    await openTaxWithBothSlips(page);

    await expect(page.getByText('Mã QR Chuyển Khoản Nhanh')).toBeVisible();
    await expect(page.getByText('Đồng nghiệp trả thuế')).toBeVisible();
    await expect(page.getByText('Thực chuyển đồng nghiệp')).toHaveCount(0);

    // "Số tiền cần chuyển" = đúng phần thuế phát sinh do nhận thay (khối "Thuế nhận thay giữ lại")
    const taxHero = await page.locator('[data-testid="tax-result-panel"] .text-2xl').first().innerText();
    const transferAmount = await page.getByTestId('qr-transfer-amount').innerText();
    console.log('THUẾ NHẬN THAY:', taxHero.trim(), '| SỐ TIỀN CẦN CHUYỂN:', transferAmount.trim());
    expect(transferAmount.trim()).toBe(taxHero.trim());

    await expect(page.getByText(/Bạn sẽ/).first()).toBeVisible();
    await expect(page.getByText(/nhận lại .* tiền hoàn thuế do nhận thay/).first()).toBeVisible();
    await page.screenshot({ path: 'test-results/tax-qr-single-mode.png', fullPage: true });
});

test('xuất ảnh: ẩn thông tin thu nhập, ảnh có tên người kê khai', async ({ page }) => {
    await openTaxWithBothSlips(page);

    // Ghi lại nội dung khối kết quả trong lúc chụp ảnh (trạng thái che chỉ tồn tại vài khung hình)
    await page.evaluate(() => {
        const w = window as unknown as { __snaps: string[]; __stop?: boolean };
        w.__snaps = [];
        const tick = () => {
            const panel = document.querySelector('[data-testid="tax-result-panel"]') as HTMLElement | null;
            if (panel) w.__snaps.push(panel.innerText);
            if (!w.__stop) requestAnimationFrame(tick);
        };
        tick();
    });

    const downloadPromise = page.waitForEvent('download', { timeout: 30_000 });
    await page.getByRole('button', { name: /Xuất ảnh/i }).click();
    const download = await downloadPromise;
    await page.evaluate(() => { (window as unknown as { __stop: boolean }).__stop = true; });

    const snaps = await page.evaluate(() => (window as unknown as { __snaps: string[] }).__snaps);
    const masked = snaps.filter(s => s.includes('••••••••'));
    console.log('SỐ KHUNG HÌNH ĐANG CHE THU NHẬP:', masked.length, '/', snaps.length);
    expect(masked.length).toBeGreaterThan(0);

    const sample = masked[masked.length - 1];
    // Thu nhập bị che, nhưng tên người kê khai và tiền thuế vẫn còn để đồng nghiệp đối chiếu
    expect(sample).toContain('Thông tin thu nhập đã được ẩn khi xuất ảnh.');
    expect(sample).toContain('TRƯƠNG HOÀNG PHÚC');
    expect(sample).not.toContain('30.740.804');
    expect(sample).not.toContain('5.278.580');

    await download.saveAs('test-results/tax-export-anh-that.png');
    console.log('TÊN FILE ẢNH:', download.suggestedFilename());
    expect(download.suggestedFilename()).toContain('TRƯƠNG_HOÀNG_PHÚC');

    // Sau khi chụp xong, màn hình trở lại hiển thị đầy đủ
    await expect(page.getByTestId('tax-result-panel')).not.toContainText('••••••••');
});
