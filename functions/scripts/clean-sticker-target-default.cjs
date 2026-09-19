#!/usr/bin/env node
/**
 * DỌN collection sticker trên database (default) TRƯỚC khi di trú dữ liệu từ AI Studio.
 *
 * Bối cảnh: chủ dự án cố ý đăng ký vài tài khoản test vào (default)/stickerUsers trong khoảng
 * 13:03–14:07 ngày 2026-09-19 (client mới đã deploy, trỏ (default) nhưng dữ liệu chưa copy).
 * Hai collection này ĐÃ ĐƯỢC XÁC MINH TRỐNG trước 13:03, và là collection RIÊNG của In Sticker
 * (root/BI/Phan Ca không dùng) — nên mọi document trong đó lúc chạy đều là tài khoản test cần xoá.
 *
 * CHỈ đụng đúng 2 collection: `stickerUsers` và `stores`. TUYỆT ĐỐI không chạm collection khác của
 * (default) (users, biData, _system, settings, …) — đó là dữ liệu thật của 3 khu vực đang chạy.
 *
 * Chạy thử (chỉ đếm, không xoá):  node <path>/clean-sticker-target.cjs --dry-run
 * Xoá thật:                       node <path>/clean-sticker-target.cjs --execute
 */
'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const REPO_ROOT = require('path').resolve(__dirname, '..', '..');
const TARGET_DB_ID = '(default)';
// DANH SÁCH TRẮNG cứng — chỉ xoá trong đúng 2 collection này, không nhận từ tham số.
const COLLECTIONS_TO_WIPE = ['stickerUsers', 'stores'];

// firebase-admin nằm trong functions/node_modules (giống migrate script), firebase-tools ở root.
const ADMIN_ROOT = path.join(REPO_ROOT, 'functions', 'node_modules', 'firebase-admin');
const admin = require(ADMIN_ROOT);
const { getFirestore } = require(path.join(ADMIN_ROOT, 'lib', 'firestore'));

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
    } catch { return null; }
    if (!refreshToken) return null;
    let api;
    try { api = require(path.join(REPO_ROOT, 'node_modules', 'firebase-tools', 'lib', 'api.js')); }
    catch { return null; }
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
    try { fs.rmSync(path.dirname(tempAdcPath), { recursive: true, force: true }); } catch { /* ignore */ }
    tempAdcPath = null;
};
process.on('exit', cleanupTempAdc);
process.on('SIGINT', () => { cleanupTempAdc(); process.exit(130); });

const initDb = () => {
    let projectId = 'dashboa-7e20b';
    const rcPath = path.join(REPO_ROOT, '.firebaserc');
    if (fs.existsSync(rcPath)) {
        try {
            const rc = JSON.parse(fs.readFileSync(rcPath, 'utf8'));
            if (rc.projects && rc.projects.default) projectId = rc.projects.default;
        } catch { /* ignore */ }
    }
    if (!process.env.GOOGLE_APPLICATION_CREDENTIALS &&
        !fs.existsSync(path.join(os.homedir(), '.config', 'gcloud', 'application_default_credentials.json'))) {
        const file = adcFromFirebaseCli();
        if (file) process.env.GOOGLE_APPLICATION_CREDENTIALS = file;
    }
    const app = admin.initializeApp({ credential: admin.credential.applicationDefault(), projectId });
    return getFirestore(app, TARGET_DB_ID);
};

/** Xoá đệ quy toàn bộ document + subcollection của một collection. Đếm số doc chạm tới. */
async function wipeCollection(colRef, stats, isDryRun) {
    const snap = await colRef.get();
    for (const doc of snap.docs) {
        // Xoá subcollection trước (Firestore không tự xoá theo cha).
        const subs = await doc.ref.listCollections();
        for (const sub of subs) await wipeCollection(sub, stats, isDryRun);
        stats.docs++;
        stats.paths.push(doc.ref.path);
        if (!isDryRun) await doc.ref.delete();
    }
}

async function main() {
    console.log('='.repeat(70));
    console.log('DỌN COLLECTION STICKER TRÊN (default) TRƯỚC KHI DI TRÚ');
    console.log('  Chế độ:', IS_DRY_RUN ? 'DRY-RUN (chỉ đếm, KHÔNG xoá)' : 'EXECUTE (XOÁ THẬT)');
    console.log('  Chỉ đụng:', COLLECTIONS_TO_WIPE.join(', '));
    console.log('='.repeat(70));

    let db;
    try { db = initDb(); }
    catch (err) { console.error('❌ Không xác thực được Firebase:', err.message); process.exit(1); }

    const stats = { docs: 0, paths: [] };
    try {
        for (const colName of COLLECTIONS_TO_WIPE) {
            console.log(`\n[${colName}] đang quét...`);
            await wipeCollection(db.collection(colName), stats, IS_DRY_RUN);
        }
    } catch (err) {
        console.error('❌ Lỗi khi dọn:', err.message);
        process.exit(1);
    }

    console.log('\n' + '='.repeat(70));
    console.log((IS_DRY_RUN ? '👉 SẼ xoá' : '✅ ĐÃ xoá') + ` ${stats.docs} document:`);
    for (const p of stats.paths) console.log('   - ' + p);
    if (stats.docs === 0) console.log('   (không có gì để xoá — 2 collection đang trống)');
    if (IS_DRY_RUN && stats.docs > 0) console.log('\n   Để xoá thật: thêm cờ --execute');
    console.log('='.repeat(70));
}

main().catch(e => { console.error('Lỗi ngoài dự kiến:', e); process.exit(1); });
