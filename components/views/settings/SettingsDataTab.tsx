import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import * as dbService from '../../../services/dbService';
import { Icon } from '../../common/Icon';
import toast from 'react-hot-toast';
import { useCloudSync } from '../../../hooks/useCloudSync';
import { shareCloudConfig, fetchSharedConfigs, deleteSharedConfig, type SharedConfig } from '../../../services/firestoreService';
import { ConfirmDialog } from '../../shared/ui/ConfirmDialog';

export const SettingsDataTab: React.FC = () => {
    const { user, userRole, departmentId, isDemoMode } = useAuth();
    const { syncState, lastSyncTime, forceSync } = useCloudSync();
    
    const [isDeduplicationEnabled, setIsDeduplicationEnabled] = useState(true);
    const [configUrl, setConfigUrl] = useState('');
    const [isClearing, setIsClearing] = useState(false);
    
    const [sharedConfigs, setSharedConfigs] = useState<SharedConfig[]>([]);
    const [showShareModal, setShowShareModal] = useState(false);
    const [shareDescription, setShareDescription] = useState('');
    const [isSharing, setIsSharing] = useState(false);

    const [confirmDialog, setConfirmDialog] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
        variant?: 'danger' | 'warning' | 'info' | 'success';
        confirmText?: string;
    }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

    const showConfirm = (options: { title: string; message: string; onConfirm: () => void; variant?: 'danger' | 'warning' | 'info' | 'success'; confirmText?: string; }) => {
        setConfirmDialog({ ...options, isOpen: true });
    };
    const closeConfirm = () => setConfirmDialog(prev => ({ ...prev, isOpen: false }));

    useEffect(() => {
        const loadSettings = async () => {
            const savedDedup = await dbService.getDeduplicationSetting();
            setIsDeduplicationEnabled(savedDedup);
            const productConfig = await dbService.getProductConfig();
            if (productConfig) setConfigUrl(productConfig.url);
        };
        loadSettings();
    }, []);

    useEffect(() => {
        let isMounted = true;
        const loadConfigs = async () => {
            try {
                const configs = await fetchSharedConfigs(userRole, departmentId);
                if (isMounted) setSharedConfigs(configs);
            } catch (e) {
                console.warn("Lấy danh sách thư viện thất bại:", e);
            }
        };
        loadConfigs();
        return () => { isMounted = false; };
    }, [userRole, departmentId]);

    const handleToggleDedup = async () => {
        const newValue = !isDeduplicationEnabled;
        setIsDeduplicationEnabled(newValue);
        await dbService.saveDeduplicationSetting(newValue);
        window.dispatchEvent(new CustomEvent('dedup-changed', { detail: newValue }));
        toast.success(newValue ? 'Đã BẬT tính năng Gộp Chứng Từ' : 'Đã TẮT tính năng Gộp Chứng Từ');
    };

    const handleClearLocalData = () => {
        showConfirm({
            title: 'Khôi Phục Mặc Định',
            message: 'BÁO ĐỘNG ĐỎ: Thao tác này sẽ xoá rỗng toàn bộ dữ liệu tạm trên thiết bị cài đặt Bộ lọc / Bảng của bạn đã lưu trên Đám Mây. Bạn có chắc không?',
            variant: 'danger',
            confirmText: 'Xóa Tất Cả',
            onConfirm: async () => {
                closeConfirm();
                setIsClearing(true);
                try {
                    const { clearCloudSettings } = await import('../../../services/firestoreService');
                    if (user) {
                        await clearCloudSettings(user);
                    }
                    await dbService.clearAllSettings();
                    await dbService.clearSalesData();
                    toast.success('Đã Khôi Phục Gốc cấu hình thành công!');
                    setTimeout(() => window.location.reload(), 1500);
                } catch (error) {
                    console.warn("Lỗi khi wipe data:", error);
                    toast.error('Có lỗi xảy ra khi dọn dẹp!');
                } finally {
                    setIsClearing(false);
                }
            }
        });
    };

    const handleShareConfig = async () => {
        if (!user || (!departmentId && userRole !== 'admin') || !userRole) return;
        if (!shareDescription.trim()) {
            toast.error("Vui lòng nhập tên/mô tả gợi nhớ cho mẫu cấu hình.");
            return;
        }

        setIsSharing(true);
        try {
            const allSettings = await dbService.getAllSettings();
            await shareCloudConfig(user, userRole, departmentId || '', shareDescription, allSettings);
            toast.success("Chia sẻ cấu hình thành công!");
            setShowShareModal(false);
            setShareDescription('');
            // reload config
            const configs = await fetchSharedConfigs(userRole, departmentId);
            setSharedConfigs(configs);
        } catch (err) {
            console.warn("Lỗi chia sẻ:", err);
            toast.error("Không thể chia sẻ cấu hình lúc này.");
        } finally {
            setIsSharing(false);
        }
    };

    const handleApplyConfig = (config: SharedConfig) => {
        showConfirm({
            title: 'Áp Dụng Cấu Hình',
            message: `Bạn có chắc muốn ghi đè cấu hình hiện tại bằng mẫu của [${config.authorName}]? Các thay đổi bộ lọc cá nhân cũ sẽ mất.`,
            variant: 'warning',
            confirmText: 'Áp Dụng',
            onConfirm: async () => {
                closeConfirm();
                try {
                    await dbService.clearAllSettings();
                    await dbService.importAllSettings(config.payload);
                    toast.success("Áp dụng mẫu cấu hình thành công! Đang tải lại...", { duration: 4000 });
                    setTimeout(() => window.location.reload(), 1500);
                } catch (err) {
                    console.warn("Lỗi áp dụng mẫu cấu hình:", err);
                    toast.error("Áp dụng mẫu cấu hình thất bại.");
                }
            }
        });
    };

    return (
        <div className="space-y-8">
            <ConfirmDialog 
                isOpen={confirmDialog.isOpen} 
                onClose={closeConfirm} 
                title={confirmDialog.title} 
                message={confirmDialog.message} 
                onConfirm={confirmDialog.onConfirm} 
                variant={confirmDialog.variant} 
                confirmText={confirmDialog.confirmText} 
            />

            <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-800 dark:text-white mb-2 sm:mb-4 border-b border-slate-100 dark:border-slate-700 pb-2">Cấu Hình Kết Xuất Base Data</h3>
                
                <div className="bg-slate-50 dark:bg-slate-900/50 p-3 sm:p-5 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 rounded-lg">
                    <div>
                        <h4 className="font-bold text-slate-800 dark:text-white text-base">Gộp Đơn Cùng Chứng Từ (Deduplication)</h4>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-md">Các MÃ CHỨNG TỪ giống nhau sẽ bị gộp thành 1 dòng (tổng hợp doanh thu) để tránh làm trùng lặp khi xoay Pivot theo Đơn.</p>
                    </div>
                    <button 
                        onClick={handleToggleDedup}
                        className={`relative inline-flex h-7 w-12 flex-shrink-0 items-center rounded-full transition-colors ${isDeduplicationEnabled ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'}`}
                    >
                        <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${isDeduplicationEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                </div>
            </div>

            <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-800 dark:text-white mb-2 sm:mb-4 border-b border-slate-100 dark:border-slate-700 pb-2">Kết Nối Đám Mây</h3>
                <div className="bg-slate-50 dark:bg-slate-900/50 p-3 sm:p-5 border border-slate-200 dark:border-slate-700 rounded-lg">
                    <h4 className="font-bold text-slate-800 dark:text-white text-base mb-2">Google Sheet File CSV</h4>
                    <input 
                        type="text" 
                        readOnly 
                        value={configUrl || 'Chưa thiết lập URL cấu hình YCX nào...'} 
                        className="w-full bg-slate-200/50 dark:bg-slate-800 px-4 py-3 text-slate-500 dark:text-slate-400 font-mono text-xs outline-none rounded-md"
                    />
                    <p className="text-xs text-slate-400 mt-2">Dữ liệu Cấu trúc Danh mục (Product Config) được nạp trực tiếp qua Google Sheet Public.</p>
                </div>
            </div>

            <div>
                <h3 className="text-base sm:text-lg font-bold text-rose-600 dark:text-rose-400 mb-2 sm:mb-4 border-b border-rose-100 dark:border-rose-900/30 pb-2">Khu Vực Nguy Hiểm</h3>
                <div className="bg-rose-50 dark:bg-rose-900/10 p-3 sm:p-5 border border-rose-200 dark:border-rose-800/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 rounded-lg">
                    <div>
                        <h4 className="font-bold text-rose-800 dark:text-rose-400 text-base">Xóa Cứng Toàn Bộ Bộ Nhớ Tạm</h4>
                        <p className="text-sm text-rose-600/80 dark:text-rose-400/70 mt-1 max-w-md">Xóa sạch Dữ Liệu YCX (Sales Data), Cấu Hình, Sơ đồ Kho lưu trong Local Database của Trình duyệt. Bạn sẽ cần tải YCX lại từ đầu.</p>
                    </div>
                    <button 
                        onClick={handleClearLocalData}
                        disabled={isClearing}
                        className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold transition-colors shadow-sm whitespace-nowrap disabled:opacity-50 rounded-lg"
                    >
                        {isClearing ? 'Đang Xóa...' : 'Khôi Phục Mặc Định Trình Duyệt'}
                    </button>
                </div>
            </div>

            {/* Cloud Sync Information */}
            <div className="mt-8">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6 border-b border-slate-100 dark:border-slate-700 pb-2">Đồng Bộ Lưu Trữ Đám Mây</h3>
                <div className="bg-slate-50 dark:bg-slate-900/50 p-6 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6 rounded-lg">
                    <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-lg ${syncState === 'synced' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : syncState === 'error' ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400' : 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'}`}>
                            <Icon name={syncState === 'synced' ? 'cloud-check' : syncState === 'error' ? 'cloud-off' : 'cloud-snow'} size={6} className={syncState === 'syncing' ? 'animate-pulse' : ''} />
                        </div>
                        <div>
                            <h4 className="text-base font-bold text-slate-800 dark:text-white">Sao Lưu Toàn Diện</h4>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-md">Mọi bộ lọc, bảng tự tạo, cột tuỳ chỉnh cá nhân sẽ được tự động Push lên mây khi bạn rời ứng dụng, và tự động Pull về trên thiết bị khác.</p>
                            <p className="text-xs font-bold mt-2 text-slate-400 dark:text-slate-500">
                                Lần cập nhật cuối: <span className="text-indigo-500">{lastSyncTime ? lastSyncTime.toLocaleTimeString('vi-VN') : 'Đang đợi thao tác Mới'}</span>
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={forceSync}
                        disabled={syncState === 'syncing' || !user || isDemoMode}
                        className={`px-5 py-2.5 whitespace-nowrap font-bold flex items-center justify-center gap-2 transition-all shadow-sm w-full md:w-auto rounded-lg
                            ${syncState === 'syncing' ? 'bg-indigo-100 text-indigo-400 dark:bg-indigo-900/20 cursor-not-allowed' : 'bg-white border-2 border-indigo-100 text-indigo-600 hover:border-indigo-500 hover:bg-indigo-50 dark:bg-slate-800 dark:border-slate-700 dark:text-indigo-400 dark:hover:border-indigo-500'}`}
                    >
                        <Icon name={syncState === 'syncing' ? 'loader-2' : 'refresh-ccw'} size={4} className={syncState === 'syncing' ? 'animate-spin' : ''} />
                        {syncState === 'syncing' ? 'Đang Sao Lưu...' : 'Bắt Buộc Lưu Trữ'}
                    </button>
                </div>
            </div>
            
            {/* Mẫu Cấu hình Dùng chung */}
            <div className="mt-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-slate-100 dark:border-slate-700 pb-2">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white">Thư Viện Cấu Hình</h3>
                    {(userRole === 'admin' || userRole === 'manager' || userRole === 'employee') && (
                        <button 
                            onClick={() => setShowShareModal(true)}
                            className="px-4 py-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400 dark:hover:bg-indigo-900/50 font-bold flex items-center gap-2 transition-colors text-sm border border-indigo-100 dark:border-indigo-800 rounded-lg"
                        >
                            <Icon name="share-2" size={4} />
                            Đăng Bài Chia Sẻ
                        </button>
                    )}
                </div>
                
                {sharedConfigs.length === 0 ? (
                    <div className="bg-slate-50 dark:bg-slate-900/30 border-2 border-dashed border-slate-200 dark:border-slate-800 p-8 text-center flex flex-col items-center justify-center text-slate-500 rounded-lg">
                        <Icon name="layout-template" size={10} className="text-slate-300 dark:text-slate-700 mb-3" />
                        <p className="font-medium text-sm">Chưa có Cấu Hình nào được chia sẻ trong hệ thống của bạn.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {sharedConfigs.map(config => (
                            <div key={config.id} className="bg-white dark:bg-slate-800 p-5 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors rounded-lg">
                                <div>
                                    <div className="flex items-start justify-between gap-2 mb-3">
                                        <h4 className="font-bold text-slate-800 dark:text-white line-clamp-1">{config.description}</h4>
                                        <span className={`px-2 py-1 text-[10px] font-bold whitespace-nowrap uppercase tracking-wider flex-shrink-0 rounded-md ${config.role === 'admin' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'}`}>
                                            {config.role === 'admin' ? 'Super Admin' : config.role === 'manager' ? 'Quản Lý Kho' : 'Nhân Viên'}
                                        </span>
                                    </div>
                                    <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1.5 mb-4">
                                        <p className="flex items-center gap-1.5"><Icon name="user" size={3.5} /> Được tạo bởi: <strong>{config.authorName}</strong></p>
                                        <p className="flex items-center gap-1.5"><Icon name="calendar-days" size={3.5} /> Ngày đăng: {config.createdAt?.toDate ? config.createdAt.toDate().toLocaleDateString('vi-VN') : 'Mới đây'}</p>
                                        {config.role !== 'admin' && <p className="flex items-center gap-1.5 text-indigo-500"><Icon name="map-pin" size={3.5} /> Phạm vi: Kho {config.departmentId}</p>}
                                    </div>
                                </div>
                                
                                <div className="flex items-center justify-between mt-2 pt-4 border-t border-slate-100 dark:border-slate-700/50">
                                    {(user?.uid === config.uid || userRole === 'admin') ? (
                                        <button 
                                            onClick={() => {
                                                showConfirm({
                                                    title: 'Xóa Bài Đăng',
                                                    message: 'Chắc chắn xoá bài đăng chia sẻ cấu hình này của bạn?',
                                                    variant: 'danger',
                                                    confirmText: 'Xóa',
                                                    onConfirm: () => {
                                                        closeConfirm();
                                                        deleteSharedConfig(config.id).then(() => {
                                                            toast.success("Đã xoá cấu hình.");
                                                            setSharedConfigs(prev => prev.filter(c => c.id !== config.id));
                                                        });
                                                    }
                                                });
                                            }}
                                            className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors tooltip rounded-md"
                                            title="Xoá bài đăng của bạn"
                                        >
                                            <Icon name="trash-2" size={4} />
                                        </button>
                                    ) : <div />}
                                    
                                    <button 
                                        onClick={() => handleApplyConfig(config)}
                                        className="px-4 py-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:hover:bg-emerald-900/40 text-sm font-bold flex items-center gap-2 transition-colors rounded-lg"
                                    >
                                        <Icon name="download-cloud" size={4} />
                                        Đồng Bộ Về Máy
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            
            {showShareModal && (
                <div className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-5 border-b border-slate-100 dark:border-slate-700/50 flex justify-between items-center bg-slate-50 dark:bg-slate-800/80">
                            <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                <Icon name="share-2" size={5} className="text-indigo-500" />
                                Chia Sẻ Cấu Hình
                            </h3>
                            <button onClick={() => setShowShareModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><Icon name="x" size={5} /></button>
                        </div>
                        <div className="p-5 space-y-4">
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                Mẫu cấu hình này sẽ bao gồm toàn bộ cài đặt <strong>bộ lọc, sắp xếp, ẩn hiện cột, cấu trúc bảng tự do</strong> hiện tại của bạn.
                            </p>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Mô tả Cấu Hình <span className="text-rose-500">*</span></label>
                                <input 
                                    type="text" 
                                    autoFocus
                                    value={shareDescription}
                                    onChange={e => setShareDescription(e.target.value)}
                                    placeholder="Ví dụ: Mẫu Báo cáo Phụ Kiện T5/2024"
                                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all dark:text-white"
                                />
                            </div>
                        </div>
                        <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-700/50 flex justify-end gap-3">
                            <button onClick={() => setShowShareModal(false)} className="px-4 py-2 font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors">Hủy Bỏ</button>
                            <button onClick={handleShareConfig} disabled={isSharing} className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-md transition-all flex items-center gap-2 disabled:opacity-50">
                                {isSharing ? <Icon name="loader-2" size={4} className="animate-spin" /> : <Icon name="check" size={4} />}
                                {isSharing ? 'Đang Đăng...' : 'Đăng Tải'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
