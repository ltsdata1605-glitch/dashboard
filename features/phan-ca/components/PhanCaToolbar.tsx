import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useActiveTab } from '../../../contexts/LayoutContext';
import { Button } from '../../../components/shared/ui/Button';

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

    return (
        <>
            {/* GLOBAL HEADER ACTIONS PORTAL */}
            {mounted && activeTab === 'tools-phanca' && document.getElementById('global-header-actions') && createPortal(
                <div className="hidden lg:flex items-center gap-2 bg-white/60 dark:bg-slate-900/60 p-1.5 rounded-full border border-slate-200/50 dark:border-slate-700/50 backdrop-blur-xl shadow-sm">
                    {/* Data management group */}
                    <div className="flex items-center rounded-full overflow-hidden bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
                    <Button variant="ghost" onClick={onImportClick} className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0 text-inherit flex items-center gap-2 px-4 py-2 bg-sky-50/50 hover:bg-sky-100 dark:bg-sky-900/20 dark:hover:bg-sky-900/40 text-sky-600 dark:text-sky-400 font-semibold text-sm transition-colors">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                        <span>Nhập NV</span>
                    </Button>
                    <a href="https://office.thegioididong.com/quan-ly-phan-ca" target="_blank" rel="noopener noreferrer" className="p-2 text-slate-500 hover:text-sky-600 dark:text-slate-400 dark:hover:text-sky-400 border-l border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors" title="Lấy danh sách nhân viên từ hệ thống">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                    </a>
                    <Button variant="ghost" onClick={onDeleteStaffList} className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-2 text-slate-500 hover:text-rose-500 hover:bg-rose-50 dark:text-slate-400 dark:hover:bg-rose-900/20 border-l border-slate-100 dark:border-slate-700 transition-colors" title="Xóa danh sách">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </Button>
                    <Button variant="ghost" onClick={onOpenEditPattern} className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0 text-inherit flex items-center gap-2 px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-indigo-50 hover:text-indigo-700 dark:hover:bg-indigo-900/30 dark:hover:text-indigo-400 font-semibold text-sm border-l border-slate-100 dark:border-slate-700 transition-colors">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16m-7 6h7" /></svg>
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
            {/* Mobile action bar — lg:hidden */}
            <div className="lg:hidden sticky top-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/60 px-3 py-2 flex items-center gap-2 overflow-x-auto no-scrollbar">
                <Button variant="ghost" onClick={onImportClick} className="bg-transparent hover:bg-transparent border-0 rounded-none h-11 w-auto p-0 text-inherit px-3 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors flex items-center gap-1.5 shrink-0">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                    Nhập NV
                </Button>
                <a href="https://office.thegioididong.com/quan-ly-phan-ca" target="_blank" rel="noopener noreferrer" className="h-11 px-2.5 text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors flex items-center justify-center shrink-0" title="Lấy DS NV">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                </a>
                <Button variant="ghost" onClick={onDeleteStaffList} className="bg-transparent hover:bg-transparent border-0 rounded-none h-11 w-auto p-0 text-inherit px-2.5 text-xs font-semibold text-slate-500 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 rounded-md transition-colors flex items-center gap-1.5 shrink-0" title="Xóa danh sách">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    Xoá
                </Button>
                <Button variant="ghost" onClick={onOpenEditPattern} className="bg-transparent hover:bg-transparent border-0 rounded-none h-11 w-auto p-0 text-inherit px-3 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 rounded-md transition-colors flex items-center gap-1.5 shrink-0">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16m-7 6h7" /></svg>
                    Ca Xoay
                </Button>
                <div className="w-px h-5 bg-slate-200 shrink-0"></div>
                <Button variant="ghost" onClick={onExportAll} className="bg-transparent hover:bg-transparent border-0 rounded-none h-11 w-auto p-0 text-inherit px-2.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-md transition-colors shrink-0" disabled={!hasStaff}>
                    Tất cả
                </Button>
                <Button variant="ghost" onClick={onExportWeekly} className="bg-transparent hover:bg-transparent border-0 rounded-none h-11 w-auto p-0 text-inherit px-2.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-md transition-colors shrink-0" disabled={!hasStaff}>
                    Tuần
                </Button>
                <Button variant="ghost" onClick={onExportIndividual} className="bg-transparent hover:bg-transparent border-0 rounded-none h-11 w-auto p-0 text-inherit px-2.5 text-xs font-bold text-white bg-slate-800 rounded-md transition-colors shrink-0" disabled={!hasStaff}>
                    Từng NV
                </Button>
                <Button variant="ghost" onClick={onExportExcel} className="bg-transparent hover:bg-transparent border-0 rounded-none h-11 w-auto p-0 text-inherit px-2.5 text-xs font-bold text-white bg-emerald-600 rounded-md transition-colors shrink-0" disabled={!hasStaff}>
                    Excel
                </Button>
                <Button variant="ghost" onClick={onExportGoogleSheet} className="bg-transparent hover:bg-transparent border-0 rounded-none h-11 w-auto p-0 text-inherit px-2.5 text-xs font-bold text-sky-700 bg-sky-50 rounded-md transition-colors shrink-0" disabled={!hasStaff} title="Xuất ra Google Sheet">
                    Sheet
                </Button>
            </div>
        </>
    );
};
