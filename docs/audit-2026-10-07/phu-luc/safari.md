# Phụ lục laptop, Safari iOS và PWA

Nguồn: ZIP ngày 07/10/2026. Phụ lục này dựa trên source và đối chiếu tests/CI. Chưa có kết quả chạy toàn app trên browser, WebKit hoặc iPhone thật trong phiên audit. Dependency không tải được qua proxy; Chromium fixture riêng chưa khởi động được trong sandbox. Không lấy các lời bình “đã đo trên iPhone” trong code làm bằng chứng kiểm lại của phiên này.

## Nền tảng hỗ trợ đã có

- `index.html` có viewport-fit, manifest, Apple Home Screen metadata, icon/splash.
- Layout/shared modal có safe-area, `dvh`, body scroll, portal, modal stack/focus behavior.
- Có shared export/capture policy và các phần xử lý share/download giới hạn theo thiết bị.
- `playwright.config.ts` có project WebKit opt-in qua E2E_WEBKIT. `.github/workflows/check.yml` có job WebKit riêng chạy nhiều nhóm mobile tests. Vì vậy kết luận “chỉ có Chromium giả lập iPhone” không đúng với bản ZIP này.
- Mobile và laptop có cách trình bày riêng. Tính năng So giá thông báo không hỗ trợ mobile có chủ đích, vì endpoint là server trên laptop.

## IOS-01 — P1: PDF preview in tem xung đột CSP

Source trace:

1. `features/sticker-event/services/printService.ts:1368`, `:1413` trả `pdf.output('datauristring')` từ nhánh mobile.
2. `features/sticker-event/hooks/useStickerEventPrint.ts:138–140` đặt chuỗi đó thành pdfPreviewUrl.
3. `features/sticker-event/PdfPreviewModal.tsx:40–44` dùng URL trong iframe.
4. `index.html:58` frame-src cho self/những host cụ thể nhưng không data:. Script/worker/image policy có data/blob khác không thay thế frame-src.

Đã xác nhận xung đột source/policy. Chưa chạy Safari để quan sát màn trắng thực tế; khả năng PDF iframe iOS còn cần kiểm ngay cả sau sửa URL.

Sửa: output Blob/Object URL với lifecycle revoke sau đóng/thay bản; xác minh/nới đúng directive cho nguồn nội bộ cần thiết, không tắt CSP hoặc mở wildcard. Cung cấp download/share/open fallback phù hợp trên iOS khi inline renderer không hoạt động. Ghi filename/giới hạn size đúng.

Nghiệm thu: in các layout giá/bill/A4 có preview hoặc fallback rõ, console không frame-src violation, mọi trang đủ nội dung, download/share đọc được PDF. Mở/đóng nhiều lần không giữ Blob/DOM/canvas vô hạn. Chạy iPhone thật, Home Screen và laptop.

## IOS-02 — P2: camera start hoàn tất sau đóng scanner

`features/sticker-event/Scanner.tsx:182–264` gọi getCameras rồi start/start fallback bất đồng bộ. Cleanup dòng 257–262 chỉ stop nếu isScanning đang true; không đánh disposed/generation hoặc ngăn then tiếp tục start. Nếu đóng khi permission hoặc start pending, continuation cũ có thể tiếp tục tạo stream/setState sau unmount. Library có thể reject khi container mất; không khẳng định mọi lần đóng đều giữ camera.

Sửa: giữ instance từng generation; kiểm còn active sau mỗi await; cleanup đánh inactive ngay, stop/clear stream của chính instance kể cả start trả về muộn. Không dùng ref đã chuyển sang instance mới để stop nhầm. Switch camera cũng áp cancellation policy.

Nghiệm thu: đóng khi permission sheet đang chờ, ngay sau Accept, lúc chuyển camera, đổi tab/logout; camera indicator tắt và không stream/loop cũ. Test mock delayed getCameras/start và thiết bị thật. Quét trở lại bình thường, không gọi stop/start đồng thời sai state.

## IOS-03 — P2: AudioContext theo mỗi lần quét không được đóng

`Scanner.tsx:55–79` new AudioContext mỗi playSound, chỉ stop oscillator; không close context. Nguy cơ tài nguyên tăng khi quét nhiều, audio bị browser suspend hoặc phát không ổn định. Chưa đo battery/memory và chưa chứng minh số lần cụ thể gây lỗi Safari.

