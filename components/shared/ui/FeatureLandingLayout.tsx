import React from 'react';
import { AppIcon } from './icon/AppIcon';

export interface FeatureLandingLayoutProps {
    title?: React.ReactNode;
    subtitle?: React.ReactNode;
    children: React.ReactNode;
    maxWidth?: string;
    trustIndicators?: React.ReactNode;
    className?: string;
}

/** Dòng cam kết chân màn chào — tiếng Việt (lỗi #25, video v1:013: trước là "Local Processing • Instant Speed • Smart UI"). */
export const CamKetChanTrang: React.FC = () => (
    <div className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-center text-slate-500">
        <span className="flex items-center gap-1.5">
            <AppIcon name="securityOk" size="sm" className="text-slate-400" />
            <span className="text-[12px] font-medium">Xử lý trên máy</span>
        </span>
        <span aria-hidden="true" className="w-1 h-1 rounded-full bg-slate-300" />
        <span className="flex items-center gap-1.5">
            <AppIcon name="quick" size="sm" className="text-slate-400" />
            <span className="text-[12px] font-medium">Tức thì</span>
        </span>
        <span aria-hidden="true" className="w-1 h-1 rounded-full bg-slate-300" />
        <span className="flex items-center gap-1.5">
            <AppIcon name="sparkles" size="sm" className="text-slate-400" />
            <span className="text-[12px] font-medium">Gọn gàng</span>
        </span>
    </div>
);

/**
 * FeatureLandingLayout — MỘT màn chào / trạng thái chưa có dữ liệu cho mọi phân hệ (Phân tích, Report BI…).
 *
 * GĐ6 (2026-10-13): gom bản riêng của Phân tích (`LandingPageView`) về đây và áp quyết định A22 chủ dự án đã duyệt cho cả hai:
 * BỎ 3 quầng sáng blur 100px nhấp nháy vô hạn và khung kính mờ + quầng sáng khi rê chuột (trang trí thuần, tốn GPU/pin trên
 * máy siêu thị và iPhone) → lưới nền mờ + khung phẳng viền mảnh. Câu phụ mặc định bỏ lời hứa SAI "…không lưu trữ dữ liệu"
 * (dữ liệu bán hàng CÓ đồng bộ lên tài khoản để nhân viên cùng Kho xem). Dòng cam kết chân trang bằng tiếng Việt.
 */
export const FeatureLandingLayout: React.FC<FeatureLandingLayoutProps> = ({
    title,
    subtitle,
    children,
    maxWidth = 'max-w-2xl',
    trustIndicators,
    className = ''
}) => {
    return (
        <div className={`relative min-h-[calc(100vh-120px)] flex flex-col justify-center items-center overflow-hidden font-sans bg-slate-50 selection:bg-sky-500/20 selection:text-sky-700 pb-8 ${className}`}>
            {/* Lưới nền mờ */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none"></div>

            <div className="relative z-10 w-full max-w-[1000px] px-4 sm:px-6 flex flex-col items-center text-center mt-4">
                <div className="mb-4">
                    <h1 className="text-[28px] sm:text-[34px] lg:text-[2.8rem] font-extrabold tracking-tight text-slate-900 leading-[1.1] mb-3">
                        {title || (
                            <>
                                Dữ liệu phức tạp.<br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-600 via-rose-600 to-sky-600">
                                    Phân tích siêu tốc.
                                </span>
                            </>
                        )}
                    </h1>
                    <p className="text-[13px] sm:text-[15px] leading-5 text-slate-600 max-w-xl mx-auto">
                        {subtitle || (
                            <>
                                Chuyển hàng chục nghìn dòng Excel thành báo cáo quản trị đầy đủ.<br className="hidden sm:block" />
                                {' '}Xử lý ngay trên trình duyệt, có kết quả sau vài giây.
                            </>
                        )}
                    </p>
                </div>

                {/* Khung thao tác: phẳng, viền mảnh (A22) */}
                <div className={`w-full ${maxWidth}`}>
                    <div className="bg-white rounded-card overflow-hidden border border-slate-200 p-5">
                        {children}
                    </div>
                </div>

                {trustIndicators ?? <CamKetChanTrang />}
            </div>
        </div>
    );
};
