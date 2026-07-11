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
      'telegram-agent/**',
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
);
