import { describe, expect, it, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CapsuleBar, type CapsuleItem } from './CapsuleBar';

const h = React.createElement;

describe('CapsuleBar — Cụm công cụ / điều hướng dạng viên nhộng chuẩn Apple HIG', () => {
    const mockItems: CapsuleItem[] = [
        { id: 'store', label: 'Siêu thị', icon: 'chartPie', onClick: vi.fn(), active: true },
        { id: 'emp', label: 'Nhân viên', icon: 'users', onClick: vi.fn(), badge: 3 },
        { id: 'sync', label: 'Cập nhật', icon: 'uploadCloud', onClick: vi.fn(), disabled: true },
    ];

    it('vẽ đúng cấu trúc container bo tròn viên nhộng rounded-full và data-segmented', () => {
        const html = renderToStaticMarkup(
            h(CapsuleBar, { items: mockItems, ariaLabel: 'Phân hệ chính' })
        );
        expect(html).toContain('data-capsule-bar=""');
        expect(html).toContain('data-segmented=""');
        expect(html).toContain('rounded-full');
        expect(html).toContain('aria-label="Phân hệ chính"');
    });

    it('kích thước mặc định compact 32×32px nhỏ gọn chuẩn Zalo/iOS mẫu', () => {
        const html = renderToStaticMarkup(
            h(CapsuleBar, { items: mockItems })
        );
        expect(html).toContain('min-w-[32px]');
        expect(html).toContain('min-h-[32px]');
        expect(html).toContain('ycx-hit');
    });

    it('kích thước lg tạo nút 44×44px', () => {
        const html = renderToStaticMarkup(
            h(CapsuleBar, { items: mockItems, size: 'lg' })
        );
        expect(html).toContain('min-w-[44px]');
        expect(html).toContain('min-h-[44px]');
    });

    it('kích thước sm tạo nút 28×28px', () => {
        const html = renderToStaticMarkup(
            h(CapsuleBar, { items: mockItems, size: 'sm' })
        );
        expect(html).toContain('min-w-[28px]');
        expect(html).toContain('min-h-[28px]');
    });

    it('nút active có aria-pressed=true, data-active=true và nhãn sr-only', () => {
        const html = renderToStaticMarkup(
            h(CapsuleBar, { items: mockItems })
        );
        expect(html).toContain('aria-pressed="true"');
        expect(html).toContain('data-active="true"');
        expect(html).toContain('<span class="sr-only">Siêu thị</span>');
    });

    it('hiển thị badge thông báo nhỏ khi có dữ liệu', () => {
        const html = renderToStaticMarkup(
            h(CapsuleBar, { items: mockItems })
        );
        expect(html).toContain('>3</span>');
    });

    it('không vẽ gì khi enabled=false hoặc mảng items rỗng', () => {
        const htmlDisabled = renderToStaticMarkup(
            h(CapsuleBar, { items: mockItems, enabled: false })
        );
        expect(htmlDisabled).toBe('');

        const htmlEmpty = renderToStaticMarkup(
            h(CapsuleBar, { items: [] })
        );
        expect(htmlEmpty).toBe('');
    });
});
