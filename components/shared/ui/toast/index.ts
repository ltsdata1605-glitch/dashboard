/**
 * Toast dùng chung — nơi DUY NHẤT được import `react-hot-toast` (ESLint chặn chỗ khác). Xem `toast.ts`.
 *   import { toast } from '<…>/components/shared/ui/toast';
 *   toast.success('Đã lưu'); toast.warning('…', { description: '…' }); toast.action({ title, actions: [...] });
 */
export { toast, default, TOAST_DURATION, getToastMeta, normalizeIcon, isIconName } from './toast';
export type { ToastKind, ToastAction, ToastMeta, ToastOptions, ActionToastOptions, ToastMessage } from './toast';
export { AppToaster } from './AppToaster';
