import * as db from '../utils/db';
import { shortenSupermarketName } from '../../../utils/dataUtils';
import { standardizeEmployeeName, formatEmployeeName, extractEmployeeId } from '../utils/nhanVienHelpers';
import { parseAllEmployees } from './employeeParser';
import { getAnalysisEmployees, isSystemOrIgnoredEmployee } from './analysisEmployeeSyncService';
import { appendBonusHistory } from '../utils/bonusHistory';
import { BonusMetrics, BonusCompareStore, BonusComparePart, Employee } from '../types/nhanVienTypes';
import { DateRangeDDMMYYYY } from '../utils/bonusDateRange';

export interface GlobalBonusEmployeesResult {
    employees: Employee[];
    supermarkets: string[];
    employeeSupermarketMap: Record<string, string>;
}

/**
 * Lấy danh sách nhân viên đang active trên toàn hệ thống (không phụ thuộc vào tab/view đang mở).
 * Quét từ Phân tích (analysis-employees) và các siêu thị active trong IndexedDB (config-*-danhsach).
 */
export async function getGlobalBonusEmployees(): Promise<GlobalBonusEmployeesResult> {
    let activeSupermarkets = await db.get<string[]>('nhanvien-active-supermarkets') || [];
    if (!Array.isArray(activeSupermarkets) || activeSupermarkets.length === 0) {
        const currentSm = await db.get<string>('dashboard-active-supermarket');
        if (currentSm && currentSm !== 'Tổng') {
            activeSupermarkets = [currentSm];
        }
    }
    if (activeSupermarkets.length === 0) {
        const custom = await db.get<string[]>('updater-custom-supermarkets') || [];
        if (custom.length > 0) {
            activeSupermarkets = [custom[0]];
        }
    }

    const employeeSupermarketMap: Record<string, string> = {};
    const seen = new Set<string>();
    const employees: Employee[] = [];

    // 1. Quét từ danh sách Phân tích nếu có
    try {
        const analysisPayload = await getAnalysisEmployees();
        if (analysisPayload?.employees && analysisPayload.employees.length > 0) {
            for (const emp of analysisPayload.employees) {
                const dept = (emp.department || '').trim();
                if (!dept || isSystemOrIgnoredEmployee(emp.originalName, dept)) continue;
                const canonical = standardizeEmployeeName(emp.originalName);
                const dedupKey = emp.id || canonical;
                if (!seen.has(dedupKey)) {
                    seen.add(dedupKey);
                    employees.push({
                        name: emp.name || formatEmployeeName(emp.originalName),
                        originalName: emp.originalName,
                        department: dept,
                    });
                    if (emp.supermarket) {
                        employeeSupermarketMap[emp.originalName] = emp.supermarket;
                    } else if (activeSupermarkets.length > 0) {
                        employeeSupermarketMap[emp.originalName] = activeSupermarkets[0];
                    }
                }
            }
        }
    } catch (e) {
        console.warn('[GlobalBonusService] Lỗi đọc nhân viên từ Phân tích:', e);
    }

    // 2. Quét từ config-${safeName}-danhsach của các siêu thị active
    const uniqueSafeNames = Array.from(new Set(activeSupermarkets.map(sm => shortenSupermarketName(sm))));
    for (const safeName of uniqueSafeNames) {
        try {
            const rawDS = await db.get<string>(`config-${safeName}-danhsach`) || '';
            const hidden = await db.get<string[]>(`hidden-employees-${safeName}`) || [];
            let parsed = parseAllEmployees(rawDS, hidden);
            if (parsed.length === 0 && rawDS) {
                const lines = rawDS.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
                const fallbackList: { name: string; originalName: string; department: string }[] = [];
                for (const line of lines) {
                    const parts = line.split('\t').map(p => p.trim());
                    const namePart = parts.find(p => p.includes(' - ') && !p.startsWith('BP ') && !p.includes('http'));
                    if (namePart) {
                        const canonical = standardizeEmployeeName(namePart);
                        fallbackList.push({ name: formatEmployeeName(canonical), originalName: canonical, department: '' });
                    }
                }
                if (fallbackList.length > 0) parsed = fallbackList;
            }
            const originalSm = activeSupermarkets.find(sm => shortenSupermarketName(sm) === safeName) || safeName;

            for (const emp of parsed) {
                const canonical = standardizeEmployeeName(emp.originalName);
                const empId = extractEmployeeId(emp.originalName);
                const dedupKey = empId || canonical;
                if (!seen.has(dedupKey)) {
                    seen.add(dedupKey);
                    employees.push({
                        name: emp.name || formatEmployeeName(emp.originalName),
                        originalName: emp.originalName,
                        department: (emp as any).department || '',
                    });
                }
                employeeSupermarketMap[emp.originalName] = originalSm;
                employeeSupermarketMap[canonical] = originalSm;
                if (empId) employeeSupermarketMap[empId] = originalSm;
                if (emp.originalName.includes(' - ')) {
                    const parts = emp.originalName.split(' - ').map(p => p.trim());
                    employeeSupermarketMap[`${parts[1]} - ${parts[0]}`] = originalSm;
                }
            }
        } catch (e) {
            console.warn(`[GlobalBonusService] Lỗi đọc danh sách nhân viên siêu thị ${safeName}:`, e);
        }
    }

    // 3. Dự phòng: Nếu vẫn chưa có nhân viên nào, quét tất cả key config-*-danhsach có sẵn trong DB
    if (employees.length === 0) {
        try {
            const all = await db.getAll();
            const dsEntries = all.filter(entry => entry.key.startsWith('config-') && entry.key.endsWith('-danhsach'));
            for (const entry of dsEntries) {
                const safeName = entry.key.replace(/^config-/, '').replace(/-danhsach$/, '');
                const rawDS = (entry.value as string) || '';
                const hidden = await db.get<string[]>(`hidden-employees-${safeName}`) || [];
                let parsed = parseAllEmployees(rawDS, hidden);
                if (parsed.length === 0 && rawDS) {
                    const lines = rawDS.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
                    const fallbackList: { name: string; originalName: string; department: string }[] = [];
                    for (const line of lines) {
                        const parts = line.split('\t').map(p => p.trim());
                        const namePart = parts.find(p => p.includes(' - ') && !p.startsWith('BP ') && !p.includes('http'));
                        if (namePart) {
                            const canonical = standardizeEmployeeName(namePart);
                            fallbackList.push({ name: formatEmployeeName(canonical), originalName: canonical, department: '' });
                        }
                    }
                    if (fallbackList.length > 0) parsed = fallbackList;
                }
                for (const emp of parsed) {
                    const canonical = standardizeEmployeeName(emp.originalName);
                    const empId = extractEmployeeId(emp.originalName);
                    const dedupKey = empId || canonical;
                    if (!seen.has(dedupKey)) {
                        seen.add(dedupKey);
                        employees.push({
                            name: emp.name || formatEmployeeName(emp.originalName),
                            originalName: emp.originalName,
                            department: (emp as any).department || '',
                        });
                    }
                    if (!employeeSupermarketMap[emp.originalName]) {
                        employeeSupermarketMap[emp.originalName] = safeName;
                    }
                }
            }
        } catch (e) {
            console.warn('[GlobalBonusService] Lỗi quét dự phòng config-*-danhsach:', e);
        }
    }

    return { employees, supermarkets: activeSupermarkets, employeeSupermarketMap };
}

