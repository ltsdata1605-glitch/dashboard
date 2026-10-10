import { describe, it, expect, vi, beforeEach } from 'vitest';

// Setup node localStorage & window mock
const mockStorage: Record<string, string> = {};
const mockLocalStorage = {
    getItem: (key: string) => mockStorage[key] || null,
    setItem: (key: string, val: string) => { mockStorage[key] = val; },
    removeItem: (key: string) => { delete mockStorage[key]; },
    clear: () => { Object.keys(mockStorage).forEach(k => delete mockStorage[k]); }
};

const listeners: Record<string, Function[]> = {};
const mockWindow = {
    addEventListener: (type: string, fn: Function) => {
        listeners[type] = listeners[type] || [];
        listeners[type].push(fn);
    },
    removeEventListener: (type: string, fn: Function) => {
        if (!listeners[type]) return;
        listeners[type] = listeners[type].filter(f => f !== fn);
    },
    dispatchEvent: (event: any) => {
        const fns = listeners[event.type] || [];
        fns.forEach(fn => fn(event));
    }
};

(globalThis as any).localStorage = mockLocalStorage;
(globalThis as any).window = mockWindow;
(globalThis as any).document = {
    visibilityState: 'visible',
    getElementById: () => null,
    createElement: () => ({ style: {} }),
    body: { appendChild: () => {} },
    addEventListener: () => {},
    removeEventListener: () => {}
};

import {
    getStoredUserscriptVersion,
    setStoredUserscriptVersion,
    startUserscriptUpdateWatcher
} from '../../features/bi-dashboard/services/userscriptProbeService';

describe('userscriptProbeService', () => {
    beforeEach(() => {
        mockLocalStorage.clear();
        vi.clearAllTimers();
    });

    it('đọc và ghi phiên bản userscript vào localStorage chính xác', () => {
        expect(getStoredUserscriptVersion()).toBeNull();
        setStoredUserscriptVersion('7.22');
        expect(getStoredUserscriptVersion()).toBe('7.22');
    });

    it('tự động gọi callback ngay khi localStorage đã có phiên bản >= targetVersion', async () => {
        setStoredUserscriptVersion('7.22');
        const onUpdated = vi.fn();
        const stop = startUserscriptUpdateWatcher('7.22', onUpdated);

        await new Promise(r => setTimeout(r, 80));
        expect(onUpdated).toHaveBeenCalledWith('7.22');
        stop();
    });

    it('tự động phát hiện khi phiên bản được cập nhật trong quá trình theo dõi', async () => {
        setStoredUserscriptVersion('7.17');
        const onUpdated = vi.fn();
        const stop = startUserscriptUpdateWatcher('7.22', onUpdated);

        expect(onUpdated).not.toHaveBeenCalled();

        // Giả lập Tampermonkey cập nhật và ghi phiên bản mới
        setStoredUserscriptVersion('7.22');

        // Bắn sự kiện storage
        const storageFns = listeners['storage'] || [];
        storageFns.forEach(fn => fn({ key: 'ycx_userscript_installed_version', newValue: '7.22' }));

        expect(onUpdated).toHaveBeenCalledWith('7.22');
        stop();
    });

    it('bỏ qua nếu phiên bản cập nhật vẫn nhỏ hơn targetVersion', async () => {
        setStoredUserscriptVersion('7.17');
        const onUpdated = vi.fn();
        const stop = startUserscriptUpdateWatcher('7.22', onUpdated);

        // Bắn sự kiện storage với bản chưa đủ
        const storageFns = listeners['storage'] || [];
        storageFns.forEach(fn => fn({ key: 'ycx_userscript_installed_version', newValue: '7.18' }));

        expect(onUpdated).not.toHaveBeenCalled();
        stop();
    });
});
