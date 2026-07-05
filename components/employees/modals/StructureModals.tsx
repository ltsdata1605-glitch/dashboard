
import React, { useState, useEffect, useRef } from 'react';
import { Modal } from '../../shared/ui/Modal';
import { ColumnConfig, ContestTableConfig } from '../../../types';
import { Input } from '../../shared/ui/Input';
import { Select } from '../../shared/ui/Select';
import { Button } from '../../shared/ui/Button';

// Modal for creating/editing a TAB
export const TabModal: React.FC<{
    isOpen: boolean, 
    onClose: () => void, 
    onSave: (name: string, icon: string, id?: string) => void, 
    initialName?: string, 
    initialIcon?: string,
    tabId?: string
}> = ({isOpen, onClose, onSave, initialName = '', initialIcon = 'bar-chart-3', tabId}) => {
    const [tabName, setTabName] = useState('');
    const [selectedIcon, setSelectedIcon] = useState('bar-chart-3');
    const inputRef = useRef<HTMLInputElement>(null);

    const capitalizeWords = (str: string) => str.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

    useEffect(() => {
        if(isOpen) {
            setTabName(initialName);
            setSelectedIcon(initialIcon || 'bar-chart-3');
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen, initialName, initialIcon]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (tabName.trim()) {
            onSave(capitalizeWords(tabName.trim()), selectedIcon, tabId);
        }
    };
    
    return (
          <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={tabId ? "Sửa Tab Thi Đua" : "Tạo Tab Thi Đua Mới"}
            subTitle={tabId ? "Chỉnh sửa tên cho tab" : "Tạo một trang báo cáo thi đua mới"}
            titleColorClass="text-indigo-600 dark:text-indigo-400"
            maxWidth="md"
            footer={
                <div className="flex justify-end gap-2 sm:gap-3">
                    <Button type="button" onClick={onClose} variant="ghost">Hủy</Button>
                    <Button type="button" onClick={handleSubmit} variant="primary">{tabId ? "Lưu thay đổi" : "Tạo Tab"}</Button>
                </div>
            }
          >
            <form onSubmit={handleSubmit}>
                <div className="space-y-3 sm:space-y-4">
                    <div>
                        <label htmlFor="tabName" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5 sm:mb-2">Tên Tab</label>
                        <Input
                            ref={inputRef}
                            id="tabName"
                            type="text"
                            value={tabName}
                            onChange={e => setTabName(e.target.value)}
                            placeholder="VD: Thi Đua Tháng 10"
                            className="w-full text-xs sm:text-sm"
                            required
                        />
                    </div>
                </div>
            </form>
         </Modal>
    );
}

// Modal for creating/editing a TABLE
export const TableModal: React.FC<{
    isOpen: boolean,
    onClose: () => void,
    onSave: (name: string, defaultSortColumnId?: string) => void,
    initialName?: string,
    isEditing?: boolean,
    columns?: ColumnConfig[],
    initialSortColumnId?: string,
}> = ({ isOpen, onClose, onSave, initialName = '', isEditing = false, columns = [], initialSortColumnId = '' }) => {
    const [tableName, setTableName] = useState('');
    const [sortColumnId, setSortColumnId] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            setTableName(initialName);
            setSortColumnId(initialSortColumnId || '');
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen, initialName, initialSortColumnId]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (tableName.trim()) {
            onSave(tableName.trim().toUpperCase(), sortColumnId || undefined);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={isEditing ? "Sửa Bảng Thi Đua" : "Tạo Bảng Thi Đua Mới"}
            subTitle={isEditing ? "Chỉnh sửa tên và cài đặt cho bảng này" : "Đặt tên cho bảng thi đua trong tab hiện tại"}
            titleColorClass="text-emerald-600 dark:text-emerald-400"
            maxWidth="md"
            footer={
                <div className="flex justify-end gap-2 sm:gap-3">
                    <Button type="button" onClick={onClose} variant="ghost">Hủy</Button>
                    <Button type="button" onClick={handleSubmit} variant="primary">{isEditing ? "Lưu thay đổi" : "Tạo Bảng"}</Button>
                </div>
            }
        >
            <form onSubmit={handleSubmit}>
                <div className="space-y-3 sm:space-y-4">
                    <div>
                        <label htmlFor="tableName" className="block text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 sm:mb-2">Tên Bảng</label>
                        <Input
                            ref={inputRef}
                            id="tableName"
                            type="text"
                            value={tableName}
                            onChange={e => setTableName(e.target.value)}
                            placeholder="VD: Bảng thi đua Sim số"
                            className="w-full text-xs sm:text-sm focus:ring-emerald-500 focus:border-emerald-500"
                            required
                        />
                    </div>
                    {isEditing && columns.length > 0 && (
                        <div>
                            <label htmlFor="sortColumn" className="block text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 sm:mb-2">Sắp xếp mặc định (giảm dần)</label>
                            <Select
                                id="sortColumn"
                                value={sortColumnId}
                                onChange={e => setSortColumnId(e.target.value)}
                                className="w-full text-xs sm:text-sm focus:ring-emerald-500 focus:border-emerald-500"
                            >
                                <option value="">-- Không sắp xếp --</option>
                                {columns.map(col => (
                                    <option key={col.id} value={col.id}>{col.columnName}</option>
                                ))}
                            </Select>
                        </div>
                    )}
                </div>
            </form>
        </Modal>
    );
};
