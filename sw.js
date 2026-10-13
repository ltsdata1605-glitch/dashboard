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
const VERSION = '7b90e5247cb6';
const CACHE = 'ycx-shell-' + VERSION;
const PRECACHE = ["/assets/AboutView-fjySkfpp.js","/assets/Badge-Zes1F2RM.js","/assets/Banner-5fk1PpAN.js","/assets/BiWrapper-BL2OLMls.css","/assets/BiWrapper-CTXZmPhD.js","/assets/ChangelogModal-DdCZMl38.js","/assets/CheckThuongView-Ds1IsAyP.js","/assets/ConfirmDialog-BUFmAUPt.js","/assets/CouponConverterView-DW9ujN0f.js","/assets/DashboardView-DYeGGu8y.js","/assets/DataUpdater-BCr9bpEQ.js","/assets/EmployeeAnalysis-Yw1qZaWe.js","/assets/EmptyState-DtLCriXv.js","/assets/ExportOptionsModal-DdFain6m.js","/assets/ExternalToolView-YDuwWcGf.js","/assets/FeatureLandingLayout-DkkgpCp5.js","/assets/FileHistoryModal-DvTvN6z-.js","/assets/FileNamingModal-DGFTOVKO.js","/assets/GlobalAutoSyncDock-D6a5vLXF.js","/assets/IndustryGrid-BqQx6xN-.js","/assets/Input-wbyhaOKr.js","/assets/KhaiThacView-C0BfYWT9.js","/assets/KpiCard-CgWkNDNd.js","/assets/KpiCardConfigModal-CUV2f3NL.js","/assets/LineBotView-Wa0hx5Hi.js","/assets/LoginView-DnHdKykd.js","/assets/MultiSelectDropdown-wHQ0lVVA.js","/assets/NhanVien-BoKdvXkj.js","/assets/PendingApprovalView-CEHq2OWS.js","/assets/PerformanceModal-B4hW5W2S.js","/assets/PhanCaView-CYYjc8a5.css","/assets/PhanCaView-D5e775hy.js","/assets/PriceComparisonView-BauHk5py.js","/assets/SectionCard-DtvvhG9X.js","/assets/SectionHeader-BJG8FId9.js","/assets/Select-BTO1So8g.js","/assets/SettingsView-DC3MEJNz.js","/assets/StickerEventApp-BL8Oj3fJ.js","/assets/StickerPrinterView-DOl01kLZ.js","/assets/SummaryTable-Sp39SDm3.js","/assets/Switch-BBpBw1uR.js","/assets/Tabs-CoDwkSvu.js","/assets/TaxCalculatorView-DxKEht7j.js","/assets/TrendChart-CU_N1_D7.js","/assets/UncollectedOrdersModal-D1DyMPsc.js","/assets/UnconfiguredGroupsModal-CZhtOp-Z.js","/assets/UnshippedOrdersModal-CJPyLFdi.js","/assets/UploadConflictModal-D7OkaHOG.js","/assets/UploadTypeSelectionModal-Uhu801Rk.js","/assets/UserManagementView-Bf1o8jge.js","/assets/analysisEmployeeSyncService-Br_6NoGn.js","/assets/analytics.worker-Bb4EaEVA.js","/assets/analytics.worker-DPngphgu.js","/assets/analytics.worker-D_9AshrL.js","/assets/autoNavigationService-nU7PZJoM.js","/assets/captureEngine-t4odBhyI.js","/assets/chartConfig-C-f7hsgo.js","/assets/checkThuongIframeService-Cv3zUGdl.js","/assets/cloudDataService-Cc1HeiZ9.js","/assets/configStore-jfv_oEyo.js","/assets/dataService-CWoaaxCz.js","/assets/dbService-u8sxR6Vx.js","/assets/firebaseProductConfigService-CSZJsG7l.js","/assets/googleSheetsService-BGBmW1BJ.js","/assets/googleSheetsService-D0LTBUzq.js","/assets/html2canvas.esm-QH1iLAAe.js","/assets/index-BbJu6AQY.js","/assets/index-CPoAWwE2.js","/assets/index-CgJtiJsK.js","/assets/index-Cok6S9gG.js","/assets/index-QiAKJpU1.css","/assets/index.es-VpZoXfjq.js","/assets/jspdf.es.min-CiBKVs1r.js","/assets/khaiThacDb-CcfAnZzF.js","/assets/khoDataService-BuAArXMw.js","/assets/legacyIconNames-B3pkNRMo.js","/assets/moTaBoLoc-B6sNO7U6.js","/assets/presetBi-B23nFey9.js","/assets/salesJsonWriter.worker-BNAYiZX6.js","/assets/salesJsonWriter.worker-iky0iAuj.js","/assets/scheduleHeartbeat.worker-DY9MOOqR.js","/assets/shared-utils-CoyMcgY7.js","/assets/summaryService-DyanjuwY.js","/assets/useBiAutoSync-4S12w_S6.js","/assets/useMultiMonthBonusRun-B5Rc_hBc.js","/assets/vendor-charts-cgUzaFZk.js","/assets/vendor-excel-BGhuli8m.js","/assets/vendor-firebase-BCRBG8gK.js","/assets/vendor-firebase-analytics-BQ3Ho__8.js","/assets/vendor-icons-CmCra2aO.js","/assets/vendor-react-BFsc7Y4G.js","/assets/worker-DwBw6rNm.js","/favicon.svg","/icons/apple-touch-icon-120.png","/icons/apple-touch-icon-152.png","/icons/apple-touch-icon-167.png","/icons/apple-touch-icon-180.png","/icons/icon-192.png","/icons/icon-512.png","/icons/icon-maskable-512.png","/manifest.webmanifest","/prevent-pull-to-refresh.js","/reload-on-chunk-error.js"];
const CORE = ["/assets/index-CPoAWwE2.js","/assets/vendor-react-BFsc7Y4G.js","/assets/shared-utils-CoyMcgY7.js","/assets/vendor-icons-CmCra2aO.js","/assets/vendor-firebase-BCRBG8gK.js","/assets/index-QiAKJpU1.css","/prevent-pull-to-refresh.js","/reload-on-chunk-error.js","/favicon.svg","/manifest.webmanifest"];

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
