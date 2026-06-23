import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import * as dbService from '../../../services/dbService';
import toast from 'react-hot-toast';
import { useSync } from '../../../contexts/SyncContext';
import { shareCloudConfig, fetchSharedConfigs, deleteSharedConfig, clearCloudSettings, type SharedConfig } from '../../../services/firestoreService';
import { ConfirmDialog } from '../../shared/ui/ConfirmDialog';

import { BaseDataSection } from './BaseDataSection';
import { CloudSyncSection } from './CloudSyncSection';
import { ConfigLibrarySection } from './ConfigLibrarySection';
import { DangerZoneSection } from './DangerZoneSection';

export const SettingsDataTab: React.FC = () => {
    const { user, userRole, departmentId, isDemoMode } = useAuth();
    const { syncState, lastSyncTime, forceSync } = useSync();
    
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

    const handleDeleteConfig = (config: SharedConfig) => {
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

            <BaseDataSection 
                isDeduplicationEnabled={isDeduplicationEnabled}
                onToggleDedup={handleToggleDedup}
                configUrl={configUrl}
            />

            <CloudSyncSection 
                syncState={syncState}
                lastSyncTime={lastSyncTime}
                onForceSync={forceSync}
                user={user}
                isDemoMode={isDemoMode}
            />

            <ConfigLibrarySection 
                sharedConfigs={sharedConfigs}
                user={user}
                userRole={userRole}
                departmentId={departmentId}
                showShareModal={showShareModal}
                setShowShareModal={setShowShareModal}
                shareDescription={shareDescription}
                setShareDescription={setShareDescription}
                isSharing={isSharing}
                onShareConfig={handleShareConfig}
                onApplyConfig={handleApplyConfig}
                onDeleteConfig={handleDeleteConfig}
            />

            <DangerZoneSection 
                isClearing={isClearing}
                onClearLocalData={handleClearLocalData}
            />
        </div>
    );
};
