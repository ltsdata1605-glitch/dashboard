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
                        <Button
                            variant="tinted"
                            size="sm"
                            onClick={onImportClick}
                            icon="add"
                            className="rounded-none border-0 font-semibold"
                        >
                            Nhập NV
                        </Button>
                        <a href={LINK_DS_NV} target="_blank" rel="noopener noreferrer" className="p-2 text-slate-500 hover:text-sky-600 dark:text-slate-400 dark:hover:text-sky-400 border-l border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors" title="Lấy danh sách nhân viên từ hệ thống">
                            <AppIcon name="externalLink" size="md" />
                        </a>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onDeleteStaffList}
                            icon="delete"
                            title="Xóa danh sách"
                            aria-label="Xóa danh sách"
                            className="rounded-none border-l border-slate-100 dark:border-slate-700 text-slate-500 hover:text-rose-500 hover:bg-rose-50"
                        />
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onOpenEditPattern}
                            icon="repeat"
                            className="rounded-none border-l border-slate-100 dark:border-slate-700 font-semibold hover:bg-sky-50 hover:text-sky-700"
                        >
                            Ca Xoay
                        </Button>
                    </div>
                    {/* Export group */}
                    <div className="flex items-center rounded-full overflow-hidden bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onExportAll}
                            disabled={!hasStaff}
                            className="rounded-none font-semibold"
                        >
                            Tất cả
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onExportWeekly}
                            disabled={!hasStaff}
                            className="rounded-none border-l border-slate-100 dark:border-slate-700 font-semibold"
                        >
                            Tuần
                        </Button>
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={onExportIndividual}
                            disabled={!hasStaff}
                            className="rounded-none border-l border-slate-700 bg-slate-800 hover:bg-slate-900 text-white font-bold"
                        >
                            Từng NV
                        </Button>
                        <Button
                            variant="success"
                            size="sm"
                            onClick={onExportExcel}
                            disabled={!hasStaff}
                            className="rounded-none border-l border-emerald-700 font-bold"
                        >
                            Excel
                        </Button>
                        <Button
                            variant="tinted"
                            size="sm"
                            onClick={onExportGoogleSheet}
                            disabled={!hasStaff}
                            title="Xuất ra Google Sheet"
                            className="rounded-none border-l border-sky-200 font-bold"
                        >
                            Sheet
                        </Button>
                    </div>
                </div>,
                document.getElementById('global-header-actions')!
            )}
        </>
    );
};
