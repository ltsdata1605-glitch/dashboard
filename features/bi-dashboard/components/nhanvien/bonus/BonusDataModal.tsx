import React, { useState, useRef, useEffect } from 'react';
import { Employee, BonusMetrics } from '../../../types/nhanVienTypes';
import { parseBonusBlock } from '../../../utils/bonusParser';
import { Button } from '../../../../../components/shared/ui/Button';
import { Modal } from '../../../../../components/shared/ui/Modal';
import * as db from '../../../utils/db';
import { focusHrmWindow } from './hrmWindow';
import toast from 'react-hot-toast';

export const BonusDataModal: React.FC<{
    employee: Employee;
    nextEmployee?: Employee | null;
    supermarketName: string;
    onClose: (reason: 'save' | 'skip' | 'stop') => void;
    onSave: (name: string, metrics: BonusMetrics) => void;
    remainingInBatch?: number;
}> = ({ employee, nextEmployee, supermarketName, onClose, onSave, remainingInBatch }) => {
    const [pastedData, setPastedData] = useState('');
    const [error, setError] = useState<string | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        setPastedData('');
        setError(null);
        textareaRef.current?.focus();

        const employeeId = employee.originalName.split(' - ')[1]?.trim();
        if (employeeId) {
            navigator.clipboard.writeText(employeeId)
                .then(() => toast.success(`Đã copy: ${employeeId}`, { duration: 1500, position: 'top-center' }))
                .catch(err => console.error('Lỗi copy:', err));
        }
    }, [employee.originalName]);

    const processAndSave = async (data: string) => {
        const result = parseBonusBlock(data);
        if ('error' in result) { setError(result.error); return false; }
        const { metrics } = result;

        const historyKey = `bonus-history-${supermarketName}-${employee.originalName}`;
        const currentHistory = await db.get<BonusMetrics[]>(historyKey) || [];
        await db.set(historyKey, [...currentHistory, metrics].slice(-30));

        onSave(employee.originalName, metrics);
        return true;
    };

    return (
        <Modal
            isOpen={true}
            onClose={() => onClose('stop')}
            zIndex="z-[300]"
            maxWidth="2xl"
            title={
                <span className="flex items-center gap-3 uppercase">
                    <span className="text-slate-500 dark:text-slate-400">Cập nhật:</span>
                    <span className="text-sky-600 dark:text-sky-400">{employee.name}</span>
                    {remainingInBatch && remainingInBatch > 0 ? (
                        <span className="px-2 py-0.5 bg-rose-50 text-rose-600 border border-rose-200 text-[10px] font-bold rounded-lg uppercase whitespace-nowrap">Batch Mode</span>
                    ) : null}
                </span>
            }
            subTitle="Dán dữ liệu HRM > Quản lý điểm thưởng > Điểm thưởng nhân viên"
            footer={
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-3">
                        {remainingInBatch && remainingInBatch > 0 ? (
                            <div className="flex flex-col">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none mb-1">Chờ duyệt</span>
                                <div className="flex items-end gap-1.5">
                                     <span className="text-2xl font-black text-rose-600 tabular-nums leading-none">{remainingInBatch}</span>
                                     <span className="text-[10px] font-semibold text-slate-500">nhân viên</span>
                                </div>
                            </div>
                        ) : <div />}
                    </div>

                    <div className="flex gap-3 w-full sm:w-auto">
                        <Button
                            variant="ghost"
                            onClick={() => onClose('stop')}
                            className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0 text-inherit flex-1 sm:flex-none px-6 py-2.5 text-sm font-bold text-rose-600 bg-rose-50 border border-rose-200 rounded-xl hover:bg-rose-100 transition-colors"
                        >
                            Kết thúc
                        </Button>
                        <Button
                            variant="ghost"
                            onClick={() => onClose('skip')}
                            className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0 text-inherit flex-1 sm:flex-none px-6 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                        >
                            Bỏ qua
                        </Button>
                        <Button
                            variant="ghost"
                            onClick={async () => (await processAndSave(pastedData)) && onClose('save')}
                            className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0 text-inherit flex-1 sm:flex-none px-8 py-2.5 text-sm font-bold text-white bg-sky-600 border border-transparent rounded-xl hover:bg-sky-700 shadow-sm transition-colors"
                        >
                            Lưu & Tiếp tục
                        </Button>
                    </div>
                </div>
            }
        >
            {/* Body Content */}
            <div className="flex-1 w-full">
                    <textarea
                        ref={textareaRef}
                        value={pastedData}
                        onChange={e => setPastedData(e.target.value)}
                        onPaste={async (e) => {
                            e.preventDefault();
                            const text = e.clipboardData.getData('text');
                            if (await processAndSave(text)) {
                                toast.success(`Lưu thành công: ${employee.name}`, { duration: 1500 });

                                if (nextEmployee) {
                                    const nextId = nextEmployee.originalName.split(' - ')[1]?.trim();
                                    if (nextId) {
                                        try {
                                            await navigator.clipboard.writeText(nextId);
                                            toast.success(`Đã copy: ${nextId}`, { duration: 1500, position: 'top-center' });
                                        } catch (err) {}
                                    }
                                }

                                onClose('save');
                                focusHrmWindow();
                            } else {
                                setPastedData(text);
                            }
                        }}
                        placeholder="Click vào đây hoặc nhấn tự động dán (Ctrl + V)..."
                        className="w-full h-48 py-3 px-4 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/50 font-mono text-xs sm:text-sm text-slate-700 dark:text-slate-300 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none transition-colors resize-none placeholder-slate-400"
                    />
                    {error && <p className="mt-2 text-xs font-semibold text-rose-500">{error}</p>}
            </div>
        </Modal>
    );
};
