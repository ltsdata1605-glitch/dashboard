
import React, { useState, useRef, useEffect, useMemo } from 'react';
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
        const reorderedColumns = internalColumns.map((c, i) => ({ ...c, order: i }));
        onSave(reorderedColumns);
        onClose();
    };

    const handleToggleVisibility = (id: string) => {
        setInternalColumns(prev => prev.map(c => c.id === id ? { ...c, isVisible: !c.isVisible } : c));
    };

    const handleDelete = (id: string) => {
        if (window.confirm('Bạn có chắc chắn muốn xóa cột tùy chỉnh này?')) {
            setInternalColumns(prev => prev.filter(c => c.id !== id));
        }
    };
    
    const handleDeleteGroup = (groupName: string) => {
        if (window.confirm(`Bạn có chắc chắn muốn xóa nhóm "${groupName}" và tất cả các cột bên trong?`)) {
            setInternalColumns(prev => prev.filter(c => c.mainHeader !== groupName));
        }
    };

    const handleToggleGroupVisibility = (mainHeader: string, shouldBeVisible: boolean) => {
        setInternalColumns(prev => prev.map(c => c.mainHeader === mainHeader ? { ...c, isVisible: shouldBeVisible } : c));
    };
    
    const handleSaveColumn = (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!mainHeader.trim() || !subHeader.trim()) {
            alert('Vui lòng điền đầy đủ Tiêu đề chính và Tiêu đề phụ.');
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
        if (window.confirm('Thao tác này sẽ xóa tất cả các tùy chỉnh và khôi phục lại bố cục cột mặc định. Bạn có chắc chắn?')) {
            setInternalColumns([...DEFAULT_WAREHOUSE_COLUMNS]);
            resetForm();
        }
    };

    const groupColorMap: Record<string, { bg: string, text: string, indicator: string, border: string }> = {
        'Doanh Thu': { bg: 'bg-blue-50/30 dark:bg-blue-900/10', text: 'text-blue-600 dark:text-blue-400', indicator: 'bg-blue-500', border: 'border-blue-200 dark:border-blue-800' },
        'TRAFFIC & TỶ LỆ TC/DT': { bg: 'bg-cyan-50/30 dark:bg-cyan-900/10', text: 'text-cyan-600 dark:text-cyan-400', indicator: 'bg-cyan-500', border: 'border-cyan-200 dark:border-cyan-800' },
        'S.PHẨM CHÍNH': { bg: 'bg-emerald-50/30 dark:bg-emerald-900/10', text: 'text-emerald-600 dark:text-emerald-400', indicator: 'bg-emerald-500', border: 'border-emerald-200 dark:border-emerald-800' },
        'SL BÁN KÈM': { bg: 'bg-violet-50/30 dark:bg-violet-900/10', text: 'text-violet-600 dark:text-violet-400', indicator: 'bg-violet-500', border: 'border-violet-200 dark:border-violet-800' },
        'DT THỰC NGÀNH HÀNG': { bg: 'bg-purple-50/30 dark:bg-purple-900/10', text: 'text-purple-600 dark:text-purple-400', indicator: 'bg-purple-500', border: 'border-purple-200 dark:border-purple-800' },
        'Phụ Kiện': { bg: 'bg-amber-50/30 dark:bg-amber-900/10', text: 'text-amber-600 dark:text-amber-400', indicator: 'bg-amber-500', border: 'border-amber-200 dark:border-amber-800' },
        'Gia Dụng': { bg: 'bg-orange-50/30 dark:bg-orange-900/10', text: 'text-orange-600 dark:text-orange-400', indicator: 'bg-orange-500', border: 'border-orange-200 dark:border-orange-800' },
        'DEFAULT': { bg: 'bg-slate-50/30 dark:bg-slate-800/20', text: 'text-slate-600 dark:text-slate-400', indicator: 'bg-slate-500', border: 'border-slate-200 dark:border-slate-700' },
    };

    const renderPickerView = () => (
        <>
            <div className="flex items-center justify-between gap-3 mb-6 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm z-20">
                <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Thao tác nhanh:</span>
                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900/50 p-1 rounded-lg">
                        <button onClick={() => handleSelectAll(true)} className="px-3 py-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-white dark:hover:bg-slate-800 rounded-md transition-all shadow-sm flex items-center gap-1.5">
                            <Icon name="check-square" size={3.5} /> Bật tất cả
                        </button>
                        <button onClick={() => handleSelectAll(false)} className="px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-white dark:hover:bg-slate-800 rounded-md transition-all flex items-center gap-1.5">
                            <Icon name="square" size={3.5} /> Tắt tất cả
                        </button>
                    </div>
                </div>
                 <button onClick={() => { resetForm(false); setView('form'); }} className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl shadow-md text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-all hover:-translate-y-0.5 active:translate-y-0 focus:ring-4 focus:ring-indigo-500/30">
                    <Icon name="plus" size={4} /> Tạo Cột Mới
                </button>
            </div>
            
             <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pb-6">
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
                            className={`group relative flex flex-col h-full bg-white dark:bg-slate-800 rounded-xl border ${styles.border} shadow-sm hover:shadow-md transition-all duration-300 cursor-grab active:cursor-grabbing overflow-hidden`}
                        >
                            {/* Header Group */}
                            <div className={`px-5 py-3.5 flex justify-between items-center border-b ${styles.border} ${styles.bg} pointer-events-none`}>
                                <div className="flex flex-col">
                                    <h4 className={`text-xs font-bold uppercase tracking-wider ${styles.text} flex items-center gap-2`}>
                                        <Icon name="layers" size={3.5} className="opacity-70" />
                                        {mainHeader}
                                    </h4>
                                    <span className="text-[10px] font-medium text-slate-500 mt-1">
                                        Hiển thị {visibleCount}/{cols.length} cột
                                    </span>
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0 pointer-events-auto">
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
                            <div className="p-3 flex flex-wrap content-start gap-1.5 flex-grow">
                                {cols.map(col => (
                                    <div 
                                        key={col.id} 
                                        className={`relative group/item inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer select-none border
                                            ${col.isVisible 
                                                ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 shadow-[0_1px_2px_rgba(0,0,0,0.05)]' 
                                                : 'bg-slate-50/50 dark:bg-slate-800/30 border-transparent text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
                                            }`}
                                        onClick={() => handleToggleVisibility(col.id)}
                                    >
                                        <div className={`w-1.5 h-1.5 rounded-full transition-colors ${col.isVisible ? styles.indicator : 'bg-slate-300 dark:bg-slate-600'}`}></div>
                                        <span className="truncate max-w-[130px]">{col.subHeader}</span>
                                        
                                        <div className="flex items-center ml-0.5 pl-1.5 border-l border-slate-200 dark:border-slate-700/50 opacity-0 group-hover/item:opacity-100 transition-opacity">
                                            <button onClick={(e) => { e.stopPropagation(); handleEdit(col); }} className="p-0.5 text-slate-400 hover:text-blue-600 rounded transition-colors" title="Chỉnh sửa"><Icon name="edit-3" size={3} /></button>
                                            {col.isCustom ? (
                                                <button onClick={(e) => { e.stopPropagation(); handleDelete(col.id); }} className="p-0.5 text-slate-400 hover:text-rose-600 rounded transition-colors" title="Xóa cột"><Icon name="trash-2" size={3} /></button>
                                            ) : (
                                                <div className="w-[18px]"></div> /* Placeholder for alignment */
                                            )}
                                        </div>
                                    </div>
                                ))}
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
            <div className="flex flex-col h-[85vh] sm:h-auto min-h-0 bg-slate-50 dark:bg-slate-900/50">
                {view === 'picker' && (
                    <div className="flex-grow overflow-y-auto custom-scrollbar p-5 sm:p-6 space-y-6 sm:space-y-8 min-h-0">
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
                    <div className="p-4 sm:px-6 sm:py-5 flex items-center justify-between bg-white dark:bg-slate-800 rounded-b-xl border-t border-slate-200 dark:border-slate-700 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-20">
                        <button onClick={handleRestoreDefaults} className="py-2.5 px-4 rounded-xl text-sm font-bold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-colors flex items-center gap-2">
                            <Icon name="rotate-ccw" size={4} /> Khôi phục mặc định
                        </button>
                        <button onClick={handleSaveAndClose} className="py-2.5 px-8 rounded-xl shadow-md text-sm font-black text-white bg-indigo-600 hover:bg-indigo-700 transition-all hover:-translate-y-0.5 active:translate-y-0 focus:ring-4 focus:ring-indigo-500/30 flex items-center gap-2">
                            Hoàn tất <Icon name="check" size={4} className="ml-1"/>
                        </button>
                    </div>
                )}
            </div>
        </ModalWrapper>
    );
};

export default WarehouseSettingsModal;
