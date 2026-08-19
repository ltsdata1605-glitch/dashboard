
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
            bookmarkletRef.current.href = `javascript:%28async%20function%20%28%29%20%7B%20const%20BATCH_SIZE%20%3D%204%3B%20const%20INTRA_BATCH_CLICK_DELAY%20%3D%2025%3B%20const%20BATCH_SPINNER_MAX_WAIT_MS%20%3D%206000%3B%20const%20BATCH_PACING_DELAY%20%3D%2080%3B%20const%20COPY_AFTER_DONE%20%3D%20true%3B%20const%20SCROLL_BEFORE_COPY%20%3D%20true%3B%20const%20SPINNER_MAX_WAIT_MS%20%3D%208000%3B%20const%20SPINNER_SELECTOR%20%3D%20%5B%20%27%23Loading%27%2C%20%27.overload-wait%27%2C%20%27.animate-spin%27%2C%20%27.dx-loadpanel-content%27%2C%20%27.dx-loadpanel%3Anot%28.dx-state-invisible%29%27%2C%20%27.dx-loadindicator%27%2C%20%27.ant-spin-spinning%27%2C%20%27.el-loading-mask%27%2C%20%27%5Bclass%2A%3D%22spinner%22%20i%5D%27%2C%20%27%5Bclass%2A%3D%22loading%22%20i%5D%27%2C%20%5D.join%28%27%2C%20%27%29%3B%20let%20totalClicked%20%3D%200%3B%20let%20startTime%20%3D%20Date.now%28%29%3B%20function%20sleep%28ms%29%20%7B%20return%20new%20Promise%28resolve%20%3D%3E%20setTimeout%28resolve%2C%20ms%29%29%3B%20%7D%20function%20nextFrame%28%29%20%7B%20return%20new%20Promise%28resolve%20%3D%3E%20requestAnimationFrame%28resolve%29%29%3B%20%7D%20function%20getElapsedSeconds%28%29%20%7B%20return%20%28%28Date.now%28%29%20-%20startTime%29%20%2F%201000%29.toFixed%281%29%3B%20%7D%20function%20ensureLoadingBox%28%29%20%7B%20let%20box%20%3D%20document.getElementById%28%27auto-click-loading-box%27%29%3B%20if%20%28%21box%29%20%7B%20box%20%3D%20document.createElement%28%27div%27%29%3B%20box.id%20%3D%20%27auto-click-loading-box%27%3B%20box.style.position%20%3D%20%27fixed%27%3B%20box.style.top%20%3D%20%2720px%27%3B%20box.style.right%20%3D%20%2720px%27%3B%20box.style.zIndex%20%3D%20%272147483647%27%3B%20box.style.background%20%3D%20%27linear-gradient%28135deg%2C%20%230ea5e9%2C%20%232563eb%29%27%3B%20box.style.color%20%3D%20%27%23fff%27%3B%20box.style.padding%20%3D%20%2714px%2018px%27%3B%20box.style.borderRadius%20%3D%20%2712px%27%3B%20box.style.boxShadow%20%3D%20%270%208px%2025px%20rgba%280%2C0%2C0%2C0.25%29%27%3B%20box.style.fontFamily%20%3D%20%27Arial%2C%20sans-serif%27%3B%20box.style.fontSize%20%3D%20%2714px%27%3B%20box.style.minWidth%20%3D%20%27300px%27%3B%20box.style.pointerEvents%20%3D%20%27none%27%3B%20box.innerHTML%20%3D%20%60%20%3Cdiv%20style%3D%22font-weight%3Abold%3Bfont-size%3A15px%3Bmargin-bottom%3A8px%3B%22%3E%20%C4%90ang%20m%E1%BB%9F%20r%E1%BB%99ng%20d%E1%BB%AF%20li%E1%BB%87u...%20%3C%2Fdiv%3E%20%3Cdiv%20id%3D%22auto-click-progress-text%22%3E%C4%90%C3%A3%20m%E1%BB%9F%3A%200%20%7C%20C%C3%B2n%20l%E1%BA%A1i%3A%200%3C%2Fdiv%3E%20%3Cdiv%20id%3D%22auto-click-time-text%22%20style%3D%22margin-top%3A4px%3Bfont-size%3A13px%3Bopacity%3A.95%3B%22%3E%20Th%E1%BB%9Di%20gian%3A%200.0%20gi%C3%A2y%20%3C%2Fdiv%3E%20%3Cdiv%20style%3D%22margin-top%3A10px%3Bbackground%3Argba%28255%2C255%2C255%2C0.25%29%3Bheight%3A8px%3Bborder-radius%3A99px%3Boverflow%3Ahidden%3B%22%3E%20%3Cdiv%20id%3D%22auto-click-progress-bar%22%20style%3D%22width%3A0%25%3Bheight%3A100%25%3Bbackground%3A%23fff%3Bborder-radius%3A99px%3Btransition%3Awidth%20.08s%3B%22%3E%3C%2Fdiv%3E%20%3C%2Fdiv%3E%20%60%3B%20document.documentElement.appendChild%28box%29%3B%20%7D%20return%20box%3B%20%7D%20function%20updateLoading%28clicked%2C%20remaining%29%20%7B%20ensureLoadingBox%28%29%3B%20const%20text%20%3D%20document.getElementById%28%27auto-click-progress-text%27%29%3B%20const%20timeText%20%3D%20document.getElementById%28%27auto-click-time-text%27%29%3B%20const%20bar%20%3D%20document.getElementById%28%27auto-click-progress-bar%27%29%3B%20if%20%28text%29%20text.innerText%20%3D%20%27%C4%90%C3%A3%20m%E1%BB%9F%3A%20%27%20%2B%20clicked%20%2B%20%27%20%7C%20C%C3%B2n%20l%E1%BA%A1i%3A%20%27%20%2B%20remaining%3B%20if%20%28timeText%29%20timeText.innerText%20%3D%20%27Th%E1%BB%9Di%20gian%3A%20%27%20%2B%20getElapsedSeconds%28%29%20%2B%20%27%20gi%C3%A2y%27%3B%20if%20%28bar%29%20%7B%20const%20denom%20%3D%20clicked%20%2B%20remaining%3B%20const%20pct%20%3D%20denom%20%3E%200%20%3F%20Math.min%28100%2C%20%28clicked%20%2F%20denom%29%20%2A%20100%29%20%3A%20%28remaining%20%3D%3D%3D%200%20%3F%20100%20%3A%205%29%3B%20bar.style.width%20%3D%20pct%20%2B%20%27%25%27%3B%20%7D%20%7D%20function%20showSuccess%28message%29%20%7B%20const%20finalTime%20%3D%20getElapsedSeconds%28%29%3B%20const%20box%20%3D%20ensureLoadingBox%28%29%3B%20box.style.background%20%3D%20%27linear-gradient%28135deg%2C%20%2316a34a%2C%20%2322c55e%29%27%3B%20box.innerHTML%20%3D%20%60%20%3Cdiv%20style%3D%22font-weight%3Abold%3Bfont-size%3A15px%3Bmargin-bottom%3A6px%3B%22%3E%20%E2%9C%85%20Ho%C3%A0n%20t%E1%BA%A5t%20%3C%2Fdiv%3E%20%3Cdiv%3E%24%7Bmessage%7D%3C%2Fdiv%3E%20%3Cdiv%20style%3D%22margin-top%3A6px%3Bfont-size%3A13px%3Bopacity%3A.95%3B%22%3E%20T%E1%BB%95ng%20th%E1%BB%9Di%20gian%3A%20%24%7BfinalTime%7D%20gi%C3%A2y%20%3C%2Fdiv%3E%20%60%3B%20setTimeout%28%28%29%20%3D%3E%20%7B%20const%20oldBox%20%3D%20document.getElementById%28%27auto-click-loading-box%27%29%3B%20if%20%28oldBox%29%20oldBox.remove%28%29%3B%20%7D%2C%206000%29%3B%20%7D%20function%20isVisible%28el%29%20%7B%20return%20%21%21%28el%20%26%26%20el.offsetParent%20%21%3D%3D%20null%29%3B%20%7D%20function%20isSpinnerVisible%28el%29%20%7B%20if%20%28%21el%29%20return%20false%3B%20const%20style%20%3D%20window.getComputedStyle%28el%29%3B%20if%20%28style.display%20%3D%3D%3D%20%27none%27%20%7C%7C%20style.visibility%20%3D%3D%3D%20%27hidden%27%29%20return%20false%3B%20if%20%28parseFloat%28style.opacity%20%7C%7C%20%271%27%29%20%3D%3D%3D%200%29%20return%20false%3B%20if%20%28style.position%20%3D%3D%3D%20%27fixed%27%29%20%7B%20const%20rect%20%3D%20el.getBoundingClientRect%28%29%3B%20return%20rect.width%20%3E%200%20%26%26%20rect.height%20%3E%200%3B%20%7D%20return%20el.offsetParent%20%21%3D%3D%20null%3B%20%7D%20function%20isStillPlus%28el%29%20%7B%20return%20el%20%26%26%20el.classList%20%26%26%20el.classList.contains%28%27fa-plus%27%29%20%26%26%20%21el.classList.contains%28%27fa-minus%27%29%3B%20%7D%20function%20isAlreadyOpened%28el%29%20%7B%20const%20clickable%20%3D%20el.closest%28%27button%2C%20a%2C%20%5Brole%3D%22button%22%5D%2C%20.cursor-pointer%2C%20td%2C%20div%27%29%3B%20if%20%28%21clickable%29%20return%20false%3B%20if%20%28clickable.getAttribute%28%27aria-expanded%27%29%20%3D%3D%3D%20%27true%27%29%20return%20true%3B%20if%20%28clickable.getAttribute%28%27data-state%27%29%20%3D%3D%3D%20%27open%27%29%20return%20true%3B%20if%20%28clickable.querySelector%28%27.fa-minus%27%29%29%20return%20true%3B%20return%20false%3B%20%7D%20function%20getPendingButtons%28%29%20%7B%20return%20Array.from%28new%20Set%28Array.from%28document.querySelectorAll%28%27.fa-solid.fa-plus.text-gray-700%27%29%29%29%29%20.filter%28btn%20%3D%3E%20isVisible%28btn%29%29%20.filter%28btn%20%3D%3E%20isStillPlus%28btn%29%29%20.filter%28btn%20%3D%3E%20btn.dataset.clickPlusDone%20%21%3D%3D%20%271%27%29%20.filter%28btn%20%3D%3E%20%21isAlreadyOpened%28btn%29%29%3B%20%7D%20async%20function%20waitForSpinnersToClear%28maxWaitMs%2C%20pollMs%2C%20settleMs%29%20%7B%20if%20%28settleMs%29%20await%20sleep%28settleMs%29%3B%20const%20start%20%3D%20Date.now%28%29%3B%20while%20%28Date.now%28%29%20-%20start%20%3C%20maxWaitMs%29%20%7B%20const%20visible%20%3D%20Array.from%28document.querySelectorAll%28SPINNER_SELECTOR%29%29.some%28isSpinnerVisible%29%3B%20if%20%28%21visible%29%20return%3B%20await%20sleep%28pollMs%20%7C%7C%20100%29%3B%20%7D%20%7D%20async%20function%20forceRenderAllRows%28%29%20%7B%20const%20scroller%20%3D%20document.scrollingElement%20%7C%7C%20document.documentElement%3B%20const%20step%20%3D%20Math.max%28window.innerHeight%20%7C%7C%20800%2C%20400%29%3B%20let%20pos%20%3D%200%3B%20let%20guard%20%3D%200%3B%20while%20%28pos%20%3C%20scroller.scrollHeight%20%26%26%20guard%20%3C%20500%29%20%7B%20window.scrollTo%280%2C%20pos%29%3B%20await%20sleep%28120%29%3B%20pos%20%2B%3D%20step%3B%20guard%2B%2B%3B%20%7D%20window.scrollTo%280%2C%20scroller.scrollHeight%29%3B%20await%20sleep%28250%29%3B%20window.scrollTo%280%2C%200%29%3B%20await%20sleep%28250%29%3B%20%7D%20async%20function%20copyAllText%28%29%20%7B%20const%20text%20%3D%20document.body.innerText%20%7C%7C%20document.body.textContent%20%7C%7C%20%27%27%3B%20try%20%7B%20await%20navigator.clipboard.writeText%28text%29%3B%20return%20%7B%20ok%3A%20true%2C%20length%3A%20text.length%20%7D%3B%20%7D%20catch%20%28e%29%20%7B%20console.warn%28%27Clipboard%20API%20th%E1%BA%A5t%20b%E1%BA%A1i%2C%20th%E1%BB%AD%20execCommand%3A%27%2C%20e%29%3B%20%7D%20try%20%7B%20const%20range%20%3D%20document.createRange%28%29%3B%20range.selectNodeContents%28document.body%29%3B%20const%20selection%20%3D%20window.getSelection%28%29%3B%20selection.removeAllRanges%28%29%3B%20selection.addRange%28range%29%3B%20await%20sleep%28150%29%3B%20const%20ok%20%3D%20document.execCommand%28%27copy%27%29%3B%20return%20%7B%20ok%2C%20length%3A%20text.length%20%7D%3B%20%7D%20catch%20%28e%29%20%7B%20console.error%28%27L%E1%BB%97i%20copy%3A%27%2C%20e%29%3B%20return%20%7B%20ok%3A%20false%2C%20length%3A%20text.length%20%7D%3B%20%7D%20%7D%20startTime%20%3D%20Date.now%28%29%3B%20ensureLoadingBox%28%29%3B%20const%20keepLoadingAlive%20%3D%20setInterval%28%28%29%20%3D%3E%20%7B%20updateLoading%28totalClicked%2C%20getPendingButtons%28%29.length%29%3B%20%7D%2C%20200%29%3B%20const%20pending%20%3D%20getPendingButtons%28%29%3B%20for%20%28let%20i%20%3D%200%3B%20i%20%3C%20pending.length%3B%20i%2B%2B%29%20%7B%20const%20btn%20%3D%20pending%5Bi%5D%3B%20try%20%7B%20if%20%28%21isVisible%28btn%29%20%7C%7C%20%21isStillPlus%28btn%29%20%7C%7C%20isAlreadyOpened%28btn%29%29%20%7B%20continue%3B%20%7D%20btn.dataset.clickPlusDone%20%3D%20%271%27%3B%20btn.click%28%29%3B%20totalClicked%2B%2B%3B%20%7D%20catch%20%28error%29%20%7B%20console.error%28%27L%E1%BB%97i%20t%E1%BA%A1i%20n%C3%BAt%3A%27%2C%20i%20%2B%201%2C%20error%29%3B%20%7D%20updateLoading%28totalClicked%2C%20pending.length%20-%20i%20-%201%29%3B%20const%20isEndOfBatch%20%3D%20%28i%20%2B%201%29%20%25%20BATCH_SIZE%20%3D%3D%3D%200%20%7C%7C%20i%20%3D%3D%3D%20pending.length%20-%201%3B%20if%20%28%21isEndOfBatch%29%20%7B%20await%20sleep%28INTRA_BATCH_CLICK_DELAY%29%3B%20continue%3B%20%7D%20await%20nextFrame%28%29%3B%20await%20waitForSpinnersToClear%28BATCH_SPINNER_MAX_WAIT_MS%2C%2060%2C%2050%29%3B%20await%20sleep%28BATCH_PACING_DELAY%29%3B%20%7D%20const%20stillPending%20%3D%20getPendingButtons%28%29.length%3B%20if%20%28SCROLL_BEFORE_COPY%29%20%7B%20await%20forceRenderAllRows%28%29%3B%20%7D%20ensureLoadingBox%28%29%3B%20const%20spinnerBox%20%3D%20document.getElementById%28%27auto-click-progress-text%27%29%3B%20if%20%28spinnerBox%29%20spinnerBox.innerText%20%3D%20%27%C4%90ang%20ch%E1%BB%9D%20d%E1%BB%AF%20li%E1%BB%87u%20t%E1%BA%A3i%20xong...%27%3B%20await%20waitForSpinnersToClear%28SPINNER_MAX_WAIT_MS%2C%20150%2C%20100%29%3B%20await%20sleep%28500%29%3B%20let%20copyResult%20%3D%20%7B%20ok%3A%20false%2C%20length%3A%200%20%7D%3B%20if%20%28COPY_AFTER_DONE%29%20%7B%20copyResult%20%3D%20await%20copyAllText%28%29%3B%20%7D%20clearInterval%28keepLoadingAlive%29%3B%20let%20message%20%3D%20%27%C4%90%C3%A3%20m%E1%BB%9F%20r%E1%BB%99ng%20%27%20%2B%20totalClicked%20%2B%20%27%20m%E1%BB%A5c.%27%3B%20if%20%28stillPending%20%3E%200%29%20%7B%20message%20%2B%3D%20%27%20C%C3%B2n%20%27%20%2B%20stillPending%20%2B%20%27%20m%E1%BB%A5c%20%28c%E1%BA%A5p%20con%29%20ch%C6%B0a%20m%E1%BB%9F%20%E2%80%94%20anh%20b%E1%BA%A5m%20l%E1%BA%A1i%20ph%C3%ADm%20t%E1%BA%AFt%20th%C3%AAm%20l%E1%BA%A7n%20n%E1%BB%AFa%20%C4%91%E1%BB%83%20m%E1%BB%9F%20ti%E1%BA%BFp.%27%3B%20%7D%20if%20%28copyResult.ok%29%20%7B%20message%20%2B%3D%20%27%20%C4%90%C3%A3%20copy%20%27%20%2B%20copyResult.length.toLocaleString%28%27vi-VN%27%29%20%2B%20%27%20k%C3%BD%20t%E1%BB%B1.%27%3B%20%7D%20else%20%7B%20message%20%2B%3D%20%27%20N%E1%BA%BFu%20ch%C6%B0a%20copy%20%C4%91%C6%B0%E1%BB%A3c%2C%20anh%20nh%E1%BA%A5n%20Ctrl%20%2B%20C.%27%3B%20%7D%20showSuccess%28message%29%3B%20%7D%29%28%29%3B`;
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
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-50 to-emerald-100 dark:from-emerald-900/30 dark:to-emerald-900/50 text-emerald-700 dark:text-emerald-400 font-bold text-[11px] uppercase rounded-full border border-emerald-200 dark:border-emerald-800/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-md hover:-translate-y-0.5 transition-all shadow-sm cursor-grab active:cursor-grabbing"
                        title="Kéo thả nút này lên thanh Dấu trang (Bookmarks bar) của trình duyệt"
                        onClick={(e) => {
                            e.preventDefault();
                            toast.success('Hãy kéo nút này và thả lên thanh Dấu trang (Bookmarks) của trình duyệt để cài đặt!', { icon: '🖱️', duration: 4000 });
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
