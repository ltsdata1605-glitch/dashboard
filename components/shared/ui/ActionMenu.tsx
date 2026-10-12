import React, { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { cn } from './utils';
import { Button } from './Button';
import { AppIcon } from './icon/AppIcon';
import type { IconName } from './icon/iconRegistry';
import { Overlay } from './Overlay';
import { useModalBehavior } from './useModalBehavior';
import { usePresence } from './usePresence';

/**
 * NÚT "⋯" + MENU THAO TÁC dùng chung (KE_HOACH_GIAO_DIEN_APPLE.md mục 3.4 — GĐ3, 2026-10-11).
 *
 * Gốc của lỗi #1 (thanh trên iPhone 7 nút icon chồng nhau, nút Xoá đỏ đứng sát nút Đồng bộ): mỗi màn tự xếp hết nút ra ngoài.
 * Từ nay thanh trên / tiêu đề khối chỉ để 1–2 nút chính, phần còn lại vào menu này.
 *  - Laptop (≥ 640px): menu thả bo 12px, `shadow-lg`, hàng 36px có icon trái; ↑/↓/Home/End di chuyển, Esc đóng, Tab đóng.
 *  - iPhone (< 640px): ACTION SHEET từ đáy kiểu iOS — nhóm trắng bo 16px, hàng 52px, chữ 17px, icon bên phải; mục nguy hiểm
 *    (`destructive`) màu đỏ ở nhóm RIÊNG cuối; nút "Huỷ" tách riêng. Chạm nền / Esc để đóng; bẫy focus như modal.
 *  - `onSelect` chạy NGAY trong lượt bấm (giữ "user gesture" cho navigator.share / mở tab), rồi menu mới đóng.
 * Việc phá huỷ (xoá dữ liệu…) vẫn phải tự hỏi xác nhận bằng `<ConfirmDialog>` trong `onSelect`.
 */
export interface ActionMenuItem {
  id: string;
  label: string;
  icon?: IconName;
  onSelect: () => void;
  destructive?: boolean;
  disabled?: boolean;
  /** Nhóm: mục cùng nhóm nằm liền nhau, giữa các nhóm có vạch ngăn (laptop) / khoảng tách (iPhone). */
  section?: string;
  description?: string;
  testId?: string;
}

export interface ActionMenuTriggerProps {
  ref: React.Ref<HTMLButtonElement>;
  onClick: () => void;
  'aria-haspopup': 'menu';
  'aria-expanded': boolean;
  'aria-controls'?: string;
}

export interface ActionMenuProps {
  items: ActionMenuItem[];
  /** Tên nút mở menu cho trình đọc màn hình. */
  label?: string;
  /** Dòng tiêu đề ở đầu action sheet (iPhone). */
  title?: string;
  icon?: IconName;
  triggerClassName?: string;
  /** Nút mở menu tự dựng (vd nút có chữ). */
  renderTrigger?: (props: ActionMenuTriggerProps) => React.ReactNode;
  align?: 'end' | 'start';
  'data-testid'?: string;
}

const SHEET_QUERY = '(max-width: 639px)';
const laManHep = () => typeof window.matchMedia === 'function' && window.matchMedia(SHEET_QUERY).matches;

/** Gom mục theo `section`, giữ thứ tự xuất hiện; mục `destructive` của nhóm không tên dồn về nhóm cuối. */
function chiaNhom(items: ActionMenuItem[]): ActionMenuItem[][] {
  const thuong = items.filter(i => !i.destructive);
  const nguyHiem = items.filter(i => i.destructive);
  const nhom = new Map<string, ActionMenuItem[]>();
  for (const it of thuong) {
    const k = it.section ?? '';
    if (!nhom.has(k)) nhom.set(k, []);
    nhom.get(k)!.push(it);
  }
  const ketQua = Array.from(nhom.values());
  if (nguyHiem.length) ketQua.push(nguyHiem);
  return ketQua.filter(g => g.length > 0);
}

export const ActionMenu: React.FC<ActionMenuProps> = ({
  items, label = 'Thêm thao tác', title, icon = 'more', triggerClassName, renderTrigger, align = 'end', ...rest
}) => {
  const [open, setOpen] = useState(false);
  const [sheet, setSheet] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const { mounted, shown } = usePresence(open, sheet ? 280 : 120);
  const [viTri, setViTri] = useState<React.CSSProperties>({ top: -9999, left: -9999 });

  const dong = useCallback((traFocus = true) => {
    setOpen(false);
    if (traFocus) requestAnimationFrame(() => triggerRef.current?.focus({ preventScroll: true }));
  }, []);
  const mo = () => { setSheet(laManHep()); setOpen(true); };

  // Action sheet là hộp thoại thật: khoá cuộn, bẫy Tab, Esc chỉ đóng lớp trên cùng.
  useModalBehavior(open && sheet, () => dong(), panelRef);

  // Menu thả (laptop): đặt dưới nút, căn mép phải/trái theo `align`, không đủ chỗ thì lật lên trên; giữ trong màn hình.
  useLayoutEffect(() => {
    if (!open || sheet) return;
    const datViTri = () => {
      const nut = triggerRef.current?.getBoundingClientRect();
      const menu = panelRef.current;
      if (!nut || !menu) return;
      const w = Math.max(menu.offsetWidth, 220);
      const h = menu.offsetHeight;
      const vw = window.innerWidth, vh = window.innerHeight;
      let left = align === 'end' ? nut.right - w : nut.left;
      left = Math.min(Math.max(8, left), vw - w - 8);
      const duoi = nut.bottom + 6;
      const top = duoi + h > vh - 8 && nut.top - 6 - h > 8 ? nut.top - 6 - h : Math.min(duoi, Math.max(8, vh - h - 8));
      setViTri({ top, left, minWidth: 220 });
    };
    datViTri();
    window.addEventListener('resize', datViTri);
    return () => window.removeEventListener('resize', datViTri);
  }, [open, sheet, align, items.length]);

  // Laptop: focus mục đầu khi mở; ↑/↓/Home/End; Esc/Tab đóng. Nghe ở pha CAPTURE + chặn lan: menu nằm trong modal thì
  // Esc chỉ đóng menu, không đóng luôn modal phía dưới.
  useEffect(() => {
    if (!open || sheet) return;
    const mucBam = () => Array.from(panelRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([disabled])') ?? []);
    const r = requestAnimationFrame(() => mucBam()[0]?.focus({ preventScroll: true }));
    const onKey = (e: KeyboardEvent) => {
      const ds = mucBam();
      const i = ds.indexOf(document.activeElement as HTMLElement);
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); dong(); }
      else if (e.key === 'Tab') { e.preventDefault(); dong(); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); ds[(i + 1) % ds.length]?.focus(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); ds[(i - 1 + ds.length) % ds.length]?.focus(); }
      else if (e.key === 'Home') { e.preventDefault(); ds[0]?.focus(); }
      else if (e.key === 'End') { e.preventDefault(); ds[ds.length - 1]?.focus(); }
    };
    window.addEventListener('keydown', onKey, true);
    return () => { cancelAnimationFrame(r); window.removeEventListener('keydown', onKey, true); };
  }, [open, sheet, dong]);

  const chon = (it: ActionMenuItem) => {
    if (it.disabled) return;
    it.onSelect();          // ngay trong lượt bấm — giữ quyền "user gesture"
    dong(false);
  };

  const nhom = chiaNhom(items);
  const triggerProps: ActionMenuTriggerProps = {
    ref: triggerRef, onClick: () => (open ? dong() : mo()),
    'aria-haspopup': 'menu', 'aria-expanded': open, 'aria-controls': open ? menuId : undefined,
  };

  return (
    <>
      {renderTrigger ? renderTrigger(triggerProps) : (
        <Button
          {...triggerProps}
          type="button"
          variant="ghost"
          size="icon"
          aria-label={label}
          title={label}
          data-testid={rest['data-testid']}
          className={cn('min-h-11 min-w-11 lg:min-h-9 lg:min-w-9 rounded-full text-slate-600', triggerClassName)}
        >
          <AppIcon name={icon} size="lg" />
        </Button>
      )}

      {mounted && ReactDOM.createPortal(
        sheet ? (
          <>
            <Overlay kind="scrim" onClick={() => dong()}
              className={cn('z-[1000] bg-slate-900/40 transition-opacity duration-200 motion-reduce:transition-none', shown ? 'opacity-100' : 'opacity-0')} />
            <div
              ref={panelRef}
              id={menuId}
              role="dialog"
              aria-modal="true"
              aria-label={title ?? label}
              tabIndex={-1}
              data-action-sheet=""
              className={cn(
                'fixed inset-x-0 bottom-0 z-[1001] px-2 pb-[calc(env(safe-area-inset-bottom,0px)+8px)] focus:outline-none',
                'transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none',
                shown ? 'translate-y-0' : 'translate-y-full',
              )}
            >
              <div className="mx-auto max-w-[440px] space-y-2">
                {nhom.map((g, gi) => (
                  <div key={gi} role="menu" className="overflow-hidden rounded-overlay ycx-material shadow-xl">
                    {gi === 0 && title && (
                      <div className="px-4 py-3 text-center text-[13px] leading-[18px] text-slate-500 border-b border-slate-300/60">{title}</div>
                    )}
                    {g.map(it => (
                      <Button key={it.id} variant="unstyled" size="none" role="menuitem" disabled={it.disabled}
                        data-testid={it.testId} onClick={() => chon(it)}
                        className={cn(
                          'flex w-full items-center justify-between gap-3 px-4 min-h-[52px] text-left text-[17px] leading-[22px]',
                          'border-b border-slate-300/60 last:border-b-0 active:bg-slate-900/[0.06]',
                          it.destructive ? 'text-rose-600' : 'text-slate-900',
                        )}>
                        <span className="min-w-0 py-2">
                          <span className="block truncate">{it.label}</span>
                          {it.description && <span className="block text-[13px] leading-[18px] text-slate-500 line-clamp-2">{it.description}</span>}
                        </span>
                        {it.icon && <AppIcon name={it.icon} size="lg" className={cn('shrink-0', it.destructive ? 'text-rose-600' : 'text-slate-500')} />}
                      </Button>
                    ))}
                  </div>
                ))}
                <Button variant="unstyled" size="none" onClick={() => dong()}
                  className="w-full min-h-[52px] rounded-overlay bg-white text-[17px] font-semibold text-sky-600 shadow-xl active:bg-slate-100">
                  Huỷ
                </Button>
              </div>
            </div>
          </>
        ) : (
          <>
            <Overlay kind="scrim" className="z-[1000]" onClick={() => dong(false)} />
            <div
              ref={panelRef}
              id={menuId}
              role="menu"
              aria-label={label}
              data-action-menu=""
              style={viTri}
              className={cn(
                'fixed z-[1001] max-h-[70vh] overflow-y-auto rounded-popup bg-white py-1 shadow-lg ring-1 ring-slate-900/10',
                'transition-[opacity,transform] duration-100 motion-reduce:transition-none',
                align === 'end' ? 'origin-top-right' : 'origin-top-left',
                shown ? 'opacity-100 scale-100' : 'opacity-0 scale-95',
              )}
            >
              {nhom.map((g, gi) => (
                <React.Fragment key={gi}>
                  {gi > 0 && <div role="separator" className="my-1 h-px bg-slate-100" />}
                  {g.map(it => (
                    <Button key={it.id} variant="unstyled" size="none" role="menuitem" disabled={it.disabled}
                      data-testid={it.testId} onClick={() => chon(it)}
                      className={cn(
                        'flex w-full items-center gap-2.5 px-3 min-h-9 text-left text-sm',
                        'hover:bg-slate-100 focus-visible:bg-slate-100 focus-visible:outline-none',
                        it.destructive ? 'text-rose-600' : 'text-slate-800',
                      )}>
                      {it.icon && <AppIcon name={it.icon} size="md" className={cn('shrink-0', it.destructive ? 'text-rose-600' : 'text-slate-500')} />}
                      <span className="min-w-0 flex-1 py-1.5">
                        <span className="block truncate">{it.label}</span>
                        {it.description && <span className="block text-xs text-slate-500 line-clamp-2">{it.description}</span>}
                      </span>
                    </Button>
                  ))}
                </React.Fragment>
              ))}
            </div>
          </>
        ),
        document.body,
      )}
    </>
  );
};

ActionMenu.displayName = 'ActionMenu';
export default ActionMenu;
