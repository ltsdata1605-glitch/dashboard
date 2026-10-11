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
const VERSION = 'e1bd7b385ef4';
const CACHE = 'ycx-shell-' + VERSION;
const PRECACHE = ["/assets/AboutView-BiGTQRzI.js","/assets/Badge-Zes1F2RM.js","/assets/BiWrapper-BL2OLMls.css","/assets/BiWrapper-D5XQ8_g_.js","/assets/ChangelogModal-BRk62K3f.js","/assets/CheckThuongView-Dkvm5_OF.js","/assets/ConfirmDialog-C7KfY5-K.js","/assets/CouponConverterView-Brmm4xwz.js","/assets/DashboardView-BMJz4inH.js","/assets/DataUpdater-DsgZPJ7I.js","/assets/EmployeeAnalysis-DdaeYkix.js","/assets/ExportOptionsModal-BEI5Nbya.js","/assets/ExternalToolView-YDuwWcGf.js","/assets/FileHistoryModal-mUPWH3Se.js","/assets/FileNamingModal-DjDO_5eE.js","/assets/FontSelector-D-IW3muj.js","/assets/GlobalAutoSyncDock-A6zxQmIm.js","/assets/IndustryGrid-D4wNxumm.js","/assets/Input-TO0_Z8Yo.js","/assets/KhaiThacView-B4Ww-WBe.js","/assets/KpiCard-D2AXO9er.js","/assets/KpiCardConfigModal-Dl6JCcMo.js","/assets/LineBotView-gvo9NWtm.js","/assets/LoginView-DEuUNnYP.js","/assets/MultiSelectDropdown-B8Ypzm8n.js","/assets/NhanVien-CvzZ2bw_.js","/assets/PendingApprovalView-Z4D743_K.js","/assets/PerformanceModal-SAJj7xZI.js","/assets/PhanCaView-CYYjc8a5.css","/assets/PhanCaView-DcXtwpxr.js","/assets/PivotTable-CVChrkP1.js","/assets/PriceComparisonView-C0HuPFFa.js","/assets/SectionCard-s_uS1jA_.js","/assets/SectionHeader-xJ09AbLY.js","/assets/Select-DM5wK_XB.js","/assets/SettingsView-DjjyaglS.js","/assets/StickerEventApp-BH_BEKeg.js","/assets/StickerPrinterView-De6-0TSo.js","/assets/SummaryTable-CPEgWNJ7.js","/assets/SummaryTableUtils-CUAK7EFs.js","/assets/Tabs-cK7mx1j_.js","/assets/TaxCalculatorView-ltHIriiy.js","/assets/TrendChart-z313DmZs.js","/assets/UncollectedOrdersModal-DDqMD210.js","/assets/UnconfiguredGroupsModal-KJsRVfKx.js","/assets/UnshippedOrdersModal-PJ9Y0dDW.js","/assets/UploadConflictModal-BWfsCH_e.js","/assets/UploadTypeSelectionModal-Oha960Be.js","/assets/UserManagementView-BmIk-ku1.js","/assets/analysisEmployeeSyncService-DN5zZ_a1.js","/assets/analytics.worker-CNAQL-46.js","/assets/analytics.worker-DPngphgu.js","/assets/analytics.worker-D_9AshrL.js","/assets/autoNavigationService-Bn5CTdSX.js","/assets/captureEngine-HK-xsjoc.js","/assets/chartConfig-C-f7hsgo.js","/assets/checkThuongIframeService-DnCMuKo0.js","/assets/cloudDataService-Dkwb4rs4.js","/assets/configStore-jfv_oEyo.js","/assets/dataService-Ch5CfPHx.js","/assets/dbService-Dsziced2.js","/assets/firebaseProductConfigService-OzbfM6F5.js","/assets/googleSheetsService-BGBmW1BJ.js","/assets/googleSheetsService-D0LTBUzq.js","/assets/html2canvas.esm-QH1iLAAe.js","/assets/index-B3Yd6WfW.css","/assets/index-BXIvGiKe.js","/assets/index-BbJu6AQY.js","/assets/index-CgJtiJsK.js","/assets/index-Cok6S9gG.js","/assets/index.es-DApX8pqv.js","/assets/jspdf.es.min-B-jkkMjO.js","/assets/khaiThacDb-BAVB1GAY.js","/assets/khoDataService-XDqRAKW4.js","/assets/legacyIconNames-CboK7XzH.js","/assets/presetBi-DvX6Z-YY.js","/assets/salesJsonWriter.worker-BNAYiZX6.js","/assets/salesJsonWriter.worker-iky0iAuj.js","/assets/scheduleHeartbeat.worker-DY9MOOqR.js","/assets/shared-utils-CoyMcgY7.js","/assets/summaryService-Bx_X-eox.js","/assets/useBiAutoSync-XWmau8p0.js","/assets/useMultiMonthBonusRun-CH_WTyT2.js","/assets/vendor-charts-cgUzaFZk.js","/assets/vendor-excel-BGhuli8m.js","/assets/vendor-firebase-BiSu6BVL.js","/assets/vendor-firebase-analytics-C0xQhZhm.js","/assets/vendor-icons-CmCra2aO.js","/assets/vendor-motion-CeUOfB9r.js","/assets/vendor-react-BFsc7Y4G.js","/assets/worker-DwBw6rNm.js","/favicon.svg","/icons/apple-touch-icon-120.png","/icons/apple-touch-icon-152.png","/icons/apple-touch-icon-167.png","/icons/apple-touch-icon-180.png","/icons/icon-192.png","/icons/icon-512.png","/icons/icon-maskable-512.png","/manifest.webmanifest","/prevent-pull-to-refresh.js","/reload-on-chunk-error.js"];
const CORE = ["/assets/index-BXIvGiKe.js","/assets/vendor-react-BFsc7Y4G.js","/assets/shared-utils-CoyMcgY7.js","/assets/vendor-icons-CmCra2aO.js","/assets/vendor-firebase-BiSu6BVL.js","/assets/vendor-motion-CeUOfB9r.js","/assets/index-B3Yd6WfW.css","/prevent-pull-to-refresh.js","/reload-on-chunk-error.js","/favicon.svg","/manifest.webmanifest"];

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
