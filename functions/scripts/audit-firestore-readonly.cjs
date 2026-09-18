#!/usr/bin/env node
/**
 * Khảo sát Firestore — CHỈ ĐỌC, KHÔNG BAO GIỜ GHI.
 *
 * Trả lời các câu hỏi đang chặn 3 việc còn treo của đợt audit hạn mức Firestore 2026-09-17
 * (xem implementation_plan.md mục "Audit hạn mức đọc/ghi Firestore"):
 *
 *  1. Mỗi kho có bao nhiêu danh sách đã lưu? → quyết định mục 3b (phân trang) có đáng làm tiếp
 *     không. Kho chỉ vài chục danh sách thì phân trang gần như không tiết kiệm gì.
 *  2. Bao nhiêu document trong `stores/*&#47;savedLists` THIẾU field `authUid`, và có document nào
 *     lệch hoa thường giữa `userId` với định danh người dùng? → chặn việc chuyển bộ lọc quyền của
 *     nhân viên sang server (`where('authUid','==',uid)`). Nếu còn nhiều danh sách di sản thiếu
 *     `authUid` thì đổi sang `where` sẽ LÀM CHÚNG BIẾN MẤT khỏi mắt nhân viên.
 *  3. Có `uid` nào tồn tại ở CẢ HAI collection `users` (database `(default)` và database In
 *     Sticker) không? → tiền đề bắt buộc của kế hoạch di trú database; trùng uid thì phải có
 *     chiến lược hợp nhất trước khi gộp 2 collection.
 *  4. Khối lượng document cần chuyển nếu di trú.
 *
 * ──────────────────────────────────────────────────────────────────────────────
 * CHI PHÍ HẠN MỨC — đọc kỹ trước khi chạy
 *
 * Database In Sticker đang CHẠM TRẦN hạn mức ĐỌC, và trần đó KHÔNG nới được dù bật thanh toán.
 * Nên script này cố ý chia làm 3 mức:
 *
 *   (mặc định)  chỉ dùng aggregation `.count()` → Firestore tính 1 lượt đọc cho mỗi 1.000 mục
 *               index khớp. Khảo sát cả project thường tốn vài chục lượt đọc. AN TOÀN.
 *   --users     thêm phần đối chiếu uid giữa 2 database → tốn 1 lượt đọc cho MỖI document user
 *               ở mỗi bên (dùng .select() không field để payload nhỏ nhất, nhưng vẫn tính phí).
 *   --deep      thêm phần soi hoa thường của `userId`/`authUid` → tốn 1 lượt đọc cho MỖI document
 *               trong `stores/*&#47;savedLists`. ĐẮT NHẤT. Chỉ chạy khi đã xem số liệu ở mức mặc
 *               định và thấy cần.
 *
 * Script LUÔN in ước tính chi phí trước khi chạy phần đắt, và hỏi xác nhận trừ khi có --yes.
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * CÁCH CHẠY (cần quyền đọc Firestore trên project — không phải việc agent tự chạy, xem CLAUDE.md
 * mục 1.1: `firebase login` thủ công bằng tài khoản Google có quyền):
 *
 *     gcloud auth application-default login        # cách 1: dùng tài khoản Google của bạn
 *     # hoặc cách 2: export GOOGLE_APPLICATION_CREDENTIALS=/duong/dan/service-account.json
 *
 *     cd functions && npm ci                       # nếu chưa cài
 *     node scripts/audit-firestore-readonly.cjs                 # mức an toàn
 *     node scripts/audit-firestore-readonly.cjs --users         # + đối chiếu uid
 *     node scripts/audit-firestore-readonly.cjs --users --deep  # + soi hoa thường
 *
 * ⚠️ TUYỆT ĐỐI KHÔNG commit file service account key vào repo (CLAUDE.md mục 0.5).
 */

'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const readline = require('node:readline');
const admin = require('firebase-admin');

// ── Tham số ───────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const WANT_USERS = argv.includes('--users');
const WANT_DEEP = argv.includes('--deep');
const AUTO_YES = argv.includes('--yes');

// ── Lấy id database In Sticker từ firebase.json (nguồn chân lý duy nhất, không chép cứng) ──
const firebaseJsonPath = path.resolve(__dirname, '..', '..', 'firebase.json');
const firebaseJson = JSON.parse(fs.readFileSync(firebaseJsonPath, 'utf8'));
const firestoreEntries = Array.isArray(firebaseJson.firestore) ? firebaseJson.firestore : [];
const stickerEntry = firestoreEntries.find((e) => e.database && e.database !== '(default)');
if (!stickerEntry) {
    console.error('Không tìm thấy database phụ nào trong firebase.json → không rõ database In Sticker. Dừng.');
    process.exit(1);
}
const STICKER_DB_ID = stickerEntry.database;

