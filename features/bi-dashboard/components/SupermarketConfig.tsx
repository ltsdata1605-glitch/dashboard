
import React, { useRef, useMemo, useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ResetIcon, AlertTriangleIcon, UploadIcon, ClockIcon, TrashIcon, UsersIcon, SparklesIcon, ChartBarIcon, ChartPieIcon } from './Icons';
import { ExternalLink, GripVertical } from 'lucide-react';
import { useIndexedDBState } from '../hooks/useIndexedDBState';
import toast from 'react-hot-toast';
import TargetHero from './TargetHero';
import * as db from '../utils/db';
import { shortenName, shortenSupermarketName, getDefaultGroupLabel } from '../utils/dashboardHelpers';
import { cn } from '../../../components/shared/ui/utils';
import { ConfirmDialog } from '../../../components/shared/ui/ConfirmDialog';
import { Button } from '../../../components/shared/ui/Button';
import { EmptyState } from '../../../components/shared/ui/EmptyState';
import { Tabs } from '../../../components/shared/ui/Tabs';
import { Input } from '../../../components/shared/ui/Input';
import { DataTable, type DataTableColumn } from '../../../components/shared/ui/DataTable';
import { parseDepartments, parseSimpleDepartments, parseCompetitions, parseBaseTargetsMap, getDepartmentsFromAnalysis } from '../services/employeeParser';
import { validateThiDuaData } from '../utils/nhanVienHelpers';
import { getAnalysisEmployees, AnalysisEmployeesPayload, ANALYSIS_EMPLOYEES_KEY } from '../services/analysisEmployeeSyncService';

type UpdateCategory = 'BC Tổng hợp' | 'Thi Đua Cụm' | 'Thiết lập và cập nhật dữ liệu cho siêu thị';
type Competition = { name: string; criteria: string };
export type ConfigTab = 'data' | 'revenueTarget' | 'competitionTarget';

// Bảng màu xoay vòng cho từng dòng tiêu chí thi đua — hoist ra ngoài để không tạo lại mỗi lần render dòng
const COMPETITION_ROW_THEMES = [
    { label: 'text-emerald-700 dark:text-emerald-400', after: 'text-emerald-600 dark:text-emerald-400', inputBg: 'bg-white dark:bg-slate-800', inputBorder: 'border-emerald-200 dark:border-emerald-700/50', inputText: 'text-emerald-600', ring: 'focus-within:ring-emerald-500', track: 'bg-emerald-200 dark:bg-emerald-900', thumb: 'accent-emerald-500', btnHover: 'hover:text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-900', btnText: 'text-emerald-500/50' },
    { label: 'text-sky-700 dark:text-sky-400', after: 'text-sky-600 dark:text-sky-400', inputBg: 'bg-white dark:bg-slate-800', inputBorder: 'border-sky-200 dark:border-sky-700/50', inputText: 'text-sky-600', ring: 'focus-within:ring-sky-500', track: 'bg-sky-200 dark:bg-sky-900', thumb: 'accent-sky-500', btnHover: 'hover:text-sky-600 hover:bg-sky-100 dark:hover:bg-sky-900', btnText: 'text-sky-500/50' },
    { label: 'text-amber-700 dark:text-amber-400', after: 'text-amber-600 dark:text-amber-400', inputBg: 'bg-white dark:bg-slate-800', inputBorder: 'border-amber-200 dark:border-amber-700/50', inputText: 'text-amber-600', ring: 'focus-within:ring-amber-500', track: 'bg-amber-200 dark:bg-amber-900', thumb: 'accent-amber-500', btnHover: 'hover:text-amber-600 hover:bg-amber-100 dark:hover:bg-amber-900', btnText: 'text-amber-500/50' },
    { label: 'text-rose-700 dark:text-rose-400', after: 'text-rose-600 dark:text-rose-400', inputBg: 'bg-white dark:bg-slate-800', inputBorder: 'border-rose-200 dark:border-rose-700/50', inputText: 'text-rose-600', ring: 'focus-within:ring-rose-500', track: 'bg-rose-200 dark:bg-rose-900', thumb: 'accent-rose-500', btnHover: 'hover:text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-900', btnText: 'text-rose-500/50' },
    { label: 'text-sky-700 dark:text-sky-400', after: 'text-sky-600 dark:text-sky-400', inputBg: 'bg-white dark:bg-slate-800', inputBorder: 'border-sky-200 dark:border-sky-700/50', inputText: 'text-sky-600', ring: 'focus-within:ring-sky-500', track: 'bg-sky-200 dark:bg-sky-900', thumb: 'accent-sky-500', btnHover: 'hover:text-sky-600 hover:bg-sky-100 dark:hover:bg-sky-900', btnText: 'text-sky-500/50' },
];

// Màu cố định (sky — màu primary) cho cụm điều khiển % Target, thay vì xoay màu theo từng dòng
const RATIO_CONTROL_THEME = { inputBg: 'bg-white dark:bg-slate-800', inputBorder: 'border-sky-200 dark:border-sky-700/50', inputText: 'text-sky-600', ring: 'focus-within:ring-sky-500', track: 'bg-sky-200 dark:bg-sky-900', thumb: 'accent-sky-500', btnHover: 'hover:text-sky-600 hover:bg-sky-100 dark:hover:bg-sky-900', btnText: 'text-sky-500/50' };

const DEFAULT_PRESET_GROUPS = ['CE & GD', 'Điện tử', 'Điện lạnh', 'Gia dụng', 'Viễn thông', 'Phụ kiện', 'IT', 'Doanh thu', 'Số lượng', 'Doanh thu quy đổi', 'Dịch vụ'];

