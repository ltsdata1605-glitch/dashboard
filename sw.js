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
const VERSION = 'afdb247f6b64';
const CACHE = 'ycx-shell-' + VERSION;
const PRECACHE = ["/assets/AboutView-CAEUtwhi.js","/assets/Badge-Zes1F2RM.js","/assets/BiWrapper-BL2OLMls.css","/assets/BiWrapper-Ci3oRB_U.js","/assets/ChangelogModal-GprBIGC5.js","/assets/CheckThuongView-DDTql8lp.js","/assets/ConfirmDialog-Gb864oZN.js","/assets/CouponConverterView-BUTl1tqT.js","/assets/DashboardView-qgfB-F-7.js","/assets/DataUpdater-CDmLqfdy.js","/assets/EmployeeAnalysis-CD586C1Q.js","/assets/ExportOptionsModal-BDKtWug9.js","/assets/ExternalToolView-YDuwWcGf.js","/assets/FileHistoryModal-CuW7DTi1.js","/assets/FileNamingModal-dAALHZvk.js","/assets/FontSelector-pE16OwEw.js","/assets/GlobalAutoSyncDock-Dr8132f5.js","/assets/IndustryGrid-BQTsQb3Q.js","/assets/Input-CsSbiJqp.js","/assets/KhaiThacView-B00Lccqv.js","/assets/KpiCard-DOxDMsEe.js","/assets/KpiCardConfigModal-C4YpBhFQ.js","/assets/LineBotView-BvlKKdkk.js","/assets/LoginView-BCKfQCbF.js","/assets/MultiSelectDropdown-tMVUCX_D.js","/assets/NhanVien-BaZN_s-j.js","/assets/PendingApprovalView-DNCwRFJM.js","/assets/PerformanceModal--uVJ1d9A.js","/assets/PhanCaView-CYYjc8a5.css","/assets/PhanCaView-ISH1ZHck.js","/assets/PivotTable-AYqsv9bR.js","/assets/PriceComparisonView-DIklsBqZ.js","/assets/SectionCard-s_uS1jA_.js","/assets/SectionHeader-DSJx5mI4.js","/assets/Select-CiPEqhQp.js","/assets/SettingsView-Cc1Miw2f.js","/assets/StickerEventApp-DfU9zRUb.js","/assets/StickerPrinterView-CUKYxd3x.js","/assets/SummaryTable-CMjaWVoG.js","/assets/SummaryTableUtils-CUAK7EFs.js","/assets/Tabs-BKdeaJDQ.js","/assets/TaxCalculatorView-9JNNob8H.js","/assets/TrendChart-C9ThC-TY.js","/assets/UncollectedOrdersModal-MLbu6ZVs.js","/assets/UnconfiguredGroupsModal-CRjWkrdu.js","/assets/UnshippedOrdersModal-CFQtQyhf.js","/assets/UploadConflictModal-DievJQUp.js","/assets/UploadTypeSelectionModal-D16ubEkE.js","/assets/UserManagementView-ZhaJrB5Z.js","/assets/analysisEmployeeSyncService-CSL0fk7B.js","/assets/analytics.worker-CNAQL-46.js","/assets/analytics.worker-DPngphgu.js","/assets/analytics.worker-D_9AshrL.js","/assets/autoNavigationService-CVAZgi86.js","/assets/captureEngine-DK5pBuBi.js","/assets/chartConfig-C-f7hsgo.js","/assets/checkThuongIframeService-D9vR3K0m.js","/assets/cloudDataService-DpBgb2Pj.js","/assets/configStore-jfv_oEyo.js","/assets/dataService-CrpA4quW.js","/assets/dbService-ggUS8XL1.js","/assets/firebaseProductConfigService-DsJXhOli.js","/assets/googleSheetsService-BGBmW1BJ.js","/assets/googleSheetsService-D0LTBUzq.js","/assets/html2canvas.esm-QH1iLAAe.js","/assets/index-BbJu6AQY.js","/assets/index-COzklSe8.css","/assets/index-CgJtiJsK.js","/assets/index-Cok6S9gG.js","/assets/index-DfvwsfGo.js","/assets/index.es-MxYNnlZ6.js","/assets/jspdf.es.min-Vrtd4vSJ.js","/assets/khaiThacDb-DBnbzakK.js","/assets/khoDataService-0qrv-uF7.js","/assets/legacyIconNames-CNZxbHUb.js","/assets/presetBi-Q75QTFFT.js","/assets/salesJsonWriter.worker-BNAYiZX6.js","/assets/salesJsonWriter.worker-iky0iAuj.js","/assets/scheduleHeartbeat.worker-DY9MOOqR.js","/assets/shared-utils-CoyMcgY7.js","/assets/summaryService-DSxG6jWf.js","/assets/useBiAutoSync-7_exaYD7.js","/assets/useMultiMonthBonusRun-KxE-FcUs.js","/assets/vendor-charts-cgUzaFZk.js","/assets/vendor-excel-BGhuli8m.js","/assets/vendor-firebase-BiSu6BVL.js","/assets/vendor-firebase-analytics-C0xQhZhm.js","/assets/vendor-icons-CmCra2aO.js","/assets/vendor-motion-CeUOfB9r.js","/assets/vendor-react-BFsc7Y4G.js","/assets/worker-DwBw6rNm.js","/favicon.svg","/icons/apple-touch-icon-120.png","/icons/apple-touch-icon-152.png","/icons/apple-touch-icon-167.png","/icons/apple-touch-icon-180.png","/icons/icon-192.png","/icons/icon-512.png","/icons/icon-maskable-512.png","/manifest.webmanifest","/prevent-pull-to-refresh.js","/reload-on-chunk-error.js"];
const CORE = ["/assets/index-DfvwsfGo.js","/assets/vendor-react-BFsc7Y4G.js","/assets/shared-utils-CoyMcgY7.js","/assets/vendor-icons-CmCra2aO.js","/assets/vendor-firebase-BiSu6BVL.js","/assets/vendor-motion-CeUOfB9r.js","/assets/index-COzklSe8.css","/prevent-pull-to-refresh.js","/reload-on-chunk-error.js","/favicon.svg","/manifest.webmanifest"];

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
