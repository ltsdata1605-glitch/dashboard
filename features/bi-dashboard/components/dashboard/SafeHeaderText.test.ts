import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderHeaderText } from './SafeHeaderText';

/**
 * Lưới an toàn cho fix bảo mật Đợt 2 (KE_HOACH_TONG_THE.md mục 2.3) — renderHeaderText() thay thế
 * dangerouslySetInnerHTML ở 3 file BI để đóng lỗ XSS lưu trữ qua tên cột/chương trình người dùng
 * dán vào. Test không cần render DOM thật: React.createElement() trả về object thuần
 * ({ type, props }), đủ để xác nhận chuỗi độc KHÔNG bao giờ trở thành 1 phần tử HTML — nó luôn
 * nằm nguyên dạng CHUỖI trong `props.children` (React tự escape khi render), không có node nào
 * mang type là thẻ HTML được "chế tạo" từ nội dung input.
 */

describe('renderHeaderText', () => {
    it('chuỗi không có "<br/>" trả về NGUYÊN VĂN dạng string, không bọc thêm phần tử nào', () => {
        expect(renderHeaderText('M.TIÊU')).toBe('M.TIÊU');
    });

    it('chuỗi có "<br/>" tách thành nhiều đoạn, chèn <br /> THẬT giữa các đoạn', () => {
        const result = renderHeaderText('M.TIÊU<br/>V.TRỘI');
        expect(Array.isArray(result)).toBe(true);
        const parts = result as React.ReactElement[];
        expect(parts).toHaveLength(2);
        // Đoạn đầu: không có <br>. Đoạn sau: có <br> thật (type === 'br') đứng trước text.
        expect((parts[0].props as { children: React.ReactNode[] }).children[0]).toBe(false);
        expect((parts[0].props as { children: React.ReactNode[] }).children[1]).toBe('M.TIÊU');
        const secondChildren = (parts[1].props as { children: React.ReactNode[] }).children;
        expect(React.isValidElement(secondChildren[0]) && (secondChildren[0] as React.ReactElement).type).toBe('br');
        expect(secondChildren[1]).toBe('V.TRỘI');
    });

    it('CHUỖI ĐỘC (thẻ HTML từ dữ liệu người dùng dán vào) KHÔNG bị parse thành phần tử HTML — luôn nằm nguyên dạng string trong children', () => {
        const malicious = '<img src=x onerror=alert(1)>';
        const result = renderHeaderText(malicious);
        // Không chứa "<br/>" nên trả nguyên chuỗi — React sẽ render làm text node (tự escape),
        // KHÔNG có bất kỳ object React nào có type/props trỏ tới thẻ <img>.
        expect(result).toBe(malicious);
        expect(typeof result).toBe('string');
    });

    it('CHUỖI ĐỘC cài xen giữa dấu "<br/>" hợp lệ cũng không bị parse — mỗi đoạn vẫn chỉ là string', () => {
        const malicious = '<br/><script>alert(1)</script>';
        const result = renderHeaderText(malicious) as React.ReactElement[];
        expect(Array.isArray(result)).toBe(true);
        for (const fragment of result) {
            const children = (fragment.props as { children: React.ReactNode[] }).children;
            for (const child of children) {
                if (child === false || (React.isValidElement(child) && child.type === 'br')) continue;
                // Mọi children còn lại (kể cả đoạn chứa "<script>...") phải là STRING thuần,
                // không phải 1 React element được "dựng" từ nội dung độc hại.
                expect(typeof child).toBe('string');
            }
        }
        // Đoạn "<script>alert(1)</script>" phải còn nguyên dạng text ở đâu đó trong cấu trúc.
        const allText = result.flatMap(f => (f.props as { children: React.ReactNode[] }).children).filter(c => typeof c === 'string').join('');
        expect(allText).toContain('<script>alert(1)</script>');
    });
});
