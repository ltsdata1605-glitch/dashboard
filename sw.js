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
const VERSION = 'e062515d616e';
const CACHE = 'ycx-shell-' + VERSION;
const PRECACHE = ["/assets/AboutView-CKMZG-HC.js","/assets/AreaAutoExportButton-DVBegzNQ.js","/assets/Badge-Zes1F2RM.js","/assets/Banner-DE2YEI_u.js","/assets/BiWrapper-B8POQqYN.js","/assets/BiWrapper-DMR52XUc.css","/assets/ChangelogModal-BeLY-3o0.js","/assets/CheckThuongView-CFwjyBI2.js","/assets/ConfirmDialog-C4DUJ4zE.js","/assets/CouponConverterView-WyGK5qL-.js","/assets/DashboardView-IOEeS3jK.js","/assets/DataUpdater-BwFX43B_.js","/assets/EmployeeAnalysis-sTPNKwSm.js","/assets/EmptyState-Cry_v-zt.js","/assets/ExportOptionsModal-BOYJDkom.js","/assets/ExternalToolView-YDuwWcGf.js","/assets/FileHistoryModal-BjiZbMwE.js","/assets/FileNamingModal-UqQGXhi6.js","/assets/GlobalAutoSyncDock-DffojEx2.js","/assets/IndustryGrid-DlwNf89x.js","/assets/Input-Ds3OMgEK.js","/assets/KhaiThacView-m3edLmfr.js","/assets/KpiCard-Cdg4lCVO.js","/assets/KpiCardConfigModal-CddVdMBF.js","/assets/LineBotView-DqDM5IUB.js","/assets/LoginView-CEU9J7ev.js","/assets/MultiSelectDropdown-8WFYkWkB.js","/assets/NhanVien-CmqIJFJj.js","/assets/PendingApprovalView-gQ-boGGj.js","/assets/PerformanceModal-Bk1R6jES.js","/assets/PhanCaView-CYYjc8a5.css","/assets/PhanCaView-DVb1dj7I.js","/assets/PriceComparisonView-CIG5jtP4.js","/assets/SectionCard-DtvvhG9X.js","/assets/SectionHeader-C_HPWX11.js","/assets/Select-CDDKtQsH.js","/assets/SettingsView-C-awJ3_w.js","/assets/ShiftWarehouseInputModal-C9LDoMY7.js","/assets/StickerEventApp-Dffafi9z.js","/assets/StickerPrinterView-CIw0DfXw.js","/assets/SummaryTable-BzRfUI_5.js","/assets/Switch-DI7et8M8.js","/assets/Tabs-DzD7XrWc.js","/assets/TaxCalculatorView-Cw-P72Zr.js","/assets/TrendChart-DaqN6YI7.js","/assets/UncollectedOrdersModal-5Fad6FIs.js","/assets/UnconfiguredGroupsModal-DZoWmi2n.js","/assets/UnshippedOrdersModal-CESjp7Om.js","/assets/UploadConflictModal-Q1mZbW_C.js","/assets/UploadTypeSelectionModal-I8fWnBXT.js","/assets/UserManagementView-CKdplzVs.js","/assets/analysisEmployeeSyncService-CIouWnWr.js","/assets/analytics.worker-BfRBJyQG.js","/assets/analytics.worker-CCAy1kzZ.js","/assets/analytics.worker-CxIdJA8C.js","/assets/autoNavigationService-DKzXBvZP.js","/assets/autoReportExportService-KmNfNKnA.js","/assets/captureEngine-B0NWlFpC.js","/assets/chartConfig-C-f7hsgo.js","/assets/checkThuongIframeService-D4lUW6HA.js","/assets/cloudDataService-Cc_GCqid.js","/assets/configStore-jfv_oEyo.js","/assets/dataService-Dakbxsvr.js","/assets/dataUtils-DARPu_Th.js","/assets/dbService-B1jA_T6I.js","/assets/firebaseProductConfigService-zTGCDQIH.js","/assets/googleSheetsService-BGBmW1BJ.js","/assets/googleSheetsService-D0LTBUzq.js","/assets/html2canvas.esm-QH1iLAAe.js","/assets/index--gluK69H.js","/assets/index-BbJu6AQY.js","/assets/index-CgJtiJsK.js","/assets/index-Cok6S9gG.js","/assets/index-DXm_iRvF.css","/assets/index.es-CvWoeGat.js","/assets/industryColors-NaMQqhES.js","/assets/jspdf.es.min-OnAevLIW.js","/assets/khaiThacDb-BM-0M0US.js","/assets/khoDataService-C-VkIerx.js","/assets/lineBot.types-B_AIUD1s.js","/assets/moTaBoLoc-B6sNO7U6.js","/assets/presetBi-BzDmbYb1.js","/assets/salesJsonWriter.worker-BNAYiZX6.js","/assets/salesJsonWriter.worker-iky0iAuj.js","/assets/scheduleHeartbeat.worker-DY9MOOqR.js","/assets/shared-utils-CoyMcgY7.js","/assets/summaryService-B4FhCgls.js","/assets/useBiAutoSync-EzI5VoCp.js","/assets/useMultiMonthBonusRun-DUbTdSpN.js","/assets/vendor-charts-cgUzaFZk.js","/assets/vendor-excel-BGhuli8m.js","/assets/vendor-firebase-DT1DDorP.js","/assets/vendor-firebase-analytics-DCeAmzTQ.js","/assets/vendor-icons-BWrjb-2y.js","/assets/vendor-react-BFsc7Y4G.js","/assets/worker-C3Ehuode.js","/assets/ycxAutoSyncService--k61RMRm.js","/favicon.svg","/icons/apple-touch-icon-120.png","/icons/apple-touch-icon-152.png","/icons/apple-touch-icon-167.png","/icons/apple-touch-icon-180.png","/icons/icon-192.png","/icons/icon-512.png","/icons/icon-maskable-512.png","/manifest.webmanifest","/prevent-pull-to-refresh.js","/reload-on-chunk-error.js"];
const CORE = ["/assets/index--gluK69H.js","/assets/vendor-react-BFsc7Y4G.js","/assets/shared-utils-CoyMcgY7.js","/assets/vendor-icons-BWrjb-2y.js","/assets/vendor-firebase-DT1DDorP.js","/assets/index-DXm_iRvF.css","/prevent-pull-to-refresh.js","/reload-on-chunk-error.js","/favicon.svg","/manifest.webmanifest"];

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
