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
const VERSION = 'ff217453c84b';
const CACHE = 'ycx-shell-' + VERSION;
const PRECACHE = ["/assets/AboutView-DD4OVKdc.js","/assets/Badge-Zes1F2RM.js","/assets/BiWrapper-B-B7LM0_.js","/assets/BiWrapper-BL2OLMls.css","/assets/ChangelogModal-BQqhb8iP.js","/assets/CheckThuongView-CAlCmT4Y.js","/assets/ConfirmDialog-Dr_X3bt6.js","/assets/CouponConverterView-137tur9C.js","/assets/DashboardView-_m7NhFeH.js","/assets/DataUpdater-CebEWDqC.js","/assets/EmployeeAnalysis-DpJmr66T.js","/assets/ExportOptionsModal-DuTKV5g0.js","/assets/ExternalToolView-YDuwWcGf.js","/assets/FileHistoryModal-CXJWmY4Z.js","/assets/FileNamingModal-C7dbmhgo.js","/assets/FontSelector-D2Y6p4qD.js","/assets/GlobalAutoSyncDock-9TYT_P7T.js","/assets/IndustryGrid-BQRNMnQP.js","/assets/Input-Du1km4hY.js","/assets/KhaiThacView-B13-C4P6.js","/assets/KpiCard-DZS0Miu1.js","/assets/KpiCardConfigModal-CX2DQRCS.js","/assets/LineBotView-CLEt4n2A.js","/assets/LoginView-BIZHgmg9.js","/assets/MultiSelectDropdown-DJOdNEAR.js","/assets/NhanVien-B-EWO5Ub.js","/assets/PendingApprovalView-DLhAhp3w.js","/assets/PerformanceModal-YX7N8WUw.js","/assets/PhanCaView-CYYjc8a5.css","/assets/PhanCaView-Csd2ma08.js","/assets/PriceComparisonView-xnVqMTqH.js","/assets/SectionCard-cXdS7W7l.js","/assets/SectionHeader-7tX7aTsf.js","/assets/Select-BgL0Swbd.js","/assets/SettingsView-DlD4hp9J.js","/assets/StickerEventApp-B_rKhMac.js","/assets/StickerPrinterView-xxwXd7Hy.js","/assets/SummaryTable-CwyVYSOb.js","/assets/Tabs-ChEmSOwS.js","/assets/TaxCalculatorView-BY2rFHJS.js","/assets/TrendChart-DDtp-1s1.js","/assets/UncollectedOrdersModal-BHDHHJmi.js","/assets/UnconfiguredGroupsModal-C1EM7v3-.js","/assets/UnshippedOrdersModal-DxV0qb1t.js","/assets/UploadConflictModal-DLdFJo1A.js","/assets/UploadTypeSelectionModal-FZlrWf-6.js","/assets/UserManagementView-C9ILCYuK.js","/assets/analysisEmployeeSyncService-DwwdplbC.js","/assets/analytics.worker-Bb4EaEVA.js","/assets/analytics.worker-DPngphgu.js","/assets/analytics.worker-D_9AshrL.js","/assets/autoNavigationService-DUio3Cx6.js","/assets/captureEngine-CE48fjt6.js","/assets/chartConfig-C-f7hsgo.js","/assets/checkThuongIframeService-BCUF_1xO.js","/assets/cloudDataService-CQ77M2lR.js","/assets/configStore-jfv_oEyo.js","/assets/dataService-Cw39KojQ.js","/assets/dbService-k7PR_LeY.js","/assets/firebaseProductConfigService-Cv-1jCEV.js","/assets/googleSheetsService-BGBmW1BJ.js","/assets/googleSheetsService-D0LTBUzq.js","/assets/html2canvas.esm-QH1iLAAe.js","/assets/index-BDnrL_nD.css","/assets/index-BbJu6AQY.js","/assets/index-CgJtiJsK.js","/assets/index-Cok6S9gG.js","/assets/index-UJXyOd9Y.js","/assets/index.es-Ci-yZ2e1.js","/assets/jspdf.es.min-Bv84tZCo.js","/assets/khaiThacDb-CXYMH1vY.js","/assets/khoDataService-BF-KUq4r.js","/assets/legacyIconNames-DofJBgK7.js","/assets/presetBi-CZPnh30U.js","/assets/salesJsonWriter.worker-BNAYiZX6.js","/assets/salesJsonWriter.worker-iky0iAuj.js","/assets/scheduleHeartbeat.worker-DY9MOOqR.js","/assets/shared-utils-CoyMcgY7.js","/assets/summaryService-ChWVpezF.js","/assets/useBiAutoSync-Jskdx9k7.js","/assets/useMultiMonthBonusRun-ugrVJCCp.js","/assets/vendor-charts-cgUzaFZk.js","/assets/vendor-excel-BGhuli8m.js","/assets/vendor-firebase-BCRBG8gK.js","/assets/vendor-firebase-analytics-BQ3Ho__8.js","/assets/vendor-icons-CmCra2aO.js","/assets/vendor-react-BFsc7Y4G.js","/assets/worker-DwBw6rNm.js","/favicon.svg","/icons/apple-touch-icon-120.png","/icons/apple-touch-icon-152.png","/icons/apple-touch-icon-167.png","/icons/apple-touch-icon-180.png","/icons/icon-192.png","/icons/icon-512.png","/icons/icon-maskable-512.png","/manifest.webmanifest","/prevent-pull-to-refresh.js","/reload-on-chunk-error.js"];
const CORE = ["/assets/index-UJXyOd9Y.js","/assets/vendor-react-BFsc7Y4G.js","/assets/shared-utils-CoyMcgY7.js","/assets/vendor-icons-CmCra2aO.js","/assets/vendor-firebase-BCRBG8gK.js","/assets/index-BDnrL_nD.css","/prevent-pull-to-refresh.js","/reload-on-chunk-error.js","/favicon.svg","/manifest.webmanifest"];

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
