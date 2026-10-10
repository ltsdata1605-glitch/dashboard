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
const VERSION = '67fdeed37f00';
const CACHE = 'ycx-shell-' + VERSION;
const PRECACHE = ["/assets/AboutView-BR33dKEO.js","/assets/BiWrapper-BL2OLMls.css","/assets/BiWrapper-Dt7yx5LB.js","/assets/ChangelogModal-DO-Z7qgx.js","/assets/CheckThuongView-D2m_7Ll1.js","/assets/DashboardView-CGRKtV6f.js","/assets/DataUpdater-CFKlftZR.js","/assets/EmployeeAnalysis-BAV5POXE.js","/assets/ExportOptionsModal-_CHfDM5c.js","/assets/ExternalToolView-YDuwWcGf.js","/assets/FileHistoryModal-HWZAjhxQ.js","/assets/FileNamingModal-NU7EwGIS.js","/assets/FontSelector-BtkX2P7s.js","/assets/IndustryGrid-25oib3OI.js","/assets/KhaiThacView-7HKtofDq.js","/assets/KpiCardConfigModal-BbEFeEFe.js","/assets/LineBotView-aPD1Z5Oc.js","/assets/NhanVien-1Ml8WahG.js","/assets/PerformanceModal-By2JU49s.js","/assets/PhanCaView-CYYjc8a5.css","/assets/PhanCaView-DJO19dDu.js","/assets/PivotTable-BRa6WSEA.js","/assets/PriceComparisonView-B8PyFCzZ.js","/assets/SectionHeader-CgaUcZYN.js","/assets/SettingsView-BN_B9VKt.js","/assets/StickerEventApp-Coiqb8_m.js","/assets/StickerPrinterView-BT9TezIt.js","/assets/SummaryTable-Bc5kKf0_.js","/assets/SummaryTableUtils-DV4pbyvj.js","/assets/TaxCalculatorView-CxOl1VwL.js","/assets/TrendChart-BxbCBslS.js","/assets/UncollectedOrdersModal-DYgTmc2t.js","/assets/UnconfiguredGroupsModal-DR_lXk3e.js","/assets/UnshippedOrdersModal-C5AWaBKM.js","/assets/UploadConflictModal-ClmqqKU1.js","/assets/UploadTypeSelectionModal-CAj9RJCg.js","/assets/UserManagementView-BTlvoTk_.js","/assets/analytics.worker-BDfFHlbd.js","/assets/analytics.worker-DPngphgu.js","/assets/analytics.worker-D_9AshrL.js","/assets/captureEngine-eEoEjHp5.js","/assets/chartConfig-C-f7hsgo.js","/assets/checkThuongIframeService-DGGdGeg-.js","/assets/cloudDataService-FZPBL8D1.js","/assets/dataService-DJOZnUtY.js","/assets/dbService-Bc6a3ak8.js","/assets/firebaseProductConfigService-CIgBHsGw.js","/assets/googleSheetsService-BGBmW1BJ.js","/assets/googleSheetsService-D0LTBUzq.js","/assets/html2canvas.esm-QH1iLAAe.js","/assets/index-Bj0CIyju.js","/assets/index-CgJtiJsK.js","/assets/index-Cok6S9gG.js","/assets/index-DgRAJZYl.css","/assets/index.es-BqgXtx8W.js","/assets/jspdf.es.min-CLF5iiOJ.js","/assets/khaiThacDb-ChkMIYZJ.js","/assets/khoDataService-MsevlZec.js","/assets/lineBot.types-C-D2-Ep6.js","/assets/lineReportDelivery-BeFDn6X8.js","/assets/presetBi-Dir1Mhhw.js","/assets/salesJsonWriter.worker-BNAYiZX6.js","/assets/salesJsonWriter.worker-iky0iAuj.js","/assets/scheduleHeartbeat.worker-DY9MOOqR.js","/assets/shared-utils-CoyMcgY7.js","/assets/summaryService-DR8bv83z.js","/assets/vendor-charts-cgUzaFZk.js","/assets/vendor-excel-BGhuli8m.js","/assets/vendor-firebase-BNAOMJ2F.js","/assets/vendor-icons-DGtyW8pH.js","/assets/vendor-motion-CeUOfB9r.js","/assets/vendor-react-BFsc7Y4G.js","/assets/worker-DwBw6rNm.js","/favicon.svg","/icons/apple-touch-icon-120.png","/icons/apple-touch-icon-152.png","/icons/apple-touch-icon-167.png","/icons/apple-touch-icon-180.png","/icons/icon-192.png","/icons/icon-512.png","/icons/icon-maskable-512.png","/manifest.webmanifest","/prevent-pull-to-refresh.js","/reload-on-chunk-error.js"];

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
