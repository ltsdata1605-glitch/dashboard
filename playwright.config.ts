import { defineConfig, devices } from '@playwright/test';

/**
 * Cấu hình Playwright dùng để AGENT TỰ KIỂM CHỨNG thay đổi trên UI thật trước khi báo cáo
 * (CLAUDE.md mục 0.8), chưa phải bộ test hồi quy đầy đủ.
 *
 * - `webServer` tự khởi động `npm run dev` và tự tắt khi chạy xong, nên không cần tự quản lý PID
 *   dev server (tránh hẳn việc tra PID theo port để kill).
 * - `reuseExistingServer` bật ở máy local: nếu người dùng đang mở sẵn dev server thì dùng lại,
 *   KHÔNG khởi động thêm và cũng không tắt server của họ.
 * - Chỉ cài/chạy Chromium để nhẹ máy; thêm trình duyệt khác khi thực sự cần.
 */
const DEV_URL = 'http://127.0.0.1:5173';
/** Đặt E2E_BASE_URL để chạy test trên một server có sẵn (vd bản build `vite preview`) thay vì dev
 *  server. Hữu ích khi cần loại trừ nhiễu HMR của dev server đang mở sẵn trên máy. */
const BASE_URL = process.env.E2E_BASE_URL || DEV_URL;

export default defineConfig({
    testDir: './tests/e2e',
    timeout: 60_000,
    expect: { timeout: 10_000 },
    fullyParallel: false,
    workers: 1,
    // Trên CI thêm reporter 'github': nó phát ra lệnh `::error file=…,line=…::<thông điệp>`, và
    // GitHub biến thứ đó thành ANNOTATION — mà annotation ĐỌC ĐƯỢC qua API công khai
    // (`/check-runs/{id}/annotations`), trong khi nội dung log và artifact thì đòi xác thực.
    // Nhờ vậy lượt chạy đỏ tự nói ra test nào hỏng, ở file/dòng nào, không cần ai dán log.
    // Đo ngày 2026-09-18: thiếu reporter này, annotation duy nhất của một job đỏ là
    // "Process completed with exit code 1" — vô dụng để lần lỗi.
    reporter: process.env.CI ? [['github'], ['list']] : [['list']],
    use: {
        baseURL: BASE_URL,
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
        video: 'off',
    },
    projects: [
        { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    ],
    webServer: process.env.E2E_BASE_URL ? undefined : {
        command: 'npm run dev',
        url: DEV_URL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
    },
});
