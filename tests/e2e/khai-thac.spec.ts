import { expect, test, type Page } from '@playwright/test';

/**
 * "Báo cáo khai thác" (features/khai-thac) — thay link ngoài Bao-Cao-Khai-Thac.
 * Vào bằng chế độ Dùng thử (không cần đăng nhập), đi hết luồng chính: đặt tên NV → nhập đơn →
 * Báo cáo (copy + ghi nhật ký + làm sạch) → Nhật ký có dòng → Biểu đồ có KPI → Khách hàng.
 * Tầng tính toán đã phủ ở tests/unit/khai-thac.test.ts; spec này chỉ kiểm dữ liệu chảy tới màn hình.
 */

const SHOT_DIR = 'test-results/khai-thac';

async function openKhaiThac(page: Page) {
    await page.addInitScript(() => {
        const w = window as unknown as { __clip: string };
        w.__clip = '';
        Object.defineProperty(navigator, 'clipboard', {
            configurable: true,
            value: { writeText: async (t: string) => { w.__clip = t; } },
        });
    });
    await page.goto('/');
    await page.getByRole('button', { name: /Kích hoạt Chế độ Dùng Thử/i }).click();
    await clickSidebarBaoCao(page);
}

/** Sidebar desktop thu gọn mặc định (chỉ icon, không có tên) — rê chuột để mở rộng rồi mới bấm. */
async function clickSidebarBaoCao(page: Page) {
    await page.locator('aside').first().hover();
    // Mục "Báo cáo" giờ là tab nội bộ, không còn mở tab mới.
    await page.getByRole('button', { name: /^Báo cáo$/ }).first().click();
    await expect(page.getByTestId('khai-thac-view')).toBeVisible({ timeout: 30_000 });
    // Rời chuột khỏi sidebar để nó thu gọn lại — đang mở rộng thì nó đè lên thanh tab con của view.
    await page.mouse.move(900, 500);
    await page.waitForTimeout(400);
}

