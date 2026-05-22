
import React, { useRef, useState, useEffect, useMemo, forwardRef, useImperativeHandle } from 'react';
import { useExportOptionsContext } from '../../contexts/ExportOptionsContext';
import { FilterIcon, ChevronDownIcon } from '../Icons';
import { useIndexedDBState } from '../../hooks/useIndexedDBState';
import { Employee, Criterion, CompetitionHeader, RevenueRow } from '../../types/nhanVienTypes';
import { roundUp, shortenName, getYesterdayDateString } from '../../utils/nhanVienHelpers';
import { Switch } from '../dashboard/DashboardWidgets';
import { exportElementAsImage, downloadBlob, shareBlob } from '../../../services/uiService';
import { PieChart, Pie, Cell } from 'recharts';

const ProgressBar: React.FC<{ value: number }> = ({ value }) => {
    const percentage = Math.min(Math.max(value, 0), 200);
    const displayPercentage = Math.min(percentage, 100);
    let colorClass = 'bg-indigo-500';
    if (value >= 100) colorClass = 'bg-green-500';
    else if (value < 85) colorClass = 'bg-yellow-500';
    if (value < 50) colorClass = 'bg-red-500';
    return (
        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 my-1 relative overflow-hidden">
            <div className={`${colorClass} h-full rounded-full transition-all duration-500 ease-out`} style={{ width: `${displayPercentage}%` }}></div>
             {percentage > 100 && <div className="absolute top-0 left-0 h-full bg-green-300 rounded-full" style={{ width: `${Math.min(percentage - 100, 100)}%` }}></div>}
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
    revenueRows?: any[];
    installmentRows?: any[];
    banKemRows?: any[];
    bonusData?: Record<string, any>;
}

export interface IndividualCompetitionViewHandle {
    handleExportPNG: (customFilename?: string, autoAction?: 'download' | 'share' | 'cancel' | null) => Promise<'download' | 'share' | 'cancel' | null>;
    performBatchExport: () => Promise<void>;
    isBatchExporting: boolean;
}

// ─── Mini KPI Stat ───
const KpiStat: React.FC<{ label: string; value: string; sub?: string; accent?: string }> = ({ label, value, sub, accent = 'text-indigo-600' }) => (
    <div className="flex flex-col items-center min-w-0 px-2 py-1.5">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">{label}</span>
        <span className={`text-base font-black ${accent} leading-tight mt-0.5`}>{value}</span>
        {sub && <span className="text-[10px] text-slate-500 font-medium leading-tight">{sub}</span>}
    </div>
);

// ─── Competition Stat Pill ───
const StatPill: React.FC<{ count: number; label: string; color: string }> = ({ count, label, color }) => (
    <div className={`flex items-center justify-center gap-1 px-2 py-1 rounded text-[11px] font-bold min-w-[52px] ${color}`}>
        <span className="font-black">{count}</span>
        <span>{label}</span>
    </div>
);

// ─── SVG Donut Chart ───
const MiniDonut: React.FC<{ segments: { value: number; color: string }[]; centerText: string; size?: number }> = ({ segments, centerText, size = 64 }) => {
    const r = 24, c = 2 * Math.PI * r, total = segments.reduce((s, seg) => s + seg.value, 0);
    let offset = 0;
    return (
        <svg width={size} height={size} viewBox="0 0 64 64" className="flex-shrink-0">
            <circle cx="32" cy="32" r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="7" />
            {total > 0 && segments.filter(s => s.value > 0).map((seg, i) => {
                const d = (seg.value / total) * c, o = -offset; offset += d;
                return <circle key={i} cx="32" cy="32" r={r} fill="none" stroke={seg.color} strokeWidth="7" strokeDasharray={`${d} ${c - d}`} strokeDashoffset={o} strokeLinecap="butt" transform="rotate(-90 32 32)" className="transition-all duration-700" />;
            })}
            <text x="32" y="30" textAnchor="middle" className="fill-white font-black" style={{ fontSize: '14px' }}>{centerText}</text>
            <text x="32" y="41" textAnchor="middle" className="fill-white/50 font-bold" style={{ fontSize: '7px' }}>HOÀN THÀNH</text>
        </svg>
    );
};

// ─── DKHT Donut (Recharts) ───
const DONUT_COLORS = ['#34d399', '#fbbf24', '#94a3b8', '#f87171'];
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
            <p className="text-[9px] text-white/70 font-bold">{stats.total} nhóm</p>
        </div>
    );
};

