import { describe, it, expect } from 'vitest';
import { centeredScrollLeft } from '../../components/shared/ui/useCenterActiveInStrip';

describe('dải nút cuộn ngang: đưa mục đang chọn vào giữa', () => {
    const strip = { clientWidth: 300, scrollWidth: 1200 };
    it('mục ở giữa dải dài → cuộn để mục nằm chính giữa', () => {
        expect(centeredScrollLeft(strip, 600, 100)).toBe(500); // 600 - (300-100)/2
    });
    it('mục đầu → không cuộn quá 0', () => {
        expect(centeredScrollLeft(strip, 10, 100)).toBe(0);
    });
    it('mục cuối → không cuộn quá mép phải', () => {
        expect(centeredScrollLeft(strip, 1150, 50)).toBe(900);
    });
});
