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
const VERSION = 'e98bcb154016';
const CACHE = 'ycx-shell-' + VERSION;
const PRECACHE = ["/assets/AboutView-DdI0kGLk.js","/assets/Badge-Zes1F2RM.js","/assets/Banner-Bpx83paF.js","/assets/BiWrapper-BL2OLMls.css","/assets/BiWrapper-D_WJRrIq.js","/assets/ChangelogModal-4pyc48Tg.js","/assets/CheckThuongView-wVCzERIE.js","/assets/ConfirmDialog-Cku0nULU.js","/assets/CouponConverterView-B0qQyQTI.js","/assets/DashboardView-BsGVHPYM.js","/assets/DataUpdater-DL-p7AO9.js","/assets/EmployeeAnalysis-DWXontLY.js","/assets/EmptyState-CLNXFE3B.js","/assets/ExportOptionsModal-BlIGkL3s.js","/assets/ExternalToolView-YDuwWcGf.js","/assets/FeatureLandingLayout-Dr8tMxzY.js","/assets/FileHistoryModal-311eYqGd.js","/assets/FileNamingModal-DUFwyA3F.js","/assets/GlobalAutoSyncDock-T-ydeP8I.js","/assets/IndustryGrid-CYUw1Lal.js","/assets/Input-bVZOmqvm.js","/assets/KhaiThacView-Debpta2E.js","/assets/KpiCard-BE3eeC9L.js","/assets/KpiCardConfigModal-CQX7Vawd.js","/assets/LineBotView-C2i9waOA.js","/assets/LoginView-6iIynui_.js","/assets/MultiSelectDropdown-a8zvjFQz.js","/assets/NhanVien-G9TzkfS6.js","/assets/PendingApprovalView-CUxjIL-T.js","/assets/PerformanceModal-CZOTgzcK.js","/assets/PhanCaView-CYYjc8a5.css","/assets/PhanCaView-DF_quoM1.js","/assets/PriceComparisonView-B3QS2UWY.js","/assets/SectionCard-DtvvhG9X.js","/assets/SectionHeader-CN7s8ZTG.js","/assets/Select-DMuc3PHv.js","/assets/SettingsView-DA_tqJJt.js","/assets/StickerEventApp-CrZkmNVZ.js","/assets/StickerPrinterView-CU6PpSaG.js","/assets/SummaryTable-DXtdtNb-.js","/assets/Switch-CGHlKwJA.js","/assets/Tabs-tAI71Ros.js","/assets/TaxCalculatorView-C5m_KTfA.js","/assets/TrendChart-ENxmddA4.js","/assets/UncollectedOrdersModal-DV6avrQB.js","/assets/UnconfiguredGroupsModal-DE22bb0c.js","/assets/UnshippedOrdersModal-BWAjxG4x.js","/assets/UploadConflictModal-BHtYlZvd.js","/assets/UploadTypeSelectionModal-CMc0zO_d.js","/assets/UserManagementView-Ds2cw7kJ.js","/assets/analysisEmployeeSyncService-DCH_6vVY.js","/assets/analytics.worker-Bb4EaEVA.js","/assets/analytics.worker-DPngphgu.js","/assets/analytics.worker-D_9AshrL.js","/assets/autoNavigationService-DEE97VRo.js","/assets/captureEngine-D6DkUPBe.js","/assets/chartConfig-C-f7hsgo.js","/assets/checkThuongIframeService-CNT54Knn.js","/assets/cloudDataService-WLLE1l-w.js","/assets/configStore-jfv_oEyo.js","/assets/dataService-DSjtEa7Q.js","/assets/dbService-BpNCtIxO.js","/assets/firebaseProductConfigService-BiDeEP_X.js","/assets/googleSheetsService-BGBmW1BJ.js","/assets/googleSheetsService-D0LTBUzq.js","/assets/html2canvas.esm-QH1iLAAe.js","/assets/index-B9pxQmnB.js","/assets/index-BbJu6AQY.js","/assets/index-CgJtiJsK.js","/assets/index-Cok6S9gG.js","/assets/index-UKrQc9bp.css","/assets/index.es-CdURTILn.js","/assets/jspdf.es.min-B0uBitSH.js","/assets/khaiThacDb-BDqZkbPh.js","/assets/khoDataService-ZI__nzex.js","/assets/legacyIconNames-Dzxw2nl1.js","/assets/moTaBoLoc-B6sNO7U6.js","/assets/presetBi-Dqxrd9-E.js","/assets/salesJsonWriter.worker-BNAYiZX6.js","/assets/salesJsonWriter.worker-iky0iAuj.js","/assets/scheduleHeartbeat.worker-DY9MOOqR.js","/assets/shared-utils-CoyMcgY7.js","/assets/summaryService-DK2GrMru.js","/assets/useBiAutoSync-CPYxi8gP.js","/assets/useMultiMonthBonusRun-CcxYCOJs.js","/assets/vendor-charts-cgUzaFZk.js","/assets/vendor-excel-BGhuli8m.js","/assets/vendor-firebase-DNnqQYvo.js","/assets/vendor-firebase-analytics-DNdKLinw.js","/assets/vendor-icons-CmCra2aO.js","/assets/vendor-react-BFsc7Y4G.js","/assets/worker-DwBw6rNm.js","/favicon.svg","/icons/apple-touch-icon-120.png","/icons/apple-touch-icon-152.png","/icons/apple-touch-icon-167.png","/icons/apple-touch-icon-180.png","/icons/icon-192.png","/icons/icon-512.png","/icons/icon-maskable-512.png","/manifest.webmanifest","/prevent-pull-to-refresh.js","/reload-on-chunk-error.js"];
const CORE = ["/assets/index-B9pxQmnB.js","/assets/vendor-react-BFsc7Y4G.js","/assets/shared-utils-CoyMcgY7.js","/assets/vendor-icons-CmCra2aO.js","/assets/vendor-firebase-DNnqQYvo.js","/assets/index-UKrQc9bp.css","/prevent-pull-to-refresh.js","/reload-on-chunk-error.js","/favicon.svg","/manifest.webmanifest"];

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
