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
const VERSION = 'dca9d1663baf';
const CACHE = 'ycx-shell-' + VERSION;
const PRECACHE = ["/assets/AboutView-DgDShHUs.js","/assets/Badge-Zes1F2RM.js","/assets/Banner-jbuJeJeQ.js","/assets/BiWrapper-Deoe6Wap.js","/assets/BiWrapper-HPb32kft.css","/assets/ChangelogModal-BfNaPFEZ.js","/assets/CheckThuongView-OF-dN4D5.js","/assets/ConfirmDialog-D581NbUj.js","/assets/CouponConverterView-Cw7r24-0.js","/assets/DashboardView-XJhkHzcp.js","/assets/DataUpdater-EqznuGVO.js","/assets/EmployeeAnalysis-D3xFrshw.js","/assets/EmptyState-hzGhuoG6.js","/assets/ExportOptionsModal-gVyKIjhE.js","/assets/ExternalToolView-YDuwWcGf.js","/assets/FeatureLandingLayout-CDIoG4xv.js","/assets/FileHistoryModal-CcAhBAPt.js","/assets/FileNamingModal-Demv3u2L.js","/assets/GlobalAutoSyncDock-B7kFMNRk.js","/assets/IndustryGrid-DxKNtoVu.js","/assets/Input-OOr0orgv.js","/assets/KhaiThacView-B-WCsEFv.js","/assets/KpiCard-CLLxlua0.js","/assets/KpiCardConfigModal-BuBWkMOE.js","/assets/LineBotView-DgqI4Rkx.js","/assets/LoginView-BxaxzxNG.js","/assets/MultiSelectDropdown-BRvv41sc.js","/assets/NhanVien-3LHJU47A.js","/assets/PendingApprovalView-CiReAYUX.js","/assets/PerformanceModal-BYHGboAs.js","/assets/PhanCaView-CYYjc8a5.css","/assets/PhanCaView-CrTU0Gb4.js","/assets/PriceComparisonView-CXnMfO32.js","/assets/SectionCard-DtvvhG9X.js","/assets/SectionHeader-PrhUQyfR.js","/assets/Select-NBQHs7ta.js","/assets/SettingsView-CJB3kRL2.js","/assets/StickerEventApp-mliiqEIm.js","/assets/StickerPrinterView-BICqXCbV.js","/assets/SummaryTable-DpHYJ8e0.js","/assets/Switch-DNbWRviz.js","/assets/Tabs-Csuh8S8b.js","/assets/TaxCalculatorView-CG3PfPDP.js","/assets/TrendChart-CdBQE2HE.js","/assets/UncollectedOrdersModal-Bk_9nf4u.js","/assets/UnconfiguredGroupsModal-CCPigsvQ.js","/assets/UnshippedOrdersModal-QaimkvrA.js","/assets/UploadConflictModal-BOcoAvZj.js","/assets/UploadTypeSelectionModal-CEZb1eYD.js","/assets/UserManagementView-egQkE-Cp.js","/assets/analysisEmployeeSyncService-CsNGKglZ.js","/assets/analytics.worker-DGbynWY_.js","/assets/analytics.worker-DPngphgu.js","/assets/analytics.worker-D_9AshrL.js","/assets/autoNavigationService-BgGaTH4p.js","/assets/captureEngine-BraAKDn_.js","/assets/chartConfig-C-f7hsgo.js","/assets/checkThuongIframeService-Cptnbp17.js","/assets/cloudDataService-CMz6cUqW.js","/assets/configStore-jfv_oEyo.js","/assets/dataService-Avg2Zw_R.js","/assets/dataUtils-CM6r6tAe.js","/assets/dbService-C84iAcHG.js","/assets/firebaseProductConfigService-CEUasrlk.js","/assets/googleSheetsService-BGBmW1BJ.js","/assets/googleSheetsService-D0LTBUzq.js","/assets/html2canvas.esm-QH1iLAAe.js","/assets/index-BNDufTkd.css","/assets/index-BbJu6AQY.js","/assets/index-CgJtiJsK.js","/assets/index-Cok6S9gG.js","/assets/index-DEqjNPex.js","/assets/index.es-FDUp6x0C.js","/assets/industryColors-NaMQqhES.js","/assets/jspdf.es.min-BeyqUY_E.js","/assets/khaiThacDb-Bun1CsJS.js","/assets/khoDataService-B8I12TJ9.js","/assets/legacyIconNames-DqmwnIqS.js","/assets/moTaBoLoc-B6sNO7U6.js","/assets/presetBi-D4_SOxRb.js","/assets/salesJsonWriter.worker-BNAYiZX6.js","/assets/salesJsonWriter.worker-iky0iAuj.js","/assets/scheduleHeartbeat.worker-DY9MOOqR.js","/assets/shared-utils-CoyMcgY7.js","/assets/summaryService-BVgeE8OT.js","/assets/useBiAutoSync-BaMiZks8.js","/assets/useMultiMonthBonusRun-97i-Nw2X.js","/assets/vendor-charts-cgUzaFZk.js","/assets/vendor-excel-BGhuli8m.js","/assets/vendor-firebase-DNnqQYvo.js","/assets/vendor-firebase-analytics-DNdKLinw.js","/assets/vendor-icons-CmCra2aO.js","/assets/vendor-react-BFsc7Y4G.js","/assets/worker-DwBw6rNm.js","/assets/ycxAutoSyncService--k61RMRm.js","/favicon.svg","/icons/apple-touch-icon-120.png","/icons/apple-touch-icon-152.png","/icons/apple-touch-icon-167.png","/icons/apple-touch-icon-180.png","/icons/icon-192.png","/icons/icon-512.png","/icons/icon-maskable-512.png","/manifest.webmanifest","/prevent-pull-to-refresh.js","/reload-on-chunk-error.js"];
const CORE = ["/assets/index-DEqjNPex.js","/assets/vendor-react-BFsc7Y4G.js","/assets/shared-utils-CoyMcgY7.js","/assets/vendor-icons-CmCra2aO.js","/assets/vendor-firebase-DNnqQYvo.js","/assets/index-BNDufTkd.css","/prevent-pull-to-refresh.js","/reload-on-chunk-error.js","/favicon.svg","/manifest.webmanifest"];

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
