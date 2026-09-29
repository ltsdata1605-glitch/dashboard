import { expect, test } from '@playwright/test';

/**
 * Audit A01 — chủ dự án chốt 2026-09-29: "Báo cáo khai thác lưu cục bộ trên máy ở IndexedDB, không
 * cần cloud". Kho này không có bản trên cloud nên đăng xuất KHÔNG được xoá nó. Mỗi tài khoản một kho
 * riêng (`YCX_KHAI_THAC_DB__<uid>`) để người khác trên cùng máy không thấy khách hàng/SĐT.
 * Chạy đúng các bước của AuthContext.logout() (clearAllLocalAppData + setLocalDataOwner(null)) và
 * ensureLocalDataBelongsTo (đăng nhập) trên code thật trong Chromium.
 */
type Mods = {
    owner: typeof import('../../services/localDataOwner');
    kt: typeof import('../../features/khai-thac/services/khaiThacDb');
};
type W = Window & { __m: Mods; __dem: () => Promise<{ reports: number; leads: number }>; __dangXuat: () => Promise<void> };

test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(async () => {
        const w = window as unknown as W;
        const ownerPath = '/services/localDataOwner.ts';
        const ktPath = '/features/khai-thac/services/khaiThacDb.ts';
        w.__m = {
            owner: await import(/* @vite-ignore */ ownerPath),
            kt: await import(/* @vite-ignore */ ktPath),
        };
        w.__dem = async () => ({
            reports: (await w.__m.kt.khaiThacDb.listReports()).length,
            leads: (await w.__m.kt.khaiThacDb.listLeads()).length,
        });
        w.__dangXuat = async () => { await w.__m.owner.clearAllLocalAppData(); w.__m.owner.setLocalDataOwner(null); };
    });
});

test('đăng xuất rồi CÙNG tài khoản đăng nhập lại: báo cáo + khách hàng còn nguyên', async ({ page }) => {
    const kq = await page.evaluate(async () => {
        const { __m: { owner, kt }, __dem: dem, __dangXuat: dangXuat } = window as unknown as W;
        await owner.ensureLocalDataBelongsTo('uid-A');
        await kt.khaiThacDb.saveReport({ id: 'r1', date: '2026-09-29', savedAt: 'x' } as never);
        await kt.khaiThacDb.saveLead({ id: 'l1', name: 'Khách của A', phone: '0900000001' } as never);
        const truoc = await dem();
        await dangXuat();
        await owner.ensureLocalDataBelongsTo('uid-A');
        return { truoc, sau: await dem() };
    });
    expect(kq.truoc).toEqual({ reports: 1, leads: 1 });
    expect(kq.sau).toEqual({ reports: 1, leads: 1 });
});

test('tài khoản khác trên cùng máy KHÔNG thấy dữ liệu; A quay lại vẫn còn', async ({ page }) => {
    const kq = await page.evaluate(async () => {
        const { __m: { owner, kt }, __dem: dem, __dangXuat: dangXuat } = window as unknown as W;
        await owner.ensureLocalDataBelongsTo('uid-A');
        await kt.khaiThacDb.saveLead({ id: 'l1', name: 'Khách của A', phone: '0900000001' } as never);
        await dangXuat();
        await owner.ensureLocalDataBelongsTo('uid-B');
        const b = await dem();
        await dangXuat();
        await owner.ensureLocalDataBelongsTo('uid-A');
        return { b, a: await dem() };
    });
    expect(kq.b).toEqual({ reports: 0, leads: 0 });
    expect(kq.a).toEqual({ reports: 0, leads: 1 });
});

test('dữ liệu trong kho dùng chung cũ được chuyển về chủ — kể cả khi đăng xuất trước khi mở tab Báo cáo', async ({ page }) => {
    const kq = await page.evaluate(async () => {
        const { __m: { owner }, __dem: dem, __dangXuat: dangXuat } = window as unknown as W;
        // Trạng thái trước bản cập nhật: dữ liệu nằm ở YCX_KHAI_THAC_DB, chủ máy là uid-A
        await new Promise<void>((res, rej) => {
            const r = indexedDB.open('YCX_KHAI_THAC_DB', 1);
            r.onupgradeneeded = () => {
                const d = r.result;
                d.createObjectStore('kv');
                d.createObjectStore('reports', { keyPath: 'id' });
                d.createObjectStore('leads', { keyPath: 'id' });
            };
            r.onsuccess = () => {
                const d = r.result;
                const tx = d.transaction(['reports', 'leads'], 'readwrite');
                tx.objectStore('reports').put({ id: 'cu-1', date: '2026-09-01', savedAt: 'x' });
                tx.objectStore('leads').put({ id: 'cu-l', name: 'Khách cũ' });
                tx.oncomplete = () => { d.close(); res(); };
                tx.onerror = () => rej(tx.error);
            };
            r.onerror = () => rej(r.error);
        });
        owner.setLocalDataOwner('uid-A');
        await dangXuat(); // đăng xuất NGAY, chưa mở tab Báo cáo
        await owner.ensureLocalDataBelongsTo('uid-A');
        const a = await dem();
        const khoCuConLai = await new Promise<number>(res => {
            const r = indexedDB.open('YCX_KHAI_THAC_DB');
            r.onsuccess = () => {
                const d = r.result;
                if (!d.objectStoreNames.contains('leads')) { d.close(); res(0); return; }
                const q = d.transaction('leads').objectStore('leads').count();
                q.onsuccess = () => { d.close(); res(q.result); };
            };
        });
        return { a, khoCuConLai };
    });
    expect(kq.a).toEqual({ reports: 1, leads: 1 });
    expect(kq.khoCuConLai).toBe(0); // kho dùng chung không còn SĐT khách (Chế độ Dùng Thử không thấy)
});

test('"Xoá tất cả dữ liệu (Người dùng mới)" vẫn xoá kho khai thác của chính người bấm', async ({ page }) => {
    const kq = await page.evaluate(async () => {
        const { __m: { owner, kt }, __dem: dem } = window as unknown as W;
        await owner.ensureLocalDataBelongsTo('uid-A');
        await kt.khaiThacDb.saveLead({ id: 'l1', name: 'Khách của A' } as never);
        await owner.clearAllLocalAppData({ xoaKhaiThacRiengHienTai: true });
        return await dem();
    });
    expect(kq).toEqual({ reports: 0, leads: 0 });
});
