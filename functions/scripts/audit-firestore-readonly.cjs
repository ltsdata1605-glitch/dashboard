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

const initFirestore = () => {
    admin.initializeApp({ credential: admin.credential.applicationDefault() });
    defaultDb = admin.firestore();
    stickerDb = admin.firestore(admin.app(), STICKER_DB_ID);
};

const fmt = (n) => n.toLocaleString('vi-VN');

const countOf = async (query) => {
    const snap = await query.count().get();
    return snap.data().count;
};

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
    initFirestore();

    console.log('='.repeat(78));
    console.log('KHẢO SÁT FIRESTORE — CHỈ ĐỌC');
    console.log(`  database mặc định : (default)`);
    console.log(`  database In Sticker: ${STICKER_DB_ID}`);
    console.log(`  mức chạy          : ${WANT_DEEP ? 'aggregation + uid + deep' : WANT_USERS ? 'aggregation + uid' : 'aggregation (an toàn)'}`);
    console.log('='.repeat(78));

    // ── PHẦN 1: đếm bằng aggregation (rẻ) ────────────────────────────────────
    console.log('\n[1] SỐ LƯỢNG DOCUMENT (dùng aggregation, gần như không tốn hạn mức)\n');

    const defaultUsers = await countOf(defaultDb.collection('users'));
    const stickerUsers = await countOf(stickerDb.collection('users'));
    console.log(`  users @ (default)   : ${fmt(defaultUsers)}`);
    console.log(`  users @ In Sticker  : ${fmt(stickerUsers)}`);

    // `listDocuments()` trả về cả document "ảo" (không tồn tại nhưng có subcollection) — đúng
    // trường hợp stores/{storeId} ở đây, vì code chỉ ghi vào subcollection chứ không tạo doc cha.
    const storeRefs = await stickerDb.collection('stores').listDocuments();
    console.log(`\n  Số kho trong 'stores': ${fmt(storeRefs.length)}\n`);

    const SUB = ['savedLists', 'productChunks', 'inventoryChunks', 'manualProducts'];
    const totals = Object.fromEntries(SUB.map((s) => [s, 0]));
    let totalListsMissingAuthUid = 0;
    let totalSavedLists = 0;
    const perStore = [];

    for (const storeRef of storeRefs) {
        const row = { store: storeRef.id };
        for (const sub of SUB) {
            row[sub] = await countOf(storeRef.collection(sub));
            totals[sub] += row[sub];
        }
        // Câu hỏi 2 (phần rẻ): bao nhiêu danh sách THIẾU authUid.
        const withAuthUid = row.savedLists > 0 ? await countWithField(storeRef.collection('savedLists'), 'authUid') : 0;
        row.missingAuthUid = row.savedLists - withAuthUid;
        totalSavedLists += row.savedLists;
        totalListsMissingAuthUid += row.missingAuthUid;
        perStore.push(row);
    }

    perStore.sort((a, b) => b.savedLists - a.savedLists);
    console.log('  Kho                       savedLists  thiếu authUid  productChunks  inventoryChunks  manualProducts');
    console.log('  ' + '-'.repeat(100));
    for (const r of perStore) {
        console.log(
            '  ' + r.store.padEnd(24) +
            String(r.savedLists).padStart(11) +
            String(r.missingAuthUid).padStart(15) +
            String(r.productChunks).padStart(15) +
            String(r.inventoryChunks).padStart(17) +
            String(r.manualProducts).padStart(16)
        );
    }
    console.log('  ' + '-'.repeat(100));
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

    const maxLists = perStore.length > 0 ? perStore[0].savedLists : 0;
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

    const migrationDocs = totals.savedLists + totals.productChunks + totals.inventoryChunks + totals.manualProducts + stickerUsers;
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

    console.log('\nXong. Script này KHÔNG ghi bất cứ thứ gì.\n');
}

main().catch((err) => {
    console.error('\nLỖI:', err && err.message ? err.message : err);
    const msg = String(err && err.message ? err.message : err);
    if (/Could not load the default credentials|Failed to read credentials|invalid-credential/i.test(msg)) {
        console.error('\nChưa có thông tin đăng nhập. Chạy một trong hai:');
        console.error('  gcloud auth application-default login');
        console.error('  export GOOGLE_APPLICATION_CREDENTIALS=/duong/dan/service-account.json');
    }
    process.exit(1);
});
