import { cn } from './Button';
import { AppIcon } from './icon/AppIcon';
import type { IconName } from './icon/iconRegistry';
import { resolveIconName } from './icon/legacyIconNames';

interface SectionHeaderProps {
    title: React.ReactNode;
    /** Tên chức năng (iconRegistry); tên kiểu cũ vẫn nhận qua lớp chuyển tiếp. */
    icon?: IconName | string | null;
    subtitle?: React.ReactNode;
    children?: React.ReactNode;
    onClick?: (e: React.MouseEvent) => void;
    className?: string;
    titleClassName?: string;
}

/**
 * Header chuẩn cho mọi "Card section" (KPI/Chart/Table...) — tiêu đề,
 * vùng actions phải (children, nên dùng kỹ thuật "double-icon" cho responsive, xem
 * DESIGN_SYSTEM_MODERN.md §2). Breakpoint chính lg=1024px (mobile < lg, laptop >= lg).
 * Icon chip là tuỳ chọn (optional).
 */
export const SectionHeader: React.FC<SectionHeaderProps> = ({ title, icon, subtitle, children, onClick, className = '', titleClassName }) => {
    return (
        <div 
            onClick={onClick}
            role={onClick ? 'button' : undefined}
            tabIndex={onClick ? 0 : undefined}
            onKeyDown={onClick ? (e) => { 
                if (e.key === 'Enter' || e.key === ' ') { 
                    e.preventDefault(); 
                    onClick(e as any); 
                } 
            } : undefined}
            className={cn("px-2 py-1.5 lg:px-4 lg:py-2.5 flex flex-row flex-wrap justify-between items-center gap-1.5 lg:gap-2 border-b border-slate-100 dark:border-slate-800", className)} 
            style={{ borderImage: 'linear-gradient(to right, rgba(99,102,241,0.15), rgba(14,165,233,0.1), transparent) 1' }}
        >
            <div className="flex items-center gap-1.5 lg:gap-3 min-w-0">
                {icon && (
                    <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-lg lg:rounded-xl bg-sky-600/10 dark:bg-sky-500/15 text-sky-700 dark:text-sky-400 flex items-center justify-center shrink-0">
                        <AppIcon name={resolveIconName(icon) ?? 'help'} size="lg" />
                    </div>
                )}
                <div className="min-w-0">
                    <h2 className={titleClassName || "text-sm lg:text-lg font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wide truncate leading-tight"}>{title}</h2>
                    {/* Điện thoại: tối đa 2 dòng thay vì cắt 1 dòng — "LỌC THEO KHO: TẤT CẢ | T…" mất hẳn
                        phần khoảng thời gian (iPhone, dữ liệu thật 2026-09-28). Desktop giữ 1 dòng. */}
                    {subtitle && <div className="text-[11px] lg:text-[11px] font-normal text-slate-400 dark:text-slate-400 uppercase tracking-wider line-clamp-2 leading-tight lg:truncate lg:leading-none mt-0.5">{subtitle}</div>}
                </div>
            </div>
            {/* flex-wrap ở hàng ngoài + max-w-full ở đây: khi tiêu đề và cụm nút không đủ chỗ chung một
                hàng (iPhone), cụm nút xuống hàng riêng thay vì bóp tiêu đề thành "CẤU HÌNH SIÊU THỊ & …";
                max-w-full giữ cụm nút không vượt khung để thanh cuộn ngang bên trong (nếu có) còn chạy. */}
            {children && <div className="flex items-center gap-0.5 lg:gap-2 shrink-0 max-w-full ml-auto">{children}</div>}
        </div>
    );
};
