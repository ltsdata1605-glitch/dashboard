#!/usr/bin/env node
/**
 * Di trú bí mật Bot LINE: line_bots/{uid}.{channelAccessToken, channelSecret, pmhRelayToken}
 *                          → line_bot_secrets/{uid}   (audit S13/S14/B3, 2026-10-08)
 *
 * KHÔNG BAO GIỜ in giá trị bí mật — chỉ in độ dài / có-không / khớp-không.
 *
 *   (mặc định)  DRY-RUN: chỉ báo cáo, không ghi gì.
 *   --apply     SAO CHÉP vào line_bot_secrets + ghi cờ hasToken/hasSecret vào line_bots. Không xoá gì ở line_bots.
 *               Không ghi đè bí mật đã khác ở line_bot_secrets (báo xung đột, bỏ qua).
 *   --strip     (S5) XOÁ 3 field bí mật khỏi line_bots — chỉ khi line_bot_secrets đã có giá trị GIỐNG HỆT.
 *               Bot không khớp thì giữ nguyên và báo.
 *   --force     (kèm --strip) xoá dù khác nhau, coi line_bot_secrets là nguồn đúng (dùng khi tab giao diện cũ
 *               ghi lại bản cũ vào line_bots). Vẫn đòi line_bot_secrets có đủ giá trị.
 *
 * Xác thực: Application Default Credentials (GOOGLE_APPLICATION_CREDENTIALS hoặc gcloud ADC).
 *     cd functions && node scripts/migrate-line-secrets.cjs [--apply|--strip] [--project dashboa-7e20b]
 */
'use strict';
const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

const KEYS = ['channelAccessToken', 'channelSecret', 'pmhRelayToken'];
const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const STRIP = args.includes('--strip');
const FORCE = args.includes('--force');
const projIdx = args.indexOf('--project');
const PROJECT = projIdx >= 0 ? args[projIdx + 1] : 'dashboa-7e20b';
if (APPLY && STRIP) { console.error('Chọn một: --apply hoặc --strip'); process.exit(2); }

initializeApp({ credential: applicationDefault(), projectId: PROJECT });
const db = getFirestore();
const nonEmpty = (v) => typeof v === 'string' && v.trim() !== '';

(async () => {
  const mode = STRIP ? 'STRIP (xoá field cũ)' : APPLY ? 'APPLY (sao chép)' : 'DRY-RUN';
  console.log(`[migrate-line-secrets] project=${PROJECT} chế độ=${mode}`);
  const snap = await db.collection('line_bots').get();
  const stat = { bots: snap.size, withSecrets: 0, copied: 0, alreadySame: 0, conflict: 0, stripped: 0, stripSkipped: 0 };
  for (const d of snap.docs) {
    const data = d.data();
    const legacy = {};
    for (const k of KEYS) if (nonEmpty(data[k])) legacy[k] = data[k].trim();
    const secRef = db.collection('line_bot_secrets').doc(d.id);
    const secSnap = await secRef.get();
    const sec = secSnap.exists ? secSnap.data() : {};
    const hasLegacy = Object.keys(legacy).length > 0;
    if (!hasLegacy && !secSnap.exists) continue;
    stat.withSecrets++;
    const desc = KEYS.map((k) => `${k}: cũ=${legacy[k] ? legacy[k].length + 'ký tự' : '-'} mới=${nonEmpty(sec[k]) ? 'có' : '-'}`).join(' | ');
    console.log(`- bot ${d.id} (Kho ${data.departmentId || '?'}): ${desc}`);

    if (STRIP) {
      const strippable = KEYS.filter((k) => k in data);
      if (strippable.length === 0) continue;
      const allSame = strippable.every((k) => !nonEmpty(data[k]) || (nonEmpty(sec[k]) && (FORCE || sec[k] === data[k].trim())));
      if (!allSame) { stat.stripSkipped++; console.log('    ⚠ KHÔNG xoá: line_bot_secrets chưa khớp field cũ'); continue; }
      const upd = {};
      for (const k of strippable) upd[k] = FieldValue.delete();
      upd.hasToken = nonEmpty(sec.channelAccessToken);
      upd.hasSecret = nonEmpty(sec.channelSecret);
      await d.ref.update(upd);
      stat.stripped++;
      continue;
    }

    const toWrite = {};
    let conflict = false;
    for (const k of KEYS) {
      if (!legacy[k]) continue;
      if (nonEmpty(sec[k]) && sec[k] !== legacy[k]) { conflict = true; console.log(`    ⚠ XUNG ĐỘT ${k}: bản mới khác bản cũ — giữ bản mới, bỏ qua`); continue; }
      if (!nonEmpty(sec[k])) toWrite[k] = legacy[k];
    }
    if (conflict) stat.conflict++;
    if (Object.keys(toWrite).length === 0) { stat.alreadySame++; }
    else if (APPLY) { await secRef.set(toWrite, { merge: true }); stat.copied++; }
    else stat.copied++; // dry-run: đếm số bot SẼ được sao chép
    if (APPLY) {
      await d.ref.set({ hasToken: nonEmpty(sec.channelAccessToken) || Boolean(legacy.channelAccessToken), hasSecret: nonEmpty(sec.channelSecret) || Boolean(legacy.channelSecret) }, { merge: true });
    }
  }
  console.log('[migrate-line-secrets] tổng kết:', JSON.stringify(stat));
  if (!APPLY && !STRIP) console.log('(dry-run: chưa ghi gì. Thêm --apply để sao chép.)');
})().catch((e) => { console.error('LỖI:', e.message); process.exit(1); });
