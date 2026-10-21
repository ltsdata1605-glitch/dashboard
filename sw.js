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
const VERSION = '2f06fb966ad1';
const CACHE = 'ycx-shell-' + VERSION;
const PRECACHE = ["/assets/AboutView-CmJ_Ocpe.js","/assets/AreaAutoExportButton-t6LfjOer.js","/assets/Badge-iK8vjF0x.js","/assets/Banner-07BjAHDq.js","/assets/BiWrapper-3lvs__Hi.js","/assets/BiWrapper-DMR52XUc.css","/assets/ChangelogModal-D0Ox1RL7.js","/assets/CheckThuongView-BuPRKLwG.js","/assets/Checkbox-mU1VFn9R.js","/assets/ConfirmDialog-4vsxhbuJ.js","/assets/CouponConverterView-qs8znEYc.js","/assets/DashboardView-CTOiXPpS.js","/assets/DataUpdater-RaSkhcI9.js","/assets/EmployeeAnalysis-DnZSqLF8.js","/assets/EmptyState-DFiyzikG.js","/assets/ExportOptionsModal-S5cbpUQz.js","/assets/ExternalToolView-_ZslFrro.js","/assets/FileHistoryModal-_2qTNaFl.js","/assets/FileNamingModal-CeA9eJTo.js","/assets/GlobalAutoSyncDock-BAGK_O-M.js","/assets/IndustryGrid-65CF6WbX.js","/assets/InstallAppHint-B02Tjo_A.js","/assets/KhaiThacView-yapQgtk3.js","/assets/KpiCard-ithXKjLn.js","/assets/KpiCardConfigModal-CnE1WBRj.js","/assets/LineBotView-B5lGTCxp.js","/assets/ListGroup-BOLlPVo7.js","/assets/LoginView-8b-W-YPx.js","/assets/MobileMoreSheet-JId3yvcm.js","/assets/Modal-CsHGX7RH.js","/assets/MultiSelectDropdown-BVODZFgI.js","/assets/NhanVien-D2YSCbS3.js","/assets/NotificationDropdown-BjQQj8wP.js","/assets/PendingApprovalView-D6D6lZKx.js","/assets/PerformanceModal-CUHMEVbM.js","/assets/PhanCaView-CAA0vulx.css","/assets/PhanCaView-s_9dNEfJ.js","/assets/PriceComparisonView-CEcV9Ztu.js","/assets/SectionCard-Be0uXPGY.js","/assets/SectionHeader-DXdwhTVl.js","/assets/Select-BfQEt2Q1.js","/assets/SettingsView-Ddn4MQ1r.js","/assets/ShiftWarehouseInputModal-B37c5F31.js","/assets/StickerEventApp-CzFhHJl6.js","/assets/StickerPrinterView-BOGkm3eM.js","/assets/StringMultiSelect-Dp8BLLp8.js","/assets/SummaryTable-Cdy3ZcMY.js","/assets/Switch-VuwoKc89.js","/assets/Tabs-DHNQ73s8.js","/assets/TaxCalculatorView-rD3gN3xn.js","/assets/Textarea-CKFI_v3I.js","/assets/TouchTitleHint-pfeoifhw.js","/assets/TrendChart-C_EHHfjo.js","/assets/UncollectedOrdersModal-DFQVJg1A.js","/assets/UnconfiguredGroupsModal-BBntmVtG.js","/assets/UnshippedOrdersModal-CIy_nqS4.js","/assets/UploadConflictModal-w2MLtr0_.js","/assets/UploadTypeSelectionModal-Vle09OSQ.js","/assets/UserManagementView-BKfV6wgi.js","/assets/analysisEmployeeSyncService-DLjdVIv3.js","/assets/analytics.worker-BfRBJyQG.js","/assets/analytics.worker-CCAy1kzZ.js","/assets/analytics.worker-CxIdJA8C.js","/assets/autoNavigationService-Am4DWWL7.js","/assets/autoReportExportService-Cu1ubBoW.js","/assets/captureEngine-BHVLlX0y.js","/assets/chartConfig-C-f7hsgo.js","/assets/checkThuongIframeService-CxdQRIUI.js","/assets/cloudDataService-DUId7wyo.js","/assets/configStore-jfv_oEyo.js","/assets/dataService-8SU7i4p5.js","/assets/dataUtils-B5WjGy17.js","/assets/dbService-D2EjUEny.js","/assets/firebaseProductConfigService-DUDZxdhT.js","/assets/googleSheetsService-BGBmW1BJ.js","/assets/googleSheetsService-D0LTBUzq.js","/assets/html2canvas.esm-QH1iLAAe.js","/assets/index-B2MOX-f0.css","/assets/index-B4g7X6lK.js","/assets/index-BIFoWCtc.js","/assets/index-CgJtiJsK.js","/assets/index-DuaGrbqz.js","/assets/index.es-BzGpcvYY.js","/assets/industryColors-NaMQqhES.js","/assets/jspdf.es.min-DfvafIr7.js","/assets/khaiThacDb-DcfnQfAj.js","/assets/khoDataService-DZQLymqp.js","/assets/lineBot.types-ODjyMIaK.js","/assets/moTaBoLoc-B6sNO7U6.js","/assets/presetBi-2NbA64lF.js","/assets/salesJsonWriter.worker-BNAYiZX6.js","/assets/salesJsonWriter.worker-iky0iAuj.js","/assets/scheduleHeartbeat.worker-DY9MOOqR.js","/assets/shared-utils-CoyMcgY7.js","/assets/summaryService-BgXypqyq.js","/assets/systemAnnouncementService-D2ihXtx5.js","/assets/useBiAutoSync-DkQxYqT-.js","/assets/useMultiMonthBonusRun-C9uc9-6g.js","/assets/vendor-charts-CNaQ3TAb.js","/assets/vendor-excel-BGhuli8m.js","/assets/vendor-firebase-DVZPizMJ.js","/assets/vendor-firebase-analytics-5cGotuqA.js","/assets/vendor-icons-DmTakvj8.js","/assets/vendor-react-spjDHvdB.js","/assets/worker-C3Ehuode.js","/assets/ycxAutoSyncService--k61RMRm.js","/favicon.svg","/icons/apple-touch-icon-120.png","/icons/apple-touch-icon-152.png","/icons/apple-touch-icon-167.png","/icons/apple-touch-icon-180.png","/icons/icon-192.png","/icons/icon-512.png","/icons/icon-maskable-512.png","/manifest.webmanifest","/prevent-pull-to-refresh.js","/reload-on-chunk-error.js"];
const CORE = ["/assets/index-B4g7X6lK.js","/assets/vendor-react-spjDHvdB.js","/assets/shared-utils-CoyMcgY7.js","/assets/vendor-icons-DmTakvj8.js","/assets/vendor-firebase-DVZPizMJ.js","/assets/index-B2MOX-f0.css","/prevent-pull-to-refresh.js","/reload-on-chunk-error.js","/favicon.svg","/manifest.webmanifest"];

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
