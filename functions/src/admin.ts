import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { db, auth } from './firebaseAdmin';
import { notifyUser } from './notifications';

type Role = 'admin' | 'manager' | 'employee' | 'pending';

interface ReviewAccessRequestInput {
  targetUid: string;
  action: 'approve' | 'reject';
  role?: Role;
  departmentId?: string;
  expiresAt?: string | null;
}

// Thay thế components/views/UserManagementView.tsx updateDoc(userRef, ...) —
// admin/manager không còn ghi trực tiếp field role/status/departmentId/
// expiresAt của user khác qua client SDK (bị Firestore Rules chặn), mà phải
// đi qua function này để được kiểm tra quyền ở server.
export const reviewAccessRequest = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Cần đăng nhập.');
  }
  const callerRole = request.auth.token.role;
  if (callerRole !== 'admin' && callerRole !== 'manager') {
    throw new HttpsError('permission-denied', 'Chỉ admin/manager được duyệt yêu cầu truy cập.');
  }

  const { targetUid, action, role, departmentId, expiresAt } = (request.data ?? {}) as ReviewAccessRequestInput;
  if (!targetUid || (action !== 'approve' && action !== 'reject')) {
    throw new HttpsError('invalid-argument', 'Thiếu targetUid hoặc action không hợp lệ.');
  }

  const targetRef = db.collection('users').doc(targetUid);
  const snap = await targetRef.get();
  if (!snap.exists) {
    throw new HttpsError('not-found', 'Không tìm thấy user cần duyệt.');
  }

  let updates: Record<string, unknown>;
  let notifyPayload: { title: string; message: string; type: 'success' | 'warning' | 'info' | 'error' };
  let finalRole: Role;
  let finalDepartmentId: string;

  if (action === 'approve') {
    finalRole = role ?? 'employee';
    if (!['admin', 'manager', 'employee'].includes(finalRole)) {
      throw new HttpsError('invalid-argument', 'role không hợp lệ.');
    }
    // Chỉ admin (không phải manager) mới được cấp quyền admin/manager cho người khác.
    if ((finalRole === 'admin' || finalRole === 'manager') && callerRole !== 'admin') {
      throw new HttpsError('permission-denied', 'Chỉ admin được cấp quyền admin/manager.');
    }
    finalDepartmentId = departmentId ?? (snap.get('departmentId') as string) ?? '';
    updates = {
      role: finalRole,
      status: 'approved',
      departmentId: finalDepartmentId,
      expiresAt: expiresAt ? Timestamp.fromDate(new Date(expiresAt)) : FieldValue.delete(),
    };
    notifyPayload = {
      title: 'Yêu cầu đã được duyệt',
      message: `Tài khoản của bạn đã được cấp quyền ${finalRole}.`,
      type: 'success',
    };
  } else {
    finalRole = 'pending';
    finalDepartmentId = (snap.get('departmentId') as string) ?? '';
    updates = { role: 'pending', status: 'rejected' };
    notifyPayload = {
      title: 'Yêu cầu bị từ chối',
      message: 'Yêu cầu truy cập của bạn đã bị từ chối.',
      type: 'warning',
    };
  }

  await targetRef.update(updates);
  await auth.setCustomUserClaims(targetUid, { role: finalRole, departmentId: finalDepartmentId || null });
  await notifyUser(targetUid, notifyPayload);

  return { success: true, role: finalRole };
});
