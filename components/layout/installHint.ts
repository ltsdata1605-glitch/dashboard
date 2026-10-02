// Thẻ nhắc "Cài lên màn hình chính" (KE_HOACH_NANG_CAP_MOBILE_APP_IPHONE.md Giai đoạn 2 — Đợt A).
// Hàm thuần để test được mà không cần trình duyệt.

export const INSTALL_HINT_DISMISSED_KEY = 'ycx_install_hint_dismissed_at';
export const INSTALL_HINT_SNOOZE_MS = 14 * 24 * 60 * 60 * 1000;

/** Chỉ Safari thật trên iPhone/iPod mới cài được qua "Thêm vào MH chính" một cách đáng tin.
 *  Loại trình duyệt nhúng (Zalo, Facebook, LINE, Messenger, Instagram…) — trong đó không có nút
 *  Chia sẻ của Safari, nhắc chỉ gây rối. Loại Chrome/Firefox/Edge trên iOS cho chắc ăn. */
export function isIphoneSafari(ua: string): boolean {
    if (!/iPhone|iPod/.test(ua)) return false;
    if (!/Safari\//.test(ua) || !/Version\//.test(ua)) return false;
    return !/CriOS|FxiOS|EdgiOS|OPiOS|Zalo|FBAN|FBAV|Line\/|Instagram|Messenger|GSA\//i.test(ua);
}

export function shouldShowInstallHint(opts: {
    ua: string;
    isStandalone: boolean;
    dismissedAt: number | null;
    now: number;
}): boolean {
    if (opts.isStandalone) return false;
    if (!isIphoneSafari(opts.ua)) return false;
    if (opts.dismissedAt && opts.now - opts.dismissedAt < INSTALL_HINT_SNOOZE_MS) return false;
    return true;
}

export function isRunningStandalone(): boolean {
    try {
        if ((navigator as Navigator & { standalone?: boolean }).standalone) return true;
        return window.matchMedia?.('(display-mode: standalone)').matches ?? false;
    } catch {
        return false;
    }
}

export function readDismissedAt(): number | null {
    try {
        const v = Number(localStorage.getItem(INSTALL_HINT_DISMISSED_KEY));
        return Number.isFinite(v) && v > 0 ? v : null;
    } catch {
        return null;
    }
}

export function writeDismissedAt(now: number): void {
    try { localStorage.setItem(INSTALL_HINT_DISMISSED_KEY, String(now)); } catch { /* chế độ riêng tư */ }
}
