/**
 * Như `Promise.all(items.map(fn))` nhưng tối đa `limit` việc chạy cùng lúc, giữ đúng thứ tự kết quả.
 *
 * Audit 2026-10-07 (GĐ3): tải dữ liệu Kho / cloud trước đây bắn MỌI chunk của MỌI file cùng lúc
 * (Promise.all lồng nhau) — Kho 24 ô tháng × vài chunk = hàng trăm request đồng thời trên điện thoại:
 * nghẽn kết nối, dồn bộ nhớ (mọi chunk nằm trong RAM cùng lúc trước khi gộp).
 */
export async function mapWithLimit<T, R>(items: readonly T[], limit: number, fn: (item: T, index: number) => Promise<R>): Promise<R[]> {
    const results = new Array<R>(items.length);
    let next = 0;
    const worker = async () => {
        while (next < items.length) {
            const i = next++;
            results[i] = await fn(items[i], i);
        }
    };
    await Promise.all(Array.from({ length: Math.min(Math.max(1, limit), items.length) }, worker));
    return results;
}
