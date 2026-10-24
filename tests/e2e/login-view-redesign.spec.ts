import { test, expect, devices } from '@playwright/test';

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

        // Ring focus chuẩn Apple / Tailwind: solid 2px-3px offset (1-2px)
        expect(focusOutline.outlineStyle).toBe('solid');
        expect(['2px', '3px']).toContain(focusOutline.outlineWidth);
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

    test('4. [Mocked PKCE Handoff & UI Lifecycle] Verify Handoff Waiting screen, cancellation, and clean recovery', async ({ page }) => {
        await page.evaluate(() => {
            (window as any).__redirectCalls = 0;
            (window as any).__ycxTestRedirectHook = (url: string) => {
                (window as any).__redirectCalls = ((window as any).__redirectCalls || 0) + 1;
            };
        });

        const googleBtn = page.getByTestId('login-google');
        await expect(googleBtn).toBeVisible();
        await expect(googleBtn).toBeEnabled();

        // 4.1 Bấm nút đăng nhập: Chuyển hướng đồng bộ (bảo toàn User Activation cho iOS PWA) và chuyển sang màn chờ handoff
        await googleBtn.click();

        // 4.2 Chuyển sang màn hình chờ nhận phiên Handoff (Handoff Waiting Screen)
        const waitingScreen = page.getByTestId('login-handoff-waiting');
        await expect(waitingScreen).toBeVisible({ timeout: 5_000 });
        await expect(waitingScreen.locator('.animate-spin')).toBeVisible();
        await expect(page.getByText('Đang hoàn tất đăng nhập…')).toBeVisible();

        // Xác nhận số lần gọi chuyển hướng chỉ đúng 1 lần duy nhất
        const totalRedirects = await page.evaluate(() => (window as any).__redirectCalls || 0);
        expect(totalRedirects).toBe(1);

        // 4.3 Bấm "Huỷ" trên màn handoff -> trở lại trạng thái hợp lệ của nút đăng nhập ban đầu
        const cancelBtn = page.getByRole('button', { name: 'Huỷ' });
        await expect(cancelBtn).toBeVisible();
        await cancelBtn.click();

        // Màn hình handoff biến mất, nút Google trở lại bình thường và Enabled
        await expect(waitingScreen).toHaveCount(0);
        await expect(googleBtn).toBeVisible();
        await expect(googleBtn).toBeEnabled();
        // Logo Google hiển thị đầy đủ, không còn spinner
        await expect(googleBtn.locator('svg')).toBeVisible();
    });

    test('5. [Mocked PKCE Handoff & Error State] Verify authentic React Error Banner, Role Alert, AppIcon Warning, and Retry Action', async ({ page }) => {
        let claimCallCount = 0;
        // Mock Cloud Function pwaHandoffClaim:
        // - Lần 1: trả về mã lỗi deadline-exceeded để kích hoạt Error Banner thật của React
        // - Lần 2 (khi retry): trả về ready: false để giữ màn hình chờ handoff
        await page.route('**/*pwaHandoffClaim*', route => {
            claimCallCount++;
            if (claimCallCount === 1) {
                return route.fulfill({
                    status: 400,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        error: {
                            status: 'DEADLINE_EXCEEDED',
                            message: 'Phiên chờ đã quá hạn trên máy chủ (functions/deadline-exceeded)',
                        },
                    }),
                });
            }
            return route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    result: { ready: false },
                }),
            });
        });

        // Gieo mã handoff chờ vào localStorage để LoginView kích hoạt vòng nhận phiên tick() và gặp lỗi thật
        await page.evaluate(() => {
            localStorage.setItem('ycxPwaHandoff', JSON.stringify({ v: 'verifier-err-test', at: Date.now() }));
        });
        await page.reload();
        await expect(page.locator('#ycx-splash')).toHaveCount(0, { timeout: 5_000 });

        await page.evaluate(() => {
            (window as any).__retryTriggered = false;
            (window as any).__ycxTestRedirectHook = (url: string) => {
                (window as any).__retryTriggered = true;
            };
        });

        // 5.1 Kiểm tra React Error Banner thực tế do React render
        const alertBanner = page.getByRole('alert');
        await expect(alertBanner).toBeVisible({ timeout: 5_000 });

        // Kiểm tra AppIcon warning thực tế bên trong banner lỗi
        const warningIcon = alertBanner.locator('svg').first();
        await expect(warningIcon).toBeVisible();

        // Nội dung thông báo lỗi phù hợp với mã lỗi nhận được
        await expect(alertBanner).toContainText('Chưa vào được ứng dụng');
        await expect(alertBanner).toContainText('Vui lòng bấm "Tiếp tục với Google" lại');

        // Chụp ảnh bằng chứng Error Banner thật của React
        const card = page.getByRole('heading', { name: 'Dashboard YCX' }).locator('..').locator('..');
        await card.screenshot({ path: 'test-results/login-card-v2-error.png' });

        // 5.2 Kiểm tra nút Retry là Button có handler thực
        const retryBtn = alertBanner.getByRole('button', { name: /Thử đăng nhập lại/i });
        await expect(retryBtn).toBeVisible();
        await expect(retryBtn).toBeEnabled();

        // Bấm nút retry -> kích hoạt handlePwaLogin, dọn sạch error banner và chuyển sang màn chờ
        await retryBtn.click();
        await expect(alertBanner).toHaveCount(0);
        await expect(page.getByTestId('login-handoff-waiting')).toBeVisible({ timeout: 5_000 });

        // Xác minh cờ chuyển hướng đã được gọi từ handler retry (không redirect sang Google thật)
        const retryTriggered = await page.evaluate(() => (window as any).__retryTriggered);
        expect(retryTriggered).toBe(true);
    });

    test('6. [Mobile Touch Emulation] Verify Mobile Touch emulation, touch targets, and layout responsiveness', async ({ browser }) => {
        // Sử dụng device descriptor iPhone 15 với hasTouch: true, isMobile: true
        const context = await browser.newContext({
            ...devices['iPhone 15'],
        });
        const page = await context.newPage();
        try {
            await page.goto('/');
            await page.evaluate(() => {
                localStorage.removeItem('ycxTaiKhoanGanNhat');
                localStorage.removeItem('ycxPwaHandoff');
            });
            await page.reload();
            await page.waitForLoadState('networkidle');

            const googleBtn = page.getByTestId('login-google');
            await expect(googleBtn).toBeVisible();

            // Xác minh hasTouch và isMobile đã được kích hoạt trong context
            const isTouchCapable = await page.evaluate(() => 'ontouchstart' in window || navigator.maxTouchPoints > 0);
            expect(isTouchCapable).toBe(true);

            // Kiểm tra bounding box trên màn hình di động (393px width)
            const box = await googleBtn.boundingBox();
            expect(box).not.toBeNull();
            if (box) {
                // Chuẩn Apple HIG: touch target >= 44px
                expect(box.height).toBeGreaterThanOrEqual(44);
                // Nút nằm gọn bên trong viewport di động, không bị tràn (overflow)
                expect(box.width).toBeLessThan(393);
                expect(box.width).toBeGreaterThan(200);
            }

            // Kiểm tra không có thanh cuộn ngang gây bể layout trên mobile
            const hasHorizontalOverflow = await page.evaluate(() => {
                return document.documentElement.scrollWidth > document.documentElement.clientWidth;
            });
            expect(hasHorizontalOverflow).toBe(false);

            // Kiểm tra vào app bằng Dùng Thử
            const trialBtn = page.getByRole('button', { name: /Kích hoạt Chế độ Dùng Thử/i });
            await expect(trialBtn).toBeVisible();
            await trialBtn.click();
            await page.locator('[data-app-chrome="header"]:visible, [data-app-chrome="topbar"]:visible').first().waitFor({ state: 'visible', timeout: 15_000 });
        } finally {
            await context.close();
        }
    });

    test('7. [Anti-Double-Click Guard] Verify near-simultaneous clicks trigger exactly one PKCE handoff flow', async ({ page }) => {
        await page.evaluate(() => {
            (window as any).__concurrentCalls = 0;
            (window as any).__ycxTestRedirectHook = (url: string) => {
                (window as any).__concurrentCalls = ((window as any).__concurrentCalls || 0) + 1;
            };
        });

        const googleBtn = page.getByTestId('login-google');
        await expect(googleBtn).toBeVisible();
        await expect(googleBtn).toBeEnabled();

        // Kích hoạt hai thao tác click gần như đồng thời thông qua Promise.all
        await Promise.all([
            page.evaluate(() => {
                const btn = document.querySelector('[data-testid="login-google"]') as HTMLButtonElement;
                if (btn) btn.click();
            }),
            page.evaluate(() => {
                const btn = document.querySelector('[data-testid="login-google"]') as HTMLButtonElement;
                if (btn) btn.click();
            }),
        ]);

        // Màn hình chờ handoff phải xuất hiện
        await expect(page.getByTestId('login-handoff-waiting')).toBeVisible({ timeout: 5_000 });

        // Guard đồng bộ isLoggingInRef phải chặn đứng lệnh click thứ hai: tổng số lượt redirect = 1
        const totalCalls = await page.evaluate(() => (window as any).__concurrentCalls || 0);
        expect(totalCalls).toBe(1);

        // Kiểm tra mã verifier trong localStorage chỉ được tạo duy nhất một lần
        const handoffRaw = await page.evaluate(() => localStorage.getItem('ycxPwaHandoff'));
        expect(handoffRaw).not.toBeNull();
        if (handoffRaw) {
            const parsed = JSON.parse(handoffRaw);
            expect(typeof parsed.v).toBe('string');
            expect(parsed.v.length).toBeGreaterThan(10);
        }
    });

    test('8. [Reopen Handoff & Anti-Double-Click] Verify Active Reopen button triggers redirect and blocks consecutive double-reopen', async ({ page }) => {
        await page.evaluate(() => {
            (window as any).__reopenRedirectCalls = 0;
            (window as any).__ycxTestRedirectHook = (url: string) => {
                (window as any).__reopenRedirectCalls = ((window as any).__reopenRedirectCalls || 0) + 1;
            };
        });

        const googleBtn = page.getByTestId('login-google');
        await expect(googleBtn).toBeVisible();
        await googleBtn.click();

        // 8.1 Chuyển sang màn chờ Handoff (lượt 1)
        const waitingScreen = page.getByTestId('login-handoff-waiting');
        await expect(waitingScreen).toBeVisible({ timeout: 5_000 });
        let calls = await page.evaluate(() => (window as any).__reopenRedirectCalls || 0);
        expect(calls).toBe(1);

        const reopenBtn = page.getByTestId('login-handoff-reopen');
        await expect(reopenBtn).toBeVisible();
        await expect(reopenBtn).toBeEnabled();

        // 8.2 Bấm nút "Mở lại trang đăng nhập Google": thao tác chủ động hợp lệ phải kích hoạt chuyển hướng mới
        await reopenBtn.click();

        // Số lượt chuyển hướng phải tăng lên 2 (không bị isLoggingInRef chặn)
        calls = await page.evaluate(() => (window as any).__reopenRedirectCalls || 0);
        expect(calls).toBe(2);

        // 8.3 Chống spam double-click trên nút "Mở lại": hai click gần như đồng thời chỉ kích hoạt tối đa 1 lượt
        await Promise.all([
            page.evaluate(() => {
                const btn = document.querySelector('[data-testid="login-handoff-reopen"]') as HTMLButtonElement;
                if (btn) btn.click();
            }),
            page.evaluate(() => {
                const btn = document.querySelector('[data-testid="login-handoff-reopen"]') as HTMLButtonElement;
                if (btn) btn.click();
            }),
        ]);

        // Số lượt chuyển hướng vẫn giữ nguyên là 2 (double-click trên Mở Lại bị chặn)
        calls = await page.evaluate(() => (window as any).__reopenRedirectCalls || 0);
        expect(calls).toBe(2);

        // 8.4 Huỷ phiên và khôi phục giao diện đăng nhập ban đầu
        const cancelBtn = page.getByRole('button', { name: 'Huỷ' });
        await cancelBtn.click();
        await expect(waitingScreen).toHaveCount(0);
        await expect(googleBtn).toBeVisible();
        await expect(googleBtn).toBeEnabled();
    });

    test('9. [Error Path Hardening] Verify startPwaHandoffLogin failure cleanly resets isLoggingInRef and recovers UI', async ({ page }) => {
        // Mô phỏng startPwaHandoffLogin ném lỗi ngoại lệ (vd: sandbox security policy chặn navigation)
        await page.evaluate(() => {
            (window as any).__failOnce = true;
            (window as any).__ycxTestRedirectHook = (url: string) => {
                if ((window as any).__failOnce) {
                    (window as any).__failOnce = false;
                    throw new Error('Chính sách bảo mật trình duyệt chặn chuyển hướng');
                }
            };
        });

        const googleBtn = page.getByTestId('login-google');
        await expect(googleBtn).toBeVisible();
        await googleBtn.click();

        // 9.1 Giao diện không bị treo ở trạng thái waiting; Error banner xuất hiện
        const alertBanner = page.getByRole('alert');
        await expect(alertBanner).toBeVisible({ timeout: 5_000 });
        await expect(alertBanner).toContainText('Chính sách bảo mật');

        // 9.2 Trạng thái isLoggingInRef phải được reset hoàn toàn về false: nút Google trở lại Enabled
        await expect(googleBtn).toBeVisible();
        await expect(googleBtn).toBeEnabled();

        // 9.3 Người dùng có thể bấm đăng nhập lại mà không bị khóa (re-click recovery)
        await googleBtn.click();
        const waitingScreen = page.getByTestId('login-handoff-waiting');
        await expect(waitingScreen).toBeVisible({ timeout: 5_000 });
    });

    test('10. [Reopen Failure Recovery & Session Preservation] Verify reopen failure does not wipe pending session and error retry recovers', async ({ page }) => {
        await page.evaluate(() => {
            (window as any).__redirectCalls = 0;
            (window as any).__ycxTestRedirectHook = (url: string) => {
                (window as any).__redirectCalls = ((window as any).__redirectCalls || 0) + 1;
            };
        });

        const googleBtn = page.getByTestId('login-google');
        await expect(googleBtn).toBeVisible();
        await googleBtn.click();

        const waitingScreen = page.getByTestId('login-handoff-waiting');
        await expect(waitingScreen).toBeVisible({ timeout: 5_000 });

        // Ghi lại mã pending ban đầu trong localStorage
        const initialHandoff = await page.evaluate(() => localStorage.getItem('ycxPwaHandoff'));
        expect(initialHandoff).not.toBeNull();

        // Cấu hình mock để lần gọi chuyển hướng tiếp theo bị lỗi
        await page.evaluate(() => {
            (window as any).__ycxTestRedirectHook = () => {
                throw new Error('Lỗi kết nối Safari popup blocked');
            };
        });

        // Bấm nút "Mở lại trang đăng nhập Google"
        const reopenBtn = page.getByTestId('login-handoff-reopen');
        await expect(reopenBtn).toBeVisible();
        await expect(reopenBtn).toBeEnabled();
        await reopenBtn.click();

        // 10.1 Error banner xuất hiện với thông báo lỗi
        const alertBanner = page.getByRole('alert');
        await expect(alertBanner).toBeVisible({ timeout: 5_000 });
        await expect(alertBanner).toContainText('Lỗi kết nối Safari popup blocked');

        // 10.2 QUAN TRỌNG: Không xóa nhầm phiên handoff còn hợp lệ trong localStorage
        const handoffAfterFailure = await page.evaluate(() => localStorage.getItem('ycxPwaHandoff'));
        expect(handoffAfterFailure).toBe(initialHandoff);

        // 10.3 Nút "Mở lại trang đăng nhập" trong Error Banner KHÔNG được bị disabled
        const retryBannerBtn = alertBanner.getByRole('button', { name: /Mở lại trang đăng nhập/i });
        await expect(retryBannerBtn).toBeVisible();
        await expect(retryBannerBtn).toBeEnabled();

        // 10.4 Khôi phục hook thành công và bấm nút retry trên Error Banner
        await page.evaluate(() => {
            (window as any).__ycxTestRedirectHook = (url: string) => {
                (window as any).__redirectCalls = ((window as any).__redirectCalls || 0) + 1;
            };
        });

        await retryBannerBtn.click();

        // Kiểm tra lượt chuyển hướng mới đã được kích hoạt thành công
        const totalCalls = await page.evaluate(() => (window as any).__redirectCalls || 0);
        expect(totalCalls).toBeGreaterThanOrEqual(2);
    });

    test('11. [Cancel & Re-Login Lifecycle] Verify full cancel lifecycle clears storage and generates fresh PKCE pair on re-login', async ({ page }) => {
        await page.evaluate(() => {
            (window as any).__ycxTestRedirectHook = (url: string) => {};
        });

        const googleBtn = page.getByTestId('login-google');
        await expect(googleBtn).toBeVisible();
        await googleBtn.click();

        // Chờ màn hình waiting xuất hiện
        const waitingScreen = page.getByTestId('login-handoff-waiting');
        await expect(waitingScreen).toBeVisible({ timeout: 5_000 });

        // Lấy mã PKCE lượt 1
        const raw1 = await page.evaluate(() => localStorage.getItem('ycxPwaHandoff'));
        expect(raw1).not.toBeNull();
        const v1 = JSON.parse(raw1!).v;
        expect(typeof v1).toBe('string');

        // Bấm nút "Huỷ"
        const cancelBtn = page.getByRole('button', { name: 'Huỷ' });
        await cancelBtn.click();

        // Màn hình waiting biến mất, quay về màn hình đăng nhập
        await expect(waitingScreen).toHaveCount(0);
        await expect(googleBtn).toBeVisible();
        await expect(googleBtn).toBeEnabled();

        // localStorage đã được dọn sạch
        const rawAfterCancel = await page.evaluate(() => localStorage.getItem('ycxPwaHandoff'));
        expect(rawAfterCancel).toBeNull();

        // Bấm Đăng nhập lần 2
        await googleBtn.click();
        await expect(waitingScreen).toBeVisible({ timeout: 5_000 });

        // Lấy mã PKCE lượt 2
        const raw2 = await page.evaluate(() => localStorage.getItem('ycxPwaHandoff'));
        expect(raw2).not.toBeNull();
        const v2 = JSON.parse(raw2!).v;

        // Mã mới phải hoàn toàn khác mã cũ (single-use guarantee, không tái sử dụng)
        expect(v2).not.toBe(v1);
    });

    test('12. [Cross-Session Race Condition] Late failure of superseded Session A does not wipe or disrupt active Session B', async ({ page }) => {
        let sessionACalled = false;
        let resolveSessionA!: () => void;
        const sessionAPromise = new Promise<void>(res => { resolveSessionA = res; });

        // Mock Cloud Function pwaHandoffClaim
        await page.route('**/pwaHandoffClaim', async (route) => {
            // Nếu là request của Session A, trì hoãn cho đến khi có tín hiệu
            if (!sessionACalled) {
                sessionACalled = true;
                await sessionAPromise;
                await route.fulfill({
                    status: 400,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        error: {
                            status: 'DEADLINE_EXCEEDED',
                            message: 'Phiên đăng nhập đã quá hạn 5 phút',
                        }
                    }),
                });
                return;
            }
            // Request của Session B: trả về ready = false (đang chờ người dùng)
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ result: { ready: false } }),
            });
        });

        await page.evaluate(() => {
            (window as any).__ycxTestRedirectHook = () => {};
        });

        // 1. Khởi động phiên A
        const googleBtn = page.getByTestId('login-google');
        await expect(googleBtn).toBeVisible();
        await googleBtn.click();

        const waitingScreen = page.getByTestId('login-handoff-waiting');
        await expect(waitingScreen).toBeVisible({ timeout: 5_000 });

        // Lấy verifier A
        const rawA = await page.evaluate(() => localStorage.getItem('ycxPwaHandoff'));
        expect(rawA).not.toBeNull();
        const vA = JSON.parse(rawA!).v;

        // Đợi một tích tắc để request pwaHandoffClaim của Session A được gửi đi
        await page.waitForTimeout(300);
        expect(sessionACalled).toBe(true);

        // 2. Trong lúc Session A đang chờ response từ máy chủ, người dùng bấm "Mở lại trang đăng nhập Google" -> sinh phiên B
        const reopenBtn = page.getByTestId('login-handoff-reopen');
        await expect(reopenBtn).toBeVisible();
        await expect(reopenBtn).toBeEnabled();
        await reopenBtn.click();

        // Lấy verifier B
        const rawB = await page.evaluate(() => localStorage.getItem('ycxPwaHandoff'));
        expect(rawB).not.toBeNull();
        const vB = JSON.parse(rawB!).v;
        expect(vB).not.toBe(vA);

        // 3. Bây giờ Session A mới hoàn thành với lỗi DEADLINE_EXCEEDED (trả về muộn)
        resolveSessionA();
        await page.waitForTimeout(500);

        // 4. KIỂM CHỨNG BẢO TOÀN PHIÊN B:
        // - Màn hình chờ handoff VẪN ĐANG HIỆN DIỆN (không bị huỷ về form đăng nhập)
        await expect(waitingScreen).toBeVisible();

        // - localStorage VẪN GIỮ NGUYÊN Session B (không bị clearPendingPwaHandoff của Session A xóa nhầm!)
        const rawCurrent = await page.evaluate(() => localStorage.getItem('ycxPwaHandoff'));
        expect(rawCurrent).not.toBeNull();
        const vCurrent = JSON.parse(rawCurrent!).v;
        expect(vCurrent).toBe(vB);

        // - Không hiện Error Banner của phiên A đè lên giao diện của phiên B
        const alertBanner = page.getByRole('alert');
        await expect(alertBanner).toHaveCount(0);
    });

    test('13. [Session Ownership Policy] Late ready=true response from superseded Session A does not trigger login or disrupt Session B', async ({ page }) => {
        let sessionACalled = false;
        let resolveSessionA!: () => void;
        const sessionAPromise = new Promise<void>(res => { resolveSessionA = res; });

        // Giả lập mock token riêng cho phiên A
        const TOKEN_A = 'MOCK_GOOGLE_ACCESS_TOKEN_SESSION_A';

        await page.route('**/pwaHandoffClaim', async (route) => {
            if (!sessionACalled) {
                sessionACalled = true;
                await sessionAPromise;
                // Trả về ready = true cho Session A (nhưng Session A đã bị Session B thay thế!)
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        result: {
                            ready: true,
                            idToken: 'mock-id-token-a',
                            accessToken: TOKEN_A,
                            uid: 'user-a-superseded',
                            profile: { role: 'admin', hoTen: 'User A Cũ' }
                        }
                    }),
                });
                return;
            }
            // Session B: vẫn đang chờ người dùng thao tác ở Google
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ result: { ready: false } }),
            });
        });

        await page.evaluate(() => {
            (window as any).__ycxTestRedirectHook = () => {};
        });

        // 1. Mở phiên A
        const googleBtn = page.getByTestId('login-google');
        await expect(googleBtn).toBeVisible();
        await googleBtn.click();

        const waitingScreen = page.getByTestId('login-handoff-waiting');
        await expect(waitingScreen).toBeVisible({ timeout: 5_000 });

        await page.waitForTimeout(300);
        expect(sessionACalled).toBe(true);

        // 2. Người dùng chủ động mở phiên B -> thay thế hoàn toàn phiên A
        const reopenBtn = page.getByTestId('login-handoff-reopen');
        await expect(reopenBtn).toBeVisible();
        await expect(reopenBtn).toBeEnabled();
        await reopenBtn.click();

        const rawB = await page.evaluate(() => localStorage.getItem('ycxPwaHandoff'));
        expect(rawB).not.toBeNull();
        const vB = JSON.parse(rawB!).v;

        // 3. Bây giờ Session A mới hoàn thành với ready: true (trả về muộn)
        resolveSessionA();
        await page.waitForTimeout(500);

        // 4. KIỂM CHỨNG QUYỀN SỞ HỮU PHIÊN:
        // - Kết quả của phiên A TUYỆT ĐỐI KHÔNG được lưu token vào sessionStorage
        const savedToken = await page.evaluate(() => sessionStorage.getItem('googleOAuthToken'));
        expect(savedToken).toBeNull();

        // - Màn hình chờ VẪN DUY TRÌ cho phiên B (chưa vào app bằng phiên A)
        await expect(waitingScreen).toBeVisible();

        // - localStorage VẪN NẮM GIỮ đúng verifier B
        const rawCurrent = await page.evaluate(() => localStorage.getItem('ycxPwaHandoff'));
        expect(rawCurrent).not.toBeNull();
        const vCurrent = JSON.parse(rawCurrent!).v;
        expect(vCurrent).toBe(vB);
    });

    test('14. [Token Rejection Error Reporting] Firebase signInWithCredential token rejection reports real error on LoginView banner when session is active', async ({ page }) => {
        // Intercept identitytoolkit to reject the token
        await page.route('https://identitytoolkit.googleapis.com/v1/accounts:signInWithIdp**', async (route) => {
            await route.fulfill({
                status: 400,
                contentType: 'application/json',
                headers: { 'access-control-allow-origin': '*' },
                body: JSON.stringify({
                    error: {
                        code: 400,
                        message: 'INVALID_CREDENTIAL',
                        errors: [{ message: 'INVALID_CREDENTIAL', domain: 'global', reason: 'invalid' }]
                    }
                })
            });
        });

        // Mock pwaHandoffClaim to return ready = true with a mock idToken
        await page.route('**/pwaHandoffClaim', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    result: {
                        ready: true,
                        idToken: 'mock-rejected-id-token',
                        accessToken: 'mock-rejected-access-token',
                        uid: 'user-rejected',
                        profile: { role: 'employee' }
                    }
                }),
            });
        });

        await page.evaluate(() => {
            (window as any).__ycxTestRedirectHook = () => {};
        });

        const googleBtn = page.getByTestId('login-google');
        await expect(googleBtn).toBeVisible();
        await googleBtn.click();

        const waitingScreen = page.getByTestId('login-handoff-waiting');
        await expect(waitingScreen).toBeVisible({ timeout: 5_000 });

        // Chờ LoginView polling nhận kết quả, gọi signInWithCredential, nhận lỗi và hiển thị error banner
        const alertBanner = page.getByRole('alert');
        await expect(alertBanner).toBeVisible({ timeout: 10_000 });
        await expect(alertBanner).toContainText('Chưa vào được ứng dụng');

        // Màn hình waiting tự động tắt để người dùng thấy nút bấm thử lại
        await expect(waitingScreen).toHaveCount(0);
        await expect(googleBtn).toBeVisible();
        await expect(googleBtn).toBeEnabled();

        // localStorage đã được dọn sạch vì phiên đã thất bại thật sự
        const rawHandoff = await page.evaluate(() => localStorage.getItem('ycxPwaHandoff'));
        expect(rawHandoff).toBeNull();
    });
});
