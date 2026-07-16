import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { db, auth } from './firebaseAdmin';
import { notifyAdminsAndManagers } from './notifications';

// Chỉ tồn tại phía server — không còn hardcode trong bundle client (xem
// contexts/AuthContext.tsx bản cũ, dòng ~94).
const SUPER_ADMIN_EMAIL = 'lts.truongson@gmail.com';

type Role = 'admin' | 'manager' | 'employee' | 'pending';
type Status = 'pending' | 'approved' | 'rejected' | 'new' | 'expired';

interface SessionProfile {
  role: Role;
  status: Status;
  departmentId: string | null;
  employeeName: string | null;
  expiresAt: string | null;
}

// Thay thế toàn bộ khối đọc/ghi Firestore trực tiếp trong
// contexts/AuthContext.tsx (onAuthStateChanged). Client gọi hàm này 1 lần
// sau khi Firebase Auth xác nhận đăng nhập, rồi force-refresh ID token để
// nhận custom claims mới (user.getIdToken(true)).
export const resolveSession = onCall(async (request) => {
  const uid = request.auth?.uid;
  const email = request.auth?.token.email ?? null;
  if (!uid) {
    throw new HttpsError('unauthenticated', 'Cần đăng nhập trước khi gọi resolveSession.');
  }

  const userRef = db.collection('users').doc(uid);
  const snap = await userRef.get();

  let role: Role;
  let status: Status;
  let departmentId: string | null;
  let employeeName: string | null = null;
  let expiresAt: Timestamp | null = null;

  if (!snap.exists) {
    const isSuperAdmin = email === SUPER_ADMIN_EMAIL;
    role = isSuperAdmin ? 'admin' : 'pending';
    status = isSuperAdmin ? 'approved' : 'new';
    departmentId = isSuperAdmin ? 'ALL (Super Admin)' : null;

    await userRef.set({
      uid,
      email,
      displayName: request.auth?.token.name ?? null,
      photoURL: request.auth?.token.picture ?? null,
      role,
      status,
      departmentId: departmentId ?? '',
      createdAt: FieldValue.serverTimestamp(),
      lastLogin: FieldValue.serverTimestamp(),
      loginCount: 1,
    });
  } else {
    const data = snap.data() ?? {};
    role = (data.role as Role) ?? 'pending';
    status = (data.status as Status) ?? (role === 'pending' ? 'new' : 'approved');
    departmentId = (data.departmentId as string) ?? null;
    employeeName = (data.employeeName as string) ?? null;
    expiresAt = data.expiresAt instanceof Timestamp ? data.expiresAt : null;

    const updates: Record<string, unknown> = {
      lastLogin: FieldValue.serverTimestamp(),
      loginCount: FieldValue.increment(1),
    };

    if (email === SUPER_ADMIN_EMAIL) {
      // Tự sửa lại nếu ai đó lỡ hạ quyền — port nguyên vẹn logic cũ.
      role = 'admin';
      status = 'approved';
      departmentId = 'ALL (Super Admin)';
      updates.role = role;
      updates.status = status;
      updates.departmentId = departmentId;
    } else if (expiresAt && expiresAt.toDate() < new Date() && role !== 'pending') {
      role = 'pending';
      status = 'expired';
      updates.role = role;
      updates.status = status;
    }

    await userRef.update(updates);
  }

  await auth.setCustomUserClaims(uid, { role, departmentId: departmentId ?? null });

  const profile: SessionProfile = {
    role,
    status,
    departmentId,
    employeeName,
    expiresAt: expiresAt ? expiresAt.toDate().toISOString() : null,
  };
  return profile;
});

// Thay thế contexts/AuthContext.tsx requestAccess() — chỉ được set role
// về 'pending' cho CHÍNH người gọi, không thể tự nâng quyền.
export const requestAccess = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError('unauthenticated', 'Cần đăng nhập trước khi gửi yêu cầu truy cập.');
  }

  const { requestedRole, departmentId, employeeName } = (request.data ?? {}) as {
    requestedRole?: 'manager' | 'employee';
    departmentId?: string;
    employeeName?: string;
  };

  if (requestedRole !== 'manager' && requestedRole !== 'employee') {
    throw new HttpsError('invalid-argument', 'requestedRole phải là "manager" hoặc "employee".');
  }
  if (!departmentId) {
    throw new HttpsError('invalid-argument', 'Thiếu departmentId.');
  }

  const userRef = db.collection('users').doc(uid);
  await userRef.update({
    role: 'pending',
    status: 'pending',
    requestedRole,
    departmentId,
    employeeName: employeeName ?? '',
    requestDate: FieldValue.serverTimestamp(),
  });

  await notifyAdminsAndManagers(departmentId, {
    title: 'Đăng ký vào Kho mới',
    message: `${request.auth?.token.name ?? request.auth?.token.email ?? 'Một người dùng'} vừa đăng ký truy cập mã Kho gốc: ${departmentId}.`,
    type: 'info',
  });

  return { success: true };
});

// Lưới an toàn bổ sung (mục 5.5 trong implementation_plan.md) — phòng
// trường hợp user hết hạn không đăng nhập lại qua client để trigger
// resolveSession. Chạy 1 lần/ngày qua Cloud Scheduler.
export const demoteExpiredUsers = onSchedule('every 24 hours', async () => {
  const now = Timestamp.now();
  const snap = await db.collection('users').where('expiresAt', '<', now).get();

  const batch = db.batch();
  let count = 0;
  for (const docSnap of snap.docs) {
    const role = docSnap.get('role');
    if (role === 'pending' || role === 'admin') continue;
    batch.update(docSnap.ref, { role: 'pending', status: 'expired' });
    await auth.setCustomUserClaims(docSnap.id, { role: 'pending', departmentId: null });
    count += 1;
  }
  if (count > 0) {
    await batch.commit();
  }
});
