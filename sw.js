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
const VERSION = 'd7bd4e96be44';
const CACHE = 'ycx-shell-' + VERSION;
const PRECACHE = ["/assets/AboutView-Rn4dQ_vd.js","/assets/Badge-iK8vjF0x.js","/assets/BiWrapper-BL2OLMls.css","/assets/BiWrapper-BjWjXH7-.js","/assets/ChangelogModal-CAo_idwd.js","/assets/CheckThuongView-wDEkp_x-.js","/assets/ConfirmDialog-DzXGgZeo.js","/assets/CouponConverterView-B_XEIGKq.js","/assets/DashboardView-Bhj-dnBZ.js","/assets/DataUpdater-B_yZ0fAD.js","/assets/EmployeeAnalysis--f2ECxyv.js","/assets/ExportOptionsModal-CPNmb_Cr.js","/assets/ExternalToolView-_ZslFrro.js","/assets/FileHistoryModal-BGRlUric.js","/assets/FileNamingModal-UKXTErPn.js","/assets/FontSelector-Bo56Y8lU.js","/assets/GlobalAutoSyncDock-Be0xa_Re.js","/assets/IndustryGrid-Bc1NSIL-.js","/assets/Input-D2QnWsKT.js","/assets/KhaiThacView-BA7atgC-.js","/assets/KpiCard-CxTQCzrH.js","/assets/KpiCardConfigModal-BV7Z7fTd.js","/assets/LineBotView-l7nCFaEW.js","/assets/LoginView-BWxkymC3.js","/assets/MultiSelectDropdown-BgRgUag2.js","/assets/NhanVien-BbTGQ_wE.js","/assets/PendingApprovalView-6Hf2Jr5P.js","/assets/PerformanceModal-D0Ec_mjl.js","/assets/PhanCaView-Bp2d7h2L.js","/assets/PhanCaView-CYYjc8a5.css","/assets/PriceComparisonView-C-_uLNyk.js","/assets/SectionCard-1x8MR0yO.js","/assets/SectionHeader-RlfOtbwh.js","/assets/Select-BUwXCZ7Q.js","/assets/SettingsView-C6e0zf-J.js","/assets/StickerEventApp-8kpqZ_np.js","/assets/StickerPrinterView-CRBXTmO7.js","/assets/SummaryTable-CPSZsYkt.js","/assets/Tabs-G9kiWtRK.js","/assets/TaxCalculatorView-Dz3bjnOV.js","/assets/TrendChart-Cf0DMck0.js","/assets/UncollectedOrdersModal-CP060IS3.js","/assets/UnconfiguredGroupsModal-C0PrmXbe.js","/assets/UnshippedOrdersModal-DmLDFCuQ.js","/assets/UploadConflictModal-u3WiBx5e.js","/assets/UploadTypeSelectionModal-CSKS8Yi8.js","/assets/UserManagementView-DucipRSM.js","/assets/analysisEmployeeSyncService-DyQSvFdX.js","/assets/analytics.worker-Bb4EaEVA.js","/assets/analytics.worker-DPngphgu.js","/assets/analytics.worker-D_9AshrL.js","/assets/autoNavigationService-WF7WLX81.js","/assets/captureEngine-BI13WEud.js","/assets/chartConfig-C-f7hsgo.js","/assets/checkThuongIframeService-Be0uz6RR.js","/assets/cloudDataService-CZ0sndKc.js","/assets/configStore-jfv_oEyo.js","/assets/dataService-BkjYzi2M.js","/assets/dbService-D6GxLBAM.js","/assets/firebaseProductConfigService-ImPynrGO.js","/assets/googleSheetsService-BGBmW1BJ.js","/assets/googleSheetsService-D0LTBUzq.js","/assets/html2canvas.esm-QH1iLAAe.js","/assets/index-BIFoWCtc.js","/assets/index-CgJtiJsK.js","/assets/index-DT34geyQ.js","/assets/index-DuaGrbqz.js","/assets/index-MvpVopeV.css","/assets/index.es-oCvViEbT.js","/assets/jspdf.es.min-wLjEp6_v.js","/assets/khaiThacDb-CttlglQO.js","/assets/khoDataService-B1J__Q_S.js","/assets/legacyIconNames-XTTeY_CV.js","/assets/presetBi-B3uXmlLK.js","/assets/salesJsonWriter.worker-BNAYiZX6.js","/assets/salesJsonWriter.worker-iky0iAuj.js","/assets/scheduleHeartbeat.worker-DY9MOOqR.js","/assets/shared-utils-CoyMcgY7.js","/assets/summaryService-CM8LE6XZ.js","/assets/useBiAutoSync-DqDz_gB_.js","/assets/useMultiMonthBonusRun-BHbJ_IVx.js","/assets/vendor-charts-CNaQ3TAb.js","/assets/vendor-excel-BGhuli8m.js","/assets/vendor-firebase-BCRBG8gK.js","/assets/vendor-firebase-analytics-BQ3Ho__8.js","/assets/vendor-icons-CyCWUmQF.js","/assets/vendor-motion-CgVkwWMn.js","/assets/vendor-react-spjDHvdB.js","/assets/worker-DwBw6rNm.js","/favicon.svg","/icons/apple-touch-icon-120.png","/icons/apple-touch-icon-152.png","/icons/apple-touch-icon-167.png","/icons/apple-touch-icon-180.png","/icons/icon-192.png","/icons/icon-512.png","/icons/icon-maskable-512.png","/manifest.webmanifest","/prevent-pull-to-refresh.js","/reload-on-chunk-error.js"];
const CORE = ["/assets/index-DT34geyQ.js","/assets/vendor-react-spjDHvdB.js","/assets/shared-utils-CoyMcgY7.js","/assets/vendor-icons-CyCWUmQF.js","/assets/vendor-firebase-BCRBG8gK.js","/assets/vendor-motion-CgVkwWMn.js","/assets/index-MvpVopeV.css","/prevent-pull-to-refresh.js","/reload-on-chunk-error.js","/favicon.svg","/manifest.webmanifest"];

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
