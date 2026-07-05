# SECURITY.md

## Mục tiêu

Đảm bảo dự án không lộ dữ liệu nhạy cảm, không hardcode secret và không tạo rủi ro bảo mật trong quá trình refactor.

---

## Quy tắc bắt buộc

- Không commit file `.env` thật (`.env.local` — đã có trong `.gitignore`, xác nhận đúng).
- Không hardcode API key/token/password/secret — **NGOẠI LỆ đã xác nhận có chủ đích**:
  Firebase Web SDK config (`apiKey`, `projectId`...) hardcode trong `services/firebase.ts`
  KHÔNG phải lỗi bảo mật — API key Firebase Web SDK vốn được thiết kế để public, bảo vệ
  thật sự nằm ở Firestore Security Rules phía server (xem mục "Firebase Security Rules"
  bên dưới), không phải ở việc giấu key phía client. Không tự ý "sửa" bằng cách chuyển
  sang biến môi trường trừ khi có yêu cầu rõ ràng.
- Không log token/user data ra console — **lưu ý đã biết**: nhiều service dùng
  `console.warn(error)` khi bắt lỗi Firestore, có thể vô tình log object lỗi chứa thông tin
  nhạy cảm (VD: uid, path). Không phải log cố ý, nhưng cần rà lại nếu mở rộng logging.
- Không lưu dữ liệu nhạy cảm vào localStorage nếu không cần thiết — dự án dùng IndexedDB
  (`services/dbService.ts`, `db/idb.ts`) cho phần lớn cache, không phải localStorage.
- Không tắt validate/auth để fix lỗi nhanh.
- Không thêm package không rõ nguồn gốc.
- **Không dùng `dangerouslySetInnerHTML` với dữ liệu người dùng tự nhập chưa sanitize** —
  xem phát hiện thật bên dưới, đây KHÔNG phải rule lý thuyết mà đã có vi phạm thật trong
  codebase cần xử lý.

---

## Phát hiện thật khi audit `dangerouslySetInnerHTML` (2026-07-05)

Đã rà toàn bộ `dangerouslySetInnerHTML` trong codebase. Phân loại theo rủi ro thật:

- **An toàn** (nội dung do developer viết cứng trong code, không phải input người dùng):
  `<style dangerouslySetInnerHTML>` trong `Scanner.tsx`, `ProcessingLoader.tsx` (CSS string
  tĩnh); `headerMapping[h]` trong `IndustryView.tsx`/`SummaryTableView.tsx`/
  `CompetitionListView.tsx` (label cột bảng hardcode trong code, chỉ dùng để chèn `<br/>`
  xuống dòng, không nhận input từ người dùng).
- **⚠️ RỦI RO THẬT — chưa sanitize**: `features/sticker-event/stickerprinter/StickerPrintPreview.tsx`
  render `activeFirstTicket.title/contentTop/contentBottom/...` bằng `dangerouslySetInnerHTML`
  KHÔNG qua sanitize. Nội dung này do nhân viên tự nhập/định dạng (bold/italic/underline qua
  `document.execCommand`) trong `StickerManualQueue.tsx`/`StickerPrintControls.tsx`, và có
  thể được lưu vào Firestore `stores/{storeId}/savedLists` — **tức là 1 nhân viên có thể lưu
  nội dung sticker chứa HTML/script độc hại, và nhân viên KHÁC cùng kho xem/tải lại danh
  sách đó sẽ bị thực thi** (stored XSS trong phạm vi 1 kho). Rủi ro thực tế thấp vì đây là
  app nội bộ, người dùng là nhân viên đã đăng nhập (không phải public), nhưng vẫn là lỗ hổng
  thật cần xử lý (thêm sanitize, VD dùng `dompurify` — đã có sẵn trong bundle qua dependency
  khác, xem `dist/assets/purify.es-*.js`) khi có thời gian, chưa sửa trong lần audit tài
  liệu này (ngoài phạm vi task viết docs).
- **Dead code — không phải rủi ro đang hoạt động**: `features/bi-dashboard/components/MarkdownRenderer.tsx`
  render `dangerouslySetInnerHTML` hoàn toàn không sanitize, nhưng component này **không
  được import ở bất kỳ đâu khác trong codebase** (đã grep xác nhận) — an toàn ở hiện trạng,
  nhưng nếu sau này có ai wire nó vào 1 màn hình thật (VD: hiển thị nội dung markdown từ
  Firestore/user input) thì PHẢI thêm sanitize trước, không copy pattern hiện tại.

---

## Environment variables (thật)

Dự án dùng **`.env.local`** (KHÔNG có `.env.example` được commit — nên tạo file mẫu này nếu
có thêm biến môi trường mới, để người sau biết cần khai báo gì mà không lộ giá trị thật).
Biến môi trường thật đang dùng:

```env
GEMINI_API_KEY=       # Cho tính năng dùng @google/genai
```

Firebase config **KHÔNG** đọc qua biến môi trường (xem giải thích ở mục "Quy tắc bắt buộc"
phía trên) — đây là điểm khác biệt quan trọng so với giả định generic "mọi API key đều phải
qua env" nên không áp dụng máy móc cho Firebase config trong dự án này.

