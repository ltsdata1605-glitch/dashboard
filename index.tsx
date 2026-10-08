
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';

// The global polyfill was removed as it caused "Cannot set property fetch" errors.
// Modern libraries should use globalThis or handle the absence of global.

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);


// Offline (chủ dự án chốt 2026-10-08): service worker tải sẵn app shell để mở được khi mất mạng.
// CHỈ bản build production (dist/sw.js do plugin ycx-offline-sw sinh ra); dev server không có file này.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((reg) => {
      // Có mạng lại / quay về tab thì hỏi xem có bản mới không — bản mới nhận vào lần mở kế tiếp (không tự tải lại giữa lúc đang làm việc).
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reg.update().catch(() => {}); });
    }).catch((err) => console.warn('[SW] Không đăng ký được service worker:', err));
  });
}
