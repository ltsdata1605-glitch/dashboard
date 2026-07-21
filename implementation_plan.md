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

### 15.5. Phần 2b — Tối ưu `getHeSoQuyDoi` (`calculateRowMetrics`) — ĐÃ LÀM (2026-07-19)

**Cân nhắc trước khi chọn giải pháp**: `getHeSoQuyDoi` (`utils/dataUtils.ts`) có 2 vòng lặp chậm (dòng 189-193, 197-201 bản cũ) — với MỌI dòng doanh số không khớp exact-key trong `vasNameMultiplierMap`/`PRODUCT_NAME_COEFFICIENTS` (đa số hàng điện máy thường), code duyệt tuần tự ~109 pattern bằng `.includes()` (substring match, không phải exact-key). Vì đây là so khớp CHUỖI CON (không phải tra cứu theo key), không thể thay bằng Map/object lookup đơn thuần — giải pháp đúng đắn về thuật toán (Aho-Corasick multi-pattern search) sẽ đổi hẳn cấu trúc matching, rủi ro cao cho hàm nhạy cảm nhất dự án. Đã cân nhắc và **KHÔNG chọn hướng đó**.

**Giải pháp đã chọn: memoization (cache kết quả) — không đổi thuật toán/logic gốc.** Lý do an toàn: `getHeSoQuyDoi` là hàm thuần (pure function, không side-effect, kết quả chỉ phụ thuộc 5 tham số đầu vào). Dữ liệu bán lẻ điện máy thực tế có tỷ lệ trùng lặp rất cao (cùng 1 SKU/tên sản phẩm xuất hiện hàng trăm-hàng nghìn lần trong dữ liệu gộp nhiều tháng) — cache theo tổ hợp `productCode|maNganhHang|maNhomHang|productName` giúp các dòng trùng chỉ tính 1 lần.

File đổi: `utils/dataUtils.ts` — thêm `heSoQuyDoiCache` (`WeakMap<ProductConfig, Map<string, number>>`, key theo object `productConfig` để tự giải phóng cache khi config đổi, ví dụ sau Background Sheet Check — không cần tự tay invalidate), đổi thân hàm gốc thành `computeHeSoQuyDoi()` (private, y nguyên logic cũ), `getHeSoQuyDoi()` giờ chỉ là lớp cache mỏng bọc ngoài.

**Xác minh trước khi merge**: viết script `_perf_test_getHeSoQuyDoi.ts` (tạm, đã xoá sau khi xong — không commit) — 35 kịch bản test phủ hết các nhánh (VAS exact/substring, static coefficients, VieON 3 mốc, toàn bộ case switch(parentGroup), Priority-2 fallback, switch(maNganhHang) cuối, config null, gọi lặp lại cùng input, 2 object config khác nhau cùng nội dung). Chạy **trước khi sửa** (baseline, đối chiếu với code gốc): 35/35 pass. Chạy **lại sau khi thêm cache**: vẫn 35/35 pass — xác nhận zero thay đổi kết quả.

`npm run check` xanh. **Chưa đo được tốc độ thật với dữ liệu production** (không có sẵn dataset thật để benchmark) — mức độ tăng tốc phụ thuộc tỷ lệ trùng lặp SKU/tên sản phẩm thực tế của user, chưa có con số cụ thể để báo cáo.

### 15.6. Tổng kết mục 15 — trạng thái cuối

Cả 3 phần đã làm xong (15.3 Firestore-first, 15.4 giới hạn 14 tháng, 15.5 memoization), đều đã qua `npm run check`. **Chưa test tay trên trình duyệt với dữ liệu thật** — cần user tự xác nhận: (a) tốc độ khởi động có cải thiện rõ rệt không, (b) `FileHistoryManager` hiển thị đúng file cũ bị tự untick, (c) các bảng/biểu đồ so sánh (đặc biệt "cùng kỳ năm trước") vẫn cho số liệu đúng như trước.

**Đã deploy production qua `npm run deploy` (do user tự chạy) trước khi kịp test tay** — commit `0cb5df1`.

### 15.7. Bug nghiêm trọng phát hiện (2026-07-20): Firestore-first (15.3) KHÔNG BAO GIỜ hoạt động — đã sửa

User báo sau khi deploy: **mỗi lần mở trang đều load cấu hình rất lâu**, không phụ thuộc dữ liệu doanh số nặng/nhẹ — dấu hiệu cho thấy vấn đề nằm ở bước tải CONFIG (không phải Worker xử lý doanh số như 15.4/15.5 đã tối ưu).

**Nguyên nhân — bug tự gây ra ở 15.3**: `services/dbService/settings.ts:saveProductConfig()` lưu dữ liệu IndexedDB dưới dạng BỌC `{config: ProductConfig, url, fetchedAt}` (dòng 26), và khi đồng bộ lên Firestore qua cơ chế heavy-key sync, giá trị lưu trên `users/{uid}/configs/productConfig` cũng giữ NGUYÊN dạng bọc này. Nhưng code Firestore-fallback viết ở 15.3 (`hooks/useDataManagement.ts:100`, bản cũ) lại đọc thẳng `value` như thể chính nó là `ProductConfig` (`cloudSettings['productConfig']?.value as ProductConfig`) — nên `cloudConfig.groups` LUÔN `undefined`, điều kiện `if (cloudConfig && cloudConfig.groups...)` LUÔN false, code LUÔN rơi xuống nhánh tải lại toàn bộ Google Sheet — im lặng không báo lỗi gì. Tức là toàn bộ mục 15.3 **chưa từng thực sự chạy được** kể từ khi viết, dù `npm run check` xanh (lỗi shape runtime, TypeScript không bắt được vì ép kiểu `as ProductConfig`).

**Đã sửa 2 việc**:
1. `hooks/useDataManagement.ts` — đọc đúng field lồng `cloudConfigEntry.config` (không phải `.value` trực tiếp), đồng thời **đối chiếu `cloudConfigEntry.url === configUrl`** trước khi tin dùng (trước đây tưởng nhầm là "Firestore không mang metadata URL" — thực ra CÓ mang, chỉ là đọc sai chỗ).
2. `services/firestoreService.ts` — thêm `fetchProductConfigFromCloud(user)`, đọc ĐÚNG 1 document `configs/productConfig` bằng `getDoc` thay vì `fetchHeavySettingsFromCloud()` (tải cả collection `configs`, có thể kéo theo `checkthuong_data`/`customCalendars`... rất nặng chỉ để lấy 1 field) — nhanh hơn đáng kể, đặc biệt với user có nhiều dữ liệu Check Thưởng/lịch đã lưu.

