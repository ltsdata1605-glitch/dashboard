import { describe, it, expect } from 'vitest';
import { getBatchChunks, runBatchExportLoop, describeBatchExportResult, escapeHtml } from './batchImageExportService';
import { Product } from '../types';

describe('batchImageExportService - getBatchChunks', () => {
    const mockProducts: Product[] = Array.from({ length: 125 }, (_, i) => ({
        msp: `100000000${i + 1}`,
        sanPham: `Sản phẩm mẫu thứ ${i + 1}`,
        giaGiam: '100.000 đ',
        giaGoc: '150.000 đ',
        tongThuong: 5000,
        thuongERP: 3000,
        thuongNong: 2000,
        tonKho: 10,
        khuyenMai: 'Giảm sốc',
        ngayIn: '27/09/2026',
        selected: false,
        quantity: 1,
    }));

    it('chia 125 sản phẩm thành 3 batch với batch 1 và batch 2 đúng 50 dòng, batch 3 có 25 dòng', () => {
        const batches = getBatchChunks(mockProducts, 50, '2026-09-27');

        expect(batches).toHaveLength(3);

        // Batch 1: 50 sản phẩm (1 - 50)
        expect(batches[0].batchIndex).toBe(0);
        expect(batches[0].totalBatches).toBe(3);
        expect(batches[0].startIndex).toBe(1);
        expect(batches[0].endIndex).toBe(50);
        expect(batches[0].chunk).toHaveLength(50);
        expect(batches[0].chunk[0].sanPham).toBe('Sản phẩm mẫu thứ 1');
        expect(batches[0].chunk[49].sanPham).toBe('Sản phẩm mẫu thứ 50');
        expect(batches[0].filename).toContain('Phan 1-3');
        expect(batches[0].filename).toContain('Dong 1-50');

        // Batch 2: 50 sản phẩm (51 - 100)
        expect(batches[1].batchIndex).toBe(1);
        expect(batches[1].totalBatches).toBe(3);
        expect(batches[1].startIndex).toBe(51);
        expect(batches[1].endIndex).toBe(100);
        expect(batches[1].chunk).toHaveLength(50);
        expect(batches[1].chunk[0].sanPham).toBe('Sản phẩm mẫu thứ 51');
        expect(batches[1].chunk[49].sanPham).toBe('Sản phẩm mẫu thứ 100');
        expect(batches[1].filename).toContain('Phan 2-3');
        expect(batches[1].filename).toContain('Dong 51-100');

        // Batch 3: 25 sản phẩm (101 - 125)
        expect(batches[2].batchIndex).toBe(2);
        expect(batches[2].totalBatches).toBe(3);
        expect(batches[2].startIndex).toBe(101);
        expect(batches[2].endIndex).toBe(125);
        expect(batches[2].chunk).toHaveLength(25);
        expect(batches[2].chunk[0].sanPham).toBe('Sản phẩm mẫu thứ 101');
        expect(batches[2].chunk[24].sanPham).toBe('Sản phẩm mẫu thứ 125');
        expect(batches[2].filename).toContain('Phan 3-3');
        expect(batches[2].filename).toContain('Dong 101-125');
    });

    it('trả về mảng rỗng khi danh sách sản phẩm rỗng', () => {
        const batches = getBatchChunks([], 50);
        expect(batches).toEqual([]);
    });

    it('xử lý đúng khi số sản phẩm nhỏ hơn 50', () => {
        const smallList = mockProducts.slice(0, 32);
        const batches = getBatchChunks(smallList, 50);

        expect(batches).toHaveLength(1);
        expect(batches[0].batchIndex).toBe(0);
        expect(batches[0].totalBatches).toBe(1);
        expect(batches[0].startIndex).toBe(1);
        expect(batches[0].endIndex).toBe(32);
        expect(batches[0].chunk).toHaveLength(32);
        expect(batches[0].filename).toContain('Phan 1-1 (Dong 1-32)');
    });
});


/**
 * Audit A02 (2026-09-29): ảnh lỗi giữa batch từng bị bỏ qua lặng lẽ, cuối vòng vẫn báo
 * "Đã xuất thành công N file ảnh". Các test dưới chạy đúng vòng lặp thật (runBatchExportLoop),
 * chỉ thay bước chụp/giao bằng hàm giả.
 */
describe('batchImageExportService - kết quả từng ảnh (A02)', () => {
    const products = Array.from({ length: 125 }, (_, i) => ({ msp: String(i + 1) }));
    const batches = getBatchChunks(products, 50, '2026-09-29');
    const fakeBlob = { size: 1 } as unknown as Blob;
    const noSleep = async () => {};

    it('một ảnh lỗi giữa batch: KHÔNG báo thành công, đếm đúng số ảnh và sản phẩm xuất được', async () => {
        const delivered: string[] = [];
        const res = await runBatchExportLoop(batches, {
            capture: async (b) => (b.batchIndex === 1 ? null : fakeBlob),
            deliver: (_blob, filename) => { delivered.push(filename); },
            pauseBetweenMs: 450,
            sleep: noSleep,
        });
        expect(res.success).toBe(false);
        expect(res.batchCount).toBe(2);
        expect(res.totalBatches).toBe(3);
        expect(res.exportedCount).toBe(75); // 50 + 25, không phải 125
        expect(res.totalCount).toBe(125);
        expect(res.failed.map(f => f.batchNum)).toEqual([2]);
        expect(delivered).toHaveLength(2);

        const msg = describeBatchExportResult(res);
        expect(msg.title).toBe('Xuất ảnh chưa đầy đủ');
        expect(msg.message).toContain('2/3');
        expect(msg.message).toContain('Phần 2/3 (dòng 51-100)');
    });

    it('bước chụp ném lỗi: ghi nhận lỗi và vẫn xuất các ảnh sau', async () => {
        const res = await runBatchExportLoop(batches, {
            capture: async (b) => { if (b.batchIndex === 0) throw new Error('canvas quá lớn'); return fakeBlob; },
            deliver: () => {},
            sleep: noSleep,
        });
        expect(res.batchCount).toBe(2);
        expect(res.failed[0].error).toBe('canvas quá lớn');
    });

    it('tất cả thành công: giữ nguyên câu thông báo cũ', async () => {
        const res = await runBatchExportLoop(batches, { capture: async () => fakeBlob, deliver: () => {}, sleep: noSleep });
        expect(res.success).toBe(true);
        expect(res.exportedCount).toBe(125);
        expect(describeBatchExportResult(res)).toEqual({
            title: 'Xuất ảnh thành công',
            message: 'Đã xuất thành công 3 file ảnh (125 sản phẩm, mỗi ảnh tối đa 50 dòng)!',
        });
    });

    it('không ảnh nào xuất được: báo lỗi, không báo "thành công"', async () => {
        const res = await runBatchExportLoop(batches, { capture: async () => null, deliver: () => {}, sleep: noSleep });
        expect(res.success).toBe(false);
        expect(describeBatchExportResult(res).title).toBe('Lỗi');
    });

    it('escapeHtml: tên sản phẩm có ký tự HTML không bị hiểu là thẻ', () => {
        expect(escapeHtml('Cáp <1m> & "sạc"')).toBe('Cáp &lt;1m&gt; &amp; &quot;sạc&quot;');
        expect(escapeHtml(undefined)).toBe('');
        expect(escapeHtml(12)).toBe('12');
    });
});
