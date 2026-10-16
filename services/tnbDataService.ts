import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import type { User } from 'firebase/auth';

export const TNB_DATA_URL = 'https://admintnb.com/data/';
export const LOCAL_STORAGE_TNB_CODE_KEY = 'tnb_mbm_code';

/**
 * Lấy mã bảo mật TNB đã lưu:
 * 1. Ưu tiên đọc từ cache localStorage để phản hồi tức thì.
 * 2. Nếu có tài khoản đăng nhập, đồng bộ từ Firestore (users/{uid}/configs/tnbDataConfig).
 */
export async function getTnbMbmCode(user?: User | null, departmentId?: string): Promise<string> {
    let code = '';
    try {
        code = localStorage.getItem(LOCAL_STORAGE_TNB_CODE_KEY) || '';
    } catch (_) {
        // Trình duyệt chặn localStorage
    }

    if (user?.uid) {
        try {
            const userConfigRef = doc(db, 'users', user.uid, 'configs', 'tnbDataConfig');
            const snap = await getDoc(userConfigRef);
            if (snap.exists() && snap.data()?.code) {
                const cloudCode = String(snap.data().code).trim();
                if (cloudCode) {
                    code = cloudCode;
                    try {
                        localStorage.setItem(LOCAL_STORAGE_TNB_CODE_KEY, code);
                    } catch (_) {}
                    return code;
                }
            }
        } catch (err) {
            console.warn('[TNB Data] Không thể đọc mã bảo mật từ Firestore user config:', err);
        }
    }

    // Dự phòng theo mã kho nếu có
    if (!code && departmentId) {
        try {
            const storeConfigRef = doc(db, 'stores', departmentId, 'configs', 'tnbDataConfig');
            const snap = await getDoc(storeConfigRef);
            if (snap.exists() && snap.data()?.code) {
                const storeCode = String(snap.data().code).trim();
                if (storeCode) {
                    code = storeCode;
                    try {
                        localStorage.setItem(LOCAL_STORAGE_TNB_CODE_KEY, code);
                    } catch (_) {}
                    return code;
                }
            }
        } catch (err) {
            console.warn('[TNB Data] Không thể đọc mã bảo mật từ Firestore store config:', err);
        }
    }

    return code;
}

/**
 * Lưu mã bảo mật TNB:
 * 1. Lưu vào localStorage để Userscript / Tab truy cập ngay.
 * 2. Lưu vào Firestore (users/{uid}/configs/tnbDataConfig và theo kho).
 */
export async function saveTnbMbmCode(rawCode: string, user?: User | null, departmentId?: string): Promise<string> {
    const code = rawCode.trim().toUpperCase();
    if (!code) {
        throw new Error('Mã bảo mật không được để trống.');
    }

    try {
        localStorage.setItem(LOCAL_STORAGE_TNB_CODE_KEY, code);
    } catch (_) {}

    const promises: Promise<unknown>[] = [];

    if (user?.uid) {
        const userConfigRef = doc(db, 'users', user.uid, 'configs', 'tnbDataConfig');
        promises.push(
            setDoc(userConfigRef, {
                code,
                updatedAt: serverTimestamp(),
                updatedBy: user.email || user.displayName || user.uid,
            }, { merge: true })
        );
    }

    if (departmentId) {
        const storeConfigRef = doc(db, 'stores', departmentId, 'configs', 'tnbDataConfig');
        promises.push(
            setDoc(storeConfigRef, {
                code,
                departmentId,
                updatedAt: serverTimestamp(),
            }, { merge: true })
        );
    }

    if (promises.length > 0) {
        await Promise.allSettled(promises);
    }

    return code;
}

/**
 * Tạo URL mở trang TNB Data kèm hash chứa mã bảo mật để Userscript tự động nhận diện và điền mã.
 */
export function buildTnbDataUrl(code: string): string {
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) return TNB_DATA_URL;
    return `${TNB_DATA_URL}#code=${encodeURIComponent(cleanCode)}`;
}

/**
 * Mở tab mới truy cập https://admintnb.com/data/ với mã bảo mật.
 */
export function openTnbData(code: string): void {
    const targetUrl = buildTnbDataUrl(code);
    try {
        localStorage.setItem(LOCAL_STORAGE_TNB_CODE_KEY, code.trim().toUpperCase());
    } catch (_) {}
    window.open(targetUrl, '_blank');
}
