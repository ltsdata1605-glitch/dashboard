
import React, { useState, useRef, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import type { WarehouseColumnConfig, WarehouseCategoryType, WarehouseMetricType } from '../../types';
import ModalWrapper from '../modals/ModalWrapper';
import { Icon } from '../common/Icon';
import SearchableSelect from '../common/SearchableSelect';
import { WAREHOUSE_METRIC_TYPE_MAP, DEFAULT_WAREHOUSE_COLUMNS } from '../../constants';
import ColumnConfigModal from '../employees/modals/ColumnConfigModal';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    columns: WarehouseColumnConfig[];
    onSave: (newColumns: WarehouseColumnConfig[]) => void;
    allIndustries: string[];
    allGroups: string[];
    allManufacturers: string[];
}

const WarehouseSettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, columns, onSave, allIndustries, allGroups, allManufacturers }) => {
    const [internalColumns, setInternalColumns] = useState<WarehouseColumnConfig[]>([]);
    const [view, setView] = useState<'picker' | 'form'>('picker');
    
    // Form state
    const [editingColumn, setEditingColumn] = useState<WarehouseColumnConfig | null>(null);
    const [mainHeader, setMainHeader] = useState('');
    const [subHeader, setSubHeader] = useState('');
    const [categoryType, setCategoryType] = useState<WarehouseCategoryType>('industry');
    const [categoryName, setCategoryName] = useState('');
    const [manufacturerName, setManufacturerName] = useState('');
    const [productCodesInput, setProductCodesInput] = useState<string>('');
    const [metricType, setMetricType] = useState<WarehouseMetricType>('quantity');
    
    const mainHeaderInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            const sortedColumns = [...columns].sort((a, b) => a.order - b.order);
            setInternalColumns(sortedColumns);
            setView('picker');
            resetForm(false);
        }
    }, [isOpen, columns]);
    
    useEffect(() => {
        if (view === 'form' && editingColumn === null) {
            mainHeaderInputRef.current?.focus();
        }
    }, [view, editingColumn]);

    const groupedColumns = useMemo(() => {
        return internalColumns.reduce<Record<string, WarehouseColumnConfig[]>>((acc, col) => {
            const key = col.mainHeader || 'Khác';
            if (!acc[key]) {
                acc[key] = [];
            }
            acc[key].push(col);
            return acc;
        }, {});
    }, [internalColumns]);

    const groupOrder = useMemo(() => {
        const groups: string[] = [];
        internalColumns.forEach(col => {
            const key = col.mainHeader || 'Khác';
            if (!groups.includes(key)) {
                groups.push(key);
            }
        });
        return groups;
    }, [internalColumns]);

    const handleMoveGroup = (groupName: string, direction: 'up' | 'down') => {
        const groups = [...groupOrder];
        const index = groups.indexOf(groupName);
        if (index < 0) return;
        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === groups.length - 1) return;

        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        const temp = groups[index];
        groups[index] = groups[targetIndex];
        groups[targetIndex] = temp;

        const newColumns: WarehouseColumnConfig[] = [];
        groups.forEach(group => {
            const colsInGroup = internalColumns.filter(c => (c.mainHeader || 'Khác') === group);
            newColumns.push(...colsInGroup);
        });

        const reorderedColumns = newColumns.map((c, i) => ({ ...c, order: i }));
        setInternalColumns(reorderedColumns);
    };

    const handleSwapGroups = (source: string, target: string) => {
        const groups = [...groupOrder];
        const sourceIndex = groups.indexOf(source);
        const targetIndex = groups.indexOf(target);
        if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return;

        // Remove source and insert at target position
        groups.splice(sourceIndex, 1);
        groups.splice(targetIndex, 0, source);

        const newColumns: WarehouseColumnConfig[] = [];
        groups.forEach(group => {
            const colsInGroup = internalColumns.filter(c => (c.mainHeader || 'Khác') === group);
            newColumns.push(...colsInGroup);
        });

        const reorderedColumns = newColumns.map((c, i) => ({ ...c, order: i }));
        setInternalColumns(reorderedColumns);
    };

    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, groupName: string) => {
        e.dataTransfer.setData('text/plain', groupName);
        e.dataTransfer.effectAllowed = 'move';
        // Add a slight delay to allow the drag image to be captured before reducing opacity
        setTimeout(() => e.target && (e.target as HTMLElement).classList.add('opacity-40'), 0);
    };

    const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
        e.currentTarget.classList.remove('opacity-40');
        e.currentTarget.classList.remove('scale-[1.02]');
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.currentTarget.classList.add('scale-[1.02]');
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.currentTarget.classList.remove('scale-[1.02]');
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetGroupName: string) => {
        e.preventDefault();
        e.currentTarget.classList.remove('scale-[1.02]');
        const sourceGroupName = e.dataTransfer.getData('text/plain');
        if (sourceGroupName && sourceGroupName !== targetGroupName) {
            handleSwapGroups(sourceGroupName, targetGroupName);
        }
    };

    const resetForm = (switchToPicker = true) => {
        setEditingColumn(null);
        setMainHeader(''); setSubHeader(''); setCategoryType('industry');
        setCategoryName(''); setManufacturerName(''); setMetricType('quantity');
        setProductCodesInput('');
        if (switchToPicker) {
            setView('picker');
        }
    };

    const handleEdit = (column: WarehouseColumnConfig) => {
        setEditingColumn(column);
        setMainHeader(column.mainHeader);
        setSubHeader(column.subHeader);
        setCategoryType(column.categoryType || 'industry');
        setCategoryName(column.categoryName || '');
        setManufacturerName(column.manufacturerName || '');
        setProductCodesInput(column.productCodes?.join(', ') || '');
        setMetricType(column.metricType || 'quantity');
        setView('form');
    };
    
    const handleSaveAndClose = () => {
        const groups = [...groupOrder];
        const newColumns: WarehouseColumnConfig[] = [];
        groups.forEach(group => {
            const colsInGroup = internalColumns.filter(c => (c.mainHeader || 'Khác') === group);
            newColumns.push(...colsInGroup);
        });

        const reorderedColumns = newColumns.map((c, i) => ({ ...c, order: i }));
        onSave(reorderedColumns);
        onClose();
    };

    const handleToggleVisibility = (id: string) => {
        setInternalColumns(prev => prev.map(c => c.id === id ? { ...c, isVisible: !c.isVisible } : c));
    };

    const handleDelete = (id: string) => {
        setInternalColumns(prev => prev.filter(c => c.id !== id));
    };
    
    const handleDeleteGroup = (groupName: string) => {
        setInternalColumns(prev => prev.filter(c => c.mainHeader !== groupName));
    };

    const handleToggleGroupVisibility = (mainHeader: string, shouldBeVisible: boolean) => {
        setInternalColumns(prev => prev.map(c => c.mainHeader === mainHeader ? { ...c, isVisible: shouldBeVisible } : c));
    };
    
    const handleSaveColumn = (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!subHeader.trim()) {
            toast.error('Vui lòng điền Tiêu đề phụ (Tên cột).');
            return;
        }

        const productCodes = productCodesInput.split(/[,;\n]+/).map(code => code.trim()).filter(Boolean);

        const newColumnData = {
            mainHeader: mainHeader.trim(), subHeader: subHeader.trim(), categoryType, 
            categoryName: categoryName || undefined, 
            manufacturerName: manufacturerName || undefined, 
            productCodes: productCodes.length > 0 ? productCodes : undefined,
            metricType 
        };

        if (editingColumn) {
            setInternalColumns(prev => prev.map(col => col.id === editingColumn.id ? { ...col, ...newColumnData } : col));
        } else {
            const newColumn: WarehouseColumnConfig = {
                id: `custom_${Date.now()}`,
                order: internalColumns.length, isVisible: true, isCustom: true,
                ...newColumnData
            };
            setInternalColumns(prev => [...prev, newColumn]);
        }
        resetForm();
    };
    
    const handleSelectAll = (select: boolean) => {
        setInternalColumns(prev => prev.map(c => ({...c, isVisible: select})));
    };

    const handleRestoreDefaults = () => {
        setInternalColumns([...DEFAULT_WAREHOUSE_COLUMNS]);
        resetForm();
    };

    const groupColorMap: Record<string, { bg: string, text: string, indicator: string, border: string }> = {
        'Doanh Thu': { bg: 'bg-sky-50/30 dark:bg-sky-900/10', text: 'text-sky-600 dark:text-sky-400', indicator: 'bg-sky-500', border: 'border-sky-200 dark:border-sky-800' },
        'SP CHÍNH': { bg: 'bg-emerald-50/30 dark:bg-emerald-900/10', text: 'text-emerald-600 dark:text-emerald-400', indicator: 'bg-emerald-500', border: 'border-emerald-200 dark:border-emerald-800' },
        'MÙA VỤ': { bg: 'bg-orange-50/30 dark:bg-orange-900/10', text: 'text-orange-600 dark:text-orange-400', indicator: 'bg-orange-500', border: 'border-orange-200 dark:border-orange-800' },
        'TRAFFIC': { bg: 'bg-slate-50/30 dark:bg-slate-900/10', text: 'text-slate-600 dark:text-slate-400', indicator: 'bg-slate-500', border: 'border-slate-200 dark:border-slate-800' },
        'SL PHỤ KIỆN': { bg: 'bg-purple-50/30 dark:bg-purple-900/10', text: 'text-purple-600 dark:text-purple-400', indicator: 'bg-purple-500', border: 'border-purple-200 dark:border-purple-800' },
        'DỊCH VỤ': { bg: 'bg-fuchsia-50/30 dark:bg-fuchsia-900/10', text: 'text-fuchsia-600 dark:text-fuchsia-400', indicator: 'bg-fuchsia-500', border: 'border-fuchsia-200 dark:border-fuchsia-800' },
        'SL GIA DỤNG': { bg: 'bg-amber-50/30 dark:bg-amber-900/10', text: 'text-amber-600 dark:text-amber-400', indicator: 'bg-amber-500', border: 'border-amber-200 dark:border-amber-800' },
        'DEFAULT': { bg: 'bg-slate-50/30 dark:bg-slate-800/20', text: 'text-slate-600 dark:text-slate-400', indicator: 'bg-slate-500', border: 'border-slate-200 dark:border-slate-700' },
    };

    const itemPastelColors = [
        { bg: 'bg-blue-50/50 dark:bg-blue-900/10', border: 'border-blue-200 dark:border-blue-800', text: 'text-blue-700 dark:text-blue-300', dot: 'bg-blue-400' },
        { bg: 'bg-emerald-50/50 dark:bg-emerald-900/10', border: 'border-emerald-200 dark:border-emerald-800', text: 'text-emerald-700 dark:text-emerald-300', dot: 'bg-emerald-400' },
        { bg: 'bg-violet-50/50 dark:bg-violet-900/10', border: 'border-violet-200 dark:border-violet-800', text: 'text-violet-700 dark:text-violet-300', dot: 'bg-violet-400' },
        { bg: 'bg-amber-50/50 dark:bg-amber-900/10', border: 'border-amber-200 dark:border-amber-800', text: 'text-amber-700 dark:text-amber-300', dot: 'bg-amber-400' },
        { bg: 'bg-pink-50/50 dark:bg-pink-900/10', border: 'border-pink-200 dark:border-pink-800', text: 'text-pink-700 dark:text-pink-300', dot: 'bg-pink-400' },
        { bg: 'bg-cyan-50/50 dark:bg-cyan-900/10', border: 'border-cyan-200 dark:border-cyan-800', text: 'text-cyan-700 dark:text-cyan-300', dot: 'bg-cyan-400' },
        { bg: 'bg-rose-50/50 dark:bg-rose-900/10', border: 'border-rose-200 dark:border-rose-800', text: 'text-rose-700 dark:text-rose-300', dot: 'bg-rose-400' },
        { bg: 'bg-orange-50/50 dark:bg-orange-900/10', border: 'border-orange-200 dark:border-orange-800', text: 'text-orange-700 dark:text-orange-300', dot: 'bg-orange-400' }
    ];

    const renderPickerView = () => (
        <>
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 pb-4 z-20">
                <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Thao tác nhanh:</span>
                    <div className="flex items-center gap-1 bg-slate-100/50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1 rounded-md">
                        <button onClick={() => handleSelectAll(true)} className="px-3 py-1.5 text-xs font-medium text-emerald-600 hover:bg-white dark:hover:bg-slate-800 hover:shadow-sm rounded transition-all flex items-center gap-1">
                            <Icon name="check-square" size={3.5} /> Bật tất cả
                        </button>
                        <button onClick={() => handleSelectAll(false)} className="px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-white dark:hover:bg-slate-800 hover:shadow-sm rounded transition-all flex items-center gap-1">
                            <Icon name="square" size={3.5} /> Tắt tất cả
                        </button>
                    </div>
                </div>
                 <button onClick={() => { resetForm(false); setView('form'); }} className="flex items-center justify-center gap-2 px-4 py-2 rounded-md shadow-none border border-sky-600 text-sm font-semibold text-white bg-sky-600 hover:bg-sky-700 transition-all">
                    <Icon name="plus" size={4} /> Tạo Cột Mới
                </button>
            </div>
            
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 pb-4 sm:pb-6">
                 {groupOrder.map((mainHeader, groupIndex) => {
                    const cols = groupedColumns[mainHeader] || [];
                    if (cols.length === 0) return null;
                    const visibleCount = cols.filter(c => c.isVisible).length;
                    const isCustomGroup = cols.every(c => c.isCustom);
                    const styles = groupColorMap[mainHeader] || groupColorMap.DEFAULT;

                    return (
                        <div 
                            key={mainHeader} 
                            draggable
                            onDragStart={(e) => handleDragStart(e, mainHeader)}
                            onDragEnd={handleDragEnd}
                            onDragOver={handleDragOver}
                            onDragEnter={handleDragEnter}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, mainHeader)}
                            className={`group relative flex flex-col h-full bg-white dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-800 hover:border-sky-300 transition-all duration-300 cursor-grab active:cursor-grabbing overflow-hidden`}
                        >
                            {/* Header Group */}
                            <div className={`px-3 py-2 flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pointer-events-none`}>
                                <div className="flex flex-col">
                                    <h4 className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider ${styles.text} flex items-center gap-1 sm:gap-2`}>
                                        <Icon name="layers" size={3} className="opacity-70 sm:hidden" /><Icon name="layers" size={3.5} className="opacity-70 hidden sm:block" />
                                        {mainHeader}
                                    </h4>
                                    <span className="text-[10px] font-medium text-slate-500 mt-1">
                                        Hiển thị {visibleCount}/{cols.length} cột
                                    </span>
                                </div>
                                <div className="flex items-center gap-1.5 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-all duration-300 transform translate-x-0 lg:translate-x-2 lg:group-hover:translate-x-0 pointer-events-auto">
                                    <div className="text-slate-400 p-1.5 cursor-grab hover:text-slate-600 dark:hover:text-slate-300" title="Giữ và kéo để di chuyển nhóm"><Icon name="grip-horizontal" size={4} /></div>
                                    <div className="w-px h-4 bg-slate-300 dark:bg-slate-600 mx-1"></div>
                                    <button onClick={() => handleToggleGroupVisibility(mainHeader, true)} title="Hiện tất cả trong nhóm" className="p-1.5 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg transition-colors"><Icon name="eye" size={4}/></button>
                                    <button onClick={() => handleToggleGroupVisibility(mainHeader, false)} title="Ẩn tất cả trong nhóm" className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"><Icon name="eye-off" size={4}/></button>
                                    {isCustomGroup && (
                                        <button onClick={() => handleDeleteGroup(mainHeader)} title="Xóa toàn bộ nhóm" className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors ml-1"><Icon name="trash-2" size={4}/></button>
                                    )}
                                </div>
                            </div>
                            
                            {/* Columns List */}
                            <div className="p-2 flex flex-wrap content-start gap-1.5 flex-grow">
                                {cols.map((col, colIndex) => {
                                    const itemStyle = itemPastelColors[colIndex % itemPastelColors.length];
                                    return (
                                    <div 
                                        key={col.id} 
                                        className={`relative group/item inline-flex items-center gap-1.5 pl-2 pr-1.5 py-1 rounded-sm text-[10px] font-semibold transition-all cursor-pointer select-none border
                                            ${col.isVisible 
                                                ? `${itemStyle.bg} border-transparent ${itemStyle.text}` 
                                                : 'bg-white text-slate-400 border-slate-200 dark:bg-slate-800 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                                            }`}
                                        onClick={() => handleToggleVisibility(col.id)}
                                    >
                                        <div className={`w-1.5 h-1.5 rounded-full transition-colors ${col.isVisible ? itemStyle.dot : 'bg-slate-300 dark:bg-slate-600'}`}></div>
                                        <span className="truncate max-w-[80px] sm:max-w-[130px]">{col.subHeader}</span>
                                        
                                        <div className="flex items-center ml-0.5 border-l border-black/10 dark:border-white/10 opacity-100 lg:opacity-0 lg:group-hover/item:opacity-100 transition-opacity pl-1">
                                            <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleEdit(col); }} className="p-1.5 opacity-70 hover:opacity-100 transition-opacity" title="Chỉnh sửa"><Icon name="edit-3" size={3.5} /></button>
                                            {col.isCustom ? (
                                                <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete(col.id); }} className="p-1.5 text-rose-500 hover:text-rose-600 transition-colors" title="Xóa cột"><Icon name="trash-2" size={3.5} /></button>
                                            ) : (
                                                <div className="w-[20px]"></div> /* Placeholder for alignment */
                                            )}
                                        </div>
                                    </div>
                                    );
                                })}
                            </div>
                        </div>
                    )
                })}
            </div>
        </>
    );
    
    const existingGroups = useMemo(() => {
        const groups = new Set<string>();
        internalColumns.forEach(col => {
            if (col.mainHeader) groups.add(col.mainHeader);
        });
        return Array.from(groups).sort();
    }, [internalColumns]);

    return (
        <ModalWrapper 
            isOpen={isOpen} 
            onClose={onClose} 
            title="Cấu Hình Cột Báo Cáo" 
            subTitle="Tùy chỉnh hiển thị dữ liệu kho" 
            titleColorClass="text-slate-800 dark:text-white" 
            maxWidthClass="max-w-4xl"
        >
            <div className="flex flex-col h-[85vh] sm:h-auto min-h-0 bg-white dark:bg-slate-900">
                {view === 'picker' && (
                    <div className="flex-grow overflow-y-auto custom-scrollbar p-5 sm:p-6 space-y-6 min-h-0">
                        {renderPickerView()}
                    </div>
                )}
                
                {view === 'form' && (
                    <ColumnConfigModal
                        isOpen={true}
                        onClose={() => { setView('picker'); setEditingColumn(null); }}
                        allIndustries={allIndustries}
                        allSubgroups={allGroups} // Warehouse "groups" acts as subgroups
                        allManufacturers={allManufacturers}
                        existingColumns={internalColumns.map(c => ({
                            id: c.id, mainHeader: c.mainHeader, columnName: c.subHeader, type: c.type || 'data'
                        })) as import('../../types').ColumnConfig[]}
                        editingColumn={editingColumn ? {
                            id: editingColumn.id,
                            mainHeader: editingColumn.mainHeader,
                            columnName: editingColumn.subHeader,
                            type: editingColumn.type || 'data',
                            metricType: editingColumn.metricType as any,
                            filters: editingColumn.filters || ((editingColumn.categoryType && editingColumn.categoryName) || editingColumn.productCodes || editingColumn.manufacturerName ? {
                                selectedIndustries: editingColumn.categoryType === 'industry' && editingColumn.categoryName ? [editingColumn.categoryName] : [],
                                selectedSubgroups: editingColumn.categoryType === 'group' && editingColumn.categoryName ? [editingColumn.categoryName] : [],
                                selectedManufacturers: editingColumn.manufacturerName ? [editingColumn.manufacturerName] : [],
                                productCodes: editingColumn.productCodes || []
                            } : undefined),
                            operation: editingColumn.operation,
                            operand1_columnId: editingColumn.operand1_columnId,
                            operand2_columnId: editingColumn.operand2_columnId,
                            displayAs: editingColumn.displayAs,
                            decimalPlaces: editingColumn.decimalPlaces,
                            targetValue: editingColumn.targetValue,
                            conditionalFormatting: editingColumn.conditionalFormatting,
                            headerColor: editingColumn.headerColor
                        } as import('../../types').ColumnConfig : undefined}
                        onSave={(newColumn) => {
                            const mappedColumn: WarehouseColumnConfig = {
                                id: newColumn.id,
                                order: editingColumn ? editingColumn.order : internalColumns.length,
                                isVisible: true,
                                isCustom: true,
                                mainHeader: newColumn.mainHeader,
                                subHeader: newColumn.columnName,
                                type: newColumn.type,
                                metricType: newColumn.metricType as WarehouseMetricType,
                                filters: newColumn.filters,
                                operation: newColumn.operation,
                                operand1_columnId: newColumn.operand1_columnId,
                                operand2_columnId: newColumn.operand2_columnId,
                                displayAs: newColumn.displayAs,
                                decimalPlaces: newColumn.decimalPlaces,
                                targetValue: newColumn.targetValue,
                                conditionalFormatting: newColumn.conditionalFormatting,
                                headerColor: newColumn.headerColor
                            };
                            
                            if (editingColumn) {
                                setInternalColumns(prev => prev.map(col => col.id === editingColumn.id ? mappedColumn : col));
                            } else {
                                setInternalColumns(prev => [...prev, mappedColumn]);
                            }
                            setView('picker');
                            setEditingColumn(null);
                        }}
                    />
                )}
                
                {view === 'picker' && (
                    <div className="p-4 sm:px-6 sm:py-4 flex items-center justify-between bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 z-20 rounded-b-md">
                        <button onClick={handleRestoreDefaults} className="py-2 px-3 rounded-md text-sm font-medium text-rose-500 hover:bg-rose-50 border border-transparent hover:border-rose-100 transition-colors flex items-center gap-2">
                            <Icon name="rotate-ccw" size={3.5} className="sm:hidden" /><Icon name="rotate-ccw" size={4} className="hidden sm:block" /> Khôi phục mặc định
                        </button>
                        <button onClick={handleSaveAndClose} className="py-1.5 sm:py-2.5 px-5 sm:px-8 rounded-lg sm:rounded-lg shadow-md text-[10px] sm:text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-all hover:-translate-y-0.5 active:translate-y-0 focus:ring-4 focus:ring-indigo-500/30 flex items-center gap-1 sm:gap-2">
                            Hoàn tất <Icon name="check" size={3.5} className="ml-0.5 sm:hidden"/><Icon name="check" size={4} className="ml-1 hidden sm:block"/>
                        </button>
                    </div>
                )}
            </div>
        </ModalWrapper>
    );
};

export default WarehouseSettingsModal;
