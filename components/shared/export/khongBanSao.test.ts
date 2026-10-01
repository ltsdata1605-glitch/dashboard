import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

/**
 * Khoá kế hoạch "Hợp nhất xuất ảnh" (2026-10-01): trước đây có 4 bản sao bộ chụp ảnh (~5.100 dòng) + 3
 * cách riêng, trôi khác nhau. Nay MỌI nơi xuất ảnh đi qua components/shared/export. Test này đỏ ngay khi
 * ai đó import thư viện chụp ảnh (html-to-image / html2canvas) ở chỗ khác — tức là đang đẻ bản sao thứ 5.
 *
 * Ngoại lệ có chủ đích: In Sticker `printService.ts` dựng TRANG IN tem giá (PDF), không phải xuất ảnh báo cáo.
 */
const ROOT = resolve(__dirname, '../../..');
const QUET = ['components', 'features', 'hooks', 'services', 'utils', 'contexts'];
const DUOC_PHEP = [
    'components/shared/export/',
    'features/sticker-event/services/printService.ts',
];
const MAU = /(?:from\s+|import\(\s*)['"](html-to-image|html2canvas)['"]/;

function quet(dir: string, out: string[]) {
    for (const ten of readdirSync(dir)) {
        if (ten === 'node_modules' || ten.startsWith('.')) continue;
        const p = join(dir, ten);
        if (statSync(p).isDirectory()) quet(p, out);
        else if (/\.(ts|tsx)$/.test(ten) && !/\.test\.tsx?$/.test(ten)) out.push(p);
    }
}

describe('chỉ components/shared/export được dùng thư viện chụp ảnh', () => {
    it('không có bản sao bộ chụp ảnh nào ngoài thư mục chung', () => {
        const files: string[] = [];
        QUET.forEach((d) => { try { quet(join(ROOT, d), files); } catch { /* thư mục không có */ } });
        const viPham = files
            .map((f) => relative(ROOT, f).replace(/\\/g, '/'))
            .filter((rel) => !DUOC_PHEP.some((ok) => rel.startsWith(ok)))
            .filter((rel) => MAU.test(readFileSync(join(ROOT, rel), 'utf8')));
        expect(viPham, 'Dùng exportElementAsImage / startExportJob từ components/shared/export thay vì tự chụp').toEqual([]);
    });
});
