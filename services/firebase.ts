import { initializeApp } from 'firebase/app';
import {
    getAuth, initializeAuth, indexedDBLocalPersistence, browserLocalPersistence, browserSessionPersistence, browserPopupRedirectResolver,
    GoogleAuthProvider, signOut, signInWithPopup, signInWithRedirect, getRedirectResult, signInWithCredential,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';

const firebaseConfig = {
    apiKey: "AIzaSyAloEjmYgge4qMEcC5nSEpCKKujXNKCUn4",
    // authDomain tuỳ chỉnh (2026-09-22): auth.dashboard.pro.vn trỏ về Firebase Hosting site dashboa-7e20b,
    // nơi Firebase tự phục vụ /__/auth/handler — để popup Google ghi "Tiếp tục tới auth.dashboard.pro.vn"
    // thay vì dashboa-7e20b.firebaseapp.com. Đã thêm domain vào Authorized domains (Firebase Auth) và
    // redirect URI https://auth.dashboard.pro.vn/__/auth/handler vào OAuth Web client (GCP). Đổi lại
    // giá trị cũ nếu domain này ngừng hoạt động — không cần sửa gì khác.
    authDomain: "auth.dashboard.pro.vn",
    projectId: "dashboa-7e20b",
    storageBucket: "dashboa-7e20b.firebasestorage.app",
    messagingSenderId: "388853115750",
    appId: "1:388853115750:web:33759964955d77a04df6a7",
    measurementId: "G-HCJRZJYEHD"
};

const app = initializeApp(firebaseConfig);
// initializeAuth thay getAuth (2026-10-21, video iPhone mới kẹt "Đang hoàn tất đăng nhập…"): getAuth gắn sẵn
// browserPopupRedirectResolver, mà trên iPhone/Safari thư viện CHỜ tải xong khung ẩn gapi (apis.google.com, cho chờ tới
// 30–60 s trên điện thoại) rồi mới xong khởi tạo — máy nào treo bước đó thì onAuthStateChanged lẫn signInWithCredential (nhận
// phiên đăng nhập) treo theo. iPhone/iPad không dùng popup/redirect của app (đi trang auth.dashboard.pro.vn) nên khỏi gắn;
// các lệnh popup/redirect bên dưới truyền resolver tường minh. Máy tính giữ nguyên như getAuth (cùng persistence, cùng resolver).
const laThietBiIOS = typeof navigator !== 'undefined'
    && (/iPad|iPhone|iPod/.test(navigator.userAgent || '') || (navigator.platform === 'MacIntel' && (navigator.maxTouchPoints || 0) > 1));
const khoiTaoAuth = () => {
    try {
        return initializeAuth(app, {
            persistence: [indexedDBLocalPersistence, browserLocalPersistence, browserSessionPersistence],
            popupRedirectResolver: laThietBiIOS ? undefined : browserPopupRedirectResolver,
        });
    } catch {
        return getAuth(app); // đã khởi tạo (nạp lại module lúc dev) → dùng lại instance có sẵn
    }
};
const auth = khoiTaoAuth();
const db = getFirestore(app);
// Singapore — cùng vùng Firestore, gần Việt Nam nhất (functions/src/region.ts). Trước 2026-10-14 mặc định us-central1 (Mỹ).
const functions = getFunctions(app, 'asia-southeast1');

// Google Analytics (lượt xem trang tự động): nạp SAU khi trang đã rảnh, gói riêng (GĐ2 tăng tốc 2026-10-11) — @firebase/analytics
// + installations ~33 KB không cần cho lượt vẽ đầu. Trước đây import tĩnh ở đây nên luôn nằm trong gói firebase tải lúc mở app.
if (typeof window !== 'undefined') {
    const khoiDongAnalytics = () => {
        import('firebase/analytics')
            .then(({ getAnalytics, isSupported }) => isSupported().then(yes => { if (yes) getAnalytics(app); }))
            .catch(() => { /* chặn quảng cáo / mất mạng: bỏ qua, không ảnh hưởng app */ });
    };
    const henGio = () => setTimeout(() => {
        if ('requestIdleCallback' in window) window.requestIdleCallback(khoiDongAnalytics, { timeout: 10_000 }); else khoiDongAnalytics();
    }, 3000);
    if (document.readyState === 'complete') henGio(); else window.addEventListener('load', henGio, { once: true });
}

const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('https://www.googleapis.com/auth/spreadsheets');
googleProvider.addScope('https://www.googleapis.com/auth/drive.file');
googleProvider.setCustomParameters({
    prompt: 'select_account'
});

export const isSafariBrowser = (): boolean => {
    if (typeof navigator === 'undefined') return false;
    const ua = navigator.userAgent || '';
    const isChrome = /CriOS|Chrome|Chromium|Edg|OPR|Android/i.test(ua);
    const isFirefox = /FxiOS|Firefox/i.test(ua);
    return /Safari/i.test(ua) && !isChrome && !isFirefox;
};

export const isIOSDevice = (): boolean => {
    if (typeof navigator === 'undefined') return false;
    const ua = navigator.userAgent || '';
    const isIPadOS = navigator.platform === 'MacIntel' && (navigator.maxTouchPoints || 0) > 1;
    return /iPad|iPhone|iPod/.test(ua) || isIPadOS;
};

export const isAppleOrSafari = (): boolean => {
    return isIOSDevice() || isSafariBrowser();
};

export const isStandaloneMode = (): boolean => {
    if (typeof window === 'undefined') return false;
    return Boolean((window.navigator as any).standalone) ||
           Boolean(window.matchMedia?.('(display-mode: standalone)').matches);
};

export const isInAppBrowser = (): boolean => {
    if (typeof navigator === 'undefined') return false;
    const ua = navigator.userAgent || '';
    return /FBAN|FBAV|Instagram|Zalo|Line|Twitter|Pinterest|Snapchat|GSA/i.test(ua);
};

export const loginWithGoogle = async () => {
    // Trên iOS (iPhone/iPad dù là Safari, Chrome hay PWA Màn hình chính) hoặc In-App browser:
    // Apple WebKit chặn cookie chéo miền ở redirect, đồng thời chặn popup trong PWA.
    // Tự động dùng quy trình Handoff an toàn qua auth.dashboard.pro.vn!
    if (isIOSDevice() || isStandaloneMode() || isInAppBrowser()) {
        console.info('[Auth] Phát hiện iOS / PWA / In-App Browser. Dùng quy trình Handoff an toàn.');
        const prepared = await preparePwaHandoff();
        startPwaHandoffLogin(prepared);
        return;
    }

    try {
        // Cho người dùng đủ thời gian (180s = 3 phút) để chọn tài khoản, nhập mật khẩu và hoàn tất xác thực 2 bước (2FA) trên thiết bị mới
        const popupPromise = signInWithPopup(auth, googleProvider, browserPopupRedirectResolver);
        const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => {
                const err = new Error('Quá thời gian chờ đăng nhập Google (180s).');
                (err as any).code = 'auth/popup-timeout';
                reject(err);
            }, 180000);
        });

        const result = await Promise.race([popupPromise, timeoutPromise]);
        const credential = GoogleAuthProvider.credentialFromResult(result);
        if (credential?.accessToken) {
            sessionStorage.setItem('googleOAuthToken', credential.accessToken);
        }
        return result.user;
    } catch (error: any) {
        console.error("Lỗi đăng nhập Google popup:", error);
        // Nếu người dùng chủ động tắt cửa sổ popup: ném lỗi ra để component reset spinner, không tự ép redirect
        if (error?.code === 'auth/popup-closed-by-user' || error?.code === 'auth/cancelled-popup-request') {
            throw error;
        }
        if (error?.code === 'auth/popup-timeout' || 
            error?.code === 'auth/popup-blocked' || 
            error?.code === 'auth/operation-not-supported-in-this-environment') {
            console.warn('[Auth] Popup không khả dụng hoặc bị chặn. Chuyển sang quy trình Handoff an toàn...');
            const prepared = await preparePwaHandoff();
            startPwaHandoffLogin(prepared);
            return;
        }
        throw error;
    }
};