const GroupCombobox: React.FC<{
    value: string;
    onChange: (val: string) => void;
    placeholder: string;
    availableGroups: string[];
    onDeleteGroup?: (group: string) => void;
    onResetGroups?: () => void;
    hasDeletedGroups?: boolean;
    /** Gọi khi giá trị được CHỐT (chọn từ danh sách / bỏ chọn / xoá nhóm đang chọn), khác với
     *  onChange vốn bắn theo từng ký tự người dùng gõ. */
    onCommit?: (val: string) => void;
}> = ({ value, onChange, placeholder, availableGroups, onDeleteGroup, onResetGroups, hasDeletedGroups, onCommit }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});

    const updatePosition = useCallback(() => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const estimatedHeight = 240;
        const placeAbove = spaceBelow < estimatedHeight && rect.top > estimatedHeight;

        const style: React.CSSProperties = {
            position: 'fixed',
            zIndex: 9999,
            minWidth: Math.max(rect.width, 220),
            maxWidth: 280,
            right: Math.max(8, window.innerWidth - rect.right),
        };

        if (placeAbove) {
            style.bottom = window.innerHeight - rect.top + 4;
        } else {
            style.top = rect.bottom + 4;
        }

        setMenuStyle(style);
    }, []);

    useEffect(() => {
        if (!isOpen) return;
        updatePosition();

        const handleScrollOrResize = () => {
            updatePosition();
        };

        window.addEventListener('scroll', handleScrollOrResize, true);
        window.addEventListener('resize', handleScrollOrResize);

        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as Node;
            if (
                containerRef.current && !containerRef.current.contains(target) &&
                dropdownRef.current && !dropdownRef.current.contains(target)
            ) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            window.removeEventListener('scroll', handleScrollOrResize, true);
            window.removeEventListener('resize', handleScrollOrResize);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, updatePosition]);

    return (
        <div ref={containerRef} className="relative w-full">
            <div className="relative flex items-center">
                <Input
                    type="text"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onFocus={() => {
                        updatePosition();
                        setIsOpen(true);
                    }}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            setIsOpen(false);
                            onCommit?.(value);
                            e.currentTarget.blur();
                        } else if (e.key === 'Escape') {
                            setIsOpen(false);
                        }
                    }}
                    placeholder={placeholder}
                    className="h-8 py-1 px-2.5 text-xs font-normal pr-7 bg-white dark:bg-slate-900 rounded-md border-slate-200 dark:border-slate-700 shadow-none focus-visible:ring-1 focus-visible:ring-sky-500 placeholder:text-slate-400"
                />
                <Button
                    type="button"
                    variant="unstyled"
                    size="none"
                    tabIndex={-1}
                    onClick={() => {
                        if (!isOpen) updatePosition();
                        setIsOpen(prev => !prev);
                    }}
                    className="absolute right-1 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors rounded"
                    title="Xem tất cả các nhóm có sẵn"
                >
                    <svg className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180 text-sky-600' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                    </svg>
                </Button>
            </div>

            {isOpen && typeof document !== 'undefined' && createPortal(
                <div
                    ref={dropdownRef}
                    style={menuStyle}
                    className="w-max bg-white dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden py-0.5 max-h-72 overflow-y-auto"
                >
                    <div className="px-2.5 py-1 text-[11px] font-semibold text-slate-400 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 whitespace-nowrap">
                        <span>Nhóm có sẵn ({availableGroups.length})</span>
                        <div className="flex items-center gap-2 shrink-0">
                            {hasDeletedGroups && onResetGroups && (
                                <Button
                                    type="button"
                                    variant="unstyled"
                                    size="none"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onResetGroups();
                                    }}
                                    className="text-sky-500 hover:underline text-[11px] font-normal whitespace-nowrap"
                                    title="Khôi phục lại các nhóm mặc định đã xoá"
                                >
                                    Khôi phục
                                </Button>
                            )}
                            {value && (
                                <Button
                                    type="button"
                                    variant="unstyled"
                                    size="none"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onChange('');
                                        onCommit?.('');
                                    }}
                                    className="text-rose-500 hover:underline text-[11px] font-normal whitespace-nowrap"
                                    title="Xoá nhóm đã chọn"
                                >
                                    Bỏ chọn
                                </Button>
                            )}
                        </div>
                    </div>
                    {availableGroups.length > 0 ? (
                        availableGroups.map((group) => {
                            const isSelected = value === group;
                            return (
                                <div
                                    key={group}
                                    onClick={() => {
                                        onChange(group);
                                        onCommit?.(group);
                                        setIsOpen(false);
                                    }}
                                    className={`group/item w-full text-left px-2.5 py-1 text-xs font-normal leading-tight whitespace-nowrap flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                                        isSelected
                                            ? 'bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 font-medium'
                                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                                    }`}
                                >
                                    <span className="truncate flex-1">{group}</span>
                                    <div className="flex items-center gap-1 shrink-0">
                                        {isSelected && (
                                            <span className="text-[11px] text-sky-600 font-bold">✓</span>
                                        )}
                                        {onDeleteGroup && (
                                            <Button
                                                type="button"
                                                variant="unstyled"
                                                size="none"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onDeleteGroup(group);
                                                    if (value === group) { onChange(''); onCommit?.(''); }
                                                }}
                                                className="p-0.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded transition-colors"
                                                title={`Xoá nhóm "${group}" khỏi danh sách`}
                                            >
                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="px-2.5 py-2 text-center text-[11px] text-slate-400 whitespace-nowrap">
                            Không còn nhóm nào
                        </div>
                    )}
                </div>,
                document.body
            )}
        </div>
    );
};

/** Ô "Nhóm tiêu chí" của bảng Cấu hình Target Thi đua. Bảng được gom nhóm THEO chính giá trị này,
 *  nên nếu ghi ngay từng ký tự thì hàng sẽ nhảy sang bảng nhóm khác giữa lúc gõ và ô nhập mất focus.
 *  Vì vậy giữ bản nháp cục bộ, chỉ ghi khi chốt: chọn trong danh sách, hoặc rời khỏi ô. */
