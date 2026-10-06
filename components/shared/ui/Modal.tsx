import React, { useEffect, useId, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence, useDragControls, type PanInfo } from 'motion/react';
import { cn } from './utils';
import { Button } from './Button';
import { AppIcon } from './icon/AppIcon';

// ═══════════════════════════════════════════════════════════════════════
// NGĂN XẾP MODAL (audit A11/A12, 2026-09-29)
// Trước đây MỖI instance — kể cả modal đang ĐÓNG — ghi `body.style.overflow = 'unset'`: đóng một
// ConfirmDialog lồng trong modal khác là mở khoá cuộn trang phía sau dù modal ngoài vẫn mở; và một
// lần Escape đóng MỌI modal đang mở. Nay: modal ghi tên vào ngăn xếp khi mở, khoá cuộn khi ngăn
// xếp từ rỗng → có, trả lại đúng giá trị cũ khi ngăn xếp rỗng; chỉ modal TRÊN CÙNG nhận Escape/Tab.
// Trạng thái nằm trên globalThis (như utils/localDbScope.ts) để 2 bản module trùng vẫn dùng chung.
// ═══════════════════════════════════════════════════════════════════════
interface ModalStackState { stack: string[]; savedOverflow: string | null }
const STACK_KEY = '__ycxModalStack__';

const getModalStack = (): ModalStackState => {
  const g = globalThis as unknown as Record<string, ModalStackState | undefined>;
  if (!g[STACK_KEY]) g[STACK_KEY] = { stack: [], savedOverflow: null };
  return g[STACK_KEY]!;
};

const pushModal = (id: string) => {
  const s = getModalStack();
  if (s.stack.includes(id)) return;
  if (s.stack.length === 0) {
    s.savedOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }
  s.stack.push(id);
};

const popModal = (id: string) => {
  const s = getModalStack();
  const i = s.stack.indexOf(id);
  if (i === -1) return;
  s.stack.splice(i, 1);
  if (s.stack.length === 0) {
    document.body.style.overflow = s.savedOverflow ?? '';
    s.savedOverflow = null;
  }
};

const isTopModal = (id: string) => {
  const s = getModalStack();
  return s.stack[s.stack.length - 1] === id;
};

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]), [contenteditable="true"]';

const getFocusable = (root: HTMLElement) =>
  Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(el => el.getClientRects().length > 0);

/** Trả focus về ô nhập trên màn cảm ứng sẽ bật lại bàn phím ảo (iPhone) — không làm với loại này. */
const isTextEntry = (el: HTMLElement) =>
  el.isContentEditable || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' ||
  (el.tagName === 'INPUT' && !['button', 'checkbox', 'radio', 'submit', 'reset', 'file', 'range', 'color'].includes((el as HTMLInputElement).type));

