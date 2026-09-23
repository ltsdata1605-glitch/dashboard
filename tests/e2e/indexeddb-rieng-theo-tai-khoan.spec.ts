import { expect, test } from '@playwright/test';

/**
 * Chủ dự án chốt 2026-09-23: "tách BI_HUB_DATABASE_V2 theo uid" — mỗi tài khoản một IndexedDB
 * riêng, thay cho cách chữa tạm "đổi tài khoản thì xoá sạch" (commit 9eca99b4).
 *
 * Test chạy THẲNG code thật trong trình duyệt thật (utils/localDbScope.ts +
 * services/localDataOwner.ts + services/dbService.ts) qua dev server của Vite.
 */
test('mỗi tài khoản đọc/ghi vào database riêng, người cũ quay lại vẫn còn dữ liệu', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(async () => {
        // Dùng biến cho đường dẫn để TypeScript không cố phân giải module của dev server
        const scopePath = '/utils/localDbScope.ts';
        const ownerPath = '/services/localDataOwner.ts';
        const dbPath = '/services/dbService.ts';
        const scope = (await import(/* @vite-ignore */ scopePath)) as typeof import('../../utils/localDbScope');
        const owner = (await import(/* @vite-ignore */ ownerPath)) as typeof import('../../services/localDataOwner');
        const dbs = (await import(/* @vite-ignore */ dbPath)) as typeof import('../../services/dbService');

        // ── 1. Máy này đã có sẵn dữ liệu trong database DÙNG CHUNG cũ (trạng thái trước bản cập nhật)
        const openLegacy = () =>
            new Promise<IDBDatabase>((resolve, reject) => {
                const req = indexedDB.open('BI_HUB_DATABASE_V2', 3);
                req.onupgradeneeded = () => {
                    const db = req.result;
                    if (!db.objectStoreNames.contains('appStorage')) db.createObjectStore('appStorage');
                    if (!db.objectStoreNames.contains('settings')) db.createObjectStore('settings');
                };
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => reject(req.error);
            });
        const legacy = await openLegacy();
        await new Promise<void>((resolve, reject) => {
            const tx = legacy.transaction(['settings', 'appStorage'], 'readwrite');
            tx.objectStore('settings').put('DỮ LIỆU LUỸ KẾ CỦA A', 'bi_config-Tân Hiệp-danhsach');
            tx.objectStore('appStorage').put('{"rows":["Excel Phân Tích của A"]}', 'salesData');
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
        legacy.close();

        const readRaw = (dbName: string, store: string, key: string) =>
            new Promise<unknown>(resolve => {
                const req = indexedDB.open(dbName);
                req.onsuccess = () => {
                    const db = req.result;
                    if (!db.objectStoreNames.contains(store)) { db.close(); resolve(null); return; }
                    const q = db.transaction([store], 'readonly').objectStore(store).get(key);
                    q.onsuccess = () => { db.close(); resolve(q.result ?? null); };
                    q.onerror = () => { db.close(); resolve(null); };
                };
                req.onerror = () => resolve(null);
            });

        // ── 2. Tài khoản A đăng nhập lần đầu sau bản cập nhật -> được thừa kế dữ liệu cũ
        await owner.ensureLocalDataBelongsTo('uid-A');
        const dbNameA = scope.biHubDbName();
        const aThuaKe = await dbs.getSetting('bi_config-Tân Hiệp-danhsach');
        const aThuaKeSalesData = await readRaw(dbNameA, 'appStorage', 'salesData');
        await dbs.saveSetting('dau-vet-cua-A', 'A ghi sau khi đăng nhập');

        // ── 3. Tài khoản B đăng nhập trên CÙNG máy
        const wiped = await owner.ensureLocalDataBelongsTo('uid-B');
        const dbNameB = scope.biHubDbName();
        const bThayDuLieuCuaA = await dbs.getSetting('dau-vet-cua-A');
        const bThayLuyKeCuaA = await dbs.getSetting('bi_config-Tân Hiệp-danhsach');
        await dbs.saveSetting('dau-vet-cua-B', 'B ghi');

        // ── 4. A quay lại máy này
        await owner.ensureLocalDataBelongsTo('uid-A');
        const aVanCon = await dbs.getSetting('dau-vet-cua-A');
        const aThayDuLieuCuaB = await dbs.getSetting('dau-vet-cua-B');

        // ── 5. Chưa đăng nhập thì quay về database dùng chung
        owner.setLocalDataOwner(null);
        const dbNameKhachVangLai = scope.biHubDbName();

        const danhSachDb = (await indexedDB.databases()).map(d => d.name).filter(Boolean) as string[];

        return {
            dbNameA, dbNameB, dbNameKhachVangLai, wiped,
            aThuaKe, aThuaKeSalesData, bThayDuLieuCuaA, bThayLuyKeCuaA, aVanCon, aThayDuLieuCuaB,
            coDbCuaA: danhSachDb.includes(dbNameA),
            coDbCuaB: danhSachDb.includes(dbNameB),
        };
    });

    console.log('KẾT QUẢ TÁCH DATABASE THEO UID:', JSON.stringify(result, null, 2));

    // Hai tài khoản = hai database khác nhau
    expect(result.dbNameA).toBe('BI_HUB_DATABASE_V2__uid-A');
    expect(result.dbNameB).toBe('BI_HUB_DATABASE_V2__uid-B');
    expect(result.coDbCuaA).toBe(true);
    expect(result.coDbCuaB).toBe(true);

    // A thừa kế trọn vẹn dữ liệu cũ của máy (cả settings lẫn kho Excel appStorage)
    expect(result.aThuaKe).toBe('DỮ LIỆU LUỸ KẾ CỦA A');
    expect(result.aThuaKeSalesData).toBe('{"rows":["Excel Phân Tích của A"]}');

    // B KHÔNG thấy bất cứ thứ gì của A — đúng lỗi chủ dự án báo 2026-09-23
    expect(result.wiped).toBe(true);
    expect(result.bThayDuLieuCuaA).toBeNull();
    expect(result.bThayLuyKeCuaA).toBeNull();

    // Và khác với cách chữa cũ: A quay lại thì dữ liệu VẪN CÒN, không phải tải lại từ đầu
    expect(result.aVanCon).toBe('A ghi sau khi đăng nhập');
    expect(result.aThayDuLieuCuaB).toBeNull();

    // Chưa đăng nhập (kể cả Chế độ Dùng Thử) vẫn dùng database dùng chung như trước
    expect(result.dbNameKhachVangLai).toBe('BI_HUB_DATABASE_V2');
});

/**
 * Rủi ro lớn nhất của việc tách database: 3 khu vực có 3 bản dbService riêng (quy tắc cách ly
 * CLAUDE.md mục 1). Chỉ cần một bản tính tên khác là dữ liệu âm thầm tách làm đôi — Report BI ghi
 * một nơi, Phân Tích đọc một nơi. Test này chốt cứng: cả 3 bản mở ĐÚNG một database.
 */
test('gốc, Report BI và In Sticker mở đúng cùng một database của tài khoản đang đăng nhập', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(async () => {
        const paths = {
            scope: '/utils/localDbScope.ts',
            root: '/services/dbService.ts',
            bi: '/features/bi-dashboard/services/dbService.ts',
            biKeys: '/features/bi-dashboard/utils/db.ts',
            sticker: '/features/sticker-event/services/dbService.ts',
        };
        const scope = (await import(/* @vite-ignore */ paths.scope)) as typeof import('../../utils/localDbScope');
        const root = (await import(/* @vite-ignore */ paths.root)) as typeof import('../../services/dbService');
        const bi = (await import(/* @vite-ignore */ paths.bi)) as typeof import('../../features/bi-dashboard/services/dbService');
        const biKeys = (await import(/* @vite-ignore */ paths.biKeys)) as typeof import('../../features/bi-dashboard/utils/db');
        const sticker = (await import(/* @vite-ignore */ paths.sticker)) as typeof import('../../features/sticker-event/services/dbService');

        scope.setActiveLocalUid('uid-cung-mot-nguoi');

        const tenGoc = (await root.getDb()).name;
        const tenBi = (await bi.getDb()).name;
        const tenSticker = (await sticker.getDb()).name;

        // Report BI ghi bằng lớp db riêng của nó (có tiền tố bi_), gốc phải đọc lại được
        await biKeys.set('supermarket-list', ['Tân Hiệp', 'Thạnh An']);
        const gocDocDuoc = await root.getSetting('bi_supermarket-list');
        // và In Sticker ghi thì Report BI cũng thấy (cùng kho dùng chung của MỘT tài khoản)
        await sticker.saveSetting('sticker_layout_test', 'khổ 40x30');
        const biDocDuoc = await bi.getSetting('sticker_layout_test');

        return { tenGoc, tenBi, tenSticker, gocDocDuoc, biDocDuoc, tenMongDoi: scope.biHubDbName() };
    });

    console.log('TÊN DATABASE 3 KHU VỰC:', JSON.stringify(result));
    expect(result.tenMongDoi).toBe('BI_HUB_DATABASE_V2__uid-cung-mot-nguoi');
    expect(result.tenGoc).toBe(result.tenMongDoi);
    expect(result.tenBi).toBe(result.tenMongDoi);
    expect(result.tenSticker).toBe(result.tenMongDoi);
    expect(result.gocDocDuoc).toEqual(['Tân Hiệp', 'Thạnh An']);
    expect(result.biDocDuoc).toBe('khổ 40x30');
});