// ── Khởi tạo (chỉ đọc — script này KHÔNG gọi set/update/delete ở bất kỳ đâu) ──
//
// CỐ Ý khởi tạo bên trong hàm, KHÔNG ở top-level: `applicationDefault()` ném lỗi ngay khi chưa có
// thông tin đăng nhập, mà lỗi ném ở top-level thì nằm NGOÀI `main().catch()` — người dùng nhận
// nguyên stack trace của firebase-admin thay vì hướng dẫn đăng nhập ở cuối file. (Lỗi này gặp
// thật lúc tự chạy thử script.)
let defaultDb;
let stickerDb;

const REPO_ROOT = path.resolve(__dirname, '..', '..');

/** projectId lấy từ `.firebaserc` — nguồn chân lý của Firebase CLI, không chép cứng. */
const readProjectId = () => {
    const rcPath = path.join(REPO_ROOT, '.firebaserc');
    if (!fs.existsSync(rcPath)) return undefined;
    const rc = JSON.parse(fs.readFileSync(rcPath, 'utf8'));
    return rc && rc.projects ? rc.projects.default : undefined;
};

/**
 * Xác thực DỰ PHÒNG: dùng lại phiên đăng nhập sẵn có của Firebase CLI.
 *
 * Vì sao cần: Admin SDK mặc định tìm ADC (`~/.config/gcloud/…` hoặc GOOGLE_APPLICATION_CREDENTIALS),
 * còn `firebase login` lưu refresh token ở chỗ KHÁC (`~/.config/configstore/firebase-tools.json`).
 * Máy dev của dự án này có cái sau mà không có cái trước, và cài thêm `gcloud` chỉ để chạy 1 script
 * khảo sát là thừa.
 *
 * An toàn: refresh token chỉ được đọc vào BỘ NHỚ rồi đưa thẳng cho Admin SDK — không ghi ra file
 * nào, không in ra log, không đi vào báo cáo. `client_id`/`client_secret` đọc từ chính package
 * `firebase-tools` đã cài (2 hằng số công khai của CLI), KHÔNG hard-code vào mã nguồn — CLAUDE.md
 * mục 0.5 cấm hard-code key.
 */
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

    // Phải ghi ra FILE chứ không dùng admin.credential.refreshToken() trực tiếp: client Firestore
    // của Admin SDK từ chối credential dạng refresh token ("Must initialize the SDK with a
    // certificate credential or application default credentials") — đã thử và gặp lỗi đó thật.
    // File có đúng định dạng `authorized_user` mà `gcloud auth application-default login` sinh ra.
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

/** Xoá file ADC tạm. Gọi ở MỌI đường thoát, kể cả khi lỗi hoặc bị Ctrl-C. */
const cleanupTempAdc = () => {
    if (!tempAdcPath) return;
    try {
        fs.rmSync(path.dirname(tempAdcPath), { recursive: true, force: true });
    } catch {
        // Không chặn luồng chính vì dọn file tạm thất bại.
    }
    tempAdcPath = null;
};
process.on('exit', cleanupTempAdc);
process.on('SIGINT', () => { cleanupTempAdc(); process.exit(130); });

/**
 * Có ADC thật hay không.
 *
 * CỐ Ý kiểm bằng sự tồn tại của file, KHÔNG bằng try/catch quanh `applicationDefault()`:
 * hàm đó KHÔNG ném lỗi lúc tạo credential — nó trả về object bình thường rồi mới hỏng lúc thực sự
 * đi lấy access token, tức là quá muộn để chuyển sang nhánh dự phòng. (Gặp thật lúc chạy thử.)
 */
const hasApplicationDefaultCredentials = () => {
    const envPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (envPath && fs.existsSync(envPath)) return true;
    return fs.existsSync(path.join(os.homedir(), '.config', 'gcloud', 'application_default_credentials.json'));
};

