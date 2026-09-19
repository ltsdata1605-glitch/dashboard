#!/usr/bin/env node
/**
 * Script di trú dữ liệu phân hệ In Sticker từ database phụ ai-studio sang database (default).
 * 
 * Nguồn:  ai-studio-16672ec9-22fb-43a6-b6ee-e59aa8a8c699
 * Đích:   (default)
 *
 * MAPPING:
 *   ai-studio/users/{uid}       --> (default)/stickerUsers/{uid}
 *   ai-studio/users/{uid}/state --> (default)/stickerUsers/{uid}/state
 *   ai-studio/stores/{storeId}  --> (default)/stores/{storeId} (bao gồm toàn bộ subcollections)
 *
 * Chạy thử (không ghi):
 *   node functions/scripts/migrate-sticker-to-default.cjs --dry-run
 * 
 * Chạy thật:
 *   node functions/scripts/migrate-sticker-to-default.cjs --execute
 */

'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const SOURCE_DB_ID = 'ai-studio-16672ec9-22fb-43a6-b6ee-e59aa8a8c699';
const TARGET_DB_ID = '(default)';

const args = process.argv.slice(2);
const IS_DRY_RUN = args.includes('--dry-run') || !args.includes('--execute');

let tempAdcPath = null;
const adcFromFirebaseCli = () => {
    const cfgPath = path.join(os.homedir(), '.config', 'configstore', 'firebase-tools.json');
    if (!fs.existsSync(cfgPath)) return null;

    let refreshToken;
    try {
        const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
        refreshToken = cfg && cfg.tokens ? cfg.tokens.refresh_token : undefined;
    } catch {
        return null;
    }
    if (!refreshToken) return null;

    let api;
    try {
        api = require(path.join(REPO_ROOT, 'node_modules', 'firebase-tools', 'lib', 'api.js'));
    } catch {
        return null;
    }
    if (typeof api.clientId !== 'function' || typeof api.clientSecret !== 'function') return null;

    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ycx-adc-'));
    const file = path.join(dir, 'adc.json');
    fs.writeFileSync(file, JSON.stringify({
        type: 'authorized_user',
        client_id: api.clientId(),
        client_secret: api.clientSecret(),
        refresh_token: refreshToken,
    }), { mode: 0o600 });
    tempAdcPath = file;
    return file;
};

const cleanupTempAdc = () => {
    if (!tempAdcPath) return;
    try {
        fs.rmSync(path.dirname(tempAdcPath), { recursive: true, force: true });
    } catch { /* ignore */ }
    tempAdcPath = null;
};
process.on('exit', cleanupTempAdc);
process.on('SIGINT', () => { cleanupTempAdc(); process.exit(130); });

const initFirestore = () => {
    let projectId = 'dashboa-7e20b';
    const rcPath = path.join(REPO_ROOT, '.firebaserc');
    if (fs.existsSync(rcPath)) {
        try {
            const rc = JSON.parse(fs.readFileSync(rcPath, 'utf8'));
            if (rc.projects && rc.projects.default) projectId = rc.projects.default;
        } catch { /* ignore */ }
    }

    if (!process.env.GOOGLE_APPLICATION_CREDENTIALS && !fs.existsSync(path.join(os.homedir(), '.config', 'gcloud', 'application_default_credentials.json'))) {
        const file = adcFromFirebaseCli();
        if (file) process.env.GOOGLE_APPLICATION_CREDENTIALS = file;
    }

    const app = admin.initializeApp({ credential: admin.credential.applicationDefault(), projectId });
    const sourceDb = getFirestore(app, SOURCE_DB_ID);
    const targetDb = getFirestore(app, TARGET_DB_ID);
    return { sourceDb, targetDb };
};

// Firestore giới hạn batch: 500 thao tác VÀ ~11 MiB payload/lần commit. Chỉ đếm số doc là chưa đủ:
// các doc chunk (inventoryChunks/productChunks/itemChunks) mỗi cái tới ~1 MB, 300 cái đã vượt 11 MiB
// (lỗi thật 2026-09-19). Nên commit theo CẢ số lượng LẪN kích thước ước lượng.
const BATCH_MAX_DOCS = 200;
const BATCH_MAX_BYTES = 8 * 1024 * 1024; // 8 MiB — chừa biên dưới trần 11 MiB của Firestore

class BatchWriter {
    constructor(db, isDryRun) {
        this.db = db;
        this.isDryRun = isDryRun;
        this.batch = db.batch();
        this.count = 0;
        this.bytes = 0;
        this.totalWritten = 0;
    }

