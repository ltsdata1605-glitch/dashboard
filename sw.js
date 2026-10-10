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
const VERSION = '01347941d2a3';
const CACHE = 'ycx-shell-' + VERSION;
const PRECACHE = ["/assets/AboutView-c12YLFkE.js","/assets/BiWrapper-BL2OLMls.css","/assets/BiWrapper-CAgtnDF9.js","/assets/ChangelogModal-m_t9WahL.js","/assets/CheckThuongView-BzxEOe8a.js","/assets/DashboardView-sLGvG_lk.js","/assets/DataUpdater-Eb22uwsc.js","/assets/EmployeeAnalysis-e7QwUIcR.js","/assets/ExportOptionsModal-GE3wZPdR.js","/assets/ExternalToolView-YDuwWcGf.js","/assets/FileHistoryModal-DS2xMl-E.js","/assets/FileNamingModal-B_D1DHQW.js","/assets/FontSelector-n0VsiuD9.js","/assets/IndustryGrid-fGbpuQZK.js","/assets/KhaiThacView-BO2OTiot.js","/assets/KpiCardConfigModal-CiRFySrV.js","/assets/LineBotView-DcXExEls.js","/assets/NhanVien-H2XaDeSc.js","/assets/PerformanceModal-DpHUj11c.js","/assets/PhanCaView-BG4uWXrQ.js","/assets/PhanCaView-CYYjc8a5.css","/assets/PivotTable-CbUswLzz.js","/assets/PriceComparisonView-CqN8nFSe.js","/assets/SectionHeader-DFFUrkw-.js","/assets/SettingsView-DzkUY636.js","/assets/StickerEventApp-D_TOFrkW.js","/assets/StickerPrinterView-CA0zNqgz.js","/assets/SummaryTable-RDmr5ZW1.js","/assets/SummaryTableUtils-DV4pbyvj.js","/assets/TaxCalculatorView-DSerM6zL.js","/assets/TrendChart-zAdndoZn.js","/assets/UncollectedOrdersModal-Dt_etbPW.js","/assets/UnconfiguredGroupsModal-DA7fBiBI.js","/assets/UnshippedOrdersModal-CTrSxfhn.js","/assets/UploadConflictModal-DmFrDc0K.js","/assets/UploadTypeSelectionModal-dN5sP8cN.js","/assets/UserManagementView-Bo0wxdP4.js","/assets/analytics.worker-BDfFHlbd.js","/assets/analytics.worker-DPngphgu.js","/assets/analytics.worker-D_9AshrL.js","/assets/captureEngine-NXJEi7ge.js","/assets/chartConfig-C-f7hsgo.js","/assets/checkThuongIframeService-BrmJsre8.js","/assets/cloudDataService-Cp3bHyQf.js","/assets/dataService-BTch0Eq-.js","/assets/dbService-Dn6P_em_.js","/assets/firebaseProductConfigService-DdqJerj3.js","/assets/googleSheetsService-BGBmW1BJ.js","/assets/googleSheetsService-D0LTBUzq.js","/assets/html2canvas.esm-QH1iLAAe.js","/assets/index-4d3jjNh7.js","/assets/index-CgJtiJsK.js","/assets/index-Cok6S9gG.js","/assets/index-DDr1tt4s.css","/assets/index.es-BFRma30e.js","/assets/jspdf.es.min-cNWILfO_.js","/assets/khaiThacDb-B0Jp-Wd_.js","/assets/khoDataService-7ULxhRhB.js","/assets/lineBot.types-DVedFgtX.js","/assets/lineReportDelivery-DO1RxWNS.js","/assets/presetBi-DtNoEsfG.js","/assets/salesJsonWriter.worker-BNAYiZX6.js","/assets/salesJsonWriter.worker-iky0iAuj.js","/assets/scheduleHeartbeat.worker-DY9MOOqR.js","/assets/shared-utils-CoyMcgY7.js","/assets/summaryService-qda5mliB.js","/assets/vendor-charts-cgUzaFZk.js","/assets/vendor-excel-BGhuli8m.js","/assets/vendor-firebase-BNAOMJ2F.js","/assets/vendor-icons-DGtyW8pH.js","/assets/vendor-motion-CeUOfB9r.js","/assets/vendor-react-BFsc7Y4G.js","/assets/worker-DwBw6rNm.js","/favicon.svg","/icons/apple-touch-icon-120.png","/icons/apple-touch-icon-152.png","/icons/apple-touch-icon-167.png","/icons/apple-touch-icon-180.png","/icons/icon-192.png","/icons/icon-512.png","/icons/icon-maskable-512.png","/manifest.webmanifest","/prevent-pull-to-refresh.js","/reload-on-chunk-error.js"];

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
