
import React, { useRef, useMemo, useState, useEffect } from 'react';
import { DownloadIcon, XIcon, CheckCircleIcon, ChevronDownIcon, ResetIcon, AlertTriangleIcon, PencilIcon, SaveIcon, UploadIcon, ClockIcon, TrashIcon, UsersIcon, SparklesIcon, ChartBarIcon, DocumentReportIcon, ChartPieIcon } from './Icons';
import { useIndexedDBState } from '../hooks/useIndexedDBState';
import toast from 'react-hot-toast';
import TargetHero from './TargetHero';
import Card from './Card';
import * as db from '../utils/db';
import { parseNumber, shortenName, shortenSupermarketName } from '../utils/dashboardHelpers';
import { ConfirmDialog } from '../../../components/shared/ui/ConfirmDialog';
import { Button } from '../../../components/shared/ui/Button';
import { Modal } from '../../../components/shared/ui/Modal';
import { EmptyState } from '../../../components/shared/ui/EmptyState';
import { Tabs } from '../../../components/shared/ui/Tabs';
import { Input } from '../../../components/shared/ui/Input';
import { DataTable, type DataTableColumn } from '../../../components/shared/ui/DataTable';
import { parseSimpleDepartments, parseCompetitions, parseBaseTargetsMap } from '../services/employeeParser';

type UpdateCategory = 'BC Tổng hợp' | 'Thi Đua Cụm' | 'Thiết lập và cập nhật dữ liệu cho siêu thị';
type Competition = { name: string; criteria: string };
type ConfigTab = 'data' | 'revenueTarget' | 'competitionTarget';

// Bảng màu xoay vòng cho từng dòng tiêu chí thi đua — hoist ra ngoài để không tạo lại mỗi lần render dòng
const COMPETITION_ROW_THEMES = [
    { label: 'text-emerald-700 dark:text-emerald-400', after: 'text-emerald-600 dark:text-emerald-400', inputBg: 'bg-white dark:bg-slate-800', inputBorder: 'border-emerald-200 dark:border-emerald-700/50', inputText: 'text-emerald-600', ring: 'focus-within:ring-emerald-500', track: 'bg-emerald-200 dark:bg-emerald-900', thumb: 'accent-emerald-500', btnHover: 'hover:text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-900', btnText: 'text-emerald-500/50' },
    { label: 'text-sky-700 dark:text-sky-400', after: 'text-sky-600 dark:text-sky-400', inputBg: 'bg-white dark:bg-slate-800', inputBorder: 'border-sky-200 dark:border-sky-700/50', inputText: 'text-sky-600', ring: 'focus-within:ring-sky-500', track: 'bg-sky-200 dark:bg-sky-900', thumb: 'accent-sky-500', btnHover: 'hover:text-sky-600 hover:bg-sky-100 dark:hover:bg-sky-900', btnText: 'text-sky-500/50' },
    { label: 'text-amber-700 dark:text-amber-400', after: 'text-amber-600 dark:text-amber-400', inputBg: 'bg-white dark:bg-slate-800', inputBorder: 'border-amber-200 dark:border-amber-700/50', inputText: 'text-amber-600', ring: 'focus-within:ring-amber-500', track: 'bg-amber-200 dark:bg-amber-900', thumb: 'accent-amber-500', btnHover: 'hover:text-amber-600 hover:bg-amber-100 dark:hover:bg-amber-900', btnText: 'text-amber-500/50' },
    { label: 'text-rose-700 dark:text-rose-400', after: 'text-rose-600 dark:text-rose-400', inputBg: 'bg-white dark:bg-slate-800', inputBorder: 'border-rose-200 dark:border-rose-700/50', inputText: 'text-rose-600', ring: 'focus-within:ring-rose-500', track: 'bg-rose-200 dark:bg-rose-900', thumb: 'accent-rose-500', btnHover: 'hover:text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-900', btnText: 'text-rose-500/50' },
    { label: 'text-indigo-700 dark:text-indigo-400', after: 'text-indigo-600 dark:text-indigo-400', inputBg: 'bg-white dark:bg-slate-800', inputBorder: 'border-indigo-200 dark:border-indigo-700/50', inputText: 'text-indigo-600', ring: 'focus-within:ring-indigo-500', track: 'bg-indigo-200 dark:bg-indigo-900', thumb: 'accent-indigo-500', btnHover: 'hover:text-indigo-600 hover:bg-indigo-100 dark:hover:bg-indigo-900', btnText: 'text-indigo-500/50' },
];

