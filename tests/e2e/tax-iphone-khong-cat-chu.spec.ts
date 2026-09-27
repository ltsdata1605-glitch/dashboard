import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';

/**
 * Tính thuế trên iPhone SE (375px) với dữ liệu HRM thật mẫu (2026-09-27): không chữ nào bị cắt "…".
 * Lỗi cũ: tên khoản thưởng 1 dòng cắt "…" → "Thưởng nóng NV ST T08.2026 - Thưởng cá nhân" và
 * "- Chia theo quỹ thưởng nóng ST" hiện GIỐNG HỆT nhau, không biết tích khoản nào; tiêu đề thẻ
 * "1. Lương ngày 5" / "2. Thưởng ngày 20" thành "1. Lương ngà…" vì icon mở HRM (trùng link với
 * chính tiêu đề) chiếm chỗ. Desktop vẫn cắt 1 dòng như cũ (có `title` để rê chuột xem đủ).
 */
test('375px, đủ 2 đợt: tên khoản thưởng và tiêu đề thẻ hiện đủ, không cắt "…"', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/?tab=tools-tax');
    await page.getByRole('button', { name: /Kích hoạt Chế độ Dùng Thử/i }).click();
    await expect(page.getByTestId('paste-day5')).toBeVisible({ timeout: 30_000 });

    for (const [id, file, ok] of [
        ['paste-day5', 'hrm-luong-ngay5.txt', /Đã đọc Chi tiết lương Đợt 1/],
        ['paste-day20', 'hrm-thuong-ngay20.txt', /Đã đọc Chi tiết thưởng Đợt 2/],
    ] as const) {
        await page.evaluate(t => navigator.clipboard.writeText(t), readFileSync(`tests/fixtures/${file}`, 'utf8'));
        await page.getByTestId(id).click();
        await expect(page.getByText(ok)).toBeVisible({ timeout: 10_000 });
    }
    await expect(page.getByText('Thưởng nóng NV ST T08.2026 - Chia theo quỹ thưởng nóng ST')).toBeVisible();

    const biCat = await page.evaluate(() => Array.from(document.querySelectorAll('*')).filter(el => {
        const h = el as HTMLElement;
        return h.getBoundingClientRect().width > 0 && getComputedStyle(h).textOverflow === 'ellipsis'
            && h.scrollWidth > h.clientWidth + 1 && !!h.textContent?.trim();
    }).map(el => (el.textContent || '').trim().slice(0, 50))
        // Chân ảnh xuất ("Tính Thuế TNCN (Tháng …) — Tên") — tên đầy đủ đã có ở đầu phiếu.
        .filter(t => !t.startsWith('Tính Thuế TNCN')));
    expect(biCat, 'còn chữ bị cắt "…" ở 375px').toEqual([]);
});
