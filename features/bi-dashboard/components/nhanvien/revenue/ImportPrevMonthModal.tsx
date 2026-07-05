import React, { useState } from 'react';
import { Modal } from '../../../../../components/shared/ui/Modal';

export const ImportPrevMonthModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: string) => void;
}> = ({ isOpen, onClose, onSave }) => {
    const [pastedData, setPastedData] = useState('');

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Nhập dữ liệu tháng trước"
            maxWidth="xl"
            footer={
                <div className="flex gap-3">
                    <button onClick={onClose} className="flex-1 py-2 text-sm font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors">Huỷ</button>
                    <button onClick={() => { onSave(pastedData); onClose(); }} className="flex-[2] py-2 bg-primary-600 text-white text-sm font-bold rounded-xl shadow-lg hover:bg-primary-700 active:scale-95 transition-all">Lưu dữ liệu</button>
                </div>
            }
        >
            <p className="text-xs text-slate-500 mb-4">Dán dữ liệu báo cáo "Doanh thu nhân viên" của tháng trước vào đây để so sánh tăng trưởng.</p>
            <textarea
                autoFocus
                value={pastedData}
                onChange={e => setPastedData(e.target.value)}
                placeholder="Nhấn Ctrl + V để dán..."
                className="w-full h-48 p-4 bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 rounded-xl font-mono text-[10px] focus:ring-2 focus:ring-primary-500 outline-none"
            />
        </Modal>
    );
};
