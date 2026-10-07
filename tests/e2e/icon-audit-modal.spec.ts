import { test, expect, type Page } from '@playwright/test';
import { khamPhaModal, doLopMoBang, type KetQuaModal } from './helpers/modalExplorer';
import { createProductConfigXlsx, createSalesXlsx, TEST_EMPLOYEE } from './helpers/salesFixture';

/**
 * CHUẨN HOÁ ICON — audit icon BÊN TRONG MODAL (2026-10-07).
 *
 * Các bài audit màn chính (icon-audit-man-goc / icon-audit-bi) chỉ đo thứ đang hiện trên màn; spec này tự KHÁM PHÁ
 * modal (xem `helpers/modalExplorer.ts`): bấm từng nút an toàn, lớp nổi nào hiện ra thì đo icon trong đó bằng cùng 4
 * tiêu chí (legacy / lệch / nút có chữ nhỏ hơn md / vùng chạm < 44px trên điện thoại), rồi khám phá tiếp modal con.
 *
 * 3 nhóm, mỗi nhóm × 2 cỡ màn:
 *   - `dung-thu`: 13 tab ở Chế độ Dùng Thử, không dữ liệu;
 *   - `phan-tich`: Phân Tích có dữ liệu bán hàng giả (nhiều modal chỉ hiện khi có dữ liệu) + modal hiệu quả nhân viên;
 *   - `report-bi`: Report BI có dữ liệu thi đua + danh sách nhân viên giả, từng màn con.
 */
const TABS = ['analysis', 'check-thuong', 'reports', 'settings', 'tools-tax', 'tools-coupon', 'tools-price-compare',
    'help', 'tools-phanca', 'tools-print-sticker', 'tools-line-bot', 'tools-khai-thac', 'employees'];

const MAN = [['điện thoại 390', 390], ['laptop 1366', 1366]] as const;

function chanTacDungPhu(page: Page) {
    page.context().on('page', (p) => { void p.close(); });
    page.on('download', (d) => { void d.cancel(); });
    page.on('dialog', (d) => { void d.dismiss(); });
}

function kiemKetQua(ten: string, ketQua: KetQuaModal, toiThieu: number) {
    console.log(`AUDIT MODAL ${ten} — ${Object.keys(ketQua).length} lớp nổi\n` + JSON.stringify(ketQua, null, 1));
    expect(Object.keys(ketQua).length, 'số lớp nổi mở được quá ít — spec hỏng hoặc giao diện đổi').toBeGreaterThanOrEqual(toiThieu);
    for (const [k, r] of Object.entries(ketQua)) {
        expect.soft(r.legacy, `${k}: icon chưa qua AppIcon`).toEqual([]);
        expect.soft(r.lech, `${k}: icon lệch dọc trong nút`).toEqual([]);
        expect.soft(r.nutChuNhoHon, `${k}: icon trong nút có chữ nhỏ hơn md`).toEqual([]);
        expect.soft(r.vungCham, `${k}: nút chỉ có icon dưới 44px trên điện thoại`).toEqual([]);
    }
}

