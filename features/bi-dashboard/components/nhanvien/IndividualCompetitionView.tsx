
import React, { useRef, useState, useEffect, useMemo, forwardRef, useImperativeHandle } from 'react';
import { useExportOptionsContext } from '../../contexts/ExportOptionsContext';
import toast from 'react-hot-toast';
import { FilterIcon, ChevronDownIcon, CameraIcon } from '../Icons';
import { Layers } from 'lucide-react';
import { useIndexedDBState } from '../../hooks/useIndexedDBState';
import { useEmployeeAvatar } from '../../hooks/useEmployeeAvatar';
import { Employee, Criterion, CompetitionHeader, RevenueRow, InstallmentRow, CrossSellingRow, BonusMetrics } from '../../types/nhanVienTypes';
import { roundUp, shortenName, getYesterdayDateString, isSameEmployee } from '../../utils/nhanVienHelpers';
import { getDefaultGroupLabel } from '../../utils/dashboardHelpers';
import { getBonusForEmployee } from '../../utils/bonusParser';
import { Button } from '../../../../components/shared/ui/Button';
import { Input } from '../../../../components/shared/ui/Input';
import { MultiSelectDropdown } from '../../../../components/shared/ui/MultiSelectDropdown';
import { exportElementAsImage, downloadBlob, shareBlob } from '../../services/uiService';
import { calculateRunRate } from '../../services/metricService';
import {
    findEmployeeRow,
    computeRank,
    computeCompetitionStats,
    getIndividualMonthProgress,
    computePerformanceRow,
} from '../../services/individualCompetitionCalc';
import { PieChart, Pie, Cell } from 'recharts';
import { Pill } from '../shared/Pill';

