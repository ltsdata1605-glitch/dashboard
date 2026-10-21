import React from 'react';
import { AppIcon } from '../../../components/shared/ui/icon/AppIcon';
import { Button } from '../../../components/shared/ui/Button';
import { formatCurrencyFull } from '../services/checkThuongCalc';

interface CheckThuongHeroBannerProps {
    storeName: string;
    formattedUploadTime: string;
    totalBonus: number;
    countAchieved100: number;
    totalCategories: number;
    onExportBanner?: () => void;
    bannerRef?: React.RefObject<HTMLDivElement | null>;
}

export const CheckThuongHeroBanner: React.FC<CheckThuongHeroBannerProps> = ({
    storeName,
    formattedUploadTime,
    totalBonus,
    countAchieved100,
    totalCategories,
    onExportBanner,
    bannerRef
}) => {
    const pctAchieved100Val = totalCategories > 0 ? (countAchieved100 / totalCategories) * 100 : 0;
    const pctAchieved100Formatted = (pctAchieved100Val % 1 === 0 ? pctAchieved100Val.toFixed(0) : pctAchieved100Val.toFixed(1)) + '%';

    return (
        <div
            ref={bannerRef}
            className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-sky-900 via-sky-800 to-slate-900 dark:from-slate-900 dark:via-sky-950 dark:to-slate-800 text-white p-3.5 sm:p-5 md:p-6 shadow-xl shadow-sky-950/20 border border-sky-500/20"
        >
            {/* GĐ7: bỏ 2 quầng sáng blur 256px trang trí (quyết định A22 — tốn GPU/pin trên máy siêu thị & iPhone; nằm tràn ra ngoài
                thẻ nên còn làm test "không cắt ngang" báo nhầm). Nền chuyển màu của thẻ giữ nguyên. */}

            {/* Top row: subtitle + export action button */}
            <div className="flex items-center justify-between mb-1 sm:mb-2">
                <p className="text-[11px] sm:text-xs font-semibold text-sky-200/90 flex items-center gap-1.5 tracking-wide">
                    <span>Kết quả tra cứu</span>
                    <span className="opacity-40">•</span>
                    <span className="font-normal text-sky-200/80">{formattedUploadTime || 'Dữ liệu mới nhất'}</span>
                </p>

                {onExportBanner && (
                    <Button
                        variant="unstyled"
                        size="none"
                        type="button"
                        onClick={onExportBanner}
                        title="Xuất ảnh báo cáo tổng hợp"
                        aria-label="Xuất ảnh báo cáo tổng hợp"
                        className="ycx-hit p-1 sm:p-1.5 rounded-lg bg-white/10 hover:bg-white/20 active:scale-95 text-white/90 hover:text-white transition-all cursor-pointer no-print hide-on-export backdrop-blur-sm"
                    >
                        <AppIcon name="image" size="xs" />
                    </Button>
                )}
            </div>

            {/* Store Title */}
            <h2 className="text-xl sm:text-[25px] md:text-[28px] font-black tracking-tight leading-tight drop-shadow-sm truncate">
                {storeName || 'Siêu thị'}
            </h2>

            {/* Bottom row: Total bonus & % Achieved >= 100% */}
            <div className="mt-2.5 pt-2.5 sm:mt-4 sm:pt-4 border-t border-white/15 flex items-center justify-between gap-2 sm:gap-4">
                <div className="min-w-0">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-sky-200/80">
                        Tổng tiền thưởng dự kiến
                    </p>
                    <p className="text-xl sm:text-[25px] md:text-[28px] font-black tracking-tight leading-none mt-0.5 sm:mt-1 drop-shadow-md text-amber-300 truncate">
                        {formatCurrencyFull(totalBonus)}
                        <span className="text-[11px] sm:text-xs font-bold text-amber-200/80 ml-1">đ</span>
                    </p>
                </div>

                <div className="flex flex-col items-end bg-white/10 dark:bg-black/20 backdrop-blur-md px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-lg sm:rounded-xl border border-white/20 shadow-inner shrink-0">
                    <div className="flex items-center gap-1 sm:gap-1.5 mb-0.5">
                        <span className="w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full bg-white/20 flex items-center justify-center">
                            <AppIcon name="check" size="xs" />
                        </span>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-white/90 whitespace-nowrap">
                            % Nhóm Đạt ≥ 100%
                        </span>
                    </div>
                    <div className="flex items-baseline gap-1.5 sm:gap-2">
                        <span className="text-base sm:text-xl md:text-[25px] font-black text-white leading-none">
                            {pctAchieved100Formatted}
                        </span>
                        <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-md bg-white/20 text-white border border-white/20">
                            {countAchieved100}/{totalCategories}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};
