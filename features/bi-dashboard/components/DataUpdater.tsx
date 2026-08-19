
import React, { useState, useEffect, useMemo } from 'react';
import { DownloadIcon, AlertTriangleIcon, UploadIcon, ClockIcon, TrashIcon, ChartPieIcon, UsersIcon, DocumentReportIcon, ChartBarIcon, SparklesIcon, LinkIcon } from './Icons';
import SupermarketConfig from './SupermarketConfig';
import Card from './Card';
import { useIndexedDBState } from '../hooks/useIndexedDBState';
import * as db from '../utils/db';
import toast from 'react-hot-toast';
import { shortenSupermarketName, extractSupermarketList } from '../utils/dashboardHelpers';
import { Button } from '../../../components/shared/ui/Button';
import { ConfirmDialog } from '../../../components/shared/ui/ConfirmDialog';
import { EmptyState } from '../../../components/shared/ui/EmptyState';

// --- Validation ---
const SUMMARY_REALTIME_REPORT_HEADER = 'Tên miền	DTLK	DTQĐ	Target (QĐ)	% HT Target (QĐ)';
const SUMMARY_LUYKE_REPORT_HEADER = 'Tên miền	DT Hôm Qua	DTLK	DT Dự Kiến	DTQĐ';
const COMPETITION_REALTIME_REPORT_HEADER = 'Target Ngày	% HT Target Ngày	Xếp hạng trong miền';
const COMPETITION_LUYKE_REPORT_HEADER = 'Target	% HT Target Tháng	% HT Dự Kiến	Xếp hạng trong miền';

