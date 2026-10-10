import { isAbortError, isNotAllowedError, isMobileLikeDevice } from '../../../utils/dataUtils';
import { offerShareRetry } from './ShareRetryToast';
import { toast } from './toast';

/**
 * GIAO ẢNH ĐÃ DỰNG cho người dùng — dùng chung cho mọi khu vực (audit A05–A08, 2026-09-30).
 *
 * TẤT CẢ chức năng xuất ảnh thực hiện đồng thời 2 hành động:
 * 1. Tự tải về máy (download file ảnh .png)
 * 2. Tự sao chép ảnh vào Clipboard (người dùng có thể Ctrl+V / Cmd+V dán trực tiếp ngay lập tức)
 */

export type DeliveryResult =
    /** Bảng chia sẻ đã mở và người dùng chọn đích */
    | 'shared'
    /** Đã tải file về máy và copy vào clipboard */
    | 'downloaded'
    /** Người dùng đóng bảng chia sẻ */
    | 'cancelled'
    /** Safari từ chối vì dựng ảnh quá ~1s sau lượt chạm — đã hiện nút "Chia sẻ / Lưu ảnh" để chạm lại */
    | 'retry-offered';

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

/** Sao chép ảnh vào Clipboard để người dùng dán (Ctrl+V / Cmd+V) trực tiếp */
export async function copyBlobToClipboard(blob: Blob): Promise<boolean> {
    try {
        if (!navigator.clipboard || typeof window.ClipboardItem === 'undefined') {
            return false;
        }
        // ClipboardItem chuẩn yêu cầu blob type là image/png
        let pngBlob = blob;
        if (blob.type !== 'image/png') {
            pngBlob = new Blob([await blob.arrayBuffer()], { type: 'image/png' });
        }
        const item = new ClipboardItem({ 'image/png': pngBlob });
        await navigator.clipboard.write([item]);
        return true;
    } catch (err) {
        console.warn('[imageDelivery] Không thể sao chép ảnh vào clipboard:', err);
        return false;
    }
}

/** Tiêu đề hiển thị khi chia sẻ: bỏ đuôi .png, gạch dưới → khoảng trắng. */
const displayNameOf = (filename: string) =>
    filename.replace(/\.png$/i, '').replace(/_/g, ' ').replace(/\s+/g, ' ').trim() || 'Anh xuat';

/**
 * Giao ảnh:
 * Thực hiện 2 hành động đồng thời: Tự tải về máy + Copy ảnh vào bộ nhớ tạm (dán trực tiếp).
 */
export async function deliverImage(
    blob: Blob,
    filename: string,
    opts: { share?: boolean; title?: string } = {},
): Promise<DeliveryResult> {
    const wantShare = opts.share ?? isMobileLikeDevice();

    // 1. TRÊN ĐIỆN THOẠI / IPAD: ƯU TIÊN 100% MỞ BẢNG CHIA SẺ HỆ THỐNG (LINE, Zalo, Lưu ảnh...)
    if (wantShare) {
        const displayName = opts.title || displayNameOf(filename);
        const shareData: ShareData = {
            files: [new File([blob], `${displayNameOf(filename)}.png`, { type: blob.type || 'image/png' })],
            title: displayName,
            text: displayName,
        };

        try {
            if (typeof navigator !== 'undefined' && typeof navigator.canShare === 'function' && navigator.canShare(shareData)) {
                await navigator.share(shareData);
                return 'shared';
            }
        } catch (error) {
            if (isAbortError(error)) return 'cancelled';
            if (isNotAllowedError(error)) {
                // Safari iOS từ chối do dựng ảnh lâu hơn ~1s -> hiển thị nút để người dùng chạm lại
                // TUYỆT ĐỐI KHÔNG tự tiện tải file tại đây vì sẽ làm hiện popup "Bạn có muốn tải về..." của Safari
                offerShareRetry(shareData, () => {
                    downloadBlobFile(blob, filename);
                    toast.success('Đã tải ảnh về máy!', { id: 'export-image-success' });
                });
                return 'retry-offered';
            }
            console.error('[imageDelivery] Lỗi khi chia sẻ:', error);
        }

        // Thiết bị di động không hỗ trợ canShare hoặc lỗi không xác định -> fallback tải về
        downloadBlobFile(blob, filename);
        toast.success('Đã tải ảnh về máy thành công!', {
            id: 'export-image-success',
            duration: 3000
        });
        return 'downloaded';
    }

    // 2. TRÊN MÁY TÍNH (DESKTOP): Tự tải file về máy + Tự copy vào Clipboard
    downloadBlobFile(blob, filename);
    const copied = await copyBlobToClipboard(blob);

    if (copied) {
        toast.success('Đã tải ảnh về máy & sao chép vào bộ nhớ tạm (có thể dán trực tiếp)!', {
            id: 'export-image-success',
            duration: 4000
        });
    } else {
        toast.success('Đã tải ảnh về máy thành công!', {
            id: 'export-image-success',
            duration: 3000
        });
    }

    return 'downloaded';
}
