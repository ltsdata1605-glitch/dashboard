import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

/**
 * Khoá "toast MỘT hệ duy nhất" (GĐ1 + GĐ5, 2026-10-13). ESLint đã chặn import react-hot-toast ngoài module toast, nhưng 14 khung
 * toast vẫn sót vì được dựng BẰNG DOM (`document.createElement` + `style.cssText = 'position:fixed;bottom:24px…'`) — ESLint không
 * thấy, chúng nằm đè thanh tab iPhone và lệch giao diện chung. Test này đỏ khi ai đó lại tự dựng phần tử nổi dính đáy màn hình
 * bằng cssText. Dùng `toast.*` / `toastViecDai()` từ components/shared/ui/toast.
 */
const ROOT = resolve(__dirname, '../../../..');
const QUET = ['components', 'features', 'hooks', 'services', 'utils', 'contexts'];
const MAU = /cssText\s*=\s*(['"`])[^'"`]*position\s*:\s*fixed[^'"`]*bottom\s*:/;

function quet(dir: string, out: string[]) {
    for (const ten of readdirSync(dir)) {
        if (ten === 'node_modules' || ten.startsWith('.')) continue;
        const p = join(dir, ten);
        if (statSync(p).isDirectory()) quet(p, out);
        else if (/\.(ts|tsx)$/.test(ten) && !/\.test\.tsx?$/.test(ten)) out.push(p);
    }
}

describe('không tự dựng toast bằng DOM', () => {
    it('không có phần tử position:fixed dính đáy dựng bằng style.cssText', () => {
        const files: string[] = [];
        QUET.forEach((d) => { try { quet(join(ROOT, d), files); } catch { /* thư mục không có */ } });
        const viPham = files
            .map((f) => relative(ROOT, f).replace(/\\/g, '/'))
            .filter((rel) => MAU.test(readFileSync(join(ROOT, rel), 'utf8')));
        expect(viPham, 'Dùng toast.* / toastViecDai() từ components/shared/ui/toast').toEqual([]);
    });
});
