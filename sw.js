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
const VERSION = '60a296888a6a';
const CACHE = 'ycx-shell-' + VERSION;
const PRECACHE = ["/assets/AboutView-hSAMrYQP.js","/assets/BiWrapper-BL2OLMls.css","/assets/BiWrapper-CxbYbYhb.js","/assets/ChangelogModal-CaVAaRZa.js","/assets/CheckThuongView-BPgwf0PF.js","/assets/DashboardView-_EUNpwQF.js","/assets/DataUpdater-B471-mVl.js","/assets/EmployeeAnalysis-Btmo__zw.js","/assets/ExportOptionsModal-C4A_llSk.js","/assets/ExternalToolView-YDuwWcGf.js","/assets/FileHistoryModal--7xxuzbN.js","/assets/FileNamingModal-Bf3jQb0y.js","/assets/FontSelector-WtYguuHy.js","/assets/IndustryGrid-BnoxFjeI.js","/assets/KhaiThacView-BbqxyZ8M.js","/assets/KpiCardConfigModal-LP1uuiJq.js","/assets/LineBotView-BgX-VPNJ.js","/assets/NhanVien-Cc4gxZp6.js","/assets/PerformanceModal-D2-r7zhF.js","/assets/PhanCaView-CDGD28Xj.js","/assets/PhanCaView-CYYjc8a5.css","/assets/PivotTable-BtbnpCm8.js","/assets/PriceComparisonView-DbH45S0_.js","/assets/SectionHeader-CyI0SGFi.js","/assets/SettingsView-B5k3iP5_.js","/assets/StickerEventApp-CXu00nvp.js","/assets/StickerPrinterView-gr2q5E4v.js","/assets/SummaryTable-CX4uvr78.js","/assets/SummaryTableUtils-DV4pbyvj.js","/assets/TaxCalculatorView-BN3cGg0x.js","/assets/TrendChart-Cbwiw8mk.js","/assets/UncollectedOrdersModal-Crgw5jFd.js","/assets/UnconfiguredGroupsModal-B-R3RkMK.js","/assets/UnshippedOrdersModal-Cg7amw9X.js","/assets/UploadConflictModal-CNKOqFBF.js","/assets/UploadTypeSelectionModal-Dn26VdUf.js","/assets/UserManagementView-D1KwXmU_.js","/assets/analytics.worker-BDfFHlbd.js","/assets/analytics.worker-DPngphgu.js","/assets/analytics.worker-D_9AshrL.js","/assets/captureEngine-C-bQDgIt.js","/assets/chartConfig-C-f7hsgo.js","/assets/checkThuongIframeService-D85MGRs4.js","/assets/cloudDataService-C5WK5tCT.js","/assets/dataService-lNgFTZGE.js","/assets/dbService-B1t2m1eT.js","/assets/firebaseProductConfigService-CB_SIuwT.js","/assets/googleSheetsService-BGBmW1BJ.js","/assets/googleSheetsService-D0LTBUzq.js","/assets/html2canvas.esm-QH1iLAAe.js","/assets/index-Bi23bDGT.js","/assets/index-CgJtiJsK.js","/assets/index-Cok6S9gG.js","/assets/index-DgRAJZYl.css","/assets/index.es-Bt_4fegO.js","/assets/jspdf.es.min-_kNZyZdy.js","/assets/khaiThacDb-BgPKl3h1.js","/assets/khoDataService-ZFwfUoNQ.js","/assets/lineBot.types-BeWOfRPO.js","/assets/lineReportDelivery-BiwqM2Ae.js","/assets/presetBi-cYJbGlbg.js","/assets/salesJsonWriter.worker-BNAYiZX6.js","/assets/salesJsonWriter.worker-iky0iAuj.js","/assets/scheduleHeartbeat.worker-DY9MOOqR.js","/assets/shared-utils-CoyMcgY7.js","/assets/summaryService-DoHnfYop.js","/assets/vendor-charts-cgUzaFZk.js","/assets/vendor-excel-BGhuli8m.js","/assets/vendor-firebase-BNAOMJ2F.js","/assets/vendor-icons-DGtyW8pH.js","/assets/vendor-motion-CeUOfB9r.js","/assets/vendor-react-BFsc7Y4G.js","/assets/worker-DwBw6rNm.js","/favicon.svg","/icons/apple-touch-icon-120.png","/icons/apple-touch-icon-152.png","/icons/apple-touch-icon-167.png","/icons/apple-touch-icon-180.png","/icons/icon-192.png","/icons/icon-512.png","/icons/icon-maskable-512.png","/manifest.webmanifest","/prevent-pull-to-refresh.js","/reload-on-chunk-error.js"];

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
