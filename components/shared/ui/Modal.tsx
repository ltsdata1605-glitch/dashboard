import React, { useEffect, useId, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { cn } from './utils';
import { Button } from './Button';
import { AppIcon } from './icon/AppIcon';
import { useModalBehavior } from './useModalBehavior';
import { usePresence } from './usePresence';

// Hành vi hộp thoại (ngăn xếp modal, Esc, bẫy Tab, trả focus) nằm ở useModalBehavior.ts — re-export để import cũ vẫn chạy.
export { useModalBehavior } from './useModalBehavior';

/** Màn hẹp hơn mốc `sm` (640px) — đúng mốc mà bố cục `position="bottom"` dán đáy màn hình. */
const SHEET_QUERY = '(max-width: 639px)';
/** `true` khi màn hẹp (< 640px) — lớp nổi nên mở dạng sheet từ đáy thay vì menu thả/hộp giữa (dùng chung với nơi khác). */
export function useIsSheetWidth() {
  const [match, setMatch] = useState(() => typeof window.matchMedia === 'function' && window.matchMedia(SHEET_QUERY).matches);
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia(SHEET_QUERY);
    const onChange = () => setMatch(mq.matches);
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);
  return match;
}

/** Kéo xuống quá ngưỡng này (px) hoặc vuốt nhanh quá vận tốc này (px/s) thì đóng — như sheet của iOS. */
export const SHEET_CLOSE_OFFSET = 100;
export const SHEET_CLOSE_VELOCITY = 500;

/** Đường cong chuyển động kiểu sheet iOS (vào nhanh, dừng êm). */
const EASE_SHEET = 'cubic-bezier(0.32, 0.72, 0, 1)';

/**
 * Bàn phím ảo iOS KHÔNG đẩy khung nhìn bố cục — modal `fixed` nằm nguyên dưới bàn phím, ô đang nhập bị che và tiêu đề bị đẩy
 * mất (lỗi #6). Theo `visualViewport`: lớp gốc của modal chừa đệm đáy đúng bằng phần bàn phím đang che, và `--ycx-vvh` (chiều
 * cao phần còn nhìn thấy) giới hạn chiều cao khung modal.
 */
function useVisualViewportVars(active: boolean, rootRef: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const vv = window.visualViewport;
    const el = rootRef.current;
    if (!active || !vv || !el) return;
    const capNhat = () => {
      const kb = Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop));
      // Chỉ đè đệm đáy khi bàn phím đang mở — bình thường giữ đệm theo class (p-3 / sm:p-6).
      el.style.paddingBottom = kb > 0 ? `${kb}px` : '';
      el.style.setProperty('--ycx-vvh', `${Math.round(vv.height)}px`);
    };
    capNhat();
    vv.addEventListener('resize', capNhat);
    vv.addEventListener('scroll', capNhat);
    return () => { vv.removeEventListener('resize', capNhat); vv.removeEventListener('scroll', capNhat); };
  }, [active, rootRef]);
}

