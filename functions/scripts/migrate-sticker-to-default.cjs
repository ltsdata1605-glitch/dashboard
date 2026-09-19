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

class BatchWriter {
    constructor(db, isDryRun) {
        this.db = db;
        this.isDryRun = isDryRun;
        this.batch = db.batch();
        this.count = 0;
        this.totalWritten = 0;
    }

    async set(docRef, data) {
        if (this.isDryRun) {
            this.totalWritten++;
            return;
        }
        this.batch.set(docRef, data);
        this.count++;
        this.totalWritten++;

        if (this.count >= 300) {
            await this.commit();
        }
    }

    async commit() {
        if (this.count > 0 && !this.isDryRun) {
            await this.batch.commit();
            this.batch = this.db.batch();
            this.count = 0;
        }
    }
}

async function migrateCollectionRecursively(srcColRef, targetColRef, writer, stats) {
    const snap = await srcColRef.get();
    for (const doc of snap.docs) {
        const data = doc.data();
        const targetDocRef = targetColRef.doc(doc.id);
        await writer.set(targetDocRef, data);
        stats.copiedDocs++;

        // Subcollections
        const subCollections = await doc.ref.listCollections();
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
    const stats = { copiedDocs: 0, users: 0, stores: 0 };

    try {
        console.log('\n[1/2] Đang sao chép collection users -> stickerUsers...');
        const usersSnap = await sourceDb.collection('users').get();
        stats.users = usersSnap.size;
        console.log(`  Tìm thấy ${usersSnap.size} tài khoản In Sticker.`);

        for (const userDoc of usersSnap.docs) {
            const userData = userDoc.data();
            const targetUserRef = targetDb.collection('stickerUsers').doc(userDoc.id);
            await writer.set(targetUserRef, userData);
            stats.copiedDocs++;

            // Kiểm tra state subcollection nếu có
            const stateSnap = await userDoc.ref.collection('state').get();
            for (const stateDoc of stateSnap.docs) {
                await writer.set(targetUserRef.collection('state').doc(stateDoc.id), stateDoc.data());
                stats.copiedDocs++;
            }
        }

        console.log('\n[2/2] Đang sao chép collection stores (kho, tem đã lưu, tồn kho)...');
        const storesSnap = await sourceDb.collection('stores').get();
        stats.stores = storesSnap.size;
        console.log(`  Tìm thấy ${storesSnap.size} kho gốc.`);

        for (const storeDoc of storesSnap.docs) {
            const targetStoreRef = targetDb.collection('stores').doc(storeDoc.id);
            if (Object.keys(storeDoc.data() || {}).length > 0) {
                await writer.set(targetStoreRef, storeDoc.data());
                stats.copiedDocs++;
            }

            const subCollections = await storeDoc.ref.listCollections();
            for (const subCol of subCollections) {
                const targetSubColRef = targetStoreRef.collection(subCol.id);
                console.log(`    - Đang sao chép subcollection: stores/${storeDoc.id}/${subCol.id}...`);
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
