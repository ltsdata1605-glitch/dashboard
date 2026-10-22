import React from 'react';
import { EmptyState } from '../shared/ui/EmptyState';
import { FeatureLandingLayout } from '../shared/ui/FeatureLandingLayout';
import UploadSection from '../upload/UploadSection';
import { FileHistoryManager } from '../upload/FileHistoryManager';
import type { UploadedFileRegistryItem } from '../../types';
import { useAuth } from '../../contexts/AuthContext';

interface LandingPageViewProps {
    onProcessFile: (files: File[]) => void;
    registry?: UploadedFileRegistryItem[];
    onToggleActive?: (id: string) => Promise<void> | void;
    onDelete?: (id: string) => Promise<void> | void;
    onRename?: (id: string, newFilename: string) => Promise<void> | void;
    onViewReport?: () => void;
}

/**
 * Màn chào của Phân tích. GĐ6 (2026-10-13): dùng CHUNG khung `FeatureLandingLayout` với Report BI — trước là 2 bản chép tay
 * lệch nhau (bản Report BI còn chữ tiếng Anh, câu sai "không lưu trữ dữ liệu" và 3 quầng sáng nhấp nháy mà A22 đã bỏ ở đây).
 */
const LandingPageView: React.FC<LandingPageViewProps> = ({
    onProcessFile,
    registry = [],
    onToggleActive = () => {},
    onDelete = () => {},
    onRename,
    onViewReport = () => {}
}) => {
    // Nhân viên chỉ xem dữ liệu thừa kế từ quản lý Kho (implementation_plan.md mục 37) —
    // không còn tự tải file/quản lý lịch sử tệp riêng nữa.
    const { userRole } = useAuth();
    const canManageFiles = userRole === 'admin' || userRole === 'manager';

    return (
        <FeatureLandingLayout>
            {canManageFiles ? (
                <>
                    <UploadSection onProcessFile={onProcessFile} />
                    {registry.length > 0 && (
                        <FileHistoryManager
                            registry={registry}
                            onToggleActive={onToggleActive}
                            onDelete={onDelete}
                            onRename={onRename}
                            onViewReport={onViewReport}
                        />
                    )}
                </>
            ) : (
                <EmptyState
                    icon="clock"
                    title="Đang chờ dữ liệu từ quản lý Kho"
                    description="Doanh số của Kho tự hiện ngay khi quản lý cập nhật. Bạn không cần tự tải tệp lên."
                />
            )}
        </FeatureLandingLayout>
    );
};

export default LandingPageView;
