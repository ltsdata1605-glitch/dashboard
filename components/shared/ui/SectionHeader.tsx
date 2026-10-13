import { cn } from './Button';
import { Button } from './Button';
import { AppIcon } from './icon/AppIcon';
import type { IconName } from './icon/iconRegistry';
import { resolveIconName } from './icon/legacyIconNames';
import { ActionMenu, type ActionMenuItem } from './ActionMenu';

interface SectionHeaderProps {
    title: React.ReactNode;
    /** Tên chức năng (iconRegistry); tên kiểu cũ vẫn nhận qua lớp chuyển tiếp. */
    icon?: IconName | string | null;
    subtitle?: React.ReactNode;
    /** Vùng nút tự dựng (cách cũ) — trên iPhone tự xuống hàng khi chật. Màn mới dùng `quick` + `actions`. */
    children?: React.ReactNode;
    /** Tối đa 2 nút icon hiện thẳng (vd Lọc, Xuất ảnh) — thừa thì tự dồn vào "⋯". */
    quick?: ActionMenuItem[];
    /** Thao tác còn lại → menu "⋯" (mục `destructive` tự xuống cuối, chữ đỏ). */
    actions?: ActionMenuItem[];
    onClick?: (e: React.MouseEvent) => void;
    className?: string;
    titleClassName?: string;
}

/**
 * Header chuẩn cho mọi "Card section" (KPI / Chart / Table…).
 *
 * v2 (GĐ3 2026-10-11, KE_HOACH_GIAO_DIEN_APPLE.md mục 3.10): tiêu đề `headline` 17px (laptop 16px) đậm vừa, VIẾT THƯỜNG
 * như câu — không còn IN HOA ép bằng CSS (lỗi #13/#14: ~30 cỡ chữ, 551 chỗ in hoa, mắt không biết đọc gì trước); phụ đề
 * `subhead` 13px xám; đường kẻ dưới mảnh một màu (bỏ viền gradient). Vùng phải:
 *  - `quick` + `actions` (khuyên dùng): ≤ 2 nút icon + "⋯" → LUÔN MỘT HÀNG, không bao giờ rớt dòng ở iPhone.
 *  - `children` (cách cũ): giữ nguyên hành vi tự xuống hàng để các màn chưa chuyển không vỡ.
 * Breakpoint chính lg = 1024px (mobile < lg, laptop ≥ lg). Icon chip là tuỳ chọn.
 */
export const SectionHeader: React.FC<SectionHeaderProps> = ({ title, icon, subtitle, children, quick, actions, onClick, className = '', titleClassName }) => {
    const nhanh = (quick ?? []).slice(0, 2);
    const vaoMenu = [...(quick ?? []).slice(2), ...(actions ?? [])];
    const kieuMoi = nhanh.length > 0 || vaoMenu.length > 0;
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
            className={cn(
                "px-3 py-2 lg:px-4 lg:py-3 flex flex-row justify-between items-center gap-2 border-b border-slate-100 dark:border-slate-800",
                kieuMoi ? "flex-nowrap" : "flex-wrap",
                className,
            )}
        >
            <div className="flex items-center gap-2.5 lg:gap-3 min-w-0 flex-1">
                {icon && (
                    <div className="w-8 h-8 lg:w-9 lg:h-9 rounded-control bg-sky-50 dark:bg-sky-500/15 text-sky-700 dark:text-sky-400 flex items-center justify-center shrink-0">
                        <AppIcon name={resolveIconName(icon) ?? 'help'} size="md" />
                    </div>
                )}
                <div className="min-w-0 flex-1">
                    <h2 className={titleClassName || "type-headline font-semibold text-slate-900 dark:text-slate-100 truncate"}>{title}</h2>
                    {/* Phụ đề nhỏ gọn (chủ dự án 2026-10-11: "nhỏ gọn thanh thoát") nhưng không dưới thang chữ: footnote 12px,
                        viết thường, xám. Điện thoại tối đa 2 dòng ("Lọc theo kho: tất cả | T…" từng mất phần khoảng thời
                        gian, dữ liệu thật 2026-09-28); laptop 1 dòng. */}
                    {subtitle && <div className="type-footnote font-normal text-slate-500 dark:text-slate-400 line-clamp-2 lg:truncate">{subtitle}</div>}
                </div>
            </div>
            {kieuMoi ? (
                <div className="flex items-center gap-0.5 shrink-0 ml-auto" onClick={(e) => e.stopPropagation()}>
                    {nhanh.map(it => (
                        <Button key={it.id} variant="ghost" size="icon" onClick={it.onSelect} disabled={it.disabled}
                            aria-label={it.label} title={it.label} data-testid={it.testId}
                            className="min-h-11 min-w-11 lg:min-h-9 lg:min-w-9 rounded-full text-slate-600">
                            <AppIcon name={it.icon ?? 'more'} size="lg" />
                        </Button>
                    ))}
                    {vaoMenu.length > 0 && <ActionMenu items={vaoMenu} />}
                </div>
            ) : (
                /* flex-wrap ở hàng ngoài + max-w-full ở đây: khi tiêu đề và cụm nút không đủ chỗ chung một
                   hàng (iPhone), cụm nút xuống hàng riêng thay vì bóp tiêu đề; max-w-full giữ cụm nút không
                   vượt khung để thanh cuộn ngang bên trong (nếu có) còn chạy. */
                children && <div className="flex items-center gap-0.5 lg:gap-2 shrink-0 max-w-full ml-auto">{children}</div>
            )}
        </div>
    );
};
