import { expect, test } from '@playwright/test';

/**
 * Chủ dự án chốt 2026-09-23: danh sách nhân viên nạp vào Phân Tích / Report BI CHỈ lấy bộ phận
 * "BP All In One", các bộ phận khác bỏ qua. (Phân Ca vẫn nạp đủ — nó có đường nhập Excel riêng.)
 * File mẫu: tests/fixtures/danh-sach-nhan-vien-nhieu-bo-phan.xlsx — 2 All In One + 3 bộ phận khác.
 */
const SHIFT_FILE = 'tests/fixtures/danh-sach-nhan-vien-nhieu-bo-phan.xlsx';

const readIdb = (page: import('@playwright/test').Page, key: string) =>
    page.evaluate(async (k) => {
        const db = await new Promise<IDBDatabase>((res, rej) => {
            const r = indexedDB.open('BI_HUB_DATABASE_V2');
            r.onsuccess = () => res(r.result);
            r.onerror = () => rej(r.error);
        });
        const v = await new Promise<any>((res) => {
            const tx = db.transaction(['settings'], 'readonly');
            const q = tx.objectStore('settings').get(k);
            q.onsuccess = () => res(q.result);
            q.onerror = () => res(null);
        });
        db.close();
        return v;
    }, key);

test('nạp danh sách nhân viên: chỉ giữ BP All In One, báo rõ số bị bỏ qua', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /Kích hoạt Chế độ Dùng Thử/i }).click();
    await page.waitForTimeout(2000);

    page.on('console', m => { const t = m.text(); if (/phân ca|All In One|Lỗi/i.test(t)) console.log('[APP]', t.slice(0, 200)); });

    // Ô nhập file danh sách nhân viên (ẩn, nhận nhiều file)
    const inputs = page.locator('input[type="file"]');
    const n = await inputs.count();
    for (let i = 0; i < n; i++) {
        console.log('INPUT', i, 'accept=', await inputs.nth(i).getAttribute('accept'), 'multiple=', await inputs.nth(i).getAttribute('multiple'));
    }
    // Input thứ 2 trong DashboardView là ô nạp danh sách nhân viên (shiftFileInputRef)
    const shiftInput = page.locator('input[type="file"][multiple]').nth(1);
    // Gom mọi nội dung màn hình trong lúc xử lý để bắt được thông báo (nó tự ẩn sau ít giây)
    const seen: string[] = [];
    const stop = { v: false };
    const watcher = (async () => {
        for (let i = 0; i < 60 && !stop.v; i++) {
            seen.push(await page.locator('body').innerText().catch(() => ''));
            await page.waitForTimeout(150);
        }
    })();
    await shiftInput.setInputFiles(SHIFT_FILE);
    await page.waitForTimeout(4000);
    stop.v = true;
    await watcher;

    const deptMap = await readIdb(page, 'departmentMap');
    console.log('DANH SÁCH SAU KHI NẠP:', JSON.stringify(deptMap));
    expect(Object.keys(deptMap || {}).sort()).toEqual(['101', '102']);

    // Báo rõ cho người dùng: giữ bao nhiêu, bỏ qua bao nhiêu và của bộ phận nào
    const status = seen.find(s => s.includes('nhân viên BP All In One')) || '';
    console.log('THÔNG BÁO:', status.split('\n').find(l => l.includes('BP All In One')));
    expect(status).toContain('2 nhân viên BP All In One');
    expect(status).toContain('bỏ qua 3');
    expect(status).toMatch(/BP Bảo Vệ|BP Kho/);

    // Report BI cũng chỉ nhận 2 người đó
    await page.waitForTimeout(2000);
    const biList = await readIdb(page, 'analysis-employees-list');
    console.log('DANH SÁCH ĐẨY SANG REPORT BI:', JSON.stringify(biList && biList.employees?.map((e: any) => e.originalName)));
    expect(biList?.employees?.map((e: any) => e.id).sort()).toEqual(['101', '102']);
    // Tên không bị lặp mã ("101 - 101 - Nguyễn Văn A") khi file tách riêng cột Mã NV và Tên
    expect(biList?.employees?.map((e: any) => e.originalName).sort())
        .toEqual(['101 - Nguyễn Văn A', '102 - Trần Thị B']);
});
