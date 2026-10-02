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
