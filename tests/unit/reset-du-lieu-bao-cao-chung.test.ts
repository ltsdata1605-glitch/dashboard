/**
 * "Xoá tất cả dữ liệu (Người dùng mới)" — nhánh xoá báo cáo Luỹ kế & Thi đua DÙNG CHUNG (biData).
 *
 * Lỗi cũ (sửa 2026-09-27): hàm tự đọc `user.departmentId` từ Firebase `User` — đối tượng đó KHÔNG
 * có field này, nên nhánh xoá không bao giờ chạy dù hộp xác nhận hứa (và cảnh báo đỏ) sẽ xoá.
 * Nay người gọi truyền danh sách Kho tường minh; SettingsAccountTab chỉ truyền Kho khi là QUẢN LÝ —
 * admin / Super Admin (Kho gắn thêm như 910 là Kho dùng chung) truyền [] nên không bao giờ xoá.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const purgeAllUserCloudData = vi.fn(async () => {});
const purgeUserBiDataReports = vi.fn(async () => {});
const purgeKhoSalesFiles = vi.fn(async () => {});
vi.mock('../../services/firestoreService', () => ({ purgeAllUserCloudData, purgeUserBiDataReports }));
vi.mock('../../services/khoDataService', () => ({ purgeKhoSalesFiles }));
vi.mock('../../utils/localDbScope', () => ({
    LEGACY_BI_HUB_DB_NAME: 'BI_HUB_DATABASE_V2',
    setActiveLocalUid: vi.fn(),
    biHubDbName: () => 'BI_HUB_DATABASE_V2',
    KHAI_THAC_LEGACY_DB_NAME: 'YCX_KHAI_THAC_DB',
    khaiThacDbName: () => 'YCX_KHAI_THAC_DB',
    isPerAccountDbName: (name: string) => name.includes('__'),
    markCleanSlateMigrated: vi.fn(async () => {}),
    resetLocalScopeInheritance: vi.fn(),
}));
vi.mock('../../features/bi-dashboard/store/configStore', () => ({ configStore: { clearCache: vi.fn() } }));

// Node không có IndexedDB: open() báo lỗi ngay để bước dọn cục bộ không phải chờ timeout 3s.
(globalThis as unknown as { indexedDB: unknown }).indexedDB = {
    open: () => { const r: { onerror?: () => void } = {}; setTimeout(() => r.onerror?.()); return r; },
};

const { resetAllDataAsNewUser } = await import('../../services/localDataOwner');

// Đúng hình dạng Firebase User: KHÔNG có departmentId.
const firebaseUser = { uid: 'u-1', email: 'a@b.c' };

describe('resetAllDataAsNewUser — báo cáo dùng chung', () => {
    beforeEach(() => {
        purgeAllUserCloudData.mockClear();
        purgeUserBiDataReports.mockClear();
        purgeKhoSalesFiles.mockClear();
    });

    it('quản lý: xoá đúng Kho được truyền (lời hứa của hộp xác nhận nay được thực hiện)', async () => {
        await resetAllDataAsNewUser(firebaseUser, { khoXoaBaoCaoChung: ['910'] });
        expect(purgeAllUserCloudData).toHaveBeenCalledWith('u-1');
        expect(purgeUserBiDataReports).toHaveBeenCalledWith(['910']);
        expect(purgeKhoSalesFiles).toHaveBeenCalledWith('910');
    });

    it('admin / Super Admin (danh sách rỗng): KHÔNG xoá báo cáo dùng chung, vẫn xoá dữ liệu riêng', async () => {
        await resetAllDataAsNewUser(firebaseUser, { khoXoaBaoCaoChung: [] });
        expect(purgeAllUserCloudData).toHaveBeenCalledWith('u-1');
        expect(purgeUserBiDataReports).not.toHaveBeenCalled();
    });

    it('không truyền gì: không xoá dữ liệu dùng chung (không còn tự đoán từ user)', async () => {
        await resetAllDataAsNewUser({ ...firebaseUser, departmentId: 'ALL (Super Admin),910' });
        expect(purgeUserBiDataReports).not.toHaveBeenCalled();
    });
});
