import React, { useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Product } from './types';
import FileUpload from './FileUpload';
import SearchBar from './SearchBar';
import { PrintIcon, SettingsIcon, StarIcon, TagIcon, TrashIcon, ExportIcon, ImportIcon, PenSquareIcon, InventoryIcon, FilePlusIcon, UserIcon } from './Icons';
import { Trash2, ShieldAlert, Info, Cloud, Save, FolderOpen, FileDown, FileUp } from 'lucide-react';
import { Button } from '../../components/shared/ui/Button';
import { useActiveTab } from '../../contexts/LayoutContext';

interface ControlPanelProps {
    employeeName: string;
    isEditingEmployeeName: boolean;
    searchQuery: string;
    suggestions: Product[];
    showNoResults: boolean;
    allProducts: Product[];
    displayedProducts: Product[];
    isLoading: boolean;
    fileName: string | null;
    isMobile: boolean;
    uploadTimestamp: Date | null;
    inventoryUploadTimestamp: Date | null;
    hasInventory: boolean;
    userRole?: 'admin' | 'staff';
    activeTab?: 'home' | 'tools';

    onEmployeeNameChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onSaveEmployeeName: () => void;
    onEmployeeNameKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
    onSetIsEditingEmployeeName: (isEditing: boolean) => void;
    onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onOpenScanner: () => void;
    onSuggestionClick: (product: Product) => void;
    onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
    onInventoryFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
    onDownloadSampleInventory: () => void;
    onShowTopBonus: () => void;
    onShowTopDiscount: () => void;
    onOpenManualInput: () => void;
    onReset: () => void;
    onClearAll: () => void;
    onTriggerImport: () => void;
    onExport: () => void;
    onOpenPrintSettings: () => void;
    onPrintSelected: () => void;
    onPrintAll: () => void;
    onOpenUserManagement?: () => void;
    onOpenSuperAdminTools?: () => void;
    onSaveList: () => void;
    onViewSavedLists: () => void;
    onOpenUserGuide?: () => void;
    onSaveUserState?: () => void;
    showManagerInstructions?: boolean;
    onCloseInstructions?: () => void;
}

