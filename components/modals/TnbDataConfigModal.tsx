import React, { useState, useEffect } from 'react';
import { Modal } from '../shared/ui/Modal';
import { Button } from '../shared/ui/Button';
import { AppIcon } from '../shared/ui/icon';
import { toast } from '../shared/ui/toast';
import { useAuth } from '../../contexts/AuthContext';
import { saveTnbMbmCode, openTnbData } from '../../services/tnbDataService';

interface TnbDataConfigModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSaved?: (code: string) => void;
    initialCode?: string;
}

export const TnbDataConfigModal: React.FC<TnbDataConfigModalProps> = ({
    isOpen,
    onClose,
    onSaved,
    initialCode = '',
}) => {
    const { user, departmentId } = useAuth();
    const [code, setCode] = useState(initialCode);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setCode(initialCode);
        }
    }, [isOpen, initialCode]);

    const handleSaveAndOpen = async () => {
        const clean = code.trim().toUpperCase();
        if (!clean) {
            toast.error('Vui lòng nhập mã bảo mật.');
            return;
        }

        setIsSaving(true);
        try {
            const saved = await saveTnbMbmCode(clean, user, departmentId);
            toast.success(`Đã lưu mã bảo mật "${saved}" và đang chuyển hướng sang TNB Data...`, {
                id: 'tnb-data-save-success',
                duration: 3500,
            });
            onSaved?.(saved);
            onClose();
            openTnbData(saved);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            toast.error(`Lỗi khi lưu mã: ${msg}`);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Tra Cứu Sức Khỏe Siêu Thị (TNB Data)"
            subTitle="Tự động đăng nhập & tra cứu qua Userscript trên admintnb.com/data"
            maxWidth="md"
            footer={
                <div className="flex w-full items-center justify-end gap-2">
                    <Button variant="secondary" size="sm" onClick={onClose} disabled={isSaving}>
                        Đóng
                    </Button>
                    <Button
                        variant="primary"
                        size="sm"
                        onClick={handleSaveAndOpen}
                        disabled={isSaving || !code.trim()}
                    >
                        <AppIcon name="externalLink" size="sm" className="mr-1.5" />
                        {isSaving ? 'Đang lưu...' : 'Lưu & Mở TNB Data'}
                    </Button>
                </div>
            }
        >
            <div className="space-y-4 text-slate-700 text-sm">
                <div className="p-3.5 rounded-xl bg-sky-50 border border-sky-200 flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-sky-600 text-white shrink-0 mt-0.5 shadow-sm">
                        <AppIcon name="database" size="sm" />
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                        <p className="font-semibold text-sky-900">
                            Tự động hóa tra cứu dữ liệu Sức Khỏe Siêu Thị
                        </p>
                        <p className="text-xs text-sky-800/90 leading-relaxed">
                            Mã bảo mật sẽ được lưu an toàn trên Firebase. Mỗi lần bạn bấm nút, hệ thống sẽ tự động mở <b>admintnb.com/data</b>, tự điền mã vào ô và nhấn <b>XÁC NHẬN</b>.
                        </p>
                    </div>
                </div>

                <div className="space-y-1.5">
                    <label htmlFor="tnb-mbm-code-input" className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                        Mã bảo mật truy cập (Code)
                    </label>
                    <div className="relative">
                        <input
                            id="tnb-mbm-code-input"
                            name="tnb-security-token"
                            type="text"
                            value={code}
                            onChange={(e) => setCode(e.target.value.toUpperCase())}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleSaveAndOpen();
                                }
                            }}
                            placeholder="NHẬP MÃ BẢO MẬT"
                            autoComplete="off"
                            autoCorrect="off"
                            autoCapitalize="characters"
                            spellCheck="false"
                            data-lpignore="true"
                            data-1p-ignore="true"
                            data-form-type="other"
                            autoFocus
                            className="w-full h-11 px-3.5 font-mono text-base font-bold tracking-widest text-slate-800 bg-white border-2 border-sky-300 rounded-xl focus:outline-hidden focus:border-sky-600 focus:ring-3 focus:ring-sky-500/20 transition-all uppercase placeholder:font-sans placeholder:normal-case placeholder:font-medium placeholder:tracking-normal placeholder:text-slate-400"
                        />
                        {code && (
                            <button
                                type="button"
                                onClick={() => setCode('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
                                title="Xóa mã"
                            >
                                <AppIcon name="close" size="xs" />
                            </button>
                        )}
                    </div>
                    <p className="text-xs text-slate-500">
                        Nhập chính xác mã được cấp quyền xem dữ liệu siêu thị trên hệ thống admintnb.com.
                    </p>
                </div>
            </div>
        </Modal>
    );
};

export default TnbDataConfigModal;
