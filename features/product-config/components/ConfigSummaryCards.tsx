import React from 'react';
import { AppIcon } from '../../../components/shared/ui/icon/AppIcon';
import type { IconName } from '../../../components/shared/ui/icon/iconRegistry';
import type { ProductConfigSummary } from '../types';

interface ConfigSummaryCardsProps {
    summary: ProductConfigSummary | null;
    updatedAt?: string;
    updatedBy?: string;
}

export const ConfigSummaryCards: React.FC<ConfigSummaryCardsProps> = ({ summary, updatedAt, updatedBy }) => {
    if (!summary) return null;

    const cards: Array<{
        title: string;
        value: number;
        sub: string;
        icon: IconName;
        color: string;
    }> = [
        {
            title: 'Nhóm Cha',
            value: summary.parentGroupCount,
            sub: 'Nhóm phân loại chính',
            icon: 'layers',
            color: 'text-sky-600 bg-sky-50 border-sky-200',
        },
        {
            title: 'Nhóm Con',
            value: summary.subgroupCount,
            sub: 'Nhánh hàng chi tiết',
            icon: 'viewGrid',
            color: 'text-slate-700 bg-slate-100 border-slate-200',
        },
        {
            title: 'Mã Ngành Hàng',
            value: summary.categoryCodeCount,
            sub: 'Mã phân loại sản phẩm',
            icon: 'tag',
            color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
        },
        {
            title: 'Hệ Số Quy Đổi',
            value: summary.multiplierCount,
            sub: 'Tỷ lệ quy đổi DTQĐ',
            icon: 'calculator',
            color: 'text-amber-600 bg-amber-50 border-amber-200',
        },
    ];

    const formattedDate = updatedAt
        ? new Date(updatedAt).toLocaleString('vi-VN', {
              hour: '2-digit',
              minute: '2-digit',
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
          })
        : 'Chưa xác định';

    return (
        <div className="space-y-3">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {cards.map((c, i) => (
                    <div
                        key={i}
                        className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 rounded-xl p-3.5 shadow-xs flex items-center justify-between"
                    >
                        <div>
                            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                {c.title}
                            </div>
                            <div className="text-xl sm:text-2xl font-black text-slate-800 dark:text-slate-100 tabular-nums mt-0.5">
                                {c.value.toLocaleString('vi-VN')}
                            </div>
                            <div className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                                {c.sub}
                            </div>
                        </div>
                        <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${c.color}`}>
                            <AppIcon name={c.icon} size="lg" />
                        </div>
                    </div>
                ))}
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-850 px-3.5 py-2 rounded-lg border border-slate-200/80 dark:border-slate-700/50">
                <div className="flex items-center gap-1.5">
                    <AppIcon name="clock" size="sm" className="text-slate-400" />
                    <span>Cập nhật lần cuối: <strong className="text-slate-700 dark:text-slate-200">{formattedDate}</strong></span>
                </div>
                {updatedBy && (
                    <div className="flex items-center gap-1.5">
                        <AppIcon name="user" size="sm" className="text-slate-400" />
                        <span>Người cập nhật: <strong className="text-slate-700 dark:text-slate-200">{updatedBy}</strong></span>
                    </div>
                )}
            </div>
        </div>
    );
};
