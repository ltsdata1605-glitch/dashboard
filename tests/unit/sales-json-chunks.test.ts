import { describe, expect, it } from 'vitest';
import {
    rowsToJsonChunks, rowsToJsonBuffers, joinJsonArrayChunks, parseJsonChunks, workerResultToChunks, storedSalesJsonWrap,
} from '../../services/salesJsonChunks';
import { parseExcelDate } from '../../utils/dataUtils';
import type { DataRow } from '../../types';

// Đợt 6: lưu thẳng JSON gốc từ Worker chỉ đúng khi nó TRÙNG TỪNG BYTE với JSON.stringify kiểu cũ
// (định dạng lưu không đổi → dữ liệu cũ trên máy người dùng đọc được như trước, không di trú).
const lamDong = (n: number): DataRow[] => Array.from({ length: n }, (_, i) => ({
    'Mã đơn hàng': `DH${i}`,
    'Người tạo': i % 3 === 0 ? 'Nguyễn Văn "A" \\  ' : 'Trần Thị B',
    'Số lượng': i % 7,
    'Giá bán_1': i * 1234.5678,
    'Không số': NaN,
    parsedDate: new Date(Date.UTC(2026, 8, 1 + (i % 28), i % 24, i % 60, 0, i % 1000)),
}) as unknown as DataRow);

// Mô phỏng đúng luồng chính trong hooks/useFileUploadLogic.ts: parse khúc → đổi parsedDate ISO → Date.
const luongChinh = async (chunks: (string | ArrayBuffer)[]) => {
    const rows = await parseJsonChunks(chunks, async () => {});
    let khop = true;
    for (const row of rows) {
        const raw = row.parsedDate as unknown;
        const d = parseExcelDate(raw);
        if (d && !isNaN(d.getTime())) {
            if (typeof raw !== 'string' || d.toISOString() !== raw) khop = false;
            row.parsedDate = d;
        }
    }
    return { rows, khop };
};

describe('salesJsonChunks', () => {
    it('ghép khúc == JSON.stringify(rows) sau khi luồng chính xử lý (Lịch sử)', async () => {
        const chunks = rowsToJsonBuffers(lamDong(25_003), 10_000);
        expect(chunks).toHaveLength(3);
        expect(chunks[0]).toBeInstanceOf(ArrayBuffer);
        const { rows, khop } = await luongChinh(chunks);
        expect(khop).toBe(true);
        expect(rows).toHaveLength(25_003);
        expect(rows[5].parsedDate).toBeInstanceOf(Date);
        expect(joinJsonArrayChunks(chunks)).toBe(JSON.stringify(rows));
    });

    it('nhiều tệp Realtime + chuỗi lưu tempRealtimeData == JSON.stringify(stored) kiểu cũ', async () => {
        const a = rowsToJsonBuffers(lamDong(3), 2);
        const b = rowsToJsonBuffers(lamDong(5), 10);
        const all = [...(await luongChinh(a)).rows, ...(await luongChinh(b)).rows];
        const savedAt = new Date();
        for (const fileLastModified of [1727654400000, undefined]) {
            const cu = JSON.stringify({ data: all, filename: 'Gộp 2 tệp "RT"', savedAt, fileLastModified });
            // Đúng cách Worker ghi dựng chuỗi: prefix + ghép khúc + suffix
            const { prefix, suffix } = storedSalesJsonWrap({ filename: 'Gộp 2 tệp "RT"', savedAt, fileLastModified });
            const moi = prefix + joinJsonArrayChunks([...a, ...b]) + suffix;
            expect(moi).toBe(cu);
            expect(moi.startsWith('{"data":[')).toBe(true); // hasTempRealtimeData() dựa vào tiền tố này
        }
    });

    it('nhận cả dạng kết quả Worker cũ (1 chuỗi) và từ chối dạng không phải JSON', async () => {
        expect(workerResultToChunks('[{"a":1}]')).toEqual(['[{"a":1}]']);
        expect(workerResultToChunks(['[]', '[1]'])).toEqual(['[]', '[1]']);
        expect(workerResultToChunks([{ a: 1 }])).toBeNull();
        const buf = new TextEncoder().encode('[1]').buffer;
        expect(workerResultToChunks({ format: 'json-utf8-chunks', chunks: [buf] })).toEqual([buf]);
        expect(rowsToJsonChunks([{ x: 1 }, { x: 2 }], 1)).toEqual(['[{"x":1}]', '[{"x":2}]']);
        expect(joinJsonArrayChunks(['[]', '[1]', '[]', '[2,3]'])).toBe('[1,2,3]');
        expect(rowsToJsonChunks([])).toEqual(['[]']);
    });

    it('ngày KHÔNG phải ISO (Worker kiểu lạ) → báo lệch để quay về stringify', async () => {
        const { khop } = await luongChinh(['[{"parsedDate":"01/09/2026 10:00"}]']);
        expect(khop).toBe(false);
    });
});
