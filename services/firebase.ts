import { initializeApp, SDK_VERSION } from 'firebase/app';
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

// ─── Nhớ tài khoản đã dùng trên máy (2026-10-21, chủ dự án yêu cầu) ──────────────────────────────────────────────
// Lần sau Google chọn sẵn tài khoản đó (login_hint) thay vì hiện danh sách chọn — bớt một bước. Chỉ lưu email/tên để
// hiện trên màn đăng nhập, KHÔNG lưu token. "Dùng tài khoản khác" xoá đi và hỏi chọn tài khoản như cũ.
const TAI_KHOAN_GAN_NHAT_KEY = 'ycxTaiKhoanGanNhat';
export interface TaiKhoanGanNhat { email: string; ten?: string | null }
export const layTaiKhoanGanNhat = (): TaiKhoanGanNhat | null => {
    try {
        const v = JSON.parse(localStorage.getItem(TAI_KHOAN_GAN_NHAT_KEY) || 'null') as TaiKhoanGanNhat | null;
        return v && typeof v.email === 'string' && v.email.includes('@') ? v : null;
    } catch { return null; }
};
export const nhoTaiKhoan = (email: string | null | undefined, ten?: string | null): void => {
    if (!email) return;
    try { localStorage.setItem(TAI_KHOAN_GAN_NHAT_KEY, JSON.stringify({ email, ten: ten ?? null })); } catch { /* bộ nhớ bị chặn */ }
};
export const quenTaiKhoan = (): void => {
    try { localStorage.removeItem(TAI_KHOAN_GAN_NHAT_KEY); } catch { /* bỏ qua */ }
};
/** Tham số gửi Google: có tài khoản đã nhớ → login_hint (chọn sẵn); chưa có → hiện danh sách chọn tài khoản. */
const thamSoGoogle = (): Record<string, string> => {
    const tk = layTaiKhoanGanNhat();
    return tk ? { login_hint: tk.email } : { prompt: 'select_account' };
};

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
    // Trên mọi nền tảng (Desktop Chrome/Mac/PC, iOS, Android, PWA):
    // Dùng quy trình chuyển hướng an toàn trong cùng tab, không mở popup!
    console.info('[Auth] Chuyển hướng đăng nhập Google trong cùng tab (không mở popup).');
    const prepared = await preparePwaHandoff();
    startPwaHandoffLogin(prepared);
};