const CRITERIA_THEMES: Record<string, { main: string; light: string; text: string; border: string; badge: string }> = {
    'DTLK': { main: 'bg-slate-100 dark:bg-slate-800', light: 'bg-sky-50 dark:bg-sky-900/20', text: 'text-slate-600 dark:text-slate-300', border: 'border-slate-300 dark:border-slate-600', badge: 'bg-slate-200 dark:bg-slate-700' },
    'DTQĐ': { main: 'bg-slate-100 dark:bg-slate-800', light: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-slate-600 dark:text-slate-300', border: 'border-slate-300 dark:border-slate-600', badge: 'bg-slate-200 dark:bg-slate-700' },
    'SLLK': { main: 'bg-slate-100 dark:bg-slate-800', light: 'bg-rose-50 dark:bg-rose-900/20', text: 'text-slate-600 dark:text-slate-300', border: 'border-slate-300 dark:border-slate-600', badge: 'bg-slate-200 dark:bg-slate-700' },
};

const GROUP_PALETTES = [
    { main: 'bg-slate-100 dark:bg-slate-800', light: 'bg-sky-50 dark:bg-sky-900/20', text: 'text-slate-600 dark:text-slate-300', border: 'border-slate-300 dark:border-slate-600', badge: 'bg-slate-200 dark:bg-slate-700' },
    { main: 'bg-slate-100 dark:bg-slate-800', light: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-slate-600 dark:text-slate-300', border: 'border-slate-300 dark:border-slate-600', badge: 'bg-slate-200 dark:bg-slate-700' },
    { main: 'bg-slate-100 dark:bg-slate-800', light: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-slate-600 dark:text-slate-300', border: 'border-slate-300 dark:border-slate-600', badge: 'bg-slate-200 dark:bg-slate-700' },
    { main: 'bg-slate-100 dark:bg-slate-800', light: 'bg-rose-50 dark:bg-rose-900/20', text: 'text-slate-600 dark:text-slate-300', border: 'border-slate-300 dark:border-slate-600', badge: 'bg-slate-200 dark:bg-slate-700' },
    { main: 'bg-slate-100 dark:bg-slate-800', light: 'bg-slate-50 dark:bg-slate-800/40', text: 'text-slate-600 dark:text-slate-300', border: 'border-slate-300 dark:border-slate-600', badge: 'bg-slate-200 dark:bg-slate-700' },
];

// 1 chương trình thi đua đã tính target/actual/completion cho nhân viên đang xem
interface CompetitionPerformanceItem {
    name: string;
    originalTitle: string;
    target: number;
    actual: number;
    completion: number;
    remaining: number;
}
type GroupedPerformanceData = Record<string, CompetitionPerformanceItem[]>;

const ProgressBar: React.FC<{ value: number }> = ({ value }) => {
    const percentage = Math.min(Math.max(value, 0), 200);
    const displayPercentage = Math.min(percentage, 100);
    let colorClass = 'bg-sky-500';
    if (value >= 100) colorClass = 'bg-emerald-500';
    else if (value < 100) colorClass = 'bg-amber-500';
    if (value < 50) colorClass = 'bg-rose-500';
    return (
        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 my-1 relative overflow-hidden">
            <div className={`${colorClass} h-full rounded-full transition-all duration-500 ease-out`} style={{ width: `${displayPercentage}%` }}></div>
             {percentage > 100 && <div className="absolute top-0 left-0 h-full bg-emerald-300 rounded-full" style={{ width: `${Math.min(percentage - 100, 100)}%` }}></div>}
        </div>
    );
};





interface IndividualCompetitionViewProps {
    allEmployees: Employee[];
    selectedEmployee: Employee | null;
    onSelectIndividual: (emp: Employee | null) => void;
    allCompetitionsByCriterion: Record<Criterion, { headers: CompetitionHeader[] }>;
    employeeDataMap: Map<string, { name: string; department: string; values: Record<string, number | null> }>;
    employeeCompetitionTargets: Map<string, Map<string, number>>;
    selectedCompetitions: Set<string>;
    setSelectedCompetitions: (updater: React.SetStateAction<Set<string>>) => void;
    supermarketName?: string;
    revenueRows?: RevenueRow[];
    installmentRows?: InstallmentRow[];
    banKemRows?: CrossSellingRow[];
    bonusData?: Record<string, BonusMetrics | null>;
}

export interface IndividualCompetitionViewHandle {
    handleExportPNG: (customFilename?: string, autoAction?: 'download' | 'share' | 'cancel' | null) => Promise<'download' | 'share' | 'cancel' | null>;
    performBatchExport: () => Promise<void>;
    isBatchExporting: boolean;
    exportProgress: { current: number; total: number } | null;
}

// ─── Competition Stat Pill ───
const StatPill: React.FC<{ count: number; label: string; color: string }> = ({ count, label, color }) => (
    <div className={`flex items-center justify-center gap-1 px-2 py-1 rounded text-[11px] font-bold min-w-[52px] ${color}`}>
        <span className="font-black">{count}</span>
        <span>{label}</span>
    </div>
);

// ─── DKHT Donut (Recharts) ───
const DONUT_COLORS = ['#34d399', '#fbbf24', '#94a3b8', '#fb7185'];
const DkhtDonut: React.FC<{ stats: { dkhtDat: number; dkhtGanDat: number; dkhtChuaDat: number; noSale: number; total: number } }> = ({ stats }) => {
    const data = [
        { name: '≥100%', value: stats.dkhtDat },
        { name: 'Gần đạt', value: stats.dkhtGanDat },
        { name: '<80%', value: stats.dkhtChuaDat },
        { name: 'No Sale', value: stats.noSale },
    ].filter(d => d.value > 0);
    const datPct = stats.total > 0 ? Math.round((stats.dkhtDat / stats.total) * 100) : 0;
    return (
        <div className="flex flex-col items-center gap-0">
            <div className="relative" style={{ width: 76, height: 76 }}>
                <PieChart width={76} height={76} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                    <Pie data={data} cx="50%" cy="50%" innerRadius={22} outerRadius={33} paddingAngle={2} dataKey="value" strokeWidth={0} isAnimationActive={false}>
                        {data.map((_entry, index) => <Cell key={index} fill={DONUT_COLORS[['≥100%', 'Gần đạt', '<80%', 'No Sale'].indexOf(_entry.name)]} />)}
                    </Pie>
                </PieChart>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-[15px] font-black text-white leading-none drop-shadow-md">{datPct}%</span>
                    <span className="text-[6px] font-bold text-white/80 uppercase leading-tight drop-shadow-sm mt-0.5">Đạt 100%</span>
                </div>
            </div>
            <p className="text-[11px] text-white/70 font-bold">{stats.total} nhóm</p>
        </div>
    );
};

// ─── Micro Progress Bar ───
const MicroBar: React.FC<{ value: number; max?: number }> = ({ value, max = 100 }) => {
    const pctVal = Math.min(Math.max((value / max) * 100, 0), 100);
    const color = value >= 60 ? 'bg-emerald-500' : value >= 30 ? 'bg-amber-500' : 'bg-rose-500';
    return (<div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-[3px] mt-1 overflow-hidden"><div className={`${color} h-full rounded-full transition-all duration-500`} style={{ width: `${pctVal}%` }} /></div>);
};

// ─── Rank Badge ───
const RankBadge: React.FC<{ rank: number; total: number; label: string }> = ({ rank, total, label }) => {
    const pctVal = total > 0 ? ((total - rank + 1) / total) * 100 : 0;
    const color = rank <= 3 ? 'text-emerald-700 bg-emerald-50' : rank <= Math.ceil(total / 2) ? 'text-sky-700 bg-sky-50' : 'text-slate-500 bg-slate-100';
    const barColor = rank <= 3 ? 'bg-emerald-500' : rank <= Math.ceil(total / 2) ? 'bg-sky-500' : 'bg-slate-400';
    return (
        <div className="flex items-center gap-1.5 text-[11px]">
            <span className="text-slate-400 font-medium">{label}</span>
            <span className={`font-black px-1.5 py-0.5 rounded ${color}`}>#{rank}<span className="font-medium text-slate-400">/{total}</span></span>
            <div className="flex-1 min-w-[30px] bg-slate-200 dark:bg-slate-700 rounded-full h-1 overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${pctVal}%` }} />
            </div>
        </div>
    );
};

// ─── Employee Profile Card ───
const EmployeeProfileCard: React.FC<{
    selectedEmployee: { name: string; originalName: string; department: string };
    supermarketName?: string;
    revenueRows?: RevenueRow[];
    installmentRows?: InstallmentRow[];
    banKemRows?: CrossSellingRow[];
    bonusData?: Record<string, BonusMetrics | null>;
    groupedPerformanceData: GroupedPerformanceData;
}> = ({ selectedEmployee, revenueRows, installmentRows, banKemRows, bonusData, groupedPerformanceData }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { avatarSrc, uploadAvatar } = useEmployeeAvatar({
        employeeName: selectedEmployee.name,
        originalName: selectedEmployee.originalName,
        fallbackEmployees: revenueRows?.filter(r => r.type === 'employee')
    });

    const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            await uploadAvatar(file);
            toast.success('Đã cập nhật ảnh đại diện thành công!');
        } catch (err) {
            console.error(err);
            toast.error('Không thể tải ảnh lên. Vui lòng thử lại!');
        }
    };
    
    const empRevenue = useMemo(
        () => findEmployeeRow(revenueRows, selectedEmployee.originalName),
        [revenueRows, selectedEmployee]
    );

    const empInstallment = useMemo(
        () => findEmployeeRow(installmentRows, selectedEmployee.originalName),
        [installmentRows, selectedEmployee]
    );

    const empBanKem = useMemo(
        () => findEmployeeRow(banKemRows, selectedEmployee.originalName),
        [banKemRows, selectedEmployee]
    );

    const empBonus = useMemo(() => {
        if (!bonusData) return null;
        return getBonusForEmployee(bonusData, selectedEmployee.originalName, selectedEmployee.name);
    }, [bonusData, selectedEmployee]);

    // Rankings
    const rankings = useMemo(() => ({
        dt: computeRank(revenueRows || [], 'dtlk', selectedEmployee.originalName),
        tg: computeRank(installmentRows || [], 'totalPercent', selectedEmployee.originalName),
        bk: computeRank(banKemRows || [], 'pctBillBk', selectedEmployee.originalName),
    }), [revenueRows, installmentRows, banKemRows, selectedEmployee]);

    const compStats = useMemo(() => {
        const allItems: { name: string; completion: number; remaining: number; target: number; actual: number }[] = [];
        Object.values(groupedPerformanceData || {}).forEach((items) => {
            if (Array.isArray(items)) allItems.push(...items);
        });
        // Vẫn đọc đồng hồ TRONG memo như bản cũ để giữ nguyên hành vi.
        const { daysPassed, daysInMonth } = getIndividualMonthProgress();
        return computeCompetitionStats(allItems, daysPassed, daysInMonth);
    }, [groupedPerformanceData]);

    const f = (v?: number) => v != null && !isNaN(v) ? roundUp(v).toLocaleString('vi-VN') : '-';
    const pct = (v?: number) => v != null && !isNaN(v) ? `${Math.round(v)}%` : '-';

    return (
        <div className="mb-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
            {/* Header gradient */}
            <div className="bg-sky-500 px-4 py-3 relative overflow-hidden border-b border-sky-600/30 dark:border-slate-700">
                <div className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: 'radial-gradient(circle at 20% 80%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
                <div className="flex items-center gap-4 relative z-10">
                    <div 
                        className="relative group w-24 h-24 rounded-full border-[3px] border-white/40 overflow-hidden flex-shrink-0 cursor-pointer hover:border-white transition-all"
                        onClick={() => fileInputRef.current?.click()}
                        title="Bấm để tải lên hoặc đổi ảnh đại diện"
                    >
                        {avatarSrc ? (
                            <img src={avatarSrc} alt={selectedEmployee.name} className="w-full h-full rounded-full object-cover" />
                        ) : (
                            <div className="w-full h-full rounded-full bg-white/20 flex items-center justify-center">
                                <span className="text-2xl font-black text-white">{selectedEmployee.name.charAt(selectedEmployee.name.lastIndexOf(' ') + 1) || '?'}</span>
                            </div>
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity text-white no-print">
                            <CameraIcon className="w-6 h-6 drop-shadow-md" />
                            <span className="text-[11px] font-bold mt-1 drop-shadow-md uppercase tracking-wider">Đổi ảnh</span>
                        </div>
                        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-black text-white uppercase truncate leading-tight drop-shadow-sm">{selectedEmployee.name}</h3>
                        <p className="text-[11px] text-white/70 font-medium mt-0.5">{selectedEmployee.department}</p>
                        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                            <StatPill count={compStats.dkhtDat} label="≥100%" color="bg-emerald-400 text-white border border-white/50" />
                            <StatPill count={compStats.dkhtGanDat} label="Gần đạt" color="bg-amber-400 text-white border border-white/50" />
                            <StatPill count={compStats.dkhtChuaDat} label="<80%" color="bg-slate-400 text-white border border-white/50" />
                            {compStats.noSale > 0 && <StatPill count={compStats.noSale} label="No Sale" color="bg-rose-400 text-white border border-white/50" />}
                        </div>
                    </div>
                    {/* Recharts Donut — tỷ lệ nhóm đạt DKHT */}
                    <div className="flex-shrink-0 flex flex-col items-center gap-0.5 bg-black/20 rounded-md p-1.5 backdrop-blur-sm">
                        <DkhtDonut stats={compStats} />
                    </div>
                </div>
            </div>

            {/* Rank Strip */}
            {rankings.dt.total > 0 && (
                <div className="flex items-center gap-4 px-4 py-2 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex-shrink-0">Xếp hạng</span>
                    <div className="flex-1 grid grid-cols-3 gap-3">
                        <RankBadge rank={rankings.dt.rank} total={rankings.dt.total} label="DTQĐ" />
                        <RankBadge rank={rankings.tg.rank} total={rankings.tg.total} label="Trả chậm" />
                        <RankBadge rank={rankings.bk.rank} total={rankings.bk.total} label="Bán kèm" />
                    </div>
                </div>
            )}

            {/* KPI Grid with Micro Progress Bars */}
            <div className="grid divide-x divide-slate-100 dark:divide-slate-800" style={{ gridTemplateColumns: '1.15fr 0.8fr 0.8fr 1.25fr' }}>
                <div className="js-kpi-cell min-w-0 p-2.5 space-y-0.5">
                    <p className="js-kpi-label text-[11px] font-bold text-slate-400 uppercase tracking-wider">💰 DTQĐ</p>
                    <span className="js-kpi-value text-lg font-black text-slate-800 dark:text-white block">{empRevenue ? f(empRevenue.dtqd) : '-'}</span>
                    <MicroBar value={(empRevenue?.hieuQuaQD || 0) * 100} />
                    <div className="js-kpi-sub flex gap-2 text-[11px] text-slate-500 mt-1">
                        <span>DTLK: <strong className="text-sky-700">{empRevenue ? f(empRevenue.dtlk) : '-'}</strong></span>
                        <span>HQQĐ: <strong className="text-emerald-700">{empRevenue ? pct((empRevenue.hieuQuaQD || 0) * 100) : '-'}</strong></span>
                    </div>
                </div>
                <div className="js-kpi-cell min-w-0 p-2.5 space-y-0.5">
                    <p className="js-kpi-label text-[11px] font-bold text-slate-400 uppercase tracking-wider">💳 Trả Góp</p>
                    <span className="js-kpi-value text-lg font-black text-slate-800 dark:text-white block">{empInstallment ? pct(empInstallment.totalPercent) : '-'}</span>
                    <MicroBar value={empInstallment?.totalPercent || 0} />
                    <div className="js-kpi-sub flex gap-2 text-[11px] text-slate-500 mt-1">
                        <span>DT: <strong className="text-sky-700">{empInstallment ? f(empInstallment.totalDtSieuThi) : '-'}</strong></span>
                    </div>
                </div>
                <div className="js-kpi-cell min-w-0 p-2.5 space-y-0.5">
                    <p className="js-kpi-label text-[11px] font-bold text-slate-400 uppercase tracking-wider">🛒 Bán Kèm</p>
                    <span className="js-kpi-value text-lg font-black text-slate-800 dark:text-white block">{empBanKem ? pct(empBanKem.pctBillBk) : '-'}</span>
                    <MicroBar value={empBanKem?.pctBillBk || 0} />
                    <div className="js-kpi-sub flex gap-2 text-[11px] text-slate-500 mt-1">
                        <span>SP: <strong className="text-sky-700">{empBanKem ? pct(empBanKem.pctSpBk) : '-'}</strong></span>
                    </div>
                </div>
                <div className="js-kpi-cell min-w-0 p-2.5 space-y-0.5">
                    <p className="js-kpi-label text-[11px] font-bold text-slate-400 uppercase tracking-wider">🏆 Thưởng</p>
                    <span className="js-kpi-value text-lg font-black text-slate-800 dark:text-white block">{empBonus ? f(empBonus.tong || ((empBonus.erp || 0) + (empBonus.tNong || 0))) : '-'}</span>
                    <div className="js-kpi-sub flex gap-2 text-[11px] text-slate-500 mt-1.5">
                        <span>ERP: <strong className="text-sky-700">{empBonus ? f(empBonus.erp) : '-'}</strong></span>
                        <span>T.Nóng: <strong className="text-emerald-700">{empBonus ? f(empBonus.tNong) : '-'}</strong></span>
                    </div>
                    {empBonus?.pNong != null && <div className="js-kpi-sub text-[11px] text-slate-500">%T.Nóng: <strong className="text-amber-700">{pct(empBonus.pNong)}</strong></div>}
                </div>
            </div>
        </div>
    );
};

const PlaceholderContent: React.FC<{ title: string; message: string }> = ({ title, message }) => (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md shadow-sm p-4 sm:p-6 mb-8">
        <div className="mt-4 text-center py-12">
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">{title}</h3>
            <p className="mt-4 text-slate-600 max-w-md mx-auto">{message}</p>
        </div>
    </div>
);

export const IndividualCompetitionView = forwardRef<IndividualCompetitionViewHandle, IndividualCompetitionViewProps>(({
    allEmployees,
    selectedEmployee,
    onSelectIndividual,
    allCompetitionsByCriterion,
    employeeDataMap,
    employeeCompetitionTargets,
    selectedCompetitions,
    setSelectedCompetitions,
    supermarketName,
    revenueRows,
    installmentRows,
    banKemRows,
    bonusData
}, ref) => {
    const cardRef = useRef<HTMLDivElement>(null);
    const sortConfig = { key: 'completion', direction: 'desc' };
    const [isBatchExporting, setIsBatchExporting] = useState(false);
    const [exportProgress, setExportProgress] = useState<{current: number; total: number} | null>(null);
    const [isEmployeeSelectorOpen, setIsEmployeeSelectorOpen] = useState(false);
    const [employeeSearchTerm, setEmployeeSearchTerm] = useState('');
    const employeeSelectorRef = useRef<HTMLDivElement>(null);
    const [filterSearch, setFilterSearch] = useState('');
    const [nameOverrides] = useIndexedDBState<Record<string, string>>('competition-name-overrides', {});
    const [groupOverrides] = useIndexedDBState<Record<string, string>>('competition-group-overrides', {});
    const [customOrder] = useIndexedDBState<Record<string, string[]>>('competition-custom-order', {});
    const [groupingMode, setGroupingMode] = useIndexedDBState<'default' | 'configured'>('competition-grouping-mode-v2', 'configured');

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (employeeSelectorRef.current && !employeeSelectorRef.current.contains(event.target as Node)) {
                setIsEmployeeSelectorOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useImperativeHandle(ref, () => ({
        handleExportPNG,
        performBatchExport,
        isBatchExporting,
        exportProgress
    }));


    const groupedPerformanceData = useMemo((): GroupedPerformanceData => {
        if (!selectedEmployee) return {};

        if (groupingMode === 'default') {
            const result: GroupedPerformanceData = {};
            (['SLLK', 'DTLK', 'DTQĐ'] as Criterion[]).forEach(criterion => {
                const headers = allCompetitionsByCriterion[criterion]?.headers || [];
                const filteredHeaders = headers.filter(h => selectedCompetitions.has(h.originalTitle));
                if (filteredHeaders.length === 0) return;

                let rows = filteredHeaders.map(comp => {
                    const target = employeeCompetitionTargets.get(comp.originalTitle)?.get(selectedEmployee.originalName) ?? 0;
                    const actual = employeeDataMap.get(selectedEmployee.name)?.values[comp.title] ?? 0;
                    const { completion, remaining } = computePerformanceRow(target, actual);
                    return { name: shortenName(comp.originalTitle, nameOverrides), originalTitle: comp.originalTitle, target, actual, completion, remaining };
                }).filter(d => d.target > 0 || d.actual > 0);
                
                const criterionOrder = customOrder[criterion];
                if (criterionOrder && criterionOrder.length > 0) {
                    rows.sort((a, b) => {
                        const idxA = criterionOrder.indexOf(a.originalTitle);
                        const idxB = criterionOrder.indexOf(b.originalTitle);
                        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
                        if (idxA !== -1) return -1;
                        if (idxB !== -1) return 1;
                        return b.completion - a.completion;
                    });
                } else if (sortConfig.key === 'completion') {
                    rows.sort((a, b) => b.completion - a.completion);
                }

                if (rows.length > 0) result[criterion] = rows;
            });
            return result;
        } else {
            // Chế độ Tuỳ chỉnh: Gom nhóm theo cấu hình trong Target Thi đua
            const rawGroups: Record<string, CompetitionPerformanceItem[]> = {};
            
            (['SLLK', 'DTLK', 'DTQĐ'] as Criterion[]).forEach(criterion => {
                const headers = allCompetitionsByCriterion[criterion]?.headers || [];
                const filteredHeaders = headers.filter(h => selectedCompetitions.has(h.originalTitle));
                if (filteredHeaders.length === 0) return;

                filteredHeaders.forEach(comp => {
                    const target = employeeCompetitionTargets.get(comp.originalTitle)?.get(selectedEmployee.originalName) ?? 0;
                    const actual = employeeDataMap.get(selectedEmployee.name)?.values[comp.title] ?? 0;
                    const completion = target > 0 ? (actual / target) * 100 : 0;
                    const remaining = actual - target;
                    if (target <= 0 && actual <= 0) return;

                    const defaultGroup = getDefaultGroupLabel(criterion) || criterion;
                    const customGroup = (groupOverrides[comp.originalTitle] && groupOverrides[comp.originalTitle].trim())
                        ? groupOverrides[comp.originalTitle].trim()
                        : defaultGroup;

                    if (!rawGroups[customGroup]) {
                        rawGroups[customGroup] = [];
                    }
                    rawGroups[customGroup].push({
                        name: shortenName(comp.originalTitle, nameOverrides),
                        originalTitle: comp.originalTitle,
                        target,
                        actual,
                        completion,
                        remaining
                    });
                });
            });

            const sortedGroups: GroupedPerformanceData = {};
            Object.keys(rawGroups).forEach(groupKey => {
                const rows = [...rawGroups[groupKey]];
                const groupOrder = customOrder[groupKey];
                if (groupOrder && groupOrder.length > 0) {
                    rows.sort((a, b) => {
                        const idxA = groupOrder.indexOf(a.originalTitle);
                        const idxB = groupOrder.indexOf(b.originalTitle);
                        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
                        if (idxA !== -1) return -1;
                        if (idxB !== -1) return 1;
                        return b.completion - a.completion;
                    });
                } else if (sortConfig.key === 'completion') {
                    rows.sort((a, b) => b.completion - a.completion);
                }
                sortedGroups[groupKey] = rows;
            });
            return sortedGroups;
        }
    }, [selectedEmployee, groupingMode, allCompetitionsByCriterion, selectedCompetitions, employeeCompetitionTargets, employeeDataMap, nameOverrides, customOrder, sortConfig.key, groupOverrides]);
    
    const { showExportOptions } = useExportOptionsContext();

    const handleExportPNG = async (customFilename?: string, autoAction?: 'download' | 'share' | 'cancel' | null): Promise<'download' | 'share' | 'cancel' | null> => {
        if (!cardRef.current) return null;
        const originalCard = cardRef.current;
        try {
            const nameToUse = customFilename || selectedEmployee?.name || 'Nhân Viên';
            const filename = `Thi Đua - ${nameToUse.replace(/[\\/:*?"<>|]/g, '')}.png`;
            const blob = await exportElementAsImage(originalCard, filename, {
                mode: 'blob-only', forcedWidth: 640, elementsToHide: ['.js-individual-view-toolbar', '.export-button-component', '.no-print'], isCompactTable: true
            });
            if (blob) {
                if (autoAction === 'download') {
                    downloadBlob(blob, filename);
                    return 'download';
                } else if (autoAction === 'share') {
                    await shareBlob(blob, filename);
                    return 'share';
                } else {
                    return await showExportOptions(blob, filename);
                }
            }
            return null;
        } catch (err) {
            console.error('Failed to export image', err);
            return null;
        }
    };
    
    const performBatchExport = async () => {
        if (isBatchExporting) return;
        setIsBatchExporting(true);
        const employeesToExport = allEmployees;
        setExportProgress({ current: 0, total: employeesToExport.length });
        const originalSelection = selectedEmployee;
        
        let autoAction: 'download' | 'share' | 'cancel' | null = null;
        
        try {
            for (const [index, emp] of employeesToExport.entries()) {
                onSelectIndividual(emp);
                await new Promise(resolve => setTimeout(resolve, 300));
                const action = await handleExportPNG(emp.name, autoAction);
                if (action === 'cancel') break;
                autoAction = action;
                setExportProgress({ current: index + 1, total: employeesToExport.length });
            }
        } finally {
            onSelectIndividual(originalSelection);
            setIsBatchExporting(false);
            setExportProgress(null);
        }
    };

    const handleSelectAllCompetitions = () => {
         const allRelevantTitles = (Object.values(allCompetitionsByCriterion || {}).filter(Boolean) as { headers?: CompetitionHeader[] }[]).flatMap(c => c?.headers || []).map(h => h.originalTitle);
         setSelectedCompetitions(prev => {
             const newSet = new Set(prev);
             allRelevantTitles.forEach(t => newSet.add(t));
             return newSet;
         });
    };
    const handleDeselectAllCompetitions = () => {
        const allRelevantTitles = (Object.values(allCompetitionsByCriterion || {}).filter(Boolean) as { headers?: CompetitionHeader[] }[]).flatMap(c => c?.headers || []).map(h => h.originalTitle);
        setSelectedCompetitions(prev => {
             const newSet = new Set(prev);
             allRelevantTitles.forEach(t => newSet.delete(t));
             return newSet;
         });
    };
    const handleToggleCompetition = (competitionTitle: string) => {
        setSelectedCompetitions(prev => {
            const newSet = new Set(prev);
            if (newSet.has(competitionTitle)) newSet.delete(competitionTitle);
            else newSet.add(competitionTitle);
            return newSet;
        });
    };

    const filteredEmployees = useMemo(() => {
        if (!employeeSearchTerm) return allEmployees;
        return allEmployees.filter(emp => emp.name.toLowerCase().includes(employeeSearchTerm.toLowerCase()));
    }, [allEmployees, employeeSearchTerm]);

    // Lọc theo tên HIỂN THỊ (đã áp dụng nameOverrides), không phải originalTitle thô — nếu
    // không, gõ đúng tên đã đổi (VD "VIEON") sẽ không khớp được với tên gốc chưa đổi.
    const filterGroups = useMemo(() => {
        if (groupingMode === 'default') {
            return (Object.entries(allCompetitionsByCriterion || {}) as [string, { headers?: CompetitionHeader[] }][])
                .filter(([, data]) => Boolean(data && data.headers))
                .map(([criterion, data]) => ({
                    key: criterion,
                    label: `Tiêu chí ${criterion}`,
                    options: (data?.headers || [])
                        .filter(c => shortenName(c.originalTitle, nameOverrides).toLowerCase().includes(filterSearch.toLowerCase()))
                        .map(c => ({ key: c.originalTitle, label: shortenName(c.originalTitle, nameOverrides).toUpperCase(), checked: selectedCompetitions.has(c.originalTitle) }))
                }));
        } else {
            const groupMap = new Map<string, { key: string; label: string; checked: boolean }[]>();
            (Object.entries(allCompetitionsByCriterion || {}) as [string, { headers?: CompetitionHeader[] }][])
                .forEach(([criterion, data]) => {
                    (data?.headers || []).forEach(c => {
                        const defaultGroup = getDefaultGroupLabel(criterion) || criterion;
                        const customGroup = (groupOverrides[c.originalTitle] && groupOverrides[c.originalTitle].trim())
                            ? groupOverrides[c.originalTitle].trim()
                            : defaultGroup;
                        if (!groupMap.has(customGroup)) groupMap.set(customGroup, []);
                        if (shortenName(c.originalTitle, nameOverrides).toLowerCase().includes(filterSearch.toLowerCase())) {
                            groupMap.get(customGroup)!.push({
                                key: c.originalTitle,
                                label: shortenName(c.originalTitle, nameOverrides).toUpperCase(),
                                checked: selectedCompetitions.has(c.originalTitle)
                            });
                        }
                    });
                });
            return Array.from(groupMap.entries()).map(([groupName, options]) => ({
                key: groupName,
                label: `Nhóm ${groupName}`,
                options
            }));
        }
    }, [groupingMode, allCompetitionsByCriterion, groupOverrides, nameOverrides, filterSearch, selectedCompetitions]);

    if (allEmployees.length === 0) return <PlaceholderContent title="Báo cáo Cá nhân" message="Không có nhân viên nào trong bộ phận đã chọn." />;
    if (!selectedEmployee) return <PlaceholderContent title="Báo cáo Cá nhân" message="Vui lòng chọn một nhân viên để xem báo cáo chi tiết." />;

    const f = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 });
    const allRelevantHeaders = (Object.values(allCompetitionsByCriterion || {}).filter(Boolean) as { headers?: CompetitionHeader[] }[]).flatMap(c => c?.headers || []);
    const activeFilterCount = allRelevantHeaders.filter(c => selectedCompetitions.has(c.originalTitle)).length;
    const totalFilterCount = allRelevantHeaders.length;
    const isFiltered = activeFilterCount < totalFilterCount;
    const handleToggleAllCompetitions = () => {
        if (activeFilterCount === totalFilterCount) handleDeselectAllCompetitions();
        else handleSelectAllCompetitions();
    };

    return (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-none shadow-sm p-4 sm:p-6 mb-8">
                <div className="mb-4 flex flex-wrap items-center justify-end gap-2 px-1 no-print js-individual-view-toolbar relative z-50">
                    <div className="flex items-center gap-2 flex-wrap">
                        {/* Nút chuyển đổi Chế độ xem: Mặc định vs Tuỳ chỉnh (giống Tổng quan > Thi đua) */}
                        <Button
                            variant="unstyled"
                            size="none"
                            onClick={() => setGroupingMode(prev => prev === 'default' ? 'configured' : 'default')}
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-bold border transition-all cursor-pointer rounded-none ${
                                groupingMode === 'configured'
                                    ? 'border-sky-300 bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:border-sky-700 dark:text-sky-300'
                                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50'
                            }`}
                            title={
                                groupingMode === 'configured'
                                    ? 'Chế độ xem: Tuỳ chỉnh (Click để chuyển về Mặc định SLLK/DTLK/DTQĐ)'
                                    : 'Chế độ xem: Mặc định (Click để chuyển sang Tuỳ chỉnh theo nhóm target)'
                            }
                            aria-label="Chuyển đổi nhóm tiêu chí Mặc định / Tuỳ chỉnh"
                        >
                            <Layers className="h-3.5 w-3.5 text-sky-500 flex-shrink-0" />
                            <span>{groupingMode === 'configured' ? 'Tuỳ chỉnh' : 'Mặc định'}</span>
                        </Button>

                        {/* Lọc nhóm — dùng chung MultiSelectDropdown (components/shared/ui) để đồng nhất
                            style với các bộ lọc khác trong dự án */}
                        <MultiSelectDropdown
                            icon={<FilterIcon className="h-3.5 w-3.5 text-sky-500 flex-shrink-0" />}
                            triggerLabel="Lọc nhóm"
                            count={isFiltered ? activeFilterCount : undefined}
                            allLabel="Chọn tất cả"
                            allChecked={activeFilterCount === totalFilterCount}
                            onToggleAll={handleToggleAllCompetitions}
                            groups={filterGroups}
                            onToggleOption={handleToggleCompetition}
                            searchValue={filterSearch}
                            onSearchChange={setFilterSearch}
                            searchPlaceholder="Tìm nhóm thi đua..."
                            panelWidthClass="w-80"
                            maxHeightClass="max-h-[80vh]"
                        />
                        <div className="relative" ref={employeeSelectorRef}>
                            <Button variant="unstyled" size="none" onClick={() => setIsEmployeeSelectorOpen(!isEmployeeSelectorOpen)} className="flex items-center justify-between w-full md:w-56 px-3 py-1.5 text-[11px] font-bold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition-all rounded-none">
                                <span className="truncate">{selectedEmployee ? selectedEmployee.name : "Chọn nhân viên..."}</span>
                                <ChevronDownIcon className="h-3.5 w-3.5 ml-2 text-slate-400" />
                            </Button>
                            {isEmployeeSelectorOpen && (
                                <div className="absolute top-full right-0 mt-1 w-full md:w-64 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-none shadow-xl z-50 overflow-hidden flex flex-col max-h-72">
                                    <div className="p-2 border-b border-slate-200 dark:border-slate-700 bg-slate-50 sticky top-0">
                                        <Input type="text" value={employeeSearchTerm} onChange={(e) => setEmployeeSearchTerm(e.target.value)} placeholder="Tìm kiếm..." leftIcon="search" autoFocus />
                                    </div>
                                    <div className="overflow-y-auto flex-1">
                                        {filteredEmployees.length > 0 ? (
                                            filteredEmployees.map(emp => (
                                                <Button variant="unstyled" size="none" key={emp.originalName} onClick={() => { onSelectIndividual(emp); setIsEmployeeSelectorOpen(false); setEmployeeSearchTerm(''); }} className={`justify-start w-full text-left px-3 py-1.5 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors ${selectedEmployee.originalName === emp.originalName ? 'bg-sky-50 text-sky-700 font-medium' : 'text-slate-700 dark:text-slate-300'}`}>
                                                    {emp.name}
                                                </Button>
                                            ))
                                        ) : (
                                            <div className="p-3 text-center text-sm text-slate-500">Không tìm thấy</div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                <div className="w-full overflow-hidden px-4 pb-4" ref={cardRef}>
                    {/* === EMPLOYEE PROFILE CARD === */}
                    <EmployeeProfileCard
                        selectedEmployee={selectedEmployee}
                        supermarketName={supermarketName}
                        revenueRows={revenueRows}
                        installmentRows={installmentRows}
                        banKemRows={banKemRows}
                        bonusData={bonusData}
                        groupedPerformanceData={groupedPerformanceData}
                    />
                    <div className="overflow-x-auto scrollbar-hide rounded-none border border-slate-200 dark:border-slate-700 shadow-sm transition-shadow" style={{ WebkitOverflowScrolling: 'touch' }}>
                        <div className="text-center py-3 px-4 bg-slate-800">
                            <h3 className="text-xl font-black uppercase text-white leading-normal drop-shadow-sm">
                                {selectedEmployee.name} - THI ĐUA ĐẾN NGÀY {getYesterdayDateString()}
                            </h3>
                        </div>
                        
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="text-[11px] font-black uppercase tracking-wider">
                                    <th className="text-center px-3 py-2 border-b-[3px] border-b-slate-400 border-r border-slate-200 dark:border-slate-700 align-middle bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300">#</th>
                                    <th className="text-center px-3 py-2 border-b-[3px] border-b-slate-400 border-r border-slate-200 dark:border-slate-700 align-middle bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 whitespace-nowrap">NHÓM THI ĐUA</th>
                                    <th className="text-center px-3 py-2 border-b-[3px] border-b-slate-300 border-r border-slate-200 dark:border-slate-700 align-middle whitespace-nowrap bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300">M.TIÊU</th>
                                    <th className="text-center px-3 py-2 border-b-[3px] border-b-slate-300 border-r border-slate-200 dark:border-slate-700 align-middle whitespace-nowrap bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300">T.HIỆN</th>
                                    <th className="text-center px-3 py-2 border-b-[3px] border-b-slate-300 border-r border-slate-200 dark:border-slate-700 align-middle whitespace-nowrap bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300">%HT</th>
                                    <th className="text-center px-3 py-2 border-b-[3px] border-b-slate-300 border-r border-slate-200 dark:border-slate-700 align-middle whitespace-nowrap bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300">%DKHT</th>
                                    <th className="text-center px-3 py-2 border-b-[3px] border-b-slate-300 align-middle whitespace-nowrap bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300">C.LẠI</th>
                                </tr>
                            </thead>
                            <tbody>
                               {(() => {
                                   const now = new Date();
                                   const daysPassed = now.getDate() - 1;
                                   const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
                                   const groupKeys = groupingMode === 'configured'
                                       ? Object.keys(groupedPerformanceData)
                                       : (['SLLK', 'DTLK', 'DTQĐ'] as string[]).filter(c => groupedPerformanceData[c]?.length);

                                   return groupKeys.map((groupKey, groupIdx) => {
                                       const items = groupedPerformanceData[groupKey];
                                       if (!items || items.length === 0) return null;
                                       const theme = CRITERIA_THEMES[groupKey] || GROUP_PALETTES[groupIdx % GROUP_PALETTES.length];
                                       return (
                                           <React.Fragment key={groupKey}>
                                               <tr className={`${theme.main} ${theme.text} font-extrabold border-t-2 ${theme.border}`}>
                                                   <td colSpan={7} className="px-2 py-1.5 text-[11px] uppercase tracking-wider">
                                                       <span className={`px-2 py-0.5 rounded-none mr-2 ${theme.badge}`}>
                                                           {groupingMode === 'configured' ? 'Nhóm tiêu chí' : 'Tiêu chí'}
                                                       </span>
                                                       {groupKey} ({items.length})
                                                   </td>
                                               </tr>
                                               {items.map((item, index) => {
                                                   const remainingColor = item.remaining >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400';
                                                   const hasTarget = item.target > 0;
                                                   const dkht = hasTarget ? (calculateRunRate(item.actual, daysPassed, daysInMonth) / item.target) * 100 : 0;
                                                   // Chưa cấu hình target thì trung tính (xám pill mặc định), không phải "đang tệ" (đỏ) như khi target=0 vì actual thấp thật.
                                                   const dkhtPillColor = !hasTarget ? undefined : dkht >= 100 ? '#059669' : dkht >= 80 ? '#d97706' : '#e11d48';
                                                   return (
                                                       <tr key={`${groupKey}-${item.originalTitle}`}
                                                           /* Vạch trạng thái 3px — dùng lại ĐÚNG màu của ô %DKHT ngay bên cạnh. */
                                                           style={{ borderLeftColor: dkhtPillColor || 'var(--color-slate-200)' }}
                                                           className="border-l-[3px] hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors border-b border-slate-100 dark:border-slate-800/60 last:border-b-0">
                                                           <td className="px-2 py-[3px] text-center text-[13px] text-slate-400 tabular-nums border-r border-slate-100 dark:border-slate-800/60">#{index + 1}</td>
                                                           <td className="px-2 py-[3px] text-[13px] font-bold text-slate-800 dark:text-slate-100 whitespace-nowrap border-r border-slate-100 dark:border-slate-800/60 uppercase">
                                                               {item.name}
                                                           </td>
                                                           <td className="px-2 py-[3px] text-center text-[13px] font-bold text-slate-500 dark:text-slate-400 tabular-nums whitespace-nowrap border-r border-slate-100 dark:border-slate-800/60">{f.format(roundUp(item.target))}</td>
                                                           <td className="px-2 py-[3px] text-center text-[13px] font-bold text-slate-800 dark:text-slate-100 tabular-nums whitespace-nowrap border-r border-slate-100 dark:border-slate-800/60">{f.format(roundUp(item.actual))}</td>
                                                           <td className="px-2 py-[3px] text-center text-[13px] font-bold tabular-nums whitespace-nowrap border-r border-slate-100 dark:border-slate-800/60"><div className="flex items-center gap-1 justify-center"><span className="font-bold text-center w-10">{roundUp(item.completion).toFixed(0)}%</span><div className="w-10"><ProgressBar value={item.completion} /></div></div></td>
                                                           <td className="px-2 py-[3px] text-center tabular-nums whitespace-nowrap border-r border-slate-100 dark:border-slate-800/60"><Pill color={dkhtPillColor}>{daysPassed > 0 ? `${Math.round(dkht)}%` : '-'}</Pill></td>
                                                           <td className={`px-2 py-[3px] text-center text-[13px] font-bold ${remainingColor} tabular-nums whitespace-nowrap`}>{f.format(roundUp(item.remaining))}</td>
                                                       </tr>
                                                   );
                                               })}
                                           </React.Fragment>
                                       );
                                   });
                               })()}
                               {Object.keys(groupedPerformanceData).length === 0 && (<tr><td colSpan={7} className="px-2 py-4 text-center text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-slate-700">Chưa có chương trình thi đua nào được chọn từ bộ lọc hoặc không có dữ liệu cho nhân viên này.</td></tr>)}
                            </tbody>
                        </table>
                    </div>
                </div>
        </div>
    );
});
