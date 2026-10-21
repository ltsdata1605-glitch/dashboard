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
const VERSION = 'bf15576e6dd7';
const CACHE = 'ycx-shell-' + VERSION;
const PRECACHE = ["/assets/AboutView-C_hE8Zcd.js","/assets/AreaAutoExportButton-oaEnWxJG.js","/assets/Badge-iK8vjF0x.js","/assets/Banner--IvfbH2r.js","/assets/BiWrapper-DMR52XUc.css","/assets/BiWrapper-DoAWZpGW.js","/assets/ChangelogModal-7rbc2Ttu.js","/assets/CheckThuongView-v5X2-6rC.js","/assets/Checkbox-mU1VFn9R.js","/assets/ConfirmDialog-mSrfYeot.js","/assets/CouponConverterView-DYD7iy6m.js","/assets/DashboardView-CsouCfL2.js","/assets/DataUpdater-D4hesjTH.js","/assets/EmployeeAnalysis-CjD9a6bk.js","/assets/EmptyState-Cp3LOGAp.js","/assets/ExportOptionsModal-Bflg_b7E.js","/assets/ExternalToolView-_ZslFrro.js","/assets/FileHistoryModal-QghrSfiV.js","/assets/FileNamingModal-fohodAEq.js","/assets/GlobalAutoSyncDock-Da6Ic0rJ.js","/assets/IndustryGrid-opqDYswk.js","/assets/InstallAppHint-CPnXQvm-.js","/assets/KhaiThacView-DAu2REeI.js","/assets/KpiCard-BlUkRqYh.js","/assets/KpiCardConfigModal-FMJAcF2L.js","/assets/LineBotView-CaZbg377.js","/assets/ListGroup-CT4wCyUb.js","/assets/LoginView-kyPY9NRR.js","/assets/MobileMoreSheet-BffM6Bkl.js","/assets/Modal-DTjeXg3u.js","/assets/MultiSelectDropdown-B6V7l-O-.js","/assets/NhanVien-CcLzl3zg.js","/assets/NotificationDropdown-B4GmmvBY.js","/assets/PendingApprovalView-mgPa37na.js","/assets/PerformanceModal-c9jRKbEM.js","/assets/PhanCaView-CAA0vulx.css","/assets/PhanCaView-D3KTUkKW.js","/assets/PriceComparisonView-DWY6I_Io.js","/assets/SectionCard-Be0uXPGY.js","/assets/SectionHeader-DBu0wG5y.js","/assets/Select-BB_afZLR.js","/assets/SettingsView-CjCKPyxC.js","/assets/ShiftWarehouseInputModal-tsjUjT97.js","/assets/StickerEventApp-BO1bjsSE.js","/assets/StickerPrinterView-DwUpfECO.js","/assets/StringMultiSelect-BzTTK6m2.js","/assets/SummaryTable-BO8ob883.js","/assets/Switch-I8EzoQG9.js","/assets/Tabs-CRdBG9Cz.js","/assets/TaxCalculatorView-CSDXsdNJ.js","/assets/Textarea-CKFI_v3I.js","/assets/TouchTitleHint-pfeoifhw.js","/assets/TrendChart-BzO_21ee.js","/assets/UncollectedOrdersModal-DpPJxjEK.js","/assets/UnconfiguredGroupsModal-CcP1XTbQ.js","/assets/UnshippedOrdersModal-CppH6IpX.js","/assets/UploadConflictModal-SgPA3vqK.js","/assets/UploadTypeSelectionModal-CqDP1GZI.js","/assets/UserManagementView-CmjZW1Pr.js","/assets/analysisEmployeeSyncService-CODNHH8r.js","/assets/analytics.worker-BfRBJyQG.js","/assets/analytics.worker-CCAy1kzZ.js","/assets/analytics.worker-CxIdJA8C.js","/assets/autoNavigationService-tp6pGAFS.js","/assets/autoReportExportService-BMpLFtWw.js","/assets/captureEngine-BGUthbFX.js","/assets/chartConfig-C-f7hsgo.js","/assets/checkThuongIframeService-DKN0e7c9.js","/assets/cloudDataService-Ds0Kg83t.js","/assets/configStore-jfv_oEyo.js","/assets/dataService-CqNzQyiT.js","/assets/dataUtils-BlIsMFo1.js","/assets/dbService-sGECBwvF.js","/assets/firebaseProductConfigService-DLfyvBHs.js","/assets/googleSheetsService-BGBmW1BJ.js","/assets/googleSheetsService-D0LTBUzq.js","/assets/html2canvas.esm-QH1iLAAe.js","/assets/index-B2MOX-f0.css","/assets/index-BIFoWCtc.js","/assets/index-CgJtiJsK.js","/assets/index-DIIaROQi.js","/assets/index-DuaGrbqz.js","/assets/index.es-DkQO8XBs.js","/assets/industryColors-NaMQqhES.js","/assets/jspdf.es.min-BPLHRSq7.js","/assets/khaiThacDb-DB4wWV1B.js","/assets/khoDataService-BQY3H9k6.js","/assets/lineBot.types-C6MccaON.js","/assets/moTaBoLoc-B6sNO7U6.js","/assets/presetBi-BbDCKr1U.js","/assets/salesJsonWriter.worker-BNAYiZX6.js","/assets/salesJsonWriter.worker-iky0iAuj.js","/assets/scheduleHeartbeat.worker-DY9MOOqR.js","/assets/shared-utils-CoyMcgY7.js","/assets/summaryService-CPX_Gup0.js","/assets/systemAnnouncementService-LGA0gNXq.js","/assets/useBiAutoSync-D-QSyoAC.js","/assets/useMultiMonthBonusRun-D8BM-SlL.js","/assets/vendor-charts-CNaQ3TAb.js","/assets/vendor-excel-BGhuli8m.js","/assets/vendor-firebase-_fajLqox.js","/assets/vendor-firebase-analytics-Cg8H9SI1.js","/assets/vendor-icons-DmTakvj8.js","/assets/vendor-react-spjDHvdB.js","/assets/worker-C3Ehuode.js","/assets/ycxAutoSyncService--k61RMRm.js","/favicon.svg","/icons/apple-touch-icon-120.png","/icons/apple-touch-icon-152.png","/icons/apple-touch-icon-167.png","/icons/apple-touch-icon-180.png","/icons/icon-192.png","/icons/icon-512.png","/icons/icon-maskable-512.png","/manifest.webmanifest","/prevent-pull-to-refresh.js","/reload-on-chunk-error.js"];
const CORE = ["/assets/index-DIIaROQi.js","/assets/vendor-react-spjDHvdB.js","/assets/shared-utils-CoyMcgY7.js","/assets/vendor-icons-DmTakvj8.js","/assets/vendor-firebase-_fajLqox.js","/assets/index-B2MOX-f0.css","/prevent-pull-to-refresh.js","/reload-on-chunk-error.js","/favicon.svg","/manifest.webmanifest"];

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
