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
const VERSION = 'b9422781ba79';
const CACHE = 'ycx-shell-' + VERSION;
const PRECACHE = ["/assets/AboutView-CvyOl_el.js","/assets/AreaAutoExportButton-DncahnM-.js","/assets/Badge-iK8vjF0x.js","/assets/Banner-DQv8aNQq.js","/assets/BiWrapper-BWIBdCd9.js","/assets/BiWrapper-DMR52XUc.css","/assets/ChangelogModal-BxF_ZW7-.js","/assets/CheckThuongView-B8hbevDS.js","/assets/Checkbox-mU1VFn9R.js","/assets/ConfirmDialog-wL_b8wv-.js","/assets/CouponConverterView-BY56ttkV.js","/assets/DashboardView-ZAAmhzEt.js","/assets/DataUpdater-B8hmlIFF.js","/assets/EmployeeAnalysis-C_v0JLXw.js","/assets/EmptyState-DIH5t7nA.js","/assets/ExportOptionsModal-BgUfViRQ.js","/assets/ExternalToolView-_ZslFrro.js","/assets/FileHistoryModal-CGl0tB-8.js","/assets/FileNamingModal-CHwkG1zA.js","/assets/GlobalAutoSyncDock-BpeaIHoD.js","/assets/IndustryGrid-D_n4RTTC.js","/assets/InstallAppHint-B6GPzbDC.js","/assets/KhaiThacView-CdZZeWoR.js","/assets/KpiCard-Dwi3I_Uo.js","/assets/KpiCardConfigModal-DS_fDFvb.js","/assets/LineBotView-CuGpztsY.js","/assets/ListGroup-D-fT9UnD.js","/assets/LoginView-rQoXY5rK.js","/assets/MobileMoreSheet-DAMnLQ_7.js","/assets/Modal-DkLcYNCV.js","/assets/MultiSelectDropdown-DXyLeTOc.js","/assets/NhanVien-D8pKxIza.js","/assets/NotificationDropdown-Q1foXMrU.js","/assets/PendingApprovalView-BB4fgmnJ.js","/assets/PerformanceModal-DvCaj9Z0.js","/assets/PhanCaView-CAA0vulx.css","/assets/PhanCaView-CmVU8JhU.js","/assets/PriceComparisonView-OP0YslC_.js","/assets/SectionCard-Be0uXPGY.js","/assets/SectionHeader-DeRnraGv.js","/assets/Select-BD1q0AJI.js","/assets/SettingsView-D6bwHDrM.js","/assets/ShiftWarehouseInputModal-DG7ZISEd.js","/assets/StickerEventApp-aj8WGVYF.js","/assets/StickerPrinterView-CvGtmWyM.js","/assets/StringMultiSelect-CCHVCwrd.js","/assets/SummaryTable-BR-lUL-I.js","/assets/Switch-ClM_08QE.js","/assets/Tabs-BSa9oKiF.js","/assets/TaxCalculatorView-DeIVgbTY.js","/assets/Textarea-CKFI_v3I.js","/assets/TouchTitleHint-pfeoifhw.js","/assets/TrendChart-C-5d2TBL.js","/assets/UncollectedOrdersModal-BV-26JCA.js","/assets/UnconfiguredGroupsModal-DhiaIabU.js","/assets/UnshippedOrdersModal-BS-zHYx6.js","/assets/UploadConflictModal-BQdPiBlk.js","/assets/UploadTypeSelectionModal-BXaX1A8Z.js","/assets/UserManagementView-YEJkAJSx.js","/assets/analysisEmployeeSyncService-VL_7jDBf.js","/assets/analytics.worker-BfRBJyQG.js","/assets/analytics.worker-CCAy1kzZ.js","/assets/analytics.worker-CxIdJA8C.js","/assets/autoNavigationService-BNl7DZWy.js","/assets/autoReportExportService-C6P5LQfq.js","/assets/captureEngine-ByrjkFQ7.js","/assets/chartConfig-C-f7hsgo.js","/assets/checkThuongIframeService-Bls5_Uvf.js","/assets/cloudDataService-DUYoy91w.js","/assets/configStore-jfv_oEyo.js","/assets/dataService-H-hH4uMq.js","/assets/dataUtils-CHUU_Qbf.js","/assets/dbService-CE6c0A2H.js","/assets/firebaseProductConfigService-iJX4mdqA.js","/assets/googleSheetsService-BGBmW1BJ.js","/assets/googleSheetsService-D0LTBUzq.js","/assets/html2canvas.esm-QH1iLAAe.js","/assets/index-B52WWcJM.js","/assets/index-BIFoWCtc.js","/assets/index-CgJtiJsK.js","/assets/index-DuaGrbqz.js","/assets/index-XydFv-Yi.css","/assets/index.es-D-ALPlTe.js","/assets/industryColors-NaMQqhES.js","/assets/jspdf.es.min-CB1QsVd2.js","/assets/khaiThacDb-0wnt9Z0M.js","/assets/khoDataService-CHnEJ_5-.js","/assets/lineBot.types-JL-2exNw.js","/assets/moTaBoLoc-B6sNO7U6.js","/assets/presetBi-BBERXEZ0.js","/assets/salesJsonWriter.worker-BNAYiZX6.js","/assets/salesJsonWriter.worker-iky0iAuj.js","/assets/scheduleHeartbeat.worker-DY9MOOqR.js","/assets/shared-utils-CoyMcgY7.js","/assets/summaryService-l1IrVhKl.js","/assets/systemAnnouncementService-UBtlagGE.js","/assets/useBiAutoSync-D_TwaO-I.js","/assets/useMultiMonthBonusRun-uLFllIFt.js","/assets/vendor-charts-CNaQ3TAb.js","/assets/vendor-excel-BGhuli8m.js","/assets/vendor-firebase-C6cs38PV.js","/assets/vendor-firebase-analytics-BlcBQ8K_.js","/assets/vendor-icons-DmTakvj8.js","/assets/vendor-react-spjDHvdB.js","/assets/worker-C3Ehuode.js","/assets/ycxAutoSyncService--k61RMRm.js","/favicon.svg","/icons/apple-touch-icon-120.png","/icons/apple-touch-icon-152.png","/icons/apple-touch-icon-167.png","/icons/apple-touch-icon-180.png","/icons/icon-192.png","/icons/icon-512.png","/icons/icon-maskable-512.png","/manifest.webmanifest","/prevent-pull-to-refresh.js","/reload-on-chunk-error.js"];
const CORE = ["/assets/index-B52WWcJM.js","/assets/vendor-react-spjDHvdB.js","/assets/shared-utils-CoyMcgY7.js","/assets/vendor-icons-DmTakvj8.js","/assets/vendor-firebase-C6cs38PV.js","/assets/index-XydFv-Yi.css","/prevent-pull-to-refresh.js","/reload-on-chunk-error.js","/favicon.svg","/manifest.webmanifest"];

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
