import { expect, test } from '@playwright/test';

const DS = { updatedAt: Date.now(), totalCount: 3, employees: [
    { id: '101', name: 'Nguyễn Văn A', originalName: '101 - Nguyễn Văn A', department: 'BP ALL IN ONE - DMX' },
    { id: '102', name: 'Trần Thị B', originalName: '102 - Trần Thị B', department: 'BP ALL IN ONE - DMX' },
    { id: '103', name: 'Lê Văn C', originalName: '103 - Lê Văn C', department: 'BP ALL IN ONE - DMX' } ] };
const LUYKE_NV = ['BP ALL IN ONE - DMX\t\t', '101 - Nguyễn Văn A\t120,000,000\t100', '102 - Trần Thị B\t98,000,000\t80', '103 - Lê Văn C\t75,000,000\t60'].join('\n');

test.describe('Report BI Mobile Topbar Filters Verification', () => {
    test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

    test('2 bộ lọc (Siêu thị & Bộ phận) nằm trên thanh Topbar, bên trái các tab chức năng', async ({ page }) => {
        await page.addInitScript(() => {
            sessionStorage.setItem('ycx_demo_mode', 'true');
            localStorage.setItem('ycx_demo_mode', 'true');
        });

        // Nạp sẵn danh sách nhân viên vào IndexedDB trước khi mở trang
        await page.goto('/?tab=employees&view=employee');
        await page.evaluate(async ({ ds, nv }) => {
            const db = await new Promise<IDBDatabase>((res, rej) => {
                const r = indexedDB.open('BI_HUB_DATABASE_V2');
                r.onsuccess = () => res(r.result);
                r.onerror = () => rej(r.error);
            });
            await new Promise<void>((res, rej) => {
                const tx = db.transaction(['settings'], 'readwrite');
                const s = tx.objectStore('settings');
                s.put(['Hùng Vương'], 'bi_updater-custom-supermarkets');
                s.put(ds, 'analysis-employees-list');
                s.put(ds, 'bi_analysis-employees-list');
                s.put(nv, 'bi_config-Hùng Vương-danhsach');
                tx.oncomplete = () => res();
                tx.onerror = () => rej(tx.error);
            });
            db.close();
        }, { ds: DS, nv: LUYKE_NV });

        await page.reload();
        await page.waitForTimeout(2000);

        // Đảm bảo đang ở tab Nhân viên
        const nvTab = page.locator('#mobile-topbar-actions button[title*="Nhân viên"], #mobile-topbar-actions button[aria-label*="Nhân viên"]');
        if (await nvTab.isVisible({ timeout: 2000 }).catch(() => false)) {
            await nvTab.click();
            await page.waitForTimeout(500);
        }

        // 1. Kiểm tra vị trí của slot #mobile-topbar-filters
        const filterSlot = page.locator('#mobile-topbar-filters');
        await expect(filterSlot).toBeVisible({ timeout: 5000 });

        // 2. Kiểm tra bên trong #mobile-topbar-filters có 2 nút dropdown bộ lọc
        const buttons = filterSlot.locator('button');
        await expect(buttons).toHaveCount(2);

        // Nút 1: Siêu thị (có icon store và text All hoặc tên kho)
        const btnStore = buttons.nth(0);
        await expect(btnStore).toBeVisible();
        await expect(btnStore).toContainText(/All|CỤM|Tân Hiệp|Hùng Vương/i);

        // Nút 2: Bộ phận (có icon restore và text All hoặc tên bộ phận)
        const btnDept = buttons.nth(1);
        await expect(btnDept).toBeVisible();
        await expect(btnDept).toContainText(/All|BP/i);

        // 3. Kiểm tra toạ độ: #mobile-topbar-filters nằm BÊN TRÁI của các tab chức năng (#mobile-topbar-actions)
        const actionsSlot = page.locator('#mobile-topbar-actions');
        await expect(actionsSlot).toBeVisible();

        const filterBox = (await filterSlot.boundingBox())!;
        const navbarActions = page.locator('[data-navbar-actions]');
        const navbarActionsBox = (await navbarActions.boundingBox())!;

        console.log('Tab Nhân viên - Chiều cao cụm bộ lọc:', filterBox.height);
        console.log('Tab Nhân viên - Chiều cao cụm actions:', navbarActionsBox.height);

        expect(Math.abs(filterBox.height - 34)).toBeLessThanOrEqual(1);
        expect(Math.abs(navbarActionsBox.height - 34)).toBeLessThanOrEqual(1);
        expect(Math.abs(filterBox.height - navbarActionsBox.height)).toBeLessThanOrEqual(1);

        expect(filterBox.x + filterBox.width, 'Bộ lọc phải nằm bên trái các tab chức năng').toBeLessThanOrEqual(navbarActionsBox.x + 8);

        // 4. Kiểm tra hàng lọc cũ bên dưới topbar phải bị ẩn trên mobile
        const legacyBar = page.locator('.hidden.lg\\:flex:has(h2:has-text("Nhân Viên"))');
        expect(await legacyBar.isVisible()).toBe(false);

        // 5. Chụp ảnh màn hình để lưu làm bằng chứng kiểm nghiệm trực quan
        await page.screenshot({
            path: '/Users/ltson/.gemini/antigravity-ide/brain/e5b11325-2dae-473e-9c88-ee6990fa20b2/bi-mobile-filters-topbar.png',
            fullPage: false
        });
    });
});
