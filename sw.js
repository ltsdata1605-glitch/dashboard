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
const VERSION = 'ad68d5d832e1';
const CACHE = 'ycx-shell-' + VERSION;
const PRECACHE = ["/assets/AboutView-DkUI-S8m.js","/assets/AreaAutoExportButton-D064Gz72.js","/assets/Badge-iK8vjF0x.js","/assets/Banner-CNAPW1nz.js","/assets/BiWrapper-DMR52XUc.css","/assets/BiWrapper-U9mrDmRs.js","/assets/ChangelogModal-0FVXal77.js","/assets/CheckThuongView-57YBtlmN.js","/assets/Checkbox-mU1VFn9R.js","/assets/ConfirmDialog-DVLrXgYi.js","/assets/CouponConverterView-CQDG5Kdw.js","/assets/DashboardView-B_9AHDaH.js","/assets/DataUpdater-CZhrVkmm.js","/assets/EmployeeAnalysis-DR0Gq3BH.js","/assets/EmptyState-FWIoleJl.js","/assets/ExportOptionsModal-BlRDlKj-.js","/assets/ExternalToolView-_ZslFrro.js","/assets/FileHistoryModal-BZnFjvok.js","/assets/FileNamingModal-CKBncm7T.js","/assets/GlobalAutoSyncDock-Co-5EDxE.js","/assets/IndustryGrid-DdsRhPVR.js","/assets/InstallAppHint-BqneR-SQ.js","/assets/KhaiThacView-DIMVCwNI.js","/assets/KpiCard-DlrmIZE4.js","/assets/KpiCardConfigModal-CIyrfyGr.js","/assets/LineBotView-ClinK6bT.js","/assets/ListGroup-CDaPV2xH.js","/assets/LoginView-CIj3sUJ6.js","/assets/MobileMoreSheet-CtOykVFr.js","/assets/Modal-CtAUChRR.js","/assets/MultiSelectDropdown-CFJufneg.js","/assets/NhanVien-D2hOIsOa.js","/assets/NotificationDropdown-D6DMqcHG.js","/assets/PendingApprovalView-DX6_ggmx.js","/assets/PerformanceModal-Dh_5DTMf.js","/assets/PhanCaView-C4EAyHyK.js","/assets/PhanCaView-CAA0vulx.css","/assets/PriceComparisonView-DJb7ljjN.js","/assets/SectionCard-Be0uXPGY.js","/assets/SectionHeader-mgkqyx_p.js","/assets/Select-BqP8LJz_.js","/assets/SettingsView-Bn5Qt2SQ.js","/assets/ShiftWarehouseInputModal-Bf-5oLO7.js","/assets/StickerEventApp-DfA2hprF.js","/assets/StickerPrinterView-DNUDp-f-.js","/assets/StringMultiSelect-D1SmMa4u.js","/assets/SummaryTable-B3I48E62.js","/assets/Switch-ByZK1XPM.js","/assets/Tabs-Btauxgu8.js","/assets/TaxCalculatorView-DKo3DcvO.js","/assets/Textarea-CKFI_v3I.js","/assets/TouchTitleHint-pfeoifhw.js","/assets/TrendChart-D5fmzZGt.js","/assets/UncollectedOrdersModal-cO-jUWDz.js","/assets/UnconfiguredGroupsModal-CeK6Km4j.js","/assets/UnshippedOrdersModal-DaeygvxB.js","/assets/UploadConflictModal-or_mLcCl.js","/assets/UploadTypeSelectionModal-Cyqlz-Dr.js","/assets/UserManagementView-DoOsr-X9.js","/assets/analysisEmployeeSyncService-CQYyECYe.js","/assets/analytics.worker-BfRBJyQG.js","/assets/analytics.worker-CCAy1kzZ.js","/assets/analytics.worker-CxIdJA8C.js","/assets/autoNavigationService-CyN2lvXt.js","/assets/autoReportExportService-DR-Gc9Fm.js","/assets/captureEngine-OSZJvrIx.js","/assets/chartConfig-C-f7hsgo.js","/assets/checkThuongIframeService-h8FwKi2H.js","/assets/cloudDataService-BuYaM9nO.js","/assets/configStore-jfv_oEyo.js","/assets/dataService-JyqnE-PS.js","/assets/dataUtils-BgXZevcz.js","/assets/dbService-BTM2zTtK.js","/assets/firebaseProductConfigService-Cn2M6aEh.js","/assets/googleSheetsService-BGBmW1BJ.js","/assets/googleSheetsService-D0LTBUzq.js","/assets/html2canvas.esm-QH1iLAAe.js","/assets/index-B2MOX-f0.css","/assets/index-BIFoWCtc.js","/assets/index-CgJtiJsK.js","/assets/index-CyDwrB1C.js","/assets/index-DuaGrbqz.js","/assets/index.es-CEqH2Jaa.js","/assets/industryColors-NaMQqhES.js","/assets/jspdf.es.min-BL1cqLns.js","/assets/khaiThacDb-CNx3Gqep.js","/assets/khoDataService-CkJ71UDw.js","/assets/lineBot.types-Cx3KoGsp.js","/assets/moTaBoLoc-B6sNO7U6.js","/assets/presetBi-B9tj8Ctc.js","/assets/salesJsonWriter.worker-BNAYiZX6.js","/assets/salesJsonWriter.worker-iky0iAuj.js","/assets/scheduleHeartbeat.worker-DY9MOOqR.js","/assets/shared-utils-CoyMcgY7.js","/assets/summaryService-BIxYIUbV.js","/assets/systemAnnouncementService-DY4iL1Jh.js","/assets/useBiAutoSync-4r8p54gZ.js","/assets/useMultiMonthBonusRun-DM000wkY.js","/assets/vendor-charts-CNaQ3TAb.js","/assets/vendor-excel-BGhuli8m.js","/assets/vendor-firebase-C6cs38PV.js","/assets/vendor-firebase-analytics-BlcBQ8K_.js","/assets/vendor-icons-DmTakvj8.js","/assets/vendor-react-spjDHvdB.js","/assets/worker-C3Ehuode.js","/assets/ycxAutoSyncService--k61RMRm.js","/favicon.svg","/icons/apple-touch-icon-120.png","/icons/apple-touch-icon-152.png","/icons/apple-touch-icon-167.png","/icons/apple-touch-icon-180.png","/icons/icon-192.png","/icons/icon-512.png","/icons/icon-maskable-512.png","/manifest.webmanifest","/prevent-pull-to-refresh.js","/reload-on-chunk-error.js"];
const CORE = ["/assets/index-CyDwrB1C.js","/assets/vendor-react-spjDHvdB.js","/assets/shared-utils-CoyMcgY7.js","/assets/vendor-icons-DmTakvj8.js","/assets/vendor-firebase-C6cs38PV.js","/assets/index-B2MOX-f0.css","/prevent-pull-to-refresh.js","/reload-on-chunk-error.js","/favicon.svg","/manifest.webmanifest"];

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
