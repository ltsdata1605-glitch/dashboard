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
const VERSION = 'eb232617ef30';
const CACHE = 'ycx-shell-' + VERSION;
const PRECACHE = ["/assets/AboutView-DXjs1x-_.js","/assets/AreaAutoExportButton-BIulMYqx.js","/assets/Badge-B2WWRDU5.js","/assets/Banner-B8x3Io2X.js","/assets/BiWrapper-DMR52XUc.css","/assets/BiWrapper-Qp-DcL25.js","/assets/ChangelogModal-BGi_k-AD.js","/assets/CheckThuongView-K-DUuMQ_.js","/assets/Checkbox-erM004yg.js","/assets/ConfirmDialog-B4mj59Wa.js","/assets/CouponConverterView-BFbl_VN3.js","/assets/DashboardView-CiwL4M5v.js","/assets/DataUpdater-Dz0XdVH2.js","/assets/EmployeeAnalysis-VvMZ7ERG.js","/assets/EmptyState-CQHUvxJj.js","/assets/ExportOptionsModal-B9ehOC9J.js","/assets/ExternalToolView-_ZslFrro.js","/assets/FileHistoryModal-BwtQ04vb.js","/assets/FileNamingModal-BRsXuBk_.js","/assets/GlobalAutoSyncDock-M281Zf-Z.js","/assets/HeaderSystemGroup-C-HDrK15.js","/assets/IndustryGrid-DtYtFaQY.js","/assets/InstallAppHint-DUjYK2Lu.js","/assets/KhaiThacView-Bn4GpgAg.js","/assets/KpiCard-BB4IWPtZ.js","/assets/KpiCardConfigModal-DO_3C2w2.js","/assets/LineBotView-DxXlTL7_.js","/assets/ListGroup-KZkelVf0.js","/assets/LoginView-BaF0YZdx.js","/assets/MobileMoreSheet-BBh7a4GG.js","/assets/Modal-BJcMbAZd.js","/assets/MultiSelectDropdown-C8EKtOdP.js","/assets/NhanVien-1cgDagal.js","/assets/NotificationDropdown-DNtNEon6.js","/assets/PendingApprovalView-BL12gEnT.js","/assets/PerformanceModal-BEw_SsNr.js","/assets/PhanCaView-CAA0vulx.css","/assets/PhanCaView-DUwr5CfA.js","/assets/PriceComparisonView-DD6ABnYm.js","/assets/SectionCard-B-drYcSA.js","/assets/SectionHeader-1DccFliW.js","/assets/Select-KOH5Oohy.js","/assets/SettingsView-DtNXI83h.js","/assets/ShiftWarehouseInputModal-CRnWDhLd.js","/assets/StickerEventApp-Biqc9Xfq.js","/assets/StickerPrinterView-DMgVhunD.js","/assets/StringMultiSelect-DyODMe6l.js","/assets/SummaryTable-GqRMyP65.js","/assets/Switch-BegeYOsT.js","/assets/Tabs-SvUAvqVX.js","/assets/TaxCalculatorView-zg26otEN.js","/assets/Textarea-DfYp8IZh.js","/assets/TouchTitleHint-pfeoifhw.js","/assets/TrendChart-BUy-4Z26.js","/assets/UncollectedOrdersModal-FhXJkMKZ.js","/assets/UnconfiguredGroupsModal-BQg5tdCB.js","/assets/UnshippedOrdersModal-JSP_iuYF.js","/assets/UploadConflictModal-CCodn3-h.js","/assets/UploadTypeSelectionModal-BnZGYWyb.js","/assets/UserManagementView-DAVvH5Ad.js","/assets/analysisEmployeeSyncService-Mj1bs5yK.js","/assets/analytics.worker-CJ-AthHs.js","/assets/analytics.worker-CxIdJA8C.js","/assets/analytics.worker-D-Ebp5us.js","/assets/autoNavigationService-DFjYuaiQ.js","/assets/autoReportExportService-lP8DT8OQ.js","/assets/captureEngine-BWeGy1je.js","/assets/chartConfig-C-f7hsgo.js","/assets/checkThuongIframeService-fKMbdAS7.js","/assets/cloudDataService-cQ5DK-5Q.js","/assets/configStore-jfv_oEyo.js","/assets/dataService-aZDHAGuJ.js","/assets/dataUtils-B0YA296b.js","/assets/dbService-C-x9CyTz.js","/assets/firebaseProductConfigService-CstUWCYI.js","/assets/googleSheetsService-BGBmW1BJ.js","/assets/googleSheetsService-D0LTBUzq.js","/assets/html2canvas.esm-QH1iLAAe.js","/assets/index-BIFoWCtc.js","/assets/index-CgJtiJsK.js","/assets/index-DbTcGvCD.js","/assets/index-DuaGrbqz.js","/assets/index-Ihsr0zLq.css","/assets/index.es-BzIGfF49.js","/assets/industryColors-NaMQqhES.js","/assets/jspdf.es.min-C4lxNkyg.js","/assets/khaiThacDb-Uf1Wcdik.js","/assets/khoDataService-B77UJ1EC.js","/assets/lineBot.types-C1A2JqDh.js","/assets/moTaBoLoc-B6sNO7U6.js","/assets/presetBi-CDJ88bhH.js","/assets/salesJsonWriter.worker-BNAYiZX6.js","/assets/salesJsonWriter.worker-iky0iAuj.js","/assets/scheduleHeartbeat.worker-DY9MOOqR.js","/assets/shared-utils-B_Pb1ZNr.js","/assets/summaryService-DyMzDCYT.js","/assets/systemAnnouncementService-bWxoexKS.js","/assets/useBiAutoSync-DBfo7Dtt.js","/assets/useMultiMonthBonusRun-CTknHhAd.js","/assets/vendor-charts-C3TwIp4Y.js","/assets/vendor-excel-BGhuli8m.js","/assets/vendor-firebase-DVZPizMJ.js","/assets/vendor-firebase-analytics-5cGotuqA.js","/assets/vendor-icons-DmTakvj8.js","/assets/vendor-react-spjDHvdB.js","/assets/worker-C3Ehuode.js","/assets/ycxAutoSyncService--k61RMRm.js","/favicon.svg","/fonts/UTM AvoBold.ttf","/icons/apple-touch-icon-120.png","/icons/apple-touch-icon-152.png","/icons/apple-touch-icon-167.png","/icons/apple-touch-icon-180.png","/icons/icon-192.png","/icons/icon-512.png","/icons/icon-maskable-512.png","/man-cho-khoi-dong.js","/manifest.webmanifest","/prevent-pull-to-refresh.js","/reload-on-chunk-error.js"];
const CORE = ["/assets/index-DbTcGvCD.js","/assets/vendor-react-spjDHvdB.js","/assets/shared-utils-B_Pb1ZNr.js","/assets/vendor-icons-DmTakvj8.js","/assets/vendor-firebase-DVZPizMJ.js","/assets/index-Ihsr0zLq.css","/prevent-pull-to-refresh.js","/reload-on-chunk-error.js","/man-cho-khoi-dong.js","/fonts/UTM AvoBold.ttf","/favicon.svg","/manifest.webmanifest"];

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
