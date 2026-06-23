
import React, { useRef, useMemo, useState, useEffect } from 'react';
import { DownloadIcon, XIcon, CheckCircleIcon, ChevronDownIcon, ResetIcon, AlertTriangleIcon, PencilIcon, SaveIcon, UploadIcon, ClockIcon, TrashIcon, UsersIcon, SparklesIcon, ChartBarIcon, DocumentReportIcon, ChartPieIcon } from './Icons';
import { useIndexedDBState } from '../hooks/useIndexedDBState';
import toast from 'react-hot-toast';
import TargetHero from './TargetHero';
import Slider from './Slider';
import Card from './Card';
import * as db from '../utils/db';
import { parseNumber, shortenName, shortenSupermarketName } from '../utils/dashboardHelpers';
import { ConfirmDialog } from '../../../components/shared/ui/ConfirmDialog';
import { parseSimpleDepartments, parseCompetitions, parseBaseTargetsMap } from '../../../services/parsers/employeeParser';

type UpdateCategory = 'BC Tổng hợp' | 'Thi Đua Cụm' | 'Thiết lập và cập nhật dữ liệu cho siêu thị';
type Competition = { name: string; criteria: string };
type ConfigTab = 'data' | 'revenueTarget' | 'competitionTarget';

const BulkRenameModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    competitions: Competition[];
    nameOverrides: Record<string, string>;
    groupOverrides: Record<string, string>;
    onSave: (newNames: Record<string, string>, newGroups: Record<string, string>) => void;
}> = ({ isOpen, onClose, competitions, nameOverrides, groupOverrides, onSave }) => {
    const [tempName, setTempName] = useState<Record<string, string>>(nameOverrides);
    const [tempGroup, setTempGroup] = useState<Record<string, string>>(groupOverrides);
    const [searchQuery, setSearchQuery] = useState('');
    
    useEffect(() => { 
        if (isOpen) {
            setTempName(nameOverrides); 
            setTempGroup(groupOverrides);
            setSearchQuery('');
        }
    }, [isOpen]); // Execute only when modal opens/closes

    if (!isOpen) return null;

    const availableGroups = Array.from(new Set(
        competitions.map(c => {
            let defaultGroup = c.criteria === 'SLLK' ? 'Số lượng' : c.criteria === 'DTLK' ? 'Doanh thu' : c.criteria === 'DTQĐ' ? 'Doanh thu quy đổi' : c.criteria;
            return tempGroup[c.name] || defaultGroup;
        })
    ));

    const filteredComps = competitions.filter(comp => comp.name.toLowerCase().includes(searchQuery.toLowerCase()));

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-3xl flex flex-col h-[85vh] border border-slate-200/50 dark:border-slate-700 animate-in zoom-in-95 overflow-hidden">
                <div className="p-4 border-b border-sky-100/50 dark:border-slate-700 bg-sky-50/50 dark:bg-slate-800/50 flex justify-between items-center shrink-0 gap-4">
                    <div className="flex-1">
                        <h3 className="font-black text-lg text-sky-800 dark:text-sky-400 uppercase tracking-tight">Sửa cấu hình nhóm thi đua</h3>
                        <p className="text-[10px] text-sky-600/70 font-bold uppercase tracking-widest mt-0.5">Cấu hình tên hiển thị và tái định vị các nhóm. Thông tin sẽ đồng bộ toàn báo cáo.</p>
                    </div>
                    <div className="w-64 shrink-0">
                        <input
                            type="text"
                            placeholder="Tìm kiếm nhóm BI..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 rounded-xl border border-sky-200 dark:border-sky-800 text-sm focus:ring-2 focus:ring-sky-500/20 outline-none text-slate-700 dark:text-slate-300 placeholder:text-slate-400"
                        />
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white dark:hover:bg-slate-700 border border-transparent hover:border-slate-200 dark:hover:border-slate-600 rounded-xl transition-colors shrink-0"><XIcon className="h-4 w-4 text-sky-600/60 dark:text-slate-400" /></button>
                </div>
                <div className="p-3 flex-1 overflow-y-auto space-y-2 bg-white dark:bg-slate-800">
                    <datalist id="group-list">
                        {availableGroups.map(g => <option key={g} value={g} />)}
                    </datalist>
                    {filteredComps.length > 0 ? filteredComps.map(comp => (
                        <div key={comp.name} className="p-3 bg-slate-50/50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center gap-3 hover:border-sky-300 dark:hover:border-sky-600 transition-colors">
                            <div className="flex-1 min-w-0">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Tên gốc trong BI</p>
                                <p className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">{comp.name}</p>
                            </div>
                            <div className="flex-1">
                                <p className="text-[9px] font-black text-sky-600 dark:text-sky-400 uppercase tracking-widest mb-1">Tên hiển thị mới</p>
                                <input 
                                    value={tempName[comp.name] ?? ''}
                                    onChange={e => setTempName({...tempName, [comp.name]: e.target.value})}
                                    placeholder={shortenName(comp.name)}
                                    className="w-full px-3 py-1.5 bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold focus:ring-4 focus:ring-sky-500/10 focus:border-sky-400 outline-none transition-all placeholder:text-slate-300"
                                />
                            </div>
                            <div className="flex-1">
                                <p className="text-[9px] font-black text-purple-600 dark:text-purple-400 uppercase tracking-widest mb-1">Nhóm Tiêu Chí</p>
                                <input 
                                    list="group-list"
                                    value={tempGroup[comp.name] ?? ''}
                                    onChange={e => setTempGroup({...tempGroup, [comp.name]: e.target.value})}
                                    placeholder={comp.criteria === 'SLLK' ? 'Số lượng' : comp.criteria === 'DTLK' ? 'Doanh thu' : comp.criteria === 'DTQĐ' ? 'Doanh thu quy đổi' : comp.criteria}
                                    className="w-full px-3 py-1.5 bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold focus:ring-4 focus:ring-purple-500/10 focus:border-purple-400 outline-none transition-all placeholder:text-slate-300"
                                />
                            </div>
                        </div>
                    )) : <div className="flex flex-col items-center justify-center py-10 opacity-60">
                            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-2"><XIcon className="h-5 w-5 text-slate-400" /></div>
                            <p className="text-center text-[10px] font-black uppercase tracking-widest text-slate-500">Không có nhóm nào để sửa.</p>
                        </div>}
                </div>
                <div className="p-4 border-t border-slate-100 dark:border-slate-700 flex gap-3 bg-slate-50/80 dark:bg-slate-900/50 shrink-0">
                    <button onClick={() => { setTempName({}); setTempGroup({}); }} className="flex-1 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-xl text-xs font-black transition-colors shadow-sm uppercase tracking-widest active:scale-95">Mặc định</button>
                    <button onClick={() => { onSave(tempName, tempGroup); onClose(); }} className="flex-[2] px-4 py-3 bg-gradient-to-r from-sky-500 to-sky-600 text-white rounded-xl text-xs font-black hover:from-sky-400 hover:to-sky-500 transition-all shadow-md shadow-sky-500/20 uppercase tracking-widest active:scale-95">Lưu cập nhật</button>
                </div>
            </div>
        </div>
    );
};