const CompetitionGroupCell: React.FC<{
    value: string;
    placeholder: string;
    availableGroups: string[];
    onCommit: (val: string) => void;
    onDeleteGroup: (group: string) => void;
    onResetGroups: () => void;
    hasDeletedGroups: boolean;
}> = ({ value, placeholder, availableGroups, onCommit, onDeleteGroup, onResetGroups, hasDeletedGroups }) => {
    const [draft, setDraft] = useState(value);
    useEffect(() => { setDraft(value); }, [value]);

    const commit = (val: string) => {
        setDraft(val);
        if (val.trim() !== value.trim()) onCommit(val.trim());
    };

    return (
        <div
            onBlur={(e) => {
                // Chỉ chốt khi focus rời hẳn ô (không phải nhảy giữa input và nút mở danh sách).
                if (!e.currentTarget.contains(e.relatedTarget as Node)) commit(draft);
            }}
        >
            <GroupCombobox
                value={draft}
                onChange={setDraft}
                onCommit={commit}
                placeholder={placeholder}
                availableGroups={availableGroups}
                onDeleteGroup={onDeleteGroup}
                onResetGroups={onResetGroups}
                hasDeletedGroups={hasDeletedGroups}
            />
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
    colorTheme?: 'emerald' | 'sky' | 'rose' | 'amber';
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
        // Đã gỡ nhánh `indigo` (Đợt 6): nó là bản SAO Y của nhánh `sky` ở trên — `styles.css`
        // map --color-indigo-* thành đúng hex của sky nên 2 nhánh render giống hệt nhau, giữ cả
        // 2 chỉ khiến người đọc tưởng đang có 2 màu khác nhau.
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
                            placeholder={placeholder || 'Nhấn Ctrl + V...'}
                            onPaste={(e) => {
                                const text = e.clipboardData.getData('text');
                                onChange(text);
                                setIsPasting(false);
                            }}
                            onBlur={() => setIsPasting(false)}
                        />
                        <Button variant="unstyled" size="none" onClick={(e) => { e.stopPropagation(); setIsPasting(false); }} className="px-2 py-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-[11px] font-bold text-slate-500 transition-colors bg-slate-100 dark:bg-slate-800">HUỶ</Button>
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
                                    <span className={`text-[11px] font-medium uppercase flex items-center gap-1 mt-[1px] opacity-80 ${currentTheme.text}`}>
                                        <ClockIcon className="h-3 w-3" /> {lastUpdated}
                                    </span>
                                )) : (
                                    <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-[1px] block truncate text-left">Click để cập nhật</span>
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
                    title="Mở liên kết báo cáo từ BI"
                >
                    <ExternalLink className="h-3.5 w-3.5" />
                </a>
            )}
            {hasData && !isPasting && (
                <Button
                    variant="unstyled" size="none"
                    onClick={(e) => {
                        e.stopPropagation();
                        onClear(title);
                    }}
                    className="absolute top-1/2 -translate-y-1/2 right-2 p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-100 hover:border-rose-300 bg-white dark:bg-slate-800 rounded-lg transition-colors border border-white/50 shadow-sm z-10"
                    title="Xoá"
                >
                    <TrashIcon className="h-3.5 w-3.5" />
                </Button>
            )}
            {error && <p className="mt-1 text-[11px] text-rose-500 dark:text-rose-400 animate-in fade-in duration-200 px-1">{error}</p>}
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
    const [deletedGroups, setDeletedGroups] = useIndexedDBState<string[]>('competition-deleted-preset-groups', []);
    // Thứ tự dòng ngành hàng tùy chỉnh do người dùng kéo thả (tự động đồng bộ Firebase)
    const [customOrder, setCustomOrder] = useIndexedDBState<Record<string, string[]>>('competition-custom-order', {});
    // State tương tác Drag & Drop dòng ngành hàng
    const [draggedItem, setDraggedItem] = useState<{ group: string; index: number; name: string } | null>(null);
    const [dragOverItem, setDragOverItem] = useState<{ group: string; index: number; name: string } | null>(null);
    // Tiêu chí đang sửa tên hiển thị ngay trên bảng (thay cho modal "Sửa cấu hình nhóm thi đua" cũ)
    const [editingNameFor, setEditingNameFor] = useState<string | null>(null);
    const [editingNameValue, setEditingNameValue] = useState('');
    
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

    const availableGroups = useMemo(() => {
        const deletedSet = new Set(deletedGroups || []);
        const set = new Set<string>();
        DEFAULT_PRESET_GROUPS.forEach(g => { if (!deletedSet.has(g)) set.add(g); });
        competitions.forEach(c => {
            const defaultGroup = getDefaultGroupLabel(c.criteria);
            if (defaultGroup && !deletedSet.has(defaultGroup)) set.add(defaultGroup);
            if (groupOverrides[c.name] && !deletedSet.has(groupOverrides[c.name])) set.add(groupOverrides[c.name]);
        });
        return Array.from(set).filter(Boolean);
    }, [competitions, groupOverrides, deletedGroups]);

    const handleDeleteGroup = (groupToDelete: string) => {
        setDeletedGroups(prev => Array.from(new Set([...(prev || []), groupToDelete])));
        setGroupOverrides(prev => {
            const updated = { ...prev };
            Object.keys(updated).forEach(k => { if (updated[k] === groupToDelete) delete updated[k]; });
            return updated;
        });
    };

    const handleResetGroups = () => setDeletedGroups([]);

    /** Ghi tên hiển thị mới; để trống = trả về tên rút gọn mặc định của BI. */
    const commitDisplayName = (compName: string, value: string) => {
        const trimmed = value.trim();
        setNameOverrides(prev => {
            const next = { ...prev };
            if (!trimmed) delete next[compName]; else next[compName] = trimmed;
            return next;
        });
        setEditingNameFor(null);
    };

    const commitGroup = (compName: string, value: string) => {
        setGroupOverrides(prev => {
            const next = { ...prev };
            if (!value) delete next[compName]; else next[compName] = value;
            return next;
        });
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
                    {totalEmployees > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800">
                            {totalEmployees} NV
                        </span>
                    )}
                </div>
                <div className="flex gap-2">
                    <Button variant="unstyled" size="none" onClick={() => {
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
                    </Button>
                </div>
            </div>

            {competitions.length > 0 ? (() => {
                const groupedCompetitions: Record<string, Competition[]> = {};
                competitions.forEach(comp => {
                    let defaultGroup = getDefaultGroupLabel(comp.criteria);
                    let group = groupOverrides[comp.name] || defaultGroup;

                    if (!groupedCompetitions[group]) groupedCompetitions[group] = [];
                    groupedCompetitions[group].push(comp);
                });

                // Sắp xếp các dòng trong từng nhóm theo thứ tự kéo thả đã lưu trong Firebase (customOrder)
                Object.keys(groupedCompetitions).forEach(group => {
                    const order = customOrder[group];
                    if (order && order.length > 0) {
                        groupedCompetitions[group].sort((a, b) => {
                            const idxA = order.indexOf(a.name);
                            const idxB = order.indexOf(b.name);
                            if (idxA !== -1 && idxB !== -1) return idxA - idxB;
                            if (idxA !== -1) return -1;
                            if (idxB !== -1) return 1;
                            return 0;
                        });
                    }
                });

                const columns: DataTableColumn<Competition>[] = [
                    {
                        id: 'name',
                        header: 'Tiêu chí',
                        headerAlign: 'center',
                        minWidth: '180px',
                        cell: (comp, index) => {
                            const currentDisplayName = shortenName(comp.name, nameOverrides);
                            return (
                                <div className="w-full flex items-center gap-2 py-0.5 px-0.5">
                                    {/* Số thứ tự TO RÕ + Icon Kéo Thả */}
                                    <div className="flex items-center gap-1.5 shrink-0 select-none" title="Kéo thả để sắp xếp vị trí">
                                        <GripVertical
                                            className="h-3.5 w-3.5 text-slate-400 hover:text-sky-500 dark:text-slate-500 dark:hover:text-sky-400 cursor-grab active:cursor-grabbing shrink-0 transition-colors"
                                        />
                                        <span className="inline-flex items-center justify-center min-w-[24px] h-[22px] px-1.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs font-black tabular-nums border border-slate-200/90 dark:border-slate-700 shadow-xs">
                                            {index + 1}
                                        </span>
                                    </div>

                                    {/* Tên tiêu chí */}
                                    {editingNameFor === comp.name ? (
                                        <Input
                                            autoFocus
                                            value={editingNameValue}
                                            onChange={(e) => setEditingNameValue(e.target.value)}
                                            onFocus={(e) => {
                                                const val = e.target.value;
                                                e.target.setSelectionRange(val.length, val.length);
                                            }}
                                            onBlur={() => commitDisplayName(comp.name, editingNameValue)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') commitDisplayName(comp.name, editingNameValue);
                                                else if (e.key === 'Escape') setEditingNameFor(null);
                                            }}
                                            placeholder={shortenName(comp.name)}
                                            className="h-7 py-0.5 px-2 bg-white dark:bg-slate-900 rounded-md border-slate-200 dark:border-slate-700 text-[11px] font-medium uppercase tracking-wide shadow-none focus-visible:ring-1 focus-visible:ring-sky-500 placeholder:text-slate-400 placeholder:normal-case flex-1"
                                        />
                                    ) : (
                                        <div
                                            onDoubleClick={() => {
                                                setEditingNameFor(comp.name);
                                                setEditingNameValue(currentDisplayName);
                                            }}
                                            className="flex-1 text-left text-[11px] font-bold uppercase tracking-wide text-slate-800 dark:text-slate-200 hover:text-sky-600 dark:hover:text-sky-400 transition-colors cursor-pointer select-none py-1 px-1 rounded hover:bg-slate-100/60 dark:hover:bg-slate-800/60 truncate"
                                            title={`${comp.name} — Nhấp đúp để sửa tên hiển thị`}
                                        >
                                            {currentDisplayName}
                                        </div>
                                    )}
                                </div>
                            );
                        },
                    },
                    {
                        id: 'base',
                        header: 'Gốc',
                        align: 'center',
                        width: '95px',
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
                        width: '95px',
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
                        width: '90px',
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
                        align: 'center',
                        width: '95px',
                        cell: (comp) => {
                            const t = RATIO_CONTROL_THEME;
                            const ratio = targets[comp.name] ?? 100;
                            return (
                                <div className="flex items-center justify-center">
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
                                        <span className="text-[11px] font-bold opacity-60">%</span>
                                    </div>
                                </div>
                            );
                        },
                    },
                    {
                        id: 'group',
                        header: 'Nhóm tiêu chí',
                        headerAlign: 'center',
                        width: '180px',
                        cell: (comp) => (
                            <CompetitionGroupCell
                                value={groupOverrides[comp.name] ?? ''}
                                placeholder={getDefaultGroupLabel(comp.criteria)}
                                availableGroups={availableGroups}
                                onCommit={(val) => commitGroup(comp.name, val)}
                                onDeleteGroup={handleDeleteGroup}
                                onResetGroups={handleResetGroups}
                                hasDeletedGroups={(deletedGroups || []).length > 0}
                            />
                        ),
                    },
                ];

                return (
                    <div className="space-y-6">
                        {Object.entries(groupedCompetitions).map(([criteria, comps]) => (
                            <div key={criteria} className="space-y-2">
                                <h3 className="text-[12px] font-black text-slate-500 uppercase tracking-widest px-1 flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 bg-slate-300 dark:bg-slate-600 rounded-sm"></div>
                                    Nhóm Tiêu Chí: <span className="text-slate-700 dark:text-slate-200">{criteria}</span>
                                    <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500">({comps.length})</span>
                                </h3>
                                <DataTable
                                    columns={columns}
                                    data={comps}
                                    rowKey={(comp) => comp.name}
                                    compact
                                    stickyHeader={false}
                                    columnDividers
                                    overflowVisible
                                    fixedLayout
                                    className="!rounded-none"
                                    rowProps={(comp, index) => {
                                        const isDragging = draggedItem?.name === comp.name;
                                        const isOver = dragOverItem?.name === comp.name && !isDragging;
                                        return {
                                            draggable: true,
                                            onDragStart: (e) => {
                                                setDraggedItem({ group: criteria, index, name: comp.name });
                                                e.dataTransfer.effectAllowed = 'move';
                                                e.dataTransfer.setData('text/plain', comp.name);
                                            },
                                            onDragOver: (e) => {
                                                e.preventDefault();
                                                e.dataTransfer.dropEffect = 'move';
                                                if (dragOverItem?.name !== comp.name) {
                                                    setDragOverItem({ group: criteria, index, name: comp.name });
                                                }
                                            },
                                            onDragLeave: () => {
                                                if (dragOverItem?.name === comp.name) {
                                                    setDragOverItem(null);
                                                }
                                            },
                                            onDrop: (e) => {
                                                e.preventDefault();
                                                if (!draggedItem || draggedItem.name === comp.name) {
                                                    setDraggedItem(null);
                                                    setDragOverItem(null);
                                                    return;
                                                }

                                                if (draggedItem.group === criteria) {
                                                    // Sắp xếp lại thứ tự trong cùng một nhóm
                                                    const currentOrder = comps.map(c => c.name);
                                                    const fromIdx = currentOrder.indexOf(draggedItem.name);
                                                    const toIdx = currentOrder.indexOf(comp.name);
                                                    if (fromIdx !== -1 && toIdx !== -1 && fromIdx !== toIdx) {
                                                        const newOrder = [...currentOrder];
                                                        const [moved] = newOrder.splice(fromIdx, 1);
                                                        newOrder.splice(toIdx, 0, moved);
                                                        setCustomOrder(prev => ({
                                                            ...prev,
                                                            [criteria]: newOrder
                                                        }));
                                                        toast.success(`Đã đổi vị trí "${shortenName(draggedItem.name, nameOverrides)}"`);
                                                    }
                                                } else {
                                                    // Kéo thả chuyển sang nhóm khác
                                                    commitGroup(draggedItem.name, criteria);
                                                    setCustomOrder(prev => {
                                                        const srcList = (groupedCompetitions[draggedItem.group] || []).map(c => c.name).filter(n => n !== draggedItem.name);
                                                        const dstList = comps.map(c => c.name).filter(n => n !== draggedItem.name);
                                                        const targetIdx = dstList.indexOf(comp.name);
                                                        if (targetIdx !== -1) {
                                                            dstList.splice(targetIdx, 0, draggedItem.name);
                                                        } else {
                                                            dstList.push(draggedItem.name);
                                                        }
                                                        return {
                                                            ...prev,
                                                            [draggedItem.group]: srcList,
                                                            [criteria]: dstList
                                                        };
                                                    });
                                                    toast.success(`Đã chuyển "${shortenName(draggedItem.name, nameOverrides)}" sang nhóm "${criteria}"`);
                                                }
                                                setDraggedItem(null);
                                                setDragOverItem(null);
                                            },
                                            onDragEnd: () => {
                                                setDraggedItem(null);
                                                setDragOverItem(null);
                                            },
                                            className: cn(
                                                'cursor-grab active:cursor-grabbing transition-all select-none',
                                                isDragging && 'opacity-30 bg-sky-100/60 dark:bg-sky-900/40 border-2 border-dashed border-sky-400',
                                                isOver && 'border-t-2 border-t-sky-500 bg-sky-50/70 dark:bg-sky-950/40'
                                            )
                                        };
                                    }}
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
    const [activeTab, setActiveTab] = useIndexedDBState<ConfigTab>('supermarket-config-active-tab', 'data');

    const bookmarkletRef = useRef<HTMLAnchorElement>(null);

    useEffect(() => {
        if (bookmarkletRef.current) {
            bookmarkletRef.current.href = `javascript:%28async%20function%28%29%7Bfunction%20S%28m%2Ce%2Cd%3D5e3%29%7Bvar%20t%3Ddocument.getElementById%28%22__copy_wait_toast__%22%29%3Bt%7C%7C%28%28t%3Ddocument.createElement%28%22div%22%29%29.id%3D%22__copy_wait_toast__%22%2CObject.assign%28t.style%2C%7Bposition%3A%22fixed%22%2Ctop%3A%2220px%22%2Cright%3A%2220px%22%2CzIndex%3A%222147483647%22%2Cpadding%3A%2214px%2020px%22%2CborderRadius%3A%2210px%22%2CfontFamily%3A%22system-ui%2C%20-apple-system%2C%20sans-serif%22%2CfontSize%3A%2214px%22%2CfontWeight%3A%22600%22%2Ccolor%3A%22%23fff%22%2CboxShadow%3A%220%206px%2020px%20rgba%280%2C0%2C0%2C0.25%29%22%2Ctransition%3A%22all%200.3s%20ease%22%2CmaxWidth%3A%22360px%22%2ClineHeight%3A%221.4%22%7D%29%2Cdocument.body.appendChild%28t%29%29%2Ct.style.background%3De%3F%22linear-gradient%28135deg%2C%20%23dc2626%2C%20%23b91c1c%29%22%3Am.includes%28%22%E2%9C%85%22%29%3F%22linear-gradient%28135deg%2C%20%2316a34a%2C%20%2315803d%29%22%3A%22linear-gradient%28135deg%2C%20%230ea5e9%2C%20%232563eb%29%22%2Ct.innerHTML%3Dm%2Ct.style.opacity%3D%221%22%2CclearTimeout%28t.__timer%29%2Ce%7C%7C%21d%7C%7C%28t.__timer%3DsetTimeout%28function%28%29%7Bt.style.opacity%3D%220%22%7D%2Cd%29%29%7Dconst%20sleep%3Dms%3D%3Enew%20Promise%28r%3D%3EsetTimeout%28r%2Cms%29%29%2CnextFrame%3D%28%29%3D%3Enew%20Promise%28r%3D%3ErequestAnimationFrame%28r%29%29%2CSPINNERS%3D%5B%27%23Loading%27%2C%27.overload-wait%27%2C%27.animate-spin%27%2C%27.dx-loadpanel-content%27%2C%27.dx-loadpanel%3Anot%28.dx-state-invisible%29%27%2C%27.dx-loadindicator%27%2C%27.ant-spin-spinning%27%2C%27.el-loading-mask%27%2C%27%5Bclass%2A%3D%22spinner%22%20i%5D%27%2C%27%5Bclass%2A%3D%22loading%22%20i%5D%27%5D.join%28%27%2C%20%27%29%3Bfunction%20isVis%28el%29%7Breturn%21%21%28el%26%26null%21%3D%3Del.offsetParent%29%7Dfunction%20isSpinVis%28el%29%7Bif%28%21el%29return%211%3Bvar%20s%3Dwindow.getComputedStyle%28el%29%3Bif%28%22none%22%3D%3D%3Ds.display%7C%7C%22hidden%22%3D%3D%3Ds.visibility%7C%7C0%3D%3D%3DparseFloat%28s.opacity%7C%7C%221%22%29%29return%211%3Bif%28%22fixed%22%3D%3D%3Ds.position%29%7Bvar%20r%3Del.getBoundingClientRect%28%29%3Breturn%20r.width%3E0%26%26r.height%3E0%7Dreturn%20null%21%3D%3Del.offsetParent%7Dfunction%20isPlus%28el%29%7Breturn%20el%26%26el.classList%26%26el.classList.contains%28%22fa-plus%22%29%26%26%21el.classList.contains%28%22fa-minus%22%29%7Dfunction%20isOpened%28el%29%7Bvar%20c%3Del.closest%28%27button%2C%20a%2C%20%5Brole%3D%22button%22%5D%2C%20.cursor-pointer%2C%20td%2C%20div%27%29%3Breturn%21%28%21c%7C%7C%22true%22%21%3D%3Dc.getAttribute%28%22aria-expanded%22%29%26%26%22open%22%21%3D%3Dc.getAttribute%28%22data-state%22%29%26%26%21c.querySelector%28%22.fa-minus%22%29%29%7Dfunction%20getButtons%28%29%7Breturn%20Array.from%28new%20Set%28Array.from%28document.querySelectorAll%28%22.fa-solid.fa-plus.text-gray-700%2C%20.fa-plus%22%29%29%29%29.filter%28isVis%29.filter%28isPlus%29.filter%28b%3D%3E%221%22%21%3D%3Db.dataset.clickPlusDone%29.filter%28b%3D%3E%21isOpened%28b%29%29%7Dasync%20function%20waitSpinners%28maxMs%3D6e3%29%7Bawait%20sleep%2860%29%3Bvar%20start%3DDate.now%28%29%3Bwhile%28Date.now%28%29-start%3CmaxMs%29%7Bif%28%21Array.from%28document.querySelectorAll%28SPINNERS%29%29.some%28isSpinVis%29%29return%3Bawait%20sleep%28100%29%7D%7Dasync%20function%20forceRender%28%29%7Bvar%20sc%3Ddocument.scrollingElement%7C%7Cdocument.documentElement%2Cstep%3DMath.max%28window.innerHeight%7C%7C800%2C400%29%2Cpos%3D0%2Cguard%3D0%3Bwhile%28pos%3Csc.scrollHeight%26%26guard%3C500%29%7Bwindow.scrollTo%280%2Cpos%29%2Cawait%20sleep%28100%29%2Cpos%2B%3Dstep%2Cguard%2B%2B%7Dwindow.scrollTo%280%2Csc.scrollHeight%29%2Cawait%20sleep%28200%29%2Cwindow.scrollTo%280%2C0%29%2Cawait%20sleep%28200%29%7Dasync%20function%20copyText%28%29%7Bvar%20txt%3D%22%22%2Cae%3Ddocument.activeElement%3Bif%28ae%26%26%28%22TEXTAREA%22%3D%3D%3Dae.tagName%7C%7C%22INPUT%22%3D%3D%3Dae.tagName%26%26%28%22text%22%3D%3D%3Dae.type%7C%7C%22search%22%3D%3D%3Dae.type%29%29%29ae.select%28%29%2Ctxt%3Dae.value%3Belse%7Bvar%20sel%3Dwindow.getSelection%28%29%2Crg%3Ddocument.createRange%28%29%3Brg.selectNodeContents%28document.body%29%2Csel.removeAllRanges%28%29%2Csel.addRange%28rg%29%2Ctxt%3Dsel.toString%28%29%7C%7Cdocument.body.innerText%7C%7Cdocument.body.textContent%7C%7C%22%22%7Dif%28%21txt%7C%7C0%3D%3D%3Dtxt.length%29return%7Bok%3A%211%2Clen%3A0%7D%3Btry%7Bif%28navigator.clipboard%26%26navigator.clipboard.writeText%29return%20await%20navigator.clipboard.writeText%28txt%29%2C%7Bok%3A%210%2Clen%3Atxt.length%7D%7Dcatch%28e%29%7B%7Dtry%7Breturn%7Bok%3Adocument.execCommand%28%22copy%22%29%2Clen%3Atxt.length%7D%7Dcatch%28e%29%7Breturn%7Bok%3A%211%2Clen%3Atxt.length%7D%7D%7Dtry%7Bvar%20pending%3DgetButtons%28%29%2Ctotal%3D0%2CBATCH%3D4%3Bif%28pending.length%3E0%29%7BS%28%60%E2%9A%A1%20%C4%90ang%20t%E1%BB%B1%20%C4%91%E1%BB%99ng%20m%E1%BB%9F%20%24%7Bpending.length%7D%20m%E1%BB%A5c%20d%E1%BB%AF%20li%E1%BB%87u...%60%2C%211%2C0%29%3Bfor%28var%20i%3D0%3Bi%3Cpending.length%3Bi%2B%2B%29%7Bvar%20btn%3Dpending%5Bi%5D%3Btry%7BisVis%28btn%29%26%26isPlus%28btn%29%26%26%21isOpened%28btn%29%26%26%28btn.dataset.clickPlusDone%3D%221%22%2Cbtn.click%28%29%2Ctotal%2B%2B%29%7Dcatch%28e%29%7B%7DS%28%60%E2%9A%A1%20%C4%90%C3%A3%20m%E1%BB%9F%3A%20%24%7Btotal%7D%20%7C%20C%C3%B2n%3A%20%24%7Bpending.length-i-1%7D%60%2C%211%2C0%29%2C%28i%2B1%29%25BATCH%3D%3D0%7C%7Ci%3D%3D%3Dpending.length-1%3F%28await%20nextFrame%28%29%2Cawait%20waitSpinners%285e3%29%2Cawait%20sleep%2860%29%29%3Aawait%20sleep%2825%29%7DS%28%22%E2%8F%B3%20%C4%90ang%20cu%E1%BB%99n%20hi%E1%BB%83n%20th%E1%BB%8B%20to%C3%A0n%20b%E1%BB%99%20d%C3%B2ng...%22%2C%211%2C0%29%2Cawait%20forceRender%28%29%2Cawait%20waitSpinners%286e3%29%2Cawait%20sleep%28300%29%7Delse%20S%28%22%E2%8F%B3%20%C4%90ang%20ch%E1%BB%8Dn%20v%C3%A0%20sao%20ch%C3%A9p%20d%E1%BB%AF%20li%E1%BB%87u...%22%2C%211%2C0%29%3Bvar%20res%3Dawait%20copyText%28%29%3Bif%28%21res.ok%7C%7C0%3D%3D%3Dres.len%29return%20void%20S%28%22%E2%9A%A0%EF%B8%8F%20Kh%C3%B4ng%20c%C3%B3%20d%E1%BB%AF%20li%E1%BB%87u%20%C4%91%E1%BB%83%20copy%20ho%E1%BA%B7c%20quy%E1%BB%81n%20b%E1%BB%8B%20h%E1%BA%A1n%20ch%E1%BA%BF.%20Nh%E1%BA%A5n%20Ctrl%2BC%20%C4%91%E1%BB%83%20copy%20th%E1%BB%A7%20c%C3%B4ng.%22%2C%210%2C6e3%29%3Bvar%20msg%3Dtotal%3E0%3F%60%C4%90%C3%A3%20m%E1%BB%9F%20%24%7Btotal%7D%20m%E1%BB%A5c%20%26%20%60%3A%22%22%3BS%28%60%E2%9C%85%20%24%7Bmsg%7D%C4%90%C3%A3%20copy%20xong%20%24%7Bres.len.toLocaleString%28%22vi-VN%22%29%7D%20k%C3%BD%20t%E1%BB%B1%21%3Cbr%2F%3E%3Cspan%20style%3D%22font-size%3A12px%3Bopacity%3A0.9%3B%22%3EGi%E1%BB%9D%20b%E1%BA%A1n%20c%C3%B3%20th%E1%BB%83%20d%C3%A1n%20%28Ctrl%2BV%29%20an%20to%C3%A0n.%3C%2Fspan%3E%60%2C%211%2C5e3%29%7Dcatch%28e%29%7BS%28%60%E2%9D%8C%20Th%E1%BA%A5t%20b%E1%BA%A1i%3A%20%24%7Be.message%7D%60%2C%210%2C6e3%29%7D%7D%29%28%29%3B`;
        }
    }, []);

    const safeName = useMemo(() => supermarketName ? shortenSupermarketName(supermarketName) : '', [supermarketName]);

    const ids = useMemo(() => {
        if (!supermarketName) return { ds: null, td: null, rt: null, lk: null, tg: null, bk: null };
        return {
            ds: `config-${safeName}-danhsach`,
            td: `config-${safeName}-thidua`,
            rt: `config-${safeName}-industry-realtime`,
            lk: `config-${safeName}-industry-luyke`,
            tg: `config-${safeName}-tragop`,
            bk: `config-${safeName}-bankem`,
        };
    }, [supermarketName, safeName]);

    // Đọc danh sách NV ẩn để lọc đúng số lượng NV từ Phân tích
    const [hiddenEmployees] = useIndexedDBState<string[]>(safeName ? `hidden-employees-${safeName}` : null, []);

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
    const [analysisEmployees, setAnalysisEmployees] = useState<AnalysisEmployeesPayload | null>(null);

    useEffect(() => {
        getAnalysisEmployees().then(setAnalysisEmployees).catch(console.error);
        const handleUpdate = (e: CustomEvent) => {
            if (e.detail) setAnalysisEmployees(e.detail);
        };
        window.addEventListener('analysis-employees-updated', handleUpdate as EventListener);
        return () => window.removeEventListener('analysis-employees-updated', handleUpdate as EventListener);
    }, []);

    const getDetailedTimestamp = () => {
        const now = new Date();
        const time = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
        const date = now.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
        return `${time} ${date}`;
    };

    const departments = useMemo(() => {
        // Ưu tiên đếm theo danh sách nhân viên từ Phân tích nếu có
        if (analysisEmployees && analysisEmployees.employees.length > 0) {
            const depts = getDepartmentsFromAnalysis(analysisEmployees.employees, danhSachData, hiddenEmployees);
            if (depts.length > 0) return depts;
        }
        // Fallback dùng parseDepartments từ dữ liệu dán
        return parseDepartments(danhSachData, hiddenEmployees);
    }, [analysisEmployees, danhSachData, hiddenEmployees]);

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
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Nội dung cấu hình</p>
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
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-emerald-50 to-sky-50 dark:from-emerald-900/30 dark:to-sky-900/30 text-emerald-700 dark:text-emerald-400 font-bold text-[11px] uppercase rounded-full border border-emerald-300 dark:border-emerald-700/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 hover:border-emerald-400 dark:hover:border-emerald-600 hover:shadow-md hover:-translate-y-0.5 transition-all shadow-sm cursor-grab active:cursor-grabbing"
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
                            <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest px-1 pb-2 flex items-center gap-1.5">
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
                            <div className="flex items-center justify-between px-1 pb-2">
                                <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-sm"></div>
                                    BC D.Thu theo NV
                                </h3>
                                {analysisEmployees && analysisEmployees.employees.length > 0 && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                        {analysisEmployees.employees.length} NV từ Phân Tích
                                    </span>
                                )}
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-1 gap-2 sm:gap-3">
                                <StatusTile title="DOANH THU" lastUpdated={danhSachTs} value={danhSachData} downloadUrl="https://baocao.dienmayxanh.com/dashboard/revenue-consolidated"
                                    icon={<UsersIcon className="h-4 w-4" />} colorTheme="sky"
                                    onChange={(v) => { 
                                        setDanhSachData(v); 
                                        handleUpdate('danhSach', v, s => {
                                            const lower = s.toLowerCase();
                                            return (lower.includes('nhân viên') || lower.includes('nhan vien')) && 
                                                   (lower.includes('doanh thu') || lower.includes('dtlk') || lower.includes('dtqđ') || lower.includes('số lượng'));
                                        }, setDanhSachTs, `Nhân viên (DS) - ${supermarketName}`, ids.ds!); 
                                    }}
                                    onClear={(title) => { 
                                        setDanhSachData(''); 
                                        setDanhSachTs(null); 
                                        removeUpdate(ids.ds!); 
                                        toast.success(`Đã xoá dữ liệu ${title}`);
                                        
                                    }} />
                                
                                <StatusTile title="THI ĐUA NV" lastUpdated={thiDuaTs} value={thiDuaData} placeholder="Dán dữ liệu Thi đua NV..." error={errors.thiDua} 
                                    icon={<SparklesIcon className="h-4 w-4" />} colorTheme="amber"
                                    onChange={(v) => { 
                                        setThiDuaData(v); 
                                        if(v && validateThiDuaData(v)) { 
                                            onThiDuaDataChange(supermarketName, v); 
                                            handleUpdate('thiDua', v, validateThiDuaData, setThiDuaTs, `Nhân viên (TĐ) - ${supermarketName}`, ids.td!); 
                                        } else setErrors(p => ({...p, thiDua: 'Sai định dạng Thi đua NV.'})); 
                                    }}
                                    onClear={(title) => { 
                                        setThiDuaData(''); 
                                        setThiDuaTs(null); 
                                        removeUpdate(ids.td!); 
                                        toast.success(`Đã xoá dữ liệu ${title}`);
                                        
                                    }} />
                            </div>
                        </div>

                        {/* NHÓM 3: TRẢ GÓP NHÂN VIÊN */}
                        <div>
                            <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest px-1 pb-2 flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 bg-rose-500 rounded-sm"></div>
                                Trả góp nhân viên
                            </h3>
                            <div className="grid grid-cols-1 gap-2 sm:gap-3">
                                {/* Tạm ẩn ô nhập liệu HQ BÁN KÈM theo yêu cầu */}
                                {/* <StatusTile title="HQ BÁN KÈM" lastUpdated={banKemTs} value={banKemData} placeholder="Nhân viên..." error={errors.banKem} 
                                    icon={<ChartBarIcon className="h-4 w-4" />} colorTheme="emerald"
                                    onChange={(v) => { setBanKemData(v); handleUpdate('banKem', v, s => s.includes('Nhân viên	DTLK	DTLK áp dụng MNGN'), setBanKemTs, `Nhân viên (BK) - ${supermarketName}`, ids.bk!); }}
                                    onClear={(title) => { 
                                        setBanKemData(''); 
                                        setBanKemTs(null); 
                                        removeUpdate(ids.bk!); 
                                        toast.success(`Đã xoá dữ liệu ${title}`);
                                    }} /> */}

                                <StatusTile title="Trả góp NV" lastUpdated={traGopTs} value={traGopData} downloadUrl="https://baocao.dienmayxanh.com/dashboard/tra-cham"
                                    icon={<ChartPieIcon className="h-4 w-4" />} colorTheme="sky"
                                    onChange={(v) => { 
                                        setTraGopData(v); 
                                        handleUpdate('traGop', v, s => {
                                            const lower = s.toLowerCase();
                                            return (lower.includes('nhân viên') || lower.includes('nhan vien')) && 
                                                   (lower.includes('trả góp') || lower.includes('tra gop') || lower.includes('trả chậm') || lower.includes('tra cham') || lower.includes('homecredit') || lower.includes('dt siêu thị'));
                                        }, setTraGopTs, `Nhân viên (TG) - ${supermarketName}`, ids.tg!); 
                                    }}
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
                {activeTab === 'revenueTarget' && <TargetHero supermarketName={supermarketName!} addUpdate={addUpdate} departments={departments} summaryLuyKeData={summaryLuyKeData} analysisEmployees={analysisEmployees} />}
                {activeTab === 'competitionTarget' && <CompetitionTarget supermarketName={supermarketName!} addUpdate={addUpdate} competitions={competitions} competitionLuyKeData={competitionLuyKeData} totalEmployees={departments.reduce((s, d) => s + d.employeeCount, 0)} />}
            </div>
        </div>
    );
};

export default SupermarketConfig;
