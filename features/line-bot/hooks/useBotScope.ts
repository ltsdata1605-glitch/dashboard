/**
 * Hook quản lý phạm vi Bot LINE: Dùng chung theo Mã Kho (Kế thừa) hoặc Dùng riêng theo Tài khoản cá nhân
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { lineBotFirestoreService } from '../services/lineBotFirestoreService';
import { WarehouseBotSummary, LineBotConfig } from '../types/lineBot.types';

export type BotScopeMode = 'warehouse' | 'personal';

export function useBotScope() {
    const { user, departmentId } = useAuth();
    const userUid = user?.uid || '';
    const cleanDept = (departmentId || '').trim();

    const [warehouseBot, setWarehouseBot] = useState<WarehouseBotSummary | null>(null);
    const [personalBot, setPersonalBot] = useState<LineBotConfig | null>(null);
    const [isLoadingScope, setIsLoadingScope] = useState<boolean>(true);
    const [scopeMode, setScopeMode] = useState<BotScopeMode>('personal');

    const storageKey = `line_bot_scope_choice_${userUid}`;

    const loadScopeInfo = useCallback(async () => {
        if (!userUid) {
            setIsLoadingScope(false);
            return;
        }
        setIsLoadingScope(true);
        try {
            // 1. Kiểm tra cấu hình bot cá nhân của chính user này
            const personalData = await lineBotFirestoreService.getBotConfig(userUid);
            setPersonalBot(personalData);

            // 2. Tìm kiếm bot của kho nếu tài khoản có mã kho
            let foundWarehouseBot: WarehouseBotSummary | null = null;
            if (cleanDept && cleanDept !== 'ALL' && cleanDept !== 'ALL (Super Admin)') {
                foundWarehouseBot = await lineBotFirestoreService.findWarehouseBot(cleanDept);
            }
            setWarehouseBot(foundWarehouseBot);

            // 3. Quyết định chế độ mặc định (hoặc lấy từ lựa chọn trước đó của user)
            const savedChoice = localStorage.getItem(storageKey) as BotScopeMode | null;
            if (savedChoice === 'warehouse' && foundWarehouseBot) {
                setScopeMode('warehouse');
            } else if (savedChoice === 'personal') {
                setScopeMode('personal');
            } else {
                // Nếu chưa từng chọn:
                // Nếu bản thân CHƯA tạo bot cá nhân nhưng KHO ĐÃ CÓ BOT -> Tự động gợi ý/kế thừa bot kho!
                const hasPersonalToken = Boolean(personalData?.channelAccessToken);
                if (!hasPersonalToken && foundWarehouseBot) {
                    setScopeMode('warehouse');
                } else {
                    setScopeMode('personal');
                }
            }
        } catch (error) {
            console.error('[useBotScope] Lỗi kiểm tra scope bot:', error);
        } finally {
            setIsLoadingScope(false);
        }
    }, [userUid, cleanDept, storageKey]);

    useEffect(() => {
        loadScopeInfo();
    }, [loadScopeInfo]);

    const switchScope = useCallback((newScope: BotScopeMode) => {
        setScopeMode(newScope);
        try {
            localStorage.setItem(storageKey, newScope);
        } catch {
            // ignore
        }
    }, [storageKey]);

    // effectiveBotId là ID dùng để truy vấn toàn bộ dữ liệu (cấu hình, coupons, admin, schedules...)
    const isInheriting = scopeMode === 'warehouse' && Boolean(warehouseBot) && warehouseBot?.id !== userUid;
    const effectiveBotId = (scopeMode === 'warehouse' && warehouseBot?.id) ? warehouseBot.id : userUid;
    const hasWarehouseBot = Boolean(warehouseBot);
    const hasPersonalBot = Boolean(personalBot?.channelAccessToken);

    return {
        scopeMode,
        effectiveBotId,
        warehouseBot,
        personalBot,
        hasWarehouseBot,
        hasPersonalBot,
        isInheriting,
        departmentId: cleanDept,
        isLoadingScope,
        switchScope,
        refreshScope: loadScopeInfo
    };
}