const initFirestore = () => {
    const projectId = readProjectId();
    let credential;
    let source;

    if (hasApplicationDefaultCredentials()) {
        source = 'Application Default Credentials';
    } else {
        const file = adcFromFirebaseCli();
        if (!file) throw new Error('NO_CREDENTIALS');
        process.env.GOOGLE_APPLICATION_CREDENTIALS = file;
        source = 'phiên đăng nhập Firebase CLI (ADC tạm, xoá ngay sau khi chạy xong)';
    }
    credential = admin.credential.applicationDefault();

    console.log(`  xác thực bằng     : ${source}`);
    const app = admin.initializeApp({ credential, projectId });

    // BẮT BUỘC dùng API modular `getFirestore(app, databaseId)` của 'firebase-admin/firestore'.
    // API cũ `admin.firestore(app)` KHÔNG nhận tham số database thứ 2 — nó lặng lẽ bỏ qua và trả
    // về database `(default)`. Lần chạy đầu tôi dùng nhầm cách đó: cả 2 handle cùng trỏ `(default)`
    // nên `users` ở 2 "database" ra cùng một con số và `stores` đếm ra 0. Không có lỗi nào báo —
    // đúng loại sai số liệu nguy hiểm nhất. `functions/src/firebaseAdmin.ts` vốn đã dùng đúng cách.
    const { getFirestore } = require('firebase-admin/firestore');
    defaultDb = getFirestore(app);
    stickerDb = getFirestore(app, STICKER_DB_ID);
};

const fmt = (n) => n.toLocaleString('vi-VN');

const isQuotaError = (err) => /RESOURCE_EXHAUSTED|Quota limit exceeded/i.test(String(err && err.message ? err.message : err));

/** Đánh dấu "không đọc được vì hết hạn mức" thay vì để cả script chết. */
const QUOTA_BLOCKED = Symbol('quota-blocked');

const countOf = async (query) => {
    try {
        const snap = await query.count().get();
        return snap.data().count;
    } catch (err) {
        if (isQuotaError(err)) return QUOTA_BLOCKED;
        throw err;
    }
};

const show = (v) => (v === QUOTA_BLOCKED ? 'HẾT HẠN MỨC' : fmt(v));

/**
 * Số document CÓ field này. Mẹo: `orderBy(field)` loại bỏ document THIẾU field đó, nên
 * `total - countWithField` = số document thiếu field — mà chỉ tốn 2 lượt aggregation, thay vì
 * phải tải toàn bộ document về đếm.
 */
const countWithField = async (collRef, field) => countOf(collRef.orderBy(field));

const askYesNo = async (question) => {
    if (AUTO_YES) return true;
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const answer = await new Promise((resolve) => rl.question(`${question} [y/N] `, resolve));
    rl.close();
    return /^y(es)?$/i.test(answer.trim());
};

