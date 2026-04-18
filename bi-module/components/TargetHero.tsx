
import React, { useMemo, useState, useEffect } from 'react';
import { useIndexedDBState } from '../hooks/useIndexedDBState';
import { ChevronDownIcon, XIcon, PlusIcon, TrashIcon, CheckCircleIcon, CogIcon, PencilIcon, ResetIcon } from './Icons';
import Slider from './Slider';
import { ManualDeptMapping } from '../types/nhanVienTypes';
import { parseNumber } from '../utils/dashboardHelpers';

type UpdateCategory = 'BC Tổng hợp' | 'Thi Đua Cụm' | 'Thiết lập và cập nhật dữ liệu cho siêu thị';

interface TargetHeroProps {
    supermarketName: string;
    addUpdate: (id: string, message: string, category: UpdateCategory) => void;
    departments: { name: string; employeeCount: number }[];
    summaryLuyKeData: string;
}

const CreateDeptModal: React.FC<{ 
    isOpen: boolean; 
    onClose: () => void; 
    onSave: (name: string, employeeNames: string[]) => void;
    allEmployees: { name: string; originalName: string }[];
    existingMapping: ManualDeptMapping;
    editingDept?: { name: string; employees: string[] } | null;
}> = ({ isOpen, onClose, onSave, allEmployees, existingMapping, editingDept }) => {
    const [name, setName] = useState('');
    const [selectedEmps, setSelectedEmps] = useState<Set<string>>(new Set());
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (isOpen) {
            if (editingDept) {
                setName(editingDept.name);
                setSelectedEmps(new Set(editingDept.employees));
            } else {
                setName('');
                setSelectedEmps(new Set());
            }
            setSearchTerm('');
        }
    }, [isOpen, editingDept]);

    if (!isOpen) return null;

    const assignedInOtherDepts = new Set(
        Object.entries(existingMapping)
            .filter(([deptName]) => deptName !== editingDept?.name)
            .flatMap(([_, emps]) => emps)
    );

    const availableEmps = allEmployees.filter(emp => !assignedInOtherDepts.has(emp.originalName));
    const filteredEmps = availableEmps.filter(emp => emp.originalName.toLowerCase().includes(searchTerm.toLowerCase()));

    const toggleEmp = (originalName: string) => {
        const next = new Set(selectedEmps);
        if (next.has(originalName)) next.delete(originalName);
        else next.add(originalName);
        setSelectedEmps(next);
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh] border border-slate-200/50 dark:border-slate-700 animate-in fade-in zoom-in-95 overflow-hidden">
                <div className="p-4 border-b border-sky-100/50 dark:border-slate-700 bg-sky-50/50 dark:bg-slate-800/50 flex justify-between items-center">
                    <h3 className="font-black text-lg text-sky-800 dark:text-sky-400 tracking-tight">{editingDept ? 'Sửa bộ phận' : 'Tạo Bộ phận mới'}</h3>
                    <button onClick={onClose} className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-600"><XIcon className="h-5 w-5 text-sky-600/60 dark:text-slate-400" /></button>
                </div>
                <div className="p-5 space-y-5 overflow-y-auto bg-white dark:bg-slate-800">
                    <div>
                        <label className="block text-[10px] font-black text-sky-700 dark:text-sky-400 uppercase tracking-widest mb-2">Tên nhóm / Bộ phận</label>
                        <input value={name} onChange={e => setName(e.target.value)} placeholder="Ví dụ: Nhóm Online..." className="w-full px-4 py-3 bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-900 focus:ring-4 focus:ring-sky-500/10 focus:border-sky-400 outline-none transition-all font-bold text-slate-700 dark:text-slate-200 text-sm placeholder:text-slate-400 placeholder:font-normal" />
                    </div>
                    <div>
                        <div className="flex justify-between items-end mb-2">
                            <label className="block text-[10px] font-black text-sky-700 dark:text-sky-400 uppercase tracking-widest">
                                Chọn nhân sự
                            </label>
                            <span className="text-[10px] uppercase font-bold text-sky-600/70 bg-sky-50 px-2 py-0.5 rounded-full border border-sky-100">{selectedEmps.size} đã chọn</span>
                        </div>
                        <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Tìm kiếm tên nhân viên..." className="w-full px-4 py-3 bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-900 focus:ring-4 focus:ring-sky-500/10 focus:border-sky-400 text-sm mb-3 outline-none transition-all font-medium placeholder:text-slate-400" />
                        <div className="space-y-1.5 max-h-[30vh] overflow-y-auto p-1.5 border border-slate-100 dark:border-slate-700/50 rounded-xl bg-slate-50/30 dark:bg-slate-900/30">
                            {filteredEmps.length > 0 ? filteredEmps.map(emp => (
                                <label key={emp.originalName} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border ${selectedEmps.has(emp.originalName) ? 'bg-sky-50/80 dark:bg-sky-900/30 border-sky-200 dark:border-sky-700 shadow-sm' : 'border-transparent hover:bg-white dark:hover:bg-slate-800 hover:border-slate-200 dark:hover:border-slate-700 hover:shadow-sm'}`}>
                                    <input type="checkbox" checked={selectedEmps.has(emp.originalName)} onChange={() => toggleEmp(emp.originalName)} className="rounded-md border-slate-300 text-sky-500 focus:ring-sky-500 h-4.5 w-4.5 cursor-pointer bg-white" />
                                    <span className={`text-sm font-medium ${selectedEmps.has(emp.originalName) ? 'text-sky-800 dark:text-sky-300 font-bold' : 'text-slate-600 dark:text-slate-300'}`}>{emp.originalName}</span>
                                </label>
                            )) : <div className="flex flex-col items-center justify-center py-8 opacity-60">
                                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-2"><XIcon className="h-5 w-5 text-slate-400" /></div>
                                    <p className="text-center text-[10px] font-black uppercase tracking-widest text-slate-500">Nhân sự đã được phân bổ hết</p>
                                </div>}
                        </div>
                    </div>
                </div>
                <div className="p-4 border-t border-slate-100 dark:border-slate-700 flex gap-3 bg-slate-50/80 dark:bg-slate-900/50">
                    <button onClick={onClose} className="flex-1 px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-black hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm uppercase tracking-widest active:scale-95">Hủy bỏ</button>
                    <button 
                        disabled={!name.trim() || selectedEmps.size === 0}
                        onClick={() => { onSave(name.trim(), Array.from(selectedEmps)); onClose(); }}
                        className="flex-[1.5] px-4 py-3 bg-gradient-to-r from-sky-500 to-sky-600 text-white rounded-xl text-xs font-black disabled:opacity-50 disabled:from-slate-400 disabled:to-slate-500 hover:from-sky-400 hover:to-sky-500 transition-all shadow-md shadow-sky-500/20 uppercase tracking-widest active:scale-95"
                    >Lưu cập nhật</button>
                </div>
            </div>
        </div>
    );
};

const CompactTargetItem: React.FC<{
    label: string;
    baseValue: number;
    adjValue: number;
    unit: string;
    ratio: number;
    onChange: (val: number) => void;
    onReset: () => void;
    colorTheme?: 'sky' | 'purple' | 'amber' | 'slate';
}> = ({ label, baseValue, adjValue, unit, ratio, onChange, onReset, colorTheme = 'slate' }) => {
    const f = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 });
    
    // Theme mapping
    const themes = {
        sky: { bg: 'bg-sky-50 dark:bg-sky-900/20', border: 'border-sky-200 dark:border-sky-800', shadow: 'shadow-sm', label: 'text-sky-700 dark:text-sky-400', after: 'text-sky-600 dark:text-sky-400', inputBg: 'bg-white dark:bg-slate-800', inputBorder: 'border-sky-200 dark:border-sky-700/50', inputText: 'text-sky-600', ring: 'focus-within:ring-sky-500', track: 'bg-sky-200 dark:bg-sky-900', thumb: 'accent-sky-500' },
        purple: { bg: 'bg-purple-50 dark:bg-purple-900/20', border: 'border-purple-200 dark:border-purple-800', shadow: 'shadow-sm', label: 'text-purple-700 dark:text-purple-400', after: 'text-purple-600 dark:text-purple-400', inputBg: 'bg-white dark:bg-slate-800', inputBorder: 'border-purple-200 dark:border-purple-700/50', inputText: 'text-purple-600', ring: 'focus-within:ring-purple-500', track: 'bg-purple-200 dark:bg-purple-900', thumb: 'accent-purple-500' },
        amber: { bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-800', shadow: 'shadow-sm', label: 'text-amber-700 dark:text-amber-400', after: 'text-amber-600 dark:text-amber-400', inputBg: 'bg-white dark:bg-slate-800', inputBorder: 'border-amber-200 dark:border-amber-700/50', inputText: 'text-amber-600', ring: 'focus-within:ring-amber-500', track: 'bg-amber-200 dark:bg-amber-900', thumb: 'accent-amber-500' },
        slate: { bg: 'bg-slate-50 dark:bg-slate-800/40', border: 'border-slate-200 dark:border-slate-700', shadow: 'shadow-sm', label: 'text-slate-600 dark:text-slate-300', after: 'text-slate-800 dark:text-white', inputBg: 'bg-white dark:bg-slate-800', inputBorder: 'border-slate-200 dark:border-slate-700', inputText: 'text-slate-600', ring: 'focus-within:ring-slate-500', track: 'bg-slate-200 dark:bg-slate-700', thumb: 'accent-slate-500' }
    };
    const t = themes[colorTheme] || themes.slate;

    return (
        <div className={`p-3 rounded-xl transition-all border ${t.bg} ${t.border} ${t.shadow}`}>
            <div className="flex justify-between items-center mb-2 gap-4">
                <span className={`text-[11px] font-black uppercase tracking-wider ${t.label}`}>{label}</span>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 opacity-80">
                         <span className="text-[9px] font-bold uppercase">Gốc:</span>
                         <span className="text-[11px] font-bold tabular-nums">{f.format(baseValue)}{unit}</span>
                    </div>
                    <div className={`flex items-center gap-1.5 pl-3 border-l border-current/20`}>
                         <span className={`text-[9px] font-bold uppercase`}>Sau:</span>
                         <span className={`text-[12px] font-black tabular-nums ${t.after}`}>{f.format(adjValue)}{unit}</span>
                    </div>
                    <div className={`flex items-center gap-1 ml-2 ${t.inputBg} px-2 py-1 rounded-lg border ${t.inputBorder} ${t.ring} focus-within:ring-1`}>
                        <input 
                            type="number"
                            value={Math.round(ratio).toString()}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => { 
                                const val = e.target.value;
                                if (val === '') { onChange(0); return; }
                                const v = parseInt(val, 10); 
                                if (!isNaN(v)) onChange(v); 
                            }}
                            className={`w-10 bg-transparent text-right text-[12px] font-black ${t.inputText} outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                        />
                        <span className="text-[9px] font-bold opacity-60">%</span>
                    </div>
                </div>
            </div>
            <div className="px-1 relative">
                <input
                    type="range"
                    min={0} max={300} step={1}
                    value={ratio}
                    onChange={(e) => onChange(parseFloat(e.target.value))}
                    className={`w-full h-1.5 ${t.track} rounded-full appearance-none cursor-pointer ${t.thumb} transition-all`}
                />
            </div>
        </div>
    );
};

const TargetHero: React.FC<TargetHeroProps> = ({ supermarketName, addUpdate, departments, summaryLuyKeData }) => {
    const f = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 });
    const [traGop, setTraGop] = useIndexedDBState<number>(`targethero-${supermarketName}-tragop`, 45);
    const [quyDoi, setQuyDoi] = useIndexedDBState<number>(`targethero-${supermarketName}-quydoi`, 40);
    const [totalTarget, setTotalTarget] = useIndexedDBState<number>(`targethero-${supermarketName}-total`, 100);
    const [departmentWeights, setDepartmentWeights] = useIndexedDBState<Record<string, number>>(`targethero-${supermarketName}-departmentweights`, {});
    const [manualMapping, setManualMapping] = useIndexedDBState<ManualDeptMapping>(`manual-dept-mapping-${supermarketName}`, {});
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingDept, setEditingDept] = useState<{ name: string; employees: string[] } | null>(null);

    const [allEmployeesRaw] = useIndexedDBState<string>(`config-${supermarketName}-danhsach`, '');
    const allEmployees = useMemo(() => {
        if (!allEmployeesRaw) return [];
        return allEmployeesRaw.split('\n')
            .map(l => l.trim())
            .filter(l => l.includes(' - ') && !l.startsWith('BP ') && !l.startsWith('Hỗ trợ BI') && !l.startsWith('NNH ') && !l.startsWith('ĐML_STR_STR') && !/^\d/.test(l))
            .map(l => ({ originalName: l.split('\t')[0], name: l.split('\t')[0] }));
    }, [allEmployeesRaw]);

    const baseTargetQuyDoi = useMemo(() => {
        if (!summaryLuyKeData) return 0;
        const lines = String(summaryLuyKeData).split('\n');
        const supermarketLine = lines.find(line => line.trim().startsWith(supermarketName));
        if (!supermarketLine) return 0;
        const columns = supermarketLine.split('\t');
        const dtDuKienQd = parseNumber(columns[5]);
        const htTargetPercent = parseNumber(columns[6]);
        if (isNaN(dtDuKienQd) || isNaN(htTargetPercent) || htTargetPercent === 0) return 0;
        return dtDuKienQd / (htTargetPercent / 100);
    }, [summaryLuyKeData, supermarketName]);

    const adjustedTarget = useMemo(() => baseTargetQuyDoi * (totalTarget / 100), [baseTargetQuyDoi, totalTarget]);

    const combinedDepts = useMemo(() => {
        const manualNames = Object.keys(manualMapping);
        if (manualNames.length === 0) return departments.map(d => ({ ...d, isManual: false }));
        const manualList = manualNames.map(name => ({ name, employeeCount: manualMapping[name].length, isManual: true }));
        const assignedEmps = new Set(Object.values(manualMapping).flat());
        const otherEmpsCount = allEmployees.filter(e => !assignedEmps.has(e.originalName)).length;
        if (otherEmpsCount > 0) manualList.push({ name: 'BP Khác', employeeCount: otherEmpsCount, isManual: false });
        return manualList.sort((a,b) => {
            if (a.name === 'BP Khác') return 1;
            if (b.name === 'BP Khác') return -1;
            return a.name.localeCompare(b.name);
        });
    }, [departments, manualMapping, allEmployees]);

    const effectiveWeights = useMemo(() => {
        const weights: Record<string, number> = { ...departmentWeights };
        const validNames = new Set(combinedDepts.map(d => d.name));
        Object.keys(weights).forEach(k => { if (!validNames.has(k)) delete weights[k]; });
        let missing = combinedDepts.filter(d => weights[d.name] === undefined);
        if (missing.length > 0) {
            const currentTotal = combinedDepts.reduce((sum, d) => sum + (weights[d.name] || 0), 0);
            const share = Math.max(0, 100 - currentTotal) / missing.length;
            missing.forEach(d => { weights[d.name] = share; });
        }
        return weights;
    }, [departmentWeights, combinedDepts]);

    const handleDepartmentSliderChange = (deptName: string) => (newValue: number) => {
        const newWeights: Record<string, number> = { ...effectiveWeights, [deptName]: Math.max(0, newValue) };
        setDepartmentWeights(newWeights);
    };

    const totalAllocatedWeight = useMemo(() => {
        return combinedDepts.reduce((sum, d) => sum + (effectiveWeights[d.name] || 0), 0);
    }, [combinedDepts, effectiveWeights]);

    return (
        <section className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                {/* Cột trái: Điều chỉnh Target chính */}
                <div className="space-y-3">
                    <div className="flex justify-between items-center mb-1 px-1">
                        <div className="flex items-center gap-2">
                            <div className="w-1 h-3 bg-primary-600 rounded-full"></div>
                            <h2 className="text-[11px] font-black text-slate-800 dark:text-white uppercase tracking-wider">Cấu hình Target Doanh Thu</h2>
                        </div>
                        <button onClick={() => { if(confirm('Khôi phục hiển thị về mục tiêu mặc định?')) { setTotalTarget(100); setTraGop(45); setQuyDoi(40); } }} className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 text-[10px] font-black rounded-xl border border-rose-200 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-all uppercase tracking-widest active:scale-95 shadow-sm">
                            <ResetIcon className="h-3 w-3" /><span>Reset</span>
                        </button>
                    </div>
                    <CompactTargetItem label="Target DTQĐ" baseValue={baseTargetQuyDoi} adjValue={adjustedTarget} unit="Tr" ratio={totalTarget} onChange={v => setTotalTarget(v)} onReset={() => setTotalTarget(100)} colorTheme="sky" />
                    <CompactTargetItem label="Target Trả góp" baseValue={45} adjValue={traGop} unit="%" ratio={traGop} onChange={v => setTraGop(v)} onReset={() => setTraGop(45)} colorTheme="purple" />
                    <CompactTargetItem label="Target Quy đổi" baseValue={40} adjValue={quyDoi} unit="%" ratio={quyDoi} onChange={v => setQuyDoi(v)} onReset={() => setQuyDoi(40)} colorTheme="amber" />
                </div>

                {/* Cột phải: Phân bổ bộ phận */}
                <div className="space-y-3">
                    <div className="flex justify-between items-center px-1 mb-1">
                        <div className="flex items-center gap-2">
                            <div className="w-1 h-3 bg-emerald-600 rounded-full"></div>
                            <h2 className="text-[11px] font-black text-slate-800 dark:text-white uppercase tracking-wider">Phân bổ bộ phận</h2>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => { if(confirm('Đặt tất cả nhân sự và trọng số về mặc định?')) { setDepartmentWeights({}); setManualMapping({}); } }} className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 text-[10px] font-black rounded-xl border border-rose-200 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-all uppercase tracking-widest active:scale-95 shadow-sm">
                                <ResetIcon className="h-3 w-3" /><span>Reset</span>
                            </button>
                            <button onClick={() => { setEditingDept(null); setIsModalOpen(true); }} className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 text-[10px] font-black rounded-xl hover:bg-sky-100 dark:hover:bg-sky-900/50 border border-sky-200 dark:border-sky-800 transition-all uppercase tracking-widest active:scale-95 shadow-sm">
                                <PlusIcon className="h-3 w-3" /><span>Tạo mới</span>
                            </button>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm mb-3 relative overflow-hidden">
                        <div className="flex justify-between items-center mb-2 z-10 relative">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Tổng Ngân Sách Phân Bổ</span>
                            <div className="flex items-center gap-2">
                                <span className={`text-[13px] font-black ${totalAllocatedWeight > 100.01 ? 'text-red-500' : totalAllocatedWeight === 100 ? 'text-emerald-500' : 'text-slate-700 dark:text-white'}`}>
                                    {totalAllocatedWeight.toFixed(1)}<span className="text-[10px]">%</span>
                                </span>
                                {totalAllocatedWeight !== 100 && (
                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${totalAllocatedWeight > 100.01 ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                                        {totalAllocatedWeight > 100.01 ? `VƯỢT ${(totalAllocatedWeight - 100).toFixed(1)}%` : `DƯ ${(100 - totalAllocatedWeight).toFixed(1)}%`}
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-700/50 h-2 rounded-full overflow-hidden flex z-10 relative">
                            {combinedDepts.map((d, idx) => {
                                const w = effectiveWeights[d.name] || 0;
                                if (w <= 0) return null;
                                const colors = ['bg-emerald-500', 'bg-sky-500', 'bg-amber-500', 'bg-purple-500', 'bg-rose-500', 'bg-indigo-500'];
                                return <div key={d.name} style={{ width: `${Math.max(w, 100)}%` }} className={`${colors[idx % colors.length]} h-full opacity-90 transition-all`} title={`${d.name}: ${w.toFixed(1)}%`} />
                            })}
                        </div>
                        {totalAllocatedWeight === 100 && <div className="absolute inset-0 bg-emerald-50 dark:bg-emerald-900/10 pointer-events-none mix-blend-multiply opacity-50 z-0"></div>}
                        {totalAllocatedWeight > 100.01 && <div className="absolute inset-0 bg-red-50 dark:bg-red-900/10 pointer-events-none mix-blend-multiply opacity-50 z-0"></div>}
                    </div>

                    <div className="space-y-3">
                        {combinedDepts.length > 0 ? combinedDepts.map((dept, idx) => {
                            const weight = effectiveWeights[dept.name] ?? 0;
                            const allocated = adjustedTarget * (weight / 100);
                            const perEmployee = dept.employeeCount > 0 ? allocated / dept.employeeCount : 0;
                            const isManual = (dept as any).isManual;
                            
                            // Department Pastel Themes Array
                            const dThemes = [
                                { bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-200 dark:border-emerald-800', label: 'text-emerald-700 dark:text-emerald-400', after: 'text-emerald-600 dark:text-emerald-400', inputBg: 'bg-white dark:bg-slate-800', inputBorder: 'border-emerald-200 dark:border-emerald-700/50', inputText: 'text-emerald-600', ring: 'focus-within:ring-emerald-500', track: 'bg-emerald-200 dark:bg-emerald-900', thumb: 'accent-emerald-500' },
                                { bg: 'bg-sky-50 dark:bg-sky-900/20', border: 'border-sky-200 dark:border-sky-800', label: 'text-sky-700 dark:text-sky-400', after: 'text-sky-600 dark:text-sky-400', inputBg: 'bg-white dark:bg-slate-800', inputBorder: 'border-sky-200 dark:border-sky-700/50', inputText: 'text-sky-600', ring: 'focus-within:ring-sky-500', track: 'bg-sky-200 dark:bg-sky-900', thumb: 'accent-sky-500' },
                                { bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-800', label: 'text-amber-700 dark:text-amber-400', after: 'text-amber-600 dark:text-amber-400', inputBg: 'bg-white dark:bg-slate-800', inputBorder: 'border-amber-200 dark:border-amber-700/50', inputText: 'text-amber-600', ring: 'focus-within:ring-amber-500', track: 'bg-amber-200 dark:bg-amber-900', thumb: 'accent-amber-500' },
                                { bg: 'bg-rose-50 dark:bg-rose-900/20', border: 'border-rose-200 dark:border-rose-800', label: 'text-rose-700 dark:text-rose-400', after: 'text-rose-600 dark:text-rose-400', inputBg: 'bg-white dark:bg-slate-800', inputBorder: 'border-rose-200 dark:border-rose-700/50', inputText: 'text-rose-600', ring: 'focus-within:ring-rose-500', track: 'bg-rose-200 dark:bg-rose-900', thumb: 'accent-rose-500' },
                                { bg: 'bg-indigo-50 dark:bg-indigo-900/20', border: 'border-indigo-200 dark:border-indigo-800', label: 'text-indigo-700 dark:text-indigo-400', after: 'text-indigo-600 dark:text-indigo-400', inputBg: 'bg-white dark:bg-slate-800', inputBorder: 'border-indigo-200 dark:border-indigo-700/50', inputText: 'text-indigo-600', ring: 'focus-within:ring-indigo-500', track: 'bg-indigo-200 dark:bg-indigo-900', thumb: 'accent-indigo-500' },
                            ];
                            const t = dThemes[idx % dThemes.length];

                            return (
                                <div key={dept.name} className={`relative group p-3 ${t.bg} border ${t.border} rounded-xl shadow-sm transition-all hover:scale-[1.01]`}>
                                    <div className="flex justify-between items-center mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className={`text-[12px] font-black uppercase tracking-wider ${t.label}`}>{dept.name}</span>
                                            <span className="text-[9px] opacity-70 font-bold uppercase">({dept.employeeCount} NV)</span>
                                            {isManual && (
                                                <div className="flex gap-1 ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => { setEditingDept({ name: dept.name, employees: manualMapping[dept.name] || [] }); setIsModalOpen(true); }} className="p-1 text-slate-400 bg-white shadow-sm border border-slate-100 rounded-md hover:text-sky-600 hover:bg-sky-100 hover:border-sky-300 transition-colors" title="Chỉnh sửa"><PencilIcon className="h-3 w-3" /></button>
                                                    <button onClick={() => { if(confirm(`Xóa bộ phận "${dept.name}"?`)) { const n = {...manualMapping}; delete n[dept.name]; setManualMapping(n); const w = {...departmentWeights}; delete w[dept.name]; setDepartmentWeights(w); } }} className="p-1 text-slate-400 bg-white shadow-sm border border-slate-100 rounded-md hover:text-red-600 hover:bg-red-100 hover:border-red-300 transition-colors" title="Xoá nhóm"><TrashIcon className="h-3 w-3" /></button>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="text-right">
                                                <span className={`text-[12px] font-black ${t.after} tabular-nums`}>{f.format(allocated)}<span className="text-[8px] opacity-60 ml-0.5 uppercase">Tr</span></span>
                                                <span className={`text-[9px] ${t.label} font-bold ml-2 opacity-80`}>~ {f.format(perEmployee)}Tr/ng</span>
                                            </div>
                                            <div className={`flex items-center gap-1 ${t.inputBg} px-2 py-1 rounded-lg border ${t.inputBorder} ${t.ring} focus-within:ring-1 shadow-sm`}>
                                                <input 
                                                    type="number"
                                                    value={Math.round(weight).toString()}
                                                    onFocus={(e) => e.target.select()}
                                                    onChange={(e) => { 
                                                        const val = e.target.value;
                                                        if (val === '') { handleDepartmentSliderChange(dept.name)(0); return; }
                                                        const v = parseInt(val, 10); 
                                                        if (!isNaN(v)) handleDepartmentSliderChange(dept.name)(v); 
                                                    }}
                                                    className={`w-10 bg-transparent text-right text-[12px] font-black ${t.inputText} outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                                                />
                                                <span className="text-[9px] font-bold opacity-60">%</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="px-1 relative">
                                        <input
                                            type="range"
                                            min={0} max={100} step={1}
                                            value={weight}
                                            onChange={(e) => handleDepartmentSliderChange(dept.name)(parseFloat(e.target.value))}
                                            className={`w-full h-1.5 ${t.track} rounded-full appearance-none cursor-pointer ${t.thumb} transition-all`}
                                        />
                                    </div>
                                </div>
                            );
                        }) : <div className="text-center p-6 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-[10px] font-black uppercase tracking-widest">Trống</div>}
                    </div>
                </div>
            </div>
            <CreateDeptModal 
                isOpen={isModalOpen} 
                onClose={() => { setIsModalOpen(false); setEditingDept(null); }} 
                onSave={(name, emps) => { const n = {...manualMapping}; if(editingDept && editingDept.name !== name) delete n[editingDept.name]; n[name] = emps; setManualMapping(n); }}
                allEmployees={allEmployees}
                existingMapping={manualMapping}
                editingDept={editingDept}
            />
        </section>
    );
};
export default TargetHero;
