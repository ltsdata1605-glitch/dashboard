import React, { useState, useEffect, useRef } from 'react';
import ModalWrapper from '../../modals/ModalWrapper';
import { Icon } from '../../common/Icon';
import MultiSelectDropdown from '../../common/MultiSelectDropdown';
import type { ColumnConfig } from '../../../types';

interface ColumnModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (config: ColumnConfig) => void;
    allIndustries: string[];
    allSubgroups: string[];
    allManufacturers: string[];
    existingColumns: ColumnConfig[];
    editingColumn?: ColumnConfig | null;
}

const ColumnConfigModal: React.FC<ColumnModalProps> = ({ isOpen, onClose, onSave, allIndustries, allSubgroups, allManufacturers, existingColumns, editingColumn }) => {
    const [mainHeader, setMainHeader] = useState('');
    const [columnName, setColumnName] = useState('');
    const [columnType, setColumnType] = useState<'data' | 'calculated' | 'target'>('data');
    
    // Data column state
    const [metricType, setMetricType] = useState<'quantity' | 'revenue' | 'revenueQD'>('quantity');
    const [selectedIndustries, setSelectedIndustries] = useState<string[]>([]);
    const [selectedSubgroups, setSelectedSubgroups] = useState<string[]>([]);
    const [selectedManufacturers, setSelectedManufacturers] = useState<string[]>([]);
    const [productCodes, setProductCodes] = useState('');
    const [priceType, setPriceType] = useState<'original' | 'discounted'>('discounted');
    const [priceCondition, setPriceCondition] = useState<'greater' | 'less' | 'equal' | 'between' | 'none'>('none');
    const [priceValue1, setPriceValue1] = useState('');
    const [priceValue2, setPriceValue2] = useState('');

    // Calculated column state
    const [operation, setOperation] = useState<'+' | '-' | '/' | '*'>('+');
    const [operand1, setOperand1] = useState('');
    const [operand2, setOperand2] = useState('');
    const [displayAs, setDisplayAs] = useState<'number' | 'percentage'>('number');

    // Target column state
    const [targetValue, setTargetValue] = useState('');

    const [headerColor, setHeaderColor] = useState<string>('');

    const [formattingRules, setFormattingRules] = useState<{ id: number; condition: string; value1: string; value2: string; color: string; }[]>([]);
    
    const [feedback, setFeedback] = useState<{type: 'error' | 'success', message: string} | null>(null);
    const feedbackTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    
    const [showHeadersList, setShowHeadersList] = useState(false);
    const headersRef = useRef<HTMLDivElement>(null);

    const PASTEL_COLORS = [
        { label: 'Ngẫu nhiên (Mặc định)', value: '' },
        { label: 'Đỏ', value: '#fca5a5' },
        { label: 'Cam', value: '#fdba74' },
        { label: 'Vàng', value: '#fde047' },
        { label: 'Lục', value: '#86efac' },
        { label: 'Lục bảo', value: '#6ee7b7' },
        { label: 'Lơ', value: '#93c5fd' },
        { label: 'Chàm', value: '#a5b4fc' },
        { label: 'Tím', value: '#d8b4fe' },
        { label: 'Hồng', value: '#f9a8d4' },
        { label: 'Đỏ đậm', value: '#ef4444' },
        { label: 'Cam đậm', value: '#f97316' },
        { label: 'Lục đậm', value: '#10b981' },
        { label: 'Lơ đậm', value: '#3b82f6' },
        { label: 'Xám', value: '#cbd5e1' }
    ];
    
    const ALERT_COLORS = [
        '#ef4444', '#f97316', '#eab308', '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#64748b'
    ];

    const resetForm = () => {
        setMainHeader('');
        setColumnName('');
        setHeaderColor('');
        setColumnType('data');
        setMetricType('quantity');
        setSelectedIndustries([]);
        setSelectedSubgroups([]);
        setSelectedManufacturers([]);
        setProductCodes('');
        setPriceType('discounted');
        setPriceCondition('none');
        setPriceValue1('');
        setPriceValue2('');
        setOperation('+');
        setOperand1('');
        setOperand2('');
        setDisplayAs('number');
        setTargetValue('');
        setFormattingRules([]);
    };
    
    useEffect(() => {
        if (isOpen) {
            if (editingColumn) {
                setMainHeader(editingColumn.mainHeader || '');
                setColumnName(editingColumn.columnName);
                setHeaderColor(editingColumn.headerColor || '');
                setColumnType(editingColumn.type);
                 if (editingColumn.conditionalFormatting) {
                    setFormattingRules(editingColumn.conditionalFormatting.map((rule, index) => ({
                        id: index,
                        condition: rule.condition,
                        value1: String(rule.value1),
                        value2: String(rule.value2 || ''),
                        color: rule.color
                    })));
                } else {
                    setFormattingRules([]);
                }
                if (editingColumn.type === 'data') {
                    setMetricType(editingColumn.metricType || 'quantity');
                    setSelectedIndustries(editingColumn.filters?.selectedIndustries || []);
                    setSelectedSubgroups(editingColumn.filters?.selectedSubgroups || []);
                    setSelectedManufacturers(editingColumn.filters?.selectedManufacturers || []);
                    setProductCodes(editingColumn.filters?.productCodes?.join(', ') || '');
                    setPriceType(editingColumn.filters?.priceType || 'discounted');
                    setPriceCondition(editingColumn.filters?.priceCondition || 'none');
                    setPriceValue1(editingColumn.filters?.priceValue1?.toString() || '');
                    setPriceValue2(editingColumn.filters?.priceValue2?.toString() || '');
                } else if (editingColumn.type === 'target') {
                    setMetricType(editingColumn.metricType || 'revenue');
                    setTargetValue(editingColumn.targetValue?.toString() || '');
                } else {
                    setOperation(editingColumn.operation || '+');
                    setOperand1(editingColumn.operand1_columnId || '');
                    setOperand2(editingColumn.operand2_columnId || '');
                    setDisplayAs(editingColumn.displayAs || 'number');
                }
            } else {
                resetForm();
            }
            setFeedback(null);
        }
    }, [isOpen, editingColumn]);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (headersRef.current && !headersRef.current.contains(e.target as Node)) {
                setShowHeadersList(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const existingMainHeaders = Array.from(new Set(existingColumns.map(c => c.mainHeader).filter(Boolean))).sort();

    const showFeedback = (type: 'error' | 'success', message: string) => {
        setFeedback({ type, message });
        if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
        feedbackTimer.current = setTimeout(() => setFeedback(null), 3500);
    };

    const addFormattingRule = () => {
        setFormattingRules(prev => [...prev, { id: Date.now(), condition: '>', value1: '', value2: '', color: '#ef4444' }]);
    };

    const updateFormattingRule = (id: number, field: string, value: string) => {
        setFormattingRules(prev => prev.map(rule => rule.id === id ? { ...rule, [field]: value } : rule));
    };

    const removeFormattingRule = (id: number) => {
        setFormattingRules(prev => prev.filter(rule => rule.id !== id));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        let finalHeaderColor = headerColor;
        if (!finalHeaderColor && !editingColumn) {
            const validColors = PASTEL_COLORS.filter(c => c.value !== '');
            const randomColor = validColors[Math.floor(Math.random() * validColors.length)];
            finalHeaderColor = randomColor.value;
        }

        if (!columnName.trim()) {
            showFeedback('error', 'Vui lòng nhập Tiêu đề phụ.');
            return;
        }
        
        const finalRules = formattingRules
            .filter(rule => rule.condition.includes('avg') || rule.value1.trim() !== '')
            .map(rule => ({
                condition: rule.condition as any,
                value1: parseFloat(rule.value1),
                value2: rule.condition === 'between' && rule.value2.trim() !== '' ? parseFloat(rule.value2) : undefined,
                color: rule.color,
            }));

        let newColumn: ColumnConfig;
        if (columnType === 'data') {
            newColumn = {
                id: editingColumn?.id || `col-${Date.now()}`,
                mainHeader: mainHeader.trim().toUpperCase(),
                columnName: columnName.trim().toUpperCase(),
                headerColor: finalHeaderColor || undefined,
                type: 'data',
                metricType,
                filters: {
                    selectedIndustries,
                    selectedSubgroups,
                    selectedManufacturers,
                    productCodes: productCodes.split(/[,;\n]+/).map(code => code.trim()).filter(Boolean),
                    priceType,
                    priceCondition: priceCondition === 'none' ? undefined : priceCondition,
                    priceValue1: priceValue1 ? parseFloat(priceValue1) : undefined,
                    priceValue2: priceCondition === 'between' && priceValue2 ? parseFloat(priceValue2) : undefined,
                },
                conditionalFormatting: finalRules.length > 0 ? finalRules : undefined,
            };
        } else if (columnType === 'target') {
            const parsedTarget = parseFloat(targetValue.replace(/[^\d.-]/g, ''));
            if (isNaN(parsedTarget)) {
                showFeedback('error', 'Vui lòng nhập giá trị chỉ tiêu hợp lệ.');
                return;
            }
            newColumn = {
                id: editingColumn?.id || `col-${Date.now()}`,
                mainHeader: mainHeader.trim().toUpperCase(),
                columnName: columnName.trim().toUpperCase(),
                headerColor: finalHeaderColor || undefined,
                type: 'target',
                metricType,
                targetValue: parsedTarget,
                conditionalFormatting: finalRules.length > 0 ? finalRules : undefined,
            };
        } else { // calculated
            if (!operand1 || !operand2) {
                showFeedback('error', 'Vui lòng chọn đủ 2 cột để thực hiện phép tính.');
                return;
            }
            newColumn = {
                id: editingColumn?.id || `col-${Date.now()}`,
                mainHeader: mainHeader.trim().toUpperCase(),
                columnName: columnName.trim().toUpperCase(),
                headerColor: finalHeaderColor || undefined,
                type: 'calculated',
                operation,
                operand1_columnId: operand1,
                operand2_columnId: operand2,
                displayAs,
                conditionalFormatting: finalRules.length > 0 ? finalRules : undefined,
            };
        }
        
        onSave(newColumn);

        if (editingColumn) {
            // Parent will close modal automatically
        } else {
            resetForm();
            showFeedback('success', `Đã lưu cột "${newColumn.columnName}". Bạn có thể thêm cột tiếp theo.`);
        }
    };
    
    const availableOperands = existingColumns.filter(c => c.id !== editingColumn?.id);

    return (
        <ModalWrapper 
            isOpen={isOpen}
            onClose={onClose}
            title={editingColumn ? "Chỉnh Sửa Cột" : "Tạo Cột Mới"}
            subTitle="Cấu hình số liệu hiển thị trong bảng"
            titleColorClass="text-indigo-600 dark:text-indigo-400"
            maxWidthClass="max-w-4xl"
        >
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
                <div className="flex-grow p-5 sm:p-6 space-y-6 sm:space-y-8 bg-slate-50 dark:bg-slate-900/50 overflow-y-auto custom-scrollbar min-h-0">
                    {feedback && (
                        <div className={`p-3 border rounded-xl text-sm font-semibold flex items-center gap-2 shadow-sm ${
                            feedback.type === 'error' 
                            ? 'bg-rose-50 dark:bg-rose-900/30 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300'
                            : 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                        }`}>
                           <Icon name={feedback.type === 'error' ? 'alert-triangle' : 'check-circle'} size={4} />
                           {feedback.message}
                        </div>
                    )}
                    
                    {/* SECTION 1: Cấu trúc Cột */}
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
                        <h4 className="flex items-center gap-2 font-bold mb-4 text-slate-800 dark:text-slate-100">
                            <Icon name="layout" size={4} className="text-indigo-500" /> Cấu trúc cột
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div ref={headersRef} className="relative z-50">
                                <label htmlFor="mainHeader" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex justify-between">
                                    Tiêu đề nhóm (Cha)
                                    {existingMainHeaders.length > 0 && <span className="text-xs font-normal text-slate-400">Chọn từ danh sách có sẵn</span>}
                                </label>
                                <div className="relative">
                                    <Icon name="layers" size={4} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input 
                                        id="mainHeader" 
                                        type="text" 
                                        value={mainHeader} 
                                        onChange={e => { setMainHeader(e.target.value.toUpperCase()); setShowHeadersList(true); }}
                                        onFocus={() => setShowHeadersList(true)}
                                        placeholder="Tạo nhóm mới hoặc chọn..." 
                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg pl-10 pr-10 py-2.5 text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition outline-none shadow-sm dark:focus:ring-indigo-400" 
                                        autoComplete="off"
                                    />
                                    <button 
                                        type="button" 
                                        onClick={() => setShowHeadersList(!showHeadersList)} 
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors p-1.5 rounded-md"
                                    >
                                        <Icon name="chevron-down" size={4} />
                                    </button>
                                </div>
                                {showHeadersList && (
                                    <div className="absolute top-full left-0 right-0 mt-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl max-h-56 overflow-y-auto py-1.5 z-20 overflow-hidden ring-1 ring-black/5 dark:ring-white/10 animate-in fade-in slide-in-from-top-1">
                                        {existingMainHeaders.filter(h => h.includes(mainHeader)).length === 0 && mainHeader && (
                                            <div className="px-4 py-2.5 text-xs text-slate-500 dark:text-slate-400 italic bg-slate-50 dark:bg-slate-900/50">Tạo nhóm chỉ số mới: <span className="font-bold text-indigo-600 dark:text-indigo-400">{mainHeader}</span></div>
                                        )}
                                        {existingMainHeaders.filter(h => h.includes(mainHeader)).map(h => (
                                            <div 
                                                key={h} 
                                                className="px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 cursor-pointer font-bold transition-colors flex items-center justify-between"
                                                onClick={() => { setMainHeader(h); setShowHeadersList(false); }}
                                            >
                                                {h}
                                                {mainHeader === h && <Icon name="check" size={4} className="text-indigo-600" />}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div>
                                <label htmlFor="columnName" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Tiêu đề cột (Bắt buộc) *</label>
                                <div className="relative">
                                    <Icon name="type" size={4} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input 
                                        id="columnName" 
                                        type="text" 
                                        value={columnName} 
                                        onChange={e => setColumnName(e.target.value.toUpperCase())} 
                                        placeholder="VD: SL SIM, DT APPLE..." 
                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg pl-10 pr-3 py-2.5 text-sm font-bold text-indigo-700 dark:text-indigo-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition outline-none shadow-sm" 
                                        required 
                                    />
                                </div>
                            </div>
                            
                            <div className="md:col-span-2 mt-1">
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 flex justify-between">
                                    Phân loại cột
                                    <span className="font-normal text-xs text-slate-500">Quyết định cách tính toán dữ liệu</span>
                                </label>
                                <div className="flex bg-slate-100 dark:bg-slate-900 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-inner">
                                    <button type="button" onClick={() => setColumnType('data')} className={`flex-1 flex flex-col items-center justify-center py-2 px-2 text-sm rounded-lg transition-all ${columnType === 'data' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow ring-1 ring-black/5 font-bold' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 font-medium'}`}>
                                        <Icon name="database" size={4} className="mb-1 opacity-80" /> Truy vấn Data
                                    </button>
                                    <button type="button" onClick={() => setColumnType('calculated')} className={`flex-1 flex flex-col items-center justify-center py-2 px-2 text-sm rounded-lg transition-all ${columnType === 'calculated' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow ring-1 ring-black/5 font-bold' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 font-medium'}`}>
                                        <Icon name="calculator" size={4} className="mb-1 opacity-80" /> Cột Tính Toán
                                    </button>
                                    <button type="button" onClick={() => setColumnType('target')} className={`flex-1 flex flex-col items-center justify-center py-2 px-2 text-sm rounded-lg transition-all ${columnType === 'target' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow ring-1 ring-black/5 font-bold' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 font-medium'}`}>
                                        <Icon name="target" size={4} className="mb-1 opacity-80" /> Thiết lập Target
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Tùy chỉnh màu */}
                        <div className="mt-5 border-t border-slate-100 dark:border-slate-700 pt-5">
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                                <Icon name="palette" size={4} className="text-slate-400" />
                                Tùy chỉnh màu nền cho nhóm (Mặc định ngẫu nhiên)
                            </label>
                            <div className="flex flex-wrap gap-2.5">
                                {PASTEL_COLORS.map(c => (
                                    <button
                                        key={c.label}
                                        type="button"
                                        onClick={() => setHeaderColor(c.value)}
                                        title={c.label}
                                        className={`w-8 h-8 rounded-full transition-all hover:scale-110 flex items-center justify-center shadow-sm ${headerColor === c.value ? 'ring-2 ring-offset-2 ring-indigo-500 scale-110 shadow-md' : 'border border-slate-200 dark:border-slate-600'} ${!c.value ? 'bg-slate-100 dark:bg-slate-800' : ''}`}
                                        style={c.value ? { backgroundColor: c.value } : {}}
                                    >
                                        {!c.value && <Icon name="shuffle" size={4} className="text-slate-500 dark:text-slate-400" />}
                                        {headerColor === c.value && c.value && <Icon name="check" size={4} className="text-slate-800 opacity-70" />}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* SECTION 2: Cấu trúc chi tiết */}
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                        {columnType === 'data' && (
                            <>
                            <div className="bg-indigo-50/50 dark:bg-indigo-900/20 px-5 py-3 border-b border-slate-200 dark:border-slate-700">
                                <h4 className="flex items-center gap-2 font-bold text-indigo-700 dark:text-indigo-300">
                                    <Icon name="filter" size={4} /> Chỉ định nguồn dữ liệu
                                </h4>
                            </div>
                            <div className="p-5 space-y-5">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Đơn vị đo lường</label>
                                    <div className="inline-flex rounded-lg p-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 w-full sm:w-auto">
                                        <button type="button" onClick={() => setMetricType('quantity')} className={`flex-1 sm:flex-none py-1.5 px-6 text-sm font-bold rounded-md transition-all ${metricType === 'quantity' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'}`}>Số lượng</button>
                                        <button type="button" onClick={() => setMetricType('revenue')} className={`flex-1 sm:flex-none py-1.5 px-6 text-sm font-bold rounded-md transition-all ${metricType === 'revenue' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'}`}>Doanh thu</button>
                                        <button type="button" onClick={() => setMetricType('revenueQD')} className={`flex-1 sm:flex-none py-1.5 px-6 text-sm font-bold rounded-md transition-all ${metricType === 'revenueQD' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'}`}>Doanh thu QĐ</button>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                     <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Ngành hàng</label>
                                        <MultiSelectDropdown options={allIndustries} selected={selectedIndustries} onChange={setSelectedIndustries} label="Ngành hàng" variant="compact"/>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nhóm hàng</label>
                                        <MultiSelectDropdown options={allSubgroups} selected={selectedSubgroups} onChange={setSelectedSubgroups} label="Nhóm hàng" variant="compact"/>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Thương hiệu</label>
                                        <MultiSelectDropdown options={allManufacturers} selected={selectedManufacturers} onChange={setSelectedManufacturers} label="Thương hiệu" variant="compact" />
                                    </div>
                                </div>
                                <div>
                                    <label htmlFor="productCodes" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 text-slate-500">Hoặc truy vấn nhanh mã SP (Mỗi mã cách nhau dấu phẩy)</label>
                                    <textarea id="productCodes" value={productCodes} onChange={(e) => setProductCodes(e.target.value)} rows={2} placeholder="Ví dụ: 2515024, 050012..." className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition outline-none font-mono"></textarea>
                                </div>
                                 <div className="border-t border-slate-100 dark:border-slate-700 pt-4 mt-2">
                                    <h5 className="font-semibold text-sm text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-1.5">
                                        <Icon name="tag" size={3.5} /> Lọc theo cấu hình giá trị bán
                                    </h5>
                                    <div className="flex flex-wrap items-center gap-3">
                                        <div className="w-full sm:w-[160px]">
                                            <select value={priceType} onChange={e => setPriceType(e.target.value as any)} className="w-full h-10 block rounded-lg border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 font-medium text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500">
                                                <option value="discounted">Giá bán (Khuyến mãi)</option>
                                                <option value="original">Giá niêm yết (Gốc)</option>
                                            </select>
                                        </div>
                                        <div className="w-full sm:w-[130px]">
                                            <select value={priceCondition} onChange={e => setPriceCondition(e.target.value as any)} className="w-full h-10 block rounded-lg border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 font-medium text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500">
                                                <option value="none" className="text-slate-500">Bỏ qua giá</option>
                                                <option value="greater">Lớn hơn - &gt;</option>
                                                <option value="less">Nhỏ hơn - &lt;</option>
                                                <option value="equal">Bằng đúng - =</option>
                                                <option value="between">Trong khoảng</option>
                                            </select>
                                        </div>
                                        {priceCondition !== 'none' && (
                                            <div className="flex-grow flex items-center gap-2">
                                                <div className="relative flex-grow">
                                                    <input type="number" value={priceValue1} onChange={e => setPriceValue1(e.target.value)} placeholder="0 đ" className="w-full h-10 block rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 pl-3 pr-3 text-sm focus:ring-2 focus:ring-indigo-500" />
                                                </div>
                                                {priceCondition === 'between' && (
                                                    <div className="flex items-center gap-2 flex-grow">
                                                        <span className="text-slate-400 text-sm font-medium">~</span>
                                                        <input type="number" value={priceValue2} onChange={e => setPriceValue2(e.target.value)} placeholder="0 đ" className="w-full h-10 block rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 pl-3 pr-3 text-sm focus:ring-2 focus:ring-indigo-500" />
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            </>
                        )}
                        
                        {columnType === 'target' && (
                            <>
                            <div className="bg-teal-50/80 dark:bg-teal-900/20 px-5 py-3 border-b border-teal-100 dark:border-teal-900">
                                <h4 className="flex items-center gap-2 font-bold text-teal-700 dark:text-teal-300">
                                    <Icon name="target" size={4} /> Chỉ tiêu kho (Target)
                                </h4>
                            </div>
                            <div className="p-5 space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Đinh dạng chỉ tiêu</label>
                                        <div className="inline-flex rounded-lg shadow-sm p-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 w-full">
                                            <button type="button" onClick={() => setMetricType('revenue')} className={`flex-1 py-2 px-4 text-sm font-bold rounded-md transition-all ${metricType === 'revenue' ? 'bg-white dark:bg-slate-700 text-teal-600 dark:text-teal-400 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'}`}>Tiền Tệ ($)</button>
                                            <button type="button" onClick={() => setMetricType('quantity')} className={`flex-1 py-2 px-4 text-sm font-bold rounded-md transition-all ${metricType === 'quantity' ? 'bg-white dark:bg-slate-700 text-teal-600 dark:text-teal-400 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'}`}>Số Lượng (#)</button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Tổng Mục Tiêu *</label>
                                        <div className="relative">
                                            <input 
                                                type="text" 
                                                value={targetValue} 
                                                onChange={(e) => {
                                                    const raw = e.target.value.replace(/[^\d]/g, '');
                                                    setTargetValue(raw ? Number(raw).toLocaleString('en-US') : '');
                                                }}
                                                placeholder="VD: 1,500,000,000" 
                                                className="w-full bg-white dark:bg-slate-900 border-2 border-teal-200 dark:border-teal-800 rounded-lg p-3 pl-10 text-base font-black text-teal-700 dark:text-teal-300 focus:ring-4 focus:ring-teal-500/20 focus:border-teal-500 transition outline-none"
                                            />
                                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-teal-500">
                                                <Icon name={metricType === 'revenue' ? "dollar-sign" : "hash"} size={5} />
                                            </div>
                                        </div>
                                        <p className="mt-2.5 text-xs text-slate-500 dark:text-slate-400 flex items-start gap-1.5 font-medium">
                                            <Icon name="info" size={3.5} className="mt-0.5 text-teal-500" />
                                            <span>Hệ thống phân bổ tổng điểm này theo nguyên tắc trung bình công cho số lượng nhân viên thực tế làm việc.</span>
                                        </p>
                                    </div>
                                </div>
                            </div>
                            </>
                        )}

                        {columnType === 'calculated' && (
                            <>
                            <div className="bg-amber-50/50 dark:bg-amber-900/20 px-5 py-3 border-b border-amber-100 dark:border-amber-900">
                                <h4 className="flex items-center gap-2 font-bold text-amber-700 dark:text-amber-300">
                                    <Icon name="sigma" size={4} /> Thuật toán ghép cột
                                </h4>
                            </div>
                            <div className="p-5">
                                <div className="flex flex-col md:flex-row items-center gap-3 w-full">
                                    <div className="flex-1 w-full relative">
                                        <label className="block text-[11px] uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400 mb-1.5">Nguồn dữ liệu 1</label>
                                        <select value={operand1} onChange={e => setOperand1(e.target.value)} className="w-full h-12 block rounded-xl border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 font-semibold focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm pl-4 truncate pr-8 cursor-pointer">
                                            <option value="">-- Chọn Cột --</option>
                                            {availableOperands.map(c => <option key={c.id} value={c.id}>{c.mainHeader ? `[${c.mainHeader}] ${c.columnName}` : c.columnName}</option>)}
                                        </select>
                                    </div>
                                    <div className="flex-shrink-0 relative w-16 h-12 mt-5 hidden md:flex items-center justify-center">
                                        <select value={operation} onChange={e => setOperation(e.target.value as any)} className="absolute inset-0 z-10 opacity-0 cursor-pointer w-full h-full">
                                            <option value="+">+</option>
                                            <option value="-">-</option>
                                            <option value="*">*</option>
                                            <option value="/">/</option>
                                        </select>
                                        <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-bold text-lg pointer-events-none group hover:bg-indigo-200 transition-colors">
                                            {operation === '*' ? '×' : operation === '/' ? '÷' : operation}
                                        </div>
                                    </div>
                                    <div className="flex-1 w-full relative">
                                        <label className="block text-[11px] uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400 mb-1.5 md:opacity-0 hidden md:block">Nguồn dữ liệu 2</label>
                                        <select value={operand2} onChange={e => setOperand2(e.target.value)} className="w-full h-12 block rounded-xl border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 font-semibold focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm pl-4 truncate pr-8 cursor-pointer">
                                            <option value="">-- Chọn Cột --</option>
                                             {availableOperands.map(c => <option key={c.id} value={c.id}>{c.mainHeader ? `[${c.mainHeader}] ${c.columnName}` : c.columnName}</option>)}
                                        </select>
                                    </div>
                                </div>
                                {operation === '/' && (
                                     <div className="mt-5 max-w-[200px] ml-auto">
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Kết quả hiển thị dưới dạng</label>
                                        <div className="inline-flex rounded-lg p-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 w-full">
                                            <button type="button" onClick={() => setDisplayAs('number')} className={`flex-1 py-1 px-3 text-sm font-semibold rounded-md transition-all ${displayAs === 'number' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500'}`}>Tỉ lệ</button>
                                            <button type="button" onClick={() => setDisplayAs('percentage')} className={`flex-1 py-1 px-3 text-sm font-semibold rounded-md transition-all ${displayAs === 'percentage' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500'}`}>% Phần trăm</button>
                                        </div>
                                    </div>
                                )}
                            </div>
                            </>
                        )}
                    </div>
                    
                    {/* SECTION 3: Formatting Rules */}
                    <div>
                        <div className="flex justify-between items-center mb-3">
                             <h4 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                                <Icon name="paintbrush" size={4} className="text-pink-500 dark:text-pink-400" />
                                Định dạng hiển thị cảnh báo
                            </h4>
                             <button type="button" onClick={addFormattingRule} className="px-3 py-1.5 rounded-lg text-sm font-bold bg-slate-200/50 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 transition-colors flex items-center gap-1">
                                <Icon name="plus" size={4}/>Thêm luật
                            </button>
                        </div>
                        {formattingRules.length === 0 ? (
                            <div className="border border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-4 text-center">
                                <span className="text-slate-400 dark:text-slate-500 text-sm font-medium">Bạn có thể tạo luật đổ màu ô tự động dựa trên số liệu thực tế</span>
                            </div>
                        ) : (
                            <div className="space-y-2.5">
                                {formattingRules.map((rule) => {
                                    const valueInputsNeeded = !['>avg', '<avg'].includes(rule.condition);
                                    return (
                                    <div key={rule.id} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm">
                                        <div className="sm:col-span-3">
                                            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Luật kiểm tra</label>
                                            <select value={rule.condition} onChange={e => updateFormattingRule(rule.id, 'condition', e.target.value)} className="w-full h-10 mt-1 block rounded-lg border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 font-semibold focus:ring-2 focus:ring-indigo-500 text-sm">
                                                <option value=">">&gt; Lớn hơn</option>
                                                <option value="<">&lt; Nhỏ hơn</option>
                                                <option value="=">= Bằng</option>
                                                <option value="between">Trong khoảng</option>
                                                <option value=">avg">Cao hơn T.Bình</option>
                                                <option value="<avg">Thấp hơn T.Bình</option>
                                            </select>
                                        </div>
                                        {valueInputsNeeded ? (
                                            <>
                                                <div className={`sm:col-span-3 ${rule.condition === 'between' ? '' : 'sm:col-span-5'}`}>
                                                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase text-transparent select-none">-</label>
                                                    <input type="number" value={rule.value1} onChange={e => updateFormattingRule(rule.id, 'value1', e.target.value)} placeholder="Nhập số" className="w-full h-10 mt-1 block rounded-lg border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 font-bold focus:ring-2 focus:ring-indigo-500 text-sm"/>
                                                </div>
                                                {rule.condition === 'between' && (
                                                     <div className="sm:col-span-3">
                                                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">&amp; dưới</label>
                                                        <input type="number" value={rule.value2} onChange={e => updateFormattingRule(rule.id, 'value2', e.target.value)} placeholder="Nhập số..." className="w-full h-10 mt-1 block rounded-lg border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 font-bold focus:ring-2 focus:ring-indigo-500 text-sm"/>
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            <div className="sm:col-span-5 flex items-center h-10">
                                                <div className="text-xs font-semibold text-slate-400 bg-slate-100 dark:bg-slate-900/50 px-3 py-1.5 rounded w-full text-center border-dashed border-slate-200 border">Tự động so sánh với trung bình cột</div>
                                            </div>
                                        )}
                                        <div className="sm:col-span-4 flex items-end gap-2">
                                            <div className="flex-grow">
                                                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase text-right block w-full">Thì đổi màu</label>
                                                <div className="flex items-center gap-1.5 mt-1 bg-slate-50 dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-600 shadow-sm h-10 overflow-hidden px-2 justify-end w-full">
                                                    {ALERT_COLORS.map(c => (
                                                        <button
                                                            key={c}
                                                            type="button"
                                                            onClick={() => updateFormattingRule(rule.id, 'color', c)}
                                                            className={`w-4 h-4 rounded-full transition-all flex-shrink-0 ${rule.color === c ? 'ring-2 ring-offset-2 ring-indigo-500 scale-125' : 'hover:scale-110 opacity-70 hover:opacity-100'}`}
                                                            style={{ backgroundColor: c }}
                                                        />
                                                    ))}
                                                    <div className="w-px h-4 bg-slate-300 dark:bg-slate-600 mx-1"></div>
                                                    <input type="color" value={rule.color} onChange={e => updateFormattingRule(rule.id, 'color', e.target.value)} className="w-5 h-5 p-0 border-0 rounded cursor-pointer shrink-0 appearance-none bg-transparent"/>
                                                </div>
                                            </div>
                                            <button type="button" onClick={() => removeFormattingRule(rule.id)} className="w-10 h-10 flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors border border-transparent hover:border-red-200 dark:hover:border-red-900/50 flex-shrink-0"><Icon name="trash-2" size={4}/></button>
                                        </div>
                                    </div>
                                )})}
                            </div>
                        )}
                    </div>

                </div>
                
                {/* FOOTER */}
                <div className="p-4 sm:px-6 sm:py-5 flex items-center justify-between bg-white dark:bg-slate-800 rounded-b-xl border-t border-slate-200 dark:border-slate-700 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-20">
                    <button type="button" onClick={onClose} className="py-2.5 px-5 rounded-xl text-sm font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors focus:ring-2 focus:ring-slate-300 focus:outline-none"> Hủy Bỏ </button>
                    <button type="submit" className="py-2.5 px-8 rounded-xl shadow-md text-sm font-black text-white bg-indigo-600 hover:bg-indigo-700 transition-all hover:-translate-y-0.5 active:translate-y-0 focus:ring-4 focus:ring-indigo-500/30 w-full sm:w-auto flex items-center gap-2 justify-center">
                        <Icon name="save" size={4} /> {editingColumn ? "Chấp Nhận Lưu Chỉnh Sửa" : "Lưu & Bắt Đầu Cột Mới"}
                    </button>
                </div>
            </form>
        </ModalWrapper>
    );
};

export default ColumnConfigModal;
