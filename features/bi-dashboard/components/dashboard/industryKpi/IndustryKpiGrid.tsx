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
        <div className="industry-kpi-container mb-3 bg-white/80 dark:bg-slate-900/40 backdrop-blur-xs p-1.5 sm:p-3 rounded-card border border-slate-200/90 dark:border-slate-800 shadow-2xs">
            {/* Header bar of KPI Section */}
            <div className="industry-kpi-header flex items-center justify-between gap-1 sm:gap-1.5 mb-2 pb-2 border-b border-slate-100 dark:border-slate-800 flex-wrap hide-on-export no-print">
                <div className="flex items-center gap-1 sm:gap-1.5">
                    <span className="text-[11px] sm:text-[12px] font-extrabold uppercase text-slate-700 dark:text-slate-300 tracking-wider">
                        CHỈ SỐ KPI NGÀNH HÀNG
                    </span>
                    <span className="text-[11px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200/80 dark:border-sky-800/60">
                        {metricList.length} thẻ
                    </span>
                </div>

                <div className="flex items-center gap-1 sm:gap-1.5 hide-on-export no-print">
                    {/* Nút chuyển đổi dạng viên thuốc (1 nút toggle) Số lượng / Doanh thu */}
                    <Button
                        type="button"
                        variant="unstyled"
                        size="none"
                        onClick={() => setFocusMetric(prev => prev === 'revenue' ? 'quantity' : 'revenue')}
                        className={`ycx-hit h-6.5 sm:h-7 px-2.5 sm:px-3 rounded-full inline-flex items-center gap-1 sm:gap-1.5 text-xs font-bold transition-all cursor-pointer select-none active:scale-95 shadow-2xs border ${
                            focusMetric === 'revenue'
                                ? 'bg-sky-50 dark:bg-sky-950/60 border-sky-200 dark:border-sky-800/80 text-sky-700 dark:text-sky-300 hover:bg-sky-100/80 dark:hover:bg-sky-900/60'
                                : 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800/80 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100/80 dark:hover:bg-emerald-900/60'
                        }`}
                        title={focusMetric === 'revenue' ? 'Đang ưu tiên Doanh thu QĐ (Bấm để đổi sang Số lượng)' : 'Đang ưu tiên Số lượng (Bấm để đổi sang Doanh thu QĐ)'}
                        aria-label={focusMetric === 'revenue' ? 'Đang ưu tiên Doanh thu QĐ. Bấm để đổi sang Số lượng.' : 'Đang ưu tiên Số lượng. Bấm để đổi sang Doanh thu QĐ.'}
                    >
                        <AppIcon name={focusMetric === 'revenue' ? 'money' : 'product'} size="sm" className="scale-90" />
                        <span>{focusMetric === 'revenue' ? 'Doanh thu' : 'Số lượng'}</span>
                    </Button>

                    <Button
                        type="button"
                        variant="unstyled"
                        size="none"
                        onClick={handleResetDefault}
                        className="ycx-hit h-7 w-7 sm:h-8 sm:w-8 rounded-control flex items-center justify-center text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors active:scale-95"
                        title="Khôi phục 12 thẻ mặc định"
                        aria-label="Khôi phục 12 thẻ mặc định"
                    >
                        <AppIcon name="reset" size="sm" />
                    </Button>
                    <Button
                        type="button"
                        variant="unstyled"
                        size="none"
                        onClick={() => setIsAddModalOpen(true)}
                        className="ycx-hit h-7 w-7 sm:h-8 sm:w-8 rounded-control flex items-center justify-center text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer active:scale-95"
                        title="Tạo / Thêm thẻ KPI"
                        aria-label="Tạo / Thêm thẻ KPI"
                    >
                        <AppIcon name="add" size="sm" />
                    </Button>
                </div>
            </div>

            {/* 4-Column Grid on Mobile, 6-Column on Desktop */}
            <div className="industry-kpi-grid grid grid-cols-4 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-1 sm:gap-2">
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
