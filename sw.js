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
const VERSION = '9d3b8e702939';
const CACHE = 'ycx-shell-' + VERSION;
const PRECACHE = ["/assets/AboutView-VqKJrOmL.js","/assets/AreaAutoExportButton-CFrzEtE_.js","/assets/Badge-B2WWRDU5.js","/assets/Banner-HwhucpX4.js","/assets/BiWrapper-DMR52XUc.css","/assets/BiWrapper-YDnZmtO2.js","/assets/ChangelogModal-Bs1Sf--c.js","/assets/CheckThuongView-GXXKEeye.js","/assets/Checkbox-erM004yg.js","/assets/ConfirmDialog-BKDDuBoT.js","/assets/CouponConverterView-DRpv7lVO.js","/assets/DashboardView-8CgvWHu-.js","/assets/DataUpdater-_1AFcSfW.js","/assets/EmployeeAnalysis-DHKNPjDY.js","/assets/EmptyState-D3utRFRY.js","/assets/ExportOptionsModal-p7PNc7hX.js","/assets/ExternalToolView-_ZslFrro.js","/assets/FileHistoryModal-D39U8YPB.js","/assets/FileNamingModal-CVTzYCs3.js","/assets/GlobalAutoSyncDock-ChiHQeVp.js","/assets/IndustryGrid-p1XazpB9.js","/assets/InstallAppHint-Dr3PoDLq.js","/assets/KhaiThacView-Ztf1zXvw.js","/assets/KpiCard-B317iw1A.js","/assets/KpiCardConfigModal-Cjfj3pmq.js","/assets/LineBotView-DWWoOaBQ.js","/assets/ListGroup-n9E8hvBR.js","/assets/LoginView-C4d-NVqL.js","/assets/MobileMoreSheet-B4U54VuH.js","/assets/Modal-BP88WL5E.js","/assets/MultiSelectDropdown-BLlJnSOO.js","/assets/NhanVien-CXpWLOyK.js","/assets/NotificationDropdown-DMSqEhKG.js","/assets/PendingApprovalView-BRcUxQKl.js","/assets/PerformanceModal-B62c4DPL.js","/assets/PhanCaView-C5PmBPZL.js","/assets/PhanCaView-CAA0vulx.css","/assets/PriceComparisonView-Cziwmnes.js","/assets/SectionCard-B-drYcSA.js","/assets/SectionHeader-CdJuDb-p.js","/assets/Select-BvnXJn4-.js","/assets/SettingsView-DWK0pHNt.js","/assets/ShiftWarehouseInputModal-Cg3ZMOVi.js","/assets/StickerEventApp-BvBwenKd.js","/assets/StickerPrinterView-DPdn8pJV.js","/assets/StringMultiSelect-DzjKHsAn.js","/assets/SummaryTable-B7LwiB2u.js","/assets/Switch-sqHVEshY.js","/assets/Tabs-C4RMYwkv.js","/assets/TaxCalculatorView-DJ2O46zR.js","/assets/Textarea-DfYp8IZh.js","/assets/TopBarActions-Dd4-M8mp.js","/assets/TouchTitleHint-pfeoifhw.js","/assets/TrendChart-DVlqcZ77.js","/assets/UncollectedOrdersModal-CZQ3a8HM.js","/assets/UnconfiguredGroupsModal-BgzTx7x8.js","/assets/UnshippedOrdersModal-g_ltQW7b.js","/assets/UploadConflictModal-onm_0Hxi.js","/assets/UploadTypeSelectionModal-BbntJ1u4.js","/assets/UserManagementView-ttOUsbq-.js","/assets/analysisEmployeeSyncService-CUn_gImC.js","/assets/analytics.worker-C_xmZIXD.js","/assets/analytics.worker-CxIdJA8C.js","/assets/analytics.worker-DxUz-NXp.js","/assets/autoNavigationService-COpBmHlO.js","/assets/autoReportExportService-C4ETLH06.js","/assets/captureEngine-cOiFWUYh.js","/assets/chartConfig-C-f7hsgo.js","/assets/checkThuongIframeService-DV0-sJql.js","/assets/cloudDataService-mE9EHdYU.js","/assets/configStore-jfv_oEyo.js","/assets/dataService-kPvAQIwn.js","/assets/dataUtils-IgtIZMNG.js","/assets/dbService-BtrN39Cf.js","/assets/firebaseProductConfigService-DMv_iT66.js","/assets/googleSheetsService-BGBmW1BJ.js","/assets/googleSheetsService-D0LTBUzq.js","/assets/html2canvas.esm-QH1iLAAe.js","/assets/index-0Iq5U4bY.js","/assets/index-BIFoWCtc.js","/assets/index-CgJtiJsK.js","/assets/index-DiagrUmq.css","/assets/index-DuaGrbqz.js","/assets/index.es-gBhw62_u.js","/assets/industryColors-NaMQqhES.js","/assets/jspdf.es.min-UfurAeMS.js","/assets/khaiThacDb-t_8ULUqo.js","/assets/khoDataService-DdOfRRQF.js","/assets/lineBot.types-CyAVx9Ra.js","/assets/moTaBoLoc-B6sNO7U6.js","/assets/presetBi-QSBcphMr.js","/assets/salesJsonWriter.worker-BNAYiZX6.js","/assets/salesJsonWriter.worker-iky0iAuj.js","/assets/scheduleHeartbeat.worker-DY9MOOqR.js","/assets/shared-utils-B_Pb1ZNr.js","/assets/summaryService-Cm7_OSGg.js","/assets/systemAnnouncementService-D5lukw0Z.js","/assets/useBiAutoSync-C5F15Mcg.js","/assets/useMultiMonthBonusRun-BSbojX6S.js","/assets/vendor-charts-C3TwIp4Y.js","/assets/vendor-excel-BGhuli8m.js","/assets/vendor-firebase-DVZPizMJ.js","/assets/vendor-firebase-analytics-5cGotuqA.js","/assets/vendor-icons-DmTakvj8.js","/assets/vendor-react-spjDHvdB.js","/assets/worker-C3Ehuode.js","/assets/ycxAutoSyncService--k61RMRm.js","/favicon.svg","/fonts/UTM AvoBold.ttf","/icons/apple-touch-icon-120.png","/icons/apple-touch-icon-152.png","/icons/apple-touch-icon-167.png","/icons/apple-touch-icon-180.png","/icons/icon-192.png","/icons/icon-512.png","/icons/icon-maskable-512.png","/man-cho-khoi-dong.js","/manifest.webmanifest","/prevent-pull-to-refresh.js","/reload-on-chunk-error.js"];
const CORE = ["/assets/index-0Iq5U4bY.js","/assets/vendor-react-spjDHvdB.js","/assets/shared-utils-B_Pb1ZNr.js","/assets/vendor-icons-DmTakvj8.js","/assets/vendor-firebase-DVZPizMJ.js","/assets/index-DiagrUmq.css","/prevent-pull-to-refresh.js","/reload-on-chunk-error.js","/man-cho-khoi-dong.js","/fonts/UTM AvoBold.ttf","/favicon.svg","/manifest.webmanifest"];

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
