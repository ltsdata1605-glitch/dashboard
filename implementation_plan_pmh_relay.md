# PMH Relay — Bot LINE ↔ admintnb.com qua trình duyệt

## Luồng hoạt động

```
LINE group  ──webhook──▶  lineBotWebhook
                              │ phát hiện form PMH + group bật pmhRelay
                              │ ghi vào Firestore
                              ▼
                    pmh_relay_queue/{id}   (status: pending)
                              │
                    userscript poll mỗi 5s
                              ▼
            tnb-pmh-auto-lay-ma.user.js (tab admintnb.com)
                              │ gửi form → nhận mã
                              │ POST /pmhRelayComplete
                              ▼
                    Cloud Function pmhRelayComplete
                              │ push message LINE → group
                              ▼
                    LINE group nhận mã
```

## Thay đổi cần làm

### 1. Firestore collection `pmh_relay_queue` (database `(default)`)
```
pmh_relay_queue/{autoId} {
  ownerUid: string,        // uid chủ bot LINE
  form: string,            // nội dung form PMH nguyên văn
  groupId: string,         // LINE group ID
  senderName: string,      // tên người gửi (để reply tag)
  quoteToken?: string,     // trích dẫn tin gốc
  status: 'pending' | 'processing' | 'done' | 'error',
  result?: { codes: [{kho,type,code}], errors: string[] },
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### 2. Cloud Function `pmhRelayPoll` (HTTP GET)
- Header `Authorization: Bearer <relayToken>`
- Tra token trong `line_bots/{uid}` → lấy uid
- Query `pmh_relay_queue` where ownerUid==uid, status=='pending'
- Trả JSON array [{id, form}]

### 3. Cloud Function `pmhRelayComplete` (HTTP POST)
- Header `Authorization: Bearer <relayToken>`
- Body: { id, codes: [{kho,type,code}], errors: [string] }
- Cập nhật document status='done', result=...
- Đọc token LINE từ `line_bots/{uid}`
- Push message LINE về groupId với danh sách mã

### 4. Webhook: thêm nhánh relay
- Thêm feature flag `pmhRelay` vào GroupFeatures
- Khi form PMH + allow('pmhRelay'):
  - Ghi vào pmh_relay_queue
  - Reply "⏳ Đang gửi lấy mã PMH..."
  - Skip local coupon lookup

### 5. Userscript: thêm chế độ Bot
- Toggle "Chế độ Bot" trong panel
- Khi bật: poll Cloud Function mỗi 5s
- Nhận form pending → gửi vào ô chat → thu mã → POST kết quả
- Hiện log hoạt động trong panel

### 6. Firestore rules: thêm pmh_relay_queue
- Chỉ Cloud Function (admin SDK) đọc/ghi → không cần rule client

### 7. Config
- Field `relayToken` trong document `line_bots/{uid}`
- User nhập token vào userscript (GM_setValue)
- Tạo token: Cloud Function hoặc script 1 lần