/** Màn hẹp hơn mốc `sm` (640px) — đúng mốc mà bố cục `position="bottom"` dán đáy màn hình. */
const SHEET_QUERY = '(max-width: 639px)';
function useIsSheetWidth() {
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

const isCoarsePointer = () => typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;

/**
 * HÀNH VI của hộp thoại, tách khỏi GIAO DIỆN (audit A34, 2026-09-30): ngăn xếp modal (khoá cuộn đếm
 * tham chiếu), Escape chỉ đóng modal trên cùng, bẫy Tab trong hộp thoại, đưa focus vào khung và trả
 * về khi đóng. `Modal` dùng hook này; các modal TỰ DỰNG (LINE/Thuế/BI…) gắn cùng hook để có đủ hành
 * vi mà không phải đổi bố cục. Khung gắn `dialogRef` cần `tabIndex={-1}` + `role="dialog"`.
 */
export function useModalBehavior(isOpen: boolean, onClose: () => void, dialogRef: React.RefObject<HTMLElement | null>) {
  const modalId = useId();
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Khoá cuộn theo ngăn xếp + giữ/trả focus. Modal ĐÓNG không đụng tới gì cả.
  useEffect(() => {
    if (!isOpen) return;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    pushModal(modalId);

    // Đưa focus vào hộp thoại (bàn phím/trình đọc màn hình không còn "ở lại" trang phía sau).
    // Focus vào CHÍNH KHUNG hộp thoại chứ không vào ô nhập đầu tiên — trên iPhone focus ô nhập là
    // bật bàn phím ảo. Ô có autoFocus (React focus lúc commit) thì giữ nguyên.
    const raf = requestAnimationFrame(() => {
      const el = dialogRef.current;
      if (el && !el.contains(document.activeElement)) el.focus({ preventScroll: true });
    });

    return () => {
      cancelAnimationFrame(raf);
      popModal(modalId);
      if (
        previouslyFocused && previouslyFocused.isConnected && previouslyFocused !== document.body &&
        !(isTextEntry(previouslyFocused) && isCoarsePointer())
      ) {
        previouslyFocused.focus({ preventScroll: true });
      }
    };
  }, [isOpen, modalId]);

  // Escape: chỉ modal trên cùng; Tab/Shift+Tab: vòng trong modal trên cùng.
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isTopModal(modalId)) return;
      if (e.key === 'Escape') {
        if (!e.defaultPrevented) onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab') return;
      const root = dialogRef.current;
      if (!root) return;
      const active = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      const inside = !!active && root.contains(active);
      // Focus đang ở một lớp nổi khác gắn vào body (panel dropdown qua portal…) — không can thiệp.
      // Chỉ kéo về khi focus lạc ra trang phía sau (#root), ra body, hoặc sang modal bên dưới.
      if (active && !inside && active !== document.body &&
          !active.closest('#root') && !active.closest('[data-modal-overlay]')) return;
      const focusable = getFocusable(root);
      if (focusable.length === 0) {
        e.preventDefault();
        root.focus({ preventScroll: true });
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!inside || active === root) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
      } else if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, modalId]);
}

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  /** Dòng phụ nhỏ hiển thị phía trên title trong header (tương đương subTitle của ModalWrapper cũ). */
  subTitle?: React.ReactNode;
  /** Override màu chữ của title, vd. "text-rose-700 dark:text-rose-400". Mặc định dùng màu slate chuẩn. */
  titleColorClass?: string;
  /** Nội dung tùy chỉnh (nút phụ...) hiển thị cạnh nút đóng trong header. */
  controls?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
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

