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
const VERSION = 'ed6563c9977c';
const CACHE = 'ycx-shell-' + VERSION;
const PRECACHE = ["/assets/AboutView-BEPV4pwl.js","/assets/AreaAutoExportButton-BnA1TI2g.js","/assets/Badge-B2WWRDU5.js","/assets/Banner-Da2SDIYA.js","/assets/BiWrapper-ChIaSLXr.js","/assets/BiWrapper-DMR52XUc.css","/assets/ChangelogModal-CGkTc3PY.js","/assets/CheckThuongView-BB336r4o.js","/assets/Checkbox-erM004yg.js","/assets/ConfirmDialog-CEa9-61_.js","/assets/CouponConverterView-C7fqoIeg.js","/assets/DashboardView-OEdNaSDm.js","/assets/DataUpdater-CJ4N6O5w.js","/assets/EmployeeAnalysis-3jp0Uo3C.js","/assets/EmptyState-BdSH5PSB.js","/assets/ExportOptionsModal-DrFw44ry.js","/assets/ExternalToolView-_ZslFrro.js","/assets/FileHistoryModal-CWXgpcoB.js","/assets/FileNamingModal-CskVS4Pz.js","/assets/GlobalAutoSyncDock-C9L4B6cC.js","/assets/IndustryGrid-D-uooveU.js","/assets/InstallAppHint-C8kC_0tz.js","/assets/KhaiThacView-DHbUVAS1.js","/assets/KpiCard-BZT8I1sH.js","/assets/KpiCardConfigModal-O1e3HBN5.js","/assets/LineBotView-Bv_tBWz2.js","/assets/ListGroup-BonQWjfL.js","/assets/LoginView-BFD-hERE.js","/assets/MobileMoreSheet-SNSS9JFL.js","/assets/Modal-Dpy6C089.js","/assets/MultiSelectDropdown-Dc3WwsM5.js","/assets/NhanVien-CvprPx2Y.js","/assets/NotificationDropdown-BX4UMFrh.js","/assets/PendingApprovalView-Cb8QTTXb.js","/assets/PerformanceModal-CzsO70ye.js","/assets/PhanCaView-1NBKOCSt.js","/assets/PhanCaView-CAA0vulx.css","/assets/PriceComparisonView-DofDtWxn.js","/assets/SectionCard-B-drYcSA.js","/assets/SectionHeader-tGRVFDAn.js","/assets/Select-Ca-of7k8.js","/assets/SettingsView-gITzyBQP.js","/assets/ShiftWarehouseInputModal-Ccx1lWB4.js","/assets/StickerEventApp-Te3IVfRB.js","/assets/StickerPrinterView-4K3V95qh.js","/assets/StringMultiSelect-ByXJkaLN.js","/assets/SummaryTable-BkM7ynsR.js","/assets/Switch-DWMFX_KU.js","/assets/Tabs-BYeDSntd.js","/assets/TaxCalculatorView-DKYIVhAl.js","/assets/Textarea-DfYp8IZh.js","/assets/TopBarActions-UCSLneMJ.js","/assets/TouchTitleHint-pfeoifhw.js","/assets/TrendChart-Blk8bTS0.js","/assets/UncollectedOrdersModal-C5tHHFwh.js","/assets/UnconfiguredGroupsModal-Z7kpvOhG.js","/assets/UnshippedOrdersModal-ZuYkqPFA.js","/assets/UploadConflictModal-BKgYXN_-.js","/assets/UploadTypeSelectionModal-DbAuU3-j.js","/assets/UserManagementView-C-ZC73Ad.js","/assets/analysisEmployeeSyncService-P0fNZXQG.js","/assets/analytics.worker-C_xmZIXD.js","/assets/analytics.worker-CxIdJA8C.js","/assets/analytics.worker-DxUz-NXp.js","/assets/autoNavigationService-B__wDcV7.js","/assets/autoReportExportService-De53suzo.js","/assets/captureEngine-Rd8iDgF2.js","/assets/chartConfig-C-f7hsgo.js","/assets/checkThuongIframeService-B4EoJVtP.js","/assets/cloudDataService-BcKwS4ED.js","/assets/configStore-jfv_oEyo.js","/assets/dataService-Bj35tzzl.js","/assets/dataUtils-CNONkqCD.js","/assets/dbService-CsOfBK3a.js","/assets/firebaseProductConfigService-DICbaZnl.js","/assets/googleSheetsService-BGBmW1BJ.js","/assets/googleSheetsService-D0LTBUzq.js","/assets/html2canvas.esm-QH1iLAAe.js","/assets/index-BIFoWCtc.js","/assets/index-CQvFF2Gy.css","/assets/index-CgJtiJsK.js","/assets/index-DuaGrbqz.js","/assets/index-kTaTeF46.js","/assets/index.es-w-kRAqi8.js","/assets/industryColors-NaMQqhES.js","/assets/jspdf.es.min-vc1mf03R.js","/assets/khaiThacDb-BSwaFAnH.js","/assets/khoDataService-B-5BM8oS.js","/assets/lineBot.types-xEtXn-5A.js","/assets/moTaBoLoc-B6sNO7U6.js","/assets/presetBi-DGqx9tk9.js","/assets/salesJsonWriter.worker-BNAYiZX6.js","/assets/salesJsonWriter.worker-iky0iAuj.js","/assets/scheduleHeartbeat.worker-DY9MOOqR.js","/assets/shared-utils-B_Pb1ZNr.js","/assets/summaryService-DQgAAa2q.js","/assets/systemAnnouncementService-p124JbSh.js","/assets/useBiAutoSync-9FyzEbOX.js","/assets/useMultiMonthBonusRun-BQUfqFKP.js","/assets/vendor-charts-C3TwIp4Y.js","/assets/vendor-excel-BGhuli8m.js","/assets/vendor-firebase-DVZPizMJ.js","/assets/vendor-firebase-analytics-5cGotuqA.js","/assets/vendor-icons-DmTakvj8.js","/assets/vendor-react-spjDHvdB.js","/assets/worker-C3Ehuode.js","/assets/ycxAutoSyncService--k61RMRm.js","/favicon.svg","/fonts/UTM AvoBold.ttf","/icons/apple-touch-icon-120.png","/icons/apple-touch-icon-152.png","/icons/apple-touch-icon-167.png","/icons/apple-touch-icon-180.png","/icons/icon-192.png","/icons/icon-512.png","/icons/icon-maskable-512.png","/man-cho-khoi-dong.js","/manifest.webmanifest","/prevent-pull-to-refresh.js","/reload-on-chunk-error.js"];
const CORE = ["/assets/index-kTaTeF46.js","/assets/vendor-react-spjDHvdB.js","/assets/shared-utils-B_Pb1ZNr.js","/assets/vendor-icons-DmTakvj8.js","/assets/vendor-firebase-DVZPizMJ.js","/assets/index-CQvFF2Gy.css","/prevent-pull-to-refresh.js","/reload-on-chunk-error.js","/man-cho-khoi-dong.js","/fonts/UTM AvoBold.ttf","/favicon.svg","/manifest.webmanifest"];

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
const isStaticFile = (url) => /^\/(fonts|icons|frame|splash|scripts|Tuts)\//.test(url.pathname) || /\.(woff2?|ttf|png|jpe?g|svg|webp|ico|webmanifest)$/.test(url.pathname) || /^\/(prevent-pull-to-refresh|reload-on-chunk-error|man-cho-khoi-dong)\.js$/.test(url.pathname);