/**
 * Ghi kết quả điểm thưởng hàng loạt vào đúng siêu thị của từng nhân viên (toàn cục).
 */
export async function saveBonusBatchGlobal(
    entries: { originalName: string; metrics: BonusMetrics }[],
    employeeSupermarketMap: Record<string, string>,
    defaultSupermarket: string
): Promise<void> {
    if (entries.length === 0) return;

    const resolveSm = (originalName: string) => {
        return employeeSupermarketMap[originalName] || defaultSupermarket || 'Tổng';
    };

    const groups = new Map<string, { originalName: string; metrics: BonusMetrics }[]>();
    entries.forEach(entry => {
        const safeName = shortenSupermarketName(resolveSm(entry.originalName));
        if (!groups.has(safeName)) groups.set(safeName, []);
        groups.get(safeName)!.push(entry);
    });

    await Promise.all(Array.from(groups.entries()).map(async ([safeName, groupEntries]) => {
        const currentDbData = await db.get<Record<string, BonusMetrics>>(`bonus-data-${safeName}`) || {};
        const mergedDbData = { ...currentDbData };
        groupEntries.forEach(({ originalName, metrics }) => {
            mergedDbData[originalName] = metrics;
            const canonical = standardizeEmployeeName(originalName);
            mergedDbData[canonical] = metrics;
            if (originalName.includes(' - ')) {
                const parts = originalName.split(' - ').map(p => p.trim());
                mergedDbData[`${parts[1]} - ${parts[0]}`] = metrics;
            }
            const empId = extractEmployeeId(originalName);
            if (empId) {
                Object.keys(mergedDbData).forEach(k => {
                    if (extractEmployeeId(k) === empId) mergedDbData[k] = metrics;
                });
            }
        });
        await db.set(`bonus-data-${safeName}`, mergedDbData);
    }));

    await Promise.all(entries.map(({ originalName, metrics }) =>
        appendBonusHistory(resolveSm(originalName), originalName, metrics)
    ));

    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('bi-bonus-data-updated'));
    }
}

