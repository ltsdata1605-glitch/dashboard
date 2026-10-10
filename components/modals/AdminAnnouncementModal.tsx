import React, { useState, useEffect } from 'react';
import { AppIcon } from '../shared/ui/icon/AppIcon';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { listenSystemAnnouncement, isAnnouncementExpired } from '../../services/systemAnnouncementService';
import { useAuth } from '../../contexts/AuthContext';
import { Modal } from '../shared/ui/Modal';
import { toast } from '../shared/ui/toast';
import { Button } from '../shared/ui/Button';

interface AdminAnnouncementModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const AdminAnnouncementModal: React.FC<AdminAnnouncementModalProps> = ({
    isOpen,
    onClose,
}) => {
    const { user, userRole } = useAuth();
    const [content, setContent] = useState('');
    const [active, setActive] = useState(false);
    const [expiresDate, setExpiresDate] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Fetch active announcement settings ONCE when modal opens
    useEffect(() => {
        if (!isOpen) return;

        let hasInitialized = false;
        // 1 lượt đọc thay vì 50 (services/systemAnnouncementService.ts)
        const unsub = listenSystemAnnouncement((found) => {
            if (!hasInitialized) {
                if (found) {
                    setContent(found.content || '');
                    setActive(found.active || false);
                    if (found.expiresAt) {
                        try {
                            const d = typeof (found.expiresAt as any).toDate === 'function'
                                ? (found.expiresAt as any).toDate()
                                : new Date(found.expiresAt as any);
                            setExpiresDate(d.toISOString().split('T')[0]);
                        } catch {
                            setExpiresDate('');
                        }
                    } else {
                        setExpiresDate('');
                    }
                } else {
                    setContent('');
                    setActive(false);
                    setExpiresDate('');
                }
                hasInitialized = true;
            }
        }, (error) => {
            console.error("Lỗi khi đọc thông báo admin:", error);
        }, 50);

        return () => unsub();
    }, [isOpen]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) {
            toast.error("Chưa đăng nhập, không thể lưu");
            return;
        }
        setIsLoading(true);
        try {
            const sharedConfigsRef = collection(db, 'shared_configs');
            const payload: Record<string, any> = {
                uid: user.uid,
                authorName: user.displayName || 'Super Admin',
                authorEmail: user.email,
                role: userRole,
                departmentId: 'ALL (Super Admin)',
                description: 'Thông báo hệ thống chạy ngang',
                isSystemAnnouncement: true,
                content: content.trim(),
                active: active,
                createdAt: serverTimestamp()
            };
            if (expiresDate) {
                payload.expiresAt = expiresDate;
            }

            const savePromise = addDoc(sharedConfigsRef, payload);

            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error("Mạng chập chờn, vui lòng thử lại")), 10000)
            );

            await Promise.race([savePromise, timeoutPromise]);
            
            toast.success("Đã cập nhật thông báo hệ thống!");
            onClose();
        } catch (error: any) {
            console.error("Lỗi khi lưu thông báo admin:", error);
            toast.error(error.message || "Cập nhật thông báo thất bại");
        } finally {
            setIsLoading(false);
        }
    };

    const isCurrentExpired = isAnnouncementExpired({ content, expiresAt: expiresDate });

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

                <div>
                    <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
                        Tự động ẩn sau ngày (Tùy chọn)
                    </label>
                    <input
                        type="date"
                        value={expiresDate}
                        onChange={(e) => setExpiresDate(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all font-semibold"
                    />
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                        Nếu để trống, thông báo sẽ luôn hiển thị khi được bật cho đến khi bạn tắt thủ công.
                    </p>
                </div>

                {isCurrentExpired && active && (
                    <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-xl text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2">
                        <AppIcon name="warning" size="sm" className="text-amber-600 shrink-0" />
                        <span>
                            Ngày hết hạn đã chọn ở trong quá khứ nên thông báo sẽ bị tự động ẩn. Vui lòng chọn ngày trong tương lai hoặc để trống.
                        </span>
                    </div>
                )}

                <label
                    className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl cursor-pointer select-none transition-all hover:brightness-95"
                >
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 rounded-lg shrink-0">
                            <AppIcon name="announcement" size="md" />
                        </div>
                        <div>
                            <span className="block text-xs font-bold text-slate-700 dark:text-slate-200">Kích hoạt thông báo</span>
                            <span className="block text-[11px] text-slate-400 dark:text-slate-500">Hiển thị đường chạy ngang dưới tiêu đề Phân Tích</span>
                        </div>
                    </div>
                    
                    <div className="relative">
                        <input
                            type="checkbox"
                            className="sr-only"
                            checked={active}
                            onChange={(e) => setActive(e.target.checked)}
                        />
                        <div className={`block w-11 h-6 rounded-full transition-colors duration-200 ease-in-out ${
                            active ? 'bg-rose-600' : 'bg-slate-200 dark:bg-slate-700'
                        }`} />
                        <div className={`dot absolute left-[2px] top-[2px] bg-white shadow w-5 h-5 rounded-full transition-transform duration-200 ease-in-out ${
                            active ? 'translate-x-5' : 'translate-x-0'
                        }`} />
                    </div>
                </label>

                <div className="flex justify-end gap-3 pt-2">
                    <Button
                        type="button"
                        variant="unstyled" size="none"
                        onClick={onClose}
                        className="px-4 py-2 text-xs bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors font-bold"
                    >
                        Hủy
                    </Button>
                    <Button
                        type="submit"
                        variant="unstyled" size="none"
                        disabled={isLoading}
                        className="px-5 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white font-bold text-xs rounded-xl shadow-md shadow-rose-500/10 active:scale-[0.98] transition-all flex items-center gap-1.5"
                    >
                        {isLoading ? (
                            <AppIcon name="loading" size="sm" spin />
                        ) : (
                            <AppIcon name="check" size="sm" />
                        )}
                        Lưu cấu hình
                    </Button>
                </div>
            </form>
        </Modal>
    );
};

export default AdminAnnouncementModal;
