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
const VERSION = '0b730408d40b';
const CACHE = 'ycx-shell-' + VERSION;
const PRECACHE = ["/assets/AboutView-DpoiND_x.js","/assets/BiWrapper-CsH-zVVq.js","/assets/BiWrapper-jkuwLpCC.css","/assets/ChangelogModal-ZbvV6L89.js","/assets/CheckThuongView-BmCWu72s.js","/assets/ColumnConfigModal-D2hkDJhs.js","/assets/DashboardView-By55lAyZ.js","/assets/DataUpdater-DVRInU8o.js","/assets/EmployeeAnalysis-BA2Gxgpe.js","/assets/ExportOptionsModal-_7cs2f-s.js","/assets/ExternalToolView-YDuwWcGf.js","/assets/FileHistoryModal-9XAJ2Hl3.js","/assets/FileNamingModal-ChV91v_F.js","/assets/FontSelector-Da3bMUw7.js","/assets/IndustryGrid-3uWRy7Rp.js","/assets/KhaiThacView-B2iY0kon.js","/assets/KpiCardConfigModal-CU46iNZr.js","/assets/LineBotView-CarF3-z9.js","/assets/NhanVien-7OeC7hLd.js","/assets/PerformanceModal-DtAYi2o_.js","/assets/PhanCaView-CYYjc8a5.css","/assets/PhanCaView-DuxEP5jC.js","/assets/PivotTable-D5YKktQE.js","/assets/PriceComparisonView-CI6MEuCq.js","/assets/SectionHeader-CL2Axnar.js","/assets/SettingsView-BRvnepyH.js","/assets/StickerEventApp-BOWghQ8r.js","/assets/StickerPrinterView-CQPFsGiO.js","/assets/SummaryTable-C3lAJm5U.js","/assets/SummaryTableUtils-DV4pbyvj.js","/assets/TaxCalculatorView-Dgrk1j9B.js","/assets/TrendChart-DEhlJ-JO.js","/assets/UncollectedOrdersModal-g7er-J40.js","/assets/UnconfiguredGroupsModal-ka_luC9k.js","/assets/UnshippedOrdersModal-qHrj1b-H.js","/assets/UploadConflictModal-t7WFzhYk.js","/assets/UploadTypeSelectionModal-DOPc--E9.js","/assets/UserManagementView-OWIMewDV.js","/assets/WarehouseSummary-BzKrfhAR.js","/assets/analytics.worker-B8lZyqYX.js","/assets/analytics.worker-BDfFHlbd.js","/assets/analytics.worker-aaFQcSTc.js","/assets/captureEngine-5fQKPXzY.js","/assets/chartConfig-C-f7hsgo.js","/assets/checkThuongIframeService-fd-UsGMB.js","/assets/cloudDataService-C8YwToh-.js","/assets/dbService-Qa3or94y.js","/assets/googleSheetsService-BGBmW1BJ.js","/assets/googleSheetsService-D0LTBUzq.js","/assets/html2canvas.esm-QH1iLAAe.js","/assets/index-BUdbFhSF.js","/assets/index-BmyWsa9W.css","/assets/index-CgJtiJsK.js","/assets/index-Cok6S9gG.js","/assets/index.es-qxdoO1zX.js","/assets/jspdf.es.min-CYUNVUht.js","/assets/khaiThacDb-3sPEUnsK.js","/assets/khoDataService-CHvxqayq.js","/assets/lineBot.types-DhjT967W.js","/assets/lineReportDelivery-CJ3Py7fu.js","/assets/presetBi-BVUe7MK7.js","/assets/salesJsonWriter.worker-BNAYiZX6.js","/assets/salesJsonWriter.worker-iky0iAuj.js","/assets/scheduleHeartbeat.worker-DY9MOOqR.js","/assets/shared-utils-CoyMcgY7.js","/assets/summaryService-CiRUYmSZ.js","/assets/vendor-charts-cgUzaFZk.js","/assets/vendor-excel-BGhuli8m.js","/assets/vendor-firebase-BKmb8Rjw.js","/assets/vendor-icons-DGtyW8pH.js","/assets/vendor-motion-CeUOfB9r.js","/assets/vendor-react-BFsc7Y4G.js","/assets/worker-DwBw6rNm.js","/favicon.svg","/icons/apple-touch-icon-120.png","/icons/apple-touch-icon-152.png","/icons/apple-touch-icon-167.png","/icons/apple-touch-icon-180.png","/icons/icon-192.png","/icons/icon-512.png","/icons/icon-maskable-512.png","/manifest.webmanifest","/prevent-pull-to-refresh.js","/reload-on-chunk-error.js"];

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