// Màu cố định (sky — màu primary) cho cụm điều khiển % Target, thay vì xoay màu theo từng dòng
const RATIO_CONTROL_THEME = { inputBg: 'bg-white dark:bg-slate-800', inputBorder: 'border-sky-200 dark:border-sky-700/50', inputText: 'text-sky-600', ring: 'focus-within:ring-sky-500', track: 'bg-sky-200 dark:bg-sky-900', thumb: 'accent-sky-500', btnHover: 'hover:text-sky-600 hover:bg-sky-100 dark:hover:bg-sky-900', btnText: 'text-sky-500/50' };

const DEFAULT_PRESET_GROUPS = ['CE & GD', 'Điện tử', 'Điện lạnh', 'Gia dụng', 'Viễn thông', 'Phụ kiện', 'IT', 'Doanh thu', 'Số lượng', 'Doanh thu quy đổi', 'Dịch vụ'];

const GroupCombobox: React.FC<{
    value: string;
    onChange: (val: string) => void;
    placeholder: string;
    availableGroups: string[];
}> = ({ value, onChange, placeholder, availableGroups }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [isOpen]);

    return (
        <div ref={containerRef} className="relative w-full">
            <div className="relative flex items-center">
                <input
                    type="text"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onFocus={() => setIsOpen(true)}
                    placeholder={placeholder}
                    className="w-full bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400 placeholder:text-slate-300 text-slate-800 dark:text-slate-200 shadow-sm"
                />
                <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setIsOpen(prev => !prev)}
                    className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 transition-colors rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                    title="Xem tất cả các nhóm có sẵn"
                >
                    <svg className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180 text-sky-600' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                    </svg>
                </button>
            </div>

            {isOpen && (
                <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden py-1 max-h-48 overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <span>Nhóm có sẵn ({availableGroups.length})</span>
                        {value && (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onChange('');
                                }}
                                className="text-rose-500 hover:underline lowercase font-normal"
                            >
                                xoá
                            </button>
                        )}
                    </div>
                    {availableGroups.map((group) => {
                        const isSelected = value === group;
                        return (
                            <button
                                key={group}
                                type="button"
                                onClick={() => {
                                    onChange(group);
                                    setIsOpen(false);
                                }}
                                className={`w-full text-left px-3 py-1.5 text-xs font-bold flex items-center justify-between transition-colors ${
                                    isSelected
                                        ? 'bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400'
                                        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                                }`}
                            >
                                <span className="truncate">{group}</span>
                                {isSelected && (
                                    <span className="text-[10px] text-sky-500 font-bold ml-2">✓</span>
                                )}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

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

    const availableGroups = useMemo(() => {
        const set = new Set<string>(DEFAULT_PRESET_GROUPS);
        competitions.forEach(c => {
            const defaultGroup = c.criteria === 'SLLK' ? 'Số lượng' : c.criteria === 'DTLK' ? 'Doanh thu' : c.criteria === 'DTQĐ' ? 'Doanh thu quy đổi' : c.criteria;
            if (defaultGroup) set.add(defaultGroup);
            if (tempGroup[c.name]) set.add(tempGroup[c.name]);
            if (groupOverrides[c.name]) set.add(groupOverrides[c.name]);
        });
        return Array.from(set).filter(Boolean);
    }, [competitions, tempGroup, groupOverrides]);

    const filteredComps = competitions.filter(comp => comp.name.toLowerCase().includes(searchQuery.toLowerCase()));

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={<span className="font-black text-lg text-sky-800 dark:text-sky-400 uppercase tracking-tight">Sửa cấu hình nhóm thi đua</span>}
            subTitle="Cấu hình tên hiển thị và tái định vị các nhóm. Thông tin sẽ đồng bộ toàn báo cáo."
            maxWidth="2xl"
            controls={
                <Input
                    type="text"
                    fullWidth={false}
                    placeholder="Tìm kiếm nhóm BI..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-40 sm:w-64 bg-white dark:bg-slate-900 rounded-xl border-sky-200 dark:border-sky-800 text-sm focus-visible:ring-sky-500/20 text-slate-700 dark:text-slate-300 placeholder:text-slate-400"
                />
            }
            footer={
                <div className="flex gap-3">
                    <Button variant="ghost" onClick={() => { setTempName({}); setTempGroup({}); }} className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0 text-inherit flex-1 px-4 py-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800/50 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/40 rounded-xl text-xs font-black transition-colors shadow-sm uppercase tracking-widest active:scale-95">Mặc định</Button>
                    <Button variant="ghost" onClick={() => { onSave(tempName, tempGroup); onClose(); }} className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0 text-inherit flex-[2] px-4 py-3 bg-gradient-to-r from-sky-500 to-sky-600 text-white rounded-xl text-xs font-black hover:from-sky-400 hover:to-sky-500 transition-all shadow-md shadow-sky-500/20 uppercase tracking-widest active:scale-95">Lưu cập nhật</Button>
                </div>
            }
        >
            <div className="-m-5 p-3 space-y-2">
                {filteredComps.length > 0 ? filteredComps.map(comp => (
                        <div key={comp.name} className="p-3 bg-slate-50/50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center gap-3 hover:border-sky-300 dark:hover:border-sky-600 transition-colors">
                            <div className="flex-1 min-w-0">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Tên gốc trong BI</p>
                                <p className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">{comp.name}</p>
                            </div>
                            <div className="flex-1">
                                <p className="text-[9px] font-black text-sky-600 dark:text-sky-400 uppercase tracking-widest mb-1">Tên hiển thị mới</p>
                                <Input
                                    value={tempName[comp.name] ?? ''}
                                    onChange={e => setTempName({...tempName, [comp.name]: e.target.value})}
                                    placeholder={shortenName(comp.name)}
                                    className="bg-white dark:bg-slate-950 rounded-xl border-slate-200 dark:border-slate-700 text-xs font-bold focus-visible:ring-sky-500/10 focus-visible:border-sky-400 placeholder:text-slate-300"
                                />
                            </div>
                            <div className="flex-1">
                                <p className="text-[9px] font-black text-sky-600 dark:text-sky-400 uppercase tracking-widest mb-1">Nhóm Tiêu Chí</p>
                                <GroupCombobox
                                    value={tempGroup[comp.name] ?? ''}
                                    onChange={val => setTempGroup({...tempGroup, [comp.name]: val})}
                                    placeholder={comp.criteria === 'SLLK' ? 'Số lượng' : comp.criteria === 'DTLK' ? 'Doanh thu' : comp.criteria === 'DTQĐ' ? 'Doanh thu quy đổi' : comp.criteria}
                                    availableGroups={availableGroups}
                                />
                            </div>
                        </div>
                    )) : <div className="flex flex-col items-center justify-center py-10 opacity-60">
                            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-2"><XIcon className="h-5 w-5 text-slate-400" /></div>
                            <p className="text-center text-[10px] font-black uppercase tracking-widest text-slate-500">Không có nhóm nào để sửa.</p>
                        </div>}
            </div>
        </Modal>
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
    colorTheme?: 'emerald' | 'sky' | 'rose' | 'amber' | 'indigo';
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
                        <Button variant="ghost" onClick={(e) => { e.stopPropagation(); setIsPasting(false); }} className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0 text-inherit px-2 py-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-[10px] font-bold text-slate-500 transition-colors bg-slate-100 dark:bg-slate-800">HUỶ</Button>
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
                    className={`absolute top-1/2 -translate-y-1/2 p-1.5 text-slate-500 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-900/30 bg-white dark:bg-slate-800 rounded-lg transition-colors border border-white/50 shadow-sm z-10 ${hasData ? 'right-10' : 'right-2'}`} 
                    title="Mở link tải báo cáo từ BI"
                >
                    <DownloadIcon className="h-3.5 w-3.5" />
                </a>
            )}
            {hasData && !isPasting && (
                <Button
                    variant="ghost"
                    onClick={(e) => {
                        e.stopPropagation();
                        onClear(title);
                    }}
                    className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto absolute top-1/2 -translate-y-1/2 right-2 p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-100 hover:border-rose-300 bg-white dark:bg-slate-800 rounded-lg transition-colors border border-white/50 shadow-sm z-10"
                    title="Xoá"
                >
                    <TrashIcon className="h-3.5 w-3.5" />
                </Button>
            )}
            {error && <p className="mt-1 text-[10px] text-rose-500 dark:text-rose-400 animate-in fade-in duration-200 px-1">{error}</p>}
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
    const fPerPerson = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 });

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
                    <div className="w-1 h-3 bg-amber-600 rounded-full"></div>
                    <h2 className="text-[11px] font-black text-slate-800 dark:text-white uppercase tracking-tight">Cấu hình Target Thi đua</h2>
                </div>
                <div className="flex gap-2">
                    <Button variant="ghost" onClick={() => {
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
                    }} className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto flex items-center p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-xl transition-all active:scale-95" title="Reset">
                        <ResetIcon className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" onClick={() => setIsRenameModalOpen(true)} className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto flex items-center p-1.5 text-sky-500 hover:bg-sky-50 dark:hover:bg-sky-900/30 rounded-xl transition-all active:scale-95" title="Sửa tên và phân nhóm">
                        <PencilIcon className="h-4 w-4" />
                    </Button>
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

                const columns: DataTableColumn<Competition>[] = [
                    {
                        id: 'name',
                        header: 'Tiêu chí',
                        headerAlign: 'center',
                        minWidth: '160px',
                        cell: (comp) => (
                            <span className="text-[11px] font-medium uppercase tracking-wide text-slate-700 dark:text-slate-300" title={comp.name}>
                                {shortenName(comp.name, nameOverrides)}
                            </span>
                        ),
                    },
                    {
                        id: 'base',
                        header: 'Gốc',
                        align: 'center',
                        width: '90px',
                        cell: (comp) => {
                            const baseVal = baseTargets[comp.name] || 0;
                            const unitSuffix = comp.criteria === 'SLLK' ? ' Cái' : ' Tr';
                            return <span className="text-[11px] font-bold tabular-nums text-slate-600 dark:text-slate-400">{f.format(baseVal)}{unitSuffix}</span>;
                        },
                    },
                    {
                        id: 'after',
                        header: 'Sau',
                        align: 'center',
                        width: '90px',
                        cell: (comp) => {
                            const idx = competitions.findIndex(c => c.name === comp.name);
                            const t = COMPETITION_ROW_THEMES[idx % COMPETITION_ROW_THEMES.length];
                            const baseVal = baseTargets[comp.name] || 0;
                            const ratio = targets[comp.name] ?? 100;
                            const adjVal = baseVal * (ratio / 100);
                            const unitSuffix = comp.criteria === 'SLLK' ? ' Cái' : ' Tr';
                            return <span className={`text-[11px] font-black tabular-nums ${t.after}`}>{f.format(adjVal)}{unitSuffix}</span>;
                        },
                    },
                    {
                        id: 'perPerson',
                        header: '/Người',
                        align: 'center',
                        width: '80px',
                        cell: (comp) => {
                            const baseVal = baseTargets[comp.name] || 0;
                            const ratio = targets[comp.name] ?? 100;
                            const adjVal = baseVal * (ratio / 100);
                            const perPerson = totalEmployees > 0 ? adjVal / totalEmployees : 0;
                            const perPersonUnit = comp.criteria === 'SLLK' ? 'Cái/ng' : 'Tr/ng';
                            if (perPerson <= 0) return <span className="text-[11px] text-slate-300 dark:text-slate-600">—</span>;
                            return <span className="text-[11px] font-bold tabular-nums text-slate-500 dark:text-slate-400">{fPerPerson.format(perPerson)} {perPersonUnit}</span>;
                        },
                    },
                    {
                        id: 'ratio',
                        header: '% Target',
                        headerAlign: 'center',
                        minWidth: '220px',
                        cell: (comp) => {
                            const t = RATIO_CONTROL_THEME;
                            const ratio = targets[comp.name] ?? 100;
                            return (
                                <div className="flex items-center gap-2">
                                    <input
                                        type="range"
                                        min={0} max={300} step={1}
                                        value={ratio}
                                        onChange={(e) => handleSliderChange(comp.name)(parseFloat(e.target.value))}
                                        className={`flex-1 h-1.5 ${t.track} rounded-full appearance-none cursor-pointer ${t.thumb} transition-all min-w-0`}
                                    />
                                    <div className={`flex items-center gap-1 ${t.inputBg} px-1.5 py-0.5 rounded border ${t.inputBorder} ${t.ring} focus-within:ring-1 shadow-sm shrink-0`}>
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
                                </div>
                            );
                        },
                    },
                    {
                        id: 'action',
                        header: '',
                        align: 'center',
                        width: '44px',
                        cell: (comp) => {
                            const t = RATIO_CONTROL_THEME;
                            return (
                                <Button
                                    variant="ghost"
                                    onClick={() => handleSaveAsPrevMonth(comp.name)}
                                    className={`bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-1 ${t.btnText} ${t.btnHover} rounded-md border border-transparent hover:border-current/20 transition-colors`}
                                    title="Lưu dữ liệu hiện tại làm mốc so sánh tháng trước"
                                >
                                    <ClockIcon className="h-3.5 w-3.5" />
                                </Button>
                            );
                        },
                    },
                ];

                return (
                    <div className="space-y-6">
                        {Object.entries(groupedCompetitions).map(([criteria, comps]) => (
                            <div key={criteria} className="space-y-2">
                                <h3 className="text-[12px] font-black text-slate-500 uppercase tracking-widest px-1 flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 bg-slate-300 dark:bg-slate-600 rounded-sm"></div>
                                    Nhóm Tiêu Chí: <span className="text-slate-700 dark:text-slate-200">{criteria}</span>
                                </h3>
                                <DataTable
                                    columns={columns}
                                    data={comps}
                                    rowKey={(comp) => comp.name}
                                    compact
                                    stickyHeader={false}
                                    columnDividers
                                />
                            </div>
                        ))}
                    </div>
                );
            })() : (
                <div className="col-span-full">
                    <EmptyState
                        icon={<AlertTriangleIcon className="h-6 w-6" />}
                        title='Chưa có dữ liệu "Luỹ kế"'
                        description='Hãy cập nhật dữ liệu "Luỹ kế" bên dưới nhóm "Thi đua Cụm" để cấu hình.'
                    />
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

    const bookmarkletRef = useRef<HTMLAnchorElement>(null);

    useEffect(() => {
        if (bookmarkletRef.current) {
            bookmarkletRef.current.href = `javascript:%28async%20function%28%29%7Bfunction%20S%28m%2Ce%2Cd%3D5e3%29%7Bvar%20t%3Ddocument.getElementById%28%22__copy_wait_toast__%22%29%3Bt%7C%7C%28%28t%3Ddocument.createElement%28%22div%22%29%29.id%3D%22__copy_wait_toast__%22%2CObject.assign%28t.style%2C%7Bposition%3A%22fixed%22%2Ctop%3A%2220px%22%2Cright%3A%2220px%22%2CzIndex%3A%222147483647%22%2Cpadding%3A%2214px%2020px%22%2CborderRadius%3A%2210px%22%2CfontFamily%3A%22system-ui%2C%20-apple-system%2C%20sans-serif%22%2CfontSize%3A%2214px%22%2CfontWeight%3A%22600%22%2Ccolor%3A%22%23fff%22%2CboxShadow%3A%220%206px%2020px%20rgba%280%2C0%2C0%2C0.25%29%22%2Ctransition%3A%22all%200.3s%20ease%22%2CmaxWidth%3A%22360px%22%2ClineHeight%3A%221.4%22%7D%29%2Cdocument.body.appendChild%28t%29%29%2Ct.style.background%3De%3F%22linear-gradient%28135deg%2C%20%23dc2626%2C%20%23b91c1c%29%22%3Am.includes%28%22%E2%9C%85%22%29%3F%22linear-gradient%28135deg%2C%20%2316a34a%2C%20%2315803d%29%22%3A%22linear-gradient%28135deg%2C%20%230ea5e9%2C%20%232563eb%29%22%2Ct.innerHTML%3Dm%2Ct.style.opacity%3D%221%22%2CclearTimeout%28t.__timer%29%2Ce%7C%7C%21d%7C%7C%28t.__timer%3DsetTimeout%28function%28%29%7Bt.style.opacity%3D%220%22%7D%2Cd%29%29%7Dconst%20sleep%3Dms%3D%3Enew%20Promise%28r%3D%3EsetTimeout%28r%2Cms%29%29%2CnextFrame%3D%28%29%3D%3Enew%20Promise%28r%3D%3ErequestAnimationFrame%28r%29%29%2CSPINNERS%3D%5B%27%23Loading%27%2C%27.overload-wait%27%2C%27.animate-spin%27%2C%27.dx-loadpanel-content%27%2C%27.dx-loadpanel%3Anot%28.dx-state-invisible%29%27%2C%27.dx-loadindicator%27%2C%27.ant-spin-spinning%27%2C%27.el-loading-mask%27%2C%27%5Bclass%2A%3D%22spinner%22%20i%5D%27%2C%27%5Bclass%2A%3D%22loading%22%20i%5D%27%5D.join%28%27%2C%20%27%29%3Bfunction%20isVis%28el%29%7Breturn%21%21%28el%26%26null%21%3D%3Del.offsetParent%29%7Dfunction%20isSpinVis%28el%29%7Bif%28%21el%29return%211%3Bvar%20s%3Dwindow.getComputedStyle%28el%29%3Bif%28%22none%22%3D%3D%3Ds.display%7C%7C%22hidden%22%3D%3D%3Ds.visibility%7C%7C0%3D%3D%3DparseFloat%28s.opacity%7C%7C%221%22%29%29return%211%3Bif%28%22fixed%22%3D%3D%3Ds.position%29%7Bvar%20r%3Del.getBoundingClientRect%28%29%3Breturn%20r.width%3E0%26%26r.height%3E0%7Dreturn%20null%21%3D%3Del.offsetParent%7Dfunction%20isPlus%28el%29%7Breturn%20el%26%26el.classList%26%26el.classList.contains%28%22fa-plus%22%29%26%26%21el.classList.contains%28%22fa-minus%22%29%7Dfunction%20isOpened%28el%29%7Bvar%20c%3Del.closest%28%27button%2C%20a%2C%20%5Brole%3D%22button%22%5D%2C%20.cursor-pointer%2C%20td%2C%20div%27%29%3Breturn%21%28%21c%7C%7C%22true%22%21%3D%3Dc.getAttribute%28%22aria-expanded%22%29%26%26%22open%22%21%3D%3Dc.getAttribute%28%22data-state%22%29%26%26%21c.querySelector%28%22.fa-minus%22%29%29%7Dfunction%20getButtons%28%29%7Breturn%20Array.from%28new%20Set%28Array.from%28document.querySelectorAll%28%22.fa-solid.fa-plus.text-gray-700%2C%20.fa-plus%22%29%29%29%29.filter%28isVis%29.filter%28isPlus%29.filter%28b%3D%3E%221%22%21%3D%3Db.dataset.clickPlusDone%29.filter%28b%3D%3E%21isOpened%28b%29%29%7Dasync%20function%20waitSpinners%28maxMs%3D6e3%29%7Bawait%20sleep%2860%29%3Bvar%20start%3DDate.now%28%29%3Bwhile%28Date.now%28%29-start%3CmaxMs%29%7Bif%28%21Array.from%28document.querySelectorAll%28SPINNERS%29%29.some%28isSpinVis%29%29return%3Bawait%20sleep%28100%29%7D%7Dasync%20function%20forceRender%28%29%7Bvar%20sc%3Ddocument.scrollingElement%7C%7Cdocument.documentElement%2Cstep%3DMath.max%28window.innerHeight%7C%7C800%2C400%29%2Cpos%3D0%2Cguard%3D0%3Bwhile%28pos%3Csc.scrollHeight%26%26guard%3C500%29%7Bwindow.scrollTo%280%2Cpos%29%2Cawait%20sleep%28100%29%2Cpos%2B%3Dstep%2Cguard%2B%2B%7Dwindow.scrollTo%280%2Csc.scrollHeight%29%2Cawait%20sleep%28200%29%2Cwindow.scrollTo%280%2C0%29%2Cawait%20sleep%28200%29%7Dasync%20function%20copyText%28%29%7Bvar%20txt%3D%22%22%2Cae%3Ddocument.activeElement%3Bif%28ae%26%26%28%22TEXTAREA%22%3D%3D%3Dae.tagName%7C%7C%22INPUT%22%3D%3D%3Dae.tagName%26%26%28%22text%22%3D%3D%3Dae.type%7C%7C%22search%22%3D%3D%3Dae.type%29%29%29ae.select%28%29%2Ctxt%3Dae.value%3Belse%7Bvar%20sel%3Dwindow.getSelection%28%29%2Crg%3Ddocument.createRange%28%29%3Brg.selectNodeContents%28document.body%29%2Csel.removeAllRanges%28%29%2Csel.addRange%28rg%29%2Ctxt%3Dsel.toString%28%29%7C%7Cdocument.body.innerText%7C%7Cdocument.body.textContent%7C%7C%22%22%7Dif%28%21txt%7C%7C0%3D%3D%3Dtxt.length%29return%7Bok%3A%211%2Clen%3A0%7D%3Btry%7Bif%28navigator.clipboard%26%26navigator.clipboard.writeText%29return%20await%20navigator.clipboard.writeText%28txt%29%2C%7Bok%3A%210%2Clen%3Atxt.length%7D%7Dcatch%28e%29%7B%7Dtry%7Breturn%7Bok%3Adocument.execCommand%28%22copy%22%29%2Clen%3Atxt.length%7D%7Dcatch%28e%29%7Breturn%7Bok%3A%211%2Clen%3Atxt.length%7D%7D%7Dtry%7Bvar%20pending%3DgetButtons%28%29%2Ctotal%3D0%2CBATCH%3D4%3Bif%28pending.length%3E0%29%7BS%28%60%E2%9A%A1%20%C4%90ang%20t%E1%BB%B1%20%C4%91%E1%BB%99ng%20m%E1%BB%9F%20%24%7Bpending.length%7D%20m%E1%BB%A5c%20d%E1%BB%AF%20li%E1%BB%87u...%60%2C%211%2C0%29%3Bfor%28var%20i%3D0%3Bi%3Cpending.length%3Bi%2B%2B%29%7Bvar%20btn%3Dpending%5Bi%5D%3Btry%7BisVis%28btn%29%26%26isPlus%28btn%29%26%26%21isOpened%28btn%29%26%26%28btn.dataset.clickPlusDone%3D%221%22%2Cbtn.click%28%29%2Ctotal%2B%2B%29%7Dcatch%28e%29%7B%7DS%28%60%E2%9A%A1%20%C4%90%C3%A3%20m%E1%BB%9F%3A%20%24%7Btotal%7D%20%7C%20C%C3%B2n%3A%20%24%7Bpending.length-i-1%7D%60%2C%211%2C0%29%2C%28i%2B1%29%25BATCH%3D%3D0%7C%7Ci%3D%3D%3Dpending.length-1%3F%28await%20nextFrame%28%29%2Cawait%20waitSpinners%285e3%29%2Cawait%20sleep%2860%29%29%3Aawait%20sleep%2825%29%7DS%28%22%E2%8F%B3%20%C4%90ang%20cu%E1%BB%99n%20hi%E1%BB%83n%20th%E1%BB%8B%20to%C3%A0n%20b%E1%BB%99%20d%C3%B2ng...%22%2C%211%2C0%29%2Cawait%20forceRender%28%29%2Cawait%20waitSpinners%286e3%29%2Cawait%20sleep%28300%29%7Delse%20S%28%22%E2%8F%B3%20%C4%90ang%20ch%E1%BB%8Dn%20v%C3%A0%20sao%20ch%C3%A9p%20d%E1%BB%AF%20li%E1%BB%87u...%22%2C%211%2C0%29%3Bvar%20res%3Dawait%20copyText%28%29%3Bif%28%21res.ok%7C%7C0%3D%3D%3Dres.len%29return%20void%20S%28%22%E2%9A%A0%EF%B8%8F%20Kh%C3%B4ng%20c%C3%B3%20d%E1%BB%AF%20li%E1%BB%87u%20%C4%91%E1%BB%83%20copy%20ho%E1%BA%B7c%20quy%E1%BB%81n%20b%E1%BB%8B%20h%E1%BA%A1n%20ch%E1%BA%BF.%20Nh%E1%BA%A5n%20Ctrl%2BC%20%C4%91%E1%BB%83%20copy%20th%E1%BB%A7%20c%C3%B4ng.%22%2C%210%2C6e3%29%3Bvar%20msg%3Dtotal%3E0%3F%60%C4%90%C3%A3%20m%E1%BB%9F%20%24%7Btotal%7D%20m%E1%BB%A5c%20%26%20%60%3A%22%22%3BS%28%60%E2%9C%85%20%24%7Bmsg%7D%C4%90%C3%A3%20copy%20xong%20%24%7Bres.len.toLocaleString%28%22vi-VN%22%29%7D%20k%C3%BD%20t%E1%BB%B1%21%3Cbr%2F%3E%3Cspan%20style%3D%22font-size%3A12px%3Bopacity%3A0.9%3B%22%3EGi%E1%BB%9D%20b%E1%BA%A1n%20c%C3%B3%20th%E1%BB%83%20d%C3%A1n%20%28Ctrl%2BV%29%20an%20to%C3%A0n.%3C%2Fspan%3E%60%2C%211%2C5e3%29%7Dcatch%28e%29%7BS%28%60%E2%9D%8C%20Th%E1%BA%A5t%20b%E1%BA%A1i%3A%20%24%7Be.message%7D%60%2C%210%2C6e3%29%7D%7D%29%28%29%3B`;
        }
    }, []);

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

    const handleUpdate = (key: string, val: string, validator: (s: string) => boolean, tsSetter: (value: string | null) => void, updateMsg: string, id: string) => {
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
        <div className="space-y-4">
            <div className="flex items-start justify-between gap-3 mb-2 overflow-x-auto scrollbar-hide">
                <div className="min-w-max flex-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Nội dung cấu hình</p>
                    <Tabs
                        items={[
                            { id: 'data', label: 'Dữ liệu' },
                            { id: 'revenueTarget', label: 'Target Doanh thu' },
                            { id: 'competitionTarget', label: 'Target Thi đua' }
                        ]}
                        activeId={activeTab}
                        onChange={(id) => setActiveTab(id as ConfigTab)}
                        variant="underline"
                    />
                </div>
                <div className="shrink-0 pb-1 flex items-center pr-2">
                    <a
                        ref={bookmarkletRef}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-emerald-50 via-teal-50 to-sky-50 dark:from-emerald-900/30 dark:via-teal-900/30 dark:to-sky-900/30 text-emerald-700 dark:text-emerald-400 font-bold text-[11px] uppercase rounded-full border border-emerald-300 dark:border-emerald-700/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 hover:border-emerald-400 dark:hover:border-emerald-600 hover:shadow-md hover:-translate-y-0.5 transition-all shadow-sm cursor-grab active:cursor-grabbing"
                        title="Kéo thả nút này lên thanh Dấu trang (Bookmarks bar) để Tự động mở rộng cây dữ liệu và Copy toàn trang trong 1 cú click"
                        onClick={(e) => {
                            e.preventDefault();
                            toast.success('Hãy kéo nút "Auto Click+" và thả lên thanh Dấu trang (Bookmarks) của trình duyệt để cài đặt!', { icon: '🖱️', duration: 4000 });
                        }}
                    >
                        <SparklesIcon className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Auto Click+</span>
                    </a>
                </div>
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
                                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-sm"></div>
                                BC D.Thu theo NV
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-1 gap-2 sm:gap-3">
                                <StatusTile title="DOANH THU" lastUpdated={danhSachTs} value={danhSachData} downloadUrl={`https://bi.thegioididong.com/nhan-vien?id=${supermarketName}&tab=1`}
                                    icon={<UsersIcon className="h-4 w-4" />} colorTheme="indigo"
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
                                <div className="w-1.5 h-1.5 bg-rose-500 rounded-sm"></div>
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
