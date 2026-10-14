import React, { useCallback, useLayoutEffect, useRef } from 'react';
import { cn } from './utils';
import { Button } from './Button';
import { useCenterActiveInStrip } from './useCenterActiveInStrip';
import { renderIcon, type IconProp } from './icon/renderIcon';

/* ─── Tabs ─── */


export interface TabItem {
  id: string;
  label: string;
  /** Tên chức năng trong iconRegistry (khuyên dùng — size tự theo cỡ tab) hoặc node tự dựng (cũ). */
  icon?: IconProp;
  badge?: string | number;
  disabled?: boolean;
}

export interface TabsProps {
  items: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  /** Visual variant */
  variant?: 'underline' | 'pills' | 'segment' | 'chips';
  /** Size */
  size?: 'sm' | 'md';
  /** Full width tabs */
  fullWidth?: boolean;
  /** Additional className */
  className?: string;
}

export const Tabs = React.memo<TabsProps>(({
  items,
  activeId,
  onChange,
  variant = 'underline',
  size = 'md',
  fullWidth = false,
  className,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  // Mục đang chọn luôn nằm giữa dải khi dải cuộn ngang (điện thoại) — chỉ cuộn ngang, trang không nhảy.
  useCenterActiveInStrip(containerRef, activeId);

  const handleClick = useCallback((id: string) => {
    onChange(id);
  }, [onChange]);

  // Trên điện thoại tab phải cao tối thiểu 44px (mức tối thiểu của Apple HIG) — đo thật trên
  // iPhone 15 trước khi sửa: tab con của Report BI chỉ 40px, nằm trong nhóm 20 nút khó chạm.
  // Desktop giữ nguyên chiều cao cũ để không đội thanh công cụ lên, chiếm chỗ của số liệu.
  const sizeClasses = {
    sm: 'text-xs h-11 sm:h-8',
    md: 'text-sm h-11 sm:h-10',
  };

  if (variant === 'underline') {
    return (
      <div
        ref={containerRef}
        className={cn(
          'flex overflow-x-auto no-scrollbar snap-x snap-proximity border-b border-slate-200 dark:border-slate-700/60',
          fullWidth && 'w-full',
          className
        )}
      >
        {items.map(item => {
          const isActive = item.id === activeId;
          return (
            <Button
              variant="unstyled" size="none" type="button"
              key={item.id}
              data-active={isActive ? 'true' : undefined}
              onClick={() => handleClick(item.id)}
              disabled={item.disabled}
              className={cn(
                'relative flex items-center gap-1.5 px-3 font-medium whitespace-nowrap transition-colors shrink-0 snap-center',
                sizeClasses[size],
                fullWidth && 'flex-1 justify-center',
                isActive
                  ? 'text-sky-700 dark:text-sky-400'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200',
                item.disabled && 'opacity-40 cursor-not-allowed'
              )}
            >
              {item.icon && <span className="shrink-0 inline-flex">{renderIcon(item.icon, size)}</span>}
              {item.label}
              {item.badge !== undefined && (
                <span className={cn(
                  'min-w-[18px] h-[18px] rounded-full px-1 text-[11px] font-bold flex items-center justify-center leading-none',
                  isActive
                    ? 'bg-sky-100 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                )}>
                  {item.badge}
                </span>
              )}
              {/* Active indicator line */}
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-sky-500 dark:bg-sky-400 rounded-full" />
              )}
            </Button>
          );
        })}
      </div>
    );
  }

  if (variant === 'pills') {
    return (
      <div
        ref={containerRef}
        className={cn(
          'flex gap-1 overflow-x-auto no-scrollbar snap-x snap-proximity',
          fullWidth && 'w-full',
          className
        )}
      >
        {items.map(item => {
          const isActive = item.id === activeId;
          return (
            <Button
              variant="unstyled" size="none" type="button"
              key={item.id}
              data-active={isActive ? 'true' : undefined}
              onClick={() => handleClick(item.id)}
              disabled={item.disabled}
              className={cn(
                'flex items-center gap-1.5 px-3 font-medium whitespace-nowrap rounded-lg transition-all shrink-0 snap-center',
                sizeClasses[size],
                fullWidth && 'flex-1 justify-center',
                isActive
                  ? 'bg-sky-500 text-white shadow-sm shadow-sky-500/20'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800',
                item.disabled && 'opacity-40 cursor-not-allowed'
              )}
            >
              {item.icon && <span className="shrink-0 inline-flex">{renderIcon(item.icon, size)}</span>}
              {item.label}
              {item.badge !== undefined && (
                <span className={cn(
                  'min-w-[18px] h-[18px] rounded-full px-1 text-[11px] font-bold flex items-center justify-center leading-none',
                  isActive
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                )}>
                  {item.badge}
                </span>
              )}
            </Button>
          );
        })}
      </div>
    );
  }

  if (variant === 'chips') {
    return (
      <div
        ref={containerRef}
        className={cn(
          'flex items-center gap-1.5 overflow-x-auto no-scrollbar snap-x snap-proximity py-0.5',
          fullWidth && 'w-full',
          className
        )}
      >
        {items.map(item => {
          const isActive = item.id === activeId;
          return (
            <Button
              variant="unstyled" size="none" type="button"
              key={item.id}
              aria-pressed={isActive}
              data-active={isActive ? 'true' : undefined}
              onClick={() => handleClick(item.id)}
              disabled={item.disabled}
              className={cn(
                'flex items-center justify-center gap-1.5 px-3.5 sm:px-4 h-9 sm:h-8.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all shrink-0 snap-center select-none active:scale-95',
                fullWidth && 'flex-1',
                isActive
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                  : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60 shadow-2xs',
                item.disabled && 'opacity-40 cursor-not-allowed'
              )}
            >
              {item.icon && <span className="shrink-0 inline-flex">{renderIcon(item.icon, size)}</span>}
              {item.label}
              {item.badge !== undefined && (
                <span className={cn(
                  'min-w-[18px] h-[18px] rounded-full px-1 text-[11px] font-bold flex items-center justify-center leading-none',
                  isActive
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                )}>
                  {item.badge}
                </span>
              )}
            </Button>
          );
        })}
      </div>
    );
  }

  // Segment variant — SEGMENTED CONTROL kiểu iOS (GĐ3 2026-10-11, KE_HOACH_GIAO_DIEN_APPLE.md mục 3.6): rãnh xám nhạt,
  // "núm" trắng có bóng TRƯỢT sang mục được chọn, chữ 13px đậm vừa. Cảm ứng: mỗi mục cao 44px (HIG); chuột: 32/28px.
  return <SegmentTrack items={items} activeId={activeId} onPick={handleClick} size={size} fullWidth={fullWidth} className={className} containerRef={containerRef} />;
});

Tabs.displayName = 'Tabs';

/** Thân của segmented control: đo vị trí mục đang chọn để đặt núm trượt (transform + width, có chuyển động). */
const SegmentTrack: React.FC<{
  items: TabItem[]; activeId: string; onPick: (id: string) => void; size: 'sm' | 'md'; fullWidth: boolean;
  className?: string; containerRef: React.RefObject<HTMLDivElement | null>;
}> = ({ items, activeId, onPick, size, fullWidth, className, containerRef }) => {
  const numRef = useRef<HTMLSpanElement>(null);
  const daVe = useRef(false);
  useLayoutEffect(() => {
    const track = containerRef.current;
    const num = numRef.current;
    if (!track || !num) return;
    const dat = () => {
      const nut = track.querySelector<HTMLElement>('[data-active="true"]');
      if (!nut) { num.style.opacity = '0'; return; }
      num.style.opacity = '1';
      num.style.width = `${nut.offsetWidth}px`;
      num.style.height = `${nut.offsetHeight}px`;
      num.style.transform = `translate(${nut.offsetLeft}px, ${nut.offsetTop}px)`;
    };
    // Lần vẽ đầu: đặt thẳng, không trượt từ góc trái.
    if (!daVe.current) { num.style.transition = 'none'; dat(); void num.offsetWidth; num.style.transition = ''; daVe.current = true; }
    else dat();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(dat);
    ro.observe(track);
    return () => ro.disconnect();
  }, [activeId, items, containerRef]);

  return (
    <div
      ref={containerRef}
      role="group"
      data-segmented=""
      className={cn(
        'relative inline-flex max-w-full items-stretch rounded-control bg-slate-200/70 p-0.5 overflow-x-auto no-scrollbar snap-x snap-proximity',
        fullWidth && 'w-full',
        className
      )}
    >
      <span
        ref={numRef}
        aria-hidden="true"
        className="pointer-events-none absolute left-0 top-0 rounded-md bg-white shadow-[0_1px_3px_rgba(15,23,42,0.12),0_1px_1px_rgba(15,23,42,0.06)] transition-[transform,width] duration-[250ms] ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none"
      />
      {items.map(item => {
        const isActive = item.id === activeId;
        return (
          <Button
            variant="unstyled" size="none" type="button"
            key={item.id}
            // Nút bật/tắt (aria-pressed) chứ không role="tab": segmented control là nhóm nút chọn một — giữ vai trò `button`
            // để luồng tự động/test đang tìm nút theo tên (vd "Cập nhật" ở Report BI) không phải đổi.
            aria-pressed={isActive}
            data-active={isActive ? 'true' : undefined}
            onClick={() => onPick(item.id)}
            disabled={item.disabled}
            className={cn(
              'relative z-[1] flex items-center justify-center gap-1.5 px-3 whitespace-nowrap rounded-md shrink-0 snap-center transition-colors',
              size === 'sm' ? 'text-[13px] min-h-7 pointer-coarse:min-h-11 max-sm:min-h-11' : 'text-[13px] min-h-8 pointer-coarse:min-h-11 max-sm:min-h-11',
              fullWidth && 'flex-1',
              isActive ? 'text-slate-900 font-semibold' : 'text-slate-600 font-medium hover:text-slate-900',
              item.disabled && 'opacity-40 cursor-not-allowed'
            )}
          >
            {/* md: thang icon của dự án — nút có chữ dùng md (iconTokens.ts); sm từng làm icon dải chọn Bot LINE nhỏ hơn chữ (audit GĐ9). */}
            {item.icon && <span className="shrink-0 inline-flex">{renderIcon(item.icon, 'md')}</span>}
            {item.label}
            {item.badge !== undefined && (
              <span className={cn(
                'min-w-[18px] h-[18px] rounded-full px-1 text-[11px] font-bold flex items-center justify-center leading-none',
                isActive ? 'bg-sky-100 text-sky-700' : 'bg-slate-300/70 text-slate-600'
              )}>
                {item.badge}
              </span>
            )}
          </Button>
        );
      })}
    </div>
  );
};
