import { expect, test, type Page } from '@playwright/test';

/**
 * GĐ3 — Lớp thiết kế Apple (KE_HOACH_GIAO_DIEN_APPLE.md mục 3, 2026-10-11): kiểm HÀNH VI + số đo thật của các component
 * dùng chung mới / làm lại, dựng THẬT qua `helpers/appleUiHarness.tsx` (không cần dữ liệu):
 * Switch · SegmentedControl (Tabs variant="segment") · Banner · ListGroup/ListRow · ActionMenu (menu thả / action sheet) ·
 * PageActions (màn khai báo → khung app vẽ) · Modal (đầu sheet iOS, chỉ cuộn dọc, kéo để đóng) · SectionHeader v2 · EmptyState.
 */
async function mo(page: Page) {
    await page.goto('/');
    await page.evaluate(async () => (await import('/tests/e2e/helpers/appleUiHarness.tsx' as string)).mountHarness());
    await expect(page.locator('#khung-app')).toBeAttached();
}
const nhatKy = (page: Page) => page.evaluate(() => (window as unknown as { __log: string[] }).__log.slice());

test.describe('iPhone 16 Pro Max', () => {
    test.use({ viewport: { width: 440, height: 956 }, isMobile: true, hasTouch: true });

    test('Switch: role=switch, bấm/Space bật tắt, 44×26, vùng chạm ≥ 44', async ({ page }) => {
        await mo(page);
        const sw = page.getByRole('switch', { name: 'Tự đồng bộ' });
        await expect(sw).toHaveAttribute('aria-checked', 'false');
        await sw.click();
        await expect(sw).toHaveAttribute('aria-checked', 'true');
        await expect(page.locator('#trang-thai')).toHaveText('bat');
        await sw.focus();
        await page.keyboard.press('Space');
        await expect(sw).toHaveAttribute('aria-checked', 'false');
        const hop = (await sw.boundingBox())!;
        expect(Math.round(hop.width)).toBe(44);
        expect(Math.round(hop.height)).toBe(26);
        const chạm = await sw.evaluate(el => { const a = getComputedStyle(el, '::after'); return { content: a.content, top: a.top }; });
        expect(chạm.content).not.toBe('none'); // ::after nới vùng chạm trên màn cảm ứng
        await expect(sw).toHaveAttribute('data-state', 'off');
        await expect(sw).toHaveClass(/bg-slate-300/); // tắt = slate-300, bật = emerald-500 (một kiểu cho cả app)
        await sw.click();
        await expect(sw).toHaveClass(/bg-emerald-500/);
    });

    test('SegmentedControl: nhóm nút aria-pressed, núm trắng trượt theo mục chọn, cao 44px trên cảm ứng', async ({ page }) => {
        await mo(page);
        const tablist = page.locator('#segment [data-segmented]');
        await expect(tablist).toHaveAttribute('role', 'group');
        const nv = tablist.getByRole('button', { name: 'Nhân viên' });
        await nv.click();
        await expect(nv).toHaveAttribute('aria-pressed', 'true');
        await expect(tablist.getByRole('button', { name: 'Siêu thị' })).toHaveAttribute('aria-pressed', 'false');
        await expect(page.locator('#tab-chon')).toHaveText('b');
        await page.waitForTimeout(400); // núm trượt xong
        const num = tablist.locator('span[aria-hidden="true"]').first();
        const [hNum, hNut] = [(await num.boundingBox())!, (await nv.boundingBox())!];
        expect(Math.abs(hNum.x - hNut.x)).toBeLessThan(2);
        expect(Math.abs(hNum.width - hNut.width)).toBeLessThan(2);
        expect(hNut.height).toBeGreaterThanOrEqual(43.5);
    });

    test('Banner: chữ đứng yên tối đa 2 dòng, "Xem thêm" mở đủ, × đóng', async ({ page }) => {
        await mo(page);
        const b = page.getByTestId('banner');
        await expect(b).toHaveAttribute('role', 'alert');
        const noiDung = b.locator('div.line-clamp-2');
        const cao = (await noiDung.boundingBox())!.height;
        expect(cao).toBeLessThanOrEqual(18 * 2 + 1);
        await b.getByRole('button', { name: 'Xem thêm' }).click();
        await expect(b.getByRole('button', { name: 'Thu gọn' })).toBeVisible();
        expect((await b.boundingBox())!.height).toBeGreaterThan(cao + 20);
        await b.getByRole('button', { name: 'Đóng thông báo' }).click();
        expect(await nhatKy(page)).toContain('dong-banner');
        expect(await b.evaluate(el => getComputedStyle(el).animationName)).toBe('none'); // không chữ chạy
    });

    test('ListGroup: hàng ≥ 48px cảm ứng, có đường kẻ thụt lề, hàng bấm được', async ({ page }) => {
        await mo(page);
        const hang = page.getByTestId('hang-phong');
        expect((await hang.boundingBox())!.height).toBeGreaterThanOrEqual(47.5);
        await expect(hang).toContainText('UTM Avo');
        const keLe = await hang.evaluate(el => getComputedStyle(el, '::before').left);
        expect(keLe).toBe('56px'); // hàng có ô icon: kẻ thụt theo nhãn
        await hang.click();
        expect(await nhatKy(page)).toContain('phong');
    });

    test('ActionMenu trên iPhone là action sheet: nhóm nguy hiểm riêng, nút Huỷ, chọn mục chạy ngay', async ({ page }) => {
        await mo(page);
        await page.getByTestId('menu-thu').click();
        const sheet = page.locator('[data-action-sheet]');
        await expect(sheet).toBeVisible();
        await expect(sheet.getByRole('menu')).toHaveCount(2); // nhóm thường + nhóm nguy hiểm
        await expect(sheet.getByRole('menu').last().getByRole('menuitem')).toHaveText('Xoá');
        const mucDau = sheet.getByRole('menuitem').first();
        expect((await mucDau.boundingBox())!.height).toBeGreaterThanOrEqual(52);
        await sheet.getByRole('button', { name: 'Huỷ' }).click();
        await expect(sheet).toHaveCount(0);
        await page.getByTestId('menu-thu').click();
        await page.locator('[data-action-sheet]').getByRole('menuitem', { name: 'Chia sẻ' }).click();
        expect(await nhatKy(page)).toContain('chia-se');
        await expect(page.locator('[data-action-sheet]')).toHaveCount(0);
    });

    test('Modal sheet: đầu kiểu iOS [Huỷ — Tiêu đề — Lưu], thân chỉ cuộn dọc, kéo thanh nắm để đóng', async ({ page }) => {
        await mo(page);
        await page.locator('#mo-sheet').click();
        const dialog = page.getByRole('dialog', { name: 'Mục tiêu GTĐH' });
        await expect(dialog).toBeVisible();
        await page.waitForTimeout(400);
        await expect(dialog.getByRole('button', { name: 'Huỷ' })).toBeVisible();
        await expect(dialog.getByRole('button', { name: 'Lưu' })).toBeVisible();
        await expect(dialog.getByRole('button', { name: 'Đóng' })).toHaveCount(0); // đầu iOS thay nút ×
        const tran = await page.getByTestId('than-sheet').evaluate(el => {
            const than = el.parentElement!;
            return { cuonNgang: than.scrollWidth - than.clientWidth, overflowX: getComputedStyle(than).overflowX };
        });
        expect(tran.overflowX).toBe('hidden');
        // kéo thanh nắm xuống 200px → đóng (gọi onClose = "huy-sheet")
        const h = (await page.locator('[data-sheet-handle]').boundingBox())!;
        await page.mouse.move(h.x + h.width / 2, h.y + h.height / 2);
        await page.mouse.down();
        await page.mouse.move(h.x + h.width / 2, h.y + 200, { steps: 12 });
        await page.mouse.up();
        await expect(dialog).toBeHidden();
        expect(await nhatKy(page)).toContain('huy-sheet');
        // mở lại → Lưu
        await page.locator('#mo-sheet').click();
        await page.getByRole('dialog', { name: 'Mục tiêu GTĐH' }).getByRole('button', { name: 'Lưu' }).click();
        expect(await nhatKy(page)).toContain('luu-sheet');
    });

    test('SectionHeader v2 viết thường 17px; EmptyState có icon', async ({ page }) => {
        await mo(page);
        const h2 = page.getByRole('heading', { name: 'Chi tiết theo kho' });
        await expect(h2).toHaveCSS('text-transform', 'none');
        await expect(h2).toHaveCSS('font-size', '17px');
        await expect(page.getByText('Chưa có dữ liệu')).toBeVisible();
        await expect(page.locator('svg[data-icon="empty"]')).toHaveCount(1);
    });
});

