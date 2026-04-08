
import React, { useState, useRef, useEffect } from 'react';
import Card from './Card';
import { CheckCircleIcon, DownloadIcon, XIcon, AlertTriangleIcon, UploadIcon, ClockIcon, ResetIcon, TrashIcon } from './Icons';
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
    placeholder: string;
    onChange: (val: string) => void;
    onClear: (title: string) => void;
    error?: string | null;
    downloadUrl?: string;
}> = ({ title, lastUpdated, value, placeholder, onChange, onClear, error, downloadUrl }) => {
    const [isPasting, setIsPasting] = useState(false);
    const hasData = value && value.length > 0 && !error;

    return (
        <div className="relative group w-full">
            <div 
                onClick={() => !isPasting && setIsPasting(true)}
                className={`
                    cursor-pointer min-h-[56px] rounded-xl border transition-all duration-300 flex items-center px-4 relative overflow-hidden
                    ${isPasting ? 'border-primary-500 bg-white dark:bg-slate-800 ring-2 ring-primary-500/10' : 
                      hasData ? 'border-primary-100 dark:border-primary-900/30 bg-primary-50/20 dark:bg-primary-900/10 hover:border-primary-300' : 
                      'border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/20 hover:border-primary-400'}
                `}
            >
                {isPasting ? (
                    <div className="w-full flex items-center gap-2">
                        <textarea
                            autoFocus
                            className="flex-1 bg-transparent border-none focus:ring-0 text-[10px] font-mono resize-none p-0 h-10 leading-tight"
                            placeholder="Nhấn Ctrl + V để dán..."
                            onPaste={(e) => {
                                const text = e.clipboardData.getData('text');
                                onChange(text);
                                setIsPasting(false);
                            }}
                        />
                        <button onClick={(e) => { e.stopPropagation(); setIsPasting(false); }} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-[9px] font-black text-slate-400">HUỶ</button>
                    </div>
                ) : (
                    <div className="flex items-center justify-between w-full gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className={`p-1.5 rounded-lg shrink-0 ${hasData ? 'bg-primary-600 text-white shadow-sm' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}>
                                {hasData ? <CheckCircleIcon className="h-4 w-4" /> : <UploadIcon className="h-4 w-4" />}
                            </div>
                            <div className="min-w-0">
                                <h4 className={`text-[12px] font-bold uppercase tracking-tight truncate ${hasData ? 'text-primary-800 dark:text-primary-300' : 'text-slate-500 dark:text-slate-400'}`}>{title}</h4>
                                {hasData && lastUpdated && (
                                    <span className="text-[9px] font-medium text-slate-400 dark:text-slate-500 uppercase flex items-center gap-1">
                                        <ClockIcon className="h-2.5 w-2.5" /> {lastUpdated}
                                    </span>
                                )}
                            </div>
                        </div>
                        
                        {!hasData && (
                            <span className="text-[10px] font-black text-primary-500 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Click & Dán</span>
                        )}
                    </div>
                )}
            </div>

            {hasData && !isPasting && (
                <div className="absolute top-1/2 -translate-y-1/2 right-2 flex gap-1 z-10 pl-2">
                     <button 
                        onClick={(e) => { 
                            e.stopPropagation(); 
                            onClear(title); 
                        }} 
                        title="Xoá dữ liệu" 
                        className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/40 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-xl transition-all border border-red-100 dark:border-red-900/30 shadow-sm active:scale-90"
                    >
                        <TrashIcon className="h-4 w-4" />
                    </button>
                    {downloadUrl && (
                         <a 
                            href={downloadUrl} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            onClick={(e) => e.stopPropagation()} 
                            className="p-2 text-primary-600 hover:bg-primary-100 dark:hover:bg-primary-900/40 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-xl transition-all border border-primary-100 dark:border-primary-900/30 shadow-sm active:scale-90"
                        >
                            <DownloadIcon className="h-4 w-4" />
                        </a>
                    )}
                </div>
            )}
            {error && (
                <div className="mt-1 flex items-center gap-1 px-1 text-[9px] font-bold text-red-500 uppercase animate-in fade-in">
                    <AlertTriangleIcon className="h-3 w-3 shrink-0" />
                    <span>Lỗi định dạng</span>
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

    const [lastUpdates, setLastUpdates] = useIndexedDBState<Update[]>('last-updates-list', []);
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
        <div className="max-w-7xl mx-auto space-y-8 pb-20 px-2">
            <Toast 
                message={toast.message} 
                type={toast.type} 
                isVisible={toast.isVisible} 
                onClose={() => setToast(p => ({ ...p, isVisible: false }))} 
                duration={toast.message.includes('Đang xoá') ? 0 : 3000}
            />
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-none uppercase">Cập nhật dữ liệu</h1>
                    <p className="mt-1 text-sm text-slate-500 font-medium">Bấm vào các ô và dán dữ liệu (Ctrl+V) từ báo cáo BI.</p>
                </div>
                <div className="flex items-center gap-3">
                    {isConfirmingClear ? (
                        <div className="flex items-center gap-2 animate-in slide-in-from-right-2 duration-300">
                            <button 
                                onClick={() => setIsConfirmingClear(false)}
                                className="px-3 py-1.5 text-[10px] font-black text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
                            >
                                HUỶ
                            </button>
                            <button 
                                onClick={handleClearAllData}
                                className="px-4 py-1.5 bg-red-600 text-white text-[10px] font-black rounded-xl hover:bg-red-700 transition-all shadow-lg shadow-red-500/20 uppercase tracking-widest"
                            >
                                XÁC NHẬN XOÁ HẾT
                            </button>
                        </div>
                    ) : (
                        <button 
                            onClick={() => setIsConfirmingClear(true)}
                            title="Xoá HẾT TẤT CẢ dữ liệu"
                            className="p-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl border border-red-100 dark:border-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/40 transition-all active:scale-95 shadow-sm relative z-50"
                        >
                            <TrashIcon className="h-5 w-5" />
                        </button>
                    )}
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                        <span className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest">Sẵn sàng</span>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                            placeholder={SUMMARY_REALTIME_REPORT_HEADER}
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
                            placeholder={SUMMARY_LUYKE_REPORT_HEADER}
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
                            placeholder={COMPETITION_REALTIME_REPORT_HEADER}
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
                            placeholder={COMPETITION_LUYKE_REPORT_HEADER}
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
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between mb-4 px-1">
                    <div className="flex items-center gap-2">
                        <div className="w-1 h-4 bg-slate-800 dark:bg-slate-400 rounded-full"></div>
                        <h2 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight">Cấu hình siêu thị</h2>
                    </div>
                    {supermarkets.length > 0 && (
                        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl overflow-x-auto scrollbar-hide max-w-full">
                            {supermarkets.map((sm) => (
                                <button
                                    key={sm}
                                    onClick={() => setActiveSupermarket(sm)}
                                    className={`shrink-0 px-3 py-1 rounded-lg text-[10px] font-black transition-all uppercase ${activeSupermarket === sm ? 'bg-white dark:bg-slate-700 text-primary-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    {sm.split(' - ').pop()}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
                
                {activeSupermarket ? (
                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-xl animate-in fade-in zoom-in-95 duration-300">
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
