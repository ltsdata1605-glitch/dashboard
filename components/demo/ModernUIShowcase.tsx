import React from 'react';
import { KpiCard } from '../shared/ui/KpiCard';
import { StatCardsGrid, type StatCardItem } from '../shared/ui/StatCardsGrid';
import { QuickActionTiles, type QuickActionItem } from '../shared/ui/QuickActionTiles';

/**
 * ModernUIShowcase — Demo component để showcase Phase 1-2 updates
 * Displays: Gradient KpiCard, StatCardsGrid, QuickActionTiles
 */
export const ModernUIShowcase: React.FC = () => {
  // Demo stat cards data
  const statCards: StatCardItem[] = [
    {
      icon: 'shopping-bag',
      label: 'Đơn hàng',
      value: 56,
      subtitle: 'Hôm nay',
      color: 'sky',
    },
    {
      icon: 'package',
      label: 'Sản phẩm',
      value: '1,248',
      subtitle: 'Tổng số',
      color: 'emerald',
    },
    {
      icon: 'alert-triangle',
      label: 'Sắp hết hàng',
      value: 18,
      subtitle: 'Sản phẩm',
      color: 'amber',
    },
    {
      icon: 'users',
      label: 'Khách hàng',
      value: 532,
      subtitle: 'Tổng số',
      color: 'violet',
    },
  ];

  // Demo quick actions
  const quickActions: QuickActionItem[] = [
    {
      id: 'create-order',
      label: 'Tạo đơn hàng',
      icon: 'plus-circle',
      onClick: () => console.log('Create order'),
      color: 'sky',
    },
    {
      id: 'import-stock',
      label: 'Nhập hàng',
      icon: 'download-cloud',
      onClick: () => console.log('Import stock'),
      color: 'emerald',
    },
    {
      id: 'add-customer',
      label: 'Thêm khách hàng',
      icon: 'user-plus',
      onClick: () => console.log('Add customer'),
      color: 'violet',
    },
    {
      id: 'scan-barcode',
      label: 'Quét mã vạch',
      icon: 'barcode',
      onClick: () => console.log('Scan barcode'),
      color: 'amber',
    },
  ];

  return (
    <div className="space-y-6 lg:space-y-8">
      {/* Section: Gradient Header KPI Card */}
      <div>
        <h2 className="text-lg lg:text-xl font-bold text-slate-900 dark:text-white mb-3 lg:mb-4">
          Doanh thu hôm nay
        </h2>
        <KpiCard
          icon="trending-up"
          iconColor="sky"
          title="Doanh thu hôm nay"
          gradientBg="sky"
          trendDirection="up"
          trendLabel="So với hôm qua"
          trendValue="12.5%"
        >
          <div className="text-2xl lg:text-4xl font-bold text-white">
            23,450,000 ₫
          </div>
        </KpiCard>
      </div>

      {/* Section: Stat Cards Grid */}
      <div>
        <h2 className="text-lg lg:text-xl font-bold text-slate-900 dark:text-white mb-3 lg:mb-4">
          Chỉ số chính
        </h2>
        <StatCardsGrid cards={statCards} />
      </div>

      {/* Section: Quick Action Tiles */}
      <div>
        <h2 className="text-lg lg:text-xl font-bold text-slate-900 dark:text-white mb-3 lg:mb-4">
          Chức năng nhanh
        </h2>
        <QuickActionTiles actions={quickActions} />
      </div>

      {/* Additional Gradient Examples */}
      <div>
        <h2 className="text-lg lg:text-xl font-bold text-slate-900 dark:text-white mb-3 lg:mb-4">
          Các gradient khác
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <KpiCard
            icon="trending-up"
            iconColor="emerald"
            title="Đơn hàng hoàn thành"
            gradientBg="emerald"
            trendDirection="up"
            trendLabel="Tuần này"
            trendValue="18.2%"
          >
            <div className="text-2xl lg:text-3xl font-bold text-white">
              245 đơn
            </div>
          </KpiCard>

          <KpiCard
            icon="alert-triangle"
            iconColor="amber"
            title="Đơn hàng chưa xuất"
            gradientBg="amber"
            trendDirection="down"
            trendLabel="So với hôm qua"
            trendValue="5.3%"
          >
            <div className="text-2xl lg:text-3xl font-bold text-white">
              12 đơn
            </div>
          </KpiCard>

          <KpiCard
            icon="alert-circle"
            iconColor="rose"
            title="Hàng quá hạn chưa trả"
            gradientBg="rose"
            trendDirection="down"
            trendLabel="Nguy cấp"
            trendValue="−2.1%"
          >
            <div className="text-2xl lg:text-3xl font-bold text-white">
              8 đơn
            </div>
          </KpiCard>

          <KpiCard
            icon="zap"
            iconColor="violet"
            title="Chuyên biệt"
            gradientBg="violet"
            trendDirection="up"
            trendLabel="Tối ưu"
            trendValue="5%"
          >
            <div className="text-2xl lg:text-3xl font-bold text-white">
              +50% hiệu suất
            </div>
          </KpiCard>
        </div>
      </div>
    </div>
  );
};

export default ModernUIShowcase;