export interface ModalPrimaryAction {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
}

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  /** Dòng phụ nhỏ hiển thị phía trên title trong header (tương đương subTitle của ModalWrapper cũ). */
  subTitle?: React.ReactNode;
  /**
   * Override màu chữ của title. Mặc định màu chữ chính. GĐ3 (2026-10-11): tiêu đề modal KHÔNG tô đỏ/hồng nữa — màu đỏ chỉ
   * dành cho hộp xác nhận xoá (ConfirmDialog) — nên prop này chỉ còn để tương thích, tránh dùng mới.
   */
  titleColorClass?: string;
  /** Class thêm vào KHUNG modal — vd khu vực có CSS riêng theo phạm vi (Phân ca: "phanca-root") vì modal
   *  được portal ra body, không nằm trong cây DOM của khu vực đó. Không dùng để đổi bo góc/bóng. */
  panelClassName?: string;
  /** Nội dung tùy chỉnh (nút phụ...) hiển thị cạnh nút đóng trong header. */
  controls?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /**
   * HÀNH ĐỘNG CHÍNH kiểu iOS (GĐ3 2026-10-11). Sheet trên iPhone: đầu sheet thành [Huỷ] — Tiêu đề — [Lưu] (nút chữ, Lưu đậm)
   * thay cho nút ×. Laptop/hộp thoại giữa: thành cặp nút "Huỷ" + nút chính ở chân modal (khi không truyền `footer`).
   */
  primaryAction?: ModalPrimaryAction;
  /** Nhãn nút huỷ đi kèm `primaryAction` (mặc định "Huỷ"). */
  cancelLabel?: string;
  /**
   * Thang ĐƠN ĐIỆU: sm 420 < md 560 < lg 720 < xl 960 < full 95vw.
   * (A13, 2026-09-30: bỏ `2xl`=672px và `4xl`=896px — tên to hơn mà lại HẸP hơn `lg`/`xl`, khiến cùng
   * loại modal mỗi nơi một cỡ. 15 nơi dùng `2xl` chuyển sang `lg` (+48px), 12 nơi `4xl` sang `xl` (+64px).)
   */
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  hideCloseButton?: boolean;
  /** Ẩn hẳn thanh header chuẩn — dùng khi component con tự dựng header riêng trong children. */
  hideHeader?: boolean;
  /** Bỏ bo góc — dùng cho modal cần tràn viền/edge-to-edge. */
  noRounded?: boolean;
  /** 'bottom' = dán đáy màn hình trên mobile (bottom-sheet), căn giữa trên desktop. Mặc định 'center'. */
  position?: 'center' | 'bottom';
  zIndex?: string;
  /** Tên hộp thoại cho trình đọc màn hình khi KHÔNG có `title` (vd. dùng `hideHeader`). */
  ariaLabel?: string;
}

/**
 * HỘP THOẠI / SHEET dùng chung.
 *
 * GĐ3 (2026-10-11, KE_HOACH_GIAO_DIEN_APPLE.md mục 3.9) — viết lại phần TRÌNH BÀY, giữ nguyên chữ ký và hành vi:
 *  - Bỏ thư viện motion (42 KB gzip ở đường khởi động): vào/ra bằng CSS transition (`usePresence`), kéo-để-đóng của sheet
 *    tự xử lý bằng Pointer Events (như toast) — ngưỡng giữ nguyên 100px / 500px/s.
 *  - Thân modal CHỈ cuộn dọc (`overflow-x-hidden` + con `min-w-0`) — gốc của lỗi #5/#6/#21 (sheet có thanh cuộn ngang,
 *    chữ bên phải bị cắt). Bảng rộng vẫn cuộn ngang trong khung cuộn RIÊNG của nó.
 *  - Né bàn phím ảo iOS bằng `visualViewport` (useVisualViewportVars).
 *  - `primaryAction`: đầu sheet kiểu iOS [Huỷ] — Tiêu đề — [Lưu].
 */
