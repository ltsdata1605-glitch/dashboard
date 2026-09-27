/**
 * Mã Kho (departmentId) của Super Admin.
 *
 * Super Admin luôn mang NHÃN `ALL (Super Admin)` — nhiều chỗ dùng nó để nhận diện (Bot LINE,
 * shared_configs, thông báo). Nhãn này KHÔNG phải Kho thật, nên nếu chỉ có mỗi nhãn thì
 * `myKhos()` (firestore.rules) rỗng → Super Admin không đọc/ghi được dữ liệu dùng chung theo Kho
 * (`khoData/{maKho}`, `biData/{maKho}`).
 *
 * Từ 2026-09-27 Super Admin được GẮN THÊM các Kho thật đi kèm nhãn, lưu dạng
 * `"ALL (Super Admin),910"`. Trước đó `resolveSession` ghi đè cứng thành đúng nhãn ở mọi lần
 * đăng nhập, nên Kho gắn thêm bị xoá mất. Module thuần (không import firebase) để unit test được.
 */
export const SUPER_ADMIN_DEPT = 'ALL (Super Admin)';

/** Chuẩn hoá: nhãn luôn đứng đầu, giữ các Kho thật theo thứ tự gặp, bỏ trùng/rỗng/"ALL". */
export function normalizeSuperAdminDept(stored: string | null | undefined): string {
    const khoThat = (stored ?? '')
        .split(',')
        .map((k) => k.trim())
        .filter((k) => k && k !== 'ALL' && k !== SUPER_ADMIN_DEPT);
    return [SUPER_ADMIN_DEPT, ...Array.from(new Set(khoThat))].join(',');
}
