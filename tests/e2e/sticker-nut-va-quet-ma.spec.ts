import { test, expect, type Page } from '@playwright/test';

/**
 * In Sticker — hệ thống nút + tiện ích quét mã vạch (chủ dự án yêu cầu 2026-09-25).
 *
 * Không đăng nhập được bằng tài khoản In Sticker thật trong Playwright (tài khoản QA
 * `admin_test_claude_qa2` đã mất sau đợt di trú database 19/09), nên stub `useStickerEventAuth`:
 * hook thay thế KHÔNG gọi hook React nào bên trong nên không phá thứ tự hook, và không cần import
 * React (dev server của Vite không phục vụ /deps/react.js). Dữ liệu gieo thẳng vào IndexedDB
 * `ProductSearchDB` → không chạm Firestore thật, không tốn hạn mức đọc.
 */
test.use({ launchOptions: { args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] } });

const AUTH_HOOK_STUB = `
const FAKE_USER = { uid: 'u-audit', email: 'audit@test.local' };
const FAKE_DATA = { uid: 'u-audit', username: 'admin', role: 'admin', storeId: '910', storeHasAdmin: true };
export function useStickerEventAuth() {
  return {
    user: FAKE_USER, setUser: () => {},
    userData: FAKE_DATA, setUserData: () => {},
    isInitializing: false, setIsInitializing: () => {},
    handleLoginSuccess: () => {},
  };
}
`;

const PRODUCTS = [
    { msp: '2001234', sanPham: 'Tivi Samsung 4K 55 inch UA55DU7000', thuongERP: 150000, thuongNong: 50000, tongThuong: 200000, giaGoc: '12.990.000', giaGiam: '9.990.000', khuyenMai: 'Tặng loa thanh', ngayIn: '25/09/2026', selected: false, quantity: 1 },
    { msp: '2001238', sanPham: 'Nồi cơm điện Sharp 1.8 lít KS-COM19V', thuongERP: 20000, thuongNong: 0, tongThuong: 20000, giaGoc: '1.290.000', giaGiam: '890.000', khuyenMai: '', ngayIn: '25/09/2026', selected: false, quantity: 1 },
];

async function moInSticker(page: Page) {
    await page.route('**/features/sticker-event/hooks/useStickerEventAuth.ts*', r =>
        r.fulfill({ status: 200, contentType: 'application/javascript', body: AUTH_HOOK_STUB }));

    await page.goto('/?tab=tools-print-sticker&sub=event');
    await page.waitForTimeout(1500);
    const demo = page.getByText(/Kích hoạt Chế độ Dùng Thử/i).first();
    if (await demo.isVisible().catch(() => false)) {
        await demo.click();
        await page.waitForTimeout(2500);
        await page.goto('/?tab=tools-print-sticker&sub=event');
    }
    await page.waitForTimeout(3000);

    await page.evaluate(async (products) => {
        const db = await new Promise<IDBDatabase>((res, rej) => {
            const r = indexedDB.open('ProductSearchDB', 1);
            r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains('appData')) r.result.createObjectStore('appData'); };
            r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
        });
        await new Promise<void>((res, rej) => {
            const tx = db.transaction(['appData'], 'readwrite');
            tx.objectStore('appData').put(products, 'products');
            tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error);
        });
        db.close();
    }, PRODUCTS);
    await page.reload();
    await page.waitForTimeout(3500);
}

test('máy quét có đèn pin, nhập mã tay và nằm TRÊN thanh điều hướng dưới', async ({ page, context }) => {
    await context.grantPermissions(['camera']);
    await page.setViewportSize({ width: 390, height: 844 });
    await moInSticker(page);

    await page.getByRole('button', { name: /Quét mã/i }).first().click();
    await page.waitForTimeout(3000);

    // Ba tiện ích bắt buộc có cho nhân viên đứng giữa kệ hàng
    await expect(page.getByRole('button', { name: /Đèn pin|Tắt đèn/i }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Nhập mã tay/i }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Dừng quét/i }).first()).toBeVisible();

    // Nút đóng phải nhìn thấy trọn vẹn, KHÔNG bị thanh điều hướng dưới (portal ra body, z-50) che
    const nutDong = await page.getByRole('button', { name: /Dừng quét/i }).first().boundingBox();
    const nav = await page.getByText('Trang chủ', { exact: true }).first().boundingBox();
    expect(nutDong).toBeTruthy();
    if (nutDong && nav) {
        console.log(`ĐÁY NÚT ĐÓNG=${Math.round(nutDong.y + nutDong.height)} | ĐỈNH THANH DƯỚI=${Math.round(nav.y)}`);
        expect(nutDong.y + nutDong.height).toBeLessThanOrEqual(nav.y + 1);
    }

    // Mã vạch mờ/rách: gõ tay vẫn thêm được sản phẩm, đi đúng đường xử lý như mã quét được
    await page.getByRole('button', { name: /Nhập mã tay/i }).first().click();
    await page.getByPlaceholder(/Gõ mã sản phẩm/i).fill('2001238');
    await page.getByRole('button', { name: /^Thêm$/i }).first().click();
    await page.waitForTimeout(800);
    await expect(page.getByText(/THÀNH CÔNG/i)).toBeVisible();
    await expect(page.getByText(/Đã tìm thấy: 2001238/)).toBeVisible();
});

test('bảng điều khiển: nút gom theo nhóm việc, nhãn thanh dưới không nhỏ hơn 11px', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await moInSticker(page);

    await page.getByRole('button', { name: /Công cụ/i }).first().click();
    await page.waitForTimeout(1000);

    // Nhóm việc phải hiện thành nhãn, không còn là một lưới nút đều nhau
    await expect(page.getByText('Danh sách', { exact: true })).toBeVisible();
    await expect(page.getByText(/Dữ liệu & cài đặt/i)).toBeVisible();

    // Nút cuối cùng không được bị thanh điều hướng che khi đã cuộn tới đáy
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(600);
    const inTatCa = await page.getByRole('button', { name: /In tất cả/i }).first().boundingBox();
    const nav = await page.getByText('Trang chủ', { exact: true }).first().boundingBox();
    if (inTatCa && nav) {
        console.log(`ĐÁY NÚT "IN TẤT CẢ"=${Math.round(inTatCa.y + inTatCa.height)} | ĐỈNH THANH DƯỚI=${Math.round(nav.y)}`);
        expect(inTatCa.y + inTatCa.height).toBeLessThanOrEqual(nav.y + 1);
    }

    // Cỡ chữ nhỏ nhất của dự án là 11px (CLAUDE.md mục 2) — trước đây thanh dưới dùng 10px
    const cacNhan = await page.evaluate(() =>
        Array.from(document.querySelectorAll('span'))
            .filter(s => /^(Trang chủ|Công cụ|Quét mã|Lưu DS|Lọc)$/.test(s.textContent || ''))
            .map(s => parseFloat(getComputedStyle(s).fontSize)));
    console.log('CỠ CHỮ NHÃN THANH DƯỚI:', JSON.stringify(cacNhan));
    expect(cacNhan.length).toBeGreaterThan(0);
    for (const cỡ of cacNhan) expect(cỡ).toBeGreaterThanOrEqual(11);
});
