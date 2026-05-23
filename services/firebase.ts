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

// Helper to check if running on mobile browser
const checkIfMobile = (): boolean => {
    if (typeof navigator === 'undefined') return false;
    const ua = navigator.userAgent || '';
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
};

// Helper to check if running inside an in-app WebView
const checkIfInAppWebView = (): boolean => {
    if (typeof navigator === 'undefined') return false;
    const ua = navigator.userAgent || '';
    return /FBAN|FBAV|Instagram|Zalo|Line|Twitter|Pinterest|Snapchat|GSA/i.test(ua);
};

export const loginWithGoogle = async () => {
    const isInApp = checkIfInAppWebView();
    
    if (isInApp) {
        console.log("In-app webview detected, using redirect flow directly.");
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
            // Fallback to redirect if popup is blocked, closed, or unsupported
            if (
                error.code === 'auth/popup-blocked' || 
                error.code === 'auth/operation-not-supported-in-this-environment' ||
                error.code === 'auth/popup-closed-by-user' ||
                checkIfMobile()
            ) {
                console.warn("Popup blocked or not supported, falling back to redirect...");
                try {
                    await signInWithRedirect(auth, googleProvider);
                } catch (redirError) {
                    console.error("Lỗi đăng nhập Google Redirect:", redirError);
                    throw redirError;
                }
            } else {
                console.error("Lỗi đăng nhập Google Popup:", error);
                throw error;
            }
        }
    }
};

/**
 * Force re-consent to ensure all OAuth scopes (including spreadsheets) are granted.
 */
export const loginWithGoogleForceConsent = async () => {
    const consentProvider = new GoogleAuthProvider();
    consentProvider.addScope('https://www.googleapis.com/auth/drive.file');
    consentProvider.addScope('https://www.googleapis.com/auth/spreadsheets');
    consentProvider.setCustomParameters({ prompt: 'consent' });

    const isInApp = checkIfInAppWebView();

    if (isInApp) {
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
            if (
                error.code === 'auth/popup-blocked' || 
                error.code === 'auth/operation-not-supported-in-this-environment' ||
                error.code === 'auth/popup-closed-by-user' ||
                checkIfMobile()
            ) {
                console.warn("Popup blocked or not supported (consent), falling back to redirect...");
                try {
                    await signInWithRedirect(auth, consentProvider);
                } catch (redirError) {
                    console.error("Lỗi đăng nhập Google Redirect (consent):", redirError);
                    throw redirError;
                }
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
