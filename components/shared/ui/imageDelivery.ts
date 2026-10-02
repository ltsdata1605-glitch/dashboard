import { isAbortError, isNotAllowedError, isMobileLikeDevice } from '../../../utils/dataUtils';
import { offerShareRetry } from './ShareRetryToast';
import { interceptImageDelivery } from '../export/lineDelivery';

/**
 * GIAO ẢNH ĐÃ DỰNG cho người dùng — dùng chung cho mọi khu vực (audit A05–A08, 2026-09-30).
 *
 * Trước đây mỗi khu vực tự viết một bản: có bản thu hồi blob URL ngay sau click() (Safari tải
 * hỏng), có bản không nhận iPad, có bản luôn tải file trên iPhone (không mở được Lưu ảnh/LINE/Zalo),
 * có bản không có nút chạm lại khi Safari từ chối chia sẻ. Hàm này theo đúng mẫu đã kiểm chứng của
 * services/uiService.ts (Phân tích) và trả về KẾT QUẢ THẬT để nơi gọi báo đúng.
 *
 * Chỉ lo KHÂU GIAO — dựng ảnh (html-to-image/html2canvas, bố cục, phông, QR…) vẫn thuộc từng khu
 * vực vì mỗi nơi có bố cục in riêng.
 */

export type DeliveryResult =
    /** Bảng chia sẻ đã mở và người dùng chọn đích */
    | 'shared'
    /** Đã tải file về máy */
    | 'downloaded'
    /** Người dùng đóng bảng chia sẻ */
    | 'cancelled'
    /** Safari từ chối vì dựng ảnh quá ~1s sau lượt chạm — đã hiện nút "Chia sẻ / Lưu ảnh" để chạm lại */
    | 'retry-offered'
    /** Ảnh được chuyển vào hàng đợi gửi nhóm LINE (nút "Gửi nhóm LINE"), không tải về */
    | 'line';

/** Tải file về máy. Thu hồi URL TRỄ: Safari iOS đọc blob URL không đồng bộ sau click(). */
export function downloadBlobFile(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = filename;
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/** Tiêu đề hiển thị khi chia sẻ: bỏ đuôi .png, gạch dưới → khoảng trắng. */
const displayNameOf = (filename: string) =>
    filename.replace(/\.png$/i, '').replace(/_/g, ' ').replace(/\s+/g, ' ').trim() || 'Anh xuat';

/**
 * Giao ảnh: máy tính → tải về; điện thoại/iPad → bảng chia sẻ hệ thống (fallback tải về).
 * `share`: ép bật/tắt nhánh chia sẻ (mặc định theo thiết bị).
 */
export async function deliverImage(
    blob: Blob,
    filename: string,
    opts: { share?: boolean; title?: string } = {},
): Promise<DeliveryResult> {
    // Đang trong lượt "Gửi nhóm LINE" (components/shared/export/lineDelivery.ts): ảnh vào hàng đợi gửi LINE.
    // Phải gọi TRƯỚC mọi await — nơi gọi `void deliverImage(...)` không chờ hàm này.
    if (interceptImageDelivery(blob, filename)) return 'line';
    const wantShare = opts.share ?? isMobileLikeDevice();
    if (!wantShare) {
        downloadBlobFile(blob, filename);
        return 'downloaded';
    }
    const displayName = opts.title || displayNameOf(filename);
    const shareData: ShareData = {
        files: [new File([blob], `${displayNameOf(filename)}.png`, { type: blob.type || 'image/png' })],
        title: displayName,
        text: displayName,
    };
    try {
        if (typeof navigator.canShare === 'function' && navigator.canShare(shareData)) {
            await navigator.share(shareData);
            return 'shared';
        }
    } catch (error) {
        if (isAbortError(error)) return 'cancelled';
        if (isNotAllowedError(error)) {
            offerShareRetry(shareData, () => downloadBlobFile(blob, filename));
            return 'retry-offered';
        }
        console.error('[imageDelivery] Lỗi khi chia sẻ, chuyển sang tải file:', error);
    }
    downloadBlobFile(blob, filename);
    return 'downloaded';
}
