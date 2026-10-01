import React, { useState, useRef, useMemo } from 'react';
import { CARTOON_AVATARS, getCartoonAvatar, CartoonAvatar } from '../../../utils/cartoonAvatars';
import { XIcon, UploadIcon, CheckCircleIcon, SparklesIcon, ResetIcon } from '../../Icons';
import { Button } from '../../../../../components/shared/ui/Button';

interface AvatarPickerModalProps {
    isOpen: boolean;
    onClose: () => void;
    employeeName: string;
    currentAvatarSrc: string | null;
    onSelectAvatar: (dataUrl: string) => Promise<void> | void;
    onResetDefault: () => Promise<void> | void;
    onUploadFile: (file: File) => Promise<void>;
}

export const AvatarPickerModal: React.FC<AvatarPickerModalProps> = ({
    isOpen,
    onClose,
    employeeName,
    currentAvatarSrc,
    onSelectAvatar,
    onResetDefault,
    onUploadFile
}) => {
    const [selectedTab, setSelectedTab] = useState<'library' | 'upload'>('library');
    const [categoryFilter, setCategoryFilter] = useState<'all' | 'animal' | 'character' | 'fun_object'>('all');
    const [isProcessing, setIsProcessing] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const defaultAvatar = useMemo(() => getCartoonAvatar(employeeName), [employeeName]);

    const filteredAvatars = useMemo(() => {
        if (categoryFilter === 'all') return CARTOON_AVATARS;
        return CARTOON_AVATARS.filter(a => a.category === categoryFilter);
    }, [categoryFilter]);

    if (!isOpen) return null;

    const handleSelectCartoon = async (avatar: CartoonAvatar) => {
        setIsProcessing(true);
        try {
            await onSelectAvatar(avatar.dataUrl);
            onClose();
        } finally {
            setIsProcessing(false);
        }
    };

    const handleReset = async () => {
        setIsProcessing(true);
        try {
            await onResetDefault();
            onClose();
        } finally {
            setIsProcessing(false);
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsProcessing(true);
        try {
            await onUploadFile(file);
            onClose();
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div 
            className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
            onClick={(e) => { e.stopPropagation(); onClose(); }}
        >
            <div 
                className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh] animate-scale-in"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-sky-500 shadow-sm shrink-0 bg-white">
                            <img 
                                src={currentAvatarSrc || defaultAvatar.dataUrl} 
                                alt={employeeName} 
                                className="w-full h-full object-cover" 
                            />
                        </div>
                        <div className="min-w-0">
                            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm sm:text-base truncate">
                                Ảnh Đại Diện Nhân Viên
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                {employeeName}
                            </p>
                        </div>
                    </div>
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full h-8 w-8"
                    >
                        <XIcon className="w-5 h-5" />
                    </Button>
                </div>

                {/* Sub-bar / Tabs & Filters */}
                <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 bg-slate-50/30 dark:bg-slate-800/20">
                    <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-semibold">
                        <button
                            type="button"
                            onClick={() => setSelectedTab('library')}
                            className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
                                selectedTab === 'library'
                                    ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-300 shadow-xs font-bold'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                            }`}
                        >
                            <SparklesIcon className="w-3.5 h-3.5 text-amber-500" />
                            <span>50 Icon Hoạt Hình</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setSelectedTab('upload')}
                            className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
                                selectedTab === 'upload'
                                    ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-300 shadow-xs font-bold'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                            }`}
                        >
                            <UploadIcon className="w-3.5 h-3.5 text-sky-500" />
                            <span>Tải Ảnh Từ Máy</span>
                        </button>
                    </div>

                    {selectedTab === 'library' && (
                        <div className="flex items-center gap-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                            <button
                                type="button"
                                onClick={() => setCategoryFilter('all')}
                                className={`px-2 py-1 rounded transition-colors ${categoryFilter === 'all' ? 'bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 font-bold' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                            >
                                Tất cả (50)
                            </button>
                            <button
                                type="button"
                                onClick={() => setCategoryFilter('animal')}
                                className={`px-2 py-1 rounded transition-colors ${categoryFilter === 'animal' ? 'bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 font-bold' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                            >
                                Thú cưng
                            </button>
                            <button
                                type="button"
                                onClick={() => setCategoryFilter('character')}
                                className={`px-2 py-1 rounded transition-colors ${categoryFilter === 'character' ? 'bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 font-bold' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                            >
                                Nhân vật
                            </button>
                            <button
                                type="button"
                                onClick={() => setCategoryFilter('fun_object')}
                                className={`px-2 py-1 rounded transition-colors ${categoryFilter === 'fun_object' ? 'bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 font-bold' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                            >
                                Đồ vật
                            </button>
                        </div>
                    )}
                </div>

                {/* Content Area */}
                <div className="p-4 sm:p-5 overflow-y-auto flex-1 min-h-[300px]">
                    {selectedTab === 'library' ? (
                        <div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 flex items-center justify-between">
                                <span>Nhấp vào icon hoạt hình để chọn làm đại diện cho nhân viên:</span>
                                <span className="font-semibold text-slate-700 dark:text-slate-300">{filteredAvatars.length} icon</span>
                            </p>
                            <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 gap-3">
                                {filteredAvatars.map((avatar) => {
                                    const isSelected = currentAvatarSrc === avatar.dataUrl || (!currentAvatarSrc && defaultAvatar.id === avatar.id);
                                    return (
                                        <button
                                            key={avatar.id}
                                            type="button"
                                            disabled={isProcessing}
                                            onClick={() => handleSelectCartoon(avatar)}
                                            className={`group relative flex flex-col items-center justify-center p-2 rounded-xl transition-all duration-200 cursor-pointer ${
                                                isSelected
                                                    ? 'bg-sky-50 dark:bg-sky-950/40 ring-2 ring-sky-500 scale-105 shadow-sm'
                                                    : 'hover:bg-slate-100 dark:hover:bg-slate-800 hover:scale-105'
                                            }`}
                                            title={`#${avatar.id} - ${avatar.name}`}
                                        >
                                            <div className="w-12 h-12 rounded-full overflow-hidden shadow-xs group-hover:shadow-md transition-shadow">
                                                <img 
                                                    src={avatar.dataUrl} 
                                                    alt={avatar.name} 
                                                    className="w-full h-full object-cover pointer-events-none" 
                                                />
                                            </div>
                                            <span className="text-[10px] text-slate-600 dark:text-slate-400 text-center truncate w-full mt-1.5 font-medium group-hover:text-sky-600 dark:group-hover:text-sky-400">
                                                {avatar.name}
                                            </span>
                                            {isSelected && (
                                                <div className="absolute top-1 right-1 bg-sky-500 text-white rounded-full p-0.5 shadow-xs">
                                                    <CheckCircleIcon className="w-3.5 h-3.5" />
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                            <div className="w-24 h-24 rounded-full border-2 border-dashed border-sky-300 dark:border-sky-700 bg-sky-50/50 dark:bg-sky-950/20 flex items-center justify-center mb-4">
                                <UploadIcon className="w-10 h-10 text-sky-500" />
                            </div>
                            <h4 className="font-bold text-slate-800 dark:text-slate-200 text-base mb-1">
                                Tải ảnh chân dung từ máy
                            </h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mb-5">
                                Hỗ trợ các định dạng JPG, PNG, WEBP. Ảnh sẽ tự động được cắt vuông và nén tối ưu hiển thị siêu nhanh.
                            </p>
                            <Button
                                variant="primary"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isProcessing}
                                className="px-5 py-2 text-sm font-semibold rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 text-white shadow-md hover:shadow-lg transition-all"
                            >
                                <UploadIcon className="w-4 h-4 mr-2" />
                                {isProcessing ? 'Đang xử lý...' : 'Chọn file từ thiết bị'}
                            </Button>
                            <input 
                                ref={fileInputRef} 
                                type="file" 
                                accept="image/*" 
                                className="hidden" 
                                onChange={handleFileChange} 
                            />
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 flex items-center justify-between">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleReset}
                        disabled={isProcessing || !currentAvatarSrc}
                        className="text-xs text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 gap-1.5"
                    >
                        <ResetIcon className="w-3.5 h-3.5" />
                        <span>Khôi phục avatar mặc định</span>
                    </Button>
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={onClose}
                        className="text-xs px-4"
                    >
                        Đóng
                    </Button>
                </div>
            </div>
        </div>
    );
};