const ControlPanel: React.FC<ControlPanelProps> = (props) => {
    const selectedCount = useMemo(() => props.displayedProducts.filter(p => p.selected).length, [props.displayedProducts]);
    const isEmployeeNameEmpty = !props.employeeName || props.employeeName.trim() === '';
    const isAdmin = props.userRole === 'admin';
    const isMobileTools = props.isMobile && props.activeTab === 'tools';
    const isMobileHome = props.isMobile && props.activeTab === 'home';
    
    return (
        <aside className={`w-full ${props.isMobile ? 'p-0' : 'lg:w-[316px] lg:flex-shrink-0 bg-white/95 dark:bg-slate-900/95 p-3 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm lg:sticky lg:top-2 lg:max-h-[calc(100vh-1rem)] lg:overflow-y-auto lg:scrollbar-thin lg:scrollbar-thumb-slate-200 dark:lg:scrollbar-thumb-slate-700 lg:scrollbar-track-transparent self-start flex flex-col gap-2.5 backdrop-blur-xs'}`}>
            
            {/* ───────── Trên Mobile ở Tab Home: CHỈ HIỂN THỊ SEARCHBAR Ở ĐỈNH ───────── */}
            {isMobileHome && (
                <div className="w-full px-2 pt-1.5 pb-1">
                    <SearchBar
                        searchQuery={props.searchQuery}
                        onSearchChange={props.onSearchChange}
                        onIconClick={props.onOpenScanner}
                        disabled={props.isLoading}
                        suggestions={props.suggestions}
                        onSuggestionClick={props.onSuggestionClick}
                        showNoResults={props.showNoResults}
                        isMobile={true}
                    />
                </div>
            )}

            {/* ───────── BẢNG ĐIỀU KHIỂN & CÔNG CỤ (HIỂN THỊ KHI Ở TAB TOOLS HOẶC DESKTOP) ───────── */}
            {(!props.isMobile || isMobileTools) && (
                <div className={`flex flex-col gap-2.5 ${props.isMobile ? 'px-3 py-2 space-y-1' : ''}`}>

                    {/* 1. THANH THÔNG TIN NGƯỜI IN (COMPACT & PRO) */}
                    <div className="bg-slate-50/80 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700/70 transition-all">
                        <div className="flex items-center justify-between gap-2">
                            {props.isEditingEmployeeName || !props.employeeName ? (
                                <div className="flex-1 flex items-center gap-1.5">
                                    <input
                                        id="employee-name-input"
                                        type="text"
                                        placeholder="Tên / mã nhân viên..."
                                        value={props.employeeName}
                                        onChange={props.onEmployeeNameChange}
                                        onBlur={props.onSaveEmployeeName}
                                        onKeyDown={props.onEmployeeNameKeyDown}
                                        className={`flex-1 px-2.5 py-1.5 text-xs font-medium border rounded-lg bg-white dark:bg-slate-900 focus:ring-2 focus:ring-sky-500 focus:outline-none transition ${isEmployeeNameEmpty ? 'border-rose-300 placeholder-rose-300' : 'border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-100'}`}
                                        autoFocus={!props.employeeName}
                                    />
                                    <Button
                                        variant="primary"
                                        size="none"
                                        onClick={props.onSaveEmployeeName}
                                        className="h-7 px-2.5 text-[11px] font-bold rounded-lg shrink-0"
                                    >
                                        Lưu
                                    </Button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                    <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-sky-600 to-blue-500 text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-2xs">
                                        {props.employeeName.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-1.5">
                                            <p className="font-bold text-xs text-slate-800 dark:text-slate-100 truncate" title={props.employeeName}>
                                                {props.employeeName}
                                            </p>
                                            <button
                                                type="button"
                                                onClick={() => props.onSetIsEditingEmployeeName(true)}
                                                className="text-[10px] font-medium text-sky-600 dark:text-sky-400 hover:underline shrink-0"
                                                title="Đổi tên người in"
                                            >
                                                Sửa
                                            </button>
                                        </div>
                                        <span className="text-[10px] text-slate-400 font-medium block leading-tight">
                                            {isAdmin ? 'Quản trị viên' : 'Nhân viên in ấn'}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {isAdmin && (
                                <Button
                                    variant="unstyled"
                                    onClick={props.onClearAll}
                                    className="flex items-center gap-1 text-[11px] font-semibold text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 px-2 py-1 rounded-lg transition-colors shrink-0"
                                    title="Xóa toàn bộ dữ liệu tồn kho và giá trên hệ thống"
                                >
                                    <Trash2 className="h-3 w-3" />
                                    <span>Xóa DL</span>
                                </Button>
                            )}
                        </div>
                        {isEmployeeNameEmpty && (
                            <p className="text-[10.5px] text-rose-500 mt-1 font-medium">* Bắt buộc nhập tên trước khi in ấn</p>
                        )}
                    </div>

                    {/* 3. NHÓM HÀNH ĐỘNG IN ẤN CHÍNH (LUÔN NỔI BẬT & DỄ THAO TÁC) */}
                    {!props.isLoading && (
                        <div className="bg-gradient-to-b from-sky-50/60 to-slate-50/60 dark:from-sky-950/20 dark:to-slate-900/40 p-2.5 rounded-xl border border-sky-100 dark:border-sky-900/40 space-y-1.5 shadow-2xs">
                            <Button
                                variant="primary"
                                size="none"
                                onClick={props.onPrintSelected}
                                disabled={selectedCount === 0}
                                className="w-full h-10 rounded-xl text-xs font-bold gap-2 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 text-white shadow-xs transition-all disabled:opacity-40"
                            >
                                <PrintIcon className="h-4 w-4" />
                                <span>In đã chọn ({selectedCount})</span>
                            </Button>
                            <Button
                                variant="outline"
                                size="none"
                                onClick={props.onPrintAll}
                                disabled={props.displayedProducts.length === 0}
                                className="w-full h-8.5 rounded-xl text-xs font-semibold border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors disabled:opacity-40"
                            >
                                <span>In tất cả ({props.displayedProducts.length})</span>
                            </Button>
                        </div>
                    )}

                    {/* 4. ADMIN: DỮ LIỆU TỒN KHO & BẢNG GIÁ (GỌN GÀNG, HIỆN ĐẠI) */}
                    {isAdmin && (
                        <div className="bg-slate-50/70 dark:bg-slate-850/60 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-[10.5px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                    <Cloud className="h-3 w-3 text-sky-500" />
                                    Dữ liệu nguồn
                                </span>
                                <div className="flex items-center gap-1.5">
                                    <a 
                                        href="https://report.mwgroup.vn/home/dashboard/4286" 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-[11px] font-bold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-0.5"
                                        title="Mở báo cáo tồn kho MWG để tải file"
                                    >
                                        <span>Lấy File Tồn Kho</span>
                                        <span className="text-[10px]">&nearr;</span>
                                    </a>
                                    <Button
                                        variant="unstyled"
                                        onClick={props.onOpenUserGuide}
                                        className="p-0.5 text-slate-400 hover:text-sky-600 transition-colors"
                                        title="Xem hướng dẫn quy trình in"
                                    >
                                        <Info className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            </div>

                            {/* 2 Thẻ nạp file Tồn kho & Bảng giá */}
                            <div className="grid grid-cols-2 gap-2">
                                <div className="relative group">
                                    <input 
                                        type="file" 
                                        id="inventory-file-input" 
                                        onChange={props.onInventoryFileChange} 
                                        accept=".xlsx, .xls" 
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                                        disabled={props.isLoading} 
                                    />
                                    <label
                                        htmlFor="inventory-file-input"
                                        className={`flex items-center gap-2 py-2 px-2.5 rounded-xl border transition-all cursor-pointer ${
                                            props.isLoading 
                                                ? 'bg-slate-100 border-slate-200 opacity-50' 
                                                : props.inventoryUploadTimestamp
                                                    ? 'bg-white dark:bg-slate-800 border-sky-300 dark:border-sky-700/80 shadow-2xs hover:border-sky-500 text-sky-800 dark:text-sky-200'
                                                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-sky-300 text-slate-700 dark:text-slate-300'
                                        }`}
                                    >
                                        <div className="w-6 h-6 rounded-lg bg-sky-100 dark:bg-sky-950/80 text-sky-600 flex items-center justify-center shrink-0">
                                            <InventoryIcon className="h-3.5 w-3.5" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <span className="text-xs font-bold block leading-tight truncate">Tồn Kho</span>
                                            <span className="text-[10px] text-slate-400 dark:text-slate-500 block leading-tight truncate mt-0.5">
                                                {props.inventoryUploadTimestamp ? props.inventoryUploadTimestamp.toLocaleTimeString('vi-VN') : 'Chưa tải'}
                                            </span>
                                        </div>
                                    </label>
                                </div>

                                <div className="relative group">
                                    <input 
                                        type="file" 
                                        id="price-file-input" 
                                        onChange={props.onFileChange} 
                                        accept=".xlsx, .xls" 
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                                        disabled={props.isLoading} 
                                        multiple 
                                    />
                                    <label
                                        htmlFor="price-file-input"
                                        className={`flex items-center gap-2 py-2 px-2.5 rounded-xl border transition-all cursor-pointer ${
                                            props.isLoading 
                                                ? 'bg-slate-100 border-slate-200 opacity-50' 
                                                : props.uploadTimestamp
                                                    ? 'bg-white dark:bg-slate-800 border-emerald-300 dark:border-emerald-700/80 shadow-2xs hover:border-emerald-500 text-emerald-800 dark:text-emerald-200'
                                                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-emerald-300 text-slate-700 dark:text-slate-300'
                                        }`}
                                    >
                                        <div className="w-6 h-6 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 flex items-center justify-center shrink-0">
                                            <FilePlusIcon className="h-3.5 w-3.5" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <span className="text-xs font-bold block leading-tight truncate">Bảng Giá</span>
                                            <span className="text-[10px] text-slate-400 dark:text-slate-500 block leading-tight truncate mt-0.5">
                                                {props.uploadTimestamp ? props.uploadTimestamp.toLocaleTimeString('vi-VN') : 'Chưa tải'}
                                            </span>
                                        </div>
                                    </label>
                                </div>
                            </div>

                            {/* Nút Người dùng & SuperAdmin */}
                            <div className="grid grid-cols-2 gap-2 pt-0.5">
                                {isAdmin && props.onOpenUserManagement && (
                                    <Button
                                        variant="secondary"
                                        size="none"
                                        onClick={props.onOpenUserManagement}
                                        className="h-8 rounded-lg text-xs font-semibold gap-1.5 whitespace-nowrap bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-100 text-slate-700 dark:text-slate-300"
                                    >
                                        <UserIcon className="h-3.5 w-3.5 text-slate-500" />
                                        <span>Người dùng</span>
                                    </Button>
                                )}
                                {props.onOpenSuperAdminTools && (
                                    <Button
                                        variant="unstyled"
                                        onClick={props.onOpenSuperAdminTools}
                                        className="h-8 flex items-center justify-center gap-1.5 rounded-lg text-xs font-bold whitespace-nowrap border border-rose-200/80 dark:border-rose-900/50 bg-rose-50/70 hover:bg-rose-100/80 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 transition-colors"
                                    >
                                        <ShieldAlert className="h-3.5 w-3.5" />
                                        <span>Super Admin</span>
                                    </Button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Manager instructions modal / note */}
                    {isAdmin && props.showManagerInstructions && (
                        <div className="bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800 rounded-xl p-3 relative">
                            <Button variant="unstyled" onClick={props.onCloseInstructions} className="absolute top-2 right-2 text-sky-500 hover:text-sky-700">
                                <TrashIcon className="h-3.5 w-3.5" />
                            </Button>
                            <h3 className="text-xs font-bold text-sky-900 dark:text-sky-200 mb-1.5 flex items-center gap-1.5">
                                <ShieldAlert className="h-3.5 w-3.5" />
                                Hướng dẫn Quản lý
                            </h3>
                            <div className="space-y-1 text-[10.5px] leading-relaxed text-sky-800 dark:text-sky-300">
                                <p><strong>B1:</strong> Bấm <span className="text-rose-600 dark:text-rose-400 font-bold">&quot;Lấy file tồn kho&quot;</span> &gt; Chọn nhóm ĐGD, DCNB, Phụ Kiện &gt; Tải file.</p>
                                <p><strong>B2:</strong> Tải file vào <strong>&quot;Tồn Kho&quot;</strong> &gt; Nhận file mẫu tự động.</p>
                                <p><strong>B3:</strong> Vào ERP &gt; In giá &gt; Mẫu in 81 &gt; Xuất Data-only(*.xlsx) &gt; Tải vào <strong>&quot;Bảng Giá&quot;</strong>.</p>
                            </div>
                        </div>
                    )}

                    {/* 5. CÔNG CỤ NHANH & DANH SÁCH (THỐNG NHẤT, GỌN ĐẸP) */}
                    {!props.isLoading && (
                        <div className="bg-slate-50/70 dark:bg-slate-850/60 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-[10.5px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                                    Thao tác danh sách
                                </span>
                                <Button
                                    variant="unstyled"
                                    onClick={props.onSaveUserState}
                                    disabled={props.displayedProducts.length === 0}
                                    className="flex items-center gap-1 text-[10.5px] font-bold text-sky-700 dark:text-sky-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded-lg hover:border-sky-300 transition-colors disabled:opacity-40 shadow-2xs"
                                    title="Đồng bộ danh sách hiện tại lên Cloud"
                                >
                                    <Cloud className="w-3 h-3 text-sky-500" />
                                    <span>Cloud</span>
                                </Button>
                            </div>

                            {/* Hàng nút Thêm thủ công & Quản lý danh sách */}
                            <Button
                                variant="outline"
                                size="none"
                                onClick={props.onOpenManualInput}
                                title="Nhập sản phẩm thủ công để in"
                                className="w-full h-8.5 rounded-xl text-xs font-bold gap-1.5 bg-white dark:bg-slate-800 border-sky-200 dark:border-sky-800 hover:bg-sky-50 dark:hover:bg-sky-950/40 text-sky-700 dark:text-sky-300 transition-colors"
                            >
                                <PenSquareIcon className="h-3.5 w-3.5 text-sky-600" />
                                <span>Nhập sản phẩm thủ công</span>
                            </Button>

                            <div className="grid grid-cols-2 gap-2">
                                <Button
                                    variant="secondary"
                                    size="none"
                                    onClick={props.onSaveList}
                                    disabled={props.displayedProducts.length === 0}
                                    title="Lưu danh sách hiện tại"
                                    className="h-8 rounded-lg text-xs font-semibold gap-1.5 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-100 text-slate-700 dark:text-slate-200"
                                >
                                    <Save className="h-3.5 w-3.5 text-slate-500" />
                                    <span>Lưu DS</span>
                                </Button>
                                <Button
                                    variant="secondary"
                                    size="none"
                                    onClick={props.onViewSavedLists}
                                    title="Mở danh sách đã lưu"
                                    className="h-8 rounded-lg text-xs font-semibold gap-1.5 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-100 text-slate-700 dark:text-slate-200"
                                >
                                    <FolderOpen className="h-3.5 w-3.5 text-slate-500" />
                                    <span>DS đã lưu</span>
                                </Button>
                            </div>

                            {/* Hàng công cụ tiện ích: Nhập / Xuất / Cài đặt / Xoá */}
                            <div className="pt-1.5 border-t border-slate-200/60 dark:border-slate-750 grid grid-cols-4 gap-1.5">
                                <Button
                                    variant="secondary"
                                    size="none"
                                    onClick={props.onTriggerImport}
                                    title="Nhập danh sách từ tệp .json"
                                    className="h-7.5 rounded-lg text-[11px] font-semibold gap-1 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-100 text-slate-600 dark:text-slate-300"
                                >
                                    <ImportIcon className="h-3 w-3 text-slate-400" />
                                    <span>Nhập</span>
                                </Button>
                                <Button
                                    variant="secondary"
                                    size="none"
                                    onClick={props.onExport}
                                    disabled={props.displayedProducts.length === 0}
                                    title="Xuất danh sách ra tệp .json"
                                    className="h-7.5 rounded-lg text-[11px] font-semibold gap-1 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-100 text-slate-600 dark:text-slate-300"
                                >
                                    <ExportIcon className="h-3 w-3 text-slate-400" />
                                    <span>Xuất</span>
                                </Button>
                                <Button
                                    variant="secondary"
                                    size="none"
                                    onClick={props.onOpenPrintSettings}
                                    title="Cài đặt khổ in, mẫu tem"
                                    className="h-7.5 rounded-lg text-[11px] font-semibold gap-1 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-100 text-slate-600 dark:text-slate-300"
                                >
                                    <SettingsIcon className="h-3 w-3 text-slate-400" />
                                    <span>Cài đặt</span>
                                </Button>
                                <Button
                                    variant="secondary"
                                    size="none"
                                    onClick={props.onReset}
                                    disabled={props.displayedProducts.length === 0}
                                    title="Xoá danh sách đang hiển thị"
                                    className="h-7.5 rounded-lg text-[11px] font-semibold gap-1 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:border-rose-200 transition-colors"
                                >
                                    <TrashIcon className="h-3 w-3 text-rose-500" />
                                    <span>Xóa</span>
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </aside>
    );
};

export default ControlPanel;