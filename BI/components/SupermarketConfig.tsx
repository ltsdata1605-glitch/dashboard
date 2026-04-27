
import React, { useRef, useMemo, useState, useEffect } from 'react';
import { DownloadIcon, XIcon, CheckCircleIcon, ChevronDownIcon, ResetIcon, AlertTriangleIcon, PencilIcon, SaveIcon, UploadIcon, ClockIcon, TrashIcon } from './Icons';
import { useIndexedDBState } from '../hooks/useIndexedDBState';
import Toast from './Toast';
import TargetHero from './TargetHero';
import Slider from './Slider';
import Card from './Card';
import * as db from '../utils/db';
import { parseNumber, shortenName } from '../utils/dashboardHelpers';

type UpdateCategory = 'BC Tổng hợp' | 'Thi Đua Cụm' | 'Thiết lập và cập nhật dữ liệu cho siêu thị';
type Competition = { name: string; criteria: string };
type ConfigTab = 'data' | 'revenueTarget' | 'competitionTarget';

const BulkRenameModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    competitions: Competition[];
    nameOverrides: Record<string, string>;
    onSave: (newOverrides: Record<string, string>) => void;
}> = ({ isOpen, onClose, competitions, nameOverrides, onSave }) => {
    const [temp, setTemp] = useState<Record<string, string>>(nameOverrides);
    useEffect(() => { if (isOpen) setTemp(nameOverrides); }, [isOpen, nameOverrides]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 w-full max-w-2xl border border-slate-200 dark:border-slate-800 shadow-2xl animate-in zoom-in-95 flex flex-col max-h-[85vh]">
                <div className="flex justify-between items-center mb-6 shrink-0">
                    <div>
                        <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Sửa tên nhóm thi đua</h3>
                        <p className="text-xs text-slate-500 font-medium">Tên hiển thị sẽ được đồng bộ sang tất cả báo cáo.</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full"><XIcon className="h-6 w-6" /></button>
                </div>
                <div className="flex-1 overflow-y-auto pr-2 space-y-3 scrollbar-thin">
                    {competitions.length > 0 ? competitions.map(comp => (
                        <div key={comp.name} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center gap-4">
                            <div className="flex-1 min-w-0">
                                <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Tên gốc trong BI</p>
                                <p className="text-xs text-slate-600 dark:text-slate-300 font-medium truncate">{comp.name}</p>
                            </div>
                            <div className="flex-1">
                                <p className="text-[10px] font-black text-primary-500 uppercase mb-1">Tên hiển thị mới</p>
                                <input 
                                    value={temp[comp.name] ?? ''}
                                    onChange={e => setTemp({...temp, [comp.name]: e.target.value})}
                                    placeholder={shortenName(comp.name)}
                                    className="w-full px-4 py-2 bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-bold focus:ring-2 focus:ring-primary-500 outline-none"
                                />
                            </div>
                        </div>
                    )) : <p className="text-center py-10 text-slate-400 italic">Không có nhóm nào để sửa.</p>}
                </div>
                <div className="mt-6 flex gap-3 shrink-0">
                    <button onClick={() => setTemp({})} className="px-6 py-3 text-sm font-bold text-slate-500 hover:bg-slate-50 rounded-2xl">Mặc định</button>
                    <button onClick={() => { onSave(temp); onClose(); }} className="flex-1 py-3 bg-primary-600 text-white text-sm font-black uppercase rounded-2xl hover:bg-primary-700 transition-all shadow-lg shadow-primary-500/20">Cập nhật tất cả</button>
                </div>
            </div>
        </div>
    );
};

