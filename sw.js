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
const VERSION = '507200969c35';
const CACHE = 'ycx-shell-' + VERSION;
const PRECACHE = ["/assets/AboutView-CD4z6WCY.js","/assets/AreaAutoExportButton-DK37gzpH.js","/assets/Badge-Zes1F2RM.js","/assets/Banner-Do_KLRp1.js","/assets/BiWrapper-DMR52XUc.css","/assets/BiWrapper-DllgKbwt.js","/assets/ChangelogModal-Mt7hK0t-.js","/assets/CheckThuongView-CGLnUPEW.js","/assets/ConfirmDialog-sWLEHi_c.js","/assets/CouponConverterView-CbT-SkXa.js","/assets/DashboardView-C9xuW6Kf.js","/assets/DataUpdater-C7XVYKD1.js","/assets/EmployeeAnalysis-CVnTuZL_.js","/assets/EmptyState-7BI9sV92.js","/assets/ExportOptionsModal-C1yKwoww.js","/assets/ExternalToolView-YDuwWcGf.js","/assets/FileHistoryModal-TOsTbqBh.js","/assets/FileNamingModal-HRwhukbA.js","/assets/GlobalAutoSyncDock-CwDPRviu.js","/assets/IndustryGrid-Dlgsl0yr.js","/assets/Input-Bt6-QaGc.js","/assets/KhaiThacView-CqIdijOm.js","/assets/KpiCard-SVdphk56.js","/assets/KpiCardConfigModal-Ba2PYWt9.js","/assets/LineBotView-DvIMeIqu.js","/assets/LoginView-Bh5OVSm6.js","/assets/MultiSelectDropdown-DNILBH5J.js","/assets/NhanVien-DB5QXFxx.js","/assets/PendingApprovalView-BlrSo2zZ.js","/assets/PerformanceModal-y8nvkFXO.js","/assets/PhanCaView-CYYjc8a5.css","/assets/PhanCaView-R8WCWTht.js","/assets/PriceComparisonView-B2QrSPTa.js","/assets/SectionCard-DtvvhG9X.js","/assets/SectionHeader-BLSafen_.js","/assets/Select-CkG2RG9J.js","/assets/SettingsView-BjdN5xeS.js","/assets/ShiftWarehouseInputModal-Daep3WpP.js","/assets/StickerEventApp-l-MLRUT8.js","/assets/StickerPrinterView-B1P5mi3v.js","/assets/SummaryTable-ON35_nBr.js","/assets/Switch-COVHeqAw.js","/assets/Tabs-ZqJhT1oQ.js","/assets/TaxCalculatorView-BwFrVKcp.js","/assets/TrendChart-BFf0kZKB.js","/assets/UncollectedOrdersModal-aeRkmGzH.js","/assets/UnconfiguredGroupsModal-wh-Mh6pj.js","/assets/UnshippedOrdersModal-DiJNGYVj.js","/assets/UploadConflictModal-CAvbQOX1.js","/assets/UploadTypeSelectionModal-DgN58qGb.js","/assets/UserManagementView-Dk1VxWu0.js","/assets/analysisEmployeeSyncService-a6J2i0fr.js","/assets/analytics.worker-BfRBJyQG.js","/assets/analytics.worker-CCAy1kzZ.js","/assets/analytics.worker-CxIdJA8C.js","/assets/autoNavigationService-Dugtyi4l.js","/assets/autoReportExportService-XJlVCTdf.js","/assets/captureEngine-B8ti_H1U.js","/assets/chartConfig-C-f7hsgo.js","/assets/checkThuongIframeService-Brb9wJWa.js","/assets/cloudDataService-Bunvrgl3.js","/assets/configStore-jfv_oEyo.js","/assets/dataService-Bgc1LVLB.js","/assets/dataUtils-CxUSnU7u.js","/assets/dbService-C1sA7fSs.js","/assets/firebaseProductConfigService-rCXGVcVi.js","/assets/googleSheetsService-BGBmW1BJ.js","/assets/googleSheetsService-D0LTBUzq.js","/assets/html2canvas.esm-QH1iLAAe.js","/assets/index-B8V6-UCe.css","/assets/index-BbJu6AQY.js","/assets/index-CgJtiJsK.js","/assets/index-CgfUF3Ox.js","/assets/index-Cok6S9gG.js","/assets/index.es-BaM9QZkO.js","/assets/industryColors-NaMQqhES.js","/assets/jspdf.es.min-DbQfX0SI.js","/assets/khaiThacDb-Gl3a4quU.js","/assets/khoDataService-fi5FVQkg.js","/assets/legacyIconNames-Bp56VW2s.js","/assets/lineBot.types-CKoy0woq.js","/assets/moTaBoLoc-B6sNO7U6.js","/assets/presetBi-DgZaXb4Z.js","/assets/salesJsonWriter.worker-BNAYiZX6.js","/assets/salesJsonWriter.worker-iky0iAuj.js","/assets/scheduleHeartbeat.worker-DY9MOOqR.js","/assets/shared-utils-CoyMcgY7.js","/assets/summaryService-C2rsqnBj.js","/assets/useBiAutoSync-B4cH3SWF.js","/assets/useMultiMonthBonusRun-yGTjlMc1.js","/assets/vendor-charts-cgUzaFZk.js","/assets/vendor-excel-BGhuli8m.js","/assets/vendor-firebase-DT1DDorP.js","/assets/vendor-firebase-analytics-DCeAmzTQ.js","/assets/vendor-icons-BWrjb-2y.js","/assets/vendor-react-BFsc7Y4G.js","/assets/worker-C3Ehuode.js","/assets/ycxAutoSyncService--k61RMRm.js","/favicon.svg","/icons/apple-touch-icon-120.png","/icons/apple-touch-icon-152.png","/icons/apple-touch-icon-167.png","/icons/apple-touch-icon-180.png","/icons/icon-192.png","/icons/icon-512.png","/icons/icon-maskable-512.png","/manifest.webmanifest","/prevent-pull-to-refresh.js","/reload-on-chunk-error.js"];
const CORE = ["/assets/index-CgfUF3Ox.js","/assets/vendor-react-BFsc7Y4G.js","/assets/shared-utils-CoyMcgY7.js","/assets/vendor-icons-BWrjb-2y.js","/assets/vendor-firebase-DT1DDorP.js","/assets/index-B8V6-UCe.css","/prevent-pull-to-refresh.js","/reload-on-chunk-error.js","/favicon.svg","/manifest.webmanifest"];

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
