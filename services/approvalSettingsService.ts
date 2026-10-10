import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';

export interface ApprovalSettingsData {
    autoApproveManagers: boolean;
    autoApproveEmployees: boolean;
    autoApproveEmployeesByDept: Record<string, boolean>;
    effectiveAutoApproveForDept?: boolean;
}

export interface UpdateApprovalSettingsInput {
    autoApproveManagers?: boolean;
    autoApproveEmployees?: boolean;
    deptId?: string;
    autoApproveForDept?: boolean;
}

const getApprovalSettingsFn = httpsCallable<{ deptId?: string }, ApprovalSettingsData>(
    functions,
    'getApprovalSettings'
);

const updateApprovalSettingsFn = httpsCallable<UpdateApprovalSettingsInput, { success: boolean }>(
    functions,
    'updateApprovalSettings'
);

// Cache trong RAM để tránh gọi liên tục
let cachedSettings: { data: ApprovalSettingsData; timestamp: number } | null = null;
const CACHE_TTL = 30000; // 30s

export const getApprovalSettings = async (
    deptId?: string,
    forceRefresh = false
): Promise<ApprovalSettingsData> => {
    if (!forceRefresh && cachedSettings && Date.now() - cachedSettings.timestamp < CACHE_TTL) {
        if (!deptId || cachedSettings.data.effectiveAutoApproveForDept !== undefined) {
            return cachedSettings.data;
        }
    }

    try {
        const res = await getApprovalSettingsFn({ deptId });
        cachedSettings = { data: res.data, timestamp: Date.now() };
        return res.data;
    } catch (err) {
        console.warn('[ApprovalSettings] Lỗi lấy cài đặt duyệt, dùng mặc định:', err);
        return {
            autoApproveManagers: false,
            autoApproveEmployees: true,
            autoApproveEmployeesByDept: {},
            effectiveAutoApproveForDept: true,
        };
    }
};

export const updateApprovalSettings = async (
    input: UpdateApprovalSettingsInput
): Promise<boolean> => {
    const res = await updateApprovalSettingsFn(input);
    // Xoá cache để lần lấy tiếp theo đọc mới
    cachedSettings = null;
    return res.data.success;
};
