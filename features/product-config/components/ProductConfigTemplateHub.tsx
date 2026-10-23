import React from 'react';
import { AppIcon } from '../../../components/shared/ui/icon/AppIcon';
import { Button } from '../../../components/shared/ui/Button';

interface ProductConfigTemplateHubProps {
    onDownloadCategoryTemplate: () => void;
    onDownloadProductCodeTemplate: () => void;
    onDownloadHtxTemplate: () => void;
}

export const ProductConfigTemplateHub: React.FC<ProductConfigTemplateHubProps> = ({
    onDownloadCategoryTemplate,
    onDownloadProductCodeTemplate,
    onDownloadHtxTemplate,
}) => {
    return (
        <div className="space-y-4">
            {/* Header giới thiệu */}
            <div className="bg-sky-50/70 dark:bg-sky-950/30 border border-sky-200/80 dark:border-sky-800/60 rounded-card p-3 sm:p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-sky-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                        <AppIcon name="download" size="sm" />
                    </div>
                    <div>
                        <h3 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                            <span>Tải File Mẫu Chuẩn Excel Hệ Thống</span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 dark:bg-sky-900/60 dark:text-sky-300 border border-sky-200 dark:border-sky-700">
                                3 File Mẫu
                            </span>
                        </h3>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            Tải file Excel mẫu chuẩn được định dạng sẵn cấu trúc cột để nhập liệu hoặc tải lên hệ thống.
                        </p>
                    </div>
                </div>
            </div>

            {/* Lưới 3 thẻ file mẫu gọn gàng (Không bảng ví dụ dài dòng) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* THẺ 1: File mẫu Khai báo ngành hàng */}
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-card shadow-xs overflow-hidden flex flex-col justify-between p-4 sm:p-5 hover:border-emerald-300 dark:hover:border-emerald-700 transition-all">
                    <div>
                        <div className="flex items-center gap-3 mb-2.5">
                            <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200 dark:border-emerald-800 shrink-0">
                                <AppIcon name="table" size="sm" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
                                    1. Mẫu Khai Báo Ngành Hàng
                                </h4>
                                <p className="text-[11px] text-slate-400 font-mono truncate">
                                    Mau_Khai_Bao_Nganh_Hang.xlsx
                                </p>
                            </div>
                        </div>

                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                            Cấu trúc chuẩn 5 cột: Ngành Hàng, Nhóm Hàng, Nhóm Cha, Nhóm Con và Hệ Số Quy Đổi (HeSoQuyDoi).
                        </p>
                    </div>

                    <div className="pt-3.5 mt-3.5 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between gap-2">
                        <span className="text-[11px] text-slate-400">Định dạng: .xlsx</span>
                        <Button
                            variant="primary"
                            size="sm"
                            type="button"
                            onClick={onDownloadCategoryTemplate}
                            className="ycx-hit gap-1.5 font-semibold shadow-2xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-control"
                        >
                            <AppIcon name="download" size="xs" />
                            <span>Tải file mẫu</span>
                        </Button>
                    </div>
                </div>

                {/* THẺ 2: File mẫu Cấu hình theo Mã sản phẩm */}
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-card shadow-xs overflow-hidden flex flex-col justify-between p-4 sm:p-5 hover:border-sky-300 dark:hover:border-sky-700 transition-all">
                    <div>
                        <div className="flex items-center gap-3 mb-2.5">
                            <div className="w-9 h-9 rounded-lg bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 flex items-center justify-center border border-sky-200 dark:border-sky-800 shrink-0">
                                <AppIcon name="template" size="sm" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
                                    2. Mẫu Cấu Hình Theo Mã Sản Phẩm
                                </h4>
                                <p className="text-[11px] text-slate-400 font-mono truncate">
                                    Mau_Cau_Hinh_Theo_Ma_San_Pham.xlsx
                                </p>
                            </div>
                        </div>

                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                            Cấu trúc chuẩn 6 cột: Mã Sản Phẩm, Tên Sản Phẩm, Hệ Số SL, Hệ Số DT, Loại và Nhóm sản phẩm.
                        </p>
                    </div>

                    <div className="pt-3.5 mt-3.5 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between gap-2">
                        <span className="text-[11px] text-slate-400">Định dạng: .xlsx</span>
                        <Button
                            variant="primary"
                            size="sm"
                            type="button"
                            onClick={onDownloadProductCodeTemplate}
                            className="ycx-hit gap-1.5 font-semibold shadow-2xs bg-sky-600 hover:bg-sky-700 text-white rounded-control"
                        >
                            <AppIcon name="download" size="xs" />
                            <span>Tải file mẫu</span>
                        </Button>
                    </div>
                </div>

                {/* THẺ 3: File mẫu Khai báo hình thức xuất */}
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-card shadow-xs overflow-hidden flex flex-col justify-between p-4 sm:p-5 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all">
                    <div>
                        <div className="flex items-center gap-3 mb-2.5">
                            <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200 dark:border-indigo-800 shrink-0">
                                <AppIcon name="viewList" size="sm" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
                                    3. Mẫu Hình Thức Xuất
                                </h4>
                                <p className="text-[11px] text-slate-400 font-mono truncate">
                                    Mau_Hinh_Thuc_Xuat.xlsx
                                </p>
                            </div>
                        </div>

                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                            Cấu trúc chuẩn 4 cột: Tên Hình Thức Xuất, Phân Loại, Tính Doanh Thu và Ghi Chú mô tả.
                        </p>
                    </div>

                    <div className="pt-3.5 mt-3.5 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between gap-2">
                        <span className="text-[11px] text-slate-400">Định dạng: .xlsx</span>
                        <Button
                            variant="primary"
                            size="sm"
                            type="button"
                            onClick={onDownloadHtxTemplate}
                            className="ycx-hit gap-1.5 font-semibold shadow-2xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-control"
                        >
                            <AppIcon name="download" size="xs" />
                            <span>Tải file mẫu</span>
                        </Button>
                    </div>
                </div>
            </div>

            {/* Hướng dẫn quy trình 3 bước */}
            <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-card p-3.5 sm:p-4">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2.5 flex items-center gap-1.5">
                    <AppIcon name="info" size="xs" className="text-sky-500" />
                    <span>Quy trình cập nhật dữ liệu cấu hình từ file Excel</span>
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs text-slate-600 dark:text-slate-400">
                    <div className="p-3 bg-white dark:bg-slate-800 rounded-control border border-slate-200/80 dark:border-slate-700/60">
                        <span className="font-bold text-sky-600 dark:text-sky-400 block mb-1">Bước 1: Tải file mẫu</span>
                        Bấm tải 1 trong 3 file mẫu chuẩn ở trên về máy tính của bạn.
                    </div>
                    <div className="p-3 bg-white dark:bg-slate-800 rounded-control border border-slate-200/80 dark:border-slate-700/60">
                        <span className="font-bold text-sky-600 dark:text-sky-400 block mb-1">Bước 2: Điền số liệu</span>
                        Mở file Excel, điền thông tin ngành hàng, mã SP hoặc hình thức xuất theo đúng cột.
                    </div>
                    <div className="p-3 bg-white dark:bg-slate-800 rounded-control border border-slate-200/80 dark:border-slate-700/60">
                        <span className="font-bold text-sky-600 dark:text-sky-400 block mb-1">Bước 3: Tải lên hệ thống</span>
                        Vào tab tương ứng, bấm nút <strong>Tải lên</strong> (icon Upload) và bấm <strong>Lưu lên Cloud</strong> để cập nhật toàn hệ thống.
                    </div>
                </div>
            </div>
        </div>
    );
};
