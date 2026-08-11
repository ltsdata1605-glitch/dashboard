import React, { useState } from 'react';
import { Modal } from '../../../../../components/shared/ui/Modal';
import { Button } from '../../../../../components/shared/ui/Button';

export const ImportPrevMonthModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: string) => void;
    title?: string;
    description?: string;
}> = ({ isOpen, onClose, onSave, title = 'Nhập dữ liệu tháng trước', description = 'Dán dữ liệu báo cáo "Doanh thu nhân viên" của tháng trước vào đây để so sánh tăng trưởng.' }) => {
    const [pastedData, setPastedData] = useState('');

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={title}
            maxWidth="xl"
            footer={
                <div className="flex gap-3">
                    <Button variant="ghost" onClick={onClose} className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0 text-inherit flex-1 py-2 text-sm font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors">Huỷ</Button>
                    <Button variant="ghost" onClick={() => { onSave(pastedData); onClose(); }} className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0 text-inherit flex-[2] py-2 bg-sky-600 text-white text-sm font-bold rounded-xl shadow-sm hover:bg-sky-700 active:scale-95 transition-all">Lưu dữ liệu</Button>
                </div>
            }
        >
            <p className="text-xs text-slate-500 mb-4">{description}</p>
            <textarea
                autoFocus
                value={pastedData}
                onChange={e => setPastedData(e.target.value)}
                placeholder="Nhấn Ctrl + V để dán..."
                className="w-full h-48 p-4 bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 rounded-xl font-mono text-[10px] focus:ring-2 focus:ring-sky-500 outline-none"
            />
        </Modal>
    );
};