export const loginWithGoogleRedirect = async () => {
    try {
        await signInWithRedirect(auth, googleProvider, browserPopupRedirectResolver);
    } catch (error) {
        console.error("Lỗi đăng nhập Google redirect:", error);
        throw error;
    }
};

export const checkRedirectLoginResult = async () => {
    try {
        const result = await getRedirectResult(auth, browserPopupRedirectResolver);
        if (result) {
            const credential = GoogleAuthProvider.credentialFromResult(result);
            if (credential?.accessToken) {
                sessionStorage.setItem('googleOAuthToken', credential.accessToken);
            }
            return result.user;
        }
        return null;
    } catch (error) {
        console.error("Lỗi getRedirectResult:", error);
        return null;
    }
};

// ─── Đăng nhập cho app ở MÀN HÌNH CHÍNH iPhone (2026-10-12) ─────────────────────────────────────
// iOS mở trang Google trong khung trình duyệt RIÊNG (bộ nhớ tách khỏi app) nên signInWithRedirect quay
// về app tay không. Thay vào đó: app mở https://auth.dashboard.pro.vn/pwa-login.html (đăng nhập xong ở
// đó), rồi nhận phiên về qua Cloud Function pwaHandoffClaim. Chi tiết: functions/src/pwaHandoff.ts.

