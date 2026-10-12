import { CHECK_THUONG_COLS, parseNumber } from './checkThuongCalc';
import {
    CheckThuongGroupDef,
    CheckThuongPotentialBonus,
    CheckThuongAnalysisResult,
    CheckThuongWarningItem,
    CheckThuongComparisonItem,
} from '../types';

export interface CheckThuongPreprocessed {
    noFundGroups: Set<string>;
    bestAwardedByGroup: Record<string, { rank: number; row: any[] }>;
    bestAwardedByName: Record<string, { rank: number; row: any[] }>;
}

export const createStoreMatcher = (targetCode: string): ((row: any[]) => boolean) => {
    const searchCode = String(targetCode || '').trim().toLowerCase();
    if (!searchCode) return () => false;

    const isNumericCode = /^\d+$/.test(searchCode);
    const escapedCode = searchCode.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
    let regex: RegExp | null = null;
    try {
        regex = new RegExp(`(^|[^a-zA-Z0-9])${escapedCode}([^a-zA-Z0-9]|$)`, 'i');
    } catch {
        // Ignore regex compile error
    }

    return (row: any[]) => {
        if (!row || !row[CHECK_THUONG_COLS.NGANH_HANG] || String(row[CHECK_THUONG_COLS.NGANH_HANG]).trim() === '') {
            return false;
        }

        const storeStr = String(row[CHECK_THUONG_COLS.SIEU_THI] || '').trim().toLowerCase();

        // 1. Exact match
        if (storeStr === searchCode) return true;

        // 2. Extract first number sequence (vd: "910" từ "910 - Vĩnh Phúc")
        const codeMatch = storeStr.match(/^(\d+)/);
        if (codeMatch && codeMatch[1] === searchCode) return true;

        // 3. Match distinct word qua regex
        if (regex && regex.test(storeStr)) return true;

        // 4. Fallback: Nếu không thuần số, tìm substring
        if (!isNumericCode && storeStr.includes(searchCode)) return true;

        return false;
    };
};

export const filterStoreData = (competitionData: any[][], storeCode: string): any[][] => {
    if (!competitionData || !Array.isArray(competitionData) || competitionData.length === 0) return [];
    const matcher = createStoreMatcher(storeCode);
    return competitionData.filter(matcher);
};

export const preProcessCompetitionData = (data: any[][]): CheckThuongPreprocessed => {
    const fundStatusByGroup: Record<string, boolean> = {};
    const bestAwardedByGroup: Record<string, { rank: number; row: any[] }> = {};
    const bestAwardedByName: Record<string, { rank: number; row: any[] }> = {};

    if (!Array.isArray(data)) {
        return { noFundGroups: new Set(), bestAwardedByGroup: {}, bestAwardedByName: {} };
    }

    data.forEach(row => {
        if (!row || row.length === 0) return;
        const nganhHang = String(row[CHECK_THUONG_COLS.NGANH_HANG] || '').trim().toUpperCase();
        const kenh = String(row[CHECK_THUONG_COLS.KENH] || 'N/A').trim().toUpperCase();
        if (!nganhHang) return;
        const key = `${kenh}|${nganhHang}`;
        const bonus = parseNumber(row[CHECK_THUONG_COLS.TONG_THUONG]);

        if (bonus > 0) {
            fundStatusByGroup[key] = true;
            const rank = parseInt(String(row[CHECK_THUONG_COLS.HANG_PERCENT_TARGET] || '0'), 10) || 0;
            if (!bestAwardedByGroup[key] || rank > bestAwardedByGroup[key].rank) {
                bestAwardedByGroup[key] = { rank, row };
            }
            if (!bestAwardedByName[nganhHang] || rank > bestAwardedByName[nganhHang].rank) {
                bestAwardedByName[nganhHang] = { rank, row };
            }
        }
    });

    const allGroups = new Set(data.map(row => {
        if (!row || !row[CHECK_THUONG_COLS.NGANH_HANG]) return null;
        return `${String(row[CHECK_THUONG_COLS.KENH] || 'N/A').trim().toUpperCase()}|${String(row[CHECK_THUONG_COLS.NGANH_HANG] || '').trim().toUpperCase()}`;
    }).filter(Boolean) as string[]);

    const noFundGroups = new Set([...allGroups].filter(group => !fundStatusByGroup[group]));

    return {
        noFundGroups,
        bestAwardedByGroup,
        bestAwardedByName
    };
};

