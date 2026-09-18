import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Trophy, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { LeaderboardFilterState, LeaderboardSortField } from '../types';
import {
    parseStoreSummaryFromData,
    filterAndSortStoreSummaries,
    getDistinctChannels,
    calculateSystemStats
} from '../services/checkThuongCalc';
import { exportLeaderboardToImage } from '../services/checkThuongImageExport';
import { getGlobalFont } from '../../../services/dbService';
import { CheckThuongSummaryCards } from './CheckThuongSummaryCards';
import { CheckThuongChannelTopGrid } from './CheckThuongChannelTopGrid';
import { CheckThuongFilterBar } from './CheckThuongFilterBar';
import { CheckThuongTopTable } from './CheckThuongTopTable';

interface CheckThuongLeaderboardViewProps {
    competitionData: any[][];
    uploadTime?: string;
    fileName?: string;
    onSelectStore: (storeCode: string) => void;
    onSwitchToSearch: () => void;
}

export const CheckThuongLeaderboardView: React.FC<CheckThuongLeaderboardViewProps> = ({
    competitionData,
    uploadTime,
    fileName,
    onSelectStore,
    onSwitchToSearch
}) => {
    const [filters, setFilters] = useState<LeaderboardFilterState>({
        channel: 'ALL',
        searchQuery: '',
        sortBy: 'bonus',
        sortOrder: 'desc',
    });
    const [exportLimit, setExportLimit] = useState<number>(50);
    const [isExporting, setIsExporting] = useState<boolean>(false);
    const [activeFont, setActiveFont] = useState<string>('UTM Avo');

    // Đọc font chữ người dùng đã cài đặt và lắng nghe thay đổi
    useEffect(() => {
        getGlobalFont().then(font => {
            if (font) setActiveFont(font);
        }).catch(() => { /* fallback UTM Avo */ });

        const observer = new MutationObserver(() => {
            const parentStyle = document.getElementById('dynamic-font-style');
            if (parentStyle) {
                const match = parentStyle.innerHTML.match(/font-family:\s*'([^']+)'/);
                if (match && match[1]) {
                    setActiveFont(match[1]);
                }
            }
        });
        observer.observe(document.head, { childList: true, subtree: true, characterData: true });
        return () => observer.disconnect();
    }, []);

    // 1. TẤT CẢ SIÊU THỊ ĐƯỢC TỔNG HỢP TỪ DỮ LIỆU
    const allStores = useMemo(() => {
        return parseStoreSummaryFromData(competitionData);
    }, [competitionData]);

    // 2. DANH SÁCH CÁC KÊNH DUY NHẤT
    const channels = useMemo(() => {
        return getDistinctChannels(allStores);
    }, [allStores]);

    // 3. THỐNG KÊ TOÀN HỆ THỐNG
    const stats = useMemo(() => {
        return calculateSystemStats(allStores);
    }, [allStores]);

    // 4. DANH SÁCH SAU KHI LỌC VÀ SẮP XẾP
    const filteredStores = useMemo(() => {
        return filterAndSortStoreSummaries(allStores, filters);
    }, [allStores, filters]);

    const handleFilterChange = useCallback((updates: Partial<LeaderboardFilterState>) => {
        setFilters(prev => ({ ...prev, ...updates }));
    }, []);

    const handleResetFilters = useCallback(() => {
        setFilters({
            channel: 'ALL',
            searchQuery: '',
            sortBy: 'bonus',
            sortOrder: 'desc',
        });
    }, []);

    const handleSort = useCallback((field: LeaderboardSortField) => {
        setFilters(prev => {
            if (prev.sortBy === field) {
                return {
                    ...prev,
                    sortOrder: prev.sortOrder === 'asc' ? 'desc' : 'asc'
                };
            }
            // Chiều mặc định cho lần bấm đầu tiên:
            // Hạng, Mã kho, Kênh, Tên siêu thị: tăng dần (asc: 1->N, A->Z)
            // Thưởng, %Đạt, Đạt 100%: giảm dần (desc: cao->thấp)
            const defaultOrder = (field === 'rank' || field === 'code' || field === 'channel' || field === 'name') ? 'asc' : 'desc';
            return {
                ...prev,
                sortBy: field,
                sortOrder: defaultOrder
            };
        });
    }, []);

    const handleExportLimitChange = useCallback((limit: number) => {
        setExportLimit(limit);
    }, []);

    const handleExportImage = useCallback(async () => {
        if (filteredStores.length === 0) {
            toast.error('Không có dữ liệu siêu thị để xuất ảnh!');
            return;
        }

        setIsExporting(true);
        const toastId = toast.loading(`Đang tạo ảnh Top ${exportLimit} siêu thị...`);
        try {
            await exportLeaderboardToImage({
                stores: filteredStores,
                limit: exportLimit,
                channel: filters.channel,
                fileName,
                fontName: activeFont
            });
            toast.success(`Đã xuất ảnh Top ${exportLimit} siêu thị thành công!`, { id: toastId, icon: '📸' });
        } catch (err: any) {
            console.error('Export Image Error:', err);
            toast.error(err?.message || 'Xuất ảnh thất bại, vui lòng thử lại!', { id: toastId });
        } finally {
            setIsExporting(false);
        }
    }, [filteredStores, exportLimit, filters.channel, fileName, activeFont]);

    const handleExportChannelImage = useCallback(async (channel: string, topStores: any[]) => {
        if (!topStores || topStores.length === 0) {
            toast.error(`Không có dữ liệu kênh ${channel} để xuất ảnh!`);
            return;
        }

        setIsExporting(true);
        const toastId = toast.loading(`Đang tạo ảnh Top ${topStores.length} kênh ${channel}...`);
        try {
            await exportLeaderboardToImage({
                stores: topStores,
                limit: topStores.length,
                channel,
                fileName,
                fontName: activeFont
            });
            toast.success(`Đã xuất ảnh Top ${topStores.length} kênh ${channel} thành công!`, { id: toastId, icon: '📸' });
        } catch (err: any) {
            console.error('Export Channel Image Error:', err);
            toast.error(err?.message || 'Xuất ảnh thất bại, vui lòng thử lại!', { id: toastId });
        } finally {
            setIsExporting(false);
        }
    }, [fileName, activeFont]);

    if (!competitionData || competitionData.length === 0) {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center">
                <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800 mb-3">
                    <AlertCircle className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-1">
                    Chưa có dữ liệu Check Thưởng
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mb-4">
                    Vui lòng tải file Excel báo cáo thi đua tại tab Tra Cứu để xem Bảng xếp hạng Top thưởng.
                </p>
                <button
                    onClick={onSwitchToSearch}
                    className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
                >
                    Chuyển sang Tra Cứu để Tải File
                </button>
            </div>
        );
    }

    return (
        <div
            className="w-full h-full overflow-y-auto bg-slate-50/50 dark:bg-slate-950/50"
            style={{ fontFamily: `'${activeFont}', 'UTM Avo', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif` }}
        >
            <div className="max-w-[960px] mx-auto w-full px-3 sm:px-4 py-3 sm:py-4">
                {/* TIÊU ĐỀ TRANG */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 mb-3.5">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-300 text-slate-950 shadow-xs shadow-amber-500/20 shrink-0">
                            <Trophy className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight">
                                    Bảng Xếp Hạng TOP Siêu Thị Thưởng Cao
                                </h2>
                                <span className="px-1.5 py-0.2 text-[9px] font-black uppercase tracking-wider rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/80 dark:text-amber-200 border border-amber-300 dark:border-amber-700">
                                    Realtime
                                </span>
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                {fileName ? `Dữ liệu từ: ${fileName}` : 'Xếp hạng dự kiến dựa trên các nhóm ngành hàng đạt thưởng'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* THẺ TỔNG HỢP KPI */}
                <CheckThuongSummaryCards
                    stats={stats}
                    onSelectTopStore={onSelectStore}
                />

                {/* GRID 4 CỘT: TOP 10 THƯỞNG THEO 4 KÊNH */}
                <CheckThuongChannelTopGrid
                    stores={allStores}
                    channels={channels}
                    onSelectStore={onSelectStore}
                    onExportChannel={handleExportChannelImage}
                    isExporting={isExporting}
                />

                {/* THANH BỘ LỌC & NÚT XUẤT ẢNH */}
                <CheckThuongFilterBar
                    filters={filters}
                    channels={channels}
                    totalCount={allStores.length}
                    filteredCount={filteredStores.length}
                    exportLimit={exportLimit}
                    isExporting={isExporting}
                    onExportLimitChange={handleExportLimitChange}
                    onFilterChange={handleFilterChange}
                    onReset={handleResetFilters}
                    onExportImage={handleExportImage}
                />

                {/* BẢNG DỮ LIỆU TOP SIÊU THỊ */}
                <CheckThuongTopTable
                    stores={filteredStores}
                    sortField={filters.sortBy}
                    sortOrder={filters.sortOrder}
                    pageSize={exportLimit}
                    onPageSizeChange={handleExportLimitChange}
                    onSort={handleSort}
                    onSelectStore={onSelectStore}
                />
            </div>
        </div>
    );
};
