import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { db, auth } from './firebaseAdmin';
import { notifyUser } from './notifications';

type Role = 'admin' | 'manager' | 'employee' | 'pending' | 'blocked';
type Status = 'pending' | 'approved' | 'rejected' | 'new' | 'expired' | 'blocked';

interface NotifyPayload {
  title: string;
  message: string;
  type: 'success' | 'warning' | 'info' | 'error';
}

interface AdminUpdateUserInput {
  targetUid: string;
  role?: Role;
  status?: Status;
  departmentId?: string;
  employeeName?: string;
  expiresAt?: string | null;
  notify?: NotifyPayload;
}

// Thay thế mọi updateDoc(userRef, ...) mà admin/manager ghi vào doc CỦA NGƯỜI
// KHÁC ở components/views/UserManagementView.tsx — cả nút Duyệt/Từ chối/Thu
// hồi (handleApproval) lẫn autosave từng ô (autoSave). firestore.rules chỉ
// cho phép isSelf(uid) ghi users/{uid}, nên admin/manager sửa hồ sơ người
// khác bắt buộc đi qua function này để được kiểm tra quyền ở server.
export const adminUpdateUser = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Cần đăng nhập.');
  }
  const callerRole = request.auth.token.role;
  if (callerRole !== 'admin' && callerRole !== 'manager') {
    throw new HttpsError('permission-denied', 'Chỉ admin/manager được sửa hồ sơ người dùng khác.');
  }

  const { targetUid, role, status, departmentId, employeeName, expiresAt, notify } =
    (request.data ?? {}) as AdminUpdateUserInput;
  if (!targetUid) {
    throw new HttpsError('invalid-argument', 'Thiếu targetUid.');
  }

  const targetRef = db.collection('users').doc(targetUid);
  const snap = await targetRef.get();
  if (!snap.exists) {
    throw new HttpsError('not-found', 'Không tìm thấy user cần cập nhật.');
  }

  // Chỉ admin (không phải manager) mới được cấp quyền admin/manager cho người khác —
  // khớp với UI hiện tại: dropdown role đầy đủ (gồm admin/manager) chỉ hiện với
  // userRole === 'admin', manager chỉ thấy badge readonly.
  if ((role === 'admin' || role === 'manager') && callerRole !== 'admin') {
    throw new HttpsError('permission-denied', 'Chỉ admin được cấp quyền admin/manager.');
  }

  const updates: Record<string, unknown> = {};
  if (role !== undefined) updates.role = role;
  if (status !== undefined) updates.status = status;
  if (departmentId !== undefined) updates.departmentId = departmentId;
  if (employeeName !== undefined) updates.employeeName = employeeName;
  if (expiresAt !== undefined) {
    updates.expiresAt = expiresAt ? Timestamp.fromDate(new Date(expiresAt)) : FieldValue.delete();
  }

  if (Object.keys(updates).length > 0) {
    await targetRef.update(updates);
  }

  const finalRole = (role ?? (snap.get('role') as Role) ?? 'pending');
  const finalDepartmentId = (departmentId ?? (snap.get('departmentId') as string) ?? null);
  await auth.setCustomUserClaims(targetUid, { role: finalRole, departmentId: finalDepartmentId || null });

  if (notify) {
    await notifyUser(targetUid, notify);
  }

  return { success: true };
});
