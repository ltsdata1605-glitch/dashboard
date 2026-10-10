import { toast } from './toast';

/**
 * Safari iOS chỉ cho gọi `navigator.share()` trong khoảng 1 giây sau thao tác chạm. Xuất ảnh bảng
 * lớn mất vài giây nên lượt share tự động bị từ chối (`NotAllowedError`). Thông báo này đưa ra một
 * nút để người dùng CHẠM LẠI — đó là thao tác mới nên Safari cho phép mở bảng chia sẻ
 * (Lưu hình ảnh / LINE / Zalo…).
 *
 * Dùng chung cho mọi khu vực (components/shared/ui), gọi từ các hàm `shareBlob` của từng khu vực.
 * Từ 2026-10-10 là toast có nút của hệ toast chung (trước tự vẽ khung riêng) — `toast.action` gọi `onClick` NGAY trong
 * lượt chạm rồi mới tắt toast, nên `navigator.share` vẫn được Safari cho phép.
 */
export function offerShareRetry(shareData: ShareData, onFail: () => void): void {
    toast.action({
        id: 'share-retry',
        testId: 'share-retry-toast',
        kind: 'success',
        icon: 'exportImage',
        title: 'Ảnh đã sẵn sàng.',
        duration: 25_000,
        actions: [{
            label: 'Chia sẻ / Lưu ảnh',
            primary: true,
            onClick: async () => {
                try {
                    await navigator.share(shareData);
                } catch (e) {
                    if ((e as { name?: string })?.name !== 'AbortError') onFail();
                }
            },
        }],
    });
}
