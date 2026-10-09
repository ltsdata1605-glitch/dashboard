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
const VERSION = 'd69df3f026ab';
const CACHE = 'ycx-shell-' + VERSION;
const PRECACHE = ["/assets/AboutView-YuAW-CD6.js","/assets/BiWrapper-cLuoVtCe.js","/assets/BiWrapper-jkuwLpCC.css","/assets/ChangelogModal-tRIpDctm.js","/assets/CheckThuongView-H5dSETz5.js","/assets/ColumnConfigModal-8Pw8Af4k.js","/assets/DashboardView-tq17IGZT.js","/assets/DataUpdater-Cp6D5GV9.js","/assets/EmployeeAnalysis-PFtrTp_q.js","/assets/ExportOptionsModal-fyxrx63J.js","/assets/ExternalToolView-YDuwWcGf.js","/assets/FileHistoryModal-KchkWUtm.js","/assets/FileNamingModal-Ds82fG5c.js","/assets/FontSelector-B1CgogYR.js","/assets/IndustryGrid-DswDQiDP.js","/assets/KhaiThacView-oQ3IZqew.js","/assets/KpiCardConfigModal-Dgyyzm-E.js","/assets/LineBotView-Cqpc0YuN.js","/assets/NhanVien-Zy6VffFD.js","/assets/PerformanceModal-DHKkLUAK.js","/assets/PhanCaView-Buy2WYnF.js","/assets/PhanCaView-CYYjc8a5.css","/assets/PivotTable-yndZ_NMd.js","/assets/PriceComparisonView-DKKMdpOu.js","/assets/SectionHeader-wJHAKWlF.js","/assets/SettingsView-BKxlYCee.js","/assets/StickerEventApp-BbaExori.js","/assets/StickerPrinterView--EIFAjVx.js","/assets/SummaryTable-M9fnWxwk.js","/assets/SummaryTableUtils-DV4pbyvj.js","/assets/TaxCalculatorView-DCcydrTA.js","/assets/TrendChart-7iznU9xO.js","/assets/UncollectedOrdersModal-BqTneHog.js","/assets/UnconfiguredGroupsModal--TPn9W9F.js","/assets/UnshippedOrdersModal-onQlapAo.js","/assets/UploadConflictModal-eP369EUf.js","/assets/UploadTypeSelectionModal-CsEY8ty8.js","/assets/UserManagementView-WqZSVB3d.js","/assets/WarehouseSummary-hfjRsAKH.js","/assets/analytics.worker-B8lZyqYX.js","/assets/analytics.worker-BDfFHlbd.js","/assets/analytics.worker-aaFQcSTc.js","/assets/captureEngine-D8tCbOMJ.js","/assets/chartConfig-C-f7hsgo.js","/assets/checkThuongIframeService-DkXo1ivG.js","/assets/cloudDataService-DskOVeoB.js","/assets/dbService-_V_6zO4F.js","/assets/googleSheetsService-BGBmW1BJ.js","/assets/googleSheetsService-D0LTBUzq.js","/assets/html2canvas.esm-QH1iLAAe.js","/assets/index-CgJtiJsK.js","/assets/index-CjFJzFdG.css","/assets/index-CjW0s7Ad.js","/assets/index-Cok6S9gG.js","/assets/index.es-BmPX3Uho.js","/assets/jspdf.es.min-C5TG9e2l.js","/assets/khaiThacDb-VH-i09qs.js","/assets/khoDataService-Dv5xHsZq.js","/assets/lineBot.types-CY0Z-I3g.js","/assets/lineReportDelivery-D2z32FZQ.js","/assets/presetBi-BXDvXKuC.js","/assets/salesJsonWriter.worker-BNAYiZX6.js","/assets/salesJsonWriter.worker-iky0iAuj.js","/assets/scheduleHeartbeat.worker-DY9MOOqR.js","/assets/shared-utils-CoyMcgY7.js","/assets/summaryService-gQLQMsoD.js","/assets/vendor-charts-cgUzaFZk.js","/assets/vendor-excel-BGhuli8m.js","/assets/vendor-firebase-BKmb8Rjw.js","/assets/vendor-icons-DGtyW8pH.js","/assets/vendor-motion-CeUOfB9r.js","/assets/vendor-react-BFsc7Y4G.js","/assets/worker-DwBw6rNm.js","/favicon.svg","/icons/apple-touch-icon-120.png","/icons/apple-touch-icon-152.png","/icons/apple-touch-icon-167.png","/icons/apple-touch-icon-180.png","/icons/icon-192.png","/icons/icon-512.png","/icons/icon-maskable-512.png","/manifest.webmanifest","/prevent-pull-to-refresh.js","/reload-on-chunk-error.js"];

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
