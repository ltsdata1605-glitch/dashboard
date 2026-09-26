/**
 * Hook quản lý Thư viện Từ khoá tự động (Keyword Auto-reply)
 */

import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../../../contexts/AuthContext';
import { lineBotFirestoreService } from '../services/lineBotFirestoreService';
import { KeywordReply } from '../types/lineBot.types';

export function useKeywordLibrary(overrideUserId?: string) {
    const { user } = useAuth();
    const userId = overrideUserId || user?.uid || '';

    const [keywords, setKeywords] = useState<KeywordReply[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    const loadKeywords = useCallback(async () => {
        if (!userId) {
            setKeywords([]);
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        try {
            const data = await lineBotFirestoreService.getKeywords(userId);
            setKeywords(data);
        } catch (error) {
            console.error('Lỗi tải từ khóa:', error);
            toast.error('Không thể tải thư viện từ khóa');
        } finally {
            setIsLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        loadKeywords();
    }, [loadKeywords]);

    const saveKeyword = useCallback(async (kw: Partial<KeywordReply>) => {
        if (!userId) return null;
        try {
            const id = await lineBotFirestoreService.saveKeyword(userId, kw);
            toast.success(kw.id ? 'Đã cập nhật từ khóa' : 'Đã thêm từ khóa mới');
            await loadKeywords();
            return id;
        } catch (error: any) {
            toast.error('Lỗi lưu từ khóa: ' + error.message);
            return null;
        }
    }, [userId, loadKeywords]);

    const deleteKeyword = useCallback(async (id: string) => {
        if (!userId) return;
        try {
            await lineBotFirestoreService.deleteKeyword(userId, id);
            toast.success('Đã xoá từ khóa');
            await loadKeywords();
        } catch (error: any) {
            toast.error('Lỗi xoá từ khóa');
        }
    }, [userId, loadKeywords]);

    const toggleActive = useCallback(async (keyword: KeywordReply) => {
        if (!userId) return;
        await lineBotFirestoreService.saveKeyword(userId, {
            ...keyword,
            active: !keyword.active
        });
        await loadKeywords();
    }, [userId, loadKeywords]);

    return {
        keywords,
        isLoading,
        loadKeywords,
        saveKeyword,
        deleteKeyword,
        toggleActive
    };
}
