import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signOut, signInWithPopup, signInWithRedirect, getRedirectResult, signInWithCredential } from 'firebase/auth';
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
const auth = getAuth(app);
const db = getFirestore(app);
const functions = getFunctions(app);

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
        const popupPromise = signInWithPopup(auth, googleProvider);
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
        await signInWithRedirect(auth, googleProvider);
    } catch (error) {
        console.error("Lỗi đăng nhập Google redirect:", error);
        throw error;
    }
};

export const checkRedirectLoginResult = async () => {
    try {
        const result = await getRedirectResult(auth);
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

/** Hỏi máy chủ xem trang đăng nhập đã gửi phiên về chưa; có thì đăng nhập luôn. Trả về true khi đã vào. */
export const claimPwaHandoff = async (retries = 3): Promise<boolean> => {
    const verifier = readPendingHandoff();
    if (!verifier) return false;
    
    for (let attempt = 0; attempt < retries; attempt++) {
        try {
            const res = await httpsCallable<{ verifier: string }, { ready: boolean; idToken?: string; accessToken?: string | null }>(
                functions, 'pwaHandoffClaim')({ verifier });
            const { ready, idToken, accessToken } = res.data;
            if (ready && idToken) {
                clearPendingPwaHandoff();
                await signInWithCredential(auth, GoogleAuthProvider.credential(idToken, accessToken ?? undefined));
                if (accessToken) sessionStorage.setItem('googleOAuthToken', accessToken);
                return true;
            }
        } catch (err) {
            console.warn(`[claimPwaHandoff] Lần thử ${attempt + 1}/${retries} không thành công:`, err);
        }
        if (attempt < retries - 1) {
            await new Promise(r => setTimeout(r, 600));
        }
    }
    return false;
};

export const loginWithGoogleForceConsent = async () => {
    const consentProvider = new GoogleAuthProvider();
    consentProvider.addScope('https://www.googleapis.com/auth/spreadsheets');
    consentProvider.addScope('https://www.googleapis.com/auth/drive.file');
    consentProvider.setCustomParameters({ prompt: 'consent' });
    try {
        const result = await signInWithPopup(auth, consentProvider);
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
