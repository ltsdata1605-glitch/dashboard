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
const VERSION = '75fcd1d7cdf6';
const CACHE = 'ycx-shell-' + VERSION;
const PRECACHE = ["/assets/AboutView-DoM0Ci8q.js","/assets/Badge-Zes1F2RM.js","/assets/BiWrapper-34AqOHG7.js","/assets/BiWrapper-BL2OLMls.css","/assets/ChangelogModal-DmsnszXe.js","/assets/CheckThuongView-CJVYFqZ0.js","/assets/ConfirmDialog-C8Lmnzvh.js","/assets/CouponConverterView-CCFpzucY.js","/assets/DashboardView-Ct9LJudj.js","/assets/DataUpdater-DIbDKl3o.js","/assets/EmployeeAnalysis-CCtxebvy.js","/assets/ExportOptionsModal-C5jQPnat.js","/assets/ExternalToolView-YDuwWcGf.js","/assets/FileHistoryModal-DfFNrszn.js","/assets/FileNamingModal-m_r0VVcO.js","/assets/FontSelector-XEMoKp89.js","/assets/GlobalAutoSyncDock-pa1RxXh2.js","/assets/IndustryGrid-Cz4K-PyR.js","/assets/Input-CjXyR6GY.js","/assets/KhaiThacView-BViS12zr.js","/assets/KpiCard-C-G6PS-Q.js","/assets/KpiCardConfigModal-532DaCAr.js","/assets/LineBotView-CSUlU-N-.js","/assets/LoginView-BV1HmzWf.js","/assets/MultiSelectDropdown-911KSBuA.js","/assets/NhanVien-Dlyz0svn.js","/assets/PendingApprovalView-BdtpcBJ_.js","/assets/PerformanceModal-CA8Incfb.js","/assets/PhanCaView-CYYjc8a5.css","/assets/PhanCaView-QP_Bo2VC.js","/assets/PivotTable-DJiZek2I.js","/assets/PriceComparisonView-BTP5NAUy.js","/assets/SectionCard-s_uS1jA_.js","/assets/SectionHeader-7jzQjHNy.js","/assets/Select-xyeNPXFL.js","/assets/SettingsView-C3wQ4-Qq.js","/assets/StickerEventApp-D1tiz13v.js","/assets/StickerPrinterView-BkmfE8XU.js","/assets/SummaryTable-DyXvcCnZ.js","/assets/SummaryTableUtils-CUAK7EFs.js","/assets/Tabs-BorwoR2W.js","/assets/TaxCalculatorView-DbAJmHBF.js","/assets/TrendChart-CI1o5Ax9.js","/assets/UncollectedOrdersModal-C0eJ1MTA.js","/assets/UnconfiguredGroupsModal-CXgtWTnN.js","/assets/UnshippedOrdersModal-EGUMVUl3.js","/assets/UploadConflictModal-C9X5GS1w.js","/assets/UploadTypeSelectionModal-RadSJpN8.js","/assets/UserManagementView-CzkTEGpF.js","/assets/analysisEmployeeSyncService-DsMBO4HJ.js","/assets/analytics.worker-CNAQL-46.js","/assets/analytics.worker-DPngphgu.js","/assets/analytics.worker-D_9AshrL.js","/assets/autoNavigationService-Cldzjec_.js","/assets/captureEngine-CtmohPeo.js","/assets/chartConfig-C-f7hsgo.js","/assets/checkThuongIframeService-BNi6tHmi.js","/assets/cloudDataService-DlSg-mG9.js","/assets/configStore-jfv_oEyo.js","/assets/dataService-BxL9TN84.js","/assets/dbService-B1zCMzOo.js","/assets/firebaseProductConfigService-Dr1F-9wZ.js","/assets/googleSheetsService-BGBmW1BJ.js","/assets/googleSheetsService-D0LTBUzq.js","/assets/html2canvas.esm-QH1iLAAe.js","/assets/index-BbJu6AQY.js","/assets/index-CAAfa8EL.js","/assets/index-Cbc8rBBL.css","/assets/index-CgJtiJsK.js","/assets/index-Cok6S9gG.js","/assets/index.es-Dh0ggSq0.js","/assets/jspdf.es.min-C9lYz3t9.js","/assets/khaiThacDb-E7Bjd18_.js","/assets/khoDataService-CcbvgBBt.js","/assets/legacyIconNames-BY_miyc2.js","/assets/presetBi-DCugpVDL.js","/assets/salesJsonWriter.worker-BNAYiZX6.js","/assets/salesJsonWriter.worker-iky0iAuj.js","/assets/scheduleHeartbeat.worker-DY9MOOqR.js","/assets/shared-utils-CoyMcgY7.js","/assets/summaryService-0nMMQUHN.js","/assets/useBiAutoSync-CwQE5jnM.js","/assets/useMultiMonthBonusRun-CiUmfYsh.js","/assets/vendor-charts-cgUzaFZk.js","/assets/vendor-excel-BGhuli8m.js","/assets/vendor-firebase-BiSu6BVL.js","/assets/vendor-firebase-analytics-C0xQhZhm.js","/assets/vendor-icons-CmCra2aO.js","/assets/vendor-motion-CeUOfB9r.js","/assets/vendor-react-BFsc7Y4G.js","/assets/worker-DwBw6rNm.js","/favicon.svg","/icons/apple-touch-icon-120.png","/icons/apple-touch-icon-152.png","/icons/apple-touch-icon-167.png","/icons/apple-touch-icon-180.png","/icons/icon-192.png","/icons/icon-512.png","/icons/icon-maskable-512.png","/manifest.webmanifest","/prevent-pull-to-refresh.js","/reload-on-chunk-error.js"];
const CORE = ["/assets/index-CAAfa8EL.js","/assets/vendor-react-BFsc7Y4G.js","/assets/shared-utils-CoyMcgY7.js","/assets/vendor-icons-CmCra2aO.js","/assets/vendor-firebase-BiSu6BVL.js","/assets/vendor-motion-CeUOfB9r.js","/assets/index-Cbc8rBBL.css","/prevent-pull-to-refresh.js","/reload-on-chunk-error.js","/favicon.svg","/manifest.webmanifest"];

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
