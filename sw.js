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
const VERSION = 'c9fcaec9dd0f';
const CACHE = 'ycx-shell-' + VERSION;
const PRECACHE = ["/assets/AboutView-BeD5Blpy.js","/assets/Badge-Zes1F2RM.js","/assets/Banner-BQ7ZzTNk.js","/assets/BiWrapper-BL2OLMls.css","/assets/BiWrapper-CKf4rm6Z.js","/assets/ChangelogModal-wHA3wxtg.js","/assets/CheckThuongView-rUHMSJ3H.js","/assets/ConfirmDialog-Ac79fuD5.js","/assets/CouponConverterView-DXEpBtjV.js","/assets/DashboardView-B-JiCOAo.js","/assets/DataUpdater-BhCrpEba.js","/assets/EmployeeAnalysis-ChAFLpEU.js","/assets/EmptyState-BzAOQqwt.js","/assets/ExportOptionsModal-Dgv7LIwQ.js","/assets/ExternalToolView-YDuwWcGf.js","/assets/FeatureLandingLayout-BOp6srdR.js","/assets/FileHistoryModal-B7t0fe8E.js","/assets/FileNamingModal-Bhrp3f-Y.js","/assets/GlobalAutoSyncDock-CDEbh_c3.js","/assets/IndustryGrid-COwBZw_7.js","/assets/Input-DnZ2Ydwv.js","/assets/KhaiThacView-Cq5m4lnM.js","/assets/KpiCard-C-DqAzYR.js","/assets/KpiCardConfigModal-CMUfXf39.js","/assets/LineBotView-BjeUJL8I.js","/assets/LoginView-CzBXYrCa.js","/assets/MultiSelectDropdown-DEsBzzlM.js","/assets/NhanVien-IPhKTqOi.js","/assets/PendingApprovalView-DQIOq59y.js","/assets/PerformanceModal-DM9YpYmu.js","/assets/PhanCaView-CY7vJnsC.js","/assets/PhanCaView-CYYjc8a5.css","/assets/PriceComparisonView-CrF5sK7q.js","/assets/SectionCard-DtvvhG9X.js","/assets/SectionHeader-HqQQ2zMz.js","/assets/Select-ZQjqFErL.js","/assets/SettingsView-BKnO9-FO.js","/assets/StickerEventApp-DAUAjBsI.js","/assets/StickerPrinterView-BFgREfTS.js","/assets/SummaryTable-CQyVc3O2.js","/assets/Switch-Byp40V6I.js","/assets/Tabs-BH6cw6Pk.js","/assets/TaxCalculatorView-DE8Vi7w3.js","/assets/TrendChart-BXZBQMA2.js","/assets/UncollectedOrdersModal-D97CFrhT.js","/assets/UnconfiguredGroupsModal-A45vNErW.js","/assets/UnshippedOrdersModal-Cs1U2qF8.js","/assets/UploadConflictModal-Cs9Za8l0.js","/assets/UploadTypeSelectionModal-C5TjHico.js","/assets/UserManagementView-BC20j8uR.js","/assets/analysisEmployeeSyncService-BfxQn0sM.js","/assets/analytics.worker-Bb4EaEVA.js","/assets/analytics.worker-DPngphgu.js","/assets/analytics.worker-D_9AshrL.js","/assets/autoNavigationService-D9ao-kFL.js","/assets/captureEngine-0GEL8Vyj.js","/assets/chartConfig-C-f7hsgo.js","/assets/checkThuongIframeService-22RgNMHJ.js","/assets/cloudDataService-hd2WwR_F.js","/assets/configStore-jfv_oEyo.js","/assets/dataService-Ct3I8V3l.js","/assets/dbService-DLvGNp3u.js","/assets/firebaseProductConfigService-C5TqnYxH.js","/assets/googleSheetsService-BGBmW1BJ.js","/assets/googleSheetsService-D0LTBUzq.js","/assets/html2canvas.esm-QH1iLAAe.js","/assets/index-BbJu6AQY.js","/assets/index-CgJtiJsK.js","/assets/index-Cok6S9gG.js","/assets/index-CqlRYqij.js","/assets/index-DpoN80_N.css","/assets/index.es-D-WaRtgf.js","/assets/jspdf.es.min-aj87BEJ6.js","/assets/khaiThacDb-CTsBfG25.js","/assets/khoDataService-Wn5VA0be.js","/assets/legacyIconNames-Bzq0lYX7.js","/assets/moTaBoLoc-B6sNO7U6.js","/assets/presetBi-ClAcccfk.js","/assets/salesJsonWriter.worker-BNAYiZX6.js","/assets/salesJsonWriter.worker-iky0iAuj.js","/assets/scheduleHeartbeat.worker-DY9MOOqR.js","/assets/shared-utils-CoyMcgY7.js","/assets/summaryService-CP35Wt07.js","/assets/useBiAutoSync-BGpoU_rO.js","/assets/useMultiMonthBonusRun-Da0jzXFX.js","/assets/vendor-charts-cgUzaFZk.js","/assets/vendor-excel-BGhuli8m.js","/assets/vendor-firebase-BCRBG8gK.js","/assets/vendor-firebase-analytics-BQ3Ho__8.js","/assets/vendor-icons-CmCra2aO.js","/assets/vendor-react-BFsc7Y4G.js","/assets/worker-DwBw6rNm.js","/favicon.svg","/icons/apple-touch-icon-120.png","/icons/apple-touch-icon-152.png","/icons/apple-touch-icon-167.png","/icons/apple-touch-icon-180.png","/icons/icon-192.png","/icons/icon-512.png","/icons/icon-maskable-512.png","/manifest.webmanifest","/prevent-pull-to-refresh.js","/reload-on-chunk-error.js"];
const CORE = ["/assets/index-CqlRYqij.js","/assets/vendor-react-BFsc7Y4G.js","/assets/shared-utils-CoyMcgY7.js","/assets/vendor-icons-CmCra2aO.js","/assets/vendor-firebase-BCRBG8gK.js","/assets/index-DpoN80_N.css","/prevent-pull-to-refresh.js","/reload-on-chunk-error.js","/favicon.svg","/manifest.webmanifest"];

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
