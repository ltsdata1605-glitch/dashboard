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
const VERSION = '633927dbb34b';
const CACHE = 'ycx-shell-' + VERSION;
const PRECACHE = ["/assets/AboutView-2mRDVhbK.js","/assets/AreaAutoExportButton-3TTS1uk5.js","/assets/Badge-B2WWRDU5.js","/assets/Banner-DQFB6IOD.js","/assets/BiWrapper-DMR52XUc.css","/assets/BiWrapper-fXOtJDrH.js","/assets/ChangelogModal-CMPs3UMB.js","/assets/CheckThuongView-DhAhxVoh.js","/assets/Checkbox-erM004yg.js","/assets/ConfirmDialog-DrDZfohU.js","/assets/CouponConverterView-cTHDTRtO.js","/assets/DashboardView-BijHv3Au.js","/assets/DataUpdater-1JFd_21R.js","/assets/EmployeeAnalysis-Bn0MQMmg.js","/assets/EmptyState-DXaDothj.js","/assets/ExportOptionsModal-BimrhFk0.js","/assets/ExternalToolView-_ZslFrro.js","/assets/FileHistoryModal-Dm0aKODz.js","/assets/FileNamingModal-BfMAPP2U.js","/assets/GlobalAutoSyncDock-ZMiuWoep.js","/assets/IndustryGrid-CfY8K8ey.js","/assets/InstallAppHint-Cj8a_RS3.js","/assets/KhaiThacView-CVmH3tSF.js","/assets/KpiCard-BPE_NZgQ.js","/assets/KpiCardConfigModal-CtL_K_B7.js","/assets/LineBotView-DpmX42-0.js","/assets/ListGroup-Bc_VoT8S.js","/assets/LoginView-CV3sMKgk.js","/assets/MobileMoreSheet-CatL2nTz.js","/assets/Modal-wyY9DL6Z.js","/assets/MultiSelectDropdown-Ozb84kT1.js","/assets/NhanVien-y4OyY2Wu.js","/assets/NotificationDropdown-vvM64hAi.js","/assets/PendingApprovalView-Bq0MC4aH.js","/assets/PerformanceModal-B_CogeAs.js","/assets/PhanCaView-CAA0vulx.css","/assets/PhanCaView-DUIrZXFu.js","/assets/PriceComparisonView-B9sPD9_U.js","/assets/SectionCard-B-drYcSA.js","/assets/SectionHeader-139M_bMz.js","/assets/Select-B7_aokNA.js","/assets/SettingsView-D54LOERw.js","/assets/ShiftWarehouseInputModal-gg1Yj6NB.js","/assets/StickerEventApp-DhIy7EjX.js","/assets/StickerPrinterView-C44BeWIj.js","/assets/StringMultiSelect-CUuvUhc6.js","/assets/SummaryTable-Dk-YmjnB.js","/assets/Switch-DxYZSjmo.js","/assets/Tabs-C2dUEd-p.js","/assets/TaxCalculatorView-Bf9ytXpd.js","/assets/Textarea-DfYp8IZh.js","/assets/TouchTitleHint-pfeoifhw.js","/assets/TrendChart-Bw9aoW0x.js","/assets/UncollectedOrdersModal-CI8snHHH.js","/assets/UnconfiguredGroupsModal-BtsXPVar.js","/assets/UnshippedOrdersModal-pwv0EQXX.js","/assets/UploadConflictModal-Ch1pUnOB.js","/assets/UploadTypeSelectionModal-BDvcc7Ab.js","/assets/UserManagementView-DdTm6enM.js","/assets/analysisEmployeeSyncService-zOfG125V.js","/assets/analytics.worker-BfRBJyQG.js","/assets/analytics.worker-CCAy1kzZ.js","/assets/analytics.worker-CxIdJA8C.js","/assets/autoNavigationService-BWHosWTK.js","/assets/autoReportExportService-CfetqeEi.js","/assets/captureEngine-BPtG7lFX.js","/assets/chartConfig-C-f7hsgo.js","/assets/checkThuongIframeService-B865hFh9.js","/assets/cloudDataService-Bmh4kSZa.js","/assets/configStore-jfv_oEyo.js","/assets/dataService-D9ITlt5r.js","/assets/dataUtils-CmCs18V6.js","/assets/dbService-qX-35tNg.js","/assets/firebaseProductConfigService-8pFTCyxg.js","/assets/googleSheetsService-BGBmW1BJ.js","/assets/googleSheetsService-D0LTBUzq.js","/assets/html2canvas.esm-QH1iLAAe.js","/assets/index-BIFoWCtc.js","/assets/index-BkBw8ASU.css","/assets/index-Bpf8jskg.js","/assets/index-CgJtiJsK.js","/assets/index-DuaGrbqz.js","/assets/index.es-DCP04145.js","/assets/industryColors-NaMQqhES.js","/assets/jspdf.es.min-HXMqgaO0.js","/assets/khaiThacDb-Bqiden_a.js","/assets/khoDataService-C1DBMuue.js","/assets/lineBot.types-3sf89aiB.js","/assets/moTaBoLoc-B6sNO7U6.js","/assets/presetBi-DKlCmK0B.js","/assets/salesJsonWriter.worker-BNAYiZX6.js","/assets/salesJsonWriter.worker-iky0iAuj.js","/assets/scheduleHeartbeat.worker-DY9MOOqR.js","/assets/shared-utils-B_Pb1ZNr.js","/assets/summaryService-DgV3pZ4B.js","/assets/systemAnnouncementService-BdHJDjGE.js","/assets/useBiAutoSync-BuXe7KaW.js","/assets/useMultiMonthBonusRun-BfufKla0.js","/assets/vendor-charts-C3TwIp4Y.js","/assets/vendor-excel-BGhuli8m.js","/assets/vendor-firebase-DVZPizMJ.js","/assets/vendor-firebase-analytics-5cGotuqA.js","/assets/vendor-icons-DmTakvj8.js","/assets/vendor-react-spjDHvdB.js","/assets/worker-C3Ehuode.js","/assets/ycxAutoSyncService--k61RMRm.js","/favicon.svg","/fonts/UTM AvoBold.ttf","/icons/apple-touch-icon-120.png","/icons/apple-touch-icon-152.png","/icons/apple-touch-icon-167.png","/icons/apple-touch-icon-180.png","/icons/icon-192.png","/icons/icon-512.png","/icons/icon-maskable-512.png","/man-cho-khoi-dong.js","/manifest.webmanifest","/prevent-pull-to-refresh.js","/reload-on-chunk-error.js"];
const CORE = ["/assets/index-Bpf8jskg.js","/assets/vendor-react-spjDHvdB.js","/assets/shared-utils-B_Pb1ZNr.js","/assets/vendor-icons-DmTakvj8.js","/assets/vendor-firebase-DVZPizMJ.js","/assets/index-BkBw8ASU.css","/prevent-pull-to-refresh.js","/reload-on-chunk-error.js","/man-cho-khoi-dong.js","/fonts/UTM AvoBold.ttf","/favicon.svg","/manifest.webmanifest"];

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
