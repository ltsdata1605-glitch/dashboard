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

export type CheckThuongGroupKey = 'achieved' | 'nearly' | 'achieved100' | 'notAchieved100' | 'noFund' | 'noSale';

export interface CheckThuongGroupDef {
    key: CheckThuongGroupKey;
    title: string;
    shortTitle: string;
    color: string;
    data: any[][];
}

export interface CheckThuongPotentialBonus {
    vuot: number;
    top: number;
    total: number;
}

export interface CheckThuongWarningItem {
    nganhHang: string;
    kenh: string;
}

export interface CheckThuongOpportunityItem {
    name: string;
    ranksNeeded: number;
    kenh: string;
}

export interface CheckThuongAnalysisResult {
    achievedCount: number;
    totalCategories: number;
    warningList: CheckThuongWarningItem[];
    opportunityList: CheckThuongOpportunityItem[];
    noSaleCount: number;
}

export interface CheckThuongComparisonItem {
    category: string;
    row1?: any[];
    row2?: any[];
    percent1: number;
    percent2: number;
    rankV1: number;
    rankV2: number;
    bonus1: number;
    bonus2: number;
    bonusDiff: number;
}

export type CheckThuongViewMode = 'list' | 'card';

