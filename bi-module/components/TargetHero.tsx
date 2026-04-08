
import React, { useMemo, useState, useEffect } from 'react';
import { useIndexedDBState } from '../hooks/useIndexedDBState';
import { ChevronDownIcon, XIcon, PlusIcon, TrashIcon, CheckCircleIcon, CogIcon, PencilIcon } from './Icons';
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh] border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in-95">
                <div className="p-4 border-b dark:border-slate-700 flex justify-between items-center">
                    <h3 className="font-bold text-lg">{editingDept ? 'Sửa bộ phận' : 'Tạo Bộ phận mới'}</h3>
                    <button onClick={onClose}><XIcon className="h-5 w-5 text-slate-400" /></button>
                </div>
                <div className="p-4 space-y-4 overflow-y-auto">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tên bộ phận</label>
                        <input value={name} onChange={e => setName(e.target.value)} placeholder="Ví dụ: Nhóm Online..." className="w-full px-3 py-2 border rounded-lg dark:bg-slate-900 dark:border-slate-600 focus:ring-2 focus:ring-primary-500 outline-none" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1 flex justify-between">
                            <span>Chọn nhân viên ({selectedEmps.size})</span>
                        </label>
                        <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Tìm tên nhân viên..." className="w-full px-3 py-2 border rounded-lg dark:bg-slate-900 dark:border-slate-600 text-sm mb-2" />
                        <div className="space-y-1 max-h-60 overflow-y-auto border rounded-lg p-2 bg-slate-50 dark:bg-slate-900/50">
                            {filteredEmps.length > 0 ? filteredEmps.map(emp => (
                                <label key={emp.originalName} className="flex items-center gap-2 p-2 hover:bg-white dark:hover:bg-slate-800 rounded cursor-pointer transition-colors">
                                    <input type="checkbox" checked={selectedEmps.has(emp.originalName)} onChange={() => toggleEmp(emp.originalName)} className="rounded border-slate-300 text-primary-600 focus:ring-primary-500 h-4 w-4" />
                                    <span className="text-sm">{emp.originalName}</span>
                                </label>
                            )) : <p className="text-center text-xs text-slate-400 py-4 italic">Không còn nhân viên trống</p>}
                        </div>
                    </div>
                </div>
                <div className="p-4 border-t dark:border-slate-700 flex gap-3">
                    <button onClick={onClose} className="flex-1 px-4 py-2 border rounded-lg text-sm font-bold">Hủy</button>
                    <button 
                        disabled={!name.trim() || selectedEmps.size === 0}
                        onClick={() => { onSave(name.trim(), Array.from(selectedEmps)); onClose(); }}
                        className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-bold disabled:opacity-50"
                    >Lưu bộ phận</button>
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
    isPrimary?: boolean;
}> = ({ label, baseValue, adjValue, unit, ratio, onChange, onReset, isPrimary }) => {
    const f = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 });
    
    return (
        <div className={`p-3 rounded-xl transition-all border ${isPrimary ? 'bg-primary-50/20 dark:bg-primary-900/10 border-primary-100 dark:border-primary-800' : 'bg-slate-50/50 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800'}`}>
            <div className="flex justify-between items-center mb-1.5 gap-4">
                <span className={`text-[10px] font-black uppercase tracking-wider ${isPrimary ? 'text-primary-700 dark:text-primary-400' : 'text-slate-500 dark:text-slate-400'}`}>{label}</span>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                         <span className="text-[9px] font-bold text-slate-400 uppercase">Gốc:</span>
                         <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 tabular-nums">{f.format(baseValue)}{unit}</span>
                    </div>
                    <div className="flex items-center gap-1.5 pl-3 border-l border-slate-200 dark:border-slate-700">
                         <span className="text-[9px] font-bold text-primary-400 uppercase">Sau:</span>
                         <span className={`text-[11px] font-black tabular-nums ${isPrimary ? 'text-primary-600 dark:text-primary-400' : 'text-slate-800 dark:text-white'}`}>{f.format(adjValue)}{unit}</span>
                    </div>
                    <div className="flex items-center gap-1 ml-2 bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                        <input 
                            type="number"
                            value={ratio}
                            onChange={(e) => { const v = parseFloat(e.target.value); if (!isNaN(v)) onChange(v); }}
                            className="w-10 bg-transparent text-right text-[11px] font-black text-primary-600 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <span className="text-[9px] font-bold text-slate-400">%</span>
                    </div>
                </div>
            </div>
            <div className="px-1">
                <input
                    type="range"
                    min={0} max={300} step={1}
                    value={ratio}
                    onChange={(e) => onChange(parseFloat(e.target.value))}
                    className="w-full h-1 bg-slate-200 dark:bg-slate-700 rounded-full appearance-none cursor-pointer accent-primary-500"
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
            .filter(l => l.includes(' - ') && !l.startsWith('BP '))
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
        const oldWeights: Record<string, number> = { ...effectiveWeights };
        const oldValue = oldWeights[deptName] || 0;
        const diff = newValue - oldValue;
        const newWeights: Record<string, number> = { ...oldWeights, [deptName]: newValue };
        const otherDepts = combinedDepts.filter(d => d.name !== deptName);
        if (otherDepts.length > 0) {
            const totalOtherWeight = otherDepts.reduce((sum, d) => sum + (oldWeights[d.name] || 0), 0);
            if (totalOtherWeight > 0.1) {
                otherDepts.forEach(d => {
                    const currentWeight = oldWeights[d.name] || 0;
                    newWeights[d.name] = Math.max(0, currentWeight - diff * (currentWeight / totalOtherWeight));
                });
            } else {
                otherDepts.forEach(d => { newWeights[d.name] = Math.max(0, (oldWeights[d.name] || 0) - diff / otherDepts.length); });
            }
        }
        const total = (Object.values(newWeights) as number[]).reduce((a: number, b: number) => a + b, 0);
        if (total > 0) Object.keys(newWeights).forEach(k => { newWeights[k] = (newWeights[k] / total) * 100; });
        setDepartmentWeights(newWeights);
    };

    return (
        <section className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                {/* Cột trái: Điều chỉnh Target chính */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2 mb-1 px-1">
                        <div className="w-1 h-3 bg-primary-600 rounded-full"></div>
                        <h2 className="text-[11px] font-black text-slate-800 dark:text-white uppercase tracking-wider">Cấu hình Target Doanh Thu</h2>
                    </div>
                    <CompactTargetItem label="Mục tiêu tổng (QĐ)" baseValue={baseTargetQuyDoi} adjValue={adjustedTarget} unit="Tr" ratio={totalTarget} onChange={v => setTotalTarget(v)} onReset={() => setTotalTarget(100)} isPrimary={true} />
                    <CompactTargetItem label="Target Trả góp" baseValue={45} adjValue={traGop} unit="%" ratio={traGop} onChange={v => setTraGop(v)} onReset={() => setTraGop(45)} />
                    <CompactTargetItem label="Target Quy đổi" baseValue={40} adjValue={quyDoi} unit="%" ratio={quyDoi} onChange={v => setQuyDoi(v)} onReset={() => setQuyDoi(40)} />
                </div>

                {/* Cột phải: Phân bổ bộ phận */}
                <div className="space-y-3">
                    <div className="flex justify-between items-center px-1 mb-1">
                        <div className="flex items-center gap-2">
                            <div className="w-1 h-3 bg-emerald-600 rounded-full"></div>
                            <h2 className="text-[11px] font-black text-slate-800 dark:text-white uppercase tracking-wider">Phân bổ bộ phận</h2>
                        </div>
                        <button onClick={() => { setEditingDept(null); setIsModalOpen(true); }} className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 dark:bg-slate-700 text-white text-[9px] font-black rounded-lg hover:bg-slate-900 transition-all uppercase tracking-widest active:scale-95 shadow-sm">
                            <PlusIcon className="h-3 w-3" /><span>Tạo mới</span>
                        </button>
                    </div>

                    <div className="space-y-2">
                        {combinedDepts.length > 0 ? combinedDepts.map(dept => {
                            const weight = effectiveWeights[dept.name] ?? 0;
                            const allocated = adjustedTarget * (weight / 100);
                            const perEmployee = dept.employeeCount > 0 ? allocated / dept.employeeCount : 0;
                            const isManual = (dept as any).isManual;
                            
                            return (
                                <div key={dept.name} className="relative group p-3 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-xl shadow-sm hover:border-primary-200 transition-all">
                                    <div className="flex justify-between items-center mb-1.5">
                                        <div className="flex items-center gap-2">
                                            <span className={`text-[11px] font-bold ${isManual ? 'text-primary-600' : 'text-slate-700 dark:text-slate-200'}`}>{dept.name}</span>
                                            {isManual && <span className="text-[7px] bg-primary-50 dark:bg-primary-900/30 text-primary-600 px-1 rounded-full border border-primary-100 font-black">MAN</span>}
                                            <span className="text-[9px] text-slate-400 font-medium">({dept.employeeCount} NV)</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="text-right">
                                                <span className="text-[11px] font-black text-slate-800 dark:text-white tabular-nums">{f.format(allocated)}<span className="text-[8px] opacity-60 ml-0.5 uppercase">Tr</span></span>
                                                <span className="text-[8px] text-slate-400 font-medium ml-2">~ {f.format(perEmployee)}Tr/ng</span>
                                            </div>
                                            <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-900 px-1.5 py-0.5 rounded-lg border border-slate-100 dark:border-slate-700">
                                                <input 
                                                    type="number"
                                                    value={weight.toFixed(1)}
                                                    onChange={(e) => { const v = parseFloat(e.target.value); if (!isNaN(v)) handleDepartmentSliderChange(dept.name)(v); }}
                                                    className="w-10 bg-transparent text-right text-[11px] font-black text-emerald-600 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                />
                                                <span className="text-[9px] font-bold text-slate-400">%</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="px-0.5 relative">
                                        <input
                                            type="range"
                                            min={0} max={100} step={0.1}
                                            value={weight}
                                            onChange={(e) => handleDepartmentSliderChange(dept.name)(parseFloat(e.target.value))}
                                            className="w-full h-1 bg-slate-100 dark:bg-slate-700 rounded-full appearance-none cursor-pointer accent-emerald-500"
                                        />
                                        {isManual && (
                                            <div className="absolute -top-6 right-0 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity bg-white dark:bg-slate-800 pl-2">
                                                <button onClick={() => { setEditingDept({ name: dept.name, employees: manualMapping[dept.name] || [] }); setIsModalOpen(true); }} className="p-1 text-slate-400 hover:text-primary-600"><PencilIcon className="h-3 w-3" /></button>
                                                <button onClick={() => { if(confirm(`Xóa bộ phận "${dept.name}"?`)) { const n = {...manualMapping}; delete n[dept.name]; setManualMapping(n); const w = {...departmentWeights}; delete w[dept.name]; setDepartmentWeights(w); } }} className="p-1 text-slate-400 hover:text-red-500"><TrashIcon className="h-3 w-3" /></button>
                                            </div>
                                        )}
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
