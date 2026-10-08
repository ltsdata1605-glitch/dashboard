/* Service worker của Dashboard YCX — SINH TỰ ĐỘNG lúc build bởi vite.config.ts (plugin ycx-offline-sw).
 * Mục tiêu (chủ dự án chốt 2026-10-08): mở app từ Màn hình chính / trình duyệt khi MẤT MẠNG vẫn thấy giao diện
 * và dữ liệu đã lưu trên máy (IndexedDB), không bị trang trắng "Không có kết nối".
 *
 * Chiến lược:
 *  - Cài đặt: tải sẵn index.html + mọi file /assets/ (tên có mã băm) + icon → đủ để chạy mọi màn khi offline.
 *  - Điều hướng (mở trang/tải lại): ƯU TIÊN MẠNG (luôn nhận bản mới khi có mạng, tránh kẹt bản cũ), quá 4 giây hoặc
 *    lỗi thì dùng bản đã lưu. Bản mới nhất tự được lưu lại.
 *  - /assets/*, phông, ảnh khung: ƯU TIÊN BẢN LƯU (tên có mã băm nên không bao giờ cũ); thiếu thì tải rồi lưu.
 *  - Yêu cầu khác origin (Firebase, LINE, Google…) KHÔNG đụng tới — SDK tự xử lý offline.
 */
const VERSION = '78ba8a5f6e3f';
const CACHE = 'ycx-shell-' + VERSION;
const PRECACHE = ["/assets/AboutView-DvX9iMaR.js","/assets/BiWrapper-jkuwLpCC.css","/assets/BiWrapper-kooahDmS.js","/assets/ChangelogModal-BME5VUd4.js","/assets/CheckThuongView-DFpvWrvW.js","/assets/ColumnConfigModal-Dv7CQ7ju.js","/assets/DashboardView-_9jjupCo.js","/assets/DataUpdater-CwI0vt7O.js","/assets/EmployeeAnalysis-DfWujZrX.js","/assets/ExportOptionsModal-_EYAQxe0.js","/assets/ExternalToolView-YDuwWcGf.js","/assets/FileHistoryModal-D86r1WHB.js","/assets/FileNamingModal-Dnx4uz04.js","/assets/FontSelector-CJM7GmZ8.js","/assets/IndustryGrid-CbTMJMBV.js","/assets/KhaiThacView-oCdugTg-.js","/assets/KpiCardConfigModal-DO-Xov8d.js","/assets/LineBotView-msRSlMgb.js","/assets/NhanVien-D80_t9Wg.js","/assets/PerformanceModal-Bis1YT1r.js","/assets/PhanCaView-CYYjc8a5.css","/assets/PhanCaView-DaJIMx4W.js","/assets/PivotTable-C0P8eLjr.js","/assets/PriceComparisonView-DmtpPDYX.js","/assets/SectionHeader-c47glpBX.js","/assets/SettingsView-CxVRnN79.js","/assets/StickerEventApp-C-6QE4E1.js","/assets/StickerPrinterView-B-glQgqU.js","/assets/SummaryTable-CFdV6LmR.js","/assets/SummaryTableUtils-DV4pbyvj.js","/assets/TaxCalculatorView-8MP9_1Xc.js","/assets/TrendChart-D2nne-AE.js","/assets/UncollectedOrdersModal-sdJ8eN9L.js","/assets/UnconfiguredGroupsModal-DeCawTHe.js","/assets/UnshippedOrdersModal-YDeYJP-s.js","/assets/UploadConflictModal-frMxdGrG.js","/assets/UploadTypeSelectionModal-D2t90FPg.js","/assets/UserManagementView-BbwYr_3_.js","/assets/WarehouseSummary-G-3AnbzE.js","/assets/analytics.worker-B8lZyqYX.js","/assets/analytics.worker-BDfFHlbd.js","/assets/analytics.worker-aaFQcSTc.js","/assets/captureEngine-BdzDUWYt.js","/assets/chartConfig-C-f7hsgo.js","/assets/checkThuongIframeService-D81PB4uA.js","/assets/cloudDataService-CMTVAtvF.js","/assets/dbService-D6WDFRFh.js","/assets/googleSheetsService-BGBmW1BJ.js","/assets/googleSheetsService-D0LTBUzq.js","/assets/html2canvas.esm-QH1iLAAe.js","/assets/index-BSObouDk.js","/assets/index-CgJtiJsK.js","/assets/index-CjFJzFdG.css","/assets/index-Cok6S9gG.js","/assets/index.es-gyO2wAo9.js","/assets/jspdf.es.min-De6ax31T.js","/assets/khaiThacDb-BTshNuUT.js","/assets/khoDataService-CLJY7ZM7.js","/assets/lineBot.types-Bw-FE5k4.js","/assets/lineReportDelivery-dSQeH-hr.js","/assets/presetBi-BlnnJF8K.js","/assets/salesJsonWriter.worker-BNAYiZX6.js","/assets/salesJsonWriter.worker-iky0iAuj.js","/assets/scheduleHeartbeat.worker-DY9MOOqR.js","/assets/shared-utils-CoyMcgY7.js","/assets/summaryService-DcR2C6rS.js","/assets/vendor-charts-cgUzaFZk.js","/assets/vendor-excel-BGhuli8m.js","/assets/vendor-firebase-BKmb8Rjw.js","/assets/vendor-icons-DGtyW8pH.js","/assets/vendor-motion-CeUOfB9r.js","/assets/vendor-react-BFsc7Y4G.js","/assets/worker-DwBw6rNm.js","/favicon.svg","/icons/apple-touch-icon-120.png","/icons/apple-touch-icon-152.png","/icons/apple-touch-icon-167.png","/icons/apple-touch-icon-180.png","/icons/icon-192.png","/icons/icon-512.png","/icons/icon-maskable-512.png","/manifest.webmanifest","/prevent-pull-to-refresh.js","/reload-on-chunk-error.js"];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // index.html bắt buộc; file khác lỗi lẻ tẻ không làm hỏng cả lượt cài.
    await cache.add(new Request('/index.html', { cache: 'reload' }));
    await Promise.allSettled(PRECACHE.map((u) => cache.add(new Request(u, { cache: 'reload' }))));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.startsWith('ycx-shell-') && k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

