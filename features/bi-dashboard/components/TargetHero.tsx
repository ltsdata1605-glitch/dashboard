
import React, { useMemo, useState, useEffect } from 'react';
import { useIndexedDBState } from '../hooks/useIndexedDBState';
import { XIcon, PlusIcon, TrashIcon, PencilIcon, ResetIcon } from './Icons';
import { ManualDeptMapping } from '../types/nhanVienTypes';
import { shortenSupermarketName } from '../utils/dashboardHelpers';
import { ConfirmDialog } from '../../../components/shared/ui/ConfirmDialog';
import { parseAllEmployees, parseDepartments, parseBaseTargetQuyDoi, getEmployeesFromAnalysis } from '../services/employeeParser';
import { standardizeEmployeeName } from '../utils/nhanVienHelpers';
import { useDepartments } from '../hooks/useDepartments';
import { Modal } from '../../../components/shared/ui/Modal';
import { Button } from '../../../components/shared/ui/Button';
import { Input } from '../../../components/shared/ui/Input';
import type { AnalysisEmployeesPayload } from '../services/analysisEmployeeSyncService';

type UpdateCategory = 'BC Tổng hợp' | 'Thi Đua Cụm' | 'Thiết lập và cập nhật dữ liệu cho siêu thị';

interface TargetHeroProps {
    supermarketName: string;
    addUpdate: (id: string, message: string, category: UpdateCategory) => void;
    departments: { name: string; employeeCount: number }[];
    summaryLuyKeData: string;
    analysisEmployees?: AnalysisEmployeesPayload | null;
}

interface ManualDeptModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (deptName: string, employees: string[], hiddenEmployees: string[]) => void;
    allEmployees: { originalName: string; name: string }[];
    existingMapping: ManualDeptMapping;
    editingDept?: { name: string; employees: string[] } | null;
}

