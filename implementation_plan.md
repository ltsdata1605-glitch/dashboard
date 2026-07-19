# Implementation Plan — Bổ sung Backend (Firebase Cloud Functions) cho Bảo mật & Phân quyền

> Trạng thái: **Bước 0-3 đã code xong** (rules + 4 Cloud Functions + wiring client), **chưa deploy lên Firebase thật**. Xem mục 11 để biết chính xác việc gì đã làm và việc gì còn lại (Bước deploy) cần bạn tự thực hiện.
> Phạm vi đợt này: **Root app (`hooks/`, `services/`, `contexts/`, `components/`) + `features/phan-ca`** — vì hai khu vực này dùng chung 1 Firebase project (`dashboa-7e20b`) và chung `AuthProvider`.
> **Ngoài phạm vi đợt này**: `features/sticker-event` (dùng Firebase project riêng/cấu hình động qua `firebase-applet-config.json`, không có sẵn ở repo) và `features/bi-dashboard` (không thấy truy cập Firestore trực tiếp — chỉ hiển thị dữ liệu nhận qua props/context). Ghi chú ở mục 7 để làm đợt sau.

---

## 1. Hiện trạng đã audit (bằng chứng cụ thể trong code)

### 1.1. Rò rỉ khóa API
- [vite.config.ts:34-37](vite.config.ts#L34-L37) nhúng thẳng `GEMINI_API_KEY` vào bundle client qua Vite `define`.
- Dùng tại [features/phan-ca/components/AiSuggestPatternModal.tsx:176](features/phan-ca/components/AiSuggestPatternModal.tsx#L176) — `new GoogleGenAI({ apiKey: process.env.API_KEY })` chạy trên trình duyệt.
- Đây là nơi **duy nhất** trong repo gọi `@google/genai` trực tiếp từ client (đã grep toàn repo).

### 1.2. Phân quyền role hoàn toàn do client tự ghi, không tầng gác
Cấu trúc dữ liệu Firestore (project `dashboa-7e20b`, đã audit qua grep `collection(db,…)` / `doc(db,…)`):
```
users/{uid}                        — profile: role, status, departmentId, employeeName,
                                      expiresAt, requestedRole, settings, loginCount...
users/{uid}/setting/configuration  — cấu hình cá nhân (services/firestoreService.ts:30)
users/{uid}/schedules/{key}        — (services/firestoreService.ts:180)
users/{uid}/configs/{key}          — (services/firestoreService.ts:248)
users/{uid}/notifications/{id}     — (services/notificationService.ts:16)
shared_configs/{id}                — cấu hình dùng chung (services/firestoreService.ts:119)
_system/stats                     — (hooks/useSystemTraffic.ts:23)
```
Các nơi client tự `updateDoc`/`setDoc` thẳng vào field nhạy cảm (`role`, `status`, `departmentId`, `expiresAt`) của **chính doc `users/{uid}`**:
- [contexts/AuthContext.tsx:94-101](contexts/AuthContext.tsx#L94-L101) — tự set `role:'admin'` cho email super admin (hardcode email trong bundle client).
- [contexts/AuthContext.tsx:108-114](contexts/AuthContext.tsx#L108-L114) — tự demote khi hết hạn (`expiresAt`).
- [contexts/AuthContext.tsx:212-224](contexts/AuthContext.tsx#L212-L224) `requestAccess()` — user tự set `role:'pending'`, `departmentId`, `requestedRole`.
- [components/views/UserManagementView.tsx](components/views/UserManagementView.tsx#L92) `updateDoc(userRef, updateData)` — admin duyệt/từ chối yêu cầu truy cập, set `role`, `status`, `departmentId`, `expiresAt` cho **user khác**. Guard hiện tại chỉ là `if (userRole !== 'admin' && userRole !== 'manager') return;` ở [dòng 103-106](components/views/UserManagementView.tsx#L103-L106) — **chỉ là điều kiện UI phía client**, không được Firestore Rules xác nhận lại (repo không có `firestore.rules`).

### 1.3. Không có Infrastructure-as-Code cho Firestore Rules
Không tìm thấy `firebase.json`, `.firebaserc`, `firestore.rules` trong repo. `firebase-tools` cũng chưa cài (`which firebase` → not found). → Rules hiện tại (nếu có) chỉ tồn tại thủ công trên Firebase Console, không version-control, không review được.

### 1.4. phan-ca dùng chung Auth với root
[features/phan-ca/hooks/usePhanCaData.ts:4](features/phan-ca/hooks/usePhanCaData.ts#L4) import `useAuth` từ `contexts/AuthContext` gốc (ngoại lệ được phép vì chỉ lấy `user`, không lấy business logic). [features/phan-ca/services/firebase.ts](features/phan-ca/services/firebase.ts) hardcode cùng `projectId: "dashboa-7e20b"` như root → xác nhận root + phan-ca là **1 project Firebase, 1 user pool, 1 bảng phân quyền**.

---

## 2. Kiến trúc đề xuất

```
Client (React SPA)                    Firebase Cloud Functions (Node, Admin SDK)        Firestore
─────────────────                     ──────────────────────────────────────           ─────────
AuthContext.tsx          ──onCall──▶  resolveSession()                         ──r/w──▶ users/{uid}
  (đăng nhập xong)                      - đọc/tạo doc users/{uid}
                                        - check super-admin email (chỉ ở server)
                                        - check expiresAt, tự demote nếu hết hạn
                                        - setCustomUserClaims({role, departmentId})
                          ◀─trả về──   - trả profile mới nhất
  getIdToken(true)                     (client refresh token để nhận custom claim)

AuthContext.requestAccess ─onCall─▶   requestAccess()                          ──w───▶ users/{uid}
                                        - CHỈ được set role='pending' cho CHÍNH mình

UserManagementView.tsx    ─onCall─▶   adminUpdateUser()                        ──w───▶ users/{targetUid}
  (nút Duyệt/Từ chối/Thu hồi            - kiểm tra request.auth.token.role=='admin'/'manager'
   + autoSave từng ô)                   - set role/status/departmentId/employeeName/expiresAt
                                          cho user khác (partial update, chỉ ghi field được gửi)
                                        - chỉ admin (không phải manager) được set role=admin/manager
                                        - setCustomUserClaims cho user đó
                                        - gửi notification nếu client truyền `notify` payload

AiSuggestPatternModal.tsx ─onCall─▶   generateWithGemini()                     (không đụng Firestore)
                                        - gọi Gemini bằng key lưu server-side (Secret Manager)
                                        - trả kết quả về client

(scheduled, không do client gọi)      demoteExpiredUsers()  [Cloud Scheduler, chạy 1 lần/ngày]
                                        - lưới an toàn: quét users có expiresAt < now vẫn còn
                                          role != pending (phòng trường hợp user không login lại
                                          qua client để trigger resolveSession)
```

**Nguyên tắc cốt lõi:** Firestore Rules sẽ **cấm tuyệt đối** client (kể cả admin) ghi trực tiếp field `role`, `status`, `departmentId`, `expiresAt`, `requestedRole` vào `users/{uid}` của **bất kỳ ai** — kể cả chính mình. Các field này chỉ được ghi bởi Cloud Functions (dùng Admin SDK, tự động bypass Rules). Điều này loại bỏ hoàn toàn lớp lỗ hổng ở mục 1.2, vì không còn đường nào để client tự nâng quyền.

---

## 3. File mới sẽ tạo

| File | Nội dung |
|---|---|
| `firebase.json` | Khai báo `firestore.rules`, thư mục `functions`, config emulator |
| `.firebaserc` | Alias project: `{"projects": {"default": "dashboa-7e20b"}}` |
| `firestore.rules` | Rules mô tả ở mục 4 |
| `functions/package.json` | Deps: `firebase-admin`, `firebase-functions`, `@google/genai` |
| `functions/tsconfig.json` | Cấu hình build riêng cho Cloud Functions (Node runtime, không dùng chung tsconfig Vite của client) |
| `functions/src/index.ts` | Export 4 functions |
| `functions/src/session.ts` | `resolveSession`, `requestAccess`, `demoteExpiredUsers` |
| `functions/src/admin.ts` | `adminUpdateUser` |
| `functions/src/gemini.ts` | `generateWithGemini` |
| `functions/.gitignore` | `node_modules/`, `lib/` |

## 4. Nội dung `firestore.rules` (đã sửa sau khi test thật phát hiện thiếu — xem mục 11)

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isSignedIn() { return request.auth != null; }
    function isSelf(uid)   { return isSignedIn() && request.auth.uid == uid; }
    function role()        { return isSignedIn() ? request.auth.token.role : null; }
    function isAdmin()     { return role() == 'admin'; }
    function isManager()   { return role() == 'admin' || role() == 'manager'; }
    function protectedKeys() {
      return ['role', 'status', 'departmentId', 'expiresAt', 'requestedRole'];
    }

    match /users/{uid} {
      allow get:    if isSelf(uid) || isManager();
      allow list:   if isManager(); // để UserManagementView query where(role in [...])
      allow create: if isSelf(uid)
                    && !request.resource.data.keys().hasAny(protectedKeys());
      allow update: if isSelf(uid)
                    && !request.resource.data.diff(resource.data).affectedKeys().hasAny(protectedKeys());
      // Không có allow update cho isAdmin() ở đây — admin cũng phải đi qua
      // Cloud Function reviewAccessRequest (Admin SDK bypass rules), không ghi thẳng qua client SDK.

      match /setting/{doc}       { allow read, write: if isSelf(uid); }
      match /schedules/{doc}     { allow read, write: if isSelf(uid); }
      match /configs/{doc}       { allow read, write: if isSelf(uid); }
      match /salesData/{doc}     { allow read, write: if isSelf(uid); }
      match /notifications/{id}  { allow read, update: if isSelf(uid); allow create: if isSignedIn(); }
    }

    match /shared_configs/{id} {
      allow read:  if isSignedIn();
      allow write: if isManager();
    }

    // Bộ đếm lượt truy cập (hooks/useSystemTraffic.ts) — không nhạy cảm về
    // phân quyền, chỉ cần đăng nhập là ghi được.
    match /_system/{doc} {
      allow read, write: if isSignedIn();
    }
  }
}
```

## 5. Chi tiết 4 Cloud Functions

1. **`resolveSession`** (`onCall`, yêu cầu `context.auth`)
   Thay thế toàn bộ khối logic ở [contexts/AuthContext.tsx:79-200](contexts/AuthContext.tsx#L79-L200): đọc/tạo `users/{uid}`, check email super-admin (chuyển hẳn hardcode này vào server, xóa khỏi bundle client), check `expiresAt` để tự demote, gọi `admin.auth().setCustomUserClaims(uid, {role, departmentId})`, trả về profile mới nhất.
   Client (`AuthContext.tsx`) sau khi login xong sẽ gọi function này thay vì tự đọc/ghi Firestore, rồi gọi `user.getIdToken(true)` để làm mới custom claims trong token.

2. **`requestAccess`** (`onCall`) — thay [contexts/AuthContext.tsx:212-240](contexts/AuthContext.tsx#L212-L240). Chỉ cho phép set `role='pending'`, `status='pending'` cho **chính uid gọi hàm** — không thể tự nâng quyền vì luôn hard-code `role: 'pending'` trong function, không nhận role từ input của client.

3. **`adminUpdateUser`** (`onCall`) — thay 2 điểm ghi ở `components/views/UserManagementView.tsx`: nút Duyệt/Từ chối/Thu hồi (`handleApproval`) **và** autosave từng ô inline (`autoSave` — sửa role/departmentId/employeeName/expiresAt của user đã duyệt). Khi audit sâu hơn phát hiện UI có 2 luồng ghi khác nhau (không chỉ 1 flow approve/reject đơn giản như bản nháp ban đầu), nên gộp thành 1 callable tổng quát nhận partial update `{targetUid, role?, status?, departmentId?, employeeName?, expiresAt?, notify?}` — chỉ ghi field được client gửi. Function tự kiểm tra `request.auth.token.role` phải là `admin`/`manager`; riêng việc set `role='admin'|'manager'` cho người khác chỉ `admin` mới được phép (khớp UI: dropdown role đầy đủ chỉ hiện với `userRole==='admin'`, manager chỉ thấy badge readonly). Nếu có `notify`, gửi qua `notifyUser`.

4. **`generateWithGemini`** (`onCall`) — thay lệnh gọi trực tiếp ở [AiSuggestPatternModal.tsx:176](features/phan-ca/components/AiSuggestPatternModal.tsx#L176). Key lưu bằng `firebase functions:secrets:set GEMINI_API_KEY` (Secret Manager), không còn nằm trong `.env.local`/bundle client. Sau khi xong, xóa 2 dòng `define` ở [vite.config.ts:34-37](vite.config.ts#L34-L37).

5. **`demoteExpiredUsers`** (scheduled, Cloud Scheduler mỗi ngày 1 lần) — lưới an toàn bổ sung, không bắt buộc phải làm ngay đợt 1 (đánh dấu optional).

## 6. File client đã sửa — ĐÃ XONG (xem mục 11)

| File | Thay đổi |
|---|---|
| `contexts/AuthContext.tsx` | Thay logic đọc/ghi Firestore trực tiếp trong `onAuthStateChanged` bằng gọi `resolveSession()` + `getIdToken(true)`; `requestAccess()` gọi callable qua `services/sessionService.ts` thay vì `updateDoc` |
| `components/views/UserManagementView.tsx` | `handleApproval` + `autoSave` đổi sang gọi `adminUpdateUser()` (qua `services/adminUserService.ts`) thay vì `updateDoc(userRef, ...)` trực tiếp |
| `features/phan-ca/components/AiSuggestPatternModal.tsx` | Thay `new GoogleGenAI({apiKey:...})` bằng gọi `suggestShiftPattern()` (`features/phan-ca/services/geminiService.ts`) |
| `vite.config.ts` | Đã xóa `define` nhúng `GEMINI_API_KEY` (và `loadEnv`/`env` không dùng nữa) |
| `services/firebase.ts`, `features/phan-ca/services/firebase.ts` | Đã thêm `getFunctions(app)` + export `functions` |
| `services/sessionService.ts`, `services/adminUserService.ts`, `features/phan-ca/services/geminiService.ts` | **Mới** — wrapper `httpsCallable` cho từng Cloud Function, giữ `contexts/AuthContext.tsx` và `UserManagementView.tsx` gọn |
| `package.json` (root) | Đã thêm devDependency `firebase-tools@^15` (bản `^13` lỗi `ERR_REQUIRE_ESM` trên Node 22), script `deploy:rules` / `deploy:functions` |

---

## 7. Ngoài phạm vi đợt này (ghi chú cho tương lai)

- **`features/sticker-event`**: cùng pattern lỗ hổng (`updateUserRole` ở [firebaseService.ts:205](features/sticker-event/services/firebaseService.ts#L205) ghi role trực tiếp từ client), nhưng dùng Firebase project riêng/cấu hình động (`firebase-applet-config.json`, không có trong repo, hoặc `VITE_FIREBASE_*` env). Cần xác nhận project cụ thể đang deploy trước khi làm Cloud Functions riêng cho khu vực này.
- **`features/bi-dashboard`**: không phát hiện truy cập Firestore trực tiếp (grep `collection(db,…)` trong thư mục này ra rỗng) → có thể không cần backend riêng, chỉ cần rà lại khi có thời gian để xác nhận chắc chắn.

## 8. Lộ trình triển khai (an toàn, không breaking)

1. **Bước 0**: Commit trạng thái hiện tại (theo quy tắc CLAUDE.md mục 0.1) trước khi bắt đầu.
2. **Bước 1**: Thêm `firebase-tools`, `firebase.json`, `.firebaserc`, `firestore.rules` (mục 4) — deploy rules **sau khi** đã kiểm tra kỹ vì đây là thay đổi có thể làm gãy ghi dữ liệu nếu thiếu rule cho collection nào đó. Test bằng Firebase Emulator trước khi deploy lên production.
3. **Bước 2**: Viết & deploy 4 Cloud Functions (mục 5), test độc lập qua Emulator/`firebase functions:shell`, **chưa đổi code client**.
4. **Bước 3**: Sửa client để gọi functions mới (mục 6), giữ song song code cũ trong 1 nhánh/PR để dễ rollback.
5. **Bước 4**: Xóa `GEMINI_API_KEY` khỏi `.env.local`/`vite.config.ts` khi đã xác nhận `generateWithGemini` hoạt động ổn.
6. **Bước 5**: Chạy `npm run check` (typecheck + eslint + build + lint-ratchet) theo quy tắc CLAUDE.md mục 0.7 trước khi báo cáo hoàn tất.

## 9. Kiểm thử

- Firebase Emulator Suite (`firebase emulators:start`) để test rules + functions offline, không đụng dữ liệu thật.
- Kịch bản phải test: (a) user thường không thể tự sửa `role` của mình qua console trình duyệt (thử `updateDoc` thẳng → phải bị `permission-denied`); (b) `resolveSession` set đúng custom claim và client đọc được sau `getIdToken(true)`; (c) `reviewAccessRequest` từ chối nếu caller không phải admin/manager; (d) `generateWithGemini` hoạt động và key không còn xuất hiện trong `dist/` sau build (`grep -r "AIzaSy" dist/` phải rỗng với Gemini key... lưu ý Firebase apiKey vẫn hợp lệ để lộ vì đó là thiết kế của Firebase).

## 10. Rủi ro & Rollback

- Rủi ro lớn nhất: deploy `firestore.rules` thiếu sót có thể chặn nhầm thao tác hợp lệ hiện tại → **bắt buộc test qua Emulator trước**, và có thể deploy rules ở chế độ "log only" (Firebase hỗ trợ dry-run qua `firebase deploy --only firestore:rules --dry-run` không tồn tại thật, thay vào đó dùng Rules Playground trên Console để test từng case trước khi deploy).
- Rollback: `firestore.rules` và `functions` đều có lịch sử version trên Firebase Console, có thể revert nhanh; đồng thời rules cũ (nếu có) nên được export/backup thủ công từ Console trước khi ghi đè (Bước 1).
- Không xóa/sửa `.env`, Firebase key hiện tại theo đúng quy tắc CLAUDE.md mục 0.5 — chỉ thêm secret mới (`GEMINI_API_KEY` dạng Cloud Functions Secret) chứ không động vào `.env.local` cho tới Bước 4.

---

## 11. Trạng thái thực tế (đã cập nhật sau khi code xong)

**Đã xong, đã xác minh (`npm run check` sạch ở root + `npm run build`/`typecheck` sạch ở `functions/`):**
- Bước 0 (commit trước khi sửa), Bước 1 (rules + hạ tầng), Bước 2 (4 Cloud Functions), Bước 3 (wiring client).
- Xác nhận `dist/` sau build không còn chuỗi `GEMINI_API_KEY`/`process.env.API_KEY`/`GoogleGenAI` nào (grep rỗng).
- `firebase-tools` nâng lên `^15.24.0` vì bản `^13` pin ban đầu bị lỗi `ERR_REQUIRE_ESM` trên Node 22 của máy này.

**Chưa làm — cần bạn tự thực hiện (đăng nhập tài khoản Google của bạn, tôi không nên/không thể làm thay):**
```bash
npx firebase login
# Test kỹ firestore.rules qua Rules Playground trên Firebase Console trước khi deploy thật
npx firebase deploy --only firestore:rules
cd functions && npx firebase functions:secrets:set GEMINI_API_KEY
npm run deploy:functions   # chạy ở thư mục gốc
```
**Quan trọng**: sau khi các bước trên hoàn tất và xác nhận hoạt động đúng, **mới** được chạy `npm run deploy` (build + push `dist/` lên production) — vì code client hiện tại đã gọi `resolveSession`/`requestAccess`/`adminUpdateUser`/`generateWithGemini`, nếu deploy web trước khi các Cloud Function này tồn tại trên Firebase thật thì **toàn bộ đăng nhập của mọi user sẽ gãy** (function not-found).

**Chưa làm — theo đúng lộ trình phased đã duyệt:**
- Bước 4 (xóa `GEMINI_API_KEY` khỏi `.env.local`) — chỉ làm sau khi xác nhận `generateWithGemini` chạy ổn trên production.
- `demoteExpiredUsers` đã viết nhưng là scheduled function optional — sẽ tự chạy khi deploy cùng các hàm khác, không cần thao tác thêm.
- Mục 7 (sticker-event, bi-dashboard) — vẫn ngoài phạm vi, chưa động tới.

## 12. Bug phát hiện khi test thật (2026-07-17) — đã sửa

Sau khi deploy functions + rules và test bằng `npm run dev`, Console báo 2 lỗi `Missing or insufficient permissions`:
- **`users/{uid}/salesData/{doc}` bị thiếu trong `firestore.rules`** — gây "Đồng bộ dữ liệu thất bại" ở [services/cloudDataService.ts](services/cloudDataService.ts). Nguyên nhân: lệnh gọi `collection(db, 'users', uid, 'salesData')` (nhiều tham số path) lọt qua quy tắc `grep` lúc audit ban đầu ở mục 1.2 — bài học: audit lại bằng cách grep rộng hơn (`collection(db\|doc(db`) thay vì regex chỉ bắt 1 segment.
- **`_system/{doc}` bị chặn write hoàn toàn** (`allow write: if false`) — gây "Traffic Counter Error" ở [hooks/useSystemTraffic.ts](hooks/useSystemTraffic.ts), một bộ đếm lượt truy cập vô hại, không liên quan phân quyền. Tôi đã chặn nhầm theo giả định chung "chỉ Cloud Function được ghi" mà không kiểm tra thực tế ai/tại sao ghi vào đó.

**Đã sửa** cả hai trong `firestore.rules` (mục 4 đã cập nhật). **Cần bạn deploy lại**:
```bash
npx firebase deploy --only firestore:rules
```
Sau đó test lại `npm run dev`, xác nhận Console không còn 2 lỗi trên, rồi mới sang Bước 6 (`npm run deploy` production).

## 13. Gắn tính năng AI vào UI + 4 lớp lỗi phải gỡ tuần tự (2026-07-17 → 07-18) — ĐÃ XONG, ĐÃ XÁC NHẬN HOẠT ĐỘNG

`AiSuggestPatternModal.tsx` (gọi `generateWithGemini`) trước đó là code mồ côi — import trong `PhanCaView.tsx` nhưng chưa từng gắn nút mở lên UI. Đã gắn nút "Gợi ý AI" vào `EditPatternModal.tsx` (đúng chỗ nút "Gợi ý ca xoay" cục bộ bị lỗi vừa xóa, xem commit `61f3030`). Quá trình test thật sau đó lộ ra 4 lớp lỗi độc lập, phải gỡ tuần tự:

1. **z-index** — modal AI mở lồng trong `EditPatternModal` (`z-[60]`) nhưng dùng z-index mặc định `z-50` của component `Modal` → bị che khuất, tưởng bấm không phản ứng. Fix: set `z-[70]` (commit `edeed3e`).
2. **Sai session Firebase** — `features/phan-ca/services/firebase.ts` dùng named app riêng (`'phanca'`) để né lỗi "app already exists", nhưng app riêng này có auth session KHÁC session người dùng thật (ở app `[DEFAULT]`, `services/firebase.ts` gốc). Gọi Cloud Function qua app riêng này → không đính kèm ID token → Cloud Run từ chối ở tầng hạ tầng ("Empty Authorization header"). Fix: expose `functions` VÀ `db` (gắn đúng session thật) qua root `AuthContext`, `AiSuggestPatternModal.tsx` và `firestoreSync.ts`/`usePhanCaData.ts` lấy qua `useAuth()` thay vì tự tạo từ app riêng (commit `a6b446f`, `13fddae`).
3. **Thiếu quyền "Allow public access" trên Cloud Run** — sót lại từ các lần deploy đầu gặp lỗi 409 liên tục (xem mục troubleshooting trước đó). Xác nhận qua log: `resolvesession` có `"Callable request verification passed"`, `generatewithgemini` thì không — bị chặn trước khi chạm code. **Người dùng tự cấp quyền** qua Google Cloud Console → Cloud Run → `generatewithgemini` → tab Security → "Allow public access" (không cần qua CLI/deploy lại).
4. **Model `gemini-2.5-pro` đã bị Google ngừng cấp cho user mới** — lỗi thật đọc được từ log sau khi 3 lớp trên đã thông: `"This model models/gemini-2.5-pro is no longer available to new users"`. Đổi sang `gemini-3.5-flash` (bản GA — Generally Available — Google khuyến nghị thay thế, xác nhận qua tài liệu chính thức tháng 07/2026). Commit `ddb76ac`, đã deploy riêng hàm này.

**Bài học rút ra**: khi 1 trong 5 Cloud Function báo lỗi mà 4 hàm còn lại hoạt động bình thường, đừng vội nghi ngờ code chung (rules/client auth) — nhiều khả năng là cấu hình deploy/hạ tầng riêng của đúng hàm đó (IAM invoker, model bên thứ 3 hết hạn...). Luôn đọc log thật (`firebase functions:log`) trước khi đoán, vì thông báo lỗi phía client ("internal") không phản ánh nguyên nhân gốc.

---

## 14. Mở rộng bảo mật sang `features/sticker-event` (2026-07-18) — ĐANG LÀM

### 14.1. Audit thực tế (không như giả định ban đầu ở đầu file này)

Trái với mục 0 ghi "dùng Firebase project riêng" — audit sâu cho thấy sticker-event dùng **CÙNG project** `dashboa-7e20b`, chỉ khác **Firestore database riêng** tên `ai-studio-16672ec9-22fb-43a6-b6ee-e59aa8a8c699` (không phải `(default)`), cấu hình tại `features/sticker-event/firebase-applet-config.json` (đang bị track trong git dù tưởng đã gitignore — ghi chú riêng, không phải rủi ro nghiêm trọng vì bảo mật thật nằm ở Rules chứ không phải giấu API key).

**5 lỗ hổng tìm thấy:**
1. `Login.tsx:200-207` — tự đăng ký, user tự chọn `role` bằng radio button rồi tự `setDoc` thẳng vào Firestore.
2. `services/firebaseService.ts:205-215,217-225,227-248` — `updateUserRole`/`deleteUserDoc`/`clearAllUsers` ghi trực tiếp từ client, guard chỉ ở component (`UserManagementModal.tsx`).
3. **Cross-tenant**: `updateUserRole(userId, role)`/`deleteUserDoc(userId)` không kiểm tra `userId` đó có cùng `storeId` với admin gọi hay không — admin kho A về lý thuyết sửa được user kho B nếu biết UID.
4. 🔴 **Mật khẩu mặc định dùng chung `staff_default_password_123` cho MỌI tài khoản `staff`** (`Login.tsx:30,114`) — ai biết username là đăng nhập được. Người dùng đã xác nhận xử lý luôn đợt này.
5. **"Super Admin" chỉ là so sánh chuỗi client-side** (`StickerEventApp.tsx:403`): `username==='admin'||username==='21707'||email in [...]`.
6. `stores/{storeId}/**` (productChunks, inventoryChunks, metadata, savedLists, manualProducts) **chưa có Rules nào ràng buộc theo storeId** trong repo — nguy cơ 1 user kho A đọc/ghi được dữ liệu kho B nếu Rules hiện tại (ngoài repo, trên Console) đang lỏng.

### 14.2. Thiết kế

**Custom claims namespace RIÊNG** — `stickerRole` / `stickerStoreId` (KHÔNG dùng lại tên `role`/`departmentId` của root) — vì `setCustomUserClaims()` GHI ĐÈ toàn bộ claims chứ không merge; dù cùng 1 Auth user pool (project chung), 2 hệ thống set tên claim khác nhau để tránh khả năng đè lẫn nhau nếu có ngày trùng UID.

**3 Cloud Function mới** (`functions/src/stickerEvent.ts`, cùng codebase/deploy với 5 hàm hiện có vì chung project):
1. `stickerRegister({username, storeId, requestedRole})` — thay `Login.tsx` tự `setDoc`. Kiểm tra server-side "kho đã có admin chưa" (thay vì client tự query rồi tự tin ghi), set custom claims sau khi ghi.
2. `stickerResolveSession()` — gọi mỗi lần đăng nhập (thay raw `getDoc` trong `onAuthStateChanged`), đọc role/storeId thật từ Firestore, áp logic Super Admin (danh sách username/email y hệt bản cũ nhưng chuyển hẳn vào server) để set claim `stickerRole` chính xác.
3. `stickerAdminUpdateUser({action:'setRole'|'delete'|'clearStore', targetUid?, role?, storeId?})` — thay `updateUserRole`/`deleteUserDoc`/`clearAllUsers`. Enforce: admin thường chỉ thao tác trong `storeId` của chính mình (Firestore lookup xác nhận target cùng kho), `superadmin` claim mới bỏ qua ràng buộc này. Giữ nguyên các guard cũ (không tự sửa mình, không đụng username `"admin"`).

**Firestore Rules mới** (`firestore.stickerevent.rules`, deploy cho database `ai-studio-16672ec9-...` qua `firebase.json` dạng mảng multi-database):
- `users/{uid}`: `get`/`list` theo `isSelf` hoặc cùng `stickerStoreId` (admin) hoặc `isSuperAdmin`; `update` tự thân chỉ cho field không nhạy cảm (`role`/`storeId` bị khoá); `create` luôn `false` (chỉ Cloud Function tạo).
- `users/{uid}/state/{doc}`: `isSelf` — không đổi hành vi hiện có.
- `stores/{storeId}/**`: cho phép đọc/ghi nếu `isSignedIn() && (isSuperAdmin() || myStoreId()==storeId)` — vá lỗ hổng #6, không siết thêm phân biệt admin/staff trong cùng kho (giữ nguyên hành vi nghiệp vụ hiện có, chỉ thêm ranh giới theo kho).

**⚠️ Bug đã biết của Firebase CLI với multi-database**: `firebase deploy --only firestore:rules` có thể báo "Deploy complete!" nhưng KHÔNG deploy gì cả với cấu hình multi-database dạng mảng (xác nhận qua GitHub issue firebase-tools#10447). Phải dùng `firebase deploy --only firestore` (không chỉ định sub-target) và **tự xác minh lại trên Firebase Console** sau khi deploy, không tin tưởng output CLI.

**Client cần sửa**: `features/sticker-event/firebase.ts` (thêm export `functions`), `Login.tsx` (bỏ `STAFF_DEFAULT_PASSWORD`, hiện ô mật khẩu cho cả 2 role, gọi `stickerRegister`/`stickerResolveSession` thay vì tự đọc/ghi Firestore), `services/firebaseService.ts` (3 hàm role/delete/clear đổi sang gọi Cloud Function nhưng GIỮ NGUYÊN chữ ký hàm để `UserManagementModal.tsx` không cần sửa), `SuperAdminModal.tsx` (đổi `deleteDoc` trực tiếp sang gọi `deleteUserDoc` qua service).

### 14.3. Ngoài phạm vi / giữ nguyên hành vi
- Không xoá Firebase Auth account khi xoá user (giữ đúng hạn chế đã ghi rõ trong UI hiện tại: "cần xoá tài khoản Auth trong Firebase Console để xoá hoàn toàn").
- Không đổi danh sách ai được là Super Admin — chỉ chuyển đúng logic hiện có (username/email cụ thể) sang server-side, không mở rộng/thu hẹp quyền truy cập.
- Không đụng đến `features/bi-dashboard` (vẫn xác nhận không có truy cập Firestore riêng).

**⚠️ Trạng thái deploy tại thời điểm viết mục này**: toàn bộ 6 commit của mục 11-13 (gắn nút AI, cập nhật CLAUDE.md, và 4 fix ở trên) **mới chỉ có ở local, CHƯA push lên GitHub, CHƯA deploy production** (`gh-pages` lần cuối publish 2026-07-17 16:39, trước tất cả các commit này). Cần chạy `npm run deploy` để đưa lên production thật.

### 14.4. Lỗ hổng leo thang đặc quyền phát hiện khi review (2026-07-18) — ĐÃ SỬA

Trước khi deploy, review phát hiện `protectedKeys()` trong `firestore.stickerevent.rules` (bản nháp mục 14.2) chỉ khoá `['role', 'storeId']`, bỏ sót `username`. Trong khi `stickerResolveSession` (gọi mỗi lần đăng nhập) tin `username` đọc từ Firestore để xét Super Admin (`isSuperAdminIdentity` so khớp `username === 'admin'/'21707'`) — field này KHÔNG được khoá nên client tự `updateDoc(users/{uid}, {username:'admin'})` là tự cấp được custom claim `stickerRole:'superadmin'` cho chính mình, bỏ qua mọi ràng buộc `storeId`. Đây là lỗ hổng nghiêm trọng nhất trong toàn bộ đợt mở rộng bảo mật sang sticker-event, phá vỡ đúng mục tiêu "không còn đường nào để client tự nâng quyền" đã đặt ra từ mục 2.

So sánh với root (`functions/src/session.ts` dùng `SUPER_ADMIN_EMAIL` — chỉ đọc từ `request.auth.token.email` đã xác thực bởi Firebase Auth, không bao giờ đọc từ Firestore do client ghi) thì đây là điểm sticker-event làm khác/kém an toàn hơn.

**Đã sửa**: thêm `'username'` vào `protectedKeys()` (`firestore.stickerevent.rules`). Không cần sửa `functions/src/stickerEvent.ts` — logic server giữ nguyên, lỗ hổng nằm hoàn toàn ở tầng Rules thiếu khoá field. Đã grep xác nhận không nơi nào khác trong `features/sticker-event` tự ghi `username` ngoài `stickerRegister` (qua Admin SDK, không bị Rules chặn) nên không phá tính năng nào.

**Cần làm khi deploy** (bổ sung vào checklist mục 11): sau `firebase deploy --only firestore`, test lại đúng kịch bản này trên Emulator/thật — 1 tài khoản staff/admin thường tự `updateDoc` field `username` phải nhận `permission-denied`.

### 14.5. Đã deploy rules + functions lên production Firebase (2026-07-18)

Đã chạy (theo yêu cầu trực tiếp của user, nêu rõ đúng 2 lệnh):
```bash
npx firebase deploy --only firestore   # firestore.rules + firestore.stickerevent.rules — cả 2 "released" thành công
npm run deploy:functions               # stickerRegister/stickerResolveSession/stickerAdminUpdateUser: create OK; 5 hàm cũ: update OK
```
`firebase login:list` xác nhận CLI đã đăng nhập sẵn `lts.truongson@gmail.com` trước khi chạy — không cần thêm bước đăng nhập.

**⚠️ Rủi ro đã biết cần verify tiếp** (rút kinh nghiệm từ mục 13, điểm 3 — `generateWithGemini` từng bị thiếu quyền "Allow public access" trên Cloud Run ngay sau lần deploy/tạo mới đầu tiên, khiến request bị chặn ở tầng hạ tầng trước khi chạm code): 3 hàm sticker* vừa **tạo mới lần đầu** (create operation, không phải update) nên có cùng rủi ro. **Chưa tự test được** (cần đăng nhập sticker-event thật). Trước khi báo tính năng hoạt động, cần bạn tự đăng nhập thử 1 tài khoản sticker-event và xác nhận không gặp lỗi "internal"/"UNAUTHENTICATED" ở tầng Cloud Run — nếu có, vào Google Cloud Console → Cloud Run → từng hàm `stickerregister`/`stickerresolvesession`/`stickeradminupdateuser` → tab Security → bật "Allow public access" (không cần deploy lại).

**Vẫn CHƯA deploy web** (`npm run deploy` / `gh-pages`) — production web hiện vẫn chạy code cũ (chưa gọi các hàm sticker* mới), nên chưa ảnh hưởng user thật. Chỉ chạy `npm run deploy` sau khi đã tự test kỹ luồng đăng nhập/đăng ký/quản trị sticker-event với functions+rules mới này.

### 14.6. Bug phát hiện khi test thật (2026-07-18) — đã sửa: cache sessionStorage bỏ qua đồng bộ claim

User tự test bằng `npm run dev` với 1 tài khoản NV có sẵn (Kho 300) → gặp lỗi Firestore "Missing or insufficient permissions" ngay ở màn hình In Sticker (đọc `stores/{storeId}/**`).

**Nguyên nhân**: `Login.tsx` cache `userData_{uid}` vào `sessionStorage`; khi cache tồn tại, code trả về `onLoginSuccess` ngay và **bỏ qua** việc gọi `stickerResolveSession()` + `user.getIdToken(true)`. Tài khoản đã đăng nhập từ TRƯỚC khi 3 Cloud Function này tồn tại có token không mang claim `stickerRole`/`stickerStoreId` → rule `myStoreId() == storeId` luôn sai → mọi đọc/ghi `stores/{storeId}/**` bị từ chối. Đăng xuất/đăng nhập lại cùng tài khoản **không tự sửa được** vì cache key theo `uid`, vẫn trúng cache cũ.

**Đã sửa** (`Login.tsx`, nhánh cache-hit): trước khi tin cache, gọi `user.getIdTokenResult()` (đọc token hiện có, không force refresh) kiểm tra `claims.stickerRole` đã tồn tại chưa — nếu chưa thì bỏ qua cache, rơi xuống gọi `stickerResolveSession()` như bình thường (tự đồng bộ claim + cache lại). User cũ chỉ cần đăng nhập lại 1 lần sau khi có bản code này là tự khỏi, không cần tự xoá `sessionStorage` tay.

**Cần làm**: build lại + `npm run dev`/test lại đúng tài khoản NV/Kho 300 đã báo lỗi để xác nhận hết "Missing or insufficient permissions", rồi mới tính đến `npm run deploy`.

### 14.7. Bug thứ 2 phát hiện khi test thật (2026-07-18) — đã sửa: vòng lặp đồng bộ vô hạn `stickerSavedLists`

Sau khi hết lỗi permission (14.6), log Console cho thấy `hooks/useCloudSync.ts` (ROOT, cơ chế đồng bộ "khóa nặng" dùng chung cho cả 4 khu vực) ghi/đọc lại key `stickerSavedLists` liên tục mỗi ~2.5 giây, không dừng — **không liên quan gì đến phần bảo mật sticker-event vừa làm**, là bug riêng ở tầng đồng bộ chung.

**Nguyên nhân** (đã trace qua code, không phải đoán): vòng khép kín 4 bước giữa `features/sticker-event/hooks/useStickerPrinterData.ts` và `hooks/useCloudSync.ts`:
1. Cloud có bản mới → `useCloudSync.ts` ghi xuống IndexedDB (`saveSettingFromCloud`, dùng chung DB `BI_HUB_DATABASE_V2` với zone sticker-event — xem mục kiến trúc "zone-local dbService") → bắn event `indexeddb-change`.
2. `useStickerPrinterData.ts` (dòng ~478-489 bản cũ) nghe event đó → `setSavedLists(data)`.
3. Effect "Sync savedLists to IndexedDB" (dòng ~554-565 bản cũ) chạy lại vì `savedLists` đổi (state) → gọi `saveSetting()` ghi lại **y hệt dữ liệu vừa đọc từ storage** → hàm này (khác `saveSettingFromCloud`) bắn thêm event `ycx-setting-changed`.
4. `useCloudSync.ts` nghe `ycx-setting-changed` → coi là sửa đổi thật của user → debounce 2s → ghi lại lên Firestore với `serverTimestamp()` mới → cloud "mới hơn" local → quay lại bước 1.

**Đã sửa** (chỉ trong `useStickerPrinterData.ts`, không đụng `hooks/useCloudSync.ts` dùng chung cho 4 khu vực): thêm `skipNextSavedListsSaveRef` — khi state `savedLists` được cập nhật từ `indexeddb-change` (bước 2), đánh dấu cờ này; effect ghi-lại (bước 3) đọc cờ, nếu đang bật thì bỏ qua đúng 1 lần rồi tắt cờ, không ghi lại/không bắn `ycx-setting-changed` nữa → cắt vòng lặp.

**Ghi chú phạm vi**: grep thấy 4 file khác (`features/bi-dashboard/hooks/useMonthlyBonusArchive.ts`, `useNhanVienData.ts`, `useDashboardLogic.ts`, `hooks/useEmployeeAnalysisLogic.ts`) cũng nghe `indexeddb-change` — **chưa kiểm tra** có cùng pattern lỗi (effect tự ghi-lại state vừa nhận từ storage) hay không, vì ngoài phạm vi bug cụ thể được yêu cầu sửa lần này. Nếu sau này gặp log lặp tương tự ở các key khác (`productConfig`, `customTabs`...), nên soát lại đúng 4 file này theo cùng cách.

**Cần làm**: test lại `npm run dev`, mở "In Sticker" > Danh sách đã lưu, theo dõi Console — log `[Cloud Sync] Real-time... stickerSavedLists` không được lặp lại vô hạn nữa (chỉ chạy 1 lần khi có thay đổi thật).

### 14.8. Bug thứ 3 phát hiện khi test thật (2026-07-18) — đã sửa: nháy màn "Cập Nhật Mã Kho" cho tài khoản Super Admin ROOT

Ngoài phạm vi sticker-event: user (email `lts.truongson@gmail.com`, đúng `SUPER_ADMIN_EMAIL` trong `functions/src/session.ts`) đăng nhập tab **Phân Tích** (`?tab=analysis`, module ROOT — khác hoàn toàn hệ đăng nhập sticker-event) và bị đá sang màn `PendingApprovalView forceDeptUpdate` ("Cập Nhật Mã Kho") dù đúng ra phải được tự động cấp `role='admin'`. Xác nhận qua hỏi trực tiếp: **không phải lỗi persistent** — tự hết sau vài giây hoặc F5, đúng dấu hiệu race condition khi tải trang, không phải lỗi logic `resolveSession()`.

**Nguyên nhân**: `contexts/AuthContext.tsx` (trước sửa) gọi `setIsLoading(false)` **ngay khi** `onAuthStateChanged` xác nhận có user, **trước khi** `resolveSession()` (bất đồng bộ, phải gọi Cloud Function) chạy xong. Trong khoảng hở đó, `App.tsx` render dựa trên `userRole` vẫn là `null`/giá trị cache cũ (nếu là trình duyệt/thiết bị mới, chưa có cache) → `App.tsx:210` (`userRole !== 'admin' && !departmentId`) → hiện nhầm màn "Cập Nhật Mã Kho" → tự sửa lại ngay khi `resolveSession()` trả về `role:'admin'` một khắc sau đó.

**Đã sửa** (`contexts/AuthContext.tsx`): dời `setIsLoading(false)` vào `finally` của khối `try { resolveSession()... }` (nhánh có user) và giữ nguyên ở nhánh không có user (logout) — spinner giờ hiển thị xuyên suốt tới khi có kết quả `resolveSession()` thật, không còn render tạm với `userRole` chưa cập nhật. Timeout dự phòng 5s (`fallbackTimer`, dòng ~82) vẫn giữ nguyên làm lưới an toàn nếu `resolveSession()` treo.

**Phạm vi**: chỉ sửa `contexts/AuthContext.tsx` (dùng chung cho ROOT + `features/phan-ca` qua `useAuth()`) — KHÔNG đụng `functions/src/session.ts` (logic server không có lỗi). Rủi ro thấp: chỉ đổi thời điểm tắt spinner, không đổi luồng dữ liệu/quyền.

**Cần làm**: test lại đăng nhập bằng đúng tài khoản `lts.truongson@gmail.com` ở tab Phân Tích, xác nhận không còn nháy màn "Cập Nhật Mã Kho" (vào thẳng dashboard sau khi spinner tắt).

**Cập nhật 2026-07-18 (sau khi test lại, vẫn còn nháy)**: fix ở 14.8 chưa đủ — còn 1 nguồn race thứ 2. `fallbackTimer` (dòng ~82, "Firebase Auth response timeout... stop loading", set 5s) **không bao giờ bị huỷ** khi `onAuthStateChanged` đã có kết quả (chỉ huỷ ở cleanup effect lúc unmount, gần như không bao giờ xảy ra trong vòng đời app). Sau khi 14.8 dời `setIsLoading(false)` vào `finally` của `resolveSession()`, timer 5s này vẫn tự bắn độc lập và ép `isLoading=false` bất kể `resolveSession()` xong chưa — nếu Cloud Function cold-start (rất dễ xảy ra ngay sau khi vừa `npm run deploy:functions` ở mục 14.5) mất hơn 5s, vẫn tái tạo đúng race cũ, chỉ trong cửa sổ 5s thay vì tức thì. Khớp triệu chứng user báo: nháy màn hình, tự hết "sau một lúc", F5 (function đã ấm) thì nhanh hơn.

**Đã sửa thêm**: `clearTimeout(fallbackTimer)` ngay dòng đầu callback `onAuthStateChanged` — mục đích ban đầu của timer (đề phòng Firebase Auth không bao giờ phản hồi) đã hoàn thành ngay khi callback này chạy, không cần giữ nó sống thêm để can thiệp vào phần chờ `resolveSession()` phía sau.

**Cần làm**: test lại lần nữa (nhớ hard refresh / restart `npm run dev` để chắc chắn không dùng bundle cũ qua HMR), xác nhận hết nháy hoàn toàn.

**Xác nhận 2026-07-19 (đã test lại đúng kịch bản F5-khi-đã-đăng-nhập, bật "Preserve log")**: **hết nháy hoàn toàn** — dashboard render thẳng, không còn thấy `PendingApprovalView`/"Cập Nhật Mã Kho", không có lỗi `resolveSession`. 2 fix ở 14.8 (dời `isLoading` vào `finally` + huỷ `fallbackTimer` ngay khi có kết quả auth) đã giải quyết đúng root cause. Coi như ĐÃ XONG mục 14.8.

**Phát hiện phụ (ngoài phạm vi, chưa xử lý)**: log lộ lỗi Firestore thật lặp lại — `setDoc() called with invalid data. Nested arrays are not supported (found in document users/{uid}/configs/checkthuong_data)`. Tính năng "Check Thưởng" đang cố đồng bộ 1 field kiểu mảng-lồng-mảng lên Firestore (Firestore không hỗ trợ), bị lỗi và tự bắt (`useDataManagement.ts:253`, log rõ "không ảnh hưởng app" — có catch, không crash). Chưa xác định field cụ thể nào lồng mảng. Không xử lý trong phiên này vì ngoài phạm vi (bảo mật sticker-event + bug nháy màn hình ROOT).

---

## 15. Tối ưu tốc độ khởi động (2026-07-19) — chủ đề mới, KHÔNG liên quan mục 1-14

> Phạm vi: `hooks/useDataManagement.ts` (CRITICAL, dùng chung tab Phân Tích + Check Thưởng) và các service liên quan tính DTQĐ (`utils/dataUtils.ts`, `services/filterService.ts`). Khác hẳn chủ đề mục 1-14 (Cloud Functions bảo mật) — đây là vấn đề hiệu năng thuần tuý.

### 15.1. Bối cảnh

User báo app load rất lâu mỗi lần khởi động, cả mobile lẫn laptop, kèm ảnh chụp modal "AI ENGINE PROCESSING — Nạp dữ liệu đã lưu lên bảng điều khiển..." đứng ở 25%. User đề xuất: cấu hình (hệ số Bảo Hiểm/VAS/Hình thức xuất/Ngành hàng BI, tổng ~1242 dòng) hiện quản lý trên Google Sheet cho dễ sửa, nhưng mỗi lần khởi động phải tải lại — hỏi có nên tự động lưu cấu hình đó vào Firebase để tải nhanh hơn không.

### 15.2. Điều tra (đã đọc code, chưa sửa gì tại thời điểm viết mục này)

**A. Màn hình trong ảnh chụp KHÔNG phải bước tải Google Sheet.** Message "Nạp dữ liệu đã lưu lên bảng điều khiển..." (`hooks/useDataManagement.ts:139`) là bước mount lại **dữ liệu doanh số Excel đã lưu trước đó của user** (khác message "Tải cấu hình lõi từ Sheet..." ở dòng 89). Modal chỉ tắt khi Web Worker (`services/analytics.worker.ts`, nạp qua `hooks/useDataManagement.ts:600`) xử lý xong.

**B. Nguồn dữ liệu doanh số là TOÀN BỘ lịch sử, không giới hạn.** `dbService.getMergedSalesData()` (`services/dbService/salesData.ts:588-734`) gộp **mọi file có `isActive=true` trong registry** (dòng 591, 620-640) — không có `MAX_ROWS`/`MAX_FILES`. Comment ở `utils/dataUtils.ts:499` xác nhận có thể lên tới hàng chục/trăm nghìn dòng. Đây nhiều khả năng là nguyên nhân chính của độ trễ trong ảnh chụp — không phải do Google Sheet.

**C. Bên trong Worker, `calculateRowMetrics` (qua `getHeSoQuyDoi`, `utils/dataUtils.ts:170-256`) có nhánh chậm ẩn**: với mỗi dòng doanh số KHÔNG khớp exact-key trong `vasNameMultiplierMap`/`PRODUCT_NAME_COEFFICIENTS` (tức đa số dòng điện máy thường, không phải VAS/bảo hiểm), code duyệt tuần tự ~109 entry bằng `.includes()` chuỗi (dòng 189-193, 197-201) thay vì tra cứu O(1). Với dataset lớn (mục B), đây là hệ số nhân đáng kể trong hot path chạy cho MỌI dòng dữ liệu.

**D. Về câu hỏi Google Sheet → Firebase của user**: kiến trúc **đã có sẵn** IndexedDB cache (`services/dbService/settings.ts`) — nếu cache hợp lệ, không gọi mạng (`useDataManagement.ts:84-95`, đã có "PERF FIX" từ trước). **Đã có** đồng bộ lên Firestore (`users/{uid}/configs/productConfig` qua `services/firestoreService.ts`) làm bản sao lưu đa thiết bị. Nhưng khi cache IndexedDB trống (hay gặp trên mobile vì Safari/iOS tự dọn IndexedDB để tiết kiệm dung lượng — ITP storage eviction, hành vi đã biết của WebKit), code đi thẳng xuống tải **toàn bộ workbook Excel từ Google Sheet** (`services/dataService.ts` — fetch `output=xlsx`, không ETag/partial fetch), bỏ qua bản Firestore nhẹ hơn nhiều đã có sẵn.

### 15.3. Kế hoạch xử lý — chia 2 phần theo mức độ rủi ro

**Phần 1 (làm ngay, rủi ro thấp) — đúng yêu cầu gốc của user: đọc Firestore trước khi tải Sheet khi cache trống**

File đổi: `hooks/useDataManagement.ts` (chỉ đoạn dòng 87-95).

Thiết kế: khi `isConfigOutOfDate` = true, tách 2 trường hợp:
- Cache **trống hoàn toàn** (`!config`) và có user đăng nhập (không demo) → thử đọc `users/{uid}/configs/productConfig` qua `fetchHeavySettingsFromCloud` (đã có sẵn trong `services/firestoreService.ts`, đang được gọi lại ở dòng 158 cho mục đích khác — dùng lại, không viết hàm mới) TRƯỚC. Nếu có dữ liệu hợp lệ → dùng ngay (nhanh, chỉ 1 doc JSON nhỏ so với cả workbook Excel), lưu lại vào IndexedDB, **không** tải Sheet ở bước blocking.
- Cache tồn tại nhưng **URL khác** (`cachedUrl !== configUrl`, tức admin vừa đổi Sheet cấu hình) → **KHÔNG** dùng Firestore fallback, vì bản ghi trên Firestore không mang theo metadata URL nên không biết nó ứng với Sheet nào — phải tải thẳng từ Sheet mới để chắc chắn đúng dữ liệu, tránh hiển thị nhầm cấu hình cũ.
- Nếu Firestore cũng trống/lỗi (user mới toanh, chưa từng sync) → rơi xuống đúng luồng tải Sheet cũ (giữ nguyên, không đổi).

**Không đổi gì ở Background Sheet Check (dòng 310-348)** — đã tự đúng: do dùng bản Firestore thì biến `cachedConfigReq` (đọc từ IndexedDB gốc) vẫn `null`/không có `fetchedAt`, nên điều kiện dòng 320 tự động fail → `shouldDownload` giữ `true` mặc định → vẫn tự tải Sheet thật để xác nhận/cập nhật trong nền sau 5s, không chặn UI. Tức là: **Sheet vẫn là nguồn sự thật cuối cùng** như user muốn giữ (dễ sửa trên Sheet), chỉ đổi bước NÀO được phép chặn màn hình đầu tiên.

**Phần 2 (CHƯA làm, cần user quyết định trước)** — vì đụng logic tính toán / thay đổi phạm vi dữ liệu hiển thị, rủi ro cao hơn phần 1:
- **15.2.B** (gộp toàn bộ lịch sử doanh số, không giới hạn) là quyết định NGHIỆP VỤ, không phải bug thuần kỹ thuật — giới hạn số file/số dòng nghĩa là dữ liệu cũ sẽ KHÔNG còn xuất hiện trên dashboard nữa. Cần hỏi user trước khi tự ý thêm giới hạn.
- **15.2.C** (tối ưu vòng lặp `.includes()` trong `getHeSoQuyDoi`) nằm NGAY BÊN TRONG `calculateRowMetrics` — theo CLAUDE.md mục 1 ("Nguồn chân lý duy nhất... CẤM tự ý viết lại công thức tính cục bộ ở nơi khác gây sai số chênh lệch"), đây là hàm nhạy cảm nhất dự án, mọi thay đổi phải giữ NGUYÊN 100% kết quả đầu ra, chỉ đổi cách tra cứu nội bộ cho nhanh hơn (ví dụ build sẵn 1 index từ `vasNameMultiplierMap`/`PRODUCT_NAME_COEFFICIENTS` 1 lần khi có `productConfig`, thay vì lặp `.includes()` cho từng dòng) — cần viết test đối chiếu kết quả trước/sau (tương tự script `npx tsx` 6 kịch bản đã dùng ở đợt rà soát 07/10) trước khi coi là an toàn để merge.

### 15.4. Phần 2a — Giới hạn dữ liệu lịch sử gộp (2026-07-19) — ĐÃ LÀM

User chọn: giữ **14 tháng** (đủ biên độ an toàn cho so sánh cùng kỳ năm trước cần 12 tháng), **cứng trong code** (không thêm UI Settings).

File đổi: `services/dbService/salesData.ts` — thêm `RETENTION_MONTHS = 14`, `isFileWithinRetention()`, `pruneStaleActiveFiles()`, gọi trong `getMergedSalesData()` ngay sau khi đọc registry, trước khi lọc `activeFiles`.

Thiết kế:
- Tái sử dụng ĐÚNG field `isActive` sẵn có (không thêm field/cơ chế mới) — file cũ hơn 14 tháng tự động `isActive: false`, **không xoá dữ liệu**. User vẫn tự bật lại bất cứ lúc nào qua `FileHistoryManager` (UI thủ công đã có sẵn, dùng chung `saveSalesFilesRegistry`).
- Mốc thời gian ưu tiên `file.maxDate` (ngày dữ liệu thực trong file, trích lúc upload) — registry cũ chưa có field này (tính năng mới, backfill lazy) fallback về `file.savedAt` (ngày upload) làm proxy gần đúng.
- **An toàn**: nếu việc prune sẽ tắt HẾT toàn bộ file active (vd. user không mở app > 14 tháng), bỏ qua đợt prune đó — tránh dashboard trống trơn không rõ lý do, thà chậm hơn 1 lần.
- Không đụng `useSummaryComparison.ts`/`TrendChart.tsx`/Head-to-Head — các tính năng này vẫn đọc `originalData` như cũ, chỉ là tập dữ liệu gộp giờ nhỏ hơn (nhanh hơn) nếu user có > 14 tháng lịch sử tích luỹ.

`npm run check` xanh. **Chưa test tay** trên trình duyệt với dữ liệu thật nhiều tháng (cần user tự xác nhận: tải app lên, kiểm tra `FileHistoryManager` xem file cũ có tự untick đúng không, và so sánh cùng kỳ năm trước vẫn hoạt động bình thường).

### 15.5. Phần 2b — Tối ưu `getHeSoQuyDoi` (`calculateRowMetrics`) — CHƯA LÀM

Vẫn chờ user xác nhận có muốn làm tiếp không (cần viết test đối chiếu kết quả trước/sau do đụng hàm tính DTQĐ chuẩn, theo đúng cảnh báo CLAUDE.md mục 1).
