import React, { useState, useEffect } from 'react';
import { AppIcon } from '../../../components/shared/ui/icon/AppIcon';
import { createPortal } from 'react-dom';
import { useActiveTab } from '../../../contexts/LayoutContext';
import { Button } from '../../../components/shared/ui/Button';
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
                <div className="hidden lg:flex items-center gap-2 bg-white/60 dark:bg-slate-900/60 p-1.5 rounded-full border border-slate-200/50 dark:border-slate-700/50 backdrop-blur-xl shadow-sm">
                    {/* Data management group */}
                    <div className="flex items-center rounded-full overflow-hidden bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
                    <Button variant="ghost" onClick={onImportClick} className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0 text-inherit flex items-center gap-2 px-4 py-2 bg-sky-50/50 hover:bg-sky-100 dark:bg-sky-900/20 dark:hover:bg-sky-900/40 text-sky-600 dark:text-sky-400 font-semibold text-sm transition-colors">
                        <AppIcon name="add" size="md" />
                        <span>Nhập NV</span>
                    </Button>
                    <a href={LINK_DS_NV} target="_blank" rel="noopener noreferrer" className="p-2 text-slate-500 hover:text-sky-600 dark:text-slate-400 dark:hover:text-sky-400 border-l border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors" title="Lấy danh sách nhân viên từ hệ thống">
                        <AppIcon name="externalLink" size="md" />
                    </a>
                    <Button variant="ghost" onClick={onDeleteStaffList} className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-2 text-slate-500 hover:text-rose-500 hover:bg-rose-50 dark:text-slate-400 dark:hover:bg-rose-900/20 border-l border-slate-100 dark:border-slate-700 transition-colors" title="Xóa danh sách">
                        <AppIcon name="delete" size="md" />
                    </Button>
                    <Button variant="ghost" onClick={onOpenEditPattern} className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0 text-inherit flex items-center gap-2 px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-sky-50 hover:text-sky-700 dark:hover:bg-sky-900/30 dark:hover:text-sky-400 font-semibold text-sm border-l border-slate-100 dark:border-slate-700 transition-colors">
                        <AppIcon name="repeat" size="md" />
                        <span>Ca Xoay</span>
                    </Button>
                    </div>
                    {/* Export group */}
                    <div className="flex items-center rounded-full overflow-hidden bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
                    <Button variant="ghost" onClick={onExportAll} className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0 text-inherit px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors" disabled={!hasStaff}>
                        Tất cả
                    </Button>
                    <Button variant="ghost" onClick={onExportWeekly} className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0 text-inherit px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900/50 border-l border-slate-100 dark:border-slate-700 transition-colors" disabled={!hasStaff}>
                        Tuần
                    </Button>
                    <Button variant="ghost" onClick={onExportIndividual} className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0 text-inherit px-4 py-2 text-sm font-bold text-white bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 border-l border-slate-700 transition-colors" disabled={!hasStaff}>
                        Từng NV
                    </Button>
                    <Button variant="ghost" onClick={onExportExcel} className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0 text-inherit px-4 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 border-l border-emerald-700 transition-colors" disabled={!hasStaff}>
                        Excel
                    </Button>
                    <Button variant="ghost" onClick={onExportGoogleSheet} className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0 text-inherit px-4 py-2 text-sm font-bold text-sky-700 bg-sky-50 hover:bg-sky-100 border-l border-sky-200 transition-colors" disabled={!hasStaff} title="Xuất ra Google Sheet">
                        Sheet
                    </Button>
                    </div>
                </div>,
                document.getElementById('global-header-actions')!
            )}
        </>
    );
};
