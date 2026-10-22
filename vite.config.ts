import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import fs from 'fs';
import crypto from 'crypto';
import postcss from 'postcss';


/**
 * BỎ CSS CHẾT của biến thể `dark:` khỏi bản build (2026-10-14, GĐ9 — gói tải đầu).
 *
 * Dark mode ĐÃ TẮT toàn dự án (CLAUDE.md mục 2): LayoutContext luôn gỡ class `dark` khỏi <html>, không phần tử nào mang
 * class `dark`. Nhưng ~900 class `dark:` cũ còn trong code (giữ nguyên theo quy tắc) và Tailwind vẫn sinh luật
 * `.dark\:x:where(.dark,.dark *){…}` cho từng cái — ~110 KB CSS (8 KB nén) trình duyệt phải tải + phân tích mà KHÔNG BAO
 * GIỜ khớp. Tailwind v4 không có cách tắt hẳn một biến thể (bỏ dòng @custom-variant thì `dark:` quay về theo giao diện tối
 * của HỆ ĐIỀU HÀNH — tệ hơn), nên lọc ở bước cuối: chỉ bỏ luật mà selector chứa `:where(.dark…` (đúng dạng biến thể ở
 * styles.css sinh ra), rồi dọn @media/@supports rỗng. Dev server không đổi gì.
 * ⚠️ Muốn BẬT LẠI dark mode: gỡ plugin này trước, nếu không mọi `dark:` im lặng không có tác dụng trên bản build.
 */
function boCssDarkChet() {
  const laLuatDark = (sel: string) => /:where\(\s*\.dark\s*[,)]/.test(sel);
  return {
    name: 'ycx-bo-css-dark-chet',
    apply: 'build' as const,
    enforce: 'post' as const,
    generateBundle(_options: unknown, bundle: Record<string, { type: string; fileName: string; source?: string | Uint8Array }>) {
      for (const file of Object.values(bundle)) {
        if (file.type !== 'asset' || !file.fileName.endsWith('.css') || file.source === undefined) continue;
        const css = typeof file.source === 'string' ? file.source : new TextDecoder().decode(file.source);
        const root = postcss.parse(css);
        root.walkRules((rule) => {
          const giu = rule.selectors.filter((s) => !laLuatDark(s));
          if (giu.length === 0) rule.remove();
          else if (giu.length < rule.selectors.length) rule.selectors = giu;
        });
        // @media/@supports chỉ chứa luật dark giờ rỗng — dọn lặp vì có thể lồng nhau.
        for (let conRong = true; conRong;) {
          conRong = false;
          root.walkAtRules((at) => { if (at.nodes && at.nodes.length === 0) { at.remove(); conRong = true; } });
        }
        file.source = root.toString();
      }
    },
  };
}

/**
 * Sinh dist/sw.js (service worker offline) từ scripts/sw-template.js: nhúng danh sách file cần tải sẵn
 * (index.html, /assets/**, icon, manifest) và một VERSION băm từ tên file + nội dung index.html — mỗi bản build mới
 * có cache riêng, cache cũ tự bị dọn khi worker mới kích hoạt.
 */
function offlineServiceWorker() {
  let emitted: string[] = [];
  const walk = (dir: string, base = ''): string[] =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
      e.isDirectory() ? walk(path.join(dir, e.name), `${base}${e.name}/`) : [`${base}${e.name}`]);
  return {
    name: 'ycx-offline-sw',
    apply: 'build' as const,
    // Chỉ lấy file của CHÍNH bản build này (dist/assets có thể còn file bản cũ nếu outDir không được dọn).
    writeBundle(_options: unknown, bundle: Record<string, unknown>) { emitted = Object.keys(bundle); },
    closeBundle() {
      const dist = path.resolve(__dirname, 'dist');
      if (!fs.existsSync(path.join(dist, 'index.html'))) return;
      const files = walk(dist);
      const precache = files
        .filter((f) => (f.startsWith('assets/') && emitted.includes(f)) || f.startsWith('icons/') || f === 'favicon.svg' || f === 'manifest.webmanifest'
          || f === 'prevent-pull-to-refresh.js' || f === 'reload-on-chunk-error.js' || f === 'man-cho-khoi-dong.js' || f === 'fonts/UTM AvoBold.ttf')
        .map((f) => `/${f}`);
      const indexHtml = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
      // LÕI = đúng những file index.html tự nạp (gói vào, modulepreload, CSS) + 2 script ở /public: đủ để dựng app khi
      // mất mạng. Lúc cài service worker chỉ tải LÕI; phần còn lại tải ngầm sau khi trang đã rảnh (GĐ2 tăng tốc 2026-10-11)
      // — trước đây lượt cài đầu tải cùng lúc 7,9 MB / 71 file, giành băng thông với chính lượt mở app trên 4G.
      const core = Array.from(new Set([...indexHtml.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map((m) => m[1])))
        .concat(['/prevent-pull-to-refresh.js', '/reload-on-chunk-error.js', '/man-cho-khoi-dong.js', '/fonts/UTM AvoBold.ttf', '/favicon.svg', '/manifest.webmanifest'])
        .filter((f) => precache.includes(f));
      const version = crypto.createHash('sha1')
        .update(precache.join('|')).update(indexHtml).digest('hex').slice(0, 12);
      const tpl = fs.readFileSync(path.resolve(__dirname, 'scripts/sw-template.js'), 'utf8');
      fs.writeFileSync(path.join(dist, 'sw.js'), tpl.replace('__VERSION__', version)
        .replace('__PRECACHE__', JSON.stringify(precache)).replace('__CORE__', JSON.stringify(core)));
    },
  };
}

