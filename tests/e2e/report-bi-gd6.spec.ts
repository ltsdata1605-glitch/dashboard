import { expect, test, type Page } from '@playwright/test';
import { pasteIntoTile, TILE, SUMMARY_REALTIME, SUMMARY_LUYKE, COMPETITION_LUYKE } from './helpers/seed';

/**
 * GĐ6 — Report BI trên iPhone (KE_HOACH_GIAO_DIEN_APPLE.md mục 1). Khoá các lỗi sếp thấy trong video:
 *  #12 thanh trên 4 icon không chữ (biểu đồ tròn / người / đám mây / "T")  → segmented CÓ CHỮ + phông chữ vào "⋯"
 *  #15 nút gạt "ⓘ Realtime" chỉ hiện chế độ đang chọn                       → segmented Realtime | Luỹ kế
 *  #24 khẩu hiệu IN HOA 2 dòng                                               → dòng phụ viết như câu 12px
 *  #29 thẻ thi đua cá nhân nền xanh đặc + huy hiệu 4 màu                     → nền trắng, viên xám chấm màu
 *  #25 màn chào Report BI (bản dùng chung FeatureLandingLayout) còn tiếng Anh + câu sai "không lưu trữ dữ liệu"
 *  + sàn chữ 11px trên MỌI màn Report BI có dữ liệu (65 chỗ 7.5–10.5px trước khi sửa).
 */

const DS = { updatedAt: Date.now(), totalCount: 3, employees: [
    { id: '101', name: 'Nguyễn Văn A', originalName: '101 - Nguyễn Văn A', department: 'BP ALL IN ONE - DMX' },
    { id: '102', name: 'Trần Thị B', originalName: '102 - Trần Thị B', department: 'BP ALL IN ONE - DMX' },
    { id: '103', name: 'Lê Văn C', originalName: '103 - Lê Văn C', department: 'BP ALL IN ONE - DMX' } ] };
const LUYKE_NV = ['BP ALL IN ONE - DMX\t\t', '101 - Nguyễn Văn A\t120,000,000\t100', '102 - Trần Thị B\t98,000,000\t80', '103 - Lê Văn C\t75,000,000\t60'].join('\n');
const THI_DUA_NV = ['Thi đua nhân viên theo chương trình', 'Bảo hiểm tổng', 'DOANH THU', '101 - Nguyễn Văn A\t154.94', '102 - Trần Thị B\t98.5',
    '103 - Lê Văn C\t20', 'Sim tổng', 'SỐ LƯỢNG', '101 - Nguyễn Văn A\t12', '102 - Trần Thị B\t7', '103 - Lê Văn C\t3'].join('\n');

