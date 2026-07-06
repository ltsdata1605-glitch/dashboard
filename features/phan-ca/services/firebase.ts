import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Named app instance dùng chung project Firebase với hệ thống chính (services/firebase.ts),
// nhưng khởi tạo riêng để tránh lỗi "Firebase App named '[DEFAULT]' already exists" và
// tuân thủ RULES.md §2.0 (features/* không được import services/ gốc).
const PHANCA_APP_NAME = 'phanca';

const firebaseConfig = {
    apiKey: "AIzaSyAloEjmYgge4qMEcC5nSEpCKKujXNKCUn4",
    authDomain: "dashboa-7e20b.firebaseapp.com",
    projectId: "dashboa-7e20b",
    storageBucket: "dashboa-7e20b.firebasestorage.app",
    messagingSenderId: "388853115750",
    appId: "1:388853115750:web:33759964955d77a04df6a7",
    measurementId: "G-HCJRZJYEHD"
};

const app = getApps().find(a => a.name === PHANCA_APP_NAME)
    ? getApp(PHANCA_APP_NAME)
    : initializeApp(firebaseConfig, PHANCA_APP_NAME);

export const auth = getAuth(app);
export const db = getFirestore(app);

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
