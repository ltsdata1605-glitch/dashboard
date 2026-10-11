import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signOut, signInWithPopup, signInWithRedirect, getRedirectResult } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';

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

export const isStandaloneMode = (): boolean => {
    if (typeof window === 'undefined') return false;
    return Boolean((window.navigator as any).standalone) ||
           Boolean(window.matchMedia?.('(display-mode: standalone)').matches) ||
           Boolean(window.matchMedia?.('(display-mode: fullscreen)').matches) ||
           Boolean(window.matchMedia?.('(display-mode: minimal-ui)').matches);
};

export const isInAppBrowser = (): boolean => {
    if (typeof navigator === 'undefined') return false;
    const ua = navigator.userAgent || '';
    return /FBAN|FBAV|Instagram|Zalo|Line|Twitter|Pinterest|Snapchat|GSA/i.test(ua);
};

export const loginWithGoogle = async () => {
    // Trong môi trường PWA Standalone (Màn hình chính iOS/Android) hoặc In-App browser (Zalo/FB):
    // Cửa sổ popup (signInWithPopup) bị WebKit chặn hoặc treo Promise vĩnh viễn khiến nút xoay mãi.
    // Tự động dùng signInWithRedirect an toàn tuyệt đối!
    if (isStandaloneMode() || isInAppBrowser()) {
        console.info('[Auth] Môi trường PWA Standalone / In-App Browser phát hiện. Tự động dùng signInWithRedirect.');
        await loginWithGoogleRedirect();
        return;
    }

    try {
        // Bảo hiểm timeout 6 giây chống hanging promise nếu popup bị chặn ngầm trên thiết bị
        const popupPromise = signInWithPopup(auth, googleProvider);
        const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => {
                const err = new Error('Popup đăng nhập không phản hồi sau 6s. Đang chuyển hướng...');
                (err as any).code = 'auth/popup-timeout';
                reject(err);
            }, 6000);
        });

        const result = await Promise.race([popupPromise, timeoutPromise]);
        const credential = GoogleAuthProvider.credentialFromResult(result);
        if (credential?.accessToken) {
            sessionStorage.setItem('googleOAuthToken', credential.accessToken);
        }
        return result.user;
    } catch (error: any) {
        console.error("Lỗi đăng nhập Google popup:", error);
        if (error?.code === 'auth/popup-timeout' || 
            error?.code === 'auth/popup-blocked' || 
            error?.code === 'auth/operation-not-supported-in-this-environment') {
            console.warn('[Auth] Popup không khả dụng hoặc bị treo. Tự động chuyển hướng đăng nhập...');
            await loginWithGoogleRedirect();
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
