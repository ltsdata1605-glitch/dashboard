import { describe, it, expect } from 'vitest';
import { truncateExportName, applyExportTextTruncation } from './exportLayout';

describe('truncateExportName', () => {
    it('rút gọn chuỗi dài vượt quá 26 ký tự và thay phần sau thành ...', () => {
        const input = 'T10 - TRẢ CHẬM FECREDIT, SHINHAN, SAMSUNG FINANCE+';
        const result = truncateExportName(input, 26);
        expect(result).toBe('T10 - TRẢ CHẬM FECREDIT...');
    });

    it('giữ nguyên chuỗi 26 ký tự vừa khít', () => {
        const input = 'T10 - SIM MOBIFONE/SIM DMX';
        expect(input.length).toBe(26);
        const result = truncateExportName(input, 26);
        expect(result).toBe('T10 - SIM MOBIFONE/SIM DMX');
    });

    it('giữ nguyên các tên ngắn hơn 26 ký tự', () => {
        expect(truncateExportName('T10 - TAI NGHE', 26)).toBe('T10 - TAI NGHE');
        expect(truncateExportName('T10 - CÁP - SẠC', 26)).toBe('T10 - CÁP - SẠC');
        expect(truncateExportName('T10 - VAS', 26)).toBe('T10 - VAS');
        expect(truncateExportName('T10 - AUDIO', 26)).toBe('T10 - AUDIO');
    });

    it('ngắt tại ranh giới từ khi chuỗi dài không có dấu phẩy', () => {
        const input = 'T10 - ĐIỆN THOẠI SAMSUNG GALAXY S24 ULTRA';
        const result = truncateExportName(input, 26);
        expect(result).toBe('T10 - ĐIỆN THOẠI SAMSUNG...');
    });

    it('loại bỏ các dấu phẩy, gạch nối, khoảng trắng thừa trước dấu ...', () => {
        const input = 'T10 - TRẢ CHẬM FECREDIT, , -';
        const result = truncateExportName(input, 26);
        expect(result).toBe('T10 - TRẢ CHẬM FECREDIT...');
    });
});

describe('applyExportTextTruncation với mock DOM', () => {
    it('rút gọn nội dung phần tử lá có class truncate', () => {
        const elements: any[] = [];
        const createMockEl = (textContent: string, hasTruncate = true, hasAttr = false) => {
            const el = {
                textContent,
                children: [] as any[],
                childNodes: [] as any[],
                classList: {
                    contains: (c: string) => hasTruncate && c === 'truncate',
                    remove: () => {}
                },
                hasAttribute: (a: string) => hasAttr && a === 'data-category-name'
            };
            elements.push(el);
            return el;
        };

        const root = {
            querySelectorAll: (sel: string) => {
                if (sel.includes('.truncate') || sel.includes('[data-category-name]')) {
                    return elements;
                }
                return [];
            }
        } as unknown as HTMLElement;

        const el1 = createMockEl('T10 - TRẢ CHẬM FECREDIT, SHINHAN, SAMSUNG FINANCE+');
        const el2 = createMockEl('T10 - TAI NGHE');
        const el3 = createMockEl('T10 - SIM MOBIFONE/SIM DMX');

        applyExportTextTruncation(root, 26);

        expect(el1.textContent).toBe('T10 - TRẢ CHẬM FECREDIT...');
        expect(el2.textContent).toBe('T10 - TAI NGHE');
        expect(el3.textContent).toBe('T10 - SIM MOBIFONE/SIM DMX');
    });
});
