import { describe, expect, it } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Input } from './Input';

const h = React.createElement;

describe('Input — nút icon phải', () => {
    it('rightIconLabel (GĐ10 2026-10-20): nút xoá không chữ có tên cho trình đọc màn hình + gợi ý khi rê chuột', () => {
        const html = renderToStaticMarkup(h(Input, { value: 'abc', readOnly: true, rightIcon: 'close', onRightIconClick: () => {}, rightIconLabel: 'Xoá từ khoá' }));
        expect(html).toMatch(/<button[^>]*aria-label="Xoá từ khoá"/);
        expect(html).toMatch(/<button[^>]*title="Xoá từ khoá"/);
        expect(html).toMatch(/<button[^>]*type="button"/);
    });

    it('icon phải không bấm được thì chỉ là trang trí: không có nút, ẩn với trình đọc màn hình', () => {
        const html = renderToStaticMarkup(h(Input, { value: 'abc', readOnly: true, rightIcon: 'search' }));
        expect(html).not.toContain('<button');
        expect(html).toContain('aria-hidden="true"');
    });
});
