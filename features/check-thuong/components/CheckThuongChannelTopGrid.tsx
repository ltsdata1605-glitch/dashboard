import React from 'react';
import { Trophy, ChevronRight, Camera } from 'lucide-react';
import { CheckThuongStoreSummary } from '../types';

interface CheckThuongChannelTopGridProps {
    stores: CheckThuongStoreSummary[];
    channels: string[];
    onSelectStore: (storeCode: string) => void;
    onExportChannel?: (channel: string, topStores: CheckThuongStoreSummary[]) => void;
    isExporting?: boolean;
}

export const CheckThuongChannelTopGrid: React.FC<CheckThuongChannelTopGridProps> = ({
    stores,
    channels,
    onSelectStore,
    onExportChannel,
    isExporting = false
}) => {
    if (!channels || channels.length === 0 || !stores || stores.length === 0) {
        return null;
    }

    const formatMillion = (val: number): string => {
        if (!val || isNaN(val)) return '0 Tr';
        const inMillion = Math.round(val / 1000000);
        return `${inMillion.toLocaleString('vi-VN')} Tr`;
    };

    const getChannelTheme = (channel: string, index: number) => {
        const ch = (channel || '').toUpperCase().trim();
        if (ch.includes('TGDD') || ch.includes('TGD') || ch.includes('TZ')) {
            return {
                headerBg: 'bg-amber-100/90 dark:bg-amber-950/60',
                headerStyle: { backgroundColor: '#fef3c7' },
                headerBorder: 'border-amber-200/90 dark:border-amber-900/60',
                cardBorder: 'border-amber-200/90 dark:border-amber-900/50',
                badge: 'bg-amber-200 text-amber-900 border-amber-300 dark:bg-amber-900/70 dark:text-amber-200 dark:border-amber-700',
                badgeStyle: { backgroundColor: '#fde68a', color: '#92400e', borderColor: '#fcd34d' },
                title: 'text-amber-950 dark:text-amber-200',
                button: 'text-amber-800 dark:text-amber-300 bg-white/80 hover:bg-white border-amber-300/80',
                icon: 'text-amber-700 dark:text-amber-400'
            };
        }
        if (ch.includes('DML')) {
            return {
                headerBg: 'bg-sky-100/90 dark:bg-sky-950/60',
                headerStyle: { backgroundColor: '#e0f2fe' },
                headerBorder: 'border-sky-200/90 dark:border-sky-900/60',
                cardBorder: 'border-sky-200/90 dark:border-sky-900/50',
                badge: 'bg-sky-200 text-sky-900 border-sky-300 dark:bg-sky-900/70 dark:text-sky-200 dark:border-sky-700',
                badgeStyle: { backgroundColor: '#bae6fd', color: '#0369a1', borderColor: '#7dd3fc' },
                title: 'text-sky-950 dark:text-sky-200',
                button: 'text-sky-800 dark:text-sky-300 bg-white/80 hover:bg-white border-sky-300/80',
                icon: 'text-sky-700 dark:text-sky-400'
            };
        }
        if (ch.includes('DMM')) {
            return {
                headerBg: 'bg-purple-100/90 dark:bg-purple-950/60',
                headerStyle: { backgroundColor: '#f3e8ff' },
                headerBorder: 'border-purple-200/90 dark:border-purple-900/60',
                cardBorder: 'border-purple-200/90 dark:border-purple-900/50',
                badge: 'bg-purple-200 text-purple-900 border-purple-300 dark:bg-purple-900/70 dark:text-purple-200 dark:border-purple-700',
                badgeStyle: { backgroundColor: '#e9d8fd', color: '#7e22ce', borderColor: '#d8b4fe' },
                title: 'text-purple-950 dark:text-purple-200',
                button: 'text-purple-800 dark:text-purple-300 bg-white/80 hover:bg-white border-purple-300/80',
                icon: 'text-purple-700 dark:text-purple-400'
            };
        }
        if (ch.includes('DMS') || ch.includes('DMX')) {
            return {
                headerBg: 'bg-emerald-100/90 dark:bg-emerald-950/60',
                headerStyle: { backgroundColor: '#d1fae5' },
                headerBorder: 'border-emerald-200/90 dark:border-emerald-900/60',
                cardBorder: 'border-emerald-200/90 dark:border-emerald-900/50',
                badge: 'bg-emerald-200 text-emerald-900 border-emerald-300 dark:bg-emerald-900/70 dark:text-emerald-200 dark:border-emerald-700',
                badgeStyle: { backgroundColor: '#a7f3d0', color: '#047857', borderColor: '#6ee7b7' },
                title: 'text-emerald-950 dark:text-emerald-200',
                button: 'text-emerald-800 dark:text-emerald-300 bg-white/80 hover:bg-white border-emerald-300/80',
                icon: 'text-emerald-700 dark:text-emerald-400'
            };
        }

        // Palette fallback pastel nếu có kênh khác
        const pastelThemes = [
            {
                headerBg: 'bg-amber-100/90 dark:bg-amber-950/60',
                headerStyle: { backgroundColor: '#fef3c7' },
                headerBorder: 'border-amber-200/80 dark:border-amber-900/60',
                cardBorder: 'border-amber-200/80 dark:border-amber-900/60',
                badge: 'bg-amber-200 text-amber-900 border-amber-300 dark:bg-amber-900/70 dark:text-amber-200 dark:border-amber-700',
                badgeStyle: { backgroundColor: '#fde68a', color: '#92400e', borderColor: '#fcd34d' },
                title: 'text-amber-950 dark:text-amber-200',
                button: 'text-amber-800 dark:text-amber-300 bg-white/80 hover:bg-white border-amber-300/80',
                icon: 'text-amber-700 dark:text-amber-400'
            },
            {
                headerBg: 'bg-sky-100/90 dark:bg-sky-950/60',
                headerStyle: { backgroundColor: '#e0f2fe' },
                headerBorder: 'border-sky-200/80 dark:border-sky-900/60',
                cardBorder: 'border-sky-200/80 dark:border-sky-900/60',
                badge: 'bg-sky-200 text-sky-900 border-sky-300 dark:bg-sky-900/70 dark:text-sky-200 dark:border-sky-700',
                badgeStyle: { backgroundColor: '#bae6fd', color: '#0369a1', borderColor: '#7dd3fc' },
                title: 'text-sky-950 dark:text-sky-200',
                button: 'text-sky-800 dark:text-sky-300 bg-white/80 hover:bg-white border-sky-300/80',
                icon: 'text-sky-700 dark:text-sky-400'
            },
            {
                headerBg: 'bg-rose-100/90 dark:bg-rose-950/60',
                headerStyle: { backgroundColor: '#ffe4e6' },
                headerBorder: 'border-rose-200/80 dark:border-rose-900/60',
                cardBorder: 'border-rose-200/80 dark:border-rose-900/60',
                badge: 'bg-rose-200 text-rose-900 border-rose-300 dark:bg-rose-900/70 dark:text-rose-200 dark:border-rose-700',
                badgeStyle: { backgroundColor: '#fecdd3', color: '#9f1239', borderColor: '#fda4af' },
                title: 'text-rose-950 dark:text-rose-200',
                button: 'text-rose-800 dark:text-rose-300 bg-white/80 hover:bg-white border-rose-300/80',
                icon: 'text-rose-700 dark:text-rose-400'
            },
            {
                headerBg: 'bg-teal-100/90 dark:bg-teal-950/60',
                headerStyle: { backgroundColor: '#ccfbf1' },
                headerBorder: 'border-teal-200/80 dark:border-teal-900/60',
                cardBorder: 'border-teal-200/80 dark:border-teal-900/60',
                badge: 'bg-teal-200 text-teal-900 border-teal-300 dark:bg-teal-900/70 dark:text-teal-200 dark:border-teal-700',
                badgeStyle: { backgroundColor: '#99f6e4', color: '#115e59', borderColor: '#5eead4' },
                title: 'text-teal-950 dark:text-teal-200',
                button: 'text-teal-800 dark:text-teal-300 bg-white/80 hover:bg-white border-teal-300/80',
                icon: 'text-teal-700 dark:text-teal-400'
            }
        ];
        return pastelThemes[index % pastelThemes.length];
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 mb-4">
            {channels.map((channel, idx) => {
                const theme = getChannelTheme(channel, idx);
                const channelStores = stores
                    .filter((s) => s.channel.toUpperCase() === channel.toUpperCase())
                    .sort((a, b) => b.totalBonus - a.totalBonus);

                const top10 = channelStores.slice(0, 10);

                return (
                    <div
                        key={channel}
                        className={`bg-white dark:bg-slate-900 rounded-none border ${theme.cardBorder || 'border-slate-200/80 dark:border-slate-800'} shadow-2xs overflow-hidden flex flex-col justify-between`}
                    >
                        {/* TIÊU ĐỀ KÊNH VỚI MÀU NỀN PASTEL RIÊNG BIỆT */}
                        <div 
                            style={theme.headerStyle}
                            className={`px-3 py-2.5 ${theme.headerBg} border-b ${theme.headerBorder} flex items-center justify-between transition-colors`}
                        >
                            <div className="flex items-center gap-1.5">
                                <span
                                    style={theme.badgeStyle}
                                    className={`px-2 py-0.5 text-[10px] font-black uppercase rounded-none border shadow-2xs ${theme.badge}`}
                                >
                                    {channel}
                                </span>
                                <span className={`text-[11px] font-bold ${theme.title}`}>
                                    Top 10 Thưởng
                                </span>
                            </div>
                            {/* NÚT XUẤT ẢNH (CHỈ ICON, MÀU PASTEL ĐỒNG BỘ) */}
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onExportChannel?.(channel, top10);
                                }}
                                disabled={isExporting}
                                title={`Xuất ảnh Top 10 siêu thị thưởng cao kênh ${channel}`}
                                className={`p-1.5 ${theme.button} border rounded-none transition-all shadow-2xs active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0 flex items-center justify-center`}
                            >
                                <Camera className={`w-3.5 h-3.5 ${theme.icon}`} />
                            </button>
                        </div>

                        {/* BẢNG TOP 10 */}
                        <div className="w-full overflow-hidden flex-1">
                            <table className="w-full table-fixed border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">
                                        <th className="py-1.5 px-1.5 text-center w-7">#</th>
                                        <th className="py-1.5 px-2 text-left">Siêu Thị</th>
                                        <th className="py-1.5 px-2 text-right w-14">Thưởng</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100/80 dark:divide-slate-800/60 text-[11px]">
                                    {top10.length === 0 ? (
                                        <tr>
                                            <td colSpan={3} className="py-4 text-center text-slate-400 text-[11px]">
                                                Chưa có dữ liệu
                                            </td>
                                        </tr>
                                    ) : (
                                        top10.map((store, idx) => {
                                            const rank = idx + 1;
                                            const rankColor =
                                                rank === 1
                                                    ? 'text-amber-600 dark:text-amber-400 font-black'
                                                    : rank === 2
                                                    ? 'text-slate-700 dark:text-slate-300 font-extrabold'
                                                    : rank === 3
                                                    ? 'text-amber-700 dark:text-amber-500 font-extrabold'
                                                    : 'text-slate-400 dark:text-slate-500 font-bold';

                                            return (
                                                <tr
                                                    key={store.storeCode}
                                                    onClick={() => onSelectStore(store.storeCode)}
                                                    className="hover:bg-sky-50/60 dark:hover:bg-sky-950/40 cursor-pointer transition-colors group"
                                                    title={`[${store.storeCode}] ${store.storeName}`}
                                                >
                                                    {/* HẠNG */}
                                                    <td className={`py-1 px-1.5 text-center text-[10.5px] ${rankColor}`}>
                                                        #{rank}
                                                    </td>

                                                    {/* TÊN SIÊU THỊ */}
                                                    <td className="py-1 px-2 text-slate-700 dark:text-slate-200 font-medium truncate text-[10.5px] group-hover:text-sky-600 dark:group-hover:text-sky-400">
                                                        {store.storeName}
                                                    </td>

                                                    {/* THƯỞNG */}
                                                    <td
                                                        className="py-1 px-2 text-right font-black text-emerald-600 dark:text-emerald-400 text-[11px] whitespace-nowrap"
                                                        title={`${store.totalBonus.toLocaleString('vi-VN')} đ`}
                                                    >
                                                        {formatMillion(store.totalBonus)}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* FOOTER CARD */}
                        <div className="px-3 py-1.5 bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
                            <span>{channelStores.length} siêu thị</span>
                            <button
                                type="button"
                                onClick={() => top10[0] && onSelectStore(top10[0].storeCode)}
                                className="text-sky-600 hover:text-sky-700 dark:text-sky-400 font-bold inline-flex items-center gap-0.5 cursor-pointer"
                            >
                                Top 1 <ChevronRight className="w-2.5 h-2.5" />
                            </button>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
