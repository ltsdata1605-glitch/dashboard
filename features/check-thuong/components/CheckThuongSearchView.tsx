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
    const [selectedCategory, setSelectedCategory] = useState<{ name: string; channel: string } | null>(null);

    const bannerRef = useRef<HTMLDivElement>(null);
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
            <div className="flex-1 overflow-y-auto p-3 sm:p-5 max-w-5xl mx-auto w-full">
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

    const filteredGroups = activeFilter === 'all'
        ? groupDefs
        : groupDefs.filter(g => g.key === activeFilter);

    return (
        <div ref={mainViewRef} className="flex-1 overflow-y-auto p-3 sm:p-5 max-w-5xl mx-auto w-full space-y-4">
            {/* Hero Banner */}
            <CheckThuongHeroBanner
                storeName={storeName}
                formattedUploadTime={formattedUploadTime}
                totalBonus={totalBonus}
                countAchieved100={countAchieved100}
                totalCategories={totalCategories}
                bannerRef={bannerRef}
                onExportBanner={() => {
                    if (bannerRef.current) {
                        exportElementAsImage(bannerRef.current, `Tong_Hop_Thuong_${code1}.png`, {
                            progressTitle: 'Xuất ảnh tổng hợp'
                        });
                    }
                }}
            />

            {/* Status Summary & Filter Tools */}
            <CheckThuongStatusSummary
                groups={groupDefs}
                totalCount={totalCategories}
                activeFilter={activeFilter}
                onSelectFilter={setActiveFilter}
                viewMode={viewMode}
                onToggleViewMode={() => setViewMode(prev => prev === 'list' ? 'card' : 'list')}
                onExportFiltered={() => {
                    if (mainViewRef.current) {
                        exportElementAsImage(mainViewRef.current, `Bao_Cao_Thuong_${code1}_${activeFilter}.png`, {
                            progressTitle: 'Xuất ảnh bảng thưởng'
                        });
                    }
                }}
            />

            {/* Category Groups View (List or Cards) */}
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

            {/* Analysis & Recommendations Card */}
            <CheckThuongAnalysisCard
                analysis={analysis}
                totalBonus={totalBonus}
                cardRef={analysisRef}
                onSelectCategory={(name, channel) => setSelectedCategory({ name, channel })}
                onExportAnalysis={() => {
                    if (analysisRef.current) {
                        exportElementAsImage(analysisRef.current, `Phan_Tich_Thuong_${code1}.png`, {
                            progressTitle: 'Xuất ảnh phân tích đề xuất'
                        });
                    }
                }}
            />

            {/* Ranking Modal */}
            {selectedCategory && (
                <CheckThuongRankingModal
                    categoryName={selectedCategory.name}
                    channel={selectedCategory.channel}
                    currentStoreFullName={storeFullName}
                    competitionData={competitionData}
                    onClose={() => setSelectedCategory(null)}
                />
            )}
        </div>
    );
};
