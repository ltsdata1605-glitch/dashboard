import React, { useEffect, useId, useRef } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './utils';
import { Button } from './Button';
import { Icon } from '../../common/Icon';

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

const isCoarsePointer = () => typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;

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
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl' | 'full';
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

  // Scale theo DESIGN.md (sm/md/lg/xl chuẩn hóa theo boltz_project_rules_md) —
  // 2xl/4xl/full là size mở rộng riêng của dự án cho các modal nhiều nội dung
  // (bảng dữ liệu lớn...), DESIGN.md gốc không định nghĩa nên giữ nguyên như cũ.
  const maxWidthClasses = {
    'sm': 'max-w-[420px]',
    'md': 'max-w-[560px]',
    'lg': 'max-w-[720px]',
    'xl': 'max-w-[960px]',
    '2xl': 'max-w-2xl',
    '4xl': 'max-w-4xl',
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
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2, type: 'spring', bounce: 0.25 }}
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
            {/* Header */}
            {showHeader && (
              <div className="flex-none px-3.5 sm:px-5 py-2.5 sm:py-4 border-b border-slate-100 dark:border-slate-700/50 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/20">
                <div>
                  {subTitle && (
                    <p className="text-[11px] sm:text-xs font-normal text-slate-500 dark:text-slate-400">{subTitle}</p>
                  )}
                  {title && (
                    <h3 id={titleId} className={cn("font-bold text-sm sm:text-lg tracking-tight", titleColorClass)}>
                      {title}
                    </h3>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {controls}
                  {!hideCloseButton && (
                    <Button
                      type="button"
                      variant="unstyled"
                      size="none"
                      onClick={onClose}
                      aria-label="Đóng"
                      // Nút đóng từng chỉ 22px trên iPhone (icon 14px + p-1) — nhỏ nhất trong mọi modal.
                      className="min-h-11 min-w-11 -mr-2 sm:min-h-0 sm:min-w-0 sm:mr-0 p-1 flex items-center justify-center rounded text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 dark:hover:text-slate-300 dark:hover:bg-slate-700 transition-colors focus:ring-2 focus:ring-sky-500/50"
                    >
                      <Icon name="x" size={4.5} />
                    </Button>
                  )}
                </div>
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