test.describe('Báo cáo khai thác', () => {
    test('luồng chính: tên NV → nhập đơn → Báo cáo → Nhật ký → Biểu đồ', async ({ page }) => {
        await openKhaiThac(page);

        // Chưa có tên hợp lệ → đang ở chế độ nhập tên.
        const nameInput = page.getByTestId('staff-name-input');
        await expect(nameInput).toBeVisible();
        await nameInput.fill('21707 - Sơn');
        await nameInput.press('Enter');
        await expect(page.getByTestId('staff-name')).toContainText('21707 - Sơn');

        // Doanh thu + trả chậm + Mở Ví (chỉ là cờ, không còn ô tiền Ví) + đếm mặt hàng.
        await page.locator('#kt-revenue').fill('8.5');
        await page.locator('#kt-installment').fill('0.3');
        await page.getByRole('button', { name: 'Mở Ví' }).click();
        await page.getByRole('button', { name: 'Tăng Tivi' }).click();
        await page.getByRole('button', { name: 'Tăng Tủ lạnh' }).click();
        await page.getByRole('button', { name: 'Tăng Tủ lạnh' }).click();
        await page.getByRole('button', { name: 'Tăng SIM' }).click();
        await page.getByRole('button', { name: 'Tăng Kaspersky' }).click();
        await page.getByLabel('Bảo hiểm ĐMX (Tr)').fill('1.2');
        await page.getByRole('button', { name: 'Tăng Tai nghe' }).click();
        await page.getByRole('button', { name: 'Tăng Máy lọc nước' }).click();
        await page.getByRole('button', { name: 'Tăng Bếp điện' }).click();
        await page.getByLabel('Ghi chú').fill('Khách hẹn giao chiều');

        const preview = page.getByTestId('preview');
        await expect(preview).toContainText('💰 Doanh thu: 8.5tr');
        await expect(preview).toContainText('- T.Chậm: 0.3Tr ~ 4% | Mở Ví: ✓');
        await expect(preview).toContainText('📦 S.Phẩm: Tivi: 1 | TL: 2');
        await expect(preview).toContainText('🛠 D.Vụ: SIM: 1 | Kaspersky: 1');
        await expect(preview).not.toContainText('Ví: 0.3');
        await expect(preview).toContainText('🛡 B.Hiểm: ĐMX: 1.2');
        await expect(preview).toContainText('🎧 P.Kiện: T.Nghe: 1');
        await expect(preview).toContainText('🏠 G.Dụng: MLN: 1 | B.Điện: 1');
        await expect(preview).toContainText('📝 Khách hẹn giao chiều');
        await expect(page.getByTestId('revenue-block')).toContainText('Trả chậm 4%');
        await page.screenshot({ path: `${SHOT_DIR}/01-entry-desktop.png`, fullPage: true });

        // Báo cáo → clipboard nhận đúng văn bản, form sạch, có toast.
        await page.getByTestId('btn-submit-report-desktop').click();
        await expect(page.getByText(/Đã copy báo cáo/)).toBeVisible();
        const clip = await page.evaluate(() => (window as unknown as { __clip: string }).__clip);
        expect(clip.startsWith('📊 BÁO CÁO KHAI THÁC')).toBe(true);
        expect(clip).toContain('📦 S.Phẩm: Tivi: 1 | TL: 2');
        await expect(page.locator('#kt-revenue')).toHaveValue('');
        await expect(page.getByTestId('count-Tivi')).toHaveText('0');
        await expect(page.getByTestId('staff-name')).toContainText('21707 - Sơn'); // tên giữ nguyên sau khi làm sạch

        // Nhật ký: 1 dòng, mở ra thấy văn bản.
        await page.getByRole('button', { name: /^Nhật ký/ }).click();
        const rows = page.getByTestId('history-row');
        await expect(rows).toHaveCount(1);
        await expect(rows.first()).toContainText('21707 - Sơn');
        await expect(rows.first()).toContainText('8.5');
        await rows.first().click();
        await expect(page.getByTestId('history-text')).toContainText('🏠 G.Dụng: MLN: 1 | B.Điện: 1');
        await page.screenshot({ path: `${SHOT_DIR}/02-history.png`, fullPage: true });

        // Biểu đồ: KPI hôm nay.
        await page.getByRole('button', { name: /^Biểu đồ/ }).click();
        const kpi = page.getByTestId('kpi-strip');
        await expect(kpi).toBeVisible();
        await expect(kpi).toContainText('8.5');
        await expect(kpi).toContainText('4');
        await page.screenshot({ path: `${SHOT_DIR}/03-dashboard.png`, fullPage: true });

        // Sửa lại từ Nhật ký → quay về form với dữ liệu cũ.
        await page.getByRole('button', { name: /^Nhật ký/ }).click();
        await page.getByRole('button', { name: 'Sửa lại' }).first().click();
        await expect(page.locator('#kt-revenue')).toHaveValue('8.5');
        await expect(page.getByTestId('count-Tivi')).toHaveText('1');

        // Dữ liệu còn sau khi tải lại trang (IndexedDB).
        await page.reload();
        await clickSidebarBaoCao(page);
        await expect(page.locator('#kt-revenue')).toHaveValue('8.5');
        await page.getByRole('button', { name: /^Nhật ký/ }).click();
        await expect(page.getByTestId('history-row')).toHaveCount(1);
    });

    test('khách hàng: thêm, đổi trạng thái (vạch màu), xoá qua ConfirmDialog', async ({ page }) => {
        await openKhaiThac(page);
        await page.getByRole('button', { name: /^Khách hàng/ }).click();

        await page.locator('#lead-name').fill('Nguyễn Văn A');
        await page.locator('#lead-phone').fill('0909123456');
        await page.getByRole('button', { name: 'Tivi', exact: true }).click();
        await page.getByLabel('Sản phẩm khác').fill('Máy sấy');
        await page.getByTestId('btn-add-lead').click();

        const row = page.getByTestId('lead-row').first();
        await expect(row).toContainText('Nguyễn Văn A');
        await expect(row).toContainText('0909123456');
        await expect(row).toContainText('Tivi, Máy sấy');
        await expect(row).toHaveClass(/border-l-rose-500/);

        await row.getByLabel('Trạng thái').selectOption('Đã chốt');
        await expect(row).toHaveClass(/border-l-emerald-600/);
        await row.getByLabel(/Thông tin chốt/).fill('Giao chiều, cọc 500k');
        await page.screenshot({ path: `${SHOT_DIR}/04-leads.png`, fullPage: true });

        await row.getByRole('button', { name: /Xoá Nguyễn Văn A/ }).click();
        await page.getByRole('button', { name: 'Xoá', exact: true }).click();
        await expect(page.getByTestId('lead-row')).toHaveCount(0);
    });

    test('thêm mục tuỳ chỉnh vào nhóm Phụ kiện và xuất hiện trong văn bản', async ({ page }) => {
        await openKhaiThac(page);
        await page.getByTestId('staff-name-input').fill('1 - A');
        await page.getByTestId('staff-name-input').press('Enter');

        await page.getByTestId('group-accessories').getByRole('button', { name: 'Thêm mục' }).click();
        await page.getByPlaceholder(/Ốp lưng/).fill('Ốp lưng');
        await page.getByRole('button', { name: 'Lưu', exact: true }).click();
        await page.getByRole('button', { name: 'Tăng Ốp lưng' }).click();
        await expect(page.getByTestId('preview')).toContainText('🎧 P.Kiện: Ốp lưng: 1');
    });

    test('mobile: 1 cột, xem trước + nút Báo cáo ở cuối', async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 844 });
        await page.addInitScript(() => {
            Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async () => {} } });
        });
        await page.goto('/');
        await page.getByRole('button', { name: /Kích hoạt Chế độ Dùng Thử/i }).click();
        // Mobile: mục Báo cáo nằm trong menu "Thêm" của thanh dưới.
        await page.getByRole('button', { name: /Thêm|Khác|More/i }).last().click();
        await page.getByRole('button', { name: /^Báo cáo$/ }).first().click();
        await expect(page.getByTestId('khai-thac-view')).toBeVisible({ timeout: 30_000 });
        await page.locator('#kt-revenue').fill('5');
        await expect(page.getByTestId('preview-mobile')).toContainText('💰 Doanh thu: 5tr');
        const hasHScroll = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
        expect(hasHScroll, 'trang bị cuộn ngang trên điện thoại').toBe(false);
        await page.screenshot({ path: `${SHOT_DIR}/05-entry-mobile.png`, fullPage: true });
    });
});
