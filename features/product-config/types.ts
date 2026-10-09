import type { ProductConfig } from '../../types';

export interface ProductConfigSummary {
    parentGroupCount: number;
    subgroupCount: number;
    categoryCodeCount: number;
    multiplierCount: number;
    vasMultiplierCount: number;
    revenueHtxCount: number;
    nonRevenueHtxCount: number;
    productCodeCount?: number;
}

export interface GlobalProductConfigDoc {
    config: ProductConfig;
    updatedAt: string;
    updatedBy?: string;
    version?: number;
    summary?: ProductConfigSummary;
}

export interface CategoryTableItem {
    code: string;
    industry?: string;
    parentGroup: string;
    subgroup: string;
    multiplier: number;
    vasMultiplier?: number;
}

export interface ProductCodeTableItem {
    maSanPham: string;
    tenSanPham: string;
    heSo: number;
    loai?: string;
    nhom?: string;
    sheetSource?: string;
}

