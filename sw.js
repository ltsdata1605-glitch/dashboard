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
const VERSION = '6b9af3fcbfd8';
const CACHE = 'ycx-shell-' + VERSION;
const PRECACHE = ["/assets/AboutView-BWKnNm96.js","/assets/AreaAutoExportButton-Dwr-_EUK.js","/assets/Badge-Zes1F2RM.js","/assets/Banner-BWE6h6PY.js","/assets/BiWrapper-DMR52XUc.css","/assets/BiWrapper-y4ADfrbx.js","/assets/ChangelogModal-ORFuogWH.js","/assets/CheckThuongView-CAf6fbUE.js","/assets/ConfirmDialog-DQeD24Fe.js","/assets/CouponConverterView-BhNTh4l1.js","/assets/DashboardView-CHBGisJn.js","/assets/DataUpdater-C3dfbnFL.js","/assets/EmployeeAnalysis-1GXIS8xY.js","/assets/EmptyState-BK3qI3pA.js","/assets/ExportOptionsModal-BaO717Gx.js","/assets/ExternalToolView-YDuwWcGf.js","/assets/FileHistoryModal-D6P1SBLL.js","/assets/FileNamingModal-BMrc89Kx.js","/assets/GlobalAutoSyncDock-2hK_3Fjf.js","/assets/IndustryGrid-BIueMNOc.js","/assets/Input-BybV0xvd.js","/assets/KhaiThacView-BtIiVt34.js","/assets/KpiCard-C8nmCBpa.js","/assets/KpiCardConfigModal-VsMEM8zB.js","/assets/LineBotView-Dl1Es_ko.js","/assets/LoginView-BKa92HQ2.js","/assets/MultiSelectDropdown-DTscbi-_.js","/assets/NhanVien-DKA7TjNa.js","/assets/PendingApprovalView-CC_1sbfq.js","/assets/PerformanceModal-ClLlN3im.js","/assets/PhanCaView-CYYjc8a5.css","/assets/PhanCaView-DPOEVt9I.js","/assets/PriceComparisonView-CRU_-rVi.js","/assets/SectionCard-DtvvhG9X.js","/assets/SectionHeader-CHxQhuXh.js","/assets/Select-Bis3HPs_.js","/assets/SettingsView-COem-kWA.js","/assets/ShiftWarehouseInputModal-B-7TlvAN.js","/assets/StickerEventApp-C3kRrQc3.js","/assets/StickerPrinterView-BVNSsxoF.js","/assets/SummaryTable--kMQH-7p.js","/assets/Switch-B1-yKPt-.js","/assets/Tabs-CRIIDgUg.js","/assets/TaxCalculatorView-CWfn4haF.js","/assets/TrendChart-C5m1Vz12.js","/assets/UncollectedOrdersModal-Cc9cyigx.js","/assets/UnconfiguredGroupsModal-n04hlTFo.js","/assets/UnshippedOrdersModal-CerNFP8w.js","/assets/UploadConflictModal-DbETG7mP.js","/assets/UploadTypeSelectionModal-DedF-zYe.js","/assets/UserManagementView-uKFzLRe6.js","/assets/analysisEmployeeSyncService-u89pEpVC.js","/assets/analytics.worker-BfRBJyQG.js","/assets/analytics.worker-CCAy1kzZ.js","/assets/analytics.worker-CxIdJA8C.js","/assets/autoNavigationService-idmWv7SN.js","/assets/autoReportExportService-CGfFKPKa.js","/assets/captureEngine-DXRcpHE1.js","/assets/chartConfig-C-f7hsgo.js","/assets/checkThuongIframeService-XG_TFWty.js","/assets/cloudDataService-Dha4BuGU.js","/assets/configStore-jfv_oEyo.js","/assets/dataService-D1lcmnWX.js","/assets/dataUtils-Dpb8H5IL.js","/assets/dbService-JmmO90PU.js","/assets/firebaseProductConfigService-DwGIkLJo.js","/assets/googleSheetsService-BGBmW1BJ.js","/assets/googleSheetsService-D0LTBUzq.js","/assets/html2canvas.esm-QH1iLAAe.js","/assets/index-B8V6-UCe.css","/assets/index-BbJu6AQY.js","/assets/index-CgJtiJsK.js","/assets/index-Cok6S9gG.js","/assets/index-DlgEkBPX.js","/assets/index.es-V_edJh-V.js","/assets/industryColors-NaMQqhES.js","/assets/jspdf.es.min-g3dh67d_.js","/assets/khaiThacDb-DpF3Uatg.js","/assets/khoDataService-bSzVckxx.js","/assets/legacyIconNames-Br5-oreC.js","/assets/lineBot.types-Cg2nzxvW.js","/assets/moTaBoLoc-B6sNO7U6.js","/assets/presetBi-C4Yn7u-L.js","/assets/salesJsonWriter.worker-BNAYiZX6.js","/assets/salesJsonWriter.worker-iky0iAuj.js","/assets/scheduleHeartbeat.worker-DY9MOOqR.js","/assets/shared-utils-CoyMcgY7.js","/assets/summaryService-DJRJKguo.js","/assets/useBiAutoSync-CzwxQFDV.js","/assets/useMultiMonthBonusRun-BBoGHj-Z.js","/assets/vendor-charts-cgUzaFZk.js","/assets/vendor-excel-BGhuli8m.js","/assets/vendor-firebase-DT1DDorP.js","/assets/vendor-firebase-analytics-DCeAmzTQ.js","/assets/vendor-icons-BWrjb-2y.js","/assets/vendor-react-BFsc7Y4G.js","/assets/worker-C3Ehuode.js","/assets/ycxAutoSyncService--k61RMRm.js","/favicon.svg","/icons/apple-touch-icon-120.png","/icons/apple-touch-icon-152.png","/icons/apple-touch-icon-167.png","/icons/apple-touch-icon-180.png","/icons/icon-192.png","/icons/icon-512.png","/icons/icon-maskable-512.png","/manifest.webmanifest","/prevent-pull-to-refresh.js","/reload-on-chunk-error.js"];
const CORE = ["/assets/index-DlgEkBPX.js","/assets/vendor-react-BFsc7Y4G.js","/assets/shared-utils-CoyMcgY7.js","/assets/vendor-icons-BWrjb-2y.js","/assets/vendor-firebase-DT1DDorP.js","/assets/index-B8V6-UCe.css","/prevent-pull-to-refresh.js","/reload-on-chunk-error.js","/favicon.svg","/manifest.webmanifest"];

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
