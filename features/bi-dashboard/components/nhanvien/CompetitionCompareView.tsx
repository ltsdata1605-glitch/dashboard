import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Employee, Criterion, CompetitionHeader, RevenueRow } from '../../types/nhanVienTypes';
import { roundUp, shortenName, getYesterdayDateString } from '../../utils/nhanVienHelpers';
import { FilterIcon, ChevronDownIcon, UsersIcon } from '../Icons';
import { Switch } from '../dashboard/DashboardWidgets';
import { useIndexedDBState } from '../../hooks/useIndexedDBState';
import { exportElementAsImage, downloadBlob, shareBlob } from '../../../../services/uiService';
import { useExportOptionsContext } from '../../contexts/ExportOptionsContext';
import { CameraIcon } from 'lucide-react';

interface CompetitionCompareViewProps {
    allEmployees: Employee[];
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

const f = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 });
const fMoney = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 });
const pct = (v?: number) => v != null && !isNaN(v) ? `${Math.round(v)}%` : '-';

const TugOfWar: React.FC<{
    label: string;
    valA: number;
    valB: number;
    formatter: (v: number) => string;
    colorA?: string;
    textA?: string;
    colorB?: string;
    textB?: string;
}> = ({ label, valA, valB, formatter, colorA = 'bg-sky-500', textA = 'text-sky-600 dark:text-sky-400', colorB = 'bg-rose-500', textB = 'text-rose-600 dark:text-rose-400' }) => {
    const total = valA + valB;
    const pctA = total > 0 ? (valA / total) * 100 : 50;
    return (
        <div className="flex flex-col gap-1 w-full my-3 px-4">
            <div className="flex justify-between text-[14px] font-black items-end">
                <span className={textA}>{formatter(valA)}</span>
                <span className="text-slate-400 dark:text-slate-500 uppercase tracking-wider text-[10px] font-bold pb-0.5">{label}</span>
                <span className={textB}>{formatter(valB)}</span>
            </div>
            <div className="h-3 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden flex border border-white/20 dark:border-black/20 shadow-inner">
                <div className={`${colorA} h-full transition-all duration-700 relative`} style={{ width: `${pctA}%` }}>
                    <div className="absolute inset-0 bg-white/20 w-full" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3))' }}/>
                </div>
                <div className={`${colorB} h-full transition-all duration-700 flex-1 relative`}>
                    <div className="absolute inset-0 bg-black/10 w-full" style={{ background: 'linear-gradient(-90deg, transparent, rgba(0,0,0,0.1))' }}/>
                </div>
            </div>
        </div>
    );
};

const DeltaBadge: React.FC<{ a: number, b: number, mode?: 'pct' | 'actual' }> = ({ a, b, mode = 'pct' }) => {
    const diff = a - b;
    const formatDiff = (v: number) => mode === 'pct' ? `${v.toFixed(0)}%` : fMoney.format(v);

    if (diff > 0) return <span className="text-[11px] font-black text-sky-600 bg-sky-100 dark:bg-sky-900/30 px-2 py-0.5 rounded shadow-sm">◀ +{formatDiff(diff)}</span>;
    if (diff < 0) return <span className="text-[11px] font-black text-rose-600 bg-rose-100 dark:bg-rose-900/30 px-2 py-0.5 rounded shadow-sm">+{formatDiff(Math.abs(diff))} ▶</span>;
    return <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">Hòa</span>;
};

