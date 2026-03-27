
import React, { useState, useMemo, forwardRef, useEffect } from 'react';
import { Icon } from '../common/Icon';
import type { DataRow, ProductConfig, Employee, HeadToHeadTableConfig } from '../../types';
import { exportElementAsImage } from '../../services/uiService';
import { getHeadToHeadCustomTables, saveHeadToHeadCustomTables } from '../../services/dbService';
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

const suggestionGroups = [
  { name: 'Máy lọc nước', filterType: 'subgroup', groups: ['Máy lọc nước'], metric: 'quantity' as const },
  { name: 'Nồi chiên', filterType: 'subgroup', groups: ['Nồi chiên'], metric: 'quantity' as const },
  { name: 'Nồi Cơm', filterType: 'subgroup', groups: ['NC đ.tử/cao tần', 'NC nắp gài/rời'], metric: 'quantity' as const },
  { name: 'Quạt điện', filterType: 'subgroup', groups: ['Quạt điện'], metric: 'quantity' as const },
  { name: 'Xay Sinh tố/ép', filterType: 'subgroup', groups: ['Xay Sinh tố/ép'], metric: 'quantity' as const },
  { name: 'Bảo hiểm', filterType: 'parent', groups: ['Bảo hiểm'], metric: 'revenueQD' as const },
  { name: 'Đồng hồ', filterType: 'parent', groups: ['Wearable'], metric: 'quantity' as const },
  { name: 'Sim', filterType: 'parent', groups: ['Sim'], metric: 'quantity' as const },
  { name: 'Camera', filterType: 'subgroup', groups: ['Camera'], metric: 'quantity' as const },
  { name: 'Vieon', filterType: 'subgroup', groups: ['Vieon'], metric: 'quantity' as const },
  { name: 'Pin SDP', filterType: 'subgroup', groups: ['Pin SDP'], metric: 'quantity' as const },
  { name: 'Tai nghe BLT', filterType: 'subgroup', groups: ['Tai nghe BLT'], metric: 'quantity' as const }
];


const HeadToHeadTab = React.memo(forwardRef<HTMLDivElement, HeadToHeadTabProps>(({ onExport, isExporting, colorThemes, ...props }, ref) => {
    const { productConfig } = props;
    const [tables, setTables] = useState<HeadToHeadTableConfig[]>([]);
    const [isInitialLoad, setIsInitialLoad] = useState(true);
    const [modalState, setModalState] = useState<{ type: 'ADD' | 'EDIT' | 'DELETE' | null, data?: HeadToHeadTableConfig }>({ type: null });
    const [isBatchExporting, setIsBatchExporting] = useState(false);
    
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

    useEffect(() => {
        const loadTables = async () => {
            let savedTables = await getHeadToHeadCustomTables();
            if (!savedTables || savedTables.length === 0) {
                const now = Date.now();
                savedTables = [
                    { id: `h2h-default-${now}-1`, tableName: "7 NGÀY - DOANH THU", selectedSubgroups: [], metricType: 'revenue', totalCalculationMethod: 'sum', conditionalFormats: [] },
                    { id: `h2h-default-${now}-2`, tableName: "7 NGÀY - DOANH THU QĐ", selectedSubgroups: [], metricType: 'revenueQD', totalCalculationMethod: 'sum', conditionalFormats: [] },
                    { id: `h2h-default-${now}-3`, tableName: "7 NGÀY - HIỆU QUẢ QĐ", selectedSubgroups: [], metricType: 'hieuQuaQD', totalCalculationMethod: 'sum', conditionalFormats: [] }
                ];
            }
            setTables(savedTables);
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
                selectedParentGroups: config.selectedParentGroups || [],
                selectedSubgroups: config.selectedSubgroups || [],
            };
            setTables(prev => [...prev, newTable]);
        }
        setModalState({ type: null });
    };

    const handleDelete = () => {
        if (modalState.type === 'DELETE' && modalState.data) {
            setTables(prev => prev.filter(t => t.id !== modalState.data!.id));
        }
        setModalState({ type: null });
    };

    const handleSuggestionToggle = (sg: typeof suggestionGroups[0]) => {
        const tableName = `7 NGÀY - ${sg.name.toUpperCase()}`;
        const tableExists = tables.some(t => t.tableName === tableName);

        if (tableExists) {
            setTables(prev => prev.filter(t => t.tableName !== tableName));
        } else {
            const newConfig: HeadToHeadTableConfig = {
                id: `h2h-suggestion-${Date.now()}-${sg.name}`,
                tableName,
                metricType: sg.metric,
                totalCalculationMethod: 'sum',
                conditionalFormats: [],
                selectedSubgroups: sg.filterType === 'subgroup' ? sg.groups : [],
                selectedParentGroups: sg.filterType === 'parent' ? sg.groups : [],
            };
            setTables(prev => [...prev, newConfig]);
        }
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
                await exportElementAsImage(tableElement, `7-ngay-${tableConfig.tableName}.png`, {
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
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 shadow-sm`}>
                        <Icon name="calendar-days" size={6} />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-slate-800 dark:text-white leading-tight">7 Ngày</h3>
                        <p className="text-xs font-medium text-slate-400">Phân tích hiệu suất 7 ngày gần nhất</p>
                    </div>
                </div>
                <div className="px-6 py-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/30 hide-on-export overflow-x-auto rounded-xl">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-slate-500 mr-2">Gợi ý:</span>
                        <div className="flex items-center gap-2 flex-wrap">
                            {suggestionGroups.map(sg => {
                                const tableName = `7 NGÀY - ${sg.name.toUpperCase()}`;
                                const isActive = tables.some(t => t.tableName === tableName);
                                return (
                                    <button 
                                        key={sg.name}
                                        onClick={() => handleSuggestionToggle(sg)}
                                        className={`py-1.5 px-3 text-xs font-bold rounded-lg transition-all ${isActive ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm border border-slate-200 dark:border-slate-600' : 'text-slate-500 hover:text-indigo-600 bg-slate-100/50 dark:bg-slate-800/50'}`}
                                    >
                                        {sg.name}
                                    </button>
                                );
                            })}
                        </div>

                        <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 mx-1"></div>

                        <div className="flex items-center gap-1">
                            {onExport && (
                                <button onClick={onExport} disabled={isExporting} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all" title="Xuất ảnh toàn bộ tab 7 ngày">
                                    {isExporting ? <Icon name="loader-2" size={5} className="animate-spin" /> : <Icon name="camera" size={5} />}
                                </button>
                            )}
                            <button 
                                onClick={handleBatchExport} 
                                disabled={isBatchExporting || tables.length === 0}
                                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                                title="Xuất hàng loạt ảnh cho từng bảng bên dưới"
                            >
                                {isBatchExporting ? <Icon name="loader-2" size={5} className="animate-spin" /> : <Icon name="images" size={5} />}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
                {tables.map((tableConfig, index) => {
                    const currentTheme = colorThemes[index % colorThemes.length];
                    return (
                        <div key={tableConfig.id} className="h2h-table-container">
                            <div className="overflow-hidden">
                                <HeadToHeadTable
                                    config={tableConfig}
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
                    allSubgroups={allSubgroups}
                    allParentGroups={allParentGroups}
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