async function main() {
    console.log('='.repeat(78));
    console.log('KHẢO SÁT FIRESTORE — CHỈ ĐỌC');
    console.log(`  database mặc định : (default)`);
    console.log(`  database In Sticker: ${STICKER_DB_ID}`);
    console.log(`  mức chạy          : ${WANT_DEEP ? 'aggregation + uid + deep' : WANT_USERS ? 'aggregation + uid' : 'aggregation (an toàn)'}`);
    initFirestore();
    console.log('='.repeat(78));

    // ── PHẦN 1: đếm bằng aggregation (rẻ) ────────────────────────────────────
    console.log('\n[1] SỐ LƯỢNG DOCUMENT (dùng aggregation, gần như không tốn hạn mức)\n');

    const defaultUsers = await countOf(defaultDb.collection('users'));
    const stickerUsers = await countOf(stickerDb.collection('users'));
    console.log(`  users @ (default)   : ${show(defaultUsers)}`);
    console.log(`  users @ In Sticker  : ${show(stickerUsers)}`);

    if (stickerUsers === QUOTA_BLOCKED) {
        console.log('\n  ⚠️  Database In Sticker đang HẾT HẠN MỨC ĐỌC — không khảo sát được phần của nó.');
        console.log('      Đáng chú ý: database (default) vẫn đọc bình thường ở ngay trên → hai database');
        console.log('      KHÔNG dùng chung bể hạn mức. Hạn mức reset lúc 0h giờ Thái Bình Dương');
        console.log('      (khoảng 14-15h giờ Việt Nam). Chạy lại script sau mốc đó.\n');
        return;
    }

    // `listDocuments()` trả về cả document "ảo" (không tồn tại nhưng có subcollection) — đúng
    // trường hợp stores/{storeId} ở đây, vì code chỉ ghi vào subcollection chứ không tạo doc cha.
    const storeRefs = await stickerDb.collection('stores').listDocuments();
    console.log(`\n  Số kho trong 'stores': ${fmt(storeRefs.length)}\n`);

    const SUB = ['savedLists', 'productChunks', 'inventoryChunks', 'manualProducts'];
    const totals = Object.fromEntries(SUB.map((s) => [s, 0]));
    let totalListsMissingAuthUid = 0;
    let totalSavedLists = 0;
    const perStore = [];

    // Hạn mức có thể cạn GIỮA CHỪNG (một số lượt count qua được, lượt sau bị chặn) — nên phải
    // cộng dồn an toàn với giá trị QUOTA_BLOCKED và đánh dấu dòng nào không đọc đủ, thay vì để
    // phép cộng ném "Cannot convert a Symbol value to a number" và mất sạch phần đã đọc được.
    let blockedRows = 0;
    for (const storeRef of storeRefs) {
        const row = { store: storeRef.id, blocked: false };
        for (const sub of SUB) {
            const n = await countOf(storeRef.collection(sub));
            if (n === QUOTA_BLOCKED) { row.blocked = true; row[sub] = QUOTA_BLOCKED; continue; }
            row[sub] = n;
            totals[sub] += n;
        }

        // Câu hỏi 2 (phần rẻ): bao nhiêu danh sách THIẾU authUid.
        if (typeof row.savedLists === 'number' && row.savedLists > 0) {
            const withAuthUid = await countWithField(storeRef.collection('savedLists'), 'authUid');
            if (withAuthUid === QUOTA_BLOCKED) {
                row.blocked = true;
                row.missingAuthUid = QUOTA_BLOCKED;
            } else {
                row.missingAuthUid = row.savedLists - withAuthUid;
                totalListsMissingAuthUid += row.missingAuthUid;
            }
            totalSavedLists += row.savedLists;
        } else {
            row.missingAuthUid = row.blocked ? QUOTA_BLOCKED : 0;
        }

        if (row.blocked) blockedRows += 1;
        perStore.push(row);
    }

    const num = (v) => (typeof v === 'number' ? v : -1);
    perStore.sort((a, b) => num(b.savedLists) - num(a.savedLists));
    console.log('  Kho                       savedLists  thiếu authUid  productChunks  inventoryChunks  manualProducts');
    console.log('  ' + '-'.repeat(100));
    for (const r of perStore) {
        const cell = (v) => (v === QUOTA_BLOCKED ? '—' : String(v));
        console.log(
            '  ' + r.store.padEnd(24) +
            cell(r.savedLists).padStart(11) +
            cell(r.missingAuthUid).padStart(15) +
            cell(r.productChunks).padStart(15) +
            cell(r.inventoryChunks).padStart(17) +
            cell(r.manualProducts).padStart(16)
        );
    }
    console.log('  ' + '-'.repeat(100));
    if (blockedRows > 0) {
        console.log(`  ⚠️  ${blockedRows}/${perStore.length} kho đọc KHÔNG ĐỦ vì hết hạn mức (ô '—'). Số TỔNG bên dưới là THIẾU.`);
    }
    console.log(
        '  ' + 'TỔNG'.padEnd(24) +
        String(totals.savedLists).padStart(11) +
        String(totalListsMissingAuthUid).padStart(15) +
        String(totals.productChunks).padStart(15) +
        String(totals.inventoryChunks).padStart(17) +
        String(totals.manualProducts).padStart(16)
    );

    // ── Kết luận tự động cho các quyết định đang treo ────────────────────────
    console.log('\n[2] KẾT LUẬN CHO CÁC VIỆC ĐANG TREO\n');

    const maxLists = perStore.length > 0 && typeof perStore[0].savedLists === 'number' ? perStore[0].savedLists : 0;
    console.log(`  • Mục 3b (phân trang "DS đã lưu"): kho nhiều danh sách nhất có ${fmt(maxLists)} bản.`);
    if (maxLists <= 50) {
        console.log('    → Phân trang KHÔNG tiết kiệm thêm được gì (1 trang 50 đã lấy hết). Không cần làm tiếp.');
    } else {
        console.log(`    → Admin đang tiết kiệm khoảng ${fmt(Math.min(maxLists, 500) - 50)} lượt đọc mỗi lần mở panel ở kho này.`);
    }

    console.log(`\n  • Lọc quyền ở SERVER cho nhân viên: ${fmt(totalListsMissingAuthUid)}/${fmt(totalSavedLists)} danh sách THIẾU field 'authUid'.`);
    if (totalListsMissingAuthUid === 0) {
        console.log("    → AN TOÀN để chuyển sang where('authUid','==',uid): không có danh sách di sản nào bị bỏ sót.");
        console.log('    → Vẫn nên chạy --deep 1 lần để loại nốt rủi ro lệch hoa thường.');
    } else {
        console.log("    → KHÔNG an toàn để chuyển thẳng sang where('authUid','==',uid): số danh sách trên sẽ");
        console.log('      BIẾN MẤT khỏi mắt nhân viên. Phải vá dữ liệu (điền authUid) trước, hoặc giữ lọc ở client.');
    }

    const migrationDocs = totals.savedLists + totals.productChunks + totals.inventoryChunks + totals.manualProducts + (typeof stickerUsers === 'number' ? stickerUsers : 0);
    console.log(`\n  • Di trú database: khoảng ${fmt(migrationDocs)} document phải copy`);
    console.log('    (chưa tính subcollection itemChunks của danh sách lớn và các document metadata).');

    // ── PHẦN 3: đối chiếu uid (đắt hơn, phải bật cờ) ─────────────────────────
    if (WANT_USERS) {
        const cost = defaultUsers + stickerUsers;
        console.log(`\n[3] ĐỐI CHIẾU uid GIỮA 2 DATABASE — ước tính tốn ${fmt(cost)} lượt đọc.`);
        if (await askYesNo('    Tiếp tục?')) {
            const [aSnap, bSnap] = await Promise.all([
                defaultDb.collection('users').select().get(),
                stickerDb.collection('users').select().get(),
            ]);
            const aIds = new Set(aSnap.docs.map((d) => d.id));
            const overlap = bSnap.docs.map((d) => d.id).filter((id) => aIds.has(id));
            console.log(`\n    uid trùng ở CẢ HAI database: ${fmt(overlap.length)}`);
            if (overlap.length === 0) {
                console.log('    → Gộp/di trú collection users KHÔNG có xung đột document nào.');
            } else {
                console.log('    → CÓ XUNG ĐỘT. Phải có chiến lược hợp nhất trước khi di trú. Danh sách uid:');
                overlap.slice(0, 50).forEach((id) => console.log(`       - ${id}`));
                if (overlap.length > 50) console.log(`       … và ${fmt(overlap.length - 50)} uid nữa`);
            }
        } else {
            console.log('    Bỏ qua.');
        }
    } else {
        console.log('\n[3] ĐỐI CHIẾU uid: bỏ qua (thêm --users để chạy).');
    }

    // ── PHẦN 4: soi hoa thường (đắt nhất, phải bật cờ) ───────────────────────
    if (WANT_DEEP) {
        console.log(`\n[4] SOI HOA THƯỜNG userId/authUid — ước tính tốn ${fmt(totalSavedLists)} lượt đọc.`);
        if (await askYesNo('    Tiếp tục?')) {
            let checked = 0;
            let mismatchCase = 0;
            const samples = [];
            for (const storeRef of storeRefs) {
                const snap = await storeRef.collection('savedLists').select('userId', 'authUid').get();
                for (const doc of snap.docs) {
                    checked += 1;
                    const d = doc.data();
                    const userId = typeof d.userId === 'string' ? d.userId : '';
                    const authUid = typeof d.authUid === 'string' ? d.authUid : '';
                    // Rủi ro thật: userId và authUid CHỈ khác nhau ở hoa/thường. Bộ lọc client hiện
                    // tại khớp được (nó hạ hoa thường), nhưng where(...) ở server thì KHÔNG.
                    if (userId && authUid && userId !== authUid && userId.toLowerCase() === authUid.toLowerCase()) {
                        mismatchCase += 1;
                        if (samples.length < 10) samples.push(`${storeRef.id}/${doc.id}: userId='${userId}' authUid='${authUid}'`);
                    }
                }
            }
            console.log(`\n    Đã soi ${fmt(checked)} danh sách. Lệch CHỈ ở hoa/thường: ${fmt(mismatchCase)}`);
            if (mismatchCase === 0) {
                console.log('    → Không có rủi ro hoa thường.');
            } else {
                samples.forEach((s) => console.log(`       - ${s}`));
            }
        } else {
            console.log('    Bỏ qua.');
        }
    } else {
        console.log('\n[4] SOI HOA THƯỜNG: bỏ qua (thêm --deep để chạy).');
    }

    cleanupTempAdc();
    console.log('\nXong. Script này KHÔNG ghi bất cứ thứ gì lên Firestore.\n');
}

main().catch((err) => {
    cleanupTempAdc();
    console.error('\nLỖI:', err && err.message ? err.message : err);
    const msg = String(err && err.message ? err.message : err);
    if (/NO_CREDENTIALS|Could not load the default credentials|Failed to read credentials|invalid-credential/i.test(msg)) {
        console.error('\nKhông tìm thấy thông tin đăng nhập nào. Chạy MỘT trong ba:');
        console.error('  ./node_modules/.bin/firebase login      (đơn giản nhất — script tự dùng lại phiên này)');
        console.error('  gcloud auth application-default login');
        console.error('  export GOOGLE_APPLICATION_CREDENTIALS=/duong/dan/service-account.json');
    }
    process.exit(1);
});