async function moBI(page: Page, coDuLieu: boolean) {
    await page.goto('/?tab=employees');
    await page.getByRole('button', { name: /Kích hoạt Chế độ Dùng Thử/i }).click();
    await page.waitForTimeout(2500);
    if (!coDuLieu) return;
    await page.evaluate(async ({ ds, nv, td }) => {
        const db = await new Promise<IDBDatabase>((res, rej) => { const r = indexedDB.open('BI_HUB_DATABASE_V2'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
        await new Promise<void>((res, rej) => {
            const tx = db.transaction(['settings'], 'readwrite'); const s = tx.objectStore('settings');
            s.put(['Hùng Vương'], 'bi_updater-custom-supermarkets'); s.put(ds, 'analysis-employees-list'); s.put(ds, 'bi_analysis-employees-list');
            s.put(nv, 'bi_config-Hùng Vương-danhsach'); s.put(td, 'bi_config-Hùng Vương-thidua');
            tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error);
        });
        db.close();
    }, { ds: DS, nv: LUYKE_NV, td: THI_DUA_NV });
    await page.reload();
    await page.waitForTimeout(3000);
    await page.locator('[data-segmented]').first().getByRole('button', { name: 'Cập nhật', exact: true }).click();
    await page.waitForTimeout(600);
    await pasteIntoTile(page, TILE.DOANH_THU_REALTIME, SUMMARY_REALTIME);
    await pasteIntoTile(page, TILE.DOANH_THU_LUYKE, SUMMARY_LUYKE);
    await pasteIntoTile(page, TILE.THI_DUA_LUYKE, COMPETITION_LUYKE);
}

/** Chữ < 11px đang HIỆN trên màn (phần tử lá có chữ). */
const chuDuoi11 = (page: Page) => page.evaluate(() => Array.from(document.querySelectorAll('body *'))
    .filter(el => el.children.length === 0 && !!el.textContent?.trim())
    .filter(el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden'; })
    .filter(el => parseFloat(getComputedStyle(el).fontSize) < 11)
    .map(el => `${parseFloat(getComputedStyle(el).fontSize)}px "${(el.textContent || '').trim().slice(0, 24)}"`));

test.describe('iPhone SE 375×667 (cảm ứng)', () => {
    test.use({ viewport: { width: 375, height: 667 }, isMobile: true, hasTouch: true });

    test('#12 + #25 chưa có dữ liệu: segmented 3 phân hệ có chữ, khe nút thanh trên trống, màn chào tiếng Việt', async ({ page }) => {
        await moBI(page, false);
        const seg = page.locator('[data-segmented]').first();
        for (const ten of ['Siêu thị', 'Nhân viên', 'Cập nhật']) {
            const hop = (await seg.getByRole('button', { name: ten, exact: true }).boundingBox())!;
            // Nút dạng capsule nhỏ gọn trên topbar (cỡ 32px chuẩn mẫu Zalo/iOS)
            expect(hop.height, ten).toBeGreaterThanOrEqual(30);
        }
        // Segmented vẫn bo tròn trong Report BI (module ép border-radius 0 cho mọi "rounded-*")
        expect(parseFloat(await seg.evaluate(e => getComputedStyle(e).borderTopLeftRadius))).toBeGreaterThan(0);
        // Cụm chức năng (Siêu thị, Nhân viên, Cập nhật) được đưa lên thanh topbar
        expect(await page.locator('#mobile-topbar-actions').evaluate(e => e.children.length)).toBeGreaterThanOrEqual(1);
        await expect(page.getByText('Xử lý trên máy')).toBeVisible();
        for (const en of ['Local Processing', 'Instant Speed', 'Smart UI']) await expect(page.getByText(en)).toHaveCount(0);
        await expect(page.getByText(/không lưu trữ dữ liệu/)).toHaveCount(0);
        await page.screenshot({ path: test.info().outputPath('bi-chua-du-lieu.png') });
    });

    test('#12 phông chữ: "⋯" → Phông chữ → sheet danh sách, chọn Inter là áp ngay', async ({ page }) => {
        await moBI(page, false);
        await page.locator('[data-app-chrome="topbar"]').getByRole('button', { name: 'Thêm thao tác' }).click();
        await page.getByRole('menuitem', { name: 'Phông chữ' }).click();
        const sheet = page.getByRole('dialog', { name: /Phông chữ/ });
        await expect(sheet).toBeVisible();
        await sheet.getByRole('button', { name: 'Inter', exact: true }).click();
        await expect(sheet).toBeHidden();
        expect(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--font-sans'))).toContain('Inter');
    });

    test('#15 + #24 + sàn 11px: Realtime | Luỹ kế là segmented, khẩu hiệu viết như câu 12px, không chữ < 11px ở Siêu thị', async ({ page }) => {
        await moBI(page, true);
        await page.locator('[data-segmented]').first().getByRole('button', { name: 'Siêu thị', exact: true }).click();
        await page.waitForTimeout(1200);
        const luyKe = page.getByRole('button', { name: 'Luỹ kế', exact: true }).first();
        await luyKe.click();
        await expect(luyKe).toHaveAttribute('aria-pressed', 'true');
        await expect(page).toHaveURL(/mode=cumulative/);
        await page.getByRole('button', { name: 'Realtime', exact: true }).first().click();
        await expect(page).toHaveURL(/mode=realtime/);
        const quote = page.getByText(/^Doanh thu không tự đến/).filter({ visible: true }).first();
        await expect(quote).toHaveCSS('text-transform', 'none');
        await expect(quote).toHaveCSS('font-size', '12px');
        expect(await chuDuoi11(page)).toEqual([]);
        await page.screenshot({ path: test.info().outputPath('bi-sieu-thi.png') });
    });

    test('#29 + sàn 11px: thẻ thi đua cá nhân nền trắng, tên không ép IN HOA; các màn Nhân viên không chữ < 11px', async ({ page }) => {
        await moBI(page, true);
        await page.locator('[data-segmented]').first().getByRole('button', { name: 'Nhân viên', exact: true }).click();
        await page.waitForTimeout(1500);
        expect(await chuDuoi11(page), 'Doanh thu').toEqual([]);
        await page.getByRole('button', { name: 'Thi đua', exact: true }).first().click();
        await page.waitForTimeout(1200);
        for (const v of ['Nhóm', 'So sánh', 'Cá nhân']) {
            await page.getByRole('button', { name: v, exact: true }).first().click();
            await page.waitForTimeout(900);
            expect(await chuDuoi11(page), `Thi đua › ${v}`).toEqual([]);
        }
        // Đang ở "Cá nhân": đầu thẻ nền trắng, tên viết như dữ liệu
        const ten = page.getByRole('button', { name: /Lê Văn C|Nguyễn Văn A|Trần Thị B/ }).filter({ visible: true }).first();
        await expect(ten).toHaveCSS('text-transform', 'none');
        const nen = await ten.evaluate((el: HTMLElement) => { let n: HTMLElement | null = el; while (n && getComputedStyle(n).backgroundColor === 'rgba(0, 0, 0, 0)') n = n.parentElement; return n ? getComputedStyle(n).backgroundColor : ''; });
        expect(nen).toMatch(/^rgb\(255, 255, 255\)|oklch\(1 0 0\)$/);
        await page.screenshot({ path: test.info().outputPath('bi-ca-nhan.png') });
        await page.getByRole('button', { name: 'Thưởng', exact: true }).first().click();
        await page.waitForTimeout(900);
        expect(await chuDuoi11(page), 'Thưởng').toEqual([]);
    });

    test('vùng chạm ycx-hit: nút lồng bên trong (vd "×" trong viên "Cùng kỳ") vẫn bấm trúng chính nó', async ({ page }) => {
        await page.goto('/');
        const kq = await page.evaluate(() => {
            const cha = document.createElement('button');
            cha.className = 'ycx-hit';
            cha.style.cssText = 'position:fixed;z-index:2147483000;top:200px;left:20px;height:32px;padding:0 12px;display:inline-flex;align-items:center;gap:6px;background:#fff';
            cha.textContent = 'Cùng kỳ';
            const con = document.createElement('span');
            con.setAttribute('role', 'button');
            con.textContent = '×';
            con.style.cssText = 'display:inline-flex;padding:2px 4px';
            cha.appendChild(con);
            document.body.appendChild(cha);
            const r = con.getBoundingClientRect();
            const trung = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
            const rc = cha.getBoundingClientRect();
            const a = getComputedStyle(cha, '::after');
            return { trungCon: trung === con, vungCao: rc.height - (parseFloat(a.top) || 0) - (parseFloat(a.bottom) || 0) };
        });
        expect(kq.trungCon, 'chạm "×" lại trúng lớp vô hình của nút cha').toBe(true);
        expect(kq.vungCao).toBeGreaterThanOrEqual(43.5);
    });
});
