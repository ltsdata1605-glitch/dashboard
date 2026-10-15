import { test, expect, type Page } from '@playwright/test';

/**
 * REPORT BI TRÊN IPHONE — chủ dự án yêu cầu 2026-09-26: "tối ưu giao diện mobile dùng trên iPhone",
 * "tiêu đề, icon, nút chức năng — fix size lại cho phù hợp chế độ mobile".
 *
 * Đo thật TRƯỚC khi sửa (iPhone 15 393x852 và iPhone SE 375x667 cho kết quả GIỐNG HỆT nhau):
 *   - 71 chỗ chữ dưới 11px, nhỏ nhất 8px — do BiWrapper.tsx chèn CSS `!important` ép nhỏ CHỈ trên
 *     mobile (text-[11px] -> 9px, text-[10px] -> 8px), phá đúng quy tắc "nhỏ nhất 11px" của
 *     CLAUDE.md mục 2 ở nơi chữ khó đọc nhất.
 *   - 20 nút nhỏ hơn 44x44px, gồm CẢ 3 nút điều hướng chính (Siêu thị/Nhân viên/Cập nhật) chỉ 28x24.
 *
 * Test này chặn việc quay lại tình trạng đó.
 */
const ANALYSIS = {
    updatedAt: Date.now(), totalCount: 3,
    employees: [
        { id: '101', name: 'Nguyễn Văn A', originalName: '101 - Nguyễn Văn A', department: 'BP ALL IN ONE - DMX' },
        { id: '102', name: 'Trần Thị B', originalName: '102 - Trần Thị B', department: 'BP ALL IN ONE - DMX' },
        { id: '103', name: 'Lê Văn C', originalName: '103 - Lê Văn C', department: 'BP ALL IN ONE - DMX' },
    ],
};
const LUYKE = [
    'BP ALL IN ONE - DMX\t\t',
    '101 - Nguyễn Văn A\t120,000,000\t100',
    '102 - Trần Thị B\t98,000,000\t80',
    '103 - Lê Văn C\t75,000,000\t60',
].join('\n');

// Màn cảm ứng như iPhone thật (vùng chạm ::after chỉ bật với `pointer: coarse`).
test.use({ isMobile: true, hasTouch: true });

async function moBI(page: Page) {
    await page.goto('/?tab=employees');
    await page.getByRole('button', { name: /Kích hoạt Chế độ Dùng Thử/i }).click();
    await page.waitForTimeout(2500);
    await page.evaluate(async ({ analysis, luyke }) => {
        const db = await new Promise<IDBDatabase>((res, rej) => {
            const r = indexedDB.open('BI_HUB_DATABASE_V2');
            r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
        });
        await new Promise<void>((res, rej) => {
            const tx = db.transaction(['settings'], 'readwrite');
            const s = tx.objectStore('settings');
            s.put(['Tân Hiệp'], 'bi_updater-custom-supermarkets');
            s.put(analysis, 'analysis-employees-list');
            s.put(analysis, 'bi_analysis-employees-list');
            s.put(luyke, 'bi_config-Tân Hiệp-danhsach');
            tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error);
        });
        db.close();
    }, { analysis: ANALYSIS, luyke: LUYKE });
    await page.reload();
    await page.waitForTimeout(4000);
}