export const isIOSStandalonePwa = (): boolean => isIOSDevice() && isStandaloneMode();

const PWA_HANDOFF_KEY = 'ycxPwaHandoff';
const PWA_HANDOFF_MAX_AGE_MS = 6 * 60 * 1000;
const PWA_LOGIN_URL = 'https://auth.dashboard.pro.vn/pwa-login.html';

const toBase64Url = (bytes: Uint8Array): string =>
    btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

export interface PreparedPwaHandoff { verifier: string; url: string; }

/** Sinh sẵn mã (băm SHA-256 là bất đồng bộ) để lúc bấm nút mở cửa sổ được NGAY trong cử chỉ chạm. */
export const preparePwaHandoff = async (): Promise<PreparedPwaHandoff> => {
    const verifier = toBase64Url(crypto.getRandomValues(new Uint8Array(32)));
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
    return { verifier, url: `${PWA_LOGIN_URL}#c=${toBase64Url(new Uint8Array(digest))}` };
};

/** Gọi ĐỒNG BỘ trong onClick. */
export const startPwaHandoffLogin = (prepared: PreparedPwaHandoff): void => {
    try {
        localStorage.setItem(PWA_HANDOFF_KEY, JSON.stringify({ v: prepared.verifier, at: Date.now() }));
    } catch { /* bộ nhớ bị chặn: vẫn mở được */ }
    warmUpPwaHandoff();
    if (isStandaloneMode()) {
        const win = window.open(prepared.url, '_blank');
        if (!win) window.location.assign(prepared.url);
    } else {
        // Trong trình duyệt thông thường (Safari/Chrome trên iPhone): chuyển hướng mượt mà trong cùng tab
        window.location.assign(prepared.url);
    }
};

const readPendingHandoff = (): string | null => {
    try {
        const raw = localStorage.getItem(PWA_HANDOFF_KEY);
        if (!raw) return null;
        const { v, at } = JSON.parse(raw) as { v?: string; at?: number };
        if (typeof v === 'string' && typeof at === 'number' && Date.now() - at < PWA_HANDOFF_MAX_AGE_MS) return v;
        localStorage.removeItem(PWA_HANDOFF_KEY);
    } catch { /* bỏ qua */ }
    return null;
};

export const hasPendingPwaHandoff = (): boolean => readPendingHandoff() !== null;

export const clearPendingPwaHandoff = (): void => {
    try { localStorage.removeItem(PWA_HANDOFF_KEY); } catch { /* bỏ qua */ }
};

/** Lỗi khi ĐÃ nhận được phiên từ trang đăng nhập nhưng không vào được (token hỏng/hết hạn) — khác với "chưa xong". */
export class PwaHandoffSignInError extends Error {
    constructor(public readonly cause: unknown) {
        super('Đã nhận phiên đăng nhập nhưng không vào được ứng dụng.');
        this.name = 'PwaHandoffSignInError';
    }
}

let claimInFlight: Promise<boolean> | null = null;
let lastHandoffError: PwaHandoffSignInError | null = null;

/** Đang có lượt nhận phiên chạy dở (vd AuthContext gọi lúc mở app, trước khi LoginView kịp hiện)? */
export const isPwaHandoffClaiming = (): boolean => claimInFlight !== null;

/** Lấy (và xoá) lỗi nhận phiên xảy ra khi LoginView chưa có mặt để hiện — vd lượt gọi lúc mở app của AuthContext. */
export const takePwaHandoffError = (): PwaHandoffSignInError | null => {
    const e = lastHandoffError;
    lastHandoffError = null;
    return e;
};

