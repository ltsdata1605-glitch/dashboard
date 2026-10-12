import React, { useEffect, useId, useRef } from 'react';

/**
 * HÀNH VI HỘP THOẠI dùng chung — tách khỏi Modal.tsx (GĐ3 2026-10-11) để lớp nổi khác (ActionMenu, sheet tự dựng…) dùng mà
 * không kéo theo giao diện Modal. Modal.tsx re-export `useModalBehavior` nên mọi chỗ import cũ vẫn chạy.
 */
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

