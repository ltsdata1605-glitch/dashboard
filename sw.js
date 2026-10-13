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
const VERSION = 'a787e590c29a';
const CACHE = 'ycx-shell-' + VERSION;
const PRECACHE = ["/assets/AboutView-CX4KDeZj.js","/assets/Badge-Zes1F2RM.js","/assets/Banner-q7gsO67J.js","/assets/BiWrapper-BL2OLMls.css","/assets/BiWrapper-t6SYKKfY.js","/assets/ChangelogModal-CZFXx-p8.js","/assets/CheckThuongView-TFPt2qfv.js","/assets/ConfirmDialog-DE7ybp1m.js","/assets/CouponConverterView-C918KlIT.js","/assets/DashboardView-SRL5yXRL.js","/assets/DataUpdater-BXMp1PCu.js","/assets/EmployeeAnalysis-Ht_f3pw2.js","/assets/EmptyState-CdvxZMR_.js","/assets/ExportOptionsModal-D2ZZVNn4.js","/assets/ExternalToolView-YDuwWcGf.js","/assets/FeatureLandingLayout-Dix62092.js","/assets/FileHistoryModal-Cz3ZsfJJ.js","/assets/FileNamingModal-CQ4l2HAp.js","/assets/GlobalAutoSyncDock-B2A-kqNn.js","/assets/IndustryGrid-D_e70-GM.js","/assets/Input-BYblK402.js","/assets/KhaiThacView-DE_MslLa.js","/assets/KpiCard-PoMmMM_g.js","/assets/KpiCardConfigModal-CdL2-EEu.js","/assets/LineBotView-DmiCjGr6.js","/assets/LoginView-CmaCBeL-.js","/assets/MultiSelectDropdown-BGZ6SZz5.js","/assets/NhanVien-BoxXTsi7.js","/assets/PendingApprovalView-BW0f4X8_.js","/assets/PerformanceModal-DG7-zCR8.js","/assets/PhanCaView-CYYjc8a5.css","/assets/PhanCaView-OZM3YDEy.js","/assets/PriceComparisonView-BhfoLyHU.js","/assets/SectionCard-DtvvhG9X.js","/assets/SectionHeader-BgYsWx0m.js","/assets/Select-Dcgr3j1e.js","/assets/SettingsView-CBuiSQIB.js","/assets/StickerEventApp-CLAc-EqZ.js","/assets/StickerPrinterView-Jdu6xkaF.js","/assets/SummaryTable-DsowpNlg.js","/assets/Switch-C4GPLNEk.js","/assets/Tabs-BrlPmks0.js","/assets/TaxCalculatorView-bd64bZHV.js","/assets/TrendChart-B8jmnEAr.js","/assets/UncollectedOrdersModal-BkWMUXFV.js","/assets/UnconfiguredGroupsModal-BNUrGr-s.js","/assets/UnshippedOrdersModal-TUg77-tL.js","/assets/UploadConflictModal-z-g4n7cB.js","/assets/UploadTypeSelectionModal-CnuJea8-.js","/assets/UserManagementView-DzgUiwdJ.js","/assets/analysisEmployeeSyncService-p-_dJG-C.js","/assets/analytics.worker-Bb4EaEVA.js","/assets/analytics.worker-DPngphgu.js","/assets/analytics.worker-D_9AshrL.js","/assets/autoNavigationService-x7Iv5VkQ.js","/assets/captureEngine-DeX--MFn.js","/assets/chartConfig-C-f7hsgo.js","/assets/checkThuongIframeService-DG24XW-o.js","/assets/cloudDataService-C1Ms0NPH.js","/assets/configStore-jfv_oEyo.js","/assets/dataService-uSY8ps1D.js","/assets/dbService-3ZFvd6xL.js","/assets/firebaseProductConfigService-DYOr092Y.js","/assets/googleSheetsService-BGBmW1BJ.js","/assets/googleSheetsService-D0LTBUzq.js","/assets/html2canvas.esm-QH1iLAAe.js","/assets/index-BbJu6AQY.js","/assets/index-CgJtiJsK.js","/assets/index-Cok6S9gG.js","/assets/index-DMn6rqnW.css","/assets/index-DPk3IB3N.js","/assets/index.es-6Gp5bAgE.js","/assets/jspdf.es.min-6TVlStme.js","/assets/khaiThacDb-CyQsushQ.js","/assets/khoDataService-D8XRc-u7.js","/assets/legacyIconNames-X1yzB5Y-.js","/assets/moTaBoLoc-B6sNO7U6.js","/assets/presetBi-Huf6Bafd.js","/assets/salesJsonWriter.worker-BNAYiZX6.js","/assets/salesJsonWriter.worker-iky0iAuj.js","/assets/scheduleHeartbeat.worker-DY9MOOqR.js","/assets/shared-utils-CoyMcgY7.js","/assets/summaryService-CT8eSxoZ.js","/assets/useBiAutoSync-KeP030XN.js","/assets/useMultiMonthBonusRun-BDK-HZaJ.js","/assets/vendor-charts-cgUzaFZk.js","/assets/vendor-excel-BGhuli8m.js","/assets/vendor-firebase-3-fLfe-e.js","/assets/vendor-firebase-analytics-DRDPsqOb.js","/assets/vendor-icons-CmCra2aO.js","/assets/vendor-react-BFsc7Y4G.js","/assets/worker-DwBw6rNm.js","/favicon.svg","/icons/apple-touch-icon-120.png","/icons/apple-touch-icon-152.png","/icons/apple-touch-icon-167.png","/icons/apple-touch-icon-180.png","/icons/icon-192.png","/icons/icon-512.png","/icons/icon-maskable-512.png","/manifest.webmanifest","/prevent-pull-to-refresh.js","/reload-on-chunk-error.js"];
const CORE = ["/assets/index-DPk3IB3N.js","/assets/vendor-react-BFsc7Y4G.js","/assets/shared-utils-CoyMcgY7.js","/assets/vendor-icons-CmCra2aO.js","/assets/vendor-firebase-3-fLfe-e.js","/assets/index-DMn6rqnW.css","/prevent-pull-to-refresh.js","/reload-on-chunk-error.js","/favicon.svg","/manifest.webmanifest"];

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
