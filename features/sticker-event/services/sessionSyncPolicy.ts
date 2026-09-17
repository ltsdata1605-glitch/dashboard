/**
 * Chính sách nhịp lưu trạng thái phiên làm việc của In Sticker (displayedProducts +
 * inventoryFilters) — tách riêng khỏi `hooks/useStickerEventState.ts` để test được bằng vitest
 * (cấu hình `environment: 'node'`, không render React).
 *
 * Lý do tồn tại (audit hạn mức Firestore 2026-09-17, xem implementation_plan.md mục "Audit hạn
 * mức đọc/ghi Firestore"): trạng thái phiên được lưu vào 2 nơi có GIÁ hoàn toàn khác nhau —
 * IndexedDB cục bộ miễn phí, còn mỗi lượt ghi Firestore trừ vào hạn mức 20.000 ghi/ngày dùng
 * CHUNG cho cả project `dashboa-7e20b` (cả 4 khu vực của dự án). Trước bản sửa này cả hai dùng
 * chung 1 debounce 1s nên mỗi cú click/ký tự của người dùng tốn 1 lượt ghi Firestore.
 */

/** Ghi IndexedDB cục bộ: miễn phí + cần phản hồi nhanh → debounce ngắn. */
export const LOCAL_SAVE_DEBOUNCE_MS = 1000;

/** Ghi Firestore: tốn hạn mức + chỉ để khôi phục phiên giữa các thiết bị → debounce dài. */
export const CLOUD_SAVE_DEBOUNCE_MS = 20000;

/**
 * Trần chờ: dù người dùng thao tác liên tục (mỗi thao tác đẩy lùi debounce), thay đổi cũ nhất
 * chưa đồng bộ không bao giờ bị giữ lâu hơn mốc này. Không có trần, một phiên làm việc dồn dập
 * sẽ KHÔNG BAO GIỜ đồng bộ được lên cloud cho tới khi người dùng ngừng tay 20s.
 */
export const CLOUD_SAVE_MAX_WAIT_MS = 60000;

/**
 * Thời gian còn phải chờ trước lượt ghi Firestore kế tiếp.
 *
 * @param pendingSinceMs Mốc thời gian của thay đổi ĐẦU TIÊN chưa được ghi lên cloud
 *                       (`null` = không có gì đang chờ).
 * @param nowMs          Thời điểm hiện tại.
 * @returns Số ms cần chờ — luôn nằm trong [0, CLOUD_SAVE_DEBOUNCE_MS].
 */
export const cloudSaveDelayMs = (pendingSinceMs: number | null, nowMs: number): number => {
    if (pendingSinceMs === null) return CLOUD_SAVE_DEBOUNCE_MS;
    const waitedMs = nowMs - pendingSinceMs;
    return Math.max(0, Math.min(CLOUD_SAVE_DEBOUNCE_MS, CLOUD_SAVE_MAX_WAIT_MS - waitedMs));
};

/**
 * Có thực sự cần ghi lên Firestore lần này không.
 *
 * Đây là lớp chặn chính cho các lượt flush bị gọi lặp mà nội dung KHÔNG đổi: chuyển tab qua lại
 * (`visibilitychange`), đóng tab ngay sau khi debounce vừa ghi (`beforeunload`). Trước bản sửa
 * này 2 handler đó ghi thẳng, không qua debounce hay so sánh nào, nên chỉ cần chuyển tab vài lần
 * là ghi lặp đúng payload cũ.
 *
 * @param revision            Số bản sửa hiện tại (tăng 1 mỗi lần trạng thái đổi).
 * @param lastSyncedRevision  Số bản sửa của lượt ghi cloud thành công gần nhất.
 */
export const shouldSyncToCloud = (revision: number, lastSyncedRevision: number): boolean =>
    revision !== lastSyncedRevision;
