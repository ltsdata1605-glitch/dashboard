import { describe, it, expect } from 'vitest';
import { computeColumnTiers } from './nhanVienHelpers';

describe('computeColumnTiers', () => {
    it('returns none for empty or all-zero array', () => {
        expect(computeColumnTiers([])).toEqual([]);
        expect(computeColumnTiers([0, 0, null, undefined])).toEqual(['none', 'none', 'none', 'none']);
    });

    it('returns top for a single positive value', () => {
        expect(computeColumnTiers([0, 15, 0])).toEqual(['none', 'top', 'none']);
    });

    it('splits 2 values into top and bot', () => {
        expect(computeColumnTiers([10, 50])).toEqual(['bot', 'top']);
        expect(computeColumnTiers([50, 10])).toEqual(['top', 'bot']);
        expect(computeColumnTiers([20, 20])).toEqual(['top', 'top']);
    });

    it('correctly splits multi-values into top, trung, bot', () => {
        // 9 values: top 3, trung 3, bot 3
        const values = [90, 80, 70, 60, 50, 40, 30, 20, 10];
        const tiers = computeColumnTiers(values);
        expect(tiers).toEqual([
            'top', 'top', 'top',
            'trung', 'trung', 'trung',
            'bot', 'bot', 'bot'
        ]);
    });

    it('handles equal values at boundary consistently', () => {
        const values = [50, 50, 50, 10, 10];
        const tiers = computeColumnTiers(values);
        expect(tiers[0]).toBe('top');
        expect(tiers[1]).toBe('top');
        expect(tiers[2]).toBe('top');
        expect(tiers[3]).toBe('bot');
        expect(tiers[4]).toBe('bot');
    });

    it('handles all equal values gracefully as trung', () => {
        const values = [20, 20, 20, 20];
        const tiers = computeColumnTiers(values);
        expect(tiers).toEqual(['trung', 'trung', 'trung', 'trung']);
    });

    it('handles realistic provider data with zeros', () => {
        // HPL sample: [27, 5, 9, 0, 9, 0, 2, 0, 0, 26, 10, 59, 25, 0, 11, 5, 0, 11]
        const sample = [27, 5, 9, 0, 9, 0, 2, 0, 0, 26, 10, 59, 25, 0, 11, 5, 0, 11];
        const tiers = computeColumnTiers(sample);
        
        expect(tiers[3]).toBe('none'); // 0
        expect(tiers[5]).toBe('none'); // 0
        expect(tiers[11]).toBe('top'); // 59 is max -> top
        expect(tiers[0]).toBe('top');  // 27 is top tier
        expect(tiers[9]).toBe('top');  // 26 is top tier
        expect(tiers[12]).toBe('top'); // 25 is top tier
        expect(tiers[6]).toBe('bot');  // 2 is min -> bot
        expect(tiers[1]).toBe('bot');  // 5 is bot tier
        expect(tiers[15]).toBe('bot'); // 5 is bot tier
    });
});
