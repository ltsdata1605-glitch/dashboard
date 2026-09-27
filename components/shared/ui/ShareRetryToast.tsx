import React from 'react';
import toast from 'react-hot-toast';
import { Button } from './Button';

/**
 * Safari iOS chỉ cho gọi `navigator.share()` trong khoảng 1 giây sau thao tác chạm. Xuất ảnh bảng
 * lớn mất vài giây nên lượt share tự động bị từ chối (`NotAllowedError`). Thông báo này đưa ra một
 * nút để người dùng CHẠM LẠI — đó là thao tác mới nên Safari cho phép mở bảng chia sẻ
 * (Lưu hình ảnh / LINE / Zalo…).
 *
 * Dùng chung cho mọi khu vực (components/shared/ui), gọi từ các hàm `shareBlob` của từng khu vực.
 */
export function offerShareRetry(shareData: ShareData, onFail: () => void): void {
    const id = 'share-retry';
    toast(
        (t) => (
            <div className="flex items-center gap-3" data-testid="share-retry-toast">
                <span className="text-[13px] text-slate-700 leading-snug">Ảnh đã sẵn sàng.</span>
                <Button
                    size="sm"
                    className="min-h-11 sm:min-h-0 shrink-0"
                    onClick={async () => {
                        toast.dismiss(t.id);
                        try {
                            await navigator.share(shareData);
                        } catch (e) {
                            if ((e as { name?: string })?.name !== 'AbortError') onFail();
                        }
                    }}
                >
                    Chia sẻ / Lưu ảnh
                </Button>
            </div>
        ),
        { id, duration: 20_000 },
    );
}
