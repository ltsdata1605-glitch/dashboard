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
const VERSION = '2d6abcdb437d';
const CACHE = 'ycx-shell-' + VERSION;
const PRECACHE = ["/assets/AboutView-UrhocBW_.js","/assets/BiWrapper-BL2OLMls.css","/assets/BiWrapper-DydzDhKk.js","/assets/ChangelogModal-gB63gymU.js","/assets/CheckThuongView-CCBhIAG4.js","/assets/DashboardView-EmULdYd3.js","/assets/DataUpdater-Da1YK4fV.js","/assets/EmployeeAnalysis-G_CHgKED.js","/assets/ExportOptionsModal-9NbL_QIj.js","/assets/ExternalToolView-YDuwWcGf.js","/assets/FileHistoryModal-Djd32krO.js","/assets/FileNamingModal-BxbHhMQ3.js","/assets/FontSelector-CpKiWaWO.js","/assets/IndustryGrid-BUjC0oxv.js","/assets/KhaiThacView-CkEBPgY8.js","/assets/KpiCardConfigModal-skDfJGt1.js","/assets/LineBotView-BI-_EvIw.js","/assets/NhanVien-BKu2RmeK.js","/assets/PerformanceModal-D1aPMQc3.js","/assets/PhanCaView-CU752-Dw.js","/assets/PhanCaView-CYYjc8a5.css","/assets/PivotTable-BmxiBfjs.js","/assets/PriceComparisonView-CaaggQ7R.js","/assets/SectionHeader-CiD9_u4z.js","/assets/SettingsView-DgnE4y8z.js","/assets/StickerEventApp-Cx1nGWxr.js","/assets/StickerPrinterView-josuLNEl.js","/assets/SummaryTable-Bo_shDeB.js","/assets/SummaryTableUtils-CUAK7EFs.js","/assets/TaxCalculatorView-B63vprMd.js","/assets/TrendChart-DlEc2OgL.js","/assets/UncollectedOrdersModal-HaqwnRfs.js","/assets/UnconfiguredGroupsModal-CowXh7up.js","/assets/UnshippedOrdersModal-BBK7HtU7.js","/assets/UploadConflictModal-ZTv_dqoR.js","/assets/UploadTypeSelectionModal-CGZzj9iW.js","/assets/UserManagementView-C7WXBXll.js","/assets/analytics.worker-CNAQL-46.js","/assets/analytics.worker-DPngphgu.js","/assets/analytics.worker-D_9AshrL.js","/assets/captureEngine-C37qFSI9.js","/assets/chartConfig-C-f7hsgo.js","/assets/checkThuongIframeService-BBsU9o2X.js","/assets/cloudDataService-Brdkj9z7.js","/assets/dataService-yWlul7qx.js","/assets/dbService-DusKPEAi.js","/assets/firebaseProductConfigService-BDXxGfDh.js","/assets/googleSheetsService-BGBmW1BJ.js","/assets/googleSheetsService-D0LTBUzq.js","/assets/html2canvas.esm-QH1iLAAe.js","/assets/index-CTzDRfCz.css","/assets/index-CgJtiJsK.js","/assets/index-Cok6S9gG.js","/assets/index-XaV_NYs-.js","/assets/index.es-BBWmBQT2.js","/assets/jspdf.es.min-DeOISQkz.js","/assets/khaiThacDb-CO8VFsu8.js","/assets/khoDataService-C6xJ7Ji9.js","/assets/presetBi-KhjLW1Sn.js","/assets/salesJsonWriter.worker-BNAYiZX6.js","/assets/salesJsonWriter.worker-iky0iAuj.js","/assets/scheduleHeartbeat.worker-DY9MOOqR.js","/assets/shared-utils-CoyMcgY7.js","/assets/summaryService-3nLQ_OTl.js","/assets/vendor-charts-cgUzaFZk.js","/assets/vendor-excel-BGhuli8m.js","/assets/vendor-firebase-BS_u-ZPy.js","/assets/vendor-icons-CmCra2aO.js","/assets/vendor-motion-CeUOfB9r.js","/assets/vendor-react-BFsc7Y4G.js","/assets/worker-DwBw6rNm.js","/favicon.svg","/icons/apple-touch-icon-120.png","/icons/apple-touch-icon-152.png","/icons/apple-touch-icon-167.png","/icons/apple-touch-icon-180.png","/icons/icon-192.png","/icons/icon-512.png","/icons/icon-maskable-512.png","/manifest.webmanifest","/prevent-pull-to-refresh.js","/reload-on-chunk-error.js"];

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
