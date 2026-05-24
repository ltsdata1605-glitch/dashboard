import React from 'react';
import { Icon } from '../../common/Icon';

interface CloudSyncSectionProps {
    syncState: 'idle' | 'syncing' | 'synced' | 'error';
    lastSyncTime: Date | null;
    onForceSync: () => void;
    user: any;
    isDemoMode: boolean;
}

export const CloudSyncSection: React.FC<CloudSyncSectionProps> = ({
    syncState,
    lastSyncTime,
    onForceSync,
    user,
    isDemoMode,
}) => {
    return (
        <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-800 dark:text-white mb-2 sm:mb-4 border-b border-slate-100 dark:border-slate-700 pb-2">Đồng Bộ Lưu Trữ Đám Mây</h3>
            <div className="bg-slate-50 dark:bg-slate-900/50 p-6 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6 rounded-lg">
                <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-lg ${
                        syncState === 'synced' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 
                        syncState === 'error' ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400' : 
                        'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                    }`}>
                        <Icon 
                            name={syncState === 'synced' ? 'cloud-check' : syncState === 'error' ? 'cloud-off' : 'cloud-snow'} 
                            size={6} 
                            className={syncState === 'syncing' ? 'animate-pulse' : ''} 
                        />
                    </div>
                    <div>
                        <h4 className="text-base font-bold text-slate-800 dark:text-white">Sao Lưu Toàn Diện</h4>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-md">Mọi bộ lọc, bảng tự tạo, cột tuỳ chỉnh cá nhân sẽ được tự động Push lên mây khi bạn rời ứng dụng, và tự động Pull về trên thiết bị khác.</p>
                        <p className="text-xs font-bold mt-2 text-slate-400 dark:text-slate-500">
                            Lần cập nhật cuối: <span className="text-indigo-500">{lastSyncTime ? lastSyncTime.toLocaleTimeString('vi-VN') : 'Đang đợi thao tác Mới'}</span>
                        </p>
                    </div>
                </div>
                <button 
                    onClick={onForceSync}
                    disabled={syncState === 'syncing' || !user || isDemoMode}
                    className={`px-5 py-2.5 whitespace-nowrap font-bold flex items-center justify-center gap-2 transition-all shadow-sm w-full md:w-auto rounded-lg
                        ${syncState === 'syncing' 
                            ? 'bg-indigo-100 text-indigo-400 dark:bg-indigo-900/20 cursor-not-allowed' 
                            : 'bg-white border-2 border-indigo-100 text-indigo-600 hover:border-indigo-500 hover:bg-indigo-50 dark:bg-slate-800 dark:border-slate-700 dark:text-indigo-400 dark:hover:border-indigo-500'}`}
                >
                    <Icon name={syncState === 'syncing' ? 'loader-2' : 'refresh-ccw'} size={4} className={syncState === 'syncing' ? 'animate-spin' : ''} />
                    {syncState === 'syncing' ? 'Đang Sao Lưu...' : 'Bắt Buộc Lưu Trữ'}
                </button>
            </div>
        </div>
    );
};
