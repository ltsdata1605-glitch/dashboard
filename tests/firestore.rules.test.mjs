/**
 * Test hồi quy cho firestore.rules — collection khoData/{maKho}/salesFiles (mục 37
 * implementation_plan.md, "Chia sẻ dữ liệu doanh số theo Kho"). Chạy hoàn toàn LOCAL qua
 * Firestore Emulator (@firebase/rules-unit-testing) — không đụng gì đến Firebase production.
 *
 * Chạy: npm run test:rules
 * (cần Java Runtime cho Firestore Emulator — nếu máy chưa có: `brew install openjdk`,
 * xem Caveats khi cài để biết cách thêm vào PATH nếu `java -version` báo không tìm thấy)
 *
 * Khi sửa firestore.rules (đặc biệt block khoData hoặc hàm myKhos()/isManager()), hãy chạy
 * lại file này để chắc chắn không vô tình mở/khoá nhầm quyền.
 */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import {
    initializeTestEnvironment,
    assertSucceeds,
    assertFails,
} from '@firebase/rules-unit-testing';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ID = 'dashboa-7e20b-ruletest';
const rules = readFileSync(resolve(__dirname, '..', 'firestore.rules'), 'utf8');

let pass = 0;
let fail = 0;

// `resultPromise` phải là kết quả của assertSucceeds(op) hoặc assertFails(op) — 2 hàm này
// TỰ resolve/reject đúng theo kỳ vọng rồi (assertSucceeds reject nếu op bị Rules chặn,
// assertFails reject nếu op KHÔNG bị chặn dù đáng lẽ phải bị chặn). check() chỉ cần biết
// promise đó có throw hay không — KHÔNG truyền thêm cờ "allow/deny" riêng (dễ viết sai,
// chồng chéo 2 lớp kỳ vọng, có thể báo PASS nhầm khi rules thực ra đang sai).
async function check(label, resultPromise) {
    try {
        await resultPromise;
        console.log(`✅ PASS: ${label}`);
        pass++;
    } catch (e) {
        console.log(`❌ FAIL: ${label} -- ${e.message?.split('\n')[0]}`);
        fail++;
    }
}

