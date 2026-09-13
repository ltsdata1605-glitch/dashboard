import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    resolveUserId,
    fetchSupermarketMap,
    saveSupermarketMap,
    addSupermarketNameToKho,
    removeSupermarketNameFromKho,
    moveSupermarketNameToKho,
} from './biSupermarketMapService';
import * as dbUtils from '../utils/db';

// Mock Firebase
vi.mock('../../../services/firebase', () => ({
    auth: { currentUser: null },
    db: {},
}));

vi.mock('firebase/firestore', () => ({
    doc: vi.fn(),
    getDoc: vi.fn().mockResolvedValue({ exists: () => false, data: () => ({}) }),
    getDocs: vi.fn().mockResolvedValue([]),
    collection: vi.fn(),
    setDoc: vi.fn().mockResolvedValue(undefined),
    serverTimestamp: vi.fn(),
}));

describe('biSupermarketMapService — Cấu hình Mã Kho riêng biệt theo từng tài khoản', () => {
    const memoryStore: Record<string, any> = {};

    beforeEach(() => {
        for (const key of Object.keys(memoryStore)) {
            delete memoryStore[key];
        }
        vi.spyOn(dbUtils, 'get').mockImplementation(async (key: string) => memoryStore[key] || null);
        vi.spyOn(dbUtils, 'set').mockImplementation(async (key: string, val: any) => {
            memoryStore[key] = val;
        });
    });

    it('resolveUserId ưu tiên userId truyền vào, fallback về auth hoặc guest', () => {
        expect(resolveUserId('user_123')).toBe('user_123');
        expect(resolveUserId('   ')).toBe('guest');
        expect(resolveUserId(undefined)).toBe('guest');
    });

    it('Tài khoản A và Tài khoản B lưu cấu hình hoàn toàn độc lập, không ảnh hưởng lẫn nhau', async () => {
        const userA = 'account_A';
        const userB = 'account_B';

        // Tài khoản A cấu hình siêu thị Hùng Vương -> 910
        await addSupermarketNameToKho('910', 'DML_STR_STR - 99 Hùng Vương', userA);

        // Tài khoản B cấu hình siêu thị Mậu Thân -> 2449
        await addSupermarketNameToKho('2449', 'DMM_CTH_NKI - 43 Mậu Thân', userB);

        // Đọc lại map của Tài khoản A
        const mapA = await fetchSupermarketMap(userA);
        expect(mapA['DML_STR_STR - 99 Hùng Vương']).toBe('910');
        expect(mapA['DMM_CTH_NKI - 43 Mậu Thân']).toBeUndefined();

        // Đọc lại map của Tài khoản B
        const mapB = await fetchSupermarketMap(userB);
        expect(mapB['DMM_CTH_NKI - 43 Mậu Thân']).toBe('2449');
        expect(mapB['DML_STR_STR - 99 Hùng Vương']).toBeUndefined();
    });

    it('Sửa đổi hoặc xoá ở Tài khoản A không làm mất dữ liệu của Tài khoản B', async () => {
        const userA = 'account_A';
        const userB = 'account_B';

        // Thiết lập ban đầu
        await saveSupermarketMap({ 'Siêu thị X': '111', 'Siêu thị Y': '222' }, userA);
        await saveSupermarketMap({ 'Siêu thị Z': '333' }, userB);

        // Tài khoản A đổi Mã Kho của Siêu thị X sang 999
        await moveSupermarketNameToKho('111', '999', 'Siêu thị X', userA);

        // Tài khoản A xoá Siêu thị Y
        await removeSupermarketNameFromKho('222', 'Siêu thị Y', userA);

        // Kiểm tra Tài khoản A
        const mapA = await fetchSupermarketMap(userA);
        expect(mapA['Siêu thị X']).toBe('999');
        expect(mapA['Siêu thị Y']).toBeUndefined();

        // Kiểm tra Tài khoản B vẫn nguyên vẹn
        const mapB = await fetchSupermarketMap(userB);
        expect(mapB['Siêu thị Z']).toBe('333');
    });
});
