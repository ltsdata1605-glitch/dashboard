import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { db } from './firebaseAdmin';

const SUPER_ADMIN_EMAIL = 'lts.truongson@gmail.com';

export interface ApprovalConfig {
  autoApproveManagers: boolean;
  autoApproveEmployees: boolean;
  autoApproveEmployeesByDept?: Record<string, boolean>;
  updatedAt?: Timestamp | FieldValue | string;
  updatedBy?: string;
}

const SETTINGS_COLLECTION = 'system_settings';
const SETTINGS_DOC = 'approval';

export async function getApprovalConfigFromDb(): Promise<ApprovalConfig> {
  const docSnap = await db.collection(SETTINGS_COLLECTION).doc(SETTINGS_DOC).get();
  if (!docSnap.exists) {
    return {
      autoApproveManagers: false,
      autoApproveEmployees: true, // Mặc định ở cấp quản lý là BẬT
      autoApproveEmployeesByDept: {},
    };
  }
  const data = docSnap.data() || {};
  return {
    autoApproveManagers: Boolean(data.autoApproveManagers),
    // Mặc định BẬT cho nhân viên nếu chưa thiết lập
    autoApproveEmployees: data.autoApproveEmployees !== false,
    autoApproveEmployeesByDept: data.autoApproveEmployeesByDept || {},
    updatedAt: data.updatedAt,
    updatedBy: data.updatedBy,
  };
}

/**
 * Kiểm tra xem caller có phải là Super Admin không.
 */
function isCallerSuperAdmin(request: Parameters<Parameters<typeof onCall>[0]>[0]): boolean {
  const token = request.auth?.token;
  if (!token) return false;
  if (token.email === SUPER_ADMIN_EMAIL) return true;
  const dept = (token.departmentId as string) || '';
  return token.role === 'admin' && dept.startsWith('ALL (Super Admin)');
}

/**
 * Lấy cấu hình phê duyệt tài khoản tự động
 */
export const getApprovalSettings = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Cần đăng nhập.');
  }

  const { deptId } = (request.data ?? {}) as { deptId?: string };
  const config = await getApprovalConfigFromDb();

  let effectiveAutoApproveForDept = config.autoApproveEmployees;
  if (deptId && config.autoApproveEmployeesByDept && config.autoApproveEmployeesByDept[deptId] !== undefined) {
    effectiveAutoApproveForDept = config.autoApproveEmployeesByDept[deptId];
  }

  return {
    autoApproveManagers: config.autoApproveManagers,
    autoApproveEmployees: config.autoApproveEmployees,
    autoApproveEmployeesByDept: config.autoApproveEmployeesByDept || {},
    effectiveAutoApproveForDept,
  };
});

interface UpdateApprovalSettingsInput {
  autoApproveManagers?: boolean;
  autoApproveEmployees?: boolean;
  deptId?: string;
  autoApproveForDept?: boolean;
}

/**
 * Cập nhật cấu hình phê duyệt tài khoản tự động
 */
export const updateApprovalSettings = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Cần đăng nhập.');
  }

  const callerRole = request.auth.token.role;
  const callerEmail = request.auth.token.email;
  const callerSuperAdmin = isCallerSuperAdmin(request);

  if (callerRole !== 'admin' && callerRole !== 'manager') {
    throw new HttpsError('permission-denied', 'Chỉ Quản lý hoặc Super Admin được thay đổi cài đặt duyệt.');
  }

  const { autoApproveManagers, autoApproveEmployees, deptId, autoApproveForDept } =
    (request.data ?? {}) as UpdateApprovalSettingsInput;

  // 1. Chỉ Super Admin mới có quyền bật/tắt tự động duyệt Quản lý
  if (autoApproveManagers !== undefined) {
    if (!callerSuperAdmin && callerRole !== 'admin') {
      throw new HttpsError('permission-denied', 'Chỉ Super Admin mới có quyền bật/tắt tự động duyệt cho cấp Quản lý.');
    }
  }

  // 2. Tự động duyệt nhân viên toàn cục: Chỉ admin mới có quyền sửa
  if (autoApproveEmployees !== undefined && callerRole !== 'admin') {
    throw new HttpsError('permission-denied', 'Chỉ Admin mới có quyền đổi cài đặt tự động duyệt nhân viên toàn cục.');
  }

  // 3. Tự động duyệt nhân viên theo kho: Quản lý chỉ được sửa kho của chính mình
  if (deptId && autoApproveForDept !== undefined) {
    if (callerRole === 'manager') {
      const callerDeptRaw = (request.auth.token.departmentId as string) ?? '';
      const allowedKhos = callerDeptRaw.split(',').map((s) => s.trim()).filter(Boolean);
      if (!allowedKhos.includes(deptId)) {
        throw new HttpsError('permission-denied', `Bạn không có quyền quản lý duyệt cho Mã Kho ${deptId}.`);
      }
    }
  }

  const currentConfig = await getApprovalConfigFromDb();
  const updates: Record<string, unknown> = {
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: callerEmail || request.auth.uid,
  };

  if (autoApproveManagers !== undefined) {
    updates.autoApproveManagers = Boolean(autoApproveManagers);
  }

  if (autoApproveEmployees !== undefined) {
    updates.autoApproveEmployees = Boolean(autoApproveEmployees);
  }

  if (deptId && autoApproveForDept !== undefined) {
    const updatedDeptMap = { ...(currentConfig.autoApproveEmployeesByDept || {}) };
    updatedDeptMap[deptId] = Boolean(autoApproveForDept);
    updates.autoApproveEmployeesByDept = updatedDeptMap;
  }

  const docRef = db.collection(SETTINGS_COLLECTION).doc(SETTINGS_DOC);
  await docRef.set(updates, { merge: true });

  return { success: true };
});