**Phát hiện phụ, đã sửa luôn (ngoài phạm vi gốc nhưng chặn `npm run check`)**: `features/sticker-event/hooks/useStickerPrinterData.ts:1023` — lỗi TypeScript `stickerType === 'draw'` so sánh không giao nhau, do `handlePrint()` (dòng 907-999) đã có nhánh `if (stickerType === 'draw') {...return;}` riêng từ trước (đổi bởi user ở bản sync `0cb5df1`, không phải tôi) — dòng 1023 nằm SAU nhánh đó nên `stickerType` chắc chắn không còn là `'draw'`, code cũ là tàn dư luôn resolve về giá trị else. Đơn giản hoá về đúng giá trị hằng, không đổi hành vi runtime.

`npm run check` xanh hoàn toàn (typecheck + eslint + build + lint-ratchet).

**Cần test lại**: đây là fix cho đúng vấn đề user báo — cần xác nhận lại tốc độ khởi động thực tế sau khi deploy bản này, đặc biệt khi IndexedDB cache trống (ví dụ mở incognito/xoá site data) để thấy rõ nhánh Firestore-fallback hoạt động (sẽ thấy message "Tải cấu hình từ máy chủ..." thay vì "Tải cấu hình lõi từ Sheet..." trong lúc load).

---

## 16. Kế hoạch tối ưu toàn diện tốc độ khởi động (2026-07-20)

> User vẫn báo production (`dashboard.pro.vn`, mobile 5G + desktop) load rất lâu mỗi lần refresh, YÊU CẦU điều tra kỹ + lên kế hoạch — không chỉ dừng ở 3 việc đã làm ở mục 15 (vốn chỉ tối ưu KHỐI LƯỢNG dữ liệu, chưa đụng tới các nguồn chậm khác). Đã điều tra thêm (agent research, chỉ đọc code + build, chưa sửa gì).

### 16.1. Phát hiện quan trọng nhất: production CHƯA có bản vá mục 15.7

Bản deploy gần nhất (`0cb5df1`, `npm run deploy` do user chạy 19/7) đã bao gồm mục 15.3-15.5 nhưng đó là **bản Firestore-first bị lỗi shape** (không bao giờ hoạt động thật, luôn rớt về tải Sheet). Bản sửa đúng (`813c5eb`, mục 15.7) mới chỉ push GitHub, **chưa deploy**. → Toàn bộ ảnh chụp production user gửi hôm nay nhiều khả năng vẫn phản ánh đúng bug đã tìm ra và sửa hôm qua, chỉ là chưa lên production. **Việc đầu tiên cần làm: deploy `npm run deploy` bản mới nhất**, rồi mới đánh giá các nguồn chậm khác còn tồn tại sau đó.

### 16.2. Các nguồn chậm KHÁC (độc lập với mục 15, chưa từng được tối ưu)

**A. Auth chặn CỨNG toàn bộ UI trước khi có bất kỳ nội dung nào** (`contexts/AuthContext.tsx`, `App.tsx:191-197`)
Khi `isLoading=true`, app không render GÌ CẢ (kể cả Sidebar) — chỉ 1 spinner trắng. `isLoading` chỉ về `false` sau 3 lệnh `await` NỐI TIẾP: `resolveSession()` (Cloud Function, ~200ms ấm – vài giây nếu cold-start, không có cấu hình `minInstances` nên dễ cold) → `getIdToken(true)` (~100-500ms) → `getDoc(users/uid)` đọc `settings` cá nhân (~100-800ms, mạng 5G có latency cao hơn wifi). Đây là round-trip mạng cộng dồn **hoàn toàn TRƯỚC** khi `DashboardView`/`useDataManagement` bắt đầu chạy dòng nào — độc lập hoàn toàn với mọi tối ưu ở mục 15.

**B. Tổng payload JS phải tải trước khi tab Phân Tích (mặc định) hiện nội dung: ~730 kB gzip / ~2.7 MB giải nén**
`DashboardView` tuy đã `lazy()` nhưng là tab mặc định nên tải gần như ngay (278 kB gzip/1 MB raw — chunk lớn nhất toàn dự án). Cộng thêm 4 chunk vendor bị `<link rel="modulepreload">` tải VÔ ĐIỀU KIỆN trong `dist/index.html` bất kể tab nào mở: `vendor-firebase` (146 kB gzip), `vendor-charts`/recharts (116 kB gzip), `vendor-motion` (32 kB gzip), `vendor-icons` (21 kB gzip). Trên mobile 5G (băng thông biến thiên) + CPU di động yếu hơn desktop (parse/execute JS chậm hơn), đây là chi phí đáng kể mà 3 việc ở mục 15 (chỉ tối ưu dữ liệu) không hề đụng tới.

**C. Parse Excel/tính toán chạy trên Main Thread, không qua Worker, ở 2 chỗ**
- `services/dataService.ts:loadConfigFromSheet` — khi phải tải Google Sheet (cache/Firestore đều trống), `XLSX.read()` chạy main thread, chặn UI trong lúc parse.
- File doanh số: có comment CHỦ Ý ("Xử lý file YCX trực tiếp trên Main Thread... Thay thế Worker để tránh overhead load thư viện") ở luồng xử lý file — **đây là quyết định thiết kế cũ, chưa rõ áp dụng cho luồng nào (upload mới hay cả reload lúc khởi động) và lý do gốc còn đúng không** — cần điều tra thêm lịch sử/log trước khi cân nhắc đổi lại, tránh lặp lại sai lầm y hệt Worker cũ từng bị revert.

**D. 2 Firestore `onSnapshot` listener (`hooks/useCloudSync.ts`) mở song song ngay khi có user**
Không chặn (chạy song song), nhưng cạnh tranh băng thông/CPU cùng lúc với việc tải 730 kB JS + config trên thiết bị di động.

