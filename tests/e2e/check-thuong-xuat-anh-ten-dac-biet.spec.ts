import { expect, test } from '@playwright/test';

/**
 * Audit A09 (2026-09-29): exporter "Top thưởng" chèn tên siêu thị / mã kho / tiêu đề / tên file từ
 * Excel vào innerHTML không escape. Tên có `<`, `&` → vỡ bố cục ảnh, hoặc biến thành thẻ HTML thật.
 * Chạy hàm THẬT trong Chromium, ghi lại DOM ảnh ngay lúc nó được gắn vào trang để chụp.
 */
test('tên siêu thị có ký tự HTML: ảnh hiện đúng nguyên văn, không sinh thẻ HTML', async ({ page }) => {
    await page.goto('/');
    const kq = await page.evaluate(async () => {
        const w = window as unknown as { __xss?: number };
        HTMLAnchorElement.prototype.click = function () { /* chặn tải file trong test */ };
        // `as`: TS thu hẹp biến gán trong callback về `null` → `never` ở strict
        let chup = null as { text: string; soImg: number; soB: number } | null;
        const mo = new MutationObserver(() => {
            const el = document.getElementById('check-thuong-capture-target');
            if (el && !chup) chup = { text: el.textContent || '', soImg: el.querySelectorAll('img').length, soB: el.querySelectorAll('b').length };
        });
        mo.observe(document.body, { childList: true, subtree: true });

        const p = '/features/check-thuong/services/checkThuongImageExport.ts';
        const mod = await import(/* @vite-ignore */ p) as typeof import('../../features/check-thuong/services/checkThuongImageExport');
        const ten = 'ĐMX <b>Hùng Vương</b> & <img src=x onerror="window.__xss=1">';
        await mod.exportLeaderboardToImage({
            stores: [{ storeCode: '1234<i>', storeName: ten, achievedCount: 3, totalCategories: 5, achievedPercent: 60, totalBonus: 12_000_000 }] as never,
            customTitle: 'TOP <u>1</u>',
            fileName: 'bao-cao<script>.xlsx',
        });
        mo.disconnect();
        return { chup, xss: w.__xss ?? 0, ten };
    });

    expect(kq.chup, 'không bắt được DOM ảnh').not.toBeNull();
    expect(kq.chup!.soImg, 'tên siêu thị sinh ra thẻ <img> thật').toBe(0);
    expect(kq.chup!.soB, 'tên siêu thị sinh ra thẻ <b> thật').toBe(0);
    expect(kq.chup!.text).toContain(kq.ten);
    expect(kq.chup!.text).toContain('1234<i>');
    expect(kq.chup!.text).toContain('TOP <u>1</u>');
    expect(kq.chup!.text).toContain('bao-cao<script>.xlsx');
    expect(kq.xss).toBe(0);
});
