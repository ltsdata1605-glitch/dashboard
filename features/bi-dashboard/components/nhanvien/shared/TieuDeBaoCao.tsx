import React from 'react';

/**
 * Đầu báo cáo của các tab Nhân viên (Doanh thu, Trả chậm, Thưởng, Thi đua) — trước là 4 bản chép tay, 2 bản để khẩu hiệu 8.5px
 * trên điện thoại (dưới sàn 11px). GĐ6 (lỗi #24, video v2:082): điện thoại hiện khẩu hiệu viết như câu, 12px, tối đa 2 dòng;
 * laptop GIỮ kiểu của chủ dự án (IN HOA 11px giãn chữ). Khối này nằm trong vùng xuất ảnh — tiêu đề giữ nguyên.
 */
export const TieuDeBaoCao: React.FC<{ title: React.ReactNode; subtitle: React.ReactNode }> = ({ title, subtitle }) => (
    <div className="px-4 sm:px-5 pt-3.5 pb-2.5 border-b border-slate-200/70 dark:border-slate-800/80 bg-white dark:bg-slate-900">
        <h2 className="text-sm sm:text-[15px] lg:text-[17px] font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wide leading-tight">
            {title}
        </h2>
        <div className="type-footnote lg:text-[11px] lg:uppercase lg:tracking-wider font-medium text-slate-400 dark:text-slate-400 leading-snug mt-1 line-clamp-2 lg:line-clamp-none">
            {subtitle}
        </div>
    </div>
);

export default TieuDeBaoCao;