test.describe('laptop 1366×900', () => {
    test.use({ viewport: { width: 1366, height: 900 } });

    test('ActionMenu là menu thả: ↓ di chuyển, Esc đóng và trả focus, mục nguy hiểm cuối sau vạch ngăn', async ({ page }) => {
        await mo(page);
        const nut = page.getByTestId('menu-thu');
        await nut.click();
        const menu = page.locator('[data-action-menu]');
        await expect(menu).toBeVisible();
        await expect(menu.getByRole('separator')).toHaveCount(1);
        await expect(menu.getByRole('menuitem').last()).toHaveText('Xoá');
        await expect(menu.getByRole('menuitem').first()).toBeFocused();
        await page.keyboard.press('ArrowDown');
        await expect(menu.getByRole('menuitem').nth(1)).toBeFocused();
        await page.keyboard.press('Escape');
        await expect(menu).toHaveCount(0);
        await expect(nut).toBeFocused();
        await nut.click();
        await page.locator('[data-action-menu]').getByRole('menuitem', { name: 'Tải về' }).click();
        expect(await nhatKy(page)).toContain('tai-ve');
    });

    test('PageActions: khung app vẽ tiêu đề/nút từ màn đang khai báo, luôn gọi hàm MỚI nhất, màn ẩn thì gỡ', async ({ page }) => {
        await mo(page);
        await expect(page.locator('#khung-tieu-de')).toHaveText('Phân tích');
        await expect(page.locator('#khung-phu-de')).toHaveText('Cập nhật 1');
        await page.locator('#khung-nut-chinh').click();
        await page.locator('#tang-dem').click();
        await expect(page.locator('#khung-phu-de')).toHaveText('Cập nhật 2');
        await page.locator('#khung-nut-chinh').click();
        await page.getByTestId('khung-menu').click();
        await page.locator('[data-action-menu]').getByRole('menuitem', { name: 'Đồng bộ đám mây' }).click();
        const log = await nhatKy(page);
        expect(log).toEqual(expect.arrayContaining(['primary:1', 'primary:2', 'dong-bo:2']));
        await page.locator('#an-man').click();
        await expect(page.locator('#khung-tieu-de')).toHaveText('(trống)');
        await expect(page.locator('#khung-nut-chinh')).toHaveCount(0);
    });

    test('Modal giữa màn: primaryAction thành cặp nút ở chân, có nút × ở đầu', async ({ page }) => {
        await mo(page);
        await page.locator('#mo-sheet').click();
        const dialog = page.getByRole('dialog', { name: 'Mục tiêu GTĐH' });
        await expect(dialog).toBeVisible();
        await expect(dialog.getByRole('button', { name: 'Đóng' })).toBeVisible();
        await expect(dialog.getByRole('button', { name: 'Huỷ' })).toBeVisible();
        await expect(dialog.getByRole('button', { name: 'Lưu' })).toBeVisible();
        await expect(page.locator('[data-sheet-handle]')).toHaveCount(0);
        await page.keyboard.press('Escape');
        await expect(dialog).toBeHidden();
    });
});
