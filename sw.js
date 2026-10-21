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
const VERSION = 'b864aa206fed';
const CACHE = 'ycx-shell-' + VERSION;
const PRECACHE = ["/assets/AboutView-DELjRGId.js","/assets/AreaAutoExportButton-Ci4_UdwP.js","/assets/Badge-B2WWRDU5.js","/assets/Banner-9T6gTQOV.js","/assets/BiWrapper-B_EJKT7Q.js","/assets/BiWrapper-DMR52XUc.css","/assets/ChangelogModal-B2PpGktD.js","/assets/CheckThuongView-D9efzpok.js","/assets/Checkbox-erM004yg.js","/assets/ConfirmDialog-Ck_tVMik.js","/assets/CouponConverterView-DFYSfxHa.js","/assets/DashboardView-eWOlSK5c.js","/assets/DataUpdater-DAoKnANe.js","/assets/EmployeeAnalysis-B_lPWZji.js","/assets/EmptyState-D-_8oDV9.js","/assets/ExportOptionsModal-BYRgA274.js","/assets/ExternalToolView-_ZslFrro.js","/assets/FileHistoryModal-Dxy6W_Mq.js","/assets/FileNamingModal-DZLZBH7a.js","/assets/GlobalAutoSyncDock-CImiPEyJ.js","/assets/IndustryGrid-EBNZMUJh.js","/assets/InstallAppHint-C6Fo7H9U.js","/assets/KhaiThacView-Cy6CkwNP.js","/assets/KpiCard-BwRPV2h6.js","/assets/KpiCardConfigModal-B3OJ76jX.js","/assets/LineBotView-BwS8RTn6.js","/assets/ListGroup-B9yTtX5X.js","/assets/LoginView-rDJsjEVC.js","/assets/MobileMoreSheet-D9PhD6vb.js","/assets/Modal-Bu88S0jw.js","/assets/MultiSelectDropdown-ANynK9G2.js","/assets/NhanVien-BGiPleK7.js","/assets/NotificationDropdown-CUaBWfiC.js","/assets/PendingApprovalView-DsQYF_lo.js","/assets/PerformanceModal-5VmWnALI.js","/assets/PhanCaView-CAA0vulx.css","/assets/PhanCaView-CmI5Uruq.js","/assets/PriceComparisonView-BLykzvpd.js","/assets/SectionCard-B-drYcSA.js","/assets/SectionHeader-C9O57oHj.js","/assets/Select-D4TjvKQH.js","/assets/SettingsView-BPtS_KnV.js","/assets/ShiftWarehouseInputModal-De53CBC5.js","/assets/StickerEventApp-FKZTtXPu.js","/assets/StickerPrinterView-sp0KB8h7.js","/assets/StringMultiSelect-iibEBraa.js","/assets/SummaryTable-oLiCl9tI.js","/assets/Switch-BgJAC4UU.js","/assets/Tabs-CU-yW0fW.js","/assets/TaxCalculatorView-C80t00EC.js","/assets/Textarea-DfYp8IZh.js","/assets/TouchTitleHint-pfeoifhw.js","/assets/TrendChart-Csd8Zsvh.js","/assets/UncollectedOrdersModal-KZE8Vf0H.js","/assets/UnconfiguredGroupsModal-Cl2TAL4g.js","/assets/UnshippedOrdersModal-BK7wsPBM.js","/assets/UploadConflictModal-B6rNKZ-u.js","/assets/UploadTypeSelectionModal-DMhshIpa.js","/assets/UserManagementView-BDedOjBX.js","/assets/analysisEmployeeSyncService-DDO34mxA.js","/assets/analytics.worker-BfRBJyQG.js","/assets/analytics.worker-CCAy1kzZ.js","/assets/analytics.worker-CxIdJA8C.js","/assets/autoNavigationService-DIv7xYIT.js","/assets/autoReportExportService-JRoAiSo_.js","/assets/captureEngine-BA3tpMhr.js","/assets/chartConfig-C-f7hsgo.js","/assets/checkThuongIframeService-DtKClJBx.js","/assets/cloudDataService-CPj7BhH7.js","/assets/configStore-jfv_oEyo.js","/assets/dataService-DpPoA8Kq.js","/assets/dataUtils-BfvIV3rS.js","/assets/dbService-BBVTaOZh.js","/assets/firebaseProductConfigService-AB5djxN6.js","/assets/googleSheetsService-BGBmW1BJ.js","/assets/googleSheetsService-D0LTBUzq.js","/assets/html2canvas.esm-QH1iLAAe.js","/assets/index-BIFoWCtc.js","/assets/index-BnrmEdCu.css","/assets/index-CgJtiJsK.js","/assets/index-CqZ1JGBw.js","/assets/index-DuaGrbqz.js","/assets/index.es-Cab7cHY3.js","/assets/industryColors-NaMQqhES.js","/assets/jspdf.es.min-0pvLTyX4.js","/assets/khaiThacDb-DbBtHFpP.js","/assets/khoDataService-DcIy6nV1.js","/assets/lineBot.types-CVgynxkm.js","/assets/moTaBoLoc-B6sNO7U6.js","/assets/presetBi-CDFeYuQ_.js","/assets/salesJsonWriter.worker-BNAYiZX6.js","/assets/salesJsonWriter.worker-iky0iAuj.js","/assets/scheduleHeartbeat.worker-DY9MOOqR.js","/assets/shared-utils-B_Pb1ZNr.js","/assets/summaryService-DYR3jxgR.js","/assets/systemAnnouncementService-CxpvK0PO.js","/assets/useBiAutoSync-Bu9krJZn.js","/assets/useMultiMonthBonusRun-DcUL1DyJ.js","/assets/vendor-charts-C3TwIp4Y.js","/assets/vendor-excel-BGhuli8m.js","/assets/vendor-firebase-DVZPizMJ.js","/assets/vendor-firebase-analytics-5cGotuqA.js","/assets/vendor-icons-DmTakvj8.js","/assets/vendor-react-spjDHvdB.js","/assets/worker-C3Ehuode.js","/assets/ycxAutoSyncService--k61RMRm.js","/favicon.svg","/icons/apple-touch-icon-120.png","/icons/apple-touch-icon-152.png","/icons/apple-touch-icon-167.png","/icons/apple-touch-icon-180.png","/icons/icon-192.png","/icons/icon-512.png","/icons/icon-maskable-512.png","/manifest.webmanifest","/prevent-pull-to-refresh.js","/reload-on-chunk-error.js"];
const CORE = ["/assets/index-CqZ1JGBw.js","/assets/vendor-react-spjDHvdB.js","/assets/shared-utils-B_Pb1ZNr.js","/assets/vendor-icons-DmTakvj8.js","/assets/vendor-firebase-DVZPizMJ.js","/assets/index-BnrmEdCu.css","/prevent-pull-to-refresh.js","/reload-on-chunk-error.js","/favicon.svg","/manifest.webmanifest"];

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
