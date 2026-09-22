/**
 * Cổng kiểm tra NGHIÊM cho form xin PMH (bước 4 của webhook). Chỉ coi là form khi đủ 3 phần:
 *   1. Dòng ĐẦU TIÊN là tiêu đề form: "📝 FORM MẪU LẤY PMH" / "[ĐĂNG KÝ PMH] <sản phẩm>" / "[PMH]…"
 *      (hoặc chứa "lấy PMH" / "xin PMH" / "đăng ký PMH").
 *   2. Có sản phẩm: dòng "Loại PMH: …" / "Loại: …", hoặc tên sản phẩm ngay sau "[ĐĂNG KÝ PMH]".
 *   3. Có mã đơn: dòng "MĐH Áp dụng: …" / "MĐH: …" / "Mã ĐH: …" (4-25 ký tự chữ-số).
 * Trước đây chỉ cần thấy "MĐH:" + "Sản phẩm:" là bot trả lời — tin "HỖ TRỢ GIAO HÀNG" của nhân
 * viên (có MĐH + Sản phẩm: Tủ Đông) bị bot đáp "hết hạn mã PMH" (2026-09-22). Chủ dự án yêu
 * cầu: PHẢI ĐÚNG 100% CÚ PHÁP mới xử lý.
 */
export function isStrictPmhRequestForm(text: string): boolean {
    const lines = String(text || '').split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) return false;
    const header = lines[0].normalize('NFC');
    const headerOk = /(form\s*mẫu\s*lấy\s*pmh|lấy\s*pmh|xin\s*pmh|đăng\s*ký\s*pmh|^\[\s*pmh\s*\])/i.test(header)
        || /^📝.*pmh/i.test(header);
    if (!headerOk) return false;

    const headerProduct = header.match(/^\[\s*(?:đăng\s*ký\s*pmh|pmh)\s*\]\s*(.+)$/i)?.[1]?.trim() || '';
    const hasType = headerProduct.length > 0
        || lines.slice(1).some(l => /^(?:loại(?:\s*pmh)?|mệnh\s*giá)\s*[:：]\s*\S/i.test(l.normalize('NFC')));
    const hasOrder = lines.slice(1).some(l => /^(?:mđh|mdh|mã\s*đh|mã\s*đơn\s*hàng|đơn\s*hàng)(?:\s*áp\s*dụng)?\s*[:：]\s*[A-Za-z0-9_-]{4,25}\s*$/i.test(l.normalize('NFC')));
    return hasType && hasOrder;
}