export const loginWithGoogleRedirect = async () => {
    try {
        googleProvider.setCustomParameters(thamSoGoogle());
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

export interface PreparedPwaHandoff { verifier: string; code: string; }

/** Sinh sẵn mã (băm SHA-256 là bất đồng bộ) để lúc bấm nút mở cửa sổ được NGAY trong cử chỉ chạm. */
export const preparePwaHandoff = async (): Promise<PreparedPwaHandoff> => {
    const verifier = toBase64Url(crypto.getRandomValues(new Uint8Array(32)));
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
    return { verifier, code: toBase64Url(new Uint8Array(digest)) };
};

let prewarmedPkce: PreparedPwaHandoff | null = null;
let prewarmPromise: Promise<PreparedPwaHandoff> | null = null;
let currentPrewarmSeq = 0;

/**
 * Tự động chuẩn bị trước cặp mã PKCE:
 * - Khử trùng lặp (deduplication): các lời gọi đồng thời chia sẻ chung 1 in-flight Promise.
 * - Sequence tag (currentPrewarmSeq): ngăn Promise cũ giải quyết sau ghi đè lên kết quả mới hơn.
 */
export const prewarmPwaHandoff = (): Promise<PreparedPwaHandoff> => {
    if (prewarmedPkce) {
        return Promise.resolve(prewarmedPkce);
    }
    if (prewarmPromise) {
        return prewarmPromise;
    }
    if (typeof crypto === 'undefined' || !crypto.subtle) {
        return Promise.reject(new Error('Web Crypto API không khả dụng'));
    }
    const seq = ++currentPrewarmSeq;
    prewarmPromise = preparePwaHandoff()
        .then(prepared => {
            if (seq === currentPrewarmSeq) {
                prewarmedPkce = prepared;
            }
            return prepared;
        })
        .finally(() => {
            if (seq === currentPrewarmSeq) {
                prewarmPromise = null;
            }
        });
    return prewarmPromise;
};

/**
 * Lấy cặp mã PKCE đã chuẩn bị sẵn (tiêu thụ một lần duy nhất).
 * Khi đã lấy ra, bộ nhớ đệm được xóa ngay lập tức để không bao giờ dùng lại mã cũ,
 * đồng thời tự động kích hoạt chuẩn bị mã tiếp theo trong nền.
 */
export const takePrewarmedPwaHandoff = (): PreparedPwaHandoff | null => {
    const p = prewarmedPkce;
    if (p) {
        prewarmedPkce = null;
        // Bắt đầu chuẩn bị mã mới cho lượt tương tác tiếp theo
        prewarmPwaHandoff().catch(() => {});
    }
    return p;
};

/**
 * Lấy ngay mã đã chuẩn bị sẵn nếu có, hoặc đợi Promise chuẩn bị đang chạy giải quyết.
 * Đảm bảo mỗi lời gọi luôn nhận được một cặp mã độc nhất và an toàn (không trùng lặp).
 */
export const getOrPreparePwaHandoff = async (): Promise<PreparedPwaHandoff> => {
    // 1. Nếu đã có sẵn trong bộ đệm -> lấy ngay lập tức (0ms)
    const ready = takePrewarmedPwaHandoff();
    if (ready) return ready;

    // 2. Nếu đang có promise in-flight hoặc chưa kích hoạt -> đợi promise đó xong
    try {
        await prewarmPwaHandoff();
    } catch {
        // Nếu prewarm lỗi, thử tạo trực tiếp bên dưới
    }

    // 3. Tiêu thụ mã vừa sinh (nếu chưa bị consumer đồng thời khác lấy mất)
    const taken = takePrewarmedPwaHandoff();
    if (taken) return taken;

    // 4. Nếu mã đã bị tiêu thụ bởi lượt gọi khác cùng thời điểm, sinh mã riêng biệt
    return preparePwaHandoff();
};

/** Helper nội bộ để reset trạng thái module trong các bài unit test */
export const _resetPkcePrewarmForTesting = (): void => {
    prewarmedPkce = null;
    prewarmPromise = null;
    lastHandoffError = null;
    activeClaimVerifier = null;
    activeClaimUid = null;
    claimInFlight = null;
    claimInFlightVerifier = null;
    // BUMP sequence thêm 1000 để vô hiệu hoá triệt để mọi Promise cũ đang chạy dở dang từ bài test trước
    currentPrewarmSeq += 1000;
};

// Kích hoạt chuẩn bị trước ngay khi ứng dụng khởi chạy
prewarmPwaHandoff().catch(() => {});

/**
 * Đường dẫn đăng nhập: ĐI THẲNG tới trang xử lý của Firebase (/__/auth/handler — chính URL mà signInWithRedirect dựng), trang
 * đó chuyển sang Google, xong quay về pwa-login.html?c=… để gửi phiên (2026-10-21). Trước đây đi qua pwa-login.html trước để
 * nạp thư viện Firebase (~1–3 s, chậm hơn nhiều trên 4G) chỉ để dựng đúng URL này. `m=pwa`: mở từ app Màn hình chính → trang
 * kia xong thì đóng khung nổi. Có tài khoản đã nhớ → login_hint (Google chọn sẵn).
 */
export const taoUrlDangNhapHandoff = (code: string, laPwa: boolean, retUrl?: string): string => {
    const ve = new URL(PWA_LOGIN_URL);
    ve.searchParams.set('c', code);
    if (laPwa) ve.searchParams.set('m', 'pwa');
    const ret = retUrl || (typeof window !== 'undefined' ? window.location.href : '');
    if (ret) ve.searchParams.set('ret', ret);
    const tk = layTaiKhoanGanNhat();
    if (tk) ve.searchParams.set('h', tk.email); // trang kia phải tự mở lại Google (nút thử lại) thì vẫn chọn sẵn tài khoản
    const q = new URLSearchParams({
        apiKey: firebaseConfig.apiKey,
        appName: '[DEFAULT]',
        authType: 'signInViaRedirect',
        redirectUrl: ve.toString(),
        v: SDK_VERSION,
        providerId: 'google.com',
        customParameters: JSON.stringify(thamSoGoogle()),
        scopes: ['profile', 'https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive.file'].join(','),
    });
    return `https://${firebaseConfig.authDomain}/__/auth/handler?${q.toString()}`;
};

let activeClaimVerifier: string | null = null;
let activeClaimUid: string | null = null;

/**
 * Kiểm tra xem sự kiện đổi Auth State (onAuthStateChanged) có thuộc về phiên hợp lệ hay không.
 * Nếu đang chờ PWA handoff, chỉ chấp nhận user được xác thực bởi đúng phiên verifier hiện hành.
 * Ngăn chặn triệt để việc phiên cũ A hoàn thành muộn kích hoạt side effects (dọn data, ghi đè profile) lên phiên B.
 */
export const isAuthTransitionAuthorized = (currentUser: { uid: string } | null): boolean => {
    // Trạng thái đăng xuất / unauthenticated luôn được phép cập nhật
    if (!currentUser) return true;

    // Nếu không có phiên PWA handoff nào đang chờ (vd: đăng nhập desktop popup, restore từ IDB/persistence): luôn hợp lệ
    const pendingVerifier = readPendingHandoff();
    if (!pendingVerifier) return true;

    // Đang có phiên PWA handoff chờ: currentUser PHẢI thuộc về đúng phiên claiming hiện hành và đúng UID đã được xác thực
    if (activeClaimVerifier !== pendingVerifier) return false;
    if (!activeClaimUid || activeClaimUid !== currentUser.uid) return false;

    return true;
};

/** Gọi ĐỒNG BỘ trong onClick: chuyển hướng trong cùng tab, không mở popup. */
export const startPwaHandoffLogin = (prepared: PreparedPwaHandoff, retUrl?: string): void => {
    activeClaimVerifier = prepared.verifier;
    activeClaimUid = null;
    try {
        localStorage.setItem(PWA_HANDOFF_KEY, JSON.stringify({ v: prepared.verifier, at: Date.now() }));
    } catch { /* bộ nhớ bị chặn: vẫn mở được */ }
    warmUpPwaHandoff();
    // Ranh giới kiểm thử E2E: CHỈ cho phép can thiệp trong môi trường DEV/TEST (import.meta.env.DEV === true).
    // Trong bản build production (npm run build), Vite statically thay thế import.meta.env.DEV bằng false,
    // và toàn bộ khối code này bị loại bỏ hoàn toàn (tree-shaken) khỏi bundle xuất xưởng.
    if (import.meta.env.DEV && typeof window !== 'undefined') {
        const testHook = (window as any).__ycxTestRedirectHook;
        if (typeof testHook === 'function') {
            testHook(taoUrlDangNhapHandoff(prepared.code, false, retUrl));
            return;
        }
    }
    if (typeof window !== 'undefined') {
        if (isIOSStandalonePwa()) {
            // m=pwa: trang đăng nhập biết đang ở khung trình duyệt nổi iOS → xong thì đóng khung
            const win = window.open(taoUrlDangNhapHandoff(prepared.code, true, retUrl), '_blank');
            if (!win) window.location.assign(taoUrlDangNhapHandoff(prepared.code, false, retUrl));
        } else {
            // Mọi trình duyệt (Desktop Chrome, Mac/PC, Safari, Android): chuyển hướng mượt mà trong cùng tab
            window.location.assign(taoUrlDangNhapHandoff(prepared.code, false, retUrl));
        }
    }
};

export const readPendingHandoff = (): string | null => {
    try {
        const raw = localStorage.getItem(PWA_HANDOFF_KEY);
        if (!raw) return null;
        const { v, at } = JSON.parse(raw) as { v?: string; at?: number };
        if (typeof v === 'string' && typeof at === 'number' && Date.now() - at < PWA_HANDOFF_MAX_AGE_MS) return v;
        localStorage.removeItem(PWA_HANDOFF_KEY);
    } catch { /* bộ nhớ bị chặn */ }
    return null;
};

export const hasPendingPwaHandoff = (): boolean => readPendingHandoff() !== null;

/**
 * Xoá phiên handoff chờ xử lý khỏi localStorage.
 * Nếu truyền expectedVerifier: CHỈ xoá khi mã trong localStorage đúng bằng expectedVerifier.
 * Nếu người dùng đã mở phiên mới (verifier khác), hàm sẽ BẢO TOÀN phiên mới và không xoá nhầm.
 */
export const clearPendingPwaHandoff = (expectedVerifier?: string): void => {
    try {
        if (expectedVerifier) {
            const currentVerifier = readPendingHandoff();
            // Nếu phiên hiện tại trong storage khác với expectedVerifier (đã mở phiên mới), bảo toàn phiên mới!
            if (currentVerifier && currentVerifier !== expectedVerifier) {
                return;
            }
        }
        localStorage.removeItem(PWA_HANDOFF_KEY);
        if (!expectedVerifier || expectedVerifier === activeClaimVerifier) {
            activeClaimVerifier = null;
            activeClaimUid = null;
        }
        if (!expectedVerifier || expectedVerifier === claimInFlightVerifier) {
            claimInFlight = null;
            claimInFlightVerifier = null;
        }
    } catch { /* bỏ qua */ }
};

/** Lỗi khi ĐÃ nhận được phiên từ trang đăng nhập nhưng không vào được (token hỏng/hết hạn) — khác với "chưa xong". */
export class PwaHandoffSignInError extends Error {
    constructor(public readonly cause: unknown) {
        super('Đã nhận phiên đăng nhập nhưng không vào được ứng dụng.');
        this.name = 'PwaHandoffSignInError';
    }
}

let claimInFlight: Promise<boolean> | null = null;
let claimInFlightVerifier: string | null = null;
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
 * Gộp lượt gọi đồng thời của CÙNG một phiên verifier: mỗi lúc chỉ 1 yêu cầu.
 * Nếu phiên mới B đã thay thế phiên A, không dùng lại promise của phiên A mà tạo yêu cầu nhận phiên mới ngay.
 */
export const claimPwaHandoff = (retries = 3): Promise<boolean> => {
    const currentVerifier = readPendingHandoff();
    if (!currentVerifier) return Promise.resolve(false);

    if (claimInFlight && claimInFlightVerifier === currentVerifier) {
        return claimInFlight;
    }

    claimInFlightVerifier = currentVerifier;
    claimInFlight = claimPwaHandoffOnce(retries)
        .catch((err: unknown) => {
            if (err instanceof PwaHandoffSignInError) lastHandoffError = err;
            throw err;
        })
        .finally(() => {
            if (claimInFlightVerifier === currentVerifier) {
                claimInFlight = null;
                claimInFlightVerifier = null;
            }
        });
    return claimInFlight;
};

interface KetQuaNhanPhien {
    ready: boolean;
    idToken?: string;
    accessToken?: string | null;
    uid?: string;
    /** Phiên (quyền/Kho/claims) máy chủ tính sẵn lúc pwaHandoffStore — cùng kiểu kết quả resolveSession. */
    profile?: Record<string, unknown> | null;
}

// Trên globalThis (không phải biến module): bundler từng tách module thành 2 bản (contexts/AuthContext.tsx).
const G_HO_SO = globalThis as unknown as { __ycxHoSoDaTinhSan?: { uid: string; profile: Record<string, unknown>; at: number } };
const cat_hoSoDaTinhSan = (uid: string, profile: Record<string, unknown>) => {
    G_HO_SO.__ycxHoSoDaTinhSan = { uid, profile, at: Date.now() };
};
/** Lấy (1 lần) phiên máy chủ tính sẵn cho ĐÚNG tài khoản này, còn mới (< 2 phút). Không có → null (gọi resolveSession như thường). */
export const layHoSoDaTinhSan = (uid: string): Record<string, unknown> | null => {
    const v = G_HO_SO.__ycxHoSoDaTinhSan;
    delete G_HO_SO.__ycxHoSoDaTinhSan;
    return v && v.uid === uid && Date.now() - v.at < 120_000 ? v.profile : null;
};

const claimPwaHandoffOnce = async (retries: number): Promise<boolean> => {
    const verifier = readPendingHandoff();
    if (!verifier) return false;
    activeClaimVerifier = verifier;

    for (let attempt = 0; attempt < retries; attempt++) {
        // Kiểm tra quyền sở hữu phiên: Nếu phiên này đã bị thay thế hoặc huỷ, lập tức dừng lại
        if (readPendingHandoff() !== verifier) {
            return false;
        }

        let data: KetQuaNhanPhien | null = null;
        try {
            const res = await httpsCallable<{ verifier: string }, KetQuaNhanPhien>(functions, 'pwaHandoffClaim')({ verifier });
            data = res.data;
        } catch (err) {
            // Kiểm tra lại sau thao tác mạng: nếu phiên đã bị thay thế trong lúc chờ, bỏ qua hoàn toàn không ném lỗi
            const currentVerifier = readPendingHandoff();
            if (currentVerifier && currentVerifier !== verifier) {
                return false;
            }
            if (!currentVerifier) {
                return false;
            }
            // Phiên đã quá 5 phút trên máy chủ: thử lại vô ích, báo để người dùng bấm lại.
            if ((err as { code?: string })?.code === 'functions/deadline-exceeded') {
                clearPendingPwaHandoff(verifier);
                throw new PwaHandoffSignInError(err);
            }
            // Lỗi mạng / máy chủ khởi động: thử lại. Phiên (nếu có) vẫn nằm nguyên trên máy chủ.
            console.warn(`[claimPwaHandoff] Lần thử ${attempt + 1}/${retries} không thành công:`, err);
        }

        // CHÍNH SÁCH QUYỀN SỞ HỮU PHIÊN: Phiên mới B thay thế hoàn toàn phiên A.
        // Nếu người dùng đã mở phiên mới B trong lúc request A đang chạy, kết quả của A
        // (kể cả ready: true lẫn idToken) TUYỆT ĐỐI KHÔNG ĐƯỢC:
        // 1. Gọi signInWithCredential (ngăn đăng nhập nhầm tài khoản cũ)
        // 2. Ghi đè bộ đệm hồ sơ tính sẵn (cat_hoSoDaTinhSan)
        // 3. Ghi đè token vào sessionStorage
        // 4. Xóa verifier của phiên B trong localStorage
        if (readPendingHandoff() !== verifier) {
            return false;
        }

        if (data?.ready && data.idToken) {
            activeClaimUid = data.uid ?? null;
            const previousTaiKhoan = layTaiKhoanGanNhat();
            // Phiên máy chủ đã tính sẵn lúc trang đăng nhập gửi về → cất lại TRƯỚC khi đăng nhập (onAuthStateChanged chạy ngay
            // trong signInWithCredential) để AuthContext khỏi gọi resolveSession — bớt 1 lượt gọi máy chủ (2026-10-21).
            if (data.uid && data.profile) cat_hoSoDaTinhSan(data.uid, data.profile);
            try {
                await signInWithCredential(auth, GoogleAuthProvider.credential(data.idToken, data.accessToken ?? undefined));
            } catch (err) {
                // Dọn sạch cache hồ sơ tính sẵn khi đăng nhập lỗi để không bị rò rỉ sang phiên sau:
                delete (globalThis as any).__ycxHoSoDaTinhSan;
                activeClaimUid = null;
                // KIỂM TRA QUYỀN SỞ HỮU KHI SIGN-IN THẤT BẠI:
                const currentVerifier = readPendingHandoff();
                if (currentVerifier && currentVerifier !== verifier) {
                    // Người dùng đã mở phiên mới B trong lúc sign-in đang chạy!
                    // Phiên B thay thế A -> bỏ qua lỗi của phiên A, không làm ô nhiễm phiên B
                    return false;
                }
                if (!currentVerifier) {
                    // Người dùng đã chủ động bấm Huỷ -> không ném lỗi
                    return false;
                }
                // Phiên A vẫn là phiên hợp lệ hiện hành nhưng token bị từ chối -> dọn storage và BÁO LỖI THỰC SỰ
                clearPendingPwaHandoff(verifier);
                throw new PwaHandoffSignInError(err);
            }

            // KIỂM TRA QUYỀN SỞ HỮU KHI SIGN-IN THÀNH CÔNG:
            // Tình huống race condition: Người dùng mở phiên B trong lúc signInWithCredential(A) đang chờ Firebase.
            const currentVerifierAfterSignIn = readPendingHandoff();
            if (currentVerifierAfterSignIn !== verifier) {
                // Phiên B đã được tạo (hoặc người dùng đã bấm Huỷ) trong lúc signInWithCredential đang chạy.
                // Tuân thủ chính sách Session Ownership: Phiên B thay thế hoàn toàn phiên A.
                // 1. CHỈ đăng xuất User A nếu auth.currentUser vẫn đang là User A (TUYỆT ĐỐI không đăng xuất nhầm User B!):
                if (auth.currentUser && auth.currentUser.uid === data.uid) {
                    try { await signOut(auth); } catch { /* bỏ qua */ }
                }
                // 2. Dọn sạch cache hồ sơ tính sẵn của User A:
                delete (globalThis as any).__ycxHoSoDaTinhSan;
                activeClaimUid = null;
                // 3. Khôi phục lại tài khoản nhớ trước đó (nếu có) để không ghi đè nhầm User A:
                if (previousTaiKhoan) {
                    nhoTaiKhoan(previousTaiKhoan.email, previousTaiKhoan.ten);
                } else {
                    quenTaiKhoan();
                }
                // 4. Không lưu access token của User A vào sessionStorage và không xoá verifier của phiên B
                return false;
            }

            // Phiên A thành công trọn vẹn và vẫn là chủ sở hữu hợp pháp duy nhất:
            clearPendingPwaHandoff(verifier);
            activeClaimVerifier = null;
            activeClaimUid = null;
            if (data.accessToken) sessionStorage.setItem('googleOAuthToken', data.accessToken);
            return true;
        }
        if (data && !data.ready) return false; // trang kia chưa xong — không cần thử lại ngay
        if (attempt < retries - 1) {
            await new Promise(r => setTimeout(r, 600));
            if (readPendingHandoff() !== verifier) return false;
        }
    }
    return false;
};

/** Đánh thức trước Cloud Function nhận phiên trong lúc người dùng còn ở trang Google (đỡ ~5 s khởi động nguội). */
export const warmUpPwaHandoff = (): void => {
    httpsCallable(functions, 'pwaHandoffStore')({ warmup: true }).catch(() => { /* chỉ là hâm nóng */ });
    // Hàm NHẬN phiên cũng hâm luôn (2026-10-21): nó chạy đúng lúc người dùng quay về app — trước đây hầu như lần nào cũng khởi động nguội.
    httpsCallable(functions, 'pwaHandoffClaim')({ warmup: true }).catch(() => { /* chỉ là hâm nóng */ });
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
