import React from 'react';
import { KpiCard } from '../../../components/shared/ui/KpiCard';
import { StatCardsGrid, type StatCardItem } from '../../../components/shared/ui/StatCardsGrid';

/**
 * ModernPhanCaHeader — Phase 6 Integration for Phan Ca (Shift Scheduling)
 * Displays: Gradient scheduling header + shift stat cards
 */
export const ModernPhanCaHeader: React.FC = () => {
  // Demo stats for shift scheduling
  const statCards: StatCardItem[] = [
    {
      icon: 'calendar',
      label: 'Ca làm việc',
      value: '18',
      subtitle: 'Hôm nay',
      color: 'sky',
    },
    {
      icon: 'users',
      label: 'Nhân viên ca',
      value: '42',
      subtitle: 'Được phân công',
      color: 'emerald',
    },
    {
      icon: 'alert-triangle',
      label: 'Thiếu nhân sự',
      value: '2',
      subtitle: 'Ca trống',
      color: 'amber',
    },
    {
      icon: 'check-circle',
      label: 'Xác nhận',
      value: '38',
      subtitle: 'Có mặt',
      color: 'violet',
    },
  ];

  return (
    <div className="space-y-6 lg:space-y-8 px-3 lg:px-0">
      {/* Header: Shift Overview */}
      <div className="flex flex-col gap-2 lg:gap-3">
        <h2 className="text-[11px] lg:text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-1 lg:px-0">
          Tổng quan ca làm
        </h2>
        <KpiCard
          icon="calendar"
          iconColor="sky"
          title="Tổng giờ làm"
          gradientBg="sky"
          trendDirection="up"
          trendLabel="So với tháng trước"
          trendValue="5.2%"
        >
          <div className="text-2xl lg:text-4xl font-bold text-white">
            336 giờ
          </div>
        </KpiCard>
      </div>

      {/* Stat Cards: Shift Metrics */}
      <div className="flex flex-col gap-2 lg:gap-3">
        <h2 className="text-[11px] lg:text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-1 lg:px-0">
          Chỉ số ca làm
        </h2>
        <StatCardsGrid cards={statCards} />
      </div>
    </div>
  );
};

export default ModernPhanCaHeader;
