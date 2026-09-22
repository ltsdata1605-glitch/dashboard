import { expect, test } from '@playwright/test';

/**
 * Nhập danh sách nhân viên ở Phân Tích (modal "Quản lý danh sách nhân viên", KHÔNG cần file YCX)
 * thì Report BI phải nhận được. Gieo 'departmentMap' vào IndexedDB rồi tải lại app để đi qua
 * đúng nhánh đồng bộ lần đầu trong hooks/useDashboardLogic.ts.
 */
const DEPT_MAP = {
    '107617': 'BP ALL IN ONE - ĐMX;;Phạm Anh Nhân',
    '95970': 'BP ALL IN ONE - ĐMX;;Chế Thị Út',
    '17952': 'BP ALL IN ONE - ĐMX;;Đinh Thị Mỹ Hương',
    '999': 'Chưa xác định;;Người chưa gán bộ phận',
};

test('cập nhật danh sách nhân viên (không có file YCX) → Report BI nhận đủ', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /Kích hoạt Chế độ Dùng Thử/i }).click();
    await page.waitForTimeout(2000);

    await page.evaluate(async (map) => {
        const db = await new Promise<IDBDatabase>((res, rej) => { const r = indexedDB.open('BI_HUB_DATABASE_V2'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
        await new Promise<void>((res, rej) => { const tx = db.transaction(['settings'], 'readwrite'); tx.objectStore('settings').put(map, 'departmentMap'); tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); });
        db.close();
    }, DEPT_MAP);

    await page.reload();
    await page.waitForTimeout(6000);

    const payload = await page.evaluate(async () => {
        const db = await new Promise<IDBDatabase>((res, rej) => { const r = indexedDB.open('BI_HUB_DATABASE_V2'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
        const v = await new Promise<any>((res) => { const tx = db.transaction(['settings'], 'readonly'); const q = tx.objectStore('settings').get('analysis-employees-list'); q.onsuccess = () => res(q.result); q.onerror = () => res(null); });
        db.close();
        return v;
    });
    console.log('DANH SÁCH BI:', JSON.stringify(payload && { total: payload.totalCount, names: payload.employees.map((e: any) => e.originalName) }));
    expect(payload, 'Report BI vẫn chưa có danh sách nhân viên').toBeTruthy();
    expect(payload.totalCount).toBe(3); // bỏ người "Chưa xác định"
    expect(payload.employees.map((e: any) => e.id).sort()).toEqual(['107617', '17952', '95970'].sort());
});