Sửa: reuse context sau thao tác người dùng, disconnect nodes và close khi unmount; xử lý resume/rejection/autoplay; beep là phản hồi phụ, không làm hỏng kết quả quét.

Nghiệm thu: quét liên tục dataset đại diện, số context/track không tăng; background/resume không lỗi; âm thanh bị chặn thì UI vẫn báo kết quả.

## IOS-04 — P2: popup “Thêm” thiếu trần chiều cao/cuộn và behavior modal chung

`components/layout/MobileBottomNav.tsx:48–129` dựng overlay/sheet fixed riêng. Khung dòng 63 có safe-area bottom nhưng không max-height/overflow; phần tools/system tăng chiều cao theo menu. Chưa áp useModalBehavior/role dialog/focus/scroll lock như shared Modal. Có nguy cơ đầu sheet/nút không reachable ở landscape hoặc viewport thấp.

Sửa: dùng shared sheet/frame hoặc cùng contract; max-height theo visual viewport/dvh, phần body scroll, safe-area, Escape/topmost/focus/scroll handling. Không làm menu desktop bị ảnh hưởng.

Nghiệm thu: 667×375 và 844×390 mở menu tới được mọi item/Close, background không cuộn ngoài chủ đích, mở nested modal có layer/focus đúng. Keyboard/VoiceOver hoặc accessible navigation được kiểm.

## IOS-05 — P2: vùng chạm ở landscape/iPad và chữ input/zoom

`components/shared/ui/Button.tsx:80–86`, `Input.tsx:51`, `Select.tsx:36` trả min touch size về compact ở sm=640; mobile navigation/layout vẫn tới lg=1024. Icon32px/input36px có thể tồn tại ở iPhone ngang/iPad dọc. `size=none` là ngoại lệ chủ đích ở bảng nhưng toolbar không nên bỏ vùng chạm theo cách đó.

Input/select có text-sm14px; `index.html:6` maximum-scale1/user-scalable=no. Hành vi zoom thực tế khác theo Safari/OS/accessibility settings, nên không kết luận meta luôn chặn zoom mọi iPhone. Đây là điểm cần sửa/kiểm cho khả năng đọc và keyboard/autozoom.

Sửa: một policy coarse-pointer/touch đã chọn, hit area toolbar/actions thích hợp, variant compact bảng rõ; bỏ hạn chế zoom không cần thiết, input touch theo scale đã chọn. Giữ bảng laptop có mật độ phù hợp.

Nghiệm thu: computed rect các actions, keyboard open, pinch zoom, focus vào date/number/search ở portrait/landscape/iPad; font đọc được và không popup/modal bị cắt khi keyboard mở.

## IOS-06 — P2: test mobile chưa đủ cho mọi chức năng có dữ liệu

`tests/e2e/mobile-iphone-6-module.spec.ts:79–105` chủ yếu mở các màn demo ở viewport portrait; không đại diện mọi modal có dữ liệu lớn, landscape, camera/permission/share native hoặc login thật. Một số helper bắt lỗi iframe làm giảm khả năng thấy lỗi. WebKit CI có nhiều test chuyên sâu khác và cần giữ; không vì một spec nông mà phủ nhận toàn bộ tests.

Sửa: matrix theo hành vi chứ không chỉ mở tab; local seed data cho bảng/KPI/import/modal/export; test fail vì CSP/storage/worker rõ ràng. Chọn real-device smoke riêng, không dùng account/PII production để thay fixtures.

Nghiệm thu: các luồng chính có trace/data assertions, không chỉ screenshot landing; Chromium/WebKit và iPhone thật được ghi riêng PASS/FAIL/NOT TESTED.

## IOS-07 — yêu cầu sản phẩm cần chốt: Home Screen chưa bảo đảm offline cold-start

Có manifest/icon/splash và IndexedDB nhưng chưa tìm thấy service worker registration trong source. App có dữ liệu local/offline behavior không chứng minh shell tải lại khi hoàn toàn mất mạng hoặc cache assets bị xóa. Không bắt buộc mọi web app phải có SW; đây là gap nếu yêu cầu “mở app offline như native”.

