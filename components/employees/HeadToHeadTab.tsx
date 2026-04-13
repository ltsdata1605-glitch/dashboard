
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
                    isCompactTable: true
                });
                await new Promise(resolve => setTimeout(resolve, 300));
            }
        }
        setIsBatchExporting(false);
    };

    const suggestionBoxTheme = colorThemes[4] || colorThemes[0]; // Indigo or fallback

    return (
        <div ref={ref}>
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400`}>
                        <Icon name="calendar-days" size={6} />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-slate-800 dark:text-white leading-tight">7 Ngày</h3>
                        <p className="text-xs font-medium text-slate-400">Phân tích hiệu suất 7 ngày gần nhất</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 hide-on-export overflow-x-auto no-scrollbar py-1">
                    {!isBatchExporting && tables.length > 0 && (
                        <div className="flex bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl shadow-sm border border-slate-200/50 dark:border-slate-700/50 shrink-0">
                            {tables.map((t, index) => {
                                const theme = colorThemes[index % colorThemes.length];
                                const isActive = activeTableId === t.id;
                                return (
                                <button
                                    key={`tab-${t.id}`}
                                    onClick={() => setActiveTableId(t.id)}
                                    className={`px-3.5 py-1.5 text-[11px] uppercase tracking-wider font-bold whitespace-nowrap rounded-lg transition-all ${
                                        isActive
                                        ? `${theme.header} shadow-sm border ${theme.border}`
                                        : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-700/50 border border-transparent'
                                    }`}
                                    title={t.tableName}
                                >
                                    {t.tableName.replace(/7 NGÀY\s*-\s*/i, '')}
                                </button>
                            )})}
                        </div>
                    )}
                    
                    <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-1.5 rounded-xl shrink-0 shadow-sm">
                        <button onClick={() => setModalState({ type: 'ADD' })} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-all" title="Tạo bảng 7 Ngày mới">
                            <Icon name="plus" size={4.5} />
                        </button>
                        <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-1"></div>
                        {onExport && (
                            <button onClick={onExport} disabled={isExporting} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-all" title="Xuất ảnh bảng hiện tại">
                                {isExporting ? <Icon name="loader-2" size={4.5} className="animate-spin" /> : <Icon name="camera" size={4.5} />}
                            </button>
                        )}
                        <button 
                            onClick={handleBatchExport} 
                            disabled={isBatchExporting || tables.length === 0}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-all"
                            title="Xuất hàng loạt ảnh toàn bộ bảng 7 ngày"
                        >
                            {isBatchExporting ? <Icon name="loader-2" size={4.5} className="animate-spin" /> : <Icon name="images" size={4.5} />}
                        </button>
                    </div>
                </div>
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
                    <div className="p-6">
                        <p>Hành động này không thể hoàn tác.</p>
                    </div>
                    <div className="p-4 flex justify-end gap-3 bg-slate-100 dark:bg-slate-800 rounded-b-xl border-t border-slate-200 dark:border-slate-700">
                        <button onClick={() => setModalState({ type: null })} className="py-2 px-4 rounded-lg shadow-sm text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 transition-colors">Hủy</button>
                        <button onClick={handleDelete} className="py-2 px-6 rounded-lg shadow-sm text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors">Xóa</button>
                    </div>
                </ModalWrapper>
            )}
        </div>
    );
}));

export default HeadToHeadTab;