async function networkFirstNavigation(event) {
  const request = event.request;
  const cache = await caches.open(CACHE);
  const pathname = new URL(request.url).pathname;
  // SPA: mọi đường dẫn không có đuôi file dùng chung index.html.
  const isShell = !/\.[a-z0-9]+$/i.test(pathname);
  // Tải mạng chạy TIẾP kể cả khi đã quá 4 giây và trang đã nhận bản lưu: về tới thì vẫn LƯU bản mới (2026-10-21). Trước
  // đây quá giờ là bỏ luôn bản mới → mạng chậm thì mãi nhận app shell cũ; bản cũ đòi file /assets/ đã bị xoá sau lượt đăng
  // bản mới → 404 → reload-on-chunk-error.js tải lại → lại quá 4 giây → lại bản cũ: vòng tải lại mỗi 10 giây (log 21/10:
  // resolveSession bị gọi dồn 4 phút, tràn bộ nhớ 2 lần).
  const network = fetch(request).then((fresh) => {
    if (fresh && fresh.ok) return cache.put(isShell ? '/index.html' : request, fresh.clone()).then(() => fresh);
    return fresh;
  });
  event.waitUntil(network.catch(() => {}));
  try {
    return await Promise.race([
      network,
      new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 4000)),
    ]);
  } catch (e) {
    const cached = (isShell ? await cache.match('/index.html') : await cache.match(request));
    if (cached) return cached;
    return network; // không có bản lưu: chờ mạng tới cùng (thay vì báo lỗi sau 4 giây)
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
  if (request.mode === 'navigate') { event.respondWith(networkFirstNavigation(event)); return; }
  if (isHashedAsset(url) || isStaticFile(url)) { event.respondWith(cacheFirst(request)); return; }
});
