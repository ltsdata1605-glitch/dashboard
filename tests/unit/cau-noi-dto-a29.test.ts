import { describe, expect, it, vi } from 'vitest';

// analysisEmployeeSyncService import firebase + dbService gốc — chỉ kiểm hàm thuần nên giả lập.
vi.mock('../../services/firebase', () => ({ db: {}, auth: { currentUser: null } }));
vi.mock('../../services/dbService', () => ({ getSetting: vi.fn(), saveSetting: vi.fn() }));

const { docAnalysisEmployeesPayload, normalizeAnalysisEmployees, ANALYSIS_EMPLOYEES_SCHEMA } = await import('../../features/bi-dashboard/services/analysisEmployeeSyncService');
const { docCheckThuongPayload, computeBonusByGroup, CT_COLS, CHECK_THUONG_SCHEMA } = await import('../../features/bi-dashboard/services/checkThuongBonus');

/**
 * Audit A29 (2026-09-30): hợp đồng dữ liệu có phiên bản cho 2 cầu nối vào Report BI.
 * "Golden fixture": đầu vào cố định → đầu ra cố định (định danh, đơn vị, ngày) — đổi hành vi là đỏ.
 */
describe('Cầu nối Phân tích → Report BI', () => {
    it('bản CŨ (chưa có schemaVersion) đọc được và nâng lên v1', () => {
        const cu = { updatedAt: 1727654400000, supermarket: 'ĐML Hùng Vương', totalCount: 1, employees: [{ id: '195025', name: 'Linh', originalName: '195025 - Nguyễn Thị Mỹ Linh', department: 'Tư Vấn' }] };
        const p = docAnalysisEmployeesPayload(cu)!;
        expect(p.schemaVersion).toBe(ANALYSIS_EMPLOYEES_SCHEMA);
        expect(p.source).toBe('phan-tich');
        expect(p.updatedAt).toBe(1727654400000); // epoch ms giữ nguyên
        expect(p.employees[0]).toEqual({ id: '195025', name: 'Linh', originalName: '195025 - Nguyễn Thị Mỹ Linh', department: 'Tư Vấn', supermarket: undefined });
    });

    it('dữ liệu hỏng → null; phần tử thiếu tên bị bỏ; mã số → chuỗi; totalCount tính lại', () => {
        expect(docAnalysisEmployeesPayload(null)).toBeNull();
        expect(docAnalysisEmployeesPayload({ employees: 'không phải mảng' })).toBeNull();
        // Từ commit f0a5558 (2026-10-10) bộ đọc cũng bỏ người KHÔNG có bộ phận → mẫu thử phải có bộ phận.
        const p = docAnalysisEmployeesPayload({ totalCount: 99, employees: [{ id: 195025, name: 'A', department: 'Tư Vấn' }, { id: '1' }, null] })!;
        expect(p.employees).toHaveLength(1);
        expect(p.employees[0].id).toBe('195025');
        expect(p.totalCount).toBe(1);
    });

    it('golden: chuẩn hoá danh sách NV từ Phân tích (định danh = mã NV, bỏ tài khoản hệ thống/bộ phận loại trừ)', () => {
        const out = normalizeAnalysisEmployees([
            { name: '195025 - Nguyễn Thị Mỹ Linh', department: 'Tư Vấn' },
            { name: '195025 - Nguyễn Thị Mỹ Linh', department: 'Tư Vấn' }, // trùng
            { name: 'MWG Online', department: 'Tư Vấn' },                   // tài khoản hệ thống
            { name: '195031 - Trần Văn B', department: 'Quản lý' },          // quản lý: GIỮ từ f0a5558 (2026-10-10)
            { name: '195050 - Đỗ Văn D', department: 'Chưa xác định' },     // bộ phận loại trừ
            { name: '195040 - Lê Thị C', department: '' },                   // không bộ phận
        ], 'ĐML Hùng Vương');
        expect(out.map(e => [e.id, e.department, e.supermarket])).toEqual([
            ['195025', 'Tư Vấn', 'ĐML Hùng Vương'],
            ['195031', 'Quản lý', 'ĐML Hùng Vương'],
        ]);
    });
});

describe('Cầu nối Check thưởng → Report BI', () => {
    const dong = (sieuThi: string, nganh: string, tongThuong: number) => {
        const r: (string | number)[] = Array(14).fill('');
        r[CT_COLS.KENH] = 'DML'; r[CT_COLS.SIEU_THI] = sieuThi; r[CT_COLS.NGANH_HANG] = nganh;
        r[CT_COLS.HANG_PERCENT_TARGET] = 1; r[CT_COLS.TONG_THUONG] = tongThuong;
        return r;
    };

    it('bản CŨ (mảng thuần) và bản đồng bộ Firestore ({__fsArr}) đều đọc được, nâng lên v1', () => {
        const cu = { competitionData: [dong('910 - ĐML Hùng Vương', 'ICT', 300_000)], fileName: 'du-kien.xlsx', uploadTime: '29/09/2026 10:00' };
        const fs = { competitionData: [{ __fsArr: dong('910 - ĐML Hùng Vương', 'ICT', 300_000) }] };
        for (const raw of [cu, fs]) {
            const p = docCheckThuongPayload(raw)!;
            expect(p.schemaVersion).toBe(CHECK_THUONG_SCHEMA);
            expect(p.source).toBe('check-thuong');
            expect(p.competitionData).toHaveLength(1);
        }
        expect(docCheckThuongPayload(cu)!.fileName).toBe('du-kien.xlsx');
    });

    it('dữ liệu hỏng / rỗng → null (BI coi như chưa có dữ liệu Check thưởng)', () => {
        expect(docCheckThuongPayload(undefined)).toBeNull();
        expect(docCheckThuongPayload({ competitionData: [] })).toBeNull();
        expect(docCheckThuongPayload({ competitionData: 'x' })).toBeNull();
    });

    it('golden: thưởng tính theo ĐỒNG, khớp siêu thị theo mã kho', () => {
        const p = docCheckThuongPayload({ schemaVersion: 1, competitionData: [
            dong('910 - ĐML Hùng Vương', 'ICT', 300_000),
            dong('910 - ĐML Hùng Vương', 'Phụ kiện', 0),
            dong('312 - ĐML Khác', 'Phụ kiện', 1_945_000),
        ] })!;
        const m = computeBonusByGroup(p.competitionData, 'ĐML_STR_STR - Hùng Vương', '910');
        expect(m.get('ICT')).toEqual({ amount: 300_000, kind: 'actual' });
        expect(m.get('PHỤ KIỆN')).toEqual({ amount: 1_945_000, kind: 'projected' });
    });
});
