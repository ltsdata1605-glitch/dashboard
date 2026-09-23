import type { DepartmentMap } from '../services/dataService';

/**
 * Phân Tích và Report BI CHỈ làm việc với nhân viên bán hàng "BP All In One" (chủ dự án chốt
 * 2026-09-23): các bộ phận khác (Bảo vệ, Kho, Quản lý, Tiếp đón…) bị bỏ qua khi nạp danh sách.
 *
 * ⚠️ Phân Ca thì NGƯỢC LẠI — vẫn nạp toàn bộ bộ phận. Phân Ca có đường nhập Excel riêng
 * (features/phan-ca/utils/excelImport.ts) nên không dùng hàm này; đừng "gom cho gọn" vào một chỗ.
 */
export const ALL_IN_ONE_LABEL = 'BP All In One';

const normalizeDept = (raw: string): string =>
    raw
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[đĐ]/g, 'd')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');

/** "BP All In One", "BP ALL IN ONE - DMX", "BP All-In-One (ĐMX)" … đều tính là All In One */
export const isAllInOneDepartment = (dept?: string | null): boolean =>
    normalizeDept(String(dept || '')).includes('allinone');

export interface DepartmentFilterResult {
    map: DepartmentMap;
    keptCount: number;
    skippedCount: number;
    /** Tên các bộ phận đã bị bỏ qua, để báo rõ cho người dùng */
    skippedDepartments: string[];
}

/** Lọc DepartmentMap ("mã NV" -> "Bộ phận;;Tên") chỉ giữ nhân viên BP All In One */
export const keepOnlyAllInOne = (map: DepartmentMap | null | undefined): DepartmentFilterResult => {
    const result: DepartmentMap = {};
    const skipped = new Set<string>();
    let keptCount = 0;
    let skippedCount = 0;

    Object.entries(map || {}).forEach(([id, raw]) => {
        const dept = String(raw || '').split(';;')[0].trim();
        if (isAllInOneDepartment(dept)) {
            result[id] = raw;
            keptCount += 1;
        } else {
            skippedCount += 1;
            if (dept) skipped.add(dept);
        }
    });

    return {
        map: result,
        keptCount,
        skippedCount,
        skippedDepartments: Array.from(skipped).sort(),
    };
};
