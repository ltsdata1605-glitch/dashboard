import { CheckThuongStoreSummary, LeaderboardFilterState, CheckThuongSystemStats } from '../types';

export const CHECK_THUONG_COLS = {
    KENH: 3,
    SIEU_THI: 4,
    NGANH_HANG: 5,
    PERCENT_DU_KIEN: 6,
    DU_KIEN_VUOT: 7,
    LAY_TOP_10: 8,
    HANG_VUOT_UU: 9,
    HANG_PERCENT_TARGET: 10,
    THUONG_VUOT_UU: 11,
    THUONG_TOP_PERCENT: 12,
    TONG_THUONG: 13,
} as const;

export const parseNumber = (val: unknown): number => {
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    if (!val) return 0;
    let str = String(val).trim();
    if (str === '-' || str === '') return 0;
    str = str.replace(/[^\d.,-]/g, '');
    const hasDot = str.includes('.');
    const hasComma = str.includes(',');
    if (hasDot && hasComma) {
        const lastDot = str.lastIndexOf('.');
        const lastComma = str.lastIndexOf(',');
        if (lastComma > lastDot) {
            str = str.replace(/\./g, '').replace(',', '.');
        } else {
            str = str.replace(/,/g, '');
        }
    } else if (hasComma) {
        if (str.split(',').length > 2 || /,\d{3}$/.test(str)) {
            str = str.replace(/,/g, '');
        } else {
            str = str.replace(',', '.');
        }
    } else if (hasDot) {
        if (str.split('.').length > 2 || (/\.\d{3}$/.test(str) && !/^0\./.test(str))) {
            str = str.replace(/\./g, '');
        }
    }
    const num = parseFloat(str);
    return isNaN(num) ? 0 : num;
};

export const isAchieved100 = (val: unknown): boolean => {
    if (val === undefined || val === null || val === '') return false;
    if (typeof val === 'number') {
        return !isNaN(val) && val >= 1.0;
    }
    const str = String(val).trim();
    if (str === '-' || str === '') return false;
    if (str.includes('%')) {
        const num = parseNumber(str.replace('%', ''));
        return num >= 100;
    }
    const num = parseNumber(str);
    return num >= 1.0;
};

export const extractStoreCodeAndName = (rawStore: string): { storeCode: string; storeName: string } => {
    const raw = String(rawStore || '').trim();
    const numMatch = raw.match(/^(\d+)/);
    const storeCode = numMatch ? numMatch[1] : (raw.split(' - ')[0] || '').trim();
    const parts = raw.split(' - ');
    const storeName = parts.length > 1 ? parts.slice(1).join(' - ').trim() : raw;
    return { storeCode, storeName };
};

export const parseStoreSummaryFromData = (data: any[][]): CheckThuongStoreSummary[] => {
    if (!data || !Array.isArray(data) || data.length === 0) return [];

    const storeMap = new Map<string, {
        rawStore: string;
        channel: string;
        rows: any[][];
    }>();

    for (const row of data) {
        if (!row || row.length === 0) continue;
        const rawStore = String(row[CHECK_THUONG_COLS.SIEU_THI] || '').trim();
        const nganhHang = String(row[CHECK_THUONG_COLS.NGANH_HANG] || '').trim();
        if (!rawStore || !nganhHang) continue;

        const channel = String(row[CHECK_THUONG_COLS.KENH] || '').trim() || 'Khác';
        const key = rawStore;

        if (!storeMap.has(key)) {
            storeMap.set(key, { rawStore, channel, rows: [] });
        }
        storeMap.get(key)!.rows.push(row);
    }

    const summaries: CheckThuongStoreSummary[] = [];

    for (const [, item] of storeMap.entries()) {
        const { storeCode, storeName } = extractStoreCodeAndName(item.rawStore);
        const totalCategories = item.rows.length;
        let achievedCount = 0;
        let totalBonus = 0;

        for (const row of item.rows) {
            if (isAchieved100(row[CHECK_THUONG_COLS.PERCENT_DU_KIEN])) {
                achievedCount++;
            }
            totalBonus += parseNumber(row[CHECK_THUONG_COLS.TONG_THUONG]);
        }

        const achievedPercent = totalCategories > 0
            ? Math.round((achievedCount / totalCategories) * 1000) / 10
            : 0;

        summaries.push({
            rank: 0,
            rawStore: item.rawStore,
            storeCode,
            storeName,
            channel: item.channel,
            totalCategories,
            achievedCount,
            achievedPercent,
            totalBonus,
            rows: item.rows,
        });
    }

    // Sort descending by totalBonus default
    summaries.sort((a, b) => b.totalBonus - a.totalBonus);

    // Assign sequential ranks
    summaries.forEach((s, idx) => {
        s.rank = idx + 1;
    });

    return summaries;
};

