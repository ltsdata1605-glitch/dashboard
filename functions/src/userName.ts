/**
 * Rút gọn tên hiển thị LINE của nhân viên về dạng "Mã NV - Tên" cho tin xác nhận dùng PMH:
 *   "DMST-Nhân-107617SALE"  -> "107617 - Nhân"
 *   "ĐMST_Lâm_62864_AIO"    -> "62864 - Lâm"
 *   "STR_ Trường_21453-TC"  -> "21453 - Trường"
 *   "HGI_ĐẠT_25260_BOSS"    -> "25260 - Đạt"   (tên chỉ viết hoa chữ đầu)
 * Tên LINE do từng người tự đặt, chỉ có quy ước lỏng "<kho>_<tên>_<mã NV><hậu tố>": tách theo
 * `_` `-` khoảng trắng, mã NV = đoạn 4-7 chữ số (có thể dính hậu tố chữ như 107617SALE), tên =
 * các đoạn giữa tiền tố kho (toàn chữ HOA ≤ 6 ký tự) và mã. Không tìm thấy mã -> trả nguyên.
 *
 * ⚠️ public/liff-copy.html có bản JS chép nguyên logic này (trang tĩnh, không bundler) — sửa
 * ở đây thì sửa cả bên đó.
 */
export function formatShortUserName(raw: string): string {
    const name = String(raw || '').trim();
    if (!name) return name;
    const parts = name.split(/[\s_\-–—]+/).filter(Boolean);
    let idIdx = -1;
    let id = '';
    for (let i = 0; i < parts.length; i++) {
        const m = parts[i].match(/^(\d{4,7})[^\d]*$/);
        if (m) { idIdx = i; id = m[1]; break; }
    }
    if (idIdx === -1) return name;

    // Mã kho / hậu tố chức danh: toàn chữ HOA ≤ 6 ký tự, hoặc thuộc danh sách quen (kể cả viết thường)
    const KNOWN_CODES = new Set(['DMST', 'ĐMST', 'DMX', 'ĐMX', 'STR', 'HGI', 'TGDD', 'TC', 'AIO', 'BOSS', 'SALE', 'QL', 'NV']);
    const isCode = (s: string) => /^[A-ZĐ0-9]{1,6}$/.test(s) || KNOWN_CODES.has(s.toUpperCase());
    const after = parts.slice(idIdx + 1).filter(p => !isCode(p)); // đoạn tên đứng SAU mã (STR_21453_Trường)
    let nameParts = parts.slice(0, idIdx);
    // Bỏ tiền tố kho — nhưng nếu nó là đoạn duy nhất trước mã và sau mã cũng không có tên
    // ("HUY_143998": tên viết HOA trông như mã kho) thì giữ lại làm tên.
    if (nameParts.length > 0 && isCode(nameParts[0]) && (nameParts.length > 1 || after.length > 0)) nameParts = nameParts.slice(1);
    if (nameParts.length === 0) nameParts = after.slice(0, 2);
    const shortName = nameParts.map(titleCaseVi).join(' ').trim();
    return shortName ? `${id} - ${shortName}` : name;
}

/** "ĐẠT" -> "Đạt", "nhân" -> "Nhân" — chỉ viết hoa chữ đầu (chuẩn hoá NFC để Đ/Ạ là 1 ký tự). */
function titleCaseVi(word: string): string {
    const w = word.normalize('NFC');
    return w.charAt(0).toLocaleUpperCase('vi') + w.slice(1).toLocaleLowerCase('vi');
}
