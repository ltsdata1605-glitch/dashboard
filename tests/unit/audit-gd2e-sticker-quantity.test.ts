import { describe, expect, it } from 'vitest';
import { normalizeTagQuantity, MAX_TAGS_PER_PRODUCT } from '../../features/sticker-event/utils/format';

/** Audit 2026-10-07 (D13): số lượng tem từ file JSON phải là số nguyên hợp lệ trước khi dựng Array(n). */
describe('normalizeTagQuantity', () => {
    it('số lẻ/chuỗi/không hợp lệ không còn làm vỡ hay in sai số tem', () => {
        expect(normalizeTagQuantity(1.5)).toBe(1);          // trước: RangeError
        expect(normalizeTagQuantity('10')).toBe(10);        // trước: Array("10") = 1 tem
        expect(normalizeTagQuantity(1e100)).toBe(MAX_TAGS_PER_PRODUCT); // trước: treo tab
        expect(normalizeTagQuantity(NaN)).toBe(1);
        expect(normalizeTagQuantity(-3)).toBe(1);
        expect(normalizeTagQuantity(undefined)).toBe(1);
        expect(normalizeTagQuantity(3)).toBe(3);
        expect(() => Array(normalizeTagQuantity(2.7)).fill(0)).not.toThrow();
    });
});
