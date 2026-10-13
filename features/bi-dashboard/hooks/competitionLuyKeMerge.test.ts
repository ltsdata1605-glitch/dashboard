import { describe, it, expect } from 'vitest';
import { isSupermarketMatch, shortenSupermarketName, SupermarketCompetitionData } from '../utils/dashboardHelpers';

function mergeCompetitionData(
    shared: Record<string, SupermarketCompetitionData>,
    local: Record<string, SupermarketCompetitionData>,
    supermarkets: string[],
    supermarketMap: Record<string, string>
): Record<string, SupermarketCompetitionData> {
    const merged: Record<string, SupermarketCompetitionData> = { ...shared };

    Object.entries(local).forEach(([localKey, localData]) => {
        const matchingSharedKeys = Object.keys(merged).filter(sharedKey => {
            if (sharedKey === 'Tổng' && localKey === 'Tổng') return true;
            if (sharedKey === 'Tổng' || localKey === 'Tổng') return false;
            return (
                sharedKey === localKey ||
                isSupermarketMatch(localKey, sharedKey, supermarketMap) ||
                shortenSupermarketName(localKey) === shortenSupermarketName(sharedKey)
            );
        });

        const matchingSupermarket = supermarkets.find(s =>
            s !== 'Tổng' && (
                isSupermarketMatch(localKey, s, supermarketMap) ||
                shortenSupermarketName(localKey) === shortenSupermarketName(s)
            )
        );

        const canonicalKey = matchingSharedKeys[0] || matchingSupermarket || localKey;

        matchingSharedKeys.forEach(k => delete merged[k]);

        merged[canonicalKey] = localData;
    });

    return merged;
}

describe('competitionLuyKeBySupermarket merge logic', () => {
    it('ghi đè hoàn toàn dữ liệu cũ từ Firestore và giải quyết triệt để shadow key', () => {
        const oldSharedData: SupermarketCompetitionData = {
            headers: ['TARGET', 'DTLK'],
            programs: [{ name: 'T10/ĐIỆN TỬ TCL', data: ['10', '0'], metric: 'DTLK' }]
        };

        const newLocalData: SupermarketCompetitionData = {
            headers: ['TARGET', 'DTLK'],
            programs: [{ name: 'T10/ĐIỆN TỬ TCL', data: ['10', '50'], metric: 'DTLK' }]
        };

        const shared = { 'Hùng Vương': oldSharedData };
        const local = { 'ĐML_STR_STR - 99 Hùng Vương': newLocalData };
        const supermarkets = ['Hùng Vương'];
        const supermarketMap = { 'Hùng Vương': '910' };

        const merged = mergeCompetitionData(shared, local, supermarkets, supermarketMap);

        // 1. Phải chuẩn hoá về key 'Hùng Vương' khớp với dropdown
        expect(merged['Hùng Vương']).toBeDefined();
        // 2. Dữ liệu phải là số mới nhất (50), không phải số cũ (0)
        expect(merged['Hùng Vương'].programs[0].data[1]).toBe('50');
        // 3. Không được để lại 2 key trùng lặp cho cùng một siêu thị (gây nhân đôi số liệu ở Tổng)
        expect(Object.keys(merged)).toHaveLength(1);
        expect(merged['ĐML_STR_STR - 99 Hùng Vương']).toBeUndefined();
    });

    it('giữ nguyên siêu thị khác từ shared nếu local chưa có', () => {
        const sharedDataA: SupermarketCompetitionData = {
            headers: ['TARGET', 'DTLK'],
            programs: [{ name: 'Sim', data: ['5', '5'], metric: 'DTLK' }]
        };
        const newLocalDataB: SupermarketCompetitionData = {
            headers: ['TARGET', 'DTLK'],
            programs: [{ name: 'Tivi', data: ['10', '8'], metric: 'DTLK' }]
        };

        const shared = { 'Tri Tôn': sharedDataA };
        const local = { 'ĐML_STR_STR - 99 Hùng Vương': newLocalDataB };
        const supermarkets = ['Tri Tôn', 'Hùng Vương'];
        const supermarketMap = { 'Tri Tôn': '123', 'Hùng Vương': '910' };

        const merged = mergeCompetitionData(shared, local, supermarkets, supermarketMap);

        expect(Object.keys(merged)).toContain('Tri Tôn');
        expect(Object.keys(merged)).toContain('Hùng Vương');
        expect(merged['Tri Tôn'].programs[0].name).toBe('Sim');
        expect(merged['Hùng Vương'].programs[0].name).toBe('Tivi');
    });
});
