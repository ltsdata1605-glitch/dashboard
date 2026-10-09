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
const VERSION = '407ca481ba10';
const CACHE = 'ycx-shell-' + VERSION;
const PRECACHE = ["/assets/AboutView-rUs3C5Io.js","/assets/BiWrapper-W6VaFyut.js","/assets/BiWrapper-jkuwLpCC.css","/assets/ChangelogModal-BV4M8RVj.js","/assets/CheckThuongView-Bel6R7Ej.js","/assets/ColumnConfigModal-BpKrXz4Q.js","/assets/DashboardView-imjSlXdq.js","/assets/DataUpdater-6750_1HZ.js","/assets/EmployeeAnalysis-JCKsSTiu.js","/assets/ExportOptionsModal-BUTY9Tw_.js","/assets/ExternalToolView-YDuwWcGf.js","/assets/FileHistoryModal-4f68DIFc.js","/assets/FileNamingModal-DEzc96wj.js","/assets/FontSelector-DxHH-yW2.js","/assets/IndustryGrid-BIlWoKWN.js","/assets/KhaiThacView-zafNF_nA.js","/assets/KpiCardConfigModal-4rTYld4d.js","/assets/LineBotView-S2VtO6jK.js","/assets/NhanVien-Ch4wj0eH.js","/assets/PerformanceModal-CvfztQfS.js","/assets/PhanCaView-BiywuYZO.js","/assets/PhanCaView-CYYjc8a5.css","/assets/PivotTable-PCVUseT6.js","/assets/PriceComparisonView-aqlwdFWy.js","/assets/SectionHeader-nv5L6ch6.js","/assets/SettingsView-ClO2-Tcc.js","/assets/StickerEventApp-B0wAo2Re.js","/assets/StickerPrinterView-64-zG2pl.js","/assets/SummaryTable-DJp8e7hn.js","/assets/SummaryTableUtils-DV4pbyvj.js","/assets/TaxCalculatorView-CKyPyhNe.js","/assets/TrendChart-4BHH4dz1.js","/assets/UncollectedOrdersModal-BfGmUnF4.js","/assets/UnconfiguredGroupsModal-C5VJM83o.js","/assets/UnshippedOrdersModal-YicHuHa4.js","/assets/UploadConflictModal-CA4wCAqd.js","/assets/UploadTypeSelectionModal-yQLp5Qfm.js","/assets/UserManagementView-eKeZIE2c.js","/assets/WarehouseSummary-LoiCcXJp.js","/assets/analytics.worker-B8lZyqYX.js","/assets/analytics.worker-BDfFHlbd.js","/assets/analytics.worker-aaFQcSTc.js","/assets/captureEngine-DXOmP2bq.js","/assets/chartConfig-C-f7hsgo.js","/assets/checkThuongIframeService-Dk2RVb00.js","/assets/cloudDataService-CaAFozUG.js","/assets/dbService-BAqT5y6A.js","/assets/googleSheetsService-BGBmW1BJ.js","/assets/googleSheetsService-D0LTBUzq.js","/assets/html2canvas.esm-QH1iLAAe.js","/assets/index-CgJtiJsK.js","/assets/index-Cok6S9gG.js","/assets/index-DCj-K61r.css","/assets/index-VHzgfJUA.js","/assets/index.es-CnP0JDZK.js","/assets/jspdf.es.min-itZSGk3d.js","/assets/khaiThacDb-CRw32vJn.js","/assets/khoDataService-1Jvo23k7.js","/assets/lineBot.types-BPNm9xte.js","/assets/lineReportDelivery-CoxV4n_C.js","/assets/presetBi-E2gZCiAT.js","/assets/salesJsonWriter.worker-BNAYiZX6.js","/assets/salesJsonWriter.worker-iky0iAuj.js","/assets/scheduleHeartbeat.worker-DY9MOOqR.js","/assets/shared-utils-CoyMcgY7.js","/assets/summaryService-CBO2iYcz.js","/assets/vendor-charts-cgUzaFZk.js","/assets/vendor-excel-BGhuli8m.js","/assets/vendor-firebase-BKmb8Rjw.js","/assets/vendor-icons-DGtyW8pH.js","/assets/vendor-motion-CeUOfB9r.js","/assets/vendor-react-BFsc7Y4G.js","/assets/worker-DwBw6rNm.js","/favicon.svg","/icons/apple-touch-icon-120.png","/icons/apple-touch-icon-152.png","/icons/apple-touch-icon-167.png","/icons/apple-touch-icon-180.png","/icons/icon-192.png","/icons/icon-512.png","/icons/icon-maskable-512.png","/manifest.webmanifest","/prevent-pull-to-refresh.js","/reload-on-chunk-error.js"];

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
