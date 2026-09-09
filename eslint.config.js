import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import importPlugin from 'eslint-plugin-import';

// Cấu hình tối thiểu theo RULES.md §2.0 / §2.5 (Shared Core Contract).
// Mục tiêu: enforce đúng 4 điều máy kiểm được, không bật full "recommended"
// ruleset (sẽ tạo hàng nghìn lỗi mới trên code vibecode cũ, không phải mục tiêu ở đây).
const FEATURES = ['bi-dashboard', 'phan-ca', 'sticker-event'];

const featureBoundaryRules = FEATURES.map((feature) => {
  const others = FEATURES.filter((f) => f !== feature);
  return {
    files: [`features/${feature}/**/*.{ts,tsx}`],
    rules: {
      'import/no-restricted-paths': ['error', {
        zones: [
          ...others.map((other) => ({
            target: `./features/${feature}`,
            from: `./features/${other}`,
            message: `Cấm import chéo giữa features/${feature} và features/${other} — mỗi feature phải độc lập (RULES.md §2.0).`,
          })),
          {
            target: `./features/${feature}`,
            from: './hooks',
            message: 'features/* không được import hooks/ gốc — hooks gốc chỉ dành cho Dashboard/check-thuong (RULES.md §2.0).',
          },
          {
            target: `./features/${feature}`,
            from: './services',
            // Ngoại lệ cách ly thứ 3 (CLAUDE.md mục 1, bổ sung 2026-08-31): bi-dashboard được
            // phép import services/firebase.ts (chỉ instance db/auth, không phải logic nghiệp
            // vụ) — cần cho tính năng phân quyền theo siêu thị (biData/{maKho}, xem
            // implementation_plan.md mục "Đợt 4"). phan-ca/sticker-event KHÔNG có ngoại lệ này.
            ...(feature === 'bi-dashboard' ? { except: ['./firebase.ts', './firebase'] } : {}),
            message: 'features/* không được import services/ gốc — dùng services riêng của feature (RULES.md §2.0).',
          },
        ],
      }],
    },
  };
});

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

      // Shared Core Contract §2.5.1 — nghiêm cấm window.alert/confirm/prompt, dùng ConfirmDialog.
      'no-restricted-globals': ['error',
        { name: 'alert', message: 'Dùng <ConfirmDialog> từ components/shared/ui thay vì window.alert (RULES.md §2.5).' },
        { name: 'confirm', message: 'Dùng <ConfirmDialog> từ components/shared/ui thay vì window.confirm (RULES.md §2.5).' },
        { name: 'prompt', message: 'Dùng <Modal>/<Input> từ components/shared/ui thay vì window.prompt (RULES.md §2.5).' },
      ],
    },
  },
  ...featureBoundaryRules,

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
);
