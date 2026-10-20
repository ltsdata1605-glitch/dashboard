import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import importPlugin from 'eslint-plugin-import';

// Cấu hình tối thiểu theo RULES.md §2.0 / §2.5 (Shared Core Contract).
// Mục tiêu: enforce đúng 4 điều máy kiểm được, không bật full "recommended"
// ruleset (sẽ tạo hàng nghìn lỗi mới trên code vibecode cũ, không phải mục tiêu ở đây).
const FEATURES = ['bi-dashboard', 'phan-ca', 'sticker-event', 'khai-thac', 'line-bot'];

/**
 * Vùng cấm import của một feature. `ngoaiLe` mở THÊM đúng vài đường dẫn trong hooks/ hoặc services/ gốc — chỉ dùng cho khối
 * ngoại lệ khai theo TỪNG FILE ở cuối file này (để mọi file khác của feature vẫn bị chặn).
 */
const vungCam = (feature, ngoaiLe = {}) => {
  const others = FEATURES.filter((f) => f !== feature);
  const servicesExcept = [
    ...(feature === 'bi-dashboard' || feature === 'line-bot' ? ['./firebase.ts', './firebase'] : []),
    ...(ngoaiLe.services || []),
  ];
  return [
          ...others.map((other) => ({
            target: `./features/${feature}`,
            from: `./features/${other}`,
            message: `Cấm import chéo giữa features/${feature} và features/${other} — mỗi feature phải độc lập (RULES.md §2.0).`,
          })),
          {
            target: `./features/${feature}`,
            from: './hooks',
            ...(ngoaiLe.hooks ? { except: ngoaiLe.hooks } : {}),
            message: 'features/* không được import hooks/ gốc — hooks gốc chỉ dành cho Dashboard/check-thuong (RULES.md §2.0).',
          },
          // GĐ8 (2026-10-13): lỗ hổng cũ — features/* import thẳng components/common (ErrorBoundary, ExportOptionsModal) và
          // components/views (BarcodeCanvas) của Phân tích. Thứ dùng chung nay ở components/shared/*; đồ của Phân tích cấm dùng.
          {
            target: `./features/${feature}`,
            from: './components/common',
            message: 'features/* không được import components/common (đồ riêng của Phân tích) — dùng components/shared/* (README ở đó).',
          },
          {
            target: `./features/${feature}`,
            from: './components/views',
            message: 'features/* không được import components/views (màn của khu vực gốc) — dùng components/shared/*.',
          },
          {
            target: `./features/${feature}`,
            from: './components/layout',
            // Ngoại lệ có chủ đích: Report BI dùng bộ chọn PHÔNG CHỮ TOÀN APP (lưu qua services/dbService gốc — là việc của khung
            // app, không đưa vào shared/ui được nếu không tách phần lưu). Chỉ đúng file này.
            ...(feature === 'bi-dashboard' ? { except: ['./FontSelector.tsx', './FontSelector'] } : {}),
            message: 'features/* không được import components/layout (khung app) — khung tự vẽ thanh trên/thanh tab; màn khai báo bằng usePageActions.',
          },
          {
            target: `./features/${feature}`,
            from: './services',
            // Ngoại lệ cách ly thứ 3 (CLAUDE.md mục 1, bổ sung 2026-08-31): bi-dashboard được
            // phép import services/firebase.ts (chỉ instance db/auth, không phải logic nghiệp
            // vụ) — cần cho tính năng phân quyền theo siêu thị (biData/{maKho}, xem
            // implementation_plan.md mục "Đợt 4"). phan-ca/sticker-event KHÔNG có ngoại lệ này.
            // line-bot (khu vực thứ 5, thêm vào luật 2026-10-02) cũng chỉ dùng instance db của services/firebase.ts.
            ...(servicesExcept.length ? { except: servicesExcept } : {}),
            message: 'features/* không được import services/ gốc — dùng services riêng của feature (RULES.md §2.0).',
          },
  ];
};

