
import React from 'react';
import TopSellerList from './TopSellerList';
import PerformanceTable from './PerformanceTable';
import IndustryAnalysisTab from './IndustryAnalysisTab';
import HeadToHeadTab from './HeadToHeadTab';
import ContestTable from './ContestTable';
import { Icon } from '../common/Icon';
import type { ExploitationData } from '../../types';

interface EmployeeAnalysisContentProps {
    activeTab: string;
    filteredEmployeeAnalysisData: any;
    isInitialTabsLoaded: boolean;
    industryAnalysisTables: any[];
    customTabs: any[];
    customExploitationTabs: any[];
    setCustomExploitationTabs: React.Dispatch<React.SetStateAction<any[]>>;
    baseFilteredData: any[];
    productConfig: any;
    isExporting: boolean;
    handleMainExport: () => Promise<void>;
    handleIndustryTabExport: () => Promise<void>;
    handleBatchExport: (data: any) => void;
    openPerformanceModal: (emp: any) => void;
    setModalState: (state: any) => void;
    exportRef: React.RefObject<HTMLDivElement | null>;
    industryAnalysisTabRef: React.RefObject<HTMLDivElement | null>;
    colorThemes: any[];
    defaultTabs: any[];
    handleDeleteColumnDirect: (tabId: string, tableId: string, columnId: string) => void;
}

