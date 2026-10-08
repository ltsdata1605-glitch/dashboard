import { describe, it, expect } from 'vitest';

describe('Competition Filter Default Selection Logic', () => {
    const mockAllTitles = [
        'T10/MỞ THẺ TÍN DỤNG TPBANK EVO VÀ VPBANK MWG',
        'T10/GIA DỤNG SUNHOUSE',
        'T10/BẢO HIỂM TỔNG',
        'T10/BẢO HIỂM THỢ ĐMX_ICT',
        'T10/HÚT BỤI'
    ];

    function resolveSelectedCompetitions(
        selectedCompArray: string[] | null | undefined,
        allCompetitionTitles: string[]
    ): Set<string> {
        if (!selectedCompArray || selectedCompArray.length === 0 || selectedCompArray.includes('all')) {
            return new Set(allCompetitionTitles);
        }
        if (selectedCompArray.length === 1 && (selectedCompArray[0] === 'none' || selectedCompArray[0] === '__none__')) {
            return new Set<string>();
        }
        return new Set(selectedCompArray);
    }

    function computeNextSelectedCompArray(
        prevArray: string[] | null | undefined,
        allCompetitionTitles: string[],
        updater: (current: Set<string>) => Set<string>
    ): string[] {
        const currentSet = (!prevArray || prevArray.length === 0 || prevArray.includes('all'))
            ? new Set(allCompetitionTitles)
            : (prevArray.length === 1 && (prevArray[0] === 'none' || prevArray[0] === '__none__'))
                ? new Set<string>()
                : new Set(prevArray);
        const newSet = updater(currentSet);
        if (newSet.size === 0) {
            return ['none'];
        }
        if (allCompetitionTitles.length > 0 && newSet.size === allCompetitionTitles.length && allCompetitionTitles.every(t => newSet.has(t))) {
            return ['all'];
        }
        return Array.from(newSet);
    }

    it('mặc định khi chưa có dữ liệu lưu (undefined / null / rỗng / ["all"]) sẽ chọn tất cả các nhóm', () => {
        expect(resolveSelectedCompetitions(undefined, mockAllTitles).size).toBe(5);
        expect(resolveSelectedCompetitions(null, mockAllTitles).size).toBe(5);
        expect(resolveSelectedCompetitions([], mockAllTitles).size).toBe(5);
        expect(resolveSelectedCompetitions(['all'], mockAllTitles).size).toBe(5);
        
        for (const title of mockAllTitles) {
            expect(resolveSelectedCompetitions(['all'], mockAllTitles).has(title)).toBe(true);
        }
    });

    it('khi người dùng chủ động bỏ chọn tất cả, trả về Set rỗng và lưu flag none', () => {
        const next = computeNextSelectedCompArray(['all'], mockAllTitles, () => new Set<string>());
        expect(next).toEqual(['none']);

        const resolved = resolveSelectedCompetitions(next, mockAllTitles);
        expect(resolved.size).toBe(0);
    });

    it('khi người dùng bấm chọn tất cả sau khi bỏ chọn, trả về ["all"] và chọn lại đủ các nhóm', () => {
        const next = computeNextSelectedCompArray(['none'], mockAllTitles, () => new Set(mockAllTitles));
        expect(next).toEqual(['all']);

        const resolved = resolveSelectedCompetitions(next, mockAllTitles);
        expect(resolved.size).toBe(5);
    });

    it('khi người dùng bỏ chọn 1 nhóm từ trạng thái mặc định, các nhóm còn lại vẫn được chọn', () => {
        const next = computeNextSelectedCompArray(['all'], mockAllTitles, (current) => {
            const copy = new Set(current);
            copy.delete(mockAllTitles[0]);
            return copy;
        });

        expect(next.length).toBe(4);
        expect(next.includes(mockAllTitles[0])).toBe(false);

        const resolved = resolveSelectedCompetitions(next, mockAllTitles);
        expect(resolved.size).toBe(4);
        expect(resolved.has(mockAllTitles[0])).toBe(false);
        expect(resolved.has(mockAllTitles[1])).toBe(true);
    });
});
