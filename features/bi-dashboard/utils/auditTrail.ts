import * as db from './db';

export const getLocalDateKey = (d: Date = new Date()): string => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
};

export interface AuditEntry {
    /** YYYY-MM-DD theo giờ địa phương. */
    date: string;
    /** HH:mm theo giờ địa phương. */
    time: string;
    /** Email người thực hiện, nếu xác định được (bridge từ AuthContext ở root). */
    actor?: string;
    /** Mã hành động ngắn, dạng "nhóm:hành-động", vd 'competition-version:delete'. */
    action: string;
    /** Mô tả ngắn hiển thị cho người dùng. */
    label: string;
    meta?: Record<string, unknown>;
}

const AUDIT_LOG_KEY = 'audit-trail-log' as const;

// Khác competitionHistory.ts (upsert 1 bản/ngày): đây là log NHIỀU sự kiện/ngày, không ghi
// đè trong ngày — nên cần cap kép: theo số ngày giữ lại VÀ theo tổng số dòng tuyệt đối,
// tránh 1 ngày spam nhiều thao tác làm phình document vô hạn.
const MAX_AUDIT_DAYS = 60;
const MAX_AUDIT_ENTRIES = 2000;

const getLocalTime = (d: Date = new Date()): string => {
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
};

// Danh tính người dùng hiện tại — set 1 lần bởi BiWrapper.tsx (nơi duy nhất có quyền
// import AuthContext ở root theo tiền lệ đã có, xem BiWrapper.tsx). Dùng biến module-scope
// thay vì truyền actor qua props ở MỌI lời gọi logAuditEvent() — tránh phải prop-drill qua
// rất nhiều tầng component (DataUpdater/Settings/NhanVien/useNhanVienData...) chỉ để mang
// theo 1 chuỗi email.
let currentActorEmail: string | undefined;
export const setAuditActor = (email: string | undefined | null) => {
    currentActorEmail = email || undefined;
};

export const logAuditEvent = async (entry: { action: string; label: string; meta?: Record<string, unknown> }): Promise<void> => {
    try {
        const current = (await db.get<AuditEntry[]>(AUDIT_LOG_KEY)) || [];
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - MAX_AUDIT_DAYS);
        const cutoffKey = getLocalDateKey(cutoffDate);

        const next = [...current, { ...entry, actor: currentActorEmail, date: getLocalDateKey(), time: getLocalTime() }]
            .filter(e => e.date >= cutoffKey)
            .slice(-MAX_AUDIT_ENTRIES);

        await db.set(AUDIT_LOG_KEY, next);
    } catch (err) {
        // Audit trail không bao giờ được chặn thao tác chính của người dùng khi ghi log lỗi.
        console.warn('[auditTrail] Không ghi được log:', err);
    }
};

/** Danh sách audit gần đây, mới nhất trước. */
export const getAuditLog = async (): Promise<AuditEntry[]> => {
    const list = (await db.get<AuditEntry[]>(AUDIT_LOG_KEY)) || [];
    return [...list].reverse();
};
