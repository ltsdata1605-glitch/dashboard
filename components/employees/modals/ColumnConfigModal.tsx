import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import ModalWrapper from '../../modals/ModalWrapper';
import { Icon } from '../../common/Icon';
import type { ColumnConfig } from '../../../types';
import { DataColumnForm } from './column-config/DataColumnForm';
import { CalculatedColumnForm } from './column-config/CalculatedColumnForm';
import { TargetColumnForm } from './column-config/TargetColumnForm';
import { FormattingRulesForm } from './column-config/FormattingRulesForm';
import { DATA_STATUS_COLORS } from '../../../constants';

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
    const [decimalPlaces, setDecimalPlaces] = useState<0 | 1 | 2>(0);

    // Target column state
    const [targetValue, setTargetValue] = useState('');

    const [headerColor, setHeaderColor] = useState<string>('');

    const [formattingRules, setFormattingRules] = useState<{ id: number; condition: string; value1: string; value2: string; color: string; textColor: string; }[]>([]);
    

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
        setDecimalPlaces(0);
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
                        color: rule.color,
                        textColor: (rule as any).textColor || '#000000'
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
                    setDecimalPlaces(editingColumn.decimalPlaces ?? 0);
                }
            } else {
                resetForm();
            }
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

    const getDefaultColorsForCondition = (condition: string) => {
        if (condition === '<' || condition === '<avg') {
            return { color: DATA_STATUS_COLORS.negative.bg, textColor: DATA_STATUS_COLORS.negative.text };
        }
        return { color: DATA_STATUS_COLORS.positive.bg, textColor: DATA_STATUS_COLORS.positive.text };
    };

    const addFormattingRule = () => {
        const defaults = getDefaultColorsForCondition('<avg');
        setFormattingRules(prev => [...prev, { id: Date.now(), condition: '<avg', value1: '', value2: '', ...defaults }]);
    };

    const updateFormattingRule = (id: number, field: string, value: string) => {
        setFormattingRules(prev => prev.map(rule => {
            if (rule.id !== id) return rule;
            const updated = { ...rule, [field]: value };
            if (field === 'condition') {
                const defaults = getDefaultColorsForCondition(value);
                updated.color = defaults.color;
                updated.textColor = defaults.textColor;
            }
            return updated;
        }));
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
            toast.error('Vui lòng nhập Tiêu đề phụ.');
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
                mainHeader: mainHeader.trim(),
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
                toast.error('Vui lòng nhập giá trị chỉ tiêu hợp lệ.');
                return;
            }
            newColumn = {
                id: editingColumn?.id || `col-${Date.now()}`,
                mainHeader: mainHeader.trim(),
                columnName: columnName.trim().toUpperCase(),
                headerColor: finalHeaderColor || undefined,
                type: 'target',
                metricType,
                targetValue: parsedTarget,
                conditionalFormatting: finalRules.length > 0 ? finalRules : undefined,
            };
        } else { // calculated
            if (!operand1 || !operand2) {
                toast.error('Vui lòng chọn đủ 2 cột để thực hiện phép tính.');
                return;
            }
            newColumn = {
                id: editingColumn?.id || `col-${Date.now()}`,
                mainHeader: mainHeader.trim(),
                columnName: columnName.trim().toUpperCase(),
                headerColor: finalHeaderColor || undefined,
                type: 'calculated',
                operation,
                operand1_columnId: operand1,
                operand2_columnId: operand2,
                displayAs,
                decimalPlaces,
                conditionalFormatting: finalRules.length > 0 ? finalRules : undefined,
            };
        }
        
        onSave(newColumn);

        if (editingColumn) {
            // Parent will close modal automatically
        } else {
            resetForm();
            toast.success(`Đã lưu cột "${newColumn.columnName}". Bạn có thể thêm cột tiếp theo.`);
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
                <div className="flex-grow p-3 sm:p-6 space-y-4 sm:space-y-8 bg-slate-50 dark:bg-slate-900/50 overflow-y-auto custom-scrollbar min-h-0">
                    {/* SECTION 1: Cấu trúc Cột */}
                    <div className="bg-white dark:bg-slate-800 rounded-lg sm:rounded-xl border border-slate-200 dark:border-slate-700 p-3 sm:p-5 shadow-sm">
                        <h4 className="flex items-center gap-2 font-bold mb-3 sm:mb-4 text-sm sm:text-base text-slate-800 dark:text-slate-100">
                            <Icon name="layout" size={3.5} className="text-indigo-500 sm:hidden" />
                            <Icon name="layout" size={4} className="text-indigo-500 hidden sm:block" /> Cấu trúc cột
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-5">
                            <div ref={headersRef} className="relative z-50">
                                <label htmlFor="mainHeader" className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1 sm:mb-1.5">
                                    Tiêu đề nhóm
                                </label>
                                <div className="relative">
                                    <Icon name="layers" size={3.5} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 sm:hidden" />
                                    <Icon name="layers" size={4} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hidden sm:block" />
                                    <input 
                                        id="mainHeader" 
                                        type="text" 
                                        value={mainHeader} 
                                        onChange={e => { setMainHeader(e.target.value); setShowHeadersList(true); }}
                                        onFocus={() => setShowHeadersList(true)}
                                        placeholder="Tạo nhóm mới hoặc chọn..." 
                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg pl-8 sm:pl-10 pr-8 sm:pr-10 py-2 sm:py-2.5 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition outline-none shadow-sm dark:focus:ring-indigo-400" 
                                        autoComplete="off"
                                    />
                                    <button 
                                        type="button" 
                                        onClick={() => setShowHeadersList(!showHeadersList)} 
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors p-1.5 rounded-md"
                                    >
                                        <Icon name="chevron-down" size={3.5} className="sm:hidden" />
                                        <Icon name="chevron-down" size={4} className="hidden sm:block" />
                                    </button>
                                </div>
                                {showHeadersList && (
                                    <div className="absolute top-full left-0 right-0 mt-1 sm:mt-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg sm:rounded-xl shadow-xl max-h-48 sm:max-h-56 overflow-y-auto py-1 sm:py-1.5 z-20 overflow-hidden ring-1 ring-black/5 dark:ring-white/10 animate-in fade-in slide-in-from-top-1">
                                        {existingMainHeaders.filter(h => h.includes(mainHeader)).length === 0 && mainHeader && (
                                            <div className="px-2.5 sm:px-4 py-1.5 sm:py-2.5 text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 italic bg-slate-50 dark:bg-slate-900/50">Tạo nhóm mới: <span className="font-bold text-indigo-600 dark:text-indigo-400">{mainHeader}</span></div>
                                        )}
                                        {existingMainHeaders.filter(h => h.includes(mainHeader)).map(h => (
                                            <div 
                                                key={h} 
                                                className="px-2.5 sm:px-4 py-1.5 sm:py-2.5 text-xs sm:text-sm text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 cursor-pointer font-bold transition-colors flex items-center justify-between"
                                                onClick={() => { setMainHeader(h); setShowHeadersList(false); }}
                                            >
                                                {h}
                                                {mainHeader === h && <><Icon name="check" size={3.5} className="text-indigo-600 sm:hidden" /><Icon name="check" size={4} className="text-indigo-600 hidden sm:block" /></>}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div>
                                <label htmlFor="columnName" className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1 sm:mb-1.5">Tiêu đề cột (Bắt buộc) *</label>
                                <div className="relative">
                                    <Icon name="type" size={4} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input 
                                        id="columnName" 
                                        type="text" 
                                        value={columnName} 
                                        onChange={e => setColumnName(e.target.value.toUpperCase())} 
                                        placeholder="VD: SL SIM, DT APPLE..." 
                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg pl-8 sm:pl-10 pr-3 py-2 sm:py-2.5 text-xs sm:text-sm font-bold text-indigo-700 dark:text-indigo-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition outline-none shadow-sm" 
                                        required 
                                    />
                                </div>
                            </div>
                            
                            <div className="sm:col-span-2 mt-1">
                                <label className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5 sm:mb-2 flex justify-between">
                                    Phân loại cột
                                    <span className="font-normal text-[10px] sm:text-xs text-slate-500">Quyết định cách tính toán dữ liệu</span>
                                </label>
                                <div className="flex bg-slate-100 dark:bg-slate-900 p-1 sm:p-1.5 rounded-lg sm:rounded-xl border border-slate-200 dark:border-slate-700 shadow-inner">
                                    <button type="button" onClick={() => setColumnType('data')} className={`flex-1 flex flex-col items-center justify-center py-1.5 sm:py-2 px-1.5 sm:px-2 text-xs sm:text-sm rounded-md sm:rounded-lg transition-all ${columnType === 'data' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow ring-1 ring-black/5 font-bold' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 font-medium'}`}>
                                        <Icon name="database" size={3.5} className="mb-0.5 sm:mb-1 opacity-80 sm:hidden" />
                                        <Icon name="database" size={4} className="mb-0.5 sm:mb-1 opacity-80 hidden sm:block" /> Truy vấn Data
                                    </button>
                                    <button type="button" onClick={() => setColumnType('calculated')} className={`flex-1 flex flex-col items-center justify-center py-1.5 sm:py-2 px-1.5 sm:px-2 text-xs sm:text-sm rounded-md sm:rounded-lg transition-all ${columnType === 'calculated' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow ring-1 ring-black/5 font-bold' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 font-medium'}`}>
                                        <Icon name="calculator" size={3.5} className="mb-0.5 sm:mb-1 opacity-80 sm:hidden" />
                                        <Icon name="calculator" size={4} className="mb-0.5 sm:mb-1 opacity-80 hidden sm:block" /> Cột Tính Toán
                                    </button>
                                    <button type="button" onClick={() => setColumnType('target')} className={`flex-1 flex flex-col items-center justify-center py-1.5 sm:py-2 px-1.5 sm:px-2 text-xs sm:text-sm rounded-md sm:rounded-lg transition-all ${columnType === 'target' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow ring-1 ring-black/5 font-bold' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 font-medium'}`}>
                                        <Icon name="target" size={3.5} className="mb-0.5 sm:mb-1 opacity-80 sm:hidden" />
                                        <Icon name="target" size={4} className="mb-0.5 sm:mb-1 opacity-80 hidden sm:block" /> Thiết lập Target
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Tùy chỉnh màu */}
                        <div className="mt-3 sm:mt-5 border-t border-slate-100 dark:border-slate-700 pt-3 sm:pt-5">
                            <label className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 sm:mb-3 flex items-center gap-2">
                                <Icon name="palette" size={3.5} className="text-slate-400 sm:hidden" />
                                <Icon name="palette" size={4} className="text-slate-400 hidden sm:block" />
                                Tùy chỉnh màu nền cho nhóm (Mặc định ngẫu nhiên)
                            </label>
                            <div className="flex flex-wrap gap-1.5 sm:gap-2.5">
                                {PASTEL_COLORS.map(c => (
                                    <button
                                        key={c.label}
                                        type="button"
                                        onClick={() => setHeaderColor(c.value)}
                                        title={c.label}
                                        className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full transition-all hover:scale-110 flex items-center justify-center shadow-sm ${headerColor === c.value ? 'ring-2 ring-offset-1 sm:ring-offset-2 ring-indigo-500 scale-110 shadow-md' : 'border border-slate-200 dark:border-slate-600'} ${!c.value ? 'bg-slate-100 dark:bg-slate-800' : ''}`}
                                        style={c.value ? { backgroundColor: c.value } : {}}
                                    >
                                        {!c.value && <Icon name="shuffle" size={3} className="text-slate-500 dark:text-slate-400 sm:hidden" />}
                                        {!c.value && <Icon name="shuffle" size={4} className="text-slate-500 dark:text-slate-400 hidden sm:block" />}
                                        {headerColor === c.value && c.value && <Icon name="check" size={3} className="text-slate-800 opacity-70 sm:hidden" />}
                                        {headerColor === c.value && c.value && <Icon name="check" size={4} className="text-slate-800 opacity-70 hidden sm:block" />}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* SECTION 2: Cấu trúc chi tiết */}
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                        {columnType === 'data' && (
                            <DataColumnForm 
                                metricType={metricType} setMetricType={setMetricType}
                                allIndustries={allIndustries} selectedIndustries={selectedIndustries} setSelectedIndustries={setSelectedIndustries}
                                allSubgroups={allSubgroups} selectedSubgroups={selectedSubgroups} setSelectedSubgroups={setSelectedSubgroups}
                                allManufacturers={allManufacturers} selectedManufacturers={selectedManufacturers} setSelectedManufacturers={setSelectedManufacturers}
                                productCodes={productCodes} setProductCodes={setProductCodes}
                                priceType={priceType} setPriceType={setPriceType}
                                priceCondition={priceCondition} setPriceCondition={setPriceCondition}
                                priceValue1={priceValue1} setPriceValue1={setPriceValue1}
                                priceValue2={priceValue2} setPriceValue2={setPriceValue2}
                            />
                        )}
                        
                        {columnType === 'target' && (
                            <TargetColumnForm 
                                metricType={metricType} setMetricType={setMetricType}
                                targetValue={targetValue} setTargetValue={setTargetValue}
                            />
                        )}

                        {columnType === 'calculated' && (
                            <CalculatedColumnForm 
                                operation={operation} setOperation={setOperation}
                                operand1={operand1} setOperand1={setOperand1}
                                operand2={operand2} setOperand2={setOperand2}
                                displayAs={displayAs} setDisplayAs={setDisplayAs}
                                decimalPlaces={decimalPlaces} setDecimalPlaces={setDecimalPlaces}
                                availableOperands={availableOperands}
                            />
                        )}
                    </div>
                    
                    {/* SECTION 3: Formatting Rules */}
                    <FormattingRulesForm 
                        formattingRules={formattingRules}
                        addFormattingRule={addFormattingRule}
                        updateFormattingRule={updateFormattingRule}
                        removeFormattingRule={removeFormattingRule}
                    />

                </div>
                
                {/* FOOTER */}
                <div className="p-3 sm:p-4 sm:px-6 sm:py-5 grid grid-cols-2 gap-2 sm:gap-3 bg-white dark:bg-slate-800 rounded-b-xl border-t border-slate-200 dark:border-slate-700 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-20">
                    <button type="button" onClick={onClose} className="py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors focus:ring-2 focus:ring-slate-300 focus:outline-none border border-slate-200 dark:border-slate-600"> Hủy Bỏ </button>
                    <button type="submit" className="py-2 sm:py-2.5 rounded-lg sm:rounded-xl shadow-md text-xs sm:text-sm font-black text-white bg-indigo-600 hover:bg-indigo-700 transition-all active:translate-y-0 focus:ring-4 focus:ring-indigo-500/30 flex items-center gap-1.5 sm:gap-2 justify-center">
                        <Icon name="save" size={4} /> {editingColumn ? "Lưu Chỉnh Sửa" : "Lưu & Bắt Đầu Cột Mới"}
                    </button>
                </div>
            </form>
        </ModalWrapper>
    );
};

export default ColumnConfigModal;
