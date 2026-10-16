import { describe, it, expect, beforeEach, vi } from 'vitest';

const memoryStore: Record<string, string> = {};
const mockLocalStorage = {
    getItem: (key: string) => memoryStore[key] ?? null,
    setItem: (key: string, val: string) => { memoryStore[key] = String(val); },
    removeItem: (key: string) => { delete memoryStore[key]; },
    clear: () => { Object.keys(memoryStore).forEach(k => delete memoryStore[k]); },
    length: 0,
    key: () => null,
};
Object.defineProperty(globalThis, 'localStorage', {
    value: mockLocalStorage,
    configurable: true,
    writable: true,
});

import { buildTnbDataUrl, getTnbMbmCode, saveTnbMbmCode, LOCAL_STORAGE_TNB_CODE_KEY } from '../../services/tnbDataService';

describe('tnbDataService', () => {
    beforeEach(() => {
        mockLocalStorage.clear();
        vi.clearAllMocks();
    });

    describe('buildTnbDataUrl', () => {
        it('trả về base URL khi code rỗng', () => {
            expect(buildTnbDataUrl('')).toBe('https://admintnb.com/data/');
            expect(buildTnbDataUrl('   ')).toBe('https://admintnb.com/data/');
        });

        it('chuẩn hóa uppercase và gắn hash code hợp lệ', () => {
            expect(buildTnbDataUrl('peff4y')).toBe('https://admintnb.com/data/#code=PEFF4Y');
            expect(buildTnbDataUrl('  PEFF4Y  ')).toBe('https://admintnb.com/data/#code=PEFF4Y');
            expect(buildTnbDataUrl('ABC123XYZ')).toBe('https://admintnb.com/data/#code=ABC123XYZ');
        });
    });

    describe('saveTnbMbmCode & getTnbMbmCode', () => {
        it('báo lỗi nếu lưu mã rỗng', async () => {
            await expect(saveTnbMbmCode('')).rejects.toThrow('Mã bảo mật không được để trống.');
            await expect(saveTnbMbmCode('   ')).rejects.toThrow('Mã bảo mật không được để trống.');
        });

        it('lưu mã vào localStorage và lấy ra chính xác khi offline', async () => {
            const saved = await saveTnbMbmCode('peff4y');
            expect(saved).toBe('PEFF4Y');
            expect(mockLocalStorage.getItem(LOCAL_STORAGE_TNB_CODE_KEY)).toBe('PEFF4Y');

            const loaded = await getTnbMbmCode(null);
            expect(loaded).toBe('PEFF4Y');
        });
    });
});
