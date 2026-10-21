import React from 'react';
import { AppIcon } from '../../../components/shared/ui/icon/AppIcon';
import { Button } from '../../../components/shared/ui/Button';
import { CheckThuongAnalysisResult } from '../types';
import { toast } from '../../../components/shared/ui/toast';

interface CheckThuongAnalysisCardProps {
    analysis: CheckThuongAnalysisResult;
    totalBonus: number;
    onSelectCategory?: (categoryName: string, channel: string) => void;
    onExportAnalysis?: () => void;
    cardRef?: React.RefObject<HTMLDivElement | null>;
}

const formatBonusShort = (bonus: number): string => {
    if (!bonus || isNaN(bonus)) return '0tr';
    if (bonus >= 1_000_000) {
        const inMillions = bonus / 1_000_000;
        const rounded = Math.round(inMillions * 1000) / 1000;
        return `${rounded.toLocaleString('vi-VN', { maximumFractionDigits: 3 })}tr`;
    }
    return `${bonus.toLocaleString('vi-VN')}đ`;
};

export const CheckThuongAnalysisCard: React.FC<CheckThuongAnalysisCardProps> = ({
    analysis,
    totalBonus,
    onSelectCategory,
    onExportAnalysis,
    cardRef
}) => {
    const { achievedCount, totalCategories, warningList, opportunityList, noSaleCount } = analysis;
    const bonusFormatted = formatBonusShort(totalBonus);

    const handleCopy = () => {
        let text = `Phân Tích & Đề Xuất\n`;
        text += `Siêu thị đã xuất sắc đạt được tổng giải thưởng là ${bonusFormatted} với ${achievedCount}/${totalCategories} môn thi đang có thưởng.\n\n`;

        if (warningList.length > 0) {
            text += `Cảnh báo: Có ${warningList.length} môn đang có thưởng nhưng ở vị trí mấp mé. Cần chú ý duy trì để không rớt hạng:\n`;
            warningList.forEach(w => {
                const rankPart = w.currentRank ? `: đang hạng ${w.currentRank}${w.cutoffRank ? ` (mốc Top ${w.cutoffRank})` : ''}.` : '.';
                text += `• ${w.nganhHang}${rankPart}\n`;
            });
            text += `\n`;
        }

        if (opportunityList.length > 0) {
            text += `Cơ hội vàng: Tập trung vào ${opportunityList.length} môn tiềm năng sau để tối đa hóa giải thưởng:\n`;
            opportunityList.forEach(o => {
                text += `• ${o.name}: cần cải thiện ${o.ranksNeeded} hạng.\n`;
            });
            text += `\n`;
        }

        if (noSaleCount > 0) {
            text += `Điểm cần bứt phá: ${noSaleCount} môn chưa phát sinh doanh số. Cần xem xét lại chiến lược và tìm giải pháp cải thiện.\n`;
        }

        navigator.clipboard.writeText(text);
        toast.success('Đã sao chép nội dung phân tích vào clipboard!');
    };

    return (
        <div
            ref={cardRef}
            className="rounded-card border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 sm:p-5 shadow-xs space-y-3 sm:space-y-4"
        >
            {/* Header */}
            <div className="flex items-center justify-between pb-1">
                <h3 className="text-base sm:text-[17px] font-bold text-slate-900 dark:text-slate-100 tracking-tight sm:leading-7">
                    Phân Tích & Đề Xuất
                </h3>

                <div className="flex items-center gap-2 no-print hide-on-export">
                    {/* Nút công cụ đầu thẻ chuẩn 4.1b; nút xuất ảnh màu hổ phách giữ làm điểm nhấn như thiết kế cũ */}
                    <Button
                        variant="ghost"
                        size="icon"
                        type="button"
                        onClick={handleCopy}
                        title="Sao chép nội dung phân tích"
                        aria-label="Sao chép nội dung phân tích"
                        className="lg:w-9 lg:h-9 text-slate-400 hover:text-slate-700"
                    >
                        <AppIcon name="copy" size="md" />
                    </Button>
                    {onExportAnalysis && (
                        <>
                            <Button
                                variant="ghost"
                                size="icon"
                                type="button"
                                onClick={onExportAnalysis}
                                title="Chụp ảnh phân tích"
                                aria-label="Chụp ảnh phân tích"
                                className="lg:w-9 lg:h-9 text-slate-400 hover:text-slate-700"
                            >
                                <AppIcon name="exportImage" size="md" />
                            </Button>
                            <Button
                                variant="unstyled"
                                size="icon"
                                type="button"
                                onClick={onExportAnalysis}
                                title="Xuất ảnh phân tích"
                                aria-label="Xuất ảnh phân tích"
                                className="lg:w-9 lg:h-9 flex items-center justify-center bg-amber-500 hover:bg-amber-600 text-white shadow-xs transition-colors"
                            >
                                <AppIcon name="image" size="md" />
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {/* Item 1: Overview bonus */}
            <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-sky-100 dark:bg-sky-950/70 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0 mt-0.5">
                    <AppIcon name="check" size="xs" />
                </span>
                <div className="text-xs sm:text-[13px] text-slate-800 dark:text-slate-200 leading-relaxed">
                    Siêu thị đã xuất sắc đạt được tổng giải thưởng là{' '}
                    <strong className="text-sky-600 dark:text-sky-400 font-bold">{bonusFormatted}</strong> với{' '}
                    <strong className="text-sky-600 dark:text-sky-400 font-bold">
                        {achievedCount}/{totalCategories}
                    </strong>{' '}
                    môn thi đang có thưởng.
                </div>
            </div>

            {/* Item 2: Warnings */}
            {warningList.length > 0 && (
                <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                        <AppIcon name="alert" size="xs" />
                    </span>
                    <div className="text-xs sm:text-[13px] text-slate-800 dark:text-slate-200 leading-relaxed flex-1">
                        <div>
                            <span className="font-bold text-slate-900 dark:text-slate-100">Cảnh báo: </span>
                            <span className="font-bold text-amber-600 dark:text-amber-400">
                                Có {warningList.length} môn{' '}
                            </span>
                            <span>đang có thưởng nhưng ở vị trí mấp mé. Cần chú ý duy trì để không rớt hạng:</span>
                        </div>
                        <ul className="mt-1.5 space-y-1 text-slate-700 dark:text-slate-300">
                            {warningList.map((item, idx) => (
                                <li key={idx} className="flex items-start gap-1.5">
                                    <span className="text-slate-400 select-none">•</span>
                                    <Button
                                        variant="unstyled"
                                        size="none"
                                        type="button"
                                        onClick={() => onSelectCategory?.(item.nganhHang, item.kenh)}
                                        className="hover:text-amber-600 dark:hover:text-amber-400 hover:underline cursor-pointer text-left"
                                    >
                                        <span className="font-medium text-slate-800 dark:text-slate-200">{item.nganhHang}:</span>{' '}
                                        <span className="text-slate-600 dark:text-slate-400">đang </span>
                                        <span className="font-bold text-amber-700 dark:text-amber-400">
                                            hạng {item.currentRank ?? '-'}
                                        </span>
                                        {item.cutoffRank !== undefined && (
                                            <span className="text-slate-500 dark:text-slate-400"> (mốc Top {item.cutoffRank})</span>
                                        )}
                                        .
                                    </Button>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}

            {/* Item 3: Golden Opportunities */}
            {opportunityList.length > 0 && (
                <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                        <AppIcon name="quick" size="xs" />
                    </span>
                    <div className="text-xs sm:text-[13px] text-slate-800 dark:text-slate-200 leading-relaxed flex-1">
                        <div>
                            <span className="font-bold text-slate-900 dark:text-slate-100">Cơ hội vàng: </span>
                            <span className="font-bold text-emerald-700 dark:text-emerald-400">
                                Tập trung vào {opportunityList.length} môn tiềm năng{' '}
                            </span>
                            <span>sau để tối đa hóa giải thưởng:</span>
                        </div>
                        <ul className="mt-1.5 space-y-1 text-slate-700 dark:text-slate-300">
                            {opportunityList.map((item, idx) => (
                                <li key={idx} className="flex items-start gap-1.5">
                                    <span className="text-slate-400 select-none">•</span>
                                    <Button
                                        variant="unstyled"
                                        size="none"
                                        type="button"
                                        onClick={() => onSelectCategory?.(item.name, item.kenh)}
                                        className="hover:text-emerald-600 dark:hover:text-emerald-400 hover:underline cursor-pointer text-left"
                                    >
                                        <span className="font-medium text-slate-800 dark:text-slate-200">{item.name}:</span>{' '}
                                        <span className="text-slate-600 dark:text-slate-400">cần cải thiện </span>
                                        <span className="font-bold text-emerald-800 dark:text-emerald-400">
                                            {item.ranksNeeded} hạng.
                                        </span>
                                    </Button>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}

            {/* Item 4: Points to break through */}
            {noSaleCount > 0 && (
                <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-rose-100 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 mt-0.5">
                        <AppIcon name="trendUp" size="xs" />
                    </span>
                    <div className="text-xs sm:text-[13px] text-slate-800 dark:text-slate-200 leading-relaxed">
                        <span className="font-bold text-slate-900 dark:text-slate-100">Điểm cần bứt phá: </span>
                        <span className="font-bold text-rose-600 dark:text-rose-400">
                            {noSaleCount} môn chưa phát sinh doanh số.{' '}
                        </span>
                        <span>Cần xem xét lại chiến lược và tìm giải pháp cải thiện.</span>
                    </div>
                </div>
            )}
        </div>
    );
};
