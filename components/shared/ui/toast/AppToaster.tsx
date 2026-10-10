import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { resolveValue, useToaster, type Toast as RhtToast } from 'react-hot-toast';
import { toast, getToastMeta, TOAST_DURATION, type ToastAction, type ToastKind } from './toast';
import { AppIcon } from '../icon/AppIcon';
import type { IconName } from '../icon/iconRegistry';
import { Button } from '../Button';
import { cn } from '../utils';

/**
 * NƠI VẼ TOAST DUY NHẤT của app (KE_HOACH_GIAO_DIEN_APPLE.md mục 3.1) — gắn một lần ở App.tsx.
 *
 * Giao diện kiểu thông báo iOS: viên nang vật liệu mờ ở TRÊN GIỮA màn hình — iPhone nằm ngay dưới tai thỏ/Dynamic Island
 * (safe-area), laptop cách mép trên 12px (vùng giữa thanh tiêu đề vốn trống). KHÔNG BAO GIỜ ở đáy: bản cũ (góc dưới-phải)
 * đè lên thanh tab của iPhone (video chủ dự án 10/10, v1:013/022/081). Không đặt góc phải trên laptop: dock Auto Sync nổi
 * bên phải và nút đóng của modal lớn nằm ở đó.
 *
 * - Tối đa 3 toast cùng lúc, mới nhất trên cùng; toast thứ 4 trở đi chờ tới lượt (không bị huỷ).
 * - Vuốt lên (iPhone) / vuốt ngang (laptop) để tắt; chạm giữ / rê chuột → dừng đếm giờ.
 * - Toast có nút (`toast.action`, ShareRetry…) không tự tắt; nút × luôn có trên laptop, trên điện thoại chỉ hiện với toast
 *   tồn tại lâu (lỗi, có nút, > 6s) — toast ngắn thì vuốt là đủ.
 */

const MAX_VISIBLE = 3;
const GUTTER = 8;

const KIND_ICON: Record<ToastKind, IconName> = { success: 'success', error: 'error', info: 'info', warning: 'warning', loading: 'loading' };
const KIND_COLOR: Record<ToastKind, string> = {
    success: 'text-emerald-600',
    error: 'text-rose-600',
    info: 'text-sky-600',
    warning: 'text-amber-600',
    loading: 'text-sky-600',
};

function useMedia(query: string): boolean {
    const [match, setMatch] = useState(() => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(query).matches);
    useEffect(() => {
        if (typeof window.matchMedia !== 'function') return;
        const mq = window.matchMedia(query);
        const onChange = () => setMatch(mq.matches);
        onChange();
        mq.addEventListener?.('change', onChange);
        return () => mq.removeEventListener?.('change', onChange);
    }, [query]);
    return match;
}

interface ToastItemProps {
    t: RhtToast;
    offset: number;
    isDesktop: boolean;
    reduceMotion: boolean;
    onHeight: (id: string, height: number) => void;
    onPause: () => void;
    onResume: () => void;
}

