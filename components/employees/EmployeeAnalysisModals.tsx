import React from 'react';
import { TabModal, TableModal } from './modals/StructureModals';
import ColumnConfigModal from './modals/ColumnConfigModal';
import ModalWrapper from '../modals/ModalWrapper';
import { CustomExploitationTabModal } from './modals/CustomExploitationTabModal';

interface EmployeeAnalysisModalsProps {
    modalState: any;
    setModalState: (state: any) => void;
    handleSaveTab: (tabName: string, icon: string, tabId?: string) => void;
    handleSaveTable: (tableName: string, defaultSortColumnId?: string) => void;
    handleSaveColumn: (column: any) => void;
    handleDeleteTab: () => void;
    handleDeleteTable: () => void;
    handleConfirmDeleteColumn: () => void;
    handleSaveCustomExploitationTab?: (tab: any) => void;
    handleDeleteCustomExploitationTab?: () => void;
    allIndustries: string[];
    allSubgroups: string[];
    allManufacturers: string[];
    currentTableForColumns: any;
}

const EmployeeAnalysisModals: React.FC<EmployeeAnalysisModalsProps> = ({
    modalState,
    setModalState,
    handleSaveTab,
    handleSaveTable,
    handleSaveColumn,
    handleDeleteTab,
    handleDeleteTable,
    handleConfirmDeleteColumn,
    handleSaveCustomExploitationTab,
    handleDeleteCustomExploitationTab,
    allIndustries,
    allSubgroups,
    allManufacturers,
    currentTableForColumns
}) => {
    return (
        <>
            {(modalState.type === 'CREATE_TAB' || modalState.type === 'EDIT_TAB') && (
                <TabModal
                    isOpen={true}
                    onClose={() => setModalState({type: null})}
                    onSave={handleSaveTab}
                    tabId={modalState.data?.tabId}
                    initialName={modalState.data?.initialName}
                    initialIcon={modalState.data?.initialIcon}
                />
            )}

            {(modalState.type === 'CREATE_CUSTOM_EXPLOITATION_TAB' || modalState.type === 'EDIT_CUSTOM_EXPLOITATION_TAB') && (
                <CustomExploitationTabModal
                    isOpen={true}
                    onClose={() => setModalState({ type: null })}
                    onSave={handleSaveCustomExploitationTab || (() => {})}
                    allIndustries={allIndustries}
                    allSubgroups={allSubgroups}
                    allManufacturers={allManufacturers}
                    tabId={modalState.data?.tabId}
                    initialName={modalState.data?.initialName}
                    initialColumns={modalState.data?.initialColumns}
                    initialIcon={modalState.data?.initialIcon}
                />
            )}

            {(modalState.type === 'CREATE_TABLE' || modalState.type === 'EDIT_TABLE') && (
                <TableModal
                    isOpen={true}
                    onClose={() => setModalState({ type: null })}
                    onSave={handleSaveTable}
                    initialName={modalState.data?.tableName || ''}
                    isEditing={modalState.type === 'EDIT_TABLE'}
                    columns={modalState.data?.columns}
                    initialSortColumnId={modalState.data?.initialSortColumnId}
                />
            )}

            {(modalState.type === 'CREATE_COLUMN' || modalState.type === 'EDIT_COLUMN') && currentTableForColumns && (
                <ColumnConfigModal
                    isOpen={true}
                    onClose={() => setModalState({ type: null })}
                    onSave={handleSaveColumn}
                    allIndustries={allIndustries}
                    allSubgroups={allSubgroups}
                    allManufacturers={allManufacturers}
                    existingColumns={currentTableForColumns.columns}
                    editingColumn={modalState.data?.editingColumn}
                />
            )}

            {modalState.type === 'CONFIRM_DELETE_TAB' && (
                <ModalWrapper
                    isOpen={true}
                    onClose={() => setModalState({ type: null })}
                    title="Xác nhận Xóa Tab"
                    subTitle={`Bạn sắp xóa tab "${modalState.data?.tabName || ''}"`}
                    titleColorClass="text-red-600 dark:text-red-400"
                    maxWidthClass="max-w-md"
                >
                    <div className="p-4 sm:p-6">
                        <p className="text-xs sm:text-sm">Hành động này không thể hoàn tác. Toàn bộ các bảng thi đua bên trong tab này cũng sẽ bị xóa vĩnh viễn.</p>
                    </div>
                    <div className="p-3 sm:p-4 flex justify-end gap-2 sm:gap-3 bg-slate-100 dark:bg-slate-800 rounded-b-xl border-t border-slate-200 dark:border-slate-700">
                        <button type="button" onClick={() => setModalState({ type: null })} className="py-1.5 sm:py-2 px-3 sm:px-4 rounded-lg shadow-sm text-xs sm:text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 transition-colors">Hủy</button>
                        <button type="button" onClick={handleDeleteTab} className="py-1.5 sm:py-2 px-4 sm:px-6 rounded-lg shadow-sm text-xs sm:text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors">Xác nhận Xóa</button>
                    </div>
                </ModalWrapper>
            )}
            
            {modalState.type === 'CONFIRM_DELETE_TABLE' && (
                <ModalWrapper
                    isOpen={true}
                    onClose={() => setModalState({ type: null })}
                    title="Xác nhận Xóa Bảng"
                    subTitle={`Bạn sắp xóa bảng "${modalState.data?.tableName || ''}"`}
                    titleColorClass="text-red-600 dark:text-red-400"
                    maxWidthClass="max-w-md"
                >
                    <div className="p-4 sm:p-6">
                        <p className="text-xs sm:text-sm">Hành động này sẽ xóa vĩnh viễn bảng thi đua này. Bạn có chắc chắn muốn tiếp tục?</p>
                    </div>
                    <div className="p-3 sm:p-4 flex justify-end gap-2 sm:gap-3 bg-slate-100 dark:bg-slate-800 rounded-b-xl border-t border-slate-200 dark:border-slate-700">
                        <button type="button" onClick={() => setModalState({ type: null })} className="py-1.5 sm:py-2 px-3 sm:px-4 rounded-lg shadow-sm text-xs sm:text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 transition-colors">Hủy</button>
                        <button type="button" onClick={handleDeleteTable} className="py-1.5 sm:py-2 px-4 sm:px-6 rounded-lg shadow-sm text-xs sm:text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors">Xác nhận Xóa</button>
                    </div>
                </ModalWrapper>
            )}

            {modalState.type === 'CONFIRM_DELETE_COLUMN' && (
                <ModalWrapper
                    isOpen={true}
                    onClose={() => setModalState({ type: null })}
                    title="Xác nhận Xóa Cột"
                    subTitle={`Bạn sắp xóa cột "${modalState.data?.columnName || ''}"`}
                    titleColorClass="text-red-600 dark:text-red-400"
                    maxWidthClass="max-w-md"
                >
                    <div className="p-4 sm:p-6">
                        <p className="text-xs sm:text-sm">Hành động này sẽ xóa vĩnh viễn cột này khỏi bảng. Bạn có chắc chắn muốn tiếp tục?</p>
                    </div>
                    <div className="p-3 sm:p-4 flex justify-end gap-2 sm:gap-3 bg-slate-100 dark:bg-slate-800 rounded-b-xl border-t border-slate-200 dark:border-slate-700">
                        <button type="button" onClick={() => setModalState({ type: null })} className="py-1.5 sm:py-2 px-3 sm:px-4 rounded-lg shadow-sm text-xs sm:text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 transition-colors">Hủy</button>
                        <button type="button" onClick={handleConfirmDeleteColumn} className="py-1.5 sm:py-2 px-4 sm:px-6 rounded-lg shadow-sm text-xs sm:text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors">Xác nhận Xóa</button>
                    </div>
                </ModalWrapper>
            )}

            {modalState.type === 'CONFIRM_DELETE_CUSTOM_EXPLOITATION_TAB' && (
                <ModalWrapper
                    isOpen={true}
                    onClose={() => setModalState({ type: null })}
                    title="Xác nhận Xóa Thẻ Tùy Chỉnh"
                    subTitle={`Bạn sắp xóa thẻ "${modalState.data?.tabName || ''}"`}
                    titleColorClass="text-red-600 dark:text-red-400"
                    maxWidthClass="max-w-md"
                >
                    <div className="p-4 sm:p-6">
                        <p className="text-xs sm:text-sm">Hành động này sẽ xóa vĩnh viễn thẻ tùy chỉnh này. Bạn có chắc chắn muốn tiếp tục?</p>
                    </div>
                    <div className="p-3 sm:p-4 flex justify-end gap-2 sm:gap-3 bg-slate-100 dark:bg-slate-800 rounded-b-xl border-t border-slate-200 dark:border-slate-700">
                        <button type="button" onClick={() => setModalState({ type: null })} className="py-1.5 sm:py-2 px-3 sm:px-4 rounded-lg shadow-sm text-xs sm:text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 transition-colors">Hủy</button>
                        <button type="button" onClick={handleDeleteCustomExploitationTab} className="py-1.5 sm:py-2 px-4 sm:px-6 rounded-lg shadow-sm text-xs sm:text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors">Xác nhận Xóa</button>
                    </div>
                </ModalWrapper>
            )}
        </>
    );
};

export default EmployeeAnalysisModals;
