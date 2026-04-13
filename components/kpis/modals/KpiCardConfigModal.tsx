import React, { useState, useEffect } from 'react';
import type { KpiCardConfig, KpiMetricSource } from '../../../types';
import ModalWrapper from '../../modals/ModalWrapper';
import { Icon } from '../../common/Icon';
import MultiSelectDropdown from '../../common/MultiSelectDropdown';
import { useDashboardContext } from '../../../contexts/DashboardContext';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    configs: KpiCardConfig[];
    onSave: (newConfigs: KpiCardConfig[]) => void;
}

const AVAILABLE_METRICS: { value: KpiMetricSource; label: string; format: 'currency' | 'percentage' | 'number' }[] = [
    { value: 'doanhThuQD', label: 'Doanh Thu QĐ', format: 'currency' },
    { value: 'totalRevenue', label: 'Doanh Thu Thực', format: 'currency' },
    { value: 'traGopPercent', label: 'Tỉ Lệ Trả Góp', format: 'percentage' },
    { value: 'hieuQuaQD', label: 'Hiệu Quả QĐ', format: 'percentage' },
    { value: 'doanhThuThucChoXuat', label: 'Doanh Thu Chờ Xuất', format: 'currency' },
];

const ICONS = ['wallet-cards', 'trending-up', 'receipt', 'fast-forward', 'shopping-bag', 'archive-restore', 'activity', 'dollar-sign', 'credit-card', 'percent'];
const COLORS = ['blue', 'teal', 'emerald', 'pink', 'purple', 'violet', 'orange', 'red', 'rose', 'amber', 'slate'];

