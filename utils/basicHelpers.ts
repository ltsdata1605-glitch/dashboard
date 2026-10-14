/**
 * Hàm tiện ích NHỎ, THUẦN mà khung app (thanh bên, thanh tab dưới, đồng bộ cloud, firestoreService) cần NGAY lúc mở app.
 *
 * Vì sao tách khỏi utils/dataUtils.ts (2026-10-14, GĐ9 — gói tải đầu): dataUtils + constants (~33 KB chưa nén) là bộ công
 * thức số liệu dùng ở các tab tải lười. Khung app chỉ cần 4 hàm dưới đây, nhưng vì nó import dataUtils nên Rollup đặt CẢ
 * dataUtils + constants vào gói index (modulepreload lúc mở app) — màn đăng nhập cũng phải tải bộ công thức doanh thu.
 * Code khung app import THẲNG file này; dataUtils.ts vẫn xuất lại 4 hàm (features/* chỉ được import dataUtils).
 * ⚠️ Đừng import gì nặng vào đây — file này nằm trong gói tải đầu.
 */

/**
 * Tách `departmentId` thành danh sách Mã Kho THẬT (bỏ khoảng trắng, rỗng, và nhãn "ALL" /
 * "ALL (Super Admin)"). Super Admin mang nhãn đó KÈM các Kho thật gắn thêm, vd
 * "ALL (Super Admin),910" (functions/src/superAdminDept.ts) — nhãn không phải Kho nên không được
 * lọt vào danh sách đọc/ghi khoData/biData (Rules sẽ từ chối, làm hỏng cả lượt tải).
 */
export function parseKhoList(departmentId: string | null | undefined): string[] {
    return (departmentId || '')
        .split(',')
        .map(k => k.trim())
        .filter(k => k && k !== 'ALL' && k !== 'ALL (Super Admin)');
}

/** Lấy message an toàn từ 1 giá trị catch (error: unknown), không giả định error là Error. */
export function getErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    if (typeof error === 'string') return error;
    try {
        return String(error);
    } catch {
        return 'Unknown error';
    }
}

/**
 * Lấy field `code` an toàn từ 1 giá trị catch (error: unknown) — dùng cho lỗi kiểu
 * FirebaseError (`error.code`, VD 'auth/popup-blocked', 'permission-denied') mà không cần
 * `any`. Trả về undefined nếu error không có field `code` dạng string.
 */
export function getErrorCode(error: unknown): string | undefined {
    if (typeof error === 'object' && error !== null && 'code' in error) {
        const code = (error as { code?: unknown }).code;
        return typeof code === 'string' ? code : undefined;
    }
    return undefined;
}

/**
 * Làm sạch tên hiển thị người dùng, loại bỏ phần trùng lặp (ví dụ: Google account có dạng "Tên (Tên mã_số)" hoặc "Tên (Tên)")
 * Ví dụ: "MT2 - AM - SƠN (MT2 - AM - SƠN 21707)" -> "MT2 - AM - SƠN"
 */
export function formatCleanDisplayName(name?: string | null, fallback = 'Thành viên YCX'): string {
    if (!name || typeof name !== 'string') return fallback;
    let clean = name.replace(/\s+/g, ' ').trim();
    if (!clean) return fallback;

    // Trường hợp 1: "Outer Name (Inner Name)" trong đó Inner Name trùng hoặc lặp lại Outer Name
    const parenMatch = clean.match(/^(.*?)\s*\((.*?)\)$/);
    if (parenMatch) {
        const outer = parenMatch[1].trim();
        const inner = parenMatch[2].trim();
        const outerLower = outer.toLowerCase();
        const innerLower = inner.toLowerCase();

        if (
            innerLower === outerLower ||
            innerLower.startsWith(outerLower) ||
            outerLower.startsWith(innerLower)
        ) {
            clean = outer;
        }
    }

    // Trường hợp 2: "Tên - Tên" trùng lặp
    const dashParts = clean.split(/\s*[-–—]\s*/);
    if (dashParts.length === 2 && dashParts[0].toLowerCase() === dashParts[1].toLowerCase()) {
        clean = dashParts[0];
    }

    return clean || fallback;
}
