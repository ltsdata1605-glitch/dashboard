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
const VERSION = 'd858c1dda8ff';
const CACHE = 'ycx-shell-' + VERSION;
const PRECACHE = ["/assets/AboutView-yWAxfKPg.js","/assets/AreaAutoExportButton-CZNhEyCB.js","/assets/Badge-iK8vjF0x.js","/assets/Banner-BOo68cod.js","/assets/BiWrapper-D2pFSsRx.js","/assets/BiWrapper-DMR52XUc.css","/assets/ChangelogModal-YPM2W666.js","/assets/CheckThuongView-Co-2IroC.js","/assets/Checkbox-mU1VFn9R.js","/assets/ConfirmDialog-B07I4hUP.js","/assets/CouponConverterView-CRkA309E.js","/assets/DashboardView-NJbE-HZ5.js","/assets/DataUpdater-tWH1CY_y.js","/assets/EmployeeAnalysis-PPWBbxbq.js","/assets/EmptyState-Cg5sL2q6.js","/assets/ExportOptionsModal-8LHVeYjn.js","/assets/ExternalToolView-_ZslFrro.js","/assets/FileHistoryModal-C4ll53yO.js","/assets/FileNamingModal-CMpRCkqr.js","/assets/GlobalAutoSyncDock-CNsPHRkL.js","/assets/IndustryGrid-BuP2Sq7E.js","/assets/Input-BxoBsip6.js","/assets/InstallAppHint-Dmnn2AWj.js","/assets/KhaiThacView-DDZb0qO2.js","/assets/KpiCard-CqPLuP6f.js","/assets/KpiCardConfigModal-BGBH8tZS.js","/assets/LineBotView-B6fhpdHG.js","/assets/ListGroup-BBnnn83Y.js","/assets/LoginView-ItcWOc7H.js","/assets/MobileMoreSheet-4Qcovc04.js","/assets/Modal-D_19qfhA.js","/assets/MultiSelectDropdown-LO55IxO7.js","/assets/NhanVien-DXn7OSr_.js","/assets/NotificationDropdown-Cgru1ucK.js","/assets/PendingApprovalView-D1730DJo.js","/assets/PerformanceModal-C1hdrXRa.js","/assets/PhanCaView-CAA0vulx.css","/assets/PhanCaView-oAPbsfPe.js","/assets/PriceComparisonView-Bs9G_69T.js","/assets/SectionCard-Be0uXPGY.js","/assets/SectionHeader-RSWN9__8.js","/assets/Select-CfYsFl6M.js","/assets/SettingsView-BxGGKQF8.js","/assets/ShiftWarehouseInputModal-aAF_nRQt.js","/assets/StickerEventApp-BuEQ_vpI.js","/assets/StickerPrinterView-Bca1fro9.js","/assets/StringMultiSelect-oPwaM0Iq.js","/assets/SummaryTable-BZlmJkJS.js","/assets/Switch-dpoJqGHT.js","/assets/Tabs-DR1CkyqN.js","/assets/TaxCalculatorView-CwoIFi6n.js","/assets/Textarea-CKFI_v3I.js","/assets/TouchTitleHint-pfeoifhw.js","/assets/TrendChart-Dj0aoKOS.js","/assets/UncollectedOrdersModal-D5jBBcXl.js","/assets/UnconfiguredGroupsModal-CzyBtc6k.js","/assets/UnshippedOrdersModal-Dg-tkqyH.js","/assets/UploadConflictModal-Dw2HgU34.js","/assets/UploadTypeSelectionModal-D9Cc9G7r.js","/assets/UserManagementView-D7dScdqT.js","/assets/analysisEmployeeSyncService-C22TCTZY.js","/assets/analytics.worker-BfRBJyQG.js","/assets/analytics.worker-CCAy1kzZ.js","/assets/analytics.worker-CxIdJA8C.js","/assets/autoNavigationService-CWDeLo5p.js","/assets/autoReportExportService-DYIMDVHk.js","/assets/captureEngine-BjLhgold.js","/assets/chartConfig-C-f7hsgo.js","/assets/checkThuongIframeService-UPJGa4qG.js","/assets/cloudDataService-BBINRBS8.js","/assets/configStore-jfv_oEyo.js","/assets/dataService-BWu2Ig9b.js","/assets/dataUtils-ByiMv2no.js","/assets/dbService-B8dN2wSy.js","/assets/firebaseProductConfigService-BvfyDb3x.js","/assets/googleSheetsService-BGBmW1BJ.js","/assets/googleSheetsService-D0LTBUzq.js","/assets/html2canvas.esm-QH1iLAAe.js","/assets/index-6z5h_-qu.css","/assets/index-BIFoWCtc.js","/assets/index-CgJtiJsK.js","/assets/index-DuaGrbqz.js","/assets/index-xGsSq_7P.js","/assets/index.es-DikaxDbT.js","/assets/industryColors-NaMQqhES.js","/assets/jspdf.es.min-Bx_zenRy.js","/assets/khaiThacDb-DFElEwtA.js","/assets/khoDataService-D6ZwdYlo.js","/assets/lineBot.types-Bq2qtbwo.js","/assets/moTaBoLoc-B6sNO7U6.js","/assets/presetBi-BpAWt0v7.js","/assets/salesJsonWriter.worker-BNAYiZX6.js","/assets/salesJsonWriter.worker-iky0iAuj.js","/assets/scheduleHeartbeat.worker-DY9MOOqR.js","/assets/shared-utils-CoyMcgY7.js","/assets/summaryService-CSJ2hdoW.js","/assets/systemAnnouncementService-BWLsKGbT.js","/assets/useBiAutoSync-B5io2Kun.js","/assets/useMultiMonthBonusRun-DK7RPcbX.js","/assets/vendor-charts-CNaQ3TAb.js","/assets/vendor-excel-BGhuli8m.js","/assets/vendor-firebase-_fajLqox.js","/assets/vendor-firebase-analytics-Cg8H9SI1.js","/assets/vendor-icons-DmTakvj8.js","/assets/vendor-react-spjDHvdB.js","/assets/worker-C3Ehuode.js","/assets/ycxAutoSyncService--k61RMRm.js","/favicon.svg","/icons/apple-touch-icon-120.png","/icons/apple-touch-icon-152.png","/icons/apple-touch-icon-167.png","/icons/apple-touch-icon-180.png","/icons/icon-192.png","/icons/icon-512.png","/icons/icon-maskable-512.png","/manifest.webmanifest","/prevent-pull-to-refresh.js","/reload-on-chunk-error.js"];
const CORE = ["/assets/index-xGsSq_7P.js","/assets/vendor-react-spjDHvdB.js","/assets/shared-utils-CoyMcgY7.js","/assets/vendor-icons-DmTakvj8.js","/assets/vendor-firebase-_fajLqox.js","/assets/index-6z5h_-qu.css","/prevent-pull-to-refresh.js","/reload-on-chunk-error.js","/favicon.svg","/manifest.webmanifest"];

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
