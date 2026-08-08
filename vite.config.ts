import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(() => {
    return {
      base: '/',
      server: {
        open: true,
        watch: {
          ignored: ['**/backup_temp/**', '**/dashboardycx_backup_*/**'],
        },
      },
      plugins: [
        react(),
        tailwindcss(),
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
