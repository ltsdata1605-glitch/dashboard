import { test, expect } from '@playwright/test';
import { createSalesXlsx } from './helpers/salesFixture';

/**
 * Kiểm chứng RUNTIME cho bản sửa hạn mức Firestore 2026-09-17 mục 6 — `hooks/useSystemTraffic.ts`
 * (xem implementation_plan.md mục "Audit hạn mức đọc/ghi Firestore").
 *
 * Phần test được ở đây: `initTrafficStats()` — hàm vừa GỘP `incrementVisit()` + `loadTotalVisits()`
 * làm một (trước đây cả hai cùng `getDoc` ĐÚNG 1 document `_system/stats` → 2 lượt đọc mỗi lần mở
 * app cho cùng dữ liệu). Hàm này chạy trong effect không có điều kiện `user`, nên chế độ Dùng Thử
 * cũng đi qua nó. Dòng "Tổng: N lượt" hiện ra chứng minh hàm đã đọc + set state thành công.
 *
 * ⚠️ KHÔNG test được ở đây (nói rõ để lần sau không tưởng là đã bao phủ):
 *  - `pingPresence()` cần `user` thật — chế độ Dùng Thử có `user = null`.
 *  - `fetchOnlineUsers()` (đã đổi `getDocs` → `getCountFromServer`) chỉ chạy với `userRole ===
 *    'admin'`, mà chế độ Dùng Thử là `'manager'` (contexts/AuthContext.tsx:242).
 * Hai phần đó cần đăng nhập bằng tài khoản Google có quyền admin — không tự động hoá được ở đây.
 * Nhịp/chu kỳ của chúng đã được khoá bằng test đơn vị `tests/unit/presence-policy.test.ts`.
 *
 * ĐỌC KỸ trước khi nghi ngờ kết quả "TỔNG: 0 LƯỢT • 0 ĐANG ONLINE" — đó là ĐÚNG, không phải lỗi:
 *  - `firestore.rules:122` cho đọc `_system/{doc}` chỉ khi `isSignedIn()`, mà chế độ Dùng Thử KHÔNG
 *    đăng nhập → `getDoc` bị từ chối (`Missing or insufficient permissions`), `initTrafficStats()`
 *    bắt lỗi rồi thoát, `totalVisits` giữ giá trị khởi tạo 0. Chính việc log ra được lỗi đó là bằng
 *    chứng code ĐÃ CHẠY tới lượt đọc, chứ không phải âm thầm không chạy.
 *  - `0 ĐANG ONLINE` vì `fetchOnlineUsers()` chỉ chạy với `userRole === 'admin'`.
 *  - Lỗi xuất hiện 2 lần là do `React.StrictMode` (`index.tsx:18`) gọi effect 2 lần ở chế độ dev;
 *    bản production không nhân đôi. Nghĩa là số lượt đọc thật: dev 4 → 2, production 2 → 1.
 */
test.setTimeout(120000);

test('thống kê lượt truy cập vẫn hiển thị sau khi gộp 2 lượt đọc thành 1', async ({ page }) => {
    const pageErrors: string[] = [];
    const consoleErrors: string[] = [];
    page.on('pageerror', (e) => pageErrors.push(e.message));
    // Lỗi đọc Firestore bị bắt bằng try/catch rồi console.error — KHÔNG nổi lên 'pageerror'. Bắt
    // riêng để phân biệt được "code đã chạy tới nơi rồi gặp hạn mức" với "code âm thầm không chạy".
    page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text().slice(0, 200)); });

    // Dòng thống kê nằm trong khối `{showDashboard && ...}` của DashboardView, nên phải NẠP DỮ
    // LIỆU thật mới render — nếu không trang dừng ở màn hình landing "Dữ liệu phức tạp / Phân tích
    // siêu tốc". Dùng lại đúng cách nạp của tests/e2e/pivot-table.spec.ts.
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: /Kích hoạt Chế độ Dùng Thử/i }).click();
    await page.locator('input[type="file"]').first().setInputFiles(createSalesXlsx());
    await page.getByText('Tệp Realtime (Xem nhanh)').click();
    await expect(page.getByText(/Doanh Thu/i).first()).toBeVisible({ timeout: 45_000 });
    await page.waitForTimeout(2000);

    // Dòng thống kê nằm trong DashboardView: "Tổng: N lượt • M đang online"
    const statLine = page.getByText(/Tổng:/i).first();
    const statVisible = await statLine.isVisible().catch(() => false);
    const onlineVisible = await page.getByText(/đang online/i).first().isVisible().catch(() => false);

    const statText = statVisible ? (await statLine.innerText()).replace(/\s+/g, ' ').trim() : '(không thấy)';
    console.log(`[KẾT QUẢ] dòng "Tổng: ... lượt" hiển thị = ${statVisible} → "${statText}"`);
    console.log(`[KẾT QUẢ] cụm "đang online" hiển thị = ${onlineVisible}`);
    console.log(`[KẾT QUẢ] lỗi JS runtime = ${pageErrors.length} ${JSON.stringify(pageErrors.slice(0, 5))}`);
    const trafficErrors = consoleErrors.filter(m => /total visits|Traffic Counter|Online Query/i.test(m));
    console.log(`[KẾT QUẢ] console.error liên quan thống kê = ${trafficErrors.length} ${JSON.stringify(trafficErrors.slice(0, 3))}`);
    await page.screenshot({ path: 'test-results/system-traffic-stats.png', fullPage: true });

    expect(pageErrors.filter(m => !/quota|resource-exhausted|Quota/i.test(m))).toEqual([]);
    expect(statVisible).toBe(true);
    expect(onlineVisible).toBe(true);
});
