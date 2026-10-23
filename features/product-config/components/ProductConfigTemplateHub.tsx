import React from 'react';
import { AppIcon } from '../../../components/shared/ui/icon/AppIcon';
import { Button } from '../../../components/shared/ui/Button';
import { DEFAULT_CATEGORY_SAMPLE_ROWS, DEFAULT_PRODUCT_CODE_SAMPLE_ROWS } from '../services/firebaseProductConfigService';

interface ProductConfigTemplateHubProps {
    onDownloadCategoryTemplate: () => void;
    onDownloadProductCodeTemplate: () => void;
}

export const ProductConfigTemplateHub: React.FC<ProductConfigTemplateHubProps> = ({
    onDownloadCategoryTemplate,
    onDownloadProductCodeTemplate,
}) => {
    return (
        <div className="space-y-6">
            {/* Header giới thiệu */}
            <div className="bg-sky-50/70 dark:bg-sky-950/30 border border-sky-200/80 dark:border-sky-800/60 rounded-card p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-sky-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                        <AppIcon name="download" size="md" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                            <span>Tải File Mẫu Chuẩn Excel Hệ Thống</span>
                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 dark:bg-sky-900/60 dark:text-sky-300 border border-sky-200 dark:border-sky-700">
                                2 File Mẫu
                            </span>
                        </h3>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                            Tải file Excel mẫu chuẩn được định dạng sẵn cấu trúc cột và dữ liệu ví dụ thực tế để nhập liệu hoặc tải lên hệ thống.
                        </p>
                    </div>
                </div>
            </div>

            {/* Lưới 2 thẻ file mẫu */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* THẺ 1: File mẫu Khai báo ngành hàng */}
                <div className="bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700/80 rounded-card shadow-xs overflow-hidden flex flex-col justify-between">
                    <div className="p-4 sm:p-5">
                        <div className="flex items-start justify-between gap-2 mb-3">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200 dark:border-emerald-800">
                                    <AppIcon name="table" size="sm" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                                        1. Mẫu Khai Báo Ngành Hàng
                                    </h4>
                                    <p className="text-[11px] text-slate-400 font-mono">
                                        Mau_Khai_Bao_Nganh_Hang.xlsx
                                    </p>
                                </div>
                            </div>
                            <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-full">
                                5 Cột Chuẩn
                            </span>
                        </div>

                        <p className="text-xs text-slate-600 dark:text-slate-300 mb-3 leading-relaxed">
                            Cấu trúc chuẩn khớp 100% với danh mục ngành hàng, nhóm cha, nhóm con và hệ số quy đổi số lượng (HeSoQuyDoi).
                        </p>

                        {/* Bảng preview mẫu */}
                        <div className="border border-slate-200 dark:border-slate-700 rounded-control overflow-hidden mb-3">
                            <div className="bg-slate-100 dark:bg-slate-700/60 px-2.5 py-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                                <span>Xem trước dữ liệu mẫu (5 dòng)</span>
                                <span className="text-[10px] text-slate-400 font-normal">Sheet: Ngành hàng</span>
                            </div>
                            <div className="overflow-x-auto max-h-48 text-[11px]">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 dark:bg-slate-900/40 text-slate-600 dark:text-slate-400 text-[10px] uppercase font-bold border-b border-slate-200 dark:border-slate-700">
                                            <th className="px-2 py-1.5">NganhHang</th>
                                            <th className="px-2 py-1.5">NhomHang</th>
                                            <th className="px-2 py-1.5">NhomCha</th>
                                            <th className="px-2 py-1.5">NhomCon</th>
                                            <th className="px-2 py-1.5 text-center">HeSoQuyDoi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/40 font-mono text-[11px]">
                                        {DEFAULT_CATEGORY_SAMPLE_ROWS.map((r, i) => (
                                            <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                                                <td className="px-2 py-1 font-sans text-slate-700 dark:text-slate-300">{r[0]}</td>
                                                <td className="px-2 py-1 text-slate-800 dark:text-slate-200 font-semibold">{r[1]}</td>
                                                <td className="px-2 py-1 font-sans text-slate-600 dark:text-slate-400">{r[2]}</td>
                                                <td className="px-2 py-1 font-sans text-slate-600 dark:text-slate-400">{r[3]}</td>
                                                <td className="px-2 py-1 text-center font-bold text-emerald-600 dark:text-emerald-400">{r[4]}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    <div className="p-4 bg-slate-50/70 dark:bg-slate-900/30 border-t border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between gap-3">
                        <span className="text-[11px] text-slate-500">Định dạng file: .xlsx (Excel)</span>
                        <Button
                            variant="primary"
                            size="sm"
                            type="button"
                            onClick={onDownloadCategoryTemplate}
                            className="ycx-hit gap-1.5 font-semibold shadow-2xs bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                            <AppIcon name="download" size="xs" />
                            <span>Tải file mẫu Ngành hàng</span>
                        </Button>
                    </div>
                </div>

                {/* THẺ 2: File mẫu Cấu hình theo Mã sản phẩm */}
                <div className="bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700/80 rounded-card shadow-xs overflow-hidden flex flex-col justify-between">
                    <div className="p-4 sm:p-5">
                        <div className="flex items-start justify-between gap-2 mb-3">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 flex items-center justify-center border border-sky-200 dark:border-sky-800">
                                    <AppIcon name="template" size="sm" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                                        2. Mẫu Cấu Hình Theo Mã Sản Phẩm
                                    </h4>
                                    <p className="text-[11px] text-slate-400 font-mono">
                                        Mau_Cau_Hinh_Ma_San_Pham.xlsx
                                    </p>
                                </div>
                            </div>
                            <span className="text-[11px] font-semibold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 px-2 py-0.5 rounded-full">
                                3 Loại Hệ Số
                            </span>
                        </div>

                        <p className="text-xs text-slate-600 dark:text-slate-300 mb-3 leading-relaxed">
                            Có sẵn <strong>3 dòng mẫu</strong> minh họa rõ ràng cho 3 phân loại: <strong>Số lượng (SL)</strong>, <strong>Doanh thu (DT)</strong> và <strong>Cả hai (SL & DT)</strong>.
                        </p>

                        {/* Bảng preview mẫu */}
                        <div className="border border-slate-200 dark:border-slate-700 rounded-control overflow-hidden mb-3">
                            <div className="bg-slate-100 dark:bg-slate-700/60 px-2.5 py-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                                <span>3 Dòng mẫu cho 3 loại hệ số</span>
                                <span className="text-[10px] text-slate-400 font-normal">Sheet: Bảo Hiểm ĐMX</span>
                            </div>
                            <div className="overflow-x-auto max-h-48 text-[11px]">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 dark:bg-slate-900/40 text-slate-600 dark:text-slate-400 text-[10px] uppercase font-bold border-b border-slate-200 dark:border-slate-700">
                                            <th className="px-2 py-1.5">MÃ SẢN PHẨM</th>
                                            <th className="px-2 py-1.5">TÊN SẢN PHẨM</th>
                                            <th className="px-2 py-1.5 text-center">HỆ SỐ SL</th>
                                            <th className="px-2 py-1.5 text-center">HỆ SỐ DT</th>
                                            <th className="px-2 py-1.5">LOẠI</th>
                                            <th className="px-2 py-1.5">NHÓM</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/40 text-[11px]">
                                        {DEFAULT_PRODUCT_CODE_SAMPLE_ROWS.map((r, i) => (
                                            <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                                                <td className="px-2 py-1.5 font-mono font-bold text-slate-800 dark:text-slate-200">{r[0]}</td>
                                                <td className="px-2 py-1.5 font-sans text-slate-700 dark:text-slate-300 truncate max-w-[150px]" title={String(r[1])}>
                                                    {r[1]}
                                                </td>
                                                <td className="px-2 py-1.5 text-center font-mono font-bold text-amber-700 dark:text-amber-400">
                                                    {r[2] !== '' ? r[2] : <span className="text-slate-300 font-normal">—</span>}
                                                </td>
                                                <td className="px-2 py-1.5 text-center font-mono font-bold text-purple-700 dark:text-purple-400">
                                                    {r[3] !== '' ? r[3] : <span className="text-slate-300 font-normal">—</span>}
                                                </td>
                                                <td className="px-2 py-1.5">
                                                    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                                        r[4].includes('Số lượng')
                                                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                                                            : r[4].includes('Doanh thu')
                                                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300'
                                                            : 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300'
                                                    }`}>
                                                        {r[4]}
                                                    </span>
                                                </td>
                                                <td className="px-2 py-1.5 text-slate-500 dark:text-slate-400 text-[10px]">{r[5]}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    <div className="p-4 bg-slate-50/70 dark:bg-slate-900/30 border-t border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between gap-3">
                        <span className="text-[11px] text-slate-500">Định dạng file: .xlsx (Excel)</span>
                        <Button
                            variant="primary"
                            size="sm"
                            type="button"
                            onClick={onDownloadProductCodeTemplate}
                            className="ycx-hit gap-1.5 font-semibold shadow-2xs bg-sky-600 hover:bg-sky-700 text-white"
                        >
                            <AppIcon name="download" size="xs" />
                            <span>Tải file mẫu Mã sản phẩm</span>
                        </Button>
                    </div>
                </div>
            </div>

            {/* Hướng dẫn quy trình 3 bước */}
            <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-card p-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-1.5">
                    <AppIcon name="info" size="xs" className="text-sky-500" />
                    <span>Quy trình cập nhật dữ liệu cấu hình từ file Excel</span>
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-600 dark:text-slate-400">
                    <div className="p-3 bg-white dark:bg-slate-800 rounded-control border border-slate-200/80 dark:border-slate-700/60">
                        <span className="font-bold text-sky-600 dark:text-sky-400 block mb-1">Bước 1: Tải file mẫu</span>
                        Bấm tải 1 trong 2 file mẫu chuẩn ở trên về máy tính của bạn.
                    </div>
                    <div className="p-3 bg-white dark:bg-slate-800 rounded-control border border-slate-200/80 dark:border-slate-700/60">
                        <span className="font-bold text-sky-600 dark:text-sky-400 block mb-1">Bước 2: Điền số liệu</span>
                        Mở bằng Microsoft Excel hoặc Google Sheets, điền thông tin nhóm hàng hoặc mã SP theo đúng cấu trúc cột.
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
