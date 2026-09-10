import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import { parseInventoryFile } from './fileParser';

describe('parseInventoryFile - New Inventory File Structure (Col D, E, F, G, H, Q)', () => {
  it('correctly parses inventory data according to new column structure', async () => {
    // Construct rows matching the user screenshot:
    // Col A (0), B (1), C (2) - can be empty or supermarket info
    // Col D (3): Ngành hàng
    // Col E (4): Nhóm hàng
    // Col F (5): Nhà sản xuất
    // Col G (6): Mã sản phẩm
    // Col H (7): Tên sản phẩm
    // Col I-P (8-15): Other columns
    // Col Q (16): Số lượng
    const rows: any[][] = [
      // Header row
      [
        '', '', '', 
        'Ngành hàng', 
        'Nhóm hàng', 
        'Nhà sản xuất', 
        'Mã sản phẩm', 
        'Tên sản phẩm',
        '', '', '', '', '', '', '', '',
        'Số lượng'
      ],
      // Row 1
      [
        '', '', '',
        '16 - Phụ kiện tiện ích',
        '10 - Chuột',
        'Logitech',
        '0160010000447',
        'Chuột không dây Logitech M170 Đen',
        '', '', '', '', '', '', '', '',
        7
      ],
      // Row 2
      [
        '', '', '',
        '16 - Phụ kiện tiện ích',
        '10 - Chuột',
        'Rapoo',
        '0160010000546',
        'Chuột Không Dây Rapoo M216 Đen',
        '', '', '', '', '', '', '', '',
        '3'
      ],
      // Row 3
      [
        '', '', '',
        '16 - Phụ kiện tiện ích',
        '10 - Chuột',
        'DareU',
        '0160010000613',
        'Chuột không dây DareU LM106G đen',
        '', '', '', '', '', '', '', '',
        12
      ]
    ];

    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const u8 = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
    const file = new File([u8], 'ton_kho_test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

    const result = await parseInventoryFile(file);

    expect(result).toHaveLength(3);

    // Item 1
    expect(result[0].maSanPham).toBe('0160010000447');
    expect(result[0].tenSanPham).toBe('Chuột không dây Logitech M170 Đen');
    expect(result[0].nganhHang).toBe('16 - Phụ kiện tiện ích');
    expect(result[0].nhomHang).toBe('10 - Chuột');
    expect(result[0].thuongHieu).toBe('Logitech');
    expect(result[0].nhaSanXuat).toBe('Logitech');
    expect(result[0].tongSoLuong).toBe(7);
    expect(result[0].soLuongThucTe).toBe(7);

    // Item 2
    expect(result[1].maSanPham).toBe('0160010000546');
    expect(result[1].tenSanPham).toBe('Chuột Không Dây Rapoo M216 Đen');
    expect(result[1].thuongHieu).toBe('Rapoo');
    expect(result[1].tongSoLuong).toBe(3);

    // Item 3
    expect(result[2].maSanPham).toBe('0160010000613');
    expect(result[2].tenSanPham).toBe('Chuột không dây DareU LM106G đen');
    expect(result[2].thuongHieu).toBe('DareU');
    expect(result[2].tongSoLuong).toBe(12);
  });

  it('correctly handles files without header row using fixed column indices D, E, F, G, H, Q', async () => {
    const rows: any[][] = [
      [
        '', '', '',
        'Đồ gia dụng',
        'Nồi cơm điện',
        'Sunhouse',
        '0123456789',
        'Nồi cơm Sunhouse 1.8L',
        '', '', '', '', '', '', '', '',
        15
      ]
    ];

    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const u8 = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
    const file = new File([u8], 'no_header_test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

    const result = await parseInventoryFile(file);

    expect(result).toHaveLength(1);
    expect(result[0].maSanPham).toBe('0123456789');
    expect(result[0].nganhHang).toBe('Đồ gia dụng');
    expect(result[0].nhomHang).toBe('Nồi cơm điện');
    expect(result[0].thuongHieu).toBe('Sunhouse');
    expect(result[0].tongSoLuong).toBe(15);
  });
});
