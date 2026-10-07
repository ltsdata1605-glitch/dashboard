
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { AppIcon } from '../shared/ui/icon/AppIcon';
import toast from 'react-hot-toast';
import type { WarehouseColumnConfig, WarehouseCategoryType, WarehouseMetricType } from '../../types';
import { Modal } from '../shared/ui/Modal';
import SearchableSelect from '../common/SearchableSelect';
import { WAREHOUSE_METRIC_TYPE_MAP, DEFAULT_WAREHOUSE_COLUMNS } from '../../constants';
import ColumnConfigModal from '../employees/modals/ColumnConfigModal';
import { Button } from '../shared/ui/Button';

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
        'Doanh Thu': { bg: 'bg-sky-50/30 dark:bg-sky-900/10', text: 'text-sky-700 dark:text-sky-400', indicator: 'bg-sky-500', border: 'border-sky-200 dark:border-sky-800' },
        'SP CHÍNH': { bg: 'bg-emerald-50/30 dark:bg-emerald-900/10', text: 'text-emerald-700 dark:text-emerald-400', indicator: 'bg-emerald-500', border: 'border-emerald-200 dark:border-emerald-800' },
        'MÙA VỤ': { bg: 'bg-amber-50/30 dark:bg-amber-900/10', text: 'text-amber-700 dark:text-amber-400', indicator: 'bg-amber-500', border: 'border-amber-200 dark:border-amber-800' },
        'TRAFFIC': { bg: 'bg-slate-50/30 dark:bg-slate-900/10', text: 'text-slate-600 dark:text-slate-400', indicator: 'bg-slate-500', border: 'border-slate-200 dark:border-slate-800' },
        'SL PHỤ KIỆN': { bg: 'bg-sky-50/30 dark:bg-sky-900/10', text: 'text-sky-700 dark:text-sky-400', indicator: 'bg-sky-500', border: 'border-sky-200 dark:border-sky-800' },
        'SL DỊCH VỤ': { bg: 'bg-rose-50/30 dark:bg-rose-900/10', text: 'text-rose-700 dark:text-rose-400', indicator: 'bg-rose-500', border: 'border-rose-200 dark:border-rose-800' },
        'SL GIA DỤNG': { bg: 'bg-amber-50/30 dark:bg-amber-900/10', text: 'text-amber-700 dark:text-amber-400', indicator: 'bg-amber-500', border: 'border-amber-200 dark:border-amber-800' },
        'BẢO HIỂM ALL': { bg: 'bg-sky-50/30 dark:bg-sky-900/10', text: 'text-sky-700 dark:text-sky-400', indicator: 'bg-sky-500', border: 'border-sky-200 dark:border-sky-800' },
        'BẢO HIỂM ĐỐI TÁC': { bg: 'bg-sky-50/30 dark:bg-sky-900/10', text: 'text-sky-700 dark:text-sky-400', indicator: 'bg-sky-500', border: 'border-sky-200 dark:border-sky-800' },
        'BẢO HIỂM ĐMX': { bg: 'bg-rose-50/30 dark:bg-rose-900/10', text: 'text-rose-700 dark:text-rose-400', indicator: 'bg-rose-500', border: 'border-rose-200 dark:border-rose-800' },
        'DEFAULT': { bg: 'bg-slate-50/30 dark:bg-slate-800/20', text: 'text-slate-600 dark:text-slate-400', indicator: 'bg-slate-500', border: 'border-slate-200 dark:border-slate-700' },
    };

    const renderPickerView = () => (
        <>
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 pb-4 z-20">
                <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Thao tác nhanh:</span>
                    <div className="flex items-center gap-1 bg-slate-100/50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1 rounded-md">
                        <Button variant="unstyled" size="none" onClick={() => handleSelectAll(true)} className="px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-white dark:hover:bg-slate-800 hover:shadow-sm rounded transition-all flex items-center gap-1">
                            <AppIcon name="checkboxOn" size="md" /> Bật tất cả
                        </Button>
                        <Button variant="unstyled" size="none" onClick={() => handleSelectAll(false)} className="px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-white dark:hover:bg-slate-800 hover:shadow-sm rounded transition-all flex items-center gap-1">
                            <AppIcon name="checkboxOff" size="md" /> Tắt tất cả
                        </Button>
                    </div>
                </div>
                 <Button variant="unstyled" size="none" onClick={() => { resetForm(false); setView('form'); }} className="flex items-center justify-center gap-2 px-4 py-2 rounded-md shadow-none border border-sky-600 text-sm font-semibold text-white bg-sky-600 hover:bg-sky-700 transition-all">
                    <AppIcon name="add" size="md" /> Tạo Cột Mới
                </Button>
            </div>
            
             <div className="space-y-2 pb-3">
                 {groupOrder.map((mainHeader) => {
                    const cols = groupedColumns[mainHeader] || [];
                    if (cols.length === 0) return null;
                    const visibleCount = cols.filter(c => c.isVisible).length;
                    const isCustomGroup = cols.every(c => c.isCustom);
                    const styles = groupColorMap[mainHeader] || groupColorMap.DEFAULT;
                    const allVisible = visibleCount === cols.length;

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
                            className="group/row relative flex flex-col md:flex-row md:items-center gap-2 p-2 sm:px-3 sm:py-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200/80 dark:border-slate-800 hover:border-sky-300 dark:hover:border-sky-700 hover:shadow-xs transition-all duration-200 cursor-grab active:cursor-grabbing"
                        >
                            {/* Cột trái: Tên Nhóm + Badge + Công cụ nhóm */}
                            <div className="flex items-center justify-between md:justify-start gap-2 w-full md:w-56 shrink-0">
                                <div className="flex items-center gap-1.5 min-w-0">
                                    <div className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-grab shrink-0 p-0.5" title="Giữ và kéo để đổi thứ tự nhóm">
                                        <AppIcon name="dragHandle" size="sm" />
                                    </div>
                                    <h4 className={`text-xs font-bold uppercase tracking-wider ${styles.text} truncate`}>
                                        {mainHeader}
                                    </h4>
                                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 ${allVisible ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : visibleCount > 0 ? 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300' : 'bg-slate-100 text-slate-400 dark:bg-slate-800'}`}>
                                        {visibleCount}/{cols.length}
                                    </span>
                                </div>

                                {/* Nút thao tác nhóm */}
                                <div className="flex items-center gap-0.5 shrink-0 opacity-90 md:opacity-0 md:group-hover/row:opacity-100 transition-opacity">
                                    <Button variant="unstyled" size="none" onClick={() => handleToggleGroupVisibility(mainHeader, true)} title="Hiện tất cả trong nhóm" className="relative after:absolute after:-inset-2.5 after:content-[''] lg:after:hidden p-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded transition-colors"><AppIcon name="show" size="sm" /></Button>
                                    <Button variant="unstyled" size="none" onClick={() => handleToggleGroupVisibility(mainHeader, false)} title="Ẩn tất cả trong nhóm" className="relative after:absolute after:-inset-2.5 after:content-[''] lg:after:hidden p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"><AppIcon name="hide" size="sm" /></Button>
                                    {isCustomGroup && (
                                        <Button variant="unstyled" size="none" onClick={() => handleDeleteGroup(mainHeader)} title="Xóa toàn bộ nhóm" className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded transition-colors ml-0.5"><AppIcon name="delete" size="sm" /></Button>
                                    )}
                                </div>
                            </div>

                            {/* Vách ngăn mỏng */}
                            <div className="hidden md:block w-px h-5 bg-slate-200 dark:bg-slate-700 shrink-0 mx-0.5"></div>
                            
                            {/* Cột phải: Dải Chip các cột xếp mượt mà liên tục (flex-wrap) */}
                            <div className="flex flex-wrap items-center gap-1.5 flex-grow min-w-0">
                                {cols.map((col) => {
                                    return (
                                        <div 
                                            key={col.id} 
                                            onClick={() => handleToggleVisibility(col.id)}
                                            className={`group/chip relative inline-flex items-center gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md text-[11px] font-semibold transition-all duration-150 cursor-pointer select-none border ${
                                                col.isVisible 
                                                    ? 'bg-sky-50 dark:bg-sky-950/40 text-sky-800 dark:text-sky-300 border-sky-300/80 dark:border-sky-800 shadow-2xs hover:bg-sky-100 dark:hover:bg-sky-900/50' 
                                                    : 'bg-white dark:bg-slate-800/40 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700 hover:border-slate-300 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50'
                                            }`}
                                            title={col.isVisible ? `Đang hiện: ${col.subHeader} (bấm để ẩn)` : `Đang ẩn: ${col.subHeader} (bấm để hiện)`}
                                        >
                                            <span className={`w-1.5 h-1.5 rounded-full transition-colors shrink-0 ${col.isVisible ? 'bg-sky-500 shadow-xs' : 'bg-slate-300 dark:bg-slate-600'}`}></span>
                                            <span className="truncate max-w-[120px]">{col.subHeader}</span>
                                            
                                            {/* Nút sửa & xoá chỉ hiện khi hover vào chip */}
                                            <div className="flex items-center ml-0.5 border-l border-slate-200 dark:border-slate-700 pl-1 opacity-0 group-hover/chip:opacity-100 transition-opacity">
                                                <Button variant="unstyled" size="none" onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleEdit(col); }} className="relative after:absolute after:-inset-[13px] after:content-[''] lg:after:hidden p-0.5 text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 rounded transition-colors" title="Chỉnh sửa"><AppIcon name="edit" size="xs" /></Button>
                                                {col.isCustom && (
                                                    <Button variant="unstyled" size="none" onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete(col.id); }} className="p-0.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded transition-colors" title="Xóa cột"><AppIcon name="delete" size="xs" /></Button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
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
        <Modal
            isOpen={isOpen}
            position="bottom"
            onClose={onClose}
            title="Cấu Hình Cột Báo Cáo"
            subTitle="Tùy chỉnh hiển thị dữ liệu kho"
            titleColorClass="text-slate-800 dark:text-white"
            maxWidth="xl"
            footer={view === 'picker' ? (
                <div className="flex items-center justify-between">
                    <Button type="button" variant="unstyled" size="none" onClick={handleRestoreDefaults} className="min-h-11 sm:min-h-0 py-2 px-3 rounded-md text-sm font-medium text-rose-500 hover:bg-rose-50 border border-transparent hover:border-rose-100 transition-colors flex items-center gap-2">
                        <AppIcon name="reset" size="md" /> Khôi phục mặc định
                    </Button>
                    <Button type="button" variant="unstyled" size="none" onClick={handleSaveAndClose} className="min-h-11 sm:min-h-0 py-1.5 sm:py-2.5 px-5 sm:px-8 rounded-lg sm:rounded-xl shadow-md text-[11px] sm:text-sm font-black text-white bg-sky-600 hover:bg-sky-700 transition-all hover:-translate-y-0.5 active:translate-y-0 focus:ring-4 focus:ring-sky-500/30 flex items-center gap-1 sm:gap-2">
                        Hoàn tất <AppIcon name="check" size="md" className="ml-1" />
                    </Button>
                </div>
            ) : undefined}
        >
            <div className="-m-5 flex flex-col h-[75vh] sm:h-auto min-h-0 bg-white dark:bg-slate-900">
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
                            metricType: editingColumn.metricType,
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
            </div>
        </Modal>
    );
};

export default WarehouseSettingsModal;
