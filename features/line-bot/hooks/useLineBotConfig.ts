/**
 * Hook quản lý cấu hình Bot LINE của Quản lý hiện tại
 */

import { useState, useEffect, useCallback } from 'react';
import { toast } from '../../../components/shared/ui/toast';
import { useAuth } from '../../../contexts/AuthContext';
import { lineBotFirestoreService } from '../services/lineBotFirestoreService';
import { lineMessagingService, LineBotInfo } from '../services/lineMessagingService';
import { LineBotConfig, botHasToken } from '../types/lineBot.types';

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
                if (botHasToken(data)) {
                    // Token nằm ở server: kiểm theo botId, client không cần (và không thể) thấy token.
                    const check = await lineMessagingService.verifyBotById(userId);
                    if (check.success && check.info) {
                        setBotInfo(check.info);
                    }
                }
            } else {
                setConfig({
                    userId,
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
        const typed = (tokenToVerify || '').trim();
        if (!typed && !botHasToken(config)) {
            toast.error('Vui lòng nhập Channel Access Token');
            return false;
        }

        setIsVerifying(true);
        try {
            // Có token vừa gõ → kiểm token đó; không thì kiểm token đã lưu ở server.
            const res = typed ? await lineMessagingService.verifyBotToken(typed) : await lineMessagingService.verifyBotById(userId);
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
    }, [config, userId]);

    const saveConfig = useCallback(async (updates: Partial<LineBotConfig>) => {
        if (!userId) {
            toast.error('Vui lòng đăng nhập trước khi lưu');
            return false;
        }

        setIsSaving(true);
        try {
            const cleanDept = (updates.departmentId || config?.departmentId || departmentId || '').trim();
            // Bí mật đi đường riêng lên server (line_bot_secrets) — KHÔNG ghi vào line_bots (audit S13).
            const { channelAccessToken: newToken, channelSecret: newSecret, ...publicUpdates } = updates;
            const { channelAccessToken: _oldToken, channelSecret: _oldSecret, ...publicConfig } = (config || {}) as LineBotConfig;
            let flags: Partial<LineBotConfig> = {};
            const secretsToSave: { channelAccessToken?: string; channelSecret?: string } = {};
            if (newToken && newToken.trim()) secretsToSave.channelAccessToken = newToken.trim();
            if (newSecret && newSecret.trim()) secretsToSave.channelSecret = newSecret.trim();
            if (Object.keys(secretsToSave).length > 0) {
                const saved = await lineMessagingService.saveBotSecrets(userId, secretsToSave);
                if (!saved.success) throw new Error(saved.error || 'Không lưu được Token/Secret');
                flags = { hasToken: saved.hasToken, hasSecret: saved.hasSecret };
            }
            const merged = {
                ...publicConfig,
                ...publicUpdates,
                ...flags,
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
