import React from 'react';
import { InventoryStats as StatsType } from '../types/inventory';
import { StatCard } from '@/components/shared/ui/StatCard';
import { Package, Boxes, CheckCircle, AlertCircle } from 'lucide-react';

interface InventoryStatsProps {
  stats: StatsType;
}

export const InventoryStats: React.FC<InventoryStatsProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatCard
        icon={<Package className="h-5 w-5" />}
        label="Tổng SKU"
        value={stats.totalSKU}
        accent="sky"
      />

      <StatCard
        icon={<Boxes className="h-5 w-5" />}
        label="Tổng Số Lượng"
        value={stats.totalQuantity.toLocaleString()}
        subtitle="cái"
        accent="slate"
      />

      <StatCard
        icon={<CheckCircle className="h-5 w-5" />}
        label="Đã Kiểm Kê"
        value={`${stats.alreadyChecked} (${stats.checkedPercent}%)`}
        accent="emerald"
      />

      <StatCard
        icon={<AlertCircle className="h-5 w-5" />}
        label="Chênh Lệch"
        value={`${stats.totalDiff > 0 ? '+' : ''}${stats.totalDiff}`}
        subtitle={`${stats.diffPercent}% tổng SL`}
        accent={stats.totalDiff === 0 ? 'emerald' : stats.totalDiff > 0 ? 'amber' : 'rose'}
      />
    </div>
  );
};
