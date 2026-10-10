import { toast } from './toast';

/**
 * CHIA SẺ MỘT LẦN cho cả lô ảnh xuất hàng loạt trên điện thoại (2026-09-30).
 *
 * Trước đây mỗi ảnh trong lô gọi `navigator.share()` riêng, không chờ nhau. Safari iOS chỉ cho gọi
 * share trong ~1s sau một lượt chạm → ngay ảnh đầu đã hết hiệu lực, và mỗi ảnh để lại một thông
 * báo "chạm lại" chồng lên nhau (40 NV = 40 lần chạm). Nay: gom cả lô, xong thì hiện MỘT nút; một
 * lượt chạm mở MỘT bảng chia sẻ chứa tất cả ảnh (iOS: "Lưu N hình ảnh", LINE, Zalo…). Mỗi ảnh vẫn
 * là một tệp PNG riêng (quyết định của chủ dự án).
 *
 * Trình duyệt không chia sẻ được nhiều tệp → `onFallback` (tải từng ảnh như máy tính).
 * Từ 2026-10-10 dùng toast có nút của hệ toast chung (`toast.action`) thay khung tự vẽ.
 */
export interface BatchShareFile { blob: Blob; filename: string }

const toFile = ({ blob, filename }: BatchShareFile) =>
    new File([blob], /\.png$/i.test(filename) ? filename : `${filename}.png`, { type: blob.type || 'image/png' });

/** Chia sẻ được cả lô trong một lượt không (API có + trình duyệt nhận đúng số tệp này). */
export function canShareBatch(files: BatchShareFile[]): boolean {
    if (typeof navigator === 'undefined' || !navigator.share || !navigator.canShare || files.length === 0) return false;
    try { return navigator.canShare({ files: files.map(toFile) }); } catch { return false; }
}

export function offerBatchShare(files: BatchShareFile[], onFallback: () => void): void {
    if (!canShareBatch(files)) { onFallback(); return; }
    const shareData: ShareData = { files: files.map(toFile), title: `${files.length} ảnh` };
    toast.action({
        id: 'batch-share',
        testId: 'batch-share-toast',
        kind: 'success',
        icon: 'exportBatch',
        title: `${files.length} ảnh đã sẵn sàng.`,
        // Không tự tắt: người dùng có thể đang đọc thông báo kết quả; mất nút là mất cả lô ảnh.
        duration: Infinity,
        actions: [
            {
                label: `Chia sẻ / Lưu ${files.length} ảnh`,
                primary: true,
                onClick: async () => {
                    try {
                        await navigator.share(shareData);
                    } catch (e) {
                        if ((e as { name?: string })?.name !== 'AbortError') onFallback();
                    }
                },
            },
            { label: 'Bỏ qua', onClick: () => undefined },
        ],
    });
}