    _estimateSize(data) {
        // Ước lượng thô bằng JSON; đủ tốt để tránh vượt trần. Timestamp/GeoPoint tính hụt đôi chút
        // nhưng biên 8/11 MiB đã bù. Không serialize được thì coi như 1 MiB (trần 1 doc của Firestore).
        try { return Buffer.byteLength(JSON.stringify(data)); } catch { return 1024 * 1024; }
    }

    async set(docRef, data) {
        if (this.isDryRun) {
            this.totalWritten++;
            return;
        }
        const size = this._estimateSize(data);
        // Nếu thêm doc này làm batch hiện tại vượt biên, commit batch cũ TRƯỚC rồi mới thêm.
        if (this.count > 0 && (this.count >= BATCH_MAX_DOCS || this.bytes + size >= BATCH_MAX_BYTES)) {
            await this.commit();
        }
        this.batch.set(docRef, data);
        this.count++;
        this.bytes += size;
        this.totalWritten++;
    }

    async commit() {
        if (this.count > 0 && !this.isDryRun) {
            await this.batch.commit();
            this.batch = this.db.batch();
            this.count = 0;
            this.bytes = 0;
        }
    }
}

// Giãn nhịp đọc để tránh rate-limit của database "free tier" AI Studio (đọc dồn dập bị
// RESOURCE_EXHAUSTED dù trần NGÀY chưa hết). Chỉnh qua env MIGRATE_THROTTLE_MS.
const THROTTLE_MS = Number(process.env.MIGRATE_THROTTLE_MS || 60);
const sleep = (ms) => (ms > 0 ? new Promise(r => setTimeout(r, ms)) : Promise.resolve());

async function migrateCollectionRecursively(srcColRef, targetColRef, writer, stats) {
    // listDocuments() thay cho get(): bắt cả document "bóng" ở mọi tầng (vd savedList lớn lưu dạng
    // chunk có thể có doc cha bóng + subcollection itemChunks). get() sẽ bỏ sót chúng.
    const docRefs = await srcColRef.listDocuments();
    for (const srcRef of docRefs) {
        const targetDocRef = targetColRef.doc(srcRef.id);
        // RESUME: nếu target đã có doc này (từ lần chạy trước) thì bỏ qua đọc nguồn — tiết kiệm
        // hạn mức đọc AI Studio. Đọc (default) không bị giới hạn. Vẫn đệ quy subcollection phòng
        // trường hợp lần trước ghi cha xong nhưng con còn dở.
        const done = (await targetDocRef.get()).exists;
        if (!done) {
            await sleep(THROTTLE_MS);
            const snap = await srcRef.get();
            if (snap.exists) {
                await writer.set(targetDocRef, snap.data());
                stats.copiedDocs++;
            }
        } else {
            stats.skipped++;
        }

        // Subcollections (đệ quy)
        await sleep(THROTTLE_MS);
        const subCollections = await srcRef.listCollections();
        for (const subCol of subCollections) {
            const targetSubColRef = targetDocRef.collection(subCol.id);
            await migrateCollectionRecursively(subCol, targetSubColRef, writer, stats);
        }
    }
}