const featureBoundaryRules = FEATURES.map((feature) => ({
  files: [`features/${feature}/**/*.{ts,tsx}`],
  rules: {
    'import/no-restricted-paths': ['error', { zones: vungCam(feature) }],
  },
}));

export default tseslint.config(
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'archive/**',
      'scratch/**',
      'functions/**',
      'design-system/**',
      '.claude/worktrees/**',
      '**/*.cjs',
    ],
  },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      import: importPlugin,
    },
    settings: {
      'import/resolver': {
        typescript: { project: './tsconfig.json' },
      },
    },
    rules: {
      'react-hooks/rules-of-hooks': 'error',

      // Shared Core Contract §2.5.1 — cảnh báo <button> thô, khuyến khích dùng components/shared/ui/Button.
      // Mức "warn" vì code cũ còn rất nhiều (~438 chỗ theo AUDIT.md) — không chặn cứng build.
      'no-restricted-syntax': ['warn', {
        selector: "JSXOpeningElement[name.name='button']",
        message: 'Dùng <Button> từ components/shared/ui thay vì <button> thô (RULES.md §2.5).',
      }],

      // Toast dùng chung (KE_HOACH_GIAO_DIEN_APPLE.md GĐ1, 2026-10-10): một API + một giao diện cho cả 5 khu vực. Gọi thẳng
      // react-hot-toast là quay lại tình trạng cũ (toast góc dưới đè thanh tab iPhone, mỗi nơi một kiểu).
      'no-restricted-imports': ['error', {
        paths: [{ name: 'react-hot-toast', message: 'Dùng toast dùng chung: import { toast } from \'…/components/shared/ui/toast\' (KE_HOACH_GIAO_DIEN_APPLE.md GĐ1).' }],
      }],

      // Shared Core Contract §2.5.1 — nghiêm cấm window.alert/confirm/prompt, dùng ConfirmDialog.
      'no-restricted-globals': ['error',
        { name: 'alert', message: 'Dùng <ConfirmDialog> từ components/shared/ui thay vì window.alert (RULES.md §2.5).' },
        { name: 'confirm', message: 'Dùng <ConfirmDialog> từ components/shared/ui thay vì window.confirm (RULES.md §2.5).' },
        { name: 'prompt', message: 'Dùng <Modal>/<Input> từ components/shared/ui thay vì window.prompt (RULES.md §2.5).' },
      ],
      // GĐ10 (2026-10-15): luật trên chỉ bắt `confirm()` VIẾT TRẦN — `window.confirm()` là truy cập THUỘC TÍNH nên lọt: 6 chỗ dùng hộp
      // thoại của trình duyệt (Phân tích, Tính thuế, Bot LINE, Cấu hình SP) trong khi `npm run check` vẫn xanh. Chặn cả `window.` /
      // `globalThis.` / `self.` (tests/unit/eslint-cam-hop-thoai-trinh-duyet.test.ts lint thử từng dạng).
      'no-restricted-properties': ['error',
        ...['window', 'globalThis', 'self'].flatMap((object) => [
          { object, property: 'alert', message: 'Dùng toast hoặc <ConfirmDialog singleButton> từ components/shared/ui thay vì alert của trình duyệt (CLAUDE.md mục 2).' },
          { object, property: 'confirm', message: 'Dùng <ConfirmDialog> từ components/shared/ui thay vì confirm của trình duyệt (CLAUDE.md mục 2).' },
          { object, property: 'prompt', message: 'Dùng <Modal>/<Input> từ components/shared/ui thay vì prompt của trình duyệt (CLAUDE.md mục 2).' },
        ]),
      ],
    },
  },
  ...featureBoundaryRules,

  // Thư mục toast dùng chung là nơi DUY NHẤT được import react-hot-toast.
  {
    files: ['components/shared/ui/toast/**/*.{ts,tsx}'],
    rules: { 'no-restricted-imports': 'off' },
  },

  // ── Ngoại lệ cách ly thứ 4 (bổ sung 2026-09-09, Đợt 6) — PHẠM VI ĐÚNG 1 FILE ──
  // `analysisEmployeeSyncService.ts` là CẦU NỐI có chủ đích giữa 2 khu vực: nó đẩy danh sách
  // nhân viên từ chức năng Phân Tích (khu vực gốc) sang Report BI. Bản chất công việc bắt buộc
  // phải chạm cả 2 phía, nên nó cần `services/dbService` gốc — cụ thể là `saveSetting()` gốc,
  // vì hàm này phát ra event 'ycx-setting-changed' mà `hooks/useCloudSync` ở gốc đang lắng nghe.
  // Dùng `saveSetting` riêng của bi-dashboard KHÔNG thay thế được: nó ghi sang IndexedDB khác
  // (BI_HUB_DATABASE_V2) và không phát event đó, nên phía Phân Tích sẽ không thấy dữ liệu mới.
  //
  // Cố ý KHÔNG thêm './dbService' vào danh sách `except` chung ở trên: làm vậy sẽ mở cửa cho
  // MỌI file trong bi-dashboard import services/ gốc, phá đúng thứ quy tắc này bảo vệ. Khai
  // riêng ở đây để ngoại lệ chỉ đúng 1 file, ai thêm file thứ 2 vẫn bị chặn.
  {
    files: ['features/bi-dashboard/services/analysisEmployeeSyncService.ts'],
    rules: {
      'import/no-restricted-paths': ['error', {
        zones: [
          ...FEATURES.filter((f) => f !== 'bi-dashboard').map((other) => ({
            target: './features/bi-dashboard',
            from: `./features/${other}`,
            message: `Cấm import chéo giữa features/bi-dashboard và features/${other} (RULES.md §2.0).`,
          })),
          {
            target: './features/bi-dashboard',
            from: './hooks',
            message: 'features/* không được import hooks/ gốc (RULES.md §2.0).',
          },
          {
            target: './features/bi-dashboard',
            from: './services',
            except: ['./firebase.ts', './firebase', './dbService.ts', './dbService'],
            message: 'features/* không được import services/ gốc — dùng services riêng của feature (RULES.md §2.0).',
          },
        ],
      }],
    },
  },

  // ── Ngoại lệ cách ly thứ 5 (2026-10-20) — PHẠM VI ĐÚNG 3 FILE + ĐÚNG ĐƯỜNG DẪN ĐƯỢC IMPORT ──
  // Tính năng chủ dự án (fbb7779 "tự động xuất báo cáo theo khu vực", 440f9e0 "tự xuất Bot LINE cho mọi khu vực Report BI"):
  // services/autoReportExportService.ts là CẦU NỐI có chủ đích giữa YCX (gốc), Report BI và Bot LINE — lưu ảnh báo cáo lên
  // Firebase để Bot gửi. Report BI gọi nó ở đúng 2 file; BiWrapper hiện "lượt truy cập · đang online" bằng hook gốc
  // useSystemTraffic (như Phân tích / Check thưởng). Các import này làm ESLint đỏ trên main từ 16/10 (CI đỏ 4 ngày).
  // Khai hẹp như ngoại lệ thứ 4: file khác của Report BI import hooks/services gốc VẪN bị chặn
  // (tests/unit/eslint-ngoai-le-cach-ly.test.ts). Hướng sạch hơn về sau: cầu nối qua components/shared thay vì import gốc.
  {
    files: ['features/bi-dashboard/components/Dashboard.tsx', 'features/bi-dashboard/hooks/useBiAutoSync.tsx'],
    rules: {
      'import/no-restricted-paths': ['error', {
        zones: vungCam('bi-dashboard', { services: ['./autoReportExportService.ts', './autoReportExportService'] }),
      }],
    },
  },
  {
    files: ['features/bi-dashboard/components/BiWrapper.tsx'],
    rules: {
      'import/no-restricted-paths': ['error', {
        zones: vungCam('bi-dashboard', { hooks: ['./useSystemTraffic.ts', './useSystemTraffic'] }),
      }],
    },
  },
);
