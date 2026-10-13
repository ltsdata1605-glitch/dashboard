import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

/**
 * Khoá lỗi #5/#6/#21 (KE_HOACH_GIAO_DIEN_APPLE.md, GĐ5 2026-10-13): thân `<Modal>` đệm 12px trên iPhone / 20px từ sm, nhưng
 * 32 modal tự viết `-m-5` (20px) để tràn sát mép → trên iPhone lấn 8px mỗi bên, chữ bị cắt ("gành Hàng", "Xóa the", cột MÃ NV).
 * Nay đệm thân là biến `--modal-pad` và khối tràn mép dùng class `modal-bleed` / `modal-bleed-x|t|b` (styles.css) — test này
 * đỏ ngay khi một file dùng Modal lại tự bù đệm bằng số cứng.
 */
const ROOT = resolve(__dirname, '../../..');
const QUET = ['components', 'features'];
const DUNG_MODAL = /from\s+['"][./]*(?:components\/)?shared\/ui\/Modal['"]/;
// Các lớp CHỈ có nghĩa là "bù đệm 20px của thân modal" — đúng thứ đã gây cắt mép.
const BU_DEM_CUNG = /(?:^|[\s"'`])(?:sm:)?-m[xytb]?-5(?=[\s"'`])/m;

function quet(dir: string, out: string[]) {
    for (const ten of readdirSync(dir)) {
        if (ten === 'node_modules' || ten.startsWith('.')) continue;
        const p = join(dir, ten);
        if (statSync(p).isDirectory()) quet(p, out);
        else if (/\.tsx$/.test(ten)) out.push(p);
    }
}

describe('modal tràn sát mép dùng modal-bleed, không tự bù đệm bằng số cứng', () => {
    it('không file nào dùng <Modal> mà còn -m-5 / -mx-5 / -mt-5 / -mb-5', () => {
        const files: string[] = [];
        QUET.forEach((d) => { try { quet(join(ROOT, d), files); } catch { /* thư mục không có */ } });
        const viPham = files
            .map((f) => relative(ROOT, f).replace(/\\/g, '/'))
            .filter((rel) => !rel.endsWith('shared/ui/Modal.tsx'))
            .filter((rel) => {
                const src = readFileSync(join(ROOT, rel), 'utf8');
                return DUNG_MODAL.test(src) && BU_DEM_CUNG.test(src);
            });
        expect(viPham, 'Thay -m-5 (và biến thể) bằng class modal-bleed / modal-bleed-x|t|b').toEqual([]);
    });
});
