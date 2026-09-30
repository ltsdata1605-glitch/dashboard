import type { DataRow } from '../types';

/**
 * KHÚC JSON cho dữ liệu bán hàng (Đợt 6, 2026-09-30).
 *
 * Đo trên 200.000 dòng (bản build), mã cũ đứng giao diện 3 khối liền:
 *   - nhận 1 chuỗi JSON ~190MB từ Worker (sao chép chuỗi khi nhận tin nhắn) ~1,2s
 *   - `JSON.parse` một phát ~0,6s
 *   - lúc lưu IndexedDB lại `JSON.stringify` đúng dữ liệu đó ~1,4s (+ `put` ~0,3s)
 * Nay: Worker gửi nhiều KHÚC dạng UTF-8 `ArrayBuffer` (CHUYỂN quyền sở hữu, không sao chép); luồng
 * chính giải mã + parse từng khúc, nhường luồng giữa các khúc; lúc lưu thì chuyển các khúc sang
 * `salesJsonWriter.worker.ts` ghép lại và ghi IndexedDB NGOÀI luồng chính. Chuỗi được ghi TRÙNG TỪNG
 * BYTE với `JSON.stringify` kiểu cũ → định dạng lưu không đổi, dữ liệu cũ không phải di trú.
 */
export const SALES_JSON_CHUNK_ROWS = 10_000;

/** Worker: cắt mảng dòng thành các chuỗi JSON (mỗi chuỗi là một mảng hợp lệ). */
export function rowsToJsonChunks(rows: unknown[], chunkRows: number = SALES_JSON_CHUNK_ROWS): string[] {
    const parts: string[] = [];
    for (let i = 0; i < rows.length; i += chunkRows) {
        parts.push(JSON.stringify(rows.slice(i, i + chunkRows)));
    }
    return parts.length > 0 ? parts : ['[]'];
}

/** Worker: như trên nhưng mã hoá UTF-8 thành ArrayBuffer để CHUYỂN (transfer) sang luồng chính. */
export function rowsToJsonBuffers(rows: unknown[], chunkRows: number = SALES_JSON_CHUNK_ROWS): ArrayBuffer[] {
    const enc = new TextEncoder();
    return rowsToJsonChunks(rows, chunkRows).map(s => enc.encode(s).buffer as ArrayBuffer);
}

export interface JsonBufferResult { format: 'json-utf8-chunks'; chunks: ArrayBuffer[] }

export const isJsonBufferResult = (v: unknown): v is JsonBufferResult =>
    !!v && typeof v === 'object' && (v as JsonBufferResult).format === 'json-utf8-chunks' && Array.isArray((v as JsonBufferResult).chunks);

const decodePart = (p: string | ArrayBuffer, dec: TextDecoder) => typeof p === 'string' ? p : dec.decode(p);

/** Ghép các mảng JSON thành MỘT chuỗi mảng — bằng đúng `JSON.stringify` của mảng nối lại. */
export function joinJsonArrayChunks(parts: readonly (string | ArrayBuffer)[]): string {
    const dec = new TextDecoder();
    const inner: string[] = [];
    for (const p of parts) {
        const body = decodePart(p, dec).slice(1, -1);
        if (body.length > 0) inner.push(body);
    }
    return '[' + inner.join(',') + ']';
}

/** Chuẩn hoá mọi dạng kết quả Worker (khúc buffer mới / chuỗi cũ) về danh sách khúc. `null` = không phải JSON. */
export function workerResultToChunks(result: unknown): (string | ArrayBuffer)[] | null {
    if (typeof result === 'string') return [result];
    if (isJsonBufferResult(result)) return result.chunks;
    if (Array.isArray(result) && result.length > 0 && result.every(p => typeof p === 'string')) return result as string[];
    return null;
}

const yieldToMain = () => new Promise<void>(r => setTimeout(r, 0));

/** Giải mã + parse từng khúc, nhường luồng chính giữa các khúc để giao diện không đứng một khối dài. */
export async function parseJsonChunks(parts: readonly (string | ArrayBuffer)[], yieldFn: () => Promise<void> = yieldToMain): Promise<DataRow[]> {
    const dec = new TextDecoder();
    const rows: DataRow[] = [];
    for (let i = 0; i < parts.length; i++) {
        if (i > 0) await yieldFn();
        const chunk = JSON.parse(decodePart(parts[i], dec)) as DataRow[];
        for (let j = 0; j < chunk.length; j++) rows.push(chunk[j]);
    }
    return rows;
}

/**
 * Phần đầu/cuối bao quanh JSON dữ liệu để thành chuỗi lưu `tempRealtimeData` — bằng đúng
 * `JSON.stringify({ data, filename, savedAt, fileLastModified })` (khoá `data` đứng đầu, như cũ).
 */
export function storedSalesJsonWrap(meta: { filename: string; savedAt: Date; fileLastModified?: number }): { prefix: string; suffix: string } {
    const rest = JSON.stringify({ filename: meta.filename, savedAt: meta.savedAt, fileLastModified: meta.fileLastModified });
    return { prefix: '{"data":', suffix: rest === '{}' ? '}' : ',' + rest.slice(1) };
}
