# Hướng dẫn tích hợp & Sử dụng Telegram Bot Agent (telegram-agent)

Module `telegram-agent` cho phép bạn gửi lệnh từ xa từ điện thoại (Telegram) để quản lý hàng đợi task và kích hoạt trình nâng cấp code tự động trên laptop.

---

## Các bước chuẩn bị

### Bước 1: Tạo Bot Telegram qua BotFather
1. Mở Telegram và tìm kiếm bot chính thức `@BotFather`.
2. Gõ `/newbot` và làm theo hướng dẫn để đặt tên cho bot.
3. BotFather sẽ trả về **Telegram Bot Token** (dạng `123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ`). Hãy lưu lại mã token này.

### Bước 2: Lấy ID người dùng Telegram của bạn
Để bảo mật, bot chỉ chấp nhận lệnh từ duy nhất User ID của bạn.
1. Tìm kiếm `@userinfobot` hoặc `@GetIDSBot` trên Telegram.
2. Nhấn `/start`, bot sẽ trả về số ID của bạn (ví dụ: `987654321`). Hãy lưu lại dãy số này.

---

## Cấu hình & Cài đặt

### Bước 1: Tạo tệp .env
Trong thư mục `telegram-agent/`, sao chép tệp `.env.example` thành `.env`:
```bash
cp telegram-agent/.env.example telegram-agent/.env
```
Mở tệp `telegram-agent/.env` và cập nhật các thông số thực tế của bạn:
```env
TELEGRAM_BOT_TOKEN=123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ  # Token bot của bạn
TELEGRAM_ALLOWED_USER_ID=987654321                      # ID người dùng Telegram của bạn
PROJECT_ROOT=/Users/dangkhoa/Downloads/Vide Coding/dashboardycx
ANTIGRAVITY_COMMAND=npm run lint
```

### Bước 2: Cài đặt thư viện dependencies
Di chuyển vào thư mục `telegram-agent` và cài đặt các thư viện cần thiết:
```bash
cd telegram-agent
npm install
```

### Bước 3: Chạy thử nghiệm bot thủ công
Khởi động bot bằng câu lệnh:
```bash
node bot.js
```
Mở Telegram, truy cập vào Bot của bạn và gõ `/start`. Nếu bạn nhận được câu trả lời từ bot, quá trình thiết lập đã thành công!

---

## Hướng dẫn cấu hình tự khởi động cùng Laptop (macOS)

Để bot luôn luôn hoạt động ngầm mỗi khi bạn mở laptop mà không cần chạy terminal thủ công, chúng ta sử dụng công cụ `launchd` mặc định của macOS.

### Bước 1: Tạo file cấu hình LaunchAgent
Tạo một file có tên `com.telegram.agent.plist` trong thư mục `~/Library/LaunchAgents/` của macOS với nội dung sau:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.telegram.agent</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/node</string> <!-- Đường dẫn tới node trên máy bạn -->
        <string>/Users/dangkhoa/Downloads/Vide Coding/dashboardycx/telegram-agent/bot.js</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>WorkingDirectory</key>
    <string>/Users/dangkhoa/Downloads/Vide Coding/dashboardycx/telegram-agent</string>
    <key>StandardOutPath</key>
    <string>/Users/dangkhoa/Downloads/Vide Coding/dashboardycx/telegram-agent/logs/stdout.log</string>
    <key>StandardErrorPath</key>
    <string>/Users/dangkhoa/Downloads/Vide Coding/dashboardycx/telegram-agent/logs/stderr.log</string>
</dict>
</plist>
```
*(Lưu ý: Bạn có thể tìm đường dẫn chính xác của `node` trên máy bằng lệnh `which node` và thay thế vào mục ProgramArguments nếu cần).*

### Bước 2: Kích hoạt dịch vụ tự khởi động
Chạy các lệnh sau trong terminal để kích hoạt LaunchAgent:
```bash
# Kích hoạt Agent chạy ngầm
launchctl load ~/Library/LaunchAgents/com.telegram.agent.plist

# Khởi động dịch vụ ngay lập tức
launchctl start com.telegram.agent
```

---

## Luồng công việc khi sử dụng (Workflow)

1. **Gửi lệnh**: Bạn nhắn tin `/task Cập nhật tính năng X` cho Bot từ điện thoại di động khi đang di chuyển.
2. **Lập kế hoạch**: Bạn nhắn `/plan TASK-XXXXXX`. Bot tạo file nháp kế hoạch tại dự án.
3. **Phê duyệt**: Bạn nhắn `/approve TASK-XXXXXX` để phê duyệt.
4. **Thực thi**: Bạn nhắn `/run TASK-XXXXXX`. Bot sẽ ra lệnh cho Laptop thực thi ngầm.
5. **Xem báo cáo**: Bạn nhắn `/report` hoặc `/diff` để xem kết quả mã nguồn đã thay đổi.
