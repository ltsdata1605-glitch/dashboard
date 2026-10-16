import React, { useState, useEffect } from 'react';
import { Modal } from '../shared/ui/Modal';
import { Button } from '../shared/ui/Button';
import { Input } from '../shared/ui/Input';
import { AppIcon } from '../shared/ui/icon/AppIcon';

interface ShiftWarehouseInputModalProps {
    isOpen: boolean;
    files: File[];
    defaultWarehouseCode?: string;
    onClose: () => void;
    onConfirm: (maKho: string) => void;
}

export const ShiftWarehouseInputModal: React.FC<ShiftWarehouseInputModalProps> = ({
    isOpen,
    files,
    defaultWarehouseCode = '',
    onClose,
    onConfirm,
}) => {
    const [maKho, setMaKho] = useState('');
    const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);

    useEffect(() => {
        if (isOpen) {
            // Tự động đoán mã kho từ defaultWarehouseCode hoặc tên file
            let guessedCode = defaultWarehouseCode ? defaultWarehouseCode.replace(/\D/g, '') : '';
            if (!guessedCode && files.length > 0) {
                const match = files[0].name.match(/\b\d{3,5}\b/) || files[0].name.match(/\d+/);
                if (match) {
                    guessedCode = match[0].replace(/\D/g, '');
                }
            }
            setMaKho(guessedCode);
            setHasAttemptedSubmit(false);
        }
    }, [isOpen, files, defaultWarehouseCode]);

    const cleanMaKho = maKho.replace(/\D/g, '');
    const isError = hasAttemptedSubmit && cleanMaKho.length === 0;

    const handleConfirm = () => {
        if (!cleanMaKho) {
            setHasAttemptedSubmit(true);
            return;
        }
        onConfirm(cleanMaKho);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        // Chặn phím khoảng trắng tuyệt đối
        if (e.key === ' ' || e.code === 'Space') {
            e.preventDefault();
            return;
        }
        // Cho phép phím Enter để xác nhận
        if (e.key === 'Enter') {
            e.preventDefault();
            handleConfirm();
            return;
        }
        // Chỉ cho phép các phím điều hướng và phím số
        const allowedNavKeys = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Home', 'End'];
        if (!/[0-9]/.test(e.key) && !allowedNavKeys.includes(e.key) && !e.ctrlKey && !e.metaKey) {
            e.preventDefault();
        }
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
        e.preventDefault();
        const text = e.clipboardData.getData('text');
        // Chỉ lấy số từ clipboard, loại bỏ toàn bộ chữ và khoảng trắng
        const numbersOnly = text.replace(/\D/g, '');
        setMaKho(prev => {
            const next = (prev + numbersOnly).replace(/\D/g, '');
            return next;
        });
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Nhập Mã Kho Siêu Thị"
            subTitle="Định danh nhân viên cho siêu thị & đồng bộ chỉ tiêu với Report BI"
            maxWidth="md"
            titleColorClass="text-sky-700 dark:text-sky-400"
            footer={
                <div className="flex justify-end gap-2 sm:gap-3">
                    <Button variant="secondary" size="sm" onClick={onClose}>
                        Hủy bỏ
                    </Button>
                    <Button
                        variant="primary"
                        size="sm"
                        onClick={handleConfirm}
                        disabled={!cleanMaKho}
                        leftIcon={<AppIcon name="check" size="sm" />}
                    >
                        Xác nhận & Nạp danh sách
                    </Button>
                </div>
            }
        >
            <div className="space-y-4 text-xs sm:text-sm">
                {/* File info card */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-400 flex items-center justify-center shrink-0">
                        <AppIcon name="cloudUpload" size="md" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                            {files.length === 1 ? files[0].name : `${files.length} tệp phân ca được chọn`}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            {files.length === 1 ? `${(files[0].size / 1024).toFixed(1)} KB` : files.map(f => f.name).join(', ')}
                        </div>
                    </div>
                </div>

                {/* Input Mã kho */}
                <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        Mã kho siêu thị <span className="text-rose-500">*</span>
                    </label>
                    <Input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        autoFocus
                        value={maKho}
                        onChange={(e) => setMaKho(e.target.value.replace(/\D/g, ''))}
                        onKeyDown={handleKeyDown}
                        onPaste={handlePaste}
                        placeholder="VD: 1024 hoặc 8831"
                        className="font-mono text-base tracking-wider font-bold text-sky-700 dark:text-sky-400"
                        error={isError ? 'Vui lòng nhập mã kho (chỉ nhập số, không nhập chữ hay khoảng trắng)' : undefined}
                    />
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                        <AppIcon name="info" size="xs" className="text-sky-600 shrink-0" />
                        <span>Chỉ được phép nhập số. Không được nhập chữ và khoảng trắng.</span>
                    </div>
                </div>

                {/* Ghi chú định danh & đồng bộ */}
                <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 text-[11px] sm:text-xs text-amber-800 dark:text-amber-300 space-y-1">
                    <div className="font-bold flex items-center gap-1">
                        <AppIcon name="help" size="xs" className="text-amber-600" />
                        Mục đích định danh mã kho:
                    </div>
                    <ul className="list-disc pl-4 space-y-0.5 opacity-90">
                        <li>Gán mã kho cho toàn bộ nhân viên được nạp từ file.</li>
                        <li>Tự động map danh sách nhân viên sang <b>Report BI</b> để tính Target Doanh thu & Target Thi đua theo từng siêu thị.</li>
                    </ul>
                </div>
            </div>
        </Modal>
    );
};

export default ShiftWarehouseInputModal;
