import { expect, test } from '@playwright/test';

/**
 * Chủ dự án báo 2026-09-23: tài khoản MỚI đăng nhập trên cùng máy vẫn thấy dữ liệu của tài khoản
 * trước (Report BI hiện cụm siêu thị cũ). Nguyên nhân: IndexedDB/localStorage thuộc về trình
 * duyệt, không theo tài khoản, và luồng đăng xuất/đăng nhập không dọn gì cả.
 * Test này chạy thẳng services/localDataOwner.ts trong trình duyệt thật.
 */
test('đổi tài khoản: dữ liệu cục bộ của tài khoản trước bị dọn sạch', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(async () => {
        const mod = await import('/services/localDataOwner.ts');

        // Giả lập dữ liệu của "tài khoản cũ" trong đúng các kho app dùng thật
        // DB có thể đã tồn tại với version khác (app tự tạo) -> mở không kèm version, thiếu store
        // thì nâng version lên 1 nấc để tạo.
        const seed = async (name: string, store: string) => {
            const open = (version?: number) =>
                new Promise<IDBDatabase>((resolve, reject) => {
                    const req = version ? indexedDB.open(name, version) : indexedDB.open(name);
                    req.onupgradeneeded = () => {
                        if (!req.result.objectStoreNames.contains(store)) req.result.createObjectStore(store);
                    };
                    req.onsuccess = () => resolve(req.result);
                    req.onerror = () => reject(req.error);
                });

            let db = await open();
            if (!db.objectStoreNames.contains(store)) {
                const next = db.version + 1;
                db.close();
                db = await open(next);
            }
            await new Promise<void>((resolve, reject) => {
                const tx = db.transaction([store], 'readwrite');
                tx.objectStore(store).put({ cum: ['Hùng Vương', 'Mậu Thân'] }, 'bi-summary');
                tx.oncomplete = () => resolve();
                tx.onerror = () => reject(tx.error);
            });
            db.close();
        };

        const read = (name: string, store: string) =>
            new Promise<unknown>((resolve) => {
                const req = indexedDB.open(name);
                req.onsuccess = () => {
                    const db = req.result;
                    if (!db.objectStoreNames.contains(store)) { db.close(); resolve(null); return; }
                    const tx = db.transaction([store], 'readonly');
                    const q = tx.objectStore(store).get('bi-summary');
                    q.onsuccess = () => { db.close(); resolve(q.result ?? null); };
                    q.onerror = () => { db.close(); resolve(null); };
                };
                req.onerror = () => resolve(null);
            });

        await seed('BI_HUB_DATABASE_V2', 'settings');
        await seed('TaxCalculatorDB', 'records');
        localStorage.setItem('ycx-something-old', 'dữ liệu cũ');
        localStorage.setItem('TAX_CALCULATOR_INPUTS_V4', '{"name":"Người cũ"}');
        localStorage.setItem('khong-phai-cua-app', 'giữ nguyên');

        // Tài khoản cũ sở hữu dữ liệu
        mod.setLocalDataOwner('uid-nguoi-cu');
        const before = await read('BI_HUB_DATABASE_V2', 'settings');

        // Tài khoản MỚI đăng nhập
        const wiped = await mod.ensureLocalDataBelongsTo('uid-nguoi-moi');

        return {
            before,
            wiped,
            afterBi: await read('BI_HUB_DATABASE_V2', 'settings'),
            afterTax: await read('TaxCalculatorDB', 'records'),
            lsYcx: localStorage.getItem('ycx-something-old'),
            lsTax: localStorage.getItem('TAX_CALCULATOR_INPUTS_V4'),
            lsOther: localStorage.getItem('khong-phai-cua-app'),
            owner: mod.getLocalDataOwner(),
        };
    });

    console.log('KẾT QUẢ ĐỔI TÀI KHOẢN:', JSON.stringify(result));
    expect(result.before).toBeTruthy();       // có dữ liệu của người cũ trước đó
    expect(result.wiped).toBe(true);          // đã phát hiện đổi tài khoản
    expect(result.afterBi).toBeNull();        // dữ liệu Report BI của người cũ đã bị dọn
    expect(result.afterTax).toBeNull();       // và cả kho Tính thuế
    expect(result.lsYcx).toBeNull();
    expect(result.lsTax).toBeNull();
    expect(result.lsOther).toBe('giữ nguyên'); // không đụng vào khoá ngoài app
    expect(result.owner).toBe('uid-nguoi-moi');
});

test('cùng một tài khoản: KHÔNG dọn dữ liệu', async ({ page }) => {
    await page.goto('/');

    const kept = await page.evaluate(async () => {
        const mod = await import('/services/localDataOwner.ts');
        localStorage.setItem('ycx-giu-lai', 'dữ liệu của chính tôi');
        mod.setLocalDataOwner('uid-cua-toi');
        const wiped = await mod.ensureLocalDataBelongsTo('uid-cua-toi');
        return { wiped, value: localStorage.getItem('ycx-giu-lai') };
    });

    console.log('CÙNG TÀI KHOẢN:', JSON.stringify(kept));
    expect(kept.wiped).toBe(false);
    expect(kept.value).toBe('dữ liệu của chính tôi');
});
