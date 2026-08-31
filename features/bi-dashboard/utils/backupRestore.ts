import * as db from './db';
import { logAuditEvent } from './auditTrail';

export interface BackupMetadata {
    appName: string;
    version: string;
    timestamp: string;
    deviceInfo: string;
    stats?: Record<string, number>;
}

interface BackupDataEntry {
    key: string;
    value: unknown;
}

export interface ParsedBackup {
    data: BackupDataEntry[];
    metadata?: BackupMetadata;
}

const EXPECTED_APP_NAME = 'reportBI_tools';

/**
 * Parse + validate nội dung file backup. Chấp nhận cả định dạng cũ (mảng
 * {key,value} thô, không có metadata) lẫn định dạng mới (object {metadata,data}).
 * Chỉ chặn khi CÓ metadata nhưng appName không khớp — tránh restore nhầm file JSON
 * của app/module khác tình cờ có cấu trúc mảng object giống hệt.
 */
export const parseBackupFile = (content: string): ParsedBackup => {
    const parsedContent = JSON.parse(content);
    let data: BackupDataEntry[];
    let metadata: BackupMetadata | undefined;

    if (Array.isArray(parsedContent)) {
        data = parsedContent;
    } else if (parsedContent?.data && Array.isArray(parsedContent.data)) {
        data = parsedContent.data;
        metadata = parsedContent.metadata;
    } else {
        throw new Error('Cấu trúc file backup không hợp lệ.');
    }

    if (data.length === 0) throw new Error('File backup rỗng.');

    if (metadata && metadata.appName !== EXPECTED_APP_NAME) {
        throw new Error(`File này không phải backup của Report BI (appName: "${metadata.appName}"). Vui lòng chọn đúng file .json đã xuất từ mục Sao lưu.`);
    }

    return { data, metadata };
};

const NAV_STATE_AFTER_RESTORE: Record<string, string> = {
    'main-active-view': 'dashboard',
    'dashboard-main-tab': 'realtime',
    'dashboard-sub-tab': 'revenue',
    'dashboard-active-supermarket': 'Tổng',
};

/** Ghi đè toàn bộ IndexedDB bằng dữ liệu backup đã parse. Gọi sau khi user đã xác nhận. */
export const restoreFromBackup = async (data: BackupDataEntry[]): Promise<void> => {
    await db.clearStore();
    await db.setMany(data);
    for (const [key, value] of Object.entries(NAV_STATE_AFTER_RESTORE)) {
        await db.set(key, value);
    }
    // Ghi log SAU khi ghi đè xong — audit-trail-log cũng bị clearStore() xoá nên ghi trước
    // sẽ mất dấu vết ngay lập tức.
    await logAuditEvent({ action: 'restore-backup', label: `Khôi phục từ file backup (${data.length} mục)` });
};
