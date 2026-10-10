import React, { useState, useEffect, useMemo } from 'react';
import { AppIcon } from '../../../components/shared/ui/icon/AppIcon';
import SupermarketConfig from './SupermarketConfig';
import BiSupermarketMapAdmin from './BiSupermarketMapAdmin';
import Card from './Card';
import { useIndexedDBState } from '../hooks/useIndexedDBState';
import * as db from '../utils/db';
import { toast } from '../../../components/shared/ui/toast';
import confetti from 'canvas-confetti';
import { TileLinkModal } from './TileLinkModal';
import {
    DEFAULT_TILE_LINKS,
    getTileLink,
    saveTileLink,
    resetTileLink,
    TILE_CUSTOM_LINKS_KEY,
} from '../services/tileLinkService';
import {
    BiSyncMode,
    BiSyncProgress,
    startBiAutoSyncSession,
    readPendingAutoSync,
    claimPendingAutoSync,
    savePendingAutoSync,
    clearPendingAutoSync,
    PENDING_MAX_RELOADS,
    thangLuyKeMacDinh,
    nhanThang,
    applyBiSyncResults,
    onBiProgress,
    onBiDone,
    onBiError,
} from '../services/biAutoSyncService';
import { startUserscriptUpdateWatcher } from '../services/userscriptProbeService';
import { BiAutoSyncModal } from './BiAutoSyncModal';
import { LuyKeMonthPickerModal } from './LuyKeMonthPickerModal';
import { extractSupermarketList, extractAllSupermarketList, shortenSupermarketName } from '../utils/dashboardHelpers';
import { Button } from '../../../components/shared/ui/Button';
import { ConfirmDialog } from '../../../components/shared/ui/ConfirmDialog';
import { EmptyState } from '../../../components/shared/ui/EmptyState';
import { Modal } from '../../../components/shared/ui/Modal';
import { Input } from '../../../components/shared/ui/Input';
import { useReportBiAuth } from '../hooks/useReportBiAuth';
import { uploadSummaryLuyKeIfManager, uploadCompetitionLuyKeIfManager } from '../services/biDataService';
import { fetchSupermarketMap, clearSupermarketMap } from '../services/biSupermarketMapService';
import { getAnalysisEmployees, AnalysisEmployeesPayload, ANALYSIS_EMPLOYEES_KEY } from '../services/analysisEmployeeSyncService';
import { MOBILE_GUTTER, TOUCH_TARGET } from '../utils/mobileUi';

/**
 * Chữ hướng dẫn ô dán dự phòng (khi trình duyệt không cho tự đọc Clipboard — hay gặp ở Safari iOS
 * nếu người dùng không bấm bong bóng "Dán"). Màn cảm ứng không có Ctrl+V: hướng dẫn chạm giữ.
 */
const pasteHint = (placeholder?: string) =>
    typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches
        ? `${placeholder || 'Dán dữ liệu...'} Chạm vào đây, giữ tay rồi chọn "Dán".`
        : placeholder || 'Nhấn Ctrl + V...';

// --- Validation ---
const SUMMARY_REALTIME_REPORT_HEADER = 'Tên miền	DTLK	DTQĐ	Target (QĐ)	% HT Target (QĐ)';
const SUMMARY_LUYKE_REPORT_HEADER = 'Tên miền	DT Hôm Qua	DTLK	DT Dự Kiến	DTQĐ';
const COMPETITION_REALTIME_REPORT_HEADER = 'Target Ngày	% HT Target Ngày	Xếp hạng trong miền';
const COMPETITION_LUYKE_REPORT_HEADER = 'Target	% HT Target Tháng	% HT Dự Kiến	Xếp hạng trong miền';

const validateSummaryRealtimeReport = (data: string): boolean => {
    if (!data) return false;
    if (data.includes(SUMMARY_REALTIME_REPORT_HEADER)) return true;
    const lower = data.toLowerCase();
    const hasConsolidatedOrTable = lower.includes('doanh thu hợp nhất') || 
                                   lower.includes('revenue-consolidated') || 
                                   (lower.includes('doanh thu qđ') && lower.includes('siêu thị'));
    const isRealtime = lower.includes('realtime') || 
                       lower.includes('hôm nay') || 
                       lower.includes('% ht target (lk)') ||
                       lower.includes('thời gian làm việc');
    const hasTableCols = lower.includes('doanh thu qđ') && (lower.includes('target') || lower.includes('doanh thu'));
    return (hasConsolidatedOrTable && isRealtime) || (isRealtime && hasTableCols);
};

const validateSummaryLuyKeReport = (data: string): boolean => {
    if (!data) return false;
    if (data.includes(SUMMARY_LUYKE_REPORT_HEADER)) return true;
    const lower = data.toLowerCase();
    const hasConsolidatedOrTable = lower.includes('doanh thu hợp nhất') || 
                                   lower.includes('revenue-consolidated') || 
                                   (lower.includes('doanh thu qđ') && lower.includes('siêu thị'));
    const isLuyKe = lower.includes('lũy kế') || 
                    lower.includes('luy ke') || 
                    lower.includes('quỹ thời gian') || 
                    lower.includes('target trọn kỳ') ||
                    (lower.includes('% ht target') && !lower.includes('% ht target (lk)'));
    const hasTableCols = lower.includes('doanh thu qđ') && (lower.includes('target') || lower.includes('doanh thu'));
    return (hasConsolidatedOrTable && isLuyKe) || (isLuyKe && hasTableCols);
};
const validateCompetitionRealtimeReport = (data: string): boolean => {
    if (!data) return false;
    const lower = data.toLowerCase();
    return data.includes(COMPETITION_REALTIME_REPORT_HEADER) || 
           ((lower.includes('thi đua') || lower.includes('chương trình') || lower.includes('hạng vùng') || lower.includes('doanh thu (rt)') || lower.includes('số lượng (rt)')) && 
            (lower.includes('target') || lower.includes('realtime') || lower.includes('% ht')));
};
const validateCompetitionLuyKeReport = (data: string): boolean => {
    if (!data) return false;
    const lower = data.toLowerCase();
    return data.includes(COMPETITION_LUYKE_REPORT_HEADER) ||
           ((lower.includes('thi đua') || lower.includes('chương trình') || lower.includes('hạng vùng') || lower.includes('% ht tháng')) &&
            (lower.includes('target') || lower.includes('lũy kế') || lower.includes('luy ke') || lower.includes('% ht')));
};

// Header CHÍNH XÁC của định dạng BI CŨ (trước khi đổi sang định dạng mới) — validator ở trên
// phải nới lỏng thêm nhánh heuristic vì header thật của định dạng MỚI không còn khớp 2 chuỗi
// này nữa. Match đúng chuỗi cũ = dữ liệu vừa dán được copy từ nguồn BI cũ (portal cũ hoặc
// tab trình duyệt còn mở từ trước), có thể thiếu cột mới so với định dạng hiện tại.
const isPortedCompetitionRealtimeFormat = (data: string): boolean => data.includes(COMPETITION_REALTIME_REPORT_HEADER);
const isPortedCompetitionLuyKeFormat = (data: string): boolean => data.includes(COMPETITION_LUYKE_REPORT_HEADER);
const PORTED_FORMAT_WARNING = 'Dữ liệu vừa dán có vẻ dùng định dạng báo cáo Thi đua CŨ, có thể thiếu một số cột mới. Vui lòng lấy lại báo cáo mới nhất từ https://baocao.dienmayxanh.com/dashboard/thi-dua.';

