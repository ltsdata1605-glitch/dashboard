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
const VERSION = 'ced8ca3e3bd7';
const CACHE = 'ycx-shell-' + VERSION;
const PRECACHE = ["/assets/AboutView-VkcRT-Z_.js","/assets/BiWrapper-D5S9rGV-.js","/assets/BiWrapper-jkuwLpCC.css","/assets/ChangelogModal-Ezi6Tjor.js","/assets/CheckThuongView-BoeTTfce.js","/assets/ColumnConfigModal-GSpODb_9.js","/assets/DashboardView-rThPLOlb.js","/assets/DataUpdater-Ds89VsWj.js","/assets/EmployeeAnalysis-BDUFN1UC.js","/assets/ExportOptionsModal-BocK4qaI.js","/assets/ExternalToolView-YDuwWcGf.js","/assets/FileHistoryModal-OOpidEB-.js","/assets/FileNamingModal-CFXtWSqK.js","/assets/FontSelector-Dyt1ctnu.js","/assets/IndustryGrid-BTEyrKwn.js","/assets/KhaiThacView-Be5ILpKp.js","/assets/KpiCardConfigModal-CiIe4Ay4.js","/assets/LineBotView-SRRwC4oF.js","/assets/NhanVien-CgPDYxt1.js","/assets/PerformanceModal-CVUhSxI3.js","/assets/PhanCaView-CYYjc8a5.css","/assets/PhanCaView-DJ0abXH1.js","/assets/PivotTable-D-V0lmmy.js","/assets/PriceComparisonView-CKnwciEY.js","/assets/SectionHeader-CYMN-MD_.js","/assets/SettingsView-DBIPLhdm.js","/assets/StickerEventApp-D3paQnWL.js","/assets/StickerPrinterView-CHxD25Ii.js","/assets/SummaryTable-av92btWb.js","/assets/SummaryTableUtils-DV4pbyvj.js","/assets/TaxCalculatorView-DQPUjncm.js","/assets/TrendChart-C40wbfMD.js","/assets/UncollectedOrdersModal-tfyFrqTa.js","/assets/UnconfiguredGroupsModal-CJ9KrmEM.js","/assets/UnshippedOrdersModal-DerEK-04.js","/assets/UploadConflictModal-CD1B2nkR.js","/assets/UploadTypeSelectionModal-DMNjRV65.js","/assets/UserManagementView-CzMDNWyM.js","/assets/WarehouseSummary-CFgSf6wK.js","/assets/analytics.worker-B8lZyqYX.js","/assets/analytics.worker-BDfFHlbd.js","/assets/analytics.worker-aaFQcSTc.js","/assets/captureEngine-BaTE5pRs.js","/assets/chartConfig-C-f7hsgo.js","/assets/checkThuongIframeService-CGiaaonk.js","/assets/cloudDataService-Jc2kD9j9.js","/assets/dbService-Cpty6Qrk.js","/assets/googleSheetsService-BGBmW1BJ.js","/assets/googleSheetsService-D0LTBUzq.js","/assets/html2canvas.esm-QH1iLAAe.js","/assets/index-BmYaBoXa.js","/assets/index-C04p_sCX.css","/assets/index-CgJtiJsK.js","/assets/index-Cok6S9gG.js","/assets/index.es-C9WHi2Je.js","/assets/jspdf.es.min-CUCuRdXo.js","/assets/khaiThacDb-wE0jyue9.js","/assets/khoDataService-BDtmmeUg.js","/assets/lineBot.types-fMXzf8Qv.js","/assets/lineReportDelivery-CZ3clrHU.js","/assets/presetBi-CeN4CNDx.js","/assets/salesJsonWriter.worker-BNAYiZX6.js","/assets/salesJsonWriter.worker-iky0iAuj.js","/assets/scheduleHeartbeat.worker-DY9MOOqR.js","/assets/shared-utils-CoyMcgY7.js","/assets/summaryService-DqteQ5Of.js","/assets/vendor-charts-cgUzaFZk.js","/assets/vendor-excel-BGhuli8m.js","/assets/vendor-firebase-BKmb8Rjw.js","/assets/vendor-icons-DGtyW8pH.js","/assets/vendor-motion-CeUOfB9r.js","/assets/vendor-react-BFsc7Y4G.js","/assets/worker-DwBw6rNm.js","/favicon.svg","/icons/apple-touch-icon-120.png","/icons/apple-touch-icon-152.png","/icons/apple-touch-icon-167.png","/icons/apple-touch-icon-180.png","/icons/icon-192.png","/icons/icon-512.png","/icons/icon-maskable-512.png","/manifest.webmanifest","/prevent-pull-to-refresh.js","/reload-on-chunk-error.js"];

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
