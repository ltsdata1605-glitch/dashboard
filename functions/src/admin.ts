import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { FieldValue, Timestamp, QueryDocumentSnapshot } from 'firebase-admin/firestore';
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

  // Manager chỉ được sửa hồ sơ user thuộc đúng (các) Kho của mình. Trước đây việc
  // này chỉ được lọc ở client (UserManagementView.tsx — allowedKhos), Cloud Function
  // không kiểm tra gì nên 1 manager gọi thẳng hàm này (bỏ qua UI) vẫn sửa được
  // status/departmentId/employeeName/expiresAt của user ở Kho khác. departmentId
  // của manager có thể là danh sách nhiều Kho nối bằng dấu phẩy (vd "58614,12345"),
  // khớp đúng cách UI đang tách chuỗi (dòng ~211 UserManagementView.tsx).
  if (callerRole === 'manager') {
    const callerDeptRaw = (request.auth.token.departmentId as string) ?? '';
    const allowedKhos = callerDeptRaw.split(',').map((s) => s.trim()).filter(Boolean);
    const targetDept = (snap.get('departmentId') as string) ?? '';
    if (!allowedKhos.length || !allowedKhos.includes(targetDept)) {
      throw new HttpsError('permission-denied', 'Bạn chỉ được quản lý người dùng thuộc Kho của mình.');
    }
    // Không cho manager tự đổi Kho của user (đúng với UI — ô Kho chỉ editable với admin).
    if (departmentId !== undefined && departmentId !== targetDept) {
      throw new HttpsError('permission-denied', 'Manager không được đổi Kho của người dùng.');
    }
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

interface ListManagedUsersInput {
  mode: 'pending' | 'active';
}

const TIMESTAMP_FIELDS = ['createdAt', 'requestDate', 'expiresAt', 'lastLogin'] as const;

// Callable trả JSON qua RPC — Timestamp Firestore không "sống sót" qua ranh giới này (client
// sẽ nhận object thường không có .toDate()/.toMillis()), nên serialize sẵn về chuỗi ISO ở đây.
function serializeUserDoc(doc: QueryDocumentSnapshot): Record<string, unknown> {
  const data = doc.data();
  const out: Record<string, unknown> = { id: doc.id, ...data };
  for (const field of TIMESTAMP_FIELDS) {
    const value = data[field];
    if (value instanceof Timestamp) {
      out[field] = value.toDate().toISOString();
    }
  }
  return out;
}

// Thay thế query Firestore trực tiếp ở UserManagementView.tsx / usePendingApprovalCount.ts /
// NotificationDropdown.tsx — cả 3 nơi này trước đây đọc thẳng collection('users') qua
// firestore.rules isManager() (cho get/list KHÔNG giới hạn Kho), rồi mới tự lọc theo
// allowedKhos ở client. Lọc client không phải là bảo mật thật — 1 manager gọi thẳng
// đúng query đó (bỏ qua UI, vd DevTools) vẫn đọc được hồ sơ user (tên/email/ngày yêu
// cầu...) ở Kho khác. Hàm này chạy bằng Admin SDK (bypass rules), lọc theo Kho ở SERVER
// cho manager — không thể bị bỏ qua như cách cũ. Giữ nguyên đúng 2 cặp query cũ (mode
// pending/active x admin/manager, xem UserManagementView.tsx dòng ~164-174 bản cũ) để
// không đổi hành vi hiển thị cho luồng hợp lệ.
export const listManagedUsers = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Cần đăng nhập.');
  }
  const callerRole = request.auth.token.role;
  if (callerRole !== 'admin' && callerRole !== 'manager') {
    throw new HttpsError('permission-denied', 'Chỉ admin/manager được xem danh sách người dùng.');
  }

  const { mode } = (request.data ?? {}) as ListManagedUsersInput;

  const snap = callerRole === 'manager'
    ? await (mode === 'active'
        ? db.collection('users').where('role', '==', 'employee').get()
        : db.collection('users').where('status', '==', 'pending').get())
    : await (mode === 'active'
        ? db.collection('users').where('status', '==', 'approved').get()
        : db.collection('users').where('status', 'in', ['pending', 'new']).get());

  let docs = snap.docs;
  if (callerRole === 'manager') {
    const callerDeptRaw = (request.auth.token.departmentId as string) ?? '';
    const allowedKhos = callerDeptRaw.split(',').map((s) => s.trim()).filter(Boolean);
    docs = docs.filter((d) => allowedKhos.includes((d.get('departmentId') as string) ?? ''));
  }

  return { users: docs.map(serializeUserDoc) };
});
