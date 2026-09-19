/**
 * Helper functions to strictly bind sticker types with their corresponding
 * template backgrounds and default texts. Prevents cross-tab template leaking.
 */

export type StickerType = 'gia_soc' | 'gio_vang' | 'draw';

export const GIO_VANG_DEFAULT_BG = '/frame/GVO2-scaled.png';
export const GIA_SOC_DEFAULT_BG = '/frame/X24_NEW.png';
export const GIA_SOC_ALT_BG = '/frame/X24.png';
export const DRAW_DMX_DEFAULT_BG = '/frame/bg_phieu.png';
export const DRAW_TGDD_DEFAULT_BG = '/frame/bg_phieutgd.png';

export const getDefaultBgImageForType = (type: StickerType): string => {
    switch (type) {
        case 'gio_vang':
            return GIO_VANG_DEFAULT_BG;
        case 'draw':
            return DRAW_DMX_DEFAULT_BG;
        case 'gia_soc':
        default:
            return GIA_SOC_DEFAULT_BG;
    }
};

export const isValidBgImageForType = (type: StickerType, img?: string | null): boolean => {
    if (!img) return false;
    if (type === 'gio_vang') {
        return img === GIO_VANG_DEFAULT_BG;
    }
    if (type === 'draw') {
        return img === DRAW_DMX_DEFAULT_BG || img === DRAW_TGDD_DEFAULT_BG;
    }
    if (type === 'gia_soc') {
        return img === GIA_SOC_DEFAULT_BG || img === GIA_SOC_ALT_BG;
    }
    return false;
};

export const resolveEffectiveBgImage = (type: StickerType, img?: string | null): string => {
    return isValidBgImageForType(type, img) ? (img as string) : getDefaultBgImageForType(type);
};

export const getDefaultHeaderForType = (type: StickerType): string => {
    switch (type) {
        case 'gio_vang':
            return 'TỪ 00/00 ĐẾN 00/00';
        case 'gia_soc':
            return 'QUẠT ĐIỀU HOÀ';
        case 'draw':
        default:
            return '';
    }
};

export const getDefaultSubHeaderForType = (type: StickerType): string => {
    switch (type) {
        case 'gio_vang':
            return '5 SUẤT/NGÀY';
        case 'gia_soc':
        case 'draw':
        default:
            return '';
    }
};

export const getDefaultActiveFieldForType = (type: StickerType): string => {
    switch (type) {
        case 'draw':
            return 'drawContentBottomLeft';
        case 'gio_vang':
        case 'gia_soc':
        default:
            return 'header';
    }
};
