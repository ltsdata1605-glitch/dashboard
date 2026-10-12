import React, { useLayoutEffect, useRef, useState } from 'react';
import { cn } from './utils';
import { Button } from './Button';
import { AppIcon } from './icon/AppIcon';
import type { IconName } from './icon/iconRegistry';

/**
 * DẢI THÔNG BÁO TĨNH dùng chung (KE_HOACH_GIAO_DIEN_APPLE.md mục 3.11 — GĐ3, 2026-10-11).
 *
 * Thay dải "THÔNG BÁO" chữ chạy liên tục (lỗi #18 — khó đọc, gây phân tâm) và các khối cảnh báo tự vẽ: nền nhạt theo nghĩa,
 * vạch trái 3px, icon 20px, chữ 13px ĐỨNG YÊN, tối đa `maxLines` dòng (mặc định 2) — dài hơn thì có "Xem thêm" để mở đủ.
 * `onDismiss` → nút × (vùng chạm 44px); nơi dùng tự nhớ đã đóng (vd theo mã thông báo) để không hiện lại nội dung cũ.
 */
export type BannerTone = 'info' | 'success' | 'warning' | 'danger';

const TONE: Record<BannerTone, { box: string; icon: string; defaultIcon: IconName }> = {
  info:    { box: 'bg-sky-50 border-sky-500 text-slate-800',         icon: 'text-sky-600',     defaultIcon: 'info' },
  success: { box: 'bg-emerald-50 border-emerald-500 text-slate-800', icon: 'text-emerald-600', defaultIcon: 'success' },
  warning: { box: 'bg-amber-50 border-amber-500 text-slate-800',     icon: 'text-amber-600',   defaultIcon: 'warning' },
  danger:  { box: 'bg-rose-50 border-rose-500 text-slate-800',       icon: 'text-rose-600',    defaultIcon: 'announcement' },
};

const CLAMP: Record<1 | 2 | 3, string> = { 1: 'line-clamp-1', 2: 'line-clamp-2', 3: 'line-clamp-3' };

export interface BannerProps {
  tone?: BannerTone;
  title?: React.ReactNode;
  children?: React.ReactNode;
  icon?: IconName;
  /** Số dòng hiện khi thu gọn — nội dung dài hơn có nút "Xem thêm". */
  maxLines?: 1 | 2 | 3;
  action?: { label: string; onClick: () => void };
  onDismiss?: () => void;
  className?: string;
  'data-testid'?: string;
}

export const Banner: React.FC<BannerProps> = ({
  tone = 'info', title, children, icon, maxLines = 2, action, onDismiss, className, ...rest
}) => {
  const t = TONE[tone];
  const bodyRef = useRef<HTMLDivElement>(null);
  const [moRong, setMoRong] = useState(false);
  const [biCat, setBiCat] = useState(false);

  // Nội dung có bị cắt bởi line-clamp không → mới hiện "Xem thêm". Đo lại khi đổi cỡ màn / nội dung.
  useLayoutEffect(() => {
    const el = bodyRef.current;
    if (!el || moRong) return;
    const kiem = () => setBiCat(el.scrollHeight - el.clientHeight > 1);
    kiem();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(kiem);
    ro.observe(el);
    return () => ro.disconnect();
  }, [children, moRong]);

  return (
    <div
      role={tone === 'danger' || tone === 'warning' ? 'alert' : 'status'}
      data-banner={tone}
      className={cn('flex items-start gap-3 rounded-popup border-l-[3px] pl-3 pr-1 py-2.5', t.box, className)}
      {...rest}
    >
      <AppIcon name={icon ?? t.defaultIcon} size="lg" className={cn('shrink-0 mt-px', t.icon)} />
      <div className="min-w-0 flex-1 py-px">
        {title && <p className="text-[13px] font-semibold leading-[18px] text-slate-900">{title}</p>}
        {children && (
          <div ref={bodyRef} className={cn('text-[13px] leading-[18px] text-slate-700 break-words', !moRong && CLAMP[maxLines])}>
            {children}
          </div>
        )}
        {(biCat || moRong || action) && (
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
            {(biCat || moRong) && (
              <Button variant="unstyled" size="none" onClick={() => setMoRong(v => !v)}
                className="text-[13px] font-semibold text-sky-700 hover:underline min-h-6 pointer-coarse:min-h-8">
                {moRong ? 'Thu gọn' : 'Xem thêm'}
              </Button>
            )}
            {action && (
              <Button variant="unstyled" size="none" onClick={action.onClick}
                className="text-[13px] font-semibold text-sky-700 hover:underline min-h-6 pointer-coarse:min-h-8">
                {action.label}
              </Button>
            )}
          </div>
        )}
      </div>
      {onDismiss && (
        <Button variant="unstyled" size="none" onClick={onDismiss} aria-label="Đóng thông báo"
          className="shrink-0 -my-1.5 flex h-11 w-11 items-center justify-center rounded-full text-slate-400 hover:text-slate-600 hover:bg-black/5">
          <AppIcon name="close" size="md" />
        </Button>
      )}
    </div>
  );
};

Banner.displayName = 'Banner';
export default Banner;
