
import React, { useRef, useMemo, useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ResetIcon, AlertTriangleIcon, UploadIcon, ClockIcon, TrashIcon, UsersIcon, SparklesIcon, ChartBarIcon, ChartPieIcon } from './Icons';
import { Link2, Pencil, GripVertical } from 'lucide-react';
import { useIndexedDBState } from '../hooks/useIndexedDBState';
import toast from 'react-hot-toast';
import confetti from 'canvas-confetti';
import TargetHero from './TargetHero';
import * as db from '../utils/db';
import { TileLinkModal } from './TileLinkModal';
import { AutoClickGuideModal, AUTO_CLICK_BOOKMARKLET_CODE } from './AutoClickGuideModal';
import {
    DEFAULT_TILE_LINKS,
    getTileLink,
    saveTileLink,
    resetTileLink,
    TILE_CUSTOM_LINKS_KEY,
} from '../services/tileLinkService';
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

const CRITERIA_GROUP_PALETTES = [
    {
        square: 'bg-sky-500 shadow-xs',
        label: 'text-sky-700 dark:text-sky-400',
        value: 'text-sky-950 dark:text-sky-100',
        badge: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800',
    },
    {
        square: 'bg-emerald-500 shadow-xs',
        label: 'text-emerald-700 dark:text-emerald-400',
        value: 'text-emerald-950 dark:text-emerald-100',
        badge: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
    },
    {
        square: 'bg-amber-500 shadow-xs',
        label: 'text-amber-700 dark:text-amber-400',
        value: 'text-amber-950 dark:text-amber-100',
        badge: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
    },
    {
        // Sky TẦNG ĐẬM — trước là `purple` (ngoài bảng đã duyệt). Đã thử `slate`, nhưng chụp màn
        // hình đối chiếu 7 tông cạnh nhau cho thấy slate đọc như "vô hiệu hoá" chứ không như một
        // hạng mục ngang hàng (slate là họ trung tính của nền/viền/chữ). Dùng tầng sắc độ thứ 2
        // của sky — cùng cách đã áp cho dải màu ở CompetitionListView.tsx, giữ 2 file nhất quán.
        square: 'bg-sky-700 shadow-xs',
        label: 'text-sky-900 dark:text-sky-300',
        value: 'text-sky-950 dark:text-sky-50',
        badge: 'bg-sky-100 text-sky-900 border-sky-300 dark:bg-sky-900/60 dark:text-sky-100 dark:border-sky-600',
    },
    {
        square: 'bg-rose-500 shadow-xs',
        label: 'text-rose-700 dark:text-rose-400',
        value: 'text-rose-950 dark:text-rose-100',
        badge: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800',
    },
    {
        // Emerald TẦNG ĐẬM — tầng sắc độ thứ 2 của họ emerald (CLAUDE.md mục 2: "6 họ semantic
        // x 2 tầng sắc độ"). Trước đây dùng `teal`, là màu NGOÀI bảng đã duyệt.
        square: 'bg-emerald-700 shadow-xs',
        label: 'text-emerald-900 dark:text-emerald-300',
        value: 'text-emerald-950 dark:text-emerald-50',
        badge: 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-900/60 dark:text-emerald-100 dark:border-emerald-600',
    },
    {
        square: 'bg-indigo-500 shadow-xs',
        label: 'text-indigo-700 dark:text-indigo-400',
        value: 'text-indigo-950 dark:text-indigo-100',
        badge: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800',
    },
];

const getCriteriaGroupPalette = (criteria: string, index: number) => {
    const c = (criteria || '').toLowerCase();
    if (c.includes('dịch vụ') || c.includes('dich vu')) return CRITERIA_GROUP_PALETTES[0]; // Sky
    if (c.includes('doanh thu') || c.includes('dt') || c.includes('bán hàng')) return CRITERIA_GROUP_PALETTES[1]; // Emerald
    if (c.includes('quy đổi') || c.includes('quy doi')) return CRITERIA_GROUP_PALETTES[2]; // Amber
    if (c.includes('gia dụng') || c.includes('gia dung') || c.includes('ce & gd')) return CRITERIA_GROUP_PALETTES[3]; // Purple
    if (c.includes('điện tử') || c.includes('dien tu') || c.includes('điện lạnh')) return CRITERIA_GROUP_PALETTES[4]; // Rose
    if (c.includes('viễn thông') || c.includes('phụ kiện') || c.includes('it')) return CRITERIA_GROUP_PALETTES[5]; // Teal
    return CRITERIA_GROUP_PALETTES[index % CRITERIA_GROUP_PALETTES.length];
};

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
    onChange: (val: string) => boolean | void | Promise<boolean | void>;
    onClear: (title: string) => void;
    error?: string | null;
    icon?: React.ReactNode;
    colorTheme?: 'emerald' | 'sky' | 'rose' | 'amber';
    downloadUrl?: string;
    linkUrl?: string;
    onOpenLinkModal?: () => void;
}> = ({ title, lastUpdated, value, placeholder, onChange, onClear, error, icon, colorTheme = 'sky', downloadUrl, linkUrl, onOpenLinkModal }) => {
    const [isPasting, setIsPasting] = useState(false);
    const hasData = value && value.length > 0 && !error;

    const fireSuccessCelebration = () => {
        confetti({
            particleCount: 70,
            spread: 70,
            origin: { y: 0.6 }
        });
        toast.success(`✨ Đã dán và cập nhật thành công ${title}!`, { duration: 3000 });
    };

    const handleTileClick = async () => {
        if (isPasting) return;

        if (navigator?.clipboard?.readText) {
            try {
                const clipText = await navigator.clipboard.readText();
                if (clipText && clipText.trim().length > 0) {
                    const ok = await onChange(clipText);
                    if (ok !== false) {
                        fireSuccessCelebration();
                        return;
                    } else {
                        toast.error(`⚠️ Dữ liệu dán vào không đúng định dạng của ô "${title}"!\n🛡️ Dữ liệu ban đầu vẫn được giữ nguyên an toàn.`, {
                            duration: 5000,
                            id: `paste-err-${title}`
                        });
                        setIsPasting(true);
                        return;
                    }
                } else {
                    toast('Bộ nhớ tạm (Clipboard) trống. Vui lòng sao chép dữ liệu trước!', { icon: '📋' });
                    setIsPasting(true);
                    return;
                }
            } catch (err) {
                console.warn('[StatusTile] Không thể đọc Clipboard tự động:', err);
                setIsPasting(true);
                return;
            }
        } else {
            setIsPasting(true);
        }
    };

    const themeColors = {
        emerald: {
            wrapper: 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 border-l-[3px] border-l-emerald-600',
            text: 'text-emerald-800 dark:text-emerald-200',
            iconActive: 'text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-700',
            ring: 'border-emerald-500 ring-2 ring-emerald-500/20'
        },
        sky: {
            wrapper: 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 border-l-[3px] border-l-sky-600',
            text: 'text-sky-800 dark:text-sky-200',
            iconActive: 'text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-700',
            ring: 'border-sky-500 ring-2 ring-sky-500/20'
        },
        rose: {
            wrapper: 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 border-l-[3px] border-l-rose-600',
            text: 'text-rose-800 dark:text-rose-200',
            iconActive: 'text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-700',
            ring: 'border-rose-500 ring-2 ring-rose-500/20'
        },
        amber: {
            wrapper: 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 border-l-[3px] border-l-amber-600',
            text: 'text-amber-800 dark:text-amber-200',
            iconActive: 'text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-700',
            ring: 'border-amber-500 ring-2 ring-amber-500/20'
        },
    };

    const currentTheme = themeColors[colorTheme] || themeColors.sky;
    const effectiveLink = linkUrl || downloadUrl;

    return (
        <div className="relative group group/tile w-full">
            <div 
                onClick={handleTileClick}
                title="Click để tự động dán dữ liệu từ Clipboard"
                className={`
                    cursor-pointer min-h-[56px] transition-colors duration-200 flex items-center px-3 relative overflow-hidden border
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
                            onPaste={async (e) => {
                                const text = e.clipboardData.getData('text');
                                setIsPasting(false);
                                const ok = await onChange(text);
                                if (ok !== false) {
                                    fireSuccessCelebration();
                                } else {
                                    toast.error(`⚠️ Dữ liệu dán vào không đúng định dạng của ô "${title}"!\n🛡️ Dữ liệu ban đầu vẫn được giữ nguyên an toàn.`, {
                                        duration: 5000,
                                        id: `paste-err-${title}`
                                    });
                                }
                            }}
                            onBlur={() => setIsPasting(false)}
                        />
                        <Button variant="unstyled" size="none" onClick={(e) => { e.stopPropagation(); setIsPasting(false); }} className="px-2 py-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-[11px] font-bold text-slate-500 transition-colors bg-slate-100 dark:bg-slate-800">HUỶ</Button>
                    </div>
                ) : (
                    <div className="flex items-center justify-between w-full gap-3 pr-20 group-hover/tile:pr-28 transition-all duration-150">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className={`p-1.5 rounded-lg shrink-0 transition-colors duration-200 bg-white dark:bg-slate-800 ${hasData ? currentTheme.iconActive : 'border border-slate-200 dark:border-slate-700 text-slate-400'}`}>
                                {icon || <UploadIcon className="h-4 w-4" />}
                            </div>
                            <div className="min-w-0">
                                <h4 className={`text-xs sm:text-[13px] font-bold uppercase tracking-wide truncate transition-colors duration-200 ${hasData ? currentTheme.text : 'text-slate-600 dark:text-slate-400 group-hover/tile:text-slate-800'}`}>{title}</h4>
                                {hasData ? (
                                    lastUpdated && (
                                    <span className={`text-xs font-medium uppercase flex items-center gap-1 mt-[1px] opacity-80 ${currentTheme.text}`}>
                                        <ClockIcon className="h-3 w-3" /> {lastUpdated}
                                    </span>
                                )) : (
                                    <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-[1px] block truncate text-left">Click để tự dán</span>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {!isPasting && (
                <div className="absolute top-1/2 -translate-y-1/2 right-2 flex items-center gap-1 z-10">
                    {onOpenLinkModal && (
                        <Button
                            type="button"
                            variant="unstyled"
                            size="none"
                            onClick={(e) => {
                                e.stopPropagation();
                                onOpenLinkModal();
                            }}
                            className="opacity-0 group-hover/tile:opacity-100 focus:opacity-100 p-1.5 text-slate-500 hover:text-sky-600 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-all duration-150 border border-slate-200/80 dark:border-slate-700 shadow-2xs active:scale-95"
                            title="Chỉnh sửa liên kết"
                            aria-label="Chỉnh sửa liên kết"
                        >
                            <Pencil className="h-3.5 w-3.5" />
                        </Button>
                    )}

                    {(effectiveLink || onOpenLinkModal) && (
                        <a
                            href={effectiveLink || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => {
                                e.stopPropagation();
                                if (!effectiveLink) {
                                    e.preventDefault();
                                    onOpenLinkModal?.();
                                }
                            }}
                            className="p-1.5 text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/60 dark:hover:bg-sky-900/60 rounded-lg transition-all border border-sky-200/90 hover:border-sky-300 dark:border-sky-800/80 dark:hover:border-sky-700 shadow-2xs active:scale-95"
                            title={effectiveLink ? `Mở liên kết: ${effectiveLink}` : 'Mở liên kết báo cáo'}
                            aria-label="Mở liên kết báo cáo"
                        >
                            <Link2 className="h-3.5 w-3.5" />
                        </a>
                    )}

                    {hasData && (
                        <Button
                            variant="unstyled"
                            size="none"
                            onClick={(e) => {
                                e.stopPropagation();
                                onClear(title);
                            }}
                            className="p-1.5 text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/60 rounded-lg transition-all border border-rose-200/90 hover:border-rose-300 dark:border-rose-800/80 dark:hover:border-rose-700 shadow-2xs active:scale-95"
                            title="Xoá"
                            aria-label="Xoá dữ liệu"
                        >
                            <TrashIcon className="h-3.5 w-3.5" />
                        </Button>
                    )}
                </div>
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
                    <div className="w-1.5 h-3.5 bg-amber-600 rounded-full"></div>
                    <h2 className="text-xs sm:text-[13px] font-bold text-slate-800 dark:text-white uppercase tracking-wider">Cấu hình Thi đua</h2>
                    {totalEmployees > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800">
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
                    }} className="flex items-center p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded transition-colors" title="Reset">
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
                                            className="h-7 py-0.5 px-2 bg-white dark:bg-slate-900 rounded-md border-slate-200 dark:border-slate-700 text-xs sm:text-[13px] font-medium uppercase tracking-wide shadow-none focus-visible:ring-1 focus-visible:ring-sky-500 placeholder:text-slate-400 placeholder:normal-case flex-1"
                                        />
                                    ) : (
                                        <div
                                            onDoubleClick={() => {
                                                setEditingNameFor(comp.name);
                                                setEditingNameValue(currentDisplayName);
                                            }}
                                            className="flex-1 text-left text-xs sm:text-[13px] font-bold uppercase tracking-wide text-slate-800 dark:text-slate-200 hover:text-sky-600 dark:hover:text-sky-400 transition-colors cursor-pointer select-none py-1 px-1 rounded hover:bg-slate-100/60 dark:hover:bg-slate-800/60 truncate"
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
                        width: '100px',
                        cell: (comp) => {
                            const baseVal = baseTargets[comp.name] || 0;
                            const unitSuffix = comp.criteria === 'SLLK' ? ' Cái' : ' Tr';
                            return <span className="text-xs sm:text-[13px] font-bold tabular-nums text-slate-600 dark:text-slate-400">{f.format(baseVal)}{unitSuffix}</span>;
                        },
                    },
                    {
                        id: 'after',
                        header: 'Sau',
                        align: 'center',
                        width: '105px',
                        cell: (comp) => {
                            const idx = competitions.findIndex(c => c.name === comp.name);
                            const t = COMPETITION_ROW_THEMES[idx % COMPETITION_ROW_THEMES.length];
                            const baseVal = baseTargets[comp.name] || 0;
                            const ratio = targets[comp.name] ?? 100;
                            const adjVal = baseVal * (ratio / 100);
                            const unitSuffix = comp.criteria === 'SLLK' ? ' Cái' : ' Tr';
                            return <span className={`text-xs sm:text-[13px] font-black tabular-nums ${t.after}`}>{f.format(adjVal)}{unitSuffix}</span>;
                        },
                    },
                    {
                        id: 'perPerson',
                        header: '/Người',
                        align: 'center',
                        width: '105px',
                        cell: (comp) => {
                            const baseVal = baseTargets[comp.name] || 0;
                            const ratio = targets[comp.name] ?? 100;
                            const adjVal = baseVal * (ratio / 100);
                            const perPerson = totalEmployees > 0 ? adjVal / totalEmployees : 0;
                            const perPersonUnit = comp.criteria === 'SLLK' ? 'Cái/ng' : 'Tr/ng';
                            if (perPerson <= 0) return <span className="text-xs text-slate-300 dark:text-slate-600">—</span>;
                            return <span className="text-xs sm:text-[13px] font-bold tabular-nums text-slate-500 dark:text-slate-400">{fPerPerson.format(perPerson)} {perPersonUnit}</span>;
                        },
                    },
                    {
                        id: 'ratio',
                        header: '% Target',
                        align: 'center',
                        width: '100px',
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
                                            className={`w-8 sm:w-10 bg-transparent text-center text-xs sm:text-[13px] font-black ${t.inputText} outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                                        />
                                        <span className="text-xs font-bold opacity-75">%</span>
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
                        {Object.entries(groupedCompetitions).map(([criteria, comps], groupIdx) => {
                            const palette = getCriteriaGroupPalette(criteria, groupIdx);
                            return (
                                <div key={criteria} className="space-y-2">
                                    <h3 className="text-xs sm:text-[13px] font-bold uppercase tracking-wider px-1 flex items-center gap-2">
                                        <div className={`w-2.5 h-2.5 rounded-sm ${palette.square} shrink-0`}></div>
                                        <span className={palette.label}>Nhóm Tiêu Chí:</span>
                                        <span className={`${palette.value} font-black`}>{criteria}</span>
                                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-bold border ${palette.badge}`}>
                                            {comps.length}
                                        </span>
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
                        );
                    })}
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

    const [isGuideOpen, setIsGuideOpen] = useState(false);
    const bookmarkletRef = useRef<HTMLAnchorElement>(null);

    useEffect(() => {
        if (bookmarkletRef.current) {
            bookmarkletRef.current.href = AUTO_CLICK_BOOKMARKLET_CODE;
        }
    }, []);

    const safeName = useMemo(() => supermarketName ? shortenSupermarketName(supermarketName) : '', [supermarketName]);

    const ids = useMemo(() => {
        if (!supermarketName) return { ds: null, td: null, rt: null, lk: null, tg: null, bk: null, empRt: null };
        return {
            ds: `config-${safeName}-danhsach`,
            td: `config-${safeName}-thidua`,
            rt: `config-${safeName}-industry-realtime`,
            lk: `config-${safeName}-industry-luyke`,
            tg: `config-${safeName}-tragop`,
            bk: `config-${safeName}-bankem`,
            empRt: `config-${safeName}-employee-realtime`,
        };
    }, [supermarketName, safeName]);

    // Đọc danh sách NV ẩn để lọc đúng số lượng NV từ Phân tích
    const [hiddenEmployees] = useIndexedDBState<string[]>(safeName ? `hidden-employees-${safeName}` : null, []);

    const [employeeRealtimeData, setEmployeeRealtimeData] = useIndexedDBState(ids.empRt, '');
    const [danhSachData, setDanhSachData] = useIndexedDBState(ids.ds, '');
    const [thiDuaData, setThiDuaData] = useIndexedDBState(ids.td, '');
    const [industryRealtimeData, setIndustryRealtimeData] = useIndexedDBState(ids.rt, '');
    const [industryLuyKeData, setIndustryLuyKeData] = useIndexedDBState(ids.lk, '');
    const [traGopData, setTraGopData] = useIndexedDBState(ids.tg, '');
    const [banKemData, setBanKemData] = useIndexedDBState(ids.bk, '');

    const [employeeRealtimeTs, setEmployeeRealtimeTs] = useIndexedDBState<string | null>(supermarketName ? `${ids.empRt}-ts` : null, null);
    const [danhSachTs, setDanhSachTs] = useIndexedDBState<string | null>(supermarketName ? `${ids.ds}-ts` : null, null);
    const [thiDuaTs, setThiDuaTs] = useIndexedDBState<string | null>(supermarketName ? `${ids.td}-ts` : null, null);
    const [industryRealtimeTs, setIndustryRealtimeTs] = useIndexedDBState<string | null>(supermarketName ? `${ids.rt}-ts` : null, null);
    const [industryLuyKeTs, setIndustryLuyKeTs] = useIndexedDBState<string | null>(supermarketName ? `${ids.lk}-ts` : null, null);
    const [traGopTs, setTraGopTs] = useIndexedDBState<string | null>(supermarketName ? `${ids.tg}-ts` : null, null);
    const [banKemTs, setBanKemTs] = useIndexedDBState<string | null>(supermarketName ? `${ids.bk}-ts` : null, null);

    const [errors, setErrors] = useState<Record<string, string | null>>({});
    const [analysisEmployees, setAnalysisEmployees] = useState<AnalysisEmployeesPayload | null>(null);

    const [customLinks, setCustomLinks] = useIndexedDBState<Record<string, string> | null>(TILE_CUSTOM_LINKS_KEY as any, null);
    const [modalConfig, setModalConfig] = useState<{
        isOpen: boolean;
        tileId: string;
        tileName?: string;
        groupName?: string;
        currentUrl: string;
        defaultUrl: string;
    } | null>(null);

    const handleOpenLinkConfig = (tileId: string, tileName: string, groupName: string) => {
        const currentUrl = getTileLink(tileId, customLinks);
        const defaultUrl = DEFAULT_TILE_LINKS[tileId] || 'https://baocao.dienmayxanh.com/dashboard/revenue-consolidated';
        setModalConfig({
            isOpen: true,
            tileId,
            tileName,
            groupName,
            currentUrl,
            defaultUrl,
        });
    };

    const handleSaveLink = async (tileId: string, newUrl: string) => {
        const updated = await saveTileLink(tileId, newUrl);
        setCustomLinks(updated);
    };

    const handleResetLink = async (tileId: string) => {
        const updated = await resetTileLink(tileId);
        setCustomLinks(updated);
    };

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

    const handleUpdate = (
        key: string,
        val: string,
        validator: (s: string) => boolean,
        dataSetter: (value: string) => void,
        tsSetter: (value: string | null) => void,
        updateMsg: string,
        id: string,
        tileTitle: string
    ): boolean => {
        if (val === '') {
            dataSetter('');
            setErrors(p => ({...p, [key]: null}));
            tsSetter(null);
            removeUpdate(id);
            return false;
        }
        if (validator(val)) {
            dataSetter(val);
            const newTs = getDetailedTimestamp();
            setErrors(p => ({...p, [key]: null}));
            tsSetter(newTs);
            addUpdate(id, updateMsg, 'Thiết lập và cập nhật dữ liệu cho siêu thị');
            return true;
        } else {
            setErrors(p => ({...p, [key]: 'Dữ liệu sai định dạng.'}));
            toast.error(`⚠️ Dữ liệu dán vào không đúng định dạng của ô "${tileTitle}"!\n🛡️ Dữ liệu ban đầu vẫn được giữ nguyên an toàn.`, {
                duration: 5000,
                id: `err-${key}`
            });
            return false;
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-700/60 mb-2 overflow-x-auto scrollbar-hide">
                <Tabs
                        items={[
                            { id: 'data', label: 'Dữ liệu' },
                            { id: 'revenueTarget', label: 'Target Doanh thu' },
                            { id: 'competitionTarget', label: 'Target Thi đua' }
                        ]}
                        activeId={activeTab}
                        onChange={(id) => setActiveTab(id as ConfigTab)}
                        variant="underline"
                        className="border-b-0"
                    />
                    <div className="shrink-0 flex items-center pr-1 pb-1">
                        <a
                            ref={bookmarkletRef}
                            href={AUTO_CLICK_BOOKMARKLET_CODE}
                            draggable
                            className="group relative inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-emerald-600 via-sky-600 to-emerald-600 hover:from-emerald-500 hover:via-sky-500 hover:to-emerald-500 text-white font-bold text-xs rounded-lg shadow-sm shadow-emerald-600/25 hover:shadow-md hover:shadow-emerald-600/40 border border-emerald-400/40 transition-all duration-200 cursor-grab active:cursor-grabbing hover:scale-[1.03] active:scale-[0.98]"
                            title="Bấm để xem hướng dẫn chi tiết hoặc Kéo thả lên thanh Dấu trang (Bookmarks)"
                            onClick={(e) => {
                                e.preventDefault();
                                setIsGuideOpen(true);
                            }}
                        >
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-200 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-100"></span>
                            </span>
                            <SparklesIcon className="w-3.5 h-3.5 text-emerald-100 group-hover:rotate-12 transition-transform duration-200 shrink-0" />
                            <span className="tracking-wide">Auto Click+</span>
                            <span className="ml-0.5 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider rounded bg-emerald-700/80 text-emerald-100 border border-emerald-400/30">
                                1-Click
                            </span>
                        </a>
                    </div>
                </div>
            
            <div className="animate-in fade-in duration-200">
                {activeTab === 'data' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* NHÓM 1: BC D.THU NGÀNH HÀNG (DÀNH CHO SIÊU THỊ) */}
                        <div>
                            <h3 className="text-xs sm:text-[13px] font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider px-1 pb-2 flex items-center gap-1.5">
                                <div className="w-2 h-2 bg-sky-500 rounded-sm"></div>
                                Siêu thị ngành hàng
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-1 gap-2 sm:gap-3">
                                <StatusTile title="Realtime" lastUpdated={industryRealtimeTs} value={industryRealtimeData} placeholder="Ngành hàng Realtime..." error={errors.industryRealtime} 
                                    icon={<ClockIcon className="h-4 w-4" />} colorTheme="amber"
                                    linkUrl={getTileLink('industry-realtime', customLinks)}
                                    onOpenLinkModal={() => handleOpenLinkConfig('industry-realtime', 'Realtime', 'Siêu thị ngành hàng')}
                                    onChange={(v) => { 
                                        return handleUpdate(
                                            'industryRealtime',
                                            v,
                                            s => s.includes('Nhóm ngành hàng\tSL Realtime') || s.toUpperCase().includes('NGÀNH HÀNG / NHÓM HÀNG') || (s.toUpperCase().includes('SỐ LƯỢNG') && s.toUpperCase().includes('DOANH THU QĐ')),
                                            setIndustryRealtimeData,
                                            setIndustryRealtimeTs,
                                            `Ngành hàng (RT) - ${supermarketName}`,
                                            ids.rt!,
                                            'Realtime Ngành hàng'
                                        ); 
                                    }}
                                    onClear={(title) => { 
                                        setIndustryRealtimeData(''); 
                                        setIndustryRealtimeTs(null); 
                                        removeUpdate(ids.rt!); 
                                        toast.success(`Đã xoá dữ liệu ${title}`);
                                    }} />
                                <StatusTile title="Luỹ kế" lastUpdated={industryLuyKeTs} value={industryLuyKeData}
                                    icon={<ChartPieIcon className="h-4 w-4" />} colorTheme="emerald"
                                    linkUrl={getTileLink('industry-luyke', customLinks)}
                                    onOpenLinkModal={() => handleOpenLinkConfig('industry-luyke', 'Luỹ kế', 'Siêu thị ngành hàng')}
                                    onChange={(v) => { 
                                        return handleUpdate(
                                            'industryLuyKe',
                                            v,
                                            s => s.includes('Ngành hàng\tSL') || s.toUpperCase().includes('NGÀNH HÀNG / NHÓM HÀNG') || (s.toUpperCase().includes('SỐ LƯỢNG') && s.toUpperCase().includes('DOANH THU QĐ')),
                                            setIndustryLuyKeData,
                                            setIndustryLuyKeTs,
                                            `Ngành hàng (LK) - ${supermarketName}`,
                                            ids.lk!,
                                            'Luỹ kế Ngành hàng'
                                        ); 
                                    }}
                                    onClear={(title) => { 
                                        setIndustryLuyKeData(''); 
                                        setIndustryLuyKeTs(null); 
                                        removeUpdate(ids.lk!); 
                                        toast.success(`Đã xoá dữ liệu ${title}`);
                                    }} />
                            </div>
                        </div>
                        {/* NHÓM 2: DOANH THU NHÂN VIÊN */}
                        <div>
                            <div className="flex items-center justify-between px-1 pb-2">
                                <h3 className="text-xs sm:text-[13px] font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                                    <div className="w-2 h-2 bg-emerald-500 rounded-sm"></div>
                                    DOANH THU NHÂN VIÊN
                                </h3>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-1 gap-2 sm:gap-3">
                                <StatusTile title="REALTIME" lastUpdated={employeeRealtimeTs} value={employeeRealtimeData} placeholder="Dán dữ liệu Realtime..." error={errors.employeeRealtime}
                                    icon={<ClockIcon className="h-4 w-4" />} colorTheme="amber"
                                    linkUrl={getTileLink('nhanvien-realtime', customLinks)}
                                    onOpenLinkModal={() => handleOpenLinkConfig('nhanvien-realtime', 'REALTIME', 'DOANH THU NHÂN VIÊN')}
                                    onChange={(v) => { 
                                        return handleUpdate(
                                            'employeeRealtime',
                                            v,
                                            s => {
                                                const lower = s.toLowerCase();
                                                return (lower.includes('nhân viên') || lower.includes('nhan vien')) && 
                                                       (lower.includes('doanh thu') || lower.includes('dt') || lower.includes('số lượng') || lower.includes('dtlk') || lower.includes('dtqđ') || lower.includes('realtime'));
                                            },
                                            setEmployeeRealtimeData,
                                            setEmployeeRealtimeTs,
                                            `Nhân viên Realtime - ${supermarketName}`,
                                            ids.empRt!,
                                            'Nhân viên Realtime'
                                        ); 
                                    }}
                                    onClear={(title) => { 
                                        setEmployeeRealtimeData(''); 
                                        setEmployeeRealtimeTs(null); 
                                        removeUpdate(ids.empRt!); 
                                        toast.success(`Đã xoá dữ liệu ${title}`);
                                    }} />

                                <StatusTile title="LUỸ KẾ" lastUpdated={danhSachTs} value={danhSachData}
                                    icon={<UsersIcon className="h-4 w-4" />} colorTheme="emerald"
                                    linkUrl={getTileLink('nhanvien-doanhthu', customLinks)}
                                    onOpenLinkModal={() => handleOpenLinkConfig('nhanvien-doanhthu', 'LUỸ KẾ', 'DOANH THU NHÂN VIÊN')}
                                    onChange={(v) => { 
                                        return handleUpdate(
                                            'danhSach',
                                            v,
                                            s => {
                                                const lower = s.toLowerCase();
                                                return (lower.includes('nhân viên') || lower.includes('nhan vien')) && 
                                                       (lower.includes('doanh thu') || lower.includes('dtlk') || lower.includes('dtqđ') || lower.includes('số lượng'));
                                            },
                                            setDanhSachData,
                                            setDanhSachTs,
                                            `Nhân viên (DS) - ${supermarketName}`,
                                            ids.ds!,
                                            'Nhân viên Luỹ kế'
                                        ); 
                                    }}
                                    onClear={(title) => { 
                                        setDanhSachData(''); 
                                        setDanhSachTs(null); 
                                        removeUpdate(ids.ds!); 
                                        toast.success(`Đã xoá dữ liệu ${title}`);
                                    }} />
                            </div>
                        </div>

                        {/* NHÓM 3: THI ĐUA & TRẢ CHẬM */}
                        <div>
                            <h3 className="text-xs sm:text-[13px] font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider px-1 pb-2 flex items-center gap-1.5">
                                <div className="w-2 h-2 bg-rose-500 rounded-sm"></div>
                                THI ĐUA & TRẢ CHẬM
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-1 gap-2 sm:gap-3">
                                <StatusTile title="THI ĐUA" lastUpdated={thiDuaTs} value={thiDuaData} placeholder="Dán dữ liệu Thi đua..." error={errors.thiDua} 
                                    icon={<SparklesIcon className="h-4 w-4" />} colorTheme="amber"
                                    linkUrl={getTileLink('nhanvien-thidua', customLinks)}
                                    onOpenLinkModal={() => handleOpenLinkConfig('nhanvien-thidua', 'THI ĐUA', 'THI ĐUA & TRẢ CHẬM')}
                                    onChange={(v) => { 
                                        return handleUpdate(
                                            'thiDua',
                                            v,
                                            validateThiDuaData,
                                            (validVal) => {
                                                setThiDuaData(validVal);
                                                if (validVal) {
                                                    onThiDuaDataChange(supermarketName, validVal);
                                                }
                                            },
                                            setThiDuaTs,
                                            `Nhân viên (TĐ) - ${supermarketName}`,
                                            ids.td!,
                                            'Thi đua Nhân viên'
                                        );
                                    }}
                                    onClear={(title) => { 
                                        setThiDuaData(''); 
                                        setThiDuaTs(null); 
                                        removeUpdate(ids.td!); 
                                        toast.success(`Đã xoá dữ liệu ${title}`);
                                    }} />

                                <StatusTile title="TRẢ CHẬM" lastUpdated={traGopTs} value={traGopData} placeholder="Dán dữ liệu Trả chậm..."
                                    icon={<ChartPieIcon className="h-4 w-4" />} colorTheme="sky"
                                    linkUrl={getTileLink('nhanvien-tragop', customLinks)}
                                    onOpenLinkModal={() => handleOpenLinkConfig('nhanvien-tragop', 'TRẢ CHẬM', 'THI ĐUA & TRẢ CHẬM')}
                                    onChange={(v) => { 
                                        return handleUpdate(
                                            'traGop',
                                            v,
                                            s => {
                                                const lower = s.toLowerCase();
                                                return (lower.includes('nhân viên') || lower.includes('nhan vien')) && 
                                                       (lower.includes('trả góp') || lower.includes('tra gop') || lower.includes('trả chậm') || lower.includes('tra cham') || lower.includes('homecredit') || lower.includes('dt siêu thị'));
                                            },
                                            setTraGopData,
                                            setTraGopTs,
                                            `Nhân viên (TC) - ${supermarketName}`,
                                            ids.tg!,
                                            'Trả chậm'
                                        ); 
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

            {modalConfig && (
                <TileLinkModal
                    isOpen={modalConfig.isOpen}
                    onClose={() => setModalConfig(null)}
                    tileId={modalConfig.tileId}
                    tileName={modalConfig.tileName}
                    groupName={modalConfig.groupName}
                    currentUrl={modalConfig.currentUrl}
                    defaultUrl={modalConfig.defaultUrl}
                    onSave={handleSaveLink}
                    onReset={handleResetLink}
                />
            )}

            <AutoClickGuideModal
                isOpen={isGuideOpen}
                onClose={() => setIsGuideOpen(false)}
            />
        </div>
    );
};

export default SupermarketConfig;
