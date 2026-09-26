import React, { useState, useMemo } from 'react';
import { IndustryItemOption, IndustryKpiCardConfig } from '../../../services/industryKpiCalc';
import { X, Search, Check, Plus, RotateCcw, Package, Layers } from 'lucide-react';
import { Button } from '../../../../../components/shared/ui/Button';

interface AddIndustryKpiModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAddCard: (card: IndustryKpiCardConfig) => void;
    onRemoveCard: (id: string) => void;
    currentCards: IndustryKpiCardConfig[];
    availableIndustries: IndustryItemOption[];
    availableSubIndustries: IndustryItemOption[];
    onResetDefault: () => void;
}

export const AddIndustryKpiModal: React.FC<AddIndustryKpiModalProps> = ({
    isOpen,
    onClose,
    onAddCard,
    onRemoveCard,
    currentCards,
    availableIndustries,
    availableSubIndustries,
    onResetDefault,
}) => {
    const [activeTab, setActiveTab] = useState<'subIndustry' | 'industry'>('subIndustry');
    const [searchTerm, setSearchTerm] = useState('');

    const currentCardMap = useMemo(() => {
        const map = new Map<string, IndustryKpiCardConfig>();
        currentCards.forEach((c) => {
            map.set(c.title.toLowerCase(), c);
            map.set(c.id, c);
        });
        return map;
    }, [currentCards]);

    const filteredItems = useMemo(() => {
        const sourceList = activeTab === 'subIndustry' ? availableSubIndustries : availableIndustries;
        if (!searchTerm.trim()) return sourceList;

        const term = searchTerm.toLowerCase().trim();
        return sourceList.filter(
            (item) =>
                item.displayName.toLowerCase().includes(term) ||
                item.rawName.toLowerCase().includes(term) ||
                (item.parentName && item.parentName.toLowerCase().includes(term))
        );
    }, [activeTab, availableIndustries, availableSubIndustries, searchTerm]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 w-full max-w-lg shadow-xl overflow-hidden flex flex-col max-h-[85vh]">
                {/* Header */}
                <div className="px-4 py-3 bg-sky-600 dark:bg-sky-700 text-white flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Plus className="w-5 h-5" />
                        <h3 className="text-sm sm:text-base font-black uppercase tracking-wider">
                            Quản lý & Thêm Thẻ KPI Ngành Hàng
                        </h3>
                    </div>
                    <Button
                        type="button"
                        variant="unstyled"
                        size="none"
                        onClick={onClose}
                        className="p-1 rounded text-white/80 hover:text-white hover:bg-white/20 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </Button>
                </div>

                {/* Search & Tabs */}
                <div className="p-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex flex-col gap-2.5">
                    {/* Search */}
                    <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Tìm nhanh ngành hàng hoặc nhóm hàng..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-none focus:outline-hidden focus:border-sky-500 text-slate-800 dark:text-slate-100"
                        />
                    </div>

                    {/* Tabs */}
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1 p-0.5 bg-slate-200/70 dark:bg-slate-800 rounded-sm text-xs">
                            <button
                                type="button"
                                onClick={() => setActiveTab('subIndustry')}
                                className={`flex items-center gap-1.5 px-3 py-1 font-bold rounded-xs transition-all ${
                                    activeTab === 'subIndustry'
                                        ? 'bg-white dark:bg-slate-900 text-sky-700 dark:text-sky-400 shadow-2xs'
                                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                                }`}
                            >
                                <Package className="w-3.5 h-3.5" />
                                <span>Nhóm hàng ({availableSubIndustries.length})</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('industry')}
                                className={`flex items-center gap-1.5 px-3 py-1 font-bold rounded-xs transition-all ${
                                    activeTab === 'industry'
                                        ? 'bg-white dark:bg-slate-900 text-sky-700 dark:text-sky-400 shadow-2xs'
                                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                                }`}
                            >
                                <Layers className="w-3.5 h-3.5" />
                                <span>Ngành hàng ({availableIndustries.length})</span>
                            </button>
                        </div>

                        {/* Reset button */}
                        <Button
                            type="button"
                            variant="unstyled"
                            size="none"
                            onClick={onResetDefault}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-sky-700 dark:hover:text-sky-400 transition-colors"
                            title="Khôi phục 12 thẻ mặc định"
                        >
                            <RotateCcw className="w-3 h-3" />
                            <span className="hidden sm:inline">Mặc định (12 thẻ)</span>
                        </Button>
                    </div>
                </div>

                {/* Items List */}
                <div className="p-3 overflow-y-auto flex-1 divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredItems.length === 0 ? (
                        <div className="py-8 text-center text-xs text-slate-400 dark:text-slate-500">
                            Không tìm thấy ngành/nhóm hàng nào phù hợp.
                        </div>
                    ) : (
                        filteredItems.map((item) => {
                            const isSelected = currentCardMap.has(item.displayName.toLowerCase()) || currentCardMap.has(item.id);
                            const activeCard = currentCardMap.get(item.displayName.toLowerCase()) || currentCardMap.get(item.id);

                            return (
                                <div
                                    key={item.id}
                                    className="py-2 px-1.5 flex items-center justify-between gap-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                                >
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100">
                                                {item.displayName}
                                            </span>
                                            {item.parentName && (
                                                <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                                                    ({item.parentName})
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {isSelected ? (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (activeCard) onRemoveCard(activeCard.id);
                                            }}
                                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300/80 dark:border-emerald-800/80 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300 transition-colors group cursor-pointer"
                                            title="Bấm để bỏ thẻ này"
                                        >
                                            <Check className="w-3 h-3 group-hover:hidden" />
                                            <X className="w-3 h-3 hidden group-hover:inline" />
                                            <span className="group-hover:hidden">Đã thêm</span>
                                            <span className="hidden group-hover:inline">Bỏ chọn</span>
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                onAddCard({
                                                    id: item.id,
                                                    title: item.displayName,
                                                    type: item.type,
                                                });
                                            }}
                                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/60 border border-sky-300/80 dark:border-sky-800/80 hover:bg-sky-100 dark:hover:bg-sky-900/60 transition-colors cursor-pointer"
                                        >
                                            <Plus className="w-3 h-3" />
                                            <span>Thêm</span>
                                        </button>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Footer */}
                <div className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">
                        Đang hiển thị: <strong className="text-slate-800 dark:text-slate-100 font-bold">{currentCards.length}</strong> thẻ KPI
                    </span>
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-1.5 font-bold text-xs bg-sky-600 hover:bg-sky-700 text-white rounded-none transition-colors cursor-pointer"
                    >
                        Hoàn tất
                    </button>
                </div>
            </div>
        </div>
    );
};
