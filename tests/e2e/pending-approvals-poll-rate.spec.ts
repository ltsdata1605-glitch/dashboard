import { test, expect } from '@playwright/test';

/**
 * Đếm số lần app THẬT gọi Cloud Function `listManagedUsers` — bản sửa hạn mức Firestore
 * 2026-09-17 mục 4 (xem implementation_plan.md mục "Audit hạn mức đọc/ghi Firestore").
 *
 * Trước bản sửa, mỗi admin/manager mở tab có tới 4 vòng polling ĐỘC LẬP 45s cùng gọi đúng hàm
 * này: NotificationDropdown mount 2 lần (App.tsx:275 trong mobile topbar `lg:hidden` — ẩn bằng CSS
 * nên React VẪN mount và vẫn chạy effect — và Header.tsx:212 do DashboardView render),
 * PendingApprovalBanner, và chính DashboardView. Nay cả 4 dùng chung 1 vòng poll 120s.
 *
 * ⚠️ PHẠM VI THẬT CỦA TEST NÀY (đã đo, không phải phỏng đoán): nó KHÔNG so sánh được trước/sau.
 * Chạy ở chế độ Dùng Thử cho 0 lượt gọi ở CẢ bản cũ (đo bằng `git stash`) lẫn bản mới — vì chế độ
 * Dùng Thử có `user = null` nên effect của NotificationDropdown return sớm ngay từ bản cũ. Giá trị
 * của test là: (1) bắt lỗi JS runtime sau khi tách NotificationDropdown thành 2 effect —
 * tsc/eslint/build không phát hiện được lớp lỗi này; (2) chốt rằng chế độ Dùng Thử KHÔNG gọi Cloud
 * Function nào. Phần giảm tải thật được đo bằng test đơn vị `tests/unit/pending-approvals-store.ts`
 * (chạy chính code của store). Muốn đo trước/sau trên đường đi admin thật thì phải đăng nhập bằng
 * tài khoản Google có quyền admin — không tự động hoá được ở đây.
 */
test.setTimeout(240000);

test('chế độ Dùng Thử không gọi listManagedUsers, và không có lỗi runtime', async ({ page }) => {
    const calls: string[] = [];
    const pageErrors: string[] = [];

    page.on('pageerror', (e) => pageErrors.push(e.message));
    page.on('request', (req) => {
        const url = req.url();
        // Cloud Function callable: POST .../listManagedUsers
        if (/listManagedUsers/i.test(url)) calls.push(`${req.method()} ${url.slice(0, 140)}`);
    });

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4000);

    const demoBtn = page.getByText(/Kích hoạt Chế độ Dùng Thử/i).first();
    if (await demoBtn.isVisible().catch(() => false)) {
        await demoBtn.click();
        await page.waitForTimeout(5000);
    }

    // Ngồi im 150s — dài hơn 1 chu kỳ poll mới (120s) và hơn 3 chu kỳ cũ (45s).
    const startedAt = Date.now();
    await page.waitForTimeout(150000);
    const elapsedMin = ((Date.now() - startedAt) / 60000).toFixed(1);

    console.log(`[KẾT QUẢ] số lượt gọi listManagedUsers trong ${elapsedMin} phút = ${calls.length}`);
    console.log(`[KẾT QUẢ] lỗi JS runtime = ${pageErrors.length} ${JSON.stringify(pageErrors.slice(0, 5))}`);
    await page.screenshot({ path: 'test-results/pending-approvals-poll.png', fullPage: true });

    expect(pageErrors.filter(m => !/quota|resource-exhausted|Quota/i.test(m))).toEqual([]);
    // Chế độ Dùng Thử phải không gọi gì cả.
    expect(calls.length).toBe(0);
});
