import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

/**
 * Khoá "công tắc MỘT kiểu duy nhất" (GĐ8, 2026-10-13). Trước GĐ6–GĐ8 có ≥ 17 công tắc tự vẽ, mỗi nơi một cỡ/màu (28×16 sky, 32×18
 * emerald, 52×28 role="switch"…): ô tick ẩn `sr-only peer` + `peer-checked:after:translate-x-*`, hoặc nút tự gắn `role="switch"`.
 * Nay mọi nơi dùng `Switch` (components/shared/ui/Switch.tsx — 44×26 / sm, vùng chạm 44, Space bật tắt, type="button").
 * Test đỏ khi ai đó lại tự vẽ công tắc ngoài file đó.
 */
const ROOT = resolve(__dirname, '../../..');
const QUET = ['components', 'features', 'App.tsx'];
const MAU_PEER = /peer-checked:after:translate-x/;
const MAU_ROLE = /role=["']switch["']/;

function quet(p: string, out: string[]) {
    if (statSync(p).isFile()) { if (/\.tsx?$/.test(p) && !/\.test\.tsx?$/.test(p)) out.push(p); return; }
    for (const ten of readdirSync(p)) {
        if (ten === 'node_modules' || ten.startsWith('.')) continue;
        quet(join(p, ten), out);
    }
}

describe('không tự vẽ công tắc', () => {
    it('không còn công tắc `peer-checked:after:translate-x` hay nút tự gắn role="switch" ngoài Switch.tsx', () => {
        const files: string[] = [];
        QUET.forEach((d) => { try { quet(join(ROOT, d), files); } catch { /* không có */ } });
        const viPham = files
            .map((f) => relative(ROOT, f).replace(/\\/g, '/'))
            .filter((rel) => rel !== 'components/shared/ui/Switch.tsx')
            .filter((rel) => { const s = readFileSync(join(ROOT, rel), 'utf8'); return MAU_PEER.test(s) || MAU_ROLE.test(s); });
        expect(viPham, 'Dùng <Switch> từ components/shared/ui/Switch').toEqual([]);
    });
});
