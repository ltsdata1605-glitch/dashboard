import React, { useState } from 'react';
import { XIcon } from '../../Icons';

export const ImportPrevMonthModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: string) => void;
}> = ({ isOpen, onClose, onSave }) => {
    const [pastedData, setPastedData] = useState('');
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-6 w-full max-w-xl animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white uppercase">Nhập dữ liệu tháng trước</h3>
                    <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-full"><XIcon className="h-5 w-5" /></button>
                </div>
                <p className="text-xs text-slate-500 mb-4">Dán dữ liệu báo cáo "Doanh thu nhân viên" của tháng trước vào đây để so sánh tăng trưởng.</p>
                <textarea
                    autoFocus
                    value={pastedData}
                    onChange={e => setPastedData(e.target.value)}
                    placeholder="Nhấn Ctrl + V để dán..."
                    className="w-full h-48 p-4 bg-slate-50 dark:bg-slate-800 border rounded-xl font-mono text-[10px] focus:ring-2 focus:ring-primary-500 outline-none"
                />
                <div className="mt-6 flex gap-3">
                    <button onClick={onClose} className="flex-1 py-2 text-sm font-bold text-slate-500 hover:bg-slate-50 rounded-xl">Huỷ</button>
                    <button onClick={() => { onSave(pastedData); onClose(); }} className="flex-[2] py-2 bg-primary-600 text-white text-sm font-bold rounded-xl shadow-lg">Lưu dữ liệu</button>
                </div>
            </div>
        </div>
    );
};
