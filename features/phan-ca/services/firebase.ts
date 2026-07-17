import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

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

// ⚠️ `auth` ở đây là session RIÊNG, KHÁC với session người dùng thật sự đăng
// nhập (ở app '[DEFAULT]' trong services/firebase.ts) — sign-in không tự đồng
// bộ qua lại giữa 2 named app dù cùng project. Chỉ dùng `auth` này cho
// loginWithGoogleForceConsent (lấy access token Google Sheets/Drive riêng biệt).
// KHÔNG dùng để gọi Cloud Function hay đọc/ghi Firestore theo uid — request sẽ
// có request.auth == null (đã gặp bug thật với generateWithGemini và
// firestoreSync.ts). Cần Firestore/Functions gắn đúng session thật, lấy qua
// useAuth() (root AuthContext) thay vào đó.
export const auth = getAuth(app);

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
