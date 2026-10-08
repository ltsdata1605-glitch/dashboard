import React from 'react';
import { AppIcon } from '../../../components/shared/ui/icon/AppIcon';

import { Button } from '../../../components/shared/ui/Button';
import { LineBotConfig } from '../types/lineBot.types';
import { LineBotInfo } from '../services/lineMessagingService';

interface LineBotStatusCardProps {
    config: LineBotConfig | null;
    botInfo: LineBotInfo | null;
    isVerifying: boolean;
    token: string;
    /** Bot đã có Token lưu ở server (nút Kiểm tra dùng token đã lưu khi ô nhập để trống). */
    hasSavedToken?: boolean;
    onOpenGuide: () => void;
    onVerifyToken: (token?: string) => Promise<boolean>;
}

export const LineBotStatusCard: React.FC<LineBotStatusCardProps> = ({
    config,
    botInfo,
    isVerifying,
    token,
    hasSavedToken,
    onOpenGuide,
    onVerifyToken
}) => {
    return (
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 shadow-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="relative">
                        {botInfo?.pictureUrl ? (
                            <img src={botInfo.pictureUrl} alt="Bot Avatar" className="w-14 h-14 rounded-2xl object-cover border-2 border-emerald-500/40 shadow-sm" />
                        ) : (
                            <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-400">
                                <AppIcon name="bot" size="state" />
                            </div>
                        )}
                        <span className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white dark:border-slate-800 ${botInfo ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="font-bold text-slate-800 dark:text-white text-base">
                                {botInfo?.displayName || config?.botName || 'Chưa liên kết Bot LINE'}
                            </h3>
                            {botInfo ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
                                    <AppIcon name="success" size="xs" /> Đã kết nối
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 dark:bg-slate-700 text-slate-500">
                                    <AppIcon name="error" size="xs" /> Chưa xác thực
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
                            Basic ID: {botInfo?.basicId || config?.botBasicId || 'Chưa xác định'}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Button
                        variant="ghost"
                        onClick={onOpenGuide}
                        className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/40 hover:bg-sky-100 rounded-xl transition-colors border border-sky-200 dark:border-sky-800 flex-1 sm:flex-initial"
                    >
                        <AppIcon name="help" size="md" />
                        <span>Hướng dẫn tạo Bot</span>
                    </Button>
                    <Button
                        variant="primary"
                        onClick={() => onVerifyToken(token)}
                        disabled={isVerifying || (!token.trim() && !hasSavedToken)}
                        className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm transition-colors disabled:opacity-50 flex-1 sm:flex-initial"
                    >
                        <AppIcon name="refresh" size="sm" className={isVerifying ? 'animate-spin' : ''} />
                        <span>{isVerifying ? 'Đang kiểm tra...' : 'Kiểm tra kết nối'}</span>
                    </Button>
                </div>
            </div>
        </div>
    );
};