export const getPotentialBonus = (row: any[], preprocessed: CheckThuongPreprocessed): CheckThuongPotentialBonus => {
    try {
        const groupName = String(row[CHECK_THUONG_COLS.NGANH_HANG] || '').trim().toUpperCase();
        const groupChannel = String(row[CHECK_THUONG_COLS.KENH] || '').trim().toUpperCase();

        const bonusKey = `${groupChannel}|${groupName}`;
        let best = preprocessed.bestAwardedByGroup[bonusKey];

        if (!best && preprocessed.bestAwardedByName[groupName]) {
            best = preprocessed.bestAwardedByName[groupName];
        }

        if (!best) {
            return { vuot: 0, top: 0, total: 0 };
        }

        const targetRow = best.row || best;
        const vuot = parseNumber(targetRow[CHECK_THUONG_COLS.THUONG_VUOT_UU]);
        const top = parseNumber(targetRow[CHECK_THUONG_COLS.THUONG_TOP_PERCENT]);
        const tong = parseNumber(targetRow[CHECK_THUONG_COLS.TONG_THUONG]);

        return {
            vuot,
            top,
            total: tong > 0 ? tong : (vuot + top)
        };
    } catch {
        return { vuot: 0, top: 0, total: 0 };
    }
};

export const sortByPercentDesc = (rows: any[][]): any[][] => {
    return [...rows].sort((a, b) => {
        const valA = parseNumber(a[CHECK_THUONG_COLS.PERCENT_DU_KIEN]);
        const valB = parseNumber(b[CHECK_THUONG_COLS.PERCENT_DU_KIEN]);
        return valB - valA;
    });
};

export const getGroupDefinitions = (data: any[][], preprocessed: CheckThuongPreprocessed): CheckThuongGroupDef[] => {
    const { noFundGroups } = preprocessed;

    return [
        {
            key: 'achieved',
            title: 'Đạt thưởng',
            shortTitle: 'Đạt thưởng',
            color: 'bg-emerald-500',
            data: sortByPercentDesc(data.filter(row => parseNumber(row[CHECK_THUONG_COLS.TONG_THUONG]) > 0))
        },
        {
            key: 'nearly',
            title: 'Sắp có',
            shortTitle: 'Sắp có',
            color: 'bg-amber-500',
            data: sortByPercentDesc(data.filter(row => {
                const groupKey = `${String(row[CHECK_THUONG_COLS.KENH] || 'N/A').trim().toUpperCase()}|${String(row[CHECK_THUONG_COLS.NGANH_HANG] || '').trim().toUpperCase()}`;
                if (noFundGroups.has(groupKey)) return false;
                if (parseNumber(row[CHECK_THUONG_COLS.TONG_THUONG]) > 0) return false;

                const cutoffRank = parseInt(String(row[CHECK_THUONG_COLS.LAY_TOP_10] || ''), 10);
                if (isNaN(cutoffRank)) return false;

                const rankVuot = parseInt(String(row[CHECK_THUONG_COLS.HANG_VUOT_UU] || ''), 10);
                const rankTarget = parseInt(String(row[CHECK_THUONG_COLS.HANG_PERCENT_TARGET] || ''), 10);

                const isNearlyVuot = !isNaN(rankVuot) && rankVuot > cutoffRank && rankVuot <= cutoffRank + 20;
                const isNearlyTarget = !isNaN(rankTarget) && rankTarget > cutoffRank && rankTarget <= cutoffRank + 20;

                return isNearlyVuot || isNearlyTarget;
            }))
        },
        {
            key: 'achieved100',
            title: 'Nhóm Đạt ≥ 100%',
            shortTitle: 'Đạt ≥ 100%',
            color: 'bg-sky-500',
            data: sortByPercentDesc(data.filter(row => parseNumber(row[CHECK_THUONG_COLS.PERCENT_DU_KIEN]) >= 1))
        },
        {
            key: 'notAchieved100',
            title: 'Nhóm Chưa Đạt < 100%',
            shortTitle: '< 100%',
            color: 'bg-rose-500',
            data: sortByPercentDesc(data.filter(row => parseNumber(row[CHECK_THUONG_COLS.PERCENT_DU_KIEN]) < 1))
        },
        {
            key: 'noFund',
            title: 'Không Quỹ',
            shortTitle: 'Không Quỹ',
            color: 'bg-sky-500',
            data: sortByPercentDesc(data.filter(row => {
                const groupKey = `${String(row[CHECK_THUONG_COLS.KENH] || 'N/A').trim().toUpperCase()}|${String(row[CHECK_THUONG_COLS.NGANH_HANG] || '').trim().toUpperCase()}`;
                return noFundGroups.has(groupKey);
            }))
        },
        {
            key: 'noSale',
            title: 'No Sale',
            shortTitle: 'No Sale',
            color: 'bg-slate-600',
            data: sortByPercentDesc(data.filter(row => {
                const groupKey = `${String(row[CHECK_THUONG_COLS.KENH] || 'N/A').trim().toUpperCase()}|${String(row[CHECK_THUONG_COLS.NGANH_HANG] || '').trim().toUpperCase()}`;
                if (noFundGroups.has(groupKey)) return false;
                return parseNumber(row[CHECK_THUONG_COLS.PERCENT_DU_KIEN]) === 0;
            }))
        }
    ];
};

