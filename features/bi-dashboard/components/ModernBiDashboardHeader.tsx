import React from 'react';
import { KpiCard } from '../../../components/shared/ui/KpiCard';
import { StatCardsGrid, type StatCardItem } from '../../../components/shared/ui/StatCardsGrid';

/**
 * ModernBiDashboardHeader — Phase 6 Integration for BI Dashboard (Employees)
 * Displays: Gradient performance header + employee stat cards
 */
export const ModernBiDashboardHeader: React.FC = () => {
  // Demo stats for employee dashboard
  const statCards: StatCardItem[] = [
    {
      icon: 'users',
      label: 'Tổng nhân viên',
      value: '24',
      subtitle: 'Đang hoạt động',
      color: 'sky',
    },
    {
      icon: 'trending-up',
      label: 'Hiệu suất',
      value: '94.5%',
      subtitle: 'Trung bình',
      color: 'emerald',
    },
    {
      icon: 'award',
      label: 'Top performer',
      value: '3',
      subtitle: 'Tháng này',
      color: 'amber',
    },
    {
      icon: 'target',
      label: 'Mục tiêu',
      value: '98%',
      subtitle: 'Đạt được',
      color: 'violet',
    },
  ];

  return (
    <div className="space-y-6 lg:space-y-8 px-3 lg:px-0">
      {/* Header: Performance Overview */}
      <div className="flex flex-col gap-2 lg:gap-3">
        <h2 className="text-[11px] lg:text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-1 lg:px-0">
          Tổng quan hiệu suất
        </h2>
        <KpiCard
          icon="bar-chart-3"
          iconColor="emerald"
          title="Hiệu suất nhân viên"
          gradientBg="emerald"
          trendDirection="up"
          trendLabel="Tuần này"
          trendValue="8.3%"
        >
          <div className="text-2xl lg:text-4xl font-bold text-white">
            94.5%
          </div>
        </KpiCard>
      </div>

      {/* Stat Cards: Employee Metrics */}
      <div className="flex flex-col gap-2 lg:gap-3">
        <h2 className="text-[11px] lg:text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-1 lg:px-0">
          Chỉ số nhân viên
        </h2>
        <StatCardsGrid cards={statCards} />
      </div>
    </div>
  );
};

export default ModernBiDashboardHeader;
