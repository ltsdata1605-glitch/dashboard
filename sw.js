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
const VERSION = '25af81504df2';
const CACHE = 'ycx-shell-' + VERSION;
const PRECACHE = ["/assets/AboutView-DCIaHU_-.js","/assets/BiWrapper-BL2OLMls.css","/assets/BiWrapper-BcQsfuBo.js","/assets/ChangelogModal-DDFMACcX.js","/assets/CheckThuongView-C4-afebW.js","/assets/DashboardView-CX7vFYB9.js","/assets/DataUpdater-z__DEOAx.js","/assets/EmployeeAnalysis-B89JX_Gh.js","/assets/ExportOptionsModal-DaBz_T10.js","/assets/ExternalToolView-YDuwWcGf.js","/assets/FileHistoryModal-DV1Xmw3h.js","/assets/FileNamingModal-u7aGYBAk.js","/assets/FontSelector-Buod6MgT.js","/assets/IndustryGrid-CsgR6TDJ.js","/assets/KhaiThacView-DusXedZo.js","/assets/KpiCardConfigModal-SZ5gyOc1.js","/assets/LineBotView-CIX4UBTz.js","/assets/NhanVien-cuOMn4Dc.js","/assets/PerformanceModal-CX_7z5Yt.js","/assets/PhanCaView-Bo-QxgS5.js","/assets/PhanCaView-CYYjc8a5.css","/assets/PivotTable-DEn6Lunh.js","/assets/PriceComparisonView-DLWfZ0_V.js","/assets/SectionHeader-DTSxfCIA.js","/assets/SettingsView-CzGcSpTY.js","/assets/StickerEventApp-CdVpKxTt.js","/assets/StickerPrinterView-BcbEEi6g.js","/assets/SummaryTable-CWadkQqH.js","/assets/SummaryTableUtils-DV4pbyvj.js","/assets/TaxCalculatorView-DX09BtPJ.js","/assets/TrendChart-li0MbDW5.js","/assets/UncollectedOrdersModal-Ddded3s6.js","/assets/UnconfiguredGroupsModal-GYArSzXY.js","/assets/UnshippedOrdersModal-BhT9nenm.js","/assets/UploadConflictModal-C9mRXmdt.js","/assets/UploadTypeSelectionModal-D8L3EhBS.js","/assets/UserManagementView-De1W8t9L.js","/assets/analytics.worker-BDfFHlbd.js","/assets/analytics.worker-DPngphgu.js","/assets/analytics.worker-D_9AshrL.js","/assets/captureEngine-DT-ZRVts.js","/assets/chartConfig-C-f7hsgo.js","/assets/checkThuongIframeService-BdvylJhM.js","/assets/cloudDataService-Bl9yxVGt.js","/assets/dataService-B4MnjOJR.js","/assets/dbService-M9_MKzzu.js","/assets/firebaseProductConfigService-DsEA6ANm.js","/assets/googleSheetsService-BGBmW1BJ.js","/assets/googleSheetsService-D0LTBUzq.js","/assets/html2canvas.esm-QH1iLAAe.js","/assets/index-2i7-orLx.js","/assets/index-CgJtiJsK.js","/assets/index-Cok6S9gG.js","/assets/index-wqiqzL2G.css","/assets/index.es-z249wNTC.js","/assets/jspdf.es.min-b2WzsunC.js","/assets/khaiThacDb-eaBLMcAH.js","/assets/khoDataService-D_RnzDrj.js","/assets/lineBot.types-CEKjplNR.js","/assets/lineReportDelivery-DQ_-d_cW.js","/assets/presetBi-DlMyX7FH.js","/assets/salesJsonWriter.worker-BNAYiZX6.js","/assets/salesJsonWriter.worker-iky0iAuj.js","/assets/scheduleHeartbeat.worker-DY9MOOqR.js","/assets/shared-utils-CoyMcgY7.js","/assets/summaryService-BkEvFVwR.js","/assets/vendor-charts-cgUzaFZk.js","/assets/vendor-excel-BGhuli8m.js","/assets/vendor-firebase-BNAOMJ2F.js","/assets/vendor-icons-DGtyW8pH.js","/assets/vendor-motion-CeUOfB9r.js","/assets/vendor-react-BFsc7Y4G.js","/assets/worker-DwBw6rNm.js","/favicon.svg","/icons/apple-touch-icon-120.png","/icons/apple-touch-icon-152.png","/icons/apple-touch-icon-167.png","/icons/apple-touch-icon-180.png","/icons/icon-192.png","/icons/icon-512.png","/icons/icon-maskable-512.png","/manifest.webmanifest","/prevent-pull-to-refresh.js","/reload-on-chunk-error.js"];

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
