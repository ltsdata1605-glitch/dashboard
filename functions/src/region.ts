/**
 * Vùng chạy của các hàm app gọi trực tiếp (2026-10-14). Firestore `(default)` ở asia-southeast1 (Singapore) — gần
 * Việt Nam nhất (Google không có vùng ở Việt Nam). Trước đây các hàm này ở us-central1 (Mỹ): mỗi lần đăng nhập đi
 * Việt Nam → Mỹ → Singapore (đọc/ghi Firestore) → Mỹ → Việt Nam.
 *
 * Bản ở us-central1 ĐÃ GỠ 2026-10-21: log 7 ngày cho thấy lượt gọi cuối của app bản cũ vào Mỹ là 15/10. Hàm chạy theo
 * lịch (demoteExpiredUsers) KHÔNG dùng mảng này — thêm vùng là chạy 2 lần.
 */
export const CLIENT_REGIONS = ['asia-southeast1'];
