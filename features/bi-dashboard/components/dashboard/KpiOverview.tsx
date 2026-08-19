
import React, { useState } from 'react';
import { ChevronUpIcon, ChevronDownIcon } from '../Icons';
import { parseNumber, roundUp } from '../../utils/dashboardHelpers';
import { KpiCard } from '../../../../components/shared/ui/KpiCard';
import { Modal } from '../../../../components/shared/ui/Modal';
import { Button } from '../../../../components/shared/ui/Button';
import { useIndexedDBState } from '../../hooks/useIndexedDBState';

interface KpiOverviewProps {
    isRealtime: boolean;
    kpiData: Record<string, string>;
    targets: { quyDoi: number; traGop: number };
    supermarketDailyTargets: Record<string, number>;
    supermarketMonthlyTargets?: Record<string, number>;
    activeSupermarket: string;
}

type TargetType = 'dtThuc' | 'dtQd' | 'hqqd' | 'traCham';

const KpiOverview: React.FC<KpiOverviewProps> = ({ isRealtime, kpiData, targets, supermarketDailyTargets, supermarketMonthlyTargets, activeSupermarket }) => {

    const dtlk = parseNumber(kpiData.dtlk);
    const dtqd = parseNumber(kpiData.dtqd);
    const dtDuKien = parseNumber(kpiData.dtDuKien);
    const dtDuKienQD = parseNumber(kpiData.dtDuKienQD);
    const hqqd = dtlk > 0 ? ((dtqd / dtlk) - 1) * 100 : 0;
    const tyTrongTraGop = parseNumber(kpiData.tyTrongTraGop);

    // Custom Targets lưu IndexedDB
    const [customDTThucTargets, setCustomDTThucTargets] = useIndexedDBState<Record<string, number>>('custom-dt-thuc-targets', {});
    const [customDTQDTargets, setCustomDTQDTargets] = useIndexedDBState<Record<string, number>>('custom-dtqd-targets', {});
    const [customHQQDTargets, setCustomHQQDTargets] = useIndexedDBState<Record<string, number>>('custom-hqqd-targets', {});
    const [customTraChamTargets, setCustomTraChamTargets] = useIndexedDBState<Record<string, number>>('custom-tracham-targets', {});

    const [activeTargetType, setActiveTargetType] = useState<TargetType | null>(null);
    const [inputTarget, setInputTarget] = useState('');

    // --- 1. Target DTQĐ ---
    let totalVuotTroi = 0;
    if (activeSupermarket === 'Tổng') {
        if (customDTQDTargets && customDTQDTargets['Tổng'] !== undefined && customDTQDTargets['Tổng'] > 0) {
            totalVuotTroi = customDTQDTargets['Tổng'];
        } else {
            const storeKeys = Object.keys(supermarketDailyTargets);
            if (storeKeys.length > 0) {
                totalVuotTroi = storeKeys.reduce((acc, k) => acc + ((customDTQDTargets && customDTQDTargets[k]) ?? supermarketDailyTargets[k] ?? 0), 0);
            } else {
                totalVuotTroi = Object.values(supermarketDailyTargets).reduce<number>((sum, value) => sum + Number(value), 0);
            }
        }
    } else {
        if (customDTQDTargets && customDTQDTargets[activeSupermarket] !== undefined && customDTQDTargets[activeSupermarket] > 0) {
            totalVuotTroi = customDTQDTargets[activeSupermarket];
        } else {
            totalVuotTroi = supermarketDailyTargets[activeSupermarket] || 0;
        }
    }

    const htTargetVuotTroi = totalVuotTroi > 0 ? (dtqd / totalVuotTroi) * 100 : 0;

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
    const secondaryLabel = isRealtime ? 'Mục tiêu ngày' : 'Mục tiêu tháng';
    const secondaryTargetStr = isRealtime
        ? (totalVuotTroi > 0 ? `${roundUp(totalVuotTroi).toLocaleString('vi-VN')} Tr` : 'Nhấp đặt MT')
        : (totalVuotTroiMonthly > 0 ? `${roundUp(totalVuotTroiMonthly).toLocaleString('vi-VN')} Tr` : undefined);

    // --- 2. Target DT THỰC ---
    let totalDTThucDailyTarget = 0;
    if (activeSupermarket === 'Tổng') {
        if (customDTThucTargets && customDTThucTargets['Tổng'] !== undefined && customDTThucTargets['Tổng'] > 0) {
            totalDTThucDailyTarget = customDTThucTargets['Tổng'];
        } else {
            const storeKeys = Object.keys(supermarketDailyTargets);
            if (storeKeys.length > 0) {
                totalDTThucDailyTarget = storeKeys.reduce((acc, k) => acc + ((customDTThucTargets && customDTThucTargets[k]) ?? supermarketDailyTargets[k] ?? 0), 0);
            } else {
                totalDTThucDailyTarget = totalVuotTroi;
            }
        }
    } else {
        if (customDTThucTargets && customDTThucTargets[activeSupermarket] !== undefined && customDTThucTargets[activeSupermarket] > 0) {
            totalDTThucDailyTarget = customDTThucTargets[activeSupermarket];
        } else {
            totalDTThucDailyTarget = supermarketDailyTargets[activeSupermarket] || 0;
        }
    }

    let dtThucProgress: number | undefined = undefined;
    let dtThucLabel = isRealtime ? 'Mục tiêu ngày' : 'Mục tiêu tháng';
    let dtThucTargetStr: string | undefined = undefined;

    if (isRealtime) {
        dtThucProgress = totalDTThucDailyTarget > 0 ? Math.ceil((dtlk / totalDTThucDailyTarget) * 100) : undefined;
        dtThucTargetStr = totalDTThucDailyTarget > 0 ? `${roundUp(totalDTThucDailyTarget).toLocaleString('vi-VN')} Tr` : 'Nhấp đặt MT';
    } else {
        const monthlyTarget = (supermarketMonthlyTargets && supermarketMonthlyTargets[activeSupermarket]) || dtDuKien;
        dtThucProgress = monthlyTarget > 0 ? Math.ceil((dtlk / monthlyTarget) * 100) : undefined;
        dtThucTargetStr = monthlyTarget > 0 ? `${roundUp(monthlyTarget).toLocaleString('vi-VN')} Tr` : undefined;
    }

    // --- 3. Target HQQĐ & TRẢ CHẬM ---
    const currentQuyDoiTarget = (customHQQDTargets && customHQQDTargets[activeSupermarket]) ?? targets.quyDoi ?? 40;
    const currentTraGopTarget = (customTraChamTargets && customTraChamTargets[activeSupermarket]) ?? targets.traGop ?? 45;

    const dtThucIsGood = dtThucProgress !== undefined && dtThucProgress >= 100;
    const dtqdIsGood = secondaryPct >= 100;
    const hqqdIsGood = hqqd >= currentQuyDoiTarget;
    const traGopIsGood = tyTrongTraGop >= currentTraGopTarget;

    // --- Open & Save Modal Handlers ---
    const handleOpenModal = (type: TargetType) => {
        setActiveTargetType(type);
        let val = '';
        if (type === 'dtThuc') {
            const currentVal = (customDTThucTargets && customDTThucTargets[activeSupermarket]) ?? totalDTThucDailyTarget;
            val = currentVal > 0 ? Math.round(currentVal).toString() : '';
        } else if (type === 'dtQd') {
            const currentVal = (customDTQDTargets && customDTQDTargets[activeSupermarket]) ?? totalVuotTroi;
            val = currentVal > 0 ? Math.round(currentVal).toString() : '';
        } else if (type === 'hqqd') {
            val = currentQuyDoiTarget.toString();
        } else if (type === 'traCham') {
            val = currentTraGopTarget.toString();
        }
        setInputTarget(val);
    };

    const handleSaveTarget = () => {
        const parsed = parseFloat(inputTarget.replace(/,/g, ''));
        if (!isNaN(parsed) && parsed >= 0) {
            if (activeTargetType === 'dtThuc') {
                setCustomDTThucTargets(prev => ({ ...(prev || {}), [activeSupermarket]: parsed }));
            } else if (activeTargetType === 'dtQd') {
                setCustomDTQDTargets(prev => ({ ...(prev || {}), [activeSupermarket]: parsed }));
            } else if (activeTargetType === 'hqqd') {
                setCustomHQQDTargets(prev => ({ ...(prev || {}), [activeSupermarket]: parsed }));
            } else if (activeTargetType === 'traCham') {
                setCustomTraChamTargets(prev => ({ ...(prev || {}), [activeSupermarket]: parsed }));
            }
        }
        setActiveTargetType(null);
    };

    const handleRemoveTarget = () => {
        if (activeTargetType === 'dtThuc') {
            setCustomDTThucTargets(prev => {
                const copy = { ...(prev || {}) };
                delete copy[activeSupermarket];
                return copy;
            });
        } else if (activeTargetType === 'dtQd') {
            setCustomDTQDTargets(prev => {
                const copy = { ...(prev || {}) };
                delete copy[activeSupermarket];
                return copy;
            });
        } else if (activeTargetType === 'hqqd') {
            setCustomHQQDTargets(prev => {
                const copy = { ...(prev || {}) };
                delete copy[activeSupermarket];
                return copy;
            });
        } else if (activeTargetType === 'traCham') {
            setCustomTraChamTargets(prev => {
                const copy = { ...(prev || {}) };
                delete copy[activeSupermarket];
                return copy;
            });
        }
        setActiveTargetType(null);
    };

    const getModalDetails = () => {
        switch (activeTargetType) {
            case 'dtThuc':
                return {
                    title: 'Mục Tiêu Ngày — Doanh Thu Thực',
                    unit: 'Triệu',
                    label: 'MỤC TIÊU NGÀY DT THỰC (TR)',
                    desc: 'Nhập mục tiêu doanh thu thực (Đơn vị: Triệu VNĐ) cho siêu thị để theo dõi thanh tiến độ % hoàn thành.',
                    placeholder: totalVuotTroi > 0 ? Math.round(totalVuotTroi).toString() : 'Ví dụ: 700'
                };
            case 'dtQd':
                return {
                    title: 'Mục Tiêu Ngày — Doanh Thu Quy Đổi',
                    unit: 'Triệu',
                    label: 'MỤC TIÊU NGÀY DTQĐ (TR)',
                    desc: 'Nhập mục tiêu doanh thu quy đổi (Đơn vị: Triệu VNĐ) cho siêu thị.',
                    placeholder: totalVuotTroi > 0 ? Math.round(totalVuotTroi).toString() : 'Ví dụ: 1292'
                };
            case 'hqqd':
                return {
                    title: 'Mục Tiêu — Hiệu Quả Quy Đổi (HQQĐ)',
                    unit: '%',
                    label: 'MỤC TIÊU HQQĐ (%)',
                    desc: 'Nhập tỷ lệ phần trăm mục tiêu Hiệu Quả Quy Đổi mong muốn.',
                    placeholder: 'Ví dụ: 40'
                };
            case 'traCham':
                return {
                    title: 'Mục Tiêu — Tỷ Trọng Trả Chậm',
                    unit: '%',
                    label: 'MỤC TIÊU TRẢ CHẬM (%)',
                    desc: 'Nhập tỷ trọng phần trăm mục tiêu bán Trả Chậm / Trả Góp.',
                    placeholder: 'Ví dụ: 45'
                };
            default:
                return { title: '', unit: '', label: '', desc: '', placeholder: '' };
        }
    };

    const modalDetails = getModalDetails();

    return (
        <>
            <div className="js-kpi-overview-container space-y-1.5 sm:space-y-2 lg:space-y-2.5">
                {/* ROW 1: DOANH THU & CHỈ SỐ LỚN */}
                <div className="grid grid-cols-4 gap-1.5 sm:gap-2 lg:gap-2.5">
                    <KpiCard
                        icon="dollar-sign"
                        iconColor="emerald"
                        title="DT Thực"
                        progressPercent={dtThucProgress}
                        isGood={dtThucIsGood}
                        trendLabel={dtThucLabel}
                        trendValue={dtThucTargetStr}
                        onClick={() => handleOpenModal('dtThuc')}
                    >
                        <div className="text-[14px] sm:text-[16px] lg:text-[17px] xl:text-[18px] font-black leading-none tracking-tight tabular-nums text-emerald-600 dark:text-emerald-400">
                            {roundUp(dtlk).toLocaleString('vi-VN')} Tr
                        </div>
                    </KpiCard>

                    <KpiCard
                        icon="trending-up"
                        iconColor="sky"
                        title="DTQĐ"
                        progressPercent={Math.ceil(secondaryPct)}
                        isGood={dtqdIsGood}
                        trendLabel={secondaryLabel}
                        trendValue={secondaryTargetStr || '-'}
                        onClick={() => handleOpenModal('dtQd')}
                    >
                        <div className={`text-[14px] sm:text-[16px] lg:text-[17px] xl:text-[18px] font-black leading-none tracking-tight tabular-nums ${dtqdIsGood ? 'text-emerald-600 dark:text-emerald-400' : 'text-sky-600 dark:text-sky-400'}`}>
                            {roundUp(dtqd).toLocaleString('vi-VN')} Tr
                        </div>
                    </KpiCard>

                    <KpiCard
                        icon="activity"
                        iconColor="indigo"
                        title="HQQĐ"
                        progressPercent={hqqd > 0 ? Math.ceil((hqqd / currentQuyDoiTarget) * 100) : 0}
                        isGood={hqqdIsGood}
                        trendLabel="Mục tiêu"
                        trendValue={`${currentQuyDoiTarget}%`}
                        onClick={() => handleOpenModal('hqqd')}
                    >
                        <div className={`text-[14px] sm:text-[16px] lg:text-[17px] xl:text-[18px] font-black leading-none tracking-tight tabular-nums ${hqqdIsGood ? 'text-emerald-600 dark:text-emerald-400' : 'text-indigo-700 dark:text-indigo-400'}`}>
                            {Math.ceil(hqqd)}%
                        </div>
                    </KpiCard>

                    <KpiCard
                        icon="credit-card"
                        iconColor="amber"
                        title="Trả Chậm"
                        progressPercent={tyTrongTraGop > 0 ? Math.ceil((tyTrongTraGop / currentTraGopTarget) * 100) : 0}
                        isGood={traGopIsGood}
                        trendLabel="Mục tiêu"
                        trendValue={`${currentTraGopTarget}%`}
                        onClick={() => handleOpenModal('traCham')}
                    >
                        <div className={`text-[14px] sm:text-[16px] lg:text-[17px] xl:text-[18px] font-black leading-none tracking-tight tabular-nums ${traGopIsGood ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                            {Math.ceil(tyTrongTraGop)}%
                        </div>
                    </KpiCard>
                </div>

                {/* ROW 2: CHỈ SỐ PHỤ */}
                <div className="grid grid-cols-4 gap-1.5 sm:gap-2 lg:gap-2.5">
                    <KpiCard icon="users" iconColor="sky" title="L.Khách" trendValue={renderGrowth(kpiData.luotKhachChange)}>
                        <div className="text-[14px] sm:text-[16px] lg:text-[17px] xl:text-[18px] font-black leading-none tracking-tight tabular-nums text-sky-600 dark:text-sky-400">
                            {roundUp(parseNumber(kpiData.lkhach)).toLocaleString('vi-VN')}
                        </div>
                    </KpiCard>

                    <KpiCard icon="shield-check" iconColor="amber" title="TLPVTC" trendValue={renderGrowth(kpiData.tlpvChange)}>
                        <div className="text-[14px] sm:text-[16px] lg:text-[17px] xl:text-[18px] font-black leading-none tracking-tight tabular-nums text-amber-600 dark:text-amber-400">
                            {Math.ceil(parseNumber(kpiData.tlpv))}%
                        </div>
                    </KpiCard>

                    <KpiCard icon="receipt" iconColor="emerald" title="Bill Bán">
                        <div className="text-[14px] sm:text-[16px] lg:text-[17px] xl:text-[18px] font-black leading-none tracking-tight tabular-nums text-emerald-600 dark:text-emerald-400">
                            {kpiData.lbillBH ? roundUp(parseNumber(kpiData.lbillBH)).toLocaleString('vi-VN') : '0'}
                        </div>
                    </KpiCard>

                    <KpiCard icon="wallet" iconColor="rose" title="Bill T.Hộ">
                        <div className="text-[14px] sm:text-[16px] lg:text-[17px] xl:text-[18px] font-black leading-none tracking-tight tabular-nums text-rose-600 dark:text-rose-400">
                            {kpiData.lbillTH ? roundUp(parseNumber(kpiData.lbillTH)).toLocaleString('vi-VN') : '0'}
                        </div>
                    </KpiCard>
                </div>
            </div>

            {/* Modal đặt mục tiêu cho từng thẻ KPI */}
            <Modal
                isOpen={activeTargetType !== null}
                onClose={() => setActiveTargetType(null)}
                title={modalDetails.title}
                subTitle={`Siêu thị: ${activeSupermarket}`}
                maxWidth="sm"
                footer={
                    <div className="flex items-center justify-end gap-2 w-full">
                        <Button variant="ghost" size="sm" onClick={() => setActiveTargetType(null)}>
                            Hủy
                        </Button>
                        <Button variant="primary" size="sm" onClick={handleSaveTarget}>
                            Lưu mục tiêu
                        </Button>
                    </div>
                }
            >
                <div className="space-y-4 py-1">
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                        {modalDetails.desc}
                    </p>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                            {modalDetails.label}
                        </label>
                        <div className="relative flex items-center">
                            <input
                                type="number"
                                autoFocus
                                value={inputTarget}
                                onChange={(e) => setInputTarget(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') handleSaveTarget(); }}
                                placeholder={modalDetails.placeholder}
                                className="w-full pl-3.5 pr-16 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-bold text-base focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all shadow-inner [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700/80 text-xs font-bold text-slate-500 dark:text-slate-300 pointer-events-none select-none">
                                {modalDetails.unit}
                            </span>
                        </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                        {activeTargetType === 'dtThuc' && totalVuotTroi > 0 ? (
                            <button
                                type="button"
                                onClick={() => setInputTarget(Math.round(totalVuotTroi).toString())}
                                className="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline inline-flex items-center gap-1"
                            >
                                ⚡ Lấy theo Target DTQĐ ({roundUp(totalVuotTroi).toLocaleString('vi-VN')} Tr)
                            </button>
                        ) : <div />}

                        <button
                            type="button"
                            onClick={handleRemoveTarget}
                            className="text-xs font-bold text-rose-600 dark:text-rose-400 hover:underline inline-flex items-center gap-1 hover:text-rose-700 transition-colors"
                        >
                            Loại bỏ
                        </button>
                    </div>
                </div>
            </Modal>
        </>
    );
};

export default KpiOverview;
