/**
 * Hook quản lý cấu hình Bot LINE của Quản lý hiện tại
 */

import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../../../contexts/AuthContext';
import { lineBotFirestoreService } from '../services/lineBotFirestoreService';
import { lineMessagingService, LineBotInfo } from '../services/lineMessagingService';
import { LineBotConfig } from '../types/lineBot.types';

export function useLineBotConfig(overrideUserId?: string) {
    const { user, departmentId } = useAuth();
    const userId = overrideUserId || user?.uid || '';

    const [config, setConfig] = useState<LineBotConfig | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isSaving, setIsSaving] = useState<boolean>(false);
    const [isVerifying, setIsVerifying] = useState<boolean>(false);
    const [botInfo, setBotInfo] = useState<LineBotInfo | null>(null);

    const personalWebhookUrl = userId ? lineMessagingService.getPersonalWebhookUrl(userId) : '';

    const loadConfig = useCallback(async () => {
        if (!userId) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        try {
            const data = await lineBotFirestoreService.getBotConfig(userId);
            if (data) {
                setConfig({
                    ...data,
                    webhookUrl: data.webhookUrl || personalWebhookUrl
                });
                if (data.channelAccessToken) {
                    const check = await lineMessagingService.verifyBotToken(data.channelAccessToken);
                    if (check.success && check.info) {
                        setBotInfo(check.info);
                    }
                }
            } else {
                setConfig({
                    userId,
                    channelAccessToken: '',
                    channelSecret: '',
                    webhookUrl: personalWebhookUrl,
                    active: true,
                    autoApprove: true,
                    approvalCommand: 'DUYỆT',
                    lowStockThresholds: { warning: 30, high: 20, critical: 10 },
                    syntaxTemplate: '[ĐĂNG KÝ PMH]\nKho: 910\nMĐH: 12345678\nLoại: PMH 100K\nQuản lý: Họ và Tên',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                });
            }
        } catch (error) {
            console.error('Lỗi khi nạp cấu hình Bot:', error);
            toast.error('Không thể nạp cấu hình Bot');
        } finally {
            setIsLoading(false);
        }
    }, [userId, personalWebhookUrl]);

    useEffect(() => {
        loadConfig();
    }, [loadConfig]);

    const verifyToken = useCallback(async (tokenToVerify?: string) => {
        const token = tokenToVerify || config?.channelAccessToken || '';
        if (!token) {
            toast.error('Vui lòng nhập Channel Access Token');
            return false;
        }

        setIsVerifying(true);
        try {
            const res = await lineMessagingService.verifyBotToken(token);
            if (res.success && res.info) {
                setBotInfo(res.info);
                toast.success(`Kết nối thành công: Bot "${res.info.displayName}" (${res.info.basicId})`);
                return true;
            } else {
                setBotInfo(null);
                toast.error(res.error || 'Token không hợp lệ');
                return false;
            }
        } finally {
            setIsVerifying(false);
        }
    }, [config?.channelAccessToken]);

    const saveConfig = useCallback(async (updates: Partial<LineBotConfig>) => {
        if (!userId) {
            toast.error('Vui lòng đăng nhập trước khi lưu');
            return false;
        }

        setIsSaving(true);
        try {
            const cleanDept = (updates.departmentId || config?.departmentId || departmentId || '').trim();
            const merged = {
                ...(config || {}),
                ...updates,
                userId,
                departmentId: cleanDept,
                ownerEmail: config?.ownerEmail || user?.email || '',
                ownerName: config?.ownerName || user?.displayName || '',
                isWarehouseShared: updates.isWarehouseShared ?? config?.isWarehouseShared ?? true,
                webhookUrl: personalWebhookUrl,
                botName: botInfo?.displayName || updates.botName || config?.botName || '',
                botBasicId: botInfo?.basicId || updates.botBasicId || config?.botBasicId || '',
                pictureUrl: botInfo?.pictureUrl || updates.pictureUrl || config?.pictureUrl || ''
            } as LineBotConfig;

            await lineBotFirestoreService.saveBotConfig(userId, merged);
            setConfig(merged);
            toast.success('Đã lưu cấu hình Bot thành công!');
            return true;
        } catch (error: any) {
            console.error('Lỗi lưu cấu hình:', error);
            toast.error('Lỗi khi lưu cấu hình: ' + (error.message || 'Thất bại'));
            return false;
        } finally {
            setIsSaving(false);
        }
    }, [userId, config, personalWebhookUrl, botInfo]);

    return {
        config,
        botInfo,
        isLoading,
        isSaving,
        isVerifying,
        personalWebhookUrl,
        loadConfig,
        verifyToken,
        saveConfig
    };
}
