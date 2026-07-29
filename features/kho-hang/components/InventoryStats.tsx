import React from 'react';
import { InventoryStats as StatsType } from '../types/inventory';
import { Package, Boxes, CheckCircle, AlertCircle } from 'lucide-react';

interface InventoryStatsProps {
  stats: StatsType;
}

export const InventoryStats: React.FC<InventoryStatsProps> = ({ stats }) => {
  const StatCard: React.FC<{
    icon: React.ReactNode;
    label: string;
    value: string | number;
    subtext?: string;
    color: 'sky' | 'slate' | 'emerald' | 'amber' | 'rose';
  }> = ({ icon, label, value, subtext, color }) => {
    const colorMap = {
      sky: 'bg-sky-50 border-sky-200 text-sky-700',
      slate: 'bg-slate-50 border-slate-200 text-slate-700',
      emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700',
      amber: 'bg-amber-50 border-amber-200 text-amber-700',
      rose: 'bg-rose-50 border-rose-200 text-rose-700',
    };

    const iconColorMap = {
      sky: 'text-sky-600',
      slate: 'text-slate-600',
      emerald: 'text-emerald-600',
      amber: 'text-amber-600',
      rose: 'text-rose-600',
    };

    return (
      <div className={`rounded-lg border px-4 py-3 ${colorMap[color]}`}>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium opacity-80">{label}</p>
            <p className="mt-1 text-2xl font-bold">{value}</p>
            {subtext && <p className="mt-0.5 text-xs opacity-75">{subtext}</p>}
          </div>
          <div className={`${iconColorMap[color]} opacity-50`}>{icon}</div>
        </div>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatCard
        icon={<Package className="h-6 w-6" />}
        label="Tổng SKU"
        value={stats.totalSKU}
        color="sky"
      />

      <StatCard
        icon={<Boxes className="h-6 w-6" />}
        label="Tổng Số Lượng"
        value={stats.totalQuantity.toLocaleString()}
        subtext="cái"
        color="slate"
      />

      <StatCard
        icon={<CheckCircle className="h-6 w-6" />}
        label="Đã Kiểm Kê"
        value={`${stats.alreadyChecked} (${stats.checkedPercent}%)`}
        color="emerald"
      />

      <StatCard
        icon={<AlertCircle className="h-6 w-6" />}
        label="Chênh Lệch"
        value={`${stats.totalDiff > 0 ? '+' : ''}${stats.totalDiff}`}
        subtext={`${stats.diffPercent}% tổng SL`}
        color={stats.totalDiff === 0 ? 'emerald' : stats.totalDiff > 0 ? 'amber' : 'rose'}
      />
    </div>
  );
};
