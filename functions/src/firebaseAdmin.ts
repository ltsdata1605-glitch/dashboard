import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

const app = getApps().length ? getApps()[0] : initializeApp();

export const db = getFirestore(app);
export const auth = getAuth(app);

// Firestore database riêng của features/sticker-event — cùng project Firebase
// (dashboa-7e20b) nhưng KHÔNG phải database (default) mà root/phan-ca dùng.
export const STICKER_DB_ID = 'ai-studio-16672ec9-22fb-43a6-b6ee-e59aa8a8c699';
export const stickerDb = getFirestore(app, STICKER_DB_ID);
