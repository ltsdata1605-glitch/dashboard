import { describe, expect, it } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const h = React.createElement;
import { Overlay, FULLSCREEN_LAYER_CLASS } from './Overlay';

describe('Overlay — lớp phủ toàn màn hình dùng chung', () => {
    it('busy: phủ kín, báo cho trình đọc màn hình đang bận (role=status + aria-busy)', () => {
        const html = renderToStaticMarkup(h(Overlay, { kind: 'busy', className: 'z-[1000]', id: 'x' }, 'Đang xử lý'));
        expect(html).toContain('fixed inset-0');
        expect(html).toContain('z-[1000]');
        expect(html).toContain('role="status"');
        expect(html).toContain('aria-busy="true"');
        expect(html).toContain('id="x"');
    });

    it('scrim: lớp nền bắt click, ẩn khỏi trình đọc màn hình', () => {
        const html = renderToStaticMarkup(h(Overlay, { kind: 'scrim', className: 'bg-black/30' }));
        expect(html).toContain('aria-hidden="true"');
        expect(html).not.toContain('role=');
    });

    it('fullscreen: không thêm ngữ nghĩa — nơi dùng tự đặt role (vd dialog)', () => {
        const html = renderToStaticMarkup(h(Overlay, { kind: 'fullscreen', role: 'dialog', 'aria-label': 'Tiến trình' }, 'nội dung'));
        expect(html).toContain('role="dialog"');
        expect(html).not.toContain('aria-hidden');
        expect(html).not.toContain('aria-busy');
    });

    it('FULLSCREEN_LAYER_CLASS: hằng cho phần tử lúc phủ lúc không (bảng toàn màn hình)', () => {
        expect(FULLSCREEN_LAYER_CLASS).toBe('fixed inset-0');
    });
});
