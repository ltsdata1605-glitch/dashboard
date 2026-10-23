import React, { useState, useEffect } from 'react';
import { AppIcon } from '../../../components/shared/ui/icon/AppIcon';
import { createPortal } from 'react-dom';
import { useActiveTab } from '../../../contexts/LayoutContext';
import { Button } from '../../../components/shared/ui/Button';
import HeaderSystemGroup from '../../../components/layout/HeaderSystemGroup';
import { usePageActions } from '../../../components/shared/ui/PageActions';

const LINK_DS_NV = 'https://office.thegioididong.com/quan-ly-phan-ca';

interface PhanCaToolbarProps {
    hasStaff: boolean;
    onImportClick: () => void;
    onDeleteStaffList: () => void;
    onOpenEditPattern: () => void;
    onExportAll: () => void;
    onExportWeekly: () => void;
    onExportIndividual: () => void;
    onExportExcel: () => void;
    onExportGoogleSheet: () => void;
}

export const PhanCaToolbar: React.FC<PhanCaToolbarProps> = ({
    hasStaff, onImportClick, onDeleteStaffList, onOpenEditPattern,
    onExportAll, onExportWeekly, onExportIndividual, onExportExcel, onExportGoogleSheet,
}) => {
    const { activeTab } = useActiveTab();
    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); }, []);

    // iPhone / iPad (GĐ7): thay dải 9 nút cuộn ngang dính đầu nội dung bằng thanh trên của khung app — nút chính "+" (Nhập NV)
    // + menu "⋯" chia nhóm Xuất / Nhân viên; "Xoá danh sách" chữ đỏ ở nhóm cuối. Laptop giữ thanh của chủ dự án (portal dưới).
    const chuaCoNV = !hasStaff;
    usePageActions(activeTab === 'tools-phanca' ? {
        scope: 'mobile',
        primary: { id: 'nhap-nv', label: 'Nhập nhân viên', icon: 'add', onClick: onImportClick },
        items: [
            { id: 'xuat-tat-ca', label: 'Ảnh lịch tất cả', icon: 'exportImage', section: 'Xuất', disabled: chuaCoNV, onSelect: onExportAll },
            { id: 'xuat-tuan', label: 'Ảnh lịch theo tuần', icon: 'dateRange', section: 'Xuất', disabled: chuaCoNV, onSelect: onExportWeekly },
            { id: 'xuat-tung-nv', label: 'Ảnh lịch từng nhân viên', icon: 'exportBatch', section: 'Xuất', disabled: chuaCoNV, onSelect: onExportIndividual },
            { id: 'xuat-excel', label: 'Excel', icon: 'spreadsheet', section: 'Xuất', disabled: chuaCoNV, onSelect: onExportExcel },
            { id: 'xuat-sheet', label: 'Google Sheet', icon: 'share', section: 'Xuất', disabled: chuaCoNV, onSelect: onExportGoogleSheet },
            { id: 'ca-xoay', label: 'Ca xoay', icon: 'repeat', section: 'Nhân viên', onSelect: onOpenEditPattern },
            { id: 'lay-ds-nv', label: 'Lấy danh sách NV từ hệ thống', icon: 'externalLink', section: 'Nhân viên', onSelect: () => { window.open(LINK_DS_NV, '_blank', 'noopener,noreferrer'); } },
            { id: 'xoa-ds-nv', label: 'Xoá danh sách nhân viên', icon: 'delete', destructive: true, onSelect: onDeleteStaffList },
        ],
    } : null);

    return (
        <>
            {/* GLOBAL HEADER ACTIONS PORTAL */}
            {mounted && activeTab === 'tools-phanca' && document.getElementById('global-header-actions') && createPortal(
                <div className="hidden lg:flex flex-wrap items-center gap-4 w-auto bg-white/60 dark:bg-slate-900/60 p-1.5 rounded-full border border-slate-200/50 dark:border-slate-700/50 backdrop-blur-xl shadow-sm animate-in fade-in zoom-in duration-300">
                    {/* Data management group — Nền trắng bg-white đồng bộ Hình 1 */}
                    <div className="flex items-center rounded-full overflow-hidden bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
                        <Button
                            variant="unstyled"
                            size="none"
                            onClick={onImportClick}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-50/50 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 font-semibold text-sm transition-colors"
                            title="Nhập danh sách nhân viên từ file Excel"
                        >
                            <AppIcon name="add" size="md" />
                            <span>Nhập NV</span>
                        </Button>
                        <a 
                            href={LINK_DS_NV} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="flex items-center p-2 text-slate-500 hover:text-emerald-700 dark:text-slate-400 dark:hover:text-emerald-400 border-l border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors" 
                            title="Lấy danh sách nhân viên từ hệ thống"
                        >
                            <AppIcon name="externalLink" size="md" />
                        </a>
                        <Button
                            variant="unstyled"
                            size="none"
                            onClick={onDeleteStaffList}
                            title="Xóa danh sách nhân viên"
                            aria-label="Xóa danh sách"
                            className="p-2 transition-colors border-l border-slate-100 dark:border-slate-700 text-slate-500 hover:text-rose-500 hover:bg-rose-50 dark:text-slate-400 dark:hover:bg-rose-900/20 cursor-pointer"
                        >
                            <AppIcon name="delete" size="md" />
                        </Button>
                        <Button
                            variant="unstyled"
                            size="none"
                            onClick={onOpenEditPattern}
                            title="Cấu hình ca xoay"
                            className="flex items-center gap-1.5 px-3 py-2 border-l border-slate-100 dark:border-slate-700 font-semibold text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors"
                        >
                            <AppIcon name="repeat" size="md" />
                            <span>Ca Xoay</span>
                        </Button>
                    </div>
                    {/* Export group — Nền trắng bg-white đồng bộ Hình 1 */}
                    <div className="flex items-center rounded-full overflow-hidden bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
                        <Button
                            variant="unstyled" size="none"
                            onClick={onExportAll}
                            disabled={!hasStaff}
                            className="px-3 py-2 text-xs font-semibold text-slate-600 hover:text-sky-600 dark:text-slate-300 dark:hover:text-sky-400 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors disabled:opacity-40"
                            title="Xuất lịch tất cả nhân viên"
                        >
                            Tất cả
                        </Button>
                        <Button
                            variant="unstyled" size="none"
                            onClick={onExportWeekly}
                            disabled={!hasStaff}
                            className="px-3 py-2 text-xs font-semibold border-l border-slate-100 dark:border-slate-700 text-slate-600 hover:text-sky-600 dark:text-slate-300 dark:hover:text-sky-400 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors disabled:opacity-40"
                            title="Xuất lịch theo tuần"
                        >
                            Tuần
                        </Button>
                        <Button
                            variant="unstyled" size="none"
                            onClick={onExportIndividual}
                            disabled={!hasStaff}
                            className="px-3 py-2 text-xs font-bold border-l border-slate-100 dark:border-slate-700 text-slate-700 hover:text-sky-600 dark:text-slate-200 dark:hover:text-sky-400 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors disabled:opacity-40"
                            title="Xuất lịch từng nhân viên"
                        >
                            Từng NV
                        </Button>
                        <Button
                            variant="unstyled" size="none"
                            onClick={onExportExcel}
                            disabled={!hasStaff}
                            className="px-3 py-2 text-xs font-bold border-l border-slate-100 dark:border-slate-700 text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors disabled:opacity-40"
                            title="Xuất file Excel"
                        >
                            Excel
                        </Button>
                        <Button
                            variant="unstyled" size="none"
                            onClick={onExportGoogleSheet}
                            disabled={!hasStaff}
                            title="Xuất ra Google Sheet"
                            className="px-3 py-2 text-xs font-bold border-l border-slate-100 dark:border-slate-700 text-sky-600 hover:text-sky-700 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/30 transition-colors disabled:opacity-40"
                        >
                            Sheet
                        </Button>
                    </div>

                    {/* Cụm công cụ hệ thống chuẩn (Font chữ + Chuông thông báo) */}
                    <HeaderSystemGroup />
                </div>,
                document.getElementById('global-header-actions')!
            )}
        </>
    );
};
