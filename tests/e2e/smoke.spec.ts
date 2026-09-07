import { expect, test } from '@playwright/test';

/**
 * Smoke test: app dựng được và render ra giao diện (không phải trang trắng / lỗi runtime).
 * Đây là mức kiểm chứng tối thiểu chạy được mà KHÔNG cần đăng nhập hay dữ liệu thật.
 */
test('app khởi động và render giao diện', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
    page.on('pageerror', err => consoleErrors.push(err.message));

    await page.goto('/');
    await expect(page.locator('#root')).not.toBeEmpty();

    // Lỗi mạng/Firebase khi chưa đăng nhập là bình thường ở môi trường test — chỉ chặn lỗi
    // runtime của React/JS làm hỏng render.
    const fatal = consoleErrors.filter(e => /is not a function|undefined is not|Cannot read|Minified React error/i.test(e));
    expect(fatal, `Lỗi runtime khi tải app:\n${fatal.join('\n')}`).toHaveLength(0);
});
