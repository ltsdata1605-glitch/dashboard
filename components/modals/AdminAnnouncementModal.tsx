import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { Modal } from '../shared/ui/Modal';
import { Icon } from '../common/Icon';
import toast from 'react-hot-toast';

interface AdminAnnouncementModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const AdminAnnouncementModal: React.FC<AdminAnnouncementModalProps> = ({
    isOpen,
    onClose,
}) => {
    const [content, setContent] = useState('');
    const [active, setActive] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Fetch active announcement settings when modal opens
    useEffect(() => {
        if (isOpen) {
            const fetchAnnouncement = async () => {
                try {
                    const docRef = doc(db, 'shared_configs', 'system_announcement');
                    const snap = await getDoc(docRef);
                    if (snap.exists()) {
                        const data = snap.data();
                        setContent(data.content || '');
                        setActive(data.active || false);
                    } else {
                        setContent('');
                        setActive(false);
                    }
                } catch (error) {
                    console.error("Lỗi khi đọc thông báo admin:", error);
                    toast.error("Không thể tải thông báo hiện tại");
                }
            };
            fetchAnnouncement();
        }
    }, [isOpen]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const docRef = doc(db, 'shared_configs', 'system_announcement');
            await setDoc(docRef, {
                content: content.trim(),
                active: active,
                updatedAt: new Date(),
            }, { merge: true });
            
            toast.success("Đã cập nhật thông báo hệ thống!");
            onClose();
        } catch (error) {
            console.error("Lỗi khi lưu thông báo admin:", error);
            toast.error("Cập nhật thông báo thất bại");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Cấu Hình Thông Báo Hệ Thống"
            subTitle="Hiển thị chữ chạy ngang (Marquee) cho toàn bộ người dùng"
            maxWidth="md"
        >
            <form onSubmit={handleSave} className="space-y-4 pt-1">
                <div>
                    <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
                        Nội dung thông báo
                    </label>
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="Nhập nội dung chạy ngang (Ví dụ: 📢 Lịch bảo trì hệ thống từ 22h tối nay...)"
                        rows={3}
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all font-semibold resize-none"
                    />
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 rounded-lg shrink-0">
                            <Icon name="megaphone" size={4} />
                        </div>
                        <div>
                            <span className="block text-xs font-bold text-slate-700 dark:text-slate-200">Kích hoạt thông báo</span>
                            <span className="block text-[10px] text-slate-400">Hiển thị đường chạy ngang dưới tiêu đề Phân Tích</span>
                        </div>
                    </div>
                    
                    <button
                        type="button"
                        onClick={() => setActive(!active)}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            active ? 'bg-rose-600' : 'bg-slate-200 dark:bg-slate-700'
                        }`}
                    >
                        <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                active ? 'translate-x-5' : 'translate-x-0'
                            }`}
                        />
                    </button>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-xs bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors font-bold"
                    >
                        Hủy
                    </button>
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="px-5 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white font-bold text-xs rounded-xl shadow-md shadow-rose-500/10 active:scale-[0.98] transition-all flex items-center gap-1.5"
                    >
                        {isLoading ? (
                            <Icon name="loader-2" size={3.5} className="animate-spin" />
                        ) : (
                            <Icon name="check" size={3.5} />
                        )}
                        Lưu cấu hình
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default AdminAnnouncementModal;
