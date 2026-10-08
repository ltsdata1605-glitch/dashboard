import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import fs from 'fs';
import crypto from 'crypto';


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
          || f === 'prevent-pull-to-refresh.js' || f === 'reload-on-chunk-error.js')
        .map((f) => `/${f}`);
      const version = crypto.createHash('sha1')
        .update(precache.join('|')).update(fs.readFileSync(path.join(dist, 'index.html'))).digest('hex').slice(0, 12);
      const tpl = fs.readFileSync(path.resolve(__dirname, 'scripts/sw-template.js'), 'utf8');
      fs.writeFileSync(path.join(dist, 'sw.js'), tpl.replace('__VERSION__', version).replace('__PRECACHE__', JSON.stringify(precache)));
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
                        if (id.includes('firebase')) return 'vendor-firebase';
                        if (id.includes('/motion/') || id.includes('\\motion\\')) return 'vendor-motion';
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
