import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';

/**
 * Nhập liệu bằng CÁCH DÁN TEXT từ HRM (chủ dự án yêu cầu 2026-09-23): bấm vào ô là tự dán,
 * giống Report BI › Cập nhật dữ liệu. Không gọi AI, không tốn hạn mức Gemini.
 * Dữ liệu dùng đúng 2 trang HRM thật đã lưu ở tests/fixtures/.
 */
const day5Text = readFileSync('tests/fixtures/hrm-luong-ngay5.txt', 'utf8');
const day20Text = readFileSync('tests/fixtures/hrm-thuong-ngay20.txt', 'utf8');
const day5CollapsedText = readFileSync('tests/fixtures/hrm-luong-ngay5-thu-gon.txt', 'utf8');

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

test('ảnh xuất có chi tiết từng khoản nhận thay và tổng', async ({ page, context }) => {
    page.on('console', m => { if (m.text().includes('DO-VIEN')) console.log(m.text()); });
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await openTax(page);

    await page.evaluate(text => navigator.clipboard.writeText(text), day5Text);
    await page.getByTestId('paste-day5').click();
    await expect(page.getByText(/Đã đọc Chi tiết lương Đợt 1/)).toBeVisible({ timeout: 10_000 });
    await page.evaluate(text => navigator.clipboard.writeText(text), day20Text);
    await page.getByTestId('paste-day20').click();
    await expect(page.getByText(/Đã đọc Chi tiết thưởng Đợt 2/)).toBeVisible({ timeout: 10_000 });

    // Ghi lại nội dung vùng chụp trong lúc xuất ảnh (khối nhận thay chỉ có mặt khi chụp)
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
    await download.saveAs('test-results/tax-export-nhan-thay.png');
    await page.evaluate(() => { (window as unknown as { __stop: boolean }).__stop = true; });

    const snaps = await page.evaluate(() => (window as unknown as { __snaps: string[] }).__snaps);
    const withProxy = snaps.filter(s => s.includes('Các khoản nhận thay'));
    expect(withProxy.length).toBeGreaterThan(0);

    const sample = withProxy[withProxy.length - 1];
    console.log('KHỐI NHẬN THAY TRONG ẢNH:', sample.split('Các khoản nhận thay')[1].split('Đối chiếu')[0].replace(/\n/g, ' | '));
    // 2 khoản được chọn sẵn (Khoán công việc + 2 khoản "thi đua") và tổng của chúng
    expect(sample).toContain('Khoán công việc T08.2026');
    expect(sample).toContain('60.000 đ');
    expect(sample).toContain('Thưởng thi đua Nạp rút tiền T08.2026');
    expect(sample).toContain('1.500.000 đ');
    expect(sample).toContain('Tổng nhận thay');
    expect(sample).toContain('4.558.000 đ');

    // Ngoài ảnh thì khối này không hiện (giữ giao diện gọn)
    await expect(page.getByTestId('tax-result-panel')).not.toContainText('Các khoản nhận thay');
});

test('phiếu có khối "Tổng tiền giảm trừ" đang thu gọn: vẫn ra đúng số người phụ thuộc', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await openTax(page);

    await page.evaluate(text => navigator.clipboard.writeText(text), day5CollapsedText);
    await page.getByTestId('paste-day5').click();
    await expect(page.getByText(/Đã đọc Chi tiết lương Đợt 1/)).toBeVisible({ timeout: 10_000 });

    // Mở phần "Kê khai thêm & Giảm trừ gia cảnh" để xem số người phụ thuộc app suy ra
    await page.getByText(/Kê khai thêm & Giảm trừ gia cảnh/).click();
    const deps = page.locator('input[type="number"]').first();
    console.log('SỐ NGƯỜI PHỤ THUỘC APP SUY RA:', await deps.inputValue());
    expect(await deps.inputValue()).toBe('2');

    // Tổng giảm trừ trong bảng kết quả phải khớp đúng con số HRM in ra: 28.740.000
    const panel = await page.getByTestId('tax-result-panel').innerText();
    console.log('BẢNG KẾT QUẢ:', panel.replace(/\n/g, ' | '));
    expect(panel.replace(/\s/g, '')).toContain('28.740.000');
});

test('tiêu đề thẻ mở được trang HRM và có hướng dẫn cách copy', async ({ page }) => {
    await openTax(page);

    // Bấm ngay vào TIÊU ĐỀ thẻ là mở trang HRM (không phải chỉ mỗi icon nhỏ)
    const title5 = page.getByRole('link', { name: '1. Lương ngày 5' });
    const title20 = page.getByRole('link', { name: '2. Thưởng ngày 20' });
    await expect(title5).toHaveAttribute('href', /chi-tiet-luong-dmx/);
    await expect(title20).toHaveAttribute('href', /xem-chi-tiet-thuong/);
    await expect(title5).toHaveAttribute('target', '_blank');

    const [popup] = await Promise.all([
        page.waitForEvent('popup', { timeout: 15_000 }),
        title5.click(),
    ]);
    // HRM thật sẽ chuyển tiếp sang trang đăng nhập MWG nên chỉ kiểm tra có mở tab mới
    console.log('BẤM TIÊU ĐỀ MỞ TRANG:', popup.url().slice(0, 60));
    expect(popup).toBeTruthy();
    await popup.close();

    // Hướng dẫn copy dữ liệu 2 đợt
    await page.getByTestId('open-copy-guide').click();
    await expect(page.getByText('Cách lấy dữ liệu từ HRM')).toBeVisible();
    await expect(page.getByText(/Chọn đúng tháng|chọn đúng/i).first()).toBeVisible();
    await expect(page.getByText(/Dán dữ liệu/).first()).toBeVisible();
    await expect(page.getByText(/tự suy ra số người phụ thuộc/i)).toBeVisible();
    await page.screenshot({ path: 'test-results/tax-copy-guide.png' });
    await page.getByRole('button', { name: 'Đã hiểu' }).click();
    await expect(page.getByText('Cách lấy dữ liệu từ HRM')).toHaveCount(0);
    console.log('HƯỚNG DẪN COPY HIỂN THỊ VÀ ĐÓNG ĐƯỢC');
});
