import React from 'react';
import { KpiCard } from '../../../components/shared/ui/KpiCard';
import { StatCardsGrid, type StatCardItem } from '../../../components/shared/ui/StatCardsGrid';
import { QuickActionTiles, type QuickActionItem } from '../../../components/shared/ui/QuickActionTiles';

/**
 * ModernStickerHeader — Phase 6 Integration for Sticker Event (Printing)
 * Displays: Gradient printing header + print stat cards + quick actions
 */
export const ModernStickerHeader: React.FC<{
  onPrintNow?: () => void;
  onAddTemplate?: () => void;
  onViewHistory?: () => void;
  onSettings?: () => void;
}> = ({ onPrintNow, onAddTemplate, onViewHistory, onSettings }) => {
  // Demo stats for printing
  const statCards: StatCardItem[] = [
    {
      icon: 'printer',
      label: 'In hôm nay',
      value: '156',
      subtitle: 'Nhãn',
      color: 'sky',
    },
    {
      icon: 'package',
      label: 'Đơn hàng',
      value: '24',
      subtitle: 'Đã in',
      color: 'emerald',
    },
    {
      icon: 'zap',
      label: 'Tốc độ',
      value: '45',
      subtitle: 'Nhãn/phút',
      color: 'amber',
    },
    {
      icon: 'check-circle',
      label: 'Chất lượng',
      value: '99.2%',
      subtitle: 'Tỷ lệ OK',
      color: 'violet',
    },
  ];

  // Quick actions
  const quickActions: QuickActionItem[] = [
    {
      id: 'print-now',
      label: 'In ngay',
      icon: 'printer',
      onClick: onPrintNow || (() => {}),
      color: 'sky',
    },
    {
      id: 'add-template',
      label: 'Thêm mẫu',
      icon: 'plus-circle',
      onClick: onAddTemplate || (() => {}),
      color: 'emerald',
    },
    {
      id: 'view-history',
      label: 'Lịch sử',
      icon: 'history',
      onClick: onViewHistory || (() => {}),
      color: 'amber',
    },
    {
      id: 'settings',
      label: 'Cài đặt',
      icon: 'settings',
      onClick: onSettings || (() => {}),
      color: 'violet',
    },
  ];

  return (
    <div className="space-y-6 lg:space-y-8 px-3 lg:px-0">
      {/* Header: Printing Overview */}
      <div className="flex flex-col gap-2 lg:gap-3">
        <h2 className="text-[11px] lg:text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-1 lg:px-0">
          Tổng quan in ấn
        </h2>
        <KpiCard
          icon="printer"
          iconColor="sky"
          title="Nhãn in hôm nay"
          gradientBg="sky"
          trendDirection="up"
          trendLabel="Tốc độ trung bình"
          trendValue="45/phút"
        >
          <div className="text-2xl lg:text-4xl font-bold text-white">
            156 nhãn
          </div>
        </KpiCard>
      </div>

      {/* Stat Cards: Print Metrics */}
      <div className="flex flex-col gap-2 lg:gap-3">
        <h2 className="text-[11px] lg:text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-1 lg:px-0">
          Chỉ số in ấn
        </h2>
        <StatCardsGrid cards={statCards} />
      </div>

      {/* Quick Actions */}
      <div className="flex flex-col gap-2 lg:gap-3">
        <h2 className="text-[11px] lg:text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-1 lg:px-0">
          Chức năng nhanh
        </h2>
        <QuickActionTiles actions={quickActions} />
      </div>
    </div>
  );
};

export default ModernStickerHeader;
