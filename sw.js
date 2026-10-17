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
const VERSION = '7d9d81cbacfb';
const CACHE = 'ycx-shell-' + VERSION;
const PRECACHE = ["/assets/AboutView-BDGahBAO.js","/assets/AreaAutoExportButton-DtNrfARq.js","/assets/Badge-Zes1F2RM.js","/assets/Banner-BnnwYF83.js","/assets/BiWrapper-CS2RnTjU.css","/assets/BiWrapper-tE-DvjUh.js","/assets/ChangelogModal-DgHU6rsf.js","/assets/CheckThuongView-BYuZAmR_.js","/assets/ConfirmDialog-CuNjwVYA.js","/assets/CouponConverterView-k5pMYZhR.js","/assets/DashboardView-CWKXCn8i.js","/assets/DataUpdater-CJa_aobN.js","/assets/EmployeeAnalysis-b1_8bibA.js","/assets/EmptyState-CeAoazeN.js","/assets/ExportOptionsModal-C1U7O_-m.js","/assets/ExternalToolView-YDuwWcGf.js","/assets/FileHistoryModal-BaGN25aq.js","/assets/FileNamingModal-8iJ1GQUB.js","/assets/GlobalAutoSyncDock-Cg0I1pc7.js","/assets/IndustryGrid-CNi56J1I.js","/assets/Input-BCmCpJ4x.js","/assets/KhaiThacView-CqUyqm33.js","/assets/KpiCard-Co6B_VND.js","/assets/KpiCardConfigModal-BEehPE4O.js","/assets/LineBotView-DZPLj_3E.js","/assets/LoginView-EJo4e30O.js","/assets/MultiSelectDropdown-C6M_hHG9.js","/assets/NhanVien-DyiroWmN.js","/assets/PendingApprovalView-BhquOo2E.js","/assets/PerformanceModal-CYk0gSBZ.js","/assets/PhanCaView-CYYjc8a5.css","/assets/PhanCaView-MzjIMHzb.js","/assets/PriceComparisonView-CFOgFFH7.js","/assets/SectionCard-DtvvhG9X.js","/assets/SectionHeader-DQWtkYX6.js","/assets/Select-EfvwjBAO.js","/assets/SettingsView-BJUC9kel.js","/assets/ShiftWarehouseInputModal-XVZcCIPt.js","/assets/StickerEventApp-DiAyQI3F.js","/assets/StickerPrinterView-DkH0qjrJ.js","/assets/SummaryTable-DCZHHxdr.js","/assets/Switch-7nHtOGPM.js","/assets/Tabs-XPBzHc3G.js","/assets/TaxCalculatorView-ChGvHSjO.js","/assets/TrendChart-BNilRhZ0.js","/assets/UncollectedOrdersModal-Bp4jv3_J.js","/assets/UnconfiguredGroupsModal-OhIHLp0d.js","/assets/UnshippedOrdersModal-Um2YNiUm.js","/assets/UploadConflictModal-B15qeS02.js","/assets/UploadTypeSelectionModal-DBefW2yu.js","/assets/UserManagementView-CnOCXHb5.js","/assets/analysisEmployeeSyncService-D_6Zy9a2.js","/assets/analytics.worker-BfRBJyQG.js","/assets/analytics.worker-BjPVtrPX.js","/assets/analytics.worker-CCAy1kzZ.js","/assets/autoNavigationService-C9LILTI9.js","/assets/autoReportExportService-CZFvsXxE.js","/assets/captureEngine-CW355M2A.js","/assets/chartConfig-C-f7hsgo.js","/assets/checkThuongIframeService-Db4fw1jS.js","/assets/cloudDataService-DFK8iy3z.js","/assets/configStore-jfv_oEyo.js","/assets/dataService-BnaHEvqZ.js","/assets/dataUtils-Dc1r0EAF.js","/assets/dbService-DlpfyP88.js","/assets/firebaseProductConfigService-Dezij1d9.js","/assets/googleSheetsService-BGBmW1BJ.js","/assets/googleSheetsService-D0LTBUzq.js","/assets/html2canvas.esm-QH1iLAAe.js","/assets/index-BbJu6AQY.js","/assets/index-CgJtiJsK.js","/assets/index-Cok6S9gG.js","/assets/index-DPSpkCVf.css","/assets/index-DQ0gGQxG.js","/assets/index.es-1-eg5Swg.js","/assets/industryColors-NaMQqhES.js","/assets/jspdf.es.min-CL65P-m3.js","/assets/khaiThacDb-BgET62hZ.js","/assets/khoDataService-BNZSMEBW.js","/assets/legacyIconNames-BBh90R9M.js","/assets/lineBot.types-DmIPGnIQ.js","/assets/moTaBoLoc-B6sNO7U6.js","/assets/presetBi-C9v37Wu3.js","/assets/salesJsonWriter.worker-BNAYiZX6.js","/assets/salesJsonWriter.worker-iky0iAuj.js","/assets/scheduleHeartbeat.worker-DY9MOOqR.js","/assets/shared-utils-CoyMcgY7.js","/assets/summaryService-DMQXa-uF.js","/assets/useBiAutoSync--2jilgTc.js","/assets/useMultiMonthBonusRun-14qe1pgc.js","/assets/vendor-charts-cgUzaFZk.js","/assets/vendor-excel-BGhuli8m.js","/assets/vendor-firebase-DT1DDorP.js","/assets/vendor-firebase-analytics-DCeAmzTQ.js","/assets/vendor-icons-CmCra2aO.js","/assets/vendor-react-BFsc7Y4G.js","/assets/worker-C3Ehuode.js","/assets/ycxAutoSyncService--k61RMRm.js","/favicon.svg","/icons/apple-touch-icon-120.png","/icons/apple-touch-icon-152.png","/icons/apple-touch-icon-167.png","/icons/apple-touch-icon-180.png","/icons/icon-192.png","/icons/icon-512.png","/icons/icon-maskable-512.png","/manifest.webmanifest","/prevent-pull-to-refresh.js","/reload-on-chunk-error.js"];
const CORE = ["/assets/index-DQ0gGQxG.js","/assets/vendor-react-BFsc7Y4G.js","/assets/shared-utils-CoyMcgY7.js","/assets/vendor-icons-CmCra2aO.js","/assets/vendor-firebase-DT1DDorP.js","/assets/index-DPSpkCVf.css","/prevent-pull-to-refresh.js","/reload-on-chunk-error.js","/favicon.svg","/manifest.webmanifest"];

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
