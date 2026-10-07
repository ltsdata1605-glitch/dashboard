import { auth } from './firebaseAdmin';

/**
 * Nơi DUY NHẤT ghi custom claims. Root (`role`, `departmentId`) và In Sticker (`stickerRole`,
 * `stickerStoreId`) dùng chung 1 Auth pool, mà `setCustomUserClaims()` THAY TOÀN BỘ claims chứ không
 * merge — trước đây (audit 2026-10-07, S05) đăng nhập app này xoá sạch quyền của app kia.
 * Hàm này đọc claims hiện có rồi chỉ thay đúng các khoá truyền vào.
 *
 * Giới hạn còn lại: 2 lượt ghi CÙNG LÚC cho cùng 1 uid (mở 2 app trong cùng 1 giây) vẫn có thể ghi
 * đè nhau; lần đăng nhập kế tiếp tự sửa lại vì mỗi app luôn ghi lại namespace của mình.
 */
export async function mergeCustomClaims(uid: string, patch: Record<string, unknown>): Promise<void> {
  const record = await auth.getUser(uid);
  await auth.setCustomUserClaims(uid, { ...(record.customClaims ?? {}), ...patch });
}

/**
 * Quyền THẬT SỰ được cấp vào token cho app gốc (audit S03/S04): chỉ tài khoản ĐÃ DUYỆT mới mang
 * `departmentId` (rules `myKhos()` dùng nó để cho đọc dữ liệu Kho). User mới/đang chờ duyệt tự chọn
 * Kho qua `requestAccess`, nên Kho đó KHÔNG được vào token. Status hết hạn/từ chối/khoá thì role
 * trong token hạ về 'pending' dù hồ sơ còn ghi role cũ (UI quản lý vẫn cần role cũ để lọc danh sách).
 */
const INACTIVE_STATUSES = ['expired', 'rejected', 'blocked', 'pending', 'new'];
const ACTIVE_ROLES = ['admin', 'manager', 'employee'];

export function effectiveRootClaims(
  role: string | null | undefined,
  status: string | null | undefined,
  departmentId: string | null | undefined,
): { role: string; departmentId: string | null } {
  const active = !!role && ACTIVE_ROLES.includes(role) && !INACTIVE_STATUSES.includes(status ?? '');
  return active
    ? { role: role as string, departmentId: departmentId || null }
    : { role: 'pending', departmentId: null };
}