const ProfileAvatar: React.FC<{ emp: Employee, colorClass: string }> = ({ emp, colorClass }) => {
    const [avatarSrc] = useIndexedDBState<string | null>(`avatar-${emp.originalName}`, null);
    return (
        <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full border-4 ${colorClass} overflow-hidden shadow-lg mx-auto bg-white flex items-center justify-center shrink-0`}>
            {avatarSrc ? (
                <img src={avatarSrc} alt={emp.name} className="w-full h-full object-cover" />
            ) : (
                <span className="text-xl font-black text-slate-400">{emp.name.charAt(emp.name.lastIndexOf(' ') + 1) || '?'}</span>
            )}
        </div>
    );
};

const EmployeeSelector: React.FC<{
    allEmployees: Employee[];
    selectedEmployee: Employee | null;
    onSelect: (emp: Employee) => void;
    placeholder: string;
    alignRight?: boolean;
}> = ({ allEmployees, selectedEmployee, onSelect, placeholder, alignRight = false }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filtered = allEmployees.filter(e => e.name.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="relative w-full max-w-[200px]" ref={ref}>
            <button onClick={() => setIsOpen(!isOpen)} className="flex items-center justify-between w-full px-3 py-1.5 text-[12px] font-bold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition-all rounded shadow-sm">
                <span className="truncate">{selectedEmployee ? selectedEmployee.name : placeholder}</span>
                <ChevronDownIcon className="h-3.5 w-3.5 ml-2 text-slate-400 shrink-0" />
            </button>
            {isOpen && (
                <div className={`absolute top-full ${alignRight ? 'right-0' : 'left-0'} mt-1 w-64 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden flex flex-col max-h-72`}>
                    <div className="p-2 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 sticky top-0">
                        <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Tìm nhân viên..." className="w-full px-2.5 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-700 dark:text-slate-100" autoFocus />
                    </div>
                    <div className="overflow-y-auto flex-1">
                        {filtered.length > 0 ? filtered.map(emp => (
                            <button key={emp.originalName} onClick={() => { onSelect(emp); setIsOpen(false); setSearchTerm(''); }} className={`w-full text-left px-3 py-1.5 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors ${selectedEmployee?.originalName === emp.originalName ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 font-medium' : 'text-slate-700 dark:text-slate-300'}`}>
                                {emp.name}
                            </button>
                        )) : <div className="p-3 text-center text-sm text-slate-500">Không tìm thấy</div>}
                    </div>
                </div>
            )}
        </div>
    );
};

