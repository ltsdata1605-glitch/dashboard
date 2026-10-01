import React, { useState, useEffect, useRef } from 'react';
import { useModalBehavior } from '../../../components/shared/ui/Modal';
import { X, Sparkles, Image as ImageIcon, Trash2, UploadCloud, Loader2, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '../../../components/shared/ui/Button';
import { KeywordReply, KeywordMatchType } from '../types/lineBot.types';
import { uploadBotImage, deleteBotImage } from '../services/botMediaService';

const MAX_IMAGES = 4;

interface KeywordEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    keyword: Partial<KeywordReply> | null;
    onSave: (kw: Partial<KeywordReply>) => Promise<string | null>;
}

export const KeywordEditModal: React.FC<KeywordEditModalProps> = ({
    isOpen,
    onClose,
    keyword,
    onSave
}) => {
    const [kwText, setKwText] = useState<string>('');
    const [matchType, setMatchType] = useState<KeywordMatchType>('EXACT');
    const [replyText, setReplyText] = useState<string>('');
    const [imageUrls, setImageUrls] = useState<string[]>([]);
    const [active, setActive] = useState<boolean>(true);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [isUploading, setIsUploading] = useState<boolean>(false);
    const [isDragging, setIsDragging] = useState<boolean>(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (keyword) {
            setKwText(keyword.keyword || '');
            setMatchType(keyword.matchType || 'EXACT');
            setReplyText(keyword.replyText || '');
            setImageUrls(keyword.imageUrls || []);
            setActive(keyword.active ?? true);
        } else {
            setKwText('');
            setMatchType('EXACT');
            setReplyText('');
            setImageUrls([]);
            setActive(true);
        }
        setIsUploading(false);
        setIsDragging(false);
    }, [keyword, isOpen]);

    // Modal tự dựng: gắn hành vi chuẩn (Escape, bẫy Tab, khoá cuộn theo ngăn xếp, trả focus) — audit A34.
    const dialogRef = useRef<HTMLDivElement>(null);
    useModalBehavior(isOpen, onClose, dialogRef);
    if (!isOpen) return null;

    const handleFiles = async (files: FileList | File[]) => {
        const fileArray = Array.from(files).filter(f => f.type.startsWith('image/'));
        if (fileArray.length === 0) {
            toast.error('Vui lòng chọn tệp hình ảnh hợp lệ (JPG, PNG, WebP)');
            return;
        }

        const remainingSlots = MAX_IMAGES - imageUrls.length;
        if (remainingSlots <= 0) {
            toast.error(`Đã đạt giới hạn tối đa ${MAX_IMAGES} ảnh cho mỗi từ khoá`);
            return;
        }

        const toUpload = fileArray.slice(0, remainingSlots);
        if (fileArray.length > remainingSlots) {
            toast(`Chỉ tải lên được ${remainingSlots} ảnh do giới hạn tối đa ${MAX_IMAGES} ảnh`, {
                icon: 'ℹ️'
            });
        }

        setIsUploading(true);
        const uploadedUrls: string[] = [];

        try {
            for (const file of toUpload) {
                const toastId = toast.loading(`Đang tải ảnh "${file.name}"...`);
                try {
                    const url = await uploadBotImage(file);
                    uploadedUrls.push(url);
                    toast.success(`Đã tải xong ảnh "${file.name}"`, { id: toastId });
                } catch (err: any) {
                    toast.error(`Lỗi tải ảnh "${file.name}": ${err.message}`, { id: toastId });
                }
            }

            if (uploadedUrls.length > 0) {
                setImageUrls(prev => [...prev, ...uploadedUrls]);
            }
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            handleFiles(e.target.files);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!isDragging) setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFiles(e.dataTransfer.files);
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        if (e.clipboardData && e.clipboardData.items) {
            const items = Array.from(e.clipboardData.items);
            const imageFiles: File[] = [];
            for (const item of items) {
                if (item.type.startsWith('image/')) {
                    const file = item.getAsFile();
                    if (file) imageFiles.push(file);
                }
            }
            if (imageFiles.length > 0) {
                e.preventDefault();
                handleFiles(imageFiles);
            }
        }
    };

    const handleRemoveImage = (idx: number) => {
        const removedUrl = imageUrls[idx];
        setImageUrls(imageUrls.filter((_, i) => i !== idx));
        // Dọn dẹp background nếu là ảnh bot_media
        if (removedUrl) {
            deleteBotImage(removedUrl).catch(() => {});
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!kwText.trim()) {
            toast.error('Vui lòng nhập từ khoá');
            return;
        }
        if (!replyText.trim() && imageUrls.length === 0) {
            toast.error('Vui lòng nhập nội dung trả lời hoặc thêm ít nhất 1 ảnh');
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await onSave({
                ...(keyword || {}),
                keyword: kwText.trim().toLowerCase(),
                matchType,
                replyText: replyText.trim(),
                imageUrls,
                active
            });
            if (res) onClose();
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div data-modal-overlay="" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-label="Từ khoá tự động trả lời"
                tabIndex={-1}
                onPaste={handlePaste}
                className="outline-none bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]"
            >
                <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <h3 className="font-bold text-slate-800 dark:text-white text-sm flex items-center gap-2">
                        <Sparkles size={16} className="text-emerald-500" />
                        <span>{keyword?.id ? 'Chỉnh Sửa Từ Khoá' : 'Thêm Từ Khoá Tự Động'}</span>
                    </h3>
                    <Button variant="ghost" onClick={onClose} className="min-w-11 sm:min-w-0 p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                        <X size={18} />
                    </Button>
                </div>

                <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 flex-1">
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Từ khoá kích hoạt <span className="text-rose-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={kwText}
                            onChange={e => setKwText(e.target.value)}
                            placeholder="Ví dụ: hướng dẫn, xin mã, bảo hành..."
                            className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Kiểu so khớp
                            </label>
                            <select
                                value={matchType}
                                onChange={e => setMatchType(e.target.value as any)}
                                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                            >
                                <option value="EXACT">Khớp chính xác (Toàn bộ tin)</option>
                                <option value="CONTAINS">Khớp chứa (Tin nhắn có chứa từ)</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Trạng thái
                            </label>
                            <select
                                value={active ? '1' : '0'}
                                onChange={e => setActive(e.target.value === '1')}
                                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                            >
                                <option value="1">Đang kích hoạt</option>
                                <option value="0">Tạm tắt</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Nội dung tin nhắn trả lời tự động
                        </label>
                        <textarea
                            rows={3}
                            value={replyText}
                            onChange={e => setReplyText(e.target.value)}
                            placeholder="Nhập nội dung bot sẽ phản hồi..."
                            className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                        />
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                                Hình ảnh đính kèm ({imageUrls.length}/{MAX_IMAGES})
                            </label>
                            <span className="text-[11px] text-slate-400">
                                Tự động nén & lưu trực tiếp
                            </span>
                        </div>

                        {/* Input file ẩn */}
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/png,image/jpeg,image/webp,image/jpg"
                            multiple
                            onChange={handleFileInputChange}
                            className="hidden"
                        />

                        {/* Khu vực Upload Kéo thả / Bấm chọn */}
                        {imageUrls.length < MAX_IMAGES && (
                            <div
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                                onClick={() => !isUploading && fileInputRef.current?.click()}
                                className={`group relative border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-1.5 ${
                                    isDragging
                                        ? 'border-emerald-500 bg-emerald-500/10 scale-[0.99]'
                                        : 'border-slate-200 dark:border-slate-700 hover:border-emerald-500 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20'
                                } ${isUploading ? 'opacity-60 cursor-not-allowed' : ''}`}
                            >
                                {isUploading ? (
                                    <div className="flex items-center gap-2 py-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                                        <Loader2 size={18} className="animate-spin" />
                                        <span>Đang xử lý và tải ảnh lên...</span>
                                    </div>
                                ) : (
                                    <>
                                        <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <UploadCloud size={20} />
                                        </div>
                                        <div className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                                            Bấm để chọn ảnh từ máy hoặc kéo thả vào đây
                                        </div>
                                        <div className="text-[11px] text-slate-400">
                                            Hỗ trợ JPG, PNG, WebP • Dán trực tiếp (Ctrl+V)
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        {/* Danh sách ảnh đã upload */}
                        {imageUrls.length > 0 && (
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-3">
                                {imageUrls.map((url, i) => (
                                    <div
                                        key={i}
                                        className="group relative aspect-square rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 shadow-sm"
                                    >
                                        <img
                                            src={url}
                                            alt={`Ảnh ${i + 1}`}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                            onError={(e) => {
                                                (e.target as HTMLElement).style.display = 'none';
                                            }}
                                        />

                                        {/* Badge số thứ tự */}
                                        <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-slate-900/70 text-white text-[10px] font-bold backdrop-blur-xs">
                                            #{i + 1}
                                        </div>

                                        {/* Lớp phủ hành động khi hover */}
                                        <div className="absolute inset-0 bg-slate-900/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                            <a
                                                href={url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="p-1.5 rounded-lg bg-white/90 text-slate-700 hover:text-emerald-600 hover:bg-white transition-all shadow-sm"
                                                title="Xem ảnh gốc"
                                                onClick={e => e.stopPropagation()}
                                            >
                                                <ExternalLink size={14} />
                                            </a>
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleRemoveImage(i);
                                                }}
                                                className="p-1.5 rounded-lg bg-rose-600 text-white hover:bg-rose-700 transition-all shadow-sm"
                                                title="Xoá ảnh này"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2 bg-slate-50/50 dark:bg-slate-800/50 -mx-5 -mb-5 mt-4">
                        <Button variant="ghost" type="button" onClick={onClose} className="px-4 py-2 text-xs font-semibold text-slate-600 rounded-lg">
                            Huỷ
                        </Button>
                        <Button
                            variant="primary"
                            type="submit"
                            disabled={isSubmitting || isUploading}
                            className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm"
                        >
                            {isSubmitting ? 'Đang lưu...' : 'Lưu Từ Khoá'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};
