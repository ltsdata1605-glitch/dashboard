
// Global type definitions for external libraries loaded via CDN
// any: biến global nạp qua thẻ <script> CDN (không phải qua import), không có package
// @types tương ứng cài trong dự án nên không có shape cụ thể để tham chiếu.
declare const google: any;
declare const lucide: {
    createIcons: (options?: { root?: HTMLElement | null }) => void;
};
// any: SortableJS nạp qua CDN — bản import ES trong components/tables/SummaryTable.tsx
// dùng package 'sortablejs' riêng (không có @types/sortablejs nên cũng ngầm định any).
declare const Sortable: any;

interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY?: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN?: string;
  readonly VITE_FIREBASE_PROJECT_ID?: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET?: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID?: string;
  readonly VITE_FIREBASE_APP_ID?: string;
  readonly VITE_FIREBASE_MEASUREMENT_ID?: string;
  readonly VITE_FIREBASE_DATABASE_ID?: string;
  readonly [key: string]: string | undefined;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
  // Chữ ký rút gọn của import.meta.glob (bản đầy đủ ở vite/client phức tạp hơn nhiều) —
  // đủ cho cách dùng duy nhất trong dự án (features/sticker-event/firebase.ts, eager: true).
  readonly glob: (pattern: string, options?: { eager?: boolean }) => Record<string, unknown>;
}
