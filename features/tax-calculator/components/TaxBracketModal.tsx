import React from 'react';
import { X, Layers, Sparkles } from 'lucide-react';
import { Button } from '../../../components/shared/ui/Button';
import {
    TAX_BRACKETS_2026,
    PERSONAL_DEDUCTION_2026,
    DEPENDENT_DEDUCTION_2026,
    formatVnd,
} from '../services/taxCalculatorService';
import { BracketDetail } from '../types/tax.types';

interface TaxBracketModalProps {
    isOpen: boolean;
    onClose: () => void;
    activeBracketsWithProxy?: BracketDetail[];
    activeBracketsWithoutProxy?: BracketDetail[];
}

export const TaxBracketModal: React.FC<TaxBracketModalProps> = ({
    isOpen,
    onClose,
    activeBracketsWithProxy = [],
    activeBracketsWithoutProxy = [],
}) => {
    if (!isOpen) return null;

    const brackets = TAX_BRACKETS_2026;
    const personalDeduction = PERSONAL_DEDUCTION_2026;
    const dependentDeduction = DEPENDENT_DEDUCTION_2026;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="relative w-full max-w-xl bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400">
                            <Layers size={16} />
                        </div>
                        <div>
                            <div className="flex items-center gap-1.5">
                                <h3 className="font-bold text-sm text-slate-800 dark:text-white">
                                    Biểu Thuế Thu Nhập Cá Nhân
                                </h3>
                                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400">
                                    <Sparkles size={10} /> 5 Bậc
                                </span>
                            </div>
                            <p className="text-[11px] text-slate-400">
                                Luật Thuế TNCN số 109/2025/QH15 (Áp dụng từ kỳ tính thuế 2026)
                            </p>
                        </div>
                    </div>
                    <Button variant="ghost" size="none" onClick={onClose} className="h-8 w-8 p-0 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                        <X size={16} />
                    </Button>
                </div>

                {/* Deductions banner */}
                <div className="px-4 py-2.5 bg-sky-50/50 dark:bg-sky-950/20 border-b border-slate-100 dark:border-slate-800 text-xs flex flex-wrap gap-4 text-slate-700 dark:text-slate-300">
                    <div>
                        Giảm trừ bản thân: <strong className="text-sky-600 dark:text-sky-400">{formatVnd(personalDeduction)}/tháng</strong>
                    </div>
                    <div>
                        Người phụ thuộc: <strong className="text-sky-600 dark:text-sky-400">{formatVnd(dependentDeduction)}/người/tháng</strong>
                    </div>
                </div>

                {/* Body table */}
                <div className="overflow-y-auto p-4 space-y-4">
                    <div className="rounded-xl border border-slate-200/80 dark:border-slate-700/80 overflow-hidden shadow-2xs">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead className="bg-slate-50 dark:bg-slate-900/70 border-b border-slate-200 dark:border-slate-700 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                                <tr>
                                    <th className="py-2.5 px-3 w-12 text-center border-r border-slate-200/70 dark:border-slate-700/70">Bậc</th>
                                    <th className="py-2.5 px-3 border-r border-slate-200/70 dark:border-slate-700/70">Thu Nhập Tính Thuế / Tháng</th>
                                    <th className="py-2.5 px-3 text-center w-20">Thuế Suất</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                                {brackets.map((b, idx) => {
                                    const prevMax = idx > 0 ? brackets[idx - 1].max : 0;
                                    const rangeStr = b.max === Infinity
                                        ? `Trên ${formatVnd(prevMax)}`
                                        : `${formatVnd(prevMax + 1)} - ${formatVnd(b.max)}`;

                                    const detailWith = activeBracketsWithProxy.find(d => d.level === b.level);
                                    const detailWithout = activeBracketsWithoutProxy.find(d => d.level === b.level);
                                    const isActive = !!detailWith || !!detailWithout;

                                    return (
                                        <tr
                                            key={b.level}
                                            className={`transition-colors ${
                                                isActive
                                                    ? 'bg-sky-50/70 dark:bg-sky-950/30'
                                                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                                            }`}
                                        >
                                            <td className="py-2.5 px-3 text-center font-mono font-bold text-sky-600 dark:text-sky-400 border-r border-slate-100 dark:border-slate-800/60">
                                                {b.level}
                                            </td>
                                            <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300 border-r border-slate-100 dark:border-slate-800/60">
                                                <div>{rangeStr}</div>
                                                {detailWith && (
                                                    <div className="text-[10px] text-rose-500 font-mono mt-0.5">
                                                        Thu nhập tính thuế bậc này: {formatVnd(detailWith.incomeInBracket)} &rarr; Thuế: {formatVnd(detailWith.taxInBracket)}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="py-2.5 px-3 text-center font-bold font-mono text-slate-900 dark:text-white">
                                                {Math.round(b.rate * 100)}%
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
                        <p><strong className="text-slate-700 dark:text-slate-200">Ghi chú:</strong> Thu nhập tính thuế = Tổng thu nhập chịu thuế - (Giảm trừ bản thân 15.5tr + Giảm trừ người phụ thuộc 6.2tr/người + Bảo hiểm bắt buộc 10.5% + Đoàn phí công đoàn).</p>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex justify-end px-4 py-2.5 bg-slate-50 dark:bg-slate-900/40 border-t border-slate-100 dark:border-slate-700">
                    <Button variant="secondary" size="sm" onClick={onClose}>
                        Đóng
                    </Button>
                </div>
            </div>
        </div>
    );
};
