import React from 'react';
import { ActionMenu } from '../shared/ui/ActionMenu';
import { Button } from '../shared/ui/Button';
import { AppIcon } from '../shared/ui/icon';
import { useCurrentPageActions } from '../shared/ui/PageActions';
import { cn } from '../shared/ui/utils';

/**
 * Nút của MÀN ĐANG HIỆN trên khung app (GĐ4, KE_HOACH_GIAO_DIEN_APPLE.md mục 3.2) — màn khai báo bằng `usePageActions()`,
 * khung app quyết định cách xếp nên không còn cảnh mỗi màn tự nhét 5–7 nút vào thanh trên rồi đè nhau (lỗi #1):
 *  - iPhone (`mobile`): [nút chính] [≤ 1 nút nhanh (2 nếu không có nút chính)] [⋯ phần còn lại] — nút 44×44, chỉ icon
 *    (giữ nhấn để đọc tên — TouchTitleHint), như thanh điều hướng iOS.
 *  - Laptop (`desktop`): nút nhanh dạng icon có chú thích + "⋯" + nút chính có chữ ở cuối.
 */
export const PageActionsBar: React.FC<{ variant: 'mobile' | 'desktop'; className?: string }> = ({ variant, className }) => {
    const c = useCurrentPageActions();
    if (!c) return null;
    const scope = c.scope ?? 'all';
    if (scope !== 'all' && scope !== variant) return null;

    const quick = c.quick ?? [];
    const soNhanh = variant === 'mobile' ? (c.primary ? 1 : 2) : 2;
    const hienNhanh = quick.slice(0, soNhanh);
    const vaoMenu = [...quick.slice(soNhanh), ...(c.items ?? [])];
    const p = c.primary;
    if (!p && hienNhanh.length === 0 && vaoMenu.length === 0) return null;

    if (variant === 'mobile') {
        const lopNut = 'ycx-hit min-h-11 min-w-11 rounded-full text-sky-600 active:bg-slate-200/70 disabled:text-slate-300';
        return (
            <div data-page-actions="mobile" className={cn('flex items-center shrink-0', className)}>
                {p && (
                    <Button variant="unstyled" size="none" onClick={p.onClick} disabled={p.disabled || p.loading}
                        aria-label={p.label} title={p.label} data-testid={p.testId}
                        className={cn(lopNut, 'flex items-center justify-center')}>
                        <AppIcon name={p.loading ? 'loading' : (p.icon ?? 'add')} size="lg" spin={p.loading} />
                    </Button>
                )}
                {hienNhanh.map(it => (
                    <Button key={it.id} variant="unstyled" size="none" onClick={it.onSelect} disabled={it.disabled}
                        aria-label={it.label} title={it.label} data-testid={it.testId}
                        className={cn(lopNut, 'flex items-center justify-center', it.destructive && 'text-rose-600')}>
                        <AppIcon name={it.icon ?? 'more'} size="lg" />
                    </Button>
                ))}
                {vaoMenu.length > 0 && (
                    <ActionMenu items={vaoMenu} title={c.title} triggerClassName="ycx-hit text-sky-600 active:bg-slate-200/70" data-testid="page-actions-more" />
                )}
            </div>
        );
    }

    return (
        <div data-page-actions="desktop" className={cn('flex items-center gap-1 shrink-0', className)}>
            {hienNhanh.map(it => (
                <Button key={it.id} variant="ghost" size="icon" onClick={it.onSelect} disabled={it.disabled}
                    aria-label={it.label} title={it.label} data-testid={it.testId}
                    className={cn('min-h-9 min-w-9 rounded-full text-slate-600', it.destructive && 'text-rose-600')}>
                    <AppIcon name={it.icon ?? 'more'} size="lg" />
                </Button>
            ))}
            {vaoMenu.length > 0 && <ActionMenu items={vaoMenu} title={c.title} data-testid="page-actions-more" />}
            {p && (
                <Button variant="primary" size="sm" onClick={p.onClick} disabled={p.disabled} isLoading={p.loading}
                    icon={p.icon} data-testid={p.testId} className="ml-1">
                    {p.label}
                </Button>
            )}
        </div>
    );
};

export default PageActionsBar;
