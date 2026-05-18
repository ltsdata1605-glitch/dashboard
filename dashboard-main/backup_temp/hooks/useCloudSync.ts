import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { syncToCloud } from '../services/firestoreService';

type SyncState = 'idle' | 'syncing' | 'synced' | 'error';

export const useCloudSync = (
    productConfig: any,
    departmentMap: any,
    warehouseTargets: any,
    gtdhTargets: any,
    crossSellingConfig: any
) => {
    const { user, isDemoMode } = useAuth();
    const [syncState, setSyncState] = useState<SyncState>('idle');
    const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
    const timeoutRef = useRef<number | null>(null);
    const initialMount = useRef<boolean>(true);

    useEffect(() => {
        // Mới tải trang (Auto-Pull từ useDataManagement) đã nạp dữ liệu vào context rồi, nên không Push ngược lên mây ngay lúc đó
        if (initialMount.current) {
            initialMount.current = false;
            return;
        }

        if (!user || isDemoMode) {
            setSyncState('idle');
            return;
        }

        // Đánh dấu trạng thái đợi lưu
        setSyncState('syncing');

        // Xoá timeout cũ nếu người dùng gõ liên tục
        if (timeoutRef.current) {
            window.clearTimeout(timeoutRef.current);
        }

        // Tạo timeout 3 giây trước khi thực sự lưu
        timeoutRef.current = window.setTimeout(async () => {
            try {
                await syncToCloud(user, {
                    productConfig: productConfig || undefined,
                    departmentMap: departmentMap || undefined,
                    warehouseTargets: Object.keys(warehouseTargets || {}).length ? Object.entries(warehouseTargets).map(([kho, target]) => ({ kho, dsMucTieu: target })) as any : undefined,
                    gtdhTargets: Object.keys(gtdhTargets || {}).length ? Object.entries(gtdhTargets).map(([nhomHang, target]) => ({ nhomHang, gtdh: target })) as any : undefined,
                    crossSellingConfig: crossSellingConfig
                });
                setSyncState('synced');
                setLastSyncTime(new Date());

                // Trả về idle sau khi hiển thị báo thành công vài giây
                setTimeout(() => setSyncState('idle'), 5000);
            } catch (err) {
                console.error("Lỗi Auto-Sync:", err);
                setSyncState('error');
            }
        }, 3000); // 3 seconds debouncing

        return () => {
            if (timeoutRef.current) {
                window.clearTimeout(timeoutRef.current);
            }
        };
    }, [productConfig, departmentMap, warehouseTargets, gtdhTargets, crossSellingConfig, user, isDemoMode]);

    return { syncState, lastSyncTime };
};