// ─── Micro Progress Bar ───
const MicroBar: React.FC<{ value: number; max?: number }> = ({ value, max = 100 }) => {
    const pctVal = Math.min(Math.max((value / max) * 100, 0), 100);
    const color = value >= 60 ? 'bg-emerald-500' : value >= 30 ? 'bg-amber-500' : 'bg-red-500';
    return (<div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-[3px] mt-1 overflow-hidden"><div className={`${color} h-full rounded-full transition-all duration-500`} style={{ width: `${pctVal}%` }} /></div>);
};

// ─── Rank Badge ───
const RankBadge: React.FC<{ rank: number; total: number; label: string }> = ({ rank, total, label }) => {
    const pctVal = total > 0 ? ((total - rank + 1) / total) * 100 : 0;
    const color = rank <= 3 ? 'text-emerald-600 bg-emerald-50' : rank <= Math.ceil(total / 2) ? 'text-sky-600 bg-sky-50' : 'text-slate-500 bg-slate-100';
    const barColor = rank <= 3 ? 'bg-emerald-500' : rank <= Math.ceil(total / 2) ? 'bg-sky-500' : 'bg-slate-400';
    return (
        <div className="flex items-center gap-1.5 text-[10px]">
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
    revenueRows?: any[];
    installmentRows?: any[];
    banKemRows?: any[];
    bonusData?: Record<string, any>;
    groupedPerformanceData: any;
}> = ({ selectedEmployee, supermarketName, revenueRows, installmentRows, banKemRows, bonusData, groupedPerformanceData }) => {
    const [avatarSrc] = useIndexedDBState<string | null>(`avatar-${selectedEmployee.originalName}`, null);
    
    const empRevenue = useMemo(() => {
        if (!revenueRows) return null;
        return revenueRows.find((r: any) => r.type === 'employee' && r.originalName === selectedEmployee.originalName) as RevenueRow | undefined;
    }, [revenueRows, selectedEmployee]);

    const empInstallment = useMemo(() => {
        if (!installmentRows) return null;
        return installmentRows.find((r: any) => r.type === 'employee' && r.originalName === selectedEmployee.originalName);
    }, [installmentRows, selectedEmployee]);

    const empBanKem = useMemo(() => {
        if (!banKemRows) return null;
        return banKemRows.find((r: any) => r.type === 'employee' && r.originalName === selectedEmployee.originalName);
    }, [banKemRows, selectedEmployee]);

    const empBonus = useMemo(() => {
        if (!bonusData) return null;
        return bonusData[selectedEmployee.originalName];
    }, [bonusData, selectedEmployee]);

    // Rankings
    const rankings = useMemo(() => {
        const getRank = (rows: any[], key: string) => {
            const empRows = (rows || []).filter((r: any) => r.type === 'employee');
            const sorted = [...empRows].sort((a, b) => (b[key] || 0) - (a[key] || 0));
            const idx = sorted.findIndex((r: any) => r.originalName === selectedEmployee.originalName);
            return { rank: idx >= 0 ? idx + 1 : empRows.length, total: empRows.length };
        };
        return {
            dt: getRank(revenueRows || [], 'dtlk'),
            tg: getRank(installmentRows || [], 'totalPercent'),
            bk: getRank(banKemRows || [], 'pctBillBk'),
        };
    }, [revenueRows, installmentRows, banKemRows, selectedEmployee]);

    const compStats = useMemo(() => {
        const allItems: { name: string; completion: number; remaining: number; target: number; actual: number }[] = [];
        Object.values(groupedPerformanceData || {}).forEach((items: any) => {
            if (Array.isArray(items)) allItems.push(...items);
        });
        const now = new Date();
        const daysPassed = now.getDate() - 1;
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const total = allItems.length;
        // Calculate %DKHT for each item
        const dkhtValues = allItems.map(i => {
            if (daysPassed <= 0 || !i.target || i.target <= 0) return 0;
            return ((i.actual / daysPassed) * daysInMonth / i.target) * 100;
        });
        const dkhtDat = dkhtValues.filter(d => d >= 100).length;
        const dkhtGanDat = dkhtValues.filter(d => d >= 80 && d < 100).length;
        const dkhtChuaDat = dkhtValues.filter(d => d > 0 && d < 80).length;
        const noSale = dkhtValues.filter(d => d === 0).length;
        const avgDkht = total > 0 ? dkhtValues.reduce((s, d) => s + d, 0) / total : 0;
        return { total, dkhtDat, dkhtGanDat, dkhtChuaDat, noSale, avgDkht };
    }, [groupedPerformanceData]);

    const f = (v?: number) => v != null && !isNaN(v) ? roundUp(v).toLocaleString('vi-VN') : '-';
    const pct = (v?: number) => v != null && !isNaN(v) ? `${Math.round(v)}%` : '-';

    const donutSegments = [
        { value: compStats.dkhtDat, color: '#059669' },
        { value: compStats.dkhtGanDat, color: '#d97706' },
        { value: compStats.dkhtChuaDat, color: '#dc2626' },
        { value: compStats.noSale, color: '#94a3b8' },
    ];

    return (
        <div className="mb-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
            {/* Header gradient */}
            <div className="bg-gradient-to-br from-teal-500 via-cyan-500 to-blue-600 dark:from-slate-800 dark:via-slate-800 dark:to-slate-800 px-4 py-3 relative overflow-hidden border-b border-teal-600/30 dark:border-slate-700">
                <div className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: 'radial-gradient(circle at 20% 80%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
                <div className="flex items-center gap-4 relative z-10">
                    <div className="w-24 h-24 rounded-full border-[3px] border-white/40 overflow-hidden flex-shrink-0 shadow-lg">
                        {avatarSrc ? (
                            <img src={avatarSrc} alt={selectedEmployee.name} className="w-full h-full rounded-full object-cover" />
                        ) : (
                            <div className="w-full h-full rounded-full bg-white/20 flex items-center justify-center">
                                <span className="text-2xl font-black text-white">{selectedEmployee.name.charAt(selectedEmployee.name.lastIndexOf(' ') + 1) || '?'}</span>
                            </div>
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-black text-white uppercase truncate leading-tight drop-shadow-sm">{selectedEmployee.name}</h3>
                        <p className="text-[11px] text-white/70 font-medium mt-0.5">{selectedEmployee.department}</p>
                        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                            <StatPill count={compStats.dkhtDat} label="≥100%" color="bg-emerald-400 text-white border border-white/50" />
                            <StatPill count={compStats.dkhtGanDat} label="Gần đạt" color="bg-yellow-400 text-white border border-white/50" />
                            <StatPill count={compStats.dkhtChuaDat} label="<80%" color="bg-slate-400 text-white border border-white/50" />
                            {compStats.noSale > 0 && <StatPill count={compStats.noSale} label="No Sale" color="bg-red-400 text-white border border-white/50" />}
                        </div>
                    </div>
                    {/* Recharts Donut — tỷ lệ nhóm đạt DKHT */}
                    <div className="flex-shrink-0 flex flex-col items-center gap-0.5 bg-black/20 rounded-xl p-1.5 backdrop-blur-sm">
                        <DkhtDonut stats={compStats} />
                    </div>
                </div>
            </div>

            {/* Rank Strip */}
            {rankings.dt.total > 0 && (
                <div className="flex items-center gap-4 px-4 py-2 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex-shrink-0">Xếp hạng</span>
                    <div className="flex-1 grid grid-cols-3 gap-3">
                        <RankBadge rank={rankings.dt.rank} total={rankings.dt.total} label="DTQĐ" />
                        <RankBadge rank={rankings.tg.rank} total={rankings.tg.total} label="Trả chậm" />
                        <RankBadge rank={rankings.bk.rank} total={rankings.bk.total} label="Bán kèm" />
                    </div>
                </div>
            )}

            {/* KPI Grid with Micro Progress Bars */}
            <div className="grid grid-cols-4 divide-x divide-slate-100 dark:divide-slate-800">
                <div className="js-kpi-cell p-2.5 space-y-0.5">
                    <p className="js-kpi-label text-[10px] font-bold text-slate-400 uppercase tracking-wider">💰 DTQĐ</p>
                    <span className="js-kpi-value text-lg font-black text-slate-800 dark:text-white block">{empRevenue ? f(empRevenue.dtqd) : '-'}</span>
                    <MicroBar value={(empRevenue?.hieuQuaQD || 0) * 100} />
                    <div className="js-kpi-sub flex gap-3 text-[10px] text-slate-500 mt-1">
                        <span>DTLK: <strong className="text-sky-600">{empRevenue ? f(empRevenue.dtlk) : '-'}</strong></span>
                        <span>HQQĐ: <strong className="text-emerald-600">{empRevenue ? pct((empRevenue.hieuQuaQD || 0) * 100) : '-'}</strong></span>
                    </div>
                </div>
                <div className="js-kpi-cell p-2.5 space-y-0.5">
                    <p className="js-kpi-label text-[10px] font-bold text-slate-400 uppercase tracking-wider">💳 Trả Góp</p>
                    <span className="js-kpi-value text-lg font-black text-slate-800 dark:text-white block">{empInstallment ? pct(empInstallment.totalPercent) : '-'}</span>
                    <MicroBar value={empInstallment?.totalPercent || 0} />
                    <div className="js-kpi-sub flex gap-3 text-[10px] text-slate-500 mt-1">
                        <span>DT: <strong className="text-indigo-600">{empInstallment ? f(empInstallment.totalDtSieuThi) : '-'}</strong></span>
                    </div>
                </div>
                <div className="js-kpi-cell p-2.5 space-y-0.5">
                    <p className="js-kpi-label text-[10px] font-bold text-slate-400 uppercase tracking-wider">🛒 Bán Kèm</p>
                    <span className="js-kpi-value text-lg font-black text-slate-800 dark:text-white block">{empBanKem ? pct(empBanKem.pctBillBk) : '-'}</span>
                    <MicroBar value={empBanKem?.pctBillBk || 0} />
                    <div className="js-kpi-sub flex gap-3 text-[10px] text-slate-500 mt-1">
                        <span>SP: <strong className="text-violet-600">{empBanKem ? pct(empBanKem.pctSpBk) : '-'}</strong></span>
                    </div>
                </div>
                <div className="js-kpi-cell p-2.5 space-y-0.5">
                    <p className="js-kpi-label text-[10px] font-bold text-slate-400 uppercase tracking-wider">🏆 Thưởng</p>
                    <span className="js-kpi-value text-lg font-black text-slate-800 dark:text-white block">{empBonus ? f(empBonus.tong || ((empBonus.erp || 0) + (empBonus.tNong || 0))) : '-'}</span>
                    <div className="js-kpi-sub flex gap-3 text-[10px] text-slate-500 mt-1.5">
                        <span>ERP: <strong className="text-blue-600">{empBonus ? f(empBonus.erp) : '-'}</strong></span>
                        <span>T.Nóng: <strong className="text-orange-600">{empBonus ? f(empBonus.tNong) : '-'}</strong></span>
                    </div>
                    {empBonus?.pNong != null && <div className="js-kpi-sub text-[10px] text-slate-500">%T.Nóng: <strong className="text-amber-600">{pct(empBonus.pNong)}</strong></div>}
                </div>
            </div>
        </div>
    );
};

const PlaceholderContent: React.FC<{ title: string; message: string }> = ({ title, message }) => (
    <div>
        <div className="mt-4 text-center py-12"><p className="mt-4 text-slate-600 max-w-md mx-auto">{message}</p></div>
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
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [filterSearch, setFilterSearch] = useState('');
    const filterRef = useRef<HTMLDivElement>(null);
    const [nameOverrides] = useIndexedDBState<Record<string, string>>('competition-name-overrides', {});


    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
                setIsFilterOpen(false);
            }
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
        isBatchExporting
    }));


    const groupedPerformanceData = useMemo(() => {
        if (!selectedEmployee) return {};
        const result: Partial<Record<Criterion, { name: string; originalTitle: string; target: number; actual: number; completion: number; remaining: number }[]>> = {};
        
        (['DTLK', 'DTQĐ', 'SLLK'] as Criterion[]).forEach(criterion => {
            const headers = allCompetitionsByCriterion[criterion]?.headers || [];
            const filteredHeaders = headers.filter(h => selectedCompetitions.has(h.title));
            if (filteredHeaders.length === 0) return;

            let rows = filteredHeaders.map(comp => {
                const target = employeeCompetitionTargets.get(comp.originalTitle)?.get(selectedEmployee.originalName) ?? 0;
                const actual = employeeDataMap.get(selectedEmployee.name)?.values[comp.title] ?? 0;
                const completion = target > 0 ? (actual / target) * 100 : 0;
                const remaining = actual - target;
                return { name: shortenName(comp.originalTitle, nameOverrides), originalTitle: comp.originalTitle, target, actual, completion, remaining };
            }).filter(d => d.target > 0 || d.actual > 0);
            
            rows.sort((a, b) => {
                if (sortConfig.key === 'completion') return b.completion - a.completion;
                return 0;
            });

            if (rows.length > 0) result[criterion] = rows;
        });
        return result;
    }, [selectedEmployee, allCompetitionsByCriterion, employeeDataMap, employeeCompetitionTargets, selectedCompetitions, nameOverrides]);
    
    const { showExportOptions } = useExportOptionsContext();

    const handleExportPNG = async (customFilename?: string, autoAction?: 'download' | 'share' | 'cancel' | null): Promise<'download' | 'share' | 'cancel' | null> => {
        if (!cardRef.current) return null;
        const originalCard = cardRef.current;
        try {
            const nameToUse = customFilename || selectedEmployee?.name || 'NhanVien';
            const filename = `ThiDua_${nameToUse.replace(/[\s/]/g, '_')}.png`;
            const blob = await exportElementAsImage(originalCard, filename, {
                mode: 'blob-only', forcedWidth: 600, elementsToHide: ['.js-individual-view-toolbar', '.export-button-component', '.no-print']
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
         const allRelevantTitles = (Object.values(allCompetitionsByCriterion) as { headers: CompetitionHeader[] }[]).flatMap(c => c.headers).map(h => h.title);
         setSelectedCompetitions(prev => {
             const newSet = new Set(prev);
             allRelevantTitles.forEach(t => newSet.add(t));
             return newSet;
         });
    };
    const handleDeselectAllCompetitions = () => {
        const allRelevantTitles = (Object.values(allCompetitionsByCriterion) as { headers: CompetitionHeader[] }[]).flatMap(c => c.headers).map(h => h.title);
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

    if (allEmployees.length === 0) return <PlaceholderContent title="Báo cáo Cá nhân" message="Không có nhân viên nào trong bộ phận đã chọn." />;
    if (!selectedEmployee) return <PlaceholderContent title="Báo cáo Cá nhân" message="Vui lòng chọn một nhân viên để xem báo cáo chi tiết." />;

    const f = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 });
    const allRelevantHeaders = (Object.values(allCompetitionsByCriterion) as { headers: CompetitionHeader[] }[]).flatMap(c => c.headers);
    const activeFilterCount = allRelevantHeaders.filter(c => selectedCompetitions.has(c.title)).length;
    const totalFilterCount = allRelevantHeaders.length;
    const isFiltered = activeFilterCount < totalFilterCount;
    const isMobile = false; // Always show table view, even on mobile

    const getCriterionStyle = (crit: Criterion) => {
        switch (crit) {
            case 'SLLK': return { bg: 'bg-rose-600', text: 'text-white', badge: 'bg-rose-500/80', border: 'border-rose-700 dark:border-rose-800' };
            case 'DTLK': return { bg: 'bg-sky-600', text: 'text-white', badge: 'bg-sky-500/80', border: 'border-sky-700 dark:border-sky-800' };
            case 'DTQĐ': return { bg: 'bg-emerald-600', text: 'text-white', badge: 'bg-emerald-500/80', border: 'border-emerald-700 dark:border-emerald-800' };
            default: return { bg: 'bg-slate-600', text: 'text-white', badge: 'bg-slate-500/80', border: 'border-slate-700 dark:border-slate-800' };
        }
    };

    return (
        <div>
                <div className="mb-4 flex flex-wrap items-center justify-end gap-2 px-1 no-print js-individual-view-toolbar relative z-50">
                    <div className="flex items-center gap-2 flex-wrap">
                        <div className="relative" ref={filterRef}>
                            <button onClick={() => setIsFilterOpen(!isFilterOpen)} className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold border transition-all ${isFilterOpen || isFiltered ? 'bg-indigo-50 text-indigo-600 border-indigo-200' : 'bg-white text-slate-500 border-slate-200 hover:text-slate-700'}`}>
                                <FilterIcon className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">Lọc nhóm</span>
                                {isFiltered && <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-700 text-[9px] font-black rounded-full">{activeFilterCount}</span>}
                            </button>
                            {isFilterOpen && (
                                <div className="absolute right-0 top-full mt-1 w-80 max-h-[80vh] bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 z-50 flex flex-col overflow-hidden">
                                    <div className="p-2.5 border-b border-slate-200 dark:border-slate-700 bg-slate-50">
                                        <input type="text" value={filterSearch} onChange={(e) => setFilterSearch(e.target.value)} placeholder="Tìm nhóm thi đua..." className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 bg-white placeholder-slate-400" autoFocus />
                                        <div className="flex items-center justify-between mt-1.5">
                                            <button onClick={handleSelectAllCompetitions} className="text-[10px] font-bold text-indigo-600 hover:underline">Chọn tất cả</button>
                                            <button onClick={handleDeselectAllCompetitions} className="text-[10px] font-bold text-slate-500 hover:underline">Bỏ chọn</button>
                                        </div>
                                    </div>
                                    <div className="overflow-y-auto flex-1 p-1.5 space-y-3">
                                        {(Object.entries(allCompetitionsByCriterion) as [string, { headers: CompetitionHeader[] }][]).map(([criterion, competitionsData]) => {
                                            const competitions = competitionsData.headers || [];
                                            if (competitions.length === 0) return null;
                                            const filteredComps = competitions.filter(c => c.title.toLowerCase().includes(filterSearch.toLowerCase()));
                                            if (filteredComps.length === 0) return null;
                                            return (
                                                <div key={criterion}>
                                                    <h5 className="px-2 mb-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tiêu chí {criterion}</h5>
                                                    <div className="space-y-0.5">
                                                        {filteredComps.map(comp => {
                                                            const displayCompTitle = shortenName(comp.originalTitle, nameOverrides);
                                                            return (
                                                                <div key={comp.title} className="flex items-center justify-between p-1.5 rounded hover:bg-slate-100 transition-colors">
                                                                    <span onClick={() => handleToggleCompetition(comp.title)} className={`text-sm select-none cursor-pointer flex-1 pr-2 ${selectedCompetitions.has(comp.title) ? 'font-medium text-slate-900' : 'text-slate-600'}`}>{displayCompTitle}</span>
                                                                    <Switch checked={selectedCompetitions.has(comp.title)} onChange={() => handleToggleCompetition(comp.title)} />
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="relative" ref={employeeSelectorRef}>
                            <button onClick={() => setIsEmployeeSelectorOpen(!isEmployeeSelectorOpen)} className="flex items-center justify-between w-full md:w-56 px-3 py-1.5 text-[11px] font-bold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition-all">
                                <span className="truncate">{selectedEmployee ? selectedEmployee.name : "Chọn nhân viên..."}</span>
                                <ChevronDownIcon className="h-3.5 w-3.5 ml-2 text-slate-400" />
                            </button>
                            {isEmployeeSelectorOpen && (
                                <div className="absolute top-full right-0 mt-1 w-full md:w-64 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden flex flex-col max-h-72">
                                    <div className="p-2 border-b border-slate-200 dark:border-slate-700 bg-slate-50 sticky top-0">
                                        <input type="text" value={employeeSearchTerm} onChange={(e) => setEmployeeSearchTerm(e.target.value)} placeholder="Tìm kiếm..." className="w-full px-2.5 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-700 dark:text-slate-100" autoFocus />
                                    </div>
                                    <div className="overflow-y-auto flex-1">
                                        {filteredEmployees.length > 0 ? (
                                            filteredEmployees.map(emp => (
                                                <button key={emp.originalName} onClick={() => { onSelectIndividual(emp); setIsEmployeeSelectorOpen(false); setEmployeeSearchTerm(''); }} className={`w-full text-left px-3 py-1.5 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors ${selectedEmployee.originalName === emp.originalName ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-700 dark:text-slate-300'}`}>
                                                    {emp.name}
                                                </button>
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
                    <div className="overflow-x-auto scrollbar-hide border border-slate-200 dark:border-slate-700" style={{ WebkitOverflowScrolling: 'touch' }}>
                        <div className="text-center py-3 px-4 bg-gradient-to-r from-slate-800 via-slate-700 to-slate-600">
                            <h3 className="text-xl font-black uppercase text-white leading-normal drop-shadow-sm">
                                {selectedEmployee.name} - THI ĐUA ĐẾN NGÀY {getYesterdayDateString()}
                            </h3>
                        </div>
                        
                        {isMobile ? (
                            <div className="divide-y divide-slate-100 dark:divide-slate-700">
                                {(['DTLK', 'DTQĐ', 'SLLK'] as Criterion[]).map((criterion) => {
                                    const items = groupedPerformanceData[criterion];
                                    if (!items || items.length === 0) return null;
                                    const cStyle = getCriterionStyle(criterion);
                                    return (
                                        <div key={criterion}>
                                            <div className={`px-4 py-2.5 border-y ${cStyle.bg} ${cStyle.border}`}>
                                                <h4 className={`text-[11px] font-black uppercase ${cStyle.text} tracking-wider flex items-center gap-2`}>
                                                    <span className={`px-2 py-0.5 rounded ${cStyle.badge}`}>Tiêu chí</span>
                                                    {criterion}
                                                </h4>
                                            </div>
                                            <div className="divide-y divide-slate-50 dark:divide-slate-700/50">
                                                {items.map((item, index) => {
                                                    const remainingColor = item.remaining >= 0 ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20' : 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-900/30';
                                                    return (
                                                        <div key={`${criterion}-${item.originalTitle}`} className="px-4 py-3 bg-white dark:bg-slate-900">
                                                            <div className="flex justify-between items-start mb-2 gap-2">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 w-5 h-5 flex items-center justify-center rounded-full shrink-0">{index + 1}</span>
                                                                    <span className="font-bold text-[13px] text-indigo-700 dark:text-indigo-400 leading-tight">{item.name}</span>
                                                                </div>
                                                                <div className={`px-2 py-1.5 rounded-lg shrink-0 text-right min-w-[70px] ${remainingColor}`}>
                                                                    <span className="block text-[8px] font-bold uppercase mb-0.5 opacity-80">Còn Lại</span>
                                                                    <span className="block text-[12px] font-black tabular-nums leading-none tracking-tight">{f.format(roundUp(item.remaining))}</span>
                                                                </div>
                                                            </div>
                                                            
                                                            <div className="flex flex-col gap-1.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl p-3 border border-slate-100 dark:border-slate-700/50 mt-1">
                                                                <div className="flex justify-between items-center text-[10px]">
                                                                    <span className="text-slate-500 font-bold uppercase">Mục Tiêu / Thực Hiện</span>
                                                                    <span className="font-black tabular-nums tracking-wide flex items-baseline gap-1">
                                                                        <span className="text-slate-400">{f.format(roundUp(item.target))}</span>
                                                                        <span className="text-slate-300 dark:text-slate-600 text-[9px] mx-0.5">/</span>
                                                                        <span className="text-indigo-600 dark:text-indigo-400 text-[11px]">{f.format(roundUp(item.actual))}</span>
                                                                    </span>
                                                                </div>
                                                                <div className="flex items-center justify-between gap-3 mt-1">
                                                                    <div className="flex-1"><ProgressBar value={item.completion} /></div>
                                                                    <span className={`text-[13px] font-black w-14 text-right tabular-nums ${item.completion >= 100 ? 'text-green-600 dark:text-green-400' : 'text-slate-700 dark:text-slate-300'}`}>{roundUp(item.completion).toFixed(0)}%</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                                {Object.keys(groupedPerformanceData).length === 0 && (
                                    <div className="p-8 text-center text-slate-500 dark:text-slate-400 text-sm">Chưa có chương trình thi đua nào được chọn từ bộ lọc hoặc không có dữ liệu cho nhân viên này.</div>
                                )}
                            </div>
                        ) : (
                        <table className="w-full border-collapse compact-export-table">
                            <thead>
                                <tr className="text-[11px] font-black uppercase tracking-wider">
                                    <th className="text-center px-2 py-2 border-r border-slate-300 dark:border-slate-600 border-b-[3px] border-b-slate-400 align-middle bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200">#</th>
                                    <th className="text-left px-2 py-2 border-r border-slate-300 dark:border-slate-600 border-b-[3px] border-b-slate-400 align-middle bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200">NHÓM THI ĐUA</th>
                                    <th className="text-center px-2 py-2 border-r border-slate-300 dark:border-slate-600 border-b-[3px] border-b-sky-400 align-middle whitespace-nowrap bg-sky-100 dark:bg-sky-900/40 text-sky-800 dark:text-sky-300">M.TIÊU</th>
                                    <th className="text-center px-2 py-2 border-r border-slate-300 dark:border-slate-600 border-b-[3px] border-b-sky-400 align-middle whitespace-nowrap bg-sky-100 dark:bg-sky-900/40 text-sky-800 dark:text-sky-300">T.HIỆN</th>
                                    <th className="text-center px-2 py-2 border-r border-slate-300 dark:border-slate-600 border-b-[3px] border-b-emerald-400 align-middle whitespace-nowrap bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300">%HT</th>
                                    <th className="text-center px-2 py-2 border-r border-slate-300 dark:border-slate-600 border-b-[3px] border-b-violet-400 align-middle whitespace-nowrap bg-violet-100 dark:bg-violet-900/40 text-violet-800 dark:text-violet-300">%DKHT</th>
                                    <th className="text-center px-2 py-2 border-b-[3px] border-b-amber-400 align-middle whitespace-nowrap bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300">C.LẠI</th>
                                </tr>
                            </thead>
                            <tbody>
                               {(() => {
                                   const now = new Date();
                                   const daysPassed = now.getDate() - 1;
                                   const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
                                   return (['DTLK', 'DTQĐ', 'SLLK'] as Criterion[]).map((criterion, _criterionIndex) => {
                                       const items = groupedPerformanceData[criterion];
                                       if (!items || items.length === 0) return null;
                                       const cStyle = getCriterionStyle(criterion);
                                       return (
                                           <React.Fragment key={criterion}>
                                               <tr className={`${cStyle.bg} ${cStyle.text} font-extrabold border-t-2 ${cStyle.border}`}>
                                                   <td colSpan={7} className="px-2 py-1.5 text-[11px] uppercase tracking-wider">
                                                       <span className={`px-2 py-0.5 rounded mr-2 ${cStyle.badge}`}>Tiêu chí</span> {criterion}
                                                   </td>
                                               </tr>
                                               {items.map((item, index) => {
                                                   const remainingColor = item.remaining >= 0 ? 'text-green-600 dark:text-green-400' : 'text-rose-600 dark:text-rose-400';
                                                   const dkht = (daysPassed > 0 && item.target > 0) ? ((item.actual / daysPassed) * daysInMonth / item.target) * 100 : 0;
                                                   const dkhtColor = dkht >= 100 ? 'text-emerald-600 dark:text-emerald-400' : dkht >= 80 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400';
                                                   return (
                                                       <tr key={`${criterion}-${item.originalTitle}`} className="hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors border-b border-gray-100 dark:border-slate-700">
                                                           <td className="px-2 py-1 text-center text-[13px] text-slate-400 border-r border-slate-100 dark:border-slate-700/50 tabular-nums">{index + 1}</td>
                                                           <td className="px-2 py-1 text-[13px] font-bold text-indigo-600 dark:text-indigo-400 border-r border-slate-100 dark:border-slate-700/50">
                                                               {item.name}
                                                           </td>
                                                           <td className="px-2 py-1 text-center text-[13px] font-bold text-slate-500 dark:text-slate-400 border-r border-slate-100 dark:border-slate-700/50 tabular-nums whitespace-nowrap">{f.format(roundUp(item.target))}</td>
                                                           <td className="px-2 py-1 text-center text-[13px] font-bold text-slate-800 dark:text-slate-100 border-r border-slate-100 dark:border-slate-700/50 tabular-nums whitespace-nowrap">{f.format(roundUp(item.actual))}</td>
                                                           <td className="px-2 py-1 text-center text-[13px] font-bold border-r border-slate-100 dark:border-slate-700/50 tabular-nums whitespace-nowrap"><div className="flex items-center gap-1 justify-center"><span className="font-bold text-center w-10">{roundUp(item.completion).toFixed(0)}%</span><div className="w-10"><ProgressBar value={item.completion} /></div></div></td>
                                                           <td className={`px-2 py-1 text-center text-[13px] font-bold border-r border-slate-100 dark:border-slate-700/50 tabular-nums whitespace-nowrap ${dkhtColor}`}>{daysPassed > 0 ? `${Math.round(dkht)}%` : '-'}</td>
                                                           <td className={`px-2 py-1 text-center text-[13px] font-bold ${remainingColor} tabular-nums whitespace-nowrap`}>{f.format(roundUp(item.remaining))}</td>
                                                       </tr>
                                                   );
                                               })}
                                           </React.Fragment>
                                       )
                                   });
                               })()}
                               {Object.keys(groupedPerformanceData).length === 0 && (<tr><td colSpan={7} className="px-2 py-4 text-center text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-slate-700">Chưa có chương trình thi đua nào được chọn từ bộ lọc hoặc không có dữ liệu cho nhân viên này.</td></tr>)}
                            </tbody>
                        </table>
                        )}
                    </div>
                </div>
        </div>
    );
});
