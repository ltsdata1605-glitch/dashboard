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
const VERSION = '4a4e2f842b29';
const CACHE = 'ycx-shell-' + VERSION;
const PRECACHE = ["/assets/AboutView-D8ED4o76.js","/assets/AreaAutoExportButton-C2O6L6Mv.js","/assets/Badge-B2WWRDU5.js","/assets/Banner-z__z3c7a.js","/assets/BiWrapper-CIkJXXH3.js","/assets/BiWrapper-DMR52XUc.css","/assets/ChangelogModal-BpGwtQ6Z.js","/assets/CheckThuongView-BJAnKNIl.js","/assets/Checkbox-erM004yg.js","/assets/ConfirmDialog-oFkmJtB7.js","/assets/CouponConverterView-CBd9P6ew.js","/assets/DashboardView-CTC_yIeO.js","/assets/DataUpdater-DuzrVgnF.js","/assets/EmployeeAnalysis-DXsSUyv5.js","/assets/EmptyState-D_H3TbnY.js","/assets/ExportOptionsModal-P1JXOR3a.js","/assets/ExternalToolView-_ZslFrro.js","/assets/FileHistoryModal-CC1X5dqw.js","/assets/FileNamingModal-0eHa35-a.js","/assets/GlobalAutoSyncDock-Bhh3B7Xv.js","/assets/IndustryGrid-ByUr0weP.js","/assets/InstallAppHint-nahgp-sJ.js","/assets/KhaiThacView-_DlSS-wk.js","/assets/KpiCard-SCoMNNu5.js","/assets/KpiCardConfigModal-BsgxyITZ.js","/assets/LineBotView-Ba0OSvR6.js","/assets/ListGroup-ByidAQDE.js","/assets/LoginView-B_XYmzpN.js","/assets/MobileMoreSheet-BIW5qnwO.js","/assets/Modal-kLFYjnZw.js","/assets/MultiSelectDropdown-yIzP2Hlp.js","/assets/NhanVien-wutjF7RU.js","/assets/NotificationDropdown-DIQiPwKG.js","/assets/PendingApprovalView-CZd3DPz2.js","/assets/PerformanceModal-Bojr1A51.js","/assets/PhanCaView-CAA0vulx.css","/assets/PhanCaView-Cx27XzWY.js","/assets/PriceComparisonView-CPYmDzJy.js","/assets/SectionCard-B-drYcSA.js","/assets/SectionHeader-R6ur7TL-.js","/assets/Select-CfBix8wB.js","/assets/SettingsView-BwwNlYrl.js","/assets/ShiftWarehouseInputModal-d4ditzTA.js","/assets/StickerEventApp-CYpKRaXa.js","/assets/StickerPrinterView-COu7uSE8.js","/assets/StringMultiSelect-D4W1AWEl.js","/assets/SummaryTable-BkZB_Bxk.js","/assets/Switch-DhMmSEtb.js","/assets/Tabs-BNCczFic.js","/assets/TaxCalculatorView-XaBZmQGZ.js","/assets/Textarea-DfYp8IZh.js","/assets/TopBarActions-q72X_neD.js","/assets/TouchTitleHint-pfeoifhw.js","/assets/TrendChart-7QvXiD0j.js","/assets/UncollectedOrdersModal-Dx4nvl0l.js","/assets/UnconfiguredGroupsModal-BriWUQfX.js","/assets/UnshippedOrdersModal-B_zSD7i6.js","/assets/UploadConflictModal-0BFs-9V9.js","/assets/UploadTypeSelectionModal-CaHF_thq.js","/assets/UserManagementView-C-yJ2f5i.js","/assets/analysisEmployeeSyncService-DSidkmjx.js","/assets/analytics.worker-C_xmZIXD.js","/assets/analytics.worker-CxIdJA8C.js","/assets/analytics.worker-DxUz-NXp.js","/assets/autoNavigationService-CzqqXbii.js","/assets/autoReportExportService-BjTpB9C6.js","/assets/captureEngine-DYkS7R7E.js","/assets/chartConfig-C-f7hsgo.js","/assets/checkThuongIframeService-BZcS0yuC.js","/assets/cloudDataService-BVv2NSMR.js","/assets/configStore-jfv_oEyo.js","/assets/dataService-Di1q_0b9.js","/assets/dataUtils-DiJcMuSC.js","/assets/dbService-BEYeEPTw.js","/assets/firebaseProductConfigService-DOW3gayL.js","/assets/googleSheetsService-BGBmW1BJ.js","/assets/googleSheetsService-D0LTBUzq.js","/assets/html2canvas.esm-QH1iLAAe.js","/assets/index-BIFoWCtc.js","/assets/index-CgJtiJsK.js","/assets/index-Cl9Y0ykk.css","/assets/index-D9IyLu2h.js","/assets/index-DuaGrbqz.js","/assets/index.es-Bb2cIBIF.js","/assets/industryColors-NaMQqhES.js","/assets/jspdf.es.min--7btL6Xd.js","/assets/khaiThacDb-DGKMrYH7.js","/assets/khoDataService-CXfIQt2o.js","/assets/lineBot.types-Cbw25JzZ.js","/assets/moTaBoLoc-B6sNO7U6.js","/assets/presetBi-CxW08Sco.js","/assets/salesJsonWriter.worker-BNAYiZX6.js","/assets/salesJsonWriter.worker-iky0iAuj.js","/assets/scheduleHeartbeat.worker-DY9MOOqR.js","/assets/shared-utils-B_Pb1ZNr.js","/assets/summaryService-Cp2mC0Uo.js","/assets/systemAnnouncementService-DOfjW-Hx.js","/assets/useBiAutoSync-DqRoMFHo.js","/assets/useMultiMonthBonusRun-C8R91pZi.js","/assets/vendor-charts-C3TwIp4Y.js","/assets/vendor-excel-BGhuli8m.js","/assets/vendor-firebase-DVZPizMJ.js","/assets/vendor-firebase-analytics-5cGotuqA.js","/assets/vendor-icons-DmTakvj8.js","/assets/vendor-react-spjDHvdB.js","/assets/worker-C3Ehuode.js","/assets/ycxAutoSyncService--k61RMRm.js","/favicon.svg","/fonts/UTM AvoBold.ttf","/icons/apple-touch-icon-120.png","/icons/apple-touch-icon-152.png","/icons/apple-touch-icon-167.png","/icons/apple-touch-icon-180.png","/icons/icon-192.png","/icons/icon-512.png","/icons/icon-maskable-512.png","/man-cho-khoi-dong.js","/manifest.webmanifest","/prevent-pull-to-refresh.js","/reload-on-chunk-error.js"];
const CORE = ["/assets/index-D9IyLu2h.js","/assets/vendor-react-spjDHvdB.js","/assets/shared-utils-B_Pb1ZNr.js","/assets/vendor-icons-DmTakvj8.js","/assets/vendor-firebase-DVZPizMJ.js","/assets/index-Cl9Y0ykk.css","/prevent-pull-to-refresh.js","/reload-on-chunk-error.js","/man-cho-khoi-dong.js","/fonts/UTM AvoBold.ttf","/favicon.svg","/manifest.webmanifest"];

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
