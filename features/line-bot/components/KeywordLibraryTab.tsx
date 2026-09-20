import React, { useState } from 'react';
import { Sparkles, Plus, Edit2, Trash2, Image, RefreshCw } from 'lucide-react';
import { Button } from '../../../components/shared/ui/Button';
import { KeywordReply } from '../types/lineBot.types';
import { KeywordEditModal } from './KeywordEditModal';

interface KeywordLibraryTabProps {
    keywords: KeywordReply[];
    isLoading: boolean;
    onSaveKeyword: (kw: Partial<KeywordReply>) => Promise<string | null>;
    onDeleteKeyword: (id: string) => Promise<void>;
    onToggleActive: (keyword: KeywordReply) => Promise<void>;
    onRefresh: () => void;
}

export const KeywordLibraryTab: React.FC<KeywordLibraryTabProps> = ({
    keywords,
    isLoading,
    onSaveKeyword,
    onDeleteKeyword,
    onToggleActive,
    onRefresh
}) => {
    const [editModalOpen, setEditModalOpen] = useState<boolean>(false);
    const [selectedKeyword, setSelectedKeyword] = useState<Partial<KeywordReply> | null>(null);

    const handleCreateNew = () => {
        setSelectedKeyword(null);
        setEditModalOpen(true);
    };

    const handleEdit = (kw: KeywordReply) => {
        setSelectedKeyword(kw);
        setEditModalOpen(true);
    };

    return (
        <div className="space-y-4">
            {/* Top Bar */}
            <div className="p-4 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm flex items-center justify-between">
                <div>
                    <h3 className="font-bold text-slate-800 dark:text-white text-sm">Thư Viện Từ Khoá Tự Động</h3>
                    <p className="text-xs text-slate-500">Tự động nhận diện câu hỏi thường gặp và phản hồi lập tức kèm ảnh.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="ghost" onClick={onRefresh} className="p-1.5 text-slate-500 rounded-xl" title="Làm mới">
                        <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />
                    </Button>
                    <Button
                        variant="primary"
                        onClick={handleCreateNew}
                        className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm"
                    >
                        <Plus size={15} />
                        <span>Thêm Từ Khoá</span>
                    </Button>
                </div>
            </div>

            {/* List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {keywords.length === 0 ? (
                    <div className="col-span-full p-12 text-center bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/80">
                        <Sparkles size={32} className="mx-auto text-slate-300 mb-2" />
                        <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Chưa có từ khoá tự động nào</p>
                        <p className="text-xs text-slate-400 mt-1">Bấm "Thêm Từ Khoá" để thiết lập các câu trả lời tự động.</p>
                    </div>
                ) : (
                    keywords.map(kw => (
                        <div
                            key={kw.id}
                            className={`p-4 rounded-2xl bg-white dark:bg-slate-800/80 border transition-all shadow-sm flex flex-col justify-between space-y-3 ${
                                kw.active ? 'border-slate-200/80 dark:border-slate-700/80' : 'border-slate-200/40 opacity-60'
                            }`}
                        >
                            <div className="space-y-2">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                        <span className="font-bold text-slate-900 dark:text-white text-sm bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-lg">
                                            "{kw.keyword}"
                                        </span>
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                            kw.matchType === 'EXACT'
                                                ? 'bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-400'
                                                : 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-400'
                                        }`}>
                                            {kw.matchType === 'EXACT' ? 'Khớp chính xác' : 'Khớp chứa'}
                                        </span>
                                    </div>

                                    {/* Toggle Active */}
                                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                                        <input
                                            type="checkbox"
                                            checked={kw.active}
                                            onChange={() => onToggleActive(kw)}
                                            className="sr-only peer"
                                        />
                                        <div className="w-8 h-4.5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-emerald-600"></div>
                                    </label>
                                </div>

                                <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-3 whitespace-pre-wrap font-sans">
                                    {kw.replyText || <span className="italic text-slate-400">Không có văn bản</span>}
                                </p>

                                {kw.imageUrls && kw.imageUrls.length > 0 && (
                                    <div className="flex items-center gap-1 text-[11px] text-emerald-600 font-semibold">
                                        <Image size={13} />
                                        <span>Kèm {kw.imageUrls.length} hình ảnh</span>
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center justify-end gap-1 pt-2 border-t border-slate-100 dark:border-slate-800">
                                <Button
                                    variant="ghost"
                                    onClick={() => handleEdit(kw)}
                                    className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
                                    title="Chỉnh sửa"
                                >
                                    <Edit2 size={14} />
                                </Button>
                                <Button
                                    variant="ghost"
                                    onClick={() => onDeleteKeyword(kw.id)}
                                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"
                                    title="Xoá"
                                >
                                    <Trash2 size={14} />
                                </Button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <KeywordEditModal
                isOpen={editModalOpen}
                onClose={() => setEditModalOpen(false)}
                keyword={selectedKeyword}
                onSave={onSaveKeyword}
            />
        </div>
    );
};