const validateSummaryRealtimeReport = (data: string): boolean => data.includes(SUMMARY_REALTIME_REPORT_HEADER);
const validateSummaryLuyKeReport = (data: string): boolean => data.includes(SUMMARY_LUYKE_REPORT_HEADER);
const validateCompetitionRealtimeReport = (data: string): boolean => data.includes(COMPETITION_REALTIME_REPORT_HEADER);
const validateCompetitionLuyKeReport = (data: string): boolean => data.includes(COMPETITION_LUYKE_REPORT_HEADER);

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
    onChange: (val: string) => void;
    onClear: (title: string) => void;
    error?: string | null;
    downloadUrl?: string;
    icon?: React.ReactNode;
    colorTheme?: 'emerald' | 'sky' | 'rose' | 'amber' | 'indigo' | 'slate';
}> = ({ title, lastUpdated, value, onChange, onClear, error, downloadUrl, icon, colorTheme = 'sky' }) => {
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
        slate: {
            wrapper: 'border-slate-200 bg-slate-100 dark:bg-slate-700/40 dark:border-slate-700',
            text: 'text-slate-800 dark:text-slate-200',
            iconActive: 'text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 shadow-sm',
            ring: 'border-slate-500 ring-2 ring-slate-500/20'
        }
    };

    const currentTheme = themeColors[colorTheme];

    return (
        <div className="relative group w-full">
            <div 
                onClick={() => !isPasting && setIsPasting(true)}
                className={`
                    cursor-pointer min-h-[56px] rounded-xl transition-all duration-200 flex items-center px-3 relative overflow-hidden group/tile border hover:scale-[1.01] active:scale-[0.99] shadow-sm
                    ${isPasting 
                        ? `bg-white dark:bg-slate-800 ${currentTheme.ring}`
                        : hasData 
                            ? currentTheme.wrapper
                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300'}
                `}
            >
                {isPasting ? (
                    <div className="w-full flex items-center gap-3 animate-in fade-in duration-150 py-1">
                        <textarea
                            autoFocus
                            className="flex-1 bg-transparent border-none focus:ring-0 text-[12px] font-mono resize-none p-0 h-10 leading-tight text-slate-800 dark:text-slate-200 outline-none placeholder-slate-400"
                            placeholder="Nhấn Ctrl+V để dán dữ liệu..."
                            onPaste={(e) => {
                                const text = e.clipboardData.getData('text');
                                onChange(text);
                                setIsPasting(false);
                            }}
                            onBlur={() => setIsPasting(false)}
                        />
                        <Button variant="ghost" onClick={(e) => { e.stopPropagation(); setIsPasting(false); }} className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0 text-inherit px-2 py-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-[10px] font-bold text-slate-500 transition-colors shrink-0 bg-slate-100 dark:bg-slate-800">HUỶ</Button>
                    </div>
                ) : (
                    <div className="flex items-center justify-between w-full gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className={`p-1.5 rounded-lg shrink-0 transition-colors duration-200 bg-white dark:bg-slate-800 ${hasData ? currentTheme.iconActive : 'border border-slate-200 dark:border-slate-700 text-slate-400'}`}>
                                {icon || <UploadIcon className="h-4 w-4" />}
                            </div>
                            <div className="min-w-0 flex flex-col justify-center">
                                <h4 className={`text-[11px] font-bold uppercase tracking-wide truncate transition-colors duration-200 ${hasData ? currentTheme.text : 'text-slate-600 dark:text-slate-400 group-hover/tile:text-slate-800'}`}>{title}</h4>
                                {hasData ? (
                                    lastUpdated && (
                                        <span className={`text-[10px] font-medium uppercase flex items-center gap-1 mt-0.5 opacity-80 ${currentTheme.text}`}>
                                            <ClockIcon className="h-3 w-3" /> {lastUpdated}
                                        </span>
                                    )
                                ) : (
                                    <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 block truncate">Click để cập nhật</span>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {hasData && !isPasting && (
                <div className="absolute top-1/2 -translate-y-1/2 right-2 flex gap-1 z-10 cursor-default">
                    {downloadUrl && (
                         <a 
                            href={downloadUrl} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            onClick={(e) => e.stopPropagation()} 
                            className={`p-1.5 rounded-lg transition-colors border shadow-sm bg-white dark:bg-slate-800 ${currentTheme.text} hover:bg-sky-100 hover:text-sky-600 hover:border-sky-300 dark:hover:bg-sky-900/40 dark:hover:text-sky-300 border-white/50`}
                            title="Tải báo cáo gốc"
                        >
                            <LinkIcon className="h-3.5 w-3.5" />
                        </a>
                    )}
                     <Button
                        variant="ghost"
                        onClick={(e) => {
                            e.stopPropagation();
                            onClear(title);
                        }}
                        title="Xoá dữ liệu"
                        className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0 text-inherit p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-100 hover:border-rose-300 bg-white dark:bg-slate-800 rounded-lg transition-colors border border-white/50 shadow-sm"
                    >
                        <TrashIcon className="h-3.5 w-3.5" />
                    </Button>
                </div>
            )}
            {error && (
                <div className="mt-1 flex items-center gap-1 px-1 text-[10px] text-rose-500 dark:text-rose-400 animate-in fade-in duration-200">
                    <AlertTriangleIcon className="h-3 w-3 shrink-0" />
                    <span>{error}</span>
                </div>
            )}
        </div>
    );
};

const DataUpdater: React.FC<{ onNavigateToDashboard?: () => void }> = ({ onNavigateToDashboard }) => {
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

    const supermarkets = useMemo(() => extractSupermarketList(summaryLuyKe), [summaryLuyKe]);
    const [activeSupermarket, setActiveSupermarket] = useState<string | null>(null);

    useEffect(() => {
        if (supermarkets.length > 0 && (!activeSupermarket || !supermarkets.includes(activeSupermarket))) {
            setActiveSupermarket(supermarkets[0]);
        } else if (supermarkets.length === 0) {
            setActiveSupermarket(null);
        }
    }, [supermarkets, activeSupermarket]);

    const [isConfirmingClear, setIsConfirmingClear] = useState(false);

    const handleClearAllData = async () => {
        toast('Đang xoá dữ liệu...', { icon: 'ℹ️' });
        await db.clearStore();
        toast.success('Đã xoá thành công! Các thiết lập đã được đặt về mặc định.');

        // Broadcast that everything is gone so all listeners drop their cache
        window.dispatchEvent(new CustomEvent('indexeddb-change', { detail: { key: 'ALL' } }));
        setIsConfirmingClear(false);
    };

    return (
        <div className="space-y-4 sm:space-y-6 relative pb-20">
            {/* Title + Action Toolbar — matches DashboardHeader and NhanVien */}
            <div className="relative z-20 mb-4 flex flex-row items-center justify-between gap-3 pt-2 pb-2 border-b border-slate-200 dark:border-slate-800 w-full">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-sky-600/10 dark:bg-sky-500/15 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                        <UploadIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                    <h2 className="text-sm sm:text-base lg:text-lg font-bold text-slate-800 dark:text-white uppercase tracking-tight truncate leading-tight">
                        CẬP NHẬT DỮ LIỆU
                    </h2>
                </div>
                <div className="flex flex-none justify-end">
                    <div className="flex items-center rounded-lg sm:rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                        <Button
                            variant="unstyled"
                            size="none"
                            onClick={() => setIsConfirmingClear(true)}
                            title="Xoá tất cả dữ liệu"
                            className="flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-900/40 dark:hover:text-rose-400 transition-colors"
                        >
                            <TrashIcon className="h-4 w-4 text-rose-500" />
                            <span className="uppercase text-[11px] sm:text-xs tracking-wider">LÀM MỚI TẤT CẢ</span>
                        </Button>
                    </div>
                </div>
            </div>

            <div className="relative z-10">
                <Card title="Dữ Liệu Báo Cáo Cụm" icon="upload-cloud">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                        {/* NHÓM BÁO CÁO TỔNG HỢP */}
                        <div>
                            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1 pb-2 flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 bg-sky-500 rounded-sm"></div>
                                Báo cáo Tổng hợp
                            </h3>
                            <div className="grid grid-cols-2 gap-2">
                                <StatusTile
                                    title="Realtime"
                                    lastUpdated={summaryRealtimeTs}
                                    value={summaryRealtime}
                                    error={errors.summaryRealtime}
                                    downloadUrl="https://bi.thegioididong.com/khoi-ban-hang-sub/-1"
                                    icon={<ClockIcon className="h-4 w-4" />}
                                    colorTheme="amber"
                                    onChange={(val) => {
                                        if (validateSummaryRealtimeReport(val)) {
                                            setErrors(p => ({...p, summaryRealtime: null}));
                                            setSummaryRealtime(val);
                                            setSummaryRealtimeTs(getDetailedTimestamp());
                                            addUpdate('summary-realtime', 'Realtime Doanh Thu', 'BC Tổng hợp');
                                        } else setErrors(p => ({...p, summaryRealtime: 'Sai định dạng báo cáo Realtime.'}));
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
                                    error={errors.summaryLuyKe}
                                    downloadUrl="https://bi.thegioididong.com/khoi-ban-hang-sub/-1"
                                    icon={<ChartPieIcon className="h-4 w-4" />}
                                    colorTheme="emerald"
                                    onChange={(val) => {
                                        if (validateSummaryLuyKeReport(val)) {
                                            setErrors(p => ({...p, summaryLuyKe: null}));
                                            setSummaryLuyKe(val);
                                            setSummaryLuyKeTs(getDetailedTimestamp());
                                            addUpdate('summary-luy-ke', 'Luỹ kế tháng', 'BC Tổng hợp');
                                        } else setErrors(p => ({...p, summaryLuyKe: 'Sai định dạng báo cáo Luỹ kế.'}));
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
                            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1 pb-2 flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-sm"></div>
                                Thi đua Cụm
                            </h3>
                            <div className="grid grid-cols-2 gap-2">
                                <StatusTile
                                    title="Realtime"
                                    lastUpdated={competitionRealtimeTs}
                                    value={competitionRealtime}
                                    error={errors.competitionRealtime}
                                    downloadUrl="https://bi.thegioididong.com/thi-dua?id=-1&tab=1&rt=1&dm=2&mt=2"
                                    icon={<SparklesIcon className="h-4 w-4" />}
                                    colorTheme="amber"
                                    onChange={(val) => {
                                        if (validateCompetitionRealtimeReport(val)) {
                                            setErrors(p => ({...p, competitionRealtime: null}));
                                            setCompetitionRealtime(val);
                                            setCompetitionRealtimeTs(getDetailedTimestamp());
                                            addUpdate('competition-realtime', 'Thi đua Realtime', 'Thi Đua Cụm');
                                        } else setErrors(p => ({...p, competitionRealtime: 'Sai định dạng Thi đua Realtime.'}));
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
                                    error={errors.competitionLuyKe}
                                    downloadUrl="https://bi.thegioididong.com/thi-dua?id=-1&tab=1&rt=2&dm=2&mt=2"
                                    icon={<ChartBarIcon className="h-4 w-4" />}
                                    colorTheme="emerald"
                                    onChange={(val) => {
                                        if (validateCompetitionLuyKeReport(val)) {
                                            setErrors(p => ({...p, competitionLuyKe: null}));
                                            setCompetitionLuyKe(val);
                                            setCompetitionLuyKeTs(getDetailedTimestamp());
                                            addUpdate('competition-luy-ke', 'Thi đua Luỹ kế', 'Thi Đua Cụm');
                                        } else setErrors(p => ({...p, competitionLuyKe: 'Sai định dạng Thi đua Luỹ kế.'}));
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
            <div className="pt-2">
                {activeSupermarket ? (
                    <Card
                        title="Cấu hình siêu thị chi tiết"
                        icon="settings-2"
                        actionButton={
                            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
                                {supermarkets.map((sm) => (
                                    <Button
                                        variant="ghost"
                                        key={sm}
                                        onClick={() => setActiveSupermarket(sm)}
                                        className={`bg-transparent hover:bg-transparent border-0 h-auto w-auto p-0 text-inherit shrink-0 px-4 py-1.5 rounded-md text-[11px] font-bold transition-all border ${
                                            activeSupermarket === sm
                                                ? 'bg-sky-50 dark:bg-sky-900/30 border-sky-300 dark:border-sky-700 text-sky-700 dark:text-sky-300 shadow-sm ring-1 ring-sky-500/10'
                                                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:border-sky-200 hover:bg-slate-50'
                                        }`}
                                    >
                                        {sm.split(' - ').pop()}
                                    </Button>
                                ))}
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
                    <div className="bg-white dark:bg-slate-900 rounded-none lg:rounded-2xl border-y lg:border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                        <EmptyState
                            icon={<UploadIcon className="h-6 w-6" />}
                            title="Chưa có danh sách siêu thị"
                            description="Vui lòng cập nhật Luỹ kế phía trên để tải danh sách siêu thị."
                        />
                    </div>
                )}
            </div>

            <ConfirmDialog
                isOpen={isConfirmingClear}
                onClose={() => setIsConfirmingClear(false)}
                onConfirm={handleClearAllData}
                title="Xoá tất cả dữ liệu?"
                message="Toàn bộ báo cáo đã dán (Realtime, Luỹ kế, Thi đua, cấu hình từng siêu thị...) sẽ bị xoá khỏi thiết bị này và đưa về mặc định. Hành động này không thể hoàn tác."
                confirmText="Xoá tất cả dữ liệu"
                variant="danger"
            />
        </div>
    );
};

export default React.memo(DataUpdater);
