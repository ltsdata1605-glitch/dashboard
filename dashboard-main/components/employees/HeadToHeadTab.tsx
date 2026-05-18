
import React, { useState, useMemo, forwardRef, useEffect } from 'react';
import { Icon } from '../common/Icon';
import type { DataRow, ProductConfig, Employee, HeadToHeadTableConfig } from '../../types';
import { exportElementAsImage } from '../../services/uiService';
import { getHeadToHeadCustomTables, saveHeadToHeadCustomTables, getSetting, saveSetting } from '../../services/dbService';
import { useDashboardContext } from '../../contexts/DashboardContext';
import { getExportFilenamePrefix, getRowValue } from '../../utils/dataUtils';
import { COL, DATA_STATUS_COLORS } from '../../constants';
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
            const now = Date.now();
            const belowAvgRule: any = {
                id: `rule-below-avg-${now}`,
                criteria: 'column_dept_avg',
                operator: '<',
                value: 0,
                backgroundColor: DATA_STATUS_COLORS.negative.bg,
                textColor: DATA_STATUS_COLORS.negative.text
            };

            const top3Rule: any = {
                id: `rule-top-3-${now}`,
                criteria: 'top_3',
                operator: '=',
                value: 0,
                backgroundColor: DATA_STATUS_COLORS.positive.bg,
                textColor: DATA_STATUS_COLORS.positive.text
            };

            const fullDefaults: HeadToHeadTableConfig[] = [
                { id: `h2h-default-${now}-1`, tableName: "DT THỰC", icon: "dollar-sign", type: 'data', metricType: 'revenue', totalCalculationMethod: 'sum', filters: { selectedIndustries: [], selectedSubgroups: [], selectedManufacturers: [], productCodes: [] }, conditionalFormats: [belowAvgRule, top3Rule] },
                { id: `h2h-default-${now}-2`, tableName: "DTQĐ", icon: "circle-dollar-sign", type: 'data', metricType: 'revenueQD', totalCalculationMethod: 'sum', filters: { selectedIndustries: [], selectedSubgroups: [], selectedManufacturers: [], productCodes: [] }, conditionalFormats: [belowAvgRule, top3Rule] },
                { id: `h2h-default-${now}-3`, tableName: "HQQĐ", icon: "percent", type: 'data', metricType: 'hieuQuaQD', totalCalculationMethod: 'average', filters: { selectedIndustries: [], selectedSubgroups: [], selectedManufacturers: [], productCodes: [] }, conditionalFormats: [belowAvgRule, top3Rule] },
                { id: `h2h-default-${now}-4`, tableName: "SIM", icon: "sim-card", type: 'data', metricType: 'quantity', totalCalculationMethod: 'sum', filters: { selectedIndustries: ['Sim'], selectedSubgroups: [], selectedManufacturers: [], productCodes: [] }, conditionalFormats: [belowAvgRule, top3Rule] },
                { id: `h2h-default-${now}-5`, tableName: "VIEON", icon: "play-square", type: 'data', metricType: 'quantity', totalCalculationMethod: 'sum', filters: { selectedIndustries: [], selectedSubgroups: ['Vieon'], selectedManufacturers: [], productCodes: [] }, conditionalFormats: [belowAvgRule, top3Rule] },
                { id: `h2h-default-${now}-6`, tableName: "ĐHTT", icon: "watch", type: 'data', metricType: 'quantity', totalCalculationMethod: 'sum', filters: { selectedIndustries: ['Đồng hồ', 'Wearable'], selectedSubgroups: [], selectedManufacturers: [], productCodes: [] }, conditionalFormats: [belowAvgRule, top3Rule] },
                { id: `h2h-default-${now}-7`, tableName: "CAMERA", icon: "camera", type: 'data', metricType: 'quantity', totalCalculationMethod: 'sum', filters: { selectedIndustries: [], selectedSubgroups: ['Camera'], selectedManufacturers: [], productCodes: [] }, conditionalFormats: [belowAvgRule, top3Rule] },
                { id: `h2h-default-${now}-8`, tableName: "SDP", icon: "battery-charging", type: 'data', metricType: 'quantity', totalCalculationMethod: 'sum', filters: { selectedIndustries: [], selectedSubgroups: ['Pin SDP'], selectedManufacturers: [], productCodes: [] }, conditionalFormats: [belowAvgRule, top3Rule] },
                { id: `h2h-default-${now}-9`, tableName: "ĐÈN", icon: "lightbulb", type: 'data', metricType: 'quantity', totalCalculationMethod: 'sum', filters: { selectedIndustries: [], selectedSubgroups: ['Đèn NLMT'], selectedManufacturers: [], productCodes: [] }, conditionalFormats: [belowAvgRule, top3Rule] },
                { id: `h2h-default-${now}-10`, tableName: "TAI NGHE", icon: "headphones", type: 'data', metricType: 'quantity', totalCalculationMethod: 'sum', filters: { selectedIndustries: [], selectedSubgroups: ['Tai nghe BLT'], selectedManufacturers: [], productCodes: [] }, conditionalFormats: [belowAvgRule, top3Rule] },
                { id: `h2h-default-${now}-11`, tableName: "MLN", icon: "droplet", type: 'data', metricType: 'quantity', totalCalculationMethod: 'sum', filters: { selectedIndustries: [], selectedSubgroups: ['Máy lọc nước'], selectedManufacturers: [], productCodes: [] }, conditionalFormats: [belowAvgRule, top3Rule] },
                { id: `h2h-default-${now}-12`, tableName: "QĐH", icon: "wind", type: 'data', metricType: 'quantity', totalCalculationMethod: 'sum', filters: { selectedIndustries: [], selectedSubgroups: ['Quạt điều hòa'], selectedManufacturers: [], productCodes: [] }, conditionalFormats: [belowAvgRule, top3Rule] },
                { id: `h2h-default-${now}-13`, tableName: "QUẠT", icon: "fan", type: 'data', metricType: 'quantity', totalCalculationMethod: 'sum', filters: { selectedIndustries: [], selectedSubgroups: ['Quạt điện'], selectedManufacturers: [], productCodes: [] }, conditionalFormats: [belowAvgRule, top3Rule] },
                { id: `h2h-default-${now}-14`, tableName: "N.CƠM", icon: "chef-hat", type: 'data', metricType: 'quantity', totalCalculationMethod: 'sum', filters: { selectedIndustries: [], selectedSubgroups: ['Nồi cơm'], selectedManufacturers: [], productCodes: [] }, conditionalFormats: [belowAvgRule, top3Rule] },
            ];

            if (!savedTables || savedTables.length === 0) {
                savedTables = fullDefaults;
            } else {
                if (!(await getSetting('h2h_v2_migrated_1'))) {
                    savedTables = savedTables.map((t: HeadToHeadTableConfig) => {
                        if (t.tableName === "7 NGÀY - DOANH THU") return { ...t, tableName: "DT THỰC" };
                        if (t.tableName === "7 NGÀY - DOANH THU QĐ") return { ...t, tableName: "DTQĐ" };
                        if (t.tableName === "7 NGÀY - HIỆU QUẢ QĐ") return { ...t, tableName: "HQQĐ" };
                        return t;
                    });
                    
                    const existingNames = new Set(savedTables.map(t => t.tableName));
                    const toAppend = fullDefaults.slice(3).filter(t => !existingNames.has(t.tableName));
                    savedTables = [...savedTables, ...toAppend];
                    
                    await saveSetting('h2h_v2_migrated_1', true);
                }
                if (!(await getSetting('h2h_v2_migrated_3'))) {
                    savedTables = savedTables.map((t: HeadToHeadTableConfig) => {
                        return {
                            ...t,
                            conditionalFormats: [belowAvgRule, top3Rule]
                        };
                    });
                    await saveSetting('h2h_v2_migrated_3', true);
                }
                if (!(await getSetting('h2h_v2_migrated_5'))) {
                    savedTables = savedTables.map((t: HeadToHeadTableConfig) => {
                        if (t.tableName === "N.CƠM" && t.filters) {
                            return {
                                ...t,
                                filters: {
                                    ...t.filters,
                                    selectedSubgroups: ['Nồi cơm']
                                }
                            };
                        }
                        return t;
                    });
                    await saveSetting('h2h_v2_migrated_5', true);
                }
                if (!(await getSetting('h2h_v2_migrated_6'))) {
                    savedTables = savedTables.map((t: HeadToHeadTableConfig) => {
                        let newT = { ...t };
                        if (newT.selectedParentGroups || newT.selectedSubgroups) {
                            if (!newT.filters) {
                                newT.filters = {
                                    selectedIndustries: newT.selectedParentGroups || [],
                                    selectedSubgroups: newT.selectedSubgroups || [],
                                    selectedManufacturers: [],
                                    productCodes: []
                                };
                            } else {
                                if (newT.selectedParentGroups && newT.selectedParentGroups.length > 0) newT.filters.selectedIndustries = newT.selectedParentGroups;
                                if (newT.selectedSubgroups && newT.selectedSubgroups.length > 0) newT.filters.selectedSubgroups = newT.selectedSubgroups;
                            }
                            delete newT.selectedParentGroups;
                            delete newT.selectedSubgroups;
                        }
                        
                        if (newT.tableName === "N.CƠM" && newT.filters) {
                            newT.filters.selectedSubgroups = ['Nồi cơm'];
                        }
                        
                        return newT;
                    });
                    await saveSetting('h2h_v2_migrated_6', true);
                }
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
                            <Icon name={activeTable?.icon || "calendar-days"} size={3.5} className="sm:hidden" />
                            <Icon name={activeTable?.icon || "calendar-days"} size={5} className="hidden sm:block" />
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
                        <button onClick={() => setModalState({ type: 'ADD' })} title="Thêm Bảng" className="p-1.5 sm:p-2 rounded-lg text-slate-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 transition-colors">
                            <Icon name="plus" size={3.5} className="sm:hidden"/><Icon name="plus" size={5} className="hidden sm:block"/>
                        </button>
                        {activeTable && (
                            <>
                                <button onClick={() => setModalState({ type: 'EDIT', data: activeTable })} title="Sửa Bảng" className="p-1.5 sm:p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors">
                                    <Icon name="pencil" size={3.5} className="sm:hidden"/><Icon name="pencil" size={5} className="hidden sm:block"/>
                                </button>
                                <button onClick={() => setModalState({ type: 'DELETE', data: activeTable })} title="Xóa Bảng" className="p-1.5 sm:p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors">
                                    <Icon name="trash-2" size={3.5} className="sm:hidden"/><Icon name="trash-2" size={5} className="hidden sm:block"/>
                                </button>
                            </>
                        )}

                        {/* Separator */}
                        <div className="w-px h-4 sm:h-6 bg-slate-200 dark:bg-slate-700 mx-0.5 sm:mx-1" />

                        {/* Group 2 (RIGHT): Calendar → Batch export → Camera */}
                        <button
                            type="button"
                            onClick={() => setIncludeToday(p => !p)}
                            className={`p-1.5 sm:p-2 rounded-lg transition-all ${
                                includeToday 
                                ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 dark:text-indigo-400' 
                                : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                            title={includeToday ? 'Đang bao gồm hôm nay — Nhấn để loại bỏ' : 'Không bao gồm hôm nay — Nhấn để thêm'}
                        >
                            <Icon name={includeToday ? 'calendar-check' : 'calendar-x'} size={3.5} className="sm:hidden"/><Icon name={includeToday ? 'calendar-check' : 'calendar-x'} size={5} className="hidden sm:block"/>
                        </button>
                        <button 
                            onClick={handleBatchExport} 
                            disabled={isBatchExporting || tables.length === 0}
                            className="p-1.5 sm:p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-all"
                            title="Xuất hàng loạt ảnh toàn bộ bảng 7 ngày"
                        >
                            {isBatchExporting ? <Icon name="loader-2" size={3.5} className="animate-spin sm:hidden" /> : <Icon name="images" size={3.5} className="sm:hidden" />}
                            {isBatchExporting ? <Icon name="loader-2" size={5} className="animate-spin hidden sm:block" /> : <Icon name="images" size={5} className="hidden sm:block" />}
                        </button>
                        {onExport && (
                            <button onClick={onExport} disabled={isExporting} className="p-1.5 sm:p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-all" title="Xuất ảnh bảng hiện tại">
                                {isExporting ? <Icon name="loader-2" size={3.5} className="animate-spin sm:hidden" /> : <Icon name="camera" size={3.5} className="sm:hidden" />}
                                {isExporting ? <Icon name="loader-2" size={5} className="animate-spin hidden sm:block" /> : <Icon name="camera" size={5} className="hidden sm:block" />}
                            </button>
                        )}
                    </div>
                </div>

                {/* Tabs below title */}
                {!isBatchExporting && tables.length > 1 && (
                    <div className="mt-1.5 sm:mt-2 overflow-x-auto no-scrollbar hide-on-export">
                        <div className="flex gap-0 border-b border-slate-200 dark:border-slate-700/60 w-max sm:w-auto">
                            {tables.map((t, tabIndex) => {
                                const isActive = activeTableId === t.id;
                                const theme = colorThemes[tabIndex % colorThemes.length];
                                return (
                                <button
                                    key={`tab-${t.id}`}
                                    onClick={() => setActiveTableId(t.id)}
                                    className={`relative px-2.5 sm:px-4 py-1.5 sm:py-2 text-[9px] sm:text-[11px] uppercase tracking-wider font-bold whitespace-nowrap transition-colors ${
                                        isActive
                                        ? theme.activeTab || 'bg-slate-50 text-slate-800 dark:bg-slate-800 dark:text-white border-b-[2.5px] border-slate-800 dark:border-white'
                                        : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300'
                                    }`}
                                    title={t.tableName}
                                >
                                    {t.tableName.replace(/7 NGÀY\s*-\s*/i, '')}
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
