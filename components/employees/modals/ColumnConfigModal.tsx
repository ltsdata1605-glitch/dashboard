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
import { Button } from '../../shared/ui/Button';
import { Input } from '../../shared/ui/Input';

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



    const [formattingRules, setFormattingRules] = useState<{ id: number; condition: string; value1: string; value2: string; color: string; textColor: string; }[]>([]);
    
    const [showHeadersList, setShowHeadersList] = useState(false);
    const headersRef = useRef<HTMLDivElement>(null);
    const ALERT_COLORS = [
        '#ef4444', '#f97316', '#eab308', '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#64748b'
    ];

    const [feedback, setFeedback] = useState<{type: 'error' | 'success', message: string} | null>(null);
    const feedbackTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    const showFeedback = (type: 'error' | 'success', message: string) => {
        setFeedback({ type, message });
        if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
        feedbackTimer.current = setTimeout(() => setFeedback(null), 3500);
    };

    const resetForm = () => {
        setMainHeader('');
        setColumnName('');
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
        setFormattingRules([{
            id: Date.now(),
            condition: '<avg',
            value1: '',
            value2: '',
            color: 'rose',
            textColor: 'text-rose-700'
        }]);
    };

    const columnNameInputRef = useRef<HTMLInputElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    
    useEffect(() => {
        if (isOpen) {
            if (editingColumn) {
                setMainHeader(editingColumn.mainHeader || '');
                setColumnName(editingColumn.columnName);
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
            showFeedback('success', `Đã lưu cột "${newColumn.columnName}". Bạn có thể thêm cột tiếp theo.`);
            setTimeout(() => {
                if (scrollContainerRef.current) scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
                if (columnNameInputRef.current) columnNameInputRef.current.focus();
            }, 100);
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
                <div ref={scrollContainerRef} className="flex-grow p-4 space-y-4 bg-slate-50 dark:bg-slate-900/50 overflow-y-auto custom-scrollbar min-h-0">
                    {feedback && (
                        <div className={`p-2.5 sm:p-3 border rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 sm:gap-2 shadow-sm ${
                            feedback.type === 'error' 
                            ? 'bg-rose-50 dark:bg-rose-900/30 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300'
                            : 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                        }`}>
                           <Icon name={feedback.type === 'error' ? 'alert-triangle' : 'check-circle'} size={3.5} className="sm:hidden" />
                           <Icon name={feedback.type === 'error' ? 'alert-triangle' : 'check-circle'} size={4} className="hidden sm:block" />
                           {feedback.message}
                        </div>
                    )}
                    {/* SECTION 1: Cấu trúc Cột */}
                    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
                        <h4 className="flex items-center gap-2 font-bold mb-4 text-sm text-slate-800 dark:text-slate-100">
                            <Icon name="layout" size={4} className="text-indigo-500" /> Cấu trúc cột
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div ref={headersRef} className="relative z-50">
                                <label htmlFor="mainHeader" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                                    Tiêu đề nhóm
                                </label>
                                <div className="relative">
                                    <Input 
                                        id="mainHeader" 
                                        type="text" 
                                        leftIcon="layers"
                                        value={mainHeader} 
                                        onChange={e => { setMainHeader(e.target.value); setShowHeadersList(true); }}
                                        onFocus={() => setShowHeadersList(true)}
                                        placeholder="Tạo nhóm mới hoặc chọn..." 
                                        className="h-10 text-sm font-medium" 
                                        autoComplete="off"
                                        rightIcon="chevron-down"
                                        onRightIconClick={() => setShowHeadersList(!showHeadersList)}
                                    />
                                </div>
                                {showHeadersList && (
                                    <div className="absolute top-full left-0 right-0 mt-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl max-h-56 overflow-y-auto py-1.5 z-20 overflow-hidden ring-1 ring-black/5 dark:ring-white/10 animate-in fade-in slide-in-from-top-1">
                                        {existingMainHeaders.filter(h => h.includes(mainHeader)).length === 0 && mainHeader && (
                                            <div className="px-4 py-2.5 text-xs text-slate-500 dark:text-slate-400 italic bg-slate-50 dark:bg-slate-900/50">Tạo nhóm mới: <span className="font-bold text-indigo-600 dark:text-indigo-400">{mainHeader}</span></div>
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
                                <label htmlFor="columnName" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Tiêu đề cột (Bắt buộc) *</label>
                                <div className="relative">
                                    <Input 
                                        ref={columnNameInputRef}
                                        id="columnName" 
                                        type="text" 
                                        leftIcon="type"
                                        value={columnName} 
                                        onChange={e => setColumnName(e.target.value.toUpperCase())} 
                                        placeholder="VD: SL SIM, DT APPLE..." 
                                        className="h-10 text-sm font-bold text-indigo-700 dark:text-indigo-300" 
                                        required 
                                    />
                                </div>
                            </div>
                            
                            <div className="sm:col-span-2 mt-1">
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 flex justify-between">
                                    Phân loại cột
                                    <span className="font-normal text-xs text-slate-500">Quyết định cách tính toán dữ liệu</span>
                                </label>
                                <div className="flex bg-slate-100 dark:bg-slate-900 p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-inner">
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
                    </div>

                    {/* SECTION 2: Cấu trúc chi tiết */}
                    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
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
                <div className="p-4 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 rounded-b-xl flex justify-end gap-3 sticky bottom-0 z-30 shadow-sm mt-auto shrink-0">
                    <Button variant="ghost" type="button" onClick={onClose}>Hủy Bỏ</Button>
                    <Button variant="primary" type="submit">
                        <Icon name="save" size={4} /> {editingColumn ? "Lưu Thay Đổi" : "Lưu & Bắt Đầu Cột Mới"}
                    </Button>
                </div>
            </form>
        </ModalWrapper>
    );
};

export default ColumnConfigModal;
