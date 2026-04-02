
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
        { label: 'Mặc định', value: '' },
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
                headerColor: headerColor || undefined,
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
                headerColor: headerColor || undefined,
                type: 'target',
                metricType, // reuse metricType to determine formatting (revenue/quantity)
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
                headerColor: headerColor || undefined,
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
            // Parent will close modal
        } else {
            // Reset form for next entry
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
            subTitle="Cấu hình một cột trong bảng thi đua"
            titleColorClass="text-primary-600 dark:text-primary-400"
            maxWidthClass="max-w-4xl"
        >
            <form onSubmit={handleSubmit}>
                <div className="p-6 space-y-6 bg-slate-50 dark:bg-slate-900 max-h-[70vh] overflow-y-auto">
                    {feedback && (
                        <div className={`p-3 border rounded-md text-sm font-semibold flex items-center gap-2 ${
                            feedback.type === 'error' 
                            ? 'bg-red-100 dark:bg-red-900/50 border-red-200 dark:border-red-800 text-red-700 dark:text-red-200'
                            : 'bg-green-100 dark:bg-green-900/50 border-green-200 dark:border-green-800 text-green-700 dark:text-green-200'
                        }`}>
                           <Icon name={feedback.type === 'error' ? 'alert-triangle' : 'check-circle'} size={4} />
                           {feedback.message}
                        </div>
                    )}
                    
                    {/* Common Fields */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div ref={headersRef} className="relative z-[99]">
                            <label htmlFor="mainHeader" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tiêu đề chính</label>
                            <div className="relative">
                                <input 
                                    id="mainHeader" 
                                    type="text" 
                                    value={mainHeader} 
                                    onChange={e => { setMainHeader(e.target.value.toUpperCase()); setShowHeadersList(true); }}
                                    onFocus={() => setShowHeadersList(true)}
                                    placeholder="VD: THI ĐUA SIM" 
                                    className="w-full bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 rounded-lg p-2 pr-8 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition outline-none" 
                                />
                                {existingMainHeaders.length > 0 && (
                                    <button 
                                        type="button" 
                                        onClick={() => setShowHeadersList(!showHeadersList)} 
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-500 transition-colors p-1"
                                    >
                                        <Icon name="chevron-down" size={4} />
                                    </button>
                                )}
                            </div>
                            {showHeadersList && existingMainHeaders.length > 0 && (
                                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl max-h-48 overflow-y-auto py-1 z-20">
                                    {existingMainHeaders.filter(h => h.includes(mainHeader)).length === 0 && mainHeader && (
                                        <div className="px-3 py-2 text-xs text-slate-500 dark:text-slate-400 italic">Nhóm mới: {mainHeader}</div>
                                    )}
                                    {existingMainHeaders.filter(h => h.includes(mainHeader)).map(h => (
                                        <div 
                                            key={h} 
                                            className="px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50 cursor-pointer font-medium"
                                            onClick={() => { setMainHeader(h); setShowHeadersList(false); }}
                                        >
                                            {h}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div>
                            <label htmlFor="columnName" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tiêu đề phụ *</label>
                            <input id="columnName" type="text" value={columnName} onChange={e => setColumnName(e.target.value.toUpperCase())} placeholder="VD: SL Sim Số Đẹp" className="w-full bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 rounded-lg p-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition" required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Loại Cột *</label>
                             <div className="inline-flex rounded-lg shadow-sm p-1 bg-slate-200/50 dark:bg-slate-800 flex-wrap gap-1">
                                <button type="button" onClick={() => setColumnType('data')} className={`py-1.5 px-4 text-sm font-semibold rounded-md transition-colors ${columnType === 'data' ? 'bg-white dark:bg-slate-700 text-primary-600 dark:text-white shadow' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700'}`}>Dữ liệu</button>
                                <button type="button" onClick={() => setColumnType('calculated')} className={`py-1.5 px-4 text-sm font-semibold rounded-md transition-colors ${columnType === 'calculated' ? 'bg-white dark:bg-slate-700 text-primary-600 dark:text-white shadow' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700'}`}>Tính toán</button>
                                <button type="button" onClick={() => setColumnType('target')} className={`py-1.5 px-4 text-sm font-semibold rounded-md transition-colors ${columnType === 'target' ? 'bg-white dark:bg-slate-700 text-primary-600 dark:text-white shadow' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700'}`}>Chỉ tiêu (Target)</button>
                            </div>
                        </div>
                    </div>

                    <div className="mt-4 p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Màu nền tiêu đề (Tùy chọn)</label>
                        <div className="flex flex-wrap gap-2">
                            {PASTEL_COLORS.map(c => (
                                <button
                                    key={c.label}
                                    type="button"
                                    onClick={() => setHeaderColor(c.value)}
                                    title={c.label}
                                    className={`w-7 h-7 rounded-full transition-transform hover:scale-110 flex items-center justify-center ${headerColor === c.value ? 'ring-2 ring-offset-1 ring-primary-500 scale-110' : 'ring-1 ring-black/5'} ${!c.value ? 'bg-stripes-slate-200' : ''}`}
                                    style={c.value ? { backgroundColor: c.value } : {}}
                                >
                                    {!c.value && <Icon name="slash" size={3} className="text-slate-400" />}
                                    {headerColor === c.value && c.value && <Icon name="check" size={3} className="text-slate-700" />}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Conditional Fields */}
                    {columnType === 'data' ? (
                        <div className="space-y-4 p-4 bg-slate-100 dark:bg-slate-800/50 rounded-lg">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Chỉ số tính *</label>
                                <div className="inline-flex rounded-lg shadow-sm p-1 bg-slate-200/50 dark:bg-slate-800">
                                    <button type="button" onClick={() => setMetricType('quantity')} className={`py-1.5 px-4 text-sm font-semibold rounded-md transition-colors ${metricType === 'quantity' ? 'bg-white dark:bg-slate-700 text-primary-600 dark:text-white shadow' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700'}`}>Số lượng</button>
                                    <button type="button" onClick={() => setMetricType('revenue')} className={`py-1.5 px-4 text-sm font-semibold rounded-md transition-colors ${metricType === 'revenue' ? 'bg-white dark:bg-slate-700 text-primary-600 dark:text-white shadow' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700'}`}>Doanh thu</button>
                                    <button type="button" onClick={() => setMetricType('revenueQD')} className={`py-1.5 px-4 text-sm font-semibold rounded-md transition-colors ${metricType === 'revenueQD' ? 'bg-white dark:bg-slate-700 text-primary-600 dark:text-white shadow' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700'}`}>Doanh thu QĐ</button>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                 <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Ngành hàng</label>
                                    <MultiSelectDropdown options={allIndustries} selected={selectedIndustries} onChange={setSelectedIndustries} label="Ngành hàng"/>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nhóm hàng</label>
                                    <MultiSelectDropdown options={allSubgroups} selected={selectedSubgroups} onChange={setSelectedSubgroups} label="Nhóm hàng"/>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nhà sản xuất</label>
                                    <MultiSelectDropdown options={allManufacturers} selected={selectedManufacturers} onChange={setSelectedManufacturers} label="Nhà sản xuất" />
                                </div>
                            </div>
                            <div>
                                <label htmlFor="productCodes" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Mã sản phẩm (Nhóm hàng)</label>
                                <textarea id="productCodes" value={productCodes} onChange={(e) => setProductCodes(e.target.value)} rows={2} placeholder="Nhập mã, cách nhau bằng dấu phẩy, khoảng trắng, hoặc xuống dòng." className="w-full bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 rounded-lg p-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition"></textarea>
                            </div>
                             <div className="border-t border-slate-200 dark:border-slate-600 pt-4 mt-4">
                                <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-2">Lọc theo giá sản phẩm (tùy chọn)</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Loại giá</label>
                                        <select value={priceType} onChange={e => setPriceType(e.target.value as any)} className="w-full h-11 block rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 pl-3 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm">
                                            <option value="discounted">Giá giảm (Giá bán_1)</option>
                                            <option value="original">Giá gốc (Giá bán)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Điều kiện</label>
                                        <select value={priceCondition} onChange={e => setPriceCondition(e.target.value as any)} className="w-full h-11 block rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 pl-3 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm">
                                            <option value="none">Không lọc</option>
                                            <option value="greater">Lớn hơn</option>
                                            <option value="less">Nhỏ hơn</option>
                                            <option value="equal">Bằng</option>
                                            <option value="between">Trong khoảng</option>
                                        </select>
                                    </div>
                                    {priceCondition !== 'none' && (
                                        <>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{priceCondition === 'between' ? 'Giá từ' : 'Giá trị'}</label>
                                                <input type="number" value={priceValue1} onChange={e => setPriceValue1(e.target.value)} placeholder="0" className="w-full h-11 block rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 pl-3 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm" />
                                            </div>
                                            {priceCondition === 'between' && (
                                                <div>
                                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Đến giá</label>
                                                    <input type="number" value={priceValue2} onChange={e => setPriceValue2(e.target.value)} placeholder="0" className="w-full h-11 block rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 pl-3 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm" />
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : columnType === 'target' ? (
                        <div className="space-y-4 p-4 bg-indigo-50/50 dark:bg-indigo-900/20 rounded-lg">
                            <h4 className="font-semibold text-indigo-800 dark:text-indigo-200">Thiết lập Chỉ Tiêu (Target) Kho</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Đinh dạng chỉ tiêu *</label>
                                    <div className="inline-flex rounded-lg shadow-sm p-1 bg-slate-200/50 dark:bg-slate-800">
                                        <button type="button" onClick={() => setMetricType('revenue')} className={`py-1.5 px-4 text-sm font-semibold rounded-md transition-colors ${metricType === 'revenue' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700'}`}>Tiền Tệ (Doanh thu)</button>
                                        <button type="button" onClick={() => setMetricType('quantity')} className={`py-1.5 px-4 text-sm font-semibold rounded-md transition-colors ${metricType === 'quantity' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700'}`}>Con Số (Số lượng)</button>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Mục Tiêu Tổng (Của Siêu thị/Kho) *</label>
                                    <div className="relative">
                                        <input 
                                            type="text" 
                                            value={targetValue} 
                                            onChange={(e) => {
                                                // Allow numbers and commas
                                                const raw = e.target.value.replace(/[^\d]/g, '');
                                                if (raw) {
                                                    setTargetValue(Number(raw).toLocaleString('en-US'));
                                                } else {
                                                    setTargetValue('');
                                                }
                                            }}
                                            placeholder="VD: 1,500,000,000" 
                                            className="w-full bg-white dark:bg-slate-700 border-indigo-200 dark:border-indigo-800 rounded-lg p-2.5 pl-10 text-sm font-bold text-indigo-700 dark:text-indigo-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition outline-none shadow-sm"
                                        />
                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-400">
                                            <Icon name={metricType === 'revenue' ? "dollar-sign" : "hash"} size={4} />
                                        </div>
                                    </div>
                                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 flex items-start gap-1">
                                        <Icon name="info" size={3.5} className="mt-0.5 flex-shrink-0" />
                                        <span>Tổng số này sẽ được hệ thống phân bổ và tự động chia đều cho tổng số lượng nhân viên hiện có trong bảng hiển thị.</span>
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : (
                         <div className="space-y-4 p-4 bg-slate-100 dark:bg-slate-800/50 rounded-lg">
                            <h4 className="font-semibold text-slate-800 dark:text-slate-200">Xây dựng công thức</h4>
                            <div className="flex items-center gap-2">
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Cột 1</label>
                                    <select value={operand1} onChange={e => setOperand1(e.target.value)} className="w-full h-11 block rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 pl-3 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm">
                                        <option value="">-- Chọn cột --</option>
                                        {availableOperands.map(c => <option key={c.id} value={c.id}>{c.columnName}</option>)}
                                    </select>
                                </div>
                                <div className="flex-shrink-0">
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Phép tính</label>
                                    <select value={operation} onChange={e => setOperation(e.target.value as any)} className="w-full h-11 block rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 pl-3 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm">
                                        <option value="+">+</option>
                                        <option value="-">-</option>
                                        <option value="*">*</option>
                                        <option value="/">/</option>
                                    </select>
                                </div>
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Cột 2</label>
                                    <select value={operand2} onChange={e => setOperand2(e.target.value)} className="w-full h-11 block rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 pl-3 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm">
                                        <option value="">-- Chọn cột --</option>
                                         {availableOperands.map(c => <option key={c.id} value={c.id}>{c.columnName}</option>)}
                                    </select>
                                </div>
                                {operation === '/' && (
                                     <div className="flex-shrink-0">
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Hiển thị</label>
                                        <select value={displayAs} onChange={e => setDisplayAs(e.target.value as any)} className="w-full h-11 block rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 pl-3 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm">
                                            <option value="number">Dạng số</option>
                                            <option value="percentage">Dạng %</option>
                                        </select>
                                    </div>
                                )}
                            </div>
                         </div>
                    )}
                    
                    <div className="border-t border-slate-200 dark:border-slate-600 pt-4 mt-4">
                        <div className="flex justify-between items-center mb-2">
                             <h4 className="font-semibold text-slate-800 dark:text-slate-200">Định dạng có điều kiện (tùy chọn)</h4>
                             <button type="button" onClick={addFormattingRule} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600 transition-colors flex items-center gap-1"><Icon name="plus" size={4}/>Thêm luật</button>
                        </div>
                        <div className="space-y-2">
                            {formattingRules.map((rule) => {
                                const valueInputsNeeded = !['>avg', '<avg'].includes(rule.condition);
                                return (
                                <div key={rule.id} className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-end p-2 bg-slate-100 dark:bg-slate-800/50 rounded-lg">
                                    <div>
                                        <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Điều kiện</label>
                                        <select value={rule.condition} onChange={e => updateFormattingRule(rule.id, 'condition', e.target.value)} className="w-full h-9 mt-1 block rounded-md border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm">
                                            <option value=">">Lớn hơn (&gt;)</option>
                                            <option value="<">Nhỏ hơn (&lt;)</option>
                                            <option value="=">Bằng (=)</option>
                                            <option value="between">Trong khoảng</option>
                                            <option value=">avg">Lớn hơn trung bình cột</option>
                                            <option value="<avg">Nhỏ hơn trung bình cột</option>
                                        </select>
                                    </div>
                                    {valueInputsNeeded ? (
                                        <>
                                            <div className={rule.condition === 'between' ? '' : 'sm:col-span-2'}>
                                                <label className="text-xs font-medium text-slate-600 dark:text-slate-400">{rule.condition === 'between' ? 'Giá trị từ' : 'Giá trị'}</label>
                                                <input type="number" value={rule.value1} onChange={e => updateFormattingRule(rule.id, 'value1', e.target.value)} placeholder="0" className="w-full h-9 mt-1 block rounded-md border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"/>
                                            </div>
                                            {rule.condition === 'between' && (
                                                 <div>
                                                    <label className="text-xs font-medium text-slate-600 dark:text-slate-400">đến</label>
                                                    <input type="number" value={rule.value2} onChange={e => updateFormattingRule(rule.id, 'value2', e.target.value)} placeholder="0" className="w-full h-9 mt-1 block rounded-md border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"/>
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <div className="sm:col-span-2 flex items-end pb-1">
                                            <p className="text-xs text-slate-500 dark:text-slate-400 italic">(So sánh với trung bình của cột)</p>
                                        </div>
                                    )}
                                    <div className="flex items-end gap-2">
                                        <div className="flex-grow">
                                            <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Màu</label>
                                            <div className="flex items-center gap-1.5 mt-1 bg-white dark:bg-slate-700 p-1.5 rounded-md border border-slate-300 dark:border-slate-600 shadow-sm h-9">
                                                {ALERT_COLORS.map(c => (
                                                    <button
                                                        key={c}
                                                        type="button"
                                                        onClick={() => updateFormattingRule(rule.id, 'color', c)}
                                                        className={`w-5 h-5 rounded-full transition-transform hover:scale-110 flex-shrink-0 ${rule.color === c ? 'ring-2 ring-offset-1 ring-primary-500 scale-110' : ''}`}
                                                        style={{ backgroundColor: c }}
                                                    />
                                                ))}
                                                <div className="w-px h-4 bg-slate-200 dark:bg-slate-600 mx-0.5"></div>
                                                <input type="color" value={rule.color} onChange={e => updateFormattingRule(rule.id, 'color', e.target.value)} className="w-6 h-6 p-0 border-0 rounded cursor-pointer shrink-0"/>
                                            </div>
                                        </div>
                                        <button type="button" onClick={() => removeFormattingRule(rule.id)} className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-md h-9"><Icon name="trash-2" size={4}/></button>
                                    </div>
                                </div>
                            )})}
                        </div>
                    </div>

                </div>
                <div className="p-4 flex justify-end gap-3 bg-slate-100 dark:bg-slate-800 rounded-b-xl border-t border-slate-200 dark:border-slate-700">
                    <button type="button" onClick={onClose} className="py-2 px-4 rounded-lg shadow-sm text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 transition-colors">Đóng</button>
                    <button type="submit" className="py-2 px-6 rounded-lg shadow-sm text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors">{editingColumn ? "Lưu Thay Đổi" : "Lưu Cột"}</button>
                </div>
            </form>
        </ModalWrapper>
    );
};

export default ColumnConfigModal;