import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { FieldValue } from 'firebase-admin/firestore';
import { auth, stickerDb } from './firebaseAdmin';

// Cùng danh sách username/email được coi là Super Admin như bản client cũ
// (features/sticker-event/StickerEventApp.tsx) — chuyển hẳn logic này vào
// server, client không còn tự quyết được quyền superadmin của chính mình nữa.
const SUPERADMIN_USERNAMES = ['admin', '21707'];
const SUPERADMIN_EMAILS = ['lts.truongson@gmail.com', 'lts.truongson@example.com', 'admin@example.com'];

type StickerRole = 'admin' | 'staff';
type StickerClaimRole = StickerRole | 'superadmin';

function isSuperAdminIdentity(username: string | undefined, email: string | null | undefined): boolean {
  if (username && SUPERADMIN_USERNAMES.includes(username)) return true;
  if (email && SUPERADMIN_EMAILS.includes(email)) return true;
  return false;
}

// Custom claims dùng namespace riêng `stickerRole`/`stickerStoreId` — KHÔNG
// dùng lại `role`/`departmentId` của root, vì setCustomUserClaims() ghi đè
// toàn bộ claims (không merge). Cùng 1 Auth user pool (project chung) nên
// tránh khả năng 2 hệ thống đè claim của nhau nếu có ngày trùng UID.
async function setStickerClaims(uid: string, role: StickerClaimRole, storeId: string | null) {
  await auth.setCustomUserClaims(uid, { stickerRole: role, stickerStoreId: storeId });
}