`.gitignore` đã chặn đúng `.env*` và `.env.local` — xác nhận không có rủi ro lộ file env qua
git.

---

## Firebase Auth & Security Rules (bổ sung 2026-07-05 — phần quan trọng nhất cho dự án này)

Ranh giới bảo mật thật sự của app này nằm ở **Firebase Auth + Firestore Security Rules**,
không phải ở việc giấu API key hay dùng token thủ công như app có backend REST truyền thống.

- **Đăng nhập**: Google OAuth qua Firebase Auth (`contexts/AuthContext.tsx`), phân quyền lưu
  ở field `role` trong document `users/{uid}` (`'admin' | 'manager' | 'employee' | 'pending'`).
  Ngoài ra có "Chế Độ Dùng Thử" (demo/offline mode) không cần đăng nhập Firebase thật — cẩn
  thận không để logic phân quyền thật bị bỏ qua nhầm khi ở demo mode.
- **Firestore Security Rules KHÔNG có trong repo này** (đã tìm `firestore.rules`,
  `firebase.json` — không tồn tại ở root) — nghĩa là rule bảo mật thật sự được quản lý trực
  tiếp qua Firebase Console, **không version-control, không review qua PR/code review**.
  Đây là rủi ro quy trình cần lưu ý: không ai có thể audit rule hiện tại chỉ bằng cách đọc
  repo. Nếu có quyền truy cập Firebase Console, cân nhắc export rule về repo
  (`firestore.rules`) để version-control được.
  - Bằng chứng gián tiếp rule CÓ tồn tại và có enforce: khi chạy ở Chế Độ Dùng Thử (demo),
    console log thật ghi nhận lỗi `FirebaseError: Missing or insufficient permissions` cho
    các query `Online Query`, `Traffic Counter`, `notifications` — xác nhận rule đang chặn
    đúng user chưa xác thực, không phải app "mở toang" không rule gì.
- **Phân quyền client-side là chưa đủ**: mọi kiểm tra `userRole === 'admin'` trong React
  component (VD: ẩn/hiện nút quản trị) chỉ là UX, KHÔNG phải bảo mật thật — bảo mật thật
  phải nằm ở Firestore Rules (chặn ở tầng server). Không giả định 1 tính năng "an toàn" chỉ
  vì đã ẩn nút trên UI.
- Xem `DATABASE.md` để biết đầy đủ cấu trúc collection (`users/`, `shared_configs/`,
  `stores/`, `_system/`) — mỗi collection cần rule tương ứng ở Firebase Console (không audit
  được từ repo này).

---

## API/Auth (đã cập nhật theo thực tế Firebase)

- Không có API client/token truyền thống — Firebase SDK tự quản lý session/token nội bộ
  (`onAuthStateChanged` trong `AuthContext.tsx`), không cần code tự truyền token thủ công.
- OAuth token cho Google Sheets export (`services/googleSheetsService.ts`) lấy tại runtime
  lúc người dùng thao tác, không lưu trữ lâu dài (không vào Firestore/localStorage).
- Khi Firestore trả lỗi `permission-denied`, xử lý bắt riêng và hiển thị thông báo phù hợp
  cho người dùng (xem `API.md` mục Error handling) — không để lỗi Firebase thô hiện ra UI.
- Không expose thông tin lỗi Firebase nhạy cảm (path, project id nội bộ...) ra thông báo lỗi
  hiển thị cho người dùng cuối.

---

## Data validation

- Validate input trước khi gửi API nếu cần.
- Validate response quan trọng trước khi tính toán.
- Không tin dữ liệu từ client hoàn toàn.
- Xử lý null/undefined để tránh crash.

---

## Dependency security

Khi thêm package mới:

- Kiểm tra package có thật sự cần không.
- Ưu tiên package phổ biến, đang maintain.
- Không thêm package chỉ để làm việc nhỏ có thể tự xử lý.
- Sau khi thêm package, chạy build/test.

---

## Checklist bảo mật

- [ ] Không có secret trong source (Firebase config public là ngoại lệ đã xác nhận, KHÔNG
      tính là vi phạm mục này).
- [ ] Không có `.env.local` thật bị commit.
- [ ] Không có console.log/console.warn dữ liệu nhạy cảm (uid, path Firestore chi tiết...).
- [ ] Không thêm package không cần thiết.
- [ ] Firebase Auth xử lý session tập trung qua `AuthContext.tsx`, không tự chế cơ chế riêng.
- [ ] Error message không lộ thông tin nhạy cảm (path Firestore, project id nội bộ...).
- [ ] Input quan trọng được validate.
- [ ] Phân quyền `role` chỉ dùng để quyết định UI (ẩn/hiện) — KHÔNG coi là bảo mật thật nếu
      chưa xác nhận có Firestore Security Rules tương ứng chặn ở tầng server.
- [ ] `dangerouslySetInnerHTML` (nếu có) chỉ dùng với nội dung developer viết cứng, không
      dùng trực tiếp với nội dung do người dùng nhập/lưu qua Firestore chưa sanitize (xem
      phát hiện thật ở `StickerPrintPreview.tsx` phía trên — chưa xử lý, cần làm sau).
