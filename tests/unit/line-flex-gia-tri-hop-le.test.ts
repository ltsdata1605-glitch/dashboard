import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Thẻ Flex LINE chỉ nhận margin/spacing: none|xs|sm|md|lg|xl|xxl (hoặc px). "xxs" làm LINE trả 400 — báo cáo 22:00 hỏng MỖI
 * TỐI 01→15/10/2026 ("invalid property /body/contents/3/contents/1/margin"); thẻ coupon thì rơi về chữ thường.
 */
const HOP_LE = new Set(['none', 'xs', 'sm', 'md', 'lg', 'xl', 'xxl']);
const tep = [
    ...readdirSync('functions/src').filter(f => f.endsWith('.ts')).map(f => join('functions/src', f)),
    'features/line-bot/services/couponParser.ts',
];
describe('giá trị margin/spacing trong thẻ Flex LINE', () => {
    it('không có giá trị LINE không nhận', () => {
        const sai: string[] = [];
        for (const f of tep) {
            for (const m of readFileSync(f, 'utf8').matchAll(/\b(margin|spacing):\s*'([^']+)'/g)) {
                if (!HOP_LE.has(m[2]) && !/^\d+px$/.test(m[2])) sai.push(`${f}: ${m[1]} '${m[2]}'`);
            }
        }
        expect(sai).toEqual([]);
    });
});