for (const [label, width] of MAN) {
    const mobile = width < 1024;

    test(`audit icon modal — dùng thử, ${label}`, async ({ page }) => {
        test.setTimeout(2_400_000);
        chanTacDungPhu(page);
        await page.setViewportSize({ width, height: 900 });
        await page.goto('/?tab=analysis');
        await page.getByRole('button', { name: /Kích hoạt Chế độ Dùng Thử/i }).click();
        await page.waitForTimeout(2500);
        const ketQua: KetQuaModal = {};
        for (const tab of TABS) {
            await khamPhaModal(page, {
                ten: tab, mobile, ketQua,
                veMan: async () => { await page.goto(`/?tab=${tab}`); await page.waitForTimeout(1800); },
            });
        }
        kiemKetQua(`dùng thử ${label}`, ketQua, 6);
    });

    test(`audit icon modal — Phân Tích có dữ liệu, ${label}`, async ({ page }) => {
        test.setTimeout(2_400_000);
        chanTacDungPhu(page);
        await page.setViewportSize({ width, height: 900 });
        const cauHinh = createProductConfigXlsx();
        await page.route('**://docs.google.com/**', (r) => r.fulfill({
            status: 200, contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', body: cauHinh,
        }));
        await page.goto('/');
        await page.getByRole('button', { name: /Kích hoạt Chế độ Dùng Thử/i }).click();
        await page.locator('input[type="file"]').first().setInputFiles(createSalesXlsx());
        await page.locator('[data-modal-overlay]').getByText('Tệp Realtime (Xem nhanh)').click();
        await expect(page.getByText(/Doanh Thu/i).first()).toBeVisible({ timeout: 45_000 });

        const veMan = async () => {
            await page.goto('/?tab=analysis');
            await expect(page.getByText(/Doanh Thu/i).first()).toBeVisible({ timeout: 45_000 });
            await page.waitForTimeout(1500);
        };
        const ketQua: KetQuaModal = {};
        await khamPhaModal(page, { ten: 'phan-tich', mobile, ketQua, veMan, toiDa: 60 });
        await doLopMoBang(page, {
            ten: 'phan-tich › dòng nhân viên', mobile, ketQua, veMan,
            mo: async () => {
                const dong = page.locator('#employee-analysis-section').getByText(new RegExp(TEST_EMPLOYEE.split(' - ')[0])).first();
                await expect(dong).toBeVisible({ timeout: 20_000 });
                await dong.click();
            },
        });
        for (const tab of ['reports', 'check-thuong']) {
            await khamPhaModal(page, {
                ten: `${tab} (có dữ liệu)`, mobile, ketQua,
                veMan: async () => { await page.goto(`/?tab=${tab}`); await page.waitForTimeout(2500); },
            });
        }
        kiemKetQua(`Phân Tích ${label}`, ketQua, 3);
    });

    test(`audit icon modal — Report BI có dữ liệu, ${label}`, async ({ page }) => {
        test.setTimeout(2_400_000);
        chanTacDungPhu(page);
        await page.setViewportSize({ width, height: 900 });
        await page.goto('/?tab=employees');
        await page.getByRole('button', { name: /Kích hoạt Chế độ Dùng Thử/i }).click();
        await page.waitForTimeout(2500);
        await page.evaluate(async () => {
            const nv = {
                updatedAt: Date.now(), totalCount: 3,
                employees: [
                    { id: '101', name: 'Nguyễn Văn A', originalName: '101 - Nguyễn Văn A', department: 'BP ALL IN ONE - DMX' },
                    { id: '102', name: 'Trần Thị B', originalName: '102 - Trần Thị B', department: 'BP ALL IN ONE - DMX' },
                    { id: '103', name: 'Lê Văn C', originalName: '103 - Lê Văn C', department: 'BP ALL IN ONE - DMX' },
                ],
            };
            const luyke = ['BP ALL IN ONE - DMX\t\t', '101 - Nguyễn Văn A\t120,000,000\t100', '102 - Trần Thị B\t98,000,000\t80', '103 - Lê Văn C\t75,000,000\t60'].join('\n');
            const db = await new Promise<IDBDatabase>((res, rej) => {
                const r = indexedDB.open('BI_HUB_DATABASE_V2');
                r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
            });
            await new Promise<void>((res, rej) => {
                const tx = db.transaction(['settings'], 'readwrite');
                const s = tx.objectStore('settings');
                s.put(['Tân Hiệp'], 'bi_updater-custom-supermarkets');
                s.put(nv, 'analysis-employees-list');
                s.put(nv, 'bi_analysis-employees-list');
                s.put(luyke, 'bi_config-Tân Hiệp-danhsach');
                tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error);
            });
            db.close();
        });

        const vaoBI = async (...buoc: RegExp[]) => {
            await page.goto('/?tab=employees');
            await page.waitForTimeout(3000);
            for (const b of buoc) {
                await page.getByRole('button', { name: b }).first().click();
                await page.waitForTimeout(1500);
            }
        };
        const ketQua: KetQuaModal = {};
        const manCon: [string, RegExp[]][] = [
            ['bi › siêu thị', []],
            ['bi › nhân viên › doanh thu', [/^Nhân viên$/i, /^Doanh thu$/]],
            ['bi › nhân viên › trả chậm', [/^Nhân viên$/i, /^Trả chậm$/]],
            ['bi › nhân viên › thi đua', [/^Nhân viên$/i, /^Thi đua$/]],
            ['bi › nhân viên › thưởng', [/^Nhân viên$/i, /^Thưởng$/]],
            ['bi › cập nhật', [/^Cập nhật$/i]],
        ];
        for (const [ten, buoc] of manCon) {
            await khamPhaModal(page, { ten, mobile, ketQua, veMan: () => vaoBI(...buoc) });
        }
        kiemKetQua(`Report BI ${label}`, ketQua, 3);
    });
}
