
/**
 * Shared cached Intl.NumberFormat instance for VND currency formatting.
 * Creating this once instead of per-call avoids ~10x CPU overhead.
 */
const currencyFormatter = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });

export const formatCurrency = (value: number): string => currencyFormatter.format(value);

/**
 * % giảm giá so với giá gốc, làm tròn gần nhất. Dùng chung để tránh 2 công thức
 * tương đương viết ở 2 nơi cho kết quả lệch nhau ở biên .5 (Math.round không đối xứng).
 */
export const calculateDiscountPercent = (originalPrice: number, finalPrice: number): number =>
    originalPrice > 0 ? Math.round(((originalPrice - finalPrice) / originalPrice) * 100) : 0;

/**
 * Heuristic chuẩn hoá đơn vị: nếu giá mới trông như đang nhập thiếu 3 số 0 so với
 * giá cũ (VD giá cũ 1.500.000, giá mới nhập nhầm "1500" thay vì "1500000"), nhân lại x1000.
 * Trước đây copy-paste y hệt ở 8 nơi khắp features/sticker-event — gộp về đây để sửa 1 chỗ.
 */
export const normalizeStickerPriceUnit = (oldVal: number, newVal: number): number =>
    newVal * 1000 <= oldVal * 1.5 && newVal < oldVal ? newVal * 1000 : newVal;

/**
 * % thay đổi giá (newVal so với oldVal), chỉ trả về chuỗi khi có GIẢM (ratio < 0),
 * ngược lại trả về '' (không hiển thị badge khi giá tăng/giữ nguyên). Quy ước dấu
 * ngược với calculateDiscountPercent ở trên (số âm) — 2 luồng UI khác nhau (in tem
 * QR/thưởng NV vs nhập Excel tạo tem Giá sốc/Giờ vàng), không gộp chung 1 hàm để
 * tránh đổi dấu/kết quả hiển thị đang có.
 */
export const formatPriceChangePercent = (oldPriceStr: string, newPriceStr: string): string => {
    const oldVal = Number(oldPriceStr.replace(/\D/g, ''));
    let newVal = Number(newPriceStr.replace(/\D/g, ''));
    if (oldVal <= 0 || newVal <= 0) return '';
    newVal = normalizeStickerPriceUnit(oldVal, newVal);
    const ratio = Math.round((newVal / oldVal - 1) * 100);
    return ratio < 0 ? `${ratio}%` : '';
};

/**
 * Số tiền giảm giá quy đổi ra "K"/"triệu" để hiển thị badge (VD 1.500.000đ → "1.5 triệu").
 * Trả về null nếu không có giảm giá thực (diff <= 0).
 */
export const formatDiscountAmount = (oldVal: number, newVal: number): { num: string; unit: 'K' | 'triệu' } | null => {
    const diff = oldVal - newVal;
    if (diff <= 0) return null;
    if (diff < 1000000) {
        return { num: (diff / 1000).toString(), unit: 'K' };
    }
    return { num: Number((diff / 1000000).toFixed(1)).toString(), unit: 'triệu' };
};