export function Modal({
  isOpen,
  onClose,
  title,
  subTitle,
  titleColorClass = 'text-slate-800 dark:text-slate-100',
  controls,
  children,
  footer,
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
  useModalBehavior(isOpen, onClose, dialogRef);

  // SHEET KIỂU iOS (Đợt B, kế hoạch iPhone): `position="bottom"` trên màn < 640px trượt lên từ đáy,
  // có thanh nắm, VUỐT XUỐNG để đóng. Chỉ kéo được từ thanh nắm + hàng tiêu đề — kéo trong nội dung
  // vẫn là cuộn nội dung (không giành cử chỉ cuộn, kể cả bảng/danh sách dài trong modal).
  const isSheetWidth = useIsSheetWidth();
  const isSheet = position === 'bottom' && isSheetWidth;
  const dragControls = useDragControls();
  const startSheetDrag = (e: React.PointerEvent) => {
    if (!isSheet) return;
    // Bấm vào nút/ô nhập trong hàng tiêu đề (nút đóng, controls) thì là bấm, không phải kéo.
    if ((e.target as HTMLElement).closest('button, a, input, select, textarea, [role="button"]')) return;
    dragControls.start(e);
  };
  const handleSheetDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > SHEET_CLOSE_OFFSET || info.velocity.y > SHEET_CLOSE_VELOCITY) onClose();
  };

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
  // Chuẩn "Bảng điều khiển ca trực" (2026-09-11): modal bo `rounded-md` (6px), không phải 16px.
  // Bo góc nói "tôi ở tầng khác" — modal ĐÚNG là thứ nổi lên trên nên được bo, nhưng 16px là mức
  // của thẻ trang trí, không phải của cửa sổ công cụ đặt trên bảng số dày.
  const roundedClass = noRounded ? '' : (isBottom ? 'rounded-t-md sm:rounded-md' : 'rounded-md');
  const roundedFooterClass = noRounded ? '' : (isBottom ? 'sm:rounded-b-md' : 'rounded-b-md');

  // Portal ra document.body — tránh modal bị kẹt/lệch vị trí nếu component cha có
  // overflow-hidden hoặc transform (tạo stacking context riêng), đây là cách chuẩn
  // để render modal mà ModalWrapper (hệ cũ) đã làm nhưng Modal chưa có trước đây.
  return ReactDOM.createPortal(
    <AnimatePresence>
      {isOpen && (
        // data-modal-overlay: styles.css dùng nó để hạ thanh trên + thanh điều hướng dưới của
        // mobile xuống DƯỚI modal khi modal mở (trước đây 2 thanh z-100/z-190 đè lên modal z-50).
        <div data-modal-overlay="" className={cn(
          "fixed inset-0 flex justify-center",
          isBottom ? "items-end sm:items-center p-0 sm:p-6" : "items-center p-3 sm:p-6",
          zIndex
        )}>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            aria-hidden="true"
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={showHeader && title ? titleId : undefined}
            aria-label={showHeader && title ? undefined : ariaLabel}
            tabIndex={-1}
            data-sheet={isSheet ? '' : undefined}
            initial={isSheet ? { y: '100%' } : { opacity: 0, scale: 0.95, y: 10 }}
            animate={isSheet ? { y: 0 } : { opacity: 1, scale: 1, y: 0 }}
            exit={isSheet ? { y: '100%' } : { opacity: 0, scale: 0.95, y: 10 }}
            transition={isSheet ? { type: 'tween', ease: [0.32, 0.72, 0, 1], duration: 0.28 } : { duration: 0.2, type: 'spring', bounce: 0.25 }}
            drag={isSheet ? 'y' : false}
            dragListener={false}
            dragControls={dragControls}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 1 }}
            onDragEnd={isSheet ? handleSheetDragEnd : undefined}
            className={cn(
              // `dvh` chứ không `vh`: trên Safari iOS `90vh` tính cả phần màn hình nằm dưới thanh địa chỉ
              // → đáy modal (nút Lưu/Huỷ ở footer) bị che khi thanh địa chỉ đang hiện.
              "relative w-full bg-white dark:bg-slate-900 shadow-lg border border-slate-200 dark:border-slate-700 flex flex-col max-h-[90dvh] overflow-hidden focus:outline-none",
              // Sheet dính đáy màn hình: chừa vùng thanh Home của iPhone cho footer.
              isBottom && "pb-[env(safe-area-inset-bottom,0px)] sm:pb-0",
              roundedClass,
              maxWidthClasses[maxWidth]
            )}
            onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
          >
            {/* Thanh nắm của sheet — vùng kéo để đóng (cùng hàng tiêu đề bên dưới). */}
            {isSheet && (
              <div
                data-sheet-handle=""
                onPointerDown={startSheetDrag}
                className={cn("flex-none flex justify-center pt-2 pb-1 cursor-grab", showHeader && "bg-slate-50/50")}
                style={{ touchAction: 'none' }}
                aria-hidden="true"
              >
                <div className="w-10 h-1.5 rounded-full bg-slate-300" />
              </div>
            )}

            {/* Header */}
            {showHeader && (
              // Điện thoại: hàng 1 = tiêu đề + nút đóng, hàng 2 = `controls` (tự xuống dòng). Trước đây tất
              // cả nằm 1 hàng không xuống dòng: modal "Chi tiết đơn hàng" (6 nút) đẩy nút ĐÓNG ra ngoài
              // màn hình iPhone và ép tiêu đề thành cột 1 chữ/dòng (dữ liệu thật 2026-09-28). Xuống dòng
              // thay vì cuộn ngang vì khung cuộn sẽ cắt mất menu thả xuống nằm trong `controls`.
              <div
                onPointerDown={startSheetDrag}
                style={isSheet ? { touchAction: 'none' } : undefined}
                className="flex-none px-3.5 sm:px-5 py-2.5 sm:py-4 border-b border-slate-100 dark:border-slate-700/50 flex flex-wrap sm:flex-nowrap items-center justify-between gap-x-2 gap-y-2 bg-slate-50/50 dark:bg-slate-900/20">
                <div className="order-1 min-w-0 flex-1">
                  {subTitle && (
                    <p className="text-[11px] sm:text-xs font-normal text-slate-500 dark:text-slate-400">{subTitle}</p>
                  )}
                  {title && (
                    <h3 id={titleId} className={cn("font-bold text-sm sm:text-lg tracking-tight", titleColorClass)}>
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
                    className="order-2 sm:order-3 shrink-0 min-h-11 min-w-11 -mr-2 sm:min-h-0 sm:min-w-0 sm:mr-0 p-1 flex items-center justify-center rounded text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 dark:hover:text-slate-300 dark:hover:bg-slate-700 transition-colors focus:ring-2 focus:ring-sky-500/50"
                  >
                    <AppIcon name="close" size="md" />
                  </Button>
                )}
              </div>
            )}

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-5 custom-scrollbar">
              {children}
            </div>

            {/* Footer */}
            {footer && (
              <div className={cn("flex-none px-3.5 sm:px-5 py-2.5 sm:py-4 border-t border-slate-100 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-900/50", roundedFooterClass)}>
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
