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
const VERSION = 'e76c23119978';
const CACHE = 'ycx-shell-' + VERSION;
const PRECACHE = ["/assets/AboutView-DAEmjSl5.js","/assets/AreaAutoExportButton-D97nYGod.js","/assets/Badge-B2WWRDU5.js","/assets/Banner-BYef_W6r.js","/assets/BiWrapper-DMR52XUc.css","/assets/BiWrapper-Dn_gUt6k.js","/assets/ChangelogModal-CY9pscHS.js","/assets/CheckThuongView-BhcAn2W-.js","/assets/Checkbox-erM004yg.js","/assets/ConfirmDialog-iP4bXkeX.js","/assets/CouponConverterView-BvOdGixd.js","/assets/DashboardView-DnkOY4uU.js","/assets/DataUpdater-B1c0v9q7.js","/assets/EmployeeAnalysis-CkEdfJd6.js","/assets/EmptyState-CBJ4MRgo.js","/assets/ExportOptionsModal-D-KmDiY9.js","/assets/ExternalToolView-_ZslFrro.js","/assets/FileHistoryModal-B8WNZLUI.js","/assets/FileNamingModal-BuHWDrPT.js","/assets/GlobalAutoSyncDock-BO5SmEV9.js","/assets/HeaderSystemGroup-D7rE7rJ-.js","/assets/IndustryGrid-VVIp5T-s.js","/assets/InstallAppHint-DBgFSlmH.js","/assets/KhaiThacView-DDoGHpB6.js","/assets/KpiCard-BDim653h.js","/assets/KpiCardConfigModal-BHq_Vi7X.js","/assets/LineBotView-D96OTQj0.js","/assets/ListGroup-FrIoV1aR.js","/assets/LoginView-CvcUDWpF.js","/assets/MobileMoreSheet-Bxia_I-P.js","/assets/Modal-BwCLb11z.js","/assets/MultiSelectDropdown-BKJSdlvc.js","/assets/NhanVien-Egs74saG.js","/assets/NotificationDropdown-CrMvJH6s.js","/assets/PendingApprovalView-DT-T-6T0.js","/assets/PerformanceModal-DoeiM4C3.js","/assets/PhanCaView-CAA0vulx.css","/assets/PhanCaView-D42fy9Pw.js","/assets/PriceComparisonView-BtUr5NV9.js","/assets/SectionCard-B-drYcSA.js","/assets/SectionHeader-DvmCxrGW.js","/assets/Select-CD2jJhme.js","/assets/SettingsView-mPVd6ZCe.js","/assets/ShiftWarehouseInputModal-D_6ow4cp.js","/assets/StickerEventApp-CtrNnkuo.js","/assets/StickerPrinterView-CniufIWZ.js","/assets/StringMultiSelect-prMkged1.js","/assets/SummaryTable-9eTHVbfv.js","/assets/Switch-BpGmkwCG.js","/assets/Tabs-DPLb23ZS.js","/assets/TaxCalculatorView-Dvaq_NV_.js","/assets/Textarea-DfYp8IZh.js","/assets/TouchTitleHint-pfeoifhw.js","/assets/TrendChart-BEFDyzK7.js","/assets/UncollectedOrdersModal-BUiljm4F.js","/assets/UnconfiguredGroupsModal-CgMy0z7R.js","/assets/UnshippedOrdersModal-BfMQpAyr.js","/assets/UploadConflictModal-yN5-Q6oD.js","/assets/UploadTypeSelectionModal-BBRkhQ2w.js","/assets/UserManagementView-CIiOyeqH.js","/assets/analysisEmployeeSyncService-CQIVRqbq.js","/assets/analytics.worker-CJ-AthHs.js","/assets/analytics.worker-CxIdJA8C.js","/assets/analytics.worker-D-Ebp5us.js","/assets/autoNavigationService-CreYX1BB.js","/assets/autoReportExportService-QyNdh1uG.js","/assets/captureEngine-DTH3SorR.js","/assets/chartConfig-C-f7hsgo.js","/assets/checkThuongIframeService-CZCkbUOI.js","/assets/cloudDataService-BIkMi019.js","/assets/configStore-jfv_oEyo.js","/assets/dataService-CgcT5sMR.js","/assets/dataUtils-C-704QQg.js","/assets/dbService-DbP9Q3ym.js","/assets/firebaseProductConfigService-CVsyz38Z.js","/assets/googleSheetsService-BGBmW1BJ.js","/assets/googleSheetsService-D0LTBUzq.js","/assets/html2canvas.esm-QH1iLAAe.js","/assets/index-BIFoWCtc.js","/assets/index-CgJtiJsK.js","/assets/index-DJGRfxI3.js","/assets/index-DuaGrbqz.js","/assets/index-Ihsr0zLq.css","/assets/index.es-CCq-HNgz.js","/assets/industryColors-NaMQqhES.js","/assets/jspdf.es.min-DuhzMzBN.js","/assets/khaiThacDb-CwvODiTa.js","/assets/khoDataService-DlS6hfwP.js","/assets/lineBot.types-BPq2fj1v.js","/assets/moTaBoLoc-B6sNO7U6.js","/assets/presetBi-Cxaz1mUk.js","/assets/salesJsonWriter.worker-BNAYiZX6.js","/assets/salesJsonWriter.worker-iky0iAuj.js","/assets/scheduleHeartbeat.worker-DY9MOOqR.js","/assets/shared-utils-B_Pb1ZNr.js","/assets/summaryService-CRIEl8vv.js","/assets/systemAnnouncementService-B9ZUrTGE.js","/assets/useBiAutoSync-CdBrTHIr.js","/assets/useMultiMonthBonusRun-DgWQDo0J.js","/assets/vendor-charts-C3TwIp4Y.js","/assets/vendor-excel-BGhuli8m.js","/assets/vendor-firebase-DVZPizMJ.js","/assets/vendor-firebase-analytics-5cGotuqA.js","/assets/vendor-icons-DmTakvj8.js","/assets/vendor-react-spjDHvdB.js","/assets/worker-C3Ehuode.js","/assets/ycxAutoSyncService--k61RMRm.js","/favicon.svg","/fonts/UTM AvoBold.ttf","/icons/apple-touch-icon-120.png","/icons/apple-touch-icon-152.png","/icons/apple-touch-icon-167.png","/icons/apple-touch-icon-180.png","/icons/icon-192.png","/icons/icon-512.png","/icons/icon-maskable-512.png","/man-cho-khoi-dong.js","/manifest.webmanifest","/prevent-pull-to-refresh.js","/reload-on-chunk-error.js"];
const CORE = ["/assets/index-DJGRfxI3.js","/assets/vendor-react-spjDHvdB.js","/assets/shared-utils-B_Pb1ZNr.js","/assets/vendor-icons-DmTakvj8.js","/assets/vendor-firebase-DVZPizMJ.js","/assets/index-Ihsr0zLq.css","/prevent-pull-to-refresh.js","/reload-on-chunk-error.js","/man-cho-khoi-dong.js","/fonts/UTM AvoBold.ttf","/favicon.svg","/manifest.webmanifest"];

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
