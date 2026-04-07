import React, { useState, useEffect, useMemo } from 'react';
import ModalWrapper from './ModalWrapper';
import { Icon } from '../common/Icon';
import { useDashboardContext } from '../../contexts/DashboardContext';
import { getSetting } from '../../services/dbService';

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

    // Khởi tạo Modal
    useEffect(() => {
        if (isOpen) {
            const combinedMap = { ...departmentMap };
            if (uniqueFilterOptions && uniqueFilterOptions.nguoiTao) {
                uniqueFilterOptions.nguoiTao.forEach(empStr => {
                    if (!empStr) return;
                    const parts = empStr.split(' - ');
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
        }
    };

    const handleDelete = (id: string) => {
        const newMap = { ...localMap };
        delete newMap[id];
        setLocalMap(newMap);
        setHasUnsavedChanges(true); // Đánh dấu đã thay đổi
    };

    const handleRestore = async () => {
        if (window.confirm('Bạn có muốn khôi phục lại danh sách nhân viên ban đầu (từ file Excel) không?')) {
            const originalMap = await getSetting<Record<string, string>>('originalDepartmentMap');
            if (originalMap) {
                setLocalMap(originalMap);
                setHasUnsavedChanges(true);
            } else {
                alert('Không tìm thấy bản sao lưu danh sách gôc!');
            }
        }
    };

    const handleClose = () => {
        if (hasUnsavedChanges && updateDepartmentMap) {
            updateDepartmentMap(localMap);
        }
        onClose();
    };

    if (!isOpen) return null;

    return (
        <ModalWrapper
            isOpen={isOpen}
            onClose={onClose}
            title="Quản Lý Danh Sách Nhân Viên"
            subTitle={`Tổng số: ${Object.keys(localMap).length} nhân viên`}
            maxWidthClass="max-w-4xl"
            titleColorClass="text-indigo-600 dark:text-indigo-400"
        >
            <div className="flex flex-col h-[70vh]">
                {/* Toolbar */}
                <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
                    <div className="relative w-64">
                        <input 
                            type="text" 
                            placeholder="Tìm mã NV, tên, siêu thị..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500"
                        />
                        <Icon name="search" size={4} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    </div>
                    <div className="flex gap-2 text-sm text-slate-500 dark:text-slate-400">
                        <span>Lưu ý: Dữ liệu được lưu tự động và an toàn (IndexedDB).</span>
                    </div>
                </div>

                {/* Table */}
                <div className="flex-1 overflow-auto custom-scrollbar">
                    <table className="min-w-full text-sm text-left border-collapse border border-slate-200 dark:border-slate-700">
                        <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th onClick={() => handleSort('id')} className="cursor-pointer px-4 py-3 font-semibold text-slate-600 dark:text-slate-300 border-b border-r border-slate-200 dark:border-slate-700 w-32 hover:bg-slate-100 transition-colors">
                                    <div className="flex items-center justify-between">Mã NV {renderSortIcon('id')}</div>
                                </th>
                                <th onClick={() => handleSort('name')} className="cursor-pointer px-4 py-3 font-semibold text-slate-600 dark:text-slate-300 border-b border-r border-slate-200 dark:border-slate-700 hover:bg-slate-100 transition-colors">
                                    <div className="flex items-center justify-between">Họ và Tên {renderSortIcon('name')}</div>
                                </th>
                                <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300 border-b border-r border-slate-200 dark:border-slate-700 w-64 hover:bg-slate-100 transition-colors">
                                    <div className="flex items-center justify-between cursor-pointer" onClick={() => handleSort('dept')}>
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
                                            <button className={`p-1 rounded transition-colors ${filterDept ? 'text-indigo-600 bg-indigo-50' : 'text-slate-400 hover:bg-slate-200'}`}>
                                                <Icon name="filter" size={3.5} />
                                            </button>
                                        </div>
                                    </div>
                                </th>
                                <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300 border-b border-r border-slate-200 dark:border-slate-700 w-24 text-center">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                            {employees.map(emp => (
                                <tr key={emp.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100 border-r border-slate-200 dark:border-slate-700">{emp.id}</td>
                                    
                                    {editingId === emp.id ? (
                                        <>
                                            <td className="px-4 py-2 border-r border-slate-200 dark:border-slate-700">
                                                <input 
                                                    type="text" 
                                                    value={editName} 
                                                    onChange={e => setEditName(e.target.value)} 
                                                    onKeyDown={e => { if (e.key === 'Enter') handleSave(); }}
                                                    className="w-full px-2 py-1 text-sm border border-indigo-300 rounded focus:ring-indigo-500 dark:bg-slate-700 dark:border-indigo-500 dark:text-white"
                                                    autoFocus
                                                />
                                            </td>
                                            <td className="px-4 py-2 border-r border-slate-200 dark:border-slate-700">
                                                <input 
                                                    list="department-options"
                                                    type="text" 
                                                    value={editDept} 
                                                    onChange={e => setEditDept(e.target.value)} 
                                                    onKeyDown={e => { if (e.key === 'Enter') handleSave(); }}
                                                    className="w-full px-2 py-1 text-sm border border-indigo-300 rounded focus:ring-indigo-500 dark:bg-slate-700 dark:border-indigo-500 dark:text-white"
                                                    placeholder="Chọn hoặc nhập phòng ban..."
                                                />
                                            </td>
                                            <td className="px-4 py-3 text-center border-r border-slate-200 dark:border-slate-700">
                                                <div className="flex justify-center gap-2">
                                                    <button onClick={handleSave} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded dark:text-emerald-400 dark:hover:bg-emerald-900/30" title="Lưu">
                                                        <Icon name="check" size={4} />
                                                    </button>
                                                    <button onClick={() => setEditingId(null)} className="p-1.5 text-rose-600 hover:bg-rose-50 rounded dark:text-rose-400 dark:hover:bg-rose-900/30" title="Hủy">
                                                        <Icon name="x" size={4} />
                                                    </button>
                                                </div>
                                            </td>
                                        </>
                                    ) : (
                                        <>
                                            <td className="px-4 py-3 text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-700">{emp.name}</td>
                                            <td className="px-4 py-3 text-slate-600 dark:text-slate-400 border-r border-slate-200 dark:border-slate-700">
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                                                    {emp.dept}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center border-r border-slate-200 dark:border-slate-700">
                                                <div className="flex justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" style={{ opacity: 1 }}>
                                                    <button onClick={() => handleEdit(emp)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors" title="Sửa">
                                                        <Icon name="pencil" size={4} />
                                                    </button>
                                                    <button onClick={() => handleDelete(emp.id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors" title="Xóa">
                                                        <Icon name="trash-2" size={4} />
                                                    </button>
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

                {/* Footer */}
                <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex justify-between gap-3 bg-slate-50 dark:bg-slate-900/50">
                    <button 
                        onClick={handleRestore} 
                        className="px-6 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600 rounded-lg shadow-sm transition-all font-medium flex items-center gap-2"
                    >
                        <Icon name="rotate-ccw" size={4} /> Khôi phục gốc
                    </button>
                    <button 
                        onClick={handleClose} 
                        className="px-6 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg shadow-sm transition-all active:scale-95 font-medium"
                    >
                        {hasUnsavedChanges ? 'Lưu & Đóng' : 'Đóng'}
                    </button>
                </div>
            </div>
        </ModalWrapper>
    );
};

export default EmployeeManagerModal;
