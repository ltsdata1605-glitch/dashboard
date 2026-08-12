import { isAbortError } from '../../../../utils/dataUtils';

export type ExportMode = 'download' | 'share' | 'blob-only';

/** Download a blob as a file */
export function downloadBlob(blob: Blob, filename: string, forceDownload = false) {
    const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || window.innerWidth < 768;
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
    URL.revokeObjectURL(url);
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

/** Share a blob via Web Share API (LINE, Zalo, Telegram, etc.) */
export async function shareBlob(blob: Blob, filename: string): Promise<boolean> {
    try {
        const file = new File([blob], filename, { type: 'image/png' });

        // Chuyển đổi tên file thành tên bảng hiển thị tiếng Việt
        let displayName = filename.replace('.png', '').replace(/_/g, ' ');
        displayName = displayName.replace(/Bonus Report/i, 'Báo Cáo Thưởng');
        displayName = displayName.replace(/ChiTiet/i, 'Báo Cáo Chi Tiết');
        displayName = displayName.replace(/BC DoanhThu/i, 'Báo Cáo Doanh Thu');
        displayName = displayName.replace(/BC CrossSelling/i, 'Báo Cáo Bán Kèm');
        displayName = displayName.replace(/BC Installment/i, 'Báo Cáo Trả Góp');
        displayName = displayName.replace(/Competition/i, 'Báo Cáo Thi Đua');

        const shareData = {
            files: [file],
            title: displayName,
            text: displayName
        };

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
        console.error('Lỗi khi chia sẻ:', error);
        // Fallback: download
        downloadBlob(blob, filename, true);
        return false;
    }
}
