import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { lazyWithRetry } from '../../utils/lazyWithRetry';

describe('lazyWithRetry', () => {
    let mockStorage: Record<string, string> = {};

    beforeEach(() => {
        mockStorage = {};
        (global as any).sessionStorage = {
            getItem: vi.fn((key: string) => mockStorage[key] || null),
            setItem: vi.fn((key: string, val: string) => { mockStorage[key] = val; }),
            removeItem: vi.fn((key: string) => { delete mockStorage[key]; }),
            clear: vi.fn(() => { mockStorage = {}; }),
        };
        (global as any).window = {
            location: {
                reload: vi.fn(),
            },
        };
    });

    afterEach(() => {
        delete (global as any).sessionStorage;
        delete (global as any).window;
    });

    it('successfully loads a module with default export', async () => {
        const MockComponent = () => null;
        const factory = vi.fn().mockResolvedValue({ default: MockComponent });
        const LazyComp = lazyWithRetry(factory, 'TestComponent');

        expect(LazyComp).toBeDefined();
        // Trigger lazy loader factory under the hood
        const result = await (LazyComp as any)._lazy._payload._result();
        expect(result.default).toBe(MockComponent);
        expect(factory).toHaveBeenCalledTimes(1);
    });

    it('triggers page reload if module is undefined or missing default export', async () => {
        vi.useFakeTimers();
        try {
            const factory = vi.fn().mockResolvedValue(undefined);
            const LazyComp = lazyWithRetry(factory, 'FailedComponent');

            // Do not await the returned pending promise (it intentionally hangs until browser reloads)
            (LazyComp as any)._lazy._payload._result();
            await vi.advanceTimersByTimeAsync(10);
            // 2026-10-20: chờ một nhịp (800 ms) trước khi tải lại — để nhận ra trang đang rời đi (taiLaiKhiLoiChunk.ts)
            expect((global as any).window.location.reload).not.toHaveBeenCalled();
            await vi.advanceTimersByTimeAsync(800);
            expect((global as any).window.location.reload).toHaveBeenCalled();
            expect(mockStorage['lazy_retry_FailedComponent']).toBe('true');
        } finally {
            vi.useRealTimers();
        }
    });

    it('trang đang rời đi (WebKit huỷ import dở dang lúc điều hướng) → KHÔNG tự tải lại, không đánh dấu đã thử', async () => {
        vi.useFakeTimers();
        const G = globalThis as unknown as { __ycxDangRoiTrang?: boolean };
        G.__ycxDangRoiTrang = true;
        try {
            const factory = vi.fn().mockRejectedValue(new TypeError('Importing a module script failed.'));
            const LazyComp = lazyWithRetry(factory, 'DangRoiTrang');
            (LazyComp as any)._lazy._payload._result();
            await vi.advanceTimersByTimeAsync(2000);
            expect((global as any).window.location.reload).not.toHaveBeenCalled();
            expect(mockStorage['lazy_retry_DangRoiTrang']).toBeUndefined();
        } finally {
            G.__ycxDangRoiTrang = false;
            vi.useRealTimers();
        }
    });

    it('throws error on second failure after reload to allow ErrorBoundary fallback', async () => {
        mockStorage['lazy_retry_FailedComponent'] = 'true';
        const factory = vi.fn().mockResolvedValue(undefined);
        const LazyComp = lazyWithRetry(factory, 'FailedComponent');

        await expect((LazyComp as any)._lazy._payload._result()).rejects.toThrow(
            'Module "FailedComponent" failed to load or has no default export.'
        );
    });

    // GĐ9 2026-10-14: preload() xong thì lần gắn đầu vẽ component THẬT ngay — không treo Suspense (React.lazy luôn treo ở lần
    // render đầu, kéo theo màn chờ + giữ tới 300 ms). renderToString ném lỗi nếu cây bị treo → dùng làm phép thử "vẽ đồng bộ".
    it('preload() xong → render đồng bộ, không treo', async () => {
        const That = ({ ten }: { ten: string }) => React.createElement('b', null, `xin chào ${ten}`);
        const factory = vi.fn().mockResolvedValue({ default: That });
        const LazyComp = lazyWithRetry(factory, 'PreloadComp');

        await LazyComp.preload();
        expect(renderToString(React.createElement(LazyComp, { ten: 'An' }))).toBe('<b>xin chào An</b>');
        expect(factory).toHaveBeenCalledTimes(1);
    });

    it('chưa preload → vẫn đi đường React.lazy (treo chờ module)', () => {
        const factory = vi.fn(() => new Promise<{ default: React.FC }>(() => {}));
        const LazyComp = lazyWithRetry(factory, 'ChuaNap');
        expect(() => renderToString(React.createElement(LazyComp))).toThrow();
    });

    it('preload() lỗi mạng → KHÔNG tự tải lại trang, không đặt cờ thử lại (chỉ báo lỗi cho nơi gọi)', async () => {
        const factory = vi.fn().mockRejectedValue(new Error('mất mạng'));
        const LazyComp = lazyWithRetry(factory, 'NapNgam');

        await expect(LazyComp.preload()).rejects.toThrow('mất mạng');
        expect((global as any).window.location.reload).not.toHaveBeenCalled();
        expect(mockStorage['lazy_retry_NapNgam']).toBeUndefined();
    });
});
