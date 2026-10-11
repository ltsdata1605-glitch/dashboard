/**
 * Nạp phông Google THEO NHU CẦU — một nơi quản lý cho cả 5 khu vực (GĐ2 tăng tốc, KE_HOACH_GIAO_DIEN_APPLE.md mục 4.3 #3).
 *
 * Trước 2026-10-11, `index.html` có MỘT thẻ <link rel="stylesheet"> tải 7 họ phông Google ngay lúc mở app. Thẻ CSS ở <head>
 * CHẶN hiển thị: trình duyệt không vẽ gì cho tới khi tải xong CSS từ fonts.googleapis.com (thêm một vòng DNS + TLS trên 4G),
 * trong khi phông chính của app là UTM Avo tự host. Thực tế lúc mở app chỉ cần **Roboto Condensed** (nhãn cột bảng, có phông
 * dự phòng nên nạp không chặn được); 6 họ còn lại chỉ dùng khi người dùng tự chọn phông khác (FontSelector) hoặc trong In Sticker.
 *
 * - `napPhongGoogle('Inter')` / `napPhongGoogle([...])`: thêm thẻ <link> (không chặn hiển thị), mỗi họ chỉ nạp một lần.
 * - Tên không phải phông Google (UTM Avo, Shopee Display… tự host trong `public/fonts`) thì bỏ qua — gọi thoải mái.
 * - Danh sách họ + độ đậm ở ĐÚNG MỘT chỗ dưới đây (trước nằm trong URL dài của index.html).
 */
const HO_PHONG: Record<string, string> = {
    'Roboto Condensed': 'Roboto+Condensed:wght@400;500;700',
    'Inter': 'Inter:wght@400;500;600;700;800;900',
    'Plus Jakarta Sans': 'Plus+Jakarta+Sans:wght@300;400;500;600;700;800',
    'Oswald': 'Oswald:wght@400;500;600;700',
    'Fjalla One': 'Fjalla+One',
    'Jost': 'Jost:wght@400;500;600;700',
    'Josefin Sans': 'Josefin+Sans:wght@400;500;600;700',
};

/** Mọi họ phông Google app dùng (thứ tự như menu chọn phông). */
export const PHONG_GOOGLE: readonly string[] = Object.keys(HO_PHONG);

/** Chuẩn hoá tên lấy từ CSS ("'Oswald', sans-serif" → "Oswald"). */
export function tenHoPhong(fontFamily: string): string {
    return fontFamily.split(',')[0].replace(/["']/g, '').trim();
}

export function laPhongGoogle(fontFamily: string): boolean {
    return Object.prototype.hasOwnProperty.call(HO_PHONG, tenHoPhong(fontFamily));
}

/** URL CSS của Google Fonts cho các họ đã cho (bỏ họ không phải phông Google). Rỗng nếu không còn họ nào. */
export function urlPhongGoogle(hoPhong: readonly string[]): string {
    const ho = hoPhong.map(tenHoPhong).filter(laPhongGoogle);
    if (!ho.length) return '';
    return `https://fonts.googleapis.com/css2?${ho.map(t => `family=${HO_PHONG[t]}`).join('&')}&display=swap`;
}

/** Họ đã gắn thẻ <link> — để trên globalThis: bundler từng tách module thành 2 bản (xem AuthContext), 2 bản vẫn thấy chung. */
const daNap: Set<string> = ((globalThis as Record<string, unknown>).__ycxPhongGoogleDaNap as Set<string>)
    ?? ((globalThis as Record<string, unknown>).__ycxPhongGoogleDaNap = new Set<string>());

/** Nạp (không chặn hiển thị) các họ phông Google còn thiếu. Gọi nhiều lần không sao. */
export function napPhongGoogle(hoPhong: string | readonly string[]): void {
    if (typeof document === 'undefined') return;
    const can = (typeof hoPhong === 'string' ? [hoPhong] : hoPhong)
        .map(tenHoPhong)
        .filter(t => laPhongGoogle(t) && !daNap.has(t));
    if (!can.length) return;
    can.forEach(t => daNap.add(t));
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = urlPhongGoogle(can);
    link.dataset.phongGoogle = can.join('|');
    document.head.appendChild(link);
}
