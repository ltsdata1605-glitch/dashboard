/**
 * Token cho các BẢNG DÀY của Report BI — chuẩn "Bảng điều khiển ca trực" (2026-09-11).
 *
 * Vì sao có file này: ba bảng dày (Tổng quan Siêu thị, Chi tiết Ngành hàng, bảng 48 cột Thi đua)
 * cùng phải tuân một chuẩn, nhưng trước đây mỗi file tự khai chuỗi class riêng. Hệ quả thật: khi bỏ
 * nền màu phân nhóm, phần viền thay thế chỉ được thêm cho một số file/một số ô, và lỗi "thiếu đường
 * phân cách" tái diễn BỐN lần. Khai một chỗ thì sửa một chỗ.
 *
 * Nguyên tắc gốc: mỗi pixel dành cho SỐ, không dành cho trang trí. Màu dành cho DỮ LIỆU (ngưỡng
 * đạt/chưa đạt) và cho vạch trạng thái ở mép dòng — KHÔNG dành cho nền tiêu đề.
 *
 * Kiểm chứng tự động: `tests/e2e/table-rules.spec.ts` đo hình học mọi đường kẻ dọc của 4 bảng.
 */

/** Nền + chữ hàng TIÊU ĐỀ NHÓM (hàng `colSpan` trên cùng). Một tông xám cho mọi nhóm. */
export const GROUP_TONE_BG = 'bg-slate-100 dark:bg-slate-800';
export const GROUP_TONE_TEXT = 'text-slate-600 dark:text-slate-300';

/**
 * Viền 2px MỞ ĐẦU mỗi nhóm cột — thay cho nền màu đã bỏ.
 *
 * Đặt ở mép TRÁI của ô mở đầu nhóm chứ không phải mép phải ô trước: `border-collapse` khiến hai
 * cái đó vẽ ra cùng một nét, mà đặt bên trái thì không phụ thuộc ô đứng trước là ô gì (ô `rowSpan`
 * của cột ghim, ô cuối nhóm trước, hay ô `colSpan` của hàng tiêu đề nhóm).
 *
 * Viền dày chỉ dùng đúng 2 chỗ — mép phải cột ghim, và đầu mỗi nhóm cột. Mép cột ghim được kẻ
 * GIÁN TIẾP bằng chính token này đặt lên nhóm đầu tiên: viền đặt thẳng lên ô `sticky` trong bảng
 * `border-collapse` không đáng tin (viền thuộc về bảng chứ không đi theo ô khi cuộn ngang).
 */
export const GROUP_EDGE = 'border-l-2 border-l-slate-300 dark:border-l-slate-600';
