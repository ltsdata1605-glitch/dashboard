import { isAbortError, isNotAllowedError, isMobileLikeDevice } from '../../../../utils/dataUtils';
import { offerShareRetry } from '../../../../components/shared/ui/ShareRetryToast';

export type ExportMode = 'download' | 'share' | 'blob-only';

/** Download a blob as a file */
export function downloadBlob(blob: Blob, filename: string, forceDownload = false) {
    const isMobile = isMobileLikeDevice();
    if (isMobile && blob.type.startsWith('image/') && !forceDownload) {
        shareBlob(blob, filename);
        return;
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = filename;
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    // Thu hồi TRỄ: Safari iOS đọc blob URL không đồng bộ sau click() — thu hồi ngay là tải hỏng.
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/** Check if Web Share API with file sharing is available */
export function canShareFiles(): boolean {
    if (!navigator.share || !navigator.canShare) return false;
    try {
        const testFile = new File(['test'], 'test.png', { type: 'image/png' });
        return navigator.canShare({ files: [testFile] });
    } catch {
        return false;
    }
}

/** Tiêu đề khu vực ảnh được xuất: bỏ đuôi .png, gạch dưới -> khoảng trắng */
const displayNameOf = (filename: string) =>
    filename.replace(/\.png$/i, '').replace(/_/g, ' ').replace(/\s+/g, ' ').trim() || 'Anh xuat';

/** Share a blob via Web Share API (LINE, Zalo, etc.) */
export async function shareBlob(blob: Blob, filename: string): Promise<boolean> {
    const displayName = displayNameOf(filename);
    const shareData = {
        files: [new File([blob], `${displayName}.png`, { type: 'image/png' })],
        title: displayName,
        text: displayName
    };
    try {
        if (navigator.canShare && navigator.canShare(shareData)) {
            await navigator.share(shareData);
            return true;
        } else {
            console.warn('Web Share API không hỗ trợ chia sẻ file trên trình duyệt này.');
            // Fallback: download instead
            downloadBlob(blob, filename, true);
            return false;
        }
    } catch (error: unknown) {
        // User cancelled share — not an error
        if (isAbortError(error)) return false;
        // Safari iOS: dựng ảnh quá ~1s sau lượt chạm → hết hiệu lực chạm. Cho người dùng chạm lại
        // thay vì lặng lẽ rơi xuống tải file (iPhone không mở được bảng Lưu ảnh/LINE/Zalo).
        if (isNotAllowedError(error)) {
            offerShareRetry(shareData, () => downloadBlob(blob, filename, true));
            return false;
        }
        console.error('Lỗi khi chia sẻ:', error);
        // Fallback: download
        downloadBlob(blob, filename, true);
        return false;
    }
}
