import { test, expect } from '@playwright/test';

/**
 * Audit 2026-10-07 (GĐ5, IOS-02): đóng máy quét khi camera ĐANG khởi động (iPhone: đang chờ bấm "Cho phép")
 * thì camera không được bật lên sau đó. Trước đây dọn dẹp chỉ stop khi `isScanning` đã true, nên lượt start
 * hoàn tất muộn để camera chạy tiếp sau khi modal đã đóng.
 *
 * Giả lập: getUserMedia trả luồng canvas sau 1,5s (giống chờ quyền) và ghi lại mọi luồng đã cấp.
 */
const AUTH_HOOK_STUB = `
const FAKE_USER = { uid: 'u-audit', email: 'audit@test.local' };
const FAKE_DATA = { uid: 'u-audit', username: 'admin', role: 'admin', storeId: '910', storeHasAdmin: true };
export function useStickerEventAuth() {
  return { user: FAKE_USER, setUser: () => {}, userData: FAKE_DATA, setUserData: () => {},
           isInitializing: false, setIsInitializing: () => {}, handleLoginSuccess: () => {} };
}
`;

test('đóng máy quét lúc camera đang khởi động: không còn luồng camera nào chạy', async ({ page }) => {
    test.setTimeout(120000);
    await page.addInitScript(() => {
        const w = window as unknown as { __streams: MediaStream[] };
        w.__streams = [];
        const md = navigator.mediaDevices;
        md.enumerateDevices = async () => [
            { deviceId: 'cam-sau', kind: 'videoinput', label: 'Back Camera', groupId: 'g', toJSON() { return this; } } as MediaDeviceInfo,
        ];
        md.getUserMedia = async () => {
            await new Promise((r) => setTimeout(r, 1500));
            const c = document.createElement('canvas');
            c.width = 320; c.height = 240;
            const ctx = c.getContext('2d')!;
            const ve = () => { ctx.fillStyle = '#888'; ctx.fillRect(0, 0, 320, 240); };
            ve(); setInterval(ve, 100);
            const s = c.captureStream(10);
            w.__streams.push(s);
            return s;
        };
    });
    await page.route('**/features/sticker-event/hooks/useStickerEventAuth.ts*', r =>
        r.fulfill({ status: 200, contentType: 'application/javascript', body: AUTH_HOOK_STUB }));
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/?tab=tools-print-sticker&sub=event');
    await page.waitForTimeout(1200);
    const demo = page.getByText(/Kích hoạt Chế độ Dùng Thử/i).first();
    if (await demo.isVisible().catch(() => false)) {
        await demo.click();
        await page.waitForTimeout(2200);
        await page.goto('/?tab=tools-print-sticker&sub=event');
    }
    await page.waitForTimeout(2500);

    await page.getByRole('button', { name: /Quét mã/i }).first().click();
    // getCameras xin quyền (1,5s) rồi start xin luồng thật (1,5s) — đóng giữa lúc start đang chờ.
    await page.waitForTimeout(2200);
    await page.getByRole('button', { name: 'Đóng máy quét' }).click();
    await page.waitForTimeout(3500);

    const ketQua = await page.evaluate(() => {
        const ss = (window as unknown as { __streams: MediaStream[] }).__streams;
        return { daCap: ss.length, conChay: ss.flatMap((s) => s.getVideoTracks()).filter((t) => t.readyState === 'live').length };
    });
    console.log('Luồng camera đã cấp:', ketQua.daCap, '— còn chạy sau khi đóng:', ketQua.conChay);
    expect(ketQua.daCap).toBeGreaterThanOrEqual(2); // đúng là đã đi tới bước start
    expect(ketQua.conChay).toBe(0);
});
