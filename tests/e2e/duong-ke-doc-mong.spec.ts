import { expect, test } from '@playwright/test';

const EMPLOYEES_TSV = [
    'BP ALL IN ONE - DMX\t\t',
    '95970 - T.Út\t1,444,000,000\t49',
    '17952 - M.Hương\t1,174,000,000\t46',
    '28679 - H.Đăng\t945,000,000\t48'
].join('\n');

const BONUS_OBJ = {
    '95970 - T.Út': { erp: 8491000, tNong: 6743000, pNong: 44, tong: 15234000, dKien: 18000000, updatedAt: new Date().toISOString() },
    '17952 - M.Hương': { erp: 7469000, tNong: 6836000, pNong: 47, tong: 14305000, dKien: 17000000, updatedAt: new Date().toISOString() },
    '28679 - H.Đăng': { erp: 7708000, tNong: 6510000, pNong: 46, tong: 14218000, dKien: 16500000, updatedAt: new Date().toISOString() }
};

test.describe('Verify Thin Vertical Borders on Bonus Table', () => {
    test.use({ viewport: { width: 500, height: 900 }, isMobile: true, hasTouch: true });

    test('Đường kẻ dọc giữa Nhân viên - Doanh thu - Thưởng mỏng 1px', async ({ page }) => {
        await page.addInitScript(() => {
            sessionStorage.setItem('ycx_demo_mode', 'true');
            localStorage.setItem('ycx_demo_mode', 'true');
        });

        await page.goto('/?tab=employees&view=employee'); // view hợp lệ: employee (bonus không phải view — rơi về Tổng quan trống)
        await page.evaluate(async ({ bonus, tsv }) => {
            const db = await new Promise<IDBDatabase>((res, rej) => {
                const r = indexedDB.open('BI_HUB_DATABASE_V2');
                r.onsuccess = () => res(r.result);
                r.onerror = () => rej(r.error);
            });
            await new Promise<void>((res, rej) => {
                const tx = db.transaction(['settings'], 'readwrite');
                const s = tx.objectStore('settings');
                const supermarket = 'Hùng Vương';
                s.put([supermarket], 'bi_updater-custom-supermarkets');
                s.put([supermarket], 'analysis-selected-supermarkets');
                s.put(tsv, `bi_config-${supermarket}-danhsach`);
                s.put(tsv, `config-${supermarket}-danhsach`);
                s.put(tsv, `bi_config-${supermarket}-danhsach-qd`);
                s.put(tsv, `config-${supermarket}-danhsach-qd`);
                s.put(bonus, `bi_bonus-data-${supermarket}`);
                s.put(bonus, `bonus-data-${supermarket}`);
                s.put('bonus', 'bi_nhanvien-active-tab');
                // Report BI chỉ hiện nhân viên khi đã có danh sách từ Phân tích (57656d79) — thiếu thì ra màn "Chưa có danh sách nhân viên".
                const ds = { updatedAt: Date.now(), totalCount: 3, employees: ['95970 - T.Út', '17952 - M.Hương', '28679 - H.Đăng'].map(t => {
                    const [id, ten] = t.split(' - ');
                    return { id, name: ten, originalName: t, department: 'BP ALL IN ONE - DMX' };
                }) };
                s.put(ds, 'analysis-employees-list');
                s.put(ds, 'bi_analysis-employees-list');
                tx.oncomplete = () => res();
                tx.onerror = () => rej(tx.error);
            });
            db.close();
        }, { bonus: BONUS_OBJ, tsv: EMPLOYEES_TSV });

        await page.reload();
        await page.waitForTimeout(2000);

        // Click tab Thưởng nếu cần
        // Chỉ tìm trong <main>: bộ chọn cũ khớp cả nút "Check thưởng" ở thanh tab dưới → bấm nhầm sang màn Check thưởng (đỏ cả trên
        // chính commit tạo bài, f33b3462).
        const bonusTabBtn = page.locator('main').locator('button[title*="Thưởng"], button[aria-label*="Thưởng"], button:has-text("Thưởng")').first();
        if (await bonusTabBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
            await bonusTabBtn.click();
            await page.waitForTimeout(1000);
        }

        // Bảng compact-export-table
        const table = page.locator('table.compact-export-table').first();
        await expect(table).toBeVisible({ timeout: 5000 });

        // 1. Kiểm tra header DTQĐ có border-left-width là 1px (không phải 2px)
        const thDtqd = table.locator('th:has-text("DTQĐ")').first();
        await expect(thDtqd).toBeVisible();
        const thDtqdBorder = await thDtqd.evaluate((el) => window.getComputedStyle(el).borderLeftWidth);
        console.log('thDtqd borderLeftWidth:', thDtqdBorder);
        expect(thDtqdBorder, 'Đường kẻ dọc DTQĐ phải là 1px mỏng').toBe('1px');

        // 2. Kiểm tra header ERP có border-left-width là 1px
        const thErp = table.locator('th:has-text("ERP")').first();
        await expect(thErp).toBeVisible();
        const thErpBorder = await thErp.evaluate((el) => window.getComputedStyle(el).borderLeftWidth);
        console.log('thErp borderLeftWidth:', thErpBorder);
        expect(thErpBorder, 'Đường kẻ dọc ERP phải là 1px mỏng').toBe('1px');

        // 3. Kiểm tra cell td của dòng dữ liệu nhân viên
        const tdDtqd = table.locator('tbody tr td:nth-child(2)').first();
        const tdBorder = await tdDtqd.evaluate((el) => window.getComputedStyle(el).borderLeftWidth);
        console.log('tdDtqd borderLeftWidth:', tdBorder);
        expect(tdBorder, 'Cell DTQĐ dòng nhân viên phải có border-left 1px').toBe('1px');

        // 4. Chụp ảnh lại màn hình bảng để xác thực trực quan
        const screenshotPath = '/Users/ltson/.gemini/antigravity-ide/brain/e5b11325-2dae-473e-9c88-ee6990fa20b2/duong-ke-doc-mong-lai.png';
        await table.screenshot({ path: screenshotPath });
        console.log('✅ Screenshot saved to:', screenshotPath);
    });
});