const ToastItem: React.FC<ToastItemProps> = React.memo(({ t, offset, isDesktop, reduceMotion, onHeight, onPause, onResume }) => {
    const ref = useRef<HTMLDivElement>(null);
    const meta = getToastMeta(t);
    const [entered, setEntered] = useState(false);
    const [tall, setTall] = useState(false);
    const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
    const [flyOut, setFlyOut] = useState<'up' | 'left' | 'right' | null>(null);
    const start = useRef<{ x: number; y: number; moved: boolean } | null>(null);
    // Vị trí kéo mới nhất cũng giữ trong ref: vuốt nhanh thì lượt "nhả tay" có thể tới trước khi React vẽ lại với `drag` mới
    // → đọc state sẽ thấy giá trị cũ (hoặc null) và toast không tắt.
    const dragRef = useRef<{ x: number; y: number } | null>(null);

    // Đo chiều cao → react-hot-toast tính vị trí xếp chồng; > 54px thì bỏ dáng viên nang (bo tròn hẳn) sang thẻ bo 16px.
    useLayoutEffect(() => {
        const el = ref.current;
        if (!el) return;
        const measure = () => {
            const h = el.getBoundingClientRect().height;
            onHeight(t.id, h);
            setTall(h > 54);
        };
        measure();
        if (typeof ResizeObserver === 'undefined') return;
        const ro = new ResizeObserver(measure);
        ro.observe(el);
        return () => ro.disconnect();
    }, [t.id, onHeight]);

    useEffect(() => {
        const raf = requestAnimationFrame(() => setEntered(true));
        return () => cancelAnimationFrame(raf);
    }, []);

    /** Người dùng TỰ tắt (×, vuốt, Esc) → báo cho nơi gọi qua `onDismiss` (vd đặt lại trạng thái tiến trình). */
    const dismiss = (dir: 'up' | 'left' | 'right' | null = null) => {
        setFlyOut(dir);
        meta.onDismiss?.();
        toast.dismiss(t.id);
    };

    if (t.type === 'custom') {
        // Chỉ để tương thích `toast.custom` — nội dung tự vẽ hoàn toàn (không có lời gọi nào mới nên dùng kiểu này).
        return (
            <div
                ref={ref}
                className="pointer-events-auto absolute inset-x-3 top-0 flex justify-center"
                style={{ transform: `translate3d(0, ${offset}px, 0)`, opacity: t.visible ? 1 : 0, transition: reduceMotion ? undefined : 'transform 320ms cubic-bezier(.21,1.02,.73,1), opacity 200ms ease' }}
                {...t.ariaProps}
            >
                {resolveValue(t.message, t)}
            </div>
        );
    }

    const kind = meta.kind;
    const actions = meta.actions;
    const longLived = !Number.isFinite(t.duration ?? 0) || (t.duration ?? 0) > 6000;
    const showClose = kind !== 'loading' && (isDesktop || longLived || kind === 'error' || !!actions);
    const compact = !tall && !meta.description && !actions;

    // ── Vuốt để tắt ──
    const onPointerDown = (e: React.PointerEvent) => {
        if (e.button !== 0 || (e.target as HTMLElement).closest('button, a, input, select, textarea')) return;
        start.current = { x: e.clientX, y: e.clientY, moved: false };
        onPause();
    };
    const onPointerMove = (e: React.PointerEvent) => {
        const s = start.current;
        if (!s) return;
        const dx = e.clientX - s.x;
        const dy = e.clientY - s.y;
        if (!s.moved && Math.hypot(dx, dy) < 6) return;
        if (!s.moved) {
            s.moved = true;
            (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
        }
        // Kéo xuống bị hãm (như thông báo iOS); kéo lên/ngang đi theo ngón tay.
        const next = { x: dx, y: dy > 0 ? dy * 0.25 : dy };
        dragRef.current = next;
        setDrag(next);
    };
    const onPointerEnd = () => {
        const d = dragRef.current;
        dragRef.current = null;
        start.current = null;
        setDrag(null);
        onResume();
        if (!d) return;
        if (d.y < -28) dismiss('up');
        else if (Math.abs(d.x) > (isDesktop ? 80 : 110)) dismiss(d.x > 0 ? 'right' : 'left');
    };

    const exiting = !t.visible;
    let tx = drag?.x ?? 0;
    let ty = offset + (drag?.y ?? 0);
    let scale = 1;
    let opacity = 1;
    if (!entered) { ty = offset - 24; scale = 0.96; opacity = 0; }
    if (exiting) {
        opacity = 0;
        scale = 0.96;
        if (flyOut === 'up') ty = offset - 90;
        else if (flyOut === 'right') tx = 420;
        else if (flyOut === 'left') tx = -420;
        else ty = offset - 14;
    }

    const runAction = (a: ToastAction) => {
        // Gọi hành động TRƯỚC khi tắt: Safari chỉ cho mở bảng chia sẻ (navigator.share) ngay trong lượt chạm.
        void a.onClick();
        if (!a.keepOpen) toast.dismiss(t.id);
    };
    const primaryIndex = actions ? Math.max(0, actions.findIndex(a => a.primary)) : -1;

    return (
        <div
            ref={ref}
            data-app-toast=""
            data-testid={meta.testId ?? 'app-toast'}
            data-toast-kind={kind}
            className={cn(
                'group pointer-events-auto absolute inset-x-3 top-0 select-none touch-none',
                'ycx-material shadow-xl ring-1 ring-slate-900/[0.06] text-left',
                compact ? 'rounded-full pl-3.5 pr-4 py-2.5' : 'rounded-overlay px-4 py-3',
            )}
            style={{
                transform: `translate3d(${tx}px, ${ty}px, 0) scale(${scale})`,
                opacity,
                transition: drag || reduceMotion ? 'none' : 'transform 340ms cubic-bezier(.21,1.02,.73,1), opacity 220ms ease',
            }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerEnd}
            onPointerCancel={onPointerEnd}
            onKeyDown={(e) => { if (e.key === 'Escape') dismiss(); }}
            {...t.ariaProps}
        >
            <div className={cn('flex gap-3', compact ? 'items-center' : 'items-start')}>
                <span className={cn('shrink-0 flex', KIND_COLOR[kind], !compact && 'mt-px')}>
                    {t.icon ?? <AppIcon name={meta.iconName ?? KIND_ICON[kind]} size="lg" spin={kind === 'loading'} />}
                </span>
                <div className="min-w-0 flex-1">
                    <div className="text-[15px] lg:text-sm font-semibold leading-5 text-slate-900 break-words whitespace-pre-line">
                        {resolveValue(t.message, t)}
                    </div>
                    {meta.description != null && meta.description !== '' && (
                        <div className="mt-0.5 text-[13px] leading-[18px] text-slate-600 line-clamp-3 break-words">{meta.description}</div>
                    )}
                    {actions && (
                        <div className="mt-2.5 flex flex-wrap gap-2">
                            {actions.map((a, i) => (
                                <Button
                                    key={`${a.label}-${i}`}
                                    size="sm"
                                    variant={i === primaryIndex ? 'primary' : 'secondary'}
                                    onClick={() => runAction(a)}
                                >
                                    {a.label}
                                </Button>
                            ))}
                        </div>
                    )}
                </div>
                {showClose && (
                    <Button
                        variant="unstyled"
                        size="none"
                        aria-label="Đóng thông báo"
                        onClick={() => dismiss()}
                        className={cn(
                            '-mr-1.5 shrink-0 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-900/5 transition-colors',
                            'h-7 w-7 max-lg:min-h-11 max-lg:min-w-11 max-lg:-my-2',
                            compact ? '' : '-mt-1',
                            isDesktop && !longLived && kind !== 'error' && !actions && 'opacity-0 group-hover:opacity-100 focus-visible:opacity-100',
                        )}
                    >
                        <AppIcon name="close" size="sm" />
                    </Button>
                )}
            </div>
        </div>
    );
});
ToastItem.displayName = 'ToastItem';

export const AppToaster: React.FC = () => {
    const { toasts, handlers } = useToaster({
        // Toast tạo thẳng bằng react-hot-toast bên trong `toast.promise` không đi qua bộ bọc → mặc định thời gian ở đây.
        success: { duration: TOAST_DURATION.success },
        error: { duration: TOAST_DURATION.error },
        blank: { duration: TOAST_DURATION.info },
    });
    const { startPause, endPause, calculateOffset, updateHeight } = handlers;
    const isDesktop = useMedia('(min-width: 1024px)');
    const reduceMotion = useMedia('(prefers-reduced-motion: reduce)');

    // Mới nhất đứng đầu mảng. Chỉ vẽ 3 toast đang hiện + những toast đang chạy hiệu ứng tắt.
    const shownIds = new Set(toasts.filter(t => t.visible).slice(0, MAX_VISIBLE).map(t => t.id));
    const shown = toasts.filter(t => shownIds.has(t.id) || (!t.visible && t.height));

    return (
        <div
            data-ycx-toaster=""
            className="fixed inset-x-0 top-0 z-[1000000] pointer-events-none flex justify-center"
            style={{ paddingTop: isDesktop ? 12 : 'calc(env(safe-area-inset-top, 0px) + 8px)' }}
        >
            <div className="relative w-full max-w-[440px]" onMouseEnter={startPause} onMouseLeave={endPause}>
                {shown.map(t => (
                    <ToastItem
                        key={t.id}
                        t={t}
                        offset={calculateOffset(t, { reverseOrder: false, gutter: GUTTER })}
                        isDesktop={isDesktop}
                        reduceMotion={reduceMotion}
                        onHeight={updateHeight}
                        onPause={startPause}
                        onResume={endPause}
                    />
                ))}
            </div>
        </div>
    );
};

export default AppToaster;
