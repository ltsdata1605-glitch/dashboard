import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { INDUSTRY_COLOR_KEY, INDUSTRY_TONE, industryToneByKey, industryToneByName } from '../../utils/industryColors';

/**
 * Màu ngành (2026-10-15): 2 modal "chưa xuất / chưa thu" từng dựng class ĐỘNG `border-${color}-500`… — Tailwind không sinh được
 * nên 6 ngành (Tablet, Phụ kiện, Gia dụng, CE, Sim, Vieon) chưa từng có màu. Nay mọi class nằm tường minh ở utils/industryColors.ts.
 */
const PALETTE = /^(?:bg|text|border)-(?:sky|emerald|amber|rose|slate)-(?:50|100|300|500|600|700)$/;

describe('utils/industryColors', () => {
    it('mọi class là tiện ích Tailwind TƯỜNG MINH thuộc bảng màu semantic (không ghép chuỗi, không blue/cyan/violet…)', () => {
        for (const [khoa, tone] of Object.entries(INDUSTRY_TONE)) {
            for (const cls of Object.values(tone)) {
                expect(cls, `${khoa}: "${cls}"`).toMatch(PALETTE);
            }
            expect(tone.border.startsWith('border-'), khoa).toBe(true);
            expect(tone.bg.startsWith('bg-'), khoa).toBe(true);
        }
    });

    it('12 ngành đều có tông màu riêng của khoá mình (không rơi về slate trừ "Khác")', () => {
        expect(Object.keys(INDUSTRY_COLOR_KEY)).toHaveLength(12);
        for (const [nganh, khoa] of Object.entries(INDUSTRY_COLOR_KEY)) {
            expect(INDUSTRY_TONE[khoa], nganh).toBeDefined();
            expect(industryToneByName(nganh)).toBe(INDUSTRY_TONE[khoa]);
        }
        for (const nganh of ['Tablet', 'Phụ kiện', 'Gia dụng', 'CE', 'Sim', 'Vieon']) {
            expect(industryToneByName(nganh), nganh).not.toBe(INDUSTRY_TONE.slate);
        }
    });

    it('ngành / khoá lạ → slate, không văng lỗi', () => {
        expect(industryToneByName('Ngành mới chưa khai')).toBe(INDUSTRY_TONE.slate);
        expect(industryToneByName(undefined)).toBe(INDUSTRY_TONE.slate);
        expect(industryToneByKey('chartreuse')).toBe(INDUSTRY_TONE.slate);
        expect(industryToneByKey(null)).toBe(INDUSTRY_TONE.slate);
    });

    it('IndustryGrid + 2 modal không còn dựng class màu bằng ghép chuỗi', () => {
        const ghepChuoi = /\b(?:bg|text|border(?:-[trblxy])?|ring|from|via|to|fill|stroke)-\$\{/;
        for (const f of ['components/charts/IndustryGrid.tsx', 'components/modals/UnshippedOrdersModal.tsx', 'components/modals/UncollectedOrdersModal.tsx']) {
            const src = readFileSync(resolve(process.cwd(), f), 'utf-8');
            expect(ghepChuoi.test(src), f).toBe(false);
            expect(src, f).not.toMatch(/const industryColors\b/);
        }
    });
});
