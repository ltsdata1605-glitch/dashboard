import React, { useMemo } from 'react';
import { KpiCard } from '../shared/ui/KpiCard';
import { StatCardsGrid, type StatCardItem } from '../shared/ui/StatCardsGrid';
import { QuickActionTiles, type QuickActionItem } from '../shared/ui/QuickActionTiles';
import { useDashboardContext } from '../../contexts/DashboardContext';
import { formatCurrency, formatQuantity } from '../../utils/dataUtils';

interface ModernDashboardSectionProps {
  onUnshippedClick?: () => void;
  onCreateOrder?: () => void;
  onImportStock?: () => void;
  onAddCustomer?: () => void;
  onScanBarcode?: () => void;
}

/**
 * ModernDashboardSection — Phase 3 Integration
 * Displays: Gradient revenue header + 4 stat cards + 4 quick actions
 * Replaces traditional KPI layout with modern gradient-based design
 */
export const ModernDashboardSection: React.FC<ModernDashboardSectionProps> = ({
  onUnshippedClick,
  onCreateOrder,
  onImportStock,
  onAddCustomer,
  onScanBarcode,
}) => {
  const { processedData, filterState } = useDashboardContext();
  const kpis = processedData?.kpis;

  // Compute trending percentage (simple: current vs previous)
  const trendPercent = useMemo(() => {
    if (!kpis?.doanhThuThuc || !kpis?.doanhThuThucTarget) return 0;
    const trend = ((kpis.doanhThuThuc - (kpis.doanhThuThucTarget || 0)) / (kpis.doanhThuThucTarget || 1)) * 100;
    return Math.round(trend * 10) / 10;
  }, [kpis]);

  // Stat cards data from KPIs
  const statCards: StatCardItem[] = useMemo(() => [
    {
      icon: 'shopping-bag',
      label: 'Đơn hàng',
      value: formatQuantity(kpis?.doanhSo ?? 0),
      subtitle: 'Hôm nay',
      color: 'sky',
    },
    {
      icon: 'package',
      label: 'Sản phẩm',
      value: formatQuantity(kpis?.soSanPham ?? 0),
      subtitle: 'Tổng số',
      color: 'emerald',
    },
    {
      icon: 'alert-triangle',
      label: 'Sắp hết hàng',
      value: formatQuantity(kpis?.sapHetHang ?? 0),
      subtitle: 'Sản phẩm',
      color: 'amber',
    },
    {
      icon: 'users',
      label: 'Khách hàng',
      value: formatQuantity(kpis?.khachHangTong ?? 0),
      subtitle: 'Tổng số',
      color: 'violet',
    },
  ], [kpis]);

  // Quick actions
  const quickActions: QuickActionItem[] = useMemo(() => [
    {
      id: 'create-order',
      label: 'Tạo đơn hàng',
      icon: 'plus-circle',
      onClick: onCreateOrder || (() => {}),
      color: 'sky',
    },
    {
      id: 'import-stock',
      label: 'Nhập hàng',
      icon: 'download-cloud',
      onClick: onImportStock || (() => {}),
      color: 'emerald',
    },
    {
      id: 'add-customer',
      label: 'Thêm khách hàng',
      icon: 'user-plus',
      onClick: onAddCustomer || (() => {}),
      color: 'violet',
    },
    {
      id: 'scan-barcode',
      label: 'Quét mã vạch',
      icon: 'barcode',
      onClick: onScanBarcode || (() => {}),
      color: 'amber',
    },
  ], [onCreateOrder, onImportStock, onAddCustomer, onScanBarcode]);

  if (!kpis) return null;

  return (
    <div className="space-y-6 lg:space-y-8 px-3 lg:px-0">
      {/* Section 1: Gradient Revenue Header */}
      <div className="flex flex-col gap-2 lg:gap-3">
        {/* Section label — semantic: text-label + uppercase */}
        <h2 className="text-[11px] lg:text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-1 lg:px-0">
          Tổng quan hôm nay
        </h2>
        <KpiCard
          icon="trending-up"
          iconColor="sky"
          title="Doanh thu thực tế"
          gradientBg="sky"
          trendDirection={trendPercent >= 0 ? 'up' : 'down'}
          trendLabel="So với mục tiêu"
          trendValue={`${Math.abs(trendPercent)}%`}
        >
          <div className="text-2xl lg:text-4xl font-bold text-white">
            {formatCurrency(kpis.doanhThuThuc ?? 0)}
          </div>
        </KpiCard>
      </div>

      {/* Section 2: Stat Cards Grid */}
      <div className="flex flex-col gap-2 lg:gap-3">
        <h2 className="text-[11px] lg:text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-1 lg:px-0">
          Chỉ số chính
        </h2>
        <StatCardsGrid cards={statCards} />
      </div>

      {/* Section 3: Quick Action Tiles */}
      <div className="flex flex-col gap-2 lg:gap-3">
        <h2 className="text-[11px] lg:text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-1 lg:px-0">
          Chức năng nhanh
        </h2>
        <QuickActionTiles actions={quickActions} />
      </div>
    </div>
  );
};

export default ModernDashboardSection;
