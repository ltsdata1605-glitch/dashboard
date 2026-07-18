import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';

const STICKER_APP_NAME = 'stickerevent';

// Define a default config object
const defaultConfig = {
  apiKey: '',
  authDomain: '',
  projectId: '',
  storageBucket: '',
  messagingSenderId: '',
  appId: '',
  measurementId: '',
  firestoreDatabaseId: '(default)'
};

interface FirebaseAppletConfig {
  apiKey?: string;
  authDomain?: string;
  projectId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
  measurementId?: string;
  firestoreDatabaseId?: string;
}

// Safe load for AI Studio config file (ignored on GitHub)
// @ts-ignore
const configs = import.meta.glob('./firebase-applet-config.json', { eager: true });
const firebaseConfigJson: FirebaseAppletConfig = (configs['./firebase-applet-config.json'] as { default?: FirebaseAppletConfig } | undefined)?.default || {};

// Prioritize JSON config (from user's manual setup or AIS setup) over environment variables
const firebaseConfig = {
  apiKey: firebaseConfigJson.apiKey || import.meta.env.VITE_FIREBASE_API_KEY || defaultConfig.apiKey,
  authDomain: firebaseConfigJson.authDomain || import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || defaultConfig.authDomain,
  projectId: firebaseConfigJson.projectId || import.meta.env.VITE_FIREBASE_PROJECT_ID || defaultConfig.projectId,
  storageBucket: firebaseConfigJson.storageBucket || import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || defaultConfig.storageBucket,
  messagingSenderId: firebaseConfigJson.messagingSenderId || import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || defaultConfig.messagingSenderId,
  appId: firebaseConfigJson.appId || import.meta.env.VITE_FIREBASE_APP_ID || defaultConfig.appId,
  measurementId: firebaseConfigJson.measurementId || import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || defaultConfig.measurementId
};

const dbId = firebaseConfigJson.firestoreDatabaseId && firebaseConfigJson.firestoreDatabaseId !== '(default)' 
  ? firebaseConfigJson.firestoreDatabaseId 
  : (import.meta.env.VITE_FIREBASE_DATABASE_ID || defaultConfig.firestoreDatabaseId);

// Use named app to avoid conflict with Dashboard's Firebase instance
const app = getApps().find(a => a.name === STICKER_APP_NAME)
  ? getApp(STICKER_APP_NAME)
  : initializeApp(firebaseConfig, STICKER_APP_NAME);

export const auth = getAuth(app);
export const db = getFirestore(app, dbId);
// An toàn để dùng getFunctions(app) trực tiếp ở đây (khác với bug đã gặp ở
// phan-ca) — Login.tsx đăng nhập/đăng ký NGAY TRÊN app riêng này (không mượn
// session app khác), nên auth.currentUser của app này luôn đúng người dùng
// thật, request gọi Cloud Function sẽ có Authorization header hợp lệ.
export const functions = getFunctions(app);

