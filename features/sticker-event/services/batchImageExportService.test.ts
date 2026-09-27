import { describe, it, expect } from 'vitest';
import { getBatchChunks } from './batchImageExportService';
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