export function Modal({
  isOpen,
  onClose,
  title,
  subTitle,
  titleColorClass = 'text-slate-900 dark:text-slate-100',
  panelClassName,
  controls,
  children,
  footer,
  primaryAction,
  cancelLabel = 'Huỷ',
  maxWidth = 'md',
  hideCloseButton = false,
  hideHeader = false,
  noRounded = false,
  position = 'center',
  zIndex = 'z-50',
  ariaLabel
}: ModalProps) {
  const modalId = useId();
  const titleId = `${modalId}-title`;
  const dialogRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  useModalBehavior(isOpen, onClose, dialogRef);

  const isSheetWidth = useIsSheetWidth();
  const isSheet = position === 'bottom' && isSheetWidth;
  const { mounted, shown } = usePresence(isOpen, isSheet ? 280 : 200);
  useVisualViewportVars(mounted, rootRef);

  // ── Kéo để đóng (chỉ sheet trên iPhone): từ thanh nắm + hàng tiêu đề; kéo trong nội dung vẫn là cuộn nội dung. ──
  const keoRef = useRef<{ id: number; y0: number; dy: number; mau: { t: number; y: number }[] } | null>(null);
  const datBienDang = (dy: number | null, chuyenDong: boolean) => {
    const el = dialogRef.current;
    if (!el) return;
    el.style.transition = chuyenDong ? `transform 260ms ${EASE_SHEET}` : 'none';
    el.style.transform = dy === null ? '' : `translateY(${dy}px)`;
  };
  const batDauKeo = (e: React.PointerEvent) => {
    if (!isSheet || e.button > 0) return;
    // Bấm vào nút/ô nhập trong hàng tiêu đề (nút đóng, controls) thì là bấm, không phải kéo.
    if ((e.target as HTMLElement).closest('button, a, input, select, textarea, [role="button"]')) return;
    keoRef.current = { id: e.pointerId, y0: e.clientY, dy: 0, mau: [{ t: e.timeStamp, y: e.clientY }] };
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const dangKeo = (e: React.PointerEvent) => {
    const k = keoRef.current;
    if (!k || k.id !== e.pointerId) return;
    const raw = e.clientY - k.y0;
    k.dy = raw > 0 ? raw : raw / 8; // kéo lên: cản mạnh như iOS
    k.mau.push({ t: e.timeStamp, y: e.clientY });
    if (k.mau.length > 12) k.mau.shift();
    datBienDang(Math.max(-12, k.dy), false);
  };
  const thaKeo = (e: React.PointerEvent) => {
    const k = keoRef.current;
    if (!k || k.id !== e.pointerId) return;
    keoRef.current = null;
    // Vận tốc trên các mẫu trong 100 ms cuối; cần ≥ 20 ms dữ liệu (chuỗi sự kiện dồn trong 1 khung hình — vd thao tác giả lập
    // — không phải cú vuốt nhanh thật) và đã kéo xuống ≥ 20px thì mới tính "vuốt nhanh để đóng".
    const cuoi = k.mau[k.mau.length - 1];
    const dau = k.mau.find(m => cuoi.t - m.t <= 100) ?? k.mau[0];
    const vanToc = cuoi.t - dau.t >= 20 ? ((cuoi.y - dau.y) / (cuoi.t - dau.t)) * 1000 : 0; // px/s
    if (k.dy > SHEET_CLOSE_OFFSET || (k.dy > 20 && vanToc > SHEET_CLOSE_VELOCITY)) {
      const h = dialogRef.current?.offsetHeight ?? 800;
      datBienDang(h, true);   // trượt tiếp xuống từ vị trí đang kéo
      onClose();
    } else {
      datBienDang(0, true);   // bật về
      window.setTimeout(() => { if (!keoRef.current) datBienDang(null, false); }, 280);
    }
  };
  // Mở lại sau khi đã kéo đóng: xoá biến dạng thủ công để hiệu ứng vào chạy bằng class như thường.
  useEffect(() => { if (isOpen) datBienDang(null, false); }, [isOpen]);

  // Scale theo DESIGN.md (sm/md/lg/xl) + `full` cho modal bảng dữ liệu lớn. Xem chú thích prop maxWidth.
  const maxWidthClasses = {
    'sm': 'max-w-[420px]',
    'md': 'max-w-[560px]',
    'lg': 'max-w-[720px]',
    'xl': 'max-w-[960px]',
    'full': 'max-w-[95vw]'
  };

  const isBottom = position === 'bottom';
  const showHeader = !hideHeader && !!(title || subTitle);
  const iosHeader = isSheet && !!primaryAction && showHeader;
  // Chuẩn (B) chủ dự án chốt 2026-10-07: modal bo theo token --modal-radius (16px, class rounded-overlay).
  const roundedClass = noRounded ? '' : (isBottom ? 'rounded-t-overlay sm:rounded-overlay' : 'rounded-overlay');
  const roundedFooterClass = noRounded ? '' : (isBottom ? 'sm:rounded-b-overlay' : 'rounded-b-overlay');

  const primaryButton = primaryAction && (
    <Button type="button" onClick={primaryAction.onClick} disabled={primaryAction.disabled} isLoading={primaryAction.loading}>
      {primaryAction.label}
    </Button>
  );
  // Laptop / hộp thoại giữa: primaryAction thành cặp nút ở chân (trừ khi nơi dùng tự truyền footer).
  const footerContent = footer ?? (primaryAction && !iosHeader ? (
    <div className="flex justify-end gap-2">
      <Button type="button" variant="secondary" onClick={onClose}>{cancelLabel}</Button>
      {primaryButton}
    </div>
  ) : null);

  if (!mounted) return null;

  // Portal ra document.body — tránh modal bị kẹt/lệch vị trí nếu component cha có overflow-hidden hoặc transform.
  return ReactDOM.createPortal(
    // data-modal-overlay: styles.css dùng nó để hạ thanh trên + thanh điều hướng dưới của
    // mobile xuống DƯỚI modal khi modal mở (trước đây 2 thanh z-100/z-190 đè lên modal z-50).
    <div
      ref={rootRef}
      data-modal-overlay=""
      className={cn(
        "fixed inset-0 flex justify-center",
        isBottom ? "items-end sm:items-center p-0 sm:p-6" : "items-center p-3 sm:p-6",
        zIndex
      )}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        aria-hidden="true"
        className={cn(
          "absolute inset-0 bg-slate-900/50 backdrop-blur-[2px] transition-opacity duration-200 motion-reduce:transition-none",
          shown ? "opacity-100" : "opacity-0"
        )}
      />

      {/* Modal Container */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={showHeader && title ? titleId : undefined}
        aria-label={showHeader && title ? undefined : ariaLabel}
        tabIndex={-1}
        data-sheet={isSheet ? '' : undefined}
        className={cn(
          // `dvh` chứ không `vh`: trên Safari iOS `90vh` tính cả phần màn hình nằm dưới thanh địa chỉ
          // → đáy modal (nút Lưu/Huỷ ở footer) bị che khi thanh địa chỉ đang hiện. Có bàn phím ảo: không cao quá phần nhìn thấy.
          "relative w-full min-w-0 bg-white dark:bg-slate-900 shadow-xl border border-slate-200 dark:border-slate-700 flex flex-col max-h-[min(90dvh,calc(var(--ycx-vvh,100dvh)_-_16px))] overflow-hidden focus:outline-none",
          "motion-reduce:transition-none",
          isSheet
            ? cn("transition-transform duration-[280ms] ease-[cubic-bezier(0.32,0.72,0,1)]", shown ? "translate-y-0" : "translate-y-full")
            : cn("transition-[opacity,transform] duration-200 ease-out", shown ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-[0.97] translate-y-2"),
          // Sheet dính đáy màn hình: chừa vùng thanh Home của iPhone cho footer.
          isBottom && "pb-[env(safe-area-inset-bottom,0px)] sm:pb-0",
          roundedClass,
          maxWidthClasses[maxWidth],
          panelClassName
        )}
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
        onPointerMove={dangKeo}
        onPointerUp={thaKeo}
        onPointerCancel={thaKeo}
      >
        {/* Thanh nắm của sheet — vùng kéo để đóng (cùng hàng tiêu đề bên dưới). */}
        {isSheet && (
          <div
            data-sheet-handle=""
            onPointerDown={batDauKeo}
            className={cn("flex-none flex justify-center pt-2 pb-1 cursor-grab", showHeader && !iosHeader && "bg-slate-50/50")}
            style={{ touchAction: 'none' }}
            aria-hidden="true"
          >
            <div className="w-9 h-[5px] rounded-full bg-slate-300" />
          </div>
        )}

        {/* Header kiểu iOS: [Huỷ] — Tiêu đề — [Lưu] */}
        {iosHeader && (
          <div
            onPointerDown={batDauKeo}
            style={{ touchAction: 'none' }}
            className="flex-none grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-2 pb-2 border-b border-slate-200/80"
          >
            <Button type="button" variant="unstyled" size="none" onClick={onClose}
              className="justify-self-start min-h-11 px-2 text-[17px] text-sky-600 active:opacity-60">
              {cancelLabel}
            </Button>
            <div className="min-w-0 text-center">
              {subTitle && <p className="text-[12px] leading-4 text-slate-500 truncate">{subTitle}</p>}
              <h3 id={titleId} className={cn("text-[17px] font-semibold leading-[22px] truncate", titleColorClass)}>{title}</h3>
            </div>
            <Button type="button" variant="unstyled" size="none" onClick={primaryAction!.onClick}
              disabled={primaryAction!.disabled || primaryAction!.loading}
              className="justify-self-end min-h-11 px-2 text-[17px] font-semibold text-sky-600 active:opacity-60 disabled:text-slate-300">
              {primaryAction!.loading ? <AppIcon name="loading" spin size="md" /> : primaryAction!.label}
            </Button>
          </div>
        )}

        {/* Header thường */}
        {showHeader && !iosHeader && (
          // Điện thoại: hàng 1 = tiêu đề + nút đóng, hàng 2 = `controls` (tự xuống dòng). Trước đây tất
          // cả nằm 1 hàng không xuống dòng: modal "Chi tiết đơn hàng" (6 nút) đẩy nút ĐÓNG ra ngoài
          // màn hình iPhone và ép tiêu đề thành cột 1 chữ/dòng (dữ liệu thật 2026-09-28). Xuống dòng
          // thay vì cuộn ngang vì khung cuộn sẽ cắt mất menu thả xuống nằm trong `controls`.
          <div
            onPointerDown={batDauKeo}
            style={isSheet ? { touchAction: 'none' } : undefined}
            className="flex-none px-4 sm:px-5 py-2.5 sm:py-4 border-b border-slate-100 dark:border-slate-700/50 flex flex-wrap sm:flex-nowrap items-center justify-between gap-x-2 gap-y-2 bg-slate-50/50 dark:bg-slate-900/20">
            <div className="order-1 min-w-0 flex-1">
              {subTitle && (
                <p className="text-[12px] sm:text-[13px] font-normal text-slate-500 dark:text-slate-400">{subTitle}</p>
              )}
              {title && (
                <h3 id={titleId} className={cn("font-semibold text-[17px] leading-snug tracking-tight", titleColorClass)}>
                  {title}
                </h3>
              )}
            </div>
            {controls && (
              <div className="order-3 sm:order-2 w-full sm:w-auto flex flex-wrap sm:flex-nowrap items-center gap-2 sm:shrink-0">
                {controls}
              </div>
            )}
            {!hideCloseButton && (
              <Button
                type="button"
                variant="unstyled"
                size="none"
                onClick={onClose}
                aria-label="Đóng"
                // Nút đóng từng chỉ 22px trên iPhone (icon 14px + p-1) — nhỏ nhất trong mọi modal.
                className="order-2 sm:order-3 shrink-0 min-h-11 min-w-11 -mr-2 sm:min-h-0 sm:min-w-0 sm:mr-0 p-1.5 flex items-center justify-center rounded-full text-slate-500 bg-slate-200/50 hover:bg-slate-200 hover:text-slate-700 dark:hover:text-slate-300 dark:hover:bg-slate-700 transition-colors focus:ring-2 focus:ring-sky-500/50 sm:bg-transparent"
              >
                <AppIcon name="close" size="md" />
              </Button>
            )}
          </div>
        )}

        {/* Body — chỉ cuộn DỌC; con trực tiếp được co (min-w-0) thay vì đẩy khung rộng ra (lỗi #5/#6/#21).
            Đệm thân = biến `--modal-pad` (12px iPhone / 20px từ sm) — khối muốn tràn sát mép dùng class `modal-bleed*` (styles.css)
            để lấy ĐÚNG đệm này. Trước GĐ5 mỗi nơi tự viết `-m-5` (20px) trong khi đệm iPhone chỉ 12px → lấn 8px mỗi bên, chữ bị
            cắt mép trái/phải ("gành Hàng", "Xóa the", cột MÃ NV). */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain [--modal-pad:0.75rem] sm:[--modal-pad:1.25rem] p-(--modal-pad) custom-scrollbar [&>*]:min-w-0">
          {children}
        </div>

        {/* Footer */}
        {footerContent && (
          <div className={cn("flex-none px-4 sm:px-5 py-2.5 sm:py-4 border-t border-slate-100 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-900/50", roundedFooterClass)}>
            {footerContent}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
