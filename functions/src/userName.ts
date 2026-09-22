/**
 * Rút gọn tên hiển thị LINE của nhân viên về dạng "Mã NV - Tên" cho tin xác nhận dùng PMH:
 *   "DMST-Nhân-107617SALE"  -> "107617 - Nhân"
 *   "ĐMST_Lâm_62864_AIO"    -> "62864 - Lâm"
 *   "STR_ Trường_21453-TC"  -> "21453 - Trường"
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

    const isCode = (s: string) => /^[A-ZĐ0-9]{1,6}$/.test(s); // DMST, ĐMST, STR, HGI, TC, AIO, BOSS…
    let nameParts = parts.slice(0, idIdx);
    if (nameParts.length > 0 && isCode(nameParts[0])) nameParts = nameParts.slice(1);
    if (nameParts.length === 0) {
        // Mã đứng đầu ("107617 - Nhân" đã gọn, hoặc "STR_21453_Trường"): lấy đoạn sau mã không phải mã kho/hậu tố
        nameParts = parts.slice(idIdx + 1).filter(p => !isCode(p)).slice(0, 2);
    }
    const shortName = nameParts.join(' ').trim();
    return shortName ? `${id} - ${shortName}` : name;
}
