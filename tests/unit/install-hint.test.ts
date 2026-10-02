import { describe, it, expect } from 'vitest';
import { isIphoneSafari, shouldShowInstallHint, INSTALL_HINT_SNOOZE_MS } from '../../components/layout/installHint';

const SAFARI = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const CHROME_IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/129.0 Mobile/15E148 Safari/604.1';
const ZALO = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Zalo iOS/514';
const FB = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/480.0]';
const ANDROID = 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36';
const IPAD = 'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';

describe('thẻ nhắc cài app lên màn hình chính', () => {
    it('chỉ nhận Safari thật trên iPhone', () => {
        expect(isIphoneSafari(SAFARI)).toBe(true);
        for (const ua of [CHROME_IOS, ZALO, FB, ANDROID, IPAD]) expect(isIphoneSafari(ua)).toBe(false);
    });

    it('đã cài (standalone) thì không nhắc', () => {
        expect(shouldShowInstallHint({ ua: SAFARI, isStandalone: true, dismissedAt: null, now: 1e12 })).toBe(false);
    });

    it('bấm "Để sau" → 14 ngày sau mới nhắc lại', () => {
        const now = 1e12;
        expect(shouldShowInstallHint({ ua: SAFARI, isStandalone: false, dismissedAt: null, now })).toBe(true);
        expect(shouldShowInstallHint({ ua: SAFARI, isStandalone: false, dismissedAt: now - 1000, now })).toBe(false);
        expect(shouldShowInstallHint({ ua: SAFARI, isStandalone: false, dismissedAt: now - INSTALL_HINT_SNOOZE_MS - 1, now })).toBe(true);
    });
});
