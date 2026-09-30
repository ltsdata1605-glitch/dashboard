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

    describe('Tự động trích xuất Mã Kho và So khớp tên siêu thị', () => {
        it('extractKhoFromStoreName trích xuất chính xác mã kho từ các số ở đầu', async () => {
            const { extractKhoFromStoreName } = await import('./biSupermarketMapService');
            expect(extractKhoFromStoreName('1678 - ĐMM_AGI_TTO - Tri Tôn')).toBe('1678');
            expect(extractKhoFromStoreName('7904 - ĐMS_AGI_TTO - Cô Tô')).toBe('7904');
            expect(extractKhoFromStoreName('8231 - ĐMS_AGI_TTO - Lương An Trà')).toBe('8231');
            expect(extractKhoFromStoreName('910 - ĐML_STR_STR - 99 Hùng Vương')).toBe('910');
            expect(extractKhoFromStoreName('2449 - ĐMM_CTH_NKI - 43 Mậu Thân')).toBe('2449');
            expect(extractKhoFromStoreName('ĐMS_AGI_TTO - Lương An Trà')).toBeNull();
            expect(extractKhoFromStoreName('ĐMS_AGI_TTO - Cô Tô')).toBeNull();
            expect(extractKhoFromStoreName('ĐMM_AGI_TTO - Tri Tôn')).toBeNull();
        });

        it('normalizeStoreNameForMatching chuẩn hóa tên sau khi bỏ số ở đầu để so khớp', async () => {
            const { normalizeStoreNameForMatching } = await import('./biSupermarketMapService');
            const norm1 = normalizeStoreNameForMatching('1678 - ĐMM_AGI_TTO - Tri Tôn');
            const norm2 = normalizeStoreNameForMatching('ĐMM_AGI_TTO - Tri Tôn');
            expect(norm1).toBe(norm2);

            const norm3 = normalizeStoreNameForMatching('7904 - ĐMS_AGI_TTO - Cô Tô');
            const norm4 = normalizeStoreNameForMatching('ĐMS_AGI_TTO - Cô Tô');
            expect(norm3).toBe(norm4);

            const norm5 = normalizeStoreNameForMatching('8231 - ĐMS_AGI_TTO - Lương An Trà');
            const norm6 = normalizeStoreNameForMatching('ĐMS_AGI_TTO - Lương An Trà');
            expect(norm5).toBe(norm6);
        });

        it('autoResolveSupermarketKhoMap tự động map chính xác cả 6 siêu thị trong ví dụ của user', async () => {
            const { autoResolveSupermarketKhoMap } = await import('./biSupermarketMapService');
            const inputCandidates = [
                '1678 - ĐMM_AGI_TTO - Tri Tôn',
                '7904 - ĐMS_AGI_TTO - Cô Tô',
                '8231 - ĐMS_AGI_TTO - Lương An Trà',
                'ĐMS_AGI_TTO - Lương An Trà',
                'ĐMS_AGI_TTO - Cô Tô',
                'ĐMM_AGI_TTO - Tri Tôn',
            ];

            const { updatedMap, newMappings, count } = autoResolveSupermarketKhoMap(inputCandidates, {});

            expect(count).toBe(6);
            expect(updatedMap['1678 - ĐMM_AGI_TTO - Tri Tôn']).toBe('1678');
            expect(updatedMap['ĐMM_AGI_TTO - Tri Tôn']).toBe('1678');
            expect(updatedMap['7904 - ĐMS_AGI_TTO - Cô Tô']).toBe('7904');
            expect(updatedMap['ĐMS_AGI_TTO - Cô Tô']).toBe('7904');
            expect(updatedMap['8231 - ĐMS_AGI_TTO - Lương An Trà']).toBe('8231');
            expect(updatedMap['ĐMS_AGI_TTO - Lương An Trà']).toBe('8231');

            expect(newMappings['ĐMM_AGI_TTO - Tri Tôn']).toBe('1678');
            expect(newMappings['ĐMS_AGI_TTO - Cô Tô']).toBe('7904');
            expect(newMappings['ĐMS_AGI_TTO - Lương An Trà']).toBe('8231');
        });

        it('getKhoFromSupermarketName tra cứu linh hoạt theo mã số đầu hoặc tên tương đương', async () => {
            const { getKhoFromSupermarketName } = await import('./biSupermarketMapService');
            const map = {
                '1678 - ĐMM_AGI_TTO - Tri Tôn': '1678',
                'ĐMS_AGI_TTO - Cô Tô': '7904',
            };

            // 1. Tên có số ở đầu tự lấy ra mã kho
            expect(getKhoFromSupermarketName('8231 - ĐMS_AGI_TTO - Lương An Trà', map)).toBe('8231');

            // 2. Tên không có số nhưng map đã có bản ghi tương đương
            expect(getKhoFromSupermarketName('ĐMM_AGI_TTO - Tri Tôn', map)).toBe('1678');

            // 3. Tên có số nhưng map chỉ lưu tên không có số
            expect(getKhoFromSupermarketName('7904 - ĐMS_AGI_TTO - Cô Tô', map)).toBe('7904');
        });
    });
});
