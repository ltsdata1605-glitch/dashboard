import React from 'react';
import { TabModal, TableModal } from './modals/StructureModals';
import ColumnConfigModal from './modals/ColumnConfigModal';
import { ConfirmDialog } from '../shared/ui/ConfirmDialog';
import { CustomExploitationTabModal } from './modals/CustomExploitationTabModal';
import type { ModalState, ColumnConfig, ContestTableConfig, CustomExploitationTabSaveInput } from '../../types';

interface EmployeeAnalysisModalsProps {
    modalState: ModalState;
    setModalState: (state: ModalState) => void;
    handleSaveTab: (tabName: string, icon: string, tabId?: string) => void;
    handleSaveTable: (tableName: string, defaultSortColumnId?: string) => void;
    handleSaveColumn: (column: ColumnConfig) => void;
    handleDeleteTab: () => void;
    handleDeleteTable: () => void;
    handleConfirmDeleteColumn: () => void;
    handleSaveCustomExploitationTab?: (tab: CustomExploitationTabSaveInput) => void;
    handleDeleteCustomExploitationTab?: () => void;
    allIndustries: string[];
    allSubgroups: string[];
    allManufacturers: string[];
    currentTableForColumns: ContestTableConfig | undefined;
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

            <ConfirmDialog
                isOpen={modalState.type === 'CONFIRM_DELETE_TAB'}
                onClose={() => setModalState({ type: null })}
                onConfirm={handleDeleteTab}
                variant="danger"
                title="Xác nhận Xóa Tab"
                confirmText="Xác nhận Xóa"
                message={`Bạn sắp xóa tab "${modalState.data?.tabName || ''}". Hành động này không thể hoàn tác. Toàn bộ các bảng thi đua bên trong tab này cũng sẽ bị xóa vĩnh viễn.`}
            />

            <ConfirmDialog
                isOpen={modalState.type === 'CONFIRM_DELETE_TABLE'}
                onClose={() => setModalState({ type: null })}
                onConfirm={handleDeleteTable}
                variant="danger"
                title="Xác nhận Xóa Bảng"
                confirmText="Xác nhận Xóa"
                message={`Bạn sắp xóa bảng "${modalState.data?.tableName || ''}". Hành động này sẽ xóa vĩnh viễn bảng thi đua này. Bạn có chắc chắn muốn tiếp tục?`}
            />

            <ConfirmDialog
                isOpen={modalState.type === 'CONFIRM_DELETE_COLUMN'}
                onClose={() => setModalState({ type: null })}
                onConfirm={handleConfirmDeleteColumn}
                variant="danger"
                title="Xác nhận Xóa Cột"
                confirmText="Xác nhận Xóa"
                message={`Bạn sắp xóa cột "${modalState.data?.columnName || ''}". Hành động này sẽ xóa vĩnh viễn cột này khỏi bảng. Bạn có chắc chắn muốn tiếp tục?`}
            />

            <ConfirmDialog
                isOpen={modalState.type === 'CONFIRM_DELETE_CUSTOM_EXPLOITATION_TAB'}
                onClose={() => setModalState({ type: null })}
                onConfirm={handleDeleteCustomExploitationTab}
                variant="danger"
                title="Xác nhận Xóa Thẻ Tùy Chỉnh"
                confirmText="Xác nhận Xóa"
                message={`Bạn sắp xóa thẻ "${modalState.data?.tabName || ''}". Hành động này sẽ xóa vĩnh viễn thẻ tùy chỉnh này. Bạn có chắc chắn muốn tiếp tục?`}
            />
        </>
    );
};

export default EmployeeAnalysisModals;
