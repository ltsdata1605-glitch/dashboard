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
        <aside className={`w-full ${props.isMobile ? 'p-0' : 'lg:w-80 lg:flex-shrink-0 bg-white p-4 rounded-md border border-slate-200 lg:sticky lg:top-2 lg:max-h-[calc(100vh-1rem)] lg:overflow-y-auto lg:scrollbar-thin lg:scrollbar-thumb-slate-200 lg:scrollbar-track-transparent self-start space-y-4 flex flex-col'}`}>
            
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
                    <div className="bg-white p-3.5 rounded-md border border-slate-200">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-1.5">
                                <UserIcon className="h-4 w-4 text-sky-600" />
                                <label htmlFor="employee-name-input" className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                                    Thông tin người in <span className="text-rose-500">*</span>
                                </label>
                            </div>
                            {isAdmin && (
                                <Button
                                    variant="unstyled"
                                    onClick={props.onClearAll}
                                    className="flex items-center gap-1 text-[11px] font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2 py-0.5 rounded transition-colors"
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
                                    className={`w-full px-3 py-2 text-sm border rounded focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition ${isEmployeeNameEmpty ? 'border-rose-300 bg-rose-50/50 placeholder-rose-300' : 'border-slate-300'}`}
                                    autoFocus={!props.employeeName}
                                />
                                {isEmployeeNameEmpty && (
                                    <p className="text-[11px] text-rose-500 mt-1 font-medium">* Bắt buộc nhập trước khi tìm kiếm</p>
                                )}
                            </div>
                        ) : (
                            <div className="flex items-center justify-between bg-slate-50 px-3 py-2 rounded border border-slate-200">
                                <p className="font-bold text-sm sm:text-base text-slate-900 truncate" title={props.employeeName}>
                                    {props.employeeName}
                                </p>
                                <Button
                                    variant="unstyled"
                                    onClick={() => props.onSetIsEditingEmployeeName(true)}
                                    className="text-xs font-bold text-sky-700 hover:underline shrink-0 ml-2"
                                >
                                    Sửa tên
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* 2. ADMIN: UPLOAD SECTION */}
                    {isAdmin && (
                        <div className="bg-white p-3.5 rounded-md border border-slate-200 space-y-2.5">
                            <div className="flex items-center justify-between">
                                <h3 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Nhập dữ liệu (Admin)</h3>
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
                                        variant="unstyled"
                                        onClick={props.onOpenUserGuide}
                                        className="p-0.5 text-slate-400 hover:text-sky-600 rounded-full transition-colors"
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
                                        className={`flex items-center gap-2 py-2.5 px-3 rounded border transition-all cursor-pointer ${props.isLoading ? 'bg-slate-50 border-slate-200 opacity-50' : 'bg-sky-50 border-sky-200 hover:border-sky-400 text-sky-700 hover:bg-sky-100'}`}
                                    >
                                        <InventoryIcon className="h-4 w-4 shrink-0 text-sky-600" />
                                        <div className="min-w-0">
                                            <span className="text-xs font-bold block leading-tight">Tồn Kho</span>
                                            {props.inventoryUploadTimestamp && (
                                                <span className="text-[11px] opacity-70 block leading-tight font-medium mt-0.5">
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
                                        className={`flex items-center gap-2 py-2.5 px-3 rounded border transition-all cursor-pointer ${props.isLoading ? 'bg-slate-50 border-slate-200 opacity-50' : 'bg-emerald-50 border-emerald-200 hover:border-emerald-400 text-emerald-700 hover:bg-emerald-100'}`}
                                    >
                                        <FilePlusIcon className="h-4 w-4 shrink-0 text-emerald-600" />
                                        <div className="min-w-0">
                                            <span className="text-xs font-bold block leading-tight">Bảng Giá</span>
                                            {props.uploadTimestamp && (
                                                <span className="text-[11px] opacity-70 block leading-tight font-medium mt-0.5">
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
                                        variant="secondary"
                                        size="none"
                                        onClick={props.onOpenUserManagement}
                                        className="h-9 rounded text-[11px] font-semibold gap-1.5 whitespace-nowrap"
                                    >
                                        <UserIcon className="h-3.5 w-3.5" />
                                        Người dùng
                                    </Button>
                                )}
                                {props.onOpenSuperAdminTools && (
                                    <Button
                                        variant="unstyled"
                                        onClick={props.onOpenSuperAdminTools}
                                        className="h-9 flex items-center justify-center gap-1.5 rounded text-[11px] font-bold whitespace-nowrap border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 transition-colors"
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
                        <div className="bg-sky-50 border border-sky-200 rounded-md p-3.5 relative">
                            <Button variant="unstyled" onClick={props.onCloseInstructions} className="absolute top-2.5 right-2.5 text-sky-500 hover:text-sky-700">
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

                    {/* 4. CÔNG CỤ — xếp theo NHÓM VIỆC, không phải theo hàng đều nhau.
                        Thứ tự: việc làm nhiều nhất (thêm/mở danh sách) trước, dữ liệu & cài đặt
                        sau, in ở cuối vì đó là đích, và xoá tách hẳn ra để không bấm nhầm. */}
                    {!props.isLoading && (
                        <div className="bg-white p-3.5 rounded-md border border-slate-200 space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Công cụ nhanh</h3>
                                <Button
                                    variant="unstyled"
                                    onClick={props.onSaveUserState}
                                    disabled={props.displayedProducts.length === 0}
                                    className="flex items-center gap-1 text-[11px] font-bold text-sky-700 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded hover:bg-sky-100 transition-colors disabled:opacity-40"
                                    title="Đồng bộ danh sách hiện tại lên Cloud"
                                >
                                    <Cloud className="w-3 h-3" />
                                    Đồng bộ Cloud
                                </Button>
                            </div>

                            {/* NHÓM 1 — Danh sách đang in */}
                            <div className="space-y-2">
                                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Danh sách</p>
                                <Button
                                    variant="outline"
                                    size="none"
                                    onClick={props.onOpenManualInput}
                                    title="Nhập sản phẩm thủ công để in"
                                    className="w-full h-10 rounded text-xs font-bold gap-2 bg-sky-50/60 hover:bg-sky-100"
                                >
                                    <PenSquareIcon className="h-4 w-4" /> Nhập sản phẩm thủ công
                                </Button>
                                <div className="grid grid-cols-2 gap-2">
                                    <Button
                                        variant="secondary"
                                        size="none"
                                        onClick={props.onSaveList}
                                        disabled={props.displayedProducts.length === 0}
                                        title="Lưu danh sách hiện tại"
                                        className="h-9 rounded text-xs font-semibold gap-1.5"
                                    >
                                        <Save className="h-3.5 w-3.5 text-slate-500" /> Lưu DS
                                    </Button>
                                    <Button
                                        variant="secondary"
                                        size="none"
                                        onClick={props.onViewSavedLists}
                                        title="Mở danh sách đã lưu"
                                        className="h-9 rounded text-xs font-semibold gap-1.5"
                                    >
                                        <FolderOpen className="h-3.5 w-3.5 text-slate-500" /> DS đã lưu
                                    </Button>
                                </div>
                            </div>

                            {/* NHÓM 2 — Dữ liệu & cài đặt: dùng thưa hơn nên để nhỏ hơn một bậc */}
                            <div className="space-y-2 pt-1">
                                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Dữ liệu &amp; cài đặt</p>
                                <div className="grid grid-cols-3 gap-2">
                                    <Button
                                        variant="secondary"
                                        size="none"
                                        onClick={props.onTriggerImport}
                                        title="Nhập danh sách từ tệp .json"
                                        className="h-8 rounded text-[11px] font-semibold gap-1"
                                    >
                                        <ImportIcon className="h-3.5 w-3.5 text-slate-500" /> Nhập
                                    </Button>
                                    <Button
                                        variant="secondary"
                                        size="none"
                                        onClick={props.onExport}
                                        disabled={props.displayedProducts.length === 0}
                                        title="Xuất danh sách ra tệp .json"
                                        className="h-8 rounded text-[11px] font-semibold gap-1"
                                    >
                                        <ExportIcon className="h-3.5 w-3.5 text-slate-500" /> Xuất
                                    </Button>
                                    <Button
                                        variant="secondary"
                                        size="none"
                                        onClick={props.onOpenPrintSettings}
                                        title="Cài đặt khổ in, mẫu tem"
                                        className="h-8 rounded text-[11px] font-semibold gap-1"
                                    >
                                        <SettingsIcon className="h-3.5 w-3.5 text-slate-500" /> Cài đặt
                                    </Button>
                                </div>
                            </div>

                            {/* NHÓM 3 — IN: đích cuối của cả màn hình, để nổi nhất và tách bằng đường kẻ */}
                            <div className="pt-2.5 border-t border-slate-200 space-y-2">
                                <Button
                                    variant="primary"
                                    size="none"
                                    onClick={props.onPrintSelected}
                                    disabled={selectedCount === 0}
                                    className="w-full h-11 rounded text-sm font-bold gap-2"
                                >
                                    <PrintIcon className="h-4 w-4" /> In đã chọn ({selectedCount})
                                </Button>
                                <Button
                                    variant="outline"
                                    size="none"
                                    onClick={props.onPrintAll}
                                    disabled={props.displayedProducts.length === 0}
                                    className="w-full h-10 rounded text-sm font-bold"
                                >
                                    In tất cả ({props.displayedProducts.length})
                                </Button>
                            </div>

                            {/* NHÓM 4 — Xoá: hành động không lấy lại được, tách hẳn xuống dưới và
                                để nhỏ nhất, tránh nằm cạnh nút In rồi bấm nhầm. */}
                            <Button
                                variant="unstyled"
                                onClick={props.onReset}
                                disabled={props.displayedProducts.length === 0}
                                title="Xoá danh sách đang hiển thị"
                                className="w-full flex items-center justify-center gap-1.5 h-8 rounded text-[11px] font-semibold text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-40"
                            >
                                <TrashIcon className="h-3.5 w-3.5" /> Xoá danh sách
                            </Button>
                        </div>
                    )}
                </div>
            )}
        </aside>
    );
};

export default ControlPanel;