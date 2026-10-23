import React, { useState, useMemo, useRef } from 'react';
import { CheckThuongEmptyDropzone } from './CheckThuongEmptyDropzone';
import { CheckThuongHeroBanner } from './CheckThuongHeroBanner';
import { CheckThuongStatusSummary } from './CheckThuongStatusSummary';
import { CheckThuongCategoryTable } from './CheckThuongCategoryTable';
import { CheckThuongCategoryCards } from './CheckThuongCategoryCards';
import { CheckThuongAnalysisCard } from './CheckThuongAnalysisCard';
import { CheckThuongComparisonView } from './CheckThuongComparisonView';
import { CheckThuongRankingModal } from './CheckThuongRankingModal';
import {
    filterStoreData,
    preProcessCompetitionData,
    getGroupDefinitions,
    analyzeStoreData
} from '../services/checkThuongSearch';
import {
    CHECK_THUONG_COLS,
    parseNumber,
    extractStoreCodeAndName
} from '../services/checkThuongCalc';
import { CheckThuongViewMode } from '../types';
import { exportElementAsImage } from '../../../components/shared/export';
import { AppIcon } from '../../../components/shared/ui/icon/AppIcon';
import { Button } from '../../../components/shared/ui/Button';

interface CheckThuongSearchViewProps {
    competitionData: any[][];
    code1: string;
    code2: string;
    formattedUploadTime: string;
    onFileLoaded: (result: {
        competitionData: any[][];
        fileName: string;
        uploadTime: string;
        lastModified: number;
    }) => void;
    onManualCloudSync?: () => void;
    isSyncingCloud?: boolean;
}