/**
 * Ghi kho lưu trữ theo tháng (toàn cục).
 */
export async function saveBonusMonthlyGlobal(
    entries: { originalName: string; metrics: BonusMetrics }[],
    yyyymm: string,
    employeeSupermarketMap: Record<string, string>,
    defaultSupermarket: string
): Promise<void> {
    if (entries.length === 0) return;

    const resolveSm = (originalName: string) => {
        return employeeSupermarketMap[originalName] || defaultSupermarket || 'Tổng';
    };

    const groups = new Map<string, { originalName: string; metrics: BonusMetrics }[]>();
    entries.forEach(entry => {
        const safeName = shortenSupermarketName(resolveSm(entry.originalName));
        if (!groups.has(safeName)) groups.set(safeName, []);
        groups.get(safeName)!.push(entry);
    });

    await Promise.all(Array.from(groups.entries()).map(async ([safeName, groupEntries]) => {
        const monthlyKey = `bonus-monthly-${safeName}-${yyyymm}` as const;
        const monthlyData: Record<string, BonusMetrics> = {};
        groupEntries.forEach(({ originalName, metrics }) => { monthlyData[originalName] = metrics; });
        await db.set(monthlyKey, monthlyData);
    }));

    const now = new Date();
    const currentYYYYMM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    if (yyyymm === currentYYYYMM) {
        await saveBonusBatchGlobal(entries, employeeSupermarketMap, defaultSupermarket);
    }
}

/**
 * Ghi kho so sánh cùng kỳ (toàn cục).
 */
export async function saveBonusCompareGlobal(
    entries: { originalName: string; metrics: BonusMetrics }[],
    part: BonusComparePart,
    range: DateRangeDDMMYYYY,
    runId: string,
    employeeSupermarketMap: Record<string, string>,
    defaultSupermarket: string
): Promise<void> {
    if (entries.length === 0) return;

    const resolveSm = (originalName: string) => {
        return employeeSupermarketMap[originalName] || defaultSupermarket || 'Tổng';
    };

    const groups = new Map<string, { originalName: string; metrics: BonusMetrics }[]>();
    entries.forEach(entry => {
        const safeName = shortenSupermarketName(resolveSm(entry.originalName));
        if (!groups.has(safeName)) groups.set(safeName, []);
        groups.get(safeName)!.push(entry);
    });

    await Promise.all(Array.from(groups.entries()).map(async ([safeName, groupEntries]) => {
        const key = `bonus-compare-${safeName}` as const;
        const existing = await db.get<BonusCompareStore>(key);
        const base: BonusCompareStore = existing && existing.runId === runId
            ? existing
            : { runId, updatedAt: '' };
        const data: Record<string, BonusMetrics> = {};
        groupEntries.forEach(({ originalName, metrics }) => { data[originalName] = metrics; });
        const next: BonusCompareStore = {
            ...base,
            [part]: { fromDate: range.fromDate, toDate: range.toDate, data },
            updatedAt: new Date().toLocaleString('vi-VN'),
        };
        await db.set(key, next);
    }));

    if (part === 'current') {
        await saveBonusBatchGlobal(entries, employeeSupermarketMap, defaultSupermarket);
    }
}

/**
 * Ghi nhãn kỳ báo cáo hiện tại (toàn cục).
 */
export async function saveBonusPeriodLabelGlobal(
    label: string,
    activeSupermarkets: string[],
    defaultSupermarket: string
): Promise<void> {
    const list = activeSupermarkets.length > 0 ? activeSupermarkets : [defaultSupermarket || 'Tổng'];
    const uniqueSafeNames = Array.from(new Set(list.map(sm => shortenSupermarketName(sm))));
    await Promise.all(uniqueSafeNames.map(safeName =>
        db.set(`bonus-current-period-label-${safeName}`, label)
    ));
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('ycx-auto-bonus-period-label-changed', { detail: { label } }));
    }
}
