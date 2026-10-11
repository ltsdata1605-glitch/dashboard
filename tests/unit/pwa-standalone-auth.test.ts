import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { isStandaloneMode, isInAppBrowser } from '../../services/firebase';

describe('PWA Standalone & In-App Browser Auth Detection', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('nhận diện iOS PWA Standalone khi navigator.standalone = true', () => {
        vi.stubGlobal('window', {
            navigator: { standalone: true },
            matchMedia: vi.fn().mockReturnValue({ matches: false }),
        });
        expect(isStandaloneMode()).toBe(true);
    });

    it('nhận diện Android / Chrome PWA khi display-mode: standalone', () => {
        vi.stubGlobal('window', {
            navigator: { standalone: false },
            matchMedia: vi.fn((query: string) => ({
                matches: query === '(display-mode: standalone)',
            })),
        });
        expect(isStandaloneMode()).toBe(true);
    });

    it('trả về false khi chạy trên trình duyệt web thông thường', () => {
        vi.stubGlobal('window', {
            navigator: { standalone: false },
            matchMedia: vi.fn().mockReturnValue({ matches: false }),
        });
        expect(isStandaloneMode()).toBe(false);
    });

    it('nhận diện In-App Browser (Zalo, Facebook, Instagram)', () => {
        const zaloUA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Zalo/24.01.01';
        vi.stubGlobal('navigator', { userAgent: zaloUA });
        expect(isInAppBrowser()).toBe(true);

        const fbUA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 FBAN/FBIOS;FBAV/450.0.0;';
        vi.stubGlobal('navigator', { userAgent: fbUA });
        expect(isInAppBrowser()).toBe(true);

        const safariUA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
        vi.stubGlobal('navigator', { userAgent: safariUA });
        expect(isInAppBrowser()).toBe(false);
    });
});