export const CheckThuongSearchView: React.FC<CheckThuongSearchViewProps> = ({
    competitionData,
    code1,
    code2,
    formattedUploadTime,
    onFileLoaded,
    onManualCloudSync,
    isSyncingCloud = false
}) => {
    const [viewMode, setViewMode] = useState<CheckThuongViewMode>('list');
    const [activeFilter, setActiveFilter] = useState<string>('all');
    const [selectedCategoryName, setSelectedCategoryName] = useState<string | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<{ name: string; channel: string } | null>(null);

    const bannerRef = useRef<HTMLDivElement>(null);
    const overviewExportRef = useRef<HTMLDivElement>(null);
    const mainViewRef = useRef<HTMLDivElement>(null);
    const analysisRef = useRef<HTMLDivElement>(null);
    const comparisonRef = useRef<HTMLDivElement>(null);

    // Preprocess the raw dataset once per dataset change
    const preprocessed = useMemo(() => {
        return preProcessCompetitionData(competitionData);
    }, [competitionData]);

    // Data for Store 1 & Store 2
    const store1Data = useMemo(() => {
        return filterStoreData(competitionData, code1);
    }, [competitionData, code1]);

    const store2Data = useMemo(() => {
        return code2 ? filterStoreData(competitionData, code2) : [];
    }, [competitionData, code2]);

    // If no competition data loaded, render empty dropzone
    if (!competitionData || competitionData.length === 0) {
        return (
            <CheckThuongEmptyDropzone
                onFileLoaded={onFileLoaded}
                onManualCloudSync={onManualCloudSync}
                isSyncingCloud={isSyncingCloud}
            />
        );
    }

    // Comparison View (When both code1 and code2 exist)
    if (code1 && code2) {
        if (store1Data.length === 0 || store2Data.length === 0) {
            let errorMsg = '';
            if (store1Data.length === 0) errorMsg += `Không tìm thấy dữ liệu cho kho "${code1}". `;
            if (store2Data.length === 0) errorMsg += `Không tìm thấy dữ liệu cho kho "${code2}".`;

            return (
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                    <p className="text-slate-600 dark:text-slate-300 font-bold text-sm sm:text-base mb-2">
                        {errorMsg}
                    </p>
                    <p className="text-xs text-slate-400">
                        Vui lòng kiểm tra lại mã số kho hoặc xoá mã kho 2 để quay lại tra cứu đơn.
                    </p>
                </div>
            );
        }

        return (
            <div className="w-full p-3 sm:p-5 max-w-5xl mx-auto">
                <CheckThuongComparisonView
                    store1Data={store1Data}
                    store2Data={store2Data}
                    code1={code1}
                    code2={code2}
                    preprocessed={preprocessed}
                    containerRef={comparisonRef}
                    onExportComparison={() => {
                        if (comparisonRef.current) {
                            exportElementAsImage(comparisonRef.current, `So_Sanh_${code1}_vs_${code2}.png`, {
                                progressTitle: 'Xuất ảnh so sánh 2 siêu thị'
                            });
                        }
                    }}
                />
            </div>
        );
    }

    // Single Store View (code1)
    if (store1Data.length === 0) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                <p className="text-slate-600 dark:text-slate-300 font-bold text-sm sm:text-base mb-2">
                    Không tìm thấy dữ liệu cho mã kho "{code1}".
                </p>
                <p className="text-xs text-slate-400">
                    Vui lòng kiểm tra lại mã số kho hoặc nạp file dữ liệu mới.
                </p>
            </div>
        );
    }

    const storeFullName = String(store1Data[0][CHECK_THUONG_COLS.SIEU_THI] || '');
    const storeName = extractStoreCodeAndName(storeFullName).storeName;
    const totalBonus = store1Data.reduce((sum, r) => sum + parseNumber(r[CHECK_THUONG_COLS.TONG_THUONG]), 0);
    const totalCategories = store1Data.length;
    const countAchieved100 = store1Data.filter(r => parseNumber(r[CHECK_THUONG_COLS.PERCENT_DU_KIEN]) >= 1).length;

    const groupDefs = getGroupDefinitions(store1Data, preprocessed);
    const analysis = analyzeStoreData(store1Data, preprocessed);

    let baseGroups = activeFilter === 'all'
        ? groupDefs
        : groupDefs.filter(g => g.key === activeFilter);

    if (selectedCategoryName) {
        const cleanTarget = selectedCategoryName.trim().toUpperCase();
        baseGroups = baseGroups
            .map(g => ({
                ...g,
                data: g.data.filter(row => {
                    const cat = String(row[CHECK_THUONG_COLS.NGANH_HANG] || '').trim().toUpperCase();
                    return cat === cleanTarget;
                })
            }))
            .filter(g => g.data.length > 0);
    }
    const filteredGroups = baseGroups;

    const handleSelectCategoryFromAnalysis = (categoryName: string, channel: string) => {
        // 1. Đưa bộ lọc thẻ KPI về trạng thái mặc định ('all') ngay lập tức (không còn kẹt ở < 100%)
        setActiveFilter('all');

        // 2. Nếu đang lọc chính môn này rồi -> Bấm lại để huỷ lọc, đưa về trạng thái mặc định
        if (selectedCategoryName && selectedCategoryName.trim().toUpperCase() === categoryName.trim().toUpperCase()) {
            setSelectedCategoryName(null);
            return;
        }

        // 3. Đặt môn thi cần lọc
        setSelectedCategoryName(categoryName);

        // 4. Tự động cuộn mượt xuống bảng danh sách ngành hàng để người dùng nhìn thấy ngay
        setTimeout(() => {
            const container = document.getElementById('check-thuong-categories-view');
            if (container) {
                container.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 50);
    };

    const handleExportOverview = () => {
        const el = overviewExportRef.current || bannerRef.current;
        if (el) {
            exportElementAsImage(el, `Tong_Hop_Thuong_${code1}.png`, {
                progressTitle: 'Xuất ảnh tổng hợp thưởng',
                forcedWidth: 480,
                preset: 'raw',
                backgroundColor: '#f8fafc',
                onCloneReady: (clone) => {
                    // Đảm bảo lưới 6 thẻ KPI hiển thị 3 cột x 2 hàng gọn gàng xem trên mobile
                    const kpiGrid = clone.querySelector('.check-thuong-kpi-grid');
                    if (kpiGrid instanceof HTMLElement) {
                        kpiGrid.style.setProperty('display', 'grid', 'important');
                        kpiGrid.style.setProperty('grid-template-columns', 'repeat(3, minmax(0, 1fr))', 'important');
                        kpiGrid.style.setProperty('gap', '8px', 'important');
                    }
                    // Bọc padding 12px xung quanh để các thẻ card giữ trọn bo góc và viền nổi bật
                    clone.style.setProperty('padding', '12px', 'important');
                    clone.style.setProperty('background', '#f8fafc', 'important');
                }
            });
        }
    };

    return (
        <div ref={mainViewRef} className="w-full p-2.5 sm:p-5 max-w-5xl mx-auto space-y-3 sm:space-y-4">
            {/* Vùng đóng khung đỏ xuất ảnh di động (Hero Banner + 6 Thẻ KPI + Phân Tích & Đề Xuất) */}
            <div ref={overviewExportRef} className="space-y-3 sm:space-y-4">
                {/* Hero Banner */}
                <CheckThuongHeroBanner
                    storeName={storeName}
                    formattedUploadTime={formattedUploadTime}
                    totalBonus={totalBonus}
                    countAchieved100={countAchieved100}
                    totalCategories={totalCategories}
                    bannerRef={bannerRef}
                    onExportBanner={handleExportOverview}
                />

                {/* Status Summary & Filter Tools */}
                <CheckThuongStatusSummary
                    groups={groupDefs}
                    totalCount={totalCategories}
                    activeFilter={activeFilter}
                    onSelectFilter={(filterKey) => {
                        setSelectedCategoryName(null); // Bỏ lọc theo môn lẻ khi bấm thẻ trạng thái
                        setActiveFilter(filterKey);
                    }}
                    viewMode={viewMode}
                    onToggleViewMode={() => setViewMode(prev => prev === 'list' ? 'card' : 'list')}
                    onExportFiltered={() => {
                        if (mainViewRef.current) {
                            exportElementAsImage(mainViewRef.current, `Bao_Cao_Thuong_${code1}_${activeFilter}.png`, {
                                progressTitle: 'Xuất ảnh bảng thưởng'
                            });
                        }
                    }}
                >
                    {/* Analysis & Recommendations Card (Đặt ngay dưới các thẻ KPI) */}
                    <CheckThuongAnalysisCard
                        analysis={analysis}
                        totalBonus={totalBonus}
                        cardRef={analysisRef}
                        selectedCategoryName={selectedCategoryName}
                        onSelectCategory={handleSelectCategoryFromAnalysis}
                        onExportAnalysis={handleExportOverview}
                    />
                </CheckThuongStatusSummary>
            </div>

            {/* Banner hiển thị khi đang lọc theo môn thi từ Phân Tích & Đề Xuất */}
            {selectedCategoryName && (
                <div className="flex items-center justify-between p-2.5 px-3.5 rounded-control bg-sky-50/90 dark:bg-sky-950/50 border border-sky-200/80 dark:border-sky-800 text-xs shadow-2xs">
                    <div className="flex items-center gap-2 text-sky-800 dark:text-sky-200 font-medium">
                        <AppIcon name="filter" size="xs" className="text-sky-600 dark:text-sky-400" />
                        <span>
                            Đang lọc theo môn thi:{' '}
                            <strong className="font-bold text-sky-900 dark:text-sky-100">{selectedCategoryName}</strong>
                        </span>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        type="button"
                        onClick={() => {
                            setSelectedCategoryName(null);
                            setActiveFilter('all');
                        }}
                        className="text-xs text-sky-700 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-900/60 font-semibold gap-1 h-7 px-2.5 rounded-control"
                    >
                        <AppIcon name="close" size="xs" />
                        <span>Đưa về mặc định</span>
                    </Button>
                </div>
            )}

            {/* Category Groups View (List or Cards) */}
            <div id="check-thuong-categories-view">
                {viewMode === 'list' ? (
                    <CheckThuongCategoryTable
                        groups={filteredGroups}
                        preprocessed={preprocessed}
                        onSelectCategory={(name, channel) => setSelectedCategory({ name, channel })}
                        onExportGroup={(groupKey) => {
                            const el = document.getElementById(`group-section-${groupKey}`);
                            if (el) {
                                exportElementAsImage(el, `Nhom_${groupKey}_${code1}.png`, {
                                    progressTitle: `Xuất ảnh nhóm ${groupKey}`
                                });
                            }
                        }}
                    />
                ) : (
                    <CheckThuongCategoryCards
                        groups={filteredGroups}
                        preprocessed={preprocessed}
                        onSelectCategory={(name, channel) => setSelectedCategory({ name, channel })}
                        onExportGroup={(groupKey) => {
                            const el = document.getElementById(`group-section-${groupKey}`);
                            if (el) {
                                exportElementAsImage(el, `Nhom_${groupKey}_${code1}.png`, {
                                    progressTitle: `Xuất ảnh nhóm ${groupKey}`
                                });
                            }
                        }}
                    />
                )}
            </div>

            {/* Ranking Modal */}
            {selectedCategory && (
                <CheckThuongRankingModal
                    categoryName={selectedCategory.name}
                    channel={selectedCategory.channel}
                    currentStoreFullName={storeFullName}
                    competitionData={competitionData}
                    onClose={() => {
                        setSelectedCategory(null);
                        // Đóng modal đưa về trạng thái mặc định
                        setSelectedCategoryName(null);
                        setActiveFilter('all');
                    }}
                />
            )}
        </div>
    );
};