export const filterAndSortStoreSummaries = (
    stores: CheckThuongStoreSummary[],
    filters: LeaderboardFilterState
): CheckThuongStoreSummary[] => {
    let result = stores.slice();

    // 1. Channel filter
    if (filters.channel && filters.channel !== 'ALL') {
        result = result.filter(s => s.channel.toUpperCase() === filters.channel.toUpperCase());
    }

    // 2. Search query (search by store code or store name)
    if (filters.searchQuery && filters.searchQuery.trim()) {
        const q = filters.searchQuery.trim().toLowerCase();
        result = result.filter(s =>
            s.storeCode.toLowerCase().includes(q) ||
            s.storeName.toLowerCase().includes(q) ||
            s.rawStore.toLowerCase().includes(q)
        );
    }

    // 3. Sorting
    result.sort((a, b) => {
        let cmp = 0;
        switch (filters.sortBy) {
            case 'bonus':
                cmp = a.totalBonus - b.totalBonus;
                break;
            case 'percent':
                cmp = a.achievedPercent - b.achievedPercent;
                break;
            case 'achievedCount':
                cmp = a.achievedCount - b.achievedCount;
                break;
            case 'code':
                cmp = a.storeCode.localeCompare(b.storeCode, undefined, { numeric: true });
                break;
            case 'channel':
                cmp = a.channel.localeCompare(b.channel, 'vi', { sensitivity: 'base' });
                break;
            case 'name':
                cmp = a.storeName.localeCompare(b.storeName, 'vi', { sensitivity: 'base' });
                break;
            case 'rank':
            default:
                cmp = a.rank - b.rank;
                break;
        }

        // Nếu giá trị so sánh bằng nhau, giữ thứ hạng rank ban đầu làm tie-breaker ổn định
        if (cmp === 0 && filters.sortBy !== 'rank') {
            cmp = a.rank - b.rank;
        }

        return filters.sortOrder === 'asc' ? cmp : -cmp;
    });

    return result;
};

export const getDistinctChannels = (stores: CheckThuongStoreSummary[]): string[] => {
    const channelSet = new Set<string>();
    stores.forEach(s => {
        if (s.channel && s.channel.trim()) {
            channelSet.add(s.channel.trim());
        }
    });
    return Array.from(channelSet).sort();
};

export const calculateSystemStats = (stores: CheckThuongStoreSummary[]): CheckThuongSystemStats => {
    if (!stores || stores.length === 0) {
        return { totalStores: 0, totalBonus: 0, avgAchievedPercent: 0, topStore: null };
    }

    const totalStores = stores.length;
    let sumBonus = 0;
    let sumPercent = 0;

    for (const s of stores) {
        sumBonus += s.totalBonus;
        sumPercent += s.achievedPercent;
    }

    const avgAchievedPercent = Math.round((sumPercent / totalStores) * 10) / 10;
    // stores is already sorted descending by totalBonus
    const topStore = stores[0] || null;

    return {
        totalStores,
        totalBonus: sumBonus,
        avgAchievedPercent,
        topStore,
    };
};
