import { test, expect } from '@playwright/test';

test.describe('LoginView Apple Design System V2 & Google Button Verification', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.evaluate(() => {
            localStorage.removeItem('ycxTaiKhoanGanNhat');
        });
        await page.reload();
        await page.waitForLoadState('networkidle');
    });

    test('Verify Apple HIG metrics, computed styles, typography, and focus ring', async ({ page }) => {
        const card = page.getByRole('heading', { name: 'Dashboard YCX' }).locator('..').locator('..');
        await expect(card).toBeVisible({ timeout: 10_000 });

        const googleBtn = page.getByTestId('login-google');
        await expect(googleBtn).toBeVisible();

        // 1. Computed Style Assertions (Apple HIG & Design Tokens)
        const computed = await googleBtn.evaluate((el) => {
            const style = window.getComputedStyle(el);
            const rect = el.getBoundingClientRect();
            return {
                height: style.height,
                borderRadius: style.borderRadius,
                backgroundColor: style.backgroundColor,
                borderColor: style.borderColor,
                borderWidth: style.borderWidth,
                boxShadow: style.boxShadow,
                rectHeight: rect.height,
                rectWidth: rect.width,
            };
        });

        // Chiều cao phải đạt 44px chuẩn Apple Touch Target
        expect(computed.height).toBe('44px');
        expect(computed.rectHeight).toBeGreaterThanOrEqual(44);

        // Chiều rộng ôm gọn trong khoảng max-w-[280px]
        expect(computed.rectWidth).toBeLessThanOrEqual(280);

        // Bo góc chuẩn rounded-control: 8px (token --btn-radius)
        expect(computed.borderRadius).toBe('8px');

        // Màu nền trắng tinh khiết (--surface-primary: #ffffff)
        expect(computed.backgroundColor).toBe('rgb(255, 255, 255)');

        // Viền Slate-200 (--border-default, rgb hoặc oklch trong Tailwind v4)
        expect(['rgb(226, 232, 240)', 'oklch(0.929 0.013 255.508)']).toContain(computed.borderColor);
        expect(computed.borderWidth).toBe('1px');

        // 2. Kiểm tra Typography Tiêu đề ("Tiếp tục với Google")
        const titleEl = googleBtn.locator('span.type-subhead');
        await expect(titleEl).toBeVisible();
        await expect(titleEl).toHaveText('Tiếp tục với Google');

        const titleComputed = await titleEl.evaluate((el) => {
            const style = window.getComputedStyle(el);
            return {
                fontSize: style.fontSize,
                fontWeight: style.fontWeight,
            };
        });
        // type-subhead: 13px, semibold (600)
        expect(titleComputed.fontSize).toBe('13px');
        expect(titleComputed.fontWeight).toBe('600');

        // 3. Chụp ảnh màn hình trạng thái chuẩn (Unfocused)
        await card.screenshot({ path: 'test-results/login-card-v2-normal.png' });
        await page.screenshot({ path: 'test-results/login-page-v2-normal.png' });

        // 4. Kiểm tra Focus-Visible qua bàn phím (Accessibility)
        await googleBtn.focus();
        await expect(googleBtn).toBeFocused();
        await card.screenshot({ path: 'test-results/login-card-v2-focused.png' });
    });

    test('Verify Remembered Account state and long email truncation', async ({ page }) => {
        // Gieo email dài vào localStorage
        const testLongEmail = 'super-long-account-email-testing-truncation-flow@dienmayxanh.com';
        await page.evaluate((email) => {
            localStorage.setItem('ycxTaiKhoanGanNhat', JSON.stringify({ email }));
        }, testLongEmail);
        await page.reload();
        await page.waitForLoadState('networkidle');

        const googleBtn = page.getByTestId('login-google');
        await expect(googleBtn).toBeVisible();

        const emailEl = page.getByTestId('login-tai-khoan-nho');
        await expect(emailEl).toBeVisible();
        await expect(emailEl).toHaveText(testLongEmail);

        // Kiểm tra Typography email (type-caption: 11px ngưỡng sàn dự án)
        const emailComputed = await emailEl.evaluate((el) => {
            const style = window.getComputedStyle(el);
            const rect = el.getBoundingClientRect();
            const parentRect = el.parentElement?.getBoundingClientRect() || rect;
            return {
                fontSize: style.fontSize,
                overflow: style.overflow,
                textOverflow: style.textOverflow,
                whiteSpace: style.whiteSpace,
                width: rect.width,
                parentWidth: parentRect.width,
            };
        });

        expect(emailComputed.fontSize).toBe('11px');
        expect(emailComputed.overflow).toBe('hidden');
        expect(emailComputed.textOverflow).toBe('ellipsis');
        expect(emailComputed.whiteSpace).toBe('nowrap');
        // Không được tràn ra ngoài thẻ cha
        expect(emailComputed.width).toBeLessThanOrEqual(emailComputed.parentWidth + 1);

        // Kiểm tra nút "Dùng tài khoản khác"
        const switchBtn = page.getByRole('button', { name: /Dùng tài khoản khác/i });
        await expect(switchBtn).toBeVisible();

        // Chụp ảnh màn hình trạng thái có tài khoản nhớ
        const card = page.getByRole('heading', { name: 'Dashboard YCX' }).locator('..').locator('..');
        await card.screenshot({ path: 'test-results/login-card-v2-remembered.png' });

        // Bấm "Dùng tài khoản khác" -> tài khoản biến mất
        await switchBtn.click();
        await expect(emailEl).toHaveCount(0);
        await expect(switchBtn).toHaveCount(0);
    });

    test('Verify Mobile Viewport touch target and responsiveness', async ({ page }) => {
        // Mô phỏng viewport iPhone 15 (393 x 852)
        await page.setViewportSize({ width: 393, height: 852 });
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        const googleBtn = page.getByTestId('login-google');
        await expect(googleBtn).toBeVisible();

        const box = await googleBtn.boundingBox();
        expect(box).not.toBeNull();
        if (box) {
            expect(box.height).toBeGreaterThanOrEqual(44);
            // Chiều rộng nút không tràn viền màn hình di động
            expect(box.width).toBeLessThan(393);
            expect(box.width).toBeGreaterThan(200);
        }

        // Kiểm tra vào app bằng Dùng Thử
        const trialBtn = page.getByRole('button', { name: /Kích hoạt Chế độ Dùng Thử/i });
        await expect(trialBtn).toBeVisible();
        await trialBtn.click();
        await page.locator('[data-app-chrome="header"]:visible, [data-app-chrome="topbar"]:visible').first().waitFor({ state: 'visible', timeout: 15_000 });
    });
});

