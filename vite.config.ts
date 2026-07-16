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
                manualChunks: {
                    'vendor-excel': ['xlsx', 'papaparse'],
                    'vendor-firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/storage'],
                    'vendor-motion': ['motion'],
                    'vendor-icons': ['lucide-react'],
                    'vendor-charts': ['recharts']
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
