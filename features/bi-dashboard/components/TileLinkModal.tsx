import React, { useState, useEffect } from 'react';
import { Modal } from '../../../components/shared/ui/Modal';
import { Button } from '../../../components/shared/ui/Button';
import { Input } from '../../../components/shared/ui/Input';
import { ExternalLink, RotateCcw, Save, Link2 } from 'lucide-react';
import { TILE_LABELS } from '../services/tileLinkService';
import toast from 'react-hot-toast';

export interface TileLinkModalProps {
    isOpen: boolean;
    onClose: () => void;
    tileId: string;
    tileName?: string;
    groupName?: string;
    currentUrl: string;
    defaultUrl: string;
    onSave: (tileId: string, newUrl: string) => Promise<void>;
    onReset: (tileId: string) => Promise<void>;
}

export const TileLinkModal: React.FC<TileLinkModalProps> = ({
    isOpen,
    onClose,
    tileId,
    tileName,
    groupName,
    currentUrl,
    defaultUrl,
    onSave,
    onReset,
}) => {
    const [urlInput, setUrlInput] = useState(currentUrl);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setUrlInput(currentUrl);
        }
    }, [isOpen, currentUrl]);

    const info = TILE_LABELS[tileId];
    const displayGroup = groupName || info?.group || 'Báo cáo';
    const displayName = tileName || info?.name || tileId;

    const isCustomized = urlInput.trim() !== defaultUrl.trim();

    const handleSave = async () => {
        const trimmed = urlInput.trim();
        if (!trimmed) {
            toast.error('Vui lòng nhập đường dẫn URL');
            return;
        }

        try {
            setIsSaving(true);
            await onSave(tileId, trimmed);
            toast.success('Đã lưu liên kết vào Firebase thành công!');
            onClose();
        } catch (error) {
            console.error('Lỗi khi lưu liên kết:', error);
            toast.error('Không thể lưu liên kết, vui lòng thử lại.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleReset = async () => {
        try {
            setIsSaving(true);
            setUrlInput(defaultUrl);
            await onReset(tileId);
            toast.success('Đã khôi phục liên kết mặc định!');
            onClose();
        } catch (error) {
            console.error('Lỗi khi khôi phục liên kết:', error);
            toast.error('Không thể khôi phục liên kết.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleOpenLink = () => {
        const target = urlInput.trim() || defaultUrl;
        if (target) {
            window.open(target, '_blank', 'noopener,noreferrer');
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Cấu hình liên kết báo cáo"
            subTitle={`${displayGroup} • ${displayName}`}
            maxWidth="md"
            footer={
                <div className="flex items-center justify-between w-full gap-2">
                    <div className="flex items-center gap-1.5">
                        <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={handleOpenLink}
                            className="flex items-center gap-1.5 text-xs font-semibold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/40 hover:bg-sky-100 border-sky-200 dark:border-sky-800"
                        >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>Mở liên kết</span>
                        </Button>
                        {isCustomized && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={handleReset}
                                disabled={isSaving}
                                className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                                title="Khôi phục lại liên kết gốc mặc định"
                            >
                                <RotateCcw className="w-3 h-3" />
                                <span>Mặc định</span>
                            </Button>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={onClose}
                            disabled={isSaving}
                            className="text-xs"
                        >
                            Đóng
                        </Button>
                        <Button
                            type="button"
                            variant="primary"
                            size="sm"
                            onClick={handleSave}
                            disabled={isSaving}
                            className="flex items-center gap-1.5 text-xs font-semibold shadow-sm"
                        >
                            <Save className="w-3.5 h-3.5" />
                            <span>{isSaving ? 'Đang lưu...' : 'Lưu vào Firebase'}</span>
                        </Button>
                    </div>
                </div>
            }
        >
            <div className="space-y-4 py-1 text-sm text-slate-700 dark:text-slate-300">
                <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-lg border border-slate-200/80 dark:border-slate-700/80 flex items-start gap-2.5">
                    <Link2 className="w-4 h-4 text-sky-600 dark:text-sky-400 mt-0.5 shrink-0" />
                    <div className="text-xs leading-relaxed space-y-1">
                        <p className="font-semibold text-slate-800 dark:text-slate-200">
                            Ô: <span className="text-sky-600 dark:text-sky-400">{displayName}</span> ({displayGroup})
                        </p>
                        <p className="text-slate-500 dark:text-slate-400">
                            Bạn có thể dán link mới của mình vào bên dưới. Khi lưu, đường dẫn sẽ được đồng bộ lên Firebase và áp dụng cho tài khoản của bạn.
                        </p>
                    </div>
                </div>

                <div className="space-y-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                        Đường dẫn báo cáo (URL)
                    </label>
                    <Input
                        type="url"
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        placeholder="https://..."
                        className="text-xs font-mono"
                        autoFocus
                    />
                </div>

                <div className="text-[11px] text-slate-500 dark:text-slate-400 bg-slate-100/70 dark:bg-slate-800/40 p-2.5 rounded-md border border-slate-200/50 dark:border-slate-700/50 break-all">
                    <span className="font-semibold text-slate-600 dark:text-slate-300">Link mặc định:</span>{' '}
                    <span className="font-mono">{defaultUrl}</span>
                </div>
            </div>
        </Modal>
    );
};
