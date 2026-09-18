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
        <aside className={`w-full ${props.isMobile ? 'p-0' : 'lg:w-80 lg:flex-shrink-0 bg-white p-4 rounded-xl shadow-xs border border-slate-200 lg:sticky lg:top-2 lg:max-h-[calc(100vh-1rem)] lg:overflow-y-auto lg:scrollbar-thin lg:scrollbar-thumb-slate-200 lg:scrollbar-track-transparent self-start space-y-4 flex flex-col'}`}>
            
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
                <div className={`flex flex-col gap-3.5 ${props.isMobile ? 'px-3 py-2 space-y-1' : ''}`}>

                    {/* 1. THẺ THÔNG TIN NGƯỜI IN */}
                    <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-1.5">
                                <UserIcon className="h-4 w-4 text-sky-600" />
                                <label htmlFor="employee-name-input" className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                                    Thông tin người in <span className="text-rose-500">*</span>
                                </label>
                            </div>
                            {isAdmin && (
                                <Button
                                    variant="ghost"
                                    onClick={props.onClearAll}
                                    className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0 text-inherit flex items-center gap-1 text-[11px] font-semibold text-rose-500 hover:text-rose-700 hover:bg-rose-50 px-2 py-0.5 rounded-md transition-colors"
                                    title="Xóa toàn bộ dữ liệu tồn kho và giá trên hệ thống"
                                >
                                    <Trash2 className="h-3 w-3" />
                                    Xóa DL
                                </Button>
                            )}
                        </div>
                        {props.isEditingEmployeeName || !props.employeeName ? (
                            <div>
                                <input
                                    id="employee-name-input"
                                    type="text"
                                    placeholder="Nhập tên / mã nhân viên..."
                                    value={props.employeeName}
                                    onChange={props.onEmployeeNameChange}
                                    onBlur={props.onSaveEmployeeName}
                                    onKeyDown={props.onEmployeeNameKeyDown}
                                    className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition ${isEmployeeNameEmpty ? 'border-rose-300 bg-rose-50/50 placeholder-rose-300' : 'border-slate-300'}`}
                                    autoFocus={!props.employeeName}
                                />
                                {isEmployeeNameEmpty && (
                                    <p className="text-[11px] text-rose-500 mt-1 font-medium">* Bắt buộc nhập trước khi tìm kiếm</p>
                                )}
                            </div>
                        ) : (
                            <div className="flex items-center justify-between bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
                                <p className="font-bold text-sm sm:text-base text-slate-900 truncate" title={props.employeeName}>
                                    {props.employeeName}
                                </p>
                                <Button
                                    variant="ghost"
                                    onClick={() => props.onSetIsEditingEmployeeName(true)}
                                    className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0 text-xs font-bold text-sky-600 hover:underline shrink-0 ml-2"
                                >
                                    Sửa tên
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* 2. ADMIN: UPLOAD SECTION */}
                    {isAdmin && (
                        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-2.5">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide">Nhập dữ liệu (Admin)</h3>
                                <div className="flex items-center gap-1.5">
                                    <a 
                                        href="https://report.mwgroup.vn/home/dashboard/4286" 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-xs font-bold text-rose-600 underline hover:text-rose-800"
                                    >
                                        Lấy File Tồn Kho
                                    </a>
                                    <Button
                                        variant="ghost"
                                        onClick={props.onOpenUserGuide}
                                        className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0.5 text-slate-400 hover:text-sky-600 rounded-full transition-colors"
                                        title="Xem hướng dẫn"
                                    >
                                        <Info className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="relative">
                                    <input type="file" id="inventory-file-input" onChange={props.onInventoryFileChange} accept=".xlsx, .xls" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" disabled={props.isLoading} />
                                    <label
                                        htmlFor="inventory-file-input"
                                        className={`flex items-center gap-2 py-2.5 px-3 rounded-xl border transition-all cursor-pointer ${props.isLoading ? 'bg-slate-50 border-slate-200 opacity-50' : 'bg-sky-50 border-sky-200 hover:border-sky-400 text-sky-700 hover:bg-sky-100'}`}
                                    >
                                        <InventoryIcon className="h-4 w-4 shrink-0 text-sky-600" />
                                        <div className="min-w-0">
                                            <span className="text-xs font-bold block leading-tight">Tồn Kho</span>
                                            {props.inventoryUploadTimestamp && (
                                                <span className="text-[10px] opacity-70 block leading-tight font-medium mt-0.5">
                                                    {props.inventoryUploadTimestamp.toLocaleTimeString('vi-VN')}
                                                </span>
                                            )}
                                        </div>
                                    </label>
                                </div>
                                <div className="relative">
                                    <input type="file" id="price-file-input" onChange={props.onFileChange} accept=".xlsx, .xls" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" disabled={props.isLoading} multiple />
                                    <label
                                        htmlFor="price-file-input"
                                        className={`flex items-center gap-2 py-2.5 px-3 rounded-xl border transition-all cursor-pointer ${props.isLoading ? 'bg-slate-50 border-slate-200 opacity-50' : 'bg-emerald-50 border-emerald-200 hover:border-emerald-400 text-emerald-700 hover:bg-emerald-100'}`}
                                    >
                                        <FilePlusIcon className="h-4 w-4 shrink-0 text-emerald-600" />
                                        <div className="min-w-0">
                                            <span className="text-xs font-bold block leading-tight">Bảng Giá</span>
                                            {props.uploadTimestamp && (
                                                <span className="text-[10px] opacity-70 block leading-tight font-medium mt-0.5">
                                                    {props.uploadTimestamp.toLocaleTimeString('vi-VN')}
                                                </span>
                                            )}
                                        </div>
                                    </label>
                                </div>
                            </div>

                            {/* Nút Người dùng & SuperAdmin */}
                            <div className="grid grid-cols-2 gap-2 pt-1">
                                {isAdmin && props.onOpenUserManagement && (
                                    <Button
                                        variant="ghost"
                                        onClick={props.onOpenUserManagement}
                                        className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0 flex items-center justify-center gap-1.5 py-2 px-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg transition-colors text-xs font-semibold border border-slate-200"
                                    >
                                        <UserIcon className="h-3.5 w-3.5" />
                                        Người dùng
                                    </Button>
                                )}
                                {props.onOpenSuperAdminTools && (
                                    <Button
                                        variant="ghost"
                                        onClick={props.onOpenSuperAdminTools}
                                        className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0 flex items-center justify-center gap-1.5 py-2 px-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg transition-colors text-xs font-bold border border-rose-100"
                                    >
                                        <ShieldAlert className="h-3.5 w-3.5" />
                                        Super Admin
                                    </Button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Manager instructions */}
                    {isAdmin && props.showManagerInstructions && (
                        <div className="bg-sky-50 border border-sky-100 rounded-xl p-3.5 relative">
                            <Button variant="ghost" onClick={props.onCloseInstructions} className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0 absolute top-2.5 right-2.5 text-sky-400 hover:text-sky-700">
                                <TrashIcon className="h-4 w-4" />
                            </Button>
                            <h3 className="text-xs font-bold text-sky-900 mb-2 flex items-center gap-1.5">
                                <ShieldAlert className="h-4 w-4" />
                                Hướng dẫn Quản lý
                            </h3>
                            <div className="space-y-1.5 text-[11px] leading-relaxed text-sky-800">
                                <p><strong>B1:</strong> Click <span className="text-rose-600 font-bold">"Lấy file tồn kho"</span> &gt; Chọn nhóm cần in: ĐGD, DCNB, Phụ Kiện &gt; Chọn siêu thị &gt; Trạng thái MỚI &gt; Xem báo cáo &gt; Tải file.</p>
                                <p><strong>B2:</strong> Upload file vào <strong>"Tồn Kho"</strong>.</p>
                                <p><strong>B3:</strong> Chờ xử lý =&gt; <span className="text-emerald-600 font-bold">File mẫu tự động tải xuống.</span></p>
                                <p><strong>B4:</strong> Vào ERP &gt; In giá &gt; Từng ngành hàng &gt; Nhóm hàng: Tất cả &gt; Thêm SP &gt; Nhập Excel &gt; File mẫu B3 &gt; Mẫu in 81 &gt; In &gt; Xuất "Data-only(*.xlsx)". Sau đó tải vào <strong>"Bảng Giá"</strong>.</p>
                            </div>
                        </div>
                    )}

                    {/* 3. TÌM KIẾM SẢN PHẨM (CHỈ RENDER Ở ĐÂY KHI TRÊN DESKTOP) */}
                    {!props.isMobile && (
                        <div className={`pt-2 border-t border-slate-100 ${isEmployeeNameEmpty && !isAdmin ? "opacity-50 pointer-events-none grayscale" : ""}`}>
                            <SearchBar
                                searchQuery={props.searchQuery}
                                onSearchChange={props.onSearchChange}
                                onIconClick={props.onOpenScanner}
                                disabled={props.isLoading || (isEmployeeNameEmpty && !isAdmin)}
                                suggestions={props.suggestions}
                                onSuggestionClick={props.onSuggestionClick}
                                showNoResults={props.showNoResults}
                                isMobile={false}
                            />
                        </div>
                    )}

                    {/* 4. LƯỚI PHÍM TẮT THAO TÁC & TIỆN ÍCH */}
                    {!props.isLoading && (
                        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide">Công cụ nhanh</h3>
                                <Button
                                    variant="ghost"
                                    onClick={props.onSaveUserState}
                                    disabled={props.displayedProducts.length === 0}
                                    className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0 text-[10px] font-bold text-sky-600 bg-sky-50 px-2 py-0.5 rounded-md hover:bg-sky-100 transition-colors border border-sky-100 disabled:opacity-40"
                                    title="Đồng bộ danh sách hiện tại lên Cloud"
                                >
                                    <Cloud className="w-3 h-3 inline mr-1" />
                                    Đồng bộ Cloud
                                </Button>
                            </div>

                            {/* Nút nhập sản phẩm thủ công */}
                            <Button 
                                variant="ghost" 
                                onClick={props.onOpenManualInput} 
                                title="Nhập sản phẩm thủ công để in" 
                                className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-full inline-flex items-center gap-2 justify-center rounded-xl text-xs font-bold border border-sky-200 bg-sky-50/60 hover:bg-sky-100 text-sky-700 h-10 px-3 transition-colors active:scale-98"
                            >
                                <PenSquareIcon className="h-4 w-4 text-sky-600" /> Nhập sản phẩm thủ công
                            </Button>

                            {/* Lưới các nút phụ 2 cột */}
                            <div className="grid grid-cols-2 gap-2">
                                <Button 
                                    variant="ghost" 
                                    onClick={props.onSaveList} 
                                    disabled={props.displayedProducts.length === 0} 
                                    title="Lưu danh sách" 
                                    className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto inline-flex items-center gap-1.5 justify-center rounded-xl text-xs font-semibold border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 h-9 px-2 disabled:opacity-50 transition-colors active:scale-95"
                                >
                                    <Save className="h-3.5 w-3.5 text-slate-500" /> Lưu DS
                                </Button>
                                <Button 
                                    variant="ghost" 
                                    onClick={props.onViewSavedLists} 
                                    title="Xem DS đã lưu" 
                                    className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto inline-flex items-center gap-1.5 justify-center rounded-xl text-xs font-semibold border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 h-9 px-2 transition-colors active:scale-95"
                                >
                                    <FolderOpen className="h-3.5 w-3.5 text-slate-500" /> DS đã lưu
                                </Button>
                                <Button 
                                    variant="ghost" 
                                    onClick={props.onTriggerImport} 
                                    title="Nhập file .json" 
                                    className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto inline-flex items-center gap-1.5 justify-center rounded-xl text-xs font-semibold border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 h-9 px-2 transition-colors active:scale-95"
                                >
                                    <ImportIcon className="h-3.5 w-3.5 text-slate-500" /> Nhập JSON
                                </Button>
                                <Button 
                                    variant="ghost" 
                                    onClick={props.onExport} 
                                    disabled={props.displayedProducts.length === 0} 
                                    title="Xuất file .json" 
                                    className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto inline-flex items-center gap-1.5 justify-center rounded-xl text-xs font-semibold border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 h-9 px-2 disabled:opacity-50 transition-colors active:scale-95"
                                >
                                    <ExportIcon className="h-3.5 w-3.5 text-slate-500" /> Xuất JSON
                                </Button>
                                <Button 
                                    variant="ghost" 
                                    onClick={props.onOpenPrintSettings} 
                                    title="Cài đặt in" 
                                    className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto inline-flex items-center gap-1.5 justify-center rounded-xl text-xs font-semibold border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 h-9 px-2 transition-colors active:scale-95"
                                >
                                    <SettingsIcon className="h-3.5 w-3.5 text-slate-500" /> Cài đặt in
                                </Button>
                                <Button 
                                    variant="ghost" 
                                    onClick={props.onReset} 
                                    disabled={props.displayedProducts.length === 0} 
                                    title="Xóa danh sách đang hiển thị" 
                                    className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto inline-flex items-center gap-1.5 justify-center rounded-xl text-xs font-semibold border border-slate-200 bg-slate-50 hover:bg-rose-50 hover:border-rose-200 text-rose-600 h-9 px-2 disabled:opacity-40 transition-colors active:scale-95"
                                >
                                    <TrashIcon className="h-3.5 w-3.5 text-rose-500" /> Xóa DS
                                </Button>
                            </div>

                            {/* 5. KHU VỰC IN ẤN CHÍNH */}
                            <div className="pt-2 border-t border-slate-100 space-y-2">
                                <Button 
                                    variant="ghost" 
                                    onClick={props.onPrintSelected} 
                                    disabled={selectedCount === 0} 
                                    className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-full inline-flex items-center gap-2 justify-center rounded-xl text-sm font-black bg-gradient-to-r from-sky-600 to-sky-700 text-white hover:from-sky-700 hover:to-sky-800 h-11 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm shadow-sky-500/20 active:scale-98"
                                >
                                    <PrintIcon className="h-4 w-4" /> In đã chọn ({selectedCount})
                                </Button>
                                <Button 
                                    variant="ghost" 
                                    onClick={props.onPrintAll} 
                                    disabled={props.displayedProducts.length === 0} 
                                    className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-full inline-flex items-center gap-2 justify-center rounded-xl text-sm font-bold border-2 border-sky-500 text-sky-600 bg-sky-50/80 hover:bg-sky-100 h-11 disabled:opacity-40 disabled:cursor-not-allowed transition-colors active:scale-98"
                                >
                                    In tất cả ({props.displayedProducts.length})
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