const CompetitionCompareView: React.FC<CompetitionCompareViewProps> = ({
    allEmployees,
    allCompetitionsByCriterion,
    employeeDataMap,
    employeeCompetitionTargets,
    selectedCompetitions,
    revenueRows,
    installmentRows,
    banKemRows,
    bonusData
}) => {
    const [empA, setEmpA] = useState<Employee | null>(allEmployees[0] || null);
    const [empB, setEmpB] = useState<Employee | null>(allEmployees.length > 1 ? allEmployees[1] : null);
    const [displayMode, setDisplayMode] = useState<'pct' | 'actual'>('pct');
    const cardRef = useRef<HTMLDivElement>(null);
    const { showExportOptions } = useExportOptionsContext();
    const [nameOverrides] = useIndexedDBState<Record<string, string>>('competition-name-overrides', {});

    const getEmpStats = (emp: Employee | null) => {
        if (!emp) return { dtqd: 0, dtlk: 0, tg: 0, bk: 0, thuong: 0, dtRank: 0, tgRank: 0, bkRank: 0, compStats: { total: 0, dkhtDat: 0, noSale: 0 } };
        
        const rev = revenueRows?.find(r => r.type === 'employee' && r.originalName === emp.originalName);
        const inst = installmentRows?.find(r => r.type === 'employee' && r.originalName === emp.originalName);
        const bk = banKemRows?.find(r => r.type === 'employee' && r.originalName === emp.originalName);
        const bns = bonusData?.[emp.originalName];

        const getRank = (rows: any[], key: string) => {
            const empRows = (rows || []).filter(r => r.type === 'employee');
            const sorted = [...empRows].sort((a, b) => (b[key] || 0) - (a[key] || 0));
            const idx = sorted.findIndex(r => r.originalName === emp.originalName);
            return idx >= 0 ? idx + 1 : empRows.length;
        };

        let dkhtDat = 0, noSale = 0, total = 0, dkhtNotDat = 0;
        const now = new Date();
        const daysPassed = now.getDate() - 1;
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

        (['DTLK', 'DTQĐ', 'SLLK'] as Criterion[]).forEach(crit => {
            const headers = allCompetitionsByCriterion[crit]?.headers || [];
            headers.filter(h => selectedCompetitions.has(h.title)).forEach(comp => {
                const target = employeeCompetitionTargets.get(comp.originalTitle)?.get(emp.originalName) ?? 0;
                const actual = employeeDataMap.get(emp.name)?.values[comp.title] ?? 0;
                if (target > 0 || actual > 0) {
                    total++;
                    const dkht = (daysPassed > 0 && target > 0) ? ((actual / daysPassed) * daysInMonth / target) * 100 : 0;
                    if (dkht >= 100) dkhtDat++;
                    else dkhtNotDat++;
                    if (dkht === 0) noSale++;
                }
            });
        });

        return {
            dtqd: rev?.dtqd || 0,
            dtlk: rev?.dtlk || 0,
            tg: inst?.totalPercent || 0,
            bk: bk?.pctBillBk || 0,
            thuong: bns ? (bns.tong || ((bns.erp || 0) + (bns.tNong || 0))) : 0,
            dtRank: getRank(revenueRows || [], 'dtlk'),
            tgRank: getRank(installmentRows || [], 'totalPercent'),
            bkRank: getRank(banKemRows || [], 'pctBillBk'),
            compStats: { total, dkhtDat, dkhtNotDat, noSale }
        };
    };

    const statsA = useMemo(() => getEmpStats(empA), [empA, revenueRows, installmentRows, banKemRows, bonusData, allCompetitionsByCriterion, selectedCompetitions, employeeDataMap, employeeCompetitionTargets]);
    const statsB = useMemo(() => getEmpStats(empB), [empB, revenueRows, installmentRows, banKemRows, bonusData, allCompetitionsByCriterion, selectedCompetitions, employeeDataMap, employeeCompetitionTargets]);

    const compRows = useMemo(() => {
        if (!empA || !empB) return [];
        const rows: any[] = [];
        (['DTLK', 'DTQĐ', 'SLLK'] as Criterion[]).forEach(crit => {
            const headers = allCompetitionsByCriterion[crit]?.headers || [];
            const filteredHeaders = headers.filter(h => selectedCompetitions.has(h.title));
            if (filteredHeaders.length === 0) return;

            filteredHeaders.forEach(comp => {
                const targetA = employeeCompetitionTargets.get(comp.originalTitle)?.get(empA.originalName) ?? 0;
                const actualA = employeeDataMap.get(empA.name)?.values[comp.title] ?? 0;
                const pctA = targetA > 0 ? (actualA / targetA) * 100 : 0;

                const targetB = employeeCompetitionTargets.get(comp.originalTitle)?.get(empB.originalName) ?? 0;
                const actualB = employeeDataMap.get(empB.name)?.values[comp.title] ?? 0;
                const pctB = targetB > 0 ? (actualB / targetB) * 100 : 0;

                if (targetA > 0 || actualA > 0 || targetB > 0 || actualB > 0) {
                    rows.push({
                        criterion: crit,
                        originalTitle: comp.originalTitle,
                        name: shortenName(comp.originalTitle, nameOverrides),
                        pctA,
                        pctB,
                        actualA,
                        actualB
                    });
                }
            });
        });
        return rows;
    }, [empA, empB, allCompetitionsByCriterion, selectedCompetitions, employeeDataMap, employeeCompetitionTargets, nameOverrides]);

    const handleExportPNG = async () => {
        if (!cardRef.current) return;
        const filename = `SoSanh_${empA?.name.replace(/[\s/]/g, '')}_vs_${empB?.name.replace(/[\s/]/g, '')}.png`;
        const blob = await exportElementAsImage(cardRef.current, filename, { mode: 'blob-only', elementsToHide: ['.no-print'] });
        if (blob) await showExportOptions(blob, filename);
    };

    return (
        <div className="space-y-4 pb-10">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-4 px-2 no-print relative z-50">
                <div className="flex flex-1 items-center gap-4 max-w-2xl mx-auto">
                    <div className="flex-1 flex justify-end">
                        <EmployeeSelector allEmployees={allEmployees} selectedEmployee={empA} onSelect={setEmpA} placeholder="Chọn đối thủ 1" />
                    </div>
                    <div className="w-8 h-8 rounded-full bg-slate-800 text-white font-black italic flex items-center justify-center shrink-0 shadow-lg border-2 border-slate-700 text-sm">VS</div>
                    <div className="flex-1 flex justify-start">
                        <EmployeeSelector allEmployees={allEmployees} selectedEmployee={empB} onSelect={setEmpB} placeholder="Chọn đối thủ 2" alignRight />
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded border border-slate-200 dark:border-slate-700">
                        <button onClick={() => setDisplayMode('pct')} className={`px-2 py-1 text-[10px] font-bold rounded transition-all ${displayMode === 'pct' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>%HT</button>
                        <button onClick={() => setDisplayMode('actual')} className={`px-2 py-1 text-[10px] font-bold rounded transition-all ${displayMode === 'actual' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Thực hiện</button>
                    </div>
                    <button onClick={handleExportPNG} title="Xuất ảnh" className="p-1.5 flex items-center justify-center text-slate-500 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded shadow-sm hover:text-slate-700 transition-colors">
                        <CameraIcon className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {(!empA || !empB) ? (
                <div className="py-20 text-center text-slate-500 font-bold bg-slate-50 dark:bg-slate-900/50 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                    Vui lòng chọn 2 nhân viên để bắt đầu so sánh.
                </div>
            ) : (
                <div ref={cardRef} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                    {/* Header Banner */}
                    <div className="bg-gradient-to-b from-slate-800 to-slate-900 p-6 sm:p-8 flex items-center justify-between relative overflow-hidden">
                        <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]" />
                        
                        {/* NV A */}
                        <div className="flex-1 flex flex-col items-center relative z-10">
                            <ProfileAvatar emp={empA} colorClass="border-sky-500" />
                            <h3 className="text-lg sm:text-xl font-black text-white mt-3 text-center uppercase tracking-tight leading-tight">{empA.name}</h3>
                            <p className="text-[11px] text-sky-300 font-bold uppercase tracking-wider">{empA.department}</p>
                            <div className="flex items-center gap-2 mt-3 flex-wrap justify-center">
                                <div className="px-2 py-0.5 bg-emerald-500/20 border border-emerald-500/30 rounded text-emerald-400 text-[10px] font-black">{statsA.compStats.dkhtDat} Đạt 100%</div>
                                {statsA.compStats.noSale > 0 && <div className="px-2 py-0.5 bg-rose-500/20 border border-rose-500/30 rounded text-rose-400 text-[10px] font-black">{statsA.compStats.noSale} No Sale</div>}
                            </div>
                        </div>

                        {/* VS Center */}
                        <div className="flex flex-col items-center justify-center shrink-0 px-2 sm:px-6 relative z-10">
                            <div className="text-4xl sm:text-6xl font-black italic text-transparent bg-clip-text bg-gradient-to-b from-slate-200 to-slate-600 drop-shadow-xl" style={{ WebkitTextStroke: '1px rgba(255,255,255,0.1)' }}>VS</div>
                        </div>

                        {/* NV B */}
                        <div className="flex-1 flex flex-col items-center relative z-10">
                            <ProfileAvatar emp={empB} colorClass="border-rose-500" />
                            <h3 className="text-lg sm:text-xl font-black text-white mt-3 text-center uppercase tracking-tight leading-tight">{empB.name}</h3>
                            <p className="text-[11px] text-rose-300 font-bold uppercase tracking-wider">{empB.department}</p>
                            <div className="flex items-center gap-2 mt-3 flex-wrap justify-center">
                                <div className="px-2 py-0.5 bg-emerald-500/20 border border-emerald-500/30 rounded text-emerald-400 text-[10px] font-black">{statsB.compStats.dkhtDat} Đạt 100%</div>
                                {statsB.compStats.noSale > 0 && <div className="px-2 py-0.5 bg-rose-500/20 border border-rose-500/30 rounded text-rose-400 text-[10px] font-black">{statsB.compStats.noSale} No Sale</div>}
                            </div>
                        </div>
                    </div>

                    {/* Tug of war bars */}
                    <div className="px-2 sm:px-6 py-6 bg-slate-50 dark:bg-[#151515] border-b border-slate-200 dark:border-slate-800 space-y-2">
                        <TugOfWar label="Thưởng Thu Nhập" valA={statsA.thuong} valB={statsB.thuong} formatter={fMoney.format} />
                        <TugOfWar label="Doanh Thu QĐ" valA={statsA.dtqd} valB={statsB.dtqd} formatter={f.format} colorA="bg-emerald-500" textA="text-emerald-600 dark:text-emerald-400" colorB="bg-amber-500" textB="text-amber-600 dark:text-amber-400" />
                        <TugOfWar label="Trả Chậm" valA={statsA.tg} valB={statsB.tg} formatter={pct} colorA="bg-indigo-500" textA="text-indigo-600 dark:text-indigo-400" colorB="bg-fuchsia-500" textB="text-fuchsia-600 dark:text-fuchsia-400" />
                        <TugOfWar label="Bán Kèm" valA={statsA.bk} valB={statsB.bk} formatter={pct} colorA="bg-cyan-500" textA="text-cyan-600 dark:text-cyan-400" colorB="bg-pink-500" textB="text-pink-600 dark:text-pink-400" />
                    </div>

                    {/* Ranks Strip */}
                    <div className="grid grid-cols-2 divide-x divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                        <div className="py-3 px-2 sm:px-4 flex justify-around items-center">
                            <div className="text-center"><p className="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase mb-0.5">Rank DT</p><span className="text-base sm:text-lg font-black text-sky-600">#{statsA.dtRank}</span></div>
                            <div className="text-center"><p className="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase mb-0.5">≥100%</p><span className="text-base sm:text-lg font-black text-indigo-600">{statsA.compStats.dkhtDat}</span></div>
                            <div className="text-center"><p className="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase mb-0.5">&lt;100%</p><span className="text-base sm:text-lg font-black text-cyan-600">{statsA.compStats.dkhtNotDat}</span></div>
                            <div className="text-center"><p className="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase mb-0.5">% NH Đạt</p><span className="text-base sm:text-lg font-black text-emerald-600">{statsA.compStats.total > 0 ? Math.round((statsA.compStats.dkhtDat / statsA.compStats.total) * 100) : 0}%</span></div>
                        </div>
                        <div className="py-3 px-2 sm:px-4 flex justify-around items-center">
                            <div className="text-center"><p className="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase mb-0.5">Rank DT</p><span className="text-base sm:text-lg font-black text-rose-600">#{statsB.dtRank}</span></div>
                            <div className="text-center"><p className="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase mb-0.5">≥100%</p><span className="text-base sm:text-lg font-black text-fuchsia-600">{statsB.compStats.dkhtDat}</span></div>
                            <div className="text-center"><p className="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase mb-0.5">&lt;100%</p><span className="text-base sm:text-lg font-black text-pink-600">{statsB.compStats.dkhtNotDat}</span></div>
                            <div className="text-center"><p className="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase mb-0.5">% NH Đạt</p><span className="text-base sm:text-lg font-black text-amber-600">{statsB.compStats.total > 0 ? Math.round((statsB.compStats.dkhtDat / statsB.compStats.total) * 100) : 0}%</span></div>
                        </div>
                    </div>

                    {/* Detailed Competition Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-100 dark:bg-slate-800 text-[10px] font-black uppercase text-slate-500 tracking-wider">
                                    <th className="px-4 py-3 border-b-2 border-slate-200 dark:border-slate-700 w-10 text-center">#</th>
                                    <th className="px-4 py-3 border-b-2 border-slate-200 dark:border-slate-700">Chương trình thi đua</th>
                                    <th className="px-2 py-3 border-b-2 border-sky-400 text-center text-sky-700 dark:text-sky-300 w-24">{empA.name.split(' ').pop()}</th>
                                    <th className="px-2 py-3 border-b-2 border-slate-300 dark:border-slate-600 text-center w-28">Chênh Lệch</th>
                                    <th className="px-2 py-3 border-b-2 border-rose-400 text-center text-rose-700 dark:text-rose-300 w-24">{empB.name.split(' ').pop()}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {compRows.length > 0 ? (
                                    (['DTLK', 'DTQĐ', 'SLLK'] as Criterion[]).map(crit => {
                                        const critRows = compRows.filter(r => r.criterion === crit);
                                        if (critRows.length === 0) return null;
                                        return (
                                            <React.Fragment key={crit}>
                                                <tr className="bg-slate-50 dark:bg-slate-800/50">
                                                    <td colSpan={5} className="px-4 py-1.5 text-[10px] font-black uppercase text-slate-700 dark:text-slate-300 tracking-wider border-y border-slate-200 dark:border-slate-700">
                                                        {crit}
                                                    </td>
                                                </tr>
                                                {critRows.map((row, idx) => (
                                                    <tr key={`${row.criterion}-${row.originalTitle}`} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                        <td className="px-4 py-2.5 text-[11px] font-bold text-slate-400 text-center border-r border-slate-100 dark:border-slate-800/50">{idx + 1}</td>
                                                        <td className="px-4 py-2.5 border-r border-slate-100 dark:border-slate-800/50">
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="text-[12px] font-bold text-slate-800 dark:text-slate-200">{row.name}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-2 py-2.5 text-center text-[13px] font-black text-sky-600 dark:text-sky-400 bg-sky-50/30 dark:bg-sky-900/10">
                                                            {displayMode === 'pct' ? `${row.pctA.toFixed(0)}%` : fMoney.format(row.actualA)}
                                                        </td>
                                                        <td className="px-2 py-2.5 text-center">
                                                            <div className="flex justify-center">
                                                                <DeltaBadge a={displayMode === 'pct' ? row.pctA : row.actualA} b={displayMode === 'pct' ? row.pctB : row.actualB} mode={displayMode} />
                                                            </div>
                                                        </td>
                                                        <td className="px-2 py-2.5 text-center text-[13px] font-black text-rose-600 dark:text-rose-400 bg-rose-50/30 dark:bg-rose-900/10">
                                                            {displayMode === 'pct' ? `${row.pctB.toFixed(0)}%` : fMoney.format(row.actualB)}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </React.Fragment>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan={5} className="py-8 text-center text-slate-500 font-medium">Không có dữ liệu thi đua chung giữa 2 nhân viên.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CompetitionCompareView;
