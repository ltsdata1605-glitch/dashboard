import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    navigateToBiRealtime,
    navigateToBiLuyKe,
    navigateToDoThuong,
    navigateToYcxAnalysis
} from './autoNavigationService';
import { configStore } from '../store/configStore';

// Simple polyfill for node test environment
const mockStorage = new Map<string, string>();
(globalThis as any).localStorage = {
    getItem: (k: string) => mockStorage.get(k) ?? null,
    setItem: (k: string, v: string) => mockStorage.set(k, String(v)),
    removeItem: (k: string) => mockStorage.delete(k),
    clear: () => mockStorage.clear(),
};

if (typeof (globalThis as any).CustomEvent === 'undefined') {
    (globalThis as any).CustomEvent = class CustomEvent {
        type: string;
        detail: any;
        constructor(type: string, params?: { detail?: any }) {
            this.type = type;
            this.detail = params?.detail;
        }
    };
}

const listeners = new Map<string, Set<(e: any) => void>>();
const mockWindow = {
    dispatchEvent: vi.fn((e: any) => {
        const list = listeners.get(e.type);
        if (list) {
            list.forEach(cb => cb(e));
        }
        return true;
    }),
    addEventListener: vi.fn((type: string, cb: any) => {
        if (!listeners.has(type)) listeners.set(type, new Set());
        listeners.get(type)!.add(cb);
    }),
    removeEventListener: vi.fn((type: string, cb: any) => {
        listeners.get(type)?.delete(cb);
    })
};
(globalThis as any).window = mockWindow;

vi.mock('../utils/db', () => ({
    set: vi.fn().mockResolvedValue(undefined),
    get: vi.fn().mockResolvedValue(undefined)
}));

describe('autoNavigationService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockStorage.clear();
        listeners.clear();
    });

    it('navigates to BI Realtime correctly', async () => {
        const events: { type: string; detail: any }[] = [];
        const capture = (e: any) => {
            events.push({ type: e.type, detail: e.detail });
        };
        mockWindow.addEventListener('app-switch-tab', capture);
        mockWindow.addEventListener('bi-switch-view', capture);
        mockWindow.addEventListener('dashboard-switch-tab', capture);

        await navigateToBiRealtime();

        expect(mockStorage.get('bi_active_view')).toBe('dashboard');
        expect(configStore.getState().cache['dashboard-main-tab']).toBe('realtime');
        expect(configStore.getState().cache['dashboard-sub-tab']).toBe('revenue');

        expect(events).toContainEqual({ type: 'app-switch-tab', detail: { tab: 'employees' } });
        expect(events).toContainEqual({ type: 'bi-switch-view', detail: { view: 'dashboard' } });
        expect(events).toContainEqual({ type: 'dashboard-switch-tab', detail: { mainTab: 'realtime', subTab: 'revenue' } });
    });

    it('navigates to BI Luỹ kế correctly', async () => {
        const events: { type: string; detail: any }[] = [];
        const capture = (e: any) => {
            events.push({ type: e.type, detail: e.detail });
        };
        mockWindow.addEventListener('app-switch-tab', capture);
        mockWindow.addEventListener('bi-switch-view', capture);
        mockWindow.addEventListener('dashboard-switch-tab', capture);

        await navigateToBiLuyKe();

        expect(mockStorage.get('bi_active_view')).toBe('dashboard');
        expect(configStore.getState().cache['dashboard-main-tab']).toBe('cumulative');
        expect(configStore.getState().cache['dashboard-sub-tab']).toBe('revenue');

        expect(events).toContainEqual({ type: 'app-switch-tab', detail: { tab: 'employees' } });
        expect(events).toContainEqual({ type: 'bi-switch-view', detail: { view: 'dashboard' } });
        expect(events).toContainEqual({ type: 'dashboard-switch-tab', detail: { mainTab: 'cumulative', subTab: 'revenue' } });
    });

    it('navigates to Đỗ Thưởng (Nhân viên > Doanh thu) correctly', async () => {
        const events: { type: string; detail: any }[] = [];
        const capture = (e: any) => {
            events.push({ type: e.type, detail: e.detail });
        };
        mockWindow.addEventListener('app-switch-tab', capture);
        mockWindow.addEventListener('bi-switch-view', capture);
        mockWindow.addEventListener('nhanvien-switch-tab', capture);

        await navigateToDoThuong();

        expect(mockStorage.get('bi_active_view')).toBe('employee');
        expect(configStore.getState().cache['nhanvien-active-tab']).toBe('revenue');

        expect(events).toContainEqual({ type: 'app-switch-tab', detail: { tab: 'employees' } });
        expect(events).toContainEqual({ type: 'bi-switch-view', detail: { view: 'employee' } });
        expect(events).toContainEqual({ type: 'nhanvien-switch-tab', detail: { tab: 'revenue' } });
    });

    it('navigates to YCX Analysis correctly', () => {
        const events: { type: string; detail: any }[] = [];
        const capture = (e: any) => {
            events.push({ type: e.type, detail: e.detail });
        };
        mockWindow.addEventListener('app-switch-tab', capture);

        navigateToYcxAnalysis();

        expect(events).toContainEqual({ type: 'app-switch-tab', detail: { tab: 'analysis' } });
    });
});
