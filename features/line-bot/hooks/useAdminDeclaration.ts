/**
 * Hook quản lý Khai Báo Admin (Line Admins)
 */

import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../../../contexts/AuthContext';
import { lineBotFirestoreService } from '../services/lineBotFirestoreService';
import { LineAdmin, InteractedUser, AdminRole } from '../types/lineBot.types';

export function useAdminDeclaration(overrideUserId?: string) {
    const { user } = useAuth();
    const userId = overrideUserId || user?.uid || '';

    const [admins, setAdmins] = useState<LineAdmin[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    const [interactedUsers, setInteractedUsers] = useState<InteractedUser[]>([]);
    const [isInteractedLoading, setIsInteractedLoading] = useState<boolean>(false);

    const loadAdmins = useCallback(async () => {
        if (!userId) {
            setAdmins([]);
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        try {
            const data = await lineBotFirestoreService.getAdmins(userId);
            setAdmins(data);
        } catch (error) {
            console.error('Lỗi tải danh sách Admin:', error);
            toast.error('Không thể tải danh sách Admin');
        } finally {
            setIsLoading(false);
        }
    }, [userId]);

    const loadInteractedUsers = useCallback(async () => {
        if (!userId) {
            setInteractedUsers([]);
            return;
        }
        setIsInteractedLoading(true);
        try {
            const users = await lineBotFirestoreService.getInteractedUsers(userId);
            setInteractedUsers(users);
        } catch (error) {
            console.error('Lỗi tải danh sách người dùng tương tác:', error);
        } finally {
            setIsInteractedLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        loadAdmins();
        loadInteractedUsers();
    }, [loadAdmins, loadInteractedUsers]);

    const saveAdmin = useCallback(async (admin: Partial<LineAdmin>) => {
        if (!userId) return null;
        if (!admin.lineUserId?.trim()) {
            toast.error('Vui lòng nhập LINE User ID');
            return null;
        }
        try {
            const id = await lineBotFirestoreService.saveAdmin(userId, admin);
            toast.success(admin.id ? 'Đã cập nhật Admin' : 'Đã thêm Admin mới');
            await loadAdmins();
            return id;
        } catch (error: any) {
            toast.error('Lỗi lưu Admin: ' + error.message);
            return null;
        }
    }, [userId, loadAdmins]);

    const addAdminFromInteracted = useCallback(async (user: InteractedUser, role: AdminRole = 'APPROVER') => {
        return await saveAdmin({
            name: user.displayName || 'Admin LINE',
            lineUserId: user.lineUserId,
            role,
            active: true
        });
    }, [saveAdmin]);

    const deleteAdmin = useCallback(async (id: string) => {
        if (!userId) return;
        try {
            await lineBotFirestoreService.deleteAdmin(userId, id);
            toast.success('Đã xoá Admin');
            await loadAdmins();
        } catch (error: any) {
            toast.error('Lỗi xoá Admin');
        }
    }, [userId, loadAdmins]);

    const toggleActive = useCallback(async (admin: LineAdmin) => {
        if (!userId) return;
        await lineBotFirestoreService.saveAdmin(userId, {
            ...admin,
            active: !admin.active
        });
        await loadAdmins();
    }, [userId, loadAdmins]);

    return {
        admins,
        isLoading,
        loadAdmins,
        saveAdmin,
        deleteAdmin,
        toggleActive,
        interactedUsers,
        isInteractedLoading,
        loadInteractedUsers,
        addAdminFromInteracted
    };
}
