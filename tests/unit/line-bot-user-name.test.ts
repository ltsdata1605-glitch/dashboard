import { describe, expect, it } from 'vitest';
import { formatShortUserName } from '../../functions/src/userName';

describe('formatShortUserName — "Mã NV - Tên" từ tên LINE', () => {
    it.each([
        ['DMST-Nhân-107617SALE', '107617 - Nhân'],
        ['ĐMST_Lâm_62864_AIO', '62864 - Lâm'],
        ['STR_ Trường_21453-TC', '21453 - Trường'],
        ['HGI_ĐẠT_25260_BOSS', '25260 - ĐẠT'],
        ['HGI_Huy_143998_TC', '143998 - Huy'],
        ['ĐMST- Thu-51115-AIO', '51115 - Thu'],
        ['DMST-Anh Nhân-107617', '107617 - Anh Nhân'],
        ['107617 - Nhân', '107617 - Nhân'],
        ['STR_21453_Trường', '21453 - Trường'],
        ['Nhân 107617', '107617 - Nhân'],
    ])('%s -> %s', (input, expected) => {
        expect(formatShortUserName(input)).toBe(expected);
    });
    it('không có mã NV -> giữ nguyên', () => {
        expect(formatShortUserName('Nguyễn Văn A')).toBe('Nguyễn Văn A');
        expect(formatShortUserName('Người dùng LINE')).toBe('Người dùng LINE');
        expect(formatShortUserName('  ')).toBe('');
    });
});
