import { expect, test, type Page } from '@playwright/test';

/**
 * Đợt 2 audit (2026-09-29) — component dùng chung, KHÔNG đổi nhận diện:
 * A16 Button có dấu focus khi dùng bàn phím; A18/A19 DataTable đầu bảng dính trên + nhóm cột đúng
 * trên mobile + sắp xếp bằng bàn phím; A15 Dropdown mũi tên + Escape không đóng Modal chứa nó;
 * A25 tab ẩn không nhận focus.
 */
const moHarness = async (page: Page) => {
    await page.goto('/');
    await page.evaluate(async () => {
        const p = '/tests/e2e/helpers/uiHarness.tsx';
        (await import(/* @vite-ignore */ p) as { mountUiHarness: () => void }).mountUiHarness();
    });
    await expect(page.locator('#nut-thuong')).toBeVisible();
};

test('A16: Button có viền focus khi đến bằng phím Tab', async ({ page }) => {
    await moHarness(page);
    await page.locator('#nut-thuong').focus();
    await page.keyboard.press('Tab');
    await page.keyboard.press('Shift+Tab'); // focus bằng bàn phím → :focus-visible
    const outline = await page.locator('#nut-thuong').evaluate(el => {
        const cs = getComputedStyle(el);
        return { style: cs.outlineStyle, width: cs.outlineWidth };
    });
    expect(outline.style).not.toBe('none');
    expect(parseFloat(outline.width)).toBeGreaterThan(0);
});

test('A18: đầu bảng dính trên khi cuộn trong khung maxHeight', async ({ page }) => {
    await moHarness(page);
    const thead = page.locator('#bang thead');
    const truoc = await thead.boundingBox();
    // Cuộn đúng khung THẬT SỰ cuộn dọc được (mã cũ: khung ngoài; mã mới: khung trong)
    const daCuon = await page.evaluate(() => {
        const khung = Array.from(document.querySelectorAll<HTMLElement>('#bang div'))
            .find(el => el.scrollHeight > el.clientHeight + 10 && getComputedStyle(el).overflowY !== 'visible');
        if (!khung) return 0;
        khung.scrollTop = 400;
        return khung.scrollTop;
    });
    expect(daCuon, 'không có khung nào cuộn được').toBeGreaterThan(100);
    await page.waitForTimeout(100);
    const sau = await thead.boundingBox();
    expect(Math.abs((sau?.y ?? 0) - (truoc?.y ?? -999)), 'đầu bảng bị cuộn mất').toBeLessThan(2);
});

test('A19: sắp xếp bằng bàn phím + aria-sort', async ({ page }) => {
    await moHarness(page);
    const th = page.locator('#bang th', { hasText: 'Tên' });
    await th.focus();
    await page.keyboard.press('Enter');
    await expect(th).toHaveAttribute('aria-sort', 'ascending');
});

test.describe('mobile 390px', () => {
    test.use({ viewport: { width: 390, height: 844 } });
    test('A18: dải nhóm cột khớp số cột đang hiện (cột hideMobile bị ẩn)', async ({ page }) => {
        await moHarness(page);
        const kq = await page.evaluate(() => {
            const rows = document.querySelectorAll('#bang thead tr');
            const visible = (el: Element) => getComputedStyle(el).display !== 'none';
            const groupSpan = Array.from(rows[0].querySelectorAll('th')).filter(visible)
                .reduce((s, th) => s + (th as HTMLTableCellElement).colSpan, 0);
            const cols = Array.from(rows[1].querySelectorAll('th')).filter(visible).length;
            return { groupSpan, cols };
        });
        expect(kq.cols).toBe(2);           // Tên + A
        expect(kq.groupSpan).toBe(kq.cols); // trước đây 4 ≠ 2 → dải nhóm lệch
    });
});

test('A15: menu trong Modal — mũi tên chọn mục, Escape đóng menu nhưng KHÔNG đóng Modal', async ({ page }) => {
    await moHarness(page);
    await page.locator('#mo-modal').click();
    const dialog = page.getByRole('dialog', { name: 'Modal có menu' });
    await expect(dialog).toBeVisible();

    const trigger = page.locator('[data-dropdown-trigger]');
    await trigger.focus();
    await page.keyboard.press('ArrowDown');
    await expect(page.getByRole('button', { name: 'Chế độ X' })).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(page.getByRole('button', { name: 'Chế độ Y' })).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: 'Chế độ Y' })).toHaveCount(0);
    await expect(dialog, 'Escape đóng luôn Modal chứa menu').toBeVisible();
    await expect(trigger).toBeFocused();
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
});

test('A25: tab đang ẩn (vẫn giữ mount) không nhận focus bằng phím/trình đọc màn hình', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /Kích hoạt Chế độ Dùng Thử/i }).click();
    await page.locator('aside').first().hover();
    await page.getByRole('button', { name: /^Báo cáo$/ }).first().click();
    await expect(page.getByTestId('khai-thac-view')).toBeVisible({ timeout: 30_000 });
    // Sang tab khác: Báo cáo vẫn mount nhưng bị đẩy ra ngoài màn hình
    await page.getByRole('button', { name: /^Phân tích YCX$/ }).first().click();
    await page.mouse.move(900, 500);
    await expect(page.getByTestId('khai-thac-view')).not.toBeInViewport();

    const kq = await page.evaluate(() => {
        const view = document.querySelector('[data-testid="khai-thac-view"]')!;
        const o = view.querySelector<HTMLElement>('input, textarea, button');
        o?.focus();
        return { coInert: !!view.closest('[inert]'), focusVaoTabAn: !!o && document.activeElement === o };
    });
    expect(kq.coInert).toBe(true);
    expect(kq.focusVaoTabAn, 'phím Tab/trình đọc màn hình vẫn đi vào tab đang ẩn').toBe(false);
});
