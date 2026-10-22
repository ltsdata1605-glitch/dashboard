import { expect, test } from '@playwright/test';
import * as path from 'path';
import { SUMMARY_REALTIME, SUMMARY_LUYKE, TEST_SUPERMARKET } from './helpers/seed';

test.describe('Report BI Dashboard Mobile Topbar Filters Verification', () => {
    test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

    test('Chức năng Realtime/Luỹ kế (1 nút chuyển đổi) và bộ lọc siêu thị nằm trên thanh bar topbar trên mobile', async ({ page }) => {
        await page.addInitScript(() => {
            sessionStorage.setItem('ycx_demo_mode', 'true');
            localStorage.setItem('ycx_demo_mode', 'true');
        });

        // Nạp siêu thị & dữ liệu summary vào IndexedDB
        await page.goto('/?tab=employees&view=dashboard');
        await page.evaluate(async ({ rt, lk, sm }) => {
            const db = await new Promise<IDBDatabase>((res, rej) => {
                const r = indexedDB.open('BI_HUB_DATABASE_V2');
                r.onsuccess = () => res(r.result);
                r.onerror = () => rej(r.error);
            });
            await new Promise<void>((res, rej) => {
                const tx = db.transaction(['settings'], 'readwrite');
                const s = tx.objectStore('settings');
                s.put(['Hùng Vương', sm], 'bi_updater-custom-supermarkets');
                s.put(rt, 'summary-realtime');
                s.put(rt, 'bi_summary-realtime');
                s.put(lk, 'summary-luy-ke');
                s.put(lk, 'bi_summary-luy-ke');
                tx.oncomplete = () => res();
                tx.onerror = () => rej(tx.error);
            });
            db.close();
        }, { rt: SUMMARY_REALTIME, lk: SUMMARY_LUYKE, sm: TEST_SUPERMARKET });

        await page.reload();
        await page.waitForTimeout(2000);

        // 1. Kiểm tra trên Topbar: slot #mobile-topbar-filters phải hiển thị cụm capsule
        const filterSlot = page.locator('#mobile-topbar-filters');
        await expect(filterSlot).toBeVisible({ timeout: 15000 });

        const capsuleFilters = filterSlot.locator('[data-dashboard-mobile-filters]');
        await expect(capsuleFilters).toBeVisible({ timeout: 5000 });

        // 2. Kiểm tra nút chuyển đổi Realtime / Luỹ kế
        const toggleBtn = capsuleFilters.locator('button').first();
        await expect(toggleBtn).toBeVisible();

        const initialText = (await toggleBtn.innerText()).trim();
        console.log('Trạng thái ban đầu:', initialText);

        // Chụp ảnh trạng thái Realtime ban đầu
        const rtPath = path.resolve('/Users/ltson/.gemini/antigravity-ide/brain/e5b11325-2dae-473e-9c88-ee6990fa20b2/bi-mobile-filters-realtime.png');
        await page.screenshot({ path: rtPath, fullPage: false });

        // Bấm chuyển đổi
        await toggleBtn.click();
        await page.waitForTimeout(500);

        const changedText = (await toggleBtn.innerText()).trim();
        console.log('Trạng thái sau khi bấm:', changedText);
        expect(changedText).not.toEqual(initialText);

        // 4. Đo đạc và kiểm tra CHIỀU CAO: cụm Realtime/Luỹ kế và cụm bên phải BẰNG NHAU (chuẩn 34px)
        const filterBox = await capsuleFilters.boundingBox();
        const actionsSlot = page.locator('[data-navbar-actions]');
        const actionsBox = await actionsSlot.boundingBox();

        console.log('Chiều cao cụm bộ lọc:', filterBox?.height);
        console.log('Chiều cao cụm actions bên phải:', actionsBox?.height);

        expect(filterBox).not.toBeNull();
        expect(actionsBox).not.toBeNull();
        // Chiều cao phải bằng chuẩn 34px (chênh lệch tối đa 1px do pixel rounding)
        expect(Math.abs((filterBox?.height || 0) - 34)).toBeLessThanOrEqual(1);
        expect(Math.abs((actionsBox?.height || 0) - 34)).toBeLessThanOrEqual(1);
        expect(Math.abs((filterBox?.height || 0) - (actionsBox?.height || 0))).toBeLessThanOrEqual(1);

        // 5. Kiểm tra icon đầu tiên (Siêu thị) nằm trọn vẹn trong cụm actions, không bị cắt mép trái
        const firstTabBtn = actionsSlot.locator('button').first();
        const firstBtnBox = await firstTabBtn.boundingBox();
        console.log('Nút đầu tiên (Siêu thị):', firstBtnBox);
        expect(firstBtnBox).not.toBeNull();
        expect(firstBtnBox!.width).toBeGreaterThanOrEqual(30);
        // Nút đầu tiên phải nằm bên trong khung actions (x của nút >= x của actions)
        expect(firstBtnBox!.x).toBeGreaterThanOrEqual(actionsBox!.x);

        // Chụp ảnh lưu artifact bằng chứng
        const artifactPath = path.resolve('/Users/ltson/.gemini/antigravity-ide/brain/e5b11325-2dae-473e-9c88-ee6990fa20b2/bi-dashboard-mobile-topbar-verified.png');
        await page.screenshot({ path: artifactPath, fullPage: false });
        console.log('Saved screenshot to:', artifactPath);
    });
});
