import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

const app = getApps().length ? getApps()[0] : initializeApp();

export const db = getFirestore(app);
export const auth = getAuth(app);

// Firestore database của features/sticker-event — đã di trú dùng chung database (default)
// với root/phan-ca để hưởng hạn mức tiêu chuẩn và hỗ trợ Pay-as-you-go.
export const STICKER_DB_ID = '(default)';
export const stickerDb = db;