async function main() {
    console.log('='.repeat(70));
    console.log(`DI TRÚ DỮ LIỆU IN STICKER SANG DATABASE (default)`);
    console.log(`  Nguồn : ${SOURCE_DB_ID}`);
    console.log(`  Đích  : ${TARGET_DB_ID}`);
    console.log(`  Chế độ: ${IS_DRY_RUN ? 'DRY-RUN (Chỉ kiểm đếm, không ghi)' : 'EXECUTE (GHI THẬT)'}`);
    console.log('='.repeat(70));

    let sourceDb, targetDb;
    try {
        const initialized = initFirestore();
        sourceDb = initialized.sourceDb;
        targetDb = initialized.targetDb;
    } catch (err) {
        console.error('❌ Không thể xác thực Firebase:', err.message);
        process.exit(1);
    }

    const writer = new BatchWriter(targetDb, IS_DRY_RUN);
    const stats = { copiedDocs: 0, users: 0, stores: 0, skipped: 0 };

    try {
        console.log('\n[1/2] Đang sao chép collection users -> stickerUsers...');
        // DÙNG listDocuments() CHỨ KHÔNG .get(): .get() bỏ qua document "bóng" (có subcollection
        // nhưng không có field). Đã đo thật 2026-09-19: stores toàn doc bóng nên .get() trả 0.
        // Users hiện là doc thật, nhưng dùng listDocuments cho chắc — nếu có user chỉ còn state thì
        // vẫn giữ được.
        const userRefs = await sourceDb.collection('users').listDocuments();
        stats.users = userRefs.length;
        console.log(`  Tìm thấy ${userRefs.length} tài khoản In Sticker.`);

        for (const userRef of userRefs) {
            const targetUserRef = targetDb.collection('stickerUsers').doc(userRef.id);
            if (!(await targetUserRef.get()).exists) {
                await sleep(THROTTLE_MS);
                const userSnap = await userRef.get();
                if (userSnap.exists) {
                    await writer.set(targetUserRef, userSnap.data());
                    stats.copiedDocs++;
                }
            } else { stats.skipped++; }

            // Kiểm tra state subcollection nếu có (đệ quy qua hàm chung để hưởng resume+throttle)
            await migrateCollectionRecursively(userRef.collection('state'), targetUserRef.collection('state'), writer, stats);
        }

        console.log('\n[2/2] Đang sao chép collection stores (kho, tem đã lưu, tồn kho)...');
        // 🔴 SỬA BUG MẤT DỮ LIỆU (2026-09-19): bản cũ dùng `collection('stores').get()` → trả 0 vì
        // TẤT CẢ 10 kho là document "bóng" (chỉ có subcollection savedLists/inventoryChunks/…, không
        // có field ở doc cha). `.get()` không trả doc bóng; phải dùng `listDocuments()`. Nếu chạy bản
        // cũ sẽ MẤT ~688 savedLists + ~336 doc tồn kho/sản phẩm.
        const storeRefs = await sourceDb.collection('stores').listDocuments();
        stats.stores = storeRefs.length;
        console.log(`  Tìm thấy ${storeRefs.length} kho gốc.`);

        for (const storeRef of storeRefs) {
            const targetStoreRef = targetDb.collection('stores').doc(storeRef.id);
            // Kho toàn doc "bóng" nên thường không có field; chỉ ghi doc cha nếu nguồn có field và
            // target chưa có. Dù sao subcollection mới là phần chính, luôn đệ quy bên dưới.
            if (!(await targetStoreRef.get()).exists) {
                await sleep(THROTTLE_MS);
                const storeSnap = await storeRef.get();
                if (storeSnap.exists && Object.keys(storeSnap.data() || {}).length > 0) {
                    await writer.set(targetStoreRef, storeSnap.data());
                    stats.copiedDocs++;
                }
            }

            await sleep(THROTTLE_MS);
            const subCollections = await storeRef.listCollections();
            for (const subCol of subCollections) {
                const targetSubColRef = targetStoreRef.collection(subCol.id);
                console.log(`    - Đang sao chép subcollection: stores/${storeRef.id}/${subCol.id}...`);
                await migrateCollectionRecursively(subCol, targetSubColRef, writer, stats);
            }
        }

        await writer.commit();

        console.log('\n' + '='.repeat(70));
        console.log('✅ HOÀN THÀNH DI TRÚ DỮ LIỆU:');
        console.log(`  - Tài khoản In Sticker (stickerUsers): ${stats.users}`);
        console.log(`  - Số kho hàng (stores):                ${stats.stores}`);
        console.log(`  - Tổng số document sao chép:           ${stats.copiedDocs}`);
        if (IS_DRY_RUN) {
            console.log('\n👉 Đây là chế độ DRY-RUN. Để thực thi ghi thật, chạy:');
            console.log('   node functions/scripts/migrate-sticker-to-default.cjs --execute');
        } else {
            console.log('\n🎉 Đã ghi toàn bộ dữ liệu thành công vào database (default)!');
        }
        console.log('='.repeat(70));

    } catch (err) {
        if (err.message && (err.message.includes('RESOURCE_EXHAUSTED') || err.message.includes('Quota limit exceeded'))) {
            console.error('\n⚠️  THÔNG BÁO TỪ GOOGLE CLOUD:');
            console.error('   Database nguồn (ai-studio) hiện vẫn đang chạm trần hạn mức đọc (AI Shared Quota).');
            console.error('   Google Cloud sẽ tự động đặt lại hạn mức vào lúc 14:00 chiều nay (00:00 Pacific Time).');
            console.error('   Vui lòng chạy lại lệnh này vào lúc 14:00 để sao chép dữ liệu hoàn tất!');
        } else {
            console.error('\n❌ Lỗi khi di trú:', err);
        }
        process.exit(1);
    }
}

main().catch(e => {
    console.error('Lỗi ngoài dự kiến:', e);
    process.exit(1);
});
