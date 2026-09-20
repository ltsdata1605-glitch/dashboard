import React, { useState, useEffect } from 'react';
import { X, Sparkles, Image, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '../../../components/shared/ui/Button';
import { KeywordReply, KeywordMatchType } from '../types/lineBot.types';

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
    const [newImageUrl, setNewImageUrl] = useState<string>('');
    const [active, setActive] = useState<boolean>(true);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

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
        setNewImageUrl('');
    }, [keyword, isOpen]);

    if (!isOpen) return null;

    const handleAddImage = () => {
        const url = newImageUrl.trim();
        if (!url) return;
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            toast.error('URL hình ảnh phải bắt đầu bằng http:// hoặc https://');
            return;
        }
        setImageUrls([...imageUrls, url]);
        setNewImageUrl('');
    };

    const handleRemoveImage = (idx: number) => {
        setImageUrls(imageUrls.filter((_, i) => i !== idx));
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
                <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <h3 className="font-bold text-slate-800 dark:text-white text-sm flex items-center gap-2">
                        <Sparkles size={16} className="text-emerald-500" />
                        <span>{keyword?.id ? 'Chỉnh Sửa Từ Khoá' : 'Thêm Từ Khoá Tự Động'}</span>
                    </h3>
                    <Button variant="ghost" onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
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
                            className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold"
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
                                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold"
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
                                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold"
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
                            rows={4}
                            value={replyText}
                            onChange={e => setReplyText(e.target.value)}
                            placeholder="Nhập nội dung bot sẽ phản hồi..."
                            className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Hình ảnh đính kèm (URL ảnh HTTPS)
                        </label>
                        <div className="flex gap-2 mb-2">
                            <input
                                type="url"
                                value={newImageUrl}
                                onChange={e => setNewImageUrl(e.target.value)}
                                placeholder="https://example.com/anh.jpg"
                                className="flex-1 p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                            />
                            <Button
                                variant="ghost"
                                type="button"
                                onClick={handleAddImage}
                                className="px-3 py-2 text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg"
                            >
                                <Plus size={14} /> Thêm ảnh
                            </Button>
                        </div>

                        {imageUrls.length > 0 && (
                            <div className="space-y-1 max-h-24 overflow-y-auto">
                                {imageUrls.map((url, i) => (
                                    <div key={i} className="flex items-center justify-between p-1.5 bg-slate-50 dark:bg-slate-800 rounded-lg text-[11px] font-mono">
                                        <span className="truncate max-w-[340px] text-sky-600">{url}</span>
                                        <button type="button" onClick={() => handleRemoveImage(i)} className="text-rose-500 hover:text-rose-700">
                                            <Trash2 size={13} />
                                        </button>
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
                            disabled={isSubmitting}
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
