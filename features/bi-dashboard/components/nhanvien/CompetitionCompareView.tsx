import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Employee, Criterion, CompetitionHeader, RevenueRow, InstallmentRow, CrossSellingRow, BonusMetrics } from '../../types/nhanVienTypes';
import { shortenName, isSameEmployee } from '../../utils/nhanVienHelpers';
import { getBonusForEmployee } from '../../utils/bonusParser';
import { ChevronDownIcon, CameraIcon, ImagesIcon } from '../Icons';
import { useIndexedDBState } from '../../hooks/useIndexedDBState';
import { useEmployeeAvatar } from '../../hooks/useEmployeeAvatar';
import { Button } from '../../../../components/shared/ui/Button';
import { Input } from '../../../../components/shared/ui/Input';
import { exportElementAsImage, downloadBlob, shareBlob } from '../../services/uiService';
import { useExportOptionsContext } from '../../contexts/ExportOptionsContext';
import { calculateRunRate } from '../../services/metricService';

interface CompetitionCompareViewProps {
    allEmployees: Employee[];
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
}> = ({ label, valA, valB, formatter, colorA = 'bg-sky-600', textA = 'text-sky-700 dark:text-sky-400', colorB = 'bg-rose-600', textB = 'text-rose-700 dark:text-rose-400' }) => {
    const total = valA + valB;
    const pctA = total > 0 ? (valA / total) * 100 : 50;
    /* Chuẩn "Bảng điều khiển ca trực": vạch 3px, không bo, không gradient phủ, không shadow-inner.
       Mỗi người MỘT màu xuyên suốt (A = sky, B = rose) để mắt học một lần rồi đọc mọi thanh
       — bản cũ đổi cặp màu theo từng chỉ tiêu, mỗi thanh phải đọc lại chú giải. */
    return (
        <div className="flex flex-col gap-1 w-full py-2 px-4 border-b border-slate-100 dark:border-slate-800 last:border-b-0">
            <div className="flex justify-between text-[14px] font-bold items-end tabular-nums">
                <span className={textA}>{formatter(valA)}</span>
                <span className="text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[11px] font-bold pb-0.5">{label}</span>
                <span className={textB}>{formatter(valB)}</span>
            </div>
            <div className="h-[3px] w-full bg-slate-200 dark:bg-slate-700 flex">
                <div className={`${colorA} h-full`} style={{ width: `${pctA}%` }} />
                <div className={`${colorB} h-full flex-1`} />
            </div>
        </div>
    );
};

const DeltaBadge: React.FC<{ a: number, b: number, mode?: 'pct' | 'actual' }> = ({ a, b, mode = 'pct' }) => {
    const diff = a - b;
    const formatDiff = (v: number) => mode === 'pct' ? `${v.toFixed(0)}%` : fMoney.format(v);

    // Epsilon tránh sai số dấu phẩy động (vd 2000/3000*100 vs 4000/6000*100) hiển thị nhầm
    // "+0%" thay vì "Hòa" dù 2 tỉ lệ về mặt toán học là bằng nhau.
    if (diff > 1e-9) return <span className="text-[11px] font-bold text-sky-700 dark:text-sky-400 tabular-nums">◀ +{formatDiff(diff)}</span>;
    if (diff < -1e-9) return <span className="text-[11px] font-bold text-rose-700 dark:text-rose-400 tabular-nums">+{formatDiff(Math.abs(diff))} ▶</span>;
    return <span className="text-[11px] font-bold text-slate-400">Hòa</span>;
};

