import React, { useState, useEffect, useCallback } from 'react';
import { History, RefreshCw } from 'lucide-react';
import { Button } from '../../../components/shared/ui/Button';
import { AuditLog } from '../types/lineBot.types';
import { lineBotFirestoreService } from '../services/lineBotFirestoreService';
import { useAuth } from '../../../contexts/AuthContext';

export const AuditLogTab: React.FC = () => {
    const { user } = useAuth();
    const userId = user?.uid || '';
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    const loadLogs = useCallback(async () => {
        if (!userId) {
            setLogs([]);
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        try {
            const data = await lineBotFirestoreService.getAuditLogs(userId);
            setLogs(data);
        } finally {
            setIsLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        loadLogs();
    }, [loadLogs]);

    return (
        <div className="space-y-4 w-full">
            <div className="p-4 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm flex items-center justify-between">
                <div>
                    <h3 className="font-bold text-slate-800 dark:text-white text-sm">Nhật Ký Thao Tác & Phát Mã</h3>
                    <p className="text-xs text-slate-500">Lịch sử cấp phát mã, thu hồi và các thao tác quản trị trên hệ thống.</p>
                </div>
                <Button variant="ghost" onClick={loadLogs} className="p-1.5 text-slate-500 rounded-xl" title="Làm mới">
                    <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />
                </Button>
            </div>

            <div className="bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                        <thead>
                            <tr className="bg-slate-50/80 dark:bg-slate-900/40 border-b border-slate-200/80 dark:border-slate-700/80 text-slate-500 font-bold uppercase text-[10px]">
                                <th className="p-3 pl-4">Thời Gian</th>
                                <th className="p-3">Hành Động</th>
                                <th className="p-3">Nội Dung Chi Tiết</th>
                                <th className="p-3 pr-4">Thực Hiện Bởi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                            {logs.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="p-8 text-center text-slate-400">
                                        {isLoading ? 'Đang tải nhật ký...' : 'Chưa có nhật ký hoạt động nào.'}
                                    </td>
                                </tr>
                            ) : (
                                logs.map(l => (
                                    <tr key={l.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                                        <td className="p-3 pl-4 text-slate-400 text-[11px] font-mono whitespace-nowrap">
                                            {l.timestamp ? new Date(l.timestamp).toLocaleString('vi-VN') : '—'}
                                        </td>
                                        <td className="p-3">
                                            <span className="px-2 py-0.5 rounded-md font-mono text-[10px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                                                {l.action}
                                            </span>
                                        </td>
                                        <td className="p-3 text-slate-700 dark:text-slate-300">
                                            {l.description}
                                        </td>
                                        <td className="p-3 pr-4 text-slate-500 font-semibold whitespace-nowrap">
                                            {l.performedBy}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