async function main() {
    const testEnv = await initializeTestEnvironment({
        projectId: PROJECT_ID,
        firestore: { rules },
    });

    // --- Seed data (bypass rules) để có sẵn 1 file trong TESTKHO cho các test đọc ---
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
        const db = ctx.firestore();
        await db.doc('khoData/TESTKHO/salesFiles/seedfile').set({
            maKho: 'TESTKHO', filename: 'seed.xlsx', uploadedByUid: 'seeder', uploadedByName: 'Seeder',
            uploadedAt: Date.now(), fileLastModified: Date.now(), totalRows: 1, chunkCount: 1,
            isRealtime: false, isActive: true, version: 1,
        });
        await db.doc('khoData/TESTKHO/salesFiles/seedfile/chunks/chunk_0').set({ rows: [{ foo: 'bar' }] });
    });

    const managerA = testEnv.authenticatedContext('managerA', { role: 'manager', departmentId: 'TESTKHO' });
    const managerMulti = testEnv.authenticatedContext('managerMulti', { role: 'manager', departmentId: 'TESTKHO,OTHERKHO' });
    const managerOther = testEnv.authenticatedContext('managerOther', { role: 'manager', departmentId: 'OTHERKHO' });
    const employeeSame = testEnv.authenticatedContext('employeeSame', { role: 'employee', departmentId: 'TESTKHO' });
    const employeeOther = testEnv.authenticatedContext('employeeOther', { role: 'employee', departmentId: 'OTHERKHO' });
    const adminUser = testEnv.authenticatedContext('adminUser', { role: 'admin', departmentId: 'ALL (Super Admin)' });
    const anon = testEnv.unauthenticatedContext();

    const fileDoc = (ctx, fileId = 'file1') => ctx.firestore().doc(`khoData/TESTKHO/salesFiles/${fileId}`);
    const chunkDoc = (ctx, fileId = 'file1') => ctx.firestore().doc(`khoData/TESTKHO/salesFiles/${fileId}/chunks/chunk_0`);
    const seedDoc = (ctx) => ctx.firestore().doc('khoData/TESTKHO/salesFiles/seedfile');
    const seedChunk = (ctx) => ctx.firestore().doc('khoData/TESTKHO/salesFiles/seedfile/chunks/chunk_0');
    const filesCol = (ctx) => ctx.firestore().collection('khoData/TESTKHO/salesFiles');

    const sampleMeta = {
        maKho: 'TESTKHO', filename: 'test.xlsx', uploadedByUid: 'managerA', uploadedByName: 'Manager A',
        uploadedAt: Date.now(), fileLastModified: Date.now(), totalRows: 1, chunkCount: 1,
        isRealtime: true, isActive: true, version: 1,
    };

    console.log('\n=== KHO DATA — GHI (write) ===');
    await check('Manager A ghi file vào Kho của chính mình (TESTKHO)',
        assertSucceeds(fileDoc(managerA).set(sampleMeta)));
    await check('Manager A ghi chunk vào file của chính mình',
        assertSucceeds(chunkDoc(managerA).set({ rows: [{ a: 1 }] })));
    await check('Manager nhiều Kho (TESTKHO,OTHERKHO) ghi được vào TESTKHO',
        assertSucceeds(fileDoc(managerMulti, 'file2').set(sampleMeta)));
    await check('Manager Kho khác (OTHERKHO) KHÔNG ghi được vào TESTKHO',
        assertFails(fileDoc(managerOther, 'hack1').set(sampleMeta)));
    await check('Nhân viên cùng Kho KHÔNG được ghi (chỉ đọc)',
        assertFails(fileDoc(employeeSame, 'hack2').set(sampleMeta)));
    await check('Nhân viên KHÔNG được ghi chunk',
        assertFails(chunkDoc(employeeSame, 'seedfile').set({ rows: [] })));
    await check('Admin (không map Kho cụ thể) KHÔNG ghi được vào TESTKHO',
        assertFails(fileDoc(adminUser, 'adminhack').set(sampleMeta)));
    await check('Chưa đăng nhập KHÔNG ghi được',
        assertFails(fileDoc(anon, 'anonhack').set(sampleMeta)));

    console.log('\n=== KHO DATA — ĐỌC (get 1 file cụ thể) ===');
    await check('Manager A đọc được file (get) trong Kho của mình',
        assertSucceeds(seedDoc(managerA).get()));
    await check('Nhân viên cùng Kho đọc được file (get)',
        assertSucceeds(seedDoc(employeeSame).get()));
    await check('Nhân viên cùng Kho đọc được chunk (get)',
        assertSucceeds(seedChunk(employeeSame).get()));
    await check('Nhân viên Kho KHÁC KHÔNG đọc được file của TESTKHO',
        assertFails(seedDoc(employeeOther).get()));
    await check('Manager Kho khác KHÔNG đọc được file của TESTKHO',
        assertFails(seedDoc(managerOther).get()));
    await check('Chưa đăng nhập KHÔNG đọc được',
        assertFails(seedDoc(anon).get()));

    console.log('\n=== KHO DATA — LIST (getKhoAllFilesMeta / getKhoActiveFilesMeta) ===');
    await check('Manager A list được salesFiles của Kho mình',
        assertSucceeds(filesCol(managerA).get()));
    await check('Nhân viên cùng Kho list được salesFiles',
        assertSucceeds(filesCol(employeeSame).get()));
    await check('Nhân viên Kho khác KHÔNG list được salesFiles của TESTKHO',
        assertFails(filesCol(employeeOther).get()));

    console.log('\n=== KHO DATA — CẬP NHẬT/XOÁ (setKhoSalesFileActive / deleteKhoSalesFile) ===');
    await check('Manager A tự cập nhật isActive file của Kho mình',
        assertSucceeds(seedDoc(managerA).update({ isActive: false })));
    await check('Nhân viên KHÔNG được cập nhật isActive',
        assertFails(seedDoc(employeeSame).update({ isActive: false })));
    await check('Manager Kho khác KHÔNG được xoá file của TESTKHO',
        assertFails(seedDoc(managerOther).delete()));
    await check('Manager A xoá được file của Kho mình',
        assertSucceeds(fileDoc(managerA, 'file2').delete()));

    await testEnv.cleanup();

    console.log(`\n=== KẾT QUẢ: ${pass} pass / ${fail} fail (tổng ${pass + fail}) ===`);
    if (fail > 0) process.exit(1);
}

main().catch(e => { console.error('Lỗi chạy test:', e); process.exit(1); });
