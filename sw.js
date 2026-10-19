/* Service worker của Dashboard YCX — SINH TỰ ĐỘNG lúc build bởi vite.config.ts (plugin ycx-offline-sw).
 * Mục tiêu (chủ dự án chốt 2026-10-08): mở app từ Màn hình chính / trình duyệt khi MẤT MẠNG vẫn thấy giao diện
 * và dữ liệu đã lưu trên máy (IndexedDB), không bị trang trắng "Không có kết nối".
 *
 * Chiến lược:
 *  - Cài đặt (GĐ2 tăng tốc 2026-10-11): chỉ tải LÕI (index.html + đúng các file index.html tự nạp) và CHÉP từ cache của bản
 *    trước những file /assets/ không đổi (tên có mã băm → cùng tên là cùng nội dung) — không tải lại qua mạng.
 *    Phần còn lại (mọi file /assets/ khác + icon) tải ngầm khi trang nhắn 'ycx-precache-rest' (trang đã vẽ xong + rảnh),
 *    3 luồng một lúc → không giành băng thông với lượt mở app. Trước đây lượt cài tải cùng lúc 7,9 MB / 71 file.
 *  - Điều hướng (mở trang/tải lại): ƯU TIÊN MẠNG (luôn nhận bản mới khi có mạng, tránh kẹt bản cũ), quá 4 giây hoặc
 *    lỗi thì dùng bản đã lưu. Bản mới nhất tự được lưu lại.
 *  - /assets/*, phông, ảnh khung: ƯU TIÊN BẢN LƯU (tên có mã băm nên không bao giờ cũ); thiếu thì tải rồi lưu.
 *  - Yêu cầu khác origin (Firebase, LINE, Google…) KHÔNG đụng tới — SDK tự xử lý offline.
 */
const VERSION = 'd6665b54a26d';
const CACHE = 'ycx-shell-' + VERSION;
const PRECACHE = ["/assets/AboutView-6-1Okl1M.js","/assets/AreaAutoExportButton-DrSm2Knv.js","/assets/Badge-Zes1F2RM.js","/assets/Banner-BtFGN0xH.js","/assets/BiWrapper-DMR52XUc.css","/assets/BiWrapper-DqWdRdvL.js","/assets/ChangelogModal-DNacEcPE.js","/assets/CheckThuongView-BZOzjKUO.js","/assets/ConfirmDialog-CCIISF6H.js","/assets/CouponConverterView-ZD42bene.js","/assets/DashboardView-BAGW__sb.js","/assets/DataUpdater-ZsAQ6SVS.js","/assets/EmployeeAnalysis-CesVL91G.js","/assets/EmptyState-4rC1BUiT.js","/assets/ExportOptionsModal-Cs056Rxs.js","/assets/ExternalToolView-YDuwWcGf.js","/assets/FileHistoryModal-MblIQEM7.js","/assets/FileNamingModal-DDj37n_l.js","/assets/GlobalAutoSyncDock-D7MxOAJU.js","/assets/IndustryGrid-CQSuFAM4.js","/assets/Input-UrBPirXq.js","/assets/KhaiThacView-Br6_uRhh.js","/assets/KpiCard-Bs4DGd4d.js","/assets/KpiCardConfigModal-ZiKt2lzY.js","/assets/LineBotView-EMrF9uey.js","/assets/LoginView-CdLi6gZh.js","/assets/MultiSelectDropdown-CJIGfQ2b.js","/assets/NhanVien-CGqIxlOG.js","/assets/PendingApprovalView-DYjAjZl-.js","/assets/PerformanceModal-D4r7x10G.js","/assets/PhanCaView-BOpxMXqX.js","/assets/PhanCaView-CYYjc8a5.css","/assets/PriceComparisonView-D2kyI_j5.js","/assets/SectionCard-DtvvhG9X.js","/assets/SectionHeader-BC9zsFAX.js","/assets/Select-CLCONx2P.js","/assets/SettingsView-CD8v1yvm.js","/assets/ShiftWarehouseInputModal-DexR6Ubm.js","/assets/StickerEventApp-C7piFf8x.js","/assets/StickerPrinterView-C7tARq0o.js","/assets/SummaryTable-_CVJX-95.js","/assets/Switch-U82xGRxI.js","/assets/Tabs-qLsF0Syc.js","/assets/TaxCalculatorView-iTnf1Y3H.js","/assets/TrendChart-BinYeO8l.js","/assets/UncollectedOrdersModal-DQw_okYe.js","/assets/UnconfiguredGroupsModal-nq3SwxJj.js","/assets/UnshippedOrdersModal-sLardSoU.js","/assets/UploadConflictModal-CcJmCxVw.js","/assets/UploadTypeSelectionModal-DftCK6Sr.js","/assets/UserManagementView-CQCu8iRv.js","/assets/analysisEmployeeSyncService-jsm7GO33.js","/assets/analytics.worker-BfRBJyQG.js","/assets/analytics.worker-CCAy1kzZ.js","/assets/analytics.worker-Dmt2aDVi.js","/assets/autoNavigationService-CxnI4pAt.js","/assets/autoReportExportService-BOOn1tPv.js","/assets/captureEngine-DnPty26K.js","/assets/chartConfig-C-f7hsgo.js","/assets/checkThuongIframeService-LQbuy3eZ.js","/assets/cloudDataService-BNg9rqqT.js","/assets/configStore-jfv_oEyo.js","/assets/dataService-BIm08jfS.js","/assets/dataUtils-DOOjWE1L.js","/assets/dbService-UsCRKyn6.js","/assets/firebaseProductConfigService-Bm9lYwpw.js","/assets/googleSheetsService-BGBmW1BJ.js","/assets/googleSheetsService-D0LTBUzq.js","/assets/html2canvas.esm-QH1iLAAe.js","/assets/index-BbJu6AQY.js","/assets/index-CgJtiJsK.js","/assets/index-Cok6S9gG.js","/assets/index-D8y5CvJQ.css","/assets/index-DK91qt7-.js","/assets/index.es-g3q1WwVW.js","/assets/industryColors-NaMQqhES.js","/assets/jspdf.es.min-DSaxh4cq.js","/assets/khaiThacDb-BO6OOJLF.js","/assets/khoDataService-DvwlXU9d.js","/assets/legacyIconNames-DWbMRJ6h.js","/assets/lineBot.types-sd2DOTwl.js","/assets/moTaBoLoc-B6sNO7U6.js","/assets/presetBi-JLNuOT9i.js","/assets/salesJsonWriter.worker-BNAYiZX6.js","/assets/salesJsonWriter.worker-iky0iAuj.js","/assets/scheduleHeartbeat.worker-DY9MOOqR.js","/assets/shared-utils-CoyMcgY7.js","/assets/summaryService-YSJkAG59.js","/assets/useBiAutoSync-D_yG48B5.js","/assets/useMultiMonthBonusRun-QpnUnNU3.js","/assets/vendor-charts-cgUzaFZk.js","/assets/vendor-excel-BGhuli8m.js","/assets/vendor-firebase-DT1DDorP.js","/assets/vendor-firebase-analytics-DCeAmzTQ.js","/assets/vendor-icons-CmCra2aO.js","/assets/vendor-react-BFsc7Y4G.js","/assets/worker-C3Ehuode.js","/assets/ycxAutoSyncService--k61RMRm.js","/favicon.svg","/icons/apple-touch-icon-120.png","/icons/apple-touch-icon-152.png","/icons/apple-touch-icon-167.png","/icons/apple-touch-icon-180.png","/icons/icon-192.png","/icons/icon-512.png","/icons/icon-maskable-512.png","/manifest.webmanifest","/prevent-pull-to-refresh.js","/reload-on-chunk-error.js"];
const CORE = ["/assets/index-DK91qt7-.js","/assets/vendor-react-BFsc7Y4G.js","/assets/shared-utils-CoyMcgY7.js","/assets/vendor-icons-CmCra2aO.js","/assets/vendor-firebase-DT1DDorP.js","/assets/index-D8y5CvJQ.css","/prevent-pull-to-refresh.js","/reload-on-chunk-error.js","/favicon.svg","/manifest.webmanifest"];