const StatusTile: React.FC<{
    title: string;
    lastUpdated: string | null;
    value: string;
    placeholder: string;
    onChange: (val: string) => void;
    onClear: (title: string) => void;
    error?: string | null;
}> = ({ title, lastUpdated, value, placeholder, onChange, onClear, error }) => {
    const [isPasting, setIsPasting] = useState(false);
    const hasData = value && value.length > 0 && !error;

    return (
        <div className="relative group w-full">
            <div 
                onClick={() => !isPasting && setIsPasting(true)}
                className={`
                    cursor-pointer min-h-[52px] rounded-xl border transition-all duration-300 flex items-center px-4 relative overflow-hidden
                    ${isPasting ? 'border-primary-500 bg-white dark:bg-slate-800 ring-2 ring-primary-500/10 scale-[1.01]' : 
                      hasData ? 'border-primary-100 dark:border-primary-900/30 bg-primary-50/20 dark:bg-primary-900/10 hover:border-primary-300' : 
                      'border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/20 hover:border-primary-400'}
                `}
            >
                {isPasting ? (
                    <div className="w-full flex items-center gap-2">
                        <textarea
                            autoFocus
                            className="flex-1 bg-transparent border-none focus:ring-0 text-[10px] font-mono resize-none p-0 h-10 leading-tight"
                            placeholder="Nhấn Ctrl + V..."
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
                            <div className={`p-1.5 rounded-lg shrink-0 ${hasData ? 'bg-primary-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}>
                                {hasData ? <CheckCircleIcon className="h-4 w-4" /> : <UploadIcon className="h-4 w-4" />}
                            </div>
                            <div className="min-w-0">
                                <h4 className={`text-[11px] font-black uppercase tracking-tight truncate ${hasData ? 'text-primary-800 dark:text-primary-300' : 'text-slate-500 dark:text-slate-400'}`}>{title}</h4>
                                {hasData && lastUpdated && (
                                    <span className="text-[9px] font-medium text-slate-400 dark:text-slate-500 uppercase flex items-center gap-1">
                                        <ClockIcon className="h-2.5 w-2.5" /> {lastUpdated}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
            {hasData && !isPasting && (
                <button 
                    onClick={(e) => { 
                        e.stopPropagation(); 
                        onClear(title); 
                    }} 
                    className="absolute top-1/2 -translate-y-1/2 right-2 p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/40 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-xl transition-all border border-red-100 dark:border-red-900/30 shadow-sm active:scale-90 z-10" 
                    title="Xoá"
                >
                    <TrashIcon className="h-4 w-4" />
                </button>
            )}
            {error && <p className="mt-0.5 text-[8px] font-black text-red-500 uppercase tracking-tighter text-center">{error}</p>}
        </div>
    );
};

const CompetitionTarget: React.FC<{
    supermarketName: string;
    addUpdate: (id: string, message: string, category: UpdateCategory) => void;
    competitions: Competition[];
    competitionLuyKeData: string;
}> = ({ supermarketName, addUpdate, competitions, competitionLuyKeData }) => {
    const [targets, setTargets] = useIndexedDBState<Record<string, number>>(`comptarget-${supermarketName}-targets`, {});
    const [nameOverrides, setNameOverrides] = useIndexedDBState<Record<string, string>>('competition-name-overrides', {});
    const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
    
    const f = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 });

    const baseTargets = useMemo(() => {
        if (!competitionLuyKeData) return {};
        const lines = String(competitionLuyKeData).split('\n');
        const map: Record<string, number> = {};
        let currentComp: string | null = null;
        for (const line of lines) {
            const parts = line.split('\t').map(p => p.trim());
            if (parts.length > 2 && (parts[1] === 'DTLK' || parts[1] === 'DTQĐ' || parts[1] === 'SLLK') && parts[2] === 'Target') { currentComp = parts[0]; continue; }
            if (currentComp && parts[0] === supermarketName) { map[currentComp] = parseNumber(parts[2]); }
        }
        return map;
    }, [competitionLuyKeData, supermarketName]);

    const handleSliderChange = (compName: string) => (val: number) => {
        setTargets(prev => ({ ...prev, [compName]: val }));
        addUpdate(`comptarget-${supermarketName}-${compName}`, `Điều chỉnh target ${compName} - ${supermarketName}`, 'Thiết lập và cập nhật dữ liệu cho siêu thị');
    };

    const handleSaveAsPrevMonth = async (compName: string) => {
        const baseVal = baseTargets[compName] || 0;
        const ratio = targets[compName] ?? 100;
        const adjVal = baseVal * (ratio / 100);
        
        const key = `prev-month-target-${supermarketName}-${compName}`;
        await db.set(key, adjVal);
        
        alert(`✅ Đã lưu Target ${shortenName(compName, nameOverrides)} làm mốc so sánh tháng trước!`);
    };

    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex justify-between items-center mb-2 px-1">
                <div className="flex items-center gap-2">
                    <div className="w-1 h-3 bg-orange-600 rounded-full"></div>
                    <h2 className="text-[11px] font-black text-slate-800 dark:text-white uppercase tracking-tight">Cấu hình Target Thi đua</h2>
                </div>
                <button onClick={() => setIsRenameModalOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 text-[9px] font-black rounded-lg border border-primary-100 dark:border-primary-800 hover:bg-primary-100 transition-all uppercase tracking-widest active:scale-95 shadow-sm">
                    <PencilIcon className="h-3 w-3" /><span>Sửa tên nhóm</span>
                </button>
            </div>

            {competitions.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
                    {competitions.map(comp => {
                        const baseVal = baseTargets[comp.name] || 0;
                        const ratio = targets[comp.name] ?? 100;
                        const adjVal = baseVal * (ratio / 100);
                        const unitSuffix = comp.criteria === 'SLLK' ? ' Cái' : ' Tr';

                        return (
                            <div key={comp.name} className="p-3 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-xl shadow-sm hover:border-orange-200 transition-all group">
                                <div className="flex justify-between items-center mb-1.5">
                                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 truncate pr-2" title={comp.name}>
                                        {shortenName(comp.name, nameOverrides)}
                                    </span>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <div className="flex items-center gap-1">
                                            <span className="text-[8px] font-bold text-slate-400 uppercase">Gốc:</span>
                                            <span className="text-[10px] font-bold text-slate-500 tabular-nums">{f.format(baseVal)}{unitSuffix}</span>
                                        </div>
                                        <div className="flex items-center gap-1 pl-2 border-l border-slate-100 dark:border-slate-700">
                                            <span className="text-[8px] font-black text-orange-400 uppercase">Sau:</span>
                                            <span className="text-[10px] font-black text-orange-600 tabular-nums">{f.format(adjVal)}{unitSuffix}</span>
                                        </div>
                                        <div className="flex items-center gap-1 ml-1 bg-slate-50 dark:bg-slate-900 px-1 py-0.5 rounded-lg border border-slate-100 dark:border-slate-700">
                                            <input 
                                                type="number"
                                                value={ratio}
                                                onChange={(e) => { const v = parseFloat(e.target.value); if (!isNaN(v)) handleSliderChange(comp.name)(v); }}
                                                className="w-8 bg-transparent text-right text-[10px] font-black text-orange-600 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                            />
                                            <span className="text-[8px] font-bold text-slate-400">%</span>
                                        </div>
                                        <button 
                                            onClick={() => handleSaveAsPrevMonth(comp.name)}
                                            className="p-1.5 text-slate-400 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-all"
                                            title="Lưu dữ liệu hiện tại làm mốc so sánh tháng trước"
                                        >
                                            <ClockIcon className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                </div>
                                <div className="px-0.5">
                                    <input
                                        type="range"
                                        min={0} max={300} step={1}
                                        value={ratio}
                                        onChange={(e) => handleSliderChange(comp.name)(parseFloat(e.target.value))}
                                        className="w-full h-1 bg-slate-100 dark:bg-slate-700 rounded-full appearance-none cursor-pointer accent-orange-500"
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
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
                onSave={setNameOverrides}
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

    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' | 'info'; isVisible: boolean }>({ message: '', type: 'info', isVisible: false });

    const ids = useMemo(() => ({
        ds: supermarketName ? `config-${supermarketName}-danhsach` : null,
        mt: supermarketName ? `config-${supermarketName}-matran` : null,
        td: supermarketName ? `config-${supermarketName}-thidua` : null,
        rt: supermarketName ? `config-${supermarketName}-industry-realtime` : null,
        lk: supermarketName ? `config-${supermarketName}-industry-luyke` : null,
        tg: supermarketName ? `config-${supermarketName}-tragop` : null,
        bk: supermarketName ? `config-${supermarketName}-bankem` : null,
    }), [supermarketName]);

    const [danhSachData, setDanhSachData] = useIndexedDBState(ids.ds, '');
    const [maTranData, setMaTranData] = useIndexedDBState(ids.mt, '');
    const [thiDuaData, setThiDuaData] = useIndexedDBState(ids.td, '');
    const [industryRealtimeData, setIndustryRealtimeData] = useIndexedDBState(ids.rt, '');
    const [industryLuyKeData, setIndustryLuyKeData] = useIndexedDBState(ids.lk, '');
    const [traGopData, setTraGopData] = useIndexedDBState(ids.tg, '');
    const [banKemData, setBanKemData] = useIndexedDBState(ids.bk, '');

    const [danhSachTs, setDanhSachTs] = useIndexedDBState<string | null>(supermarketName ? `${ids.ds}-ts` : null, null);
    const [maTranTs, setMaTranTs] = useIndexedDBState<string | null>(supermarketName ? `${ids.mt}-ts` : null, null);
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
        if (!danhSachData || !danhSachData.includes('Nhân viên	DTLK	DTQĐ	Hiệu quả QĐ	Số lượng	Đơn giá')) return [];
        const lines = danhSachData.split('\n').map(l => l.trim()).filter(l => l);
        const departmentList: any[] = [];
        let currentDept: any = null;
        for (const line of lines) {
            const parts = line.split('\t');
            if (line.startsWith('BP ') && parts.length > 1) {
                if (currentDept) departmentList.push(currentDept);
                currentDept = { name: parts[0].trim(), employeeCount: 0 };
            } else if (currentDept && parts.length > 1) currentDept.employeeCount++;
        }
        if (currentDept) departmentList.push(currentDept);
        return departmentList;
    }, [danhSachData]);

    const competitions = useMemo(() => {
        if (!competitionLuyKeData) return [];
        const competitionList: Competition[] = [];
        const seen = new Set<string>();
        const valid = ['DTLK', 'DTQĐ', 'SLLK'];
        for (const line of competitionLuyKeData.split('\n')) {
            const parts = line.split('\t');
            if (parts.length > 2 && valid.includes(parts[1]?.trim()) && parts[2]?.trim() === 'Target') {
                const name = parts[0].trim();
                if (name && !seen.has(name)) {
                    competitionList.push({ name, criteria: parts[1].trim() });
                    seen.add(name);
                }
            }
        }
        return competitionList;
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
            <Toast 
                message={toast.message} 
                type={toast.type} 
                isVisible={toast.isVisible} 
                onClose={() => setToast(p => ({ ...p, isVisible: false }))} 
                duration={3000}
            />
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 overflow-x-auto scrollbar-hide">
                <nav className="flex space-x-6 min-w-max" aria-label="Tabs">
                    {[
                        { id: 'data', label: 'Dữ liệu nguồn' },
                        { id: 'revenueTarget', label: 'Target Doanh thu' },
                        { id: 'competitionTarget', label: 'Target Thi đua' }
                    ].map(t => (
                        <button
                            key={t.id}
                            onClick={() => setActiveTab(t.id as any)}
                            className={`py-3 px-1 border-b-2 font-black text-[11px] uppercase tracking-widest transition-all ${activeTab === t.id ? 'border-primary-600 text-primary-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                        >
                            {t.label}
                        </button>
                    ))}
                </nav>
            </div>
            
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                {activeTab === 'data' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {/* NHÓM 1: BC D.THU NGÀNH HÀNG (DÀNH CHO SIÊU THỊ) */}
                        <div className="space-y-4">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-2">
                                <div className="w-1 h-1 bg-sky-500 rounded-full"></div>
                                BC D.Thu Ngành Hàng
                            </h3>
                            <div className="grid grid-cols-1 gap-3">
                                <StatusTile title="Realtime" lastUpdated={industryRealtimeTs} value={industryRealtimeData} placeholder="Ngành hàng Realtime..." error={errors.industryRealtime} 
                                    onChange={(v) => { setIndustryRealtimeData(v); handleUpdate('industryRealtime', v, s => s.includes('Nhóm ngành hàng	SL Realtime'), setIndustryRealtimeTs, `Ngành hàng (RT) - ${supermarketName}`, ids.rt!); }}
                                    onClear={(title) => { 
                                        setIndustryRealtimeData(''); 
                                        setIndustryRealtimeTs(null); 
                                        removeUpdate(ids.rt!); 
                                        setToast({ message: `Đã xoá dữ liệu ${title}`, type: 'warning', isVisible: true });
                                        setTimeout(() => setToast(p => ({ ...p, isVisible: false })), 2000);
                                    }} />
                                <StatusTile title="Luỹ kế" lastUpdated={industryLuyKeTs} value={industryLuyKeData} placeholder="Ngành hàng Luỹ kế..." error={errors.industryLuyKe} 
                                    onChange={(v) => { setIndustryLuyKeData(v); handleUpdate('industryLuyKe', v, s => s.includes('Nhóm ngành hàng	Số lượng	DTQĐ'), setIndustryLuyKeTs, `Ngành hàng (LK) - ${supermarketName}`, ids.lk!); }}
                                    onClear={(title) => { 
                                        setIndustryLuyKeData(''); 
                                        setIndustryLuyKeTs(null); 
                                        removeUpdate(ids.lk!); 
                                        setToast({ message: `Đã xoá dữ liệu ${title}`, type: 'warning', isVisible: true });
                                        setTimeout(() => setToast(p => ({ ...p, isVisible: false })), 2000);
                                    }} />
                            </div>
                        </div>

                        {/* NHÓM 2: BC D.THU THEO NHÂN VIÊN */}
                        <div className="space-y-4">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-2">
                                <div className="w-1 h-1 bg-emerald-500 rounded-full"></div>
                                BC D.Thu theo NV
                            </h3>
                            <div className="grid grid-cols-1 gap-3">
                                <StatusTile title="DOANH THU" lastUpdated={danhSachTs} value={danhSachData} placeholder="Nhân viên Danh sách..." error={errors.danhSach} 
                                    onChange={(v) => { setDanhSachData(v); handleUpdate('danhSach', v, s => s.includes('Nhân viên	DTLK	DTQĐ'), setDanhSachTs, `Nhân viên (DS) - ${supermarketName}`, ids.ds!); }}
                                    onClear={(title) => { 
                                        setDanhSachData(''); 
                                        setDanhSachTs(null); 
                                        removeUpdate(ids.ds!); 
                                        setToast({ message: `Đã xoá dữ liệu ${title}`, type: 'warning', isVisible: true });
                                        setTimeout(() => setToast(p => ({ ...p, isVisible: false })), 2000);
                                    }} />
                                
                                <StatusTile title="THI ĐUA NV" lastUpdated={thiDuaTs} value={thiDuaData} placeholder="Phòng ban..." error={errors.thiDua} 
                                    onChange={(v) => { setThiDuaData(v); if(v && v.toLowerCase().includes('phòng ban')) { onThiDuaDataChange(supermarketName, v); handleUpdate('thiDua', v, s => s.toLowerCase().includes('phòng ban'), setThiDuaTs, `Nhân viên (TĐ) - ${supermarketName}`, ids.td!); } else setErrors(p => ({...p, thiDua: 'Sai định dạng Thi đua NV.'})); }}
                                    onClear={(title) => { 
                                        setThiDuaData(''); 
                                        setThiDuaTs(null); 
                                        removeUpdate(ids.td!); 
                                        setToast({ message: `Đã xoá dữ liệu ${title}`, type: 'warning', isVisible: true });
                                        setTimeout(() => setToast(p => ({ ...p, isVisible: false })), 2000);
                                    }} />

                                <StatusTile title="HQ BÁN KÈM" lastUpdated={banKemTs} value={banKemData} placeholder="Nhân viên..." error={errors.banKem} 
                                    onChange={(v) => { setBanKemData(v); handleUpdate('banKem', v, s => s.includes('Nhân viên	DTLK	DTLK áp dụng MNGN'), setBanKemTs, `Nhân viên (BK) - ${supermarketName}`, ids.bk!); }}
                                    onClear={(title) => { 
                                        setBanKemData(''); 
                                        setBanKemTs(null); 
                                        removeUpdate(ids.bk!); 
                                        setToast({ message: `Đã xoá dữ liệu ${title}`, type: 'warning', isVisible: true });
                                        setTimeout(() => setToast(p => ({ ...p, isVisible: false })), 2000);
                                    }} />
                            </div>
                        </div>

                        {/* NHÓM 3: TRẢ GÓP & CHI TIẾT NHÂN VIÊN */}
                        <div className="space-y-4">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-2">
                                <div className="w-1 h-1 bg-amber-500 rounded-full"></div>
                                Trả góp & CHI TIẾT NH
                            </h3>
                            <div className="grid grid-cols-1 gap-3">
                                <StatusTile title="MA TRẬN NH" lastUpdated={maTranTs} value={maTranData} placeholder="Nhân viên Ma trận..." error={errors.maTran} 
                                    onChange={(v) => { setMaTranData(v); handleUpdate('maTran', v, s => s.includes('Phòng ban') && s.includes('DTQĐ	Số lượng'), setMaTranTs, `Nhân viên (MT) - ${supermarketName}`, ids.mt!); }}
                                    onClear={(title) => { 
                                        setMaTranData(''); 
                                        setMaTranTs(null); 
                                        removeUpdate(ids.mt!); 
                                        setToast({ message: `Đã xoá dữ liệu ${title}`, type: 'warning', isVisible: true });
                                        setTimeout(() => setToast(p => ({ ...p, isVisible: false })), 2000);
                                    }} />

                                <StatusTile title="Trả góp NV" lastUpdated={traGopTs} value={traGopData} placeholder="Nhân viên..." error={errors.traGop} 
                                    onChange={(v) => { setTraGopData(v); handleUpdate('traGop', v, s => s.includes('Nhân viên') && s.includes('DT Siêu thị'), setTraGopTs, `Nhân viên (TG) - ${supermarketName}`, ids.tg!); }}
                                    onClear={(title) => { 
                                        setTraGopData(''); 
                                        setTraGopTs(null); 
                                        removeUpdate(ids.tg!); 
                                        setToast({ message: `Đã xoá dữ liệu ${title}`, type: 'warning', isVisible: true });
                                        setTimeout(() => setToast(p => ({ ...p, isVisible: false })), 2000);
                                    }} />
                            </div>
                        </div>
                    </div>
                )}
                {activeTab === 'revenueTarget' && <TargetHero supermarketName={supermarketName!} addUpdate={addUpdate} departments={departments} summaryLuyKeData={summaryLuyKeData} />}
                {activeTab === 'competitionTarget' && <CompetitionTarget supermarketName={supermarketName!} addUpdate={addUpdate} competitions={competitions} competitionLuyKeData={competitionLuyKeData} />}
            </div>
        </div>
    );
};

export default SupermarketConfig;
