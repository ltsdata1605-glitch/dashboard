# Phụ lục xác thực, vòng đời phiên và rules

Nguồn: ZIP ngày 07/10/2026. Các body callable gốc được chạy offline với mocks Auth/Firestore; không tạo hoặc sửa tài khoản thật. Kết quả ở `evidence/auth-offline-results.json`. Rules được đọc tĩnh; chưa chạy Rules Emulator hoặc kiểm tra phiên bản production/IAM.

## AUTH-01 / S01 — P0: staff không có chứng minh danh tính

`functions/src/stickerEvent.ts:313` không kiểm `request.auth` hoặc credential staff. Email được suy từ username ở dòng 321. Nhánh login dòng 335–353 lấy UID theo email, đổi password ở dòng 349 và tạo customToken mà không xác minh người gọi là chủ tài khoản. Nhánh đăng ký dòng 375–401 xử lý cả account đã tồn tại: đổi password dòng 383, ghi profile staff dòng 386, đặt claims và mint token.

Điều kiện mã: có user Auth tương ứng và Kho có admin để nhánh đăng ký đi tiếp. Nhánh đăng ký không loại tài khoản admin/root trước ghi đè. Cùng Firebase project Auth pool nên tạo phiên cho UID đó có thể ảnh hưởng cả các mini-app dùng UID. Nếu runtime không có quyền ký token, code vẫn đã đi qua password/profile update trước lỗi; lỗi IAM không phải biện pháp xác thực.

Mock đã quan sát updateAuth, ghi stickerUsers, replaceClaims và mint token cho fixture victim-admin từ request không auth. Không kiểm tồn tại tài khoản/endpoint production. Không khẳng định đã xảy ra chiếm tài khoản ngoài thực tế.

Sửa: không lấy tên/email làm credential; dùng xác thực thật hoặc invitation được bảo vệ. Existing account collision phải từ chối thay đổi từ caller không sở hữu. Thay fallback password staff đoán được; chuẩn bị migration hợp lệ.

Nghiệm thu: denied request không làm bất kỳ mutation Auth/profile/claims nào; người dùng hợp lệ vẫn đăng nhập; không nhập vai account admin/root bằng luồng staff.

## AUTH-02 / S02 — P0: quyền superadmin phụ thuộc username client

`isSuperAdminIdentity` dòng 14–17 tin username; `stickerRegister` nhận username ở dòng 37 và cấp claimRole tại dòng 88–89. Kiểm “Kho có admin chưa” không xác minh quyền superadmin. `stickerResolveSession:201` tiếp tục suy lại quyền từ username đã lưu. Rules bảo vệ client update username không chặn callable Admin SDK tự nhận trường đó.

Mock: fixture user thường đã đăng nhập nhận stickerRole superadmin khi gửi nhãn nằm trong danh sách được dành riêng. Chứng minh issuance, không kiểm rules production.

Sửa: superadmin được quyết định từ UID/danh tính server đã xác minh hoặc provisioning, username chỉ hiển thị. Đăng ký lại không được ghi đè hồ sơ/vai trò hiện có; bootstrap admin Kho phải có policy và transaction.

Nghiệm thu: username tùy ý không ảnh hưởng quyền; user thường không thành superadmin; danh tính đã provision vẫn được cấp đúng; cạnh tranh đăng ký không phá chính sách admin Kho.

## AUTH-03 / S03 — P1: pending tự chọn Kho rồi nhận claim đọc Kho

`requestAccess` ghi departmentId do user chọn tại `functions/src/session.ts:143–150`, role/status pending. `resolveSession:109` vẫn cấp departmentId đó. `firestore.rules:72`, `:76`, `:90` đọc Kho/BI chỉ đòi isSignedIn + Kho trong myKhos.

Mock đã tái hiện cấp claim Kho chưa được duyệt cho fixture pending. Quyền đọc suy trực tiếp từ rules, chưa chạy emulator. UI pending/ẩn tab không hạn chế direct SDK.

Sửa: requested department tách approved membership, chỉ cấp effective department khi approved/active; rules/backend kiểm hiệu lực policy. Quyền self-setting nếu cần cho onboarding được quy định riêng.

Nghiệm thu: Rules Emulator deny pending/rejected/expired/blocked cùng Kho, allow approved đúng Kho, deny Kho khác; kết quả callable đồng nhất.

## AUTH-05 / S04 — P1: status thu hồi không làm mất effective role

`functions/src/admin.ts:77–92` status cập nhật riêng nhưng claims lấy role hiện tại nếu caller không truyền role. `resolveSession:69–98` chỉ tự hạ khi expiresAt thực sự quá hạn, không chuẩn hóa role theo status expired/rejected/blocked. UI thu hồi có đường gửi status expired riêng; mock cho thấy sau admin update và resolve mới vẫn manager cùng department.