const ProfileAvatar: React.FC<{ emp: Employee; colorClass: string; fallbackEmployees?: RevenueRow[] }> = ({ emp, colorClass, fallbackEmployees }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { avatarSrc, uploadAvatar } = useEmployeeAvatar({
        employeeName: emp.name,
        originalName: emp.originalName,
        fallbackEmployees: fallbackEmployees?.filter(r => r.type === 'employee')
    });

    const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            await uploadAvatar(file);
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div 
            className={`relative group w-10 h-10 rounded-full border-2 ${colorClass} overflow-hidden bg-white flex items-center justify-center shrink-0 cursor-pointer hover:opacity-90 transition-opacity`}
            onClick={() => fileInputRef.current?.click()}
            title="Bấm để tải lên hoặc đổi ảnh đại diện"
        >
            {avatarSrc ? (
                <img src={avatarSrc} alt={emp.name} className="w-full h-full object-cover rounded-full" />
            ) : (
                <span className="text-sm font-bold text-slate-400">{emp.name.charAt(emp.name.lastIndexOf(' ') + 1) || '?'}</span>
            )}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white no-print">
                <CameraIcon className="w-5 h-5 drop-shadow-md" />
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
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
            <Button variant="unstyled" size="none" onClick={() => setIsOpen(!isOpen)} className="flex items-center justify-between w-full px-3 py-1.5 text-[12px] font-bold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition-all rounded shadow-sm">
                <span className="truncate">{selectedEmployee ? selectedEmployee.name : placeholder}</span>
                <ChevronDownIcon className="h-3.5 w-3.5 ml-2 text-slate-400 shrink-0" />
            </Button>
            {isOpen && (
                <div className={`absolute top-full ${alignRight ? 'right-0' : 'left-0'} mt-1 w-64 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-none shadow-xl z-50 overflow-hidden flex flex-col max-h-72`}>
                    <div className="p-2 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 sticky top-0">
                        <Input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Tìm nhân viên..." leftIcon="search" autoFocus />
                    </div>
                    <div className="overflow-y-auto flex-1">
                        {filtered.length > 0 ? filtered.map(emp => (
                            <Button variant="unstyled" size="none" key={emp.originalName} onClick={() => { onSelect(emp); setIsOpen(false); setSearchTerm(''); }} className={`justify-start w-full text-left px-3 py-1.5 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors ${selectedEmployee?.originalName === emp.originalName ? 'bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400 font-medium' : 'text-slate-700 dark:text-slate-300'}`}>
                                {emp.name}
                            </Button>
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
    const [empAId, setEmpAId] = useIndexedDBState<string | null>('global-compare-emp-a', null);
    const [empBId, setEmpBId] = useIndexedDBState<string | null>('global-compare-emp-b', null);
    
    const empA = useMemo(() => allEmployees.find(e => e.originalName === empAId) || allEmployees[0] || null, [allEmployees, empAId]);
    const empB = useMemo(() => allEmployees.find(e => e.originalName === empBId) || (allEmployees.length > 1 ? allEmployees[1] : null), [allEmployees, empBId]);

    const setEmpA = (emp: Employee) => setEmpAId(emp.originalName);
    const setEmpB = (emp: Employee) => setEmpBId(emp.originalName);

    const [displayMode, setDisplayMode] = useIndexedDBState<'pct' | 'actual'>('global-compare-display-mode', 'actual');
    const cardRef = useRef<HTMLDivElement>(null);
    const { showExportOptions } = useExportOptionsContext();
    const [nameOverrides] = useIndexedDBState<Record<string, string>>('competition-name-overrides', {});
    const [isBatchExporting, setIsBatchExporting] = useState(false);

    const autoPairs = useMemo(() => {
        const employeeByName = new Map(allEmployees.map(e => [e.originalName, e]));
        const empRows = (revenueRows || []).filter(r => r.type === 'employee').sort((a, b) => (b.dtqd || 0) - (a.dtqd || 0));
        const sortedEmps = empRows.map(r => employeeByName.get(r.originalName)).filter(Boolean) as Employee[];
        const pairs: { a: Employee, b: Employee, label: string }[] = [];
        for (let i = 0; i < sortedEmps.length - 1; i += 2) {
            pairs.push({ a: sortedEmps[i], b: sortedEmps[i+1], label: `Top ${i+1} vs ${i+2}` });
        }
        return pairs;
    }, [revenueRows, allEmployees]);

    useEffect(() => {
        if (!empAId && !empBId && autoPairs.length > 0) {
            setEmpAId(autoPairs[0].a.originalName);
            setEmpBId(autoPairs[0].b.originalName);
        }
    }, [empAId, empBId, autoPairs, setEmpAId, setEmpBId]);

    const getEmpStats = (emp: Employee | null) => {
        if (!emp) return { dtqd: 0, dtlk: 0, tg: 0, bk: 0, thuong: 0, dtRank: 0, tgRank: 0, bkRank: 0, compStats: { total: 0, dkhtDat: 0, noSale: 0 } };
        
        const rev = revenueRows?.find(r => r.type === 'employee' && isSameEmployee(r.originalName, emp.originalName));
        const inst = installmentRows?.find(r => r.type === 'employee' && isSameEmployee(r.originalName, emp.originalName));
        const bk = banKemRows?.find(r => r.type === 'employee' && isSameEmployee(r.originalName, emp.originalName));
        const bns = getBonusForEmployee(bonusData, emp.originalName, emp.name);

        const getRank = (rows: (RevenueRow | InstallmentRow | CrossSellingRow)[], key: string) => {
            const empRows = (rows || []).filter(r => r.type === 'employee');
            const sorted = [...empRows].sort((a, b) => ((b as unknown as Record<string, unknown>)[key] as number || 0) - ((a as unknown as Record<string, unknown>)[key] as number || 0));
            const idx = sorted.findIndex(r => isSameEmployee(r.originalName, emp.originalName));
            return idx >= 0 ? idx + 1 : empRows.length;
        };

        let dkhtDat = 0, noSale = 0, total = 0, dkhtNotDat = 0;
        const now = new Date();
        const daysPassed = now.getDate() - 1;
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

        (['SLLK', 'DTLK', 'DTQĐ'] as Criterion[]).forEach(crit => {
            const headers = allCompetitionsByCriterion[crit]?.headers || [];
            headers.filter(h => selectedCompetitions.has(h.originalTitle)).forEach(comp => {
                const target = employeeCompetitionTargets.get(comp.originalTitle)?.get(emp.originalName) ?? 0;
                const actual = employeeDataMap.get(emp.name)?.values[comp.title] ?? 0;
                if (target > 0 || actual > 0) {
                    total++;
                    const dkht = target > 0 ? (calculateRunRate(actual, daysPassed, daysInMonth) / target) * 100 : 0;
                    if (dkht >= 100) dkhtDat++;
                    else if (dkht === 0) noSale++;
                    else dkhtNotDat++;
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
        const rows: { criterion: Criterion; originalTitle: string; name: string; pctA: number; pctB: number; actualA: number; actualB: number }[] = [];
        (['SLLK', 'DTLK', 'DTQĐ'] as Criterion[]).forEach(crit => {
            const headers = allCompetitionsByCriterion[crit]?.headers || [];
            const headerMap = new Map(headers.map(h => [h.originalTitle, h]));
            const filteredHeaders = Array.from(selectedCompetitions)
                .map(title => headerMap.get(title))
                .filter((h): h is CompetitionHeader => !!h);
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

    const handleExportPNG = async (customFilename?: string, autoAction?: 'download' | 'share' | 'cancel' | null): Promise<'download' | 'share' | 'cancel' | null> => {
        if (!cardRef.current) return null;
        try {
            const defaultFilename = `So Sánh - ${empA?.name.replace(/[\\/:*?"<>|]/g, '')} vs ${empB?.name.replace(/[\\/:*?"<>|]/g, '')}.png`;
            const filename = customFilename || defaultFilename;
            const blob = await exportElementAsImage(cardRef.current, filename, { mode: 'blob-only', elementsToHide: ['.no-print'] });
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
            console.error(err);
            return null;
        }
    };

    const performBatchExport = async () => {
        if (isBatchExporting) return;
        setIsBatchExporting(true);
        const originalEmpAId = empAId;
        const originalEmpBId = empBId;
        let autoAction: 'download' | 'share' | 'cancel' | null = null;
        try {
            for (const pair of autoPairs) {
                setEmpAId(pair.a.originalName);
                setEmpBId(pair.b.originalName);
                await new Promise(resolve => setTimeout(resolve, 300));
                const filename = `So Sánh - ${pair.a.name.replace(/[\\/:*?"<>|]/g, '')} vs ${pair.b.name.replace(/[\\/:*?"<>|]/g, '')}.png`;
                const action = await handleExportPNG(filename, autoAction);
                if (action === 'cancel') break;
                autoAction = action;
            }
        } finally {
            setEmpAId(originalEmpAId);
            setEmpBId(originalEmpBId);
            setIsBatchExporting(false);
        }
    };

    const getCriterionStyle = (crit: Criterion) => {
        switch (crit) {
            case 'SLLK': return { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-600 dark:text-slate-300', badge: 'bg-slate-200 dark:bg-slate-700', border: 'border-slate-300 dark:border-slate-600' };
            case 'DTLK': return { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-600 dark:text-slate-300', badge: 'bg-slate-200 dark:bg-slate-700', border: 'border-slate-300 dark:border-slate-600' };
            case 'DTQĐ': return { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-600 dark:text-slate-300', badge: 'bg-slate-200 dark:bg-slate-700', border: 'border-slate-300 dark:border-slate-600' };
            default: return { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-600 dark:text-slate-300', badge: 'bg-slate-200 dark:bg-slate-700', border: 'border-slate-300 dark:border-slate-600' };
        }
    };

    return (
        <div className="space-y-4 pb-10 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-none shadow-sm p-4 sm:p-6 mt-4">
            {/* Auto Pairing Quick Select */}
            {autoPairs.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 px-2 no-print justify-center sm:justify-start">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cặp So Sánh Nhanh (Theo DTQĐ):</span>
                    <div className="flex flex-wrap gap-1.5">
                        {autoPairs.map(pair => (
                            <Button
                                variant="unstyled" size="none"
                                key={pair.label}
                                onClick={() => { setEmpA(pair.a); setEmpB(pair.b); }}
                                className={`px-2.5 py-1 text-[11px] font-bold rounded transition-colors border ${
                                    (empA?.originalName === pair.a.originalName && empB?.originalName === pair.b.originalName)
                                        ? 'bg-sky-600 text-white border-sky-600 shadow-sm'
                                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-sky-400 hover:text-sky-600'
                                }`}
                            >
                                {pair.label}
                            </Button>
                        ))}
                    </div>
                </div>
            )}

            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-4 px-2 no-print relative z-50">
                <div className="flex flex-1 items-center gap-4 max-w-2xl mx-auto">
                    <div className="flex-1 flex justify-end">
                        <EmployeeSelector allEmployees={allEmployees} selectedEmployee={empA} onSelect={setEmpA} placeholder="Chọn đối thủ 1" />
                    </div>
                    <div className="w-8 h-8 rounded-full bg-slate-800 text-white font-black italic flex items-center justify-center shrink-0 border-2 border-slate-700 text-sm">VS</div>
                    <div className="flex-1 flex justify-start">
                        <EmployeeSelector allEmployees={allEmployees} selectedEmployee={empB} onSelect={setEmpB} placeholder="Chọn đối thủ 2" alignRight />
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded border border-slate-200 dark:border-slate-700">
                        <Button variant="unstyled" size="none" onClick={() => setDisplayMode('pct')} className={`px-2 py-1 text-[11px] font-bold rounded transition-all ${displayMode === 'pct' ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-400 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>%HT</Button>
                        <Button variant="unstyled" size="none" onClick={() => setDisplayMode('actual')} className={`px-2 py-1 text-[11px] font-bold rounded transition-all ${displayMode === 'actual' ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-400 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Thực hiện</Button>
                    </div>
                    <Button variant="unstyled" size="none" onClick={performBatchExport} disabled={isBatchExporting || autoPairs.length === 0} title="Xuất tất cả cặp so sánh" className="p-1.5 flex items-center justify-center text-slate-500 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded shadow-sm hover:text-slate-700 hover:border-slate-300 disabled:opacity-50 transition-colors">
                        <ImagesIcon className={`w-4 h-4 ${isBatchExporting ? 'animate-pulse text-sky-500' : ''}`} />
                    </Button>
                    <Button variant="unstyled" size="none" onClick={() => handleExportPNG()} title="Xuất ảnh" className="p-1.5 flex items-center justify-center text-slate-500 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded shadow-sm hover:text-slate-700 hover:border-slate-300 transition-colors">
                        <CameraIcon className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            {(!empA || !empB) ? (
                <div className="py-20 text-center text-slate-500 font-bold bg-slate-50 dark:bg-slate-900/50 rounded-none border-2 border-dashed border-slate-200 dark:border-slate-800">
                    Vui lòng chọn 2 nhân viên để bắt đầu so sánh.
                </div>
            ) : (
                <div ref={cardRef} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none overflow-hidden shadow-sm">
                    {/* Dải nhận diện 2 người — chuẩn "Bảng điều khiển ca trực" (2026-09-11).
                        Bản cũ: nền slate-800 phủ ảnh hoạ tiết tải từ transparenttextures.com (tài nguyên
                        NGOÀI — mỗi lần mở là một request ra internet), avatar 80px viền 4px, chữ "VS"
                        60px viền nét, 3 ô đếm nền bán trong suốt. Cả khối là trang trí cho một việc rất
                        nhỏ: nói "đây là ai đấu với ai". Nay là dải phẳng, số đếm tô CHỮ. */}
                    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-3 sm:px-6 py-3 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-700">
                        {/* NV A */}
                        <div className="flex items-center gap-3 min-w-0 border-l-[3px] border-l-sky-600 pl-3">
                            <ProfileAvatar emp={empA} colorClass="border-sky-600" fallbackEmployees={revenueRows} />
                            <div className="min-w-0">
                                <h3 className="text-[13px] font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wide truncate">{empA.name}</h3>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">{empA.department}</p>
                                <p className="text-[11px] font-bold tabular-nums mt-0.5 flex gap-2">
                                    <span className="text-emerald-700 dark:text-emerald-400">{statsA.compStats.dkhtDat} đạt</span>
                                    {statsA.compStats.dkhtNotDat > 0 && <span className="text-amber-700 dark:text-amber-400">{statsA.compStats.dkhtNotDat} chưa đạt</span>}
                                    {statsA.compStats.noSale > 0 && <span className="text-rose-700 dark:text-rose-400">{statsA.compStats.noSale} no sale</span>}
                                </p>
                            </div>
                        </div>

                        <div className="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 px-2">vs</div>

                        {/* NV B */}
                        <div className="flex items-center gap-3 min-w-0 justify-end text-right border-r-[3px] border-r-rose-600 pr-3">
                            <div className="min-w-0">
                                <h3 className="text-[13px] font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wide truncate">{empB.name}</h3>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">{empB.department}</p>
                                <p className="text-[11px] font-bold tabular-nums mt-0.5 flex gap-2 justify-end">
                                    <span className="text-emerald-700 dark:text-emerald-400">{statsB.compStats.dkhtDat} đạt</span>
                                    {statsB.compStats.dkhtNotDat > 0 && <span className="text-amber-700 dark:text-amber-400">{statsB.compStats.dkhtNotDat} chưa đạt</span>}
                                    {statsB.compStats.noSale > 0 && <span className="text-rose-700 dark:text-rose-400">{statsB.compStats.noSale} no sale</span>}
                                </p>
                            </div>
                            <ProfileAvatar emp={empB} colorClass="border-rose-600" fallbackEmployees={revenueRows} />
                        </div>
                    </div>

                    {/* Tug of war bars */}
                    <div className="px-2 sm:px-4 py-1 border-b border-slate-200 dark:border-slate-800">
                        <TugOfWar label="Thưởng Thu Nhập" valA={statsA.thuong} valB={statsB.thuong} formatter={fMoney.format} />
                        <TugOfWar label="Doanh Thu QĐ" valA={statsA.dtqd} valB={statsB.dtqd} formatter={f.format} />
                        <TugOfWar label="Trả Chậm" valA={statsA.tg} valB={statsB.tg} formatter={pct} />
                        <TugOfWar label="Bán Kèm" valA={statsA.bk} valB={statsB.bk} formatter={pct} />
                    </div>

                    {/* Ranks Strip */}
                    <div className="grid grid-cols-2 divide-x divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                        <div className="py-3 px-2 sm:px-4 flex justify-around items-center">
                            <div className="text-center"><p className="text-[11px] text-slate-400 font-bold uppercase mb-0.5">Rank DT</p><span className="text-base sm:text-lg font-black text-sky-600">#{statsA.dtRank}</span></div>
                            <div className="text-center"><p className="text-[11px] text-slate-400 font-bold uppercase mb-0.5">≥100%</p><span className="text-base sm:text-lg font-black text-sky-600">{statsA.compStats.dkhtDat}</span></div>
                            <div className="text-center"><p className="text-[11px] text-slate-400 font-bold uppercase mb-0.5">&lt;100%</p><span className="text-base sm:text-lg font-black text-sky-600">{statsA.compStats.dkhtNotDat}</span></div>
                            <div className="text-center"><p className="text-[11px] text-slate-400 font-bold uppercase mb-0.5">% NH Đạt</p><span className="text-base sm:text-lg font-black text-emerald-600">{statsA.compStats.total > 0 ? Math.round((statsA.compStats.dkhtDat / statsA.compStats.total) * 100) : 0}%</span></div>
                        </div>
                        <div className="py-3 px-2 sm:px-4 flex justify-around items-center">
                            <div className="text-center"><p className="text-[11px] text-slate-400 font-bold uppercase mb-0.5">Rank DT</p><span className="text-base sm:text-lg font-black text-rose-600">#{statsB.dtRank}</span></div>
                            <div className="text-center"><p className="text-[11px] text-slate-400 font-bold uppercase mb-0.5">≥100%</p><span className="text-base sm:text-lg font-black text-rose-600">{statsB.compStats.dkhtDat}</span></div>
                            <div className="text-center"><p className="text-[11px] text-slate-400 font-bold uppercase mb-0.5">&lt;100%</p><span className="text-base sm:text-lg font-black text-rose-600">{statsB.compStats.dkhtNotDat}</span></div>
                            <div className="text-center"><p className="text-[11px] text-slate-400 font-bold uppercase mb-0.5">% NH Đạt</p><span className="text-base sm:text-lg font-black text-amber-600">{statsB.compStats.total > 0 ? Math.round((statsB.compStats.dkhtDat / statsB.compStats.total) * 100) : 0}%</span></div>
                        </div>
                    </div>

                    {/* Detailed Competition Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-100 dark:bg-slate-800 text-[11px] font-black uppercase text-slate-500 tracking-wider">
                                    <th className="px-4 py-3 border-b-[3px] border-b-slate-300 w-10 text-center">#</th>
                                    <th className="px-4 py-3 border-b-[3px] border-b-slate-300">Chương trình thi đua</th>
                                    <th className="px-2 py-3 border-b-[3px] border-b-slate-300 text-center text-sky-700 dark:text-sky-300 w-24">{empA.name.split(' ').pop()}</th>
                                    <th className="px-2 py-3 border-b-[3px] border-b-slate-300 text-center w-28">Chênh Lệch</th>
                                    <th className="px-2 py-3 border-b-[3px] border-b-slate-300 text-center text-rose-700 dark:text-rose-300 w-24">{empB.name.split(' ').pop()}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {compRows.length > 0 ? (
                                    (['SLLK', 'DTLK', 'DTQĐ'] as Criterion[]).map(crit => {
                                        const critRows = compRows.filter(r => r.criterion === crit);
                                        if (critRows.length === 0) return null;
                                        const cStyle = getCriterionStyle(crit);
                                        return (
                                            <React.Fragment key={crit}>
                                                <tr className={`${cStyle.bg}`}>
                                                    <td colSpan={5} className={`px-4 py-1 text-[11px] font-black uppercase ${cStyle.text} tracking-wider border-y ${cStyle.border}`}>
                                                        <span className={`px-2 py-0.5 rounded mr-2 ${cStyle.badge}`}>Tiêu chí</span> {crit}
                                                    </td>
                                                </tr>
                                                {critRows.map((row, idx) => (
                                                    <tr key={`${row.criterion}-${row.originalTitle}`} className="border-b border-slate-100 dark:border-slate-800/60 last:border-b-0 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                                                        <td className="px-4 py-1 text-[11px] font-bold text-slate-400 text-center border-r border-slate-100 dark:border-slate-800/50">#{idx + 1}</td>
                                                        <td className="px-4 py-1 border-r border-slate-100 dark:border-slate-800/50">
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="text-[12px] font-bold text-slate-800 dark:text-slate-200 uppercase">{row.name}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-2 py-1 text-center text-[13px] font-black text-sky-600 dark:text-sky-400 bg-sky-50/30 dark:bg-sky-900/10">
                                                            {displayMode === 'pct' ? `${row.pctA.toFixed(0)}%` : fMoney.format(row.actualA)}
                                                        </td>
                                                        <td className="px-2 py-1 text-center">
                                                            <div className="flex justify-center">
                                                                <DeltaBadge a={displayMode === 'pct' ? row.pctA : row.actualA} b={displayMode === 'pct' ? row.pctB : row.actualB} mode={displayMode} />
                                                            </div>
                                                        </td>
                                                        <td className="px-2 py-1 text-center text-[13px] font-black text-rose-600 dark:text-rose-400 bg-rose-50/30 dark:bg-rose-900/10">
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
