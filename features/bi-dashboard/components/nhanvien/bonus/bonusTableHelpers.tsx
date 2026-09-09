import React from 'react';
import { RevenueRow } from '../../../types/nhanVienTypes';
import { extractEmployeeId, standardizeEmployeeName, formatEmployeeName } from '../../../utils/nhanVienHelpers';

export const MedalBadge: React.FC<{ rank: number }> = ({ rank }) => {
    const base = "w-7 text-center text-[13px] font-black tabular-nums";
    if (rank === 1) return <span className={`${base} text-amber-500 dark:text-amber-400`} title="TOP 1">#1</span>;
    if (rank === 2) return <span className={`${base} text-slate-500 dark:text-slate-400`} title="TOP 2">#2</span>;
    if (rank === 3) return <span className={`${base} text-amber-700 dark:text-amber-500`} title="TOP 3">#3</span>;
    return <span className={`${base} text-slate-400 dark:text-slate-500`}>#{rank}</span>;
};

export const getCellColor = (val: number, type: 'dtqd' | 'hqqd' | 'erp' | 'tnong' | 'tong' | 'pnong') => {
    if (val === 0 || isNaN(val)) return 'text-slate-700 dark:text-slate-300';
    switch (type) {
        case 'dtqd': return val >= 50 ? 'text-emerald-600' : (val <= 20 ? 'text-rose-500' : 'text-slate-700 dark:text-slate-300');
        case 'hqqd': return val > 50 ? 'text-emerald-600' : (val < 40 ? 'text-rose-500' : 'text-slate-700 dark:text-slate-300');
        case 'pnong': return val > 60 ? 'text-emerald-600' : (val < 40 ? 'text-rose-500' : 'text-slate-700 dark:text-slate-300');
        case 'tong': return val >= 2000000 ? 'text-emerald-600' : (val <= 500000 ? 'text-rose-500' : 'text-slate-900 dark:text-white');
    }
    return 'text-slate-700 dark:text-slate-300';
};

export function getWeekdayAbbr(dateStr: string): string {
    const [d, m, y] = dateStr.split('/').map(Number);
    const dateObj = new Date(y, m - 1, d);
    const day = dateObj.getDay();
    if (day === 0) return 'CN';
    return `T${day + 1}`;
}

export const isUpdatedToday = (updatedAt?: string) => {
    if (!updatedAt) return false;
    const today = new Date().toLocaleDateString('vi-VN');
    return updatedAt.includes(today);
};

/**
 * Tra cứu thông tin Doanh thu (DTQĐ, HQQĐ, DTLK) cho nhân viên một cách linh hoạt và chính xác nhất.
 * Hỗ trợ tra cứu theo:
 * - originalName (trực tiếp hoặc lowercase)
 * - name (trực tiếp hoặc lowercase)
 * - Mã số nhân viên trích xuất (ID)
 * - Dạng chuẩn hóa canonical hoặc rút gọn
 */
export const getRevenueForEmployee = (
    revenueMap: Map<string, RevenueRow>,
    originalName?: string,
    name?: string
): RevenueRow | undefined => {
    if (!revenueMap || revenueMap.size === 0) return undefined;

    // 1. Khớp trực tiếp originalName
    if (originalName) {
        const r1 = revenueMap.get(originalName);
        if (r1) return r1;
        const r1Lower = revenueMap.get(originalName.toLowerCase().trim());
        if (r1Lower) return r1Lower;
    }

    // 2. Khớp trực tiếp name
    if (name) {
        const r2 = revenueMap.get(name);
        if (r2) return r2;
        const r2Lower = revenueMap.get(name.toLowerCase().trim());
        if (r2Lower) return r2Lower;
    }

    // 3. Khớp qua Mã số nhân viên (ID) - chuẩn xác nhất trong MWG
    const idFromOrig = originalName ? extractEmployeeId(originalName) : '';
    if (idFromOrig) {
        const match = revenueMap.get(idFromOrig);
        if (match) return match;
    }
    const idFromName = name ? extractEmployeeId(name) : '';
    if (idFromName) {
        const match = revenueMap.get(idFromName);
        if (match) return match;
    }

    // 4. Khớp qua tên chuẩn hóa canonical / rút gọn
    if (originalName) {
        const canonical = standardizeEmployeeName(originalName);
        const rCanon = revenueMap.get(canonical) || revenueMap.get(canonical.toLowerCase().trim());
        if (rCanon) return rCanon;

        const formatted = formatEmployeeName(originalName);
        const rFmt = revenueMap.get(formatted) || revenueMap.get(formatted.toLowerCase().trim());
        if (rFmt) return rFmt;

        if (originalName.includes(' - ')) {
            const parts = originalName.split(' - ').map(p => p.trim());
            const swapped = `${parts[1]} - ${parts[0]}`;
            const rSwap = revenueMap.get(swapped) || revenueMap.get(swapped.toLowerCase().trim());
            if (rSwap) return rSwap;
        }
    }

    return undefined;
};