const EmployeeAnalysisContent: React.FC<EmployeeAnalysisContentProps> = React.memo(({
    activeTab,
    filteredEmployeeAnalysisData,
    isInitialTabsLoaded,
    industryAnalysisTables,
    customTabs,
    customExploitationTabs,
    setCustomExploitationTabs,
    baseFilteredData,
    productConfig,
    isExporting,
    handleMainExport,
    handleIndustryTabExport,
    handleBatchExport,
    openPerformanceModal,
    setModalState,
    exportRef,
    industryAnalysisTabRef,
    colorThemes,
    defaultTabs,
    handleDeleteColumnDirect
}) => {
    if (!isInitialTabsLoaded || !filteredEmployeeAnalysisData) return null;

    switch (activeTab) {
        case 'topSellers': 
            return <TopSellerList ref={exportRef} fullSellerArray={filteredEmployeeAnalysisData.fullSellerArray} onEmployeeClick={openPerformanceModal} onBatchExport={handleBatchExport} onExport={handleMainExport} isExporting={isExporting} />;
        case 'performanceTable': 
            return <PerformanceTable ref={exportRef} employeeData={filteredEmployeeAnalysisData} onEmployeeClick={openPerformanceModal} onExport={handleMainExport} isExporting={isExporting} />;
        case 'industryAnalysis': 
            return (
                <div>
                    <IndustryAnalysisTab 
                        ref={industryAnalysisTabRef}
                        data={filteredEmployeeAnalysisData.exploitationData} 
                        baseFilteredData={baseFilteredData}
                        productConfig={productConfig}
                        customExploitationTabs={customExploitationTabs}
                        onManageCustomTabs={() => setModalState({ type: 'CREATE_CUSTOM_EXPLOITATION_TAB', data: {} })}
                        onEditCustomTab={(tabId: string) => {
                            const tab = customExploitationTabs.find(t => t.id === tabId);
                            if (tab) {
                                setModalState({ type: 'EDIT_CUSTOM_EXPLOITATION_TAB', data: { tabId: tab.id, initialName: tab.name, initialColumns: tab.columns } });
                            }
                        }}
                        onDeleteCustomTab={(tabId: string) => {
                            const tab = customExploitationTabs.find(t => t.id === tabId);
                            if (tab) {
                                setModalState({ type: 'CONFIRM_DELETE_CUSTOM_EXPLOITATION_TAB', data: { tabId: tab.id, tabName: tab.name } });
                            }
                        }}
                        onExport={handleIndustryTabExport} 
                        isExporting={isExporting}
                        onBatchExport={(exploitationData: ExploitationData[]) => {
                            const names = new Set(exploitationData.map(d => d.name));
                            if (filteredEmployeeAnalysisData?.fullSellerArray) {
                                const employeesToExport = filteredEmployeeAnalysisData.fullSellerArray.filter(e => names.has(e.name));
                                handleBatchExport(employeesToExport);
                            }
                        }}
                    />

                </div>
            );
        case 'headToHead': 
            return <HeadToHeadTab ref={exportRef} baseFilteredData={baseFilteredData} productConfig={productConfig!} employeeData={filteredEmployeeAnalysisData.fullSellerArray} onExport={handleMainExport} isExporting={isExporting} colorThemes={colorThemes} />;

        default:
            const customTab = customTabs.find(t => t.id === activeTab);
            if (customTab) {
                return (
                    <div ref={exportRef}>
                        <div className="flex justify-between items-center mb-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                                    <Icon name={customTab.icon || 'folder'} size={6} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-slate-800 dark:text-white leading-tight">{customTab.name}</h3>
                                    <p className="text-xs font-medium text-slate-400">Bảng thi đua tùy chỉnh</p>
                                </div>
                            </div>
                            <div className="px-6 py-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/30 hide-on-export overflow-x-auto rounded-xl">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <button onClick={() => setModalState({ type: 'CREATE_TABLE', data: { tabId: customTab.id }})} title="Tạo Bảng Thi Đua Mới" className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all">
                                        <Icon name="plus" size={5}/>
                                    </button>
                                    <button onClick={() => setModalState({ type: 'EDIT_TAB', data: { tabId: customTab.id, initialName: customTab.name, initialIcon: customTab.icon }})} title="Sửa Tên Tab" className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all">
                                        <Icon name="edit-3" size={5}/>
                                    </button>
                                    <button onClick={() => setModalState({ type: 'CONFIRM_DELETE_TAB', data: { tabId: customTab.id, tabName: customTab.name }})} title="Xóa Tab" className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all">
                                        <Icon name="trash-2" size={5}/>
                                    </button>
                                    <div className="h-5 w-px bg-slate-200 dark:bg-slate-700 mx-1"></div>
                                    <button onClick={handleMainExport} disabled={isExporting} title="Xuất Ảnh Tab" className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all">
                                        {isExporting ? <Icon name="loader-2" size={5} className="animate-spin" /> : <Icon name="camera" size={5} />}
                                    </button>
                                </div>
                            </div>
                        </div>
                        {customTab.tables.length === 0 ? (
                            <p className="text-center text-slate-500 py-8">Chưa có bảng thi đua nào trong tab này.</p>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {customTab.tables.map((tableConfig, index) => (
                                    <ContestTable
                                        key={tableConfig.id}
                                        config={tableConfig}
                                        allEmployees={filteredEmployeeAnalysisData.fullSellerArray}
                                        baseFilteredData={baseFilteredData}
                                        productConfig={productConfig!}
                                        tableColorTheme={colorThemes[(index + 2) % colorThemes.length]}
                                        onManageColumns={() => setModalState({ type: 'EDIT_TABLE', data: { tabId: customTab.id, tableId: tableConfig.id, tableName: tableConfig.tableName, columns: tableConfig.columns, initialSortColumnId: tableConfig.defaultSortColumnId }})}
                                        onDeleteTable={() => setModalState({ type: 'CONFIRM_DELETE_TABLE', data: { tabId: customTab.id, tableId: tableConfig.id, tableName: tableConfig.tableName }})}
                                        onAddColumn={() => setModalState({ type: 'CREATE_COLUMN', data: { tabId: customTab.id, tableId: tableConfig.id, existingColumns: tableConfig.columns }})}
                                        onEditColumn={(columnId) => setModalState({ type: 'EDIT_COLUMN', data: { tabId: customTab.id, tableId: tableConfig.id, existingColumns: tableConfig.columns, editingColumn: tableConfig.columns.find(c => c.id === columnId) }})}
                                        onTriggerDeleteColumn={(columnId) => handleDeleteColumnDirect(customTab.id, tableConfig.id, columnId)}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                );
            }
            return null;
    }
});

export default EmployeeAnalysisContent;
