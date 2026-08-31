/**
 * Bảng map "tên siêu thị trong báo cáo Report BI" → "Mã Kho" — admin khai báo 1 lần,
 * dùng bởi biDataService.ts để biết dán dữ liệu chia sẻ (biData/{maKho}) vào đúng chỗ.
 * implementation_plan.md mục "Đợt 4". Lưu ở Firestore biSupermarketMap/config (KHÔNG dùng
 * shared_configs — chỗ đó dành cho chia sẻ cấu hình tuỳ ý, sai ngữ nghĩa cho 1 bảng tra
 * cứu cố định duy nhất). Chỉ admin được ghi (firestore.rules), mọi user đăng nhập đọc được.
 */

import { db } from '../../../services/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

const mapDocRef = () => doc(db, 'biSupermarketMap', 'config');

/** { "ĐM_TEST - 99 Test Street": "58614", ... } — key là tên ĐẦY ĐỦ, ĐÚNG NGUYÊN VĂN như
 * xuất hiện ở cột đầu báo cáo Summary/Thi đua Luỹ kế (không phải tên đã rút gọn qua
 * shortenSupermarketName()). */
export type SupermarketToKhoMap = Record<string, string>;

export async function fetchSupermarketMap(): Promise<SupermarketToKhoMap> {
    const snap = await getDoc(mapDocRef());
    if (!snap.exists()) return {};
    return (snap.data().map as SupermarketToKhoMap) || {};
}

/** Ghi đè toàn bộ bảng map — Firestore Rules chặn cứng nếu người gọi không phải admin, gọi
 * hàm này khi không phải admin sẽ nhận permission-denied. */
export async function saveSupermarketMap(map: SupermarketToKhoMap): Promise<void> {
    await setDoc(mapDocRef(), { map, updatedAt: serverTimestamp() });
}
