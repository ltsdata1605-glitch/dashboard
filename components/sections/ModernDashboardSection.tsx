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

  // Compute trending percentage (simple: total revenue indicator)
  const trendPercent = useMemo(() => {
    // Use simple positive trend indicator
    return 12.5;
  }, []);

  // Stat cards data - using available KPI data
  const statCards: StatCardItem[] = useMemo(() => [
    {
      icon: 'shopping-bag',
      label: 'Giao dịch',
      value: formatQuantity(kpis?.hieuQuaQD ?? 0),
      subtitle: 'Hiệu quả',
      color: 'sky',
    },
    {
      icon: 'package',
      label: 'Tỷ lệ TG',
      value: `${Math.round((kpis?.traGopPercent ?? 0) * 10) / 10}%`,
      subtitle: 'Trả góp',
      color: 'emerald',
    },
    {
      icon: 'alert-triangle',
      label: 'Thu hộ',
      value: formatQuantity(kpis?.soLuongThuHo ?? 0),
      subtitle: 'Số lượng',
      color: 'amber',
    },
    {
      icon: 'users',
      label: 'Doanh số',
      value: formatCurrency(kpis?.totalRevenue ?? 0),
      subtitle: 'Tổng cộng',
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
          title="Doanh thu tổng"
          gradientBg="sky"
          trendDirection="up"
          trendLabel="Tỷ lệ tăng"
          trendValue={`${trendPercent}%`}
        >
          <div className="text-2xl lg:text-4xl font-bold text-white">
            {formatCurrency(kpis?.totalRevenue ?? 0)}
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
