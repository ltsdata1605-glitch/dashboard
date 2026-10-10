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
const VERSION = 'bb2a73a725be';
const CACHE = 'ycx-shell-' + VERSION;
const PRECACHE = ["/assets/AboutView-Dv0yPDUB.js","/assets/BiWrapper-BL2OLMls.css","/assets/BiWrapper-C70bagHv.js","/assets/ChangelogModal-DY-rQWIB.js","/assets/CheckThuongView-LfEH_uXZ.js","/assets/DashboardView-NFs8rc6D.js","/assets/DataUpdater-CjzmNQg0.js","/assets/EmployeeAnalysis-BpdGLnYf.js","/assets/ExportOptionsModal-ChB_wNZc.js","/assets/ExternalToolView-YDuwWcGf.js","/assets/FileHistoryModal-wXIxYpn0.js","/assets/FileNamingModal-DuD7tr86.js","/assets/FontSelector-Cnom4MAB.js","/assets/IndustryGrid-DG6-1kkx.js","/assets/KhaiThacView-DTWCpDjh.js","/assets/KpiCardConfigModal-Bi6yFjOl.js","/assets/LineBotView-Dr0kBcAb.js","/assets/NhanVien-DFatlqdE.js","/assets/PerformanceModal-CEuwDiRc.js","/assets/PhanCaView-CYYjc8a5.css","/assets/PhanCaView-fQ8BcDh_.js","/assets/PivotTable-BLSUQRn5.js","/assets/PriceComparisonView-DS9k3l3w.js","/assets/SectionHeader-GIqy7kM8.js","/assets/SettingsView-DrqSrD0K.js","/assets/StickerEventApp-CBfULlbI.js","/assets/StickerPrinterView-o-QtJUaj.js","/assets/SummaryTable-DEZNAgR0.js","/assets/SummaryTableUtils-DV4pbyvj.js","/assets/TaxCalculatorView-BNP-WV5O.js","/assets/TrendChart-CNgblUub.js","/assets/UncollectedOrdersModal-B-EV0fsb.js","/assets/UnconfiguredGroupsModal-DlnHXl8Q.js","/assets/UnshippedOrdersModal-DQKtjQSr.js","/assets/UploadConflictModal-BTIUraha.js","/assets/UploadTypeSelectionModal-B2IFovoF.js","/assets/UserManagementView-DgiAalht.js","/assets/analytics.worker-BDfFHlbd.js","/assets/analytics.worker-DPngphgu.js","/assets/analytics.worker-D_9AshrL.js","/assets/captureEngine-DUlXB_zY.js","/assets/chartConfig-C-f7hsgo.js","/assets/checkThuongIframeService-BVsa5rPa.js","/assets/cloudDataService-CUlp5M-c.js","/assets/dataService-BrZeF077.js","/assets/dbService-Cqh6_Dgn.js","/assets/firebaseProductConfigService-BkKz3xDD.js","/assets/googleSheetsService-BGBmW1BJ.js","/assets/googleSheetsService-D0LTBUzq.js","/assets/html2canvas.esm-QH1iLAAe.js","/assets/index-CFp8Toi0.js","/assets/index-CgJtiJsK.js","/assets/index-Cok6S9gG.js","/assets/index-DJizS-CL.css","/assets/index.es-Bv3_vXj3.js","/assets/jspdf.es.min-BxESmaVD.js","/assets/khaiThacDb-BNmyXX4t.js","/assets/khoDataService-meArjzhF.js","/assets/lineBot.types-CMVrV9VL.js","/assets/lineReportDelivery-IZVzQiaq.js","/assets/presetBi-BjMFsCSI.js","/assets/salesJsonWriter.worker-BNAYiZX6.js","/assets/salesJsonWriter.worker-iky0iAuj.js","/assets/scheduleHeartbeat.worker-DY9MOOqR.js","/assets/shared-utils-CoyMcgY7.js","/assets/summaryService-CG9yhVRQ.js","/assets/vendor-charts-cgUzaFZk.js","/assets/vendor-excel-BGhuli8m.js","/assets/vendor-firebase-BNAOMJ2F.js","/assets/vendor-icons-DGtyW8pH.js","/assets/vendor-motion-CeUOfB9r.js","/assets/vendor-react-BFsc7Y4G.js","/assets/worker-DwBw6rNm.js","/favicon.svg","/icons/apple-touch-icon-120.png","/icons/apple-touch-icon-152.png","/icons/apple-touch-icon-167.png","/icons/apple-touch-icon-180.png","/icons/icon-192.png","/icons/icon-512.png","/icons/icon-maskable-512.png","/manifest.webmanifest","/prevent-pull-to-refresh.js","/reload-on-chunk-error.js"];

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
