/**
 * Bảng map "tên siêu thị trong báo cáo Report BI" → "Mã Kho", dùng bởi biDataService.ts để biết
 * dán dữ liệu chia sẻ (biData/{maKho}) vào đúng chỗ. implementation_plan.md mục "Đợt 4" +
 * "Quản lý tự cấu hình bảng map". Lưu ở Firestore collection `biSupermarketMap`, 1 document CHO
 * MỖI Mã Kho (field `names: string[]`) — KHÔNG dùng shared_configs (chỗ đó dành cho chia sẻ cấu
 * hình tuỳ ý, sai ngữ nghĩa cho 1 bảng tra cứu cố định). Admin ghi được mọi Mã Kho, Quản lý chỉ
 * ghi được đúng (các) Kho của mình (firestore.rules), mọi user đăng nhập đọc được.
 */

import { db } from '../../../services/firebase';
import { doc, collection, getDocs, setDoc, writeBatch, serverTimestamp, arrayUnion, arrayRemove } from 'firebase/firestore';

const collRef = () => collection(db, 'biSupermarketMap');
const khoDocRef = (maKho: string) => doc(db, 'biSupermarketMap', maKho);

/** { "ĐM_TEST - 99 Test Street": "58614", ... } — key là tên ĐẦY ĐỦ, ĐÚNG NGUYÊN VĂN như
 * xuất hiện ở cột đầu báo cáo Summary/Thi đua Luỹ kế (không phải tên đã rút gọn qua
 * shortenSupermarketName()). */
export type SupermarketToKhoMap = Record<string, string>;

/** Đọc toàn bộ collection (1 document/Mã Kho, field names: string[]), gộp ngược thành flat map
 * — contract giữ nguyên như schema cũ (1 document duy nhất), mọi nơi gọi hàm này (DataUpdater.tsx,
 * useDashboardLogic.ts) không cần sửa. */
export async function fetchSupermarketMap(): Promise<SupermarketToKhoMap> {
    const snap = await getDocs(collRef());
    const result: SupermarketToKhoMap = {};
    snap.forEach(docSnap => {
        const maKho = docSnap.id;
        const names = docSnap.data()?.names;
        if (!Array.isArray(names)) return;
        for (const name of names) {
            if (typeof name === 'string' && name) result[name] = maKho;
        }
    });
    return result;
}

/** arrayUnion thay vì đọc-rồi-ghi-đè cả mảng — 2 người thêm gần như đồng thời vào CÙNG 1 Kho
 * không đè mất thay đổi của nhau. setDoc({merge:true}) để tự tạo document nếu Mã Kho này chưa
 * từng có ai map (updateDoc sẽ lỗi not-found trong trường hợp đó). */
export async function addSupermarketNameToKho(maKho: string, name: string): Promise<void> {
    await setDoc(khoDocRef(maKho), { names: arrayUnion(name), updatedAt: serverTimestamp() }, { merge: true });
}

/** arrayRemove — xoá đúng 1 tên khỏi names[] của Mã Kho hiện tại của nó. */
export async function removeSupermarketNameFromKho(maKho: string, name: string): Promise<void> {
    await setDoc(khoDocRef(maKho), { names: arrayRemove(name), updatedAt: serverTimestamp() }, { merge: true });
}

/** "Sửa Mã Kho" 1 dòng = xoá khỏi document Kho cũ + thêm vào document Kho mới, gộp 1 writeBatch
 * (atomic — không rơi vào trạng thái lỡ dở nếu 1 trong 2 write lỗi giữa chừng). Firestore Rules
 * kiểm tra riêng từng write theo đúng path của nó — người gọi phải có quyền ghi CẢ fromMaKho lẫn
 * toMaKho (đúng ý đồ: Quản lý chỉ "chuyển" nội bộ giữa các Kho họ quản lý). */
export async function moveSupermarketNameToKho(fromMaKho: string, toMaKho: string, name: string): Promise<void> {
    if (fromMaKho === toMaKho) return;
    const batch = writeBatch(db);
    batch.set(khoDocRef(fromMaKho), { names: arrayRemove(name), updatedAt: serverTimestamp() }, { merge: true });
    batch.set(khoDocRef(toMaKho), { names: arrayUnion(name), updatedAt: serverTimestamp() }, { merge: true });
    await batch.commit();
}
