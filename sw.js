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
const VERSION = '8a78c2003953';
const CACHE = 'ycx-shell-' + VERSION;
const PRECACHE = ["/assets/AboutView-BW4673v3.js","/assets/AreaAutoExportButton-wgqrF6n7.js","/assets/Badge-Zes1F2RM.js","/assets/Banner-Du0QGRGX.js","/assets/BiWrapper-BulZ5l8Y.js","/assets/BiWrapper-CS2RnTjU.css","/assets/ChangelogModal-FPXi2CEk.js","/assets/CheckThuongView-DrGLcdy2.js","/assets/ConfirmDialog-CUi32lwl.js","/assets/CouponConverterView-QK7W2_N0.js","/assets/DashboardView-BUOzAqxL.js","/assets/DataUpdater-DxeQEcjk.js","/assets/EmployeeAnalysis-DtLNffhg.js","/assets/EmptyState-CnvBPvs6.js","/assets/ExportOptionsModal-DmAu85Wd.js","/assets/ExternalToolView-YDuwWcGf.js","/assets/FileHistoryModal-Cf5nBycL.js","/assets/FileNamingModal-CTebKAtZ.js","/assets/GlobalAutoSyncDock-CBRYs7_Z.js","/assets/IndustryGrid-CLqZbgZk.js","/assets/Input-nOXmL5xN.js","/assets/KhaiThacView-BnnTDIGl.js","/assets/KpiCard-CFCD2Fb-.js","/assets/KpiCardConfigModal-DxL9RX8M.js","/assets/LineBotView-Dm9VthE9.js","/assets/LoginView-BzfQyCAd.js","/assets/MultiSelectDropdown-BzWf_JPz.js","/assets/NhanVien-NFHc-in5.js","/assets/PendingApprovalView-CkD6PlC4.js","/assets/PerformanceModal-CpJrmfKR.js","/assets/PhanCaView-CYYjc8a5.css","/assets/PhanCaView-itB78QCd.js","/assets/PriceComparisonView-DMUbEkNx.js","/assets/SectionCard-DtvvhG9X.js","/assets/SectionHeader-Bd1XQ7Cs.js","/assets/Select-DAUhS83H.js","/assets/SettingsView-CWf8F7fI.js","/assets/ShiftWarehouseInputModal-cth9zCse.js","/assets/StickerEventApp-Cq2eqHiw.js","/assets/StickerPrinterView-Ck_6ajX4.js","/assets/SummaryTable-B6MAZXvB.js","/assets/Switch-B4YDVfIU.js","/assets/Tabs-izC43J0m.js","/assets/TaxCalculatorView-B0sYP_81.js","/assets/TrendChart-B5g-AjHn.js","/assets/UncollectedOrdersModal-Df2xz51N.js","/assets/UnconfiguredGroupsModal-DizZwU9m.js","/assets/UnshippedOrdersModal-Bq8mX1ob.js","/assets/UploadConflictModal-DPvQy3kj.js","/assets/UploadTypeSelectionModal-D3AElOms.js","/assets/UserManagementView-D6hjXCLD.js","/assets/analysisEmployeeSyncService-BxAKHeXx.js","/assets/analytics.worker-BfRBJyQG.js","/assets/analytics.worker-BjPVtrPX.js","/assets/analytics.worker-CCAy1kzZ.js","/assets/autoNavigationService-DnvRr9v7.js","/assets/autoReportExportService-D1GNSbF1.js","/assets/captureEngine-Do8mMdkr.js","/assets/chartConfig-C-f7hsgo.js","/assets/checkThuongIframeService-DarJdLND.js","/assets/cloudDataService-D3VYDcE0.js","/assets/configStore-jfv_oEyo.js","/assets/dataService-8Hz7Natj.js","/assets/dataUtils-CQRP-UKL.js","/assets/dbService-C7CgvxCZ.js","/assets/firebaseProductConfigService-C-vYn4aa.js","/assets/googleSheetsService-BGBmW1BJ.js","/assets/googleSheetsService-D0LTBUzq.js","/assets/html2canvas.esm-QH1iLAAe.js","/assets/index-BW7mgYeH.css","/assets/index-BbJu6AQY.js","/assets/index-Bsmpax6A.js","/assets/index-CgJtiJsK.js","/assets/index-Cok6S9gG.js","/assets/index.es-CmkHpK7K.js","/assets/industryColors-NaMQqhES.js","/assets/jspdf.es.min-B-0_jwFO.js","/assets/khaiThacDb-Teh_zA1B.js","/assets/khoDataService-3fltjErw.js","/assets/legacyIconNames-E8oAe_OI.js","/assets/lineBot.types-hMk3MSAj.js","/assets/moTaBoLoc-B6sNO7U6.js","/assets/presetBi-Ds7N685W.js","/assets/salesJsonWriter.worker-BNAYiZX6.js","/assets/salesJsonWriter.worker-iky0iAuj.js","/assets/scheduleHeartbeat.worker-DY9MOOqR.js","/assets/shared-utils-CoyMcgY7.js","/assets/summaryService-DVm85uO2.js","/assets/useBiAutoSync-5lJ6v6iM.js","/assets/useMultiMonthBonusRun-DPiIHKbs.js","/assets/vendor-charts-cgUzaFZk.js","/assets/vendor-excel-BGhuli8m.js","/assets/vendor-firebase-DT1DDorP.js","/assets/vendor-firebase-analytics-DCeAmzTQ.js","/assets/vendor-icons-CmCra2aO.js","/assets/vendor-react-BFsc7Y4G.js","/assets/worker-C3Ehuode.js","/assets/ycxAutoSyncService--k61RMRm.js","/favicon.svg","/icons/apple-touch-icon-120.png","/icons/apple-touch-icon-152.png","/icons/apple-touch-icon-167.png","/icons/apple-touch-icon-180.png","/icons/icon-192.png","/icons/icon-512.png","/icons/icon-maskable-512.png","/manifest.webmanifest","/prevent-pull-to-refresh.js","/reload-on-chunk-error.js"];
const CORE = ["/assets/index-Bsmpax6A.js","/assets/vendor-react-BFsc7Y4G.js","/assets/shared-utils-CoyMcgY7.js","/assets/vendor-icons-CmCra2aO.js","/assets/vendor-firebase-DT1DDorP.js","/assets/index-BW7mgYeH.css","/prevent-pull-to-refresh.js","/reload-on-chunk-error.js","/favicon.svg","/manifest.webmanifest"];

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
