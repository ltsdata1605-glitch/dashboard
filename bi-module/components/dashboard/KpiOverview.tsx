
import React from 'react';
import { UsersIcon, DocumentReportIcon, FileTextIcon, ChevronUpIcon, ChevronDownIcon } from '../Icons';
import { GaugeChart, KpiCard } from './DashboardWidgets';
import { parseNumber, roundUp } from '../../utils/dashboardHelpers';

interface KpiOverviewProps {
    isRealtime: boolean;
    kpiData: Record<string, string>;
    targets: { quyDoi: number; traGop: number };
    supermarketDailyTargets: Record<string, number>;
    supermarketMonthlyTargets?: Record<string, number>;
    activeSupermarket: string;
}

const KpiOverview: React.FC<KpiOverviewProps> = ({ isRealtime, kpiData, targets, supermarketDailyTargets, supermarketMonthlyTargets, activeSupermarket }) => {

    const dtlk = parseNumber(kpiData.dtlk);
    const dtqd = parseNumber(kpiData.dtqd);
    const dtDuKien = parseNumber(kpiData.dtDuKien);
    const dtDuKienQD = parseNumber(kpiData.dtDuKienQD);
    const hqqd = dtlk > 0 ? ((dtqd / dtlk) - 1) * 100 : 0;

    let totalVuotTroi = 0;
    let htTargetVuotTroi = 0;
    let htVuotTroiColorClass = 'text-red-600 dark:text-red-400';

    if (isRealtime) {
        totalVuotTroi = supermarketDailyTargets[activeSupermarket];
        if (activeSupermarket === 'Tổng') {
            totalVuotTroi = Object.values(supermarketDailyTargets).reduce<number>((sum, value) => sum + Number(value), 0);
        }
        htTargetVuotTroi = totalVuotTroi > 0 ? (dtqd / totalVuotTroi) * 100 : 0;

        if (htTargetVuotTroi >= 120) htVuotTroiColorClass = 'text-green-600 dark:text-green-400';
        else if (htTargetVuotTroi >= 100) htVuotTroiColorClass = 'text-primary-600 dark:text-primary-400';
    }

    const htTargetDuKienQD_c = parseNumber(kpiData.htTargetDuKienQD);

    const renderGrowth = (val: string | undefined) => {
        if (!val || val === 'N/A' || val === '0%') return null;
        const num = parseNumber(val);
        const isPositive = num >= 0;
        return (
            <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-bold leading-none ${
                isPositive ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400' : 'bg-rose-50 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400'
            }`}>
                {isPositive ? <ChevronUpIcon className="h-2 w-2" /> : <ChevronDownIcon className="h-2 w-2" />}
                {Math.abs(Math.ceil(num))}%
            </span>
        );
    };

    let totalVuotTroiMonthly = 0;
    if (!isRealtime && supermarketMonthlyTargets) {
        totalVuotTroiMonthly = supermarketMonthlyTargets[activeSupermarket] || 0;
        if (activeSupermarket === 'Tổng') {
            totalVuotTroiMonthly = Object.values(supermarketMonthlyTargets).reduce<number>((sum, value) => sum + Number(value), 0);
        }
    }

    const htTargetVuotTroiMonthly = totalVuotTroiMonthly > 0 ? (dtDuKienQD / totalVuotTroiMonthly) * 100 : parseNumber(kpiData.htTargetDuKienQD);

    const secondaryPct = isRealtime ? htTargetVuotTroi : htTargetVuotTroiMonthly;
    const secondaryLabel = isRealtime ? 'MỤC TIÊU NGÀY' : 'MỤC TIÊU THÁNG';

    // Helper for rendering the native-style KPI Card
    const renderCard = (props: {
        title: string; icon: React.ReactNode; iconBg: string; titleColor: string; 
        value: string; valueColor: string; 
        progressPct?: number; progressColor?: string;
        targetStr?: string; targetLabel?: string;
        rightEl?: React.ReactNode;
    }) => {
        return (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden">
                {/* Top styling bar like in image */}
                <div className={`absolute top-0 left-0 w-full h-1 ${props.iconBg.split(' ')[0]} opacity-50`}></div>
                
                <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded-lg ${props.iconBg}`}>
                            {props.icon}
                        </div>
                        <span className={`text-[11px] font-bold uppercase tracking-wider ${props.titleColor}`}>
                            {props.title}
                        </span>
                    </div>
                    {props.rightEl && <div>{props.rightEl}</div>}
                </div>

                <div className="flex justify-between items-end mb-2">
                    <span className={`text-3xl font-black tracking-tight leading-none ${props.valueColor}`}>
                        {props.value}
                    </span>
                    {props.progressPct !== undefined && (
                        <span className={`text-sm font-bold tabular-nums mb-1 ${props.valueColor}`}>
                            {props.progressPct}%
                        </span>
                    )}
                </div>

                {props.progressPct !== undefined && props.progressColor && (
                    <div className="w-full bg-slate-100 dark:bg-slate-700/50 rounded-full h-1.5 mb-2.5 mt-1 overflow-hidden">
                        <div className={`h-full rounded-full ${props.progressColor}`} style={{ width: `${Math.min(props.progressPct, 100)}%` }} />
                    </div>
                )}

                {props.targetLabel && (
                    <div className="flex justify-between items-center text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-auto">
                        <span>{props.targetLabel}</span>
                        {props.targetStr && <span className="text-slate-600 dark:text-slate-300 font-bold">{props.targetStr}</span>}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="js-kpi-overview-container space-y-4">
            {/* ROW 1: DOANH THU & CHỈ SỐ LỚN */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* Card 1: DT THỰC */}
                {renderCard({
                    title: isRealtime ? 'DOANH THU THỰC' : 'DT THỰC L.KẾ',
                    icon: <span className="text-[12px] font-black w-4 h-4 flex items-center justify-center">$</span>,
                    iconBg: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
                    titleColor: 'text-slate-500 dark:text-slate-400',
                    value: `${roundUp(dtlk).toLocaleString('vi-VN')} Tr`,
                    valueColor: 'text-amber-500 dark:text-amber-400',
                    rightEl: !isRealtime ? renderGrowth(kpiData.dtckThang) : null,
                    progressPct: (!isRealtime && dtDuKien > 0) ? Math.ceil((dtlk / dtDuKien) * 100) : undefined,
                    progressColor: 'bg-emerald-400',
                    targetLabel: !isRealtime ? 'DỰ KIẾN THÁNG' : undefined,
                    targetStr: !isRealtime && dtDuKien > 0 ? `${roundUp(dtDuKien).toLocaleString('vi-VN')} Tr` : undefined
                })}

                {/* Card 2: DOANH THU Q.ĐỔI */}
                {renderCard({
                    title: isRealtime ? 'DOANH THU Q.ĐỔI' : 'DT Q.ĐỔI L.KẾ',
                    icon: <span className="text-[12px] font-black w-4 h-4 flex items-center justify-center">~</span>,
                    iconBg: 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
                    titleColor: 'text-slate-500 dark:text-slate-400',
                    value: `${roundUp(dtqd).toLocaleString('vi-VN')} Tr`,
                    valueColor: 'text-blue-600 dark:text-blue-400',
                    progressPct: Math.ceil(secondaryPct),
                    progressColor: 'bg-blue-400',
                    targetLabel: secondaryLabel,
                    targetStr: isRealtime 
                        ? (totalVuotTroi > 0 ? `${roundUp(totalVuotTroi).toLocaleString('vi-VN')} Tr` : undefined)
                        : (totalVuotTroiMonthly > 0 ? `${roundUp(totalVuotTroiMonthly).toLocaleString('vi-VN')} Tr` : undefined)
                })}

                {/* Card 3: HIỆU QUẢ Q.ĐỔI */}
                {renderCard({
                    title: 'HIỆU QUẢ Q.ĐỔI',
                    icon: <span className="text-[12px] font-black w-4 h-4 flex items-center justify-center">⚡</span>,
                    iconBg: 'bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
                    titleColor: 'text-slate-500 dark:text-slate-400',
                    value: `${Math.ceil(hqqd)}%`,
                    valueColor: 'text-amber-500 dark:text-amber-400',
                    progressPct: hqqd > 0 ? Math.ceil((hqqd / targets.quyDoi) * 100) : 0,
                    progressColor: 'bg-purple-400',
                    targetLabel: 'MỤC TIÊU',
                    targetStr: `${targets.quyDoi}%`
                })}

                {/* Card 4: TỶ LỆ TRẢ GÓP */}
                {renderCard({
                    title: 'TỶ LỆ TRẢ CHẬM',
                    icon: <span className="text-[12px] font-black w-4 h-4 flex items-center justify-center">%</span>,
                    iconBg: 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
                    titleColor: 'text-slate-500 dark:text-slate-400',
                    value: `${Math.ceil(parseNumber(kpiData.tyTrongTraGop))}%`,
                    valueColor: 'text-emerald-500 dark:text-emerald-400',
                    progressPct: Math.ceil(parseNumber(kpiData.tyTrongTraGop)) > 0 ? Math.ceil((parseNumber(kpiData.tyTrongTraGop) / targets.traGop) * 100) : 0,
                    progressColor: 'bg-amber-400',
                    targetLabel: 'MỤC TIÊU',
                    targetStr: `${targets.traGop}%`
                })}

            </div>

            {/* ROW 2: EXTRA METRICS — mỗi thẻ 1 màu pastel riêng */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Extra 1: Lượt Khách — Blue Pastel */}
                {renderCard({
                    title: 'LƯỢT KHÁCH',
                    icon: <UsersIcon className="h-4 w-4" />,
                    iconBg: 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
                    titleColor: 'text-blue-600 dark:text-blue-400',
                    value: roundUp(parseNumber(kpiData.lkhach)).toLocaleString('vi-VN'),
                    valueColor: 'text-blue-700 dark:text-blue-300',
                    rightEl: renderGrowth(kpiData.luotKhachChange)
                })}
                {/* Extra 2: TLPV — Violet Pastel */}
                {renderCard({
                    title: 'TL PHỤC VỤ',
                    icon: <DocumentReportIcon className="h-4 w-4" />,
                    iconBg: 'bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400',
                    titleColor: 'text-violet-600 dark:text-violet-400',
                    value: `${Math.ceil(parseNumber(kpiData.tlpv))}%`,
                    valueColor: 'text-violet-700 dark:text-violet-300',
                    rightEl: renderGrowth(kpiData.tlpvChange)
                })}
                {/* Extra 3: Bill Bán Hàng — Emerald Pastel */}
                {renderCard({
                    title: 'BILL BÁN HÀNG',
                    icon: <FileTextIcon className="h-4 w-4" />,
                    iconBg: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
                    titleColor: 'text-emerald-600 dark:text-emerald-400',
                    value: isRealtime ? roundUp(parseNumber(kpiData.lbillBH)).toLocaleString('vi-VN') : `${Math.ceil(parseNumber(kpiData.tyTrongTraGop))}%`,
                    valueColor: 'text-emerald-700 dark:text-emerald-300',
                    rightEl: !isRealtime ? renderGrowth(kpiData.traGopChange) : null
                })}
                {/* Extra 4: Bill Thu Hộ — Rose Pastel */}
                {renderCard({
                    title: 'BILL THU HỘ',
                    icon: <FileTextIcon className="h-4 w-4" />,
                    iconBg: 'bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400',
                    titleColor: 'text-rose-600 dark:text-rose-400',
                    value: kpiData.lbillTH ? roundUp(parseNumber(kpiData.lbillTH)).toLocaleString('vi-VN') : '0',
                    valueColor: 'text-rose-700 dark:text-rose-300',
                })}
            </div>
        </div>
    );
};

export default KpiOverview;
