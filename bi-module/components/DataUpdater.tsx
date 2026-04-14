
import React, { useState, useEffect } from 'react';
import { CheckCircleIcon, DownloadIcon, AlertTriangleIcon, UploadIcon, ClockIcon, TrashIcon } from './Icons';
import SupermarketConfig from './SupermarketConfig';
import { useIndexedDBState } from '../hooks/useIndexedDBState';
import * as db from '../utils/db';
import Toast from './Toast';

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
}> = ({ title, lastUpdated, value, onChange, onClear, error, downloadUrl }) => {
    const [isPasting, setIsPasting] = useState(false);
    const hasData = value && value.length > 0 && !error;

    return (
        <div className="relative group w-full">
            <div 
                onClick={() => !isPasting && setIsPasting(true)}
                className={`
                    cursor-pointer min-h-[68px] rounded-2xl border transition-all duration-300 flex items-center px-4 relative overflow-hidden group/tile active:scale-[0.98]
                    ${isPasting ? 'border-primary-500 bg-white dark:bg-slate-800 ring-4 ring-primary-500/20 shadow-lg' : 
                      hasData ? 'border-primary-200 dark:border-primary-800 bg-gradient-to-br from-primary-50 to-white dark:from-primary-900/30 dark:to-slate-800 hover:border-primary-400 shadow-sm hover:shadow-md' : 
                      'border-dashed border-2 border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:border-primary-400 hover:bg-slate-100 dark:hover:bg-slate-800'}
                `}
            >
                {isPasting ? (
                    <div className="w-full flex items-center gap-2 animate-in fade-in zoom-in-95 duration-200">
                        <textarea
                            autoFocus
                            className="flex-1 bg-transparent border-none focus:ring-0 text-[11px] font-mono resize-none p-0 h-10 leading-tight text-slate-800 dark:text-slate-200 outline-none"
                            placeholder="Nhấn Ctrl+V hoặc chạm và giữ để dán dữ liệu..."
                            onPaste={(e) => {
                                const text = e.clipboardData.getData('text');
                                onChange(text);
                                setIsPasting(false);
                            }}
                            onBlur={() => setIsPasting(false)}
                        />
                        <button onClick={(e) => { e.stopPropagation(); setIsPasting(false); }} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl text-[10px] font-black text-slate-400 transition-colors">HUỶ</button>
                    </div>
                ) : (
                    <div className="flex items-center justify-between w-full gap-3">
                        <div className="flex items-center gap-3.5 min-w-0">
                            <div className={`p-2 rounded-xl shrink-0 transition-colors ${hasData ? 'bg-primary-600 dark:bg-primary-500 text-white shadow-md shadow-primary-500/20' : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 group-hover/tile:bg-primary-100 group-hover/tile:text-primary-600 dark:group-hover/tile:bg-primary-900/50'}`}>
                                {hasData ? <CheckCircleIcon className="h-4 w-4" /> : <UploadIcon className="h-4 w-4" />}
                            </div>
                            <div className="min-w-0">
                                <h4 className={`text-[13px] font-black uppercase tracking-tight truncate ${hasData ? 'text-primary-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}>{title}</h4>
                                {hasData ? (
                                    lastUpdated && (
                                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase flex items-center gap-1 mt-0.5">
                                            <ClockIcon className="h-3 w-3" /> {lastUpdated}
                                        </span>
                                    )
                                ) : (
                                    <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 mt-0.5 block">Chưa có dữ liệu</span>
                                )}
                            </div>
                        </div>
                        
                        {!hasData && (
                            <span className="text-[10px] font-black text-primary-500 dark:text-primary-400 uppercase tracking-widest opacity-0 lg:group-hover/tile:opacity-100 transition-opacity bg-primary-50 dark:bg-primary-900/30 px-2.5 py-1 rounded-lg">DÁN NGAY</span>
                        )}
                    </div>
                )}
            </div>

            {hasData && !isPasting && (
                <div className="absolute top-1/2 -translate-y-1/2 right-2 flex gap-1.5 z-10 pl-2 lg:opacity-0 lg:group-hover:opacity-100 transition-all duration-300 translate-x-2 lg:group-hover:translate-x-0 cursor-default">
                    {downloadUrl && (
                         <a 
                            href={downloadUrl} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            onClick={(e) => e.stopPropagation()} 
                            className="p-2.5 text-primary-600 dark:text-primary-400 hover:bg-primary-100 dark:hover:bg-primary-900/60 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md rounded-xl transition-all border border-primary-100 dark:border-primary-800/50 shadow-sm active:scale-90 hover:shadow"
                            title="Tải báo cáo gốc"
                        >
                            <DownloadIcon className="h-4 w-4" />
                        </a>
                    )}
                     <button 
                        onClick={(e) => { 
                            e.stopPropagation(); 
                            onClear(title); 
                        }} 
                        title="Xoá dữ liệu" 
                        className="p-2.5 text-red-500 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/60 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md rounded-xl transition-all border border-red-100 dark:border-red-800/50 shadow-sm active:scale-90 hover:shadow"
                    >
                        <TrashIcon className="h-4 w-4" />
                    </button>
                </div>
            )}
            {error && (
                <div className="mt-1.5 flex items-center gap-1.5 px-2 text-[10px] font-bold text-red-500 dark:text-red-400 uppercase animate-in fade-in slide-in-from-top-1">
                    <AlertTriangleIcon className="h-3 w-3 shrink-0" />
                    <span>{error}</span>
                </div>
            )}
        </div>
    );
};

const DataUpdater: React.FC = () => {
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

    const [supermarkets, setSupermarkets] = useIndexedDBState<string[]>('supermarket-list', []);
    const [activeSupermarket, setActiveSupermarket] = useState<string | null>(null);

    useEffect(() => {
        if (!summaryLuyKe || !validateSummaryLuyKeReport(summaryLuyKe)) {
            if (supermarkets.length > 0) setSupermarkets([]);
            return;
        }
        // Cải tiến: Nhận diện cả siêu thị ĐM và TGD (hoặc bất kỳ siêu thị nào có định dạng XXX - YYY)
        const extractedNames = Array.from(new Set(summaryLuyKe.split('\n')
            .map(line => (line.split('\t')[0] ?? '').trim())
            .filter(name => (name.startsWith('ĐM') || name.startsWith('TGD')) && name.includes(' - '))));

        if (extractedNames.length > 0 && JSON.stringify(extractedNames.sort()) !== JSON.stringify(supermarkets.sort())) {
             setSupermarkets(extractedNames);
        }
    }, [summaryLuyKe, supermarkets, setSupermarkets]);

    useEffect(() => {
        if (supermarkets.length > 0 && (!activeSupermarket || !supermarkets.includes(activeSupermarket))) {
            setActiveSupermarket(supermarkets[0]);
        } else if (supermarkets.length === 0) {
            setActiveSupermarket(null);
        }
    }, [supermarkets, activeSupermarket]);

    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' | 'info'; isVisible: boolean }>({
        message: '',
        type: 'success',
        isVisible: false
    });

    const [isConfirmingClear, setIsConfirmingClear] = useState(false);

    const handleClearAllData = async () => {
        setToast({ message: 'Đang xoá dữ liệu...', type: 'info', isVisible: true });
        await db.clearStore();
        setToast({ message: 'Đã xoá thành công! Đang tải lại...', type: 'success', isVisible: true });
        setTimeout(() => {
            window.location.reload();
        }, 1500);
    };

    return (
        <div className="max-w-7xl mx-auto md:space-y-10 space-y-8 pb-24 md:px-6 px-4">
            <Toast 
                message={toast.message} 
                type={toast.type} 
                isVisible={toast.isVisible} 
                onClose={() => setToast(p => ({ ...p, isVisible: false }))} 
                duration={toast.message.includes('Đang xoá') ? 0 : 3000}
            />
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-5 pt-4">
                <div>
                    <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-none uppercase">DỮ LIỆU</h1>
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 font-medium max-w-md leading-relaxed">
                        Chạm vào các ô bên dưới và dán báo cáo BI tương ứng để bảng điều khiển cập nhật số liệu mới nhất.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    {isConfirmingClear ? (
                        <div className="flex items-center gap-2 animate-in slide-in-from-right-4 duration-300">
                            <button 
                                onClick={() => setIsConfirmingClear(false)}
                                className="px-4 py-2.5 text-[11px] font-black text-slate-500 dark:text-slate-400 focus:outline-none hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
                            >
                                HUỶ
                            </button>
                            <button 
                                onClick={handleClearAllData}
                                className="px-5 py-2.5 bg-red-600 dark:bg-red-500 text-white text-[11px] font-black rounded-xl hover:bg-red-700 dark:hover:bg-red-600 transition-all shadow-lg shadow-red-500/30 uppercase tracking-widest active:scale-95"
                            >
                                XÁC NHẬN XOÁ HẾT
                            </button>
                        </div>
                    ) : (
                        <button 
                            onClick={() => setIsConfirmingClear(true)}
                            title="Xoá HẾT TẤT CẢ dữ liệu"
                            className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl border border-red-100 dark:border-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/40 hover:shadow-md hover:shadow-red-500/10 transition-all active:scale-90 relative z-50 group"
                        >
                            <TrashIcon className="h-5 w-5 group-hover:rotate-12 transition-transform" />
                        </button>
                    )}
                    <div className="flex items-center gap-2.5 px-4 py-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm shrink-0">
                        <div className="relative flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                        </div>
                        <span className="text-[11px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest">Sẵn sàng</span>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-10">
                {/* NHÓM BÁO CÁO TỔNG HỢP */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2 px-1">
                        <div className="w-1 h-4 bg-primary-600 rounded-full"></div>
                        <h2 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">Báo cáo Tổng hợp</h2>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <StatusTile 
                            title="Realtime"
                            lastUpdated={summaryRealtimeTs}
                            value={summaryRealtime}

                            error={errors.summaryRealtime}
                            downloadUrl="https://bi.thegioididong.com/khoi-ban-hang-sub/-1"
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
                                setToast({ message: `Đã xoá dữ liệu ${title}`, type: 'warning', isVisible: true });
                                setTimeout(() => setToast(p => ({ ...p, isVisible: false })), 2000);
                            }}
                        />
                        <StatusTile 
                            title="Luỹ kế"
                            lastUpdated={summaryLuyKeTs}
                            value={summaryLuyKe}

                            error={errors.summaryLuyKe}
                            downloadUrl="https://bi.thegioididong.com/khoi-ban-hang-sub/-1"
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
                                setSupermarkets([]); 
                                setToast({ message: `Đã xoá dữ liệu ${title}`, type: 'warning', isVisible: true });
                                setTimeout(() => setToast(p => ({ ...p, isVisible: false })), 2000);
                            }}
                        />
                    </div>
                </div>

                {/* NHÓM BÁO CÁO THI ĐUA */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2 px-1">
                        <div className="w-1 h-4 bg-orange-600 rounded-full"></div>
                        <h2 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">Thi đua Cụm</h2>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <StatusTile 
                            title="Realtime"
                            lastUpdated={competitionRealtimeTs}
                            value={competitionRealtime}

                            error={errors.competitionRealtime}
                            downloadUrl="https://bi.thegioididong.com/thi-dua?id=-1&tab=1&rt=1&dm=2&mt=2"
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
                                setToast({ message: `Đã xoá dữ liệu ${title}`, type: 'warning', isVisible: true });
                                setTimeout(() => setToast(p => ({ ...p, isVisible: false })), 2000);
                            }}
                        />
                        <StatusTile 
                            title="Luỹ kế"
                            lastUpdated={competitionLuyKeTs}
                            value={competitionLuyKe}

                            error={errors.competitionLuyKe}
                            downloadUrl="https://bi.thegioididong.com/thi-dua?id=-1&tab=1&rt=2&dm=2&mt=2"
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
                                setToast({ message: `Đã xoá dữ liệu ${title}`, type: 'warning', isVisible: true });
                                setTimeout(() => setToast(p => ({ ...p, isVisible: false })), 2000);
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* PHẦN CẤU HÌNH CHI TIẾT SIÊU THỊ */}
            <div className="pt-8 md:pt-10 border-t border-slate-200 dark:border-slate-800/80">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                    <div className="flex items-center gap-2.5">
                        <div className="w-1.5 h-5 bg-slate-800 dark:bg-slate-400 rounded-full"></div>
                        <h2 className="text-base font-black text-slate-800 dark:text-white uppercase tracking-tight">Cấu hình siêu thị chi tiết</h2>
                    </div>
                    {supermarkets.length > 0 && (
                        <div className="flex items-center gap-2 bg-slate-100/80 dark:bg-slate-800/60 p-1.5 rounded-2xl overflow-x-auto scrollbar-hide -webkit-overflow-scrolling-touch max-w-full shadow-inner ring-1 ring-inset ring-slate-200/50 dark:ring-slate-700/50">
                            {supermarkets.map((sm) => (
                                <button
                                    key={sm}
                                    onClick={() => setActiveSupermarket(sm)}
                                    className={`shrink-0 px-4 py-2 rounded-xl text-[11px] font-black transition-all duration-300 uppercase ${
                                        activeSupermarket === sm 
                                            ? 'bg-white dark:bg-slate-700 text-primary-600 dark:text-primary-400 shadow-sm shadow-slate-200/50 dark:shadow-none' 
                                            : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-white/50 dark:hover:bg-slate-700/50'
                                    }`}
                                >
                                    {sm.split(' - ').pop()}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
                
                {activeSupermarket ? (
                    <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200/80 dark:border-slate-800 p-4 md:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.4)] animate-in fade-in zoom-in-95 duration-500">
                        <SupermarketConfig
                            supermarketName={activeSupermarket}
                            addUpdate={addUpdate}
                            removeUpdate={removeUpdate}
                            competitionLuyKeData={competitionLuyKe}
                            summaryLuyKeData={summaryLuyKe}
                            onThiDuaDataChange={handleThiDuaDataChange}
                        />
                    </div>
                ) : (
                    <div className="py-12 text-center bg-slate-50 dark:bg-slate-900/40 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                        <UploadIcon className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                        <p className="text-xs text-slate-500 font-medium px-4">Hãy cập nhật dữ liệu nguồn trước.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DataUpdater;