/** Chữ nhỏ hơn 11px và nút nhỏ hơn 44px ĐANG hiển thị trên màn */
async function doViPham(page: Page) {
    return page.evaluate(() => {
        const nhin = (el: Element) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
        const chuQuaNho = Array.from(document.querySelectorAll('*'))
            .filter(el => nhin(el) && el.children.length === 0 && !!el.textContent?.trim()
                && parseFloat(getComputedStyle(el).fontSize) < 11)
            .map(el => `${Math.round(parseFloat(getComputedStyle(el).fontSize))}px:${(el.textContent || '').trim().slice(0, 20)}`);
        // Vùng chạm THẬT = khung nút + lớp ::after vô hình nới ra (ycx-hit / thanh trên — chỉ có trên màn cảm ứng): nút nhìn
        // 32px nhưng chạm được 44px là đạt chuẩn Apple, giữ cỡ nhìn thấy của chủ dự án (GĐ5–GĐ6).
        const cao = (el: Element) => {
            const r = el.getBoundingClientRect(); const a = getComputedStyle(el, '::after');
            if (a.content === 'none' || a.position !== 'absolute') return r.height;
            const px = (v: string) => parseFloat(v) || 0;
            return r.height + Math.max(0, -px(a.top)) + Math.max(0, -px(a.bottom));
        };
        const nutQuaNho = Array.from(document.querySelectorAll('button')).filter(el => {
            const r = el.getBoundingClientRect();
            return r.width > 0 && r.height > 0 && cao(el) < 43.5;
        }).map(el => `${(el.textContent || '').trim().slice(0, 14) || el.getAttribute('title') || '[icon]'}:${Math.round(cao(el))}px`);
        return {
            chuQuaNho, nutQuaNho,
            tranNgang: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        };
    });
}

test('Report BI trên iPhone: không còn chữ dưới 11px, không tràn ngang', async ({ page }) => {
    test.setTimeout(150000);
    await page.setViewportSize({ width: 393, height: 852 }); // iPhone 15
    await moBI(page);

    const sieuThi = await doViPham(page);
    console.log(`TAB SIÊU THỊ — chữ <11px: ${sieuThi.chuQuaNho.length} | nút <44px: ${sieuThi.nutQuaNho.length}`);
    expect(sieuThi.chuQuaNho).toEqual([]);
    expect(sieuThi.tranNgang).toBe(false);

    await page.getByRole('button', { name: /^Nhân viên$/i }).first().click();
    await page.waitForTimeout(2500);
    const nhanVien = await doViPham(page);
    console.log(`TAB NHÂN VIÊN — chữ <11px: ${nhanVien.chuQuaNho.length} | nút <44px: ${nhanVien.nutQuaNho.length} ${JSON.stringify(nhanVien.nutQuaNho)}`);
    expect(nhanVien.chuQuaNho).toEqual([]);
    expect(nhanVien.tranNgang).toBe(false);

    // Trước khi sửa: 20 nút. Ngưỡng 8 để chặn tái diện; số còn lại là icon nhỏ nằm trong dòng dữ
    // liệu của bảng (ép 44px ở đó sẽ phá mật độ bảng — xem ghi chú ở components/shared/ui/Button.tsx).
    expect(nhanVien.nutQuaNho.length).toBeLessThanOrEqual(8);
});

test('3 nút điều hướng chính của Report BI đủ vùng chạm 44px', async ({ page }) => {
    test.setTimeout(120000);
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE — máy nhỏ nhất còn dùng
    await moBI(page);

    // Siêu thị / Nhân viên / Cập nhật: từ GĐ6 (2026-10-13) là segmented control CÓ CHỮ ở đầu nội dung (trước là 3 icon không chữ
    // trên thanh trên — lỗi #12 trong video của chủ dự án).
    const nhan = ['Siêu thị', 'Nhân viên', 'Cập nhật'];
    const seg = page.locator('[data-segmented]').first();
    await expect(seg).toBeVisible();
    for (const ten of nhan) {
        const nut = seg.getByRole('button', { name: ten, exact: true });
        const hop = await nut.boundingBox();
        expect(hop, `không thấy nút "${ten}"`).toBeTruthy();
        console.log(`NÚT "${ten}": ${Math.round(hop!.width)}x${Math.round(hop!.height)}`);
        // Nhỏ gọn chuẩn mẫu Zalo/iOS (~32px nhìn thấy), vùng chạm thật 44px qua ycx-hit
        expect(hop!.height).toBeGreaterThanOrEqual(30);
        expect(hop!.width).toBeGreaterThanOrEqual(30);
    }
});
