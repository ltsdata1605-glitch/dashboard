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
const VERSION = 'cd4444b75b33';
const CACHE = 'ycx-shell-' + VERSION;
const PRECACHE = ["/assets/AboutView-DuSdKo-b.js","/assets/Badge-Zes1F2RM.js","/assets/Banner-kLaTWLiO.js","/assets/BiWrapper-BeXqlqpn.js","/assets/BiWrapper-HPb32kft.css","/assets/ChangelogModal-Cda5dnBj.js","/assets/CheckThuongView-B-caTaIc.js","/assets/ConfirmDialog-C6Sbdn_o.js","/assets/CouponConverterView-D063Wyar.js","/assets/DashboardView-xCZ3FgPU.js","/assets/DataUpdater-R9wgXMoX.js","/assets/EmployeeAnalysis-NrS3I1vg.js","/assets/EmptyState-DxKsQxcs.js","/assets/ExportOptionsModal-DPX-gBbv.js","/assets/ExternalToolView-YDuwWcGf.js","/assets/FeatureLandingLayout-DVaPcTh2.js","/assets/FileHistoryModal-DhaqcE1B.js","/assets/FileNamingModal-CSj71cUx.js","/assets/GlobalAutoSyncDock-DYLPOflV.js","/assets/IndustryGrid-Ck8ShXIS.js","/assets/Input-BSDes0Ma.js","/assets/KhaiThacView-CDbWKZW8.js","/assets/KpiCard-Ds9d5ExP.js","/assets/KpiCardConfigModal-BmU2fFvJ.js","/assets/LineBotView-DlLyN3Vg.js","/assets/LoginView-DLoCQb3Z.js","/assets/MultiSelectDropdown-3836DWSR.js","/assets/NhanVien-CJy1kWTW.js","/assets/PendingApprovalView-D_Uipuuk.js","/assets/PerformanceModal-qtx91AZr.js","/assets/PhanCaView-CYYjc8a5.css","/assets/PhanCaView-oDwtHbYI.js","/assets/PriceComparisonView-Ba70PEGp.js","/assets/SectionCard-DtvvhG9X.js","/assets/SectionHeader-DkS1ihYS.js","/assets/Select-DZs6fiRX.js","/assets/SettingsView-Dv8RGiSJ.js","/assets/StickerEventApp-CFnLky3u.js","/assets/StickerPrinterView-yWHJUz0j.js","/assets/SummaryTable-DMBzeF_U.js","/assets/Switch-7NcKAFOB.js","/assets/Tabs-8CVJBG5J.js","/assets/TaxCalculatorView-Ci-cTRXH.js","/assets/TrendChart-CQC8-1Ks.js","/assets/UncollectedOrdersModal-rPQTJyyW.js","/assets/UnconfiguredGroupsModal-BDgiRYKO.js","/assets/UnshippedOrdersModal-DjqTuK1A.js","/assets/UploadConflictModal-CxhRJYRw.js","/assets/UploadTypeSelectionModal-F8yFd5cC.js","/assets/UserManagementView-rBb1g6Eh.js","/assets/analysisEmployeeSyncService-BxNsjFCu.js","/assets/analytics.worker-BfRBJyQG.js","/assets/analytics.worker-BjPVtrPX.js","/assets/analytics.worker-CCAy1kzZ.js","/assets/autoNavigationService-DH3xQhjP.js","/assets/captureEngine-5SZ44kTL.js","/assets/chartConfig-C-f7hsgo.js","/assets/checkThuongIframeService-CSxglpmt.js","/assets/cloudDataService-BhOBfa8X.js","/assets/configStore-jfv_oEyo.js","/assets/dataService-B92ydJfn.js","/assets/dataUtils-ClR6cq6G.js","/assets/dbService-elB2QDZ6.js","/assets/firebaseProductConfigService-4oO7HUdM.js","/assets/googleSheetsService-BGBmW1BJ.js","/assets/googleSheetsService-D0LTBUzq.js","/assets/html2canvas.esm-QH1iLAAe.js","/assets/index-BbJu6AQY.js","/assets/index-CgJtiJsK.js","/assets/index-Cok6S9gG.js","/assets/index-CrcV3DOS.css","/assets/index-Dev9UKh6.js","/assets/index.es-BRdUcU7f.js","/assets/industryColors-NaMQqhES.js","/assets/jspdf.es.min-s_132xyA.js","/assets/khaiThacDb-eqyrx4cE.js","/assets/khoDataService-DFs2SnT2.js","/assets/legacyIconNames-Ce_iagmS.js","/assets/moTaBoLoc-B6sNO7U6.js","/assets/presetBi-CmoHAZmP.js","/assets/salesJsonWriter.worker-BNAYiZX6.js","/assets/salesJsonWriter.worker-iky0iAuj.js","/assets/scheduleHeartbeat.worker-DY9MOOqR.js","/assets/shared-utils-CoyMcgY7.js","/assets/summaryService-D_RmMNLz.js","/assets/useBiAutoSync-B3D0vHrK.js","/assets/useMultiMonthBonusRun-DswGpMUZ.js","/assets/vendor-charts-cgUzaFZk.js","/assets/vendor-excel-BGhuli8m.js","/assets/vendor-firebase-DNnqQYvo.js","/assets/vendor-firebase-analytics-DNdKLinw.js","/assets/vendor-icons-CmCra2aO.js","/assets/vendor-react-BFsc7Y4G.js","/assets/worker-C3Ehuode.js","/assets/ycxAutoSyncService--k61RMRm.js","/favicon.svg","/icons/apple-touch-icon-120.png","/icons/apple-touch-icon-152.png","/icons/apple-touch-icon-167.png","/icons/apple-touch-icon-180.png","/icons/icon-192.png","/icons/icon-512.png","/icons/icon-maskable-512.png","/manifest.webmanifest","/prevent-pull-to-refresh.js","/reload-on-chunk-error.js"];
const CORE = ["/assets/index-Dev9UKh6.js","/assets/vendor-react-BFsc7Y4G.js","/assets/shared-utils-CoyMcgY7.js","/assets/vendor-icons-CmCra2aO.js","/assets/vendor-firebase-DNnqQYvo.js","/assets/index-CrcV3DOS.css","/prevent-pull-to-refresh.js","/reload-on-chunk-error.js","/favicon.svg","/manifest.webmanifest"];

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
