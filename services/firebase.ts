import { initializeApp } from 'firebase/app';
import { 
    getAuth, 
    GoogleAuthProvider, 
    signOut, 
    signInWithPopup, 
    signInWithRedirect, 
    getRedirectResult 
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics, isSupported } from 'firebase/analytics';

const firebaseConfig = {
    apiKey: "AIzaSyAloEjmYgge4qMEcC5nSEpCKKujXNKCUn4",
    authDomain: "dashboa-7e20b.firebaseapp.com",
    projectId: "dashboa-7e20b",
    storageBucket: "dashboa-7e20b.firebasestorage.app",
    messagingSenderId: "388853115750",
    appId: "1:388853115750:web:33759964955d77a04df6a7",
    measurementId: "G-HCJRZJYEHD"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let analytics: any = null;
isSupported().then(yes => {
    if (yes) {
        analytics = getAnalytics(app);
    }
});

const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('https://www.googleapis.com/auth/drive.file');
googleProvider.addScope('https://www.googleapis.com/auth/spreadsheets');
googleProvider.setCustomParameters({
    prompt: 'select_account'
});

// Helper to check if running on mobile browser or in-app webview
const checkIfMobile = (): boolean => {
    if (typeof navigator === 'undefined') return false;
    const ua = navigator.userAgent || '';
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|FBAN|FBAV|Zalo/i.test(ua);
};

export const loginWithGoogle = async () => {
    if (checkIfMobile()) {
        try {
            await signInWithRedirect(auth, googleProvider);
        } catch (error) {
            console.error("Lỗi đăng nhập Google Redirect:", error);
            throw error;
        }
    } else {
        try {
            const result = await signInWithPopup(auth, googleProvider);
            const credential = GoogleAuthProvider.credentialFromResult(result);
            if (credential?.accessToken) {
                sessionStorage.setItem('googleOAuthToken', credential.accessToken);
            }
            return result.user;
        } catch (error: any) {
            // Fallback to redirect if popup is blocked or unsupported
            if (error.code === 'auth/popup-blocked' || error.code === 'auth/operation-not-supported-in-this-environment') {
                console.warn("Popup blocked or not supported, falling back to redirect...");
                await signInWithRedirect(auth, googleProvider);
            } else {
                console.error("Lỗi đăng nhập Google Popup:", error);
                throw error;
            }
        }
    }
};

/**
 * Force re-consent to ensure all OAuth scopes (including spreadsheets) are granted.
 * Use this when the existing token is missing required scopes.
 */
export const loginWithGoogleForceConsent = async () => {
    const consentProvider = new GoogleAuthProvider();
    consentProvider.addScope('https://www.googleapis.com/auth/drive.file');
    consentProvider.addScope('https://www.googleapis.com/auth/spreadsheets');
    consentProvider.setCustomParameters({ prompt: 'consent' });

    if (checkIfMobile()) {
        try {
            await signInWithRedirect(auth, consentProvider);
        } catch (error) {
            console.error("Lỗi đăng nhập Google Redirect (consent):", error);
            throw error;
        }
    } else {
        try {
            const result = await signInWithPopup(auth, consentProvider);
            const credential = GoogleAuthProvider.credentialFromResult(result);
            if (credential?.accessToken) {
                sessionStorage.setItem('googleOAuthToken', credential.accessToken);
            }
            return result.user;
        } catch (error: any) {
            if (error.code === 'auth/popup-blocked' || error.code === 'auth/operation-not-supported-in-this-environment') {
                console.warn("Popup blocked or not supported (consent), falling back to redirect...");
                await signInWithRedirect(auth, consentProvider);
            } else {
                console.error("Lỗi đăng nhập Google (consent):", error);
                throw error;
            }
        }
    }
};

/**
 * Handle redirect result after returning from Google OAuth redirect.
 * Resolves to the logged in user or null.
 */
export const handleRedirectResult = async () => {
    try {
        const result = await getRedirectResult(auth);
        if (result) {
            const credential = GoogleAuthProvider.credentialFromResult(result);
            if (credential?.accessToken) {
                sessionStorage.setItem('googleOAuthToken', credential.accessToken);
            }
            return result.user;
        }
    } catch (error) {
        console.error("Lỗi xử lý kết quả Google Redirect:", error);
        throw error;
    }
    return null;
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

export { auth, db, app };
