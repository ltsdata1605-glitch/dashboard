import { describe, expect, it } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Textarea } from './Textarea';
import { Checkbox } from './Checkbox';
import { Input } from './Input';

const h = React.createElement;
const lop = (html: string, the: string) => (html.match(new RegExp(`<${the}[^>]*class="([^"]*)"`)) || [])[1] || '';

describe('Textarea — cùng chuẩn với Input (GĐ10 2026-10-20)', () => {
    it('viền slate-300, bo rounded-control, focus sky, chữ 14px; class riêng của nơi dùng vẫn đè được', () => {
        const cls = lop(renderToStaticMarkup(h(Textarea, { defaultValue: 'a', className: 'h-32 font-mono' })), 'textarea');
        for (const c of ['rounded-control', 'border-slate-300', 'focus-visible:ring-sky-500', 'text-sm', 'h-32', 'font-mono']) expect(cls).toContain(c);
    });
    it('có lỗi → aria-invalid + nối dòng lỗi qua aria-describedby', () => {
        const html = renderToStaticMarkup(h(Textarea, { defaultValue: '', error: 'Bắt buộc' }));
        expect(html).toContain('aria-invalid="true"');
        const id = (html.match(/aria-describedby="([^"]+)"/) || [])[1];
        expect(id).toBeTruthy();
        expect(html).toContain(`id="${id}"`);
    });
});

describe('Checkbox (GĐ10 2026-10-20)', () => {
    it('bọc trong <label> có ycx-hit (vùng chạm 44 trên điện thoại), ô sky 16px, chữ cạnh ô', () => {
        const html = renderToStaticMarkup(h(Checkbox, { defaultChecked: true, label: 'Tính TN vào SBH', labelClassName: 'text-xs' }));
        expect(lop(html, 'label')).toContain('ycx-hit');
        const o = lop(html, 'input');
        for (const c of ['h-4', 'w-4', 'accent-sky-600']) expect(o).toContain(c);
        expect(html).toContain('type="checkbox"');
        expect(html).toMatch(/<span class="[^"]*text-xs[^"]*">Tính TN vào SBH<\/span>/);
    });
    it('không chữ → không có span; khoá → khung mờ + con trỏ cấm', () => {
        const html = renderToStaticMarkup(h(Checkbox, { 'aria-label': 'Ca 1', disabled: true }));
        expect(html).not.toContain('<span');
        expect(html).toContain('aria-label="Ca 1"');
        expect(lop(html, 'label')).toContain('cursor-not-allowed');
    });
});

describe('Input dense (GĐ10 2026-10-20)', () => {
    it('ô gọn 28px chữ 12px, KHÔNG ép 44px', () => {
        const cls = lop(renderToStaticMarkup(h(Input, { dense: true, defaultValue: '1', className: 'w-14 text-center' })), 'input');
        for (const c of ['h-7', 'text-xs', 'w-14', 'text-center']) expect(cls).toContain(c);
        expect(cls).not.toContain('min-h-11');
        expect(cls).not.toContain('h-9');
    });
});
