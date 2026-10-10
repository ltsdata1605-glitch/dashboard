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
const VERSION = '8abf181b2702';
const CACHE = 'ycx-shell-' + VERSION;
const PRECACHE = ["/assets/AboutView-Dx374bH-.js","/assets/BiWrapper-BL2OLMls.css","/assets/BiWrapper-BLk3AGZz.js","/assets/ChangelogModal-0ei7jqYT.js","/assets/CheckThuongView-BdZgMf8c.js","/assets/DashboardView-C1bGnw3t.js","/assets/DataUpdater-Cq-TJnTL.js","/assets/EmployeeAnalysis-xEmOouqB.js","/assets/ExportOptionsModal-BKyayobR.js","/assets/ExternalToolView-YDuwWcGf.js","/assets/FileHistoryModal--5G5B0bx.js","/assets/FileNamingModal-Bvw_UjlK.js","/assets/FontSelector-CaVPztOO.js","/assets/IndustryGrid-DN_4s-XV.js","/assets/KhaiThacView-BHOmryzn.js","/assets/KpiCardConfigModal-Bl3Y4BMp.js","/assets/LineBotView-Dv7AL6Gd.js","/assets/NhanVien-zGJ37LF8.js","/assets/PerformanceModal-DqQ9fEni.js","/assets/PhanCaView-CATzGmLb.js","/assets/PhanCaView-CYYjc8a5.css","/assets/PivotTable-DUranWfM.js","/assets/PriceComparisonView-DFkFP8fk.js","/assets/SectionHeader-cmOen5fJ.js","/assets/SettingsView-CU3WqA-k.js","/assets/StickerEventApp-CZAIV5kA.js","/assets/StickerPrinterView-D15v0-oh.js","/assets/SummaryTable-D_7ZdtDt.js","/assets/SummaryTableUtils-CUAK7EFs.js","/assets/TaxCalculatorView-B1pwrXVb.js","/assets/TrendChart-Bz-lieD4.js","/assets/UncollectedOrdersModal-Ck52Q6UO.js","/assets/UnconfiguredGroupsModal-CpMj4V3E.js","/assets/UnshippedOrdersModal-CtDIk2YT.js","/assets/UploadConflictModal-4MLyW9Cx.js","/assets/UploadTypeSelectionModal-BOZbK_n2.js","/assets/UserManagementView-BxJ0LVli.js","/assets/analytics.worker-CNAQL-46.js","/assets/analytics.worker-DPngphgu.js","/assets/analytics.worker-D_9AshrL.js","/assets/captureEngine-CXGsjsgw.js","/assets/chartConfig-C-f7hsgo.js","/assets/checkThuongIframeService-BStKgp2j.js","/assets/cloudDataService-BU90O_EB.js","/assets/dataService-jcwtLI8j.js","/assets/dbService-Rtbfuohh.js","/assets/firebaseProductConfigService-ItUX4ui3.js","/assets/googleSheetsService-BGBmW1BJ.js","/assets/googleSheetsService-D0LTBUzq.js","/assets/html2canvas.esm-QH1iLAAe.js","/assets/index-0H2EiKYT.css","/assets/index-CXtvz2jP.js","/assets/index-CgJtiJsK.js","/assets/index-Cok6S9gG.js","/assets/index.es-DsLBAgrF.js","/assets/jspdf.es.min-Ch98WYE1.js","/assets/khaiThacDb-CXnuyl3A.js","/assets/khoDataService-B01xb6Ru.js","/assets/presetBi-Ca7YRqSy.js","/assets/salesJsonWriter.worker-BNAYiZX6.js","/assets/salesJsonWriter.worker-iky0iAuj.js","/assets/scheduleHeartbeat.worker-DY9MOOqR.js","/assets/shared-utils-CoyMcgY7.js","/assets/summaryService-By7kFi9N.js","/assets/vendor-charts-cgUzaFZk.js","/assets/vendor-excel-BGhuli8m.js","/assets/vendor-firebase-BS_u-ZPy.js","/assets/vendor-icons-CmCra2aO.js","/assets/vendor-motion-CeUOfB9r.js","/assets/vendor-react-BFsc7Y4G.js","/assets/worker-DwBw6rNm.js","/favicon.svg","/icons/apple-touch-icon-120.png","/icons/apple-touch-icon-152.png","/icons/apple-touch-icon-167.png","/icons/apple-touch-icon-180.png","/icons/icon-192.png","/icons/icon-512.png","/icons/icon-maskable-512.png","/manifest.webmanifest","/prevent-pull-to-refresh.js","/reload-on-chunk-error.js"];

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
