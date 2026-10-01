import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openReportBi } from './helpers/seed';

/**
 * Report BI › Cập nhật › "Tự động Luỹ kế": kết quả userscript 7.7 (Direct API) phải vào ĐÚNG các ô LUỸ KẾ —
 * Doanh thu hợp nhất, Thi đua cụm, Ngành hàng & Nhân viên Luỹ kế của TỪNG siêu thị — và KHÔNG ghi bảng Thi đua cụm
 * vào ô Thi đua nhân viên của siêu thị (khác định dạng).
 */
const USERSCRIPT_FILE = resolve(fileURLToPath(new URL('.', import.meta.url)), '../../public/scripts/mwg-auto-thu-thap-diem-thuong.user.js');
const BAN_MOI_NHAT = readFileSync(USERSCRIPT_FILE, 'utf-8').match(/^\/\/\s*@version\s+([\d.]+)/m)![1];

test('Tự động Luỹ kế xong → lưu đúng ô Luỹ kế theo từng siêu thị, modal đóng, có toast', async ({ page }) => {
    await page.context().route('https://baocao.dienmayxanh.com/**', r => r.fulfill({ status: 200, contentType: 'text/html', body: '<html></html>' }));
    await page.addInitScript((v) => {
        window.addEventListener('ycx-bonus-bridge:ping', (e) => {
            const nonce = (e as CustomEvent).detail?.nonce;
            window.dispatchEvent(new CustomEvent('ycx-bonus-bridge:pong', { detail: { source: 'ycx-bonus-bridge', type: 'pong', nonce, version: v } }));
        });
    }, BAN_MOI_NHAT);
    await openReportBi(page);
    await page.getByRole('button', { name: /Cập nhật/i }).first().click();
    // Bấm "Tự động Luỹ kế" → hộp chọn tháng; chọn tháng 08/2026
    await page.getByRole('button', { name: /Tự động Luỹ kế/i }).click();
    const chon = page.getByRole('dialog', { name: /chọn tháng/i });
    await expect(chon).toBeVisible();
    await chon.getByRole('radio', { name: 'Chọn tháng' }).click();
    await chon.getByLabel('Tháng luỹ kế', { exact: true }).fill('2026-08');
    const tabMwg = page.context().waitForEvent('page');
    await chon.getByTestId('bat-dau-luy-ke').click();
    const urlMwg = (await tabMwg).url();
    expect(urlMwg).toContain('ycx_mode=luyke');
    expect(urlMwg).toContain('ycx_month=202608');

    const modal = page.getByRole('dialog', { name: /Tự động Cập nhật Luỹ Kế · tháng 08\/2026/i });
    await expect(modal).toBeVisible();
    await expect(modal).toContainText('5 Báo cáo');

    const NG = 'NGÀNH HÀNG / NHÓM HÀNG\tSỐ LƯỢNG\tDOANH THU QĐ\n11 - Điện thoại\t3\t30\nTổng\t3\t30';
    const NV = 'NHÂN VIÊN\tSỐ LƯỢNG\tDOANH THU QĐ\n276650 - Quách Trần Phương Thảo\t5\t50\nTổng\t5\t50';
    const TD = 'Thi đua nhân viên theo chương trình\nBảo hiểm tổng\nDOANH THU\n95970 - Chế Thị Út\t154.94';
    const TC = 'Nhân viên\tDT Trả góp\tDT Siêu thị\tTỷ trọng\tHomeCredit(HC)\t%\n95970 - Chế Thị Út\t693.36\t1403.74\t49.39\t417.61\t60.23';
    await page.evaluate(({ NG, NV, TC, TD }) => {
        const d = { source: 'ycx-bi-automation', type: 'done', jobId: 'job-lk', mode: 'luyke', results: {
            summary: 'Siêu thị\tSỐ LƯỢNG\tDOANH THU QĐ\n1678 - ĐMM_AGI_TTO - Tri Tôn\t39\t111\nTổng (1 dòng)\t39\t111',
            competition: 'Máy Lạnh\nDOANH THU\tTARGET\t% HT THÁNG\nĐMM_AGI_TTO - Tri Tôn\t1\t2\t50',
            industryByStore: { '1678 - ĐMM_AGI_TTO - Tri Tôn': NG, '1678': NG },
            employeeByStore: { '1678 - ĐMM_AGI_TTO - Tri Tôn': NV, '1678': NV },
            installmentByStore: { '1678 - ĐMM_AGI_TTO - Tri Tôn': TC, '1678': TC },
            competitionByStore: { '1678 - ĐMM_AGI_TTO - Tri Tôn': TD, '1678': TD },
        } };
        window.dispatchEvent(new CustomEvent('ycx-bi-automation:done', { detail: d }));
    }, { NG, NV, TC, TD });
    await expect(modal).toHaveCount(0, { timeout: 3000 });
    await expect(page.getByText(/Tự động cập nhật thành công .* Luỹ kế/)).toBeVisible();

    const doc = (key: string) => page.evaluate(async (k) => {
        const db = await new Promise<IDBDatabase>((res, rej) => { const r = indexedDB.open('BI_HUB_DATABASE_V2'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
        return new Promise<unknown>((res) => { const g = db.transaction(['settings']).objectStore('settings').get(k); g.onsuccess = () => res(g.result); g.onerror = () => res(undefined); });
    }, key);
    await expect.poll(() => doc('bi_config-Tri Tôn-industry-luyke')).toBe(NG);
    expect(await doc('bi_config-Tri Tôn-danhsach')).toBe(NV);
    expect(await doc('bi_config-Tri Tôn-tragop')).toBe(TC);
    expect(String(await doc('bi_summary-luy-ke'))).toContain('Tri Tôn');
    expect(String(await doc('bi_competition-luy-ke'))).toContain('Máy Lạnh');
    // Ô Thi đua của siêu thị = Thi đua theo NHÂN VIÊN (competitionByStore), KHÔNG phải bảng Thi đua cụm
    expect(await doc('bi_config-Tri Tôn-thidua')).toBe(TD);
    // Khoá phụ theo mã kho không sinh ô rác "config-1678-thidua"
    expect(await doc('bi_config-1678-thidua')).toBeUndefined();
    // Không đụng ô Realtime
    expect(await doc('bi_config-Tri Tôn-industry-realtime')).toBeUndefined();
});

test('"Tháng hiện tại": ngày 1 lấy tháng trước, ngày khác lấy tháng này — truyền đúng ycx_month sang MWG', async ({ page }) => {
    await page.context().route('https://baocao.dienmayxanh.com/**', r => r.fulfill({ status: 200, contentType: 'text/html', body: '<html></html>' }));
    await page.addInitScript((v) => {
        window.addEventListener('ycx-bonus-bridge:ping', (e) => {
            const nonce = (e as CustomEvent).detail?.nonce;
            window.dispatchEvent(new CustomEvent('ycx-bonus-bridge:pong', { detail: { source: 'ycx-bonus-bridge', type: 'pong', nonce, version: v } }));
        });
    }, BAN_MOI_NHAT);
    await openReportBi(page);
    await page.getByRole('button', { name: /Cập nhật/i }).first().click();
    await page.getByRole('button', { name: /Tự động Luỹ kế/i }).click();
    const mongDoi = await page.evaluate(() => {
        const n = new Date(); const d = new Date(n.getFullYear(), n.getMonth(), 1);
        if (n.getDate() === 1) d.setMonth(d.getMonth() - 1);
        return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`;
    });
    const tabMwg = page.context().waitForEvent('page');
    await page.getByTestId('bat-dau-luy-ke').click();
    expect((await tabMwg).url()).toContain(`ycx_month=${mongDoi}`);
});
