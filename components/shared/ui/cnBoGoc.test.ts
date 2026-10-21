import { describe, expect, it } from 'vitest';
import { cn } from './utils';
import { cn as cnTuButton } from './Button';

/**
 * GĐ10 bước 4 (2026-10-21): cn() phải biết 4 token bo góc (`rounded-control/card/popup/overlay`) là CỠ bo góc. Bản mặc định của
 * tailwind-merge không biết → giữ cả lớp gốc của component lẫn lớp truyền vào, CSS thắng theo chữ cái (card < control < full < lg
 * < … < popup): `<Input className="rounded-card">` ra 8px, phải viết `!rounded-card`. Bỏ cấu hình ở ./utils là test này đỏ.
 */
describe('cn() biết token bo góc', () => {
    it('lớp bo góc SAU thắng — kể cả giữa token với lớp Tailwind thường', () => {
        expect(cn('rounded-control', 'rounded-card')).toBe('rounded-card');
        expect(cn('rounded-full', 'rounded-control')).toBe('rounded-control');
        expect(cn('rounded-control', 'rounded-none')).toBe('rounded-none');
        expect(cn('rounded-popup', 'rounded-overlay')).toBe('rounded-overlay');
        expect(cn('h-9 rounded-control px-3', 'rounded-md')).toBe('h-9 px-3 rounded-md');
    });
    it('góc/cạnh và biến thể gộp đúng như lớp Tailwind thường', () => {
        expect(cn('rounded-t-control', 'rounded-card')).toBe('rounded-card');
        expect(cn('rounded-card', 'rounded-t-control')).toBe('rounded-card rounded-t-control');
        expect(cn('sm:rounded-popup', 'sm:rounded-none')).toBe('sm:rounded-none');
        expect(cn('rounded-control', 'lg:rounded-card')).toBe('rounded-control lg:rounded-card');
    });
    it('Button dùng CHUNG một cn() (không còn bản tailwind-merge mặc định riêng)', () => {
        expect(cnTuButton).toBe(cn);
    });
});
