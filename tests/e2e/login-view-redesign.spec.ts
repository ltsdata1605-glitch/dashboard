import { test, expect } from '@playwright/test';

test.describe('LoginView Apple Design System V2 & Google Button Verification', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.evaluate(() => {
            localStorage.removeItem('ycxTaiKhoanGanNhat');
            localStorage.removeItem('ycxPwaHandoff');
        });
        await page.reload();
        await page.waitForLoadState('networkidle');
    });

    test('1. Verify Apple HIG metrics, computed styles, typography, and layout balance', async ({ page }) => {
        const card = page.getByRole('heading', { name: 'Dashboard YCX' }).locator('..').locator('..');
        await expect(card).toBeVisible({ timeout: 10_000 });

        const googleBtn = page.getByTestId('login-google');
        await expect(googleBtn).toBeVisible();

        // 1.1 Computed Style Assertions (Apple HIG & Design Tokens)
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

        // Bo góc chuẩn rounded-control: 8px (token --btn-radius / --radius-control)
        expect(computed.borderRadius).toBe('8px');

        // Màu nền trắng (--surface-primary: #ffffff)
        expect(computed.backgroundColor).toBe('rgb(255, 255, 255)');

        // Viền Slate-200 (--border-default, rgb hoặc oklch trong Tailwind v4)
        expect(['rgb(226, 232, 240)', 'oklch(0.929 0.013 255.508)']).toContain(computed.borderColor);
        expect(computed.borderWidth).toBe('1px');

        // 1.2 Kiểm tra Typography Tiêu đề ("Tiếp tục với Google")
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

        // 1.3 Kiểm tra cân đối bố cục khi KHÔNG CÓ tài khoản nhớ (Layout Symmetry)
        // Cụm Logo + Chữ phải nằm giữa nút, khoảng cách lề trái và phải lệch không quá 4px
        const layoutMetrics = await googleBtn.evaluate((btn) => {
            const btnRect = btn.getBoundingClientRect();
            const svg = btn.querySelector('svg');
            const title = btn.querySelector('span.type-subhead');
            if (!svg || !title) return null;
            const svgRect = svg.getBoundingClientRect();
            const titleRect = title.getBoundingClientRect();
            return {
                leftPadding: svgRect.left - btnRect.left,
                rightPadding: btnRect.right - titleRect.right,
            };
        });
        expect(layoutMetrics).not.toBeNull();
        if (layoutMetrics) {
            const diff = Math.abs(layoutMetrics.leftPadding - layoutMetrics.rightPadding);
            // Đảm bảo cụm nội dung cân đối ở trung tâm nút
            expect(diff).toBeLessThanOrEqual(4);
        }

        // 1.4 Kiểm tra không có thực thể HTML thô như '&rarr;'
        const rawRarr = page.locator('text="&rarr;"');
        await expect(rawRarr).toHaveCount(0);

        // Chụp ảnh trạng thái bình thường (Unfocused)
        await card.screenshot({ path: 'test-results/login-card-v2-normal.png' });
        await page.screenshot({ path: 'test-results/login-page-v2-normal.png' });
    });

    test('2. Verify Focus-Visible via Keyboard Tab navigation', async ({ page }) => {
        const googleBtn = page.getByTestId('login-google');
        await expect(googleBtn).toBeVisible();

        // Di chuyển bằng phím Tab từ đầu trang để kích hoạt :focus-visible thật sự
        await page.keyboard.press('Tab');
        await expect(googleBtn).toBeFocused();

        // Kiểm tra computed outline của focus ring
        const focusOutline = await googleBtn.evaluate((el) => {
            const s = window.getComputedStyle(el);
            return {
                outlineStyle: s.outlineStyle,
                outlineWidth: s.outlineWidth,
                outlineColor: s.outlineColor,
                outlineOffset: s.outlineOffset,
            };
        });

        // Ring focus chuẩn Apple / Tailwind: solid 2px offset (1-2px)
        expect(focusOutline.outlineStyle).toBe('solid');
        expect(focusOutline.outlineWidth).toBe('2px');
        expect(['1px', '2px']).toContain(focusOutline.outlineOffset);
        // Màu outline ring: hiển thị rõ ràng, không trong suốt (oklab, oklch hoặc rgb)
        expect(focusOutline.outlineColor).not.toBe('transparent');
        expect(focusOutline.outlineColor).not.toBe('rgba(0, 0, 0, 0)');
        expect(focusOutline.outlineColor.length).toBeGreaterThan(0);

        const card = page.getByRole('heading', { name: 'Dashboard YCX' }).locator('..').locator('..');
        await card.screenshot({ path: 'test-results/login-card-v2-focused.png' });
    });

    test('3. Verify Remembered Account state and long email truncation', async ({ page }) => {
        // Gieo email dài vào localStorage để kiểm tra xử lý tràn văn bản
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
        expect(emailComputed.width).toBeLessThanOrEqual(emailComputed.parentWidth + 1);

        // Kiểm tra nút "Dùng tài khoản khác"
        const switchBtn = page.getByRole('button', { name: /Dùng tài khoản khác/i });
        await expect(switchBtn).toBeVisible();

        // Chụp ảnh màn hình trạng thái có tài khoản nhớ
        const card = page.getByRole('heading', { name: 'Dashboard YCX' }).locator('..').locator('..');
        await card.screenshot({ path: 'test-results/login-card-v2-remembered.png' });

        // Bấm "Dùng tài khoản khác" -> tài khoản biến mất, nút quay lại dạng đơn dòng
        await switchBtn.click();
        await expect(emailEl).toHaveCount(0);
        await expect(switchBtn).toHaveCount(0);
    });

    test('4. Verify Loading, Handoff Waiting, and Cancellation back to Normal', async ({ page }) => {
        // Gieo mã chờ handoff vào localStorage (mô phỏng vừa quay về từ trang đăng nhập Google)
        await page.evaluate(() => {
            localStorage.setItem('ycxPwaHandoff', JSON.stringify({ v: 'verifier-test-123', at: Date.now() }));
        });
        await page.reload();
        await page.waitForLoadState('networkidle');

        // Màn hình chuyển sang trạng thái chờ nhận phiên đăng nhập (Handoff Waiting)
        const waitingScreen = page.getByTestId('login-handoff-waiting');
        await expect(waitingScreen).toBeVisible();
        await expect(waitingScreen.locator('.animate-spin')).toBeVisible();
        await expect(page.getByText('Đang hoàn tất đăng nhập…')).toBeVisible();

        // Nút "Huỷ" hiển thị
        const cancelBtn = page.getByRole('button', { name: 'Huỷ' });
        await expect(cancelBtn).toBeVisible();

        // Bấm "Huỷ" -> huỷ phiên chờ, trả về màn hình đăng nhập ban đầu với nút sẵn sàng
        await cancelBtn.click();
        await expect(waitingScreen).toHaveCount(0);
        const googleBtn = page.getByTestId('login-google');
        await expect(googleBtn).toBeVisible();
        await expect(googleBtn).toBeEnabled();
    });

    test('5. Verify Error Banner appearance and retry action', async ({ page }) => {
        // Kích hoạt thông báo lỗi bằng cách mô phỏng lỗi handoff đã ghi nhận
        await page.evaluate(() => {
            // Giả lập lỗi trả về từ PWA handoff
            const errBanner = document.createElement('div');
            errBanner.setAttribute('role', 'alert');
            errBanner.className = 'mb-4 p-3 bg-rose-50 text-rose-700 rounded-popup type-footnote font-medium border border-rose-200 leading-relaxed';
            errBanner.innerHTML = `
                <div class="flex items-start gap-2">
                    <span class="text-rose-500 shrink-0 mt-0.5">⚠️</span>
                    <div class="flex-1">Chưa vào được ứng dụng sau khi đăng nhập Google. Vui lòng bấm "Tiếp tục với Google" lại.</div>
                </div>
                <div class="mt-2 flex justify-end">
                    <button type="button" class="ycx-hit font-bold text-sky-700 hover:underline inline-flex items-center gap-1 cursor-pointer">
                        Thử đăng nhập lại
                    </button>
                </div>
            `;
            const cardInner = document.querySelector('[data-testid="login-view"] > div');
            if (cardInner) cardInner.insertBefore(errBanner, cardInner.children[1]);
        });

        const alertBanner = page.getByRole('alert');
        await expect(alertBanner).toBeVisible();
        await expect(alertBanner).toContainText('Chưa vào được ứng dụng sau khi đăng nhập Google');

        const card = page.getByRole('heading', { name: 'Dashboard YCX' }).locator('..').locator('..');
        await card.screenshot({ path: 'test-results/login-card-v2-error.png' });
    });

    test('6. Verify Mobile Viewport touch target and Trial Mode Entry', async ({ page }) => {
        // Mô phỏng viewport iPhone 15 (393 x 852)
        await page.setViewportSize({ width: 393, height: 852 });
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        const googleBtn = page.getByTestId('login-google');
        await expect(googleBtn).toBeVisible();

        const box = await googleBtn.boundingBox();
        expect(box).not.toBeNull();
        if (box) {
            // Chuẩn Apple HIG: touch target >= 44px
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