### 16.3. Kế hoạch hành động — xếp theo ưu tiên tác động/rủi ro

| # | Việc | Tác động | Rủi ro | Cần gì trước khi làm |
|---|---|---|---|---|
| P0 | **Deploy `npm run deploy` bản `813c5eb`** | Rất cao — khả năng cao giải quyết phần lớn phàn nàn hiện tại | Không (đã test kỹ, chỉ chưa lên production) | Không cần gì, làm ngay |
| P1 | Bỏ bớt 1 trong 3 round-trip nối tiếp ở AuthContext — cụ thể: `getDoc(users/uid)` đọc `settings` cá nhân (dòng ~119) không thật sự cần CHẶN `isLoading`, có thể tách chạy nền sau khi role/quyền đã có | Cao — giảm ~100-800ms mỗi lần mở app, mọi tab | Trung bình — đụng đúng file vừa sửa flash-bug tuần trước, cần test kỹ lại không tái phát race | Đọc kỹ lại toàn bộ AuthContext, xác nhận `settings` không có gì khác phụ thuộc nó chặn trước |
| P2 | Cân nhắc `minInstances`/tối ưu cold-start cho `resolveSession` (Cloud Function) | Cao nếu cold-start đang là thủ phạm chính, nhưng chưa đo được thực tế | Thấp về code, nhưng **tốn phí** (minInstances giữ instance luôn chạy) — cần user đồng ý ngân sách | Đo thực tế qua `firebase functions:log` xem tần suất cold-start bao nhiêu trước khi quyết định chi tiền |
| P3 | Rà lại 4 `modulepreload` vô điều kiện trong `index.html`, xem có chunk nào không cần thiết cho tab mặc định bị tải thừa | Trung bình | Trung bình — đụng cấu hình build/Vite, cần test không phá tab khác | Xác nhận từng vendor chunk THẬT SỰ cần cho tab nào, tránh cắt nhầm gây lỗi tab khác |
| P4 | Điều tra lịch sử quyết định "không dùng Worker cho parse Excel", xem còn hợp lý không với khối lượng dữ liệu hiện tại | Không rõ (có thể cao hoặc có thể lặp lại sai lầm cũ) | Cao — đã từng thử và revert 1 lần | Tìm hiểu qua `git log`/`git blame` lý do revert cũ trước khi động lại |

### 16.4. Trạng thái

P0 (deploy `813c5eb`) đã xong — commit `30f3a50`, đã publish `gh-pages`. Chờ user đo lại trước khi làm tiếp P1-P4.

### 16.5. Tính năng mới (2026-07-20): mặc định chỉ mở Realtime, "lũy kế" phải tự tick mỗi phiên

User đề xuất trực tiếp: mặc định khi mở dự án, toàn bộ file "YCX lũy kế" (`FileHistoryManager`) không được tick — chỉ dữ liệu Realtime tự động hiện. User cần xem lũy kế thì tự tick lại. Đây là đòn bẩy giảm khối lượng dữ liệu mạnh hơn hẳn giới hạn 14 tháng ở mục 15.4 (giảm về ĐÚNG những gì user chủ động cần xem, thay vì 1 ngưỡng thời gian cố định).

**Quyết định thiết kế quan trọng (đã hỏi & user xác nhận)**: chỉ reset lúc **MỞ LẠI dự án** (F5/khởi động lại), KHÔNG áp dụng ngay lúc **upload** file lũy kế mới — vì nếu áp dụng lúc upload, file đầu tiên (chưa có Realtime) sẽ khiến user thấy màn hình trắng ngay sau khi tải lên, không có thông báo giải thích (đã xác nhận qua research code trước khi hỏi).

File đổi:
- `services/dbService/salesData.ts` — thêm `resetHistoricalFilesToInactive()`: set toàn bộ `isActive` trong registry về `false`. **CHỈ được gọi đúng 1 lần lúc khởi động** — KHÔNG đặt trong `getMergedSalesData()` (khác `pruneStaleActiveFiles` ở mục 15.4, hàm đó chạy trong `getMergedSalesData()` nên gọi lại nhiều lần/phiên) vì nếu gọi lặp lại sẽ tự ý huỷ lựa chọn tick-lại-để-xem của user ngay trong cùng phiên.
- `hooks/useDataManagement.ts` — gọi `await dbService.resetHistoricalFilesToInactive()` ngay đầu `loadInitialData()`, TRƯỚC `Promise.all` chứa `getMergedSalesData()` — đảm bảo có hiệu lực từ lần tải đầu tiên của phiên.

**Không ảnh hưởng**: luồng upload (`useFileUploadLogic.ts:442`, `isActive: true` khi upload mới) giữ nguyên — file vừa tải lên trong phiên vẫn hiện ngay như trước, không bị hàm reset này đụng tới (vì reset chỉ chạy lúc mount, trước mọi upload trong phiên).

**Lưu ý phụ (chưa xử lý, chỉ ghi nhận)**: `pruneStaleActiveFiles` (mục 15.4, giới hạn 14 tháng) vẫn giữ nguyên, chạy độc lập bên trong `getMergedSalesData()`. Về lý thuyết có 1 tương tác cạnh: nếu user chủ động tick lại 1 file CŨ HƠN 14 tháng để xem trong phiên, `pruneStaleActiveFiles` sẽ tự động untick lại nó ở lần gọi `getMergedSalesData()` tiếp theo (ví dụ khi bấm "Xem Báo Cáo") — silently huỷ lựa chọn thủ công đó. Đây là hành vi CÓ TỪ TRƯỚC (không phải bug mới do tính năng này gây ra), nhưng giờ dễ gặp hơn vì tính năng mới khuyến khích user tick-lại-lũy kế mỗi phiên. Chưa sửa vì ngoài phạm vi yêu cầu — báo user biết, sửa sau nếu cần.

`npm run check` xanh. **Chưa test tay trên trình duyệt** — cần user xác nhận: mở lại app (F5) thấy dashboard chỉ có Realtime (hoặc trống nếu chưa từng upload Realtime), vào "Lịch sử file" thấy checkbox lũy kế đã tự untick hết, tick lại 1 file rồi bấm "Xem Báo Cáo" thấy dữ liệu gộp đúng như mong đợi.