const KpiCardConfigModal: React.FC<Props> = ({ isOpen, onClose, configs, onSave }) => {
    const { uniqueFilterOptions, productConfig, originalData } = useDashboardContext();
    const [internalConfigs, setInternalConfigs] = useState<KpiCardConfig[]>([]);
    const [editingCard, setEditingCard] = useState<KpiCardConfig | null>(null);
    const [activeTab, setActiveTab] = useState<'metric' | 'data' | 'calculated'>('metric');
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

    const { allIndustries, allSubgroups, allManufacturers } = React.useMemo(() => {
        if (!productConfig || !originalData) return { allIndustries: [], allSubgroups: [], allManufacturers: [] };
        
        const industries = new Set<string>();
        if (productConfig.childToParentMap) {
            Object.values(productConfig.childToParentMap).forEach(v => industries.add(v as string));
        }

        const subgroups = new Set<string>();
        if (productConfig.subgroups) {
            Object.values(productConfig.subgroups).forEach(parent => {
                Object.keys(parent).forEach(subgroup => subgroups.add(subgroup));
            });
        }
        
        const manufacturers = new Set<string>(originalData.map(row => String(row['Hãng'] || row['Hãng SX'] || '')).filter(Boolean));
        
        return {
            allIndustries: Array.from(industries).sort(),
            allSubgroups: Array.from(subgroups).sort(),
            allManufacturers: Array.from(manufacturers).sort()
        };
    }, [productConfig, originalData]);

    useEffect(() => {
        if (isOpen) {
            setInternalConfigs(JSON.parse(JSON.stringify(configs)));
            setEditingCard(null);
        }
    }, [isOpen, configs]);

    const handleSave = () => {
        onSave(internalConfigs);
        onClose();
    };

    const toggleVisibility = (id: string) => {
        setInternalConfigs(prev => prev.map(c => c.id === id ? { ...c, isVisible: !c.isVisible } : c));
    };

    const moveCard = (index: number, direction: 'up' | 'down') => {
        if ((direction === 'up' && index === 0) || (direction === 'down' && index === internalConfigs.length - 1)) return;
        const newConfigs = [...internalConfigs];
        const temp = newConfigs[index];
        const swapIndex = direction === 'up' ? index - 1 : index + 1;
        newConfigs[index] = newConfigs[swapIndex];
        newConfigs[swapIndex] = temp;
        // update order
        newConfigs.forEach((c, i) => c.order = i + 1);
        setInternalConfigs(newConfigs);
    };

    const handleDragStart = (e: React.DragEvent, index: number) => {
        setDraggedIndex(index);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', index.toString());
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e: React.DragEvent, dropIndex: number) => {
        e.preventDefault();
        if (draggedIndex === null || draggedIndex === dropIndex) return;

        const newConfigs = [...internalConfigs];
        const draggedItem = newConfigs[draggedIndex];
        
        newConfigs.splice(draggedIndex, 1);
        newConfigs.splice(dropIndex, 0, draggedItem);
        
        newConfigs.forEach((c, i) => c.order = i + 1);
        setInternalConfigs(newConfigs);
        setDraggedIndex(null);
    };

    const handleDragEnd = () => {
        setDraggedIndex(null);
    };

    const addNewCard = () => {
        const newCard: KpiCardConfig = {
            id: `kpi-custom-${Date.now()}`,
            order: internalConfigs.length + 1,
            isVisible: true,
            title: 'Thẻ Mới',
            icon: 'activity',
            iconColor: 'blue',
            type: 'metric',
            metric: 'doanhThuQD',
            format: 'currency',
            hasTarget: false,
            targetType: 'none',
            dataFilters: {
                selectedIndustries: [],
                selectedSubgroups: [],
                selectedManufacturers: [],
                metricType: 'revenue'
            }
        };
        setInternalConfigs([...internalConfigs, newCard]);
        setEditingCard(newCard);
        setActiveTab('metric');
    };

    const updateEditingCard = (updates: Partial<KpiCardConfig>) => {
        if (!editingCard) return;
        
        let newUpdates = { ...updates };
        // auto update format if metric changes
        if (updates.metric && editingCard.type === 'metric') {
            const m = AVAILABLE_METRICS.find(x => x.value === updates.metric);
            if (m) newUpdates.format = m.format;
        }

        const updated = { ...editingCard, ...newUpdates };
        setEditingCard(updated);
        setInternalConfigs(prev => prev.map(c => c.id === updated.id ? updated : c));
    };

    const toggleArrayFilter = (filterKey: 'selectedIndustries' | 'selectedSubgroups' | 'selectedManufacturers', value: string) => {
        if (!editingCard || editingCard.type !== 'data') return;
        
        const currentFilters = editingCard.dataFilters?.[filterKey] || [];
        const newFilters = currentFilters.includes(value) 
            ? currentFilters.filter(v => v !== value) 
            : [...currentFilters, value];
            
        updateEditingCard({
            dataFilters: {
                ...editingCard.dataFilters,
                metricType: editingCard.dataFilters?.metricType || 'revenue',
                [filterKey]: newFilters
            }
        });
    };

    const deleteCard = (id: string) => {
        setInternalConfigs(prev => prev.filter(c => c.id !== id).map((c, i) => ({ ...c, order: i + 1 })));
        if (editingCard?.id === id) setEditingCard(null);
    };

    if (!isOpen) return null;

    return (
        <ModalWrapper isOpen={isOpen} onClose={onClose} title="Cấu hình Dãy thẻ KPI" subTitle="Tuỳ chỉnh hiển thị thẻ tổng quan" titleColorClass="text-slate-800 dark:text-white" maxWidthClass="max-w-4xl max-h-[90vh]">
            <div className="flex divide-x divide-slate-200 dark:divide-slate-700 h-[600px] overflow-hidden">
                {/* Left Side: List */}
                <div className="w-1/3 flex flex-col bg-slate-50 dark:bg-slate-800/50">
                    <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-white dark:bg-slate-900">
                        <h3 className="font-bold text-slate-800 dark:text-white">Thứ tự hiển thị</h3>
                        <button onClick={addNewCard} className="text-xs px-2.5 py-1.5 bg-indigo-50 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400 font-semibold rounded-lg hover:bg-indigo-100 transition-colors flex items-center gap-1">
                            <Icon name="plus" size={3.5} /> Thêm
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-2 relative">
                        {internalConfigs.map((config, i) => (
                            <div 
                                key={config.id} 
                                draggable
                                onDragStart={(e) => handleDragStart(e, i)}
                                onDragOver={(e) => handleDragOver(e, i)}
                                onDrop={(e) => handleDrop(e, i)}
                                onDragEnd={handleDragEnd}
                                className={`flex items-center gap-3 p-3 bg-white dark:bg-slate-800 rounded-xl border ${editingCard?.id === config.id ? 'border-indigo-500 shadow-sm ring-1 ring-indigo-500/20' : 'border-slate-200 dark:border-slate-700'} ${draggedIndex === i ? 'opacity-50 ring-2 ring-indigo-500' : ''} transition-all cursor-pointer hover:border-indigo-300`}
                                onClick={() => setEditingCard(config)}
                            >
                                <div className="flex items-center justify-center cursor-grab active:cursor-grabbing text-slate-400 hover:text-indigo-600 p-1">
                                    <Icon name="grip-vertical" size={4.5} />
                                </div>
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-${config.iconColor}-100 text-${config.iconColor}-600 dark:bg-${config.iconColor}-500/20 dark:text-${config.iconColor}-400`}>
                                    <Icon name={config.icon} size={4.5} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200 truncate">{config.title}</h4>
                                    <p className="text-[10px] text-slate-500 truncate">
                                        {config.type === 'metric' || !config.type 
                                            ? AVAILABLE_METRICS.find(m => m.value === config.metric)?.label 
                                            : config.type === 'data' ? 'Bộ lọc Tùy Biên' : 'Công Thức'}
                                    </p>
                                </div>
                                <button onClick={(e) => { e.stopPropagation(); toggleVisibility(config.id); }} className={`p-1.5 rounded-md ${config.isVisible ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-500/20 dark:text-indigo-400' : 'text-slate-400 bg-slate-100 dark:bg-slate-700'}`}>
                                    <Icon name={config.isVisible ? "eye" : "eye-off"} size={4} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right Side: Editor */}
                <div className="w-2/3 flex flex-col bg-white dark:bg-slate-900">
                    <div className="p-4 border-b border-slate-200 dark:border-slate-700 h-14 flex items-center">
                        <h3 className="font-semibold text-slate-700 dark:text-slate-300">{editingCard ? 'Chi Tiết Thẻ' : 'Chọn thẻ bên trái để sửa'}</h3>
                        {editingCard && (
                            <button onClick={() => deleteCard(editingCard.id)} className="ml-auto text-rose-500 hover:text-rose-700 text-sm font-semibold flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-500/10">
                                <Icon name="trash-2" size={4} /> Xóa thẻ
                            </button>
                        )}
                    </div>
                    <div className="flex-1 overflow-y-auto p-6">
                        {editingCard ? (
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wide">Tiêu Đề Hiển Thị</label>
                                    <input 
                                        type="text" 
                                        value={editingCard.title}
                                        onChange={e => updateEditingCard({ title: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-lg focus:ring-2 focus:ring-indigo-500 dark:text-white font-medium"
                                        placeholder="Vd: Doanh Thu Tháng..."
                                    />
                                </div>

                                <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
                                    {(['metric', 'data', 'calculated'] as const).map(tab => (
                                        <button 
                                            key={tab}
                                            onClick={() => {
                                                setActiveTab(tab);
                                                updateEditingCard({ type: tab });
                                            }}
                                            className={`flex-1 text-sm font-semibold py-1.5 rounded-md transition-colors ${
                                                (editingCard.type || 'metric') === tab 
                                                ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-700 dark:text-indigo-400' 
                                                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700/50'
                                            }`}
                                        >
                                            {tab === 'metric' ? 'Chỉ số gốc' : tab === 'data' ? 'Tạo dữ liệu' : 'Công thức'}
                                        </button>
                                    ))}
                                </div>

                                {/* Metric Type rendering */}
                                {(!editingCard.type || editingCard.type === 'metric') && (
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wide">Nguồn Dữ Liệu</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {AVAILABLE_METRICS.map(m => (
                                                <button 
                                                    key={m.value}
                                                    onClick={() => updateEditingCard({ metric: m.value })}
                                                    className={`px-3 py-2 text-left rounded-lg border text-sm font-medium transition-colors ${editingCard.metric === m.value ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-500/20 dark:border-indigo-500/30 dark:text-indigo-300' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'}`}
                                                >
                                                    {m.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Data Builder Type rendering */}
                                {editingCard.type === 'data' && (
                                    <div className="space-y-4">
                                        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-sm text-amber-800 dark:text-amber-400 font-medium flex gap-2">
                                            <Icon name="info" size={4} className="mt-0.5 shrink-0" />
                                            <span>Thẻ này sẽ tự động lọc dữ liệu trên danh sách các Đơn Hàng qua Kho được chọn. Tính toán có thể chậm hệ thống một chút.</span>
                                        </div>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700 h-fit">
                                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">Loại Chỉ Số Cần Lấy:</label>
                                                <select 
                                                    value={editingCard.dataFilters?.metricType || 'revenue'} 
                                                    onChange={(e) => updateEditingCard({ dataFilters: { ...editingCard.dataFilters, metricType: e.target.value as any }})}
                                                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-2 rounded-lg text-sm focus:ring-1 focus:ring-indigo-500 mb-4"
                                                >
                                                    <option value="revenue">Tổng Doanh Thu Thực</option>
                                                    <option value="revenueQD">Tổng Doanh Thu QĐ</option>
                                                    <option value="quantity">Tổng Số Lượng</option>
                                                </select>
                                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">Định Dạng Tiền Tố Số Liệu:</label>
                                                <select
                                                    value={editingCard.format}
                                                    onChange={(e) => updateEditingCard({ format: e.target.value as any })}
                                                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-2 rounded-lg text-sm focus:ring-1 focus:ring-indigo-500"
                                                >
                                                    <option value="currency">Tiền Tệ (VNĐ)</option>
                                                    <option value="number">Số thông thường</option>
                                                    <option value="percentage">Phần trăm (%)</option>
                                                </select>
                                            </div>
                                            
                                            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col gap-4">
                                                <div>
                                                    <MultiSelectDropdown
                                                        label="Lọc theo Ngành Hàng"
                                                        options={allIndustries}
                                                        selected={editingCard.dataFilters?.selectedIndustries || []}
                                                        onChange={(sel) => updateEditingCard({
                                                            dataFilters: {
                                                                ...editingCard.dataFilters,
                                                                metricType: editingCard.dataFilters?.metricType || 'revenue',
                                                                selectedIndustries: sel
                                                            }
                                                        })}
                                                        variant="compact"
                                                    />
                                                </div>
                                                <div>
                                                    <MultiSelectDropdown
                                                        label="Lọc theo Nhóm Hàng"
                                                        options={allSubgroups}
                                                        selected={editingCard.dataFilters?.selectedSubgroups || []}
                                                        onChange={(sel) => updateEditingCard({
                                                            dataFilters: {
                                                                ...editingCard.dataFilters,
                                                                metricType: editingCard.dataFilters?.metricType || 'revenue',
                                                                selectedSubgroups: sel
                                                            }
                                                        })}
                                                        variant="compact"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Calculated rendering */}
                                {editingCard.type === 'calculated' && (
                                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/30 rounded-xl p-4">
                                        <div className="flex items-center gap-4">
                                            <select 
                                                value={editingCard.operand1_cardId || ''}
                                                onChange={(e) => updateEditingCard({ operand1_cardId: e.target.value })}
                                                className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-sm"
                                            >
                                                <option value="" disabled>-- Chọn Thẻ 1 --</option>
                                                {internalConfigs.filter(c => c.id !== editingCard.id).map(c => (
                                                    <option key={c.id} value={c.id}>{c.title}</option>
                                                ))}
                                            </select>
                                            
                                            <select 
                                                value={editingCard.operation || '+'}
                                                onChange={(e) => updateEditingCard({ operation: e.target.value as any })}
                                                className="w-16 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-center font-bold text-indigo-600 text-lg"
                                            >
                                                <option value="+">+</option>
                                                <option value="-">-</option>
                                                <option value="*">x</option>
                                                <option value="/">÷</option>
                                            </select>
                                            
                                            <select 
                                                value={editingCard.operand2_cardId || ''}
                                                onChange={(e) => updateEditingCard({ operand2_cardId: e.target.value })}
                                                className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-sm"
                                            >
                                                <option value="" disabled>-- Chọn Thẻ 2 --</option>
                                                {internalConfigs.filter(c => c.id !== editingCard.id).map(c => (
                                                    <option key={c.id} value={c.id}>{c.title}</option>
                                                ))}
                                            </select>
                                        </div>
                                        
                                        <div className="mt-4 flex gap-4">
                                            <div>
                                                <label className="text-xs font-semibold text-slate-500">Định dạng hiển thị</label>
                                                <select
                                                    value={editingCard.format}
                                                    onChange={(e) => updateEditingCard({ format: e.target.value as any })}
                                                    className="block mt-1 w-32 bg-white border border-slate-200 rounded p-1.5 text-sm"
                                                >
                                                    <option value="percentage">Phần Trăm (%)</option>
                                                    <option value="currency">Tiền VNĐ</option>
                                                    <option value="number">Số</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wide">Biểu Tượng</label>
                                        <div className="flex flex-wrap gap-2">
                                            {ICONS.map(icon => (
                                                <button 
                                                    key={icon}
                                                    onClick={() => updateEditingCard({ icon })}
                                                    className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all ${editingCard.icon === icon ? 'bg-indigo-100 border-indigo-300 text-indigo-600 shadow-sm' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'}`}
                                                >
                                                    <Icon name={icon} size={5} />
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wide">Màu Sắc</label>
                                        <div className="flex flex-wrap gap-2">
                                            {COLORS.map(color => (
                                                <button 
                                                    key={color}
                                                    onClick={() => updateEditingCard({ iconColor: color })}
                                                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all bg-${color}-100 text-${color}-600 dark:bg-${color}-500/20 dark:text-${color}-400 ${editingCard.iconColor === color ? 'ring-2 ring-offset-2 ring-indigo-500 scale-110 drop-shadow-md' : 'hover:scale-105'}`}
                                                >
                                                    <Icon name="palette" size={4} />
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-emerald-50/50 dark:bg-emerald-900/10 p-4 rounded-xl border border-emerald-200 dark:border-emerald-800/30">
                                    <label className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={editingCard.hasTarget}
                                            onChange={(e) => updateEditingCard({ hasTarget: e.target.checked, targetType: e.target.checked ? 'custom' : 'none', customTargetValue: editingCard.customTargetValue || 0 })}
                                            className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                        />
                                        Kích hoạt Mục tiêu tháng (Target)
                                    </label>
                                    
                                    {editingCard.hasTarget && (
                                        <div className="mt-3 animate-fade-in pl-6 border-l-2 border-emerald-200 dark:border-emerald-800/50 ml-1.5">
                                            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Chỉ tiêu Cố định ({editingCard.format === 'percentage' ? '%' : 'Con số VNĐ/Số lượng'})</label>
                                            <input 
                                                type="number"
                                                value={editingCard.customTargetValue ?? ''}
                                                onChange={(e) => updateEditingCard({ customTargetValue: e.target.value ? Number(e.target.value) : undefined })}
                                                placeholder={editingCard.format === 'percentage' ? "Ví dụ: 80" : "Ví dụ: 10000000"}
                                                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-2 rounded-lg text-sm focus:ring-1 focus:ring-indigo-500"
                                            />
                                            <p className="text-[10px] text-slate-400 mt-1.5 font-medium leading-relaxed">Giúp thẻ tự động hiển thị thanh tiến độ, đồng thời tự động tính % đạt và đổi màu Xanh/Đỏ trạng thái trên bảng KPI.</p>
                                        </div>
                                    )}
                                </div>

                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400">
                                <Icon name="layout-template" size={16} className="mb-4 opacity-20" />
                                <p>Bấm vào một thẻ bên trái để tùy chỉnh giao diện và dữ liệu</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 flex justify-end gap-3 rounded-b-2xl">
                <button onClick={onClose} className="px-5 py-2 font-medium text-slate-600 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-600 transition-colors shadow-sm">
                    Hủy bỏ
                </button>
                <button onClick={handleSave} className="px-6 py-2 font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-all shadow-sm shadow-indigo-600/20 hover:shadow-md hover:shadow-indigo-600/30 flex items-center gap-2">
                    <Icon name="save" size={4.5} /> Lưu Cấu Hình
                </button>
            </div>
        </ModalWrapper>
    );
};

export default KpiCardConfigModal;
