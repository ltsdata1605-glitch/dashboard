import React, { useState, useEffect, useMemo } from 'react';
import { resolveIconName } from '../shared/ui/icon/legacyIconNames';
import { AppIcon } from '../shared/ui/icon/AppIcon';
import { Modal } from '../shared/ui/Modal';
import { toast } from '../shared/ui/toast';
import { useDashboardContext } from '../../contexts/DashboardContext';
import { getSetting } from '../../services/dbService';
import { ConfirmDialog } from '../shared/ui/ConfirmDialog';
import { Button } from '../shared/ui/Button';
import { Input } from '../shared/ui/Input';
import { onActivateKey } from '../shared/ui';
import { COL } from '../../constants';
import { getRowValue } from '../../utils/dataUtils';

interface EmployeeManagerModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const EmployeeManagerModal: React.FC<EmployeeManagerModalProps> = ({ isOpen, onClose }) => {
    const { departmentMap, updateDepartmentMap, uniqueFilterOptions, originalData } = useDashboardContext();
    const [searchTerm, setSearchTerm] = useState('');
    const deferredSearchTerm = React.useDeferredValue(searchTerm);
    const [localMap, setLocalMap] = useState<Record<string, string>>({});
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editDept, setEditDept] = useState('');
    const [editName, setEditName] = useState('');
    const [editMaKho, setEditMaKho] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: 'id' | 'name' | 'dept' | 'maKho', direction: 'asc' | 'desc' } | null>(null);
    const [filterDept, setFilterDept] = useState<string>('');
    const [filterKho, setFilterKho] = useState<string>('');

    // Cờ báo hiệu có thay đổi để cập nhật lúc đóng
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
    const [showBatchKhoModal, setShowBatchKhoModal] = useState(false);
    const [batchMaKho, setBatchMaKho] = useState('');

    // Khởi tạo Modal
    useEffect(() => {
        if (isOpen) {
            // Tự động nhận diện Mã kho từ file dữ liệu gốc nếu có
            const idToKhoMap: Record<string, string> = {};
            if (originalData && Array.isArray(originalData)) {
                for (const row of originalData) {
                    const empStr = getRowValue(row, COL.NGUOI_TAO);
                    const khoVal = getRowValue(row, COL.KHO);
                    if (empStr && khoVal !== undefined && khoVal !== null) {
                        const cleanId = String(empStr).trim().split(' - ')[0].trim();
                        const cleanKho = String(khoVal).replace(/\D/g, '');
                        if (cleanId && cleanKho && !idToKhoMap[cleanId]) {
                            idToKhoMap[cleanId] = cleanKho;
                        }
                    }
                }
            }

            const combinedMap: Record<string, string> = {};
            if (departmentMap) {
                for (const [id, val] of Object.entries(departmentMap)) {
                    const cleanId = id.trim();
                    const parts = val.split(';;');
                    const dept = parts[0] || '';
                    const fullName = parts.length > 1 ? parts[1] : cleanId;
                    const existingKho = parts.length > 2 ? parts[2].replace(/\D/g, '') : '';
                    
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
                        const finalKho = existingKho || idToKhoMap[cleanId] || '';
                        combinedMap[cleanId] = finalKho ? `${dept};;${fullName};;${finalKho}` : `${dept};;${fullName}`;
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
                        const detectedKho = idToKhoMap[id] || '';
                        combinedMap[id] = detectedKho ? `Chưa xác định;;${name};;${detectedKho}` : `Chưa xác định;;${name}`;
                    }
                });
            }
            setLocalMap(combinedMap);
            setSearchTerm('');
            setEditingId(null);
            setEditDept('');
            setEditName('');
            setEditMaKho('');
            setFilterDept('');
            setFilterKho('');
            setHasUnsavedChanges(false);
        }
    }, [isOpen, originalData]); // Chỉ reset và load dữ liệu gốc khi MỞ Modal (tránh mất search text lúc đang edit ngầm)

    const employees = useMemo(() => {
        if (!localMap) return [];
        return Object.entries(localMap).map(([id, val]) => {
            if (typeof val !== 'string') return { id, dept: '', name: '', maKho: '' };
            const [dept, name, maKho] = val.split(';;');
            return { id, dept: dept || '', name: name || '', maKho: (maKho || '').replace(/\D/g, '') };
        }).filter(emp => 
            (!filterDept || emp.dept === filterDept) &&
            (!filterKho || emp.maKho === filterKho) &&
            (emp.id.toLowerCase().includes(deferredSearchTerm.toLowerCase()) || 
            emp.name.toLowerCase().includes(deferredSearchTerm.toLowerCase()) ||
            emp.dept.toLowerCase().includes(deferredSearchTerm.toLowerCase()) ||
            emp.maKho.includes(deferredSearchTerm))
        ).sort((a, b) => {
            if (!sortConfig) return a.dept.localeCompare(b.dept);
            const { key, direction } = sortConfig;
            const diff = a[key].localeCompare(b[key], undefined, { numeric: true });
            return direction === 'asc' ? diff : -diff;
        });
    }, [localMap, deferredSearchTerm, sortConfig, filterDept, filterKho]);

    const departments = useMemo(() => {
        return Array.from(new Set(Object.values(localMap).map(v => {
            if (typeof v !== 'string') return '';
            return v.split(';;')[0];
        }).filter(Boolean))).sort();
    }, [localMap]);

    const khoList = useMemo(() => {
        return Array.from(new Set(Object.values(localMap).map(v => {
            if (typeof v !== 'string') return '';
            const parts = v.split(';;');
            return parts.length > 2 ? parts[2].replace(/\D/g, '').trim() : '';
        }).filter(Boolean))).sort((a, b) => Number(a) - Number(b));
    }, [localMap]);

    const handleSort = (key: 'id' | 'name' | 'dept' | 'maKho') => {
        setSortConfig(prev => {
            if (prev?.key === key) {
                return prev.direction === 'asc' ? { key, direction: 'desc' } : null;
            }
            return { key, direction: 'asc' };
        });
    };

    const renderSortIcon = (key: 'id' | 'name' | 'dept' | 'maKho') => {
        if (sortConfig?.key !== key) return <AppIcon name="expandAll" size="sm" className="opacity-30" />;
        return <AppIcon name={resolveIconName(sortConfig.direction === 'asc' ? 'chevron-up' : 'chevron-down') ?? 'help'} size="sm" className="text-sky-700" />;
    };

    const handleEdit = (emp: { id: string, dept: string, name: string, maKho: string }) => {
        setEditingId(emp.id);
        setEditDept(emp.dept);
        setEditName(emp.name);
        setEditMaKho(emp.maKho);
    };

    const handleSave = () => {
        if (editingId) {
            const newMap = { ...localMap };
            const cleanKho = editMaKho.replace(/\D/g, '');
            newMap[editingId] = cleanKho ? `${editDept};;${editName};;${cleanKho}` : `${editDept};;${editName}`;
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

    const handleBatchAssignKho = () => {
        const cleanKho = batchMaKho.replace(/\D/g, '');
        if (!cleanKho) return;
        const newMap = { ...localMap };
        employees.forEach(emp => {
            newMap[emp.id] = `${emp.dept};;${emp.name};;${cleanKho}`;
        });
        setLocalMap(newMap);
        setHasUnsavedChanges(true);
        if (updateDepartmentMap) updateDepartmentMap(newMap);
        toast.success(`Đã gán Mã kho ${cleanKho} cho ${employees.length} nhân viên`);
        setShowBatchKhoModal(false);
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
        if (updateDepartmentMap) {
            const isDifferent = Object.keys(localMap).length !== Object.keys(departmentMap || {}).length ||
                Object.entries(localMap).some(([k, v]) => departmentMap?.[k] !== v);
            if (hasUnsavedChanges || isDifferent) {
                updateDepartmentMap(localMap);
            }
        }
        onClose();
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title="Quản Lý Danh Sách Nhân Viên"
            subTitle={`Tổng số: ${Object.keys(localMap).length} nhân viên`}
            maxWidth="lg"
            titleColorClass="text-sky-700 dark:text-sky-400"
            footer={
                <div className="flex justify-between gap-2 sm:gap-3">
                    <Button
                        onClick={handleRestore}
                        variant="secondary"
                        size="sm"
                        leftIcon={<AppIcon name="reset" size="sm" />}
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
            <div className="modal-bleed flex flex-col max-h-[70vh]">
                {/* Toolbar */}
                {/* Lỗi #21 (video v1:034–037): ô tìm kiếm 192px chật trên iPhone → chiếm trọn hàng; bảng không còn bị cắt cột MÃ NV ở
                    mép trái (lề âm 20px cũ lấn đệm 12px của sheet — nay modal-bleed) và cuộn ngang được khi hẹp. */}
                <div className="px-3 py-2.5 sm:p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3 bg-slate-50 dark:bg-slate-900/50">
                    <div className="w-full sm:w-72">
                        <Input
                            type="search"
                            leftIcon="search"
                            aria-label="Tìm nhân viên"
                            placeholder="Tìm mã NV, tên, bộ phận…"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => { setBatchMaKho(filterKho || ''); setShowBatchKhoModal(true); }}
                            leftIcon={<AppIcon name="settings" size="xs" />}
                            className="text-[11px] sm:text-xs py-1 px-2.5 whitespace-nowrap"
                            title="Gán mã kho cho nhân viên"
                        >
                            Gán mã kho
                        </Button>
                        <div className="hidden sm:flex text-xs text-slate-400 dark:text-slate-500">
                            <span>Lưu tự động (IndexedDB).</span>
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="flex-grow overflow-auto custom-scrollbar">
                    <table className="w-full min-w-[540px] text-[12px] sm:text-xs text-left border-collapse border-b border-slate-200 dark:border-slate-800 table-fixed">
                        <thead className="bg-sky-50 dark:bg-sky-900/20 sticky top-0 z-10 border-b border-slate-200 dark:border-slate-700/80">
                            <tr className="text-[11px] sm:text-xs font-bold text-sky-950 dark:text-sky-200 uppercase tracking-wider whitespace-nowrap">
                                <th onClick={() => handleSort('id')} className="cursor-pointer px-1 sm:px-4 py-1.5 sm:py-2 hover:bg-sky-100/50 dark:hover:bg-sky-900/40 transition-colors w-[12%] sm:w-20">
                                    <div className="flex items-center justify-between">Mã NV {renderSortIcon('id')}</div>
                                </th>
                                <th onClick={() => handleSort('name')} className="cursor-pointer px-1 sm:px-4 py-1.5 sm:py-2 hover:bg-sky-100/50 dark:hover:bg-sky-900/40 transition-colors w-[34%] sm:w-48">
                                    <div className="flex items-center justify-between">Họ và Tên {renderSortIcon('name')}</div>
                                </th>
                                <th className="px-1 sm:px-3 py-1.5 sm:py-2 hover:bg-sky-100/50 dark:hover:bg-sky-900/40 transition-colors w-[16%] sm:w-24">
                                    <div role="button" tabIndex={0} className="flex items-center justify-between cursor-pointer" onClick={() => handleSort('maKho')} onKeyDown={onActivateKey(() => handleSort('maKho'))}>
                                        <div className="flex items-center gap-1">Mã kho {renderSortIcon('maKho')}</div>
                                        <div className="relative" onClick={e => e.stopPropagation()}>
                                            <select 
                                                value={filterKho} 
                                                onChange={e => setFilterKho(e.target.value)}
                                                className="absolute inset-0 opacity-0 cursor-pointer w-full"
                                                title="Lọc Mã kho"
                                            >
                                                <option value="">Tất cả</option>
                                                {khoList.map(k => <option key={k} value={k}>Kho {k}</option>)}
                                            </select>
                                            <Button variant="unstyled" size="none" className={`p-0.5 sm:p-1 rounded transition-colors ${filterKho ? 'text-indigo-650 bg-sky-50' : 'text-slate-400 hover:bg-slate-200'}`}>
                                                <AppIcon name="filter" size="xs" />
                                            </Button>
                                        </div>
                                    </div>
                                </th>
                                <th className="px-1 sm:px-4 py-1.5 sm:py-2 hover:bg-sky-100/50 dark:hover:bg-sky-900/40 transition-colors w-[26%] sm:w-56">
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
                                            <Button variant="unstyled" size="none" className={`p-0.5 sm:p-1 rounded transition-colors ${filterDept ? 'text-indigo-650 bg-sky-50' : 'text-slate-400 hover:bg-slate-200'}`}>
                                                <AppIcon name="filter" size="xs" />
                                            </Button>
                                        </div>
                                    </div>
                                </th>
                                <th className="px-1 sm:px-4 py-1.5 sm:py-2 w-[12%] sm:w-20 text-center">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                            {employees.map(emp => (
                                <tr key={emp.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors whitespace-nowrap">
                                    <td className="px-1 sm:px-4 py-1 sm:py-1.5 font-mono text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 truncate" title={emp.id}>{emp.id}</td>
                                    
                                    {editingId === emp.id ? (
                                        <>
                                            <td className="px-1 sm:px-4 py-1 sm:py-1.5">
                                                <Input 
                                                    type="text" 
                                                    value={editName} 
                                                    onChange={e => setEditName(e.target.value)} 
                                                    onKeyDown={e => { if (e.key === 'Enter') handleSave(); }}
                                                    className="w-full px-1 sm:px-2 py-0.5 sm:py-0.5 text-xs sm:text-sm border-sky-300 dark:border-sky-500"
                                                    autoFocus
                                                />
                                            </td>
                                            <td className="px-1 sm:px-3 py-1 sm:py-1.5">
                                                <Input 
                                                    type="text" 
                                                    inputMode="numeric"
                                                    pattern="[0-9]*"
                                                    value={editMaKho} 
                                                    onChange={e => setEditMaKho(e.target.value.replace(/\D/g, ''))} 
                                                    onKeyDown={e => { 
                                                        if (e.key === 'Enter') handleSave();
                                                        if (e.key === ' ' || e.code === 'Space') e.preventDefault();
                                                        if (!/[0-9]/.test(e.key) && !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Enter'].includes(e.key) && !e.ctrlKey && !e.metaKey) {
                                                            e.preventDefault();
                                                        }
                                                    }}
                                                    onPaste={e => {
                                                        e.preventDefault();
                                                        const clean = e.clipboardData.getData('text').replace(/\D/g, '');
                                                        setEditMaKho(clean);
                                                    }}
                                                    className="w-full px-1 sm:px-2 py-0.5 sm:py-0.5 text-xs sm:text-sm border-sky-300 dark:border-sky-500 font-mono text-center font-bold text-sky-700 dark:text-sky-400"
                                                    placeholder="Mã kho"
                                                    title="Chỉ cho phép nhập số (không nhập chữ và khoảng trắng)"
                                                />
                                            </td>
                                            <td className="px-1 sm:px-4 py-1 sm:py-1.5">
                                                <Input 
                                                    list="department-options"
                                                    type="text" 
                                                    value={editDept} 
                                                    onChange={e => setEditDept(e.target.value)} 
                                                    onKeyDown={e => { if (e.key === 'Enter') handleSave(); }}
                                                    className="w-full px-1 sm:px-2 py-0.5 sm:py-0.5 text-xs sm:text-sm border-sky-300 dark:border-sky-500"
                                                    placeholder="Chọn hoặc nhập..."
                                                />
                                            </td>
                                            <td className="px-1 sm:px-4 py-1 sm:py-1.5 text-center">
                                                <div className="flex justify-center gap-1">
                                                    <Button variant="unstyled" size="none" onClick={handleSave} className="p-1 text-emerald-700 hover:bg-emerald-50 rounded dark:text-emerald-400 dark:hover:bg-emerald-900/30" title="Lưu">
                                                        <AppIcon name="check" size="sm" />
                                                    </Button>
                                                    <Button variant="unstyled" size="none" onClick={() => setEditingId(null)} className="p-1 text-rose-700 hover:bg-rose-50 rounded dark:text-rose-400 dark:hover:bg-rose-900/30" title="Hủy">
                                                        <AppIcon name="close" size="sm" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </>
                                    ) : (
                                        <>
                                            <td className="px-1 sm:px-4 py-1 sm:py-1.5 text-slate-700 dark:text-slate-300 font-medium truncate" title={emp.name}>{emp.name}</td>
                                            <td className="px-1 sm:px-3 py-1 sm:py-1.5 text-center">
                                                {emp.maKho ? (
                                                    <span className="inline-block px-1.5 py-0.5 rounded text-[11px] sm:text-xs font-mono font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200/60 dark:border-amber-900/40">
                                                        {emp.maKho}
                                                    </span>
                                                ) : (
                                                    <span className="text-[11px] text-slate-300 dark:text-slate-600 italic">--</span>
                                                )}
                                            </td>
                                            <td className="px-1 sm:px-4 py-1 sm:py-1.5 truncate">
                                                <span 
                                                    title={emp.dept}
                                                    className="inline-block max-w-full truncate px-1 sm:px-2 py-0.5 rounded text-[11px] sm:text-xs font-semibold bg-sky-50/80 dark:bg-sky-950/30 text-sky-700 dark:text-sky-400 border border-sky-100/30 dark:border-sky-900/20"
                                                >
                                                    {emp.dept}
                                                </span>
                                            </td>
                                            <td className="px-1 sm:px-4 py-1 sm:py-1.5 text-center w-[12%] sm:w-20">
                                                <div className="flex justify-center gap-0.5 sm:gap-1">
                                                    <Button variant="unstyled" size="none" onClick={() => handleEdit(emp)} className="p-0.5 sm:p-1 text-sky-700 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-900/30 rounded transition-colors" title="Sửa">
                                                        <AppIcon name="edit" size="sm" />
                                                    </Button>
                                                    <Button variant="unstyled" size="none" onClick={() => handleDelete(emp.id)} className="p-0.5 sm:p-1 text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded transition-colors" title="Xóa">
                                                        <AppIcon name="delete" size="sm" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </>
                                    )}
                                </tr>
                            ))}
                            {employees.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-4 py-12 text-center text-slate-500 dark:text-slate-400">
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

            {showBatchKhoModal && (
                <Modal
                    isOpen={showBatchKhoModal}
                    onClose={() => setShowBatchKhoModal(false)}
                    title="Gán Mã Kho Hàng Loạt"
                    subTitle={`Áp dụng cho ${employees.length} nhân viên`}
                    maxWidth="sm"
                    footer={
                        <div className="flex justify-end gap-2">
                            <Button variant="secondary" size="sm" onClick={() => setShowBatchKhoModal(false)}>Hủy</Button>
                            <Button
                                variant="primary"
                                size="sm"
                                disabled={!batchMaKho.replace(/\D/g, '')}
                                onClick={handleBatchAssignKho}
                            >
                                Áp dụng
                            </Button>
                        </div>
                    }
                >
                    <div className="space-y-3 p-1">
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                            Mã kho siêu thị (chỉ nhập số) <span className="text-rose-500">*</span>
                        </label>
                        <Input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            autoFocus
                            placeholder="VD: 1024"
                            value={batchMaKho}
                            onChange={e => setBatchMaKho(e.target.value.replace(/\D/g, ''))}
                            onKeyDown={e => {
                                if (e.key === ' ' || e.code === 'Space') e.preventDefault();
                                if (e.key === 'Enter' && batchMaKho.replace(/\D/g, '')) handleBatchAssignKho();
                                if (!/[0-9]/.test(e.key) && !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Enter'].includes(e.key) && !e.ctrlKey && !e.metaKey) {
                                    e.preventDefault();
                                }
                            }}
                            onPaste={e => {
                                e.preventDefault();
                                setBatchMaKho(e.clipboardData.getData('text').replace(/\D/g, ''));
                            }}
                            className="font-mono text-base font-bold text-center text-sky-700 dark:text-sky-400"
                        />
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            Chỉ được phép nhập số, không được nhập chữ và khoảng trắng. Mã kho này sẽ được gán cho {employees.length} nhân viên và đồng bộ sang Report BI.
                        </p>
                    </div>
                </Modal>
            )}
        </Modal>
    );
};

export default EmployeeManagerModal;
