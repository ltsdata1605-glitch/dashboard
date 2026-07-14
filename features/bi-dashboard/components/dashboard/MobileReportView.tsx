import React, { useMemo } from 'react';
import { useIndexedDBState } from '../../hooks/useIndexedDBState';
import { parseNumber, roundUp } from '../../utils/dashboardHelpers';

interface MobileReportViewProps {
    data: { headers: string[], rows: string[][] };
    activeSupermarket: string | null;
}

const f = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 });

const colorByStatus = (percent: number) => {
    if (percent >= 100) return 'from-emerald-500 to-emerald-600';
    if (percent >= 85) return 'from-amber-500 to-amber-600';
    return 'from-rose-500 to-rose-600';
};

const bgColorByStatus = (percent: number) => {
    if (percent >= 100) return 'bg-emerald-50 dark:bg-emerald-900/30';
    if (percent >= 85) return 'bg-amber-50 dark:bg-amber-900/30';
    return 'bg-rose-50 dark:bg-rose-900/30';
};

const textColorByStatus = (percent: number) => {
    if (percent >= 100) return 'text-emerald-700 dark:text-emerald-400';
    if (percent >= 85) return 'text-amber-700 dark:text-amber-400';
    return 'text-rose-600 dark:text-rose-400';
};

const MobileReportView = React.forwardRef<HTMLDivElement, MobileReportViewProps>(({ data, activeSupermarket }, ref) => {
    const [targets, setTargets] = useIndexedDBState<Record<string, string>>(`report-kpi-targets-${activeSupermarket || 'all'}`, {});

    const processedData = useMemo(() => {
        if (!data.headers || !data.headers.length) return [];
        const nameIdx = data.headers.indexOf('Tên miền');
        const dtIdx = data.headers.indexOf('DTLK');
        const dtqdIdx = data.headers.indexOf('DTQĐ');
        let tcIdx = data.headers.indexOf('Tỷ Trọng Trả Góp');
        if (tcIdx === -1) tcIdx = data.headers.indexOf('Tỷ Trọng Trả Chậm');

        if (nameIdx === -1 || dtIdx === -1 || dtqdIdx === -1) return [];

        const targetRow = data.rows.find(row => {
            const name = row[nameIdx];
            if (activeSupermarket && activeSupermarket !== 'Tổng') {
                return name === activeSupermarket;
            }
            return name === 'Tổng';
        });

        if (!targetRow) return [];

        const dtlk = parseNumber(targetRow[dtIdx]);
        const dtqd = parseNumber(targetRow[dtqdIdx]);
        const tc = tcIdx !== -1 ? parseNumber(targetRow[tcIdx]) : 0;
        const hqqd = dtlk > 0 ? ((dtqd / dtlk) - 1) * 100 : 0;

        return [
            { id: 'dtqd', name: 'Doanh Thu Trả Chậm', actual: dtqd, target: targets['dtqd'] || '', isPercent: false, icon: '💳', color: 'bg-amber-500' },
            { id: 'dtlk', name: 'Doanh Thu Quy Đổi', actual: dtlk, target: targets['dtlk'] || '', isPercent: false, icon: '💰', color: 'bg-emerald-500' },
            { id: 'hqqd', name: 'Tỷ Lệ Phục Vụ', actual: hqqd, target: targets['hqqd'] || '', isPercent: true, icon: '👤', color: 'bg-sky-500' },
            { id: 'tc', name: 'Tỷ Lệ Trả Chậm', actual: tc, target: targets['tc'] || '', isPercent: true, icon: '⏰', color: 'bg-rose-500' }
        ];
    }, [data, activeSupermarket, targets]);

    const handleTargetChange = (id: string, value: string, isPercent: boolean) => {
        const numericValue = value.replace(isPercent ? /[^0-9.-]/g : /[^0-9]/g, '');
        setTargets(prev => ({ ...prev, [id]: numericValue }));
    };

    return (
        <div className="js-mobile-report-view-container relative z-10" ref={ref}>
            <div className="w-full px-4 pb-4 space-y-3">
                {processedData.map((item) => {
                    const targetNum = parseNumber(item.target);
                    const ht = targetNum !== 0 ? (item.actual / targetNum) * 100 : 0;
                    const isPercent = item.isPercent;

                    return (
                        <div key={item.id} className="rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                            <div className={`bg-gradient-to-br ${item.color === 'bg-amber-500' ? 'from-amber-500 to-amber-600' : item.color === 'bg-emerald-500' ? 'from-emerald-500 to-emerald-600' : item.color === 'bg-sky-500' ? 'from-sky-500 to-sky-600' : 'from-rose-500 to-rose-600'} p-5 text-white`}>
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-2">
                                        <span className="text-2xl">{item.icon}</span>
                                        <h3 className="font-bold text-sm leading-tight">{item.name}</h3>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div>
                                        <div className="text-2xl font-black tabular-nums">
                                            {isPercent ? `${f.format(roundUp(item.actual))}%` : f.format(roundUp(item.actual))}
                                        </div>
                                        <div className="text-xs opacity-90 font-medium">
                                            {isPercent ? 'Tỷ lệ' : 'Doanh thu (Tr)'}
                                        </div>
                                    </div>

                                    {targetNum !== 0 && (
                                        <div className="border-t border-white/30 pt-3">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-xs font-semibold">Mục tiêu:</span>
                                                <span className="text-sm font-bold">{isPercent ? `${item.target}%` : (item.target ? f.format(parseInt(item.target, 10)) : '-')}</span>
                                            </div>
                                            <div className="w-full bg-white/30 rounded-full h-2">
                                                <div
                                                    className="bg-white/90 h-2 rounded-full transition-all duration-300"
                                                    style={{ width: `${Math.min(ht, 100)}%` }}
                                                />
                                            </div>
                                            <div className="text-xs opacity-90 mt-2">
                                                {roundUp(ht)}% hoàn thành
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
});

MobileReportView.displayName = 'MobileReportView';
export default MobileReportView;