const StatusTile: React.FC<{
    title: string;
    lastUpdated: string | null;
    value: string;
    placeholder?: string;
    onChange: (val: string) => void;
    onClear: (title: string) => void;
    error?: string | null;
    icon?: React.ReactNode;
    colorTheme?: 'emerald' | 'sky' | 'rose' | 'amber' | 'indigo' | 'purple';
    downloadUrl?: string;
}> = ({ title, lastUpdated, value, placeholder, onChange, onClear, error, icon, colorTheme = 'sky', downloadUrl }) => {
    const [isPasting, setIsPasting] = useState(false);
    const hasData = value && value.length > 0 && !error;

    const themeColors = {
        emerald: {
            wrapper: 'border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-800',
            text: 'text-emerald-800 dark:text-emerald-200',
            iconActive: 'text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-700 shadow-sm',
            ring: 'border-emerald-500 ring-2 ring-emerald-500/20'
        },
        sky: {
            wrapper: 'border-sky-200 bg-sky-50 dark:bg-sky-900/20 dark:border-sky-800',
            text: 'text-sky-800 dark:text-sky-200',
            iconActive: 'text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-700 shadow-sm',
            ring: 'border-sky-500 ring-2 ring-sky-500/20'
        },
        rose: {
            wrapper: 'border-rose-200 bg-rose-50 dark:bg-rose-900/20 dark:border-rose-800',
            text: 'text-rose-800 dark:text-rose-200',
            iconActive: 'text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-700 shadow-sm',
            ring: 'border-rose-500 ring-2 ring-rose-500/20'
        },
        amber: {
            wrapper: 'border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800',
            text: 'text-amber-800 dark:text-amber-200',
            iconActive: 'text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-700 shadow-sm',
            ring: 'border-amber-500 ring-2 ring-amber-500/20'
        },
        indigo: {
            wrapper: 'border-indigo-200 bg-indigo-50 dark:bg-indigo-900/20 dark:border-indigo-800',
            text: 'text-indigo-800 dark:text-indigo-200',
            iconActive: 'text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-700 shadow-sm',
            ring: 'border-indigo-500 ring-2 ring-indigo-500/20'
        },
        purple: {
            wrapper: 'border-purple-200 bg-purple-50 dark:bg-purple-900/20 dark:border-purple-800',
            text: 'text-purple-800 dark:text-purple-200',
            iconActive: 'text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-700 shadow-sm',
            ring: 'border-purple-500 ring-2 ring-purple-500/20'
        }
    };

    const currentTheme = themeColors[colorTheme];

    return (
        <div className="relative group w-full">
            <div 
                onClick={() => !isPasting && setIsPasting(true)}
                className={`
                    cursor-pointer min-h-[56px] rounded-xl transition-all duration-200 flex items-center px-3 relative overflow-hidden active:scale-[0.99] border hover:scale-[1.01] shadow-sm
                    ${isPasting 
                        ? `bg-white dark:bg-slate-800 ${currentTheme.ring}`
                        : hasData 
                            ? currentTheme.wrapper
                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300'}
                `}
            >
                {isPasting ? (
                    <div className="w-full flex items-center gap-2 animate-in fade-in duration-150">
                        <textarea
                            autoFocus
                            className="flex-1 bg-transparent border-none focus:ring-0 text-[11px] font-mono resize-none p-0 h-10 leading-tight placeholder-slate-400 outline-none text-slate-800 dark:text-slate-200"
                            placeholder="Nhấn Ctrl + V..."
                            onPaste={(e) => {
                                const text = e.clipboardData.getData('text');
                                onChange(text);
                                setIsPasting(false);
                            }}
                            onBlur={() => setIsPasting(false)}
                        />
                        <button onClick={(e) => { e.stopPropagation(); setIsPasting(false); }} className="px-2 py-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-[10px] font-bold text-slate-500 transition-colors bg-slate-100 dark:bg-slate-800">HUỶ</button>
                    </div>
                ) : (
                    <div className="flex items-center justify-between w-full gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className={`p-1.5 rounded-lg shrink-0 transition-colors duration-200 bg-white dark:bg-slate-800 ${hasData ? currentTheme.iconActive : 'border border-slate-200 dark:border-slate-700 text-slate-400'}`}>
                                {icon || <UploadIcon className="h-4 w-4" />}
                            </div>
                            <div className="min-w-0">
                                <h4 className={`text-[11px] font-bold uppercase tracking-wide truncate transition-colors duration-200 ${hasData ? currentTheme.text : 'text-slate-600 dark:text-slate-400 group-hover/tile:text-slate-800'}`}>{title}</h4>
                                {hasData ? (
                                    lastUpdated && (
                                    <span className={`text-[10px] font-medium uppercase flex items-center gap-1 mt-[1px] opacity-80 ${currentTheme.text}`}>
                                        <ClockIcon className="h-3 w-3" /> {lastUpdated}
                                    </span>
                                )) : (
                                    <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-[1px] block truncate text-left">Click để cập nhật</span>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
            {downloadUrl && !isPasting && (
                <a 
                    href={downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => { 
                        e.stopPropagation(); 
                    }} 
                    className={`absolute top-1/2 -translate-y-1/2 p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 bg-white dark:bg-slate-800 rounded-lg transition-colors border border-white/50 shadow-sm z-10 ${hasData ? 'right-10' : 'right-2'}`} 
                    title="Mở link tải báo cáo từ BI"
                >
                    <DownloadIcon className="h-3.5 w-3.5" />
                </a>
            )}
            {hasData && !isPasting && (
                <button 
                    onClick={(e) => { 
                        e.stopPropagation(); 
                        onClear(title); 
                    }} 
                    className="absolute top-1/2 -translate-y-1/2 right-2 p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-100 hover:border-red-300 bg-white dark:bg-slate-800 rounded-lg transition-colors border border-white/50 shadow-sm z-10" 
                    title="Xoá"
                >
                    <TrashIcon className="h-3.5 w-3.5" />
                </button>
            )}
            {error && <p className="mt-1 text-[10px] text-red-500 dark:text-red-400 animate-in fade-in duration-200 px-1">{error}</p>}
        </div>
    );
};

const CompetitionTarget: React.FC<{
    supermarketName: string;
    addUpdate: (id: string, message: string, category: UpdateCategory) => void;
    competitions: Competition[];
    competitionLuyKeData: string;
    totalEmployees?: number;
}> = ({ supermarketName, addUpdate, competitions, competitionLuyKeData, totalEmployees = 0 }) => {
    const safeName = shortenSupermarketName(supermarketName);
    const [targets, setTargets] = useIndexedDBState<Record<string, number>>(`comptarget-${safeName}-targets`, {}, 300);
    const [nameOverrides, setNameOverrides] = useIndexedDBState<Record<string, string>>('competition-name-overrides', {});
    const [groupOverrides, setGroupOverrides] = useIndexedDBState<Record<string, string>>('competition-group-overrides', {});
    const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
    
    // Confirm Dialog State
    const [confirmDialog, setConfirmDialog] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
        variant?: 'danger' | 'warning' | 'info' | 'success';
        confirmText?: string;
    }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

    const showConfirm = (options: { title: string; message: string; onConfirm: () => void; variant?: 'danger' | 'warning' | 'info' | 'success'; confirmText?: string; }) => {
        setConfirmDialog({ ...options, isOpen: true });
    };
    const closeConfirm = () => setConfirmDialog(prev => ({ ...prev, isOpen: false }));
    
    const f = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 });

    const baseTargets = useMemo(() => {
        return parseBaseTargetsMap(competitionLuyKeData, supermarketName);
    }, [competitionLuyKeData, supermarketName]);

    const handleSliderChange = (compName: string) => (val: number) => {
        setTargets(prev => ({ ...prev, [compName]: val }));
        addUpdate(`comptarget-${supermarketName}-${compName}`, `Điều chỉnh target ${compName} - ${supermarketName}`, 'Thiết lập và cập nhật dữ liệu cho siêu thị');
    };

    const handleSaveAsPrevMonth = async (compName: string) => {
        const baseVal = baseTargets[compName] || 0;
        const ratio = targets[compName] ?? 100;
        const adjVal = baseVal * (ratio / 100);
        
        const key = `prev-month-target-${safeName}-${compName}`;
        await db.set(key, adjVal);
        toast.success(`Đã lưu Target ${shortenName(compName, nameOverrides)} làm mốc so sánh tháng trước!`);
    };

    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex justify-between items-center mb-2 px-1">
                <div className="flex items-center gap-2">
                    <div className="w-1 h-3 bg-orange-600 rounded-full"></div>
                    <h2 className="text-[11px] font-black text-slate-800 dark:text-white uppercase tracking-tight">Cấu hình Target Thi đua</h2>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => {
                        showConfirm({
                            title: 'Khôi phục Target',
                            message: 'Khôi phục tất cả Target phụ về 100%?',
                            variant: 'warning',
                            confirmText: 'Đồng ý',
                            onConfirm: () => {
                                setTargets({});
                                closeConfirm();
                            }
                        });
                    }} className="flex items-center p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-xl transition-all active:scale-95" title="Reset">
                        <ResetIcon className="h-4 w-4" />
                    </button>
                    <button onClick={() => setIsRenameModalOpen(true)} className="flex items-center p-1.5 text-sky-500 hover:bg-sky-50 dark:hover:bg-sky-900/30 rounded-xl transition-all active:scale-95" title="Sửa tên và phân nhóm">
                        <PencilIcon className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {competitions.length > 0 ? (() => {
                const groupedCompetitions: Record<string, Competition[]> = {};
                competitions.forEach(comp => {
                    let defaultGroup = comp.criteria === 'SLLK' ? 'Số lượng' : comp.criteria === 'DTLK' ? 'Doanh thu' : comp.criteria === 'DTQĐ' ? 'Doanh thu quy đổi' : comp.criteria;
                    let group = groupOverrides[comp.name] || defaultGroup;
                    
                    if (!groupedCompetitions[group]) groupedCompetitions[group] = [];
                    groupedCompetitions[group].push(comp);
                });

                return (
                    <div className="space-y-6">
                        {Object.entries(groupedCompetitions).map(([criteria, comps]) => (
                            <div key={criteria} className="space-y-3">
                                <h3 className="text-[14px] font-black text-slate-500 uppercase tracking-widest px-1 flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 bg-slate-300 dark:bg-slate-600 rounded-sm"></div>
                                    Nhóm Tiêu Chí: <span className="text-slate-700 dark:text-slate-200">{criteria}</span>
                                </h3>
                                <div className="grid grid-cols-2 gap-2 sm:gap-x-8 sm:gap-y-3">
                                    {comps.map(comp => {
                                        const idx = competitions.findIndex(c => c.name === comp.name);
                                        const baseVal = baseTargets[comp.name] || 0;
                                        const ratio = targets[comp.name] ?? 100;
                                        const adjVal = baseVal * (ratio / 100);
                                        const unitSuffix = comp.criteria === 'SLLK' ? ' Cái' : ' Tr';
                                        const perPerson = totalEmployees > 0 ? adjVal / totalEmployees : 0;
                                        const perPersonUnit = comp.criteria === 'SLLK' ? 'Cái/ng' : 'Tr/ng';

                                        const dThemes = [
                                            { bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-200 dark:border-emerald-800', label: 'text-emerald-700 dark:text-emerald-400', after: 'text-emerald-600 dark:text-emerald-400', inputBg: 'bg-white dark:bg-slate-800', inputBorder: 'border-emerald-200 dark:border-emerald-700/50', inputText: 'text-emerald-600', ring: 'focus-within:ring-emerald-500', track: 'bg-emerald-200 dark:bg-emerald-900', thumb: 'accent-emerald-500', btnHover: 'hover:text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-900', btnText: 'text-emerald-500/50' },
                                            { bg: 'bg-sky-50 dark:bg-sky-900/20', border: 'border-sky-200 dark:border-sky-800', label: 'text-sky-700 dark:text-sky-400', after: 'text-sky-600 dark:text-sky-400', inputBg: 'bg-white dark:bg-slate-800', inputBorder: 'border-sky-200 dark:border-sky-700/50', inputText: 'text-sky-600', ring: 'focus-within:ring-sky-500', track: 'bg-sky-200 dark:bg-sky-900', thumb: 'accent-sky-500', btnHover: 'hover:text-sky-600 hover:bg-sky-100 dark:hover:bg-sky-900', btnText: 'text-sky-500/50' },
                                            { bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-800', label: 'text-amber-700 dark:text-amber-400', after: 'text-amber-600 dark:text-amber-400', inputBg: 'bg-white dark:bg-slate-800', inputBorder: 'border-amber-200 dark:border-amber-700/50', inputText: 'text-amber-600', ring: 'focus-within:ring-amber-500', track: 'bg-amber-200 dark:bg-amber-900', thumb: 'accent-amber-500', btnHover: 'hover:text-amber-600 hover:bg-amber-100 dark:hover:bg-amber-900', btnText: 'text-amber-500/50' },
                                            { bg: 'bg-rose-50 dark:bg-rose-900/20', border: 'border-rose-200 dark:border-rose-800', label: 'text-rose-700 dark:text-rose-400', after: 'text-rose-600 dark:text-rose-400', inputBg: 'bg-white dark:bg-slate-800', inputBorder: 'border-rose-200 dark:border-rose-700/50', inputText: 'text-rose-600', ring: 'focus-within:ring-rose-500', track: 'bg-rose-200 dark:bg-rose-900', thumb: 'accent-rose-500', btnHover: 'hover:text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-900', btnText: 'text-rose-500/50' },
                                            { bg: 'bg-indigo-50 dark:bg-indigo-900/20', border: 'border-indigo-200 dark:border-indigo-800', label: 'text-indigo-700 dark:text-indigo-400', after: 'text-indigo-600 dark:text-indigo-400', inputBg: 'bg-white dark:bg-slate-800', inputBorder: 'border-indigo-200 dark:border-indigo-700/50', inputText: 'text-indigo-600', ring: 'focus-within:ring-indigo-500', track: 'bg-indigo-200 dark:bg-indigo-900', thumb: 'accent-indigo-500', btnHover: 'hover:text-indigo-600 hover:bg-indigo-100 dark:hover:bg-indigo-900', btnText: 'text-indigo-500/50' },
                                        ];
                                        const t = dThemes[idx % dThemes.length];

                                        return (
                                            <div key={comp.name} className={`relative group p-2 sm:p-2.5 ${t.bg} border ${t.border} rounded-lg shadow-sm transition-all hover:scale-[1.01]`}>
                                                <div className="mb-2">
                                                    <span className={`text-[12px] font-black uppercase tracking-wider ${t.label}`} title={comp.name}>
                                                        {shortenName(comp.name, nameOverrides)}
                                                    </span>
                                                    <div className="flex flex-wrap items-center gap-1 sm:gap-2 mt-0.5">
                                                        <span className="text-[9px] font-black uppercase opacity-70">Gốc:</span>
                                                        <span className="text-[11px] font-black tabular-nums">{f.format(baseVal)}{unitSuffix}</span>
                                                        <span className="text-[9px] opacity-40">|</span>
                                                        <span className="text-[9px] font-black uppercase">Sau:</span>
                                                        <span className={`text-[11px] font-black tabular-nums ${t.after}`}>{f.format(adjVal)}{unitSuffix}</span>
                                                        {perPerson > 0 && (
                                                            <>
                                                                <span className="text-[9px] opacity-40">|</span>
                                                                <span className={`text-[11px] font-black tabular-nums`}>{f.format(perPerson)} {perPersonUnit}</span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="px-1 flex items-center gap-2">
                                                    <input
                                                        type="range"
                                                        min={0} max={300} step={1}
                                                        value={ratio}
                                                        onChange={(e) => handleSliderChange(comp.name)(parseFloat(e.target.value))}
                                                        className={`flex-1 h-1.5 ${t.track} rounded-full appearance-none cursor-pointer ${t.thumb} transition-all min-w-0`}
                                                    />
                                                    <div className="flex items-center gap-1 shrink-0">
                                                        <div className={`flex items-center gap-1 ${t.inputBg} px-1.5 py-0.5 rounded border ${t.inputBorder} ${t.ring} focus-within:ring-1 shadow-sm`}>
                                                            <input 
                                                                type="number"
                                                                value={Math.round(ratio).toString()}
                                                                onFocus={(e) => e.target.select()}
                                                                onChange={(e) => { 
                                                                    const val = e.target.value;
                                                                    if (val === '') { handleSliderChange(comp.name)(0); return; }
                                                                    const v = parseInt(val, 10); 
                                                                    if (!isNaN(v)) handleSliderChange(comp.name)(v); 
                                                                }}
                                                                className={`w-7 sm:w-8 bg-transparent text-center text-[11px] font-black ${t.inputText} outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                                                            />
                                                            <span className="text-[9px] font-bold opacity-60">%</span>
                                                        </div>
                                                        <button 
                                                            onClick={() => handleSaveAsPrevMonth(comp.name)}
                                                            className={`p-1 ${t.btnText} ${t.btnHover} rounded-md border border-transparent hover:border-current/20 transition-colors bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm`}
                                                            title="Lưu dữ liệu hiện tại làm mốc so sánh tháng trước"
                                                        >
                                                            <ClockIcon className="h-3.5 w-3.5" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                );
            })() : (
                <div className="col-span-full py-16 text-center bg-slate-50 dark:bg-slate-900/40 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                    <AlertTriangleIcon className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest px-4">Hãy cập nhật dữ liệu "Luỹ kế" bên dưới nhóm "Thi đua Cụm" để cấu hình.</p>
                </div>
            )}

            <BulkRenameModal 
                isOpen={isRenameModalOpen} 
                onClose={() => setIsRenameModalOpen(false)} 
                competitions={competitions} 
                nameOverrides={nameOverrides}
                groupOverrides={groupOverrides}
                onSave={(names, groups) => {
                    setNameOverrides(names);
                    setGroupOverrides(groups);
                }}
            />

            <ConfirmDialog 
                isOpen={confirmDialog.isOpen}
                onClose={closeConfirm}
                onConfirm={confirmDialog.onConfirm}
                title={confirmDialog.title}
                message={confirmDialog.message}
                variant={confirmDialog.variant}
                confirmText={confirmDialog.confirmText}
            />
        </div>
    );
};

interface SupermarketConfigProps {
    supermarketName: string | null;
    addUpdate: (id: string, message: string, category: UpdateCategory) => void;
    removeUpdate: (id: string) => void;
    competitionLuyKeData: string;
    summaryLuyKeData: string;
    onThiDuaDataChange: (supermarket: string | null, newData: string) => void;
}

const SupermarketConfig: React.FC<SupermarketConfigProps> = ({ supermarketName, addUpdate, removeUpdate, competitionLuyKeData, summaryLuyKeData, onThiDuaDataChange }) => {
    const [activeTab, setActiveTab] = useState<ConfigTab>('data');



    const ids = useMemo(() => {
        if (!supermarketName) return { ds: null, td: null, rt: null, lk: null, tg: null, bk: null };
        const safeName = shortenSupermarketName(supermarketName);
        return {
            ds: `config-${safeName}-danhsach`,
            td: `config-${safeName}-thidua`,
            rt: `config-${safeName}-industry-realtime`,
            lk: `config-${safeName}-industry-luyke`,
            tg: `config-${safeName}-tragop`,
            bk: `config-${safeName}-bankem`,
        };
    }, [supermarketName]);

    const [danhSachData, setDanhSachData] = useIndexedDBState(ids.ds, '');
    const [thiDuaData, setThiDuaData] = useIndexedDBState(ids.td, '');
    const [industryRealtimeData, setIndustryRealtimeData] = useIndexedDBState(ids.rt, '');
    const [industryLuyKeData, setIndustryLuyKeData] = useIndexedDBState(ids.lk, '');
    const [traGopData, setTraGopData] = useIndexedDBState(ids.tg, '');
    const [banKemData, setBanKemData] = useIndexedDBState(ids.bk, '');

    const [danhSachTs, setDanhSachTs] = useIndexedDBState<string | null>(supermarketName ? `${ids.ds}-ts` : null, null);
    const [thiDuaTs, setThiDuaTs] = useIndexedDBState<string | null>(supermarketName ? `${ids.td}-ts` : null, null);
    const [industryRealtimeTs, setIndustryRealtimeTs] = useIndexedDBState<string | null>(supermarketName ? `${ids.rt}-ts` : null, null);
    const [industryLuyKeTs, setIndustryLuyKeTs] = useIndexedDBState<string | null>(supermarketName ? `${ids.lk}-ts` : null, null);
    const [traGopTs, setTraGopTs] = useIndexedDBState<string | null>(supermarketName ? `${ids.tg}-ts` : null, null);
    const [banKemTs, setBanKemTs] = useIndexedDBState<string | null>(supermarketName ? `${ids.bk}-ts` : null, null);

    const [errors, setErrors] = useState<Record<string, string | null>>({});

    const getDetailedTimestamp = () => {
        const now = new Date();
        const time = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
        const date = now.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
        return `${time} ${date}`;
    };

    const departments = useMemo(() => {
        return parseSimpleDepartments(danhSachData);
    }, [danhSachData]);

    const competitions = useMemo(() => {
        return parseCompetitions(competitionLuyKeData);
    }, [competitionLuyKeData]);

    const handleUpdate = (key: string, val: string, validator: (s: string) => boolean, tsSetter: any, updateMsg: string, id: string) => {
        if (val === '') {
            setErrors(p => ({...p, [key]: null}));
            tsSetter(null);
            removeUpdate(id);
            return;
        }
        if (validator(val)) {
            const newTs = getDetailedTimestamp();
            setErrors(p => ({...p, [key]: null}));
            tsSetter(newTs);
            addUpdate(id, updateMsg, 'Thiết lập và cập nhật dữ liệu cho siêu thị');
        } else {
            setErrors(p => ({...p, [key]: 'Dữ liệu sai định dạng.'}));
            tsSetter(null);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center border-b border-slate-200 dark:border-slate-800 mb-4 overflow-x-auto scrollbar-hide">
                <nav className="flex space-x-6 min-w-max" aria-label="Tabs">
                    {[
                        { id: 'data', label: 'Dữ liệu' },
                        { id: 'revenueTarget', label: 'Target Doanh thu' },
                        { id: 'competitionTarget', label: 'Target Thi đua' }
                    ].map(t => (
                        <button
                            key={t.id}
                            onClick={() => setActiveTab(t.id as any)}
                            className={`py-2 px-1 border-b-2 font-bold text-[12px] uppercase tracking-wider transition-colors duration-150 ${activeTab === t.id ? 'border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-500' : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'}`}
                        >
                            {t.label}
                        </button>
                    ))}
                </nav>
            </div>
            
            <div className="animate-in fade-in duration-200">
                {activeTab === 'data' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* NHÓM 1: BC D.THU NGÀNH HÀNG (DÀNH CHO SIÊU THỊ) */}
                        <div>
                            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1 pb-2 flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 bg-sky-500 rounded-sm"></div>
                                BC D.Thu Ngành Hàng
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-1 gap-2 sm:gap-3">
                                <StatusTile title="Realtime" lastUpdated={industryRealtimeTs} value={industryRealtimeData} placeholder="Ngành hàng Realtime..." error={errors.industryRealtime} 
                                    icon={<ClockIcon className="h-4 w-4" />} colorTheme="amber"
                                    onChange={(v) => { setIndustryRealtimeData(v); handleUpdate('industryRealtime', v, s => s.includes('Nhóm ngành hàng	SL Realtime'), setIndustryRealtimeTs, `Ngành hàng (RT) - ${supermarketName}`, ids.rt!); }}
                                    onClear={(title) => { 
                                        setIndustryRealtimeData(''); 
                                        setIndustryRealtimeTs(null); 
                                        removeUpdate(ids.rt!); 
                                        toast.success(`Đã xoá dữ liệu ${title}`);
                                        
                                    }} />
                                <StatusTile title="Luỹ kế" lastUpdated={industryLuyKeTs} value={industryLuyKeData} downloadUrl={`https://bi.thegioididong.com/chi-tiet-nganh-hang?id=${supermarketName}`}
                                    icon={<ChartPieIcon className="h-4 w-4" />} colorTheme="emerald"
                                    onChange={(v) => { setIndustryLuyKeData(v); handleUpdate('industryLuyKe', v, s => s.includes('Ngành hàng	SL'), setIndustryLuyKeTs, `Ngành hàng (LK) - ${supermarketName}`, ids.lk!); }}
                                    onClear={(title) => { 
                                        setIndustryLuyKeData(''); 
                                        setIndustryLuyKeTs(null); 
                                        removeUpdate(ids.lk!); 
                                        toast.success(`Đã xoá dữ liệu ${title}`);
                                        
                                    }} />
                            </div>
                        </div>
                        {/* NHÓM 2: BC D.THU THEO NHÂN VIÊN */}
                        <div>
                            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1 pb-2 flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 bg-blue-500 rounded-sm"></div>
                                BC D.Thu theo NV
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-1 gap-2 sm:gap-3">
                                <StatusTile title="DOANH THU" lastUpdated={danhSachTs} value={danhSachData} downloadUrl={`https://bi.thegioididong.com/nhan-vien?id=${supermarketName}&tab=1`}
                                    icon={<UsersIcon className="h-4 w-4" />} colorTheme="purple"
                                    onChange={(v) => { setDanhSachData(v); handleUpdate('danhSach', v, s => s.includes('Nhân viên	DTLK	DTQĐ'), setDanhSachTs, `Nhân viên (DS) - ${supermarketName}`, ids.ds!); }}
                                    onClear={(title) => { 
                                        setDanhSachData(''); 
                                        setDanhSachTs(null); 
                                        removeUpdate(ids.ds!); 
                                        toast.success(`Đã xoá dữ liệu ${title}`);
                                        
                                    }} />
                                
                                <StatusTile title="THI ĐUA NV" lastUpdated={thiDuaTs} value={thiDuaData} placeholder="Phòng ban..." error={errors.thiDua} 
                                    icon={<SparklesIcon className="h-4 w-4" />} colorTheme="amber"
                                    onChange={(v) => { setThiDuaData(v); if(v && v.toLowerCase().includes('phòng ban')) { onThiDuaDataChange(supermarketName, v); handleUpdate('thiDua', v, s => s.toLowerCase().includes('phòng ban'), setThiDuaTs, `Nhân viên (TĐ) - ${supermarketName}`, ids.td!); } else setErrors(p => ({...p, thiDua: 'Sai định dạng Thi đua NV.'})); }}
                                    onClear={(title) => { 
                                        setThiDuaData(''); 
                                        setThiDuaTs(null); 
                                        removeUpdate(ids.td!); 
                                        toast.success(`Đã xoá dữ liệu ${title}`);
                                        
                                    }} />
                            </div>
                        </div>

                        {/* NHÓM 3: TRẢ GÓP & CHI TIẾT NHÂN VIÊN */}
                        <div>
                            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1 pb-2 flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 bg-indigo-500 rounded-sm"></div>
                                Trả góp & CHI TIẾT NH
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-1 gap-2 sm:gap-3">
                                <StatusTile title="HQ BÁN KÈM" lastUpdated={banKemTs} value={banKemData} placeholder="Nhân viên..." error={errors.banKem} 
                                    icon={<ChartBarIcon className="h-4 w-4" />} colorTheme="emerald"
                                    onChange={(v) => { setBanKemData(v); handleUpdate('banKem', v, s => s.includes('Nhân viên	DTLK	DTLK áp dụng MNGN'), setBanKemTs, `Nhân viên (BK) - ${supermarketName}`, ids.bk!); }}
                                    onClear={(title) => { 
                                        setBanKemData(''); 
                                        setBanKemTs(null); 
                                        removeUpdate(ids.bk!); 
                                        toast.success(`Đã xoá dữ liệu ${title}`);
                                        
                                    }} />

                                <StatusTile title="Trả góp NV" lastUpdated={traGopTs} value={traGopData} downloadUrl={`https://bi.thegioididong.com/nhan-vien?id=${supermarketName}&tab=5`}
                                    icon={<ChartPieIcon className="h-4 w-4" />} colorTheme="sky"
                                    onChange={(v) => { setTraGopData(v); handleUpdate('traGop', v, s => s.includes('Nhân viên') && s.includes('DT Siêu thị'), setTraGopTs, `Nhân viên (TG) - ${supermarketName}`, ids.tg!); }}
                                    onClear={(title) => { 
                                        setTraGopData(''); 
                                        setTraGopTs(null); 
                                        removeUpdate(ids.tg!); 
                                        toast.success(`Đã xoá dữ liệu ${title}`);
                                        
                                    }} />
                            </div>
                        </div>
                    </div>
                )}
                {activeTab === 'revenueTarget' && <TargetHero supermarketName={supermarketName!} addUpdate={addUpdate} departments={departments} summaryLuyKeData={summaryLuyKeData} />}
                {activeTab === 'competitionTarget' && <CompetitionTarget supermarketName={supermarketName!} addUpdate={addUpdate} competitions={competitions} competitionLuyKeData={competitionLuyKeData} totalEmployees={departments.reduce((s, d) => s + d.employeeCount, 0)} />}
            </div>
        </div>
    );
};

export default SupermarketConfig;