export const analyzeStoreData = (data: any[][], preprocessed: CheckThuongPreprocessed): CheckThuongAnalysisResult => {
    if (!data || data.length === 0) {
        return { achievedCount: 0, totalCategories: 0, warningList: [], opportunityList: [], noSaleCount: 0 };
    }

    const { noFundGroups } = preprocessed;
    const achievedCount = data.filter(row => parseNumber(row[CHECK_THUONG_COLS.TONG_THUONG]) > 0).length;
    const totalCategories = data.length;

    const warningList: CheckThuongWarningItem[] = data.filter(row => {
        const bonus = parseNumber(row[CHECK_THUONG_COLS.TONG_THUONG]);
        if (bonus === 0) return false;
        const cutoffRank = parseInt(String(row[CHECK_THUONG_COLS.LAY_TOP_10] || ''), 10);
        if (isNaN(cutoffRank)) return false;
        const rankVuot = parseInt(String(row[CHECK_THUONG_COLS.HANG_VUOT_UU] || ''), 10);
        const rankTarget = parseInt(String(row[CHECK_THUONG_COLS.HANG_PERCENT_TARGET] || ''), 10);
        const isAtRiskVuot = !isNaN(rankVuot) && rankVuot <= cutoffRank && rankVuot > cutoffRank - 3;
        const isAtRiskTarget = !isNaN(rankTarget) && rankTarget <= cutoffRank && rankTarget > cutoffRank - 3;
        return isAtRiskVuot || isAtRiskTarget;
    }).map(row => {
        const cutoffRank = parseInt(String(row[CHECK_THUONG_COLS.LAY_TOP_10] || ''), 10);
        const rankVuot = parseInt(String(row[CHECK_THUONG_COLS.HANG_VUOT_UU] || ''), 10);
        const rankTarget = parseInt(String(row[CHECK_THUONG_COLS.HANG_PERCENT_TARGET] || ''), 10);
        const validR1 = isNaN(rankVuot) || rankVuot <= 0 ? Infinity : rankVuot;
        const validR2 = isNaN(rankTarget) || rankTarget <= 0 ? Infinity : rankTarget;
        const bestRank = Math.min(validR1, validR2);

        return {
            nganhHang: String(row[CHECK_THUONG_COLS.NGANH_HANG] || ''),
            kenh: String(row[CHECK_THUONG_COLS.KENH] || ''),
            currentRank: bestRank === Infinity ? undefined : bestRank,
            cutoffRank: isNaN(cutoffRank) ? undefined : cutoffRank
        };
    });

    const opportunityList = data.filter(row => {
        const groupKey = `${String(row[CHECK_THUONG_COLS.KENH] || 'N/A').trim().toUpperCase()}|${String(row[CHECK_THUONG_COLS.NGANH_HANG] || '').trim().toUpperCase()}`;
        if (noFundGroups.has(groupKey)) return false;
        if (parseNumber(row[CHECK_THUONG_COLS.TONG_THUONG]) > 0) return false;
        const cutoffRank = parseInt(String(row[CHECK_THUONG_COLS.LAY_TOP_10] || ''), 10);
        if (isNaN(cutoffRank)) return false;
        const rankVuot = parseInt(String(row[CHECK_THUONG_COLS.HANG_VUOT_UU] || ''), 10);
        const rankTarget = parseInt(String(row[CHECK_THUONG_COLS.HANG_PERCENT_TARGET] || ''), 10);
        const isNearlyVuot = !isNaN(rankVuot) && rankVuot > cutoffRank && rankVuot <= cutoffRank + 20;
        const isNearlyTarget = !isNaN(rankTarget) && rankTarget > cutoffRank && rankTarget <= cutoffRank + 20;
        return isNearlyVuot || isNearlyTarget;
    }).map(row => {
        const cutoffRank = parseInt(String(row[CHECK_THUONG_COLS.LAY_TOP_10] || ''), 10);
        const rankVuot = parseInt(String(row[CHECK_THUONG_COLS.HANG_VUOT_UU] || ''), 10);
        const rankTarget = parseInt(String(row[CHECK_THUONG_COLS.HANG_PERCENT_TARGET] || ''), 10);
        let ranksNeeded = Infinity;
        if (!isNaN(rankVuot) && rankVuot > cutoffRank) ranksNeeded = Math.min(ranksNeeded, rankVuot - cutoffRank);
        if (!isNaN(rankTarget) && rankTarget > cutoffRank) ranksNeeded = Math.min(ranksNeeded, rankTarget - cutoffRank);
        return {
            name: String(row[CHECK_THUONG_COLS.NGANH_HANG] || ''),
            ranksNeeded,
            kenh: String(row[CHECK_THUONG_COLS.KENH] || '')
        };
    }).sort((a, b) => a.ranksNeeded - b.ranksNeeded);

    const noSaleCount = data.filter(row => {
        const groupKey = `${String(row[CHECK_THUONG_COLS.KENH] || 'N/A').trim().toUpperCase()}|${String(row[CHECK_THUONG_COLS.NGANH_HANG] || '').trim().toUpperCase()}`;
        if (noFundGroups.has(groupKey)) return false;
        return parseNumber(row[CHECK_THUONG_COLS.PERCENT_DU_KIEN]) === 0;
    }).length;

    return {
        achievedCount,
        totalCategories,
        warningList,
        opportunityList,
        noSaleCount
    };
};

