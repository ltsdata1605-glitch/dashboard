import React, { useMemo } from 'react';
import { useDashboardContext } from '../../../contexts/DashboardContext';
import { formatQuantity, formatCurrency, getHeSoQuyDoi } from '../../../utils/dataUtils';
import { CrossSellingConfig } from '../../../types';

interface CrossSellingTableProps {
    tableContainerRef: React.RefObject<HTMLDivElement>;
}

export const CrossSellingTable: React.FC<CrossSellingTableProps> = ({ tableContainerRef }) => {
    const { baseFilteredData, crossSellingConfig, productConfig } = useDashboardContext();
    const config: CrossSellingConfig = crossSellingConfig || { columns: [], sections: [] };

    const stats = useMemo(() => {
        const result: Record<string, Record<string, number>> = {};
        
        // Trạng thái Data Column rỗng là cột lấy Data Của Dòng
        const dataCols = config.columns.filter(c => c.type === 'data');
        const ratioCols = config.columns.filter(c => c.type === 'ratio');
        
        config.sections.forEach(sec => {
            sec.rows.forEach(r => {
                result[r.id] = {};
                config.columns.forEach(c => {
                    result[r.id][c.id] = 0;
                });
            });
        });

        const colGlobalQty: Record<string, number> = {};
        dataCols.forEach(c => colGlobalQty[c.id] = 0);

        if (dataCols.length > 0) {
            baseFilteredData.forEach(row => {
                const qty = Number(row['Số Lượng']) || Number(row['Số lượng']) || Number(row['S.Lượng']) || 0;
                
                const NhomHang = row['Nhóm hàng'] || '';
                const NganhHang = row['Ngành hàng'] || '';
                const SanPham = row['Sản phẩm'] || '';
                const HangSX = row['Hãng'] || row['Hãng SX'] || '';
                const MaSP = String(row['Mã sản phẩm'] || row['Mã SP'] || '');

                // Tính toán nền tảng doanh thu
                let doanhThuQD = 0;
                if (qty > 0) {
                    const price = Number(row['Giá bán_1']) || Number(row['Giá bán']) || 0; 
                    const rowRevenue = price * qty;
                    const heso = productConfig ? getHeSoQuyDoi(NganhHang, NhomHang, productConfig, SanPham) : 1;
                    doanhThuQD = rowRevenue * heso;
                }

                // 1. Phân tích Cột Fixed Data (Mẫu số)
                dataCols.forEach(c => {
                    const hasFilter = c.subgroupsNhomCha?.length || c.subgroupsNhomCon?.length;
                    if (hasFilter) {
                        const cMatchNganh = c.subgroupsNhomCha?.length ? c.subgroupsNhomCha.includes(NganhHang) : false;
                        const cMatchNhom = c.subgroupsNhomCon?.length ? c.subgroupsNhomCon.includes(NhomHang) : false;
                        if (cMatchNganh || cMatchNhom) {
                            colGlobalQty[c.id] += (c.dataType === 'revenueQD' ? doanhThuQD : qty);
                        }
                    }
                });

                // 2. Phân tích Các Dòng (Data khai thác)
                config.sections.forEach(sec => {
                    sec.rows.forEach(r => {
                        const matchNganh = r.subgroupsNhomCha?.length ? r.subgroupsNhomCha.includes(NganhHang) : false;
                        const matchNhom = r.subgroupsNhomCon?.length ? r.subgroupsNhomCon.includes(NhomHang) : false;
                        const matchSX = r.manufacturers?.length ? r.manufacturers.includes(HangSX) : false;
                        
                        let matchKey = false;
                        if (r.keywords) {
                            const kws = r.keywords.split(',').map(k => k.trim().toLowerCase()).filter(k => k);
                            const lowerSP = SanPham.toLowerCase();
                            const lowerMaSP = MaSP.toLowerCase();
                            matchKey = kws.some(k => lowerMaSP.includes(k) || lowerSP.includes(k));
                        }

                        if (matchNganh || matchNhom || matchSX || matchKey) {
                            // Dòng này được matching, nạp vào các cột Data mà không có Filter (Đóng vai trò Cột Row Data)
                            dataCols.forEach(c => {
                                const hasFilter = c.subgroupsNhomCha?.length || c.subgroupsNhomCon?.length;
                                if (!hasFilter) {
                                    result[r.id][c.id] += (c.dataType === 'revenueQD' ? doanhThuQD : qty);
                                }
                            });
                        }
                    });
                });
            });

            // Đồng bộ Cột Fixed xuống từng Cell 
            dataCols.forEach(c => {
                const hasFilter = c.subgroupsNhomCha?.length || c.subgroupsNhomCon?.length;
                if (hasFilter) {
                    config.sections.forEach(sec => {
                        sec.rows.forEach(r => {
                            result[r.id][c.id] = colGlobalQty[c.id];
                        });
                    });
                }
            });
        }

        // Tính Cột Tỉ Lệ (Dựa trên Map kết quả hoàn thiện)
        config.sections.forEach(sec => {
            sec.rows.forEach(r => {
                ratioCols.forEach(c => {
                    const numCol = c.numeratorColId ? result[r.id][c.numeratorColId] || 0 : 0;
                    const denCol = c.denominatorColId ? result[r.id][c.denominatorColId] || 0 : 0;
                    result[r.id][c.id] = denCol > 0 ? (numCol / denCol) * 100 : 0;
                });
            });
        });

        return result;
    }, [baseFilteredData, config]);

    if (!config || !config.columns || config.columns.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-10 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                <p className="text-slate-500 font-bold mb-4">Bảng bán kèm chưa được thiết lập cột.</p>
                <div className="text-sm text-slate-400">Vui lòng bấm vào nút "Cấu Hình Bảng" ở bên trên góc trái để tạo các Cột đo lường.</div>
            </div>
        );
    }

    return (
        <div className="w-full overflow-x-auto custom-scrollbar" ref={tableContainerRef}>
            <table className="w-full min-w-[600px] border-collapse bg-white dark:bg-slate-800 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm">
                <thead>
                    <tr className="bg-slate-100 dark:bg-slate-700/80 uppercase text-[10px] sm:text-[11px]">
                        <th className="px-4 py-3 text-left font-black text-slate-600 dark:text-slate-300 border-r border-slate-200 dark:border-slate-600 truncate max-w-[200px] sticky left-0 z-10 bg-slate-100 dark:bg-slate-700/80 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                            Sản Phẩm Khai Thác
                        </th>
                        {config.columns.map(col => (
                            <th key={col.id} className="px-4 py-3 text-center font-black text-slate-600 dark:text-slate-300 border-r border-slate-200 dark:border-slate-600 whitespace-nowrap bg-slate-100 dark:bg-slate-700/80">
                                {col.name}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {config.sections.map(section => (
                        <React.Fragment key={section.id}>
                            <tr className="bg-slate-200/60 dark:bg-slate-800/80 border-y border-slate-300 dark:border-slate-600">
                                <td colSpan={config.columns.length + 1} className="px-4 py-2 text-left font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest text-[11px] sticky left-0 z-10 bg-inherit shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                    {section.header}
                                </td>
                            </tr>
                            {section.rows.map((r, rIdx) => {
                                const trClass = rIdx % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50 dark:bg-slate-800/40 text-[12px]';
                                
                                return (
                                    <tr key={r.id} className={`${trClass} border-b border-slate-200 dark:border-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors`}>
                                        <td className="px-4 py-2.5 text-left font-bold text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-700 max-w-[200px] truncate sticky left-0 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] bg-inherit" title={r.name}>
                                            {r.name}
                                        </td>
                                        {config.columns.map(col => {
                                            const val = stats[r.id]?.[col.id] || 0;
                                            
                                            if (col.type === 'target') {
                                                return (
                                                    <td key={col.id} className="px-4 py-2.5 text-center font-bold text-slate-800 dark:text-slate-200 border-r border-slate-200 dark:border-slate-700 whitespace-nowrap outline outline-1 -outline-offset-1 outline-amber-100 dark:outline-amber-900/40 bg-amber-50/30 dark:bg-amber-900/10">
                                                        {r.targetValue !== undefined ? `${r.targetValue}%` : '-'}
                                                    </td>
                                                );
                                            }
                                            
                                            if (col.type === 'ratio') {
                                                let colorClass = "text-indigo-600 dark:text-indigo-400 font-black";
                                                
                                                if (col.compareWithTarget && r.targetValue !== undefined) {
                                                    colorClass = val >= r.targetValue 
                                                        ? "text-emerald-600 dark:text-emerald-500 font-black" 
                                                        : "text-rose-600 dark:text-rose-500 font-bold";
                                                }

                                                return (
                                                    <td key={col.id} className={`px-4 py-2.5 text-center border-r border-slate-200 dark:border-slate-700 whitespace-nowrap ${colorClass}`}>
                                                        {val.toFixed(1)}%
                                                    </td>
                                                );
                                            }
                                            
                                            return (
                                                <td key={col.id} className="px-4 py-2.5 text-center font-bold text-slate-600 dark:text-slate-300 border-r border-slate-200 dark:border-slate-700 whitespace-nowrap">
                                                    {col.dataType === 'revenueQD' ? formatCurrency(val) : formatQuantity(val)}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                );
                            })}
                        </React.Fragment>
                    ))}
                    {config.sections.length === 0 && (
                        <tr>
                            <td colSpan={config.columns.length + 1} className="text-center p-8 text-slate-500 font-medium">
                                Chưa có nhóm dòng nào được cấu hình.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};
