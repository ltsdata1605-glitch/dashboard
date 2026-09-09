import { expect, test } from '@playwright/test';

/**
 * Lưới an toàn CHO CHÍNH CSP — sinh ra vì CSP trong index.html đã chặn nhầm thứ đang dùng
 * thật ĐẾN 3 LẦN, lần nào cũng âm thầm (trình duyệt không báo ồn ào, tính năng chỉ đơn giản
 * là không chạy):
 *   1. `connect-src` thiếu docs.google.com/googleusercontent.com → hỏng nạp cấu hình sản
 *      phẩm (ảnh hưởng MỌI số liệu doanh thu).
 *   2. `worker-src` thiếu blob: → chặn Worker của canvas-confetti.
 *   3. `frame-src` thiếu 'self' + https://*.run.app → hỏng HOÀN TOÀN Check Thưởng và Hoàn thuế.
 *
 * Cách bắt: lắng nghe sự kiện DOM `securitypolicyviolation` — sự kiện này nổ cho MỌI loại tài
 * nguyên bị chặn (script/style/img/font/connect/frame/worker), nên bắt được cả những thứ
 * không hiện lỗi ra console.
 *
 * Lưu ý phạm vi: test này chỉ MỞ từng tab, chưa thao tác sâu (chưa tải file, chưa in tem,
 * chưa gọi AI). Vi phạm phát sinh trong các luồng đó cần test riêng.
 */
const TABS = [
    'analysis', 'check-thuong', 'employees', 'tools-print-sticker',
    'tools-phanca', 'tools-coupon', 'tools-tax', 'tools-price-compare',
    'settings', 'help',
];

test('mở mọi tab: không có vi phạm CSP nào', async ({ page }) => {
    await page.addInitScript(() => {
        (window as unknown as { __cspViolations: string[] }).__cspViolations = [];
        document.addEventListener('securitypolicyviolation', (e) => {
            const ev = e as SecurityPolicyViolationEvent;
            (window as unknown as { __cspViolations: string[] }).__cspViolations.push(
                `${ev.effectiveDirective} ⟵ ${ev.blockedURI}`.slice(0, 200)
            );
        });
    });

    await page.goto('/');
    const demo = page.getByRole('button', { name: /Kích hoạt Chế độ Dùng Thử/i });
    if (await demo.isVisible().catch(() => false)) await demo.click();
    await page.waitForTimeout(1500);

    const all: string[] = [];
    for (const tab of TABS) {
        await page.goto(`/?tab=${tab}`);
        await page.waitForTimeout(2200);
        const v = await page.evaluate(
            () => (window as unknown as { __cspViolations: string[] }).__cspViolations || []
        );
        for (const x of v) all.push(`[${tab}] ${x}`);
    }

    const unique = [...new Set(all)];
    expect(
        unique,
        `CSP đang chặn tài nguyên đang dùng thật — nới directive tương ứng trong index.html:\n${unique.join('\n')}`
    ).toEqual([]);
});