// Thay Login.tsx tự setDoc(role, storeId) do client chọn — server tự kiểm tra
// điều kiện "kho đã có admin chưa" thay vì tin client đã kiểm tra đúng.
export const stickerRegister = onCall(async (request) => {
  const uid = request.auth?.uid;
  const email = request.auth?.token.email ?? null;
  if (!uid) {
    throw new HttpsError('unauthenticated', 'Cần đăng nhập trước khi đăng ký.');
  }

  const { username, storeId, requestedRole } = (request.data ?? {}) as {
    username?: string;
    storeId?: string;
    requestedRole?: StickerRole;
  };

  if (!username || (requestedRole !== 'admin' && requestedRole !== 'staff')) {
    throw new HttpsError('invalid-argument', 'Thiếu username hoặc vai trò không hợp lệ.');
  }

  let cleanStoreId = (storeId ?? '').trim().toUpperCase();
  if (!cleanStoreId && (username === '21707' || username === 'admin')) {
    cleanStoreId = 'SUPERADMIN';
  }
  if (!cleanStoreId) {
    throw new HttpsError('invalid-argument', 'Vui lòng nhập mã kho siêu thị.');
  }

  const usersRef = stickerDb.collection('users');
  const adminSnap = await usersRef
    .where('storeId', '==', cleanStoreId)
    .where('role', '==', 'admin')
    .limit(1)
    .get();

  if (requestedRole === 'admin') {
    if (!adminSnap.empty) {
      throw new HttpsError(
        'already-exists',
        `Mã kho "${cleanStoreId}" đã có quản trị viên. Mỗi mã kho chỉ được có 1 tài khoản Admin duy nhất.`
      );
    }
  } else if (adminSnap.empty) {
    throw new HttpsError(
      'failed-precondition',
      'Mã kho chưa được khởi tạo. Cần Admin đăng ký cho kho này trước khi Nhân viên đăng ký vào.'
    );
  }

  await usersRef.doc(uid).set(
    {
      uid,
      username,
      email,
      role: requestedRole,
      storeId: cleanStoreId,
      createdAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  const claimRole: StickerClaimRole = isSuperAdminIdentity(username, email) ? 'superadmin' : requestedRole;
  await setStickerClaims(uid, claimRole, cleanStoreId);

  // storeHasAdmin: đăng ký admin vừa tạo ra admin (true); đăng ký staff chỉ tới được đây khi
  // adminSnap đã KHÔNG rỗng ở trên (else throw failed-precondition) — nên cũng luôn là true.
  return { role: requestedRole, storeId: cleanStoreId, username, storeHasAdmin: true };
});

// Thay việc Login.tsx đọc thẳng users/{uid} trong onAuthStateChanged — gọi mỗi
// lần đăng nhập để đồng bộ lại custom claims theo dữ liệu Firestore mới nhất
// (vd: admin vừa đổi role cho user này trong lúc họ không online).
export const stickerResolveSession = onCall(async (request) => {
  const uid = request.auth?.uid;
  const email = request.auth?.token.email ?? null;
  if (!uid) {
    throw new HttpsError('unauthenticated', 'Cần đăng nhập.');
  }

  const snap = await stickerDb.collection('users').doc(uid).get();
  if (!snap.exists) {
    throw new HttpsError('not-found', 'Chưa có hồ sơ người dùng. Vui lòng đăng ký trước.');
  }

  const data = snap.data() ?? {};
  const username = data.username as string | undefined;
  const role = (data.role as StickerRole) ?? 'staff';
  const storeId = (data.storeId as string) ?? null;

  const claimRole: StickerClaimRole = isSuperAdminIdentity(username, email) ? 'superadmin' : role;
  await setStickerClaims(uid, claimRole, storeId);

  // storeHasAdmin: trước đây client (useStickerEventDb.ts) tự query trực tiếp
  // collection('users') để kiểm tra "kho này đã có admin chưa" cho tài khoản staff — nhưng
  // firestore.stickerevent.rules chỉ cho phép admin/superadmin `list` trên users, nên staff
  // gọi thẳng luôn bị chặn "Missing or insufficient permissions". Tính sẵn ở đây (Admin SDK,
  // không qua Rules) và trả về cùng lúc đăng nhập, client không cần tự query nữa.
  let storeHasAdmin = true;
  if (role === 'staff' && storeId) {
    const adminSnap = await stickerDb.collection('users')
      .where('storeId', '==', storeId)
      .where('role', '==', 'admin')
      .limit(1)
      .get();
    storeHasAdmin = !adminSnap.empty;
  }

  return { role, storeId, username: username ?? null, storeHasAdmin };
});

interface StickerAdminUpdateInput {
  action: 'setRole' | 'delete' | 'clearStore';
  targetUid?: string;
  role?: StickerRole;
  storeId?: string;
}

// Thay updateUserRole/deleteUserDoc/clearAllUsers (firebaseService.ts) — ghi
// trực tiếp từ client trước đây không hề kiểm tra target có cùng storeId với
// admin gọi hay không (lỗ hổng cross-tenant). superadmin (claim, không phải
// tự nhận ở client) mới được bỏ qua ràng buộc storeId.
export const stickerAdminUpdateUser = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Cần đăng nhập.');
  }
  const callerRole = request.auth.token.stickerRole as StickerClaimRole | undefined;
  const callerStoreId = request.auth.token.stickerStoreId as string | null | undefined;
  if (callerRole !== 'admin' && callerRole !== 'superadmin') {
    throw new HttpsError('permission-denied', 'Chỉ Admin/Super Admin được thực hiện thao tác này.');
  }

  const { action, targetUid, role, storeId } = (request.data ?? {}) as StickerAdminUpdateInput;
  const usersRef = stickerDb.collection('users');

  if (action === 'clearStore') {
    const targetStoreId = (storeId ?? '').trim().toUpperCase();
    if (!targetStoreId) {
      throw new HttpsError('invalid-argument', 'Thiếu storeId.');
    }
    if (callerRole !== 'superadmin' && targetStoreId !== callerStoreId) {
      throw new HttpsError('permission-denied', 'Chỉ được xoá dữ liệu người dùng của chính kho mình.');
    }

    const snap = await usersRef.where('storeId', '==', targetStoreId).limit(300).get();
    const batch = stickerDb.batch();
    let count = 0;
    for (const docSnap of snap.docs) {
      if (docSnap.get('username') === 'admin') continue;
      batch.delete(docSnap.ref);
      count++;
    }
    if (count > 0) {
      await batch.commit();
    }
    return { success: true, deletedCount: count };
  }

  if (!targetUid) {
    throw new HttpsError('invalid-argument', 'Thiếu targetUid.');
  }
  if (targetUid === request.auth.uid) {
    throw new HttpsError('permission-denied', 'Không thể tự thay đổi/xoá chính mình.');
  }

  const targetSnap = await usersRef.doc(targetUid).get();
  if (!targetSnap.exists) {
    throw new HttpsError('not-found', 'Không tìm thấy người dùng.');
  }
  const targetData = targetSnap.data()!;
  if (targetData.username === 'admin') {
    throw new HttpsError('permission-denied', 'Không thể thao tác trên tài khoản Super Admin.');
  }
  if (callerRole !== 'superadmin' && targetData.storeId !== callerStoreId) {
    throw new HttpsError('permission-denied', 'Chỉ được thao tác trên người dùng cùng kho.');
  }

  if (action === 'setRole') {
    if (role !== 'admin' && role !== 'staff') {
      throw new HttpsError('invalid-argument', 'role không hợp lệ.');
    }
    await usersRef.doc(targetUid).update({ role });
    await setStickerClaims(targetUid, role, (targetData.storeId as string) ?? null);
    return { success: true };
  }

  if (action === 'delete') {
    // Chỉ xoá doc Firestore, giữ nguyên hạn chế đã có từ trước (không xoá
    // Firebase Auth account — UserManagementModal.tsx đã ghi rõ điều này).
    await usersRef.doc(targetUid).delete();
    return { success: true };
  }

  throw new HttpsError('invalid-argument', 'action không hợp lệ.');
});
