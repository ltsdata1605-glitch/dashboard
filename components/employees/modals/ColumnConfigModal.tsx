import React, { useState, useEffect, useRef } from 'react';
import ModalWrapper from '../../modals/ModalWrapper';
import { Icon } from '../../common/Icon';
import type { ColumnConfig } from '../../../types';
import { DataColumnForm } from './column-config/DataColumnForm';
import { CalculatedColumnForm } from './column-config/CalculatedColumnForm';
import { TargetColumnForm } from './column-config/TargetColumnForm';
import { FormattingRulesForm } from './column-config/FormattingRulesForm';

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
                showFeedback('error', 'Vui lòng nhập giá trị chỉ tiêu hợp lệ.');
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
                showFeedback('error', 'Vui lòng chọn đủ 2 cột để thực hiện phép tính.');
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
                                        onChange={e => { setMainHeader(e.target.value); setShowHeadersList(true); }}
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
