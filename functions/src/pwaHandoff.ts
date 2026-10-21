import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { createHash } from 'node:crypto';
import { Timestamp } from 'firebase-admin/firestore';
import { db, auth as adminAuth } from './firebaseAdmin';
import { CLIENT_REGIONS } from './region';
import { giaiQuyetPhien, type SessionProfile } from './session';

/**
 * Chuyển phiên đăng nhập Google vào app ở MÀN HÌNH CHÍNH iPhone (PWA standalone) — 2026-10-12.
 *
 * Vì sao cần: trên iOS, app ở Màn hình chính mở trang Google trong một khung trình duyệt RIÊNG
 * (bộ nhớ tách khỏi app). `signInWithRedirect` lưu kết quả trong bộ nhớ của khung đó, quay về app
 * thì `getRedirectResult` không thấy gì → kẹt ở màn đăng nhập (chủ dự án quay video 2026-10-12).
 *
 * Luồng (giống "device code" + PKCE):
 *  1. App sinh `verifier` ngẫu nhiên, giữ trong localStorage, mở
 *     `https://auth.dashboard.pro.vn/pwa-login.html#c=<sha256(verifier)>` (thư mục `auth-hosting/`).
 *  2. Trang đó cùng origin với authDomain nên đăng nhập redirect chạy bình thường; xong gọi
 *     `pwaHandoffStore({ code, idToken, accessToken })` (BẮT BUỘC đã đăng nhập).
 *  3. App gọi `pwaHandoffClaim({ verifier })` → nhận lại Google idToken/accessToken (1 lần, rồi xoá)
 *     → `signInWithCredential`. Không cần ký custom token (đỡ phụ thuộc quyền IAM signBlob).
 *
 * Chỉ người cầm `verifier` (chính app đã sinh mã) mới lấy được phiên; URL chỉ chứa băm của nó.
 * Collection `pwaHandoff` khoá hẳn với client trong `firestore.rules`.
 */

const TTL_MS = 5 * 60 * 1000;
const B64URL = /^[A-Za-z0-9_-]{43}$/; // 32 byte base64url, không padding

const hashVerifier = (verifier: string): string =>
  createHash('sha256').update(verifier).digest('base64url');

export const pwaHandoffStore = onCall({ region: CLIENT_REGIONS }, async (request) => {
  const { code, idToken, accessToken, warmup, diag } = (request.data ?? {}) as {
    code?: string; idToken?: string; accessToken?: string; warmup?: boolean; diag?: unknown;
  };
  // Gọi "hâm nóng" (2026-10-13): app/trang đăng nhập gọi trước trong lúc người dùng còn ở trang Google, để lượt
  // gửi phiên thật không phải chờ khởi động nguội (~6 s trong video chủ dự án quay). Không đọc/ghi gì.
  // `diag` (2026-10-21): trang đăng nhập báo bước bị kẹt/lỗi (không chứa token) — để lần sau đọc log là biết máy nào kẹt ở đâu.
  if (warmup === true) {
    if (diag && typeof diag === 'object') console.warn('[pwa-login diag]', JSON.stringify(diag).slice(0, 600));
    return { ok: true, warm: true };
  }
  let uid = request.auth?.uid;
  let tokenInfo: { email?: string | null; name?: string | null; picture?: string | null } | undefined = request.auth?.token;
  if (!uid && typeof idToken === 'string' && idToken.length >= 20) {
    try {
      const decoded = await adminAuth.verifyIdToken(idToken);
      uid = decoded.uid;
      tokenInfo = decoded;
    } catch (err) {
      console.warn('[pwaHandoffStore] verifyIdToken fallback failed:', err);
    }
  }
  if (!uid) {
    throw new HttpsError('unauthenticated', 'Cần đăng nhập Google trước.');
  }
  if (typeof code !== 'string' || !B64URL.test(code)) {
    throw new HttpsError('invalid-argument', 'Mã chuyển phiên không hợp lệ.');
  }
  if (typeof idToken !== 'string' || idToken.length < 20 || idToken.length > 8000) {
    throw new HttpsError('invalid-argument', 'Thiếu thông tin đăng nhập Google.');
  }
  const ref = db.collection('pwaHandoff').doc(code);
  const now = Date.now();
  // Tính SẴN phiên (quyền/Kho/claims — y hệt resolveSession) SONG SONG với lưu phiên (2026-10-21): app nhận kèm qua
  // pwaHandoffClaim nên khỏi gọi resolveSession sau khi vào. Lỗi thì bỏ qua — app tự gọi resolveSession như cũ.
  const hoSoP: Promise<SessionProfile | null> = giaiQuyetPhien(uid, tokenInfo ?? {}).catch((err) => {
    console.warn('[pwaHandoffStore] Tính sẵn phiên lỗi (app sẽ tự gọi resolveSession):', err);
    return null;
  });
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    // Không cho ghi đè mã của người khác còn hạn.
    // Dùng `uid` (đã xác minh ở trên) chứ không phải request.auth!.uid: khi yêu cầu không kèm phiên Firebase
    // (đi nhánh verifyIdToken dự phòng) thì request.auth là undefined → trước đây văng TypeError = lỗi "internal".
    if (snap.exists && snap.get('uid') !== uid
        && (snap.get('expiresAt') as Timestamp).toMillis() > now) {
      throw new HttpsError('already-exists', 'Mã chuyển phiên đã được dùng.');
    }
    tx.set(ref, {
      uid,
      idToken,
      accessToken: typeof accessToken === 'string' ? accessToken.slice(0, 4000) : null,
      createdAt: Timestamp.fromMillis(now),
      expiresAt: Timestamp.fromMillis(now + TTL_MS),
    });
  });
  const hoSo = await hoSoP;
  if (hoSo) await ref.update({ profile: hoSo }).catch(() => { /* thiếu hồ sơ: app tự gọi resolveSession */ });
  return { ok: true };
});

export const pwaHandoffClaim = onCall({ region: CLIENT_REGIONS }, async (request) => {
  const { verifier, warmup } = (request.data ?? {}) as { verifier?: string; warmup?: boolean };
  // Hâm nóng (2026-10-21): app gọi lúc người dùng BẤM đăng nhập — log 14–21/10 cho thấy gần như mọi lượt nhận phiên thật đều gặp
  // khởi động nguội (hàm tự tắt khi vắng) đúng lúc người dùng vừa quay về app. Không đọc/ghi gì.
  if (warmup === true) return { ready: false, warm: true };
  if (typeof verifier !== 'string' || !B64URL.test(verifier)) {
    throw new HttpsError('invalid-argument', 'Mã chuyển phiên không hợp lệ.');
  }
  const ref = db.collection('pwaHandoff').doc(hashVerifier(verifier));
  const data = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return null;
    tx.delete(ref);
    return snap.data()!;
  });
  // Chưa đăng nhập xong bên trang kia: trả rỗng để app hỏi lại sau, không phải lỗi.
  if (!data) return { ready: false };
  if ((data.expiresAt as Timestamp).toMillis() < Date.now()) {
    throw new HttpsError('deadline-exceeded', 'Phiên đăng nhập đã quá 5 phút. Vui lòng đăng nhập lại.');
  }
  return {
    ready: true,
    idToken: data.idToken as string,
    accessToken: (data.accessToken as string | null) ?? null,
    // Phiên đã tính sẵn lúc gửi (pwaHandoffStore) — kèm uid để app chỉ dùng cho ĐÚNG tài khoản vừa vào.
    uid: data.uid as string,
    profile: (data.profile as SessionProfile | undefined) ?? null,
  };
});
