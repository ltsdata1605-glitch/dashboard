import React from 'react';
import { RevenueRow, Employee } from '../../../types/nhanVienTypes';
import { roundUp } from '../../../utils/nhanVienHelpers';
import { MedalBadge, DeltaBadge } from '../../shared/Badges';
import { AvatarUploader } from '../../shared/AvatarUploader';
import { UsersIcon } from '../../Icons';
import { ColorSettings, CriterionConfig } from './ColorSettingsModal';

interface RevenueMobileCardProps {
    row: RevenueRow;
    isHighlighted: boolean;
    onHighlightToggle: (name: string) => void;
    onViewTrend: (employee: Employee) => void;
    supermarketName: string;
    colorSettings: ColorSettings;
    getHtColor: (val: number) => string;
    getDynamicColor: (val: number, config: CriterionConfig) => string | undefined;
    timeProgressPercentage: number;
}

const f = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 });

export const RevenueMobileCard = React.memo(({
    row,
    isHighlighted,
    onHighlightToggle,
    onViewTrend,
    supermarketName,
    colorSettings,
    getHtColor,
    getDynamicColor
}: RevenueMobileCardProps) => {
    const prev = row.prevCompData;

    return (
        <div 
            className={`p-4 flex flex-col gap-3 transition-all ${isHighlighted ? 'bg-amber-50 dark:bg-amber-900/20' : 'active:bg-slate-50'}`}
            onClick={() => onHighlightToggle(row.originalName!)}
        >
            <div className="flex items-center gap-3">
                <MedalBadge rank={row.rank} />
                <AvatarUploader employeeName={row.originalName!} supermarketName={supermarketName} />
                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                        <span className="font-bold text-slate-900 dark:text-white truncate">{row.name}</span>
                        <span className="text-[10px] font-black text-sky-600 bg-sky-50 dark:bg-sky-900/30 px-2 py-0.5 rounded-full">{roundUp(row.calculatedCompletion)}% HT</span>
                    </div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold">{row.department}</span>
                </div>
            </div>
            
            <div className="grid grid-cols-3 gap-2">
                <div className="bg-slate-50 dark:bg-slate-800/50 p-2 rounded-xl border border-slate-100 dark:border-slate-700">
                    <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">DTQĐ</p>
                    <p className="text-sm font-black tabular-nums" style={{ color: getDynamicColor(row.dtqd, colorSettings.dtqd) || '#0284c7' }}>{f.format(roundUp(row.dtqd))}</p>
                    <DeltaBadge current={row.dtqd} previous={prev?.dtqd} isCurrency />
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 p-2 rounded-xl border border-slate-100 dark:border-slate-700">
                    <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">HQQĐ</p>
                    <p className="text-sm font-black tabular-nums" style={{ color: getDynamicColor(row.hieuQuaQD * 100, colorSettings.hqqd) }}>{isNaN(row.hieuQuaQD) ? '0%' : (row.hieuQuaQD * 100).toFixed(0)}%</p>
                    <DeltaBadge current={row.hieuQuaQD * 100} previous={prev?.hqqd * 100} isPercent />
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 p-2 rounded-xl border border-slate-100 dark:border-slate-700">
                    <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Trả góp</p>
                    <p className="text-sm font-black tabular-nums" style={{ color: getDynamicColor(row.calculatedInstallment, colorSettings.tragop) }}>{roundUp(row.calculatedInstallment)}%</p>
                    <DeltaBadge current={row.calculatedInstallment} previous={prev?.installment} isPercent />
                </div>
            </div>
            
            <div className="flex justify-between items-center no-print">
                <button 
                    onClick={(e) => { e.stopPropagation(); onViewTrend(row as Employee); }}
                    className="text-[10px] font-bold text-sky-600 hover:underline flex items-center gap-1"
                >
                    <UsersIcon className="h-3 w-3" />
                    Xem chi tiết xu hướng
                </button>
                <div className="flex items-center gap-2">
                    <span className="text-[9px] font-bold text-slate-400 uppercase">Bán kèm:</span>
                    <span className="text-[10px] font-black" style={{ color: getDynamicColor(row.pctBillBk, colorSettings.bankem) }}>{roundUp(row.pctBillBk)}%</span>
                </div>
            </div>
        </div>
    );
});
