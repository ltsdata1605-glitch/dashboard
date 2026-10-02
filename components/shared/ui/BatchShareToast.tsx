import React from 'react';
import toast from 'react-hot-toast';
import { Button } from './Button';
import { interceptImageDelivery } from '../export/lineDelivery';

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
    // Lượt "Gửi nhóm LINE": cả lô vào hàng đợi gửi LINE; chỉ hiện nút chia sẻ khi người dùng chọn đồng thời tải về
    let chiGuiLine = files.length > 0;
    for (const f of files) chiGuiLine = interceptImageDelivery(f.blob, f.filename) && chiGuiLine;
    if (chiGuiLine) return;
    if (!canShareBatch(files)) { onFallback(); return; }
    const shareData: ShareData = { files: files.map(toFile), title: `${files.length} ảnh` };
    toast(
        (t) => (
            <div className="flex items-center gap-3" data-testid="batch-share-toast">
                <span className="text-[13px] text-slate-700 leading-snug">{files.length} ảnh đã sẵn sàng.</span>
                <Button
                    size="sm"
                    className="min-h-11 sm:min-h-0 shrink-0"
                    onClick={async () => {
                        toast.dismiss(t.id);
                        try {
                            await navigator.share(shareData);
                        } catch (e) {
                            if ((e as { name?: string })?.name !== 'AbortError') onFallback();
                        }
                    }}
                >
                    Chia sẻ / Lưu {files.length} ảnh
                </Button>
                <Button size="sm" variant="ghost" className="min-h-11 sm:min-h-0 shrink-0" aria-label="Bỏ qua" onClick={() => toast.dismiss(t.id)}>
                    Bỏ qua
                </Button>
            </div>
        ),
        // Không tự tắt: người dùng có thể đang đọc thông báo kết quả; mất nút là mất cả lô ảnh.
        { id: 'batch-share', duration: Infinity },
    );
}
