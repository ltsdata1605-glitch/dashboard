import type { DataRow, IndustryData, ProductConfig, FilterState } from '../types';
import { COL } from '../constants';
import { getRowValue, getDisplayParentGroup } from '../utils/dataUtils';

export function processIndustryData(
    salesData: DataRow[],
    productConfig: ProductConfig,
    filters: FilterState
): IndustryData[] {
    const industryRevenue: { [key: string]: { revenue: number, quantity: number } } = {};

    salesData.forEach(row => {
        const metrics = row._metrics || { revenue: 0, revenueQD: 0, quantity: 0, weightedQuantity: 0, isTraCham: false };
        const { revenue, weightedQuantity } = metrics;
        const maNhomHang = getRowValue(row, COL.MA_NHOM_HANG);

        const childGroup = productConfig.childToSubgroupMap[maNhomHang];
        const displayParentGroup = row._parentGroup || getDisplayParentGroup(maNhomHang, productConfig);

        const isSubgroupSelected = filters.industryGrid.selectedSubgroups.length === 0 || (childGroup && filters.industryGrid.selectedSubgroups.includes(childGroup));
        if (isSubgroupSelected) {
            if (!industryRevenue[displayParentGroup]) industryRevenue[displayParentGroup] = { revenue: 0, quantity: 0 };
            industryRevenue[displayParentGroup].revenue += revenue;
            industryRevenue[displayParentGroup].quantity += weightedQuantity;
        }
    });

    return Object.entries(industryRevenue).map(([name, data]) => ({ name, ...data })).sort((a, b) => b.revenue - a.revenue);
}