type UpdateCategory = 'BC Tổng hợp' | 'Thi Đua Cụm' | 'Thiết lập và cập nhật dữ liệu cho siêu thị';

interface Update {
    id: string;
    message: string;
    timestamp: string;
    category: UpdateCategory;
}

const getDetailedTimestamp = () => {
    const now = new Date();
    const time = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const date = now.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
    return `${time} ${date}`;
};

const StatusTile: React.FC<{
    title: string;
    lastUpdated: string | null;
    value: string;
    placeholder?: string;
    onChange: (val: string) => boolean | void | Promise<boolean | void>;
    onClear: (title: string) => void;
    error?: string | null;
    downloadUrl?: string;
    linkUrl?: string;
    onOpenLinkModal?: () => void;
    icon?: React.ReactNode;
    colorTheme?: 'emerald' | 'sky' | 'rose' | 'amber';
    readOnly?: boolean;
    readOnlyHint?: string;
}> = ({ title, lastUpdated, value, placeholder, onChange, onClear, error, downloadUrl, linkUrl, onOpenLinkModal, icon, colorTheme = 'sky', readOnly = false, readOnlyHint }) => {
    const [isPasting, setIsPasting] = useState(false);
    const hasData = value && value.length > 0 && !error;

    const fireSuccessCelebration = () => {
        confetti({
            particleCount: 70,
            spread: 70,
            origin: { y: 0.6 }
        });
        toast.success(`Đã dán và cập nhật thành công ${title}!`, { duration: 3000 });
    };

    const handleTileClick = async () => {
        if (isPasting || readOnly) return;

        if (navigator?.clipboard?.readText) {
            try {
                const clipText = await navigator.clipboard.readText();
                if (clipText && clipText.trim().length > 0) {
                    const ok = await onChange(clipText);
                    if (ok !== false) {
                        fireSuccessCelebration();
                        return;
                    } else {
                        toast.error(`Dữ liệu dán vào không đúng định dạng của ô "${title}"!\nDữ liệu ban đầu vẫn được giữ nguyên an toàn.`, {
                            duration: 5000,
                            id: `paste-err-${title}`
                        });
                        setIsPasting(true);
                        return;
                    }
                } else {
                    toast('Bộ nhớ tạm (Clipboard) trống. Vui lòng copy báo cáo từ MWG trước!', { icon: <AppIcon name="copy" size="md" className="text-sky-600" /> });
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
                title={readOnly ? (readOnlyHint || 'Chỉ quản lý/admin được cập nhật') : 'Click để tự động dán dữ liệu từ Clipboard'}
                className={`
                    cursor-pointer min-h-[56px] transition-colors duration-200 flex items-center px-3 relative overflow-hidden border
                    ${readOnly ? 'cursor-default' : 'cursor-pointer'}
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
                            placeholder={pasteHint(placeholder)}
                            onPaste={async (e) => {
                                const text = e.clipboardData.getData('text');
                                setIsPasting(false);
                                const ok = await onChange(text);
                                if (ok !== false) {
                                    fireSuccessCelebration();
                                } else {
                                    toast.error(`Dữ liệu dán vào không đúng định dạng của ô "${title}"!\nDữ liệu ban đầu vẫn được giữ nguyên an toàn.`, {
                                        duration: 5000,
                                        id: `paste-err-${title}`
                                    });
                                }
                            }}
                            onBlur={() => setIsPasting(false)}
                        />
                        <Button variant="unstyled" size="none" onClick={(e) => { e.stopPropagation(); setIsPasting(false); }} className="min-h-11 sm:min-h-0 px-2 py-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-[11px] font-bold text-slate-500 transition-colors bg-slate-100 dark:bg-slate-800">HUỶ</Button>
                    </div>
                ) : (
                    <div className="flex items-center justify-between w-full gap-3 pr-[140px] lg:pr-20 lg:group-hover/tile:pr-28 transition-all duration-150">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className={`p-1.5 rounded-lg shrink-0 transition-colors duration-200 bg-white dark:bg-slate-800 ${hasData ? currentTheme.iconActive : 'border border-slate-200 dark:border-slate-700 text-slate-400'}`}>
                                {icon || <AppIcon name="upload" size="md" />}
                            </div>
                            <div className="min-w-0">
                                <h4 className={`text-xs sm:text-[13px] font-bold uppercase tracking-wide truncate transition-colors duration-200 ${hasData ? currentTheme.text : 'text-slate-600 dark:text-slate-400 group-hover/tile:text-slate-800'}`}>{title}</h4>
                                {hasData ? (
                                    lastUpdated && (
                                        <span className={`text-xs font-medium uppercase flex items-center gap-1 mt-[1px] opacity-80 ${currentTheme.text}`}>
                                            <AppIcon name="clock" size="sm" /> {lastUpdated}
                                        </span>
                                    )
                                ) : (
                                    <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-[1px] block truncate text-left">
                                        {readOnly ? (readOnlyHint || 'Chỉ quản lý/admin được cập nhật') : 'Click để tự dán'}
                                    </span>
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
                            className={`${TOUCH_TARGET} flex items-center justify-center lg:opacity-0 lg:group-hover/tile:opacity-100 focus:opacity-100 p-1.5 text-slate-500 hover:text-sky-600 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-all duration-150 border border-slate-200/80 dark:border-slate-700 shadow-2xs active:scale-95`}
                            title="Chỉnh sửa liên kết"
                            aria-label="Chỉnh sửa liên kết"
                        >
                            <AppIcon name="edit" size="sm" />
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
                            className={`${TOUCH_TARGET} flex items-center justify-center p-1.5 text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/60 dark:hover:bg-sky-900/60 rounded-lg transition-all border border-sky-200/90 hover:border-sky-300 dark:border-sky-800/80 dark:hover:border-sky-700 shadow-2xs active:scale-95`}
                            title={effectiveLink ? `Mở liên kết: ${effectiveLink}` : 'Mở liên kết báo cáo'}
                            aria-label="Mở liên kết báo cáo"
                        >
                            <AppIcon name="link" size="sm" />
                        </a>
                    )}

                    {hasData && !readOnly && (
                        <Button
                            variant="unstyled"
                            size="none"
                            onClick={(e) => {
                                e.stopPropagation();
                                onClear(title);
                            }}
                            className={`${TOUCH_TARGET} flex items-center justify-center p-1.5 text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/60 rounded-lg transition-all border border-rose-200/90 hover:border-rose-300 dark:border-rose-800/80 dark:hover:border-rose-700 shadow-2xs active:scale-95`}
                            title="Xoá"
                            aria-label="Xoá dữ liệu"
                        >
                            <AppIcon name="delete" size="sm" />
                        </Button>
                    )}
                </div>
            )}

            {error && (
                <div className="mt-1 flex items-center gap-1 px-1 text-[11px] text-rose-500 dark:text-rose-400 animate-in fade-in duration-200">
                    <AppIcon name="warning" size="sm" />
                    <span>{error}</span>
                </div>
            )}
        </div>
    );
};

const DataUpdater: React.FC<{ onNavigateToDashboard?: () => void }> = ({ onNavigateToDashboard: _onNavigateToDashboard }) => {
    const [summaryRealtime, setSummaryRealtime] = useIndexedDBState('summary-realtime', '');
    const [summaryLuyKe, setSummaryLuyKe] = useIndexedDBState('summary-luy-ke', '');
    const [competitionRealtime, setCompetitionRealtime] = useIndexedDBState('competition-realtime', '');
    const [competitionLuyKe, setCompetitionLuyKe] = useIndexedDBState('competition-luy-ke', '');

    const [summaryRealtimeTs, setSummaryRealtimeTs] = useIndexedDBState<string | null>('summary-realtime-ts', null);
    const [summaryLuyKeTs, setSummaryLuyKeTs] = useIndexedDBState<string | null>('summary-luy-ke-ts', null);
    const [competitionRealtimeTs, setCompetitionRealtimeTs] = useIndexedDBState<string | null>('competition-realtime-ts', null);
    const [competitionLuyKeTs, setCompetitionLuyKeTs] = useIndexedDBState<string | null>('competition-luy-ke-ts', null);

    const [, setLastUpdates] = useIndexedDBState<Update[]>('last-updates-list', []);
    const [errors, setErrors] = useState<Record<string, string | null>>({});

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

    // Đợt 4 (implementation_plan.md) — phân quyền theo siêu thị: chỉ manager/admin được dán
    // Luỹ kế (Báo cáo Tổng hợp + Thi đua Cụm), dữ liệu sẽ ghi thêm lên biData/{maKho} dùng
    // chung. Nhân viên (readOnly=true) chỉ xem, 2 ô này bị khoá thao tác dán ở component
    // StatusTile phía trên.
    const { user, userRole, allowedKhos, canManageSharedBiData, employeeName, isAdmin } = useReportBiAuth();
    const isReadOnlySharedTile = !(userRole === 'admin' || userRole === 'manager');
    const [supermarketNameToKho, setSupermarketNameToKho] = useState<Record<string, string>>({});
    useEffect(() => {
        fetchSupermarketMap(user?.uid)
            .then(setSupermarketNameToKho)
            .catch(err => console.error('[DataUpdater] Lỗi tải bảng map siêu thị:', err));
    }, [user?.uid]);

    useEffect(() => {
        const handleMapChange = (e: CustomEvent<{ userId: string; map: Record<string, string> }>) => {
            if (!user?.uid || e.detail?.userId === user?.uid) {
                setSupermarketNameToKho(e.detail.map || {});
            }
        };
        window.addEventListener('bi-supermarket-map-changed', handleMapChange as EventListener);
        return () => window.removeEventListener('bi-supermarket-map-changed', handleMapChange as EventListener);
    }, [user?.uid]);

    const notifySkippedNames = (skippedNames: string[]) => {
        if (skippedNames.length === 0) return;
        toast(`Chưa cấu hình Mã Kho cho: ${skippedNames.join(', ')} — dữ liệu các siêu thị này CHƯA được chia sẻ.`, { icon: <AppIcon name="warning" size="md" className="text-amber-600" />, duration: 8000 });
    };

    const addUpdate = (id: string, message: string, category: UpdateCategory) => {
        const timestamp = getDetailedTimestamp();
        const newUpdate: Update = { id, message, timestamp, category };
        setLastUpdates(prev => [newUpdate, ...prev.filter(u => u.id !== id)].slice(0, 10));
    };
    
    const removeUpdate = (id: string) => setLastUpdates(prev => prev.filter(u => u.id !== id));

    const handleThiDuaDataChange = async (supermarketName: string | null, newData: string) => {
        if (!supermarketName) return;
        const key = `config-${supermarketName}-thidua`;
        const currentData = await db.get(key);
        if (currentData && currentData !== newData) await db.set(`previous-${key}`, currentData);
    };

    const [customSupermarkets, setCustomSupermarkets] = useIndexedDBState<string[]>('updater-custom-supermarkets', []);
    const [isAddingSupermarket, setIsAddingSupermarket] = useState(false);
    const [newSupermarketName, setNewSupermarketName] = useState('');

    const supermarkets = useMemo(() => {
        return extractAllSupermarketList({
            summaryLuyKe,
            summaryRealtime,
            competitionLuyKe,
            competitionRealtime,
            customSupermarkets,
            supermarketMap: supermarketNameToKho
        });
    }, [summaryLuyKe, summaryRealtime, competitionLuyKe, competitionRealtime, customSupermarkets, supermarketNameToKho]);

    const [activeSupermarket, setActiveSupermarket] = useIndexedDBState<string | null>('updater-active-supermarket', null);
    const [analysisEmployees, setAnalysisEmployees] = useState<AnalysisEmployeesPayload | null>(null);

    const handleAddSupermarket = () => {
        const trimmed = newSupermarketName.trim();
        if (!trimmed) {
            toast.error('Vui lòng nhập tên siêu thị!');
            return;
        }
        const exists = supermarkets.find(s => s.toLowerCase() === trimmed.toLowerCase());
        if (exists) {
            toast.info('Siêu thị đã có trong danh sách.');
            setActiveSupermarket(exists);
            setIsAddingSupermarket(false);
            setNewSupermarketName('');
            return;
        }
        setCustomSupermarkets(prev => [...(prev || []), trimmed]);
        setActiveSupermarket(trimmed);
        setIsAddingSupermarket(false);
        setNewSupermarketName('');
        toast.success(`Đã thêm siêu thị "${trimmed}". Bạn có thể cấu hình dữ liệu ngay!`);
    };

    const handleDeleteSupermarket = (sm: string) => {
        const shortName = shortenSupermarketName(sm);
        const lower = sm.toLowerCase();
        const shortLower = shortName.toLowerCase();

        // 1. Xoá khỏi customSupermarkets
        setCustomSupermarkets(prev => (prev || []).filter(item => 
            item.toLowerCase() !== lower && 
            shortenSupermarketName(item).toLowerCase() !== shortLower
        ));

        // 2. Chuyển activeSupermarket sang siêu thị khác nếu đang chọn siêu thị này
        if (activeSupermarket && (activeSupermarket.toLowerCase() === lower || shortenSupermarketName(activeSupermarket).toLowerCase() === shortLower)) {
            const remaining = supermarkets.filter(s => s.toLowerCase() !== lower && shortenSupermarketName(s).toLowerCase() !== shortLower);
            setActiveSupermarket(remaining[0] || null);
        }

        toast.success(`Đã xoá siêu thị "${shortName}" khỏi danh sách cấu hình.`);
    };

    useEffect(() => {
        getAnalysisEmployees().then(setAnalysisEmployees).catch(console.error);
        const handler = (e: CustomEvent<AnalysisEmployeesPayload>) => {
            if (e.detail) setAnalysisEmployees(e.detail);
        };
        window.addEventListener(ANALYSIS_EMPLOYEES_KEY as any, handler as EventListener);
        window.addEventListener('analysis-employees-updated' as any, handler as EventListener);
        return () => {
            window.removeEventListener(ANALYSIS_EMPLOYEES_KEY as any, handler as EventListener);
            window.removeEventListener('analysis-employees-updated' as any, handler as EventListener);
        };
    }, []);

    useEffect(() => {
        if (supermarkets.length > 0 && (!activeSupermarket || !supermarkets.includes(activeSupermarket))) {
            setActiveSupermarket(supermarkets[0]);
        } else if (supermarkets.length === 0) {
            setActiveSupermarket(null);
        }
    }, [supermarkets, activeSupermarket, setActiveSupermarket]);

    // --- Quản lý Tự động cập nhật Realtime & Luỹ kế qua Tampermonkey ---
    const [autoSyncModalOpen, setAutoSyncModalOpen] = useState(false);
    const [autoSyncMode, setAutoSyncMode] = useState<BiSyncMode>('realtime');
    const [autoSyncStatus, setAutoSyncStatus] = useState<'idle' | 'running' | 'success' | 'error' | 'not-installed' | 'outdated'>('idle');
    const [autoSyncCurrentVersion, setAutoSyncCurrentVersion] = useState<string>('');
    const [autoSyncLatestVersion, setAutoSyncLatestVersion] = useState<string>('');
    const [autoSyncProgress, setAutoSyncProgress] = useState<BiSyncProgress | null>(null);
    const [autoSyncError, setAutoSyncError] = useState<string>('');
    // Mã lượt (jobId) CHÍNH nơi này đã khởi chạy — chỉ nhận kết quả đúng lượt đó (xem onBiDone bên dưới)
    const jobDangChoRef = React.useRef<string | null>(null);
    const workerWindowRef = React.useRef<Window | null>(null);

    // Số lần đã tự tải lại cho lượt đang dở (xem readPendingAutoSync) — chặn vòng tải lại khi chưa cập nhật
    const pendingReloadsRef = React.useRef(0);

    // Luỹ kế: chọn tháng trước khi chạy (Tháng hiện tại — ngày 1 thì lùi tháng trước — hoặc tháng bất kỳ)
    const [chonThangMo, setChonThangMo] = useState(false);
    const [autoSyncMonth, setAutoSyncMonth] = useState<string>('');

    const handleStartAutoSync = async (mode: BiSyncMode, opts: { tuChayTiep?: boolean; month?: string } = {}) => {
        setAutoSyncMode(mode);
        setAutoSyncMonth(mode === 'luyke' ? (opts.month || thangLuyKeMacDinh()) : '');
        setAutoSyncProgress(null);
        setAutoSyncError('');
        setAutoSyncStatus('running');
        setAutoSyncModalOpen(true);
        if (!opts.tuChayTiep) pendingReloadsRef.current = 0;

        try {
            const { jobId, workerWindow, workerOpened } = await startBiAutoSyncSession(mode, opts);
            jobDangChoRef.current = jobId;
            workerWindowRef.current = workerWindow;
            clearPendingAutoSync();
            if (!workerOpened) {
                // Trình duyệt chặn mở tab (không có cú bấm) — nút "Mở lại tab MWG" trong modal để bấm 1 lần
                toast.info('Bấm "Mở lại tab MWG" để tiếp tục — trình duyệt chặn tự mở tab.', { duration: 6000 });
            }
        } catch (err: any) {
            const msg = err?.message || '';
            if (msg === 'USERSCRIPT_NOT_INSTALLED') {
                clearPendingAutoSync();
                setAutoSyncStatus('not-installed');
            } else if (msg.startsWith('USERSCRIPT_OUTDATED')) {
                setAutoSyncStatus('outdated');
                setAutoSyncCurrentVersion(msg.split(':')[1] || '');
                setAutoSyncLatestVersion(msg.split(':')[2] || '');
                // Nhớ lượt dở: cập nhật xong quay lại tab → tự tải lại để nạp bản mới → tự chạy tiếp
                savePendingAutoSync({ mode, ts: Date.now(), reloads: pendingReloadsRef.current, month: opts.month });
            } else {
                clearPendingAutoSync();
                setAutoSyncStatus('error');
                setAutoSyncError(msg || 'Không thể khởi chạy quy trình tự động.');
            }
        }
    };

    // Tải trang xong mà còn lượt dở (vừa cập nhật userscript) → tự chạy tiếp, không cần bấm lại
    const handleStartRef = React.useRef(handleStartAutoSync);
    handleStartRef.current = handleStartAutoSync;
    useEffect(() => {
        const p = claimPendingAutoSync(); // đọc + xoá: chỉ MỘT nơi tự chạy tiếp (xem claimPendingAutoSync)
        if (!p) return;
        pendingReloadsRef.current = p.reloads;
        void handleStartRef.current(p.mode, { tuChayTiep: true, month: p.month });
    }, []);

    // Đang báo "cần cập nhật": kiểm tra ngầm liên tục qua probe iframe,
    // khi người dùng bấm Cập nhật trong Tampermonkey thì tự động chạy tiếp ngay mà không cần F5.
    useEffect(() => {
        if (!autoSyncModalOpen || autoSyncStatus !== 'outdated') return;
        const targetVer = autoSyncLatestVersion || '7.22';

        const stopWatcher = startUserscriptUpdateWatcher(targetVer, (installedVer) => {
            clearPendingAutoSync();
            setAutoSyncStatus('running');
            toast.success(`Đã nhận diện Userscript v${installedVer}! Tự động đổ dữ liệu...`, { duration: 4000 });
            void handleStartRef.current(autoSyncMode, { month: autoSyncMonth, tuChayTiep: true });
        });

        return () => {
            stopWatcher();
        };
    }, [autoSyncModalOpen, autoSyncStatus, autoSyncLatestVersion, autoSyncMode, autoSyncMonth]);

    useEffect(() => {
        const unsubProgress = onBiProgress((prog) => {
            setAutoSyncProgress(prog);
            setAutoSyncStatus('running');
        });

        const unsubDone = onBiDone(async (payload) => {
            // Chỉ nhận kết quả của ĐÚNG lượt nơi này vừa khởi chạy, và chỉ một lần. Không chặn thì:
            // - mở trang là userscript (≤ 7.11) phát lại kết quả CŨ còn trong bộ nhớ Tampermonkey → pháo giấy + toast
            //   mỗi lần mở trang và GHI ĐÈ dữ liệu cũ lên (chủ dự án gặp 2026-10-01);
            // - trang có nhiều nơi nghe (DataUpdater + nút nổi + nút nhanh) × 2 kênh (event + postMessage) → 4 toast.
            if (!payload.jobId || payload.jobId !== jobDangChoRef.current) return;
            jobDangChoRef.current = null;
            setAutoSyncStatus('success');
            // Chạy xong thì ĐÓNG modal ngay (chủ dự án 2026-10-01: không cần bảng này ở Dashboard sau khi xong —
            // tiến trình đã xem trên trang MWG); kết quả báo bằng toast bên dưới.
            setAutoSyncModalOpen(false);
            try { window.focus(); } catch { /* trình duyệt có thể không cho tự lấy focus */ }
            const targetSupermarket = activeSupermarket || supermarkets[0] || null;
            const res = await applyBiSyncResults(payload.mode, payload.results, targetSupermarket);

            confetti({
                particleCount: 80,
                spread: 80,
                origin: { y: 0.6 }
            });

            const modeLabel = payload.mode === 'realtime' ? 'Realtime' : 'Luỹ kế';
            toast.success(`Tự động cập nhật thành công ${res.successCount} mục dữ liệu ${modeLabel}!`, { duration: 4000 });

            const nowTs = getDetailedTimestamp();
            if (payload.mode === 'realtime') {
                if (payload.results.summary) {
                    setSummaryRealtime(payload.results.summary);
                    setSummaryRealtimeTs(nowTs);
                    addUpdate('summary-realtime', 'Tự động cập nhật Doanh thu hợp nhất (Realtime)', 'BC Tổng hợp');
                }
                if (payload.results.competition) {
                    setCompetitionRealtime(payload.results.competition);
                    setCompetitionRealtimeTs(nowTs);
                    addUpdate('competition-realtime', 'Tự động cập nhật Báo cáo Thi đua (Realtime)', 'Thi Đua Cụm');
                }
                if (payload.results.industryByStore) {
                    Object.keys(payload.results.industryByStore).forEach(stName => {
                        const shortName = shortenSupermarketName(stName);
                        addUpdate(`config-${shortName}-industry-realtime`, `Tự động cập nhật Ngành hàng BI - ${stName}`, 'Thiết lập và cập nhật dữ liệu cho siêu thị');
                    });
                } else if (payload.results.industry && targetSupermarket) {
                    addUpdate(`config-${shortenSupermarketName(targetSupermarket)}-industry-realtime`, `Tự động cập nhật Ngành hàng BI - ${targetSupermarket}`, 'Thiết lập và cập nhật dữ liệu cho siêu thị');
                }
                if (payload.results.employeeByStore) {
                    Object.keys(payload.results.employeeByStore).forEach(stName => {
                        const shortName = shortenSupermarketName(stName);
                        addUpdate(`config-${shortName}-employee-realtime`, `Tự động cập nhật Doanh thu nhân viên - ${stName}`, 'Thiết lập và cập nhật dữ liệu cho siêu thị');
                    });
                } else if (payload.results.employee && targetSupermarket) {
                    addUpdate(`config-${shortenSupermarketName(targetSupermarket)}-employee-realtime`, `Tự động cập nhật Doanh thu nhân viên - ${targetSupermarket}`, 'Thiết lập và cập nhật dữ liệu cho siêu thị');
                }
            } else {
                if (payload.results.summary) {
                    setSummaryLuyKe(payload.results.summary);
                    setSummaryLuyKeTs(nowTs);
                    addUpdate('summary-luy-ke', 'Tự động cập nhật Doanh thu hợp nhất (Luỹ kế)', 'BC Tổng hợp');
                    if (canManageSharedBiData && user) {
                        uploadSummaryLuyKeIfManager(user, allowedKhos, payload.results.summary, supermarketNameToKho, employeeName)
                            .then(({ skippedNames }) => notifySkippedNames(skippedNames))
                            .catch(e => console.error('[AutoSync] Lỗi upload summary luy ke:', e));
                    }
                }
                if (payload.results.competition) {
                    setCompetitionLuyKe(payload.results.competition);
                    setCompetitionLuyKeTs(nowTs);
                    addUpdate('competition-luy-ke', 'Tự động cập nhật Báo cáo Thi đua (Luỹ kế)', 'Thi Đua Cụm');
                    if (targetSupermarket && !payload.results.industryByStore && !payload.results.employeeByStore) {
                        addUpdate(`config-${shortenSupermarketName(targetSupermarket)}-thidua`, `Tự động cập nhật Thi đua - ${targetSupermarket}`, 'Thiết lập và cập nhật dữ liệu cho siêu thị');
                    }
                    if (canManageSharedBiData && user) {
                        uploadCompetitionLuyKeIfManager(user, allowedKhos, payload.results.competition, supermarketNameToKho, employeeName)
                            .then(({ skippedNames }) => notifySkippedNames(skippedNames))
                            .catch(e => console.error('[AutoSync] Lỗi upload competition luy ke:', e));
                    }
                }
                // Bản 7.7+ (Direct API): Ngành hàng & Nhân viên Luỹ kế theo TỪNG siêu thị
                Object.keys(payload.results.industryByStore || {}).forEach(stName => {
                    if (/^\d+$/.test(stName)) return; // khoá phụ theo mã kho — đã có khoá theo tên
                    addUpdate(`config-${shortenSupermarketName(stName)}-industry-luyke`, `Tự động cập nhật Ngành hàng BI Luỹ kế - ${stName}`, 'Thiết lập và cập nhật dữ liệu cho siêu thị');
                });
                Object.keys(payload.results.employeeByStore || {}).forEach(stName => {
                    if (/^\d+$/.test(stName)) return;
                    addUpdate(`config-${shortenSupermarketName(stName)}-danhsach`, `Tự động cập nhật Doanh thu nhân viên Luỹ kế - ${stName}`, 'Thiết lập và cập nhật dữ liệu cho siêu thị');
                });
                Object.keys(payload.results.competitionByStore || {}).forEach(stName => {
                    if (/^\d+$/.test(stName)) return;
                    addUpdate(`config-${shortenSupermarketName(stName)}-thidua`, `Tự động cập nhật Thi đua nhân viên Luỹ kế - ${stName}`, 'Thiết lập và cập nhật dữ liệu cho siêu thị');
                });
                Object.keys(payload.results.installmentByStore || {}).forEach(stName => {
                    if (/^\d+$/.test(stName)) return;
                    addUpdate(`config-${shortenSupermarketName(stName)}-tragop`, `Tự động cập nhật Trả chậm Luỹ kế - ${stName}`, 'Thiết lập và cập nhật dữ liệu cho siêu thị');
                });
                if (payload.results.installment && targetSupermarket && !payload.results.installmentByStore) {
                    addUpdate(`config-${shortenSupermarketName(targetSupermarket)}-tragop`, `Tự động cập nhật Trả chậm - ${targetSupermarket}`, 'Thiết lập và cập nhật dữ liệu cho siêu thị');
                }
            }

            // Tự động mở màn hình tương ứng khi chạy xong
            const { navigateToBiRealtime, navigateToBiLuyKe } = await import('../services/autoNavigationService');
            if (payload.mode === 'realtime') {
                void navigateToBiRealtime();
            } else {
                void navigateToBiLuyKe();
            }
        });

        const unsubError = onBiError((err) => {
            setAutoSyncStatus('error');
            setAutoSyncError(err.message || 'Lỗi trong quá trình tự động thu thập.');
        });

        return () => {
            unsubProgress();
            unsubDone();
            unsubError();
        };
    }, [activeSupermarket, supermarkets, canManageSharedBiData, employeeName, supermarketNameToKho, user?.uid]);

    const [isConfirmingClear, setIsConfirmingClear] = useState(false);

    const handleClearAllData = async () => {
        toast.info('Đang xoá toàn bộ dữ liệu...');
        
        // 1. Reset ngay lập tức toàn bộ state React của DataUpdater để giao diện sạch 100%
        setSummaryRealtime('');
        setSummaryLuyKe('');
        setCompetitionRealtime('');
        setCompetitionLuyKe('');
        setSummaryRealtimeTs(null);
        setSummaryLuyKeTs(null);
        setCompetitionRealtimeTs(null);
        setCompetitionLuyKeTs(null);
        setLastUpdates([]);
        setActiveSupermarket(null);
        setCustomSupermarkets([]);
        setErrors({});
        setSupermarketNameToKho({});

        // 2. Xoá sạch bảng map siêu thị cả cục bộ và Firestore
        try {
            await clearSupermarketMap(user?.uid);
            localStorage.setItem('bi_migrated_legacy_map', 'true');
        } catch (e) {
            console.warn('[DataUpdater] Lỗi xoá map siêu thị:', e);
        }

        // 3. Xoá sạch IndexedDB
        await db.clearStore();

        // 4. Nếu đã đăng nhập, xoá sạch cả doc lưu trên Firestore để Cloud Sync không đồng bộ ngược lại
        if (user?.uid) {
            try {
                const { doc: firestoreDoc, deleteDoc } = await import('firebase/firestore');
                const { db: firestoreDb } = await import('../../../services/firebase');
                const biKeysToDelete = [
                    'bi_summary-realtime',
                    'bi_summary-luy-ke',
                    'bi_competition-realtime',
                    'bi_competition-luy-ke',
                    'bi_summary-realtime-ts',
                    'bi_summary-luy-ke-ts',
                    'bi_competition-realtime-ts',
                    'bi_competition-luy-ke-ts',
                    'bi_last-updates-list',
                    'biSupermarketMap',
                ];
                await Promise.all(
                    biKeysToDelete.map(k => deleteDoc(firestoreDoc(firestoreDb, 'users', user.uid, 'configs', k)).catch(() => {}))
                );

                // Xoá luôn dữ liệu chia sẻ Firestore của các kho (nếu có quyền)
                if (allowedKhos && allowedKhos.length > 0) {
                    await Promise.all(
                        allowedKhos.flatMap(maKho => [
                            deleteDoc(firestoreDoc(firestoreDb, 'biData', maKho, 'reports', 'summaryLuyKe')).catch(() => {}),
                            deleteDoc(firestoreDoc(firestoreDb, 'biData', maKho, 'reports', 'competitionLuyKe')).catch(() => {})
                        ])
                    );
                }
            } catch (err) {
                console.warn('[DataUpdater] Lỗi xoá cloud configs:', err);
            }
        }

        toast.success('Đã đặt lại thành công! Toàn bộ dữ liệu đã được đưa về mặc định.');

        // 5. Phát event để mọi subscriber trong ứng dụng reset về defaultValue
        window.dispatchEvent(new CustomEvent('indexeddb-change', { detail: { key: 'ALL' } }));
        window.dispatchEvent(new CustomEvent('bi-supermarket-map-changed', { detail: { userId: user?.uid || 'guest', map: {} } }));
        setIsConfirmingClear(false);
    };

    return (
        <div className="space-y-4 sm:space-y-6 relative pb-20">
            {/* Title + Action Toolbar — matches DashboardHeader and NhanVien */}
            <div className={`relative z-20 mb-4 flex flex-row flex-wrap items-center justify-between gap-x-3 gap-y-2 pt-2 pb-2 border-b border-slate-200 dark:border-slate-800 w-full ${MOBILE_GUTTER}`}>
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <h2 className="text-lg lg:text-2xl font-normal text-slate-700 dark:text-slate-200 uppercase tracking-wide leading-normal py-0.5">
                        CẬP NHẬT DỮ LIỆU
                    </h2>
                </div>
                <div className="flex flex-none items-center justify-end gap-2 ml-auto">
                    <div className="flex items-center rounded-lg sm:rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                        <Button
                            variant="unstyled"
                            size="none"
                            onClick={() => setIsConfirmingClear(true)}
                            title="Đặt lại toàn bộ dữ liệu về mặc định"
                            className="min-h-11 sm:min-h-0 flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-900/40 dark:hover:text-rose-400 transition-colors"
                        >
                            <AppIcon name="reset" size="md" className="text-rose-500" />
                            <span className="text-[11px] sm:text-xs tracking-wide">Đặt lại</span>
                        </Button>
                    </div>
                </div>
            </div>

            {canManageSharedBiData && (
                <div className="relative z-10">
                    <BiSupermarketMapAdmin
                        isAdmin={isAdmin}
                        allowedKhos={allowedKhos}
                        summaryLuyKe={summaryLuyKe}
                        competitionLuyKe={competitionLuyKe}
                        summaryRealtime={summaryRealtime}
                        competitionRealtime={competitionRealtime}
                        userId={user?.uid}
                    />
                </div>
            )}

            <div className="relative z-10">
                <Card title="DOANH THU & THI ĐUA CỤM">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                        {/* NHÓM BÁO CÁO TỔNG HỢP */}
                        <div>
                            <div className="flex items-center justify-between px-1 pb-2">
                                <a
                                    href="https://baocao.dienmayxanh.com/dashboard/revenue-consolidated"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="min-h-11 sm:min-h-0 text-xs sm:text-[13px] font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5 hover:text-sky-600 dark:hover:text-sky-400 transition-colors group"
                                    title="Mở Báo cáo Doanh thu hợp nhất"
                                >
                                    <div className="w-2 h-2 bg-sky-500 rounded-sm group-hover:scale-110 transition-transform"></div>
                                    <span>Doanh thu hợp nhất</span>
                                    <span className="text-[11px] text-slate-400 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">↗</span>
                                </a>
                            </div>
                            <div className="grid grid-cols-1 gap-2 sm:gap-3">
                                <StatusTile
                                    title="Realtime"
                                    lastUpdated={summaryRealtimeTs}
                                    value={summaryRealtime}
                                    placeholder="Dán dữ liệu Realtime Doanh Thu..."
                                    error={errors.summaryRealtime}
                                    linkUrl={getTileLink('summary-realtime', customLinks)}
                                    onOpenLinkModal={() => handleOpenLinkConfig('summary-realtime', 'Realtime', 'Doanh thu hợp nhất')}
                                    icon={<AppIcon name="clock" size="md" />}
                                    colorTheme="amber"
                                    onChange={(val) => {
                                        if (validateSummaryRealtimeReport(val)) {
                                            setErrors(p => ({...p, summaryRealtime: null}));
                                            setSummaryRealtime(val);
                                            setSummaryRealtimeTs(getDetailedTimestamp());
                                            addUpdate('summary-realtime', 'Realtime Doanh Thu', 'BC Tổng hợp');
                                            return true;
                                        } else {
                                            setErrors(p => ({...p, summaryRealtime: 'Sai định dạng báo cáo Realtime.'}));
                                            return false;
                                        }
                                    }}
                                    onClear={(title) => {
                                        setSummaryRealtime('');
                                        setSummaryRealtimeTs(null);
                                        removeUpdate('summary-realtime');
                                        toast.success(`Đã xoá dữ liệu ${title}`);
                                    }}
                                />
                                <StatusTile
                                    title="Luỹ kế"
                                    lastUpdated={summaryLuyKeTs}
                                    value={summaryLuyKe}
                                    placeholder="Dán dữ liệu Luỹ kế tháng..."
                                    error={errors.summaryLuyKe}
                                    linkUrl={getTileLink('summary-luyke', customLinks)}
                                    onOpenLinkModal={() => handleOpenLinkConfig('summary-luyke', 'Luỹ kế', 'Doanh thu hợp nhất')}
                                    icon={<AppIcon name="chartPie" size="md" />}
                                    colorTheme="emerald"
                                    readOnly={isReadOnlySharedTile}
                                    readOnlyHint="Nhân viên chỉ xem — quản lý/admin cập nhật dữ liệu này"
                                    onChange={(val) => {
                                        if (validateSummaryLuyKeReport(val)) {
                                            setErrors(p => ({...p, summaryLuyKe: null}));
                                            setSummaryLuyKe(val);
                                            setSummaryLuyKeTs(getDetailedTimestamp());
                                            addUpdate('summary-luy-ke', 'Luỹ kế tháng', 'BC Tổng hợp');
                                            if (canManageSharedBiData && user) {
                                                uploadSummaryLuyKeIfManager(user, allowedKhos, val, supermarketNameToKho, employeeName)
                                                    .then(({ skippedNames }) => notifySkippedNames(skippedNames))
                                                    .catch(err => { console.error('[DataUpdater] Lỗi chia sẻ Summary Luỹ kế:', err); toast.error('Dán thành công cục bộ nhưng lỗi khi chia sẻ lên Kho — thử dán lại.'); });
                                            }
                                            return true;
                                        } else {
                                            setErrors(p => ({...p, summaryLuyKe: 'Sai định dạng báo cáo Luỹ kế.'}));
                                            return false;
                                        }
                                    }}
                                    onClear={(title) => {
                                        setSummaryLuyKe('');
                                        setSummaryLuyKeTs(null);
                                        removeUpdate('summary-luy-ke');
                                        toast.success(`Đã xoá dữ liệu ${title}`);
                                    }}
                                />
                            </div>
                        </div>

                        {/* NHÓM BÁO CÁO THI ĐUA */}
                        <div>
                            <div className="flex items-center justify-between px-1 pb-2">
                                <a
                                    href="https://baocao.dienmayxanh.com/dashboard/thi-dua"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="min-h-11 sm:min-h-0 text-xs sm:text-[13px] font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors group"
                                    title="Mở Báo cáo Thi đua"
                                >
                                    <div className="w-2 h-2 bg-emerald-500 rounded-sm group-hover:scale-110 transition-transform"></div>
                                    <span>Thi đua</span>
                                    <span className="text-[11px] text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">↗</span>
                                </a>
                            </div>
                            <div className="grid grid-cols-1 gap-2 sm:gap-3">
                                <StatusTile
                                    title="Realtime"
                                    lastUpdated={competitionRealtimeTs}
                                    value={competitionRealtime}
                                    placeholder="Dán dữ liệu Thi đua Realtime..."
                                    error={errors.competitionRealtime}
                                    linkUrl={getTileLink('competition-realtime', customLinks)}
                                    onOpenLinkModal={() => handleOpenLinkConfig('competition-realtime', 'Realtime', 'Thi đua')}
                                    icon={<AppIcon name="sparkles" size="md" />}
                                    colorTheme="amber"
                                    onChange={(val) => {
                                        if (validateCompetitionRealtimeReport(val)) {
                                            setErrors(p => ({...p, competitionRealtime: null}));
                                            setCompetitionRealtime(val);
                                            setCompetitionRealtimeTs(getDetailedTimestamp());
                                            addUpdate('competition-realtime', 'Thi đua Realtime', 'Thi Đua Cụm');
                                            if (isPortedCompetitionRealtimeFormat(val)) toast(PORTED_FORMAT_WARNING, { icon: <AppIcon name="warning" size="md" className="text-amber-600" />, duration: 8000 });
                                            return true;
                                        } else {
                                            setErrors(p => ({...p, competitionRealtime: 'Sai định dạng Thi đua Realtime.'}));
                                            return false;
                                        }
                                    }}
                                    onClear={(title) => {
                                        setCompetitionRealtime('');
                                        setCompetitionRealtimeTs(null);
                                        removeUpdate('competition-realtime');
                                        toast.success(`Đã xoá dữ liệu ${title}`);
                                    }}
                                />
                                <StatusTile
                                    title="Luỹ kế"
                                    lastUpdated={competitionLuyKeTs}
                                    value={competitionLuyKe}
                                    placeholder="Dán dữ liệu Thi đua Luỹ kế..."
                                    error={errors.competitionLuyKe}
                                    linkUrl={getTileLink('competition-luyke', customLinks)}
                                    onOpenLinkModal={() => handleOpenLinkConfig('competition-luyke', 'Luỹ kế', 'Thi đua')}
                                    icon={<AppIcon name="chartBar" size="md" />}
                                    colorTheme="emerald"
                                    readOnly={isReadOnlySharedTile}
                                    readOnlyHint="Nhân viên chỉ xem — quản lý/admin cập nhật dữ liệu này"
                                    onChange={(val) => {
                                        if (validateCompetitionLuyKeReport(val)) {
                                            setErrors(p => ({...p, competitionLuyKe: null}));
                                            setCompetitionLuyKe(val);
                                            setCompetitionLuyKeTs(getDetailedTimestamp());
                                            addUpdate('competition-luy-ke', 'Thi đua Luỹ kế', 'Thi Đua Cụm');
                                            if (isPortedCompetitionLuyKeFormat(val)) toast(PORTED_FORMAT_WARNING, { icon: <AppIcon name="warning" size="md" className="text-amber-600" />, duration: 8000 });
                                            if (canManageSharedBiData && user) {
                                                uploadCompetitionLuyKeIfManager(user, allowedKhos, val, supermarketNameToKho, employeeName)
                                                    .then(({ skippedNames }) => notifySkippedNames(skippedNames))
                                                    .catch(err => { console.error('[DataUpdater] Lỗi chia sẻ Thi đua Luỹ kế:', err); toast.error('Dán thành công cục bộ nhưng lỗi khi chia sẻ lên Kho — thử dán lại.'); });
                                            }
                                            return true;
                                        } else {
                                            setErrors(p => ({...p, competitionLuyKe: 'Sai định dạng Thi đua Luỹ kế.'}));
                                            return false;
                                        }
                                    }}
                                    onClear={(title) => {
                                        setCompetitionLuyKe('');
                                        setCompetitionLuyKeTs(null);
                                        removeUpdate('competition-luy-ke');
                                        toast.success(`Đã xoá dữ liệu ${title}`);
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                </Card>
            </div>

            {/* PHẦN CẤU HÌNH CHI TIẾT SIÊU THỊ */}
            <div id="supermarket-config-section" className="pt-2">
                {activeSupermarket ? (
                    <Card
                        title="CẤU HÌNH SIÊU THỊ & NHÂN VIÊN"
                        actionButton={
                            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
                                {supermarkets.map((sm) => {
                                    const shortName = shortenSupermarketName(sm);
                                    const isCustom = customSupermarkets.some(c => 
                                        c.toLowerCase() === sm.toLowerCase() || 
                                        shortenSupermarketName(c).toLowerCase() === shortName.toLowerCase()
                                    );
                                    return (
                                        <div key={sm} className="relative group inline-flex items-center">
                                            <Button
                                                variant="unstyled" size="none"
                                                onClick={() => setActiveSupermarket(sm)}
                                                className={`min-h-11 sm:min-h-0 shrink-0 pl-3 pr-2 py-1.5 rounded-md text-[11px] font-bold transition-all border flex items-center gap-1.5 ${
                                                    activeSupermarket === sm
                                                        ? 'bg-sky-50 dark:bg-sky-900/30 border-sky-300 dark:border-sky-700 text-sky-700 dark:text-sky-300 shadow-sm ring-1 ring-sky-500/10'
                                                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:border-sky-200 hover:bg-slate-50'
                                                }`}
                                            >
                                                <span>{sm.split(' - ').pop()}</span>
                                                {isCustom && (
                                                    <span
                                                        role="button"
                                                        tabIndex={0}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDeleteSupermarket(sm);
                                                        }}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter' || e.key === ' ') {
                                                                e.stopPropagation();
                                                                handleDeleteSupermarket(sm);
                                                            }
                                                        }}
                                                        className="relative text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 p-0.5 rounded cursor-pointer transition-colors after:absolute after:-inset-[13px] after:content-[''] lg:after:hidden"
                                                        title={`Xoá siêu thị tuỳ chỉnh "${shortName}"`}
                                                    >
                                                        <AppIcon name="close" size="xs" />
                                                    </span>
                                                )}
                                            </Button>
                                        </div>
                                    );
                                })}
                                <Button
                                    variant="unstyled" size="none"
                                    onClick={() => setIsAddingSupermarket(true)}
                                    className="min-h-11 sm:min-h-0 shrink-0 px-3 py-1.5 rounded-md text-[11px] font-bold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/40 border border-dashed border-sky-300 dark:border-sky-700 hover:bg-sky-100 dark:hover:bg-sky-900/50 flex items-center gap-1 transition-all"
                                    title="Thêm siêu thị mới để cấu hình và dán dữ liệu"
                                >
                                    <AppIcon name="add" size="md" />
                                    <span>Thêm siêu thị</span>
                                </Button>
                            </div>
                        }
                    >
                        <SupermarketConfig
                            supermarketName={activeSupermarket}
                            addUpdate={addUpdate}
                            removeUpdate={removeUpdate}
                            competitionLuyKeData={competitionLuyKe}
                            summaryLuyKeData={summaryLuyKe}
                            onThiDuaDataChange={handleThiDuaDataChange}
                        />
                    </Card>
                ) : (
                    <div className="bg-white dark:bg-slate-900 rounded-none lg:rounded-2xl border-y lg:border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden p-6 flex flex-col items-center justify-center text-center">
                        <EmptyState
                            icon={<AppIcon name="upload" size="xl" />}
                            title="Chưa có danh sách siêu thị"
                            description="Vui lòng dán dữ liệu Luỹ kế / Realtime / Thi đua phía trên, hoặc chủ động thêm siêu thị để bắt đầu cấu hình."
                        />
                        <Button
                            variant="unstyled" size="none"
                            onClick={() => setIsAddingSupermarket(true)}
                            className="min-h-11 sm:min-h-0 mt-4 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 transition-colors"
                        >
                            <AppIcon name="add" size="md" />
                            <span>+ Thêm siêu thị thủ công</span>
                        </Button>
                    </div>
                )}
            </div>

            <ConfirmDialog
                isOpen={isConfirmingClear}
                onClose={() => setIsConfirmingClear(false)}
                onConfirm={handleClearAllData}
                title="Đặt lại tất cả dữ liệu?"
                message="Toàn bộ báo cáo đã dán (Realtime, Luỹ kế, Thi đua, cấu hình từng siêu thị...) sẽ bị xoá khỏi thiết bị này và đưa về mặc định. Hành động này không thể hoàn tác."
                confirmText="Đặt lại tất cả dữ liệu"
                variant="danger"
            />

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

            {isAddingSupermarket && (
                <Modal
                    isOpen={isAddingSupermarket}
                    onClose={() => {
                        setIsAddingSupermarket(false);
                        setNewSupermarketName('');
                    }}
                    title="Thêm siêu thị mới"
                    subTitle="Nhập tên siêu thị hoặc mã kho để tạo tab cấu hình riêng biệt"
                >
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            handleAddSupermarket();
                        }}
                        className="space-y-4"
                    >
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                                Tên siêu thị / Mã kho
                            </label>
                            <Input
                                autoFocus
                                type="text"
                                placeholder="VD: 1032 - ĐML_STR_STR - Tân Phú hoặc Cần Thơ..."
                                value={newSupermarketName}
                                onChange={(e) => setNewSupermarketName(e.target.value)}
                                className="w-full text-xs"
                            />
                            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                                Sau khi tạo, bạn có thể chuyển sang tab siêu thị này để dán dữ liệu Ngành hàng, Doanh thu Nhân viên, Thi đua & Trả chậm.
                            </p>
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    setIsAddingSupermarket(false);
                                    setNewSupermarketName('');
                                }}
                            >
                                Huỷ
                            </Button>
                            <Button
                                type="submit"
                                variant="primary"
                            >
                                Thêm siêu thị
                            </Button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* Chọn tháng cho Tự động Luỹ kế */}
            <LuyKeMonthPickerModal
                isOpen={chonThangMo}
                onClose={() => setChonThangMo(false)}
                onStart={(month) => { void handleStartAutoSync('luyke', { month }); }}
            />

            {/* Modal tiến trình Tự động cập nhật Realtime / Luỹ kế qua Tampermonkey */}
            <BiAutoSyncModal
                isOpen={autoSyncModalOpen}
                mode={autoSyncMode}
                progress={autoSyncProgress}
                status={autoSyncStatus}
                currentVersion={autoSyncCurrentVersion}
                latestVersion={autoSyncLatestVersion}
                month={autoSyncMonth}
                errorMessage={autoSyncError}
                onRetry={() => { void handleStartAutoSync(autoSyncMode, { month: autoSyncMonth }); }}
                onClose={() => { setAutoSyncModalOpen(false); clearPendingAutoSync(); }}
                onCancel={() => {
                    setAutoSyncStatus('idle');
                    setAutoSyncProgress(null);
                }}
                onReopenWorker={() => {
                    try {
                        const target = `https://baocao.dienmayxanh.com/dashboard/revenue-consolidated?ycx_mode=${autoSyncMode}&job_id=${autoSyncProgress?.jobId || 'reopen'}#ycx_mode=${autoSyncMode}`;
                        window.open(target, 'mwg_bi_worker');
                    } catch (e) {
                        console.warn(e);
                    }
                }}
            />
        </div>
    );
};

export default React.memo(DataUpdater);
