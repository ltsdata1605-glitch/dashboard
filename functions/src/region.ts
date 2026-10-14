/**
 * Vùng chạy của các hàm app gọi trực tiếp (2026-10-14). Firestore `(default)` ở asia-southeast1 (Singapore) — gần
 * Việt Nam nhất (Google không có vùng ở Việt Nam). Trước đây các hàm này ở us-central1 (Mỹ): mỗi lần đăng nhập đi
 * Việt Nam → Mỹ → Singapore (đọc/ghi Firestore) → Mỹ → Việt Nam.
 *
 * TẠM giữ thêm us-central1 để app bản cũ còn trong máy người dùng (iPhone chưa mở lại app) vẫn gọi được.
 * Gỡ `us-central1` khỏi mảng này sau ~2026-10-21 (khi mọi máy đã nhận bản app gọi Singapore) rồi deploy
 * `--force` để xoá bản ở Mỹ. Hàm chạy theo lịch (demoteExpiredUsers) KHÔNG dùng mảng này — 2 vùng là chạy 2 lần.
 */
export const CLIENT_REGIONS = ['asia-southeast1', 'us-central1'];
