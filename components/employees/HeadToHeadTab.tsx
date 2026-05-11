
import React, { useState, useMemo, forwardRef, useEffect } from 'react';
import { Icon } from '../common/Icon';
import type { DataRow, ProductConfig, Employee, HeadToHeadTableConfig } from '../../types';
import { exportElementAsImage } from '../../services/uiService';
import { getHeadToHeadCustomTables, saveHeadToHeadCustomTables } from '../../services/dbService';
import { useDashboardContext } from '../../contexts/DashboardContext';
import { getExportFilenamePrefix, getRowValue } from '../../utils/dataUtils';
import { COL } from '../../constants';
import ModalWrapper from '../modals/ModalWrapper';

// Import refactored components
import HeadToHeadTable from './head-to-head/HeadToHeadTable';
import HeadToHeadConfigModal from './head-to-head/HeadToHeadConfigModal';

interface HeadToHeadTabProps {
    baseFilteredData: DataRow[];
    productConfig: ProductConfig;
    employeeData: Employee[];
    onExport?: () => void;
    isExporting?: boolean;
    colorThemes: { header: string; row: string; border: string; }[];
}



const HeadToHeadTab = React.memo(forwardRef<HTMLDivElement, HeadToHeadTabProps>(({ onExport, isExporting, colorThemes, ...props }, ref) => {
    const { productConfig } = props;
    const [tables, setTables] = useState<HeadToHeadTableConfig[]>([]);
    const [isInitialLoad, setIsInitialLoad] = useState(true);
    const [modalState, setModalState] = useState<{ type: 'ADD' | 'EDIT' | 'DELETE' | null, data?: HeadToHeadTableConfig }>({ type: null });
    const [isBatchExporting, setIsBatchExporting] = useState(false);
    const [activeTableId, setActiveTableId] = useState<string | null>(null);
    const [includeToday, setIncludeToday] = useState(true);
    const { filterState } = useDashboardContext();
    
    const tableRefs = React.useRef<(HTMLDivElement | null)[]>([]);
    
    const allSubgroups = useMemo(() => {
        const subgroups = new Set<string>();
        Object.values(productConfig.subgroups).forEach(parent => {
            Object.keys(parent).forEach(subgroup => subgroups.add(subgroup));
        });
        return Array.from(subgroups).sort();
    }, [productConfig]);

    const allParentGroups = useMemo(() => {
        if (!productConfig) return [];
        return Array.from(new Set(Object.values(productConfig.childToParentMap))).sort();
    }, [productConfig]);

    const allManufacturers = useMemo(() => {
        const m = new Set<string>();
        props.baseFilteredData.forEach(row => {
            const hang = getRowValue(row, COL.MANUFACTURER);
            if (hang) m.add(hang);
        });
        return Array.from(m).sort();
    }, [props.baseFilteredData]);

    useEffect(() => {
        const loadTables = async () => {
            let savedTables = await getHeadToHeadCustomTables();
            if (!savedTables || savedTables.length === 0) {
                const now = Date.now();
                savedTables = [
                    { id: `h2h-default-${now}-1`, tableName: "7 NGÀY - DOANH THU", type: 'data', metricType: 'revenue', totalCalculationMethod: 'sum', filters: { selectedIndustries: [], selectedSubgroups: [], selectedManufacturers: [], productCodes: [] } },
                    { id: `h2h-default-${now}-2`, tableName: "7 NGÀY - DOANH THU QĐ", type: 'data', metricType: 'revenueQD', totalCalculationMethod: 'sum', filters: { selectedIndustries: [], selectedSubgroups: [], selectedManufacturers: [], productCodes: [] } },
                    { id: `h2h-default-${now}-3`, tableName: "7 NGÀY - HIỆU QUẢ QĐ", type: 'data', metricType: 'hieuQuaQD', totalCalculationMethod: 'average', filters: { selectedIndustries: [], selectedSubgroups: [], selectedManufacturers: [], productCodes: [] } }
                ];
            }
            setTables(savedTables);
            if (savedTables.length > 0) setActiveTableId(savedTables[0].id);
            setIsInitialLoad(false);
        };
        loadTables();
    }, []);

    useEffect(() => {
        if (!isInitialLoad) {
            saveHeadToHeadCustomTables(tables);
        }
    }, [tables, isInitialLoad]);

    const handleSave = (config: Omit<HeadToHeadTableConfig, 'id'>) => {
        if (modalState.type === 'EDIT' && modalState.data) {
            setTables(prev => prev.map(t => t.id === modalState.data!.id ? { ...t, ...config } : t));
        } else {
            const newTable: HeadToHeadTableConfig = {
                id: `h2h-${Date.now()}`, ...config,
                totalCalculationMethod: config.totalCalculationMethod || 'sum',
                conditionalFormats: config.conditionalFormats || [],
                type: config.type || 'data',
                filters: config.filters,
                targetValue: config.targetValue,
                operation: config.operation,
                operand1_tableId: config.operand1_tableId,
                operand2_tableId: config.operand2_tableId,
                displayAs: config.displayAs,
            };
            setTables(prev => [...prev, newTable]);
            setActiveTableId(newTable.id);
        }
        setModalState({ type: null });
    };

    const handleDelete = () => {
        if (modalState.type === 'DELETE' && modalState.data) {
            setTables(prev => {
                const newTables = prev.filter(t => t.id !== modalState.data!.id);
                if (activeTableId === modalState.data!.id) {
                    setActiveTableId(newTables.length > 0 ? newTables[0].id : null);
                }
                return newTables;
            });
        }
        setModalState({ type: null });
    };


    const handleBatchExport = async () => {
        const elements = document.querySelectorAll('.h2h-table-container');
        if (elements.length === 0) return;
        setIsBatchExporting(true);
        await new Promise(resolve => setTimeout(resolve, 100));

        for (let i = 0; i < tables.length; i++) {
            const tableElement = elements[i] as HTMLElement;
            const tableConfig = tables[i];
            if (tableElement && tableConfig) {
                const prefix = getExportFilenamePrefix(filterState.kho);
                const safeTabName = tableConfig.tableName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9\s]/g, '').trim().replace(/\s+/g, '-');
                await exportElementAsImage(tableElement, `${prefix}-7-ngay-${safeTabName}.png`, {
                    elementsToHide: ['.hide-on-export'],
                    isCompactTable: true,
                    fitAllColumns: true
                });
                await new Promise(resolve => setTimeout(resolve, 300));
            }
        }
        setIsBatchExporting(false);
    };

    const suggestionBoxTheme = colorThemes[4] || colorThemes[0]; // Indigo or fallback

    const activeTable = tables.find(t => t.id === activeTableId);

    return (
        <div ref={ref}>
            {/* Merged Header */}
            <div className="mb-3 sm:mb-4">
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2 sm:gap-3">
                        <div className="w-6 h-6 sm:w-10 sm:h-10 rounded-md sm:rounded-xl flex items-center justify-center shrink-0 bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400">
                            <Icon name="calendar-days" size={3.5} className="sm:hidden" />
                            <Icon name="calendar-days" size={5} className="hidden sm:block" />
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-[11px] sm:text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight truncate leading-tight">
                                {activeTable ? activeTable.tableName : '7 Ngày'}
                            </h3>
                            <p className="text-[8px] sm:text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate leading-none mt-0.5">7 ngày gần nhất</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-0.5 sm:gap-1 hide-on-export shrink-0">
                        {/* Group 1 (LEFT): CRUD actions — Add, Edit, Delete */}
                        <button onClick={() => setModalState({ type: 'ADD' })} className="p-1 sm:p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg transition-all" title="Tạo bảng 7 Ngày mới">
                            <Icon name="plus" size={3.5} className="sm:hidden" /><Icon name="plus" size={4} className="hidden sm:block" />
                        </button>
                        {activeTable && (
                            <>
                                <button onClick={() => setModalState({ type: 'EDIT', data: activeTable })} title="Sửa Bảng" className="p-1 sm:p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors">
                                    <Icon name="pencil" size={3.5} className="sm:hidden"/><Icon name="pencil" size={4} className="hidden sm:block"/>
                                </button>
                                <button onClick={() => setModalState({ type: 'DELETE', data: activeTable })} title="Xóa Bảng" className="p-1 sm:p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors">
                                    <Icon name="trash-2" size={3.5} className="sm:hidden"/><Icon name="trash-2" size={4} className="hidden sm:block"/>
                                </button>
                            </>
                        )}

                        {/* Separator */}
                        <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-0.5" />

                        {/* Group 2 (RIGHT): Calendar → Batch export → Camera */}
                        <button
                            type="button"
                            onClick={() => setIncludeToday(p => !p)}
                            className={`p-1 sm:p-1.5 rounded-lg transition-all ${
                                includeToday 
                                ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 dark:text-indigo-400' 
                                : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                            title={includeToday ? 'Đang bao gồm hôm nay — Nhấn để loại bỏ' : 'Không bao gồm hôm nay — Nhấn để thêm'}
                        >
                            <Icon name={includeToday ? 'calendar-check' : 'calendar-x'} size={4} />
                        </button>
                        <button 
                            onClick={handleBatchExport} 
                            disabled={isBatchExporting || tables.length === 0}
                            className="p-1 sm:p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-all"
                            title="Xuất hàng loạt ảnh toàn bộ bảng 7 ngày"
                        >
                            {isBatchExporting ? <Icon name="loader-2" size={4} className="animate-spin" /> : <Icon name="images" size={4} />}
                        </button>
                        {onExport && (
                            <button onClick={onExport} disabled={isExporting} className="p-1 sm:p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-all" title="Xuất ảnh bảng hiện tại">
                                {isExporting ? <Icon name="loader-2" size={4} className="animate-spin" /> : <Icon name="camera" size={4} />}
                            </button>
                        )}
                    </div>
                </div>

                {/* Tabs below title */}
                {!isBatchExporting && tables.length > 1 && (
                    <div className="mt-1.5 sm:mt-2 overflow-x-auto no-scrollbar hide-on-export">
                        <div className="flex gap-0 border-b border-slate-200 dark:border-slate-700/60 w-max sm:w-auto">
                            {tables.map((t) => {
                                const isActive = activeTableId === t.id;
                                return (
                                <button
                                    key={`tab-${t.id}`}
                                    onClick={() => setActiveTableId(t.id)}
                                    className={`relative px-2.5 sm:px-4 py-1.5 sm:py-2 text-[9px] sm:text-[11px] uppercase tracking-wider font-bold whitespace-nowrap transition-colors ${
                                        isActive
                                        ? 'text-slate-800 dark:text-white'
                                        : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300'
                                    }`}
                                    title={t.tableName}
                                >
                                    {t.tableName.replace(/7 NGÀY\s*-\s*/i, '')}
                                    {isActive && (
                                        <span className="absolute bottom-0 left-1 right-1 h-[2.5px] bg-sky-400 dark:bg-sky-400 rounded-full" />
                                    )}
                                </button>
                            )})}
                        </div>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 gap-6">
                
                {tables.map((tableConfig, index) => {
                    const isVisible = isBatchExporting || tableConfig.id === activeTableId;
                    const currentTheme = colorThemes[index % colorThemes.length];
                    return (
                        <div key={tableConfig.id} className={`h2h-table-container ${!isVisible ? 'hidden' : 'block'}`}>
                            <div className="overflow-hidden">
                                <HeadToHeadTable
                                    config={tableConfig}
                                    allConfigs={tables}
                                    {...props}
                                    onAdd={() => setModalState({ type: 'ADD' })}
                                    onEdit={() => setModalState({ type: 'EDIT', data: tableConfig })}
                                    onDelete={() => setModalState({ type: 'DELETE', data: tableConfig })}
                                    tableColorTheme={currentTheme}
                                    includeToday={includeToday}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>

            {(modalState.type === 'ADD' || modalState.type === 'EDIT') && (
                <HeadToHeadConfigModal 
                    isOpen={true} 
                    onClose={() => setModalState({ type: null })}
                    onSave={handleSave}
                    allIndustries={allParentGroups}
                    allSubgroups={allSubgroups}
                    allManufacturers={allManufacturers}
                    existingTables={tables}
                    editingConfig={modalState.type === 'EDIT' ? modalState.data : undefined}
                />
            )}
             {modalState.type === 'DELETE' && (
                <ModalWrapper
                    isOpen={true}
                    onClose={() => setModalState({ type: null })}
                    title="Xác nhận Xóa Bảng"
                    subTitle={`Bạn có chắc muốn xóa bảng "${modalState.data?.tableName}" không?`}
                    titleColorClass="text-red-600 dark:text-red-400"
                    maxWidthClass="max-w-md"
                >
                    <div className="p-4 sm:p-6">
                        <p className="text-xs sm:text-sm">Hành động này không thể hoàn tác.</p>
                    </div>
                    <div className="p-3 sm:p-4 flex justify-end gap-2 sm:gap-3 bg-slate-100 dark:bg-slate-800 rounded-b-xl border-t border-slate-200 dark:border-slate-700">
                        <button onClick={() => setModalState({ type: null })} className="py-1.5 sm:py-2 px-3 sm:px-4 rounded-lg shadow-sm text-xs sm:text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 transition-colors">Hủy</button>
                        <button onClick={handleDelete} className="py-1.5 sm:py-2 px-4 sm:px-6 rounded-lg shadow-sm text-xs sm:text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors">Xóa</button>
                    </div>
                </ModalWrapper>
            )}
        </div>
    );
}));

export default HeadToHeadTab;
