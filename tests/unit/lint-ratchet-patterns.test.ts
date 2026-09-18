/**
 * Test cho bộ mẫu nhận diện màu của `scripts/lint-ratchet.cjs`.
 *
 * VÌ SAO CÓ FILE NÀY: ratchet là công cụ gác quy chuẩn thiết kế, nhưng bản thân nó KHÔNG có test
 * nào. Ngày 2026-09-18 phát hiện mẫu cũ chỉ liệt kê `border`/`divide` trần nên **bỏ sót mọi biến
 * thể có hướng** (`border-l-purple-400`…): `CompetitionListView.tsx` còn 2 chỗ vi phạm trong khi
 * ratchet báo file đó SẠCH. Công cụ nói dối im lặng, và một báo cáo "nonSemanticColor đã về 0" đã
 * được đưa ra dựa trên con số sai đó.
 *
 * Bài học: công cụ gác cổng cũng phải có lưới an toàn của chính nó.
 */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';

const require_ = createRequire(import.meta.url);
const { countOffPaletteColors, countIndigoAlias } = require_('../../scripts/lint-ratchet.cjs');

/** Bọc chuỗi class vào 1 dòng JSX giống code thật, để đi qua bộ lọc false-positive của script. */
const line = (cls: string) => `                <div className="${cls}">x</div>`;

describe('Màu NGOÀI bảng đã duyệt — biến thể thường', () => {
    it('bắt được bg/text/border trần', () => {
        expect(countOffPaletteColors(line('bg-purple-500'))).toBe(1);
        expect(countOffPaletteColors(line('text-red-600'))).toBe(1);
        expect(countOffPaletteColors(line('border-gray-200'))).toBe(1);
    });

    it('đếm đúng nhiều vi phạm trên cùng một dòng', () => {
        expect(countOffPaletteColors(line('bg-teal-50 text-teal-700 border-teal-200'))).toBe(3);
    });
});

describe('Màu NGOÀI bảng đã duyệt — biến thể CÓ HƯỚNG (lỗ hổng đã vá 2026-09-18)', () => {
    it('border-l/r/t/b — đây chính là chỗ từng bị bỏ sót', () => {
        expect(countOffPaletteColors(line('border-l-purple-400'))).toBe(1);
        expect(countOffPaletteColors(line('border-t-red-500'))).toBe(1);
        expect(countOffPaletteColors(line('border-b-orange-300'))).toBe(1);
        expect(countOffPaletteColors(line('border-r-cyan-600'))).toBe(1);
    });

    it('border-x/y và border-s/e (logical properties)', () => {
        expect(countOffPaletteColors(line('border-x-yellow-400'))).toBe(1);
        expect(countOffPaletteColors(line('border-y-lime-500'))).toBe(1);
        expect(countOffPaletteColors(line('border-s-pink-200'))).toBe(1);
        expect(countOffPaletteColors(line('border-e-violet-700'))).toBe(1);
    });

    it('divide-x/y và ring-offset', () => {
        expect(countOffPaletteColors(line('divide-y-gray-200'))).toBe(1);
        expect(countOffPaletteColors(line('divide-x-zinc-300'))).toBe(1);
        expect(countOffPaletteColors(line('ring-offset-teal-200'))).toBe(1);
    });

    it('tái hiện ĐÚNG dòng đã lọt lưới trong CompetitionListView.tsx', () => {
        const thatLine = line(
            'border-t border-b border-slate-200/80 dark:border-slate-800/60 border-l-[3px] border-l-purple-400 dark:border-l-purple-500'
        );
        expect(countOffPaletteColors(thatLine)).toBe(2);
    });
});

describe('Màu TRONG bảng đã duyệt — KHÔNG được báo nhầm', () => {
    it('5 họ semantic + mọi biến thể có hướng đều hợp lệ', () => {
        const ok = 'bg-sky-500 text-slate-700 border-emerald-200 border-l-amber-400 divide-y-rose-300 ring-offset-sky-100';
        expect(countOffPaletteColors(line(ok))).toBe(0);
    });

    it('indigo KHÔNG bị tính là màu sai chuẩn (hợp lệ theo CLAUDE.md mục 2)', () => {
        expect(countOffPaletteColors(line('bg-indigo-500 border-l-indigo-400'))).toBe(0);
    });

    it('không khớp nhầm khi tên màu nằm trong chuỗi khác', () => {
        // `bg-red-500` là vi phạm, nhưng `bg-redux-500` thì không phải màu Tailwind.
        expect(countOffPaletteColors(line('bg-redux-500'))).toBe(0);
        // Sắc độ không hợp lệ cũng không phải class màu Tailwind.
        expect(countOffPaletteColors(line('bg-purple-550'))).toBe(0);
    });
});

describe('Nợ kỹ thuật indigo — đếm RIÊNG, và cũng phải bắt biến thể có hướng', () => {
    it('indigo trần', () => {
        expect(countIndigoAlias(line('bg-indigo-500 text-indigo-700'))).toBe(2);
    });

    it('indigo CÓ HƯỚNG — 9 file trong dự án đang giấu loại này', () => {
        expect(countIndigoAlias(line('border-l-indigo-400'))).toBe(1);
        expect(countIndigoAlias(line('divide-y-indigo-200'))).toBe(1);
    });

    it('màu sai chuẩn KHÔNG bị tính nhầm vào nợ indigo', () => {
        expect(countIndigoAlias(line('bg-purple-500 border-l-teal-400'))).toBe(0);
    });
});
