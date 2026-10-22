import React, { useState, useMemo, useRef } from 'react';
import { Modal } from '../../../components/shared/ui/Modal';
import { Button } from '../../../components/shared/ui/Button';
import { AppIcon } from '../../../components/shared/ui/icon/AppIcon';
import { exportElementAsImage } from '../../../components/shared/export';
import { toast } from '../../../components/shared/ui/toast';
import { CHECK_THUONG_COLS, parseNumber, formatCurrency, formatPercent, formatNumber } from '../services/checkThuongCalc';

interface CheckThuongRankingModalProps {
    categoryName: string;
    channel: string;
    currentStoreFullName: string;
    competitionData: any[][];
    onClose: () => void;
}

type RankingSortCol = 'store' | 'percent' | 'du_kien_vuot' | 'rank_v' | 'rank_t' | 'bonus';

export const CheckThuongRankingModal: React.FC<CheckThuongRankingModalProps> = ({
    categoryName,
    channel,
    currentStoreFullName,
    competitionData,
    onClose
}) => {
    const printRef = useRef<HTMLDivElement>(null);
    const [isExporting, setIsExporting] = useState(false);
    const [sortCol, setSortCol] = useState<RankingSortCol>('bonus');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

    const handleExport = async () => {
        if (!printRef.current) return;
        try {
            setIsExporting(true);
            const safeCategory = categoryName.replace(/[\\/:*?"<>|]/g, '').trim().replace(/\s+/g, '_');
            const safeChannel = (channel || 'ALL').replace(/[\\/:*?"<>|]/g, '').trim();
            const fileName = `Bang_Xep_Hang_${safeCategory}_${safeChannel}.png`;
            await exportElementAsImage(printRef.current, fileName, {
                progressTitle: `Xuất ảnh BXH ${categoryName}`,
                elementsToHide: ['.no-print', '.hide-on-export'],
                isCompactTable: true,
                fitAllColumns: true,
                fitWidthToTable: true,
                onCloneReady: (clone) => {
                    const expHeader = clone.querySelector('.export-header');
                    if (expHeader instanceof HTMLElement) {
                        expHeader.style.setProperty('display', 'block', 'important');
                    }
                    clone.style.setProperty('padding', '14px', 'important');
                    clone.style.setProperty('background', '#ffffff', 'important');
                    clone.style.setProperty('border-radius', '12px', 'important');
                }
            });
        } catch (error) {
            console.error('Lỗi xuất ảnh bảng xếp hạng:', error);
            toast.error('Có lỗi xảy ra khi xuất ảnh bảng xếp hạng');
        } finally {
            setIsExporting(false);
        }
    };

    const filteredRows = useMemo(() => {
        if (!categoryName) return [];
        const cleanName = categoryName.trim().toUpperCase();
        const cleanChannel = channel ? channel.trim().toUpperCase() : '';

        let matched = competitionData.filter(row => {
            const rName = String(row[CHECK_THUONG_COLS.NGANH_HANG] || '').trim().toUpperCase();
            const rChan = String(row[CHECK_THUONG_COLS.KENH] || '').trim().toUpperCase();
            if (cleanChannel) {
                return rName === cleanName && rChan === cleanChannel;
            }
            return rName === cleanName;
        });

        if (matched.length === 0) {
            matched = competitionData.filter(row =>
                String(row[CHECK_THUONG_COLS.NGANH_HANG] || '').trim().toUpperCase() === cleanName
            );
        }

        return matched;
    }, [categoryName, channel, competitionData]);

    const sortedRows = useMemo(() => {
        const rows = [...filteredRows];
        rows.sort((a, b) => {
            let valA: number | string = 0;
            let valB: number | string = 0;

            switch (sortCol) {
                case 'store':
                    valA = String(a[CHECK_THUONG_COLS.SIEU_THI] || '');
                    valB = String(b[CHECK_THUONG_COLS.SIEU_THI] || '');
                    return sortDir === 'asc' ? valA.localeCompare(String(valB)) : String(valB).localeCompare(valA);
                case 'percent':
                    valA = parseNumber(a[CHECK_THUONG_COLS.PERCENT_DU_KIEN]);
                    valB = parseNumber(b[CHECK_THUONG_COLS.PERCENT_DU_KIEN]);
                    break;
                case 'du_kien_vuot':
                    valA = parseNumber(a[CHECK_THUONG_COLS.DU_KIEN_VUOT]);
                    valB = parseNumber(b[CHECK_THUONG_COLS.DU_KIEN_VUOT]);
                    break;
                case 'rank_v':
                    valA = parseInt(String(a[CHECK_THUONG_COLS.HANG_VUOT_UU] || '9999'), 10) || 9999;
                    valB = parseInt(String(b[CHECK_THUONG_COLS.HANG_VUOT_UU] || '9999'), 10) || 9999;
                    break;
                case 'rank_t':
                    valA = parseInt(String(a[CHECK_THUONG_COLS.HANG_PERCENT_TARGET] || '9999'), 10) || 9999;
                    valB = parseInt(String(b[CHECK_THUONG_COLS.HANG_PERCENT_TARGET] || '9999'), 10) || 9999;
                    break;
                case 'bonus':
                default:
                    valA = parseNumber(a[CHECK_THUONG_COLS.TONG_THUONG]);
                    valB = parseNumber(b[CHECK_THUONG_COLS.TONG_THUONG]);
                    break;
            }

            if (valA < valB) return sortDir === 'asc' ? -1 : 1;
            if (valA > valB) return sortDir === 'asc' ? 1 : -1;
            return 0;
        });
        return rows;
    }, [filteredRows, sortCol, sortDir]);

    const handleSort = (col: RankingSortCol) => {
        if (sortCol === col) {
            setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortCol(col);
            setSortDir(col === 'rank_v' || col === 'rank_t' ? 'asc' : 'desc');
        }
    };

    return (
        <Modal
            isOpen={true}
            onClose={onClose}
            maxWidth="xl"
            title={`Bảng Xếp Hạng: ${categoryName} ${channel ? `(${channel})` : ''}`}
            subTitle={`Toàn bộ siêu thị tham gia môn thi (${sortedRows.length} siêu thị)`}
            titleColorClass="text-sky-600 dark:text-sky-400 uppercase tracking-tight"
            headerActions={
                <Button
                    variant="ghost"
                    size="icon"
                    type="button"
                    onClick={handleExport}
                    disabled={isExporting}
                    title="Xuất ảnh bảng xếp hạng"
                    aria-label="Xuất ảnh bảng xếp hạng"
                    className="ycx-hit lg:w-9 lg:h-9 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                >
                    {isExporting ? (
                        <AppIcon name="loading" size="md" spin />
                    ) : (
                        <AppIcon name="exportImage" size="md" />
                    )}
                </Button>
            }
            footer={
                <div className="flex justify-end w-full">
                    <Button variant="secondary" size="sm" type="button" onClick={onClose}>
                        Đóng
                    </Button>
                </div>
            }
        >
            <div ref={printRef} className="space-y-2.5">
                {/* Header khi xuất ảnh */}
                <div className="hidden export-header pb-2 border-b border-slate-200 dark:border-slate-700">
                    <h3 className="text-sm sm:text-base font-black text-sky-600 dark:text-sky-400 uppercase tracking-tight">
                        {`BẢNG XẾP HẠNG: ${categoryName} ${channel ? `(${channel})` : ''}`}
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium">
                        {`Toàn bộ siêu thị tham gia môn thi (${sortedRows.length} siêu thị)`}
                    </p>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left border-collapse tabular-nums">
                        <thead>
                            <tr className="bg-slate-100 dark:bg-slate-800 text-[11px] uppercase tracking-wider text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700 select-none">
                                <th onClick={() => handleSort('store')} className="px-3 py-2 text-left cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700">
                                    Siêu Thị {sortCol === 'store' && (sortDir === 'asc' ? '▲' : '▼')}
                                </th>
                                <th onClick={() => handleSort('percent')} className="px-2 py-2 text-center cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 w-20">
                                    %DKHT {sortCol === 'percent' && (sortDir === 'asc' ? '▲' : '▼')}
                                </th>
                                <th onClick={() => handleSort('du_kien_vuot')} className="px-2 py-2 text-center cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 w-24">
                                    D.K Vượt {sortCol === 'du_kien_vuot' && (sortDir === 'asc' ? '▲' : '▼')}
                                </th>
                                <th onClick={() => handleSort('rank_v')} className="px-2 py-2 text-center cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 w-20">
                                    Hạng VT {sortCol === 'rank_v' && (sortDir === 'asc' ? '▲' : '▼')}
                                </th>
                                <th onClick={() => handleSort('rank_t')} className="px-2 py-2 text-center cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 w-20">
                                    Hạng % {sortCol === 'rank_t' && (sortDir === 'asc' ? '▲' : '▼')}
                                </th>
                                <th onClick={() => handleSort('bonus')} className="px-3 py-2 text-right cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 w-28">
                                    Thưởng {sortCol === 'bonus' && (sortDir === 'asc' ? '▲' : '▼')}
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {sortedRows.map((row, idx) => {
                                const storeFullName = String(row[CHECK_THUONG_COLS.SIEU_THI] || '');
                                const isCurrent = currentStoreFullName && storeFullName.toLowerCase() === currentStoreFullName.toLowerCase();
                                const bonus = parseNumber(row[CHECK_THUONG_COLS.TONG_THUONG]);

                                return (
                                    <tr
                                        key={idx}
                                        className={
                                            isCurrent
                                                ? 'bg-sky-100 dark:bg-sky-950/60 font-black text-sky-900 dark:text-sky-200 border-l-4 border-sky-500'
                                                : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300'
                                        }
                                    >
                                        <td className="px-3 py-1.5 font-medium whitespace-nowrap">
                                            <div className="flex items-center gap-1.5">
                                                <span className="w-5 text-slate-400 dark:text-slate-500 text-[11px] shrink-0">
                                                    #{idx + 1}
                                                </span>
                                                <span className="truncate max-w-[200px] sm:max-w-xs" title={storeFullName}>
                                                    {storeFullName}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-2 py-1.5 text-center font-bold">
                                            {formatPercent(row[CHECK_THUONG_COLS.PERCENT_DU_KIEN])}
                                        </td>
                                        <td className="px-2 py-1.5 text-center font-medium">
                                            {formatNumber(row[CHECK_THUONG_COLS.DU_KIEN_VUOT])}
                                        </td>
                                        <td className="px-2 py-1.5 text-center">
                                            {row[CHECK_THUONG_COLS.HANG_VUOT_UU] || '-'}
                                        </td>
                                        <td className="px-2 py-1.5 text-center">
                                            {row[CHECK_THUONG_COLS.HANG_PERCENT_TARGET] || '-'}
                                        </td>
                                        <td className="px-3 py-1.5 text-right font-black">
                                            {bonus > 0 ? (
                                                <span className="text-emerald-600 dark:text-emerald-400">
                                                    {formatCurrency(bonus)}
                                                </span>
                                            ) : (
                                                <span className="text-slate-300 dark:text-slate-600">0</span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </Modal>
    );
};
