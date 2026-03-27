
import React, { useState, useEffect, useRef } from 'react';
import ModalWrapper from '../../modals/ModalWrapper';
import { ColumnConfig, ContestTableConfig } from '../../../types';
import { ICON_OPTIONS } from '../../employees/EmployeeAnalysis'; // Hoặc move ICON_OPTIONS ra constants

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
          <ModalWrapper isOpen={isOpen} onClose={onClose} title={tabId ? "Sửa Tab Thi Đua" : "Tạo Tab Thi Đua Mới"} subTitle={tabId ? "Chỉnh sửa tên cho tab" : "Tạo một trang báo cáo thi đua mới"} titleColorClass="text-indigo-600 dark:text-indigo-400" maxWidthClass="max-w-md">
            <form onSubmit={handleSubmit}>
                <div className="p-6 space-y-4">
                    <div>
                        <label htmlFor="tabName" className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Tên Tab</label>
                        <input
                            ref={inputRef}
                            id="tabName"
                            type="text"
                            value={tabName}
                            onChange={e => setTabName(e.target.value)}
                            placeholder="VD: Thi Đua Tháng 10"
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition outline-none"
                            required
                        />
                    </div>
                </div>
                 <div className="p-4 flex justify-end gap-3 bg-slate-50 dark:bg-slate-800/80 rounded-b-xl border-t border-slate-200 dark:border-slate-700">
                    <button type="button" onClick={onClose} className="py-2 px-4 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 transition-colors">Ừỷ</button>
                    <button type="submit" className="py-2 px-6 rounded-xl text-sm font-bold text-white bg-indigo-500 hover:bg-indigo-600 transition-colors shadow-sm">{tabId ? "Lưu thay đổi" : "Tạo Tab"}</button>
                </div>
            </form>
         </ModalWrapper>
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
        <ModalWrapper isOpen={isOpen} onClose={onClose} title={isEditing ? "Sửa Bảng Thi Đua" : "Tạo Bảng Thi Đua Mới"} subTitle={isEditing ? "Chỉnh sửa tên và cài đặt cho bảng này" : "Đặt tên cho bảng thi đua trong tab hiện tại"} titleColorClass="text-emerald-600 dark:text-emerald-400" maxWidthClass="max-w-md">
            <form onSubmit={handleSubmit}>
                <div className="p-6 space-y-4">
                    <div>
                        <label htmlFor="tableName" className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Tên Bảng</label>
                        <input
                            ref={inputRef}
                            id="tableName"
                            type="text"
                            value={tableName}
                            onChange={e => setTableName(e.target.value)}
                            placeholder="VD: Bảng thi đua Sim số"
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition outline-none"
                            required
                        />
                    </div>
                    {isEditing && columns.length > 0 && (
                        <div>
                            <label htmlFor="sortColumn" className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Sắp xếp mặc định (giảm dần)</label>
                            <select
                                id="sortColumn"
                                value={sortColumnId}
                                onChange={e => setSortColumnId(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition outline-none"
                            >
                                <option value="">-- Không sắp xếp --</option>
                                {columns.map(col => (
                                    <option key={col.id} value={col.id}>{col.columnName}</option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>
                <div className="p-4 flex justify-end gap-3 bg-slate-50 dark:bg-slate-800/80 rounded-b-xl border-t border-slate-200 dark:border-slate-700">
                    <button type="button" onClick={onClose} className="py-2 px-4 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 transition-colors">Ừỷ</button>
                    <button type="submit" className="py-2 px-6 rounded-xl text-sm font-bold text-white bg-emerald-500 hover:bg-emerald-600 transition-colors shadow-sm">{isEditing ? "Lưu thay đổi" : "Tạo Bảng"}</button>
                </div>
            </form>
        </ModalWrapper>
    );
};
