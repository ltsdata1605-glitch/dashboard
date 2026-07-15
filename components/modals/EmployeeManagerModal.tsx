import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../shared/ui/Modal';
import toast from 'react-hot-toast';
import { Icon } from '../common/Icon';
import { useDashboardContext } from '../../contexts/DashboardContext';
import { getSetting } from '../../services/dbService';
import { ConfirmDialog } from '../shared/ui/ConfirmDialog';
import { Button } from '../shared/ui/Button';
import { Input } from '../shared/ui/Input';
import { onActivateKey } from '../shared/ui';

interface EmployeeManagerModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const EmployeeManagerModal: React.FC<EmployeeManagerModalProps> = ({ isOpen, onClose }) => {
    const { departmentMap, updateDepartmentMap, uniqueFilterOptions } = useDashboardContext();
    const [searchTerm, setSearchTerm] = useState('');
    const deferredSearchTerm = React.useDeferredValue(searchTerm);
    const [localMap, setLocalMap] = useState<Record<string, string>>({});
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editDept, setEditDept] = useState('');
    const [editName, setEditName] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: 'id' | 'name' | 'dept', direction: 'asc' | 'desc' } | null>(null);
    const [filterDept, setFilterDept] = useState<string>('');

    // Cờ báo hiệu có thay đổi để cập nhật lúc đóng
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);

    // Khởi tạo Modal
    useEffect(() => {
        if (isOpen) {
            const combinedMap: Record<string, string> = {};
            if (departmentMap) {
                for (const [id, val] of Object.entries(departmentMap)) {
                    const cleanId = id.trim();
                    const parts = val.split(';;');
                    const fullName = parts.length > 1 ? parts[1] : cleanId;
                    
                    const lowerId = cleanId.toLowerCase();
                    const lowerName = fullName.toLowerCase();
                    const isSystem = (
                        lowerId.startsWith('yêu cầu xuất') ||
                        lowerId.startsWith('mwg') ||
                        lowerId.startsWith('bp ') ||
                        lowerId.startsWith('hỗ trợ bi') ||
                        lowerId.startsWith('nnh ') ||
                        lowerId.startsWith('đml_str_str') ||
                        lowerId.includes('online') ||
                        lowerName.startsWith('yêu cầu xuất') ||
                        lowerName.startsWith('mwg') ||
                        lowerName.startsWith('bp ') ||
                        lowerName.startsWith('hỗ trợ bi') ||
                        lowerName.startsWith('nnh ') ||
                        lowerName.startsWith('đml_str_str') ||
                        lowerName.includes('online')
                    );
                    
                    if (!isSystem) {
                        combinedMap[cleanId] = val;
                    }
                }
            }
            if (uniqueFilterOptions && uniqueFilterOptions.nguoiTao) {
                uniqueFilterOptions.nguoiTao.forEach(empStr => {
                    if (!empStr) return;
                    const cleanEmpStr = empStr.trim();
                    const lowerEmpStr = cleanEmpStr.toLowerCase();
                    if (
                        lowerEmpStr.startsWith('yêu cầu xuất') ||
                        lowerEmpStr.startsWith('mwg') ||
                        lowerEmpStr.startsWith('bp ') ||
                        lowerEmpStr.startsWith('hỗ trợ bi') ||
                        lowerEmpStr.startsWith('nnh ') ||
                        lowerEmpStr.startsWith('đml_str_str') ||
                        lowerEmpStr.includes('online')
                    ) return;
                    const parts = cleanEmpStr.split(' - ');
                    const id = parts[0].trim();
                    const name = parts.slice(1).join(' - ').trim() || id;
                    if (!combinedMap[id]) {
                        // Những nhân viên có trong data nhưng chưa có trong map
                        combinedMap[id] = `Chưa xác định;;${name}`;
                    }
                });
            }
            setLocalMap(combinedMap);
            setSearchTerm('');
            setEditingId(null);
            setHasUnsavedChanges(false);
        }
    }, [isOpen]); // Chỉ reset và load dữ liệu gốc khi MỞ Modal (tránh mất search text lúc đang edit ngầm)

    const employees = useMemo(() => {
        if (!localMap) return [];
        return Object.entries(localMap).map(([id, val]) => {
            if (typeof val !== 'string') return { id, dept: '', name: '' };
            const [dept, name] = val.split(';;');
            return { id, dept: dept || '', name: name || '' };
        }).filter(emp => 
            (!filterDept || emp.dept === filterDept) &&
            (emp.id.toLowerCase().includes(deferredSearchTerm.toLowerCase()) || 
            emp.name.toLowerCase().includes(deferredSearchTerm.toLowerCase()) ||
            emp.dept.toLowerCase().includes(deferredSearchTerm.toLowerCase()))
        ).sort((a, b) => {
            if (!sortConfig) return a.dept.localeCompare(b.dept);
            const { key, direction } = sortConfig;
            const diff = a[key].localeCompare(b[key], undefined, { numeric: true });
            return direction === 'asc' ? diff : -diff;
        });
    }, [localMap, deferredSearchTerm, sortConfig, filterDept]);

    const departments = useMemo(() => {
        return Array.from(new Set(Object.values(localMap).map(v => {
            if (typeof v !== 'string') return '';
            return v.split(';;')[0];
        }).filter(Boolean))).sort();
    }, [localMap]);

    const handleSort = (key: 'id' | 'name' | 'dept') => {
        setSortConfig(prev => {
            if (prev?.key === key) {
                return prev.direction === 'asc' ? { key, direction: 'desc' } : null;
            }
            return { key, direction: 'asc' };
        });
    };

    const renderSortIcon = (key: 'id' | 'name' | 'dept') => {
        if (sortConfig?.key !== key) return <Icon name="chevrons-up-down" size={3.5} className="opacity-30" />;
        return <Icon name={sortConfig.direction === 'asc' ? 'chevron-up' : 'chevron-down'} size={3.5} className="text-indigo-600" />;
    };

    const handleEdit = (emp: { id: string, dept: string, name: string }) => {
        setEditingId(emp.id);
        setEditDept(emp.dept);
        setEditName(emp.name);
    };

    const handleSave = () => {
        if (editingId) {
            const newMap = { ...localMap };
            newMap[editingId] = `${editDept};;${editName}`;
            setLocalMap(newMap);
            setEditingId(null);
            setHasUnsavedChanges(true); // Đánh dấu đã thay đổi
            if (updateDepartmentMap) updateDepartmentMap(newMap);
        }
    };

    const handleDelete = (id: string) => {
        const newMap = { ...localMap };
        delete newMap[id];
        setLocalMap(newMap);
        setHasUnsavedChanges(true); // Đánh dấu đã thay đổi
        if (updateDepartmentMap) updateDepartmentMap(newMap);
    };

    const confirmRestore = async () => {
        const originalMap = await getSetting<Record<string, string>>('originalDepartmentMap');
        if (originalMap) {
            setLocalMap(originalMap);
            setHasUnsavedChanges(true);
            if (updateDepartmentMap) updateDepartmentMap(originalMap);
        } else {
            toast.error('Không tìm thấy bản sao lưu danh sách gốc!');
        }
        setShowRestoreConfirm(false);
    };

    const handleRestore = () => {
        setShowRestoreConfirm(true);
    };

    const handleClose = () => {
        if (hasUnsavedChanges && updateDepartmentMap) {
            updateDepartmentMap(localMap);
        }
        onClose();
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title="Quản Lý Danh Sách Nhân Viên"
            subTitle={`Tổng số: ${Object.keys(localMap).length} nhân viên`}
            maxWidth="4xl"
            titleColorClass="text-indigo-600 dark:text-indigo-400"
            footer={
                <div className="flex justify-between gap-2 sm:gap-3">
                    <Button
                        onClick={handleRestore}
                        variant="secondary"
                        size="sm"
                        leftIcon={<Icon name="rotate-ccw" size={3.5} />}
                        className="text-[11px] sm:text-xs py-1 px-2.5"
                    >
                        Khôi phục gốc
                    </Button>
                    <Button
                        onClick={handleClose}
                        variant="primary"
                        size="sm"
                        className="text-[11px] sm:text-xs py-1 px-3"
                    >
                        {hasUnsavedChanges ? 'Lưu & Đóng' : 'Đóng'}
                    </Button>
                </div>
            }
        >
            <div className="-m-5 flex flex-col h-[70vh]">
                {/* Toolbar */}
                <div className="p-2.5 sm:p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
                    <div className="relative w-48 sm:w-64">
                        <Input 
                            type="text" 
                            placeholder="Tìm mã NV, tên, siêu thị..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-8 sm:pl-9 pr-3 text-xs sm:text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                        />
                        <Icon name="search" size={3.5} className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 text-slate-400 sm:hidden" />
                        <Icon name="search" size={4} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hidden sm:block" />
                    </div>
                    <div className="hidden sm:flex gap-2 text-xs text-slate-400 dark:text-slate-500">
                        <span>Lưu ý: Dữ liệu được lưu tự động và an toàn (IndexedDB).</span>
                    </div>
                </div>

                {/* Table */}
                <div className="flex-grow overflow-y-auto custom-scrollbar">
                    <table className="min-w-full text-[10px] sm:text-xs text-left border-collapse border-b border-slate-200 dark:border-slate-800 table-fixed">
                        <thead className="bg-indigo-50 dark:bg-indigo-900/20 sticky top-0 z-10 border-b border-slate-200 dark:border-slate-700/80">
                            <tr className="text-[10px] sm:text-xs font-bold text-indigo-950 dark:text-indigo-200 uppercase tracking-tight whitespace-nowrap">
                                <th onClick={() => handleSort('id')} className="cursor-pointer px-1 sm:px-4 py-1.5 sm:py-2 hover:bg-indigo-100/50 dark:hover:bg-indigo-900/40 transition-colors w-[13%] sm:w-20">
                                    <div className="flex items-center justify-between">Mã NV {renderSortIcon('id')}</div>
                                </th>
                                <th onClick={() => handleSort('name')} className="cursor-pointer px-1 sm:px-4 py-1.5 sm:py-2 hover:bg-indigo-100/50 dark:hover:bg-indigo-900/40 transition-colors w-[47%] sm:w-auto">
                                    <div className="flex items-center justify-between">Họ và Tên {renderSortIcon('name')}</div>
                                </th>
                                <th className="px-1 sm:px-4 py-1.5 sm:py-2 hover:bg-indigo-100/50 dark:hover:bg-indigo-900/40 transition-colors w-[27%] sm:w-64">
                                    <div role="button" tabIndex={0} className="flex items-center justify-between cursor-pointer" onClick={() => handleSort('dept')} onKeyDown={onActivateKey(() => handleSort('dept'))}>
                                        <div className="flex items-center gap-1">Bộ phận {renderSortIcon('dept')}</div>
                                        <div className="relative" onClick={e => e.stopPropagation()}>
                                            <select 
                                                value={filterDept} 
                                                onChange={e => setFilterDept(e.target.value)}
                                                className="absolute inset-0 opacity-0 cursor-pointer w-full"
                                                title="Lọc Bộ phận"
                                            >
                                                <option value="">Tất cả</option>
                                                {departments.map(d => <option key={d} value={d}>{d}</option>)}
                                            </select>
                                            <Button variant="unstyled" size="none" className={`p-0.5 sm:p-1 rounded transition-colors ${filterDept ? 'text-indigo-650 bg-indigo-50' : 'text-slate-400 hover:bg-slate-200'}`}>
                                                <Icon name="filter" size={3} />
                                            </Button>
                                        </div>
                                    </div>
                                </th>
                                <th className="px-1 sm:px-4 py-1.5 sm:py-2 w-[13%] sm:w-24 text-center">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                            {employees.map(emp => (
                                <tr key={emp.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors whitespace-nowrap">
                                    <td className="px-1 sm:px-4 py-1 sm:py-1.5 font-mono text-[9px] sm:text-xs text-slate-500 dark:text-slate-400 truncate" title={emp.id}>{emp.id}</td>
                                    
                                    {editingId === emp.id ? (
                                        <>
                                            <td className="px-1 sm:px-4 py-1 sm:py-1.5">
                                                <Input 
                                                    type="text" 
                                                    value={editName} 
                                                    onChange={e => setEditName(e.target.value)} 
                                                    onKeyDown={e => { if (e.key === 'Enter') handleSave(); }}
                                                    className="w-full px-1 sm:px-2 py-0.5 sm:py-0.5 text-xs sm:text-sm border-indigo-300 dark:border-indigo-500"
                                                    autoFocus
                                                />
                                            </td>
                                            <td className="px-1 sm:px-4 py-1 sm:py-1.5">
                                                <Input 
                                                    list="department-options"
                                                    type="text" 
                                                    value={editDept} 
                                                    onChange={e => setEditDept(e.target.value)} 
                                                    onKeyDown={e => { if (e.key === 'Enter') handleSave(); }}
                                                    className="w-full px-1 sm:px-2 py-0.5 sm:py-0.5 text-xs sm:text-sm border-indigo-300 dark:border-indigo-500"
                                                    placeholder="Chọn hoặc nhập..."
                                                />
                                            </td>
                                            <td className="px-1 sm:px-4 py-1 sm:py-1.5 text-center">
                                                <div className="flex justify-center gap-1">
                                                    <Button variant="unstyled" size="none" onClick={handleSave} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded dark:text-emerald-400 dark:hover:bg-emerald-900/30" title="Lưu">
                                                        <Icon name="check" size={3.5} />
                                                    </Button>
                                                    <Button variant="unstyled" size="none" onClick={() => setEditingId(null)} className="p-1 text-rose-600 hover:bg-rose-50 rounded dark:text-rose-400 dark:hover:bg-rose-900/30" title="Hủy">
                                                        <Icon name="x" size={3.5} />
                                                    </Button>
                                                </div>
                                            </td>
                                        </>
                                    ) : (
                                        <>
                                            <td className="px-1 sm:px-4 py-1 sm:py-1.5 text-slate-700 dark:text-slate-300 font-medium truncate" title={emp.name}>{emp.name}</td>
                                            <td className="px-1 sm:px-4 py-1 sm:py-1.5 truncate">
                                                <span 
                                                    title={emp.dept}
                                                    className="inline-block max-w-full truncate px-1 sm:px-2 py-0.5 rounded text-[9px] sm:text-xs font-semibold bg-indigo-50/80 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 border border-indigo-100/30 dark:border-indigo-900/20"
                                                >
                                                    {emp.dept}
                                                </span>
                                            </td>
                                            <td className="px-1 sm:px-4 py-1 sm:py-1.5 text-center w-[13%] sm:w-24">
                                                <div className="flex justify-center gap-0.5 sm:gap-1">
                                                    <Button variant="unstyled" size="none" onClick={() => handleEdit(emp)} className="p-0.5 sm:p-1 text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-900/30 rounded transition-colors" title="Sửa">
                                                        <Icon name="pencil" size={3} className="sm:hidden" />
                                                        <Icon name="pencil" size={3.5} className="hidden sm:block" />
                                                    </Button>
                                                    <Button variant="unstyled" size="none" onClick={() => handleDelete(emp.id)} className="p-0.5 sm:p-1 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded transition-colors" title="Xóa">
                                                        <Icon name="trash-2" size={3} className="sm:hidden" />
                                                        <Icon name="trash-2" size={3.5} className="hidden sm:block" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </>
                                    )}
                                </tr>
                            ))}
                            {employees.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-4 py-12 text-center text-slate-500 dark:text-slate-400">
                                        Không tìm thấy nhân viên nào phù hợp.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Datalist for Departments */}
                <datalist id="department-options">
                    {departments.map((dep, idx) => (
                        <option key={idx} value={dep} />
                    ))}
                </datalist>
            </div>

            <ConfirmDialog
                isOpen={showRestoreConfirm}
                onClose={() => setShowRestoreConfirm(false)}
                onConfirm={confirmRestore}
                title="Khôi phục danh sách gốc?"
                message="Bạn có muốn khôi phục lại danh sách nhân viên ban đầu (từ file Excel) không? Các chỉnh sửa thủ công sẽ bị mất."
                confirmText="Khôi phục"
                variant="warning"
            />
        </Modal>
    );
};

export default EmployeeManagerModal;
