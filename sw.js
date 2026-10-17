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
const VERSION = '3dd2f44b3c19';
const CACHE = 'ycx-shell-' + VERSION;
const PRECACHE = ["/assets/AboutView-Ds9EoofF.js","/assets/AreaAutoExportButton-mpOuUHG3.js","/assets/Badge-Zes1F2RM.js","/assets/Banner-CynMWkFd.js","/assets/BiWrapper-CS2RnTjU.css","/assets/BiWrapper-Dq8ySiSJ.js","/assets/ChangelogModal-C8gviHfh.js","/assets/CheckThuongView-JDHrZdTr.js","/assets/ConfirmDialog-CHD1N03B.js","/assets/CouponConverterView-B15Ct83e.js","/assets/DashboardView-Dm-60aPs.js","/assets/DataUpdater-mVj_uGgc.js","/assets/EmployeeAnalysis-gTxpy7S0.js","/assets/EmptyState-DdLQF3gK.js","/assets/ExportOptionsModal-D6Kj5MEH.js","/assets/ExternalToolView-YDuwWcGf.js","/assets/FileHistoryModal-B1nEDiZW.js","/assets/FileNamingModal-Cfy6Y7R5.js","/assets/GlobalAutoSyncDock-CqFAfjOC.js","/assets/IndustryGrid-LVWrfTSR.js","/assets/Input-Cx8M0ih3.js","/assets/KhaiThacView-DezXFNOn.js","/assets/KpiCard-B5K-neMt.js","/assets/KpiCardConfigModal-BtT5C4x6.js","/assets/LineBotView-DcUKhMr5.js","/assets/LoginView-BnFb1bE4.js","/assets/MultiSelectDropdown-Cd5aEU-Z.js","/assets/NhanVien-D2E0khzn.js","/assets/PendingApprovalView-BWkUnqDU.js","/assets/PerformanceModal-1g1vr7JZ.js","/assets/PhanCaView-B2_VNfFq.js","/assets/PhanCaView-CYYjc8a5.css","/assets/PriceComparisonView-C6BZFjhw.js","/assets/SectionCard-DtvvhG9X.js","/assets/SectionHeader-CoFcpUNk.js","/assets/Select-BPToIev1.js","/assets/SettingsView-BHODtyiT.js","/assets/ShiftWarehouseInputModal-3jySDXUs.js","/assets/StickerEventApp-BWIgzCZQ.js","/assets/StickerPrinterView-CszZ4B4h.js","/assets/SummaryTable-DEgExBx-.js","/assets/Switch-NjiXM704.js","/assets/Tabs-DcZ6oOYB.js","/assets/TaxCalculatorView-CJYs_bwG.js","/assets/TrendChart-D0XwPnQ5.js","/assets/UncollectedOrdersModal-Bey4obkq.js","/assets/UnconfiguredGroupsModal-Ch9pZwE9.js","/assets/UnshippedOrdersModal-OrQYO02L.js","/assets/UploadConflictModal-6hieQ894.js","/assets/UploadTypeSelectionModal-C5JsdR9f.js","/assets/UserManagementView-4er5QRoH.js","/assets/analysisEmployeeSyncService-Dm4MftPO.js","/assets/analytics.worker-BfRBJyQG.js","/assets/analytics.worker-BjPVtrPX.js","/assets/analytics.worker-CCAy1kzZ.js","/assets/autoNavigationService-B2LGvWF1.js","/assets/autoReportExportService-gdrGyOb9.js","/assets/captureEngine-C0Q6pyyE.js","/assets/chartConfig-C-f7hsgo.js","/assets/checkThuongIframeService-oNMm7QVD.js","/assets/cloudDataService-CyWyxrPM.js","/assets/configStore-jfv_oEyo.js","/assets/dataService-CjUnQ4OT.js","/assets/dataUtils-CBOTmRlE.js","/assets/dbService-DTx4kwk4.js","/assets/firebaseProductConfigService-Cb-VI8gQ.js","/assets/googleSheetsService-BGBmW1BJ.js","/assets/googleSheetsService-D0LTBUzq.js","/assets/html2canvas.esm-QH1iLAAe.js","/assets/index-BbJu6AQY.js","/assets/index-CgJtiJsK.js","/assets/index-Cok6S9gG.js","/assets/index-gCUPyQq0.js","/assets/index-ygQTFOh4.css","/assets/index.es-C9L2t25r.js","/assets/industryColors-NaMQqhES.js","/assets/jspdf.es.min-BRpcTdF9.js","/assets/khaiThacDb-CE1NVkFm.js","/assets/khoDataService-DV4SYU3M.js","/assets/legacyIconNames-J8rIa_UY.js","/assets/lineBot.types-BRqTyork.js","/assets/moTaBoLoc-B6sNO7U6.js","/assets/presetBi-BRm6XcDO.js","/assets/salesJsonWriter.worker-BNAYiZX6.js","/assets/salesJsonWriter.worker-iky0iAuj.js","/assets/scheduleHeartbeat.worker-DY9MOOqR.js","/assets/shared-utils-CoyMcgY7.js","/assets/summaryService-D9mZcGPq.js","/assets/useBiAutoSync-DX42LgPb.js","/assets/useMultiMonthBonusRun-ChNjvZa2.js","/assets/vendor-charts-cgUzaFZk.js","/assets/vendor-excel-BGhuli8m.js","/assets/vendor-firebase-DT1DDorP.js","/assets/vendor-firebase-analytics-DCeAmzTQ.js","/assets/vendor-icons-CmCra2aO.js","/assets/vendor-react-BFsc7Y4G.js","/assets/worker-C3Ehuode.js","/assets/ycxAutoSyncService--k61RMRm.js","/favicon.svg","/icons/apple-touch-icon-120.png","/icons/apple-touch-icon-152.png","/icons/apple-touch-icon-167.png","/icons/apple-touch-icon-180.png","/icons/icon-192.png","/icons/icon-512.png","/icons/icon-maskable-512.png","/manifest.webmanifest","/prevent-pull-to-refresh.js","/reload-on-chunk-error.js"];
const CORE = ["/assets/index-gCUPyQq0.js","/assets/vendor-react-BFsc7Y4G.js","/assets/shared-utils-CoyMcgY7.js","/assets/vendor-icons-CmCra2aO.js","/assets/vendor-firebase-DT1DDorP.js","/assets/index-ygQTFOh4.css","/prevent-pull-to-refresh.js","/reload-on-chunk-error.js","/favicon.svg","/manifest.webmanifest"];

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
