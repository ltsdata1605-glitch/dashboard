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
const VERSION = 'adfca5b4a62b';
const CACHE = 'ycx-shell-' + VERSION;
const PRECACHE = ["/assets/AboutView-CCiMeSB9.js","/assets/BiWrapper-jkuwLpCC.css","/assets/BiWrapper-u0qZhe52.js","/assets/ChangelogModal-DRUJUuxc.js","/assets/CheckThuongView-DFg8CLp9.js","/assets/ColumnConfigModal-BfUlpiXv.js","/assets/DashboardView-BTc8Z4F2.js","/assets/DataUpdater-DPQbi9vx.js","/assets/EmployeeAnalysis-BLNzQMyz.js","/assets/ExportOptionsModal-B5_mxmfe.js","/assets/ExternalToolView-YDuwWcGf.js","/assets/FileHistoryModal-DnRNgzxs.js","/assets/FileNamingModal-BbzhK1vc.js","/assets/FontSelector-DWBMv6k8.js","/assets/IndustryGrid-HEK0pz9j.js","/assets/KhaiThacView-CcLmypVB.js","/assets/KpiCardConfigModal-lApaqteK.js","/assets/LineBotView-CWlS5ayP.js","/assets/NhanVien-gfiyAvW0.js","/assets/PerformanceModal-B0jM98Rd.js","/assets/PhanCaView-CYYjc8a5.css","/assets/PhanCaView-DkRDmOpf.js","/assets/PivotTable-D3i60JYj.js","/assets/PriceComparisonView-DZldEY9O.js","/assets/SectionHeader-DppQzTno.js","/assets/SettingsView-Dda9HZT9.js","/assets/StickerEventApp-DL3LCX8s.js","/assets/StickerPrinterView-Dv3gH3la.js","/assets/SummaryTable-DlmRbiZp.js","/assets/SummaryTableUtils-DV4pbyvj.js","/assets/TaxCalculatorView-sD7EPfS3.js","/assets/TrendChart-CID5McRL.js","/assets/UncollectedOrdersModal-BJhprZ_0.js","/assets/UnconfiguredGroupsModal-vLUGiCfE.js","/assets/UnshippedOrdersModal-DatAtADC.js","/assets/UploadConflictModal-rInSo1yz.js","/assets/UploadTypeSelectionModal-Di3EVcxg.js","/assets/UserManagementView-D8YB1Nl9.js","/assets/WarehouseSummary-BlWWiCmW.js","/assets/analytics.worker-B8lZyqYX.js","/assets/analytics.worker-BDfFHlbd.js","/assets/analytics.worker-aaFQcSTc.js","/assets/captureEngine-CK18psIh.js","/assets/chartConfig-C-f7hsgo.js","/assets/checkThuongIframeService-Cu4Y_yG-.js","/assets/cloudDataService-B2JJBy-o.js","/assets/dbService-DtOKHe30.js","/assets/googleSheetsService-BGBmW1BJ.js","/assets/googleSheetsService-D0LTBUzq.js","/assets/html2canvas.esm-QH1iLAAe.js","/assets/index-BmyWsa9W.css","/assets/index-C_wvTJNH.js","/assets/index-CgJtiJsK.js","/assets/index-Cok6S9gG.js","/assets/index.es-Bfm60fg2.js","/assets/jspdf.es.min-DHnWQoMD.js","/assets/khaiThacDb-zAdpWW8W.js","/assets/khoDataService-DfPWS8Al.js","/assets/lineBot.types-hh4WBLuT.js","/assets/lineReportDelivery-CnXm6vJI.js","/assets/presetBi-DewSsVgH.js","/assets/salesJsonWriter.worker-BNAYiZX6.js","/assets/salesJsonWriter.worker-iky0iAuj.js","/assets/scheduleHeartbeat.worker-DY9MOOqR.js","/assets/shared-utils-CoyMcgY7.js","/assets/summaryService-MHuBOSep.js","/assets/vendor-charts-cgUzaFZk.js","/assets/vendor-excel-BGhuli8m.js","/assets/vendor-firebase-BKmb8Rjw.js","/assets/vendor-icons-DGtyW8pH.js","/assets/vendor-motion-CeUOfB9r.js","/assets/vendor-react-BFsc7Y4G.js","/assets/worker-DwBw6rNm.js","/favicon.svg","/icons/apple-touch-icon-120.png","/icons/apple-touch-icon-152.png","/icons/apple-touch-icon-167.png","/icons/apple-touch-icon-180.png","/icons/icon-192.png","/icons/icon-512.png","/icons/icon-maskable-512.png","/manifest.webmanifest","/prevent-pull-to-refresh.js","/reload-on-chunk-error.js"];

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
