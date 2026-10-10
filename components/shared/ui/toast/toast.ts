import rht from 'react-hot-toast';
import type { Renderable, Toast as RhtToast, ToastOptions as RhtToastOptions, ValueOrFunction } from 'react-hot-toast';
import { ICON_REGISTRY, type IconName } from '../icon/iconRegistry';

/**
 * TOAST DÙNG CHUNG — một API, một giao diện cho cả 5 khu vực (KE_HOACH_GIAO_DIEN_APPLE.md mục 3.1, GĐ1, 2026-10-10).
 *
 * Trước đây 79 file gọi thẳng `react-hot-toast` (451 lời gọi) + 5 kiểu toast tự vẽ, một `<Toaster>` đặt góc dưới-phải nên
 * trên iPhone toast đè lên thanh tab. Nay mọi nơi import `toast` từ ĐÂY; giao diện do `AppToaster` vẽ (viên nang trên giữa).
 *
 * TƯƠNG THÍCH NGƯỢC: chữ ký giống `react-hot-toast` (`toast(msg, opts)`, `.success/.error/.loading/.custom/.promise/.dismiss/
 * .remove`) — lời gọi cũ chạy nguyên, kể cả kiểu "loading rồi thay bằng success cùng `id`". Thêm mới:
 *   - `toast.info` / `toast.warning` (react-hot-toast không có 2 loại này);
 *   - `description` (dòng phụ), `icon` nhận TÊN icon (`'cloud'`), `actions` (nút bấm ngay trong toast);
 *   - `toast.action({...})` — toast có nút, không tự tắt (thay ShareRetryToast/BatchShareToast/AutoBonusToasts tự vẽ).
 * Icon emoji kiểu cũ (`icon: 'ℹ️'`) tự quy đổi sang icon chuẩn (CLAUDE.md: không dùng emoji làm icon giao diện).
 *
 * Chỉ import DEFAULT của react-hot-toast ở file này: test đơn vị (vd tests/unit/tax-sync-*.test.ts) mock module đó chỉ với
 * `default`, và hàm của nó được gọi TRỄ (khi bắn toast), không đọc lúc nạp module.
 */

export type ToastKind = 'success' | 'error' | 'info' | 'warning' | 'loading';

export interface ToastAction {
    label: string;
    onClick: () => void | Promise<void>;
    /** Nút chính (tô màu nhấn). Mặc định nút đầu tiên là nút chính khi chỉ có 1 nút. */
    primary?: boolean;
    /** Giữ toast lại sau khi bấm (mặc định: bấm xong là tắt). */
    keepOpen?: boolean;
}

/** Phần mở rộng của dự án, gắn vào object toast của react-hot-toast (thư viện trải mọi option vào object toast). */
export interface ToastMeta {
    kind: ToastKind;
    description?: Renderable;
    iconName?: IconName;
    actions?: ToastAction[];
    /** Gọi khi NGƯỜI DÙNG tự tắt toast (nút ×, vuốt, Esc) — không gọi khi toast tự hết giờ hay khi bấm nút hành động. */
    onDismiss?: () => void;
    /** `data-testid` cho test e2e (mặc định `app-toast`). */
    testId?: string;
}

export type ToastMessage = ValueOrFunction<Renderable, RhtToast>;

export interface ToastOptions extends Omit<RhtToastOptions, 'icon'> {
    /** Dòng phụ dưới tiêu đề (13px, tối đa 3 dòng). */
    description?: Renderable;
    /** Tên icon trong iconRegistry (khuyên dùng), hoặc phần tử React. Emoji kiểu cũ được quy đổi. */
    icon?: IconName | Renderable;
    /** Nút bấm ngay trong toast. Có nút thì toast mặc định không tự tắt. */
    actions?: ToastAction[];
    /** Gọi khi người dùng tự tắt toast (×, vuốt, Esc). */
    onDismiss?: () => void;
    /** `data-testid` cho test e2e. */
    testId?: string;
}

export interface ActionToastOptions extends Omit<ToastOptions, 'actions' | 'description'> {
    title: Renderable;
    description?: Renderable;
    actions: ToastAction[];
    /** Màu/icon theo loại — mặc định `info`. */
    kind?: Exclude<ToastKind, 'loading'>;
}

/** Thời gian hiển thị mặc định theo loại (ms). Lời gọi tự truyền `duration` thì giữ nguyên của lời gọi. */
export const TOAST_DURATION: Record<ToastKind, number> = {
    success: 2500,
    info: 3000,
    warning: 5000,
    error: 6000,
    loading: Infinity,
};

/** Emoji kiểu cũ → icon chuẩn. Emoji không có trong bảng → dùng icon mặc định của loại toast. */
const EMOJI_ICON: Record<string, IconName> = {
    'ℹ️': 'info', 'ℹ': 'info', '☁️': 'cloud', '☁': 'cloud', '⏰': 'clock', '⏱️': 'clock', '🕒': 'clock',
    '⚠️': 'warning', '⚠': 'warning', '✅': 'success', '✔️': 'success', '❌': 'error', '⛔': 'error',
    '📋': 'copy', '📅': 'calendar', '📤': 'upload', '📥': 'download', '💾': 'save', '🔄': 'refresh',
    '🗑️': 'delete', '🎉': 'success', '📸': 'exportImage', '🖼️': 'exportImage', '🔒': 'lock', '⚡': 'quick',
};

