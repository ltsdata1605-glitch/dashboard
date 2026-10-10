import React, { useState, useMemo, useCallback } from 'react';
import { AppIcon } from '../../../../../components/shared/ui/icon/AppIcon';
import {
    IndustryKpiCardConfig,
    IndustryKpiMetricData,
    DEFAULT_INDUSTRY_KPI_CARDS,
    extractKpiMetric,
    getAllAvailableIndustryItems,
} from '../../../services/industryKpiCalc';
import { IndustryTreeNode } from '../../../utils/dashboardHelpers';
import { useIndexedDBState } from '../../../hooks/useIndexedDBState';
import { IndustryKpiCard, IndustryKpiFocusMetric } from './IndustryKpiCard';
import { AddIndustryKpiModal } from './AddIndustryKpiModal';
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

    const [focusMetric, setFocusMetric] = useIndexedDBState<IndustryKpiFocusMetric>(
        'global-industry-kpi-focus-metric-v1',
        'revenue'
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

    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

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

    // Kéo thả sắp xếp thẻ
    const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
        setDraggedIndex(index);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', index.toString());
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    }, []);

    const handleDragEnter = useCallback((e: React.DragEvent, index: number) => {
        e.preventDefault();
        if (draggedIndex !== null && draggedIndex !== index) {
            setDragOverIndex(index);
        }
    }, [draggedIndex]);

    const handleDragLeave = useCallback((e: React.DragEvent, index: number) => {
        if (dragOverIndex === index) {
            setDragOverIndex(null);
        }
    }, [dragOverIndex]);

    const handleDrop = useCallback((e: React.DragEvent, dropIndex: number) => {
        e.preventDefault();
        if (draggedIndex === null || draggedIndex === dropIndex) {
            setDraggedIndex(null);
            setDragOverIndex(null);
            return;
        }

        const activeList = cards && cards.length > 0 ? cards : DEFAULT_INDUSTRY_KPI_CARDS;
        const newList = [...activeList];
        const [draggedItem] = newList.splice(draggedIndex, 1);
        newList.splice(dropIndex, 0, draggedItem);

        setCards(newList);
        setDraggedIndex(null);
        setDragOverIndex(null);
    }, [cards, draggedIndex, setCards]);

    const handleDragEnd = useCallback(() => {
        setDraggedIndex(null);
        setDragOverIndex(null);
    }, []);

    if (!tree || tree.length === 0) {
        return null;
    }

    return (
        <div className="industry-kpi-container mb-3 bg-white/80 dark:bg-slate-900/40 backdrop-blur-xs p-2.5 sm:p-3 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs">
            {/* Header bar of KPI Section */}
            <div className="industry-kpi-header flex items-center justify-between gap-1.5 mb-2 pb-2 border-b border-slate-100 dark:border-slate-800 flex-wrap hide-on-export no-print">
                <div className="flex items-center gap-1.5">
                    <span className="text-[11px] sm:text-[11.5px] font-extrabold uppercase text-slate-700 dark:text-slate-300 tracking-wider">
                        CHỈ SỐ KPI NGÀNH HÀNG
                    </span>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200/80 dark:border-sky-800/60">
                        {metricList.length} thẻ
                    </span>
                </div>

                <div className="flex items-center gap-1 sm:gap-1.5 hide-on-export no-print">
                    {/* Nút chuyển đổi Số lượng / Doanh thu => Chọn tiêu chí nào thì số đó sẽ lớn hơn */}
                    <div className="inline-flex items-center h-7 p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 shadow-2xs">
                        <button
                            type="button"
                            onClick={() => setFocusMetric('revenue')}
                            className={`h-full px-2.5 text-[11px] sm:text-[11px] font-bold rounded-md flex items-center transition-all cursor-pointer ${
                                focusMetric === 'revenue'
                                    ? 'bg-white dark:bg-slate-700 text-sky-700 dark:text-sky-300 shadow-xs'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                            }`}
                            title="Ưu tiên hiển thị Doanh thu QĐ số lớn hơn"
                        >
                            Doanh thu
                        </button>
                        <button
                            type="button"
                            onClick={() => setFocusMetric('quantity')}
                            className={`h-full px-2.5 text-[11px] sm:text-[11px] font-bold rounded-md flex items-center transition-all cursor-pointer ${
                                focusMetric === 'quantity'
                                    ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-xs'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                            }`}
                            title="Ưu tiên hiển thị Số lượng số lớn hơn"
                        >
                            Số lượng
                        </button>
                    </div>

                    <Button
                        type="button"
                        variant="unstyled"
                        size="none"
                        onClick={handleResetDefault}
                        className="h-7 w-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all active:scale-95"
                        title="Khôi phục 12 thẻ mặc định"
                    >
                        <AppIcon name="reset" size="sm" />
                    </Button>
                    <Button
                        type="button"
                        variant="unstyled"
                        size="none"
                        onClick={() => setIsAddModalOpen(true)}
                        className="h-7 inline-flex items-center gap-1.5 px-3 rounded-lg text-[11px] sm:text-[11px] font-bold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-700 hover:bg-sky-100 dark:hover:bg-sky-900/60 transition-all cursor-pointer shadow-2xs active:scale-95"
                        title="Tạo / Thêm thẻ KPI"
                    >
                        <AppIcon name="add" size="sm" />
                        <span>Thêm thẻ KPI</span>
                    </Button>
                </div>
            </div>

            {/* 3-Column Grid on Mobile, 6-Column on Desktop */}
            <div className="industry-kpi-grid grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-1.5 sm:gap-2.5">
                {metricList.map((metric, index) => (
                    <IndustryKpiCard
                        key={metric.id}
                        metric={metric}
                        index={index}
                        isRealtime={isRealtime}
                        focusMetric={focusMetric}
                        isDragging={draggedIndex === index}
                        isDragOver={dragOverIndex === index}
                        onDragStart={(e) => handleDragStart(e, index)}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDragEnter={(e) => handleDragEnter(e, index)}
                        onDragLeave={(e) => handleDragLeave(e, index)}
                        onDrop={(e) => handleDrop(e, index)}
                        onDragEnd={handleDragEnd}
                        onRemove={handleRemoveCard}
                    />
                ))}
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
