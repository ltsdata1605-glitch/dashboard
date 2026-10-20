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
const VERSION = '44893a9bbe9e';
const CACHE = 'ycx-shell-' + VERSION;
const PRECACHE = ["/assets/AboutView-Di9K2w8Z.js","/assets/AreaAutoExportButton-DqZDyhMv.js","/assets/Badge-Zes1F2RM.js","/assets/Banner-CatZ64qI.js","/assets/BiWrapper-DMR52XUc.css","/assets/BiWrapper-DWYRuS7H.js","/assets/ChangelogModal-CA4poShI.js","/assets/CheckThuongView-o9fwnkGJ.js","/assets/Checkbox-BL_Is9tm.js","/assets/ConfirmDialog-CnrZkyKk.js","/assets/CouponConverterView-D7LxulAX.js","/assets/DashboardView-D21b3YQR.js","/assets/DataUpdater-DHSdseDs.js","/assets/EmployeeAnalysis-DbmPbBAa.js","/assets/EmptyState-DOH2_wTm.js","/assets/ExportOptionsModal-z1wdguXm.js","/assets/ExternalToolView-YDuwWcGf.js","/assets/FileHistoryModal-CdzuJCIM.js","/assets/FileNamingModal-oT_3-1iI.js","/assets/GlobalAutoSyncDock-CeOc43YT.js","/assets/IndustryGrid-GAt3NRbk.js","/assets/Input-Byk8x9i-.js","/assets/KhaiThacView-D2GHVKtY.js","/assets/KpiCard-DSKVQ4eY.js","/assets/KpiCardConfigModal-DGml5JZc.js","/assets/LineBotView-DIcRjEBF.js","/assets/LoginView-B0LcsLlZ.js","/assets/MultiSelectDropdown-BE8FX0Gd.js","/assets/NhanVien-CIOaQ9zF.js","/assets/PendingApprovalView-8KAkxZYn.js","/assets/PerformanceModal-BmW38a8V.js","/assets/PhanCaView-CAA0vulx.css","/assets/PhanCaView-DxAdHliO.js","/assets/PriceComparisonView-Do-gSzz5.js","/assets/SectionCard-DtvvhG9X.js","/assets/SectionHeader-BCMXKnnk.js","/assets/Select-Bk6yJgz4.js","/assets/SettingsView-yRPArr4i.js","/assets/ShiftWarehouseInputModal-C9j_EgBG.js","/assets/StickerEventApp-C799g4OE.js","/assets/StickerPrinterView-GXyX4whL.js","/assets/StringMultiSelect-COvyDkpC.js","/assets/SummaryTable-D61qnRqC.js","/assets/Switch-DmbgRu8o.js","/assets/Tabs-Cu6Sct-k.js","/assets/TaxCalculatorView-BISS3fTM.js","/assets/Textarea-Dl-c8nmk.js","/assets/TrendChart-Bvm9Nb1m.js","/assets/UncollectedOrdersModal-BwVTg__J.js","/assets/UnconfiguredGroupsModal-BVV-2OCG.js","/assets/UnshippedOrdersModal-CilMyDo8.js","/assets/UploadConflictModal-J5RukRoa.js","/assets/UploadTypeSelectionModal-C4fByX8P.js","/assets/UserManagementView-C5Qnlqpj.js","/assets/analysisEmployeeSyncService-Ct7EwAyX.js","/assets/analytics.worker-BfRBJyQG.js","/assets/analytics.worker-CCAy1kzZ.js","/assets/analytics.worker-CxIdJA8C.js","/assets/autoNavigationService-BV6hvDjP.js","/assets/autoReportExportService-BcbvVIrs.js","/assets/captureEngine-DwgyeibP.js","/assets/chartConfig-C-f7hsgo.js","/assets/checkThuongIframeService-3DYGaMMZ.js","/assets/cloudDataService-CKbv4moy.js","/assets/configStore-jfv_oEyo.js","/assets/dataService-HlPrpfcm.js","/assets/dataUtils-B7jRw9j0.js","/assets/dbService-Dh_5g6CJ.js","/assets/firebaseProductConfigService-BPBcjaoY.js","/assets/googleSheetsService-BGBmW1BJ.js","/assets/googleSheetsService-D0LTBUzq.js","/assets/html2canvas.esm-QH1iLAAe.js","/assets/index-6z5h_-qu.css","/assets/index-BbJu6AQY.js","/assets/index-CgJtiJsK.js","/assets/index-Cok6S9gG.js","/assets/index-Gp_jIajC.js","/assets/index.es-CjcAkGMG.js","/assets/industryColors-NaMQqhES.js","/assets/jspdf.es.min-Br02PGin.js","/assets/khaiThacDb-UVu9qMa1.js","/assets/khoDataService--2c2UhDK.js","/assets/lineBot.types-BHKhr7Nl.js","/assets/moTaBoLoc-B6sNO7U6.js","/assets/presetBi-DOhrMUDk.js","/assets/salesJsonWriter.worker-BNAYiZX6.js","/assets/salesJsonWriter.worker-iky0iAuj.js","/assets/scheduleHeartbeat.worker-DY9MOOqR.js","/assets/shared-utils-CoyMcgY7.js","/assets/summaryService-B7F7MbCD.js","/assets/useBiAutoSync-DfH5hwMc.js","/assets/useMultiMonthBonusRun-GjGgnTTa.js","/assets/vendor-charts-cgUzaFZk.js","/assets/vendor-excel-BGhuli8m.js","/assets/vendor-firebase-DT1DDorP.js","/assets/vendor-firebase-analytics-DCeAmzTQ.js","/assets/vendor-icons-BWrjb-2y.js","/assets/vendor-react-BFsc7Y4G.js","/assets/worker-C3Ehuode.js","/assets/ycxAutoSyncService--k61RMRm.js","/favicon.svg","/icons/apple-touch-icon-120.png","/icons/apple-touch-icon-152.png","/icons/apple-touch-icon-167.png","/icons/apple-touch-icon-180.png","/icons/icon-192.png","/icons/icon-512.png","/icons/icon-maskable-512.png","/manifest.webmanifest","/prevent-pull-to-refresh.js","/reload-on-chunk-error.js"];
const CORE = ["/assets/index-Gp_jIajC.js","/assets/vendor-react-BFsc7Y4G.js","/assets/shared-utils-CoyMcgY7.js","/assets/vendor-icons-BWrjb-2y.js","/assets/vendor-firebase-DT1DDorP.js","/assets/index-6z5h_-qu.css","/prevent-pull-to-refresh.js","/reload-on-chunk-error.js","/favicon.svg","/manifest.webmanifest"];

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
