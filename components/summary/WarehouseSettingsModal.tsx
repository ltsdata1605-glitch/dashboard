
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

    // Soft Apple-like Colors (Lighter backgrounds, cleaner text)
    const groupColorMap: Record<string, { bg: string, text: string, indicator: string }> = {
        'Doanh Thu': { bg: 'bg-blue-50/60 dark:bg-blue-900/10', text: 'text-blue-600 dark:text-blue-300', indicator: 'bg-blue-500' },
        'TRAFFIC & TỶ LỆ TC/DT': { bg: 'bg-cyan-50/60 dark:bg-cyan-900/10', text: 'text-cyan-600 dark:text-cyan-300', indicator: 'bg-cyan-500' },
        'S.PHẨM CHÍNH': { bg: 'bg-emerald-50/60 dark:bg-emerald-900/10', text: 'text-emerald-600 dark:text-emerald-300', indicator: 'bg-emerald-500' },
        'SL BÁN KÈM': { bg: 'bg-violet-50/60 dark:bg-violet-900/10', text: 'text-violet-600 dark:text-violet-300', indicator: 'bg-violet-500' },
        'DT THỰC NGÀNH HÀNG': { bg: 'bg-purple-50/60 dark:bg-purple-900/10', text: 'text-purple-600 dark:text-purple-300', indicator: 'bg-purple-500' },
        'Phụ Kiện': { bg: 'bg-amber-50/60 dark:bg-amber-900/10', text: 'text-amber-600 dark:text-amber-300', indicator: 'bg-amber-500' },
        'Gia Dụng': { bg: 'bg-orange-50/60 dark:bg-orange-900/10', text: 'text-orange-600 dark:text-orange-300', indicator: 'bg-orange-500' },
        'DEFAULT': { bg: 'bg-slate-50/60 dark:bg-slate-800/30', text: 'text-slate-600 dark:text-slate-300', indicator: 'bg-slate-500' },
    };

    const renderPickerView = () => (
        <>
            <div className="flex items-center justify-between gap-3 mb-6 sticky top-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl z-20 py-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                    <button onClick={() => handleSelectAll(true)} className="px-4 py-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-all shadow-sm">Hiện tất cả</button>
                    <div className="w-px h-3 bg-slate-300 dark:bg-slate-600"></div>
                    <button onClick={() => handleSelectAll(false)} className="px-4 py-1.5 text-[11px] font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-all">Ẩn tất cả</button>
                </div>
                 <button onClick={() => { resetForm(false); setView('form'); }} className="flex items-center gap-2 px-5 py-2 rounded-full text-xs font-semibold text-white bg-indigo-500 hover:bg-indigo-600 dark:bg-indigo-600 dark:hover:bg-indigo-700 transition-all shadow-md hover:shadow-lg active:scale-95">
                    <Icon name="plus" size={3.5} /> Thêm cột
                </button>
            </div>
            
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4">
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
                            className={`group relative flex flex-col h-full rounded-[1.25rem] ${styles.bg} transition-all duration-300 hover:shadow-md ring-1 ring-black/5 dark:ring-white/5 cursor-grab active:cursor-grabbing`}
                        >
                            <div className="px-4 py-3 flex justify-between items-center border-b border-white/20 dark:border-white/5 pointer-events-none">
                                <div className="flex flex-col">
                                    {/* Typography: Light & Elegant */}
                                    <h4 className={`text-[11px] font-bold uppercase tracking-wider ${styles.text} opacity-90 flex items-center gap-1.5`}>
                                        <span className="bg-white/50 dark:bg-black/20 px-1.5 py-0.5 rounded-md text-[9px]">{groupIndex + 1}</span> {mainHeader}
                                    </h4>
                                    <span className="text-[9px] font-medium text-slate-500 mt-0.5 tracking-wide">
                                        Hiển thị {visibleCount}/{cols.length}
                                    </span>
                                </div>
                                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0 pointer-events-auto">
                                    <div className="text-slate-400 p-1 cursor-grab" title="Giữ và kéo để di chuyển"><Icon name="grip-horizontal" size={3.5} /></div>
                                    <div className="w-px h-3 bg-slate-200 dark:bg-slate-700 mx-1"></div>
                                    <button onClick={() => handleToggleGroupVisibility(mainHeader, true)} title="Hiện nhóm" className="p-1.5 hover:bg-white dark:hover:bg-slate-700 text-slate-400 hover:text-emerald-500 rounded-full transition-colors"><Icon name="eye" size={3.5}/></button>
                                    <button onClick={() => handleToggleGroupVisibility(mainHeader, false)} title="Ẩn nhóm" className="p-1.5 hover:bg-white dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 rounded-full transition-colors"><Icon name="eye-off" size={3.5}/></button>
                                    {isCustomGroup && (
                                        <button onClick={() => handleDeleteGroup(mainHeader)} title="Xóa nhóm" className="p-1.5 hover:bg-white dark:hover:bg-slate-700 text-slate-400 hover:text-red-500 rounded-full transition-colors"><Icon name="trash-2" size={3.5}/></button>
                                    )}
                                </div>
                            </div>
                            
                            <div className="px-4 pb-4 pt-3 flex flex-wrap content-start gap-1.5 flex-grow">
                                {cols.map(col => (
                                    <div 
                                        key={col.id} 
                                        className={`relative group/item inline-flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-xl text-[11px] font-medium transition-all cursor-pointer select-none border
                                            ${col.isVisible 
                                                ? 'bg-white dark:bg-slate-800 border-transparent text-slate-700 dark:text-slate-200 shadow-[0_2px_8px_rgba(0,0,0,0.04)]' 
                                                : 'bg-white/40 dark:bg-slate-800/30 border-transparent text-slate-400 dark:text-slate-500'
                                            }`}
                                        onClick={() => handleToggleVisibility(col.id)}
                                    >
                                        <div className={`w-1.5 h-1.5 rounded-full transition-colors ${col.isVisible ? styles.indicator : 'bg-slate-300 dark:bg-slate-600'}`}></div>
                                        <span className="truncate max-w-[130px] tracking-tight">{col.subHeader}</span>
                                        
                                        <div className="flex items-center ml-1 pl-1 border-l border-slate-100 dark:border-slate-700 opacity-0 group-hover/item:opacity-100 transition-opacity">
                                            <button onClick={(e) => { e.stopPropagation(); handleEdit(col); }} className="p-0.5 text-slate-400 hover:text-blue-500"><Icon name="edit-3" size={3} /></button>
                                            <button onClick={(e) => { e.stopPropagation(); handleDelete(col.id); }} className="p-0.5 text-slate-400 hover:text-red-500"><Icon name="x" size={3} /></button>
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
            <div className="p-6 flex flex-col h-[80vh] max-h-[750px] bg-[#FAFAFA]/50 dark:bg-slate-950/50 backdrop-blur-3xl">
                {view === 'picker' && (
                    <div className="flex-grow overflow-y-auto custom-scrollbar px-1">
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
                            filters: editingColumn.filters || (editingColumn.productCodes ? {
                                selectedIndustries: [], selectedSubgroups: [], selectedManufacturers: [],
                                productCodes: editingColumn.productCodes
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
                    <div className="pt-6 mt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
                        <button onClick={handleRestoreDefaults} className="text-[11px] font-semibold text-red-500 hover:text-red-600 transition-colors flex items-center gap-1.5">
                            <Icon name="rotate-ccw" size={3.5} /> Khôi phục mặc định
                        </button>
                        <button onClick={handleSaveAndClose} className="px-8 py-3 rounded-full text-xs font-bold uppercase tracking-wider text-white bg-indigo-500 hover:bg-indigo-600 dark:bg-indigo-600 dark:hover:bg-indigo-700 shadow-xl transition-all hover:scale-105 active:scale-95">
                            Hoàn tất & Đóng
                        </button>
                    </div>
                )}
            </div>
        </ModalWrapper>
    );
};

export default WarehouseSettingsModal;
