import { describe, it, expect } from 'vitest';
import {
    CARTOON_AVATARS,
    getCartoonAvatar,
    getCartoonAvatarById,
    hashStringToAvatarId,
    getCartoonAvatarDataUrl
} from './cartoonAvatars';

describe('cartoonAvatars library (50 icons)', () => {
    it('chứa chính xác 50 avatar hoạt hình', () => {
        expect(CARTOON_AVATARS).toHaveLength(50);
        for (let i = 1; i <= 50; i++) {
            expect(CARTOON_AVATARS[i - 1].id).toBe(i);
            expect(CARTOON_AVATARS[i - 1].name).toBeTruthy();
            expect(CARTOON_AVATARS[i - 1].svg).toContain('<svg');
            expect(CARTOON_AVATARS[i - 1].dataUrl).toContain('data:image/svg+xml');
        }
    });

    it('hash định danh nhất quán cho cùng một nhân viên', () => {
        const emp1 = '158089 - H.Duy';
        const emp2 = '158089 - H.Duy';
        const emp3 = '49455 - H.Giàu';

        const id1 = hashStringToAvatarId(emp1);
        const id2 = hashStringToAvatarId(emp2);
        const id3 = hashStringToAvatarId(emp3);

        expect(id1).toBeGreaterThanOrEqual(1);
        expect(id1).toBeLessThanOrEqual(50);
        expect(id1).toBe(id2);
        // Khác nhân viên thường ra ID khác
        expect(id1).not.toBe(id3);

        const avatar1 = getCartoonAvatar(emp1);
        const avatar2 = getCartoonAvatar(emp2);
        expect(avatar1.id).toBe(avatar2.id);
        expect(avatar1.name).toBe(avatar2.name);
    });

    it('lấy avatar theo ID chính xác', () => {
        const av1 = getCartoonAvatarById(1);
        expect(av1.id).toBe(1);
        expect(av1.name).toBe('Cáo Tinh Nghịch');

        const av50 = getCartoonAvatarById(50);
        expect(av50.id).toBe(50);
        expect(av50.name).toBe('Cà Phê Năng Lượng');
    });

    it('trả về data URL hợp lệ', () => {
        const dataUrl = getCartoonAvatarDataUrl('261805 - T.Huyền');
        expect(dataUrl).toMatch(/^data:image\/svg\+xml;utf8,/);
    });
});
