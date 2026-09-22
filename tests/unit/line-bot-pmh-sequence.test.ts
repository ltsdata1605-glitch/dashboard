import { describe, expect, it } from 'vitest';
import { pmhCounterPeriod, formatPmhLabel } from '../../functions/src/pmhSequence';

describe('pmhCounterPeriod — mốc reset theo tháng, giờ VN', () => {
    it('giữa tháng', () => {
        expect(pmhCounterPeriod(new Date('2026-09-22T10:00:00Z'))).toBe('2026-09');
    });
    it('30/09 18:00 UTC = 01/10 01:00 VN -> đã là tháng 10', () => {
        expect(pmhCounterPeriod(new Date('2026-09-30T18:00:00Z'))).toBe('2026-10');
    });
    it('30/09 16:00 UTC = 23:00 VN 30/09 -> vẫn tháng 9', () => {
        expect(pmhCounterPeriod(new Date('2026-09-30T16:00:00Z'))).toBe('2026-09');
    });
});

describe('formatPmhLabel', () => {
    it.each([[1, '0001'], [12, '0012'], [999, '0999'], [1234, '1234'], [12345, '12345']])('%s -> %s', (n, s) => {
        expect(formatPmhLabel(n)).toBe(s);
    });
    it('giá trị lạ -> giữ nguyên', () => {
        expect(formatPmhLabel(0)).toBe('0');
        expect(formatPmhLabel(undefined)).toBe('');
    });
});
