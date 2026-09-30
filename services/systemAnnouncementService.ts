import { collection, limit, onSnapshot, orderBy, query, where, type DocumentData, type QuerySnapshot } from 'firebase/firestore';
import { db } from './firebase';

/**
 * THÔNG BÁO HỆ THỐNG — nghe bản MỚI NHẤT (2026-09-30).
 *
 * Trước đây DashboardView nghe 100 document `shared_configs` mới nhất (AdminAnnouncementModal: 50)
 * rồi tự tìm cái có `isSystemAnnouncement` — mỗi lần mở app tốn tới 100 lượt đọc, và mỗi lần ai đó
 * lưu 1 cấu hình chia sẻ bất kỳ lại đọc thêm. Lỗi kèm theo: có >100 cấu hình mới hơn thông báo là
 * thông báo BIẾN MẤT.
 *
 * Nay: `where(isSystemAnnouncement == true) + orderBy(createdAt desc) + limit(1)` = 1 lượt đọc.
 * Truy vấn này cần chỉ mục ghép (isSystemAnnouncement ASC, createdAt DESC) trên `shared_configs`.
 * Chưa có chỉ mục → Firestore báo `failed-precondition` (kèm link tạo chỉ mục trong thông báo lỗi)
 * → TỰ quay về cách cũ, không hỏng gì. Rules không đổi (`shared_configs`: đọc = đã đăng nhập).
 */
export interface SystemAnnouncement { id?: string; content?: string; active?: boolean; isSystemAnnouncement?: boolean }

const tim = (snapshot: QuerySnapshot<DocumentData>): SystemAnnouncement | null => {
    let found: SystemAnnouncement | null = null;
    snapshot.forEach(docSnap => {
        const data = docSnap.data();
        if (data.isSystemAnnouncement && !found) found = { id: docSnap.id, ...data };
    });
    return found;
};

export function listenSystemAnnouncement(
    onChange: (a: SystemAnnouncement | null) => void,
    onError: (e: unknown) => void,
    fallbackLimit = 100,
): () => void {
    let unsub: () => void = () => {};
    let huy = false;
    const kieuCu = () => {
        unsub = onSnapshot(
            query(collection(db, 'shared_configs'), orderBy('createdAt', 'desc'), limit(fallbackLimit)),
            s => onChange(tim(s)),
            onError,
        );
    };
    unsub = onSnapshot(
        query(collection(db, 'shared_configs'), where('isSystemAnnouncement', '==', true), orderBy('createdAt', 'desc'), limit(1)),
        s => onChange(tim(s)),
        (e) => {
            if ((e as { code?: string })?.code === 'failed-precondition' && !huy) {
                console.warn('[Thông báo hệ thống] Thiếu chỉ mục Firestore — tạm dùng cách đọc cũ. Tạo chỉ mục theo link:', (e as Error).message);
                kieuCu();
            } else {
                onError(e);
            }
        },
    );
    return () => { huy = true; unsub(); };
}