/** File /assets/ có mã băm trong tên: bản ở HTTP cache / cache của bản cũ luôn đúng → không cần ép tải lại. */
const requestFor = (u) => new Request(u, { cache: u.startsWith('/assets/') ? 'default' : 'reload' });

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // index.html bắt buộc; file khác lỗi lẻ tẻ không làm hỏng cả lượt cài.
    await cache.add(new Request('/index.html', { cache: 'reload' }));
    // Chép file /assets/ không đổi từ cache của bản trước (cache cũ chỉ bị dọn ở 'activate') — không tốn mạng.
    await Promise.allSettled(PRECACHE.filter((u) => u.startsWith('/assets/')).map(async (u) => {
      const old = await caches.match(u);
      if (old) await cache.put(u, old);
    }));
    await Promise.allSettled(CORE.map(async (u) => { if (!(await cache.match(u))) await cache.add(requestFor(u)); }));
    await self.skipWaiting();
  })());
});

/** Tải ngầm phần còn lại (gọi khi trang báo đã rảnh). Chạy lại nhiều lần không sao: file đã có thì bỏ qua. */
let restRun = null;
function precacheRest() {
  if (!restRun) {
    restRun = (async () => {
      const cache = await caches.open(CACHE);
      const todo = [];
      for (const u of PRECACHE) if (!(await cache.match(u))) todo.push(u);
      let i = 0;
      const lane = async () => {
        while (i < todo.length) {
          const u = todo[i++];
          try { await cache.add(requestFor(u)); } catch { /* lỗi lẻ tẻ: lần mở sau tải tiếp */ }
        }
      };
      await Promise.all([lane(), lane(), lane()]);
    })().finally(() => { restRun = null; });
  }
  return restRun;
}

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'ycx-precache-rest') event.waitUntil(precacheRest());
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