export const compareTwoStores = (store1Data: any[][], store2Data: any[][]): CheckThuongComparisonItem[] => {
    const allCategories = [...new Set([
        ...store1Data.map(r => String(r[CHECK_THUONG_COLS.NGANH_HANG] || '')),
        ...store2Data.map(r => String(r[CHECK_THUONG_COLS.NGANH_HANG] || ''))
    ])].filter(Boolean);

    return allCategories.map(category => {
        const row1 = store1Data.find(r => String(r[CHECK_THUONG_COLS.NGANH_HANG] || '') === category);
        const row2 = store2Data.find(r => String(r[CHECK_THUONG_COLS.NGANH_HANG] || '') === category);
        const bonus1 = parseNumber(row1?.[CHECK_THUONG_COLS.TONG_THUONG]);
        const bonus2 = parseNumber(row2?.[CHECK_THUONG_COLS.TONG_THUONG]);
        return {
            category,
            row1,
            row2,
            percent1: parseNumber(row1?.[CHECK_THUONG_COLS.PERCENT_DU_KIEN]),
            percent2: parseNumber(row2?.[CHECK_THUONG_COLS.PERCENT_DU_KIEN]),
            rankV1: parseInt(String(row1?.[CHECK_THUONG_COLS.HANG_VUOT_UU] || ''), 10) || Infinity,
            rankV2: parseInt(String(row2?.[CHECK_THUONG_COLS.HANG_VUOT_UU] || ''), 10) || Infinity,
            bonus1,
            bonus2,
            bonusDiff: bonus1 - bonus2
        };
    });
};
