/**
 * Service đồng bộ danh sách nhân viên từ chức năng Phân Tích (Analysis)
 * sang Report BI, lưu trữ đồng thời vào IndexedDB và Firebase Firestore.
 */

import { db, auth } from '../../../services/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getSetting, saveSetting } from '../../../services/dbService';
import { standardizeEmployeeName, formatEmployeeName } from '../utils/nhanVienHelpers';

export const ANALYSIS_EMPLOYEES_KEY = 'analysis-employees-list';

export interface AnalysisEmployeeItem {
    id: string;              // Mã nhân viên (ví dụ: '195025')
    name: string;            // Tên định dạng hiển thị
    originalName: string;    // Tên gốc (để so khớp với các báo cáo)
    department: string;      // Phòng ban (ví dụ: 'Kho Siêu Thị', 'Tư Vấn', 'Thu Ngân')
    supermarket?: string;    // Tên hoặc mã siêu thị nếu có
}

export interface AnalysisEmployeesPayload {
    updatedAt: number;
    supermarket?: string;
    totalCount: number;
    employees: AnalysisEmployeeItem[];
}

const EXCLUDED_DEPT_KEYWORDS = ['quản lý', 'trưởng ca', 'kế toán', 'tiếp đón khách hàng'];

/**
 * Kiểm tra xem một nhân viên có phải tài khoản hệ thống hoặc tài khoản phụ cần loại bỏ không
 */
export function isSystemOrIgnoredEmployee(name: string, dept?: string): boolean {
    if (!name) return true;
    const lowerName = name.toLowerCase().trim();
    if (
        lowerName.startsWith('yêu cầu xuất') ||
        lowerName.startsWith('mwg') ||
        lowerName.startsWith('bp ') ||
        lowerName.startsWith('hỗ trợ bi') ||
        lowerName.startsWith('nnh ') ||
        lowerName.startsWith('đml_str_str') ||
        lowerName.includes('online')
    ) {
        return true;
    }
    if (dept) {
        const lowerDept = dept.toLowerCase();
        if (EXCLUDED_DEPT_KEYWORDS.some(kw => lowerDept.includes(kw))) {
            return true;
        }
    }
    return false;
}

/**
 * Chuẩn hoá danh sách nhân viên từ Phân Tích thành mảng sạch không trùng lặp
 */
export function normalizeAnalysisEmployees(
    rawEmployees: Array<{ name: string; department?: string }>,
    supermarket?: string
): AnalysisEmployeeItem[] {
    const seen = new Set<string>();
    const result: AnalysisEmployeeItem[] = [];

    for (const emp of rawEmployees) {
        if (!emp || !emp.name) continue;
        const originalName = emp.name.trim();
        const dept = (emp.department || '').trim() || 'Kinh Doanh';

        if (isSystemOrIgnoredEmployee(originalName, dept)) {
            continue;
        }

        const canonical = standardizeEmployeeName(originalName);
        let empId = '';
        if (canonical.includes(' - ')) {
            const parts = canonical.split(' - ').map(p => p.trim());
            empId = /^\d+$/.test(parts[1]) ? parts[1] : (/^\d+$/.test(parts[0]) ? parts[0] : canonical);
        } else if (/^\d+$/.test(canonical)) {
            empId = canonical;
        } else {
            empId = canonical;
        }

        const dedupKey = empId || canonical;
        if (!seen.has(dedupKey)) {
            seen.add(dedupKey);
            result.push({
                id: empId,
                name: formatEmployeeName(originalName),
                originalName,
                department: dept,
                supermarket: supermarket || undefined
            });
        }
    }

    return result;
}

/**
 * Lưu danh sách nhân viên chuẩn vào IndexedDB và tự động trigger Firebase Cloud Sync
 */
export async function saveAnalysisEmployees(
    rawEmployees: Array<{ name: string; department?: string }>,
    supermarket?: string
): Promise<AnalysisEmployeesPayload> {
    const cleanList = normalizeAnalysisEmployees(rawEmployees, supermarket);
    const payload: AnalysisEmployeesPayload = {
        updatedAt: Date.now(),
        supermarket,
        totalCount: cleanList.length,
        employees: cleanList
    };

    // 1. Lưu vào IndexedDB (saveSetting tự động phát event 'ycx-setting-changed' cho useCloudSync)
    await saveSetting(ANALYSIS_EMPLOYEES_KEY, payload);

    // 2. Đồng thời lưu bản sao với prefix 'bi_' để module BI nội bộ đọc trực tiếp
    await saveSetting(`bi_${ANALYSIS_EMPLOYEES_KEY}`, payload);

    // 3. Nếu người dùng đang đăng nhập Firebase, chủ động đẩy ngay lên user configs để multi-device sync
    const user = auth.currentUser;
    if (user) {
        try {
            const docRef = doc(db, 'users', user.uid, 'configs', ANALYSIS_EMPLOYEES_KEY);
            await setDoc(docRef, {
                value: payload,
                updatedAt: serverTimestamp(),
                savedAt: Date.now()
            }, { merge: false });
        } catch (err) {
            console.warn('[AnalysisEmployeeSync] Đẩy trực tiếp lên Firestore thất bại (sẽ được retry bởi useCloudSync):', err);
        }
    }

    // Bắn event để các hook đang lắng nghe cập nhật ngay
    window.dispatchEvent(new CustomEvent('indexeddb-change', { detail: { key: ANALYSIS_EMPLOYEES_KEY } }));
    window.dispatchEvent(new CustomEvent('analysis-employees-updated', { detail: payload }));

    return payload;
}

/**
 * Đọc danh sách nhân viên phân tích từ IndexedDB (fallback Firebase nếu trên thiết bị mới)
 */
export async function getAnalysisEmployees(): Promise<AnalysisEmployeesPayload | null> {
    // 1. Đọc từ IndexedDB
    let local = await getSetting<AnalysisEmployeesPayload>(ANALYSIS_EMPLOYEES_KEY);
    if (!local) {
        local = await getSetting<AnalysisEmployeesPayload>(`bi_${ANALYSIS_EMPLOYEES_KEY}`);
    }

    if (local && Array.isArray(local.employees) && local.employees.length > 0) {
        return local;
    }

    // 2. Nếu local chưa có (ví dụ: vừa mở trên thiết bị mới), thử đọc từ Cloud Firestore
    const user = auth.currentUser;
    if (user) {
        try {
            const docRef = doc(db, 'users', user.uid, 'configs', ANALYSIS_EMPLOYEES_KEY);
            const snap = await getDoc(docRef);
            if (snap.exists()) {
                const data = snap.data();
                if (data && data.value) {
                    const cloudPayload = data.value as AnalysisEmployeesPayload;
                    // Lưu lại vào IndexedDB để lần sau đọc nhanh
                    await saveSetting(ANALYSIS_EMPLOYEES_KEY, cloudPayload);
                    await saveSetting(`bi_${ANALYSIS_EMPLOYEES_KEY}`, cloudPayload);
                    return cloudPayload;
                }
            }
        } catch (err) {
            console.warn('[AnalysisEmployeeSync] Không thể kéo danh sách nhân viên từ Firestore:', err);
        }
    }

    return null;
}