Đây là lỗi trạng thái hiệu lực, khác việc token cũ chỉ hết hiệu lực sau một thời gian. Token revocation một mình chưa bảo vệ mọi Firestore access đang dùng token cũ; cần policy/SLA và kiểm server/rules phù hợp.

Sửa: tính effective authorization từ role+status+expiry+membership nhất quán. Thu hồi không chỉ đổi badge/UI; kiểm token/session version cho action nhạy cảm khi cần.

Nghiệm thu: user bị thu hồi không làm được direct write/read nhạy cảm, kể cả resolve mới; token cũ không vượt SLA được đặt; approved đúng không bị khóa nhầm.

## AUTH-06 / S05 — P1: root/Sticker xóa claims nhau

`session.ts:109`, `admin.ts:92`, `demoteExpiredUsers:181` thay toàn claims root; `stickerEvent.ts:24–25` thay toàn claims Sticker. Namespace riêng không giúp nếu operation thay nguyên object.

Mock: root resolve → sticker resolve xóa role/department root; root resolve lần tiếp xóa stickerRole/store. Named client app riêng không tạo Auth user pool riêng khi cùng Firebase project.

Sửa: helper tính tổng claims từ hồ sơ authoritative của cả hai khu vực, giữ tất cả namespace, xử lý concurrent writes thay vì hai read-merge không khóa. Không gộp logic nghiệp vụ frontend vào auth helper.

Nghiệm thu: login root/Sticker hai thứ tự và đồng thời không mất quyền; role thu hồi từng khu vực chỉ ảnh hưởng đúng phạm vi.

## RULE-01 / S14 — P1: saved lists không có ranh giới Kho/owner

`firestore.rules:152–156` cho mọi người đăng nhập read/write savedLists và itemChunks. Các match sâu chặt hơn không sửa được khi match permissive đã allow (rules cho phép khi bất kỳ match phù hợp allow). File legacy `firestore.stickerevent.rules:33–46` có cùng policy.

Điều kiện: direct client truy cập list path của Kho khác; thiếu field owner/access policy bắt buộc trong rule. Frontend lọc danh sách staff/admin không phải authorization. Cần xác định shared list hợp lệ nhưng không cho mọi signed-in user sửa/xóa mọi list.

Sửa/test: permission matrix owner/same Kho/shared/other Kho/pending/anon, chunks cùng policy với parent, mutation ownership và server-owned field. Kiểm đúng default DB của ZIP trước sửa.

## RULE-02 / S13 — P1: LINE credentials và báo cáo xuyên chủ bot

`firestore.rules:167–172`: mọi manager đọc/ghi mọi bot/subcollection, không scope Kho. LINE bot config có channel credential trong data client. `:178–185`: public read bot_media/report_commands và signed-in write.

Hướng xử lý chi tiết ở phụ lục backend B04/B05: server-only secrets, policy owner/membership, report namespace/capability và whitelist nhóm. Đây là rule xác nhận tĩnh, chưa kết luận credential đã bị lấy.

## MSG-01 / S11 — P2 có điều kiện: postMessage Check thưởng

`CheckThuongView.tsx:51–103` handler các message load/state/request không kiểm source/origin trước mutation; nhánh share-retry sau đó mới có kiểm riêng. Mock nguyên handler nhận event source/origin lạ vẫn gọi saveSettingOrThrow.

Browser khai thác cần attacker giữ window reference qua parent/opener/frame và view listener đã mount. Chưa kiểm CSP framing/COOP deploy. Reply nhắm iframeRef app, không sender, nên **không kết luận data exfiltration về attacker**.

Sửa/test: origin/source/payload schema trước mọi action; targetOrigin chính xác; malicious fixture chỉ dùng marker offline; legitimate iframe flow vẫn hoạt động.

## Mapping và giới hạn

- ZIP Sticker `firebase-applet-config.json` chọn `(default)`; `functions/src/firebaseAdmin.ts:16–17` stickerDb=db; default rules có `stickerUsers`. Frontend `firebase.ts:51–53` vẫn có thể lấy `VITE_FIREBASE_DATABASE_ID` khi JSON ghi `(default)`; chưa có env build để loại trừ client/backend khác database. `firebase.json` còn deploy named database legacy và nhiều tài liệu cũ mô tả khác. Runtime đang dùng phải được xác nhận riêng.
- Firebase web config/API key không tự nó là service-account secret; không coi config công khai là lỗ hổng. Các credential LINE/Gemini server cần bảo vệ theo vai trò và mức quyền thực.
- Chưa kiểm Google popup/redirect Safari thực, App Check/IAM/gateway, deployed indexes/rules hoặc lịch sử truy cập. Các findings không chứng minh dự án đã bị tấn công.
- Chưa kiểm tất cả cạnh tranh delete/clearStore/claims hoặc toàn bộ logout cache trong mọi feature; plan cần tests dựa permission/scope matrix.