const CreateDeptModal: React.FC<ManualDeptModalProps> = ({
    isOpen,
    onClose,
    onSave,
    allEmployees,
    existingMapping,
    editingDept
}) => {
    const [name, setName] = useState('');
    const [selectedEmps, setSelectedEmps] = useState<Set<string>>(new Set());
    const [hiddenEmps, setHiddenEmps] = useState<Set<string>>(new Set());
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (isOpen) {
            if (editingDept) {
                setName(editingDept.name);
                setSelectedEmps(new Set(editingDept.employees.map(e => standardizeEmployeeName(e))));
            } else {
                setName('');
                setSelectedEmps(new Set());
            }
            setHiddenEmps(new Set());
            setSearchTerm('');
        }
    }, [isOpen, editingDept]);

    if (!isOpen) return null;

    const assignedInOtherDepts = new Set(
        Object.entries(existingMapping)
            .filter(([deptName]) => deptName !== editingDept?.name)
            .flatMap(([_, emps]) => (Array.isArray(emps) ? emps.flatMap(e => [e, standardizeEmployeeName(e)]) : []))
    );

    const availableEmps = allEmployees.filter(emp => !assignedInOtherDepts.has(emp.originalName) && !assignedInOtherDepts.has(standardizeEmployeeName(emp.originalName)) && !hiddenEmps.has(emp.originalName));
    const filteredEmps = availableEmps.filter(emp => (emp.originalName.toLowerCase().includes(searchTerm.toLowerCase()) || emp.name.toLowerCase().includes(searchTerm.toLowerCase())));

    const removeEmp = (originalName: string) => {
        const nextSelected = new Set(selectedEmps);
        nextSelected.delete(originalName);
        setSelectedEmps(nextSelected);
        const nextHidden = new Set(hiddenEmps);
        nextHidden.add(originalName);
        setHiddenEmps(nextHidden);
    };

    const toggleEmp = (originalName: string) => {
        const next = new Set(selectedEmps);
        if (next.has(originalName)) next.delete(originalName);
        else next.add(originalName);
        setSelectedEmps(next);
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={editingDept ? 'Sửa bộ phận' : 'Tạo Bộ phận mới'}
            footer={
                <div className="flex gap-3 w-full">
                    <Button 
                        variant="danger"
                        size="icon"
                        onClick={() => { setName(''); setSelectedEmps(new Set()); setHiddenEmps(new Set()); }}
                        className="flex-none bg-rose-50 dark:bg-rose-900/30 border-rose-200 dark:border-rose-700 text-rose-600 dark:text-rose-400"
                        title="Khôi phục mặc định"
                    >
                        <ResetIcon className="h-4 w-4" />
                    </Button>
                    <Button 
                        variant="secondary"
                        onClick={onClose} 
                        className="flex-1"
                    >
                        Hủy bỏ
                    </Button>
                    <Button 
                        variant="primary"
                        disabled={
                            editingDept 
                                ? !name.trim() 
                                : (!name.trim() && selectedEmps.size > 0) || (!name.trim() && selectedEmps.size === 0 && hiddenEmps.size === 0)
                        }
                        onClick={() => { onSave(name.trim(), Array.from(selectedEmps), Array.from(hiddenEmps)); onClose(); }}
                        className="flex-[1.5]"
                    >
                        {editingDept && selectedEmps.size === 0 ? 'Xoá bộ phận' : (!name.trim() && hiddenEmps.size > 0 ? 'Lưu cập nhật' : 'Lưu cập nhật')}
                    </Button>
                </div>
            }
        >
            <div className="space-y-5">
                    <div>
                        <label className="block text-[11px] font-black text-sky-700 dark:text-sky-400 uppercase tracking-widest mb-2">Tên nhóm / Bộ phận</label>
                        <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ví dụ: Nhóm Online..." className="font-bold placeholder:font-normal" />
                    </div>

                    {/* Selected employees summary with remove buttons */}
                    {selectedEmps.size > 0 && (
                        <div>
                            <label className="block text-[11px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest mb-2">
                                Đã chọn ({selectedEmps.size})
                            </label>
                            <div className="flex flex-wrap gap-1.5 p-2 border border-emerald-100 dark:border-emerald-800/50 rounded-xl bg-emerald-50/30 dark:bg-emerald-900/10 max-h-[15vh] overflow-y-auto">
                                {Array.from(selectedEmps).map(empName => (
                                    <span key={empName} className="inline-flex items-center gap-1 px-2.5 py-1 bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-700 rounded-lg text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 group/tag hover:border-rose-300 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors">
                                        <span className="truncate max-w-[150px]">{allEmployees.find(e => e.originalName === empName)?.name || empName}</span>
                                        <Button variant="unstyled" size="none" onClick={() => toggleEmp(empName)} className="p-0.5 rounded hover:bg-rose-100 dark:hover:bg-rose-900/30 text-slate-400 hover:text-rose-500 transition-colors" title="Bỏ chọn">
                                            <XIcon className="h-3 w-3" />
                                        </Button>
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    <div>
                        <div className="flex justify-between items-end mb-2">
                            <label className="block text-[11px] font-black text-sky-700 dark:text-sky-400 uppercase tracking-widest">
                                Chọn nhân sự
                            </label>
                            <div className="flex items-center gap-2">
                                {availableEmps.length > 0 && (
                                    <Button
                                        variant="unstyled" size="none"
                                        onClick={() => {
                                            if (selectedEmps.size === availableEmps.length) {
                                                setSelectedEmps(new Set());
                                            } else {
                                                setSelectedEmps(new Set(availableEmps.map(e => e.originalName)));
                                            }
                                        }}
                                        className="p-0 text-[11px] font-bold text-sky-600 hover:text-sky-800 dark:text-sky-400 uppercase tracking-wider transition-colors"
                                    >
                                        {selectedEmps.size === availableEmps.length ? 'Bỏ tất cả' : 'Chọn tất cả'}
                                    </Button>
                                )}
                                <span className="text-[11px] uppercase font-bold text-sky-600/70 bg-sky-50 px-2 py-0.5 rounded border border-sky-100">{selectedEmps.size} đã chọn</span>
                            </div>
                        </div>
                        <Input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Tìm kiếm tên nhân viên..." leftIcon="search" className="mb-3 font-medium" />
                        <div className="space-y-1.5 max-h-[30vh] overflow-y-auto p-1.5 border border-slate-100 dark:border-slate-700/50 rounded-xl bg-slate-50/30 dark:bg-slate-900/30">
                            {filteredEmps.length > 0 ? filteredEmps.map(emp => (
                                <div key={emp.originalName} className={`flex items-center gap-3 p-3 rounded-xl transition-all border ${selectedEmps.has(emp.originalName) ? 'bg-sky-50/80 dark:bg-sky-900/30 border-sky-200 dark:border-sky-700 shadow-sm' : 'border-transparent hover:bg-white dark:hover:bg-slate-800 hover:border-slate-200 dark:hover:border-slate-700 hover:shadow-sm'}`}>
                                    <label className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer">
                                        <input type="checkbox" checked={selectedEmps.has(emp.originalName)} onChange={() => toggleEmp(emp.originalName)} className="rounded-md border-slate-300 text-sky-500 focus:ring-sky-500 h-4.5 w-4.5 cursor-pointer bg-white shrink-0" />
                                        <span className={`text-sm font-medium truncate ${selectedEmps.has(emp.originalName) ? 'text-sky-800 dark:text-sky-300 font-bold' : 'text-slate-600 dark:text-slate-300'}`}>{emp.originalName}</span>
                                    </label>
                                    <Button
                                        variant="unstyled" size="none"
                                        onClick={() => removeEmp(emp.originalName)}
                                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 border border-transparent hover:border-rose-200 dark:hover:border-rose-800 transition-colors shrink-0"
                                        title="Xoá khỏi danh sách"
                                    >
                                        <TrashIcon className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            )) : <div className="flex flex-col items-center justify-center py-8 opacity-60">
                                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-2"><XIcon className="h-5 w-5 text-slate-400" /></div>
                                    <p className="text-center text-[11px] font-black uppercase tracking-widest text-slate-500">Nhân sự đã được phân bổ hết</p>
                                </div>}
                        </div>
                    </div>
            </div>
        </Modal>
    );
};

// Dùng chung cho CompactTargetItem + TargetHero — tránh tạo lại Intl.NumberFormat/object theme mỗi render
const TARGET_HERO_DECIMAL_FORMATTER = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 });
/**
 * Theme thẻ target — chuẩn "Bảng điều khiển ca trực" (2026-09-11).
 * Bản cũ tô NỀN cả thẻ theo màu (sky-50 / emerald-50 / amber-50) + viền màu + thanh trượt màu — màu
 * để NHẬN DIỆN thẻ, không phải trạng thái. Chuẩn: nền trắng, nhận diện bằng vạch 3px mép trái; màu
 * chỉ còn ở con số kết quả ("SAU") và núm thanh trượt để nối mắt với vạch.
 */
const COMPACT_TARGET_ITEM_THEMES: Record<'sky' | 'emerald' | 'amber' | 'slate', { bg: string; border: string; shadow: string; label: string; after: string; inputBg: string; inputBorder: string; inputText: string; ring: string; track: string; thumb: string }> = {
    sky: { bg: 'bg-white dark:bg-slate-900', border: 'border-slate-200 dark:border-slate-700 border-l-[3px] border-l-sky-600', shadow: '', label: 'text-slate-600 dark:text-slate-300', after: 'text-sky-700 dark:text-sky-400', inputBg: 'bg-white dark:bg-slate-800', inputBorder: 'border-slate-200 dark:border-slate-700', inputText: 'text-slate-900 dark:text-slate-100', ring: 'focus-within:ring-sky-500', track: 'bg-slate-200 dark:bg-slate-700', thumb: 'accent-sky-600' },
    emerald: { bg: 'bg-white dark:bg-slate-900', border: 'border-slate-200 dark:border-slate-700 border-l-[3px] border-l-emerald-600', shadow: '', label: 'text-slate-600 dark:text-slate-300', after: 'text-emerald-700 dark:text-emerald-400', inputBg: 'bg-white dark:bg-slate-800', inputBorder: 'border-slate-200 dark:border-slate-700', inputText: 'text-slate-900 dark:text-slate-100', ring: 'focus-within:ring-sky-500', track: 'bg-slate-200 dark:bg-slate-700', thumb: 'accent-emerald-600' },
    amber: { bg: 'bg-white dark:bg-slate-900', border: 'border-slate-200 dark:border-slate-700 border-l-[3px] border-l-amber-600', shadow: '', label: 'text-slate-600 dark:text-slate-300', after: 'text-amber-700 dark:text-amber-400', inputBg: 'bg-white dark:bg-slate-800', inputBorder: 'border-slate-200 dark:border-slate-700', inputText: 'text-slate-900 dark:text-slate-100', ring: 'focus-within:ring-sky-500', track: 'bg-slate-200 dark:bg-slate-700', thumb: 'accent-amber-600' },
    slate: { bg: 'bg-white dark:bg-slate-900', border: 'border-slate-200 dark:border-slate-700 border-l-[3px] border-l-slate-600', shadow: '', label: 'text-slate-600 dark:text-slate-300', after: 'text-slate-800 dark:text-white', inputBg: 'bg-white dark:bg-slate-800', inputBorder: 'border-slate-200 dark:border-slate-700', inputText: 'text-slate-900 dark:text-slate-100', ring: 'focus-within:ring-sky-500', track: 'bg-slate-200 dark:bg-slate-700', thumb: 'accent-slate-600' }
};

// Bảng màu pastel xoay vòng cho từng thẻ phòng ban — hoist ra ngoài để không tạo lại mỗi phần tử
// trong combinedDepts.map() (từng bị tạo mới cho mọi phòng ban, ở mọi lần render).
const DEPARTMENT_PASTEL_THEMES = [
    { bg: 'bg-white dark:bg-slate-900', border: 'border-slate-200 dark:border-slate-700 border-l-[3px] border-l-emerald-600', label: 'text-slate-700 dark:text-slate-200', after: 'text-emerald-700 dark:text-emerald-400', inputBg: 'bg-white dark:bg-slate-800', inputBorder: 'border-slate-200 dark:border-slate-700', inputText: 'text-slate-900 dark:text-slate-100', ring: 'focus-within:ring-sky-500', track: 'bg-slate-200 dark:bg-slate-700', thumb: 'accent-emerald-600' },
    { bg: 'bg-white dark:bg-slate-900', border: 'border-slate-200 dark:border-slate-700 border-l-[3px] border-l-sky-600', label: 'text-slate-700 dark:text-slate-200', after: 'text-sky-700 dark:text-sky-400', inputBg: 'bg-white dark:bg-slate-800', inputBorder: 'border-slate-200 dark:border-slate-700', inputText: 'text-slate-900 dark:text-slate-100', ring: 'focus-within:ring-sky-500', track: 'bg-slate-200 dark:bg-slate-700', thumb: 'accent-sky-600' },
    { bg: 'bg-white dark:bg-slate-900', border: 'border-slate-200 dark:border-slate-700 border-l-[3px] border-l-amber-600', label: 'text-slate-700 dark:text-slate-200', after: 'text-amber-700 dark:text-amber-400', inputBg: 'bg-white dark:bg-slate-800', inputBorder: 'border-slate-200 dark:border-slate-700', inputText: 'text-slate-900 dark:text-slate-100', ring: 'focus-within:ring-sky-500', track: 'bg-slate-200 dark:bg-slate-700', thumb: 'accent-amber-600' },
    { bg: 'bg-white dark:bg-slate-900', border: 'border-slate-200 dark:border-slate-700 border-l-[3px] border-l-rose-600', label: 'text-slate-700 dark:text-slate-200', after: 'text-rose-700 dark:text-rose-400', inputBg: 'bg-white dark:bg-slate-800', inputBorder: 'border-slate-200 dark:border-slate-700', inputText: 'text-slate-900 dark:text-slate-100', ring: 'focus-within:ring-sky-500', track: 'bg-slate-200 dark:bg-slate-700', thumb: 'accent-rose-600' },
    { bg: 'bg-white dark:bg-slate-900', border: 'border-slate-200 dark:border-slate-700 border-l-[3px] border-l-sky-600', label: 'text-slate-700 dark:text-slate-200', after: 'text-sky-700 dark:text-sky-400', inputBg: 'bg-white dark:bg-slate-800', inputBorder: 'border-slate-200 dark:border-slate-700', inputText: 'text-slate-900 dark:text-slate-100', ring: 'focus-within:ring-sky-500', track: 'bg-slate-200 dark:bg-slate-700', thumb: 'accent-sky-600' },
];

const CompactTargetItem: React.FC<{
    label: string;
    baseValue: number;
    adjValue: number;
    unit: string;
    ratio: number;
    onChange: (val: number) => void;
    onReset: () => void;
    colorTheme?: 'sky' | 'emerald' | 'amber' | 'slate';
    perPerson?: number;
}> = ({ label, baseValue, adjValue, unit, ratio, onChange, onReset, colorTheme = 'slate', perPerson }) => {
    const f = TARGET_HERO_DECIMAL_FORMATTER;
    const t = COMPACT_TARGET_ITEM_THEMES[colorTheme] || COMPACT_TARGET_ITEM_THEMES.slate;

    return (
        <div className={`p-2 sm:p-2.5 transition-colors border ${t.bg} ${t.border}`}>
            <div className="mb-2">
                <div className="flex items-center justify-between">
                    <span className={`text-[11px] font-black uppercase tracking-wider ${t.label}`}>{label}</span>
                    <Button variant="ghost" size="icon" onClick={onReset} title="Reset về mặc định" className="text-slate-400 hover:text-rose-500 h-5 w-5 p-0 shrink-0">
                        <ResetIcon className="h-3 w-3" />
                    </Button>
                </div>
                <div className="flex flex-wrap items-center gap-1 sm:gap-2 mt-0.5">
                    <span className="text-[11px] font-black uppercase opacity-70">Gốc:</span>
                    <span className="text-[11px] font-black tabular-nums">{f.format(baseValue)}{unit}</span>
                    <span className="text-[11px] opacity-40">|</span>
                    <span className="text-[11px] font-black uppercase">Sau:</span>
                    <span className={`text-[11px] font-black tabular-nums ${t.after}`}>{f.format(adjValue)}{unit}</span>
                    {perPerson != null && perPerson > 0 && (
                        <>
                            <span className="text-[11px] opacity-40">|</span>
                            <span className="text-[11px] font-black uppercase">{f.format(perPerson)}Tr/ng</span>
                        </>
                    )}
                </div>
            </div>
            <div className="px-1 flex items-center gap-3">
                <input
                    type="range"
                    min={0} max={300} step={1}
                    value={ratio}
                    onChange={(e) => onChange(parseFloat(e.target.value))}
                    className={`flex-1 h-1.5 ${t.track} rounded-full appearance-none cursor-pointer ${t.thumb} transition-all min-w-0`}
                />
                <div className={`flex items-center gap-1 ${t.inputBg} px-1.5 py-0.5 rounded border ${t.inputBorder} ${t.ring} focus-within:ring-1 shrink-0`}>
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
                        className={`w-7 sm:w-8 bg-transparent text-center text-[11px] font-black ${t.inputText} outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                    />
                    <span className="text-[11px] font-bold opacity-60">%</span>
                </div>
            </div>
        </div>
    );
};

const TargetHero: React.FC<TargetHeroProps> = ({ supermarketName, addUpdate, departments, summaryLuyKeData, analysisEmployees }) => {
    const f = TARGET_HERO_DECIMAL_FORMATTER;
    const safeName = shortenSupermarketName(supermarketName);
    const [traGop, setTraGop] = useIndexedDBState<number>(`targethero-${safeName}-tragop`, 45, 300);
    const [quyDoi, setQuyDoi] = useIndexedDBState<number>(`targethero-${safeName}-quydoi`, 40, 300);
    const [totalTarget, setTotalTarget] = useIndexedDBState<number>(`targethero-${safeName}-total`, 100, 300);
    const [departmentWeights, setDepartmentWeights] = useIndexedDBState<Record<string, number>>(`targethero-${safeName}-departmentweights`, {}, 300);
    const [manualMapping, setManualMapping] = useIndexedDBState<ManualDeptMapping>(`manual-dept-mapping-${safeName}`, {});
    const [hiddenEmployees, setHiddenEmployees] = useIndexedDBState<string[]>(`hidden-employees-${safeName}`, []);
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingDept, setEditingDept] = useState<{ name: string; employees: string[] } | null>(null);

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

    const [allEmployeesRaw] = useIndexedDBState<string>(`config-${safeName}-danhsach`, '');
    const allEmployees = useMemo(() => {
        if (analysisEmployees && analysisEmployees.employees.length > 0) {
            const list = getEmployeesFromAnalysis(analysisEmployees.employees, hiddenEmployees);
            if (list.length > 0) return list;
        }
        return parseAllEmployees(allEmployeesRaw, hiddenEmployees);
    }, [analysisEmployees, allEmployeesRaw, hiddenEmployees]);

    const baseTargetQuyDoi = useMemo(() => {
        return parseBaseTargetQuyDoi(summaryLuyKeData, supermarketName);
    }, [summaryLuyKeData, supermarketName]);

    const adjustedTarget = useMemo(() => baseTargetQuyDoi * (totalTarget / 100), [baseTargetQuyDoi, totalTarget]);

    const defaultDepartments = useMemo(() => {
        if (analysisEmployees && analysisEmployees.employees.length > 0 && departments.length > 0) {
            return departments.map(d => ({ ...d, isManual: false }));
        }
        if (!allEmployeesRaw) return departments.map(d => ({ ...d, isManual: false }));
        const parsedDepts = parseDepartments(allEmployeesRaw, hiddenEmployees);
        return parsedDepts.length > 0 ? parsedDepts : departments.map(d => ({ ...d, isManual: false }));
    }, [analysisEmployees, departments, allEmployeesRaw, hiddenEmployees]);

    const {
        combinedDepts,
        effectiveWeights,
        totalAllocatedWeight,
        totalAllocatedEmployees
    } = useDepartments({
        defaultDepartments,
        manualMapping,
        allEmployees,
        departmentWeights
    });

    const handleDepartmentSliderChange = (deptName: string) => (newValue: number) => {
        const newWeights: Record<string, number> = { ...effectiveWeights, [deptName]: Math.max(0, newValue) };
        setDepartmentWeights(newWeights);
    };

    return (
        <section className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="grid grid-cols-2 gap-3 sm:gap-x-12 sm:gap-y-8">
                {/* Cột trái: Điều chỉnh Target chính */}
                <div className="space-y-3">
                    <div className="flex justify-between items-center mb-1 px-1">
                        <div className="flex items-center gap-2">
                            <div className="w-1 h-3 bg-sky-600 rounded-full"></div>
                            <h2 className="text-[11px] font-black text-slate-800 dark:text-white uppercase tracking-wider">Cấu hình Target</h2>
                            {analysisEmployees && analysisEmployees.employees.length > 0 && totalAllocatedEmployees > 0 && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800">
                                    {totalAllocatedEmployees} NV
                                </span>
                            )}
                        </div>
                        <Button variant="unstyled" size="none" onClick={() => {
                            showConfirm({
                                title: 'Khôi phục Target',
                                message: 'Khôi phục hiển thị về mục tiêu mặc định?',
                                variant: 'warning',
                                confirmText: 'Đồng ý',
                                onConfirm: () => {
                                    setTotalTarget(100);
                                    setTraGop(45);
                                    setQuyDoi(40);
                                    closeConfirm();
                                }
                            });
                        }} className="flex items-center p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-xl transition-all active:scale-95" title="Reset">
                            <ResetIcon className="h-4 w-4" />
                        </Button>
                    </div>
                    <CompactTargetItem label="Target DTQĐ" baseValue={baseTargetQuyDoi} adjValue={adjustedTarget} unit="Tr" ratio={totalTarget} onChange={v => { setTotalTarget(v); addUpdate(`targethero-${safeName}-total`, `Điều chỉnh Target DTQĐ - ${supermarketName}`, 'Thiết lập và cập nhật dữ liệu cho siêu thị'); }} onReset={() => setTotalTarget(100)} colorTheme="sky" perPerson={totalAllocatedEmployees > 0 ? adjustedTarget / totalAllocatedEmployees : undefined} />
                    <CompactTargetItem label="Target Trả góp" baseValue={45} adjValue={traGop} unit="%" ratio={traGop} onChange={v => { setTraGop(v); addUpdate(`targethero-${safeName}-tragop`, `Điều chỉnh Target Trả góp - ${supermarketName}`, 'Thiết lập và cập nhật dữ liệu cho siêu thị'); }} onReset={() => setTraGop(45)} colorTheme="emerald" />
                    <CompactTargetItem label="Target Quy đổi" baseValue={40} adjValue={quyDoi} unit="%" ratio={quyDoi} onChange={v => { setQuyDoi(v); addUpdate(`targethero-${safeName}-quydoi`, `Điều chỉnh Target Quy đổi - ${supermarketName}`, 'Thiết lập và cập nhật dữ liệu cho siêu thị'); }} onReset={() => setQuyDoi(40)} colorTheme="amber" />
                </div>

                {/* Cột phải: Phân bổ bộ phận */}
                <div className="space-y-3">
                    <div className="flex justify-between items-center px-1 mb-1">
                        <div className="flex items-center gap-2">
                            <div className="w-1 h-3 bg-emerald-600 rounded-full"></div>
                            <h2 className="text-[11px] font-black text-slate-800 dark:text-white uppercase tracking-wider">Phân bổ bộ phận</h2>
                            {totalAllocatedEmployees > 0 && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
                                    {totalAllocatedEmployees} NV
                                </span>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <Button variant="unstyled" size="none" onClick={() => {
                                showConfirm({
                                    title: 'Khôi phục Cấu hình',
                                    message: 'Đặt tất cả nhân sự và trọng số về mặc định?',
                                    variant: 'danger',
                                    confirmText: 'Đồng ý',
                                    onConfirm: () => {
                                        setDepartmentWeights({});
                                        setManualMapping({});
                                        setHiddenEmployees([]);
                                        closeConfirm();
                                    }
                                });
                            }} className="flex items-center p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-xl transition-all active:scale-95" title="Reset">
                                <ResetIcon className="h-4 w-4" />
                            </Button>
                            <Button variant="unstyled" size="none" onClick={() => { setEditingDept(null); setIsModalOpen(true); }} className="flex items-center p-1.5 text-sky-500 hover:bg-sky-50 dark:hover:bg-sky-900/30 rounded-xl transition-all active:scale-95" title="Tạo mới">
                                <PlusIcon className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm mb-3 relative overflow-hidden">
                        <div className="flex justify-between items-center mb-2 z-10 relative">
                            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Tổng Ngân Sách Phân Bổ</span>
                            <div className="flex items-center gap-2">
                                <span className={`text-[13px] font-black ${totalAllocatedWeight > 100.01 ? 'text-rose-500' : totalAllocatedWeight === 100 ? 'text-emerald-500' : 'text-slate-700 dark:text-white'}`}>
                                    {totalAllocatedWeight.toFixed(1)}<span className="text-[11px]">%</span>
                                </span>
                                {totalAllocatedWeight !== 100 && (
                                    <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-md ${totalAllocatedWeight > 100.01 ? 'bg-rose-50 text-rose-600 border border-rose-200' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                                        {totalAllocatedWeight > 100.01 ? `VƯỢT ${(totalAllocatedWeight - 100).toFixed(1)}%` : `DƯ ${(100 - totalAllocatedWeight).toFixed(1)}%`}
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-700/50 h-2 rounded overflow-hidden flex z-10 relative">
                            {combinedDepts.map((d, idx) => {
                                const w = effectiveWeights[d.name] || 0;
                                if (w <= 0) return null;
                                const colors = ['bg-emerald-500', 'bg-sky-500', 'bg-amber-500', 'bg-sky-500', 'bg-rose-500', 'bg-slate-500'];
                                return <div key={d.name} style={{ width: `${Math.max(w, 100)}%` }} className={`${colors[idx % colors.length]} h-full opacity-90 transition-all`} title={`${d.name}: ${w.toFixed(1)}%`} />
                            })}
                        </div>
                        {totalAllocatedWeight === 100 && <div className="absolute inset-0 bg-emerald-50 dark:bg-emerald-900/10 pointer-events-none mix-blend-multiply opacity-50 z-0"></div>}
                        {totalAllocatedWeight > 100.01 && <div className="absolute inset-0 bg-rose-50 dark:bg-rose-900/10 pointer-events-none mix-blend-multiply opacity-50 z-0"></div>}
                    </div>

                    <div className="space-y-3">
                        {combinedDepts.length > 0 ? combinedDepts.map((dept, idx) => {
                            const weight = effectiveWeights[dept.name] ?? 0;
                            const allocated = adjustedTarget * (weight / 100);
                            const perEmployee = dept.employeeCount > 0 ? allocated / dept.employeeCount : 0;
                            const isManual = dept.isManual;
                            
                            const t = DEPARTMENT_PASTEL_THEMES[idx % DEPARTMENT_PASTEL_THEMES.length];

                            return (
                                <div key={dept.name} className={`relative group p-2 sm:p-2.5 ${t.bg} border ${t.border} transition-colors`}>
                                    <div className="mb-2">
                                        <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                                            <span className={`text-[12px] font-black uppercase tracking-wider ${t.label}`}>{dept.name}</span>
                                            <span className="text-[11px] opacity-70 font-bold uppercase">({dept.employeeCount} NV)</span>
                                            {isManual && (
                                                <div className="flex gap-1 ml-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                                                    <Button variant="unstyled" size="none" onClick={() => { setEditingDept({ name: dept.name, employees: manualMapping[dept.name] || [] }); setIsModalOpen(true); }} className="p-1 text-slate-400 bg-white shadow-sm border border-slate-100 rounded-md hover:text-sky-600 hover:bg-sky-100 hover:border-sky-300 transition-colors" title="Chỉnh sửa"><PencilIcon className="h-3 w-3" /></Button>
                                                    <Button variant="unstyled" size="none" onClick={() => {
                                                        showConfirm({
                                                            title: 'Xóa Bộ phận',
                                                            message: `Xóa bộ phận "${dept.name}"?`,
                                                            variant: 'danger',
                                                            confirmText: 'Xóa',
                                                            onConfirm: () => {
                                                                const n = {...manualMapping};
                                                                delete n[dept.name];
                                                                setManualMapping(n);
                                                                const w = {...departmentWeights};
                                                                delete w[dept.name];
                                                                setDepartmentWeights(w);
                                                                closeConfirm();
                                                            }
                                                        });
                                                    }} className="p-1 text-slate-400 bg-white shadow-sm border border-slate-100 rounded-md hover:text-rose-600 hover:bg-rose-100 hover:border-rose-300 transition-colors" title="Xoá nhóm"><TrashIcon className="h-3 w-3" /></Button>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex flex-wrap items-center gap-1 sm:gap-2 mt-0.5">
                                            <span className={`text-[11px] font-black ${t.after} tabular-nums`}>{f.format(allocated)}<span className="text-[11px] opacity-60 ml-0.5 uppercase">Tr</span></span>
                                            <span className="text-[11px] opacity-50">—</span>
                                            <span className={`text-[11px] font-black ${t.label}`}>{f.format(perEmployee)}Tr/ng</span>
                                        </div>
                                    </div>
                                    <div className="px-1 flex items-center gap-3">
                                        <input
                                            type="range"
                                            min={0} max={100} step={1}
                                            value={weight}
                                            onChange={(e) => handleDepartmentSliderChange(dept.name)(parseFloat(e.target.value))}
                                            className={`flex-1 h-1.5 ${t.track} rounded-full appearance-none cursor-pointer ${t.thumb} transition-all min-w-0`}
                                        />
                                        <div className={`flex items-center gap-1 ${t.inputBg} px-1.5 py-0.5 rounded border ${t.inputBorder} ${t.ring} focus-within:ring-1 shadow-sm shrink-0`}>
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
                                                className={`w-7 sm:w-8 bg-transparent text-center text-[11px] font-black ${t.inputText} outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                                            />
                                            <span className="text-[11px] font-bold opacity-60">%</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        }) : <div className="text-center p-6 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-[11px] font-black uppercase tracking-widest">Trống</div>}
                    </div>
                </div>
            </div>
            <CreateDeptModal 
                isOpen={isModalOpen} 
                onClose={() => { setIsModalOpen(false); setEditingDept(null); }} 
                onSave={(name, emps, hiddenEmps) => {
                    if (hiddenEmps && hiddenEmps.length > 0) {
                        setHiddenEmployees([...hiddenEmployees, ...hiddenEmps]);
                    }
                    if (name.trim()) {
                        const n = {...manualMapping};
                        if (editingDept && editingDept.name !== name) delete n[editingDept.name];
                        if (emps.length === 0) {
                            // Xóa hết NV → xóa luôn bộ phận
                            delete n[name];
                            const w = {...departmentWeights};
                            delete w[name];
                            if (editingDept) delete w[editingDept.name];
                            setDepartmentWeights(w);
                        } else {
                            n[name] = emps;
                        }
                        setManualMapping(n);
                    }
                }}
                allEmployees={allEmployees}
                existingMapping={manualMapping}
                editingDept={editingDept}
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
        </section>
    );
};
export default TargetHero;