/**
 * Hỏi máy chủ xem trang đăng nhập đã gửi phiên về chưa; có thì đăng nhập luôn. Trả về true khi đã vào,
 * false khi trang kia chưa xong (hỏi lại sau). Ném `PwaHandoffSignInError` khi ĐÃ nhận phiên mà không vào được —
 * trước 2026-10-13 lỗi này bị nuốt rồi trả false, app lặng lẽ quay về màn đăng nhập như chưa có gì xảy ra.
 *
 * Gộp lượt gọi đồng thời (AuthContext lúc mở app + vòng hỏi của LoginView cùng chạy): mỗi lúc chỉ 1 yêu cầu.
 */
export const claimPwaHandoff = (retries = 3): Promise<boolean> => {
    if (!claimInFlight) {
        claimInFlight = claimPwaHandoffOnce(retries)
            .catch((err: unknown) => {
                if (err instanceof PwaHandoffSignInError) lastHandoffError = err;
                throw err;
            })
            .finally(() => { claimInFlight = null; });
    }
    return claimInFlight;
};

const claimPwaHandoffOnce = async (retries: number): Promise<boolean> => {
    const verifier = readPendingHandoff();
    if (!verifier) return false;

    for (let attempt = 0; attempt < retries; attempt++) {
        let data: { ready: boolean; idToken?: string; accessToken?: string | null } | null = null;
        try {
            const res = await httpsCallable<{ verifier: string }, { ready: boolean; idToken?: string; accessToken?: string | null }>(
                functions, 'pwaHandoffClaim')({ verifier });
            data = res.data;
        } catch (err) {
            // Phiên đã quá 5 phút trên máy chủ: thử lại vô ích, báo để người dùng bấm lại.
            if ((err as { code?: string })?.code === 'functions/deadline-exceeded') {
                clearPendingPwaHandoff();
                throw new PwaHandoffSignInError(err);
            }
            // Lỗi mạng / máy chủ khởi động: thử lại. Phiên (nếu có) vẫn nằm nguyên trên máy chủ.
            console.warn(`[claimPwaHandoff] Lần thử ${attempt + 1}/${retries} không thành công:`, err);
        }
        if (data?.ready && data.idToken) {
            // Máy chủ đã xoá phiên khi trả về (dùng 1 lần) → không thử lại được nữa, phải báo lỗi rõ.
            clearPendingPwaHandoff();
            try {
                await signInWithCredential(auth, GoogleAuthProvider.credential(data.idToken, data.accessToken ?? undefined));
            } catch (err) {
                throw new PwaHandoffSignInError(err);
            }
            if (data.accessToken) sessionStorage.setItem('googleOAuthToken', data.accessToken);
            return true;
        }
        if (data && !data.ready) return false; // trang kia chưa xong — không cần thử lại ngay
        if (attempt < retries - 1) await new Promise(r => setTimeout(r, 600));
    }
    return false;
};

/** Đánh thức trước Cloud Function nhận phiên trong lúc người dùng còn ở trang Google (đỡ ~5 s khởi động nguội). */
export const warmUpPwaHandoff = (): void => {
    httpsCallable(functions, 'pwaHandoffStore')({ warmup: true }).catch(() => { /* chỉ là hâm nóng */ });
};

export const loginWithGoogleForceConsent = async () => {
    const consentProvider = new GoogleAuthProvider();
    consentProvider.addScope('https://www.googleapis.com/auth/spreadsheets');
    consentProvider.addScope('https://www.googleapis.com/auth/drive.file');
    consentProvider.setCustomParameters({ prompt: 'consent' });
    try {
        const result = await signInWithPopup(auth, consentProvider, browserPopupRedirectResolver);
        const credential = GoogleAuthProvider.credentialFromResult(result);
        if (credential?.accessToken) {
            sessionStorage.setItem('googleOAuthToken', credential.accessToken);
        }
        return result.user;
    } catch (error) {
        console.error("Lỗi đăng nhập Google (consent):", error);
        throw error;
    }
};

export const logoutUser = async () => {
    try {
        sessionStorage.removeItem('googleOAuthToken');
        await signOut(auth);
    } catch (error) {
        console.error("Lỗi đăng xuất:", error);
        throw error;
    }
};

export { auth, db, app, functions };