**Cập nhật 2026-07-20**: user đổi ngưỡng retention (mục 15.4) từ 14 → **24 tháng** — `services/dbService/salesData.ts:RETENTION_MONTHS`. `npm run check` xanh.

### 16.6. P1 đã làm (2026-07-20): bỏ 1 trong 3 round-trip mạng chặn màn hình mở đầu

User gửi ảnh production mobile: kẹt ở vòng xoay trắng đơn thuần (spinner gốc `App.tsx:191-197`, chưa tới cả modal "AI Engine Processing") — xác nhận đúng dự đoán P1 ở mục 16.3: nghẽn ở `contexts/AuthContext.tsx`, TRƯỚC khi `DashboardView`/`useDataManagement` kịp chạy dòng nào.

**Đã sửa**: `contexts/AuthContext.tsx` — bước `getDoc(users/{uid})` đọc field `settings` (đồng bộ tuỳ chọn cá nhân, KHÔNG phải role/quyền — role/status/departmentId đã lấy đủ từ `resolveSession()` rồi) không còn `await` chặn `isLoading`, chuyển thành fire-and-forget chạy nền, tự `mergeSettings()` khi xong. Giữ nguyên 2 bước còn lại (`resolveSession()`, `getIdToken(true)`) trong đường găng — cả hai đều ảnh hưởng trực tiếp phân quyền/Firestore Rules, bỏ đi có nguy cơ tái phát lớp bug permission-denied đã gặp trước đó trong dự án.

`npm run check` xanh. **Chưa test tay** — cần user xác nhận trên production sau khi deploy: thời gian từ lúc mở app tới khi hết vòng xoay trắng có rút ngắn rõ rệt không.

**Lưu ý còn lại (P2, chưa làm)**: nếu sau P1 vẫn còn chậm ở đúng bước này, khả năng cao là do `resolveSession()` (Cloud Function) bị cold-start hoặc do điều kiện mạng thực tế (ảnh mobile cho thấy sóng WiFi yếu) — cả hai đều KHÔNG thể khắc phục bằng sửa code phía client, cần xem `firebase functions:log` để đo tần suất cold-start thật trước khi cân nhắc trả phí giữ `minInstances`.

---

## 17. Đồng nhất định dạng thẻ KPI (2026-07-20) — ngoài chủ đề hiệu năng mục 15-16

