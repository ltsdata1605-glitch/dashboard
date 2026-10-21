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
const VERSION = 'b5587c13a22f';
const CACHE = 'ycx-shell-' + VERSION;
const PRECACHE = ["/assets/AboutView-DmYfWq-k.js","/assets/AreaAutoExportButton-kzr3l0Nx.js","/assets/Badge-iK8vjF0x.js","/assets/Banner-B_XaUGSs.js","/assets/BiWrapper-Bn8CHaFJ.js","/assets/BiWrapper-DMR52XUc.css","/assets/ChangelogModal-C3THEYNi.js","/assets/CheckThuongView-DMRwujVq.js","/assets/Checkbox-mU1VFn9R.js","/assets/ConfirmDialog-juOZvkb6.js","/assets/CouponConverterView-CQIb13KL.js","/assets/DashboardView-CmZEBEZY.js","/assets/DataUpdater-CgY3iiez.js","/assets/EmployeeAnalysis-D5ovgEUl.js","/assets/EmptyState-twUMqBXv.js","/assets/ExportOptionsModal-ueS3BV49.js","/assets/ExternalToolView-_ZslFrro.js","/assets/FileHistoryModal-BKqVhBkv.js","/assets/FileNamingModal-BNWR1NOn.js","/assets/GlobalAutoSyncDock-C85Gkhxh.js","/assets/IndustryGrid-Fp75Iw9k.js","/assets/InstallAppHint-CGTPHde7.js","/assets/KhaiThacView-BzR2Ws-J.js","/assets/KpiCard-Q5OIkaiI.js","/assets/KpiCardConfigModal-DiIP3k-E.js","/assets/LineBotView-B_AJwucK.js","/assets/ListGroup-CWERns6e.js","/assets/LoginView-jd9KAF6Q.js","/assets/MobileMoreSheet-oGeQ_TZ8.js","/assets/Modal-B1vTgV79.js","/assets/MultiSelectDropdown-BzwMT0T2.js","/assets/NhanVien-Dstuc5bB.js","/assets/NotificationDropdown-C9NNduNT.js","/assets/PendingApprovalView-TPJeeokC.js","/assets/PerformanceModal-ynX7zgDH.js","/assets/PhanCaView-BkJFcNa0.js","/assets/PhanCaView-CAA0vulx.css","/assets/PriceComparisonView-CyK5BLKz.js","/assets/SectionCard-Be0uXPGY.js","/assets/SectionHeader-U_wXv_z1.js","/assets/Select-B5SwDm6v.js","/assets/SettingsView-DebuqGG2.js","/assets/ShiftWarehouseInputModal-PgKGVDvX.js","/assets/StickerEventApp-CzqcfNfu.js","/assets/StickerPrinterView-1fyDYFK3.js","/assets/StringMultiSelect-BsmK_p3E.js","/assets/SummaryTable-r_Re17ax.js","/assets/Switch-Z0HbB1vd.js","/assets/Tabs-D1yFtOlO.js","/assets/TaxCalculatorView-CpzFW4Ew.js","/assets/Textarea-CKFI_v3I.js","/assets/TouchTitleHint-pfeoifhw.js","/assets/TrendChart-B4Z9OcvT.js","/assets/UncollectedOrdersModal-lWg1OdOk.js","/assets/UnconfiguredGroupsModal-gMIBYj3T.js","/assets/UnshippedOrdersModal-DOW6uvY4.js","/assets/UploadConflictModal-DyxqFMk8.js","/assets/UploadTypeSelectionModal-fkDtuNWC.js","/assets/UserManagementView-BkXZ-Di7.js","/assets/analysisEmployeeSyncService-cPdGUv6p.js","/assets/analytics.worker-BfRBJyQG.js","/assets/analytics.worker-CCAy1kzZ.js","/assets/analytics.worker-CxIdJA8C.js","/assets/autoNavigationService-DjdiK1F-.js","/assets/autoReportExportService-CkrV3uLY.js","/assets/captureEngine-g90n7AA2.js","/assets/chartConfig-C-f7hsgo.js","/assets/checkThuongIframeService-CPf_K8r9.js","/assets/cloudDataService-DSMxj9sx.js","/assets/configStore-jfv_oEyo.js","/assets/dataService-DQXQk-as.js","/assets/dataUtils-C-rdQlGG.js","/assets/dbService-C26vf4vT.js","/assets/firebaseProductConfigService-DBJYuKtP.js","/assets/googleSheetsService-BGBmW1BJ.js","/assets/googleSheetsService-D0LTBUzq.js","/assets/html2canvas.esm-QH1iLAAe.js","/assets/index-BIFoWCtc.js","/assets/index-CgJtiJsK.js","/assets/index-DuaGrbqz.js","/assets/index-HhUBmffK.css","/assets/index-rrKQdM_G.js","/assets/index.es-DEbQ88Vm.js","/assets/industryColors-NaMQqhES.js","/assets/jspdf.es.min-CuTL35Hd.js","/assets/khaiThacDb-DQio9-N6.js","/assets/khoDataService-B6ldsJGR.js","/assets/lineBot.types-CUPe5ejo.js","/assets/moTaBoLoc-B6sNO7U6.js","/assets/presetBi-Cr3_UOU9.js","/assets/salesJsonWriter.worker-BNAYiZX6.js","/assets/salesJsonWriter.worker-iky0iAuj.js","/assets/scheduleHeartbeat.worker-DY9MOOqR.js","/assets/shared-utils-CoyMcgY7.js","/assets/summaryService-BcYuNx8Z.js","/assets/systemAnnouncementService-DVReJYY2.js","/assets/useBiAutoSync-BFNPsLRN.js","/assets/useMultiMonthBonusRun-B8-euaeu.js","/assets/vendor-charts-CNaQ3TAb.js","/assets/vendor-excel-BGhuli8m.js","/assets/vendor-firebase-_fajLqox.js","/assets/vendor-firebase-analytics-Cg8H9SI1.js","/assets/vendor-icons-DmTakvj8.js","/assets/vendor-react-spjDHvdB.js","/assets/worker-C3Ehuode.js","/assets/ycxAutoSyncService--k61RMRm.js","/favicon.svg","/icons/apple-touch-icon-120.png","/icons/apple-touch-icon-152.png","/icons/apple-touch-icon-167.png","/icons/apple-touch-icon-180.png","/icons/icon-192.png","/icons/icon-512.png","/icons/icon-maskable-512.png","/manifest.webmanifest","/prevent-pull-to-refresh.js","/reload-on-chunk-error.js"];
const CORE = ["/assets/index-rrKQdM_G.js","/assets/vendor-react-spjDHvdB.js","/assets/shared-utils-CoyMcgY7.js","/assets/vendor-icons-DmTakvj8.js","/assets/vendor-firebase-_fajLqox.js","/assets/index-HhUBmffK.css","/prevent-pull-to-refresh.js","/reload-on-chunk-error.js","/favicon.svg","/manifest.webmanifest"];

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
