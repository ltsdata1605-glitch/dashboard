/**
 * Hook quản lý Hẹn Giờ Thông Báo (Schedules)
 */

import { useState, useEffect, useCallback } from 'react';
import { toast } from '../../../components/shared/ui/toast';
import { useAuth } from '../../../contexts/AuthContext';
import { lineBotFirestoreService } from '../services/lineBotFirestoreService';
import { lineMessagingService } from '../services/lineMessagingService';
import { BotSchedule, LineGroup } from '../types/lineBot.types';

/** `hasBotToken`: bot đã có Token (lưu ở server); gửi tin theo botId = overrideUserId/uid (audit S13). */
export function useScheduleManager(hasBotToken?: boolean, overrideUserId?: string) {
    const { user } = useAuth();
    const userId = overrideUserId || user?.uid || '';

    const [schedules, setSchedules] = useState<BotSchedule[]>([]);
    const [groups, setGroups] = useState<LineGroup[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isTriggering, setIsTriggering] = useState<string | null>(null);

    const loadGroups = useCallback(async () => {
        if (!userId) {
            setGroups([]);
            return;
        }
        try {
            const data = await lineBotFirestoreService.getGroups(userId);
            setGroups(data);
        } catch (error) {
            console.error('Lỗi tải danh sách nhóm:', error);
        }
    }, [userId]);

    const loadSchedules = useCallback(async () => {
        if (!userId) {
            setSchedules([]);
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        try {
            const [schedData, groupData] = await Promise.all([
                lineBotFirestoreService.getSchedules(userId),
                lineBotFirestoreService.getGroups(userId)
            ]);
            setSchedules(schedData);
            setGroups(groupData);
        } catch (error) {
            console.error('Lỗi tải lịch hẹn hoặc danh sách nhóm:', error);
            toast.error('Không thể tải danh sách lịch hẹn');
        } finally {
            setIsLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        loadSchedules();
    }, [loadSchedules]);

    const addManualGroup = useCallback(async (groupId: string, groupName?: string) => {
        if (!userId || !groupId.trim()) {
            toast.error('Vui lòng nhập Group ID');
            return false;
        }
        try {
            const cleanId = groupId.trim();
            await lineBotFirestoreService.saveGroup(userId, {
                groupId: cleanId,
                groupName: (groupName || '').trim() || 'Nhóm LINE',
                active: true
            });
            toast.success('Đã lưu nhóm LINE thành công');
            await loadGroups();
            return true;
        } catch (error: any) {
            toast.error('Lỗi thêm nhóm: ' + error.message);
            return false;
        }
    }, [userId, loadGroups]);

    const deleteGroup = useCallback(async (groupId: string) => {
        if (!userId || !groupId) return;
        try {
            await lineBotFirestoreService.deleteGroup(userId, groupId);
            toast.success('Đã xoá nhóm');
            await loadGroups();
        } catch (error: any) {
            toast.error('Lỗi xoá nhóm: ' + error.message);
        }
    }, [userId, loadGroups]);

    const saveSchedule = useCallback(async (sched: Partial<BotSchedule>) => {
        if (!userId) return null;
        try {
            const id = await lineBotFirestoreService.saveSchedule(userId, sched);
            toast.success(sched.id ? 'Đã cập nhật lịch hẹn' : 'Đã tạo lịch hẹn mới');
            await loadSchedules();
            return id;
        } catch (error: any) {
            toast.error('Lỗi lưu lịch hẹn: ' + error.message);
            return null;
        }
    }, [userId, loadSchedules]);

    const deleteSchedule = useCallback(async (id: string) => {
        if (!userId) return;
        try {
            await lineBotFirestoreService.deleteSchedule(userId, id);
            toast.success('Đã xoá lịch hẹn');
            await loadSchedules();
        } catch (error: any) {
            toast.error('Lỗi xoá lịch hẹn');
        }
    }, [userId, loadSchedules]);

    const toggleActive = useCallback(async (schedule: BotSchedule) => {
        if (!userId) return;
        await lineBotFirestoreService.saveSchedule(userId, {
            ...schedule,
            active: !schedule.active
        });
        await loadSchedules();
    }, [userId, loadSchedules]);

    // Kích hoạt gửi ngay (Trigger now / Test)
    const triggerNow = useCallback(async (schedule: BotSchedule) => {
        if (!hasBotToken) {
            toast.error('Chưa cấu hình Token Bot, không thể gửi tin nhắn');
            return;
        }

        setIsTriggering(schedule.id);
        try {
            const dateStr = new Date().toLocaleDateString('vi-VN');
            let content = schedule.messageTemplate.replace(/{date}/g, dateStr);

            // Cùng cách với máy chủ (functions/src/lineBotScheduler.ts → lineBotUserSchedules): "Tất cả các nhóm" = mọi
            // nhóm ĐÃ LƯU. Trước 2026-10-02 nhánh này gọi broadcast của LINE — gửi tới mọi người kết bạn với bot chứ không
            // phải các nhóm, lệch với nhãn trên giao diện.
            const targets = schedule.targetType === 'SPECIFIC_GROUPS'
                ? schedule.targetGroupIds
                : groups.filter(g => g.active !== false).map(g => g.groupId).filter(Boolean);

            if (targets.length === 0) {
                toast.error('Chưa có nhóm LINE nào để gửi — thêm nhóm hoặc mời bot vào nhóm trước.');
            } else {
                let successCount = 0;
                for (const groupId of targets) {
                    const res = await lineMessagingService.sendTestPush({ botId: userId }, groupId, content);
                    if (res.success) successCount++;
                }
                toast.success(`Đã gửi thông báo tới ${successCount}/${targets.length} nhóm!`);
            }

            await lineBotFirestoreService.saveSchedule(userId, {
                ...schedule,
                lastRunAt: new Date().toISOString()
            });
            await loadSchedules();
        } catch (e: any) {
            toast.error('Lỗi khi kích hoạt: ' + e.message);
        } finally {
            setIsTriggering(null);
        }
    }, [hasBotToken, userId, loadSchedules, groups]);

    return {
        schedules,
        groups,
        isLoading,
        isTriggering,
        loadSchedules,
        loadGroups,
        addManualGroup,
        deleteGroup,
        saveSchedule,
        deleteSchedule,
        toggleActive,
        triggerNow
    };
}
