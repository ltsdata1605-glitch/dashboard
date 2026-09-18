export interface CheckThuongStoreSummary {
    rank: number;
    rawStore: string;
    storeCode: string;
    storeName: string;
    channel: string;
    totalCategories: number;
    achievedCount: number;
    achievedPercent: number; // e.g. 64.9
    totalBonus: number;
    rows: any[][];
}

export type LeaderboardSortField = 'rank' | 'channel' | 'code' | 'name' | 'achievedCount' | 'percent' | 'bonus';
export type SortDirection = 'asc' | 'desc';

export interface LeaderboardFilterState {
    channel: string; // 'ALL' or specific channel like 'DMX', 'TGDD'
    searchQuery: string;
    sortBy: LeaderboardSortField;
    sortOrder: SortDirection;
}

export interface CheckThuongSystemStats {
    totalStores: number;
    totalBonus: number;
    avgAchievedPercent: number;
    topStore: CheckThuongStoreSummary | null;
}
