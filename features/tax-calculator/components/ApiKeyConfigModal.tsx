import React, { useState } from 'react';
import { AppIcon } from '../../../components/shared/ui/icon/AppIcon';
import { Modal } from '../../../components/shared/ui/Modal';
import { toast } from '../../../components/shared/ui/toast';
import { Button } from '../../../components/shared/ui/Button';

interface ApiKeyConfigModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSaveKey: (key: string) => void;
}

export const API_KEY_STORAGE_KEY = 'CUSTOM_GEMINI_API_KEY';

export const ApiKeyConfigModal: React.FC<ApiKeyConfigModalProps> = ({
    isOpen,
    onClose,
    onSaveKey
}) => {
    const [apiKey, setApiKey] = useState(() => localStorage.getItem(API_KEY_STORAGE_KEY) || '');
    const [isChecking, setIsChecking] = useState(false);

    const handleSave = () => {
        const trimmed = apiKey.trim();
        if (trimmed) {
            localStorage.setItem(API_KEY_STORAGE_KEY, trimmed);
            onSaveKey(trimmed);
            toast.success('Đã lưu Gemini API Key');
        } else {
            localStorage.removeItem(API_KEY_STORAGE_KEY);
            onSaveKey('');
            toast.success('Đã xoá API Key cá nhân (sử dụng Cloud mặc định)');
        }
        onClose();
    };

    const handleTestKey = async () => {
        const trimmed = apiKey.trim();
        if (!trimmed) {
            toast.error('Vui lòng nhập API Key để kiểm tra');
            return;
        }

        setIsChecking(true);
        try {
            const { GoogleGenAI } = await import('@google/genai');
            const ai = new GoogleGenAI({ apiKey: trimmed });
            const res = await ai.models.generateContent({
                model: 'gemini-3.6-flash',
                contents: 'Trả về đúng chữ: OK'
            });
            if (res.text) {
                toast.success('Kết nối Gemini AI thành công!');
            }
        } catch (err) {
            console.error('Lỗi kiểm tra key:', err);
            toast.error('Key không hợp lệ hoặc bị giới hạn quota. Vui lòng kiểm tra lại.');
        } finally {
            setIsChecking(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            maxWidth="md"
            ariaLabel="Cài đặt Gemini API Key"
            subTitle={"Dùng để trích xuất ảnh phiếu lương trực tiếp"}
            title={
                <span className="flex items-center gap-2">
                    <AppIcon name="apiKey" size="md" className="text-amber-600" />
                    <span>Cài Đặt Gemini API Key (AI)</span>
                </span>
            }
            footer={
                <div className="flex items-center justify-between gap-2">

                    <button
                        type="button"
                        onClick={handleTestKey}
                        disabled={isChecking}
                        className="min-h-11 sm:min-h-0 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                    >
                        {isChecking ? 'Đang kiểm tra...' : 'Kiểm tra key'}
                    </button>

                    <div className="flex items-center gap-2">
                        <Button variant="secondary" size="sm" onClick={onClose}>
                            Đóng
                        </Button>
                        <Button variant="primary" size="sm" onClick={handleSave} className="flex items-center gap-1">
                            <AppIcon name="check" size="sm" />
                            <span>Lưu cài đặt</span>
                        </Button>
                    </div>
                </div>
            }
        >
            {/* Thân giữ nguyên bố cục cũ; bù lề của Modal để không đổi giao diện. */}
            <div className="-m-3 sm:-m-5">

                {/* Body */}
                <div className="p-4 space-y-3.5 text-xs">
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                        Hệ thống ưu tiên sử dụng Cloud Server để phân tích ảnh. Nếu Cloud Server bị giới hạn lượt gọi hoặc bạn muốn tốc độ xử lý nhanh hơn, bạn có thể nhập API Key riêng (hoàn toàn miễn phí từ Google).
                    </p>

                    <div>
                        <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                            Google Gemini API Key
                        </label>
                        <input
                            type="password"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder="AIzaSy..."
                            className="w-full px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-slate-800 dark:text-slate-100 outline-none transition-all"
                        />
                    </div>

                    <div className="p-2.5 bg-sky-50/60 dark:bg-sky-950/30 border border-sky-200/70 dark:border-sky-800/60 rounded-xl text-[11px] text-sky-800 dark:text-sky-300 space-y-1">
                        <div className="flex items-center gap-1 font-semibold">
                            <AppIcon name="sparkles" size="xs" />
                            <span>Cách lấy API Key miễn phí (mất 30 giây):</span>
                        </div>
                        <p>
                            1. Truy cập{' '}
                            <a
                                href="https://aistudio.google.com/app/apikey"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="relative after:absolute after:-inset-y-4 after:inset-x-0 after:content-[''] sm:after:hidden font-bold underline inline-flex items-center gap-0.5"
                            >
                                <span>Google AI Studio</span>
                                <AppIcon name="externalLink" size="xs" />
                            </a>
                        </p>
                        <p>2. Đăng nhập Gmail và bấm <strong>"Create API Key"</strong>.</p>
                        <p>3. Sao chép đoạn mã bắt đầu bằng <code className="bg-sky-100 dark:bg-sky-900 px-1 py-0.2 rounded font-mono">AIza...</code> dán vào ô trên.</p>
                    </div>
                </div>
            </div>
        </Modal>
    );
};
