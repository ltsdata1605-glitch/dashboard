import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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
        const result = await (LazyComp as any)._payload._result();
        expect(result.default).toBe(MockComponent);
        expect(factory).toHaveBeenCalledTimes(1);
    });

    it('triggers page reload if module is undefined or missing default export', async () => {
        const factory = vi.fn().mockResolvedValue(undefined);
        const LazyComp = lazyWithRetry(factory, 'FailedComponent');

        // Do not await the returned pending promise (it intentionally hangs until browser reloads)
        (LazyComp as any)._payload._result();
        
        // Wait for microtasks
        await new Promise(resolve => setTimeout(resolve, 10));
        expect((global as any).window.location.reload).toHaveBeenCalled();
        expect(mockStorage['lazy_retry_FailedComponent']).toBe('true');
    });

    it('throws error on second failure after reload to allow ErrorBoundary fallback', async () => {
        mockStorage['lazy_retry_FailedComponent'] = 'true';
        const factory = vi.fn().mockResolvedValue(undefined);
        const LazyComp = lazyWithRetry(factory, 'FailedComponent');

        await expect((LazyComp as any)._payload._result()).rejects.toThrow(
            'Module "FailedComponent" failed to load or has no default export.'
        );
    });
});
