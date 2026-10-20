import { describe, expect, it } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Select } from './Select';

const h = React.createElement;
const selectClass = (html: string) => (html.match(/<select[^>]*class="([^"]*)"/) || [])[1] || '';

describe('Select — ô chọn dùng chung', () => {
    it('mặc định: ô chuẩn 36px, ép 44px khi chạm (vùng chạm iPhone)', () => {
        const cls = selectClass(renderToStaticMarkup(h(Select, { defaultValue: 'a', options: [{ value: 'a', label: 'A' }] })));
        expect(cls).toContain('h-9');
        expect(cls).toContain('max-sm:min-h-11');
        expect(cls).toContain('pointer-coarse:min-h-11');
    });

    it('dense (GĐ10 2026-10-20): ô gọn 28px cho dòng dữ liệu dày — KHÔNG ép 44px (vỡ mật độ dòng), chừa chỗ mũi tên nhỏ', () => {
        const html = renderToStaticMarkup(h(Select, { dense: true, defaultValue: 'a', options: [{ value: 'a', label: 'A' }], className: 'bg-sky-50' }));
        const cls = selectClass(html);
        expect(cls).toContain('h-7');
        expect(cls).toContain('text-xs');
        expect(cls).toContain('pr-6');
        expect(cls).not.toContain('min-h-11');
        expect(cls).not.toContain('h-9');
        expect(cls).toContain('bg-sky-50'); // class riêng của nơi dùng vẫn đè được
        expect(html).toContain('right-1.5');
    });
});
