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
const VERSION = 'c8a1cc45d5aa';
const CACHE = 'ycx-shell-' + VERSION;
const PRECACHE = ["/assets/AboutView-D559rHg8.js","/assets/BiWrapper-CdNty2Iy.js","/assets/BiWrapper-jkuwLpCC.css","/assets/ChangelogModal-DYuodTAJ.js","/assets/CheckThuongView-CjKPVSqt.js","/assets/ColumnConfigModal--05hunpy.js","/assets/DashboardView-DUJ0k-Wh.js","/assets/DataUpdater-5dAFQd5k.js","/assets/EmployeeAnalysis-DSdQNoVH.js","/assets/ExportOptionsModal-BODwPIch.js","/assets/ExternalToolView-YDuwWcGf.js","/assets/FileHistoryModal-CdvPqpeZ.js","/assets/FileNamingModal-CIzMO-wd.js","/assets/FontSelector-D8xIDm9g.js","/assets/IndustryGrid-DcU3x1Pj.js","/assets/KhaiThacView-Bnlm_WJt.js","/assets/KpiCardConfigModal-D-0kTvcX.js","/assets/LineBotView-Bc2hwzDF.js","/assets/NhanVien-BpR2hOts.js","/assets/PerformanceModal-DAL1kHSX.js","/assets/PhanCaView-CYYjc8a5.css","/assets/PhanCaView-Dn910ePu.js","/assets/PivotTable-mdOLf_Uu.js","/assets/PriceComparisonView--1Jjctyf.js","/assets/SectionHeader-DiqnQTne.js","/assets/SettingsView-B2sOabTZ.js","/assets/StickerEventApp-CUi8EoR5.js","/assets/StickerPrinterView-DK6GNVia.js","/assets/SummaryTable-DPJN3Ofg.js","/assets/SummaryTableUtils-DV4pbyvj.js","/assets/TaxCalculatorView-Dr4wEHa_.js","/assets/TrendChart-BlvZLXTc.js","/assets/UncollectedOrdersModal-Cec9Woo8.js","/assets/UnconfiguredGroupsModal-BgjDP-IE.js","/assets/UnshippedOrdersModal-DJoYl7PG.js","/assets/UploadConflictModal-B0icyMW-.js","/assets/UploadTypeSelectionModal-CQBkZrFu.js","/assets/UserManagementView-BycnzPKe.js","/assets/WarehouseSummary-DlYOCDQp.js","/assets/analytics.worker-B8lZyqYX.js","/assets/analytics.worker-BDfFHlbd.js","/assets/analytics.worker-aaFQcSTc.js","/assets/captureEngine-DkI0O6DV.js","/assets/chartConfig-C-f7hsgo.js","/assets/checkThuongIframeService-E4jwIPld.js","/assets/cloudDataService-VrH9506u.js","/assets/dbService-CC_zHXUF.js","/assets/googleSheetsService-BGBmW1BJ.js","/assets/googleSheetsService-D0LTBUzq.js","/assets/html2canvas.esm-QH1iLAAe.js","/assets/index-B1OEM6Jo.js","/assets/index-CgJtiJsK.js","/assets/index-Cok6S9gG.js","/assets/index-DV7j8PC0.css","/assets/index.es-B4R0JkAh.js","/assets/jspdf.es.min-K_knTV5_.js","/assets/khaiThacDb-JHmzt6Ky.js","/assets/khoDataService-D0s9JqJy.js","/assets/lineBot.types-NpUVZAQf.js","/assets/lineReportDelivery-DepVu8zQ.js","/assets/presetBi-CvA6JGxy.js","/assets/salesJsonWriter.worker-BNAYiZX6.js","/assets/salesJsonWriter.worker-iky0iAuj.js","/assets/scheduleHeartbeat.worker-DY9MOOqR.js","/assets/shared-utils-CoyMcgY7.js","/assets/summaryService-B_apl1j2.js","/assets/vendor-charts-cgUzaFZk.js","/assets/vendor-excel-BGhuli8m.js","/assets/vendor-firebase-BKmb8Rjw.js","/assets/vendor-icons-DGtyW8pH.js","/assets/vendor-motion-CeUOfB9r.js","/assets/vendor-react-BFsc7Y4G.js","/assets/worker-DwBw6rNm.js","/favicon.svg","/icons/apple-touch-icon-120.png","/icons/apple-touch-icon-152.png","/icons/apple-touch-icon-167.png","/icons/apple-touch-icon-180.png","/icons/icon-192.png","/icons/icon-512.png","/icons/icon-maskable-512.png","/manifest.webmanifest","/prevent-pull-to-refresh.js","/reload-on-chunk-error.js"];

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
