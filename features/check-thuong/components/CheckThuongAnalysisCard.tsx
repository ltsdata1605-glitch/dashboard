import React from 'react';
import { AppIcon } from '../../../components/shared/ui/icon/AppIcon';
import { formatCurrency } from '../services/checkThuongCalc';
import { CheckThuongAnalysisResult } from '../types';
import { toast } from '../../../components/shared/ui/toast';

interface CheckThuongAnalysisCardProps {
    analysis: CheckThuongAnalysisResult;
    totalBonus: number;
    onSelectCategory?: (categoryName: string, channel: string) => void;
    onExportAnalysis?: () => void;
    cardRef?: React.RefObject<HTMLDivElement | null>;
}

export const CheckThuongAnalysisCard: React.FC<CheckThuongAnalysisCardProps> = ({
    analysis,
    totalBonus,
    onSelectCategory,
    onExportAnalysis,
    cardRef
}) => {
    const { achievedCount, totalCategories, warningList, opportunityList, noSaleCount } = analysis;

    const handleCopy = () => {
        let text = `BÁO CÁO PHÂN TÍCH CHECK THƯỞNG\n`;
        text += `• Tổng tiền thưởng: ${formatCurrency(totalBonus)}đ (${achievedCount}/${totalCategories} môn có thưởng)\n`;

        if (warningList.length > 0) {
            text += `• CẢNH BÁO (${warningList.length} môn mấp mé): ${warningList.map(w => w.nganhHang).join(', ')}\n`;
        }

        if (opportunityList.length > 0) {
            text += `• CƠ HỘI VÀNG: ${opportunityList.slice(0, 5).map(o => `${o.name} (cần +${o.ranksNeeded} hạng)`).join(', ')}\n`;
        }

        if (noSaleCount > 0) {
            text += `• CHƯA PHÁT SINH SỐ: ${noSaleCount} môn\n`;
        }

        navigator.clipboard.writeText(text);
        toast.success('Đã sao chép nội dung phân tích vào clipboard!');
    };

    return (
        <div
            ref={cardRef}
            className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-xs space-y-3"
        >
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold">
                        <AppIcon name="filter" size="xs" />
                    </div>
                    <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">
                        Phân Tích & Đề Xuất Hành Động
                    </h3>
                </div>

                <div className="flex items-center gap-1.5 no-print">
                    <button
                        type="button"
                        onClick={handleCopy}
                        title="Sao chép nội dung phân tích"
                        className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-all cursor-pointer"
                    >
                        <AppIcon name="copy" size="xs" />
                    </button>
                    {onExportAnalysis && (
                        <button
                            type="button"
                            onClick={onExportAnalysis}
                            title="Xuất ảnh phân tích"
                            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-all cursor-pointer"
                        >
                            <AppIcon name="image" size="xs" />
                        </button>
                    )}
                </div>
            </div>

            {/* Item 1: Success overview */}
            <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-sky-50/60 dark:bg-sky-950/20 border border-sky-100 dark:border-sky-900/40 text-xs">
                <span className="w-5 h-5 rounded-full bg-sky-500 text-white flex items-center justify-center shrink-0 mt-0.5">
                    <AppIcon name="check" size="xs" />
                </span>
                <div className="text-slate-700 dark:text-slate-300 leading-relaxed">
                    Siêu thị đã đạt tổng giải thưởng là <strong className="text-sky-600 dark:text-sky-400 font-black">{formatCurrency(totalBonus)}đ</strong> với <strong className="text-sky-600 dark:text-sky-400 font-bold">{achievedCount}/{totalCategories}</strong> môn thi đang có thưởng.
                </div>
            </div>

            {/* Item 2: Warnings (môn mấp mé) */}
            {warningList.length > 0 && (
                <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40 text-xs">
                    <span className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center shrink-0 mt-0.5">
                        <AppIcon name="alert" size="xs" />
                    </span>
                    <div className="text-slate-700 dark:text-slate-300 leading-relaxed">
                        <span className="font-bold text-amber-700 dark:text-amber-400">Cảnh báo: </span>
                        Có <strong className="text-amber-700 dark:text-amber-400">{warningList.length} môn</strong> đang có thưởng nhưng ở vị trí mấp mé sát ranh giới. Cần tập trung giữ vững:
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                            {warningList.map((item, idx) => (
                                <button
                                    key={idx}
                                    type="button"
                                    onClick={() => onSelectCategory?.(item.nganhHang, item.kenh)}
                                    className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-800 text-[11px] font-semibold text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40 cursor-pointer"
                                >
                                    {item.nganhHang}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Item 3: Golden Opportunities */}
            {opportunityList.length > 0 && (
                <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 text-xs">
                    <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 mt-0.5">
                        <AppIcon name="star" size="xs" />
                    </span>
                    <div className="text-slate-700 dark:text-slate-300 leading-relaxed">
                        <span className="font-bold text-emerald-700 dark:text-emerald-400">Cơ hội vàng: </span>
                        Tập trung bứt phá các môn sau để lọt top nhận thêm thưởng:
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                            {opportunityList.slice(0, 8).map((item, idx) => (
                                <button
                                    key={idx}
                                    type="button"
                                    onClick={() => onSelectCategory?.(item.name, item.kenh)}
                                    className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-800 text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 cursor-pointer flex items-center gap-1"
                                >
                                    <span>{item.name}:</span>
                                    <span className="font-black text-emerald-600 dark:text-emerald-400">+{item.ranksNeeded} hạng</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Item 4: No sale count */}
            {noSaleCount > 0 && (
                <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 text-xs">
                    <span className="w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center shrink-0 mt-0.5">
                        <AppIcon name="close" size="xs" />
                    </span>
                    <div className="text-slate-700 dark:text-slate-300 leading-relaxed">
                        <span className="font-bold text-rose-700 dark:text-rose-400">Điểm cần chú ý: </span>
                        Có <strong className="text-rose-700 dark:text-rose-400">{noSaleCount} môn chưa phát sinh doanh số</strong>. Cần kiểm tra lại kế hoạch và trưng bày.
                    </div>
                </div>
            )}
        </div>
    );
};
