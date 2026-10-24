import { describe, it, expect } from 'vitest';
import { getLocalDateString } from '../../utils/basicHelpers';
import { getLocalDateString as reExportedGetLocalDateString } from '../../utils/dataUtils';

describe('getLocalDateString timezone safety', () => {
    it('is exported from both basicHelpers and dataUtils', () => {
        expect(getLocalDateString).toBe(reExportedGetLocalDateString);
    });

    it('returns today date in YYYY-MM-DD when called without arguments', () => {
        const today = new Date();
        const expected = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        expect(getLocalDateString()).toBe(expected);
        expect(getLocalDateString(null)).toBe(expected);
        expect(getLocalDateString(undefined)).toBe(expected);
    });

    it('formats a specific local Date object without UTC date shift', () => {
        const d = new Date(2026, 9, 24, 6, 30, 0); // 2026-10-24 06:30 AM local time
        expect(getLocalDateString(d)).toBe('2026-10-24');
    });

    it('formats timestamp number properly', () => {
        const d = new Date(2026, 0, 15, 12, 0, 0);
        expect(getLocalDateString(d.getTime())).toBe('2026-01-15');
    });

    it('formats date string properly', () => {
        expect(getLocalDateString('2026-12-31T23:59:59')).toBe('2026-12-31');
    });

    it('returns empty string for invalid date input', () => {
        expect(getLocalDateString('invalid-date')).toBe('');
    });
});
