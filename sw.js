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
const VERSION = '6fe4e273f706';
const CACHE = 'ycx-shell-' + VERSION;
const PRECACHE = ["/assets/AboutView-BGbTPNMb.js","/assets/Badge-Zes1F2RM.js","/assets/Banner-B9B2NdLA.js","/assets/BiWrapper-CS2RnTjU.css","/assets/BiWrapper-DmCFskW-.js","/assets/ChangelogModal-B1zCddVp.js","/assets/CheckThuongView-DGHq8-no.js","/assets/ConfirmDialog-C5Jl9apW.js","/assets/CouponConverterView-CwMKMuGi.js","/assets/DashboardView-CIVj8EVQ.js","/assets/DataUpdater-DCZ29qYL.js","/assets/EmployeeAnalysis-BbNkQ2jA.js","/assets/EmptyState-Dx1tZNVf.js","/assets/ExportOptionsModal-D3BEHKLx.js","/assets/ExternalToolView-YDuwWcGf.js","/assets/FeatureLandingLayout-DpmeymPw.js","/assets/FileHistoryModal-DeBjF47p.js","/assets/FileNamingModal-iA8ueU_7.js","/assets/GlobalAutoSyncDock-DMZxflBz.js","/assets/IndustryGrid-DK5xoXoE.js","/assets/Input-82-eVkxi.js","/assets/KhaiThacView-Bw2j4BEU.js","/assets/KpiCard-DS8UKsVN.js","/assets/KpiCardConfigModal-C_j9SgGh.js","/assets/LineBotView-DXgKAYOW.js","/assets/LoginView-DKCB1OX6.js","/assets/MultiSelectDropdown-CaT2gXk1.js","/assets/NhanVien-CJsPHfRx.js","/assets/PendingApprovalView-FCD9epfJ.js","/assets/PerformanceModal-B38LBM2T.js","/assets/PhanCaView-CYYjc8a5.css","/assets/PhanCaView-eg7TEsML.js","/assets/PriceComparisonView-Dx2Kox1y.js","/assets/SectionCard-DtvvhG9X.js","/assets/SectionHeader-Cj0MnUIk.js","/assets/Select-BdOKlJoi.js","/assets/SettingsView-DFpxmFEd.js","/assets/ShiftWarehouseInputModal-CY7yLUa2.js","/assets/StickerEventApp-Cr8r-Dvp.js","/assets/StickerPrinterView-CcieL1J3.js","/assets/SummaryTable-CjsKBwMd.js","/assets/Switch-CgR0UYFB.js","/assets/Tabs-_EyMT_UA.js","/assets/TaxCalculatorView-4v2ErhHJ.js","/assets/TrendChart-Clv38CzO.js","/assets/UncollectedOrdersModal-YO2sZHk2.js","/assets/UnconfiguredGroupsModal-0wYUg2is.js","/assets/UnshippedOrdersModal-Bpj8dkQQ.js","/assets/UploadConflictModal-XVZ-DWL-.js","/assets/UploadTypeSelectionModal-T2wxrG-j.js","/assets/UserManagementView-BPd2heYV.js","/assets/analysisEmployeeSyncService-zDJiA7C-.js","/assets/analytics.worker-BfRBJyQG.js","/assets/analytics.worker-BjPVtrPX.js","/assets/analytics.worker-CCAy1kzZ.js","/assets/autoNavigationService-DdbQXUrR.js","/assets/autoReportExportService-CPMSLYE8.js","/assets/captureEngine-wjYfL5Lj.js","/assets/chartConfig-C-f7hsgo.js","/assets/checkThuongIframeService-BnRXJbqj.js","/assets/cloudDataService-AmSZJcl9.js","/assets/configStore-jfv_oEyo.js","/assets/dataService-Cktjh65E.js","/assets/dataUtils-DMgd_OVT.js","/assets/dbService-DTjk595w.js","/assets/firebaseProductConfigService-DZ1Oi-s8.js","/assets/googleSheetsService-BGBmW1BJ.js","/assets/googleSheetsService-D0LTBUzq.js","/assets/html2canvas.esm-QH1iLAAe.js","/assets/index-BbJu6AQY.js","/assets/index-CgJtiJsK.js","/assets/index-Cok6S9gG.js","/assets/index-D3LwcODq.css","/assets/index-DTpOXkki.js","/assets/index.es-DHYgVMGh.js","/assets/industryColors-NaMQqhES.js","/assets/jspdf.es.min-pEijFumX.js","/assets/khaiThacDb-BtIaJc2V.js","/assets/khoDataService-BgH4Epji.js","/assets/legacyIconNames-45BdvTMF.js","/assets/lineBot.types-cn-T7Htv.js","/assets/moTaBoLoc-B6sNO7U6.js","/assets/presetBi-XQ7svxUi.js","/assets/salesJsonWriter.worker-BNAYiZX6.js","/assets/salesJsonWriter.worker-iky0iAuj.js","/assets/scheduleHeartbeat.worker-DY9MOOqR.js","/assets/shared-utils-CoyMcgY7.js","/assets/summaryService-DucGkmhc.js","/assets/useBiAutoSync-BEdCR7IG.js","/assets/useMultiMonthBonusRun-BpGxqMdf.js","/assets/vendor-charts-cgUzaFZk.js","/assets/vendor-excel-BGhuli8m.js","/assets/vendor-firebase-DT1DDorP.js","/assets/vendor-firebase-analytics-DCeAmzTQ.js","/assets/vendor-icons-CmCra2aO.js","/assets/vendor-react-BFsc7Y4G.js","/assets/worker-C3Ehuode.js","/assets/ycxAutoSyncService--k61RMRm.js","/favicon.svg","/icons/apple-touch-icon-120.png","/icons/apple-touch-icon-152.png","/icons/apple-touch-icon-167.png","/icons/apple-touch-icon-180.png","/icons/icon-192.png","/icons/icon-512.png","/icons/icon-maskable-512.png","/manifest.webmanifest","/prevent-pull-to-refresh.js","/reload-on-chunk-error.js"];
const CORE = ["/assets/index-DTpOXkki.js","/assets/vendor-react-BFsc7Y4G.js","/assets/shared-utils-CoyMcgY7.js","/assets/vendor-icons-CmCra2aO.js","/assets/vendor-firebase-DT1DDorP.js","/assets/index-D3LwcODq.css","/prevent-pull-to-refresh.js","/reload-on-chunk-error.js","/favicon.svg","/manifest.webmanifest"];

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
