import { expect, test } from '@playwright/test';
import { chanGhiCloud, dangNhapBangToken, hasCustomToken } from './helpers/customTokenLogin';

/**
 * Bộ đếm lượt truy cập (hooks/useSystemTraffic.ts, 2026-10-15): rules `_system/{doc}` chỉ cho người ĐÃ ĐĂNG NHẬP đọc/ghi.
 * Trước đây effect chạy lúc gắn bất kể trạng thái → Chế độ Dùng thử gọi getDoc, bị từ chối, in "Load total visits error:
 * permission-denied" ra console mỗi lần mở app. Khoá cả 2 chiều: Dùng thử KHÔNG gọi (không lỗi); đăng nhập thật VẪN đọc được số.
 */
const LOI_DEM = /Load total visits error|Traffic Counter Error/;

// Container cloud: Chromium cài sẵn + mạng ra ngoài chỉ qua proxy (như ios-du-lieu-that.spec.ts). CI không đặt 2 biến này → {}.
test.use({
    launchOptions: {
        ...(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}),
        ...(process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' } } : {}),
    },
});

test('Chế độ Dùng thử: không gọi bộ đếm lượt truy cập → không lỗi console', async ({ page }) => {
    const loi: string[] = [];
    page.on('console', (m) => { if (m.type() === 'error' && LOI_DEM.test(m.text())) loi.push(m.text().slice(0, 200)); });
    // Bật Dùng thử TRƯỚC khi trang chạy (như perf-apple) — bấm nút với hạn chờ ngắn trượt khi dev server còn nguội.
    await page.addInitScript(() => { try { localStorage.setItem('ycx_demo_mode', 'true'); } catch { /* */ } });
    await page.goto('/?tab=analysis');
    await expect(page.getByText(/Phân tích siêu tốc|Tổng quan doanh thu/i).first()).toBeVisible({ timeout: 60_000 });
    await page.waitForTimeout(5000); // lượt getDoc cũ trả lỗi trong vài trăm ms — chờ dư
    expect(loi).toEqual([]);
});

test.describe('tài khoản thật (chỉ đọc)', () => {
    test.skip(!hasCustomToken(), 'Chưa có custom token của tài khoản test');
    test.use({ viewport: { width: 1366, height: 800 } });

    test('đăng nhập: vẫn đọc được tổng lượt truy cập (thanh trên hiện "… lượt"), không lỗi đọc', async ({ page }) => {
        test.setTimeout(180_000);
        const loiDoc: string[] = [];
        page.on('console', (m) => { if (m.type() === 'error' && /Load total visits error/.test(m.text())) loiDoc.push(m.text().slice(0, 200)); });
        await chanGhiCloud(page); // lượt +1 (ghi) bị chặn — chỉ kiểm phần ĐỌC
        await dangNhapBangToken(page);
        await page.goto('/?tab=analysis');
        await expect(page.getByText(/\d+(?:[.,]\d+)?k? lượt/).first()).toBeVisible({ timeout: 90_000 });
        expect(loiDoc).toEqual([]);
    });
});
