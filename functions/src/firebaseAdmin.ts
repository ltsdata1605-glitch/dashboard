import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

const app = getApps().length ? getApps()[0] : initializeApp();

export const db = getFirestore(app);
// Firestore qua REST thay vì gRPC: cắt thời gian dựng kênh gRPC ở LẦN GỌI ĐẦU của instance mới
// (cold start) — khuyến nghị của Google cho Cloud Functions. Không ảnh hưởng tính năng vì functions
// không dùng onSnapshot (listener mới cần gRPC). Bổ sung 2026-09-21 khi tối ưu LIFF copy "xoay lâu".
db.settings({ preferRest: true });
export const auth = getAuth(app);

// Firestore database của features/sticker-event — đã di trú dùng chung database (default)
// với root/phan-ca để hưởng hạn mức tiêu chuẩn và hỗ trợ Pay-as-you-go.
export const STICKER_DB_ID = '(default)';
export const stickerDb = db;
