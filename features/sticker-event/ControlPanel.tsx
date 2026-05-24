import React, { useMemo } from 'react';
import { Product } from './types';
import FileUpload from './FileUpload';
import SearchBar from './SearchBar';
import { PrintIcon, SettingsIcon, StarIcon, TagIcon, TrashIcon, ExportIcon, ImportIcon, PenSquareIcon, InventoryIcon, FilePlusIcon, UserIcon } from './Icons';
import { Trash2, ShieldAlert, Info, Cloud, Save, FolderOpen, FileDown, FileUp } from 'lucide-react';

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
    
    return (
        <aside className={`w-full lg:w-80 lg:flex-shrink-0 bg-white p-4 rounded-xl shadow-sm border border-slate-200 lg:sticky lg:top-2 lg:max-h-[calc(100vh-1rem)] lg:overflow-y-auto lg:scrollbar-thin lg:scrollbar-thumb-slate-200 lg:scrollbar-track-transparent self-start space-y-4 ${props.isMobile && props.activeTab === 'home' ? 'contents' : 'flex flex-col'}`}>
            <div className={`flex flex-col gap-4 ${props.isMobile && props.activeTab === 'home' ? 'hidden' : ''}`}>

                {/* ───────── Thông tin người in ───────── */}
                <div>
                    <div className="flex items-center justify-between mb-1.5">
                        <label htmlFor="employee-name-input" className="text-sm font-medium text-slate-700">
                            Thông tin người in <span className="text-red-500">*</span>
                        </label>
                        {isAdmin && (
                            <button 
                                onClick={props.onClearAll}
                                className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded-md transition-colors"
                                title="Xóa toàn bộ dữ liệu tồn kho và giá trên hệ thống"
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                                Xóa dữ liệu
                            </button>
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
                                className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition ${isEmployeeNameEmpty ? 'border-red-300 bg-red-50/50 placeholder-red-300' : 'border-slate-300'}`}
                                autoFocus={!props.employeeName}
                            />
                            {isEmployeeNameEmpty && (
                                <p className="text-[11px] text-red-500 mt-1">* Bắt buộc nhập trước khi tìm kiếm</p>
                            )}
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 px-1">
                            <p className="font-bold text-base text-slate-900 truncate" title={props.employeeName}>{props.employeeName}</p>
                            <button
                                onClick={() => props.onSetIsEditingEmployeeName(true)}
                                className="text-sm text-indigo-600 hover:underline shrink-0"
                            >
                                (Sửa)
                            </button>
                        </div>
                    )}
                </div>

                {/* ───────── Admin: Upload section ───────── */}
                {isAdmin && (
                    <div className="pt-3 border-t border-slate-100">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm font-semibold text-slate-800">Nhập dữ liệu (Admin)</h3>
                            <div className="flex items-center gap-1">
                                <a 
                                    href="https://report.mwgroup.vn/home/dashboard/17" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-xs font-bold text-red-600 underline hover:text-red-800 px-1"
                                >
                                    Lấy File Tồn Kho
                                </a>
                                <button 
                                    onClick={props.onOpenUserGuide}
                                    className="p-1 text-slate-400 hover:text-indigo-600 rounded-full transition-colors"
                                    title="Xem hướng dẫn"
                                >
                                    <Info className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div className="relative">
                                <input type="file" id="inventory-file-input" onChange={props.onInventoryFileChange} accept=".xlsx, .xls" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" disabled={props.isLoading} />
                                <label
                                    htmlFor="inventory-file-input"
                                    className={`flex items-center gap-2 py-2 px-2.5 rounded-lg border transition-all cursor-pointer ${props.isLoading ? 'bg-slate-50 border-slate-200 opacity-50' : 'bg-indigo-50 border-indigo-200 hover:border-indigo-400 text-indigo-700 hover:bg-indigo-100'}`}
                                >
                                    <InventoryIcon className="h-4 w-4 shrink-0" />
                                    <div className="min-w-0">
                                        <span className="text-[11px] font-semibold block leading-tight">Tồn Kho</span>
                                        {props.inventoryUploadTimestamp && (
                                            <span className="text-[9px] opacity-60 block leading-tight">
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
                                    className={`flex items-center gap-2 py-2 px-2.5 rounded-lg border transition-all cursor-pointer ${props.isLoading ? 'bg-slate-50 border-slate-200 opacity-50' : 'bg-emerald-50 border-emerald-200 hover:border-emerald-400 text-emerald-700 hover:bg-emerald-100'}`}
                                >
                                    <FilePlusIcon className="h-4 w-4 shrink-0" />
                                    <div className="min-w-0">
                                        <span className="text-[11px] font-semibold block leading-tight">Bảng Giá</span>
                                        {props.uploadTimestamp && (
                                            <span className="text-[9px] opacity-60 block leading-tight">
                                                {props.uploadTimestamp.toLocaleTimeString('vi-VN')}
                                            </span>
                                        )}
                                    </div>
                                </label>
                            </div>
                        </div>

                    </div>
                )}

                {/* Manager instructions */}
                {isAdmin && props.showManagerInstructions && (
                    <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 relative">
                        <button onClick={props.onCloseInstructions} className="absolute top-2.5 right-2.5 text-indigo-400 hover:text-indigo-700">
                            <TrashIcon className="h-4 w-4" />
                        </button>
                        <h3 className="text-sm font-bold text-indigo-900 mb-2 flex items-center gap-2">
                            <ShieldAlert className="h-4 w-4" />
                            Hướng dẫn Quản lý
                        </h3>
                        <div className="space-y-2.5 text-[11px] leading-relaxed text-indigo-800">
                            <p><strong>B1:</strong> Click <span className="text-red-600 font-bold">"Lấy file tồn kho"</span> &gt; Chọn nhóm cần in: ĐGD, DCNB, Phụ Kiện &gt; Chọn siêu thị &gt; Trạng thái MỚI &gt; Xem báo cáo &gt; Tải file.</p>
                            <p><strong>B2:</strong> Upload file vào <strong>"Tải File tồn kho"</strong>.</p>
                            <p><strong>B3:</strong> Chờ xử lý =&gt; <span className="text-emerald-600 font-bold">File mẫu tự động tải xuống.</span></p>
                            <p><strong>B4:</strong> Vào ERP &gt; In giá &gt; Từng ngành hàng &gt; Nhóm hàng: Tất cả &gt; Thêm SP &gt; Nhập Excel &gt; File mẫu B3 &gt; Mẫu in 81 &gt; In &gt; Xuất "Data-only(*.xlsx)". Sau đó tải vào <strong>"Tải File bảng giá"</strong>.</p>
                        </div>
                    </div>
                )}

                {/* ───────── Admin buttons — full width stacked ───────── */}
                {(isAdmin || props.onOpenSuperAdminTools) && (
                    <div className="pt-2 border-t border-slate-100">
                        <div className="grid grid-cols-2 gap-2">
                            {isAdmin && props.onOpenUserManagement && (
                                <button 
                                    onClick={props.onOpenUserManagement}
                                    className="flex items-center justify-center gap-1.5 py-2 px-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg transition-colors text-xs font-semibold border border-slate-200"
                                >
                                    <UserIcon className="h-3.5 w-3.5" />
                                    Người dùng
                                </button>
                            )}
                            {props.onOpenSuperAdminTools && (
                                <button 
                                    onClick={props.onOpenSuperAdminTools}
                                    className="flex items-center justify-center gap-1.5 py-2 px-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg transition-colors text-xs font-bold border border-red-100"
                                >
                                    <ShieldAlert className="h-3.5 w-3.5" />
                                    Super Admin
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* ───────── Tìm kiếm sản phẩm ───────── */}
            <div 
                className={`pt-2 border-t border-slate-100 ${isEmployeeNameEmpty ? "opacity-50 pointer-events-none grayscale" : ""} ${props.isMobile ? "fixed left-0 right-0 p-2 bg-white border-t border-slate-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-40" : ""}`}
                style={props.isMobile ? { bottom: 'calc(112px + env(safe-area-inset-bottom, 0px))' } : {}}
            >
                <SearchBar
                    searchQuery={props.searchQuery}
                    onSearchChange={props.onSearchChange}
                    onIconClick={props.onOpenScanner}
                    disabled={props.allProducts.length === 0 || props.isLoading || isEmployeeNameEmpty}
                    suggestions={props.suggestions}
                    onSuggestionClick={props.onSuggestionClick}
                    showNoResults={props.showNoResults}
                    isMobile={props.isMobile}
                />
            </div>

             {/* ───────── Công cụ nhanh + Thao tác ───────── */}
             {props.allProducts.length > 0 && !props.isLoading && (
                 <div className={`space-y-4 ${props.isMobile && props.activeTab === 'home' ? 'hidden' : ''}`}>

                    <div className="pt-3 border-t border-slate-100">
                         <button onClick={props.onOpenManualInput} title="Nhập sản phẩm thủ công để in" className="w-full inline-flex items-center gap-2 justify-center rounded-xl text-xs font-medium border border-slate-200 bg-slate-50 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 text-slate-700 h-10 px-3 transition-colors">
                            <PenSquareIcon className="h-4 w-4 text-blue-600" /> Nhập sản phẩm thủ công
                         </button>
                    </div>

                    {/* Thao tác */}
                    <div className="pt-3 border-t border-slate-100">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm font-semibold text-slate-800">Thao tác</h3>
                            <button 
                                onClick={props.onSaveUserState} 
                                disabled={props.displayedProducts.length === 0}
                                className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md hover:bg-indigo-100 transition-colors border border-indigo-100 uppercase tracking-wide disabled:opacity-40"
                                title="Đồng bộ lên Cloud"
                            >
                                Đồng bộ Cloud
                            </button>
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                            <button onClick={props.onSaveList} disabled={props.displayedProducts.length === 0} title="Lưu danh sách" className="flex-1 inline-flex items-center gap-1.5 justify-center rounded-xl text-xs font-medium border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 h-9 px-2 disabled:opacity-50 transition-colors">
                                Lưu DS
                            </button>
                            <button onClick={props.onViewSavedLists} title="Xem DS đã lưu" className="flex-1 inline-flex items-center gap-1.5 justify-center rounded-xl text-xs font-medium border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 h-9 px-2 transition-colors">
                                DS đã lưu
                            </button>
                        </div>
                        <div className="flex items-center gap-2 mb-3">
                            <button onClick={props.onTriggerImport} title="Nhập file .json" className="flex-1 inline-flex items-center gap-1.5 justify-center rounded-xl text-xs font-medium border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 h-9 px-2 transition-colors">
                                <ImportIcon className="h-4 w-4 text-slate-500" /> Nhập
                            </button>
                            <button onClick={props.onExport} disabled={props.displayedProducts.length === 0} title="Xuất file .json" className="flex-1 inline-flex items-center gap-1.5 justify-center rounded-xl text-xs font-medium border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 h-9 px-2 disabled:opacity-50 transition-colors">
                                <ExportIcon className="h-4 w-4 text-slate-500" /> Xuất
                            </button>
                            <button onClick={props.onReset} disabled={props.displayedProducts.length === 0} title="Xóa danh sách" className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-slate-50 hover:bg-red-50 hover:border-red-200 text-slate-500 hover:text-red-600 h-9 w-9 p-0 disabled:opacity-50 transition-colors">
                                <TrashIcon className="h-4 w-4" />
                            </button>
                             <button onClick={props.onOpenPrintSettings} title="Cài đặt in" className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-700 h-9 w-9 p-0 transition-colors">
                                <SettingsIcon className="h-4 w-4" />
                            </button>
                        </div>

                        {/* Print buttons — full width stacked */}
                        <div className="flex flex-col gap-2">
                            <button onClick={props.onPrintSelected} disabled={selectedCount === 0} className="w-full inline-flex items-center gap-2 justify-center rounded-xl text-sm font-bold bg-gradient-to-r from-indigo-600 to-indigo-700 text-white hover:from-indigo-700 hover:to-indigo-800 h-11 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-200/40">
                                <PrintIcon className="h-4 w-4" /> In đã chọn ({selectedCount})
                            </button>
                            <button onClick={props.onPrintAll} disabled={props.displayedProducts.length === 0} className="w-full inline-flex items-center gap-2 justify-center rounded-xl text-sm font-bold border-2 border-indigo-500 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 h-11 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                                In tất cả ({props.displayedProducts.length})
                            </button>
                        </div>
                    </div>
                </div>
             )}
        </aside>
    );
};

export default ControlPanel;