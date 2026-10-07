import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { AppIcon } from '../../components/shared/ui/icon/AppIcon';
import { ICON_REGISTRY, type IconName } from '../../components/shared/ui/icon/iconRegistry';
import { ICON_SIZES } from '../../components/shared/ui/icon/iconTokens';
import { Button } from '../../components/shared/ui/Button';

const require = createRequire(import.meta.url);
const ratchet = require('../../scripts/lint-ratchet.cjs');

const render = (props: Parameters<typeof AppIcon>[0]) => renderToStaticMarkup(createElement(AppIcon, props));

describe('Registry icon (chuẩn hoá icon 2026-10-02)', () => {
  it('mọi tên chức năng trỏ tới một component thật (không undefined do lucide đổi tên)', () => {
    for (const [name, comp] of Object.entries(ICON_REGISTRY)) {
      expect(comp, name).toBeTruthy();
      expect(['function', 'object']).toContain(typeof comp);
    }
  });

  it('các chức năng chủ dự án đã chốt dùng đúng icon', () => {
    const svg = (n: IconName) => render({ name: n });
    // Xuất ảnh = máy ảnh (ảnh chủ dự án đánh dấu "CHUẨN"), hàng loạt = Images.
    expect(svg('exportImage')).toContain('lucide-camera');
    expect(svg('exportBatch')).toContain('lucide-images');
    expect(svg('refresh')).toContain('lucide-refresh-cw');
    expect(svg('reset')).toContain('lucide-rotate-ccw');
    expect(svg('delete')).toContain('lucide-trash');
  });

  it('thang size: mobile ≥ laptop ở mọi token, md = 16/18px như đã chốt', () => {
    for (const [k, v] of Object.entries(ICON_SIZES)) {
      if (k === 'hero') continue; // minh hoạ lớn: mobile nhỏ hơn để không tràn màn hẹp
      expect(v.mobile, k).toBeGreaterThanOrEqual(v.laptop);
    }
    expect(ICON_SIZES.md).toEqual({ laptop: 16, mobile: 18 });
  });
});

describe('<AppIcon>', () => {
  it('đẩy px của token xuống 2 biến CSS, gắn lớp .ycx-icon, nét 2, ẩn khỏi trình đọc màn hình', () => {
    const html = render({ name: 'search', size: 'sm' });
    expect(html).toContain('class="lucide lucide-search ycx-icon"');
    expect(html).toContain('--ycx-icon-m:16px');
    expect(html).toContain('--ycx-icon-d:14px');
    expect(html).toContain('stroke-width="2"');
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('data-icon="search"');
  });

  it('px tuỳ chỉnh cố định cả 2 màn; label → role="img"; spin → animate-spin', () => {
    const html = render({ name: 'loading', px: 20, spin: true, label: 'Đang tải' });
    expect(html).toContain('--ycx-icon-m:20px');
    expect(html).toContain('--ycx-icon-d:20px');
    expect(html).toContain('animate-spin');
    expect(html).toContain('role="img"');
    expect(html).toContain('aria-label="Đang tải"');
    expect(html).not.toContain('aria-hidden');
  });

  it('logo LINE (fill, không nét) không bị gắn strokeWidth', () => {
    const html = render({ name: 'lineBrand' });
    expect(html).toContain('fill="currentColor"');
    expect(html).not.toContain('stroke-width');
  });

  it('CSS: .ycx-icon chọn biến mobile mặc định, biến laptop từ mốc lg (64rem)', () => {
    const css = readFileSync('styles.css', 'utf8');
    expect(css).toMatch(/\.ycx-icon\s*\{[^}]*width:\s*var\(--ycx-icon-m/);
    expect(css).toMatch(/@media \(min-width: 64rem\)\s*\{\s*\.ycx-icon\s*\{[^}]*width:\s*var\(--ycx-icon-d/);
  });
});

describe('<Button icon>', () => {
  it('icon theo tên chức năng, cách chữ 6px (gap-1.5), size md', () => {
    const html = renderToStaticMarkup(createElement(Button, { icon: 'exportImage' }, 'Xuất ảnh'));
    expect(html).toContain('gap-1.5');
    expect(html).toContain('lucide-camera');
    expect(html).toContain('--ycx-icon-d:16px');
  });

  it('nút size lg dùng icon lg; đang tải thay icon bằng vòng xoay', () => {
    const lg = renderToStaticMarkup(createElement(Button, { icon: 'save', size: 'lg' }, 'Lưu'));
    expect(lg).toContain('--ycx-icon-d:20px');
    const loading = renderToStaticMarkup(createElement(Button, { icon: 'save', isLoading: true }, 'Lưu'));
    expect(loading).toContain('animate-spin');
    expect(loading).not.toContain('lucide-save');
  });
});

describe('lint-ratchet — chỉ số icon', () => {
  it('đếm icon import thẳng lucide theo tên; bỏ qua import type và thư mục registry', () => {
    const src = "import { Search, X as Close } from 'lucide-react';\nimport type { LucideIcon } from 'lucide-react';";
    expect(ratchet.countIconDirectImport(src, 'components/a.tsx')).toBe(2);
    expect(ratchet.countIconDirectImport(src, 'components/shared/ui/icon/iconRegistry.ts')).toBe(0);
  });

  it('đếm size viết tay dạng số (cả đơn vị Tailwind lẫn px), không đếm size token', () => {
    expect(ratchet.countIconNumericSize('<Icon name="x" size={4} /><X size={16} /><Button size="sm" /><AppIcon size="md" />')).toBe(2);
  });

  it('đếm lời gọi kiểu cũ: <Icon name= và tên import từ file SVG tự vẽ …/Icons', () => {
    const src = "import { CameraIcon, XIcon } from './Icons';\n<Icon name=\"camera\" />";
    expect(ratchet.countIconLegacyCall(src)).toBe(3);
  });
});

describe('Lớp chuyển tiếp tên icon cũ → tên chức năng (Giai đoạn 2)', () => {
  it('mọi tên cũ trong bảng chuyển tiếp trỏ tới icon có thật (components/common/Icon.tsx đã xoá 2026-10-07)', async () => {
    const { LEGACY_ICON_NAMES } = await import('../../components/shared/ui/icon/legacyIconNames');
    // 191 tên của ICON_MAP cũ + 6 tên từng ra dấu hỏi. Vẫn GIỮ bảng vì tên cũ còn nằm trong DỮ LIỆU người dùng
    // đã lưu (vd cấu hình thẻ KPI: icon 'trending-up') — xoá bảng là các thẻ đó hiện dấu hỏi.
    expect(Object.keys(LEGACY_ICON_NAMES).length).toBeGreaterThanOrEqual(197);
    for (const [cu, moi] of Object.entries(LEGACY_ICON_NAMES)) expect(ICON_REGISTRY, cu).toHaveProperty(moi);
  });

  it('3 tên bảng cũ KHÔNG có (từng âm thầm hiện dấu hỏi) nay ra đúng icon', async () => {
    const { resolveIconName } = await import('../../components/shared/ui/icon/legacyIconNames');
    expect(resolveIconName('alert-octagon')).toBe('error');
    expect(resolveIconName('trending-down')).toBe('trendDown');
    expect(resolveIconName('message-square')).toBe('message');
  });

  it('các biến thể cũ cùng chức năng dồn về một tên', async () => {
    const { resolveIconName } = await import('../../components/shared/ui/icon/legacyIconNames');
    expect(new Set(['check-circle', 'check-circle-2'].map(resolveIconName))).toEqual(new Set(['success']));
    expect(new Set(['refresh-cw', 'refresh-ccw'].map(resolveIconName))).toEqual(new Set(['refresh']));
    expect(new Set(['settings', 'settings-2'].map(resolveIconName))).toEqual(new Set(['settings']));
    expect(resolveIconName('search')).toBe('search'); // tên chức năng giữ nguyên
    expect(resolveIconName('khong-co-that')).toBeUndefined();
  });
});

describe('<Input> — icon canh theo Ô NHẬP, không theo cả khối có dòng báo lỗi', () => {
  it('dòng lỗi nằm NGOÀI khối relative chứa icon', async () => {
    const { Input } = await import('../../components/shared/ui/Input');
    const html = renderToStaticMarkup(createElement(Input, { leftIcon: 'search', error: 'Sai định dạng' }));
    const relStart = html.indexOf('<div class="relative">');
    const errAt = html.indexOf('role="alert"');
    const relEnd = html.indexOf('</div>', html.indexOf('<input'));
    expect(relStart).toBeGreaterThan(-1);
    expect(errAt).toBeGreaterThan(relEnd); // <p role=alert> sau khi khối relative đã đóng
    expect(html).toContain('data-icon="search"');
  });
});

describe('Test e2e không bám vào HÌNH icon', () => {
  it('không selector nào dùng class lucide-… (đổi hình icon từng làm đỏ 9 spec Report BI, 2026-10-06)', async () => {
    const { readdirSync, statSync } = await import('node:fs');
    const walk = (d: string): string[] => readdirSync(d).flatMap((f) => {
      const p = `${d}/${f}`;
      return statSync(p).isDirectory() ? walk(p) : [p];
    });
    // Tìm theo TÊN CHỨC NĂNG: svg[data-icon="navReportBi"] (AppIcon tự gắn data-icon).
    const bad = walk('tests/e2e')
      .filter((p) => /\.(ts|tsx)$/.test(p) && !/icon-|iconAudit/.test(p))
      .filter((p) => /svg\.lucide-|lucide-[a-z]/.test(readFileSync(p, 'utf8')));
    expect(bad).toEqual([]);
  });
});

describe('lint-ratchet — iconRawSvg (Giai đoạn 5)', () => {
  it('đếm SVG icon viết thẳng (viewBox 24/20), bỏ qua registry và SVG biểu đồ', () => {
    const src = '<svg viewBox="0 0 24 24"><path/></svg><svg className="x" viewBox="0 0 20 20"/><svg viewBox="0 0 400 200"/>';
    expect(ratchet.countIconRawSvg(src, 'features/a.tsx')).toBe(2);
    expect(ratchet.countIconRawSvg(src, 'components/shared/ui/icon/brandIcons.tsx')).toBe(0);
  });
});

describe('lint-ratchet — iconEmoji (emoji làm icon, 2026-10-07)', () => {
  it('.tsx: đếm emoji và ✓ ✕ ⚠ ngoài comment, không đếm mũi tên ➔; .ts: chỉ đếm option toast icon', () => {
    expect(ratchet.countIconEmoji('<p>💡 Gợi ý ➔ bước 2</p>\n<span>✓</span>\n// 💡 comment', 'features/a.tsx')).toBe(2);
    expect(ratchet.countIconEmoji("toast('Xong', { icon: '📋' });\nconst tinNhan = '📢 THÔNG BÁO';", 'hooks/a.ts')).toBe(1);
  });
});

describe('Nét icon đồng đều', () => {
  it('không AppIcon nào tự đè độ dày nét bằng lớp stroke-[…] (CSS thắng strokeWidth=2 của AppIcon)', async () => {
    const { readdirSync, statSync } = await import('node:fs');
    const walk = (d: string): string[] => readdirSync(d).flatMap((f) => {
      const p = `${d}/${f}`;
      return statSync(p).isDirectory() ? walk(p) : [p];
    });
    const bad = ['components', 'features'].flatMap(walk).filter((p) => p.endsWith('.tsx'))
      .flatMap((p) => (readFileSync(p, 'utf8').match(/<AppIcon\b[^>]*stroke-\[[^>]*\/>/g) || []).map((m) => `${p}: ${m}`));
    expect(bad).toEqual([]);
  });
});
