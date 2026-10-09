/**
 * Kết quả xuất ảnh HÀNG LOẠT của Phân tích (xuất theo NV) — hàm thuần, test bằng Node.
 *
 * Vì sao có file này (audit A03/A04, 2026-09-29): hai luồng batch trong hooks/useExportLogic.ts bỏ
 * qua kết quả từng ảnh — ảnh chụp lỗi (exportElementAsImage trả null) không được báo, người dùng
 * tưởng đã đủ ảnh. Batch theo Kho còn chụp tiếp sau khi hết giờ chờ dữ liệu → ảnh mang tên Kho B
 * nhưng số liệu Kho A mà không có dấu hiệu gì.
 */

export interface BatchItemOutcome {
    /** Tên hiển thị của mục (tên NV, tên Kho…) */
    label: string;
    ok: boolean;
    error?: string;
}

const MAX_LISTED = 5;

/** Câu báo kết quả theo số ảnh xuất ĐƯỢC thật, kèm tên các mục lỗi. */
export function describeBatchOutcome(
    items: BatchItemOutcome[],
    fatalError?: unknown,
): { type: 'success' | 'error'; message: string } {
    const total = items.length;
    const failed = items.filter(i => !i.ok);
    const okCount = total - failed.length;

    if (fatalError !== undefined && total === 0) {
        const msg = fatalError instanceof Error ? fatalError.message : String(fatalError);
        return { type: 'error', message: `Xuất ảnh hàng loạt bị lỗi: ${msg}` };
    }
    if (total > 0 && failed.length === 0 && fatalError === undefined) {
        return { type: 'success', message: `Đã xuất đủ ${okCount}/${total} ảnh.` };
    }

    const names = failed.slice(0, MAX_LISTED).map(f => f.label).join(', ');
    const more = failed.length > MAX_LISTED ? ` (+${failed.length - MAX_LISTED} mục khác)` : '';
    const stopped = fatalError !== undefined ? ' Quá trình xuất bị dừng giữa chừng.' : '';
    if (okCount === 0) {
        return {
            type: 'error',
            message: `Không xuất được ảnh nào (${total} mục).${stopped}${names ? ` Lỗi: ${names}${more}.` : ''} Vui lòng thử lại.`,
        };
    }
    return {
        type: 'error',
        message: `Đã xuất ${okCount}/${total} ảnh.${stopped}${names ? ` Chưa xuất được: ${names}${more}.` : ''} Vui lòng xuất lại các mục này.`,
    };
}