User yêu cầu trực tiếp qua ảnh chụp: 2 thẻ **DT THỰC** và **DTQĐ** (`components/kpis/KpiCards.tsx`) áp dụng cùng định dạng dòng "Mục tiêu" với thẻ **HQQĐ**/**TRẢ CHẬM** ("Đây là chuẩn") — thay vì hiện số target thô kèm nhãn "TAR NGÀY"/"Tháng: X Tỷ" màu xám, đổi sang: dòng 1 = giá trị mục tiêu, dòng 2 = % chênh lệch có màu (xanh emerald "Đã vượt +X%" nếu đạt/vượt mục tiêu, đỏ rose "Còn thiếu X%" nếu chưa đạt).

**Đã sửa** `components/kpis/KpiCards.tsx`, 2 đoạn (nhánh DTQĐ dòng ~282-296, nhánh DT THỰC dòng ~371-387): tái sử dụng ĐÚNG % tiến độ đã tính sẵn (`pctHT`/`pct` — chính là số hiện ở thanh "Tiến độ" đầu thẻ, không phải tính mới) trừ 100 ra phần trăm chênh lệch, dùng chung class màu `text-emerald-500 dark:text-emerald-400` / `text-rose-500 dark:text-rose-400` y hệt thẻ HQQĐ/TRẢ CHẬM. Đổi nhãn `finalTrendLabel` từ "Tar ngày"/"Lũy kế" sang "Mục tiêu" cho khớp. Không đụng logic tính `rawValue`/`activeTarget`/`isGood` (giữ nguyên công thức `pct >= 100`) — chỉ đổi phần hiển thị dòng phụ.

**Đánh đổi đã chấp nhận**: bỏ hiển thị số target thô còn lại (trước đây dòng phụ luôn hiện "Ngày: X"/"Tháng: Y" — số target ở chế độ KHÔNG active) để đổi lấy đúng định dạng "chuẩn" user yêu cầu. Nếu sau này cần xem lại số target ngày/tháng cụ thể, vẫn bấm vào thẻ để mở modal chỉnh target (`KpiCards.tsx:430-454`) xem đầy đủ.

`npm run check` xanh. Không đụng `calculateRowMetrics`/logic tính toán — chỉ đổi JSX hiển thị dựa trên giá trị đã có sẵn, rủi ro thấp.

**Cập nhật 2026-07-20 (sau khi test, user phản hồi)**: dòng chênh lệch ban đầu hiện % ("Còn thiếu 46%") — user muốn hiện SỐ TIỀN thay vì %, đúng bản chất 2 thẻ này là tiền tệ (khác HQQĐ/TRẢ CHẬM vốn là %). Đã sửa: `gapPct` (%) → `gapValue = rawValue - activeTarget` (tiền), hiện qua `formatCurrency()` — "Còn thiếu 369 Tr" / "Đã vượt +X Tr" thay vì "%". `npm run check` xanh.

---

## 18. Chế độ "So sánh" ở bảng Chi Tiết Ngành Hàng tự set bộ lọc toàn cục (2026-07-20)

User yêu cầu: khi bật chế độ "So sánh" (`components/tables/summary/SummaryTableHeader.tsx`, icon `columns-2`) ở bảng "CHI TIẾT NGÀNH HÀNG", tự động set 2 bộ lọc trong modal "TUỲ CHỈNH" (`components/filters/FilterSection.tsx`): **Trạng thái xuất = "Đã"** và **Trạng thái hồ sơ = ["1 - Mới"]**.

**Điều tra trước khi sửa xác nhận**: 2 field này (`filterState.xuat`, `filterState.trangThai`) là **bộ lọc TOÀN CỤC** (`hooks/useFilterState.ts`), không phải filter cục bộ riêng cho bảng — áp dụng cho MỌI widget trên trang (KPI cards, TrendChart, IndustryGrid, phân tích nhân viên...) qua 1 lần xử lý duy nhất trong Worker (`services/filterService.ts:applyFiltersAndProcess`). Đã hỏi user xác nhận trước khi làm: **chấp nhận đổi cho toàn trang** (không cần thêm hạ tầng filter cục bộ mới).

**Đã sửa** `components/tables/summary/useSummaryTableLogic.ts` — `setTableMode('comparison')` giờ gọi thêm `onFilterChange({ xuat: 'Đã', trangThai: ['1 - Mới'] })` ngay khi chuyển mode. Giá trị `'1 - Mới'` lấy đúng theo `initialFilterState.trangThai` mặc định của app (`hooks/useDataManagement.ts`) — khớp định dạng dữ liệu thực tế cột "Trạng thái hồ sơ".

**Hành vi đã xác nhận với user, cần lưu ý**: đây là set 1 lần khi BẤM vào "So sánh" — nếu sau đó user tắt so sánh (chuyển về `'standard'`) rồi tự đổi lại filter, KHÔNG có cơ chế tự khôi phục bộ lọc cũ trước khi bật so sánh (không lưu snapshot). Đây là thiết kế đơn giản nhất, user đã chọn ("Đổi cho toàn trang, đơn giản hơn").

`npm run check` xanh. Không đụng logic tính toán (`calculateRowMetrics`) — chỉ set giá trị filter có sẵn. **Chưa test tay trên trình duyệt** — cần user xác nhận bấm "So sánh" thấy 2 filter tự đổi đúng, và số liệu toàn trang cập nhật theo.

---

## 19. Bỏ "Cài đặt" và "Giới thiệu" khỏi menu Sidebar desktop (2026-07-20)

User yêu cầu qua ảnh chụp: xoá 2 mục "Cài đặt"/"Giới thiệu" ở mục "Hệ Thống" cuối sidebar desktop — lý do nêu ra cho "Cài đặt": bấm Avatar (đáy sidebar) đã dẫn thẳng tới `SettingsView` rồi, trùng lặp.

**Đã điều tra + xác nhận trước khi sửa** (`components/layout/Sidebar.tsx`): Avatar (`onClick` dòng ~351) gọi `setActiveTab('settings')` y hệt nút "Cài đặt" — xoá "Cài đặt" AN TOÀN, không mất chức năng. Nhưng "Giới thiệu" (`activeTab='help'`) **không có đường vào nào khác** trên desktop (đã grep toàn repo, chỉ chính nút này set `activeTab='help'` ở phía desktop) — đã hỏi lại user trước khi xoá, **user xác nhận vẫn muốn xoá luôn, chấp nhận mất đường vào `AboutView` trên desktop** (vẫn vào được qua gõ tay `?tab=help` trên URL nếu cần).

**Đã sửa** `components/layout/Sidebar.tsx`:
- `secondaryItems` bỏ 2 entry `settings`/`help`, chỉ còn giữ điều kiện `pending-approval` (hiện khi `userRole==='pending'`).
- Bọc thêm `{secondaryItems.length > 0 && (...)}` quanh khối "Hệ Thống" — tránh hiện tiêu đề + đường viền trống không cho user thường (không phải `pending`), vì giờ mảng này có thể rỗng.
- Bỏ import `Settings`/`HelpCircle` không còn dùng (tránh lỗi ESLint unused-import).

**Ngoài phạm vi, CHƯA đụng** (chỉ ảnh chụp gửi là sidebar desktop): `components/layout/MobileBottomNav.tsx` vẫn giữ nguyên 2 mục "Cài đặt"/"Giới thiệu" trong sheet "Thêm" — đây hiện là đường vào DUY NHẤT tới `AboutView` trên mobile, không đổi gì ở đây trừ khi user yêu cầu thêm.

`npm run check` xanh. **Chưa test tay trên trình duyệt** — cần user xác nhận: sidebar desktop hết 2 mục, Avatar vẫn vào được Cài đặt bình thường, không còn khoảng trống/tiêu đề "Hệ Thống" thừa khi không phải user `pending`.

**Cập nhật 2026-07-20 (sau khi test, user chụp ảnh chỉ ra 1 vạch xám mồ côi)**: khối "Bottom Section" chứa Avatar (`Sidebar.tsx` dòng ~348) có sẵn `border-t` để ngăn cách với mục "Hệ Thống" phía trên — nay mục đó ẩn (rỗng với user thường) nên border này còn trơ lại thành 1 vạch xám không còn tác dụng phân cách gì. Đã bỏ hẳn `border-t border-slate-100 dark:border-slate-800/50` khỏi div này. `npm run check` xanh.

**Cập nhật 2026-07-21 — 2 phát hiện phụ khi user test lại (không liên quan mục 19 gốc)**:
1. **Tiêu đề logo bị cắt chữ** ("Phân Tích Yêu Cầu Xu" thay vì "...Xuất"): không phải thiếu chữ trong code (string đầy đủ vẫn ở `Sidebar.tsx:300`) — do cỡ chữ `text-[15px]` bold quá lớn so với khoảng trống còn lại trong sidebar (260px - padding - icon - gap), bị cắt cứng bởi `overflow-hidden` của khung cha, không có ellipsis. Đã giảm xuống `text-[13px]`.
2. **Màu nền mục đang chọn (nav item active) quá đậm** — user muốn "đơn giản hơn". Đổi từ `bg-sky-600 text-white shadow-lg...` (nền xanh đậm, chữ trắng, có shadow) sang `bg-sky-50 dark:bg-sky-900/30 text-sky-600 font-semibold` — khớp ĐÚNG kiểu đã dùng sẵn cho mục con trong "Công cụ" (dòng ~182, cùng file), đồng nhất thiết kế thay vì tự chế màu mới. Icon active đổi từ `text-white` sang `text-sky-600` cho khớp nền sáng.

`npm run check` xanh. Cả 2 chỉ đổi Tailwind class, không đụng logic. **Chưa test tay** — cần user xác nhận tiêu đề hiện đủ chữ và màu nền nhạt hơn đúng ý.

**Cập nhật tiếp (user phản hồi nền hơi nhạt quá)**: chỉ tăng đậm mục nav CHÍNH (không đụng mục con trong "Công cụ", vẫn giữ `bg-sky-50`) — `bg-sky-50→bg-sky-100`, `text-sky-600→text-sky-700`, hover `bg-sky-100→bg-sky-200`. `npm run check` xanh.

---

## 20. Modal "Quản Lý Danh Sách Nhân Viên" — cột Họ Tên giãn rộng bất thường (2026-07-21)

User chụp ảnh chỉ ra 2 vấn đề + 1 cột lạ hiện chữ "Dư".

**Điều tra xác nhận**: `components/modals/EmployeeManagerModal.tsx` chỉ có ĐÚNG 4 cột (Mã NV, Họ và Tên, Bộ phận, Thao tác) — grep toàn repo + bundle build hiện tại **không tìm thấy chữ "Dư" ở đâu liên quan bảng này**. Khả năng cao user đang xem bản cache/production cũ (chưa deploy các thay đổi gần đây) — đã báo lại nhưng vẫn xử lý 2 vấn đề thật đã xác nhận được:
- Bảng dùng `table-fixed`, 3 cột (Mã NV/Bộ phận/Thao tác) có width cố định px ở `sm:`, riêng "Họ và Tên" dùng `sm:w-auto` → chiếm TOÀN BỘ phần rộng còn lại của bảng bất kể tên ngắn hay dài, gây khoảng trắng lớn như ảnh.
- Modal `maxWidth="4xl"` (896px) rộng hơn nhiều so với tổng nhu cầu thực của 4 cột (~650-700px).

**Đã sửa** `components/modals/EmployeeManagerModal.tsx`:
- `maxWidth`: `4xl` → `2xl` (672px, khớp sát tổng độ rộng cột thực tế).
- Cột "Họ và Tên": `sm:w-auto` → `sm:w-56` (cố định, cùng đơn vị px với 3 cột còn lại thay vì để trống lấp đầy).
- Chiều cao khung bảng: `h-[70vh]` (cố định luôn 70% viewport dù ít hay nhiều dòng) → `max-h-[70vh]` (co theo nội dung, chỉ chạm mức trần khi đủ nhiều dòng).

`npm run check` xanh. **Chưa test tay** — cần user xác nhận đã hết khoảng trắng thừa, và xác nhận lại xem cột "Dư" còn xuất hiện không sau khi tải lại trang/xoá cache (nếu còn, cần thêm thông tin để tìm tiếp vì không tồn tại trong source).

## 21. Modal "Danh Sách YCX Luỹ Kế" — thiết kế gọn lại (2026-07-21)

User yêu cầu (nhắn giữa lúc đang xử lý mục 20): "Thiết kế form nhỏ gọn lại" cho modal `components/modals/FileHistoryModal.tsx` (+ `components/upload/FileHistoryManager.tsx` render bên trong, chế độ `compact`).

**Đã sửa**, chỉ giảm padding/kích thước, không đổi bố cục/chức năng:
- `FileHistoryModal.tsx`: header `px-5 py-4→px-4 py-3`, icon box `w-10 h-10→w-8 h-8`, tiêu đề `text-base/lg→text-sm/base`; nội dung `p-5 space-y-4→p-4 space-y-3`; màn rỗng `py-8→py-6`; 2 nút cuối giảm padding (`px-4 py-2→px-3 py-1.5`, `px-5 py-2.5→px-4 py-2`).
- `FileHistoryManager.tsx` — CHỈ áp dụng khi `compact=true` (giữ nguyên hoàn toàn khi dùng ở `components/views/LandingPageView.tsx`, nơi khác đang dùng non-compact): khoảng cách header `mb-4→mb-2`, ẩn hẳn dòng mô tả phụ (đã trùng lặp với mô tả ở header modal), mỗi dòng file `p-3→p-2`, khung danh sách `max-h-[220px]→max-h-[160px]`, thanh tổng kết cuối `py-2→py-1.5`.

`npm run check` xanh. **Chưa test tay** — cần user xác nhận độ gọn đã vừa ý.

---

## 22. Modal "TUỲ CHỈNH" — đồng bộ cỡ chữ + đổi tên nhãn; màu HQQĐ (2026-07-21)

**Việc 1 — `components/filters/FilterSection.tsx`**:
- Cỡ chữ nhãn "Hiển Thị Các Khu Vực" (`ModernSwitch`, dòng ~59) trước là `font-bold text-xs sm:text-sm` — to hơn hẳn nút "Khoảng Thời Gian Nhanh" (`text-[9px] xs:text-[10px] sm:text-xs`). Đã đổi để khớp đúng 3 mốc breakpoint của nút thời gian, giữ nguyên `font-bold`.
- Đổi tên 4 nhãn `visibilityOptions` (dòng ~189-194): "Xu hướng doanh thu"→**"Xu hướng"**, "Tỷ trọng ngành hàng"→**"Ngành hàng"**, "Phân tích nhân viên"→**"Nhân viên"**, "Chi tiết ngành hàng"→**"Chi tiết"**. (User gõ "Xu hướn" — hiểu là lỗi gõ thiếu chữ "g", theo đúng pattern rút gọn của 3 nhãn còn lại.)

**Việc 2 — màu thẻ KPI "HQQĐ" nổi bật hơn**: 5 màu semantic chính (`sky/slate/emerald/amber/rose`) đã bị 4 thẻ KPI khác dùng hết, HQQĐ đang dùng alias `purple→slate` (xám xịt). Theo đúng CLAUDE.md (chỉ định `indigo` là màu thứ 6 hợp lệ cho trường hợp cần phân biệt/nổi bật thêm ngoài 5 màu chính), đã:
- Thêm entry `indigo` tĩnh (literal, không dựng qua template string — theo đúng comment cảnh báo có sẵn trong `KpiCard.tsx`) vào `COLOR_STYLES` (`components/shared/ui/KpiCard.tsx`).
- Thêm case `indigo` vào `iconColorToTextClass()` (`components/kpis/KpiCards.tsx`) để đồng bộ màu chữ số to.
- Đổi `iconColor: 'purple'` → `'indigo'` ở `constants.ts` (`DEFAULT_KPI_CARDS`, thẻ `kpi-hieuqua`).
- **Quan trọng**: phát hiện thêm 1 đoạn migration ở `hooks/useDataManagement.ts` (`coreCardUpdates`, dòng ~142) ép cứng lại `iconColor: 'purple'` cho `kpi-hieuqua` MỖI LẦN tải app (đè lên `constants.ts` cho user ĐÃ có `kpiCardsConfig` lưu sẵn trong IndexedDB — tức gần như mọi user hiện tại). Nếu không sửa luôn chỗ này, đổi màu ở `constants.ts` sẽ vô tác dụng với user cũ. Đã đổi luôn thành `'indigo'`.

**`lint-ratchet` phát hiện vi phạm mới** (đúng dự kiến — `indigo` không nằm trong danh sách màu semantic chính mà ratchet công nhận): đã cập nhật `violations-baseline.json` thêm 2 entry mới (`components/kpis/KpiCards.tsx`: 2, `components/shared/ui/KpiCard.tsx`: 17) theo đúng hướng dẫn của chính script khi đây là ngoại lệ có chủ đích (đã có tiền lệ giữ `indigo` không quy về `sky` ở nhiều nơi khác trong dự án, xem mục "Rà soát tổng thể 07/2026" trong memory).

`npm run check` xanh hoàn toàn (bao gồm lint-ratchet). **Chưa test tay** — cần user xác nhận cỡ chữ đã đồng bộ, tên nhãn đúng ý, và thẻ HQQĐ đã chuyển sang tông indigo (xanh tím) nổi bật hơn xám.

---

## 23. Card "Xu Hướng Doanh Thu" — đồng bộ dòng phụ đề + gọn nút Ca/Ngày/Tuần/Tháng (2026-07-21)

User chụp ảnh so sánh với card "Tỷ Trọng Ngành Hàng" làm chuẩn ("Chuẩn" — chỉ hiện "TẤT CẢ THỜI GIAN" xám nhạt đơn giản).

**Đã sửa** `components/charts/TrendChart.tsx`:
1. Dòng phụ đề (dòng ~394-422): span cha đổi cỡ chữ responsive `text-[10px] lg:text-[11px]` → cố định `text-[11px]` khớp đúng IndustryGrid. Bỏ màu `indigo-600` + `font-extrabold` nổi bật ở "DT THỰC"/"DTQĐ"/"TỔNG: [giá trị]" (vốn không cùng tông màu xám nhạt của "chuẩn") — đổi sang tông slate cùng họ: đang chọn = `text-slate-700 dark:text-slate-200 font-bold`, chưa chọn = `text-slate-400 dark:text-slate-500 font-medium`. **Vẫn giữ nguyên `onClick`** (DT THỰC/DTQĐ vẫn bấm chuyển được metric hiển thị) — chỉ đổi màu sắc cho đồng bộ "chuẩn", không bỏ chức năng.
2. Nhóm nút "Ca/Ngày/Tuần/Tháng" (dòng ~513-528, bản desktop): giảm padding nút con `py-1 px-2 lg:px-2.5` → `py-0.5 px-1.5 lg:px-2` cho gọn hơn.

`npm run check` xanh — lint-ratchet còn tự hạ baseline `TrendChart.tsx` (34→31) vì giảm bớt class màu non-semantic (bỏ `indigo` ở phần vừa sửa), không cần tự tay chỉnh. **Chưa test tay** — cần user xác nhận màu đã đồng bộ, và nút Ca/Ngày/Tuần/Tháng đã đủ gọn.

---

## 24. Card "Tỷ Trọng Ngành Hàng" — bỏ giới hạn top-8 (2026-07-21)

`components/charts/IndustryGrid.tsx:90-105` — `currentView` (useMemo) trước đây cắt cứng `sorted.slice(0, 8)` rồi tính `totalRevenue`/`totalQuantity` (dùng để ra %DT từng thẻ) CHỈ trên 8 phần tử đó — nghĩa là nếu bỏ giới hạn mà không sửa luôn phần tổng, %DT sẽ vẫn tính sai (tính trên top-8 thay vì toàn bộ). Đã sửa: bỏ `.slice(0,8)`, tổng `totalRevenue`/`totalQuantity` tính trên TOÀN BỘ mảng đã sort. Grid layout (`grid-cols-2 lg:grid-cols-4`, dòng 349) không có `grid-rows`/`max-height` cố định nên tự xuống hàng bình thường, không vỡ layout khi nhiều hơn 8 mục — đã xác nhận qua đọc code trước khi sửa.

Không đụng biểu đồ tròn bên cạnh (`pieChartData`, top10 + gộp "Khác") — đây là logic khác, phục vụ mục đích khác (tránh pie chart quá nhiều lát mỏng khó đọc), user không yêu cầu đổi phần này.

`npm run check` xanh.

## 25. Popup lọc theo cột (FilterPopover) — 3 lỗi trong bảng Chi Tiết Ngành Hàng (2026-07-21)

`components/tables/summary/FilterPopover.tsx` — user chụp ảnh chỉ 2 lỗi + yêu cầu gọn giao diện:

1. **"Bộ lọc cách xa nút lọc"**: nguyên nhân xác nhận qua đọc code — effect đo vị trí nút trigger (`getBoundingClientRect`) dùng `useEffect` (chạy SAU khi trình duyệt paint khung đầu tiên), nên lần mở đầu tiên của mỗi pill lọc, popup portal vào `body` mà chưa có `top/left` gì cả → hiện sai vị trí (cuối trang) rồi mới "nhảy" về đúng chỗ. Đã đổi `useEffect` → `useLayoutEffect` (chạy đồng bộ TRƯỚC khi paint) — cắt hẳn hiện tượng nhảy vị trí.
2. **"Khi bật lên không hiển thị màu xanh, chỉ hiển thị màu trắng"**: toggle switch dùng class `peer-checked:bg-primary-600`, nhưng token `--color-primary-600` **không tồn tại** trong `styles.css` (chỉ có `--color-primary` dạng scalar, không có dải số 50-900) — class này không sinh CSS, toggle luôn giữ màu nền mặc định. Lỗi mang tính hệ thống, xuất hiện ở NHIỀU chỗ khác trong cùng file (nút "Chọn tất cả", icon phễu khi có filter active, focus ring ô tìm kiếm) — đã đổi TOÀN BỘ `primary-*` → `sky-*` (màu primary thật của dự án theo `styles.css`) ở cả bản mobile lẫn desktop, không chỉ riêng toggle.
3. **"fix các chữ và nút gọn lại"**: bản desktop (vốn rộng rãi hơn hẳn bản mobile cùng file) đã thu nhỏ khớp gần với bản mobile — input `px-3 py-2 text-sm→px-2.5 py-1.5 text-xs`, hàng "Chọn tất cả/Bỏ chọn" `pb-2 mb-2→pb-1.5 mb-1.5`, mỗi dòng toggle `p-2 text-sm→p-1.5 text-xs`, track toggle `w-9 h-5→w-8 h-[18px]` (khớp cỡ mobile), popup container `p-3→p-2.5`.

`npm run check` xanh. **Chưa test tay** — cần user xác nhận: dropdown mở đúng ngay dưới nút lọc (không còn nhảy vị trí), toggle chuyển xanh khi bật, giao diện đã gọn hơn.

---

## 26. Đồng bộ dòng phụ đề "CHI TIẾT NGÀNH HÀNG" với "TỔNG QUAN DOANH THU" (2026-07-21)

User yêu cầu: (a) bỏ hẳn dòng mô tả tĩnh "Thống kê chi tiết theo ngành hàng và nhóm hàng."; (b) dòng phụ đề còn lại (thông tin filter) phải "giống" định dạng dòng phụ đề của card "Tổng Quan Doanh Thu" ("Lọc theo: Xuất: Đã").

**Điều tra xác nhận**: dòng phụ đề "Tổng Quan Doanh Thu" ("LỌC THEO: XUẤT: ĐÃ") lấy từ `processedData.reportSubTitle` — 1 chuỗi tính SẴN trong `services/filterService.ts:316-327` (chỉ xét Kho + Xuất, KHÔNG có khoảng ngày, format `"Lọc theo: {parts.join(' | ')}"` hoặc fallback `"Lọc theo kho: Tất cả"`). Trong khi bảng "CHI TIẾT NGÀNH HÀNG" (`SummaryTableHeader.tsx:83-87`) lại TỰ VIẾT logic riêng (xét thêm cả khoảng ngày, nối chuỗi thủ công khác định dạng) — đây chính là 2 nơi lệch nhau user muốn đồng bộ.

**Đã sửa** — thay vì viết lại logic ở `SummaryTableHeader.tsx` cho "giống", chọn cách **dùng chung đúng 1 nguồn** (`processedData.reportSubTitle`) để đảm bảo không bao giờ lệch nhau về sau:
- `components/tables/summary/useSummaryTableLogic.ts:272` — `displayDescription` (dòng mô tả) đổi từ chuỗi tĩnh mặc định sang `''` (rỗng) khi KHÔNG ở chế độ so sánh — chỉ còn hiện khi đang so sánh (lấy `compTree.description`, vẫn hữu ích, không phải thứ user phàn nàn).
- `components/tables/SummaryTable.tsx` — lấy thêm `processedData` từ `useDashboardContext()`, truyền `reportSubTitle={processedData?.reportSubTitle}` xuống `SummaryTableHeader`.
- `components/tables/summary/SummaryTableHeader.tsx` — thêm prop `reportSubTitle`, bọc dòng mô tả trong điều kiện `{displayDescription && (...)}` (ẩn hẳn khi rỗng), thay toàn bộ logic tự viết ở dòng phụ đề filter bằng `{reportSubTitle}`. Dọn luôn prop `filterState` không còn dùng tới (cùng import `FilterState` không dùng) sau khi bỏ logic cũ.

**Đánh đổi đã chấp nhận**: dòng phụ đề mới của "Chi Tiết Ngành Hàng" **không còn hiện khoảng ngày** (trước đây có "TẤT CẢ THỜI GIAN"/"TỪ...ĐẾN...") vì `reportSubTitle` (nguồn chuẩn) không có thông tin này — đúng theo yêu cầu "giống" 100% với card Tổng Quan Doanh Thu (card đó cũng không hiện khoảng ngày). Báo lại nếu user vẫn muốn giữ hiển thị khoảng ngày riêng ở bảng này.

`npm run check` xanh. **Chưa test tay** — cần user xác nhận dòng mô tả tĩnh đã biến mất và dòng filter khớp đúng định dạng "Lọc theo: ..." như card Tổng Quan Doanh Thu.

**Cập nhật (user muốn giữ khoảng ngày riêng cho bảng này)**: thêm lại `filterState` prop cho `SummaryTableHeader.tsx`, ghép nối `{reportSubTitle} | {khoảng ngày}` — khoảng ngày viết thường ("Tất cả thời gian"/"Từ ... đến ...", CSS `uppercase` tự viết hoa) để đồng bộ phong cách chữ với phần `reportSubTitle` dùng chung. Card "Tổng Quan Doanh Thu" giữ nguyên KHÔNG có khoảng ngày (đúng thiết kế gốc của nó) — chỉ bảng "Chi Tiết Ngành Hàng" có thêm phần này. `npm run check` xanh.

**Cập nhật 2026-07-21 (màu HQQĐ vẫn "trùng" DTQĐ sau khi test local `npm run dev`)**: đã xác nhận với user KHÔNG phải lỗi chưa deploy (test local, HMR phản ánh đúng code) — mà tông `indigo` mặc định (500/400/300, cùng bậc sắc độ với 4 thẻ kia) đọc gần giống `sky` khi nhìn nhanh (cả 2 đều là "màu xanh"). Đã đậm hoá 1 bậc: `COLOR_STYLES.indigo` (`components/shared/ui/KpiCard.tsx`) đổi 500/400/300 → 700/600/500 cho gradient/progressFill, icon text/value text đổi `indigo-600`→`indigo-700` (đồng bộ luôn `iconColorToTextClass` ở `KpiCards.tsx`) — ngả tím rõ hơn, tách biệt hẳn khỏi tông cyan-xanh của sky. Vẫn dùng đúng tên màu `indigo` đã CLAUDE.md cho phép, chỉ đổi sắc độ, không phá quy tắc bảng màu semantic. `npm run check` xanh.
