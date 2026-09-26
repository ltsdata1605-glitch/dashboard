import React, { useState, useMemo, useCallback } from 'react';
import {
    IndustryKpiCardConfig,
    IndustryKpiMetricData,
    DEFAULT_INDUSTRY_KPI_CARDS,
    extractKpiMetric,
    getAllAvailableIndustryItems,
} from '../../../services/industryKpiCalc';
import { IndustryTreeNode } from '../../../utils/dashboardHelpers';
import { useIndexedDBState } from '../../../hooks/useIndexedDBState';
import { IndustryKpiCard } from './IndustryKpiCard';
import { AddIndustryKpiModal } from './AddIndustryKpiModal';
import { Plus, RotateCcw } from 'lucide-react';
import { Button } from '../../../../../components/shared/ui/Button';

interface IndustryKpiGridProps {
    tree: IndustryTreeNode[] | undefined | null;
    headers: string[];
    isRealtime: boolean;
}

export const IndustryKpiGrid: React.FC<IndustryKpiGridProps> = ({
    tree,
    headers,
    isRealtime,
}) => {
    const [cards, setCards] = useIndexedDBState<IndustryKpiCardConfig[]>(
        'global-industry-kpi-cards-v1',
        DEFAULT_INDUSTRY_KPI_CARDS
    );

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    // Thu thập danh sách ngành và nhóm hàng có sẵn từ tree
    const { industries, subIndustries } = useMemo(() => {
        return getAllAvailableIndustryItems(tree);
    }, [tree]);

    // Trích xuất số liệu cho từng thẻ
    const metricList = useMemo((): IndustryKpiMetricData[] => {
        const activeCards = cards && cards.length > 0 ? cards : DEFAULT_INDUSTRY_KPI_CARDS;
        return activeCards.map((cardConfig) =>
            extractKpiMetric(cardConfig, tree, headers, isRealtime)
        );
    }, [cards, tree, headers, isRealtime]);

    const handleAddCard = useCallback((newCard: IndustryKpiCardConfig) => {
        setCards((prev) => {
            const list = prev || DEFAULT_INDUSTRY_KPI_CARDS;
            const exists = list.some(
                (c) => c.title.toLowerCase() === newCard.title.toLowerCase() || c.id === newCard.id
            );
            if (exists) return list;
            return [...list, newCard];
        });
    }, [setCards]);

    const handleRemoveCard = useCallback((idToRemove: string) => {
        setCards((prev) => {
            const list = prev || DEFAULT_INDUSTRY_KPI_CARDS;
            return list.filter((c) => c.id !== idToRemove);
        });
    }, [setCards]);

    const handleResetDefault = useCallback(() => {
        setCards(DEFAULT_INDUSTRY_KPI_CARDS);
    }, [setCards]);

    if (!tree || tree.length === 0) {
        return null;
    }

    return (
        <div className="mb-4 bg-slate-50/70 dark:bg-slate-900/40 p-2.5 sm:p-3 border border-slate-200/80 dark:border-slate-800">
            {/* Header bar of KPI Section */}
            <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-slate-200/70 dark:border-slate-800">
                <div className="flex items-center gap-2">
                    <span className="text-[11px] sm:text-[12px] font-black uppercase text-slate-700 dark:text-slate-200 tracking-wider">
                        CHỈ SỐ KPI NGÀNH HÀNG
                    </span>
                    <span className="text-[11px] font-bold px-1.5 py-0.2 rounded-xs bg-sky-100 dark:bg-sky-950/70 text-sky-700 dark:text-sky-300 border border-sky-300/40">
                        {metricList.length} thẻ
                    </span>
                </div>

                <div className="flex items-center gap-1.5">
                    <Button
                        type="button"
                        variant="unstyled"
                        size="none"
                        onClick={handleResetDefault}
                        className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                        title="Khôi phục 12 thẻ mặc định"
                    >
                        <RotateCcw className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                        type="button"
                        variant="unstyled"
                        size="none"
                        onClick={() => setIsAddModalOpen(true)}
                        className="inline-flex items-center gap-1 px-2 py-0.8 text-[11px] font-bold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/50 border border-sky-300/60 dark:border-sky-800/60 hover:bg-sky-100 dark:hover:bg-sky-900/60 transition-colors cursor-pointer"
                        title="Tạo / Thêm thẻ KPI"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Thêm thẻ KPI</span>
                    </Button>
                </div>
            </div>

            {/* 6-Column Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-2.5">
                {metricList.map((metric) => (
                    <IndustryKpiCard
                        key={metric.id}
                        metric={metric}
                        isRealtime={isRealtime}
                        onRemove={handleRemoveCard}
                    />
                ))}

                {/* Quick Add Card Slot */}
                <button
                    type="button"
                    onClick={() => setIsAddModalOpen(true)}
                    className="flex flex-col items-center justify-center min-h-[72px] sm:min-h-[82px] border-2 border-dashed border-slate-300/80 dark:border-slate-700/80 hover:border-sky-500 dark:hover:border-sky-500 bg-white/40 dark:bg-slate-900/30 hover:bg-sky-50/50 dark:hover:bg-sky-950/20 text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 transition-all p-2 group cursor-pointer"
                    title="Bấm để tạo thêm thẻ KPI"
                >
                    <Plus className="w-4 h-4 mb-0.5 group-hover:scale-110 transition-transform" />
                    <span className="text-[10.5px] font-bold uppercase tracking-tight">Thêm thẻ</span>
                </button>
            </div>

            {/* Add Card Modal */}
            <AddIndustryKpiModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onAddCard={handleAddCard}
                onRemoveCard={handleRemoveCard}
                currentCards={cards || DEFAULT_INDUSTRY_KPI_CARDS}
                availableIndustries={industries}
                availableSubIndustries={subIndustries}
                onResetDefault={handleResetDefault}
            />
        </div>
    );
};