const isHashedAsset = (url) => url.pathname.startsWith('/assets/');
const isStaticFile = (url) => /^\/(fonts|icons|frame|splash|scripts|Tuts)\//.test(url.pathname) || /\.(woff2?|ttf|png|jpe?g|svg|webp|ico|webmanifest)$/.test(url.pathname) || /^\/(prevent-pull-to-refresh|reload-on-chunk-error)\.js$/.test(url.pathname);

async function networkFirstNavigation(request) {
  const cache = await caches.open(CACHE);
  try {
    const fresh = await Promise.race([
      fetch(request),
      new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 4000)),
    ]);
    if (fresh && fresh.ok) {
      // Lưu bản mới của app shell (SPA: mọi đường dẫn không có đuôi file dùng chung index.html).
      const isShell = !/\.[a-z0-9]+$/i.test(new URL(request.url).pathname);
      if (isShell) cache.put('/index.html', fresh.clone());
      else cache.put(request, fresh.clone());
    }
    return fresh;
  } catch (e) {
    const pathname = new URL(request.url).pathname;
    const isShell = !/\.[a-z0-9]+$/i.test(pathname);
    const cached = (isShell ? await cache.match('/index.html') : await cache.match(request));
    if (cached) return cached;
    throw e;
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (res && res.ok) cache.put(request, res.clone());
  return res;
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (request.mode === 'navigate') { event.respondWith(networkFirstNavigation(request)); return; }
  if (isHashedAsset(url) || isStaticFile(url)) { event.respondWith(cacheFirst(request)); return; }
});