export default defineConfig(() => {
    return {
      base: '/',
      server: {
        open: true,
        proxy: {
          '/api-line-proxy': {
            target: 'https://api.line.me',
            changeOrigin: true,
            secure: true,
            rewrite: (path) => path.replace(/^\/api-line-proxy/, '')
          }
        },
        watch: {
          ignored: ['**/backup_temp/**', '**/dashboardycx_backup_*/**'],
        },
      },
      plugins: [
        react(),
        tailwindcss(),
        offlineServiceWorker(),
        boCssDarkChet(),
      ],
      build: {
        chunkSizeWarningLimit: 700,
        rollupOptions: {
            output: {
                manualChunks(id) {
                    if (id.includes('node_modules')) {
                        // react/react-dom PHẢI tách riêng, đứng TRƯỚC rule 'recharts' bên dưới —
                        // nếu không, Rollup gộp bản react-dom (mọi chunk khác đều cần, kể cả entry
                        // ngay lúc mở app) LUÔN vào chung với vendor-charts (vì recharts cũng cần
                        // react-dom), khiến entry buộc phải tải kèm theo toàn bộ 396KB recharts
                        // chỉ để lấy react-dom — dù tính năng biểu đồ chưa chắc được dùng tới.
                        if (id.includes('react-dom') || id.includes('/react/') || id.includes('\\react\\') || id.includes('scheduler')) return 'vendor-react';
                        if (id.includes('xlsx') || id.includes('papaparse')) return 'vendor-excel';
                        // Analytics (+ installations nó kéo theo) nạp SAU khi trang rảnh (services/firebase.ts) → gói riêng,
                        // không nằm trong vendor-firebase vốn được modulepreload lúc mở app.
                        if (id.includes('@firebase/analytics') || id.includes('@firebase/installations') || /[\\/]firebase[\\/]analytics/.test(id)) return 'vendor-firebase-analytics';
                        if (id.includes('firebase')) return 'vendor-firebase';
                        // (GĐ4 2026-10-12) Đã gỡ hẳn thư viện motion — mọi chuyển động là CSS (usePresence, animate-in).
                        if (id.includes('lucide-react')) return 'vendor-icons';
                        if (id.includes('recharts')) return 'vendor-charts';
                        return;
                    }
                    // PERF FIX: components/shared/ui/utils.ts (hàm `cn` dùng chung khắp dự án) bị
                    // Rollup tự động gộp CHUNG vào chunk vendor-charts (396KB/116KB gzip, chỉ chứa
                    // recharts) — do `cn` được cả code eager (Sidebar/MobileBottomNav, luôn hiện
                    // ngay từ đầu) LẪN các component biểu đồ (chỉ tải khi mở tab Phân Tích/Report
                    // BI) cùng import, và vendor-charts vốn đã là 1 chunk cố định nên Rollup chọn
                    // gộp module dùng chung đó vào luôn đấy thay vì tạo thêm 1 chunk nhỏ riêng —
                    // kéo theo cả recharts bị modulepreload ngay lúc mở app dù chưa chắc cần. Tách
                    // hẳn ra 1 chunk riêng cực nhỏ để cắt đứt việc bị "quá giang" theo vendor-charts.
                    if (id.includes('components/shared/ui/utils.ts')) return 'shared-utils';
                }
            }
        }
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
          'react': path.resolve(__dirname, 'node_modules/react'),
          'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
        },
        dedupe: ['react', 'react-dom']
      }
    };
});
