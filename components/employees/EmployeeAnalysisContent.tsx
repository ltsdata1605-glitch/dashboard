
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
    allDatesBaseFilteredData: any[];
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
    allDatesBaseFilteredData,
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
                            let tab = customExploitationTabs.find(t => t.id === tabId);
                            if (!tab && tabId === 'doanhThu') {
                                tab = { id: 'doanhThu', name: 'DOANH THU', columns: [ { id: 'doanhThuThuc', name: 'DT Thực', type: 'revenue', filters: {} as any }, { id: 'doanhThuQD', name: 'DTQĐ', type: 'revenue', filters: {} as any }, { id: 'hieuQuaQD', name: 'HQQĐ', type: 'percentage', filters: {} as any } ] };
                            } else if (!tab && tabId === 'spChinh') {
                                tab = { id: 'spChinh', name: 'SẢN PHẨM CHÍNH', columns: [ { id: 'slICT', name: 'ICT', type: 'quantity', filters: {} as any }, { id: 'slCE_main', name: 'CE', type: 'quantity', filters: {} as any }, { id: 'slGiaDung_main', name: 'ĐGD', type: 'quantity', filters: {} as any }, { id: 'slSPChinh_Tong', name: 'Tổng', type: 'quantity', filters: {} as any } ] };
                            }
                            if (tab) {
                                setModalState({ type: 'EDIT_CUSTOM_EXPLOITATION_TAB', data: { tabId: tab.id, initialName: tab.name, initialColumns: tab.columns, initialIcon: tab.icon } });
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
            return <HeadToHeadTab ref={exportRef} baseFilteredData={allDatesBaseFilteredData} productConfig={productConfig!} employeeData={filteredEmployeeAnalysisData.fullSellerArray} onExport={handleMainExport} isExporting={isExporting} colorThemes={colorThemes} />;

        default:
            const customTab = customTabs.find(t => t.id === activeTab);
            if (customTab) {
                return (
                    <div ref={exportRef}>
                        <div className="flex justify-between items-center mb-3 sm:mb-6">
                            <div className="flex items-center gap-2 sm:gap-4">
                                <div className="w-6 h-6 sm:w-10 sm:h-10 rounded-md sm:rounded-xl flex items-center justify-center shrink-0 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                                    <Icon name={customTab.icon || 'folder'} size={3.5} className="sm:hidden" />
                                    <Icon name={customTab.icon || 'folder'} size={5} className="hidden sm:block" />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-[11px] sm:text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight truncate leading-tight">{customTab.name}</h3>
                                    <p className="text-[8px] sm:text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate leading-none mt-0.5">Bảng thi đua tùy chỉnh</p>
                                </div>
                            </div>
                            <div className="px-1.5 sm:px-6 py-1 sm:py-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/30 hide-on-export overflow-x-auto rounded-lg sm:rounded-xl">
                                <div className="flex items-center gap-0.5 sm:gap-1.5 flex-wrap">
                                    <button onClick={() => setModalState({ type: 'CREATE_TABLE', data: { tabId: customTab.id }})} title="Tạo Bảng Thi Đua Mới" className="p-1 sm:p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg sm:rounded-xl transition-all">
                                        <Icon name="plus" size={3.5} className="sm:hidden" /><Icon name="plus" size={4} className="hidden sm:block" />
                                    </button>
                                    <button onClick={() => setModalState({ type: 'EDIT_TAB', data: { tabId: customTab.id, initialName: customTab.name, initialIcon: customTab.icon }})} title="Sửa Tên Tab" className="p-1 sm:p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg sm:rounded-xl transition-all">
                                        <Icon name="edit-3" size={3.5} className="sm:hidden" /><Icon name="edit-3" size={4} className="hidden sm:block" />
                                    </button>
                                    <button onClick={() => setModalState({ type: 'CONFIRM_DELETE_TAB', data: { tabId: customTab.id, tabName: customTab.name }})} title="Xóa Tab" className="p-1 sm:p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg sm:rounded-xl transition-all">
                                        <Icon name="trash-2" size={3.5} className="sm:hidden" /><Icon name="trash-2" size={4} className="hidden sm:block" />
                                    </button>
                                    <div className="h-4 sm:h-5 w-px bg-slate-200 dark:bg-slate-700 mx-0.5 sm:mx-1"></div>
                                    <button onClick={handleMainExport} disabled={isExporting} title="Xuất Ảnh Tab" className="p-1 sm:p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg sm:rounded-xl transition-all">
                                        {isExporting ? <Icon name="loader-2" size={3.5} className="animate-spin sm:hidden" /> : <Icon name="camera" size={3.5} className="sm:hidden" />}
                                        {isExporting ? <Icon name="loader-2" size={4} className="animate-spin hidden sm:block" /> : <Icon name="camera" size={4} className="hidden sm:block" />}
                                    </button>
                                </div>
                            </div>
                        </div>
                        {customTab.tables.length === 0 ? (
                            <p className="text-center text-xs sm:text-sm text-slate-500 py-5 sm:py-8">Chưa có bảng thi đua nào trong tab này.</p>
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
