import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Quy tắc chủ dự án chốt 2026-09-23:
 *   - Phân Tích / Report BI: danh sách nhân viên CHỈ nạp bộ phận "BP All In One".
 *   - Phân Ca: nạp ĐỦ mọi bộ phận (bảo vệ, kho, quản lý… vẫn phải có ca).
 * Phân Ca có đường nhập Excel riêng, không đi qua services/dataService.ts của gốc. Test này canh
 * để lần sau không ai "gom cho gọn" bộ lọc All In One vào Phân Ca.
 */
const listFiles = (dir: string): string[] =>
    readdirSync(dir).flatMap(name => {
        const full = join(dir, name);
        return statSync(full).isDirectory() ? listFiles(full) : [full];
    });

describe('features/phan-ca vẫn nạp đủ mọi bộ phận', () => {
    const files = listFiles('features/phan-ca').filter(f => /\.(ts|tsx)$/.test(f));

    it('không dùng bộ lọc All In One của gốc', () => {
        const offenders = files.filter(f => {
            const src = readFileSync(f, 'utf8');
            // Chỉ bắt việc IMPORT bộ lọc của gốc — "departmentFilter" còn là tên biến bộ lọc UI
            // trong Phân Ca (lọc hiển thị theo bộ phận), không liên quan.
            return /from\s+['"][^'"]*utils\/departmentFilter['"]/.test(src) ||
                src.includes('keepOnlyAllInOne(') ||
                src.includes('isAllInOneDepartment(');
        });
        expect(offenders, `Phân Ca phải nạp đủ bộ phận, nhưng các file sau đang lọc: ${offenders.join(', ')}`)
            .toEqual([]);
    });

    it('không dùng chung processShiftFile của gốc (đường nhập riêng)', () => {
        const offenders = files.filter(f => readFileSync(f, 'utf8').includes('processShiftFile'));
        expect(offenders).toEqual([]);
    });
});
