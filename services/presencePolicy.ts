/**
 * Chính sách nhịp "presence" (đang online) — tách khỏi `hooks/useSystemTraffic.ts` để test được
 * bằng vitest (cấu hình `environment: 'node'`, không render React, không cần mock Firebase).
 *
 * QUOTA FIX (2026-09-17, audit hạn mức Firestore — xem implementation_plan.md mục "Audit hạn mức
 * đọc/ghi Firestore"): hạn mức Spark cho cả project `dashboa-7e20b` chỉ 20.000 lượt GHI/ngày, mà
 * presence ping là lượt ghi cho MỌI người dùng đăng nhập (không riêng admin). Ở chu kỳ 5 phút cũ:
 * 12 ghi/giờ/người ≈ 96 ghi mỗi ngày làm việc/người → 20 người là ~1.900 lượt ghi/ngày chỉ để hiện
 * con số "đang online".
 */

/** Chu kỳ ghi `users/{uid}.lastActive`. */
export const PRESENCE_PING_INTERVAL_MS = 15 * 60 * 1000;

/**
 * Cửa sổ tính "đang online".
 *
 * BẮT BUỘC lớn hơn `PRESENCE_PING_INTERVAL_MS`: ping gần nhất của một người đang dùng thật có thể
 * đã cũ tới đúng 1 chu kỳ ping, nên cửa sổ hẹp hơn chu kỳ sẽ đếm THIẾU người đang online. Bất biến
 * này được khoá bằng test (`tests/unit/presence-policy.test.ts`) vì nếu ai đó nâng chu kỳ ping lên
 * mà quên nới cửa sổ thì con số online tụt xuống một cách âm thầm, không có lỗi nào báo.
 *
 * Hệ quả cần biết: "đang online" nghĩa là "hoạt động trong 20 phút gần nhất" (trước bản sửa là 15
 * phút) — chấp nhận được cho 1 con số thống kê ước lượng trên Dashboard.
 */
export const ONLINE_WINDOW_MS = 20 * 60 * 1000;

/** Chu kỳ đếm số người online (chỉ admin gọi). Giữ nguyên như trước bản sửa. */
export const ONLINE_COUNT_INTERVAL_MS = 10 * 60 * 1000;

/**
 * Đã tới lúc chạy lại chưa (dùng cho cả ping và đếm online).
 *
 * Cần thiết vì `startIntervals()` trong `useSystemTraffic` gọi NGAY hành động rồi mới đặt
 * `setInterval`, và nó chạy lại mỗi lần tab visible trở lại — không có hàm chặn này thì chỉ cần
 * chuyển qua lại giữa các tab vài chục lần là tốn đúng số đó lượt ghi/đọc Firestore, dù chưa hết
 * chu kỳ nào. `lastAtMs = 0` nghĩa là chưa từng chạy (hoặc lượt trước lỗi) → chạy ngay.
 */
export const shouldRunAgain = (lastAtMs: number, intervalMs: number, nowMs: number): boolean =>
    lastAtMs === 0 || nowMs - lastAtMs >= intervalMs;
