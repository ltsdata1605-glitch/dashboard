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
    htxCount?: number;
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
    heSoSoLuong?: number;
    heSoDoanhThu?: number;
    loaiHeSo?: 'so_luong' | 'doanh_thu' | 'ca_hai';
    loai?: string;
    nhom?: string;
    sheetSource?: string;
}

export type HtxClassificationType = 'tien_mat' | 'tra_gop' | 'thu_ho' | 'khac';

export interface HtxTableItem {
    id: string;
    name: string;
    isRevenueEligible: boolean;
    classification: HtxClassificationType;
    description?: string;
}
