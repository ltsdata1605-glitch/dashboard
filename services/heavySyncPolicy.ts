/**
 * Quyết định "có lấy dữ liệu khoá nặng từ Cloud về máy không" — tách khỏi
 * `hooks/useCloudSync.ts` để test được bằng vitest (`environment: 'node'`, không render React).
 *
 * VÌ SAO TÁCH RA (đọc trước khi sửa bất cứ gì ở đây):
 * Đây là đường đồng bộ cấu hình nặng giữa các thiết bị, và là chỗ đã sinh ra ÍT NHẤT 3 lần bug do
 * người dùng báo — trong đó bug "self-echo" (lượt ghi của chính tab này vọng về và bị hiểu nhầm là
 * "thiết bị khác vừa sửa") bị báo lại tới lần thứ 3 dù đã có 2 lớp phòng thủ. Logic nằm lẫn trong
 * một callback `onSnapshot` dài nên không có cách nào viết test cho nó. Tách thành hàm thuần là
 * bước bắt buộc TRƯỚC khi đổi cơ chế listener.
 *
 * Bản tách này KHÔNG đổi hành vi: giữ nguyên thứ tự kiểm tra, và cố ý chia làm 2 hàm để giữ đúng
 * thứ tự I/O của bản gốc — chỉ đọc IndexedDB SAU khi đã qua các lớp chặn rẻ.
 */

/** Lý do bỏ qua một document từ Cloud. Dùng để log đúng như bản gốc và để test khẳng định. */
export type SkipReason =
    | 'not-heavy-key'
    | 'self-echo-pending-writes'
    | 'local-write-pending-or-in-flight'
    | 'no-data'
    | 'malformed';

export type ConsiderResult =
    | { consider: true; cloudTimeMs: number }
    | { consider: false; reason: SkipReason };

export interface CloudDocShape {
    chunked?: boolean;
    value?: unknown;
    /** Firestore Timestamp (có `.toMillis()`), hoặc số ms, tuỳ bản ghi cũ/mới. */
    updatedAt?: { toMillis?: () => number } | number | null;
    /** Field của bản ghi CŨ, trước khi chuyển sang `updatedAt`. */
    savedAt?: number | null;
}

/**
 * Lấy mốc thời gian Cloud của document, chịu được 3 dạng dữ liệu đang cùng tồn tại trong Firestore.
 *
 * Trả 0 khi không xác định được — và 0 là giá trị ĐÚNG về mặt an toàn: nó khiến
 * `isCloudNewer()` chỉ lấy về khi máy chưa có dữ liệu, chứ không bao giờ ghi đè bản local mới hơn.
 */
export const extractCloudTimeMs = (data: CloudDocShape): number => {
    const ts = data.updatedAt;
    if (ts && typeof ts === 'object' && typeof ts.toMillis === 'function') return ts.toMillis();
    if (typeof ts === 'number') return ts;
    if (typeof data.savedAt === 'number') return data.savedAt;
    return 0;
};

export interface ConsiderInput {
    /** Khoá này có nằm trong danh sách khoá nặng không (`isHeavySyncKey`). */
    isHeavyKey: boolean;
    /**
     * `snapshot.metadata.hasPendingWrites` — tín hiệu TRỰC TIẾP từ SDK Firestore: `true` nghĩa là
     * snapshot này đến từ cache cục bộ của CHÍNH tab này cho một lượt ghi chưa được server xác
     * nhận. Đây là lớp chặn self-echo đáng tin cậy nhất nên phải kiểm TRƯỚC.
     */
    hasPendingWrites: boolean;
    /**
     * Tab này đang có lượt ghi cho khoá đó: chờ debounce (`heavyTimeoutsRef`) hoặc đang bay lên
     * server (`isHeavyKeyInFlight`). Lớp chặn self-echo thứ 2, giữ làm dự phòng.
     */
    localWritePendingOrInFlight: boolean;
    data: CloudDocShape | null | undefined;
}

/**
 * Các lớp chặn RẺ (không chạm I/O). Chỉ khi hàm này trả `consider: true` thì nơi gọi mới nên đọc
 * IndexedDB — giữ đúng thứ tự của bản gốc, tránh đọc local vô ích.
 */
export const considerCloudDoc = (input: ConsiderInput): ConsiderResult => {
    if (!input.isHeavyKey) return { consider: false, reason: 'not-heavy-key' };
    if (input.hasPendingWrites) return { consider: false, reason: 'self-echo-pending-writes' };
    if (input.localWritePendingOrInFlight) {
        return { consider: false, reason: 'local-write-pending-or-in-flight' };
    }
    if (!input.data) return { consider: false, reason: 'no-data' };
    // Document không chunk mà cũng không có `value` = bản ghi dở dang/hỏng → bỏ qua, đừng ghi đè
    // dữ liệu local bằng thứ không đọc được.
    if (!input.data.chunked && input.data.value === undefined) {
        return { consider: false, reason: 'malformed' };
    }
    return { consider: true, cloudTimeMs: extractCloudTimeMs(input.data) };
};

/**
 * Cloud có mới hơn local không.
 *
 * `localValueExists === false` (máy chưa có dữ liệu khoá này) thì LUÔN lấy về, bất kể mốc thời
 * gian — nếu không, thiết bị mới hoặc máy vừa xoá dữ liệu trình duyệt sẽ kẹt vĩnh viễn ở trạng
 * thái rỗng khi cloud không có thay đổi nào mới.
 *
 * Dùng `>` (không phải `>=`): bằng nhau nghĩa là local đã khớp đúng trạng thái cloud đó.
 */
export const isCloudNewer = (
    cloudTimeMs: number,
    localValueExists: boolean,
    localTimeMs: number
): boolean => !localValueExists || cloudTimeMs > localTimeMs;
