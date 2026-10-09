import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as dbService from '../../services/dbService';
import { getAnalysisEmployees, ANALYSIS_EMPLOYEES_KEY } from '../../features/bi-dashboard/services/analysisEmployeeSyncService';

vi.mock('../../services/firebase', () => ({ db: {}, auth: { currentUser: null } }));
vi.mock('../../services/dbService', () => {
    const store = new Map<string, unknown>();
    return {
        getSetting: vi.fn(async (key: string) => store.get(key) ?? null),
        saveSetting: vi.fn(async (key: string, val: unknown) => { store.set(key, val); }),
        _store: store,
    };
});

const store = () => (dbService as unknown as { _store: Map<string, unknown> })._store;

// Vòng lặp gặp thật 2026-10-09: mỗi lần đọc lại ghi cache → 'indexeddb-change' → useNhanVienData đọc
// lại → ghi tiếp… làm getSetting('departmentMap') hết 10s ~170 lần. Đọc lần 2 KHÔNG được ghi nữa.
describe('getAnalysisEmployees — không tự kích vòng lặp ghi', () => {
    beforeEach(() => {
        store().clear();
        vi.clearAllMocks();
        store().set('departmentMap', { '111395': 'Tư Vấn;;Nguyễn Văn A', '222': 'Thu Ngân;;Trần Thị B' });
    });

    it('lần đầu ghi cache, lần sau cùng danh sách thì không ghi', async () => {
        const first = await getAnalysisEmployees();
        expect(first?.employees.length).toBeGreaterThan(0);
        expect(dbService.saveSetting).toHaveBeenCalledWith(ANALYSIS_EMPLOYEES_KEY, expect.anything());
        vi.mocked(dbService.saveSetting).mockClear();

        const second = await getAnalysisEmployees();
        expect(second?.employees).toEqual(first?.employees);
        expect(dbService.saveSetting).not.toHaveBeenCalled();
    });

    it('danh sách đổi thì vẫn ghi', async () => {
        await getAnalysisEmployees();
        vi.mocked(dbService.saveSetting).mockClear();
        store().set('departmentMap', { '111395': 'Tư Vấn;;Nguyễn Văn A', '333': 'Tư Vấn;;Lê Văn C' });
        await getAnalysisEmployees();
        expect(dbService.saveSetting).toHaveBeenCalled();
    });
});
