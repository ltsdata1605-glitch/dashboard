/**
 * Chuỗi dùng được làm ID document Firestore không (2026-10-15). Dùng TRƯỚC mọi `.doc(<chuỗi từ người dùng>)`.
 *
 * Lỗi thật (log 12–14/10): bot LINE coi mọi tin nhắn 2–30 ký tự là "lệnh báo cáo" và tra
 * `report_commands/<tin nhắn>`. Tin có "/" ("em1bộkmss9/10", "iphonevềnhaanh/chị") làm `.doc()` NÉM lỗi
 * → cả lượt webhook văng 500, các sự kiện khác trong cùng lượt cũng bị bỏ. Lệnh đã lưu không thể chứa "/"
 * (Firestore cấm), nên chuỗi không hợp lệ chắc chắn không phải lệnh — chỉ cần bỏ qua.
 * Luật Firestore: không rỗng, không có "/", không phải "." hay "..", không dạng `__…__`, tối đa 1500 byte.
 */
export const laIdDocHopLe = (s: unknown): s is string =>
    typeof s === 'string' &&
    s.length > 0 &&
    !s.includes('/') &&
    s !== '.' && s !== '..' &&
    !/^__.*__$/.test(s) &&
    Buffer.byteLength(s, 'utf8') <= 1500;
