import { describe, it, expect } from 'vitest';
import {
    getDefaultBgImageForType,
    isValidBgImageForType,
    resolveEffectiveBgImage,
    getDefaultHeaderForType,
    getDefaultSubHeaderForType,
    getDefaultActiveFieldForType,
    GIO_VANG_DEFAULT_BG,
    GIA_SOC_DEFAULT_BG,
    DRAW_DMX_DEFAULT_BG,
    DRAW_TGDD_DEFAULT_BG,
} from '../../features/sticker-event/stickerprinter/stickerBackgroundHelpers';

describe('stickerBackgroundHelpers', () => {
    it('returns correct default background for each sticker type', () => {
        expect(getDefaultBgImageForType('gio_vang')).toBe(GIO_VANG_DEFAULT_BG);
        expect(getDefaultBgImageForType('draw')).toBe(DRAW_DMX_DEFAULT_BG);
        expect(getDefaultBgImageForType('gia_soc')).toBe(GIA_SOC_DEFAULT_BG);
    });

    it('validates background image strictly by sticker type', () => {
        // gio_vang should ONLY allow GVO2-scaled
        expect(isValidBgImageForType('gio_vang', GIO_VANG_DEFAULT_BG)).toBe(true);
        expect(isValidBgImageForType('gio_vang', DRAW_DMX_DEFAULT_BG)).toBe(false);
        expect(isValidBgImageForType('gio_vang', GIA_SOC_DEFAULT_BG)).toBe(false);

        // draw should ONLY allow draw backgrounds
        expect(isValidBgImageForType('draw', DRAW_DMX_DEFAULT_BG)).toBe(true);
        expect(isValidBgImageForType('draw', DRAW_TGDD_DEFAULT_BG)).toBe(true);
        expect(isValidBgImageForType('draw', GIO_VANG_DEFAULT_BG)).toBe(false);
        expect(isValidBgImageForType('draw', GIA_SOC_DEFAULT_BG)).toBe(false);

        // gia_soc should ONLY allow gia_soc backgrounds
        expect(isValidBgImageForType('gia_soc', GIA_SOC_DEFAULT_BG)).toBe(true);
        expect(isValidBgImageForType('gia_soc', '/frame/X24.png')).toBe(true);
        expect(isValidBgImageForType('gia_soc', GIO_VANG_DEFAULT_BG)).toBe(false);
        expect(isValidBgImageForType('gia_soc', DRAW_DMX_DEFAULT_BG)).toBe(false);
    });

    it('resolveEffectiveBgImage falls back to valid default when cross-tab background is provided', () => {
        // If draw background is provided to gio_vang, it must resolve to GIO_VANG_DEFAULT_BG
        expect(resolveEffectiveBgImage('gio_vang', DRAW_DMX_DEFAULT_BG)).toBe(GIO_VANG_DEFAULT_BG);
        expect(resolveEffectiveBgImage('gio_vang', null)).toBe(GIO_VANG_DEFAULT_BG);

        // If gio_vang background is provided to draw, it must resolve to DRAW_DMX_DEFAULT_BG
        expect(resolveEffectiveBgImage('draw', GIO_VANG_DEFAULT_BG)).toBe(DRAW_DMX_DEFAULT_BG);

        // If valid, keep it
        expect(resolveEffectiveBgImage('draw', DRAW_TGDD_DEFAULT_BG)).toBe(DRAW_TGDD_DEFAULT_BG);
    });

    it('returns appropriate default headers and active fields', () => {
        expect(getDefaultHeaderForType('gio_vang')).toBe('TỪ 00/00 ĐẾN 00/00');
        expect(getDefaultHeaderForType('gia_soc')).toBe('QUẠT ĐIỀU HOÀ');
        expect(getDefaultSubHeaderForType('gio_vang')).toBe('5 SUẤT/NGÀY');
        expect(getDefaultActiveFieldForType('draw')).toBe('drawContentBottomLeft');
        expect(getDefaultActiveFieldForType('gio_vang')).toBe('header');
        expect(getDefaultActiveFieldForType('gia_soc')).toBe('header');
    });
});