Nếu cần SW: phase riêng cho asset caching/update/version compatibility và auth/data privacy; không cache response nhạy cảm tùy tiện. Có chiến lược update không làm app giữ chunk JS cũ và schema dữ liệu mới.

Nghiệm thu: cold-start Home Screen offline theo contract, version update và rollback không mất dữ liệu hoặc loop reload, cache riêng/quản lý logout phù hợp.

## LAP-01 — P2: So giá site live bị local CORS từ chối

`PriceComparisonView.tsx:65` gọi localhost3456; `price-scraper-server/server.js:20–31` chỉ allow origin localhost/127.0.0.1. Vì vậy origin dashboard.pro.vn bị deny dù companion server đang chạy trên laptop. Đây là lỗi integration laptop, không phải lỗi renderer Safari mobile. Xem backend B13/B14 cho queue/cancel/matching sản phẩm.

Sửa: contract companion pairing/token+origin allowlist hoặc backend managed; giữ bind loopback. Không “sửa” bằng CORS mọi origin hoặc bind mọi mạng.

## IOS-08 — P2: dựng PDF lô lớn thiếu timeout và cleanup khi lỗi

`features/sticker-event/services/printService.ts:1281` tạo toàn bộ mảng tem theo quantity trước phân trang. Nhánh mobile dòng 1307 append container ẩn; `:1309–1324` chờ ảnh không có timeout. Các vòng lặp `:1354–1364` và `:1395–1409` chụp canvas scale=2 rồi tích lũy ảnh vào PDF. Container chỉ được remove ở đường thành công `:1367`, `:1412`, không trong finally. Có dọn innerHTML sau từng trang nhưng chưa bảo vệ đường lỗi hoặc toàn bộ dữ liệu PDF/base64 đang giữ.

Ảnh chờ không kết thúc có thể làm tác vụ treo; lỗi render có thể giữ container ẩn. Lô lớn tăng áp lực bộ nhớ. Chưa đo số tem/ngưỡng crash trên iPhone và không kết luận mọi lô lớn đều crash.

Sửa: validate quantity/tổng công việc, timeout assets, try/finally cleanup DOM/canvas, output Blob, progress và cancel giữa trang; chia lô theo số đo trên thiết bị mục tiêu. Giữ QR/chất lượng in đúng và không chỉ tăng giới hạn cảnh báo.

Nghiệm thu: 1/30/100 tem hoặc quy mô nghiệp vụ được chọn; ảnh lỗi/chờ, lỗi canvas/PDF và cancel luôn kết thúc rõ ràng; không còn DOM ẩn sau lỗi/đóng; mở/chia sẻ được PDF và không reload tab trên thiết bị mục tiêu.

## Ma trận nghiệm thu cần thực hiện

| Môi trường | Case tối thiểu | Trạng thái audit này |
|---|---|---|
| Laptop1366×768/1440×900 | login, bảng/KPI, filters, modals, import/print/export, local So giá production origin | Chưa chạy runtime |
| Chromium mobile emulation | 390×844,844×390,667×375,768×1024; dữ liệu/overflow/stack/focus | Chưa chạy trong phiên này |
| WebKit/Linux | worker/IDB/chunks, input, sheet, export/share fallback, CSP/PDF | CI/source có cấu hình; chưa chạy lại |
| iPhone Safari thật | Google popup+redirect, keyboard, camera permission/start/stop, share sheet/download/PDF, background/resume, offline/quota | Chưa kiểm |
| iPhone Home Screen | safe-area/splash, viewport khi keyboard, reopen auth/data, export/camera, update/offline contract | Chưa kiểm |
| iPad Safari thật | portrait/landscape, coarse pointer, tables/menu/modals, keyboard | Chưa kiểm |

Minimum iOS/Safari support cần được ghi rõ và đối chiếu tài liệu chính thức của dependencies (đặc biệt CSS/Tailwind, worker, camera/share APIs). Không coi Playwright WebKit mới nhất là bằng chứng mọi Safari cũ đều được hỗ trợ.

Kết luận: đã có nền tảng mobile đáng giữ; chưa đủ bằng chứng gọi ứng dụng “đã tối ưu Safari iOS”. Sửa các lỗi cụ thể trước, sau đó đo/test đúng device và dataset.