/** Chuỗi có phải TÊN icon đã đăng ký không. */
export function isIconName(value: unknown): value is IconName {
    return typeof value === 'string' && Object.prototype.hasOwnProperty.call(ICON_REGISTRY, value);
}

/** Tách option `icon` thành: tên icon chuẩn (để AppToaster vẽ) hoặc phần tử React (giữ nguyên). */
export function normalizeIcon(icon: ToastOptions['icon']): { iconName?: IconName; iconNode?: Renderable } {
    if (icon == null) return {};
    if (isIconName(icon)) return { iconName: icon };
    if (typeof icon === 'string') {
        const mapped = EMOJI_ICON[icon.trim()];
        return mapped ? { iconName: mapped } : {};
    }
    return { iconNode: icon };
}

/** Đọc phần mở rộng của dự án trên một toast (toast tạo thẳng bằng react-hot-toast — vd bên trong `promise` — thì suy từ `type`). */
export function getToastMeta(t: RhtToast): ToastMeta {
    const own = (t as RhtToast & { ycx?: ToastMeta }).ycx;
    if (own) return own;
    const kind: ToastKind = t.type === 'success' ? 'success' : t.type === 'error' ? 'error' : t.type === 'loading' ? 'loading' : 'info';
    return { kind };
}

type RhtBase = 'blank' | 'success' | 'error' | 'loading';

const ERROR_ARIA = { role: 'alert', 'aria-live': 'assertive' } as const;

function show(kind: ToastKind, base: RhtBase, message: ToastMessage, opts: ToastOptions = {}): string {
    const { description, icon, actions, duration, onDismiss, testId, ...rest } = opts;
    const { iconName, iconNode } = normalizeIcon(icon);
    // Gán ĐỦ mọi trường của `ycx` (kể cả undefined): react-hot-toast GỘP object khi cập nhật toast cùng `id` — không gán lại
    // thì toast "loading" đổi sang "success" vẫn mang nút/mô tả cũ.
    const ycx: ToastMeta = { kind, description, iconName, actions: actions && actions.length ? actions : undefined, onDismiss, testId };
    const hasActions = !!ycx.actions;
    const finalOpts = {
        ...(kind === 'error' ? { ariaProps: ERROR_ARIA } : {}),
        ...rest,
        icon: iconNode,
        duration: duration ?? (hasActions ? Infinity : TOAST_DURATION[kind]),
        ycx,
    } as RhtToastOptions;
    switch (base) {
        case 'success': return rht.success(message, finalOpts);
        case 'error': return rht.error(message, finalOpts);
        case 'loading': return rht.loading(message, finalOpts);
        default: return rht(message, finalOpts);
    }
}

type ToastFn = (message: ToastMessage, opts?: ToastOptions) => string;

interface ToastApi extends ToastFn {
    success: ToastFn;
    error: ToastFn;
    info: ToastFn;
    warning: ToastFn;
    loading: ToastFn;
    /** Toast có nút bấm (mặc định không tự tắt). Trả về id. */
    action: (opts: ActionToastOptions) => string;
    /** Nội dung tự vẽ hoàn toàn — chỉ để tương thích, KHÔNG dùng cho chỗ mới (mất giao diện chung). */
    custom: (message: ToastMessage, opts?: RhtToastOptions) => string;
    promise: <T>(
        promise: Promise<T> | (() => Promise<T>),
        msgs: { loading: Renderable; success?: ValueOrFunction<Renderable, T>; error?: ValueOrFunction<Renderable, unknown> },
        opts?: RhtToastOptions,
    ) => Promise<T>;
    dismiss: (toastId?: string) => void;
    dismissAll: () => void;
    remove: (toastId?: string) => void;
    removeAll: () => void;
}

const base: ToastFn = (message, opts) => show('info', 'blank', message, opts);

export const toast: ToastApi = Object.assign(base, {
    success: ((m, o) => show('success', 'success', m, o)) as ToastFn,
    error: ((m, o) => show('error', 'error', m, o)) as ToastFn,
    info: ((m, o) => show('info', 'blank', m, o)) as ToastFn,
    warning: ((m, o) => show('warning', 'blank', m, o)) as ToastFn,
    loading: ((m, o) => show('loading', 'loading', m, o)) as ToastFn,
    action: ({ title, description, actions, kind = 'info', duration, ...rest }: ActionToastOptions) =>
        show(kind, kind === 'success' ? 'success' : kind === 'error' ? 'error' : 'blank', title, { ...rest, description, actions, duration: duration ?? Infinity }),
    custom: (message: ToastMessage, opts?: RhtToastOptions) => rht.custom(message, opts),
    promise: <T,>(
        promise: Promise<T> | (() => Promise<T>),
        msgs: { loading: Renderable; success?: ValueOrFunction<Renderable, T>; error?: ValueOrFunction<Renderable, unknown> },
        opts?: RhtToastOptions,
    ) => rht.promise(promise, msgs, opts),
    dismiss: (toastId?: string) => rht.dismiss(toastId),
    dismissAll: () => rht.dismiss(),
    remove: (toastId?: string) => rht.remove(toastId),
    removeAll: () => rht.remove(),
});

export default toast